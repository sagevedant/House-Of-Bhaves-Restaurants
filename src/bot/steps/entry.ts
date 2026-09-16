import type { WhatsAppMessageEvent } from '../../whatsapp/parser';
import type { Client, Conversation, StepData } from '../../db/schema';
import { sendText, sendButtons, sendList } from '../../whatsapp/sender';
import { extractSlots } from '../../ai/slotExtractor';
import { findAnswer } from '../knowledge';
import { todayIST, currentTimeIST, formatDate, formatTime, getAvailableTimeSlots } from '../../utils/dateHelpers';
import { db } from '../../db/connection';
import { bookings } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { sendOccasionPrompt } from './guests';

export async function handleEntry(
  event: WhatsAppMessageEvent,
  conversation: Conversation,
  client: Client,
  stepData: StepData,
): Promise<{ nextStep: string; stepData: StepData } | null> {
  const phone = event.from;

  if (event.type === 'button_reply') {
    if (event.buttonId === 'book_table') {
      stepData.guests = 1; // Default guest/patient count
      await sendOccasionPrompt(client, phone);
      return { nextStep: 'occasion', stepData };
    }
    if (event.buttonId === 'view_menu' || event.buttonId === 'view_cuisines') {
      const defaultMenu = `🍽️ *Welcome to ${client.businessName}* ✨\n\n• Special chef recommendations & dining packages\n• Relaxed seating & curated beverages\n\nTap below to reserve your table slot in seconds! 👇`;
      const menuTxt = client.customMenuText || defaultMenu;
      
      await sendButtons(client, phone, menuTxt, [
        { id: 'book_table', title: 'Book Table 📅' },
        { id: 'talk_to_us', title: 'Talk to Us 💬' },
      ], `📋 Cuisines & Services`);
      return { nextStep: 'entry', stepData };
    }
    if (event.buttonId === 'talk_to_us') {
      await sendText(client, phone, `📞 You can reach our front-desk reception at ${client.managerPhone || '+919511673214'}.`);
      return { nextStep: 'entry', stepData };
    }
    if (event.buttonId === 'new_booking') {
      stepData.guests = 1;
      await sendOccasionPrompt(client, phone);
      return { nextStep: 'occasion', stepData: { guests: 1 } };
    }
    if (event.buttonId === 'modify_booking') {
      await sendText(client, phone, `Please call our reservations team at ${client.managerPhone || '+919511673214'} to modify your reservation.`);
      return { nextStep: 'finalized', stepData };
    }
    if (event.buttonId === 'cancel_booking') {
      await cancelUserBooking(phone, client, stepData);
      return { nextStep: 'entry', stepData: {} };
    }
  }

  if (event.type === 'text') {
    const extracted = await extractSlots(event.text, todayIST(), currentTimeIST());
    const name = extracted.name || event.customerName;
    if (name) stepData.customerName = name;
    
    if (extracted.intent === 'greeting' || extracted.intent === 'book' || !extracted.intent) {
      if (conversation.currentStep === 'finalized' && extracted.intent === 'greeting') {
        await sendButtons(client, phone, 'Welcome back! 😊 You have an existing reservation.\n\nWould you like to:', [
          { id: 'new_booking', title: 'Book Another Slot' },
          { id: 'modify_booking', title: 'Modify Booking' },
          { id: 'cancel_booking', title: 'Cancel Booking' },
        ]);
        return { nextStep: 'entry', stepData };
      }

      stepData.guests = 1;
      if (extracted.occasion) stepData.occasion = extracted.occasion;
      if (extracted.date) stepData.date = extracted.date;
      if (extracted.time) stepData.time = extracted.time;

      if (extracted.intent === 'book') {
        if (stepData.occasion && stepData.date && stepData.time) {
          const occLabels: Record<string, string> = { 
            casual: 'Casual Dining', 
            birthday: 'Birthday Celebration 🎂', 
            anniversary: 'Anniversary Special 🥂', 
            corporate: 'Corporate Dinner 💼', 
            party: 'Party / Event 🎉' 
          };
          const occ = stepData.occasion || 'casual';
          const txt = `📋 *Your Reservation Summary:*\n\n🍽️ ${client.businessName}\n👤 ${stepData.customerName || 'Guest'}\n✨ ${occLabels[occ] || 'Reservation'}\n📅 ${formatDate(stepData.date!)}\n🕐 ${formatTime(stepData.time!)}\n\nDoes everything look good?`;
          await sendButtons(client, phone, txt, [{ id: 'confirm_yes', title: 'Confirm ✅' }, { id: 'confirm_change', title: 'Change ↩️' }]);
          return { nextStep: 'confirm', stepData };
        } else if (!stepData.occasion) {
          await sendOccasionPrompt(client, phone);
          return { nextStep: 'occasion', stepData };
        } else if (!stepData.date) {
          await sendButtons(client, phone, '📅 When would you like to visit?\n\nPick a date or type a day (e.g. "Friday", "Kal"):', [ { id: 'date_today', title: 'Today' }, { id: 'date_tomorrow', title: 'Tomorrow' }, { id: 'date_dayafter', title: 'Day After' } ], '📅 Select Date');
          return { nextStep: 'datetime_date', stepData };
        } else if (!stepData.time) {
          const slots = getAvailableTimeSlots(stepData.date!, client.openingHoursLunch || '12:00-15:30', client.openingHoursDinner || '19:00-23:00');
          const sections = slots.filter(s => s.slots.length > 0).map(s => ({ title: `${s.period} Slots`, rows: s.slots.map(slot => ({ id: `time_${slot.replace(':', '_')}`, title: formatTime(slot) })) }));
          if (sections.length > 0) {
            await sendList(client, phone, '🕐 Pick your preferred time slot:', 'Select Time', sections);
          }
          return { nextStep: 'datetime_time', stepData };
        }
      }
    }
    
    if (extracted.intent === 'question' && extracted.question) {
      const answer = findAnswer(extracted.question);
      if (answer) {
        await sendText(client, phone, answer);
      } else {
        await sendText(client, phone, `Great question! For specific queries, please call us at ${client.managerPhone || '+919511673214'}.`);
      }
      await sendWelcome(client, phone);
      return { nextStep: 'entry', stepData };
    }
    if (extracted.intent === 'cancel') {
      await cancelUserBooking(phone, client, stepData);
      return { nextStep: 'entry', stepData: {} };
    }
    if (extracted.intent === 'modify' && conversation.currentStep === 'finalized') {
      await sendText(client, phone, `Please call our team at ${client.managerPhone || '+919511673214'} to modify your booking.`);
      return { nextStep: 'finalized', stepData };
    }
  }

  await sendWelcome(client, phone);
  return { nextStep: 'entry', stepData };
}

async function cancelUserBooking(phone: string, client: Client, stepData: StepData) {
  let resCode = stepData.reservationCode;

  const activeBookings = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.customerPhone, phone), eq(bookings.clientId, client.id), eq(bookings.status, 'booked')))
    .orderBy(desc(bookings.createdAt));
  
  if (activeBookings.length > 0) {
    resCode = activeBookings[0].reservationCode || resCode;
    await db.update(bookings).set({ status: 'cancelled' }).where(eq(bookings.id, activeBookings[0].id));
  }

  const codeText = resCode ? ` (Code: *${resCode}*)` : '';

  if (client.managerPhone) {
    await sendText(client, client.managerPhone, `❌ *Reservation Cancelled by Guest*\n\n📱 +${phone}${codeText}`);
  }

  await sendText(client, phone, `❌ Your reservation${codeText} has been cancelled.\n\nTap below anytime to reserve a new slot in the future. 👇`);
}

async function sendWelcome(client: Client, phone: string) {
  const defaultWelcome = `🍽️ Welcome to ${client.businessName}!\n\nBook your dining table or appointment slot in 10 seconds. Tap below to reserve! 👇`;
  const welcomeTxt = client.customWelcomeText || defaultWelcome;

  await sendButtons(client, phone,
    welcomeTxt,
    [
      { id: 'book_table', title: 'Book Slot 📅' },
      { id: 'view_menu', title: 'Menu & Info 📋' },
      { id: 'talk_to_us', title: 'Contact Reception 💬' },
    ],
    `🍽️ ${client.businessName}`
  );
}
