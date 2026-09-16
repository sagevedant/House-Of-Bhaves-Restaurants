"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
// FIX (critical): previously this file shipped a live, working, read-write
// Turso auth token + DB URL as hardcoded fallback defaults. Anyone with
// access to the source/build had full read/write access to the production
// database. That token has been REVOKED — rotate it in the Turso dashboard
// and put the new one only in your real .env (never in source).
//
// Fail fast at boot if required secrets are missing instead of
// silently falling back to a baked-in credential.
function requireEnv(name) {
    const val = process.env[name];
    if (!val || !val.trim()) {
        throw new Error(`[FATAL CONFIG ERROR] Missing required environment variable: ${name}. ` +
            `Set it in your .env file — the app will not start without it.`);
    }
    return val.trim();
}
if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_DATABASE_URL.trim() ||
    !process.env.TURSO_AUTH_TOKEN || !process.env.TURSO_AUTH_TOKEN.trim()) {
    throw new Error('[FATAL CONFIG ERROR] Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variable. Set them in your .env file.');
}
exports.config = {
    PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    tursoDatabaseUrl: requireEnv('TURSO_DATABASE_URL'),
    tursoAuthToken: requireEnv('TURSO_AUTH_TOKEN'),
    absoluteDatabasePath: path_1.default.resolve(process.env.DATABASE_PATH || './data/hob-restaurant.db'),
    metaApiBase: 'https://graph.facebook.com/v21.0',
    // Agency Tech Provider App Credentials
    metaAppId: process.env.META_APP_ID || '',
    // Security & Webhook Signature Enforcement
    enforceWebhookSignature: process.env.ENFORCE_WEBHOOK_SIGNATURE === 'true',
    metaAppSecret: process.env.META_APP_SECRET || '', // Required for webhook HMAC & server-side token exchange
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
};
if (!exports.config.enforceWebhookSignature) {
    console.warn('⚠️ Webhook signature verification is DISABLED — do not use in production');
}
if (!exports.config.mockWhatsApp && (!exports.config.metaAccessToken || !exports.config.whatsappPhoneNumberId)) {
    console.warn('⚠️ [CONFIG WARNING] META_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set and ' +
        'MOCK_WHATSAPP is not "true". Per-client tokens in the DB will be required for ' +
        'every send, or outbound messages will fail loudly (not silently) at send time.');
}
if (exports.config.enforceWebhookSignature && !exports.config.metaAppSecret) {
    console.warn('⚠️ [CONFIG WARNING] ENFORCE_WEBHOOK_SIGNATURE is "true" but META_APP_SECRET is not set — ' +
        'all inbound webhook requests will be rejected (401).');
}
if (!exports.config.adminBasicAuthUser || !exports.config.adminBasicAuthPass) {
    console.warn('⚠️ [CONFIG WARNING] ADMIN_BASIC_AUTH_USER/PASS not set — admin dashboard, onboarding, ' +
        'and CSV export routes will be BLOCKED until these are configured (fail-closed).');
}
//# sourceMappingURL=config.js.map