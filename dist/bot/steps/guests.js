"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGuests = handleGuests;
exports.sendOccasionPrompt = sendOccasionPrompt;
const sender_1 = require("../../whatsapp/sender");
const slotExtractor_1 = require("../../ai/slotExtractor");
const dateHelpers_1 = require("../../utils/dateHelpers");
async function handleGuests(event, conversation, restaurant, stepData) {
    const phone = event.from;
    if (stepData.guests) {
        await sendOccasionPrompt(restaurant, phone);
        return { nextStep: 'occasion', stepData };
    }
    let guests;
    if (event.type === 'button_reply') {
        if (event.buttonId === 'pax_2')
            guests = 2;
        if (event.buttonId === 'pax_4')
            guests = 4;
        if (event.buttonId === 'pax_6plus')
            guests = 6;
    }
    else if (event.type === 'text') {
        const extracted = await (0, slotExtractor_1.extractSlots)(event.text, (0, dateHelpers_1.todayIST)(), (0, dateHelpers_1.currentTimeIST)());
        if (extracted.guests) {
            guests = extracted.guests;
        }
        else {
            const parsed = parseInt(event.text, 10);
            if (!isNaN(parsed))
                guests = parsed;
        }
    }
    if (guests) {
        if (guests > (restaurant.maxPaxNormal || 12)) {
            await (0, sender_1.sendText)(restaurant, phone, 'That\'s a large group! Our manager will contact you shortly to arrange this for you.');
            if (restaurant.managerPhone) {
                await (0, sender_1.sendText)(restaurant, restaurant.managerPhone, `Large group alert! ${guests} guests requested by ${conversation.customerName || phone} (${phone}).`);
            }
            return { nextStep: 'finalized', stepData: { ...stepData, guests, specialRequest: 'Large group - manager handoff' } };
        }
        stepData.guests = guests;
        await sendOccasionPrompt(restaurant, phone);
        return { nextStep: 'occasion', stepData };
    }
    await (0, sender_1.sendButtons)(restaurant, phone, '👥 How many guests will be dining?\n\nTap a button or type any number:', [
        { id: 'pax_2', title: '2 People' },
        { id: 'pax_4', title: '4 People' },
        { id: 'pax_6plus', title: '6+ Group' },
    ]);
    return { nextStep: 'guests', stepData };
}
async function sendOccasionPrompt(restaurant, phone) {
    await (0, sender_1.sendList)(restaurant, phone, '🎉 Any special occasion?\n\nWe\'ll make it extra special! Select the vibe for your evening:', 'Select Occasion', [{
            title: '✨ Occasion Type',
            rows: [
                { id: 'occ_casual', title: 'Casual Dining 🍽️', description: 'Just a great meal with great company' },
                { id: 'occ_birthday', title: 'Birthday 🎂', description: 'Complimentary cake & table décor' },
                { id: 'occ_anniversary', title: 'Anniversary 🥂', description: 'Candlelight table setup' },
                { id: 'occ_corporate', title: 'Corporate 💼', description: 'Private seating arrangement' },
                { id: 'occ_party', title: 'Private Party 🎉', description: 'Dedicated area with music' },
            ]
        }]);
}
//# sourceMappingURL=guests.js.map