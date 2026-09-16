"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = require("crypto");
const config_1 = require("../config");
const parser_1 = require("./parser");
const router_1 = require("../bot/router");
const connection_1 = require("../db/connection");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === config_1.config.webhookVerifyToken) {
        console.log('Webhook verified successfully!');
        res.status(200).send(challenge);
    }
    else {
        console.warn('Webhook verification failed.');
        res.sendStatus(403);
    }
});
/**
 * Verifies Meta's X-Hub-Signature-256 header using HMAC-SHA256 of the raw request body.
 */
function verifyMetaSignature(req) {
    const secret = process.env.META_APP_SECRET || config_1.config.metaAppSecret;
    if (!secret) {
        console.error('❌ [WEBHOOK AUTH] META_APP_SECRET not configured.');
        return false;
    }
    const signatureHeader = req.headers['x-hub-signature-256'];
    if (!signatureHeader || typeof signatureHeader !== 'string' || !signatureHeader.startsWith('sha256=')) {
        return false;
    }
    const rawBody = req.rawBody;
    if (!rawBody) {
        console.error('❌ [WEBHOOK AUTH] Raw body not captured — check express.json verify hook in index.js');
        return false;
    }
    const expected = 'sha256=' + (0, crypto_1.createHmac)('sha256', secret).update(rawBody).digest('hex');
    const expectedBuf = Buffer.from(expected);
    const gotBuf = Buffer.from(signatureHeader);
    if (expectedBuf.length !== gotBuf.length)
        return false;
    return (0, crypto_1.timingSafeEqual)(expectedBuf, gotBuf);
}
router.post('/', (req, res) => {
    const isEnforced = process.env.ENFORCE_WEBHOOK_SIGNATURE === 'true' || config_1.config.enforceWebhookSignature;
    if (isEnforced) {
        if (!verifyMetaSignature(req)) {
            console.warn('🚫 [WEBHOOK AUTH] Rejected POST with invalid/missing X-Hub-Signature-256.');
            res.sendStatus(401);
            return;
        }
        console.log('\n📩 [WEBHOOK POST RECEIVED - signature verified]');
    }
    else {
        console.log('\n📩 [WEBHOOK POST RECEIVED - signature verification bypassed (ENFORCE_WEBHOOK_SIGNATURE is disabled)]');
    }
    // Respond immediately to acknowledge receipt (<5 seconds SLA for Meta)
    res.status(200).send('EVENT_RECEIVED');
    const body = req.body;
    // Async processing
    setImmediate(async () => {
        try {
            const parsedWebhooks = (0, parser_1.parseWebhookPayload)(body);
            console.log(`🔍 [WEBHOOK PARSER]: Found ${parsedWebhooks.length} webhook groups`);
            for (const webhook of parsedWebhooks) {
                console.log(`📱 [WEBHOOK PHONE ID]: ${webhook.phoneNumberId} with ${webhook.events.length} events`);
                for (const event of webhook.events) {
                    try {
                        // Record 24-hour Free Customer Service Window timestamp
                        if ('from' in event && event.from) {
                            const nowIso = new Date().toISOString();
                            try {
                                const existingCustomer = await connection_1.db
                                    .select()
                                    .from(schema_1.customers)
                                    .where((0, drizzle_orm_1.eq)(schema_1.customers.phoneNumber, event.from))
                                    .limit(1);
                                if (existingCustomer.length > 0) {
                                    await connection_1.db
                                        .update(schema_1.customers)
                                        .set({ lastInboundInteraction: nowIso, updatedAt: nowIso })
                                        .where((0, drizzle_orm_1.eq)(schema_1.customers.id, existingCustomer[0].id));
                                }
                            }
                            catch (err) {
                                // Non-critical background timestamp update
                            }
                        }
                        await (0, router_1.handleIncomingEvent)(webhook.phoneNumberId, event);
                    }
                    catch (e) {
                        console.error('❌ Error handling event:', e);
                    }
                }
            }
        }
        catch (e) {
            console.error('❌ Error parsing webhook payload:', e);
        }
    });
});
exports.default = router;
//# sourceMappingURL=webhook.js.map