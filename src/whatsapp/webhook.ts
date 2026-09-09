import { Router, Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { config } from '../config';
import { parseWebhookPayload } from './parser';
import { handleIncomingEvent } from '../bot/router';
import { db } from '../db/connection';
import { customers } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.webhookVerifyToken) {
    console.log('Webhook verified successfully!');
    res.status(200).send(challenge);
  } else {
    console.warn('Webhook verification failed.');
    res.sendStatus(403);
  }
});

/**
 * FIX (critical): the POST handler previously never verified Meta's
 * X-Hub-Signature-256 header, so any third party who discovered this URL
 * could POST fabricated WhatsApp events (fake bookings, fake status
 * updates, fake messages) directly into the booking pipeline and database.
 *
 * This computes an HMAC-SHA256 of the raw request body using
 * META_APP_SECRET and compares it (constant-time) against the header Meta
 * sends on every real webhook delivery. Requires index.js to mount this
 * router with the raw-body-capturing json verify option (see index.js).
 */
function verifyMetaSignature(req: Request): boolean {
  if (!config.metaAppSecret) {
    // No app secret configured — cannot verify. Fail closed rather than
    // silently accepting unsigned payloads.
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

  const expected = 'sha256=' + createHmac('sha256', config.metaAppSecret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected);
  const gotBuf = Buffer.from(signatureHeader);

  if (expectedBuf.length !== gotBuf.length) return false;
  return timingSafeEqual(expectedBuf, gotBuf);
}

router.post('/', (req, res) => {
  if (!verifyMetaSignature(req)) {
    console.warn('🚫 [WEBHOOK AUTH] Rejected POST with invalid/missing signature.');
    res.sendStatus(401);
    return;
  }

  console.log('\n📩 [WEBHOOK POST RECEIVED - signature verified]');

  // Respond immediately to acknowledge receipt (<5 seconds SLA for Meta)
  res.status(200).send('EVENT_RECEIVED');

  const body = req.body;
  
  // Async processing
  setImmediate(async () => {
    try {
      const parsedWebhooks = parseWebhookPayload(body);
      console.log(`🔍 [WEBHOOK PARSER]: Found ${parsedWebhooks.length} webhook groups`);
      
      for (const webhook of parsedWebhooks) {
        console.log(`📱 [WEBHOOK PHONE ID]: ${webhook.phoneNumberId} with ${webhook.events.length} events`);
        for (const event of webhook.events) {
          try {
            // Record 24-hour Free Customer Service Window timestamp
            if ('from' in event && event.from) {
              const nowIso = new Date().toISOString();
              try {
                const existingCustomer = await db
                  .select()
                  .from(customers)
                  .where(eq(customers.phoneNumber, event.from))
                  .limit(1);

                if (existingCustomer.length > 0) {
                  await db
                    .update(customers)
                    .set({ lastInboundInteraction: nowIso, updatedAt: nowIso })
                    .where(eq(customers.id, existingCustomer[0].id));
                }
              } catch (err) {
                // Non-critical background timestamp update
              }
            }

            await handleIncomingEvent(webhook.phoneNumberId, event);
          } catch (e) {
            console.error('❌ Error handling event:', e);
          }
        }
      }
    } catch (e) {
      console.error('❌ Error parsing webhook payload:', e);
    }
  });
});

export default router;
