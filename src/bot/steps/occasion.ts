import type { WhatsAppMessageEvent } from '../../whatsapp/parser';
import type { Restaurant, Conversation, StepData } from '../../db/schema';
import { sendButtons } from '../../whatsapp/sender';
import { extractSlots } from '../../ai/slotExtractor';
import { todayIST, currentTimeIST } from '../../utils/dateHelpers';
import { sendOccasionPrompt } from './guests';

export async function handleOccasion(
  event: WhatsAppMessageEvent,
  conversation: Conversation,
  restaurant: Restaurant,
  stepData: StepData,
): Promise<{ nextStep: string; stepData: StepData } | null> {
  const phone = event.from;

  if (stepData.occasion) {
    await sendDatePrompt(restaurant, phone);
    return { nextStep: 'datetime_date', stepData };
  }

  let occasion: StepData['occasion'] | undefined;

  if (event.type === 'list_reply') {
    const map: Record<string, StepData['occasion']> = {
      occ_casual: 'casual', occ_birthday: 'birthday', occ_anniversary: 'anniversary', occ_corporate: 'corporate', occ_party: 'party'
    };
    occasion = map[event.rowId];
  } else if (event.type === 'text') {
    const extracted = await extractSlots(event.text, todayIST(), currentTimeIST());
    occasion = extracted.occasion;
  }

  if (occasion) {
    stepData.occasion = occasion;
    await sendDatePrompt(restaurant, phone);
    return { nextStep: 'datetime_date', stepData };
  }

  await sendOccasionPrompt(restaurant, phone);
  return { nextStep: 'occasion', stepData };
}

export async function sendDatePrompt(restaurant: Restaurant, phone: string) {
  await sendButtons(restaurant, phone,
    '📅 When would you like to dine?\n\nPick a date or type a day (e.g. "Friday", "Kal"):',
    [
      { id: 'date_today', title: 'Today' },
      { id: 'date_tomorrow', title: 'Tomorrow' },
      { id: 'date_dayafter', title: 'Day After' },
    ],
    '📅 Select Date'
  );
}
