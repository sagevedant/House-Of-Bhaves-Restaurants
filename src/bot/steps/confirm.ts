import type { WhatsAppMessageEvent } from '../../whatsapp/parser';
import type { Client, Conversation, StepData } from '../../db/schema';
import { sendText } from '../../whatsapp/sender';
import { db } from '../../db/connection';
import { bookings } from '../../db/schema';
import { generateReservationCode } from '../../utils/reservationCode';
import { sendToMakeWebhook } from '../../services/makeIntegration';
import { formatDate, formatTime, todayIST, currentTimeIST } from '../../utils/dateHelpers';
import { extractSlots } from '../../ai/slotExtractor';
import { sendConfirmPrompt } from './datetime';
import { sendOccasionPrompt } from './guests';
import { checkOutboundQuota, incrementOutboundCounter } from '../../services/quotaService';

export async function handleConfirm(
  event: WhatsAppMessageEvent,
  conversation: Conversation,
  client: Client,
  stepData: StepData,
): Promise<{ nextStep: string; stepData: StepData } | null> {
  const phone = event.from;

  if (event.type === 'button_reply') {
    if (event.buttonId === 'confirm_yes') {
      return { nextStep: 'finalized', stepData };
    }
    if (event.buttonId === 'confirm_change') {
      await sendText(client, phone, 'No worries! Let\'s select your treatment again 🔄');
      await sendOccasionPrompt(client, phone);
      return { nextStep: 'occasion', stepData: { guests: 1 } };
    }
  }

  if (event.type === 'text') {
    const extracted = await extractSlots(event.text, todayIST(), currentTimeIST());
    if (extracted.intent === 'book' || !extracted.intent) {
      await sendConfirmPrompt(client, phone, stepData, conversation);
      return { nextStep: 'confirm', stepData };
    }
  }

  await sendConfirmPrompt(client, phone, stepData, conversation);
  return { nextStep: 'confirm', stepData };
}

export async function handleFinalize(
  event: WhatsAppMessageEvent,
  conversation: Conversation,
  client: Client,
  stepData: StepData,
): Promise<{ nextStep: string; stepData: StepData } | null> {
  try {
    const quota = await checkOutboundQuota(client.id);
    if (!quota.allowed) {
      console.warn(`🛑 [Quota] Client '${client.businessName}' over quota — booking still recorded, but outbound confirmation suppressed.`);
    }
  } catch (err) {
    console.error('Quota check failed (non-fatal):', err);
  }

  const prefix = client.slug ? client.slug.slice(0, 3).toUpperCase() : 'BK';
  const code = await generateReservationCode(prefix);
  const customerName = conversation.customerName || stepData.customerName || 'Patient';

  const [booking] = await db.insert(bookings).values({
    clientId: client.id,
    customerName,
    customerPhone: conversation.phone,
    guests: stepData.guests || 1,
    occasion: stepData.occasion || 'casual',
    date: stepData.date!,
    time: stepData.time!,
    reservationCode: code,
    status: 'booked',
    specialRequest: stepData.specialRequest || null,
  }).returning();

  if (!booking) {
    throw new Error('Failed to record booking');
  }

  stepData.reservationId = booking.id;
  stepData.reservationCode = code;

  await sendToMakeWebhook({
    event: 'reservation_created',
    bookingId: booking.id,
    reservationId: booking.id,
    reservationCode: code,
    restaurantName: client.businessName,
    businessName: client.businessName,
    customerName,
    customerPhone: conversation.phone,
    guests: stepData.guests || 1,
    occasion: stepData.occasion || 'casual',
    date: stepData.date!,
    time: stepData.time!,
    specialRequest: stepData.specialRequest || null,
    stage: 'booked',
    status: 'booked',
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

  if (client.managerPhone) {
    await sendText(client, client.managerPhone, `🔔 *New Appointment Alert!*\n\n👤 ${customerName}\n📱 +${conversation.phone}\n🩺 ${treatmentType}\n📅 ${formatDate(stepData.date!)} · ${formatTime(stepData.time!)}\n🎫 ${code}`);
  }

  await sendText(client, conversation.phone, `✅ *Appointment Reserved!*\n\n🎫 Booking Code: *${code}*\n🩺 ${client.businessName}\n👤 ${customerName}\n✨ ${treatmentType}\n📅 ${formatDate(stepData.date!)} · ${formatTime(stepData.time!)}\n\nPlease show this code at reception. See you soon! 😊`);

  try {
    await incrementOutboundCounter(client.id);
  } catch (err) {
    console.error('Failed to increment outbound counter (non-fatal):', err);
  }

  return { nextStep: 'finalized', stepData };
}

export async function handlePostFinalize(
  event: WhatsAppMessageEvent,
  conversation: Conversation,
  client: Client,
  stepData: StepData,
): Promise<void> {
  return;
}
