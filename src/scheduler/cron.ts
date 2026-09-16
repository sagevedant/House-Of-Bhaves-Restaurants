import cron from 'node-cron';
import { processPendingReviewQueue } from '../services/reviewEngine';

/**
 * 🌅 Same-Day 2-Hour Review Queue Processor
 * Runs every 10 minutes to deliver Google Review requests within the 24-hour Free Customer Service Window (₹0.00 Meta Cost).
 */
export async function runReviewRequestCron(): Promise<{ sentCount: number }> {
  console.log('⏰ [Cron] Processing Same-Day & 2-Hour Delayed Review Queue...');
  
  // Call 2-Hour Delayed Review Engine with 24-hr Free Window check
  const reviewResult = await processPendingReviewQueue();
  
  console.log(`✅ [Cron] Review Engine completed. Free-Window Delivered: ${reviewResult.freeDeliveredCount}`);
  return { sentCount: reviewResult.freeDeliveredCount };
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
