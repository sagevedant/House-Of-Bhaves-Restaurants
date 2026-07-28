import { Router } from 'express';
import { config } from '../config';
import { parseWebhookPayload } from './parser';
import { handleIncomingEvent } from '../bot/router';

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

router.post('/', (req, res) => {
  console.log('\n📩 [WEBHOOK POST RECEIVED]:', JSON.stringify(req.body, null, 2));

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
            console.log(`⚡ [HANDLING EVENT]:`, JSON.stringify(event, null, 2));
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
