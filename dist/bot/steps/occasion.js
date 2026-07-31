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
    const next5Days = (0, dateHelpers_1.getNextNDaysIST)(5);
    const rows = next5Days.map(d => ({
        id: `date_${d.dateStr}`,
        title: d.label.slice(0, 24),
        description: `Reserve for ${d.label}`
    }));
    await (0, sender_1.sendList)(restaurant, phone, '📅 Select your dining date (up to 5 days in advance, or type any date e.g. "3rd August"):', 'Select Date', [{ title: '📅 Next 5 Available Days', rows }], '📅 Select Date');
}
//# sourceMappingURL=occasion.js.map