import type { WhatsAppMessageEvent } from '../../whatsapp/parser';
import type { Restaurant, Conversation, StepData } from '../../db/schema';
import { sendText, sendButtons, sendList } from '../../whatsapp/sender';
import { extractSlots } from '../../ai/slotExtractor';
import { findAnswer } from '../knowledge';
import { todayIST, currentTimeIST, formatDate, formatTime, getAvailableTimeSlots } from '../../utils/dateHelpers';
import { db } from '../../db/connection';
import { bookings, reservations, clients } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { sendOccasionPrompt } from './guests';

export async function handleEntry(
  event: WhatsAppMessageEvent,
  conversation: Conversation,
  restaurant: Restaurant,
  stepData: StepData,
): Promise<{ nextStep: string; stepData: StepData } | null> {
  const phone = event.from;

  if (event.type === 'button_reply') {
    if (event.buttonId === 'book_table') {
      stepData.guests = 1; // Auto-default patient count to 1 for clinic
      await sendOccasionPrompt(restaurant, phone);
      return { nextStep: 'occasion', stepData };
    }
    if (event.buttonId === 'view_menu' || event.buttonId === 'view_cuisines') {
      const defaultMenu = `🦷 *Smize Dental Clinic — Treatments & Services* ✨\n\n✨ *Smile Design & Aligners*\n• Clear Aligners & Invisible Braces 🦷\n• Laser Teeth Whitening & Polishing ✨\n• Dental Veneers & Cosmetic Makeovers 😁\n\n🩺 *General & Advanced Treatments*\n• Painless Root Canal Treatment (RCT) 💉\n• Dental Implants & Tooth Replacement 🦷\n• Scaling, Cleaning & Gum Care 🪥\n• Pediatric / Kids Dental Care 👶\n\nTap below to reserve your consultation slot! 👇`;
      
      const menuTxt = restaurant.customMenuText || defaultMenu;
      
      await sendButtons(restaurant, phone, menuTxt, [
        { id: 'book_table', title: 'Book Appointment 📅' },
        { id: 'talk_to_us', title: 'Talk to Us 💬' },
      ], `🩺 Treatments & Services`);
      return { nextStep: 'entry', stepData };
    }
    if (event.buttonId === 'talk_to_us') {
      await sendText(restaurant, phone, `📞 You can reach our clinic reception at ${restaurant.managerPhone || '+919511673214'}.`);
      return { nextStep: 'entry', stepData };
    }
    if (event.buttonId === 'new_booking') {
      stepData.guests = 1;
      await sendOccasionPrompt(restaurant, phone);
      return { nextStep: 'occasion', stepData: { guests: 1 } };
    }
    if (event.buttonId === 'modify_booking') {
      await sendText(restaurant, phone, `Please call our clinic manager at ${restaurant.managerPhone || '+919511673214'} to modify your appointment.`);
      return { nextStep: 'finalized', stepData };
    }
    if (event.buttonId === 'cancel_booking') {
      await cancelUserBooking(phone, restaurant, stepData);
      return { nextStep: 'entry', stepData: {} };
    }
  }

  if (event.type === 'text') {
    const extracted = await extractSlots(event.text, todayIST(), currentTimeIST());
    const name = extracted.name || event.customerName;
    if (name) stepData.customerName = name;
    
    if (extracted.intent === 'greeting' || extracted.intent === 'book' || !extracted.intent) {
      if (conversation.currentStep === 'finalized' && extracted.intent === 'greeting') {
        await sendButtons(restaurant, phone, 'Welcome back! 😊 You have an existing appointment.\n\nWould you like to:', [
          { id: 'new_booking', title: 'Book Another Slot' },
          { id: 'modify_booking', title: 'Modify Appointment' },
          { id: 'cancel_booking', title: 'Cancel Appointment' },
        ]);
        return { nextStep: 'entry', stepData };
      }

      stepData.guests = 1; // Auto-set patient count
      if (extracted.occasion) stepData.occasion = extracted.occasion;
      if (extracted.date) stepData.date = extracted.date;
      if (extracted.time) stepData.time = extracted.time;

      if (extracted.intent === 'book') {
        if (stepData.occasion && stepData.date && stepData.time) {
          const occEmojis: Record<string, string> = { casual: '🩺', birthday: '🎂', anniversary: '🥂', corporate: '💼', party: '🎉' };
          const occLabels: Record<string, string> = { casual: 'Consultation & Checkup', birthday: 'Birthday Offer', anniversary: 'Anniversary Package', corporate: 'Aligners & Braces', party: 'Root Canal & Implants' };
          const occ = stepData.occasion || 'casual';
          const txt = `📋 *Your Appointment Summary:*\n\n🩺 ${restaurant.name}\n👤 ${stepData.customerName || 'Patient'}\n✨ ${occLabels[occ] || 'Consultation'}\n📅 ${formatDate(stepData.date!)}\n🕐 ${formatTime(stepData.time!)}\n\nDoes everything look good?`;
          await sendButtons(restaurant, phone, txt, [{ id: 'confirm_yes', title: 'Confirm ✅' }, { id: 'confirm_change', title: 'Change ↩️' }]);
          return { nextStep: 'confirm', stepData };
        } else if (!stepData.occasion) {
          await sendOccasionPrompt(restaurant, phone);
          return { nextStep: 'occasion', stepData };
        } else if (!stepData.date) {
          await sendButtons(restaurant, phone, '📅 When would you like to visit?\n\nPick a date or type a day (e.g. "Friday", "Kal"):', [ { id: 'date_today', title: 'Today' }, { id: 'date_tomorrow', title: 'Tomorrow' }, { id: 'date_dayafter', title: 'Day After' } ], '📅 Select Date');
          return { nextStep: 'datetime_date', stepData };
        } else if (!stepData.time) {
          const slots = getAvailableTimeSlots(stepData.date!, restaurant.openingHoursLunch || '10:00-14:00', restaurant.openingHoursDinner || '17:00-21:00');
          const sections = slots.filter(s => s.slots.length > 0).map(s => ({ title: `${s.period} OPD`, rows: s.slots.map(slot => ({ id: `time_${slot.replace(':', '_')}`, title: formatTime(slot) })) }));
          if (sections.length > 0) {
            await sendList(restaurant, phone, '🕐 Pick your preferred OPD time slot:', 'Select Time', sections);
          }
          return { nextStep: 'datetime_time', stepData };
        }
      }
    }
    
    if (extracted.intent === 'question' && extracted.question) {
      const answer = findAnswer(extracted.question);
      if (answer) {
        await sendText(restaurant, phone, answer);
      } else {
        await sendText(restaurant, phone, 'Great question! For specific queries, please call our clinic reception.');
      }
      await sendWelcome(restaurant, phone);
      return { nextStep: 'entry', stepData };
    }
    if (extracted.intent === 'cancel') {
      await cancelUserBooking(phone, restaurant, stepData);
      return { nextStep: 'entry', stepData: {} };
    }
    if (extracted.intent === 'modify' && conversation.currentStep === 'finalized') {
      await sendText(restaurant, phone, `Please call our clinic manager at ${restaurant.managerPhone || '+919511673214'} to modify your appointment.`);
      return { nextStep: 'finalized', stepData };
    }
  }

  await sendWelcome(restaurant, phone);
  return { nextStep: 'entry', stepData };
}

async function cancelUserBooking(phone: string, restaurant: Restaurant, stepData: StepData) {
  let resCode = stepData.reservationCode;

  const clientMatch = await db.select().from(clients).where(eq(clients.slug, restaurant.slug)).limit(1);
  if (clientMatch.length > 0) {
    const activeBookings = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.customerPhone, phone), eq(bookings.clientId, clientMatch[0].id), eq(bookings.status, 'booked')))
      .orderBy(desc(bookings.createdAt));
    
    if (activeBookings.length > 0) {
      resCode = activeBookings[0].reservationCode || resCode;
      await db.update(bookings).set({ status: 'cancelled' }).where(eq(bookings.id, activeBookings[0].id));
    }
  }

  const activeRes = await db
    .select()
    .from(reservations)
    .where(and(eq(reservations.customerPhone, phone), eq(reservations.restaurantId, restaurant.id), eq(reservations.stage, 'booked')))
    .orderBy(desc(reservations.createdAt));
  
  if (activeRes.length > 0) {
    resCode = activeRes[0].reservationCode || resCode;
    await db.update(reservations).set({ stage: 'cancelled' }).where(eq(reservations.id, activeRes[0].id));
  }

  const codeText = resCode ? ` (Code: *${resCode}*)` : '';

  if (restaurant.managerPhone) {
    await sendText(restaurant, restaurant.managerPhone, `❌ *Appointment Cancelled by Patient*\n\n📱 +${phone}${codeText}`);
  }

  await sendText(restaurant, phone, `❌ Your appointment${codeText} has been cancelled.\n\nTap below anytime to reserve a new slot in the future. 👇`);
}

async function sendWelcome(restaurant: Restaurant, phone: string) {
  const defaultWelcome = `🦷 Welcome to ${restaurant.name}!\n\nBook your dental appointment or consultation slot in 10 seconds. Tap below to reserve! 👇`;
  const welcomeTxt = restaurant.customWelcomeText || defaultWelcome;

  await sendButtons(restaurant, phone,
    welcomeTxt,
    [
      { id: 'book_table', title: 'Book Appointment 📅' },
      { id: 'view_menu', title: 'Treatments & Info 📋' },
      { id: 'talk_to_us', title: 'Contact Reception 💬' },
    ],
    `🩺 ${restaurant.name}`
  );
}
