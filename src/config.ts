import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// FIX (critical): previously this file shipped a live, working, read-write
// Turso auth token + DB URL as hardcoded fallback defaults. Anyone with
// access to the source/build had full read/write access to the production
// database. That token has been REVOKED — rotate it in the Turso dashboard
// and put the new one only in your real .env (never in source).
//
// Fail fast at boot if required secrets are missing instead of
// silently falling back to a baked-in credential.
function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val || !val.trim()) {
    console.error(
      `\n❌ [FATAL CONFIG ERROR] Missing required environment variable: ${name}.\n` +
      `   Set it in your .env file before starting the server.\n`
    );
    process.exit(1);
  }
  return val.trim();
}

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_DATABASE_URL.trim() || 
    !process.env.TURSO_AUTH_TOKEN || !process.env.TURSO_AUTH_TOKEN.trim()) {
  console.error(
    `\n❌ [FATAL CONFIG ERROR] Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.\n` +
    `   Turso database connection credentials must be supplied via .env with NO fallback string.\n`
  );
  process.exit(1);
}

if (!process.env.WEBHOOK_VERIFY_TOKEN || !process.env.WEBHOOK_VERIFY_TOKEN.trim()) {
  const suggestedSecret = require('crypto').randomBytes(24).toString('hex');
  console.error(
    `\n❌ [FATAL CONFIG ERROR] Missing WEBHOOK_VERIFY_TOKEN in .env.\n` +
    `   No default fallback string is permitted. Please add this to your .env file:\n` +
    `   WEBHOOK_VERIFY_TOKEN=${suggestedSecret}\n`
  );
  process.exit(1);
}

if (!process.env.META_APP_SECRET || !process.env.META_APP_SECRET.trim()) {
  console.error(
    `\n❌ [FATAL CONFIG ERROR] Missing META_APP_SECRET in .env.\n` +
    `   Meta App Secret is required for HMAC-SHA256 signature verification of inbound webhooks.\n` +
    `   Find your App Secret in Meta App Dashboard -> App settings -> Basic.\n`
  );
  process.exit(1);
}

export const config = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  tursoDatabaseUrl: requireEnv('TURSO_DATABASE_URL'),
  tursoAuthToken: requireEnv('TURSO_AUTH_TOKEN'),
  absoluteDatabasePath: path.resolve(process.env.DATABASE_PATH || './data/hob-restaurant.db'),
  metaApiBase: 'https://graph.facebook.com/v21.0',
  // Agency Tech Provider App Credentials
  metaAppId: process.env.META_APP_ID || '',
  metaAppSecret: requireEnv('META_APP_SECRET'), // Required for webhook HMAC & server-side token exchange
  metaEmbeddedSignupConfigId: process.env.META_EMBEDDED_SIGNUP_CONFIG_ID || process.env.META_CONFIG_ID || '',
  metaSystemUserAccessToken: process.env.META_SYSTEM_USER_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '',
  // Legacy / Default WhatsApp Credentials (used as fallback or in development)
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  metaAccessToken: process.env.META_ACCESS_TOKEN || '',
  webhookVerifyToken: requireEnv('WEBHOOK_VERIFY_TOKEN'),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  makeWebhookUrl: process.env.MAKE_WEBHOOK_URL || '',
  managerPhone: process.env.MANAGER_PHONE || '',
  // Mock mode for tests/local dev
  mockWhatsApp: process.env.MOCK_WHATSAPP === 'true',
  adminBasicAuthUser: process.env.ADMIN_BASIC_AUTH_USER || '',
  adminBasicAuthPass: process.env.ADMIN_BASIC_AUTH_PASS || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-hob-agency-platform-2026-secure-key',
  debugVerboseLogging: process.env.DEBUG_VERBOSE_LOGGING === 'true',
  adminFrontendOrigin: process.env.ADMIN_FRONTEND_ORIGIN || 'http://localhost:5173',
};

console.log('🔒 [WEBHOOK AUTH] Webhook signature verification is ACTIVE (HMAC-SHA256 enforcement enabled).');

if (!config.mockWhatsApp && (!config.metaAccessToken || !config.whatsappPhoneNumberId)) {
  console.warn(
    '⚠️ [CONFIG WARNING] META_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set and ' +
    'MOCK_WHATSAPP is not "true". Per-client tokens in the DB will be required for ' +
    'every send, or outbound messages will fail loudly (not silently) at send time.'
  );
}

if (!config.adminBasicAuthUser || !config.adminBasicAuthPass) {
  console.warn(
    '⚠️ [CONFIG WARNING] ADMIN_BASIC_AUTH_USER/PASS not set — admin dashboard, onboarding, ' +
    'and CSV export routes will be BLOCKED until these are configured (fail-closed).'
  );
}
