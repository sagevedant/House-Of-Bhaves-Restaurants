import { db } from '../db/connection';
import { restaurants, conversations, type Restaurant, type Conversation, type StepData } from '../db/schema';
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

  let restaurantResult = await db.select().from(restaurants).where(eq(restaurants.whatsappPhoneNumberId, phoneNumberId)).limit(1);
  let restaurant = restaurantResult[0];

  if (!restaurant) {
    console.warn(`⚠️ Router: No exact match for phoneNumberId '${phoneNumberId}'. Falling back to default restaurant...`);
    const all = await db.select().from(restaurants).limit(1);
    restaurant = all[0];
    if (!restaurant) {
      console.error('❌ Router: No restaurants in database!');
      return;
    }
  }

  await markAsRead(restaurant, msgEvent.messageId);

  const phone = msgEvent.from;
  if (!phone) {
    console.warn('⚠️ Router: Missing sender phone number in event');
    return;
  }

  const convResult = await db.select().from(conversations).where(
    and(eq(conversations.phone, phone), eq(conversations.restaurantId, restaurant.id))
  ).limit(1);

  let conversation: Conversation;
  if (!convResult || convResult.length === 0) {
    console.log(`✨ Router: Creating NEW conversation for phone '${phone}'`);
    const [newConv] = await db.insert(conversations).values({
      phone,
      restaurantId: restaurant.id,
      currentStep: 'entry',
      stepData: '{}',
      customerName: msgEvent.customerName || null,
    }).returning();
    conversation = newConv;
    await handleEntry(msgEvent, conversation, restaurant, {});
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
        await sendText(restaurant, phone, answer);
      } else {
        await sendText(restaurant, phone, 'Great question! For specific queries, please call us at ' + (restaurant.managerPhone || '+123456789') + '.');
      }
      await sendText(restaurant, phone, 'Now let\'s get back to your booking! 😊');
      
      const syntheticEvent = { ...msgEvent, type: 'text', text: '' } as WhatsAppMessageEvent;
      await routeStep(currentStep, syntheticEvent, conversation, restaurant, stepData);
      return;
    }
  }

  let result = await routeStep(currentStep, msgEvent, conversation, restaurant, stepData);

  if (result) {
    const { nextStep, stepData: newStepData } = result;
    
    await db.update(conversations).set({
      currentStep: nextStep as any,
      stepData: JSON.stringify(newStepData),
      customerName: newStepData.customerName || conversation.customerName,
      updatedAt: new Date().toISOString()
    }).where(eq(conversations.id, conversation.id));

    if (nextStep === 'finalized' && currentStep !== 'finalized') {
      const finalResult = await handleFinalize(msgEvent, conversation, restaurant, newStepData);
      if (finalResult) {
        await db.update(conversations).set({
          currentStep: finalResult.nextStep as any,
          stepData: JSON.stringify(finalResult.stepData)
        }).where(eq(conversations.id, conversation.id));
      }
    }
  } else {
    await handleFallback(msgEvent, conversation, restaurant, stepData);
  }
}

async function routeStep(
  currentStep: string,
  msgEvent: WhatsAppMessageEvent,
  conversation: Conversation,
  restaurant: Restaurant,
  stepData: StepData
): Promise<{ nextStep: string; stepData: StepData } | null> {
  try {
    switch (currentStep) {
      case 'entry':
        return await handleEntry(msgEvent, conversation, restaurant, stepData);
      case 'guests':
        return await handleGuests(msgEvent, conversation, restaurant, stepData);
      case 'occasion':
        return await handleOccasion(msgEvent, conversation, restaurant, stepData);
      case 'datetime_date':
        return await handleDateTimeDate(msgEvent, conversation, restaurant, stepData);
      case 'datetime_time':
        return await handleDateTimeTime(msgEvent, conversation, restaurant, stepData);
      case 'confirm':
        return await handleConfirm(msgEvent, conversation, restaurant, stepData);
      case 'finalized':
        return await handleEntry(msgEvent, conversation, restaurant, stepData);
      default:
        return null;
    }
  } catch (error) {
    console.error('Routing error:', error);
    await sendText(restaurant, msgEvent.from, 'Oops! Something went wrong on our end. Please try again.');
    return null;
  }
}
