"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runReviewRequestCron = runReviewRequestCron;
exports.startScheduler = startScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const connection_1 = require("../db/connection");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const sender_1 = require("../whatsapp/sender");
const dateHelpers_1 = require("../utils/dateHelpers");
const reviewEngine_1 = require("../services/reviewEngine");
/**
 * 🌅 Same-Day 2-Hour Review Queue Processor
 * Runs every 10 minutes to deliver Google Review requests within the 24-hour Free Customer Service Window (₹0.00 Meta Cost).
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
 * Initialize background scheduler (Pure WhatsApp Automation Mode)
 */
function startScheduler() {
    console.log('⏰ Initializing Pure WhatsApp Automation Scheduler...');
    // Review Delay Queue - Every 10 minutes (₹0.00 Meta Cost)
    node_cron_1.default.schedule('*/10 * * * *', () => {
        runReviewRequestCron().catch(console.error);
    });
    console.log('✅ Background Scheduler active (Same-Day Review Queue every 10m - ₹0.00 Meta Cost)');
}
//# sourceMappingURL=cron.js.map