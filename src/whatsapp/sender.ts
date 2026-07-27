import { config } from '../config';
import type { Restaurant } from '../db/schema';

export interface ButtonDef {
  id: string;
  title: string;
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

export async function callMessagesApi(restaurant: Restaurant, payload: object): Promise<void> {
  if (config.mockWhatsApp || restaurant.metaAccessToken === 'PLACEHOLDER' || restaurant.metaAccessToken === 'default') {
    console.log(`\n[MOCK WA - ${restaurant.name}] Payload:`, JSON.stringify(payload, null, 2));
    return;
  }

  const url = `${config.metaApiBase}/${restaurant.whatsappPhoneNumberId}/messages`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${restaurant.metaAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WhatsApp API Error - ${restaurant.name}]:`, response.status, errorText);
    }
  } catch (error) {
    console.error(`[WhatsApp API Failed - ${restaurant.name}]:`, error);
  }
}

export async function sendText(restaurant: Restaurant, to: string, text: string): Promise<void> {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { body: text },
  };
  return callMessagesApi(restaurant, payload);
}

export async function sendButtons(
  restaurant: Restaurant,
  to: string,
  bodyText: string,
  buttons: ButtonDef[],
  header?: string,
  footer?: string
): Promise<void> {
  const payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((btn) => ({
          type: 'reply',
          reply: { id: btn.id, title: btn.title },
        })),
      },
    },
  };

  if (header) {
    payload.interactive.header = { type: 'text', text: header };
  }
  if (footer) {
    payload.interactive.footer = { text: footer };
  }

  return callMessagesApi(restaurant, payload);
}

export async function sendList(
  restaurant: Restaurant,
  to: string,
  bodyText: string,
  buttonLabel: string,
  sections: ListSection[],
  header?: string,
  footer?: string
): Promise<void> {
  const payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: bodyText },
      action: {
        button: buttonLabel,
        sections: sections.map((sec) => ({
          title: sec.title,
          rows: sec.rows.slice(0, 10).map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description,
          })),
        })),
      },
    },
  };

  if (header) {
    payload.interactive.header = { type: 'text', text: header };
  }
  if (footer) {
    payload.interactive.footer = { text: footer };
  }

  return callMessagesApi(restaurant, payload);
}

export async function sendTemplate(
  restaurant: Restaurant,
  to: string,
  templateName: string,
  languageCode: string,
  bodyParams: string[]
): Promise<void> {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: bodyParams.length > 0 ? [
        {
          type: 'body',
          parameters: bodyParams.map((p) => ({ type: 'text', text: p })),
        },
      ] : [],
    },
  };

  return callMessagesApi(restaurant, payload);
}

export async function markAsRead(restaurant: Restaurant, messageId: string): Promise<void> {
  const payload = {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  };
  return callMessagesApi(restaurant, payload);
}
