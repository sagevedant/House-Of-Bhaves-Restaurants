import type { WhatsAppMessageEvent } from '../../whatsapp/parser';
import type { Restaurant, Conversation, StepData } from '../../db/schema';
import { sendButtons, sendList } from '../../whatsapp/sender';
import { extractSlots } from '../../ai/slotExtractor';
import { todayIST, currentTimeIST, getNextNDaysIST } from '../../utils/dateHelpers';
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
  const next5Days = getNextNDaysIST(5);
  const rows = next5Days.map(d => ({
    id: `date_${d.dateStr}`,
    title: d.label.slice(0, 24),
    description: `Reserve for ${d.label}`
  }));

  await sendList(
    restaurant,
    phone,
    '📅 Select your dining date (up to 5 days in advance, or type any date e.g. "3rd August"):',
    'Select Date',
    [{ title: '📅 Next 5 Available Days', rows }],
    '📅 Select Date'
  );
}
