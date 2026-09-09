import { type Client } from '../db/schema';
export interface QuotaCheckResult {
    allowed: boolean;
    sentThisMonth: number;
    monthlyAllowance: number;
    client: Client;
}
/**
 * Smart Cut-Off System:
 * Verifies if client has remaining outbound marketing quota for the current month.
 */
export declare function checkOutboundQuota(clientId: number): Promise<QuotaCheckResult>;
/**
 * Counter Increment:
 * Increments outbound_sent_this_month by +1 upon successful Meta API HTTP 200 transmission.
 */
export declare function incrementOutboundCounter(clientId: number): Promise<number>;
/**
 * Monthly Credit Reset Script:
 * Midnight automation cron job that resets outbound_sent_this_month to 0 on next_monthly_reset_date.
 */
export declare function processMonthlyQuotaResets(): Promise<{
    resetCount: number;
}>;
//# sourceMappingURL=quotaService.d.ts.map