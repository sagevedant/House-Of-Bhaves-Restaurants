"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleOccasion = handleOccasion;
exports.sendDatePrompt = sendDatePrompt;
const sender_1 = require("../../whatsapp/sender");
const slotExtractor_1 = require("../../ai/slotExtractor");
const dateHelpers_1 = require("../../utils/dateHelpers");
const guests_1 = require("./guests");
async function handleOccasion(event, conversation, restaurant, stepData) {
    const phone = event.from;
    if (stepData.occasion) {
        await sendDatePrompt(restaurant, phone);
        return { nextStep: 'datetime_date', stepData };
    }
    let occasion;
    if (event.type === 'list_reply') {
        const map = {
            occ_casual: 'casual', occ_birthday: 'birthday', occ_anniversary: 'anniversary', occ_corporate: 'corporate', occ_party: 'party'
        };
        occasion = map[event.rowId];
    }
    else if (event.type === 'text') {
        const extracted = await (0, slotExtractor_1.extractSlots)(event.text, (0, dateHelpers_1.todayIST)(), (0, dateHelpers_1.currentTimeIST)());
        occasion = extracted.occasion;
    }
    if (occasion) {
        stepData.occasion = occasion;
        await sendDatePrompt(restaurant, phone);
        return { nextStep: 'datetime_date', stepData };
    }
    await (0, guests_1.sendOccasionPrompt)(restaurant, phone);
    return { nextStep: 'occasion', stepData };
}
async function sendDatePrompt(restaurant, phone) {
    await (0, sender_1.sendButtons)(restaurant, phone, '📅 When would you like to dine?\n\nPick a date or type a day (e.g. "Friday", "Kal"):', [
        { id: 'date_today', title: 'Today' },
        { id: 'date_tomorrow', title: 'Tomorrow' },
        { id: 'date_dayafter', title: 'Day After' },
    ], '📅 Select Date');
}
//# sourceMappingURL=occasion.js.map