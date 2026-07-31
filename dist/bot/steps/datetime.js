"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDateTimeDate = handleDateTimeDate;
exports.sendTimePrompt = sendTimePrompt;
exports.handleDateTimeTime = handleDateTimeTime;
exports.sendConfirmPrompt = sendConfirmPrompt;
const sender_1 = require("../../whatsapp/sender");
const slotExtractor_1 = require("../../ai/slotExtractor");
const dateHelpers_1 = require("../../utils/dateHelpers");
const occasion_1 = require("./occasion");
async function handleDateTimeDate(event, conversation, restaurant, stepData) {
    const phone = event.from;
    if (stepData.date) {
        await sendTimePrompt(restaurant, phone, stepData.date);
        return { nextStep: 'datetime_time', stepData };
    }
    let date;
    if (event.type === 'list_reply' && event.rowId.startsWith('date_')) {
        date = event.rowId.replace('date_', '');
    }
    else if (event.type === 'button_reply') {
        if (event.buttonId === 'date_today')
            date = (0, dateHelpers_1.todayIST)();
        if (event.buttonId === 'date_tomorrow')
            date = (0, dateHelpers_1.tomorrowIST)();
        if (event.buttonId === 'date_dayafter')
            date = (0, dateHelpers_1.dayAfterTomorrowIST)();
        if (event.buttonId.startsWith('date_'))
            date = event.buttonId.replace('date_', '');
    }
    else if (event.type === 'text') {
        const resolved = (0, dateHelpers_1.resolveDateInput)(event.text);
        if (resolved) {
            date = resolved;
        }
        else {
            const extracted = await (0, slotExtractor_1.extractSlots)(event.text, (0, dateHelpers_1.todayIST)(), (0, dateHelpers_1.currentTimeIST)());
            if (extracted.date) {
                date = extracted.date;
            }
        }
    }
    if (date) {
        const day = (0, dateHelpers_1.getDayName)(date).toLowerCase();
        if (restaurant.closedDays?.toLowerCase().includes(day)) {
            await (0, sender_1.sendText)(restaurant, phone, `Sorry, we're closed on ${(0, dateHelpers_1.getDayName)(date)}s! Please pick another day 🙏`);
            await (0, occasion_1.sendDatePrompt)(restaurant, phone);
            return { nextStep: 'datetime_date', stepData };
        }
        const slots = (0, dateHelpers_1.getAvailableTimeSlots)(date, restaurant.openingHoursLunch || '', restaurant.openingHoursDinner || '19:00-00:30');
        if (!slots || slots.length === 0 || slots.every(s => s.slots.length === 0)) {
            await (0, sender_1.sendText)(restaurant, phone, `All slots for ${(0, dateHelpers_1.formatDate)(date)} are full or closed! How about another day? 🌟`);
            await (0, occasion_1.sendDatePrompt)(restaurant, phone);
            return { nextStep: 'datetime_date', stepData };
        }
        stepData.date = date;
        await sendTimePrompt(restaurant, phone, date);
        return { nextStep: 'datetime_time', stepData };
    }
    await (0, occasion_1.sendDatePrompt)(restaurant, phone);
    return { nextStep: 'datetime_date', stepData };
}
async function sendTimePrompt(restaurant, phone, date) {
    const lunchHours = restaurant.openingHoursLunch !== null && restaurant.openingHoursLunch !== undefined ? restaurant.openingHoursLunch : '';
    const dinnerHours = restaurant.openingHoursDinner || '19:00-00:30';
    const slots = (0, dateHelpers_1.getAvailableTimeSlots)(date, lunchHours, dinnerHours);
    const sections = slots.filter(s => s.slots.length > 0).map(s => ({
        title: s.period === 'Lunch' ? '🌞 Lunch Service' : '🌙 Dinner Service',
        rows: s.slots.map(slot => ({
            id: `time_${slot.replace(':', '_')}`,
            title: (0, dateHelpers_1.formatTime)(slot)
        }))
    }));
    if (sections.length > 0) {
        await (0, sender_1.sendList)(restaurant, phone, '🕐 Select your preferred time slot:', 'Select Time', sections);
    }
    else {
        await (0, sender_1.sendText)(restaurant, phone, `No available slots for ${(0, dateHelpers_1.formatDate)(date)}. Please select another day!`);
    }
}
async function handleDateTimeTime(event, conversation, restaurant, stepData) {
    const phone = event.from;
    if (stepData.time) {
        await sendConfirmPrompt(restaurant, phone, stepData, conversation);
        return { nextStep: 'confirm', stepData };
    }
    let time;
    if (event.type === 'list_reply' && event.rowId.startsWith('time_')) {
        time = event.rowId.replace('time_', '').replace('_', ':');
    }
    else if (event.type === 'text') {
        const extracted = await (0, slotExtractor_1.extractSlots)(event.text, (0, dateHelpers_1.todayIST)(), (0, dateHelpers_1.currentTimeIST)());
        time = extracted.time;
    }
    if (time) {
        stepData.time = time;
        await sendConfirmPrompt(restaurant, phone, stepData, conversation);
        return { nextStep: 'confirm', stepData };
    }
    if (stepData.date) {
        await sendTimePrompt(restaurant, phone, stepData.date);
    }
    return { nextStep: 'datetime_time', stepData };
}
async function sendConfirmPrompt(restaurant, phone, stepData, conversation) {
    const occasionEmojis = { casual: '🍽️', birthday: '🎂', anniversary: '🥂', corporate: '💼', party: '🎉' };
    const occasionLabels = { casual: 'Casual Dining', birthday: 'Birthday Celebration', anniversary: 'Anniversary', corporate: 'Corporate Event', party: 'Private Party' };
    const occasion = stepData.occasion || 'casual';
    const occasionEmoji = occasionEmojis[occasion] || '🍽️';
    const occasionLabel = occasionLabels[occasion] || 'Casual Dining';
    const text = `📋 *Your Reservation Summary:*\n\n🍽️ ${restaurant.name}\n👤 ${conversation.customerName || stepData.customerName || 'Guest'}\n👥 ${stepData.guests} Guests\n${occasionEmoji} ${occasionLabel}\n📅 ${(0, dateHelpers_1.formatDate)(stepData.date)}\n🕐 ${(0, dateHelpers_1.formatTime)(stepData.time)}\n\nDoes everything look good?`;
    await (0, sender_1.sendButtons)(restaurant, phone, text, [
        { id: 'confirm_yes', title: 'Confirm ✅' },
        { id: 'confirm_change', title: 'Change ↩️' },
    ]);
}
//# sourceMappingURL=datetime.js.map