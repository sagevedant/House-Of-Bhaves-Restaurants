import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  tursoDatabaseUrl: process.env.TURSO_DATABASE_URL || 'libsql://house-of-bhaves-db-hob-18.aws-ap-south-1.turso.io',
  tursoAuthToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODU0ODM5MzgsImlkIjoiMDE5ZmI3MjAtZDEwMS03ZDhlLWEyNTUtOGRmZTU3NDQzMWU2Iiwia2lkIjoiQlptb09TNjYybW0tdjlReGRvQTFQWjhvNGx0blppMGhSRW1kSkptbFVoayIsInJpZCI6IjdlMjZlZTc3LWQ1MmQtNDExNS1hM2RmLWNiOWEyMDFhNDg2YiJ9.XWxG1rwoOsEP7mYLDMifLmsY4BAje8i8jrxOWw6F2S7EKawBacQi6On1qNsjCjYs8E90aMLMjz5yTsff1kfkAw',
  absoluteDatabasePath: path.resolve(process.env.DATABASE_PATH || './data/hob-restaurant.db'),
  metaApiBase: 'https://graph.facebook.com/v21.0',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  metaAccessToken: process.env.META_ACCESS_TOKEN || '',
  webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN || 'hob_restaurant_secret',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  makeWebhookUrl: process.env.MAKE_WEBHOOK_URL || '',
  managerPhone: process.env.MANAGER_PHONE || '919699533441',
  mockWhatsApp: process.env.MOCK_WHATSAPP === 'true' || (!process.env.META_ACCESS_TOKEN && !process.env.WHATSAPP_PHONE_NUMBER_ID)
};
