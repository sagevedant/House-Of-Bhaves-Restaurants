/**
 * 🎂 Birthday & Anniversary Daily Outbound Marketing Engine (10:00 AM IST)
 * Includes Smart Cut-Off System (1,000 quota limit) and Counter Increment
 */
export declare function runBirthdayPushCron(): Promise<{
    sentCount: number;
    haltedCount: number;
}>;
/**
 * 🔄 30-Day Retention Nudge ("We Miss You")
 * Runs daily at 10:00 AM IST
 */
export declare function runRetentionCron(): Promise<{
    sentCount: number;
}>;
/**
 * 🌅 Morning-After & Same-Day 2-Hour Review Queue Processor
 * Runs every 10 minutes
 */
export declare function runReviewRequestCron(): Promise<{
    sentCount: number;
}>;
/**
 * Initialize all background cron schedules
 */
export declare function startScheduler(): void;
//# sourceMappingURL=cron.d.ts.map