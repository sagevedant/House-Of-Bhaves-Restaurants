"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleSameDayReview = scheduleSameDayReview;
exports.processPendingReviewQueue = processPendingReviewQueue;
const connection_1 = require("../db/connection");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const sender_1 = require("../whatsapp/sender");
/**
 * Schedule Same-Day Review:
 * Sets reviewScheduledAt to Now + 2 Hours when booking status becomes 'seated' / 'show'.
 */
async function scheduleSameDayReview(bookingId, delayMinutes = 120) {
    const scheduledTimeObj = new Date(Date.now() + delayMinutes * 60 * 1000);
    const scheduledTimeIso = scheduledTimeObj.toISOString();
    await connection_1.db
        .update(schema_1.bookings)
        .set({ reviewScheduledAt: scheduledTimeIso })
        .where((0, drizzle_orm_1.eq)(schema_1.bookings.id, bookingId));
    console.log(`⏱️ [Review Engine] Scheduled 2-hour delayed review request for Booking #${bookingId} at ${scheduledTimeIso}`);
}
/**
 * Process Pending Review Queue:
 * Processes queued review requests whose reviewScheduledAt <= Now.
 * Validates the 24-Hour Free Customer Service Window before sending.
 */
async function processPendingReviewQueue() {
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    let processedCount = 0;
    let freeDeliveredCount = 0;
    try {
        // Query pending bookings where reviewScheduledAt <= Now and reviewSent = false
        const pendingBookings = await connection_1.db
            .select()
            .from(schema_1.bookings)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.bookings.reviewSent, false), (0, drizzle_orm_1.lte)(schema_1.bookings.reviewScheduledAt, nowIso)));
        for (const booking of pendingBookings) {
            if (booking.status !== 'seated' && booking.status !== 'completed')
                continue;
            // Find client record for Google Review URL & Meta credentials
            const clientList = await connection_1.db.select().from(schema_1.clients).where((0, drizzle_orm_1.eq)(schema_1.clients.id, booking.clientId)).limit(1);
            if (clientList.length === 0)
                continue;
            const client = clientList[0];
            // Window Validation Check: Fetch customer's lastInboundInteraction
            let isWithin24hWindow = false;
            if (booking.customerId) {
                const customerList = await connection_1.db.select().from(schema_1.customers).where((0, drizzle_orm_1.eq)(schema_1.customers.id, booking.customerId)).limit(1);
                if (customerList.length > 0 && customerList[0].lastInboundInteraction) {
                    const lastInboundMs = new Date(customerList[0].lastInboundInteraction).getTime();
                    const elapsedHours = (nowMs - lastInboundMs) / (1000 * 60 * 60);
                    isWithin24hWindow = elapsedHours < 24;
                    console.log(`⏱️ [24-Hour Window Validation] Phone: ${booking.customerPhone}, Elapsed: ${elapsedHours.toFixed(1)} hrs, Within 24h: ${isWithin24hWindow}`);
                }
            }
            else {
                // Fallback: If booking created within 24h, assume active window
                const bookingTimeMs = new Date(booking.createdAt || nowIso).getTime();
                isWithin24hWindow = (nowMs - bookingTimeMs) / (1000 * 60 * 60) < 24;
            }
            if (isWithin24hWindow) {
                const reviewUrl = client.googleReviewUrl || 'https://maps.google.com';
                const name = booking.customerName || 'Guest';
                const rawTextPayload = `Hey ${name}! Thanks for dining with us at ${client.businessName} tonight. We hope you loved the experience! Could you spare 10 seconds to share your experience with our team here?\n\nGoogle Review Link: ${reviewUrl}`;
                // Send free-form text message via 24h customer service window (Net Meta Cost = ₹0.00)
                // Adapt client to Restaurant type structure for sender helper
                const dummyRestaurant = {
                    name: client.businessName,
                    whatsappPhoneNumberId: client.whatsappPhoneNumberId,
                    metaAccessToken: client.metaAccessToken,
                };
                await (0, sender_1.sendText)(dummyRestaurant, booking.customerPhone, rawTextPayload);
                await connection_1.db
                    .update(schema_1.bookings)
                    .set({ reviewSent: true })
                    .where((0, drizzle_orm_1.eq)(schema_1.bookings.id, booking.id));
                console.log(`🎉 [Same-Day Review Delivered - Net Cost: ₹0.00] Sent free-form review request to ${booking.customerPhone}`);
                freeDeliveredCount++;
            }
            else {
                console.log(`⚠️ [24-Hour Window Closed] Cannot send free-form review request to ${booking.customerPhone}. Window elapsed.`);
                // Mark reviewSent = true to avoid infinite retry outside window
                await connection_1.db
                    .update(schema_1.bookings)
                    .set({ reviewSent: true })
                    .where((0, drizzle_orm_1.eq)(schema_1.bookings.id, booking.id));
            }
            processedCount++;
        }
    }
    catch (error) {
        console.error('❌ [Review Engine] Error processing review queue:', error);
    }
    return { processedCount, freeDeliveredCount };
}
//# sourceMappingURL=reviewEngine.js.map