import { db } from '../db/connection';
import { clients, conversations, type Client, type Conversation, type StepData } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { WhatsAppEvent, WhatsAppMessageEvent } from '../whatsapp/parser';
import { sendText, markAsRead } from '../whatsapp/sender';
import { handleFallback } from './fallback';
import { handleEntry } from './steps/entry';
import { handleGuests } from './steps/guests';
import { handleOccasion } from './steps/occasion';
import { handleDateTimeDate, handleDateTimeTime } from './steps/datetime';
import { handleConfirm, handleFinalize } from './steps/confirm';
import { extractSlots } from '../ai/slotExtractor';
import { findAnswer } from './knowledge';
import { todayIST, currentTimeIST } from '../utils/dateHelpers';

export async function handleIncomingEvent(phoneNumberId: string, event: WhatsAppEvent): Promise<void> {
  if (event.type === 'status_update') {
    console.log('ℹ️ Router: Status update event ignored');
    return;
  }
  const msgEvent = event as WhatsAppMessageEvent;

  // Look up client by matching WhatsApp Phone Number ID (Multi-Tenant Routing)
  let clientResult = await db.select().from(clients).where(eq(clients.whatsappPhoneNumberId, phoneNumberId)).limit(1);
  let client = clientResult[0];

  if (!client) {
    console.warn(`⚠️ Router: No client registered with Phone ID '${phoneNumberId}'. Falling back to first active client...`);
    const all = await db.select().from(clients).where(eq(clients.active, true)).limit(1);
    client = all[0];
    if (!client) {
      console.error('❌ Router: No active clients in database!');
      return;
    }
  }

  await markAsRead(client, msgEvent.messageId);

  const phone = msgEvent.from;
  if (!phone) {
    console.warn('⚠️ Router: Missing sender phone number in event');
    return;
  }

  const convResult = await db.select().from(conversations).where(
    and(eq(conversations.phone, phone), eq(conversations.clientId, client.id))
  ).limit(1);

  let conversation: Conversation;
  if (!convResult || convResult.length === 0) {
    console.log(`✨ Router: Creating NEW conversation for phone '${phone}' at client '${client.businessName}'`);
    const [newConv] = await db.insert(conversations).values({
      phone,
      clientId: client.id,
      currentStep: 'entry',
      stepData: '{}',
      customerName: msgEvent.customerName || null,
    }).returning();
    conversation = newConv;
    await handleEntry(msgEvent, conversation, client, {});
    return;
  } else {
    conversation = convResult[0];
  }

  let stepData: StepData = JSON.parse(conversation.stepData || '{}');
  let currentStep = (conversation.currentStep || 'entry') as string;

  if (msgEvent.type === 'text' && currentStep !== 'entry' && currentStep !== 'finalized') {
    const extracted = await extractSlots(msgEvent.text, todayIST(), currentTimeIST());
    if (extracted.intent === 'question' && extracted.question) {
      await db.update(conversations).set({ interruptedStep: currentStep }).where(eq(conversations.id, conversation.id));
      const answer = findAnswer(extracted.question);
      if (answer) {
        await sendText(client, phone, answer);
      } else {
        await sendText(client, phone, 'Great question! For specific queries, please call us at ' + (client.managerPhone || '+919511673214') + '.');
      }
      await sendText(client, phone, 'Now let\'s get back to your booking! 😊');
      
      const syntheticEvent = { ...msgEvent, type: 'text', text: '' } as WhatsAppMessageEvent;
      await routeStep(currentStep, syntheticEvent, conversation, client, stepData);
      return;
    }
  }

  let result = await routeStep(currentStep, msgEvent, conversation, client, stepData);

  if (result) {
    const { nextStep, stepData: newStepData } = result;
    
    await db.update(conversations).set({
      currentStep: nextStep as any,
      stepData: JSON.stringify(newStepData),
      customerName: newStepData.customerName || conversation.customerName,
      updatedAt: new Date().toISOString()
    }).where(eq(conversations.id, conversation.id));

    if (nextStep === 'finalized' && currentStep !== 'finalized') {
      const finalResult = await handleFinalize(msgEvent, conversation, client, newStepData);
      if (finalResult) {
        await db.update(conversations).set({
          currentStep: finalResult.nextStep as any,
          stepData: JSON.stringify(finalResult.stepData)
        }).where(eq(conversations.id, conversation.id));
      }
    }
  } else {
    await handleFallback(msgEvent, conversation, client, stepData);
  }
}

async function routeStep(
  currentStep: string,
  msgEvent: WhatsAppMessageEvent,
  conversation: Conversation,
  client: Client,
  stepData: StepData
): Promise<{ nextStep: string; stepData: StepData } | null> {
  try {
    switch (currentStep) {
      case 'entry':
        return await handleEntry(msgEvent, conversation, client, stepData);
      case 'guests':
        return await handleGuests(msgEvent, conversation, client, stepData);
      case 'occasion':
        return await handleOccasion(msgEvent, conversation, client, stepData);
      case 'datetime_date':
        return await handleDateTimeDate(msgEvent, conversation, client, stepData);
      case 'datetime_time':
        return await handleDateTimeTime(msgEvent, conversation, client, stepData);
      case 'confirm':
        return await handleConfirm(msgEvent, conversation, client, stepData);
      case 'finalized':
        return await handleEntry(msgEvent, conversation, client, stepData);
      default:
        return null;
    }
  } catch (error) {
    console.error('Routing error:', error);
    await sendText(client, msgEvent.from, 'Oops! Something went wrong on our end. Please try again.');
    return null;
  }
}
