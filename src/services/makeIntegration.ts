import { config } from '../config';

export async function sendToMakeWebhook(payload: Record<string, any>): Promise<void> {
  const webhookUrl = config.makeWebhookUrl;
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
    } else {
      console.warn(`⚠️ [Make.com] Error status: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ [Make.com] Failed:', error);
  }
}
