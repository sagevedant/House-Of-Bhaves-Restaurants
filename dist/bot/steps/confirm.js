"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleConfirm = handleConfirm;
exports.handleFinalize = handleFinalize;
exports.handlePostFinalize = handlePostFinalize;
const sender_1 = require("../../whatsapp/sender");
const connection_1 = require("../../db/connection");
const schema_1 = require("../../db/schema");
const reservationCode_1 = require("../../utils/reservationCode");
const makeIntegration_1 = require("../../services/makeIntegration");
const dateHelpers_1 = require("../../utils/dateHelpers");
const slotExtractor_1 = require("../../ai/slotExtractor");
const datetime_1 = require("./datetime");
const guests_1 = require("./guests");
const quotaService_1 = require("../../services/quotaService");
async function handleConfirm(event, conversation, client, stepData) {
    const phone = event.from;
    if (event.type === 'button_reply') {
        if (event.buttonId === 'confirm_yes') {
            return { nextStep: 'finalized', stepData };
        }
        if (event.buttonId === 'confirm_change') {
            await (0, sender_1.sendText)(client, phone, 'No worries! Let\'s select your treatment again 🔄');
            await (0, guests_1.sendOccasionPrompt)(client, phone);
            return { nextStep: 'occasion', stepData: { guests: 1 } };
        }
    }
    if (event.type === 'text') {
        const extracted = await (0, slotExtractor_1.extractSlots)(event.text, (0, dateHelpers_1.todayIST)(), (0, dateHelpers_1.currentTimeIST)());
        if (extracted.intent === 'book' || !extracted.intent) {
            await (0, datetime_1.sendConfirmPrompt)(client, phone, stepData, conversation);
            return { nextStep: 'confirm', stepData };
        }
    }
    await (0, datetime_1.sendConfirmPrompt)(client, phone, stepData, conversation);
    return { nextStep: 'confirm', stepData };
}
async function handleFinalize(event, conversation, client, stepData) {
    try {
        const quota = await (0, quotaService_1.checkOutboundQuota)(client.id);
        if (!quota.allowed) {
            console.warn(`🛑 [Quota] Client '${client.businessName}' over quota — booking still recorded, but outbound confirmation suppressed.`);
        }
    }
    catch (err) {
        console.error('Quota check failed (non-fatal):', err);
    }
    const prefix = client.slug ? client.slug.slice(0, 3).toUpperCase() : 'BK';
    const code = await (0, reservationCode_1.generateReservationCode)(prefix);
    const customerName = conversation.customerName || stepData.customerName || 'Patient';
    const [booking] = await connection_1.db.insert(schema_1.bookings).values({
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
    }).returning();
    if (!booking) {
        throw new Error('Failed to record booking');
    }
    stepData.reservationId = booking.id;
    stepData.reservationCode = code;
    await (0, makeIntegration_1.sendToMakeWebhook)({
        event: 'reservation_created',
        bookingId: booking.id,
        reservationId: booking.id,
        reservationCode: code,
        restaurantName: client.businessName,
        businessName: client.businessName,
        customerName,
        customerPhone: conversation.phone,
        guests: stepData.guests || 1,
        occasion: stepData.occasion || 'casual',
        date: stepData.date,
        time: stepData.time,
        specialRequest: stepData.specialRequest || null,
        stage: 'booked',
        status: 'booked',
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
    if (client.managerPhone) {
        await (0, sender_1.sendText)(client, client.managerPhone, `🔔 *New Appointment Alert!*\n\n👤 ${customerName}\n📱 +${conversation.phone}\n🩺 ${treatmentType}\n📅 ${(0, dateHelpers_1.formatDate)(stepData.date)} · ${(0, dateHelpers_1.formatTime)(stepData.time)}\n🎫 ${code}`);
    }
    await (0, sender_1.sendText)(client, conversation.phone, `✅ *Appointment Reserved!*\n\n🎫 Booking Code: *${code}*\n🩺 ${client.businessName}\n👤 ${customerName}\n✨ ${treatmentType}\n📅 ${(0, dateHelpers_1.formatDate)(stepData.date)} · ${(0, dateHelpers_1.formatTime)(stepData.time)}\n\nPlease show this code at reception. See you soon! 😊`);
    try {
        await (0, quotaService_1.incrementOutboundCounter)(client.id);
    }
    catch (err) {
        console.error('Failed to increment outbound counter (non-fatal):', err);
    }
    return { nextStep: 'finalized', stepData };
}
async function handlePostFinalize(event, conversation, client, stepData) {
    return;
}
//# sourceMappingURL=confirm.js.map