"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runReviewRequestCron = runReviewRequestCron;
exports.startScheduler = startScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const reviewEngine_1 = require("../services/reviewEngine");
/**
 * 🌅 Same-Day 2-Hour Review Queue Processor
 * Runs every 10 minutes to deliver Google Review requests within the 24-hour Free Customer Service Window (₹0.00 Meta Cost).
 */
async function runReviewRequestCron() {
    console.log('⏰ [Cron] Processing Same-Day & 2-Hour Delayed Review Queue...');
    // Call 2-Hour Delayed Review Engine with 24-hr Free Window check
    const reviewResult = await (0, reviewEngine_1.processPendingReviewQueue)();
    console.log(`✅ [Cron] Review Engine completed. Free-Window Delivered: ${reviewResult.freeDeliveredCount}`);
    return { sentCount: reviewResult.freeDeliveredCount };
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