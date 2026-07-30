import cron from 'node-cron';
import { db } from '../db/connection';
import { restaurants, reservations, conversations } from '../db/schema';
import { eq, and, sql, lt, gte } from 'drizzle-orm';
import { sendText, sendButtons } from '../whatsapp/sender';
import { sendToMakeWebhook } from '../services/makeIntegration';
import { todayIST, nowIST, formatDate } from '../utils/dateHelpers';

/**
 * 🎂 Birthday 7-Day Pre-Push Cron
 * Runs daily at 9:00 AM IST
 */
export async function runBirthdayPushCron(): Promise<{ sentCount: number }> {
  console.log('⏰ [Cron] Running 7-Day Birthday Outbound Push...');
  const currentYear = new Date().getFullYear();
  
  // Get date 7 days from today in YYYY-MM-DD
  const targetDateObj = nowIST();
  targetDateObj.setDate(targetDateObj.getDate() + 7);
  const targetDate = targetDateObj.toISOString().split('T')[0];

  let sentCount = 0;

  try {
    const allRestaurants = await db.select().from(restaurants);
    for (const restaurant of allRestaurants) {
      // Find birthday reservations matching target date 7 days out
      const bdayReservations = await db
        .select()
        .from(reservations)
        .where(
          and(
            eq(reservations.restaurantId, restaurant.id),
            eq(reservations.occasion, 'birthday'),
            eq(reservations.date, targetDate)
          )
        );

      for (const res of bdayReservations) {
        // Check Once-Per-Year Guardrail: check conversation record
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
        if (conv && conv.birthdayDiscountClaimedYear === currentYear) {
          console.log(`🛡️ [Guardrail] Guest ${res.customerPhone} already claimed 2026 birthday offer. Skipping.`);
          continue;
        }

        const name = res.customerName || 'Guest';
        const msg = `🎂 *Happy Birthday Month, ${name}!*\n\nYour birthday is coming up on ${formatDate(res.date)}! 🥂\n\nCelebrate at *${restaurant.name}* and get a *complimentary Chef's Special Dessert & Candle Setup* on us!\n\nTap below to claim your birthday table:`;

        await sendButtons(restaurant, res.customerPhone, msg, [
          { id: 'book_table', title: 'Claim Birthday Offer 🎂' }
        ], `🎂 ${restaurant.name}`);

        await sendToMakeWebhook({
          event: 'birthday_push_sent',
          reservationId: res.id,
          customerName: name,
          customerPhone: res.customerPhone,
          timestamp: new Date().toISOString()
        });

        sentCount++;
      }
    }
  } catch (error) {
    console.error('❌ [Cron] Error running Birthday Push:', error);
  }

  console.log(`✅ [Cron] Birthday Push completed. Sent ${sentCount} messages.`);
  return { sentCount };
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
      // Find conversations where lastDinedAt was ~30 days ago
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
 * 🌅 Morning-After 14-Hour Google Review Request
 * Runs hourly
 */
export async function runReviewRequestCron(): Promise<{ sentCount: number }> {
  console.log('⏰ [Cron] Checking for 14-Hour Google Review Requests...');
  let sentCount = 0;

  try {
    const allRestaurants = await db.select().from(restaurants);
    for (const restaurant of allRestaurants) {
      // Find reservations marked 'seated' or 'completed' where reviewSent = 0
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

        // Parse reservation date & time
        const resDateTime = new Date(`${res.date}T${res.time}:00Z`).getTime();
        const diffHours = (now - resDateTime) / (1000 * 60 * 60);

        // Send if dining was 14+ hours ago
        if (diffHours >= 14) {
          const name = res.customerName || 'Guest';
          const reviewUrl = restaurant.googleReviewUrl || 'https://maps.google.com';
          
          const msg = `🌟 *Morning-After Thank You from ${restaurant.name}!*\n\nHi ${name}, thank you for dining with us! We hope you had a fantastic experience.\n\nCould you take 15 seconds to share a 5-star Google review? It helps our local team immensely! 🙏\n\n${reviewUrl}`;

          await sendText(restaurant, res.customerPhone, msg);

          // Mark reviewSent = 1
          await db
            .update(reservations)
            .set({ reviewSent: true })
            .where(eq(reservations.id, res.id));

          sentCount++;
        }
      }
    }
  } catch (error) {
    console.error('❌ [Cron] Error running Review Request:', error);
  }

  console.log(`✅ [Cron] Review Request completed. Sent ${sentCount} messages.`);
  return { sentCount };
}

/**
 * Initialize all background cron schedules
 */
export function startScheduler() {
  console.log('⏰ Initializing Background Outbound Cron Scheduler...');

  // Birthday Push - 9:00 AM IST daily
  cron.schedule('0 9 * * *', () => {
    runBirthdayPushCron().catch(console.error);
  });

  // Retention Nudge - 10:00 AM IST daily
  cron.schedule('0 10 * * *', () => {
    runRetentionCron().catch(console.error);
  });

  // Review Requests - Every hour
  cron.schedule('0 * * * *', () => {
    runReviewRequestCron().catch(console.error);
  });

  console.log('✅ Background Cron Scheduler active (Birthday 9 AM, Retention 10 AM, Review hourly)');
}
