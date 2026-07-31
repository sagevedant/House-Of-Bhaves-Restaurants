"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBirthdayPushCron = runBirthdayPushCron;
exports.runRetentionCron = runRetentionCron;
exports.runReviewRequestCron = runReviewRequestCron;
exports.startScheduler = startScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const connection_1 = require("../db/connection");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const sender_1 = require("../whatsapp/sender");
const dateHelpers_1 = require("../utils/dateHelpers");
const quotaService_1 = require("../services/quotaService");
const reviewEngine_1 = require("../services/reviewEngine");
/**
 * 🎂 Birthday & Anniversary Daily Outbound Marketing Engine (10:00 AM IST)
 * Includes Smart Cut-Off System (1,000 quota limit) and Counter Increment
 */
async function runBirthdayPushCron() {
    console.log('⏰ [Cron] Running Daily 10:00 AM Outbound Marketing Engine...');
    const currentYear = new Date().getFullYear();
    // Get date in MM-DD format for matching
    const targetDateObj = (0, dateHelpers_1.nowIST)();
    targetDateObj.setDate(targetDateObj.getDate() + 7);
    const mm = String(targetDateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDateObj.getDate()).padStart(2, '0');
    const mmddTarget = `${mm}-${dd}`;
    const targetDateYmd = targetDateObj.toISOString().split('T')[0];
    let sentCount = 0;
    let haltedCount = 0;
    try {
        const allClients = await connection_1.db.select().from(schema_1.clients);
        for (const client of allClients) {
            // Quota Verification Check: Smart Cut-Off System
            const quotaState = await (0, quotaService_1.checkOutboundQuota)(client.id);
            if (!quotaState.allowed) {
                console.warn(`🛑 [Cron Smart Cut-Off] Halting marketing outbounds for '${client.businessName}'. Quota reached (${quotaState.sentThisMonth}/${quotaState.monthlyAllowance}).`);
                haltedCount++;
                continue;
            }
            // Query customers with matching birthday / anniversary
            const matchedCustomers = await connection_1.db
                .select()
                .from(schema_1.customers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.clientId, client.id), (0, drizzle_orm_1.eq)(schema_1.customers.birthday, mmddTarget)));
            for (const cust of matchedCustomers) {
                if (cust.birthdayDiscountClaimedYear === currentYear) {
                    console.log(`🛡️ [Guardrail] Guest ${cust.phoneNumber} already claimed 2026 birthday offer. Skipping.`);
                    continue;
                }
                // Re-check quota before each send
                const currentQuota = await (0, quotaService_1.checkOutboundQuota)(client.id);
                if (!currentQuota.allowed) {
                    console.warn(`🛑 [Cron Smart Cut-Off Mid-Batch] Quota limit reached for ${client.businessName}. Halting batch.`);
                    haltedCount++;
                    break;
                }
                const name = cust.customerName || 'Guest';
                // Adapt client to Restaurant type structure
                const dummyRestaurant = {
                    name: client.businessName,
                    whatsappPhoneNumberId: client.whatsappPhoneNumberId,
                    metaAccessToken: client.metaAccessToken,
                };
                // Format Meta Structured Template Payload (or button fallback)
                const msg = `🎂 *Happy Birthday Month, ${name}!*\n\nYour birthday is coming up soon! 🥂\n\nCelebrate at *${client.businessName}* and get a *complimentary Chef's Special Dessert & Candle Setup* on us!\n\nTap below to claim your birthday table:`;
                await (0, sender_1.sendButtons)(dummyRestaurant, cust.phoneNumber, msg, [
                    { id: 'book_table', title: 'Claim Birthday Offer 🎂' }
                ], `🎂 ${client.businessName}`);
                // Counter Increment on successful transmission
                await (0, quotaService_1.incrementOutboundCounter)(client.id);
                sentCount++;
            }
        }
        // Also process single-restaurant reservations for backward compatibility
        const allRestaurants = await connection_1.db.select().from(schema_1.restaurants);
        for (const restaurant of allRestaurants) {
            const bdayReservations = await connection_1.db
                .select()
                .from(schema_1.reservations)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reservations.restaurantId, restaurant.id), (0, drizzle_orm_1.eq)(schema_1.reservations.occasion, 'birthday'), (0, drizzle_orm_1.eq)(schema_1.reservations.date, targetDateYmd)));
            for (const res of bdayReservations) {
                const convResult = await connection_1.db
                    .select()
                    .from(schema_1.conversations)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.conversations.phone, res.customerPhone), (0, drizzle_orm_1.eq)(schema_1.conversations.restaurantId, restaurant.id)))
                    .limit(1);
                const conv = convResult[0];
                if (conv && conv.birthdayDiscountClaimedYear === currentYear)
                    continue;
                const name = res.customerName || 'Guest';
                const msg = `🎂 *Happy Birthday Month, ${name}!*\n\nYour birthday is coming up on ${(0, dateHelpers_1.formatDate)(res.date)}! 🥂\n\nCelebrate at *${restaurant.name}* and get a *complimentary Chef's Special Dessert & Candle Setup* on us!\n\nTap below to claim your birthday table:`;
                await (0, sender_1.sendButtons)(restaurant, res.customerPhone, msg, [
                    { id: 'book_table', title: 'Claim Birthday Offer 🎂' }
                ], `🎂 ${restaurant.name}`);
                sentCount++;
            }
        }
    }
    catch (error) {
        console.error('❌ [Cron] Error running Outbound Marketing Engine:', error);
    }
    console.log(`✅ [Cron] Daily Outbound Marketing completed. Sent: ${sentCount}, Halted: ${haltedCount}`);
    return { sentCount, haltedCount };
}
/**
 * 🔄 30-Day Retention Nudge ("We Miss You")
 * Runs daily at 10:00 AM IST
 */
async function runRetentionCron() {
    console.log('⏰ [Cron] Running 30-Day Retention Nudge...');
    let sentCount = 0;
    try {
        const allRestaurants = await connection_1.db.select().from(schema_1.restaurants);
        for (const restaurant of allRestaurants) {
            const thirtyDaysAgoObj = (0, dateHelpers_1.nowIST)();
            thirtyDaysAgoObj.setDate(thirtyDaysAgoObj.getDate() - 30);
            const targetDate = thirtyDaysAgoObj.toISOString().split('T')[0];
            const inactiveConvs = await connection_1.db
                .select()
                .from(schema_1.conversations)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.conversations.restaurantId, restaurant.id), (0, drizzle_orm_1.eq)(schema_1.conversations.lastDinedAt, targetDate)));
            for (const conv of inactiveConvs) {
                const name = conv.customerName || 'Friend';
                const msg = `🍽️ *We Miss You at ${restaurant.name}, ${name}!*\n\nIt's been a month since your last dining experience with us. We'd love to host you again this week!\n\nEnjoy a complimentary appetizer on your next visit. Tap below to reserve your table:`;
                await (0, sender_1.sendButtons)(restaurant, conv.phone, msg, [
                    { id: 'book_table', title: 'Reserve Table 🍽️' }
                ], `🌟 ${restaurant.name}`);
                sentCount++;
            }
        }
    }
    catch (error) {
        console.error('❌ [Cron] Error running Retention Nudge:', error);
    }
    console.log(`✅ [Cron] Retention Nudge completed. Sent ${sentCount} messages.`);
    return { sentCount };
}
/**
 * 🌅 Morning-After & Same-Day 2-Hour Review Queue Processor
 * Runs every 10 minutes
 */
async function runReviewRequestCron() {
    console.log('⏰ [Cron] Processing Same-Day & 2-Hour Delayed Review Queue...');
    // Call 2-Hour Delayed Review Engine with 24-hr Free Window check
    const reviewResult = await (0, reviewEngine_1.processPendingReviewQueue)();
    let legacySentCount = 0;
    try {
        const allRestaurants = await connection_1.db.select().from(schema_1.restaurants);
        for (const restaurant of allRestaurants) {
            const eligibleReservations = await connection_1.db
                .select()
                .from(schema_1.reservations)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reservations.restaurantId, restaurant.id), (0, drizzle_orm_1.eq)(schema_1.reservations.reviewSent, false)));
            const now = (0, dateHelpers_1.nowIST)().getTime();
            for (const res of eligibleReservations) {
                if (res.stage !== 'seated' && res.stage !== 'completed')
                    continue;
                const resDateTime = new Date(`${res.date}T${res.time}:00Z`).getTime();
                const diffHours = (now - resDateTime) / (1000 * 60 * 60);
                if (diffHours >= 2) {
                    const name = res.customerName || 'Guest';
                    const reviewUrl = restaurant.googleReviewUrl || 'https://maps.google.com';
                    const msg = `🌟 *Thank You from ${restaurant.name}!*\n\nHi ${name}, thank you for dining with us! We hope you had a fantastic experience.\n\nCould you take 15 seconds to share a 5-star Google review? It helps our team immensely! 🙏\n\n${reviewUrl}`;
                    await (0, sender_1.sendText)(restaurant, res.customerPhone, msg);
                    await connection_1.db
                        .update(schema_1.reservations)
                        .set({ reviewSent: true })
                        .where((0, drizzle_orm_1.eq)(schema_1.reservations.id, res.id));
                    legacySentCount++;
                }
            }
        }
    }
    catch (error) {
        console.error('❌ [Cron] Error running Review Request:', error);
    }
    const total = reviewResult.freeDeliveredCount + legacySentCount;
    console.log(`✅ [Cron] Review Engine completed. Free-Window Delivered: ${reviewResult.freeDeliveredCount}, Legacy Delivered: ${legacySentCount}`);
    return { sentCount: total };
}
/**
 * Initialize all background cron schedules
 */
function startScheduler() {
    console.log('⏰ Initializing Background Commercial Outbound Scheduler...');
    // Outbound Marketing Engine - 10:00 AM IST daily
    node_cron_1.default.schedule('0 10 * * *', () => {
        runBirthdayPushCron().catch(console.error);
        runRetentionCron().catch(console.error);
    });
    // Midnight Monthly Quota Reset Script - 00:00 AM daily
    node_cron_1.default.schedule('0 0 * * *', () => {
        (0, quotaService_1.processMonthlyQuotaResets)().catch(console.error);
    });
    // Review Delay Queue - Every 10 minutes
    node_cron_1.default.schedule('*/10 * * * *', () => {
        runReviewRequestCron().catch(console.error);
    });
    console.log('✅ Background Scheduler active (Marketing 10 AM, Midnight Quota Reset 00:00, Review Queue 10m)');
}
//# sourceMappingURL=cron.js.map