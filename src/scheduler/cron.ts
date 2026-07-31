import cron from 'node-cron';
import { db } from '../db/connection';
import { restaurants, reservations, conversations, clients, customers, bookings } from '../db/schema';
import { eq, and, lte } from 'drizzle-orm';
import { sendText, sendButtons, sendTemplate } from '../whatsapp/sender';
import { sendToMakeWebhook } from '../services/makeIntegration';
import { todayIST, nowIST, formatDate } from '../utils/dateHelpers';
import { checkOutboundQuota, incrementOutboundCounter, processMonthlyQuotaResets } from '../services/quotaService';
import { processPendingReviewQueue } from '../services/reviewEngine';

/**
 * 🎂 Birthday & Anniversary Daily Outbound Marketing Engine (10:00 AM IST)
 * Includes Smart Cut-Off System (1,000 quota limit) and Counter Increment
 */
export async function runBirthdayPushCron(): Promise<{ sentCount: number; haltedCount: number }> {
  console.log('⏰ [Cron] Running Daily 10:00 AM Outbound Marketing Engine...');
  const currentYear = new Date().getFullYear();
  
  // Get date in MM-DD format for matching
  const targetDateObj = nowIST();
  targetDateObj.setDate(targetDateObj.getDate() + 7);
  const mm = String(targetDateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDateObj.getDate()).padStart(2, '0');
  const mmddTarget = `${mm}-${dd}`;
  const targetDateYmd = targetDateObj.toISOString().split('T')[0];

  let sentCount = 0;
  let haltedCount = 0;

  try {
    const allClients = await db.select().from(clients);
    for (const client of allClients) {
      // Quota Verification Check: Smart Cut-Off System
      const quotaState = await checkOutboundQuota(client.id);
      if (!quotaState.allowed) {
        console.warn(`🛑 [Cron Smart Cut-Off] Halting marketing outbounds for '${client.businessName}'. Quota reached (${quotaState.sentThisMonth}/${quotaState.monthlyAllowance}).`);
        haltedCount++;
        continue;
      }

      // Query customers with matching birthday / anniversary
      const matchedCustomers = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.clientId, client.id),
            eq(customers.birthday, mmddTarget)
          )
        );

      for (const cust of matchedCustomers) {
        if (cust.birthdayDiscountClaimedYear === currentYear) {
          console.log(`🛡️ [Guardrail] Guest ${cust.phoneNumber} already claimed 2026 birthday offer. Skipping.`);
          continue;
        }

        // Re-check quota before each send
        const currentQuota = await checkOutboundQuota(client.id);
        if (!currentQuota.allowed) {
          console.warn(`🛑 [Cron Smart Cut-Off Mid-Batch] Quota limit reached for ${client.businessName}. Halting batch.`);
          haltedCount++;
          break;
        }

        const name = cust.customerName || 'Guest';

        // Adapt client to Restaurant type structure
        const dummyRestaurant: any = {
          name: client.businessName,
          whatsappPhoneNumberId: client.whatsappPhoneNumberId,
          metaAccessToken: client.metaAccessToken,
        };

        // Format Meta Structured Template Payload (or button fallback)
        const msg = `🎂 *Happy Birthday Month, ${name}!*\n\nYour birthday is coming up soon! 🥂\n\nCelebrate at *${client.businessName}* and get a *complimentary Chef's Special Dessert & Candle Setup* on us!\n\nTap below to claim your birthday table:`;

        await sendButtons(dummyRestaurant, cust.phoneNumber, msg, [
          { id: 'book_table', title: 'Claim Birthday Offer 🎂' }
        ], `🎂 ${client.businessName}`);

        // Counter Increment on successful transmission
        await incrementOutboundCounter(client.id);

        sentCount++;
      }
    }

    // Also process single-restaurant reservations for backward compatibility
    const allRestaurants = await db.select().from(restaurants);
    for (const restaurant of allRestaurants) {
      const bdayReservations = await db
        .select()
        .from(reservations)
        .where(
          and(
            eq(reservations.restaurantId, restaurant.id),
            eq(reservations.occasion, 'birthday'),
            eq(reservations.date, targetDateYmd)
          )
        );

      for (const res of bdayReservations) {
        const convResult = await db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.phone, res.customerPhone),
              eq(conversations.restaurantId, restaurant.id)
            )
          )
          .limit(1);

        const conv = convResult[0];
        if (conv && conv.birthdayDiscountClaimedYear === currentYear) continue;

        const name = res.customerName || 'Guest';
        const msg = `🎂 *Happy Birthday Month, ${name}!*\n\nYour birthday is coming up on ${formatDate(res.date)}! 🥂\n\nCelebrate at *${restaurant.name}* and get a *complimentary Chef's Special Dessert & Candle Setup* on us!\n\nTap below to claim your birthday table:`;

        await sendButtons(restaurant, res.customerPhone, msg, [
          { id: 'book_table', title: 'Claim Birthday Offer 🎂' }
        ], `🎂 ${restaurant.name}`);

        sentCount++;
      }
    }
  } catch (error) {
    console.error('❌ [Cron] Error running Outbound Marketing Engine:', error);
  }

  console.log(`✅ [Cron] Daily Outbound Marketing completed. Sent: ${sentCount}, Halted: ${haltedCount}`);
  return { sentCount, haltedCount };
}

/**
 * 🔄 30-Day Retention Nudge ("We Miss You")
 * Runs daily at 10:00 AM IST
 */
export async function runRetentionCron(): Promise<{ sentCount: number }> {
  console.log('⏰ [Cron] Running 30-Day Retention Nudge...');
  let sentCount = 0;

  try {
    const allRestaurants = await db.select().from(restaurants);
    for (const restaurant of allRestaurants) {
      const thirtyDaysAgoObj = nowIST();
      thirtyDaysAgoObj.setDate(thirtyDaysAgoObj.getDate() - 30);
      const targetDate = thirtyDaysAgoObj.toISOString().split('T')[0];

      const inactiveConvs = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.restaurantId, restaurant.id),
            eq(conversations.lastDinedAt, targetDate)
          )
        );

      for (const conv of inactiveConvs) {
        const name = conv.customerName || 'Friend';
        const msg = `🍽️ *We Miss You at ${restaurant.name}, ${name}!*\n\nIt's been a month since your last dining experience with us. We'd love to host you again this week!\n\nEnjoy a complimentary appetizer on your next visit. Tap below to reserve your table:`;

        await sendButtons(restaurant, conv.phone, msg, [
          { id: 'book_table', title: 'Reserve Table 🍽️' }
        ], `🌟 ${restaurant.name}`);

        sentCount++;
      }
    }
  } catch (error) {
    console.error('❌ [Cron] Error running Retention Nudge:', error);
  }

  console.log(`✅ [Cron] Retention Nudge completed. Sent ${sentCount} messages.`);
  return { sentCount };
}

/**
 * 🌅 Morning-After & Same-Day 2-Hour Review Queue Processor
 * Runs every 10 minutes
 */
export async function runReviewRequestCron(): Promise<{ sentCount: number }> {
  console.log('⏰ [Cron] Processing Same-Day & 2-Hour Delayed Review Queue...');
  
  // Call 2-Hour Delayed Review Engine with 24-hr Free Window check
  const reviewResult = await processPendingReviewQueue();
  
  let legacySentCount = 0;
  try {
    const allRestaurants = await db.select().from(restaurants);
    for (const restaurant of allRestaurants) {
      const eligibleReservations = await db
        .select()
        .from(reservations)
        .where(
          and(
            eq(reservations.restaurantId, restaurant.id),
            eq(reservations.reviewSent, false)
          )
        );

      const now = nowIST().getTime();

      for (const res of eligibleReservations) {
        if (res.stage !== 'seated' && res.stage !== 'completed') continue;

        const resDateTime = new Date(`${res.date}T${res.time}:00Z`).getTime();
        const diffHours = (now - resDateTime) / (1000 * 60 * 60);

        if (diffHours >= 2) {
          const name = res.customerName || 'Guest';
          const reviewUrl = restaurant.googleReviewUrl || 'https://maps.google.com';
          
          const msg = `🌟 *Thank You from ${restaurant.name}!*\n\nHi ${name}, thank you for dining with us! We hope you had a fantastic experience.\n\nCould you take 15 seconds to share a 5-star Google review? It helps our team immensely! 🙏\n\n${reviewUrl}`;

          await sendText(restaurant, res.customerPhone, msg);

          await db
            .update(reservations)
            .set({ reviewSent: true })
            .where(eq(reservations.id, res.id));

          legacySentCount++;
        }
      }
    }
  } catch (error) {
    console.error('❌ [Cron] Error running Review Request:', error);
  }

  const total = reviewResult.freeDeliveredCount + legacySentCount;
  console.log(`✅ [Cron] Review Engine completed. Free-Window Delivered: ${reviewResult.freeDeliveredCount}, Legacy Delivered: ${legacySentCount}`);
  return { sentCount: total };
}

/**
 * Initialize all background cron schedules
 */
export function startScheduler() {
  console.log('⏰ Initializing Background Commercial Outbound Scheduler...');

  // Outbound Marketing Engine - 10:00 AM IST daily
  cron.schedule('0 10 * * *', () => {
    runBirthdayPushCron().catch(console.error);
    runRetentionCron().catch(console.error);
  });

  // Midnight Monthly Quota Reset Script - 00:00 AM daily
  cron.schedule('0 0 * * *', () => {
    processMonthlyQuotaResets().catch(console.error);
  });

  // Review Delay Queue - Every 10 minutes
  cron.schedule('*/10 * * * *', () => {
    runReviewRequestCron().catch(console.error);
  });

  console.log('✅ Background Scheduler active (Marketing 10 AM, Midnight Quota Reset 00:00, Review Queue 10m)');
}
