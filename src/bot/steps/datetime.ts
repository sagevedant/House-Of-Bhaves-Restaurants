import type { WhatsAppMessageEvent } from '../../whatsapp/parser';
import type { Restaurant, Conversation, StepData } from '../../db/schema';
import { sendButtons, sendList, sendText } from '../../whatsapp/sender';
import { extractSlots } from '../../ai/slotExtractor';
import { todayIST, currentTimeIST, tomorrowIST, dayAfterTomorrowIST, resolveDateInput, getDayName, getAvailableTimeSlots, formatDate, formatTime } from '../../utils/dateHelpers';
import { sendDatePrompt } from './occasion';

export async function handleDateTimeDate(
  event: WhatsAppMessageEvent,
  conversation: Conversation,
  restaurant: Restaurant,
  stepData: StepData,
): Promise<{ nextStep: string; stepData: StepData } | null> {
  const phone = event.from;

  if (stepData.date) {
    await sendTimePrompt(restaurant, phone, stepData.date);
    return { nextStep: 'datetime_time', stepData };
  }

  let date: string | undefined;

  if (event.type === 'list_reply' && event.rowId.startsWith('date_')) {
    date = event.rowId.replace('date_', '');
  } else if (event.type === 'button_reply') {
    if (event.buttonId === 'date_today') date = todayIST();
    if (event.buttonId === 'date_tomorrow') date = tomorrowIST();
    if (event.buttonId === 'date_dayafter') date = dayAfterTomorrowIST();
    if (event.buttonId.startsWith('date_')) date = event.buttonId.replace('date_', '');
  } else if (event.type === 'text') {
    const resolved = resolveDateInput(event.text);
    if (resolved) {
      date = resolved;
    } else {
      const extracted = await extractSlots(event.text, todayIST(), currentTimeIST());
      if (extracted.date) {
        date = extracted.date;
      }
    }
  }

  if (date) {
    const day = getDayName(date).toLowerCase();
    if (restaurant.closedDays?.toLowerCase().includes(day)) {
      await sendText(restaurant, phone, `Sorry, we're closed on ${getDayName(date)}s! Please pick another day 🙏`);
      await sendDatePrompt(restaurant, phone);
      return { nextStep: 'datetime_date', stepData };
    }

    const slots = getAvailableTimeSlots(date, restaurant.openingHoursLunch || '', restaurant.openingHoursDinner || '19:00-00:30');
    if (!slots || slots.length === 0 || slots.every(s => s.slots.length === 0)) {
      await sendText(restaurant, phone, `All slots for ${formatDate(date)} are full or closed! How about another day? 🌟`);
      await sendDatePrompt(restaurant, phone);
      return { nextStep: 'datetime_date', stepData };
    }

    stepData.date = date;
    await sendTimePrompt(restaurant, phone, date);
    return { nextStep: 'datetime_time', stepData };
  }

  await sendDatePrompt(restaurant, phone);
  return { nextStep: 'datetime_date', stepData };
}

export async function sendTimePrompt(restaurant: Restaurant, phone: string, date: string) {
  const lunchHours = restaurant.openingHoursLunch !== null && restaurant.openingHoursLunch !== undefined ? restaurant.openingHoursLunch : '';
  const dinnerHours = restaurant.openingHoursDinner || '19:00-00:30';

  const slots = getAvailableTimeSlots(date, lunchHours, dinnerHours);
  const sections = slots.filter(s => s.slots.length > 0).map(s => ({
    title: s.period === 'Lunch' ? '🌞 Lunch (Afternoon)' : '🌙 Dinner (Evening)',
    rows: s.slots.map(slot => ({
      id: `time_${slot.replace(':', '_')}`,
      title: formatTime(slot),
      description: s.period === 'Lunch' ? 'Afternoon Slot (Lunch)' : 'Evening Slot (Dinner)'
    }))
  }));
  
  if (sections.length > 0) {
    await sendList(restaurant, phone, '🕐 Select your time slot [Afternoon (Lunch) or Evening (Dinner)]:', 'Select Time Slot', sections);
  } else {
    await sendText(restaurant, phone, `No available slots for ${formatDate(date)}. Please select another day!`);
  }
}

export async function handleDateTimeTime(
  event: WhatsAppMessageEvent,
  conversation: Conversation,
  restaurant: Restaurant,
  stepData: StepData,
): Promise<{ nextStep: string; stepData: StepData } | null> {
  const phone = event.from;

  if (stepData.time) {
    await sendConfirmPrompt(restaurant, phone, stepData, conversation);
    return { nextStep: 'confirm', stepData };
  }

  let time: string | undefined;

  if (event.type === 'list_reply' && event.rowId.startsWith('time_')) {
    time = event.rowId.replace('time_', '').replace('_', ':');
  } else if (event.type === 'text') {
    const extracted = await extractSlots(event.text, todayIST(), currentTimeIST());
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

export async function sendConfirmPrompt(restaurant: Restaurant, phone: string, stepData: StepData, conversation: Conversation) {
  const occasionEmojis: Record<string, string> = { casual: '🍽️', birthday: '🎂', anniversary: '🥂', corporate: '💼', party: '🎉' };
  const occasionLabels: Record<string, string> = { casual: 'Casual Dining', birthday: 'Birthday Celebration', anniversary: 'Anniversary', corporate: 'Corporate Event', party: 'Private Party' };
  
  const occasion = stepData.occasion || 'casual';
  const occasionEmoji = occasionEmojis[occasion] || '🍽️';
  const occasionLabel = occasionLabels[occasion] || 'Casual Dining';
  
  const text = `📋 *Your Reservation Summary:*\n\n🍽️ ${restaurant.name}\n👤 ${conversation.customerName || stepData.customerName || 'Guest'}\n👥 ${stepData.guests} Guests\n${occasionEmoji} ${occasionLabel}\n📅 ${formatDate(stepData.date!)}\n🕐 ${formatTime(stepData.time!)}\n\nDoes everything look good?`;
  
  await sendButtons(restaurant, phone, text, [
    { id: 'confirm_yes', title: 'Confirm ✅' },
    { id: 'confirm_change', title: 'Change ↩️' },
  ]);
}
