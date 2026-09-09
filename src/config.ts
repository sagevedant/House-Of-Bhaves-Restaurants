import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// FIX (critical): previously this file shipped a live, working, read-write
// Turso auth token + DB URL as hardcoded fallback defaults. Anyone with
// access to the source/build had full read/write access to the production
// database. That token has been REVOKED — rotate it in the Turso dashboard
// and put the new one only in your real .env (never in source).
//
// We now fail fast at boot if required secrets are missing instead of
// silently falling back to a baked-in credential.
function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val || !val.trim()) {
    throw new Error(
      `[FATAL CONFIG ERROR] Missing required environment variable: ${name}. ` +
      `Set it in your .env file — the app will not start without it.`
    );
  }
  return val;
}

export const config = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  tursoDatabaseUrl: requireEnv('TURSO_DATABASE_URL'),
  tursoAuthToken: requireEnv('TURSO_AUTH_TOKEN'),
  absoluteDatabasePath: path.resolve(process.env.DATABASE_PATH || './data/hob-restaurant.db'),
  metaApiBase: 'https://graph.facebook.com/v21.0',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  metaAccessToken: process.env.META_ACCESS_TOKEN || '',
  metaAppSecret: process.env.META_APP_SECRET || '', // FIX: required for webhook HMAC signature verification
  webhookVerifyToken: requireEnv('WEBHOOK_VERIFY_TOKEN'),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  makeWebhookUrl: process.env.MAKE_WEBHOOK_URL || '',
  managerPhone: process.env.MANAGER_PHONE || '',
  // FIX: mock mode must be explicit, never an accidental silent fallback.
  // Previously: mockWhatsApp defaulted to true whenever META credentials were
  // simply absent, meaning misconfigured prod could silently drop all
  // outbound WhatsApp messages with zero error surfaced anywhere.
  mockWhatsApp: process.env.MOCK_WHATSAPP === 'true',
  adminBasicAuthUser: process.env.ADMIN_BASIC_AUTH_USER || '',
  adminBasicAuthPass: process.env.ADMIN_BASIC_AUTH_PASS || '',
};

if (!config.mockWhatsApp && (!config.metaAccessToken || !config.whatsappPhoneNumberId)) {
  console.warn(
    '⚠️ [CONFIG WARNING] META_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set and ' +
    'MOCK_WHATSAPP is not "true". Per-client tokens in the DB will be required for ' +
    'every send, or outbound messages will fail loudly (not silently) at send time.'
  );
}

if (!config.metaAppSecret) {
  console.warn(
    '⚠️ [CONFIG WARNING] META_APP_SECRET not set — inbound webhook requests will NOT be ' +
    'signature-verified. Set this in production or the /webhook endpoint accepts unauthenticated payloads.'
  );
}

if (!config.adminBasicAuthUser || !config.adminBasicAuthPass) {
  console.warn(
    '⚠️ [CONFIG WARNING] ADMIN_BASIC_AUTH_USER/PASS not set — admin dashboard, onboarding, ' +
    'and CSV export routes will be BLOCKED until these are configured (fail-closed).'
  );
}
