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
  // Respond immediately to acknowledge receipt
  res.status(200).send('EVENT_RECEIVED');

  const body = req.body;
  
  // Async processing
  setImmediate(async () => {
    try {
      const parsedWebhooks = parseWebhookPayload(body);
      
      for (const webhook of parsedWebhooks) {
        for (const event of webhook.events) {
          try {
            await handleIncomingEvent(webhook.phoneNumberId, event);
          } catch (e) {
            console.error('Error handling event:', e);
          }
        }
      }
    } catch (e) {
      console.error('Error parsing webhook payload:', e);
    }
  });
});

export default router;
