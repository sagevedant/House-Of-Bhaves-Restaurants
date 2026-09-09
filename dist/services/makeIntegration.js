"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToMakeWebhook = sendToMakeWebhook;
const config_1 = require("../config");
async function sendToMakeWebhook(payload) {
    const webhookUrl = config_1.config.makeWebhookUrl;
    if (!webhookUrl) {
        console.log('ℹ️ [Make.com] MAKE_WEBHOOK_URL not configured. Skipping.');
        return;
    }
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (response.ok) {
            console.log(`⚡ [Make.com] Sent event (Status: ${response.status})`);
        }
        else {
            console.warn(`⚠️ [Make.com] Error status: ${response.status}`);
        }
    }
    catch (error) {
        console.error('❌ [Make.com] Failed:', error);
    }
}
//# sourceMappingURL=makeIntegration.js.map