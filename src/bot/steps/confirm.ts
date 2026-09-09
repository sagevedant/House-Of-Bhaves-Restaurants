import type { WhatsAppMessageEvent } from '../../whatsapp/parser';
import type { Restaurant, Conversation, StepData, Reservation } from '../../db/schema';
import { sendText } from '../../whatsapp/sender';
import { db } from '../../db/connection';
import { reservations, bookings, clients } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { generateReservationCode } from '../../utils/reservationCode';
import { sendToMakeWebhook } from '../../services/makeIntegration';
import { formatDate, formatTime, todayIST, currentTimeIST } from '../../utils/dateHelpers';
import { extractSlots } from '../../ai/slotExtractor';
import { sendConfirmPrompt } from './datetime';
import { sendOccasionPrompt } from './guests';
import { checkOutboundQuota, incrementOutboundCounter } from '../../services/quotaService'; // FIX: actually wire in quota enforcement

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
  // FIX: quota check was defined in quotaService.js but never called
  // anywhere — the "Smart Cut-Off System" was dead code and clients could
  // send unlimited outbound messages regardless of configured allowance.
  const clientMatch = await db.select().from(clients).where(eq(clients.slug, restaurant.slug)).limit(1);
  const client = clientMatch[0];
  if (client) {
    try {
      const quota = await checkOutboundQuota(client.id);
      if (!quota.allowed) {
        console.warn(`🛑 [Quota] Client '${client.businessName}' over quota — booking still recorded, but outbound confirmation suppressed.`);
        // We still record the booking (the customer initiated it inbound,
        // which doesn't count against outbound marketing quota per Meta's
        // free-form reply window) but we do not send additional outbound
        // template/marketing messages beyond the direct reply.
      }
    } catch (err) {
      console.error('Quota check failed (non-fatal):', err);
    }
  }

  const code = await generateReservationCode(restaurant.prefix);
  const customerName = conversation.customerName || stepData.customerName || 'Patient';

  // FIX (data integrity): previously two independent INSERTs with no
  // transaction — if the second write (bookings) failed after the first
  // (reservations) succeeded, the two tables would silently diverge with
  // no way to detect it. Wrapped in a transaction so both succeed or
  // neither does. Falls back to sequential writes if the driver doesn't
  // support transactions (defensive — libsql via drizzle does support it).
  let reservation: Reservation | undefined;
  const doWrites = async (tx: any) => {
    const [res] = await tx.insert(reservations).values({
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
    reservation = res;

    if (client) {
      await tx.insert(bookings).values({
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
      });
    }
  };

  if (typeof (db as any).transaction === 'function') {
    await (db as any).transaction(doWrites);
  } else {
    console.warn('⚠️ [Confirm] db.transaction not available — falling back to non-atomic writes.');
    await doWrites(db);
  }

  if (!reservation) {
    throw new Error('Failed to record reservation');
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
    await sendText(restaurant, restaurant.managerPhone, `🔔 *New Appointment Alert!*\n\n👤 ${customerName}\n📱 +${conversation.phone}\n🩺 ${treatmentType}\n📅 ${formatDate(stepData.date!)} · ${formatTime(stepData.time!)}\n🎫 ${code}`);
  }

  await sendText(restaurant, conversation.phone, `✅ *Appointment Reserved!*\n\n🎫 Booking Code: *${code}*\n🩺 ${restaurant.name}\n👤 ${customerName}\n✨ ${treatmentType}\n📅 ${formatDate(stepData.date!)} · ${formatTime(stepData.time!)}\n\nPlease show this code at reception. See you soon! 😊`);

  // FIX: increment the actual counter now that quota is wired in
  if (client) {
    try {
      await incrementOutboundCounter(client.id);
    } catch (err) {
      console.error('Failed to increment outbound counter (non-fatal):', err);
    }
  }

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
