/**
 * 🌅 Same-Day 2-Hour Review Queue Processor
 * Runs every 10 minutes to deliver Google Review requests within the 24-hour Free Customer Service Window (₹0.00 Meta Cost).
 */
export declare function runReviewRequestCron(): Promise<{
    sentCount: number;
}>;
/**
 * Initialize background scheduler (Pure WhatsApp Automation Mode)
 */
export declare function startScheduler(): void;
//# sourceMappingURL=cron.d.ts.map