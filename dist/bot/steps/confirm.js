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
async function handleConfirm(event, conversation, restaurant, stepData) {
    const phone = event.from;
    if (event.type === 'button_reply') {
        if (event.buttonId === 'confirm_yes') {
            return { nextStep: 'finalized', stepData };
        }
        if (event.buttonId === 'confirm_change') {
            await (0, sender_1.sendText)(restaurant, phone, 'No worries! Let\'s start fresh 🔄');
            await (0, sender_1.sendButtons)(restaurant, phone, '👥 How many guests will be dining?\n\nTap a button or type any number:', [
                { id: 'pax_2', title: '2 People' },
                { id: 'pax_4', title: '4 People' },
                { id: 'pax_6plus', title: '6+ Group' },
            ]);
            return { nextStep: 'guests', stepData: {} };
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
    const code = await (0, reservationCode_1.generateReservationCode)(restaurant.prefix);
    const customerName = conversation.customerName || stepData.customerName || 'Guest';
    const [reservation] = await connection_1.db.insert(schema_1.reservations).values({
        restaurantId: restaurant.id,
        customerName,
        customerPhone: conversation.phone,
        guests: stepData.guests,
        occasion: stepData.occasion || 'casual',
        date: stepData.date,
        time: stepData.time,
        reservationCode: code,
        stage: 'booked',
        specialRequest: stepData.specialRequest || null,
    }).returning();
    // Also insert into commercial bookings table if client exists
    const clientMatch = await connection_1.db.select().from(schema_1.clients).where((0, drizzle_orm_1.eq)(schema_1.clients.slug, restaurant.slug)).limit(1);
    if (clientMatch.length > 0) {
        await connection_1.db.insert(schema_1.bookings).values({
            clientId: clientMatch[0].id,
            customerName,
            customerPhone: conversation.phone,
            guests: stepData.guests,
            occasion: stepData.occasion || 'casual',
            date: stepData.date,
            time: stepData.time,
            reservationCode: code,
            status: 'booked',
            specialRequest: stepData.specialRequest || null,
        });
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
        guests: stepData.guests,
        occasion: stepData.occasion || 'casual',
        date: stepData.date,
        time: stepData.time,
        specialRequest: stepData.specialRequest || null,
        stage: 'booked',
        timestamp: new Date().toISOString(),
    });
    const occasionEmojis = { casual: '🍽️', birthday: '🎂', anniversary: '🥂', corporate: '💼', party: '🎉' };
    const occasionLabels = { casual: 'Casual Dining', birthday: 'Birthday Celebration', anniversary: 'Anniversary', corporate: 'Corporate Event', party: 'Private Party' };
    const occasionBonuses = { birthday: '\n🎂 Complimentary cake & decoration included!', anniversary: '\n🥂 Special candlelight setup arranged!' };
    const occasionEmoji = occasionEmojis[stepData.occasion || 'casual'] || '🍽️';
    const occasionLabel = occasionLabels[stepData.occasion || 'casual'] || 'Casual Dining';
    const occasionBonus = occasionBonuses[stepData.occasion || 'casual'] || '';
    if (restaurant.managerPhone) {
        await (0, sender_1.sendText)(restaurant, restaurant.managerPhone, `🔔 *New Reservation Alert!*\n\n👤 ${customerName}\n📱 +${conversation.phone}\n👥 ${stepData.guests} Guests · ${occasionEmoji} ${occasionLabel}\n📅 ${(0, dateHelpers_1.formatDate)(stepData.date)} · ${(0, dateHelpers_1.formatTime)(stepData.time)}\n🎫 ${code}`);
    }
    await (0, sender_1.sendText)(restaurant, conversation.phone, `✅ *Table Reserved!*\n\n🎫 Booking Code: *${code}*\n🍽️ ${restaurant.name}\n👤 ${customerName}\n👥 ${stepData.guests} Guests\n${occasionEmoji} ${occasionLabel}\n📅 ${(0, dateHelpers_1.formatDate)(stepData.date)} · ${(0, dateHelpers_1.formatTime)(stepData.time)}${occasionBonus}\n\nShow this code at the reception. See you soon! 🎉`);
    return { nextStep: 'finalized', stepData };
}
async function handlePostFinalize(event, conversation, restaurant, stepData) {
    return;
}
//# sourceMappingURL=confirm.js.map