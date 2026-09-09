/**
 * Schedule Same-Day Review:
 * Sets reviewScheduledAt to Now + 2 Hours when booking status becomes 'seated' / 'show'.
 */
export declare function scheduleSameDayReview(bookingId: number, delayMinutes?: number): Promise<void>;
/**
 * Process Pending Review Queue:
 * Processes queued review requests whose reviewScheduledAt <= Now.
 * Validates the 24-Hour Free Customer Service Window before sending.
 */
export declare function processPendingReviewQueue(): Promise<{
    processedCount: number;
    freeDeliveredCount: number;
}>;
//# sourceMappingURL=reviewEngine.d.ts.map