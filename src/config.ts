import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  absoluteDatabasePath: path.resolve(process.env.DATABASE_PATH || './data/spice-factory.db'),
  metaApiBase: 'https://graph.facebook.com/v21.0',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  metaAccessToken: process.env.META_ACCESS_TOKEN || '',
  webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  makeWebhookUrl: process.env.MAKE_WEBHOOK_URL || '',
  managerPhone: process.env.MANAGER_PHONE || '919699533441',
  mockWhatsApp: process.env.MOCK_WHATSAPP === 'true' || (!process.env.META_ACCESS_TOKEN && !process.env.WHATSAPP_PHONE_NUMBER_ID)
};
