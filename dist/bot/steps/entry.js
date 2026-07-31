"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEntry = handleEntry;
const sender_1 = require("../../whatsapp/sender");
const slotExtractor_1 = require("../../ai/slotExtractor");
const knowledge_1 = require("../knowledge");
const dateHelpers_1 = require("../../utils/dateHelpers");
async function handleEntry(event, conversation, restaurant, stepData) {
    const phone = event.from;
    if (event.type === 'button_reply') {
        if (event.buttonId === 'book_table') {
            await (0, sender_1.sendButtons)(restaurant, phone, '👥 How many guests will be dining?\n\nTap a button or type any number:', [
                { id: 'pax_2', title: '2 People' },
                { id: 'pax_4', title: '4 People' },
                { id: 'pax_6plus', title: '6+ Group' },
            ]);
            return { nextStep: 'guests', stepData };
        }
        if (event.buttonId === 'view_menu' || event.buttonId === 'view_cuisines') {
            const defaultMenu = `🍽️ *${restaurant.name} — Curated Cuisines & Chef Specials* 🌟\n\n🔥 *North Indian & Tandoor*\n• Butter Chicken & Garlic Naan 🧈\n• Dal Makhani & Dal Bukhara 🍲\n• Paneer Tikka & Galouti Kebab 🍢\n\n🥟 *Asian & Dim Sum*\n• Truffle Edamame Dim Sums 🥟\n• Spicy Asian Basil Rice 🍚\n• Crunchy Lotus Stem in Honey Chilli 🥢\n\n🍕 *Continental & Wood-Fired*\n• Truffle Mushroom Wood-Fired Pizza 🍕\n• Creamy Tuscan Pasta 🍝\n• Artisan Cheese Platter 🧀\n\n🍹 *Craft Cocktails & Desserts*\n• Smoked Old Fashioned & Elderflower Spritz 🍸\n• Sizzling Walnut Brownie with Gelato 🍨\n\nWould you like to reserve a table to taste our specials tonight? 👇`;
            const menuTxt = restaurant.customMenuText || defaultMenu;
            await (0, sender_1.sendButtons)(restaurant, phone, menuTxt, [
                { id: 'book_table', title: 'Book a Table 🍽️' },
                { id: 'talk_to_us', title: 'Talk to Us 💬' },
            ], `📋 Cuisines & Specials`);
            return { nextStep: 'entry', stepData };
        }
        if (event.buttonId === 'talk_to_us') {
            await (0, sender_1.sendText)(restaurant, phone, `📞 You can reach our manager at ${restaurant.managerPhone || '+919699533441'}.`);
            return { nextStep: 'entry', stepData };
        }
        if (event.buttonId === 'new_booking') {
            await (0, sender_1.sendButtons)(restaurant, phone, '👥 How many guests will be dining?\n\nTap a button or type any number:', [
                { id: 'pax_2', title: '2 People' },
                { id: 'pax_4', title: '4 People' },
                { id: 'pax_6plus', title: '6+ Group' },
            ]);
            return { nextStep: 'guests', stepData: {} };
        }
        if (event.buttonId === 'modify_booking') {
            await (0, sender_1.sendText)(restaurant, phone, 'Please call the restaurant manager to modify your booking.');
            return { nextStep: 'finalized', stepData };
        }
        if (event.buttonId === 'cancel_booking') {
            await (0, sender_1.sendText)(restaurant, phone, 'Your booking has been cancelled.');
            return { nextStep: 'finalized', stepData };
        }
    }
    if (event.type === 'text') {
        const extracted = await (0, slotExtractor_1.extractSlots)(event.text, (0, dateHelpers_1.todayIST)(), (0, dateHelpers_1.currentTimeIST)());
        const name = extracted.name || event.customerName;
        if (name)
            stepData.customerName = name;
        if (extracted.intent === 'greeting' || extracted.intent === 'book' || !extracted.intent) {
            if (conversation.currentStep === 'finalized' && extracted.intent === 'greeting') {
                await (0, sender_1.sendButtons)(restaurant, phone, 'Welcome back! 😊 You have an existing reservation.\n\nWould you like to:', [
                    { id: 'new_booking', title: 'Book Another Table' },
                    { id: 'modify_booking', title: 'Modify Booking' },
                    { id: 'cancel_booking', title: 'Cancel Booking' },
                ]);
                return { nextStep: 'entry', stepData };
            }
            if (extracted.guests)
                stepData.guests = extracted.guests;
            if (extracted.occasion)
                stepData.occasion = extracted.occasion;
            if (extracted.date)
                stepData.date = extracted.date;
            if (extracted.time)
                stepData.time = extracted.time;
            if (extracted.intent === 'book') {
                if (stepData.guests && stepData.occasion && stepData.date && stepData.time) {
                    const occEmojis = { casual: '🍽️', birthday: '🎂', anniversary: '🥂', corporate: '💼', party: '🎉' };
                    const occLabels = { casual: 'Casual Dining', birthday: 'Birthday Celebration', anniversary: 'Anniversary', corporate: 'Corporate Event', party: 'Private Party' };
                    const occ = stepData.occasion || 'casual';
                    const txt = `📋 *Your Reservation Summary:*\n\n🍽️ ${restaurant.name}\n👤 ${stepData.customerName || 'Guest'}\n👥 ${stepData.guests} Guests\n${occEmojis[occ]} ${occLabels[occ]}\n📅 ${(0, dateHelpers_1.formatDate)(stepData.date)}\n🕐 ${(0, dateHelpers_1.formatTime)(stepData.time)}\n\nDoes everything look good?`;
                    await (0, sender_1.sendButtons)(restaurant, phone, txt, [{ id: 'confirm_yes', title: 'Confirm ✅' }, { id: 'confirm_change', title: 'Change ↩️' }]);
                    return { nextStep: 'confirm', stepData };
                }
                else if (!stepData.guests) {
                    await (0, sender_1.sendButtons)(restaurant, phone, '👥 How many guests will be dining?\n\nTap a button or type any number:', [{ id: 'pax_2', title: '2 People' }, { id: 'pax_4', title: '4 People' }, { id: 'pax_6plus', title: '6+ Group' }]);
                    return { nextStep: 'guests', stepData };
                }
                else if (!stepData.occasion) {
                    await (0, sender_1.sendList)(restaurant, phone, '🎉 Any special occasion?\n\nWe\'ll make it extra special! Select the vibe for your evening:', 'Select Occasion', [{ title: '✨ Occasion Type', rows: [{ id: 'occ_casual', title: 'Casual Dining 🍽️', description: 'Just a great meal with great company' }, { id: 'occ_birthday', title: 'Birthday 🎂', description: 'Complimentary cake & table décor' }, { id: 'occ_anniversary', title: 'Anniversary 🥂', description: 'Candlelight table setup' }, { id: 'occ_corporate', title: 'Corporate 💼', description: 'Private seating arrangement' }, { id: 'occ_party', title: 'Private Party 🎉', description: 'Dedicated area with music' }] }]);
                    return { nextStep: 'occasion', stepData };
                }
                else if (!stepData.date) {
                    await (0, sender_1.sendButtons)(restaurant, phone, '📅 When would you like to dine?\n\nPick a date or type a day (e.g. "Friday", "Kal"):', [{ id: 'date_today', title: 'Today' }, { id: 'date_tomorrow', title: 'Tomorrow' }, { id: 'date_dayafter', title: 'Day After' }], '📅 Select Date');
                    return { nextStep: 'datetime_date', stepData };
                }
                else if (!stepData.time) {
                    const slots = (0, dateHelpers_1.getAvailableTimeSlots)(stepData.date, restaurant.openingHoursLunch || '12:00-15:30', restaurant.openingHoursDinner || '19:00-23:00');
                    const sections = slots.filter(s => s.slots.length > 0).map(s => ({ title: `${s.period} service`, rows: s.slots.map(slot => ({ id: `time_${slot.replace(':', '_')}`, title: (0, dateHelpers_1.formatTime)(slot) })) }));
                    if (sections.length > 0) {
                        await (0, sender_1.sendList)(restaurant, phone, '🕐 Pick your preferred time slot:', 'Select Time', sections);
                    }
                    return { nextStep: 'datetime_time', stepData };
                }
            }
        }
        if (extracted.intent === 'question' && extracted.question) {
            const answer = (0, knowledge_1.findAnswer)(extracted.question);
            if (answer) {
                await (0, sender_1.sendText)(restaurant, phone, answer);
            }
            else {
                await (0, sender_1.sendText)(restaurant, phone, 'Great question! For specific queries, please call us.');
            }
            await sendWelcome(restaurant, phone);
            return { nextStep: 'entry', stepData };
        }
        if (extracted.intent === 'cancel' && conversation.currentStep === 'finalized') {
            await (0, sender_1.sendText)(restaurant, phone, 'Your booking has been cancelled.');
            return { nextStep: 'finalized', stepData };
        }
        if (extracted.intent === 'modify' && conversation.currentStep === 'finalized') {
            await (0, sender_1.sendText)(restaurant, phone, 'Please call the restaurant manager to modify your booking.');
            return { nextStep: 'finalized', stepData };
        }
    }
    await sendWelcome(restaurant, phone);
    return { nextStep: 'entry', stepData };
}
async function sendWelcome(restaurant, phone) {
    const defaultWelcome = `🍽️ Welcome to ${restaurant.name}!\n\nWhether it's a cozy dinner, a birthday celebration, or an evening under the stars — we've got the perfect table for you.\n\nTap below to reserve your table instantly! 👇`;
    const welcomeTxt = restaurant.customWelcomeText || defaultWelcome;
    await (0, sender_1.sendButtons)(restaurant, phone, welcomeTxt, [
        { id: 'book_table', title: 'Book a Table 🍽️' },
        { id: 'view_menu', title: 'Cuisines & Specials 📋' },
        { id: 'talk_to_us', title: 'Talk to Us 💬' },
    ], `🍽️ ${restaurant.name}`);
}
//# sourceMappingURL=entry.js.map