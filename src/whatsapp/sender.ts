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
  const token = (restaurant.metaAccessToken && !restaurant.metaAccessToken.startsWith('PLACEHOLDER')) 
    ? restaurant.metaAccessToken 
    : config.metaAccessToken;

  const phoneId = (restaurant.whatsappPhoneNumberId && !restaurant.whatsappPhoneNumberId.startsWith('PLACEHOLDER')) 
    ? restaurant.whatsappPhoneNumberId 
    : config.whatsappPhoneNumberId;

  const isMock = config.mockWhatsApp || !token || token.startsWith('PLACEHOLDER') || token === 'default';

  const tokenSnippet = token ? `${token.slice(0, 10)}... (length ${token.length})` : 'EMPTY';
  console.log(`📡 [OUTBOUND WA CHECK]: Phone ID='${phoneId}', Token='${tokenSnippet}', mockMode=${isMock}`);

  if (isMock) {
    console.log(`ℹ️ [MOCK WA MODE ACTIVE - ${restaurant.name}] Payload:`, JSON.stringify(payload, null, 2));
    return;
  }

  const url = `${config.metaApiBase}/${phoneId}/messages`;
  console.log(`🚀 [SENDING TO META API]: URL='${url}' to '${(payload as any).to}'`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const resText = await response.text();
    if (!response.ok) {
      console.error(`❌ [WhatsApp API Error - HTTP ${response.status}]:`, resText);
    } else {
      console.log(`✅ [WhatsApp API Success - HTTP ${response.status}]:`, resText);
    }
  } catch (error) {
    console.error(`❌ [WhatsApp API Request Failed - ${restaurant.name}]:`, error);
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
          reply: { id: btn.id.slice(0, 256), title: btn.title.slice(0, 20) },
        })),
      },
    },
  };

  if (header) {
    payload.interactive.header = { type: 'text', text: header.slice(0, 60) };
  }
  if (footer) {
    payload.interactive.footer = { text: footer.slice(0, 60) };
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
        button: buttonLabel.slice(0, 20),
        sections: sections.map((sec) => ({
          title: sec.title.slice(0, 24),
          rows: sec.rows.slice(0, 10).map((row) => ({
            id: row.id.slice(0, 200),
            title: row.title.slice(0, 24),
            ...(row.description ? { description: row.description.slice(0, 72) } : {}),
          })),
        })),
      },
    },
  };

  if (header) {
    payload.interactive.header = { type: 'text', text: header.slice(0, 60) };
  }
  if (footer) {
    payload.interactive.footer = { text: footer.slice(0, 60) };
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
