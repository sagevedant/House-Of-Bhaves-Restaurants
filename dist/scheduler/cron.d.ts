/**
 * 🎂 Birthday 7-Day Pre-Push Cron
 * Runs daily at 9:00 AM IST
 */
export declare function runBirthdayPushCron(): Promise<{
    sentCount: number;
}>;
/**
 * 🔄 30-Day Retention Nudge ("We Miss You")
 * Runs daily at 10:00 AM IST
 */
export declare function runRetentionCron(): Promise<{
    sentCount: number;
}>;
/**
 * 🌅 Morning-After 14-Hour Google Review Request
 * Runs hourly
 */
export declare function runReviewRequestCron(): Promise<{
    sentCount: number;
}>;
/**
 * Initialize all background cron schedules
 */
export declare function startScheduler(): void;
//# sourceMappingURL=cron.d.ts.map