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
      await sendText(restaurant, phone, 'No worries! Let\'s start fresh 🔄');
      await sendButtons(restaurant, phone, '👥 How many guests will be dining?\n\nTap a button or type any number:', [
        { id: 'pax_2', title: '2 People' },
        { id: 'pax_4', title: '4 People' },
        { id: 'pax_6plus', title: '6+ Group' },
      ]);
      return { nextStep: 'guests', stepData: {} };
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
  const customerName = conversation.customerName || stepData.customerName || 'Guest';
  
  const [reservation] = await db.insert(reservations).values({
    restaurantId: restaurant.id,
    customerName,
    customerPhone: conversation.phone,
    guests: stepData.guests!,
    occasion: stepData.occasion || 'casual',
    date: stepData.date!,
    time: stepData.time!,
    reservationCode: code,
    stage: 'booked',
    specialRequest: stepData.specialRequest || null,
  }).returning();

  // Also insert into commercial bookings table if client exists
  const clientMatch = await db.select().from(clients).where(eq(clients.slug, restaurant.slug)).limit(1);
  if (clientMatch.length > 0) {
    await db.insert(bookings).values({
      clientId: clientMatch[0].id,
      customerName,
      customerPhone: conversation.phone,
      guests: stepData.guests!,
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
    guests: stepData.guests!,
    occasion: stepData.occasion || 'casual',
    date: stepData.date!,
    time: stepData.time!,
    specialRequest: stepData.specialRequest || null,
    stage: 'booked',
    timestamp: new Date().toISOString(),
  });

  const occasionEmojis: Record<string, string> = { casual: '🍽️', birthday: '🎂', anniversary: '🥂', corporate: '💼', party: '🎉' };
  const occasionLabels: Record<string, string> = { casual: 'Casual Dining', birthday: 'Birthday Celebration', anniversary: 'Anniversary', corporate: 'Corporate Event', party: 'Private Party' };
  const occasionBonuses: Record<string, string> = { birthday: '\n🎂 Complimentary cake & decoration included!', anniversary: '\n🥂 Special candlelight setup arranged!' };
  
  const occasionEmoji = occasionEmojis[stepData.occasion || 'casual'] || '🍽️';
  const occasionLabel = occasionLabels[stepData.occasion || 'casual'] || 'Casual Dining';
  const occasionBonus = occasionBonuses[stepData.occasion || 'casual'] || '';

  if (restaurant.managerPhone) {
    await sendText(restaurant, restaurant.managerPhone, `🔔 *New Reservation Alert!*\n\n👤 ${customerName}\n📱 +${conversation.phone}\n👥 ${stepData.guests} Guests · ${occasionEmoji} ${occasionLabel}\n📅 ${formatDate(stepData.date!)} · ${formatTime(stepData.time!)}\n🎫 ${code}`);
  }

  await sendText(restaurant, conversation.phone, `✅ *Table Reserved!*\n\n🎫 Booking Code: *${code}*\n🍽️ ${restaurant.name}\n👤 ${customerName}\n👥 ${stepData.guests} Guests\n${occasionEmoji} ${occasionLabel}\n📅 ${formatDate(stepData.date!)} · ${formatTime(stepData.time!)}${occasionBonus}\n\nShow this code at the reception. See you soon! 🎉`);

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
