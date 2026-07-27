import type { WhatsAppMessageEvent } from '../../whatsapp/parser';
import type { Restaurant, Conversation, StepData } from '../../db/schema';
import { sendText, sendButtons, sendList } from '../../whatsapp/sender';
import { extractSlots } from '../../ai/slotExtractor';
import { findAnswer } from '../knowledge';
import { todayIST, currentTimeIST, formatDate, formatTime, getAvailableTimeSlots } from '../../utils/dateHelpers';

export async function handleEntry(
  event: WhatsAppMessageEvent,
  conversation: Conversation,
  restaurant: Restaurant,
  stepData: StepData,
): Promise<{ nextStep: string; stepData: StepData } | null> {
  const phone = event.from;

  if (event.type === 'button_reply') {
    if (event.buttonId === 'book_table') {
      await sendButtons(restaurant, phone, '👥 How many guests will be dining?\n\nTap a button or type any number:', [
        { id: 'pax_2', title: '2 People' },
        { id: 'pax_4', title: '4 People' },
        { id: 'pax_6plus', title: '6+ Group' },
      ]);
      return { nextStep: 'guests', stepData };
    }
    if (event.buttonId === 'view_menu') {
      await sendText(restaurant, phone, '📋 Here is our menu link: https://spicefactory.com/menu');
      return { nextStep: 'entry', stepData };
    }
    if (event.buttonId === 'talk_to_us') {
      await sendText(restaurant, phone, `📞 You can reach our manager at ${restaurant.managerPhone || '+123456789'}.`);
      return { nextStep: 'entry', stepData };
    }
    if (event.buttonId === 'new_booking') {
      await sendButtons(restaurant, phone, '👥 How many guests will be dining?\n\nTap a button or type any number:', [
        { id: 'pax_2', title: '2 People' },
        { id: 'pax_4', title: '4 People' },
        { id: 'pax_6plus', title: '6+ Group' },
      ]);
      return { nextStep: 'guests', stepData: {} };
    }
    if (event.buttonId === 'modify_booking') {
      await sendText(restaurant, phone, 'Please call the restaurant to modify your booking.');
      return { nextStep: 'finalized', stepData };
    }
    if (event.buttonId === 'cancel_booking') {
      await sendText(restaurant, phone, 'Your booking has been cancelled.');
      return { nextStep: 'finalized', stepData };
    }
  }

  if (event.type === 'text') {
    const extracted = await extractSlots(event.text, todayIST(), currentTimeIST());
    const name = extracted.name || event.customerName;
    if (name) stepData.customerName = name;
    
    if (extracted.intent === 'greeting' || extracted.intent === 'book' || !extracted.intent) {
      if (conversation.currentStep === 'finalized' && extracted.intent === 'greeting') {
        await sendButtons(restaurant, phone, 'Welcome back! 😊 You have an existing reservation.\n\nWould you like to:', [
          { id: 'new_booking', title: 'Book Another Table' },
          { id: 'modify_booking', title: 'Modify Booking' },
          { id: 'cancel_booking', title: 'Cancel Booking' },
        ]);
        return { nextStep: 'entry', stepData };
      }

      if (extracted.guests) stepData.guests = extracted.guests;
      if (extracted.occasion) stepData.occasion = extracted.occasion;
      if (extracted.date) stepData.date = extracted.date;
      if (extracted.time) stepData.time = extracted.time;

      if (extracted.intent === 'book') {
        if (stepData.guests && stepData.occasion && stepData.date && stepData.time) {
          const occEmojis: Record<string, string> = { casual: '🍽️', birthday: '🎂', anniversary: '🥂', corporate: '💼', party: '🎉' };
          const occLabels: Record<string, string> = { casual: 'Casual Dining', birthday: 'Birthday Celebration', anniversary: 'Anniversary', corporate: 'Corporate Event', party: 'Private Party' };
          const occ = stepData.occasion || 'casual';
          const txt = `📋 *Your Reservation Summary:*\n\n🍽️ ${restaurant.name}\n👤 ${stepData.customerName || 'Guest'}\n👥 ${stepData.guests} Guests\n${occEmojis[occ]} ${occLabels[occ]}\n📅 ${formatDate(stepData.date!)}\n🕐 ${formatTime(stepData.time!)}\n\nDoes everything look good?`;
          await sendButtons(restaurant, phone, txt, [{ id: 'confirm_yes', title: 'Confirm ✅' }, { id: 'confirm_change', title: 'Change ↩️' }]);
          return { nextStep: 'confirm', stepData };
        } else if (!stepData.guests) {
          await sendButtons(restaurant, phone, '👥 How many guests will be dining?\n\nTap a button or type any number:', [ { id: 'pax_2', title: '2 People' }, { id: 'pax_4', title: '4 People' }, { id: 'pax_6plus', title: '6+ Group' } ]);
          return { nextStep: 'guests', stepData };
        } else if (!stepData.occasion) {
          await sendList(restaurant, phone, '🎉 Any special occasion?\n\nWe\'ll make it extra special! Select the vibe for your evening:', 'Select Occasion', [{ title: '✨ Occasion Type', rows: [ { id: 'occ_casual', title: 'Casual Dining 🍽️', description: 'Just a great meal with great company' }, { id: 'occ_birthday', title: 'Birthday 🎂', description: 'Complimentary cake & table décor' }, { id: 'occ_anniversary', title: 'Anniversary 🥂', description: 'Candlelight table setup' }, { id: 'occ_corporate', title: 'Corporate 💼', description: 'Private seating arrangement' }, { id: 'occ_party', title: 'Private Party 🎉', description: 'Dedicated area with music' } ] }]);
          return { nextStep: 'occasion', stepData };
        } else if (!stepData.date) {
          await sendButtons(restaurant, phone, '📅 When would you like to dine?\n\nPick a date or type a day (e.g. "Friday", "Kal"):', [ { id: 'date_today', title: 'Today' }, { id: 'date_tomorrow', title: 'Tomorrow' }, { id: 'date_dayafter', title: 'Day After' } ], '📅 Select Date');
          return { nextStep: 'datetime_date', stepData };
        } else if (!stepData.time) {
          const slots = getAvailableTimeSlots(stepData.date!, restaurant.openingHoursLunch || '12:00-15:30', restaurant.openingHoursDinner || '19:00-23:00');
          const sections = slots.filter(s => s.slots.length > 0).map(s => ({ title: `${s.period} service`, rows: s.slots.map(slot => ({ id: `time_${slot.replace(':', '_')}`, title: formatTime(slot) })) }));
          if (sections.length > 0) {
            await sendList(restaurant, phone, '🕐 Pick your preferred time slot:', 'Select Time', sections);
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
        await sendText(restaurant, phone, 'Great question! For specific queries, please call us.');
      }
      await sendWelcome(restaurant, phone);
      return { nextStep: 'entry', stepData };
    }
    if (extracted.intent === 'cancel' && conversation.currentStep === 'finalized') {
      await sendText(restaurant, phone, 'Your booking has been cancelled.');
      return { nextStep: 'finalized', stepData };
    }
    if (extracted.intent === 'modify' && conversation.currentStep === 'finalized') {
      await sendText(restaurant, phone, 'Please call the restaurant to modify your booking.');
      return { nextStep: 'finalized', stepData };
    }
  }

  await sendWelcome(restaurant, phone);
  return { nextStep: 'entry', stepData };
}

async function sendWelcome(restaurant: Restaurant, phone: string) {
  await sendButtons(restaurant, phone,
    '🍽️ Welcome to Spice Factory Rooftop & Lounge!\n\nWhether it\'s a cozy dinner, a birthday celebration, or an evening under the stars — we\'ve got the perfect table for you.\n\nTap below to reserve your table instantly! 👇',
    [
      { id: 'book_table', title: 'Book a Table 🍽️' },
      { id: 'view_menu', title: 'Our Menu 📋' },
      { id: 'talk_to_us', title: 'Talk to Us 💬' },
    ],
    '🍽️ Spice Factory'
  );
}
