import type { WhatsAppMessageEvent } from '../../whatsapp/parser';
import type { Restaurant, Conversation, StepData } from '../../db/schema';
import { sendText, sendButtons, sendList } from '../../whatsapp/sender';
import { extractSlots } from '../../ai/slotExtractor';
import { todayIST, currentTimeIST } from '../../utils/dateHelpers';

export async function handleGuests(
  event: WhatsAppMessageEvent,
  conversation: Conversation,
  restaurant: Restaurant,
  stepData: StepData,
): Promise<{ nextStep: string; stepData: StepData } | null> {
  const phone = event.from;
  stepData.guests = 1; // Auto-default patient count to 1 for clinic
  await sendOccasionPrompt(restaurant, phone);
  return { nextStep: 'occasion', stepData };
}

export async function sendOccasionPrompt(restaurant: Restaurant, phone: string) {
  await sendList(restaurant, phone,
    '🩺 Select your treatment or consultation type:',
    'Select Treatment',
    [{
      title: '✨ Dental Treatments & OPD',
      rows: [
        { id: 'occ_casual', title: 'Consultation & Checkup 🩺', description: 'General Dental Consultation & Checkup' },
        { id: 'occ_corporate', title: 'Aligners & Braces 🦷', description: 'Clear Aligners & Invisible Orthodontics' },
        { id: 'occ_party', title: 'Root Canal & Implants 💉', description: 'Painless RCT & Dental Implants' },
        { id: 'occ_birthday', title: 'Teeth Whitening & Scaling ✨', description: 'Laser Whitening & Dental Polishing' },
      ]
    }]
  );
}
