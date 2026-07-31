"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOutboundQuota = checkOutboundQuota;
exports.incrementOutboundCounter = incrementOutboundCounter;
exports.processMonthlyQuotaResets = processMonthlyQuotaResets;
const connection_1 = require("../db/connection");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Smart Cut-Off System:
 * Verifies if client has remaining outbound marketing quota for the current month.
 */
async function checkOutboundQuota(clientId) {
    const clientList = await connection_1.db.select().from(schema_1.clients).where((0, drizzle_orm_1.eq)(schema_1.clients.id, clientId)).limit(1);
    if (clientList.length === 0) {
        throw new Error(`Client ID ${clientId} not found`);
    }
    const client = clientList[0];
    const sentThisMonth = client.outboundSentThisMonth ?? 0;
    const monthlyAllowance = client.outboundAllowanceMonthly ?? 1000;
    const allowed = sentThisMonth < monthlyAllowance;
    if (!allowed) {
        console.warn(`🛑 [Smart Cut-Off Triggered] Client '${client.businessName}' reached quota limit (${sentThisMonth}/${monthlyAllowance}). Halting outbound transmission.`);
    }
    return {
        allowed,
        sentThisMonth,
        monthlyAllowance,
        client,
    };
}
/**
 * Counter Increment:
 * Increments outbound_sent_this_month by +1 upon successful Meta API HTTP 200 transmission.
 */
async function incrementOutboundCounter(clientId) {
    await connection_1.db
        .update(schema_1.clients)
        .set({
        outboundSentThisMonth: (0, drizzle_orm_1.sql) `${schema_1.clients.outboundSentThisMonth} + 1`
    })
        .where((0, drizzle_orm_1.eq)(schema_1.clients.id, clientId));
    const updated = await connection_1.db.select().from(schema_1.clients).where((0, drizzle_orm_1.eq)(schema_1.clients.id, clientId)).limit(1);
    const newCount = updated[0]?.outboundSentThisMonth ?? 0;
    console.log(`📊 [Quota Counter Updated] Client ID ${clientId}: ${newCount}/${updated[0]?.outboundAllowanceMonthly || 1000}`);
    return newCount;
}
/**
 * Monthly Credit Reset Script:
 * Midnight automation cron job that resets outbound_sent_this_month to 0 on next_monthly_reset_date.
 */
async function processMonthlyQuotaResets() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`⏰ [Midnight Reset Script] Checking monthly quota resets for date: ${today}`);
    let resetCount = 0;
    try {
        const allClients = await connection_1.db.select().from(schema_1.clients);
        for (const client of allClients) {
            if (client.nextMonthlyResetDate && client.nextMonthlyResetDate <= today) {
                // Calculate next reset date (+30 days)
                const nextResetObj = new Date(client.nextMonthlyResetDate);
                nextResetObj.setDate(nextResetObj.getDate() + 30);
                const nextResetDate = nextResetObj.toISOString().split('T')[0];
                await connection_1.db
                    .update(schema_1.clients)
                    .set({
                    outboundSentThisMonth: 0,
                    nextMonthlyResetDate: nextResetDate
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.clients.id, client.id));
                console.log(`🔄 [Quota Reset] Client '${client.businessName}' quota reset to 0. Next reset: ${nextResetDate}`);
                resetCount++;
            }
        }
    }
    catch (error) {
        console.error('❌ [Midnight Reset Script] Error resetting quotas:', error);
    }
    return { resetCount };
}
//# sourceMappingURL=quotaService.js.map