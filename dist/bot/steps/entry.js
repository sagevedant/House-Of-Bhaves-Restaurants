"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEntry = handleEntry;
const sender_1 = require("../../whatsapp/sender");
const slotExtractor_1 = require("../../ai/slotExtractor");
const knowledge_1 = require("../knowledge");
const dateHelpers_1 = require("../../utils/dateHelpers");
const connection_1 = require("../../db/connection");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const guests_1 = require("./guests");
async function handleEntry(event, conversation, restaurant, stepData) {
    const phone = event.from;
    if (event.type === 'button_reply') {
        if (event.buttonId === 'book_table') {
            stepData.guests = 1; // Auto-default patient count to 1 for clinic
            await (0, guests_1.sendOccasionPrompt)(restaurant, phone);
            return { nextStep: 'occasion', stepData };
        }
        if (event.buttonId === 'view_menu' || event.buttonId === 'view_cuisines') {
            const defaultMenu = `🦷 *Smize Dental Clinic — Treatments & Services* ✨\n\n✨ *Smile Design & Aligners*\n• Clear Aligners & Invisible Braces 🦷\n• Laser Teeth Whitening & Polishing ✨\n• Dental Veneers & Cosmetic Makeovers 😁\n\n🩺 *General & Advanced Treatments*\n• Painless Root Canal Treatment (RCT) 💉\n• Dental Implants & Tooth Replacement 🦷\n• Scaling, Cleaning & Gum Care 🪥\n• Pediatric / Kids Dental Care 👶\n\nTap below to reserve your consultation slot! 👇`;
            const menuTxt = restaurant.customMenuText || defaultMenu;
            await (0, sender_1.sendButtons)(restaurant, phone, menuTxt, [
                { id: 'book_table', title: 'Book Appointment 📅' },
                { id: 'talk_to_us', title: 'Talk to Us 💬' },
            ], `🩺 Treatments & Services`);
            return { nextStep: 'entry', stepData };
        }
        if (event.buttonId === 'talk_to_us') {
            await (0, sender_1.sendText)(restaurant, phone, `📞 You can reach our clinic reception at ${restaurant.managerPhone || '+919511673214'}.`);
            return { nextStep: 'entry', stepData };
        }
        if (event.buttonId === 'new_booking') {
            stepData.guests = 1;
            await (0, guests_1.sendOccasionPrompt)(restaurant, phone);
            return { nextStep: 'occasion', stepData: { guests: 1 } };
        }
        if (event.buttonId === 'modify_booking') {
            await (0, sender_1.sendText)(restaurant, phone, `Please call our clinic manager at ${restaurant.managerPhone || '+919511673214'} to modify your appointment.`);
            return { nextStep: 'finalized', stepData };
        }
        if (event.buttonId === 'cancel_booking') {
            await cancelUserBooking(phone, restaurant, stepData);
            return { nextStep: 'entry', stepData: {} };
        }
    }
    if (event.type === 'text') {
        const extracted = await (0, slotExtractor_1.extractSlots)(event.text, (0, dateHelpers_1.todayIST)(), (0, dateHelpers_1.currentTimeIST)());
        const name = extracted.name || event.customerName;
        if (name)
            stepData.customerName = name;
        if (extracted.intent === 'greeting' || extracted.intent === 'book' || !extracted.intent) {
            if (conversation.currentStep === 'finalized' && extracted.intent === 'greeting') {
                await (0, sender_1.sendButtons)(restaurant, phone, 'Welcome back! 😊 You have an existing appointment.\n\nWould you like to:', [
                    { id: 'new_booking', title: 'Book Another Slot' },
                    { id: 'modify_booking', title: 'Modify Appointment' },
                    { id: 'cancel_booking', title: 'Cancel Appointment' },
                ]);
                return { nextStep: 'entry', stepData };
            }
            stepData.guests = 1; // Auto-set patient count
            if (extracted.occasion)
                stepData.occasion = extracted.occasion;
            if (extracted.date)
                stepData.date = extracted.date;
            if (extracted.time)
                stepData.time = extracted.time;
            if (extracted.intent === 'book') {
                if (stepData.occasion && stepData.date && stepData.time) {
                    const occEmojis = { casual: '🩺', birthday: '🎂', anniversary: '🥂', corporate: '💼', party: '🎉' };
                    const occLabels = { casual: 'Consultation & Checkup', birthday: 'Birthday Offer', anniversary: 'Anniversary Package', corporate: 'Aligners & Braces', party: 'Root Canal & Implants' };
                    const occ = stepData.occasion || 'casual';
                    const txt = `📋 *Your Appointment Summary:*\n\n🩺 ${restaurant.name}\n👤 ${stepData.customerName || 'Patient'}\n✨ ${occLabels[occ] || 'Consultation'}\n📅 ${(0, dateHelpers_1.formatDate)(stepData.date)}\n🕐 ${(0, dateHelpers_1.formatTime)(stepData.time)}\n\nDoes everything look good?`;
                    await (0, sender_1.sendButtons)(restaurant, phone, txt, [{ id: 'confirm_yes', title: 'Confirm ✅' }, { id: 'confirm_change', title: 'Change ↩️' }]);
                    return { nextStep: 'confirm', stepData };
                }
                else if (!stepData.occasion) {
                    await (0, guests_1.sendOccasionPrompt)(restaurant, phone);
                    return { nextStep: 'occasion', stepData };
                }
                else if (!stepData.date) {
                    await (0, sender_1.sendButtons)(restaurant, phone, '📅 When would you like to visit?\n\nPick a date or type a day (e.g. "Friday", "Kal"):', [{ id: 'date_today', title: 'Today' }, { id: 'date_tomorrow', title: 'Tomorrow' }, { id: 'date_dayafter', title: 'Day After' }], '📅 Select Date');
                    return { nextStep: 'datetime_date', stepData };
                }
                else if (!stepData.time) {
                    const slots = (0, dateHelpers_1.getAvailableTimeSlots)(stepData.date, restaurant.openingHoursLunch || '10:00-14:00', restaurant.openingHoursDinner || '17:00-21:00');
                    const sections = slots.filter(s => s.slots.length > 0).map(s => ({ title: `${s.period} OPD`, rows: s.slots.map(slot => ({ id: `time_${slot.replace(':', '_')}`, title: (0, dateHelpers_1.formatTime)(slot) })) }));
                    if (sections.length > 0) {
                        await (0, sender_1.sendList)(restaurant, phone, '🕐 Pick your preferred OPD time slot:', 'Select Time', sections);
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
                await (0, sender_1.sendText)(restaurant, phone, 'Great question! For specific queries, please call our clinic reception.');
            }
            await sendWelcome(restaurant, phone);
            return { nextStep: 'entry', stepData };
        }
        if (extracted.intent === 'cancel') {
            await cancelUserBooking(phone, restaurant, stepData);
            return { nextStep: 'entry', stepData: {} };
        }
        if (extracted.intent === 'modify' && conversation.currentStep === 'finalized') {
            await (0, sender_1.sendText)(restaurant, phone, `Please call our clinic manager at ${restaurant.managerPhone || '+919511673214'} to modify your appointment.`);
            return { nextStep: 'finalized', stepData };
        }
    }
    await sendWelcome(restaurant, phone);
    return { nextStep: 'entry', stepData };
}
async function cancelUserBooking(phone, restaurant, stepData) {
    let resCode = stepData.reservationCode;
    const clientMatch = await connection_1.db.select().from(schema_1.clients).where((0, drizzle_orm_1.eq)(schema_1.clients.slug, restaurant.slug)).limit(1);
    if (clientMatch.length > 0) {
        const activeBookings = await connection_1.db
            .select()
            .from(schema_1.bookings)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.bookings.customerPhone, phone), (0, drizzle_orm_1.eq)(schema_1.bookings.clientId, clientMatch[0].id), (0, drizzle_orm_1.eq)(schema_1.bookings.status, 'booked')))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.bookings.createdAt));
        if (activeBookings.length > 0) {
            resCode = activeBookings[0].reservationCode || resCode;
            await connection_1.db.update(schema_1.bookings).set({ status: 'cancelled' }).where((0, drizzle_orm_1.eq)(schema_1.bookings.id, activeBookings[0].id));
        }
    }
    const activeRes = await connection_1.db
        .select()
        .from(schema_1.reservations)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reservations.customerPhone, phone), (0, drizzle_orm_1.eq)(schema_1.reservations.restaurantId, restaurant.id), (0, drizzle_orm_1.eq)(schema_1.reservations.stage, 'booked')))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.reservations.createdAt));
    if (activeRes.length > 0) {
        resCode = activeRes[0].reservationCode || resCode;
        await connection_1.db.update(schema_1.reservations).set({ stage: 'cancelled' }).where((0, drizzle_orm_1.eq)(schema_1.reservations.id, activeRes[0].id));
    }
    const codeText = resCode ? ` (Code: *${resCode}*)` : '';
    if (restaurant.managerPhone) {
        await (0, sender_1.sendText)(restaurant, restaurant.managerPhone, `❌ *Appointment Cancelled by Patient*\n\n📱 +${phone}${codeText}`);
    }
    await (0, sender_1.sendText)(restaurant, phone, `❌ Your appointment${codeText} has been cancelled.\n\nTap below anytime to reserve a new slot in the future. 👇`);
}
async function sendWelcome(restaurant, phone) {
    const defaultWelcome = `🦷 Welcome to ${restaurant.name}!\n\nBook your dental appointment or consultation slot in 10 seconds. Tap below to reserve! 👇`;
    const welcomeTxt = restaurant.customWelcomeText || defaultWelcome;
    await (0, sender_1.sendButtons)(restaurant, phone, welcomeTxt, [
        { id: 'book_table', title: 'Book Appointment 📅' },
        { id: 'view_menu', title: 'Treatments & Info 📋' },
        { id: 'talk_to_us', title: 'Contact Reception 💬' },
    ], `🩺 ${restaurant.name}`);
}
//# sourceMappingURL=entry.js.map