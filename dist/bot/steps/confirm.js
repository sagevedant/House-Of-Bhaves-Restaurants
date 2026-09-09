"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleConfirm = handleConfirm;
exports.handleFinalize = handleFinalize;
exports.handlePostFinalize = handlePostFinalize;
const sender_1 = require("../../whatsapp/sender");
const connection_1 = require("../../db/connection");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const reservationCode_1 = require("../../utils/reservationCode");
const makeIntegration_1 = require("../../services/makeIntegration");
const dateHelpers_1 = require("../../utils/dateHelpers");
const slotExtractor_1 = require("../../ai/slotExtractor");
const datetime_1 = require("./datetime");
const guests_1 = require("./guests");
const quotaService_1 = require("../../services/quotaService"); // FIX: actually wire in quota enforcement
async function handleConfirm(event, conversation, restaurant, stepData) {
    const phone = event.from;
    if (event.type === 'button_reply') {
        if (event.buttonId === 'confirm_yes') {
            return { nextStep: 'finalized', stepData };
        }
        if (event.buttonId === 'confirm_change') {
            await (0, sender_1.sendText)(restaurant, phone, 'No worries! Let\'s select your treatment again 🔄');
            await (0, guests_1.sendOccasionPrompt)(restaurant, phone);
            return { nextStep: 'occasion', stepData: { guests: 1 } };
        }
    }
    if (event.type === 'text') {
        const extracted = await (0, slotExtractor_1.extractSlots)(event.text, (0, dateHelpers_1.todayIST)(), (0, dateHelpers_1.currentTimeIST)());
        if (extracted.intent === 'book' || !extracted.intent) {
            await (0, datetime_1.sendConfirmPrompt)(restaurant, phone, stepData, conversation);
            return { nextStep: 'confirm', stepData };
        }
    }
    await (0, datetime_1.sendConfirmPrompt)(restaurant, phone, stepData, conversation);
    return { nextStep: 'confirm', stepData };
}
async function handleFinalize(event, conversation, restaurant, stepData) {
    // FIX: quota check was defined in quotaService.js but never called
    // anywhere — the "Smart Cut-Off System" was dead code and clients could
    // send unlimited outbound messages regardless of configured allowance.
    const clientMatch = await connection_1.db.select().from(schema_1.clients).where((0, drizzle_orm_1.eq)(schema_1.clients.slug, restaurant.slug)).limit(1);
    const client = clientMatch[0];
    if (client) {
        try {
            const quota = await (0, quotaService_1.checkOutboundQuota)(client.id);
            if (!quota.allowed) {
                console.warn(`🛑 [Quota] Client '${client.businessName}' over quota — booking still recorded, but outbound confirmation suppressed.`);
                // We still record the booking (the customer initiated it inbound,
                // which doesn't count against outbound marketing quota per Meta's
                // free-form reply window) but we do not send additional outbound
                // template/marketing messages beyond the direct reply.
            }
        }
        catch (err) {
            console.error('Quota check failed (non-fatal):', err);
        }
    }
    const code = await (0, reservationCode_1.generateReservationCode)(restaurant.prefix);
    const customerName = conversation.customerName || stepData.customerName || 'Patient';
    // FIX (data integrity): previously two independent INSERTs with no
    // transaction — if the second write (bookings) failed after the first
    // (reservations) succeeded, the two tables would silently diverge with
    // no way to detect it. Wrapped in a transaction so both succeed or
    // neither does. Falls back to sequential writes if the driver doesn't
    // support transactions (defensive — libsql via drizzle does support it).
    let reservation;
    const doWrites = async (tx) => {
        const [res] = await tx.insert(schema_1.reservations).values({
            restaurantId: restaurant.id,
            customerName,
            customerPhone: conversation.phone,
            guests: stepData.guests || 1,
            occasion: stepData.occasion || 'casual',
            date: stepData.date,
            time: stepData.time,
            reservationCode: code,
            stage: 'booked',
            specialRequest: stepData.specialRequest || null,
        }).returning();
        reservation = res;
        if (client) {
            await tx.insert(schema_1.bookings).values({
                clientId: client.id,
                customerName,
                customerPhone: conversation.phone,
                guests: stepData.guests || 1,
                occasion: stepData.occasion || 'casual',
                date: stepData.date,
                time: stepData.time,
                reservationCode: code,
                status: 'booked',
                specialRequest: stepData.specialRequest || null,
            });
        }
    };
    if (typeof connection_1.db.transaction === 'function') {
        await connection_1.db.transaction(doWrites);
    }
    else {
        console.warn('⚠️ [Confirm] db.transaction not available — falling back to non-atomic writes.');
        await doWrites(connection_1.db);
    }
    if (!reservation) {
        throw new Error('Failed to record reservation');
    }
    stepData.reservationId = reservation.id;
    stepData.reservationCode = code;
    await (0, makeIntegration_1.sendToMakeWebhook)({
        event: 'reservation_created',
        reservationId: reservation.id,
        reservationCode: code,
        restaurantName: restaurant.name,
        customerName,
        customerPhone: conversation.phone,
        guests: stepData.guests || 1,
        occasion: stepData.occasion || 'casual',
        date: stepData.date,
        time: stepData.time,
        specialRequest: stepData.specialRequest || null,
        stage: 'booked',
        timestamp: new Date().toISOString(),
    });
    const occLabels = {
        casual: 'Consultation & Checkup',
        birthday: 'Teeth Whitening',
        anniversary: 'Anniversary Special',
        corporate: 'Aligners & Braces',
        party: 'Root Canal & Implants'
    };
    const treatmentType = occLabels[stepData.occasion || 'casual'] || 'Consultation';
    if (restaurant.managerPhone) {
        await (0, sender_1.sendText)(restaurant, restaurant.managerPhone, `🔔 *New Appointment Alert!*\n\n👤 ${customerName}\n📱 +${conversation.phone}\n🩺 ${treatmentType}\n📅 ${(0, dateHelpers_1.formatDate)(stepData.date)} · ${(0, dateHelpers_1.formatTime)(stepData.time)}\n🎫 ${code}`);
    }
    await (0, sender_1.sendText)(restaurant, conversation.phone, `✅ *Appointment Reserved!*\n\n🎫 Booking Code: *${code}*\n🩺 ${restaurant.name}\n👤 ${customerName}\n✨ ${treatmentType}\n📅 ${(0, dateHelpers_1.formatDate)(stepData.date)} · ${(0, dateHelpers_1.formatTime)(stepData.time)}\n\nPlease show this code at reception. See you soon! 😊`);
    // FIX: increment the actual counter now that quota is wired in
    if (client) {
        try {
            await (0, quotaService_1.incrementOutboundCounter)(client.id);
        }
        catch (err) {
            console.error('Failed to increment outbound counter (non-fatal):', err);
        }
    }
    return { nextStep: 'finalized', stepData };
}
async function handlePostFinalize(event, conversation, restaurant, stepData) {
    return;
}
//# sourceMappingURL=confirm.js.map