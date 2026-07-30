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
const makeIntegration_1 = require("../services/makeIntegration");
const dateHelpers_1 = require("../utils/dateHelpers");
/**
 * 🎂 Birthday 7-Day Pre-Push Cron
 * Runs daily at 9:00 AM IST
 */
async function runBirthdayPushCron() {
    console.log('⏰ [Cron] Running 7-Day Birthday Outbound Push...');
    const currentYear = new Date().getFullYear();
    // Get date 7 days from today in YYYY-MM-DD
    const targetDateObj = (0, dateHelpers_1.nowIST)();
    targetDateObj.setDate(targetDateObj.getDate() + 7);
    const targetDate = targetDateObj.toISOString().split('T')[0];
    let sentCount = 0;
    try {
        const allRestaurants = await connection_1.db.select().from(schema_1.restaurants);
        for (const restaurant of allRestaurants) {
            // Find birthday reservations matching target date 7 days out
            const bdayReservations = await connection_1.db
                .select()
                .from(schema_1.reservations)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reservations.restaurantId, restaurant.id), (0, drizzle_orm_1.eq)(schema_1.reservations.occasion, 'birthday'), (0, drizzle_orm_1.eq)(schema_1.reservations.date, targetDate)));
            for (const res of bdayReservations) {
                // Check Once-Per-Year Guardrail: check conversation record
                const convResult = await connection_1.db
                    .select()
                    .from(schema_1.conversations)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.conversations.phone, res.customerPhone), (0, drizzle_orm_1.eq)(schema_1.conversations.restaurantId, restaurant.id)))
                    .limit(1);
                const conv = convResult[0];
                if (conv && conv.birthdayDiscountClaimedYear === currentYear) {
                    console.log(`🛡️ [Guardrail] Guest ${res.customerPhone} already claimed 2026 birthday offer. Skipping.`);
                    continue;
                }
                const name = res.customerName || 'Guest';
                const msg = `🎂 *Happy Birthday Month, ${name}!*\n\nYour birthday is coming up on ${(0, dateHelpers_1.formatDate)(res.date)}! 🥂\n\nCelebrate at *${restaurant.name}* and get a *complimentary Chef's Special Dessert & Candle Setup* on us!\n\nTap below to claim your birthday table:`;
                await (0, sender_1.sendButtons)(restaurant, res.customerPhone, msg, [
                    { id: 'book_table', title: 'Claim Birthday Offer 🎂' }
                ], `🎂 ${restaurant.name}`);
                await (0, makeIntegration_1.sendToMakeWebhook)({
                    event: 'birthday_push_sent',
                    reservationId: res.id,
                    customerName: name,
                    customerPhone: res.customerPhone,
                    timestamp: new Date().toISOString()
                });
                sentCount++;
            }
        }
    }
    catch (error) {
        console.error('❌ [Cron] Error running Birthday Push:', error);
    }
    console.log(`✅ [Cron] Birthday Push completed. Sent ${sentCount} messages.`);
    return { sentCount };
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
            // Find conversations where lastDinedAt was ~30 days ago
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
 * 🌅 Morning-After 14-Hour Google Review Request
 * Runs hourly
 */
async function runReviewRequestCron() {
    console.log('⏰ [Cron] Checking for 14-Hour Google Review Requests...');
    let sentCount = 0;
    try {
        const allRestaurants = await connection_1.db.select().from(schema_1.restaurants);
        for (const restaurant of allRestaurants) {
            // Find reservations marked 'seated' or 'completed' where reviewSent = 0
            const eligibleReservations = await connection_1.db
                .select()
                .from(schema_1.reservations)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reservations.restaurantId, restaurant.id), (0, drizzle_orm_1.eq)(schema_1.reservations.reviewSent, false)));
            const now = (0, dateHelpers_1.nowIST)().getTime();
            for (const res of eligibleReservations) {
                if (res.stage !== 'seated' && res.stage !== 'completed')
                    continue;
                // Parse reservation date & time
                const resDateTime = new Date(`${res.date}T${res.time}:00Z`).getTime();
                const diffHours = (now - resDateTime) / (1000 * 60 * 60);
                // Send if dining was 14+ hours ago
                if (diffHours >= 14) {
                    const name = res.customerName || 'Guest';
                    const reviewUrl = restaurant.googleReviewUrl || 'https://maps.google.com';
                    const msg = `🌟 *Morning-After Thank You from ${restaurant.name}!*\n\nHi ${name}, thank you for dining with us! We hope you had a fantastic experience.\n\nCould you take 15 seconds to share a 5-star Google review? It helps our local team immensely! 🙏\n\n${reviewUrl}`;
                    await (0, sender_1.sendText)(restaurant, res.customerPhone, msg);
                    // Mark reviewSent = 1
                    await connection_1.db
                        .update(schema_1.reservations)
                        .set({ reviewSent: true })
                        .where((0, drizzle_orm_1.eq)(schema_1.reservations.id, res.id));
                    sentCount++;
                }
            }
        }
    }
    catch (error) {
        console.error('❌ [Cron] Error running Review Request:', error);
    }
    console.log(`✅ [Cron] Review Request completed. Sent ${sentCount} messages.`);
    return { sentCount };
}
/**
 * Initialize all background cron schedules
 */
function startScheduler() {
    console.log('⏰ Initializing Background Outbound Cron Scheduler...');
    // Birthday Push - 9:00 AM IST daily
    node_cron_1.default.schedule('0 9 * * *', () => {
        runBirthdayPushCron().catch(console.error);
    });
    // Retention Nudge - 10:00 AM IST daily
    node_cron_1.default.schedule('0 10 * * *', () => {
        runRetentionCron().catch(console.error);
    });
    // Review Requests - Every hour
    node_cron_1.default.schedule('0 * * * *', () => {
        runReviewRequestCron().catch(console.error);
    });
    console.log('✅ Background Cron Scheduler active (Birthday 9 AM, Retention 10 AM, Review hourly)');
}
//# sourceMappingURL=cron.js.map