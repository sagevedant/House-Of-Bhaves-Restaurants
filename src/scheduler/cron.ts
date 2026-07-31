import cron from 'node-cron';
import { db } from '../db/connection';
import { restaurants, reservations } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { sendText } from '../whatsapp/sender';
import { nowIST } from '../utils/dateHelpers';
import { processPendingReviewQueue } from '../services/reviewEngine';

/**
 * 🌅 Same-Day 2-Hour Review Queue Processor
 * Runs every 10 minutes to deliver Google Review requests within the 24-hour Free Customer Service Window (₹0.00 Meta Cost).
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
 * Initialize background scheduler (Pure WhatsApp Automation Mode)
 */
export function startScheduler() {
  console.log('⏰ Initializing Pure WhatsApp Automation Scheduler...');

  // Review Delay Queue - Every 10 minutes (₹0.00 Meta Cost)
  cron.schedule('*/10 * * * *', () => {
    runReviewRequestCron().catch(console.error);
  });

  console.log('✅ Background Scheduler active (Same-Day Review Queue every 10m - ₹0.00 Meta Cost)');
}
