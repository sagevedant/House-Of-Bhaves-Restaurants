import type { WhatsAppMessageEvent } from '../whatsapp/parser';
import type { Restaurant, Conversation, StepData } from '../db/schema';
import { sendText, sendButtons } from '../whatsapp/sender';

export async function handleFallback(
  event: WhatsAppMessageEvent,
  conversation: Conversation,
  restaurant: Restaurant,
  stepData: StepData,
): Promise<void> {
  const phone = event.from;
  
  if (conversation.currentStep === 'finalized') {
    await sendButtons(restaurant, phone,
      '🤔 I didn\'t quite catch that!\n\nYou already have an active reservation. What would you like to do?',
      [
        { id: 'new_booking', title: 'Book Another Table' },
        { id: 'modify_booking', title: 'Modify Booking' },
        { id: 'cancel_booking', title: 'Cancel Booking' },
      ],
      '🍽️ Spice Factory',
    );
  } else {
    await sendText(restaurant, phone,
      '🤔 I didn\'t quite catch that!\n\nPlease tap one of the buttons above, or type *"reserve"* to start a new booking.',
    );
  }
}
