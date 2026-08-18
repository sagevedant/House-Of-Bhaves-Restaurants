import type { WhatsAppMessageEvent } from '../../whatsapp/parser';
import type { Restaurant, Conversation, StepData } from '../../db/schema';
import { sendText, sendButtons } from '../../whatsapp/sender';
import { db } from '../../db/connection';
import { reservations, bookings, clients } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { generateReservationCode } from '../../utils/reservationCode';
import { sendToMakeWebhook } from '../../services/makeIntegration';
import { formatDate, formatTime, todayIST, currentTimeIST } from '../../utils/dateHelpers';
import { extractSlots } from '../../ai/slotExtractor';
import { sendConfirmPrompt } from './datetime';
import { sendOccasionPrompt } from './guests';

export async function handleConfirm(
  event: WhatsAppMessageEvent,
  conversation: Conversation,
  restaurant: Restaurant,
  stepData: StepData,
): Promise<{ nextStep: string; stepData: StepData } | null> {
  const phone = event.from;

  if (event.type === 'button_reply') {
    if (event.buttonId === 'confirm_yes') {
      return { nextStep: 'finalized', stepData };
    }
    if (event.buttonId === 'confirm_change') {
      await sendText(restaurant, phone, 'No worries! Let\'s select your treatment again 🔄');
      await sendOccasionPrompt(restaurant, phone);
      return { nextStep: 'occasion', stepData: { guests: 1 } };
    }
  }

  if (event.type === 'text') {
    const extracted = await extractSlots(event.text, todayIST(), currentTimeIST());
    if (extracted.intent === 'book' || !extracted.intent) {
      await sendConfirmPrompt(restaurant, phone, stepData, conversation);
      return { nextStep: 'confirm', stepData };
    }
  }

  await sendConfirmPrompt(restaurant, phone, stepData, conversation);
  return { nextStep: 'confirm', stepData };
}

export async function handleFinalize(
  event: WhatsAppMessageEvent,
  conversation: Conversation,
  restaurant: Restaurant,
  stepData: StepData,
): Promise<{ nextStep: string; stepData: StepData } | null> {
  const code = await generateReservationCode(restaurant.prefix);
  const customerName = conversation.customerName || stepData.customerName || 'Patient';
  
  const [reservation] = await db.insert(reservations).values({
    restaurantId: restaurant.id,
    customerName,
    customerPhone: conversation.phone,
    guests: stepData.guests || 1,
    occasion: stepData.occasion || 'casual',
    date: stepData.date!,
    time: stepData.time!,
    reservationCode: code,
    stage: 'booked',
    specialRequest: stepData.specialRequest || null,
  }).returning();

  // Insert into commercial bookings table if client exists
  const clientMatch = await db.select().from(clients).where(eq(clients.slug, restaurant.slug)).limit(1);
  if (clientMatch.length > 0) {
    await db.insert(bookings).values({
      clientId: clientMatch[0].id,
      customerName,
      customerPhone: conversation.phone,
      guests: stepData.guests || 1,
      occasion: stepData.occasion || 'casual',
      date: stepData.date!,
      time: stepData.time!,
      reservationCode: code,
      status: 'booked',
      specialRequest: stepData.specialRequest || null,
    });
  }

  stepData.reservationId = reservation.id;
  stepData.reservationCode = code;

  await sendToMakeWebhook({
    event: 'reservation_created',
    reservationId: reservation.id,
    reservationCode: code,
    restaurantName: restaurant.name,
    customerName,
    customerPhone: conversation.phone,
    guests: stepData.guests || 1,
    occasion: stepData.occasion || 'casual',
    date: stepData.date!,
    time: stepData.time!,
    specialRequest: stepData.specialRequest || null,
    stage: 'booked',
    timestamp: new Date().toISOString(),
  });

  const occLabels: Record<string, string> = { 
    casual: 'Consultation & Checkup', 
    birthday: 'Teeth Whitening', 
    anniversary: 'Anniversary Special', 
    corporate: 'Aligners & Braces', 
    party: 'Root Canal & Implants' 
  };
  
  const treatmentType = occLabels[stepData.occasion || 'casual'] || 'Consultation';

  if (restaurant.managerPhone) {
    await sendText(restaurant, restaurant.managerPhone, `🔔 *New Dental Appointment Alert!*\n\n👤 ${customerName}\n📱 +${conversation.phone}\n🩺 ${treatmentType}\n📅 ${formatDate(stepData.date!)} · ${formatTime(stepData.time!)}\n🎫 ${code}`);
  }

  await sendText(restaurant, conversation.phone, `✅ *Appointment Reserved!*\n\n🎫 Booking Code: *${code}*\n🩺 ${restaurant.name}\n👤 ${customerName}\n✨ ${treatmentType}\n📅 ${formatDate(stepData.date!)} · ${formatTime(stepData.time!)}\n\nPlease show this code at the clinic reception. See you soon! 😊`);

  return { nextStep: 'finalized', stepData };
}

export async function handlePostFinalize(
  event: WhatsAppMessageEvent,
  conversation: Conversation,
  restaurant: Restaurant,
  stepData: StepData,
): Promise<void> {
  return;
}
