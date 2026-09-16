import type { WhatsAppMessageEvent } from '../whatsapp/parser';
import type { Client, Conversation, StepData } from '../db/schema';
import { sendText, sendButtons } from '../whatsapp/sender';

export async function handleFallback(
  event: WhatsAppMessageEvent,
  conversation: Conversation,
  client: Client,
  stepData: StepData,
): Promise<void> {
  const phone = event.from;
  
  if (conversation.currentStep === 'finalized') {
    await sendButtons(client, phone,
      '🤔 I didn\'t quite catch that!\n\nYou already have an active reservation. What would you like to do?',
      [
        { id: 'new_booking', title: 'Book Another Slot' },
        { id: 'modify_booking', title: 'Modify Booking' },
        { id: 'cancel_booking', title: 'Cancel Booking' },
      ],
      `🍽️ ${client.businessName}`,
    );
  } else {
    await sendText(client, phone,
      '🤔 I didn\'t quite catch that!\n\nPlease tap one of the buttons above, or type *"reserve"* to start a new booking.',
    );
  }
}
