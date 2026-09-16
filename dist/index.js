"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const config_1 = require("./config");
const connection_1 = require("./db/connection");
const schema_1 = require("./db/schema");
const webhook_1 = __importDefault(require("./whatsapp/webhook"));
const makeIntegration_1 = require("./services/makeIntegration");
const drizzle_orm_1 = require("drizzle-orm");
const cron_1 = require("./scheduler/cron");
const reviewEngine_1 = require("./services/reviewEngine");
const auth_1 = require("./middleware/auth");
const escape_1 = require("./utils/escape");
const reservationCode_1 = require("./utils/reservationCode");
const metaEmbeddedSignup_1 = require("./services/metaEmbeddedSignup");
const app = (0, express_1.default)();
app.use((0, cookie_parser_1.default)());
// FIX (critical): capture the raw request body on the webhook route so
// webhook.ts can verify Meta's X-Hub-Signature-256 HMAC. Only the /webhook
// path needs this; other routes use plain json parsing.
app.use('/webhook', express_1.default.json({
    verify: (req, _res, buf) => { req.rawBody = buf; }
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Mount webhook router (signature verification happens inside)
app.use('/webhook', webhook_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Interactive Simulator Demo
app.get('/demo', (req, res) => {
    res.sendFile(require('path').resolve('./demo.html'));
});
// Meta App Compliance Routes (Privacy Policy, Terms of Service, User Data Deletion)
// These are required to be publicly reachable by Meta's app review — left unauthenticated intentionally.
app.get('/privacy', (req, res) => {
    res.send(`
    <!DOCTYPE html><html><head><title>Privacy Policy - House of Bhaves (HOB)</title><style>body{font-family:sans-serif;padding:40px;line-height:1.6;max-width:800px;margin:0 auto;color:#222;}</style></head>
    <body><h1>Privacy Policy</h1><p><strong>House of Bhaves (HOB)</strong> respects your privacy. We process customer names, phone numbers, and reservation details solely for table booking and restaurant communication via WhatsApp.</p>
    <h2>Data Collection & Usage</h2><p>Data collected via WhatsApp is strictly used for managing table reservations, sending booking confirmations, and optional dining reminders.</p>
    <h2>Data Protection</h2><p>We do not sell or share personal data with third parties. For data deletion requests, contact us via the support address configured for your account.</p></body></html>
  `);
});
// ----------------------------------------------------
// 🔐 AUTHENTICATION: LOGIN & LOGOUT ROUTES
// ----------------------------------------------------
app.get('/login', (req, res) => {
    const redirect = req.query.redirect ? String(req.query.redirect) : '';
    const errorMsg = req.query.error ? String(req.query.error) : '';
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign In | House of Bhaves Platform</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Instrument Sans', -apple-system, sans-serif;
      background: #0B0A09;
      color: #F3EFE6;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      background-image: radial-gradient(circle at 50% 0%, #26211A 0%, #0B0A09 70%);
      position: relative;
    }
    body::before {
      content: '';
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: url('data:image/svg+xml,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)" opacity="0.045"/></svg>');
      pointer-events: none;
      z-index: 999;
    }
    .login-card {
      width: 100%;
      max-width: 440px;
      background: #141311;
      border: 1.5px solid #2D2923;
      border-radius: 24px;
      padding: 40px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.06);
      position: relative;
      z-index: 10;
    }
    .brand-pill {
      display: inline-block;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #F59E0B;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 11px;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 30px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 18px;
    }
    .login-header h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 26px;
      color: #F3EFE6;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .login-header p {
      color: #A8A29E;
      font-size: 13.5px;
      margin-top: 6px;
      font-weight: 500;
      line-height: 1.4;
    }
    .error-alert {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid #EF4444;
      color: #FCA5A5;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      margin: 20px 0 6px 0;
    }
    form { margin-top: 24px; }
    .form-group { margin-bottom: 20px; }
    label {
      display: block;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 11.5px;
      font-weight: 700;
      color: #D6D3D1;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    input {
      width: 100%;
      background: #0E0D0C;
      border: 1.5px solid #2D2923;
      color: #F3EFE6;
      padding: 14px 16px;
      border-radius: 12px;
      font-size: 14px;
      font-family: inherit;
      transition: all 0.2s ease;
    }
    input:focus {
      border-color: #F59E0B;
      outline: none;
      background: #12110F;
      box-shadow: 0 0 15px rgba(245, 158, 11, 0.18);
    }
    .btn-submit {
      width: 100%;
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      border: none;
      color: #0D0C0B;
      padding: 16px;
      border-radius: 14px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 10px;
      box-shadow: 0 6px 20px rgba(245, 158, 11, 0.25);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .btn-submit:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(245, 158, 11, 0.35);
    }
    .login-footer {
      margin-top: 24px;
      border-top: 1px solid #22201D;
      padding-top: 18px;
      font-size: 12px;
      color: #78716C;
      text-align: center;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="login-card">
    <div class="brand-pill">House of Bhaves</div>
    <div class="login-header">
      <h1>Portal Sign In</h1>
      <p>Enter your agency admin or restaurant client credentials to continue.</p>
    </div>

    ${errorMsg ? `<div class="error-alert">⚠️ ${(0, escape_1.escapeHtml)(errorMsg)}</div>` : ''}

    <form action="/login" method="POST">
      <input type="hidden" name="redirect" value="${(0, escape_1.escapeHtml)(redirect)}">
      
      <div class="form-group">
        <label>Email Address</label>
        <input type="email" name="email" placeholder="name@domain.com" required autofocus autocomplete="email">
      </div>

      <div class="form-group">
        <label>Password</label>
        <input type="password" name="password" placeholder="••••••••" required autocomplete="current-password">
      </div>

      <button type="submit" class="btn-submit">Sign In to Dashboard →</button>
    </form>

    <div class="login-footer">
      Protected with rate-limited brute-force shield & secure httpOnly session cookies.
    </div>
  </div>
</body>
</html>
  `);
});
app.post('/login', auth_1.loginLimiter, async (req, res) => {
    try {
        const { email, password, redirect } = req.body;
        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
            const returnUrl = encodeURIComponent(redirect || '');
            return res.redirect(`/login?error=${encodeURIComponent('Please provide both email and password.')}&redirect=${returnUrl}`);
        }
        const cleanEmail = email.trim().toLowerCase();
        // 1. Look up user by email in database
        const user = await connection_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, cleanEmail)).get();
        if (!user) {
            const returnUrl = encodeURIComponent(redirect || '');
            return res.redirect(`/login?error=${encodeURIComponent('Invalid email or password.')}&redirect=${returnUrl}`);
        }
        // 2. Verify hashed password
        const valid = await (0, auth_1.comparePassword)(password, user.passwordHash);
        if (!valid) {
            const returnUrl = encodeURIComponent(redirect || '');
            return res.redirect(`/login?error=${encodeURIComponent('Invalid email or password.')}&redirect=${returnUrl}`);
        }
        // 3. Generate JWT token
        const token = (0, auth_1.generateToken)({
            id: user.id,
            email: user.email,
            role: user.role,
            clientId: user.clientId ?? null,
        });
        // 4. Set httpOnly cookie
        res.cookie(auth_1.AUTH_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        // 5. Determine redirection target
        if (redirect && typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')) {
            return res.redirect(redirect);
        }
        if (user.role === 'agency_admin') {
            return res.redirect('/agency');
        }
        if (user.role === 'client_owner' && user.clientId) {
            // Find client slug
            const client = await connection_1.db.select().from(schema_1.clients).where((0, drizzle_orm_1.eq)(schema_1.clients.id, user.clientId)).get();
            if (client?.slug) {
                return res.redirect(`/restaurant/${encodeURIComponent(client.slug)}`);
            }
            const rest = await connection_1.db.select().from(schema_1.restaurants).where((0, drizzle_orm_1.eq)(schema_1.restaurants.id, user.clientId)).get();
            if (rest?.slug) {
                return res.redirect(`/restaurant/${encodeURIComponent(rest.slug)}`);
            }
        }
        res.redirect('/agency');
    }
    catch (err) {
        console.error('Login error:', err);
        res.redirect(`/login?error=${encodeURIComponent('An unexpected error occurred during login.')}`);
    }
});
app.all('/logout', (req, res) => {
    res.clearCookie(auth_1.AUTH_COOKIE_NAME);
    res.redirect('/login');
});
app.get('/terms', (req, res) => {
    res.send(`
    <!DOCTYPE html><html><head><title>Terms of Service - House of Bhaves (HOB)</title><style>body{font-family:sans-serif;padding:40px;line-height:1.6;max-width:800px;margin:0 auto;color:#222;}</style></head>
    <body><h1>Terms of Service</h1><p>By using the <strong>House of Bhaves (HOB)</strong> WhatsApp reservation system, you agree to receive automated reservation confirmations and dining notifications.</p></body></html>
  `);
});
app.get('/deletion', (req, res) => {
    res.send(`
    <!DOCTYPE html><html><head><title>User Data Deletion - House of Bhaves (HOB)</title><style>body{font-family:sans-serif;padding:40px;line-height:1.6;max-width:800px;margin:0 auto;color:#222;}</style></head>
    <body><h1>User Data Deletion Instructions</h1><p>To request deletion of your reservation data, please contact the restaurant/clinic you booked with directly, or reach out via the support channel configured for your account. All data will be removed within 48 hours of a verified request.</p></body></html>
  `);
});
// FIX (critical): this route previously dumped full customer PII (names,
// phone numbers) as CSV to anyone who guessed the slug, with no auth and
// no CSV-injection escaping. Now requires tenant-scoped auth + escapes every field.
app.get('/api/restaurant/:slug/export', (0, auth_1.requireTenantAccess)('slug'), async (req, res) => {
    try {
        const rawSlug = req.params.slug;
        const slug = Array.isArray(rawSlug) ? rawSlug[0] : (rawSlug || '');
        const clientMatches = await connection_1.db.select().from(schema_1.clients).where((0, drizzle_orm_1.eq)(schema_1.clients.slug, slug)).limit(1);
        const restMatches = await connection_1.db.select().from(schema_1.restaurants).where((0, drizzle_orm_1.eq)(schema_1.restaurants.slug, slug)).limit(1);
        const client = clientMatches[0];
        const restaurant = restMatches[0];
        let allRes = [];
        if (client) {
            const clientBookings = await connection_1.db.select().from(schema_1.bookings).where((0, drizzle_orm_1.eq)(schema_1.bookings.clientId, client.id)).orderBy((0, drizzle_orm_1.desc)(schema_1.bookings.createdAt));
            allRes = clientBookings.map(b => ({
                code: b.reservationCode || '',
                name: b.customerName || 'Guest',
                phone: b.customerPhone || '',
                guests: b.guests || 2,
                occasion: b.occasion || 'casual',
                date: b.date || '',
                time: b.time || '',
                status: b.status || 'booked',
                createdAt: b.createdAt || ''
            }));
        }
        if (allRes.length === 0 && restaurant) {
            const restReservations = await connection_1.db.select().from(schema_1.reservations).where((0, drizzle_orm_1.eq)(schema_1.reservations.restaurantId, restaurant.id)).orderBy((0, drizzle_orm_1.desc)(schema_1.reservations.createdAt));
            allRes = restReservations.map(r => ({
                code: r.reservationCode || '',
                name: r.customerName || 'Guest',
                phone: r.customerPhone || '',
                guests: r.guests || 2,
                occasion: r.occasion || 'casual',
                date: r.date || '',
                time: r.time || '',
                status: r.stage || 'booked',
                createdAt: r.createdAt || ''
            }));
        }
        let csvContent = 'Reservation Code,Customer Name,Phone Number,Guests,Occasion,Date,Time,Status,Created At\n';
        for (const r of allRes) {
            // FIX: every field escaped against CSV formula injection + embedded quotes
            const fields = [
                (0, escape_1.escapeCsvField)(r.code),
                (0, escape_1.escapeCsvField)(r.name),
                (0, escape_1.escapeCsvField)('+' + r.phone),
                (0, escape_1.escapeCsvField)(r.guests),
                (0, escape_1.escapeCsvField)(r.occasion),
                (0, escape_1.escapeCsvField)(r.date),
                (0, escape_1.escapeCsvField)(r.time),
                (0, escape_1.escapeCsvField)(r.status),
                (0, escape_1.escapeCsvField)(r.createdAt),
            ];
            csvContent += fields.join(',') + '\n';
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${slug.replace(/[^a-z0-9-]/gi, '_')}-reservations-${new Date().toISOString().split('T')[0]}.csv"`);
        res.status(200).send(csvContent);
    }
    catch (error) {
        console.error('Export error:', error);
        res.status(500).send('Failed to export CSV');
    }
});
// Demo reservation creation endpoint — auth-gated, no hardcoded customer PII
app.post('/api/reservations/demo', auth_1.requireAuth, async (req, res) => {
    try {
        const code = await (0, reservationCode_1.generateReservationCode)('DEMO');
        const allRestaurants = await connection_1.db.select().from(schema_1.restaurants).limit(1);
        const restaurantId = allRestaurants.length > 0 ? allRestaurants[0].id : 1;
        const restaurantName = allRestaurants.length > 0 ? allRestaurants[0].name : 'House of Bhaves Rooftop & Lounge (HOB)';
        // FIX: removed hardcoded real-looking customer name/phone (PII) that was
        // previously baked into source. Demo data is now clearly synthetic.
        const [newRes] = await connection_1.db.insert(schema_1.reservations).values({
            restaurantId,
            customerName: 'Demo Guest',
            customerPhone: '910000000000',
            guests: 4,
            occasion: 'birthday',
            date: new Date().toISOString().split('T')[0],
            time: '20:30',
            reservationCode: code,
            stage: 'booked',
        }).returning();
        await (0, makeIntegration_1.sendToMakeWebhook)({
            event: 'demo_created',
            reservationId: newRes.id,
            reservationCode: newRes.reservationCode,
            restaurantName,
            customerName: newRes.customerName,
            customerPhone: newRes.customerPhone,
            guests: newRes.guests,
            occasion: newRes.occasion,
            date: newRes.date,
            time: newRes.time,
            stage: newRes.stage,
            timestamp: new Date().toISOString(),
        });
        res.json(newRes);
    }
    catch (error) {
        console.error('Demo creation error:', error);
        res.status(500).json({ error: 'Failed to create demo reservation' });
    }
});
// Status update endpoint — auth-gated (was previously open to anyone)
app.post('/api/reservations/status', auth_1.requireAuth, async (req, res) => {
    try {
        const { reservationId, status } = req.body;
        const ALLOWED_STATUSES = ['booked', 'seated', 'completed', 'no_show', 'cancelled'];
        if (!reservationId || !status || !ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({ error: 'Missing or invalid reservationId/status' });
        }
        // Update in bookings table
        const [updatedBooking] = await connection_1.db.update(schema_1.bookings)
            .set({ status })
            .where((0, drizzle_orm_1.eq)(schema_1.bookings.id, reservationId))
            .returning();
        // Update in legacy reservations table
        const [updatedRes] = await connection_1.db.update(schema_1.reservations)
            .set({ stage: status })
            .where((0, drizzle_orm_1.eq)(schema_1.reservations.id, reservationId))
            .returning();
        const updated = updatedBooking || updatedRes;
        if (updated) {
            const currentYear = new Date().getFullYear();
            const today = new Date().toISOString().split('T')[0];
            const phone = updated.customerPhone || updated.phone;
            const restId = updated.clientId || updated.restaurantId;
            if (status === 'seated' || status === 'completed') {
                const updates = { lastDinedAt: today };
                if (updated.occasion === 'birthday') {
                    updates.birthdayDiscountClaimedYear = currentYear;
                }
                if (phone && restId) {
                    await connection_1.db
                        .update(schema_1.conversations)
                        .set(updates)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.conversations.phone, phone), (0, drizzle_orm_1.eq)(schema_1.conversations.restaurantId, restId)));
                }
                // Schedule 2-Hour Asynchronous Same-Day Review Delay Queue
                await (0, reviewEngine_1.scheduleSameDayReview)(updated.id, 120);
            }
        }
        res.json({ success: true, reservation: updated });
    }
    catch (error) {
        console.error('Status update error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});
// Agency Control API Endpoint (Same-Day Review Queue Trigger) — auth-gated to agency_admin
app.post('/api/agency/trigger-review-queue', (0, auth_1.requireRole)(['agency_admin']), async (req, res) => {
    const result = await (0, reviewEngine_1.processPendingReviewQueue)();
    res.json(result);
});
// ----------------------------------------------------
// 📝 LUXURY META TECH PROVIDER ONBOARDING PORTAL (GET /onboard)
// ----------------------------------------------------
app.get('/onboard', (0, auth_1.requireRole)(['agency_admin']), (req, res) => {
    const metaAppId = config_1.config.metaAppId;
    const configId = config_1.config.metaEmbeddedSignupConfigId;
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meta Embedded Signup Onboarding | House of Bhaves Agency</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Instrument Sans', -apple-system, sans-serif;
      background: #0B0A09;
      color: #F3EFE6;
      padding: 40px 20px;
      min-height: 100vh;
      background-image: radial-gradient(circle at 50% 0%, #26211A 0%, #0B0A09 70%);
      position: relative;
    }
    body::before {
      content: '';
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: url('data:image/svg+xml,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)" opacity="0.045"/></svg>');
      pointer-events: none;
      z-index: 999;
    }
    .form-container {
      max-width: 760px;
      margin: 0 auto;
      background: #141311;
      border: 1.5px solid #2D2923;
      border-radius: 24px;
      padding: 40px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05);
    }
    .brand-pill {
      display: inline-block;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #F59E0B;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 11px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 30px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 16px;
    }
    .form-header { text-align: center; margin-bottom: 28px; }
    .form-header h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 26px;
      color: #F3EFE6;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .form-header p { color: #A8A29E; font-size: 13px; margin-top: 6px; font-weight: 500; }

    .tech-provider-notice {
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 14px;
      padding: 16px 20px;
      margin-bottom: 26px;
      display: flex;
      gap: 14px;
      align-items: flex-start;
    }
    .notice-icon { font-size: 24px; line-height: 1; }
    .notice-title { font-size: 13px; font-weight: 700; color: #60A5FA; font-family: 'Space Grotesk', sans-serif; }
    .notice-body { font-size: 12px; color: #94A3B8; margin-top: 3px; line-height: 1.4; }

    .meta-signup-card {
      background: #191816;
      border: 1.5px solid #3E3932;
      border-radius: 18px;
      padding: 24px;
      margin-bottom: 26px;
      text-align: center;
    }
    .meta-signup-card.connected {
      border-color: #22C55E;
      background: rgba(34, 197, 94, 0.06);
    }
    .meta-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: #1877F2;
      color: #FFF;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 14px;
      font-weight: 700;
      padding: 14px 28px;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(24, 119, 242, 0.35);
    }
    .meta-btn:hover { background: #166FE5; transform: translateY(-1px); }
    .meta-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .status-badge {
      display: inline-block;
      margin-top: 14px;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      font-family: 'Space Grotesk', sans-serif;
    }
    .status-pending { background: #282522; color: #A8A29E; }
    .status-success { background: rgba(34, 197, 94, 0.2); color: #4ADE80; border: 1px solid #22C55E; }
    .status-error { background: rgba(239, 68, 68, 0.2); color: #F87171; border: 1px solid #EF4444; }

    .form-group { margin-bottom: 20px; }
    label {
      display: block;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 12px;
      font-weight: 700;
      color: #D6D3D1;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    input, select, textarea {
      width: 100%;
      background: #0E0D0C;
      border: 1.5px solid #2D2923;
      color: #F3EFE6;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 14px;
      font-family: inherit;
      transition: all 0.2s ease;
    }
    textarea { height: 85px; resize: vertical; line-height: 1.5; }
    input:focus, select:focus, textarea:focus { border-color: #F59E0B; outline: none; background: #12110F; box-shadow: 0 0 15px rgba(245, 158, 11, 0.15); }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    
    .submit-btn {
      width: 100%;
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      border: none;
      color: #0D0C0B;
      padding: 16px;
      border-radius: 14px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 10px;
      box-shadow: 0 6px 20px rgba(245, 158, 11, 0.25);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .submit-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(245, 158, 11, 0.35); }
    .note { font-size: 11px; color: #78716C; margin-top: 4px; }
    
    .meta-details-preview {
      margin-top: 14px;
      background: #11100E;
      border: 1px solid #2D2923;
      border-radius: 10px;
      padding: 12px;
      font-size: 12px;
      font-family: monospace;
      color: #D6D3D1;
      text-align: left;
      display: none;
    }

    .legacy-toggle {
      margin-top: 24px;
      text-align: center;
      font-size: 12px;
      color: #78716C;
      cursor: pointer;
      text-decoration: underline;
    }
    .legacy-section { display: none; margin-top: 20px; padding-top: 20px; border-top: 1px dashed #2D2923; }
  </style>
</head>
<body>
  <div class="form-container">
    <div class="form-header">
      <div class="brand-pill">House of Bhaves Tech Provider</div>
      <h1>🍽️ Onboard Restaurant Client</h1>
      <p>Meta Embedded Signup • Client-Owned WABA Delegation • Zero Agency Quota Limit</p>
    </div>

    <div class="tech-provider-notice">
      <div class="notice-icon">🛡️</div>
      <div>
        <div class="notice-title">Meta Tech Provider Architecture</div>
        <div class="notice-body">
          Client WABAs reside inside the <strong>client's own Meta Business Portfolio</strong>. Our Agency receives delegated System User access and webhook subscriptions without consuming our agency 20-WABA quota.
        </div>
      </div>
    </div>

    <!-- Step 1: Meta Hosted Embedded Signup -->
    <div class="meta-signup-card" id="metaCard">
      <h3 style="font-family: 'Space Grotesk', sans-serif; font-size: 16px; margin-bottom: 8px;">Step 1: Connect Client WhatsApp via Meta</h3>
      <p style="font-size: 12px; color: #A8A29E; margin-bottom: 16px;">
        Launches Meta's hosted popup for business verification, WABA creation, and phone number registration.
      </p>

      <button type="button" class="meta-btn" id="launchFbSignupBtn" onclick="launchEmbeddedSignup()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        Connect WhatsApp with Meta
      </button>

      <div id="metaStatus" class="status-badge status-pending">Awaiting Meta authorization...</div>

      <div id="metaDetailsPreview" class="meta-details-preview">
        <div><strong>WABA ID:</strong> <span id="previewWabaId">-</span></div>
        <div><strong>Phone Number ID:</strong> <span id="previewPhoneId">-</span></div>
        <div><strong>OAuth Code:</strong> <span id="previewAuthCode">-</span></div>
      </div>
    </div>

    <!-- Step 2: Restaurant Profile & Automation Configuration -->
    <form id="onboardForm" onsubmit="handleOnboardSubmit(event)">
      <input type="hidden" id="oauthCode" name="oauthCode" value="">
      <input type="hidden" id="wabaId" name="wabaId" value="">
      <input type="hidden" id="phoneNumberId" name="phoneNumberId" value="">

      <h3 style="font-family: 'Space Grotesk', sans-serif; font-size: 16px; margin-bottom: 16px; color: #F59E0B;">Step 2: Restaurant Profile & Automation Settings</h3>

      <div class="form-group">
        <label>Restaurant Business Name *</label>
        <input type="text" id="businessName" name="businessName" placeholder="e.g. Big Bang Community (BBC)" required>
      </div>

      <div class="row-2">
        <div class="form-group">
          <label>Custom URL Slug *</label>
          <input type="text" id="slug" name="slug" placeholder="e.g. big-bang-community" required>
          <div class="note">Generates /restaurant/:slug live ledger</div>
        </div>

        <div class="form-group">
          <label>Commercial Billing Plan *</label>
          <select id="billingCycle" name="billingCycle" required>
            <option value="monthly">Monthly Automation Plan (₹9,999/mo)</option>
            <option value="quarterly" selected>Quarterly Automation Bundle (₹24,999/qtr)</option>
          </select>
        </div>
      </div>

      <div class="row-2">
        <div class="form-group">
          <label>Lunch Hours (Afternoon)</label>
          <input type="text" id="openingHoursLunch" name="openingHoursLunch" placeholder="e.g. 12:00-15:30">
        </div>
        <div class="form-group">
          <label>Dinner Hours (Evening)</label>
          <input type="text" id="openingHoursDinner" name="openingHoursDinner" placeholder="e.g. 19:00-00:30">
        </div>
      </div>

      <div class="form-group">
        <label>Custom Bot Welcome Greeting (Optional)</label>
        <textarea id="customWelcomeText" name="customWelcomeText" placeholder="e.g. Welcome to Big Bang Community (BBC)! Relaxed outdoor seating, live music & sports screenings. Tap below to book your table!"></textarea>
      </div>

      <div class="form-group">
        <label>Custom Cuisines & Chef Specials Guide (Optional)</label>
        <textarea id="customMenuText" name="customMenuText" placeholder="e.g. 🥟 Dumplings & Dim Sums&#10;🍝 Homestyle Rice & Pastas&#10;🍗 Crispy Korean Chicken&#10;🍹 Cold Brew Shakerato & Craft Beers"></textarea>
      </div>

      <div class="form-group">
        <label>Restaurant Address & Landmark</label>
        <input type="text" id="address" name="address" placeholder="e.g. Royale Heritage Mall, NIBM Road, Pune">
      </div>

      <div class="row-2">
        <div class="form-group">
          <label>Reservation Code Prefix *</label>
          <input type="text" id="prefix" name="prefix" placeholder="e.g. BBC" required>
        </div>

        <div class="form-group">
          <label>Manager WhatsApp Phone</label>
          <input type="text" id="managerPhone" name="managerPhone" placeholder="e.g. 919511673214">
        </div>
      </div>

      <div class="form-group">
        <label>Google Review URL</label>
        <input type="text" id="googleReviewUrl" name="googleReviewUrl" placeholder="e.g. https://maps.google.com/?q=Big+Bang+Community">
      </div>

      <!-- Optional Legacy/Manual Token Fallback for testing -->
      <div class="legacy-toggle" onclick="toggleLegacySection()">🛠️ Toggle Developer / Manual Token Setup (Optional Fallback)</div>
      
      <div id="legacySection" class="legacy-section">
        <div class="row-2">
          <div class="form-group">
            <label>Manual WhatsApp Phone Number ID</label>
            <input type="text" id="manualPhoneId" name="manualPhoneId" placeholder="e.g. 1167895203082852">
          </div>
          <div class="form-group">
            <label>Manual Permanent Access Token</label>
            <input type="password" id="manualToken" name="manualToken" placeholder="EAAG...">
          </div>
        </div>
      </div>

      <button type="submit" class="submit-btn" id="submitBtn">✨ Save & Activate Restaurant Client</button>
    </form>
  </div>

  <!-- Meta JS SDK Integration -->
  <script>
    const META_APP_ID = ${JSON.stringify(metaAppId)};
    const META_CONFIG_ID = ${JSON.stringify(configId)};

    window.fbAsyncInit = function() {
      if (META_APP_ID && typeof FB !== 'undefined') {
        FB.init({
          appId: META_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v21.0'
        });
        console.log('✅ [Meta SDK] Initialized with App ID:', META_APP_ID);
      }
    };

    (function(d, s, id){
       var js, fjs = d.getElementsByTagName(s)[0];
       if (d.getElementById(id)) {return;}
       js = d.createElement(s); js.id = id;
       js.src = "https://connect.facebook.net/en_US/sdk.js";
       fjs.parentNode.insertBefore(js, fjs);
     }(document, 'script', 'facebook-jssdk'));

    // Listen for Meta Embedded Signup Session Events
    window.addEventListener('message', function(event) {
      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') {
        return;
      }
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.type === 'WA_EMBEDDED_SIGNUP') {
          console.log('📩 [Meta Embedded Signup Event]:', data);
          if (data.data) {
            if (data.data.waba_id) {
              document.getElementById('wabaId').value = data.data.waba_id;
              document.getElementById('previewWabaId').innerText = data.data.waba_id;
            }
            if (data.data.phone_number_id) {
              document.getElementById('phoneNumberId').value = data.data.phone_number_id;
              document.getElementById('previewPhoneId').innerText = data.data.phone_number_id;
            }
          }
        }
      } catch (err) {
        console.warn('Non-JSON message from window:', err);
      }
    });

    function launchEmbeddedSignup() {
      if (typeof FB === 'undefined' || !META_APP_ID || !META_CONFIG_ID) {
        alert('Meta Embedded Signup configuration (META_APP_ID / META_EMBEDDED_SIGNUP_CONFIG_ID) is not configured in .env. You can use the manual credentials section below or configure the app credentials.');
        return;
      }

      document.getElementById('metaStatus').className = 'status-badge status-pending';
      document.getElementById('metaStatus').innerText = 'Meta Login popup opened...';

      FB.login(function(response) {
        if (response.authResponse && response.authResponse.code) {
          const authCode = response.authResponse.code;
          document.getElementById('oauthCode').value = authCode;
          document.getElementById('previewAuthCode').innerText = authCode.slice(0, 16) + '...';

          document.getElementById('metaStatus').className = 'status-badge status-success';
          document.getElementById('metaStatus').innerText = '✅ Meta WABA Authorized! Ready to save.';
          document.getElementById('metaCard').classList.add('connected');
          document.getElementById('metaDetailsPreview').style.display = 'block';
        } else {
          document.getElementById('metaStatus').className = 'status-badge status-error';
          document.getElementById('metaStatus').innerText = '❌ Meta authorization was cancelled or failed.';
        }
      }, {
        config_id: META_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          feature: 'whatsapp_embedded_signup',
          sessionInfoVersion: '2'
        }
      });
    }

    function toggleLegacySection() {
      const sec = document.getElementById('legacySection');
      sec.style.display = sec.style.display === 'block' ? 'none' : 'block';
    }

    async function handleOnboardSubmit(e) {
      e.preventDefault();
      const submitBtn = document.getElementById('submitBtn');
      submitBtn.disabled = true;
      submitBtn.innerText = '⏳ Connecting & Provisioning WABA...';

      const payload = {
        code: document.getElementById('oauthCode').value,
        wabaId: document.getElementById('wabaId').value,
        phoneNumberId: document.getElementById('phoneNumberId').value,
        whatsappPhoneNumberId: document.getElementById('manualPhoneId')?.value,
        metaAccessToken: document.getElementById('manualToken')?.value,
        businessName: document.getElementById('businessName').value,
        slug: document.getElementById('slug').value,
        billingCycle: document.getElementById('billingCycle').value,
        openingHoursLunch: document.getElementById('openingHoursLunch').value,
        openingHoursDinner: document.getElementById('openingHoursDinner').value,
        customWelcomeText: document.getElementById('customWelcomeText').value,
        customMenuText: document.getElementById('customMenuText').value,
        address: document.getElementById('address').value,
        prefix: document.getElementById('prefix').value,
        managerPhone: document.getElementById('managerPhone').value,
        googleReviewUrl: document.getElementById('googleReviewUrl').value,
      };

      try {
        const response = await fetch('/api/agency/embedded-signup/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (response.ok && result.success) {
          window.location.href = result.redirectUrl || '/agency?onboarded=' + result.slug;
        } else {
          alert('Onboarding failed: ' + (result.error || 'Check server logs.'));
          submitBtn.disabled = false;
          submitBtn.innerText = '✨ Save & Activate Restaurant Client';
        }
      } catch (err) {
        alert('Network error during onboarding: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.innerText = '✨ Save & Activate Restaurant Client';
      }
    }
  </script>
</body>
</html>
  `);
});
// ----------------------------------------------------
// 🔄 META EMBEDDED SIGNUP TOKEN EXCHANGE & PROVISIONING API
// ----------------------------------------------------
app.post('/api/agency/embedded-signup/exchange', (0, auth_1.requireRole)(['agency_admin']), async (req, res) => {
    try {
        const { code, wabaId: providedWabaId, phoneNumberId: providedPhoneId, whatsappPhoneNumberId, metaAccessToken, businessName, slug, billingCycle, address, prefix, managerPhone, googleReviewUrl, customWelcomeText, customMenuText, openingHoursLunch, openingHoursDinner } = req.body;
        if (!businessName || !slug || !prefix) {
            return res.status(400).json({ error: 'Missing required fields: businessName, slug, prefix' });
        }
        const RESERVED_SLUGS = new Set(['agency', 'onboard', 'api', 'webhook', 'health', 'demo', 'privacy', 'terms', 'deletion', 'restaurant', 'login', 'logout']);
        const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').slice(0, 64);
        if (!cleanSlug || RESERVED_SLUGS.has(cleanSlug)) {
            return res.status(400).json({ error: 'Invalid or reserved slug.' });
        }
        let resolvedWabaId = (providedWabaId && typeof providedWabaId === 'string') ? providedWabaId.trim() : null;
        let resolvedPhoneId = (providedPhoneId && typeof providedPhoneId === 'string') ? providedPhoneId.trim() : null;
        let resolvedToken = (metaAccessToken && typeof metaAccessToken === 'string') ? metaAccessToken.trim() : '';
        let metaBusinessId = null;
        let systemUserId = null;
        let tokenExpiresAt = null;
        let onboardingStatus = 'pending';
        let embeddedSignupCompletedAt = null;
        // Handle Meta Embedded Signup Authorization Code Exchange
        if (code && typeof code === 'string' && code.trim()) {
            console.log(`🚀 [Embedded Signup]: Exchanging authorization code for tenant '${cleanSlug}'...`);
            try {
                const tokenResult = await (0, metaEmbeddedSignup_1.exchangeCodeForAccessToken)(code.trim());
                resolvedToken = tokenResult.accessToken;
                if (tokenResult.expiresIn) {
                    const expDate = new Date(Date.now() + tokenResult.expiresIn * 1000);
                    tokenExpiresAt = expDate.toISOString();
                }
                // Debug and inspect granular scopes to find WABA ID and Business Account
                try {
                    const debugInfo = await (0, metaEmbeddedSignup_1.debugToken)(resolvedToken);
                    systemUserId = debugInfo.userId || null;
                    if (!resolvedWabaId && debugInfo.granularScopes) {
                        const wabaScope = debugInfo.granularScopes.find(s => s.scope === 'whatsapp_business_management' || s.scope === 'whatsapp_business_messaging');
                        if (wabaScope && wabaScope.targetIds && wabaScope.targetIds.length > 0) {
                            resolvedWabaId = wabaScope.targetIds[0];
                        }
                    }
                }
                catch (dbgErr) {
                    console.warn('⚠️ [Embedded Signup]: Token debug warning (continuing):', dbgErr);
                }
                // If phone ID is not yet known, query WABA phone numbers
                if (resolvedWabaId && !resolvedPhoneId) {
                    try {
                        const phoneList = await (0, metaEmbeddedSignup_1.getWabaPhoneNumbers)(resolvedWabaId, resolvedToken);
                        if (phoneList.length > 0) {
                            resolvedPhoneId = phoneList[0].id;
                            console.log(`📱 [Embedded Signup]: Discovered Phone Number ID ${resolvedPhoneId} for WABA ${resolvedWabaId}`);
                        }
                    }
                    catch (phoneErr) {
                        console.warn('⚠️ [Embedded Signup]: Could not auto-fetch phone numbers:', phoneErr);
                    }
                }
                // Subscribe Agency App to client's WABA webhooks
                if (resolvedWabaId) {
                    try {
                        await (0, metaEmbeddedSignup_1.subscribeAppToWaba)(resolvedWabaId, resolvedToken);
                        console.log(`📡 [Embedded Signup]: Successfully subscribed agency app to WABA ${resolvedWabaId}`);
                    }
                    catch (subErr) {
                        console.error(`⚠️ [Embedded Signup]: Webhook subscription warning for WABA ${resolvedWabaId}:`, subErr);
                    }
                }
                onboardingStatus = 'connected';
                embeddedSignupCompletedAt = new Date().toISOString();
            }
            catch (exchangeErr) {
                console.error('❌ [Embedded Signup Exchange Failed]:', exchangeErr);
                return res.status(500).json({ error: `Meta Token Exchange failed: ${exchangeErr.message}` });
            }
        }
        else if (whatsappPhoneNumberId || metaAccessToken) {
            // Manual Legacy Fallback
            resolvedPhoneId = whatsappPhoneNumberId ? whatsappPhoneNumberId.trim() : '';
            resolvedToken = metaAccessToken ? metaAccessToken.trim() : '';
            onboardingStatus = (resolvedPhoneId && resolvedToken) ? 'legacy' : 'pending';
        }
        const readyToActivate = Boolean(resolvedPhoneId && resolvedToken);
        const today = new Date();
        const nextResetObj = new Date();
        nextResetObj.setDate(today.getDate() + 30);
        const nextResetDate = nextResetObj.toISOString().split('T')[0];
        // Check if client already exists (update vs insert)
        const existingClient = await connection_1.db.select().from(schema_1.clients).where((0, drizzle_orm_1.eq)(schema_1.clients.slug, cleanSlug)).limit(1);
        if (existingClient.length > 0) {
            await connection_1.db.update(schema_1.clients).set({
                businessName,
                billingCycle: billingCycle || 'monthly',
                wabaId: resolvedWabaId,
                whatsappPhoneNumberId: resolvedPhoneId || existingClient[0].whatsappPhoneNumberId,
                metaAccessToken: resolvedToken || existingClient[0].metaAccessToken,
                metaBusinessId,
                systemUserId,
                embeddedSignupCompletedAt: embeddedSignupCompletedAt || existingClient[0].embeddedSignupCompletedAt,
                tokenExpiresAt: tokenExpiresAt || existingClient[0].tokenExpiresAt,
                onboardingStatus,
                prefix,
                googleReviewUrl: googleReviewUrl || 'https://maps.google.com',
                customWelcomeText: customWelcomeText || null,
                customMenuText: customMenuText || null,
                openingHoursLunch: openingHoursLunch !== undefined ? openingHoursLunch : '',
                openingHoursDinner: openingHoursDinner || '19:00-00:30',
                active: readyToActivate
            }).where((0, drizzle_orm_1.eq)(schema_1.clients.id, existingClient[0].id));
        }
        else {
            await connection_1.db.insert(schema_1.clients).values({
                businessName,
                slug: cleanSlug,
                billingCycle: billingCycle || 'monthly',
                outboundAllowanceMonthly: 1000,
                outboundSentThisMonth: 0,
                nextMonthlyResetDate: nextResetDate,
                wabaId: resolvedWabaId,
                whatsappPhoneNumberId: resolvedPhoneId || 'PENDING_SETUP',
                metaAccessToken: resolvedToken || 'PENDING_SETUP',
                metaBusinessId,
                systemUserId,
                embeddedSignupCompletedAt,
                tokenExpiresAt,
                onboardingStatus,
                prefix,
                googleReviewUrl: googleReviewUrl || 'https://maps.google.com',
                customWelcomeText: customWelcomeText || null,
                customMenuText: customMenuText || null,
                openingHoursLunch: openingHoursLunch !== undefined ? openingHoursLunch : '',
                openingHoursDinner: openingHoursDinner || '19:00-00:30',
                active: readyToActivate
            });
        }
        // Upsert into restaurants table for backward compatibility
        const existingRest = await connection_1.db.select().from(schema_1.restaurants).where((0, drizzle_orm_1.eq)(schema_1.restaurants.slug, cleanSlug)).limit(1);
        if (existingRest.length > 0) {
            await connection_1.db.update(schema_1.restaurants).set({
                name: businessName,
                address: address || '',
                wabaId: resolvedWabaId,
                whatsappPhoneNumberId: resolvedPhoneId || existingRest[0].whatsappPhoneNumberId,
                metaAccessToken: resolvedToken || existingRest[0].metaAccessToken,
                metaBusinessId,
                embeddedSignupCompletedAt: embeddedSignupCompletedAt || existingRest[0].embeddedSignupCompletedAt,
                tokenExpiresAt: tokenExpiresAt || existingRest[0].tokenExpiresAt,
                onboardingStatus,
                prefix,
                managerPhone: managerPhone || '',
                openingHoursLunch: openingHoursLunch !== undefined ? openingHoursLunch : '',
                openingHoursDinner: openingHoursDinner || '19:00-00:30',
                googleReviewUrl: googleReviewUrl || 'https://maps.google.com',
                customWelcomeText: customWelcomeText || null,
                customMenuText: customMenuText || null,
                active: readyToActivate
            }).where((0, drizzle_orm_1.eq)(schema_1.restaurants.id, existingRest[0].id));
        }
        else {
            await connection_1.db.insert(schema_1.restaurants).values({
                name: businessName,
                slug: cleanSlug,
                address: address || '',
                wabaId: resolvedWabaId,
                whatsappPhoneNumberId: resolvedPhoneId || 'PENDING_SETUP',
                metaAccessToken: resolvedToken || 'PENDING_SETUP',
                metaBusinessId,
                embeddedSignupCompletedAt,
                tokenExpiresAt,
                onboardingStatus,
                prefix,
                managerPhone: managerPhone || '',
                openingHoursLunch: openingHoursLunch !== undefined ? openingHoursLunch : '',
                openingHoursDinner: openingHoursDinner || '19:00-00:30',
                googleReviewUrl: googleReviewUrl || 'https://maps.google.com',
                customWelcomeText: customWelcomeText || null,
                customMenuText: customMenuText || null,
                active: readyToActivate
            });
        }
        console.log(`✅ [Provisioning Success]: Client '${cleanSlug}' onboarded (status=${onboardingStatus}, active=${readyToActivate})`);
        return res.json({
            success: true,
            slug: cleanSlug,
            wabaId: resolvedWabaId,
            phoneNumberId: resolvedPhoneId,
            onboardingStatus,
            redirectUrl: `/agency?onboarded=${cleanSlug}`
        });
    }
    catch (error) {
        console.error('❌ [Provisioning Error]:', error);
        res.status(500).json({ error: error.message || 'Onboarding failed. Check server logs.' });
    }
});
// Legacy POST /api/agency/onboard redirect adapter
app.post('/api/agency/onboard', (0, auth_1.requireRole)(['agency_admin']), async (req, res) => {
    // Pass through to embedded-signup exchange handler
    req.url = '/api/agency/embedded-signup/exchange';
    return app._router.handle(req, res);
});
// ----------------------------------------------------
// 🏛️ MASTER AGENCY DASHBOARD (GET /agency)
// ----------------------------------------------------
// FIX (critical): master dashboard (MRR, all clients) was fully public.
app.get('/agency', (0, auth_1.requireRole)(['agency_admin']), async (req, res) => {
    try {
        const clientList = await connection_1.db.select().from(schema_1.clients);
        // Financial & Metric Calculations (Pure Automation Offer: ₹9,999/mo or ₹24,999/qtr = ₹8,333/mo)
        const activeClientsCount = clientList.filter(c => c.active).length;
        const tier1Count = clientList.filter(c => c.billingCycle === 'monthly').length;
        const tier2Count = clientList.filter(c => c.billingCycle === 'quarterly').length;
        const mrr = (tier1Count * 9999) + (tier2Count * 8333);
        // Pure Automation Meta Cost = ₹0.00 (Customer Service Window)
        const totalMetaCost = 0;
        const profitMargin = mrr > 0 ? 100 : 100;
        const clientRowsHtml = clientList.length === 0
            ? `<tr><td colspan="6" style="text-align:center; padding: 40px; color: #A8A29E;">No restaurants onboarded yet. Click "Onboard New Restaurant" to get started!</td></tr>`
            : clientList.map(c => {
                const tierPrice = c.billingCycle === 'quarterly' ? 'Quarterly: ₹24,999 / qtr' : 'Monthly: ₹9,999 / mo';
                const tierBadgeClass = c.billingCycle === 'quarterly' ? 'tier-quarterly' : 'tier-monthly';
                const safeName = (0, escape_1.escapeHtml)(c.businessName);
                const safeSlug = (0, escape_1.escapeHtml)(c.slug);
                const isTechProvider = Boolean(c.wabaId || c.onboardingStatus === 'connected');
                const wabaBadge = isTechProvider
                    ? `<div style="font-size:11px; color:#60A5FA; margin-top:3px; font-family:monospace;">🛡️ WABA: ${(0, escape_1.escapeHtml)(c.wabaId || 'Delegated')} (Client Portfolio)</div>`
                    : `<div style="font-size:11px; color:#A8A29E; margin-top:3px; font-family:monospace;">📦 Legacy WABA (Agency Portfolio)</div>`;
                return `
        <tr>
          <td class="client-name">
            <strong>${safeName}</strong>
            <div class="client-slug">Slug: /restaurant/${safeSlug}</div>
            ${wabaBadge}
          </td>
          <td>
            <span class="tier-badge ${tierBadgeClass}">${(0, escape_1.escapeHtml)((c.billingCycle || 'monthly').toUpperCase())}${c.active ? '' : ' — <span style="color:#F87171">INACTIVE</span>'}</span>
            <div style="font-size:11px; color:#A8A29E; margin-top:4px;">${tierPrice}</div>
          </td>
          <td>
            <div style="font-weight:700; color:#4ADE80; font-size:13px;">${c.active ? '⚡ Live' : '⏸ Pending setup'}</div>
            <div style="font-size:11px; color:#A8A29E;">${isTechProvider ? 'Tech Provider Model' : 'Legacy Direct'}</div>
          </td>
          <td>
            <div class="resets-date">📅 Active 24/7 Engine</div>
          </td>
          <td>
            <div class="meta-cost" style="color:#4ADE80;">₹0.00</div>
            <div class="cost-note">24h Customer Service Window</div>
          </td>
          <td>
            <a href="/restaurant/${encodeURIComponent(c.slug)}" target="_blank" class="btn-view-logbook">📋 Open Logbook</a>
          </td>
        </tr>
      `;
            }).join('');
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agency Operations Master | House of Bhaves</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Instrument Sans', -apple-system, sans-serif;
      background: #0B0A0A;
      color: #F3EFE6;
      padding: 32px;
      min-height: 100vh;
      background-image: radial-gradient(circle at 50% 0%, #26211A 0%, #0B0A09 70%);
      position: relative;
    }
    body::before {
      content: '';
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: url('data:image/svg+xml,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)" opacity="0.045"/></svg>');
      pointer-events: none;
      z-index: 999;
    }
    .container { max-width: 1320px; margin: 0 auto; }
    .header-banner {
      background: linear-gradient(135deg, #1C1917 0%, #0F0E0D 100%);
      border: 2px solid #322E28;
      padding: 28px 36px;
      border-radius: 18px;
      margin-bottom: 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6);
    }
    .agency-title h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 26px;
      font-weight: 700;
      color: #F59E0B;
    }
    .agency-title p { color: #A8A29E; font-size: 13px; margin-top: 4px; }
    .header-right-btns { display: flex; align-items: center; gap: 14px; }
    .btn-onboard {
      background: #F59E0B;
      color: #000;
      border: none;
      padding: 12px 20px;
      border-radius: 12px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
    }
    .btn-onboard:hover { background: #D97706; }
    .btn-logout {
      background: #262320;
      border: 1px solid #3E3932;
      color: #F87171;
      padding: 12px 18px;
      border-radius: 12px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
    }
    .btn-logout:hover { background: rgba(239, 68, 68, 0.2); border-color: #EF4444; }
    .mrr-badge {
      background: rgba(245, 158, 11, 0.12);
      border: 1.5px solid #F59E0B;
      color: #F59E0B;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 18px;
      font-weight: 700;
      padding: 10px 18px;
      border-radius: 12px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    .metric-card {
      background: #141312;
      border: 2px solid #282522;
      padding: 24px;
      border-radius: 16px;
      text-align: center;
    }
    .metric-val {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 32px;
      font-weight: 700;
      color: #F3EFE6;
      margin-bottom: 4px;
    }
    .metric-lbl { font-size: 12px; color: #A8A29E; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; }
    .val-green { color: #4ADE80; }
    .val-amber { color: #F59E0B; }
    .control-actions {
      background: #141312;
      border: 2px solid #282522;
      padding: 18px 24px;
      border-radius: 14px;
      margin-bottom: 32px;
      display: flex;
      gap: 14px;
      align-items: center;
      flex-wrap: wrap;
    }
    .action-btn {
      background: #282522;
      border: 1.5px solid #3E3932;
      color: #F3EFE6;
      padding: 10px 18px;
      border-radius: 10px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .action-btn:hover { background: #F59E0B; color: #000; border-color: #F59E0B; }
    .table-container {
      background: #141312;
      border: 2px solid #282522;
      border-radius: 16px;
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th {
      background: #1C1917;
      padding: 16px 20px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 12px;
      font-weight: 700;
      color: #A8A29E;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-bottom: 2px solid #282522;
    }
    td { padding: 18px 20px; border-bottom: 1px solid #22201D; font-size: 14px; }
    .client-name { font-size: 16px; }
    .client-slug { font-size: 12px; color: #F59E0B; font-family: monospace; margin-top: 2px; }
    .tier-badge {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
    }
    .tier-monthly { background: rgba(59, 130, 246, 0.15); color: #60A5FA; border: 1px solid #3B82F6; }
    .tier-quarterly { background: rgba(168, 85, 247, 0.15); color: #C084FC; border: 1px solid #A855F7; }
    .meta-cost { font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; color: #F3EFE6; }
    .cost-note { font-size: 10px; color: #78716C; }
    .btn-view-logbook {
      background: #1C1B18;
      border: 1px solid #3E3932;
      color: #F59E0B;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      display: inline-block;
    }
    .btn-view-logbook:hover { background: #F59E0B; color: #000; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-banner">
      <div class="agency-title">
        <h1>🍽️ Restaurant Agency Operations Master</h1>
        <p>Pure WhatsApp Automation Account Ledger • House of Bhaves • Logged in as: <strong>${(0, escape_1.escapeHtml)(req.user?.email || 'Admin')}</strong></p>
      </div>
      <div class="header-right-btns">
        <a href="/onboard" class="btn-onboard">➕ Onboard New Restaurant</a>
        <a href="/logout" class="btn-logout">🚪 Logout</a>
        <div class="mrr-badge">
          💰 MRR: ₹${mrr.toLocaleString('en-IN')}/mo
        </div>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-val val-amber">${activeClientsCount}</div>
        <div class="metric-lbl">Active Restaurants</div>
      </div>
      <div class="metric-card">
        <div class="metric-val">${tier1Count} / ${tier2Count}</div>
        <div class="metric-lbl">Monthly / Quarterly Plans</div>
      </div>
      <div class="metric-card">
        <div class="metric-val val-green">100%</div>
        <div class="metric-lbl">Net Profit Margin</div>
      </div>
      <div class="metric-card">
        <div class="metric-val val-green">₹0.00</div>
        <div class="metric-lbl">Meta Out-of-Pocket Cost</div>
      </div>
    </div>

    <div class="control-actions">
      <strong style="font-size: 13px; text-transform: uppercase; color: #A8A29E; font-family: 'Space Grotesk';">⚡ Agency Admin Actions:</strong>
      <button onclick="triggerAction('/api/agency/trigger-review-queue')" class="action-btn">⏱️ Process 2-Hr Review Queue</button>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Restaurant Client</th>
            <th>Automation Plan</th>
            <th>Booking Engine Status</th>
            <th>Engine Availability</th>
            <th>Meta API Out-of-Pocket</th>
            <th>Hostess Logbook</th>
          </tr>
        </thead>
        <tbody>
          ${clientRowsHtml}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    async function triggerAction(endpoint) {
      try {
        const res = await fetch(endpoint, { method: 'POST' });
        const data = await res.json();
        alert('Action Executed: ' + JSON.stringify(data));
        window.location.reload();
      } catch (err) {
        alert('Action error: ' + err.message);
      }
    }
  </script>
</body>
</html>
    `;
        res.send(html);
    }
    catch (error) {
        console.error('Agency dashboard error:', error);
        res.status(500).send('Internal Server Error');
    }
});
// Multi-tenant slug route & fallback (Checks both clients & restaurants tables safely)
// FIX (critical): full reservation logbook (customer names + phone numbers)
// for any tenant was reachable by anyone who guessed a slug — a slugified
// business name is trivially guessable. Now auth-gated to tenant owner or agency admin.
app.get('/restaurant/:slug?', (0, auth_1.requireTenantAccess)('slug'), async (req, res) => {
    try {
        const targetSlug = req.params.slug || '';
        if (!targetSlug) {
            return res.status(400).send('Restaurant slug required.');
        }
        // Check clients table first
        let clientMatches = await connection_1.db.select().from(schema_1.clients).where((0, drizzle_orm_1.eq)(schema_1.clients.slug, targetSlug)).limit(1);
        let restaurantMatches = await connection_1.db.select().from(schema_1.restaurants).where((0, drizzle_orm_1.eq)(schema_1.restaurants.slug, targetSlug)).limit(1);
        const client = clientMatches[0];
        const restaurant = restaurantMatches[0];
        if (!client && !restaurant) {
            return res.status(404).send('Restaurant not found.');
        }
        const displayName = client?.businessName || restaurant?.name || targetSlug;
        const displaySlug = client?.slug || restaurant?.slug || targetSlug;
        const clientId = client?.id;
        const restaurantId = restaurant?.id;
        // Query bookings / reservations cleanly
        let allRes = [];
        if (clientId) {
            const clientBookings = await connection_1.db
                .select()
                .from(schema_1.bookings)
                .where((0, drizzle_orm_1.eq)(schema_1.bookings.clientId, clientId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.bookings.createdAt));
            allRes = clientBookings.map(b => ({
                id: b.id,
                customerName: b.customerName || 'Guest',
                customerPhone: b.customerPhone,
                guests: b.guests,
                occasion: b.occasion,
                date: b.date,
                time: b.time,
                reservationCode: b.reservationCode || 'BBC-RES-1001',
                stage: b.status || 'booked',
            }));
        }
        if (allRes.length === 0 && restaurantId) {
            const restReservations = await connection_1.db
                .select()
                .from(schema_1.reservations)
                .where((0, drizzle_orm_1.eq)(schema_1.reservations.restaurantId, restaurantId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.reservations.createdAt));
            allRes = restReservations.map(r => ({
                id: r.id,
                customerName: r.customerName || 'Guest',
                customerPhone: r.customerPhone,
                guests: r.guests,
                occasion: r.occasion,
                date: r.date,
                time: r.time,
                reservationCode: r.reservationCode || 'RES-1001',
                stage: r.stage || 'booked',
            }));
        }
        const totalReservations = allRes.filter(r => r.stage !== 'cancelled').length;
        const seatedCount = allRes.filter(r => r.stage === 'seated').length;
        const birthdays = allRes.filter(r => r.occasion?.toLowerCase() === 'birthday').length;
        const parties = allRes.filter(r => ['party', 'corporate'].includes(r.occasion?.toLowerCase() || '')).length;
        const noShows = allRes.filter(r => r.stage === 'no_show').length;
        const cardsHtml = allRes.length === 0
            ? `
        <div class="empty-state">
          <h2>No reservations yet</h2>
          <p>Bookings will appear here when guests reserve via WhatsApp</p>
          <button onclick="createDemo()" class="demo-btn">Create Demo Reservation</button>
        </div>
      `
            : allRes.map(r => {
                let badgeClass = '';
                if (r.stage === 'booked')
                    badgeClass = 'badge-booked';
                else if (r.stage === 'seated')
                    badgeClass = 'badge-seated';
                else if (r.stage === 'completed')
                    badgeClass = 'badge-completed';
                else if (r.stage === 'cancelled')
                    badgeClass = 'badge-cancelled';
                else if (r.stage === 'no_show')
                    badgeClass = 'badge-no-show';
                let stickyNote = '';
                if (r.occasion?.toLowerCase() === 'birthday') {
                    stickyNote = `<div class="sticky-note">🎂 Birthday — Prep cake & décor! (1x/yr Offer)</div>`;
                }
                else if (r.occasion?.toLowerCase() === 'anniversary') {
                    stickyNote = `<div class="sticky-note">🥂 Anniversary — Candlelight setup!</div>`;
                }
                let actions = '';
                if (r.stage === 'booked') {
                    actions = `
            <div class="card-actions">
              <button onclick="updateStatus(${r.id}, 'seated')" class="btn-seated">🪑 Mark Seated</button>
              <button onclick="updateStatus(${r.id}, 'completed')" class="btn-complete">✅ Completed</button>
              <button onclick="updateStatus(${r.id}, 'no_show')" class="btn-no-show">❌ No-Show</button>
            </div>
          `;
                }
                else if (r.stage === 'seated') {
                    actions = `
            <div class="card-actions">
              <button onclick="updateStatus(${r.id}, 'completed')" class="btn-complete">✅ Mark Completed</button>
              <button onclick="updateStatus(${r.id}, 'no_show')" class="btn-no-show">❌ No-Show</button>
            </div>
          `;
                }
                const occasionEmoji = r.occasion?.toLowerCase() === 'birthday' ? '🎂 ' :
                    r.occasion?.toLowerCase() === 'anniversary' ? '🥂 ' :
                        r.occasion?.toLowerCase() === 'party' ? '🎉 ' :
                            r.occasion?.toLowerCase() === 'corporate' ? '💼 ' : '🍽️ ';
                // FIX: escapeHtml applied to customerName, phone, code, occasion before interpolating
                return `
          <div class="reservation-card" data-status="${(0, escape_1.escapeHtml)(r.stage)}" data-search="${(0, escape_1.escapeHtml)((r.customerName + ' ' + r.customerPhone + ' ' + r.reservationCode).toLowerCase())}">
            <div class="card-content">
              ${stickyNote}
              <div class="guest-info">
                <h3 class="guest-name">${(0, escape_1.escapeHtml)(r.customerName)}</h3>
                <a href="https://wa.me/${encodeURIComponent(r.customerPhone)}" class="guest-phone" target="_blank">+${(0, escape_1.escapeHtml)(r.customerPhone)}</a>
              </div>
              
              <div class="details-grid">
                <div class="detail-item">
                  <span class="detail-label">Guests</span>
                  <span class="detail-value">👥 ${(0, escape_1.escapeHtml)(r.guests)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Occasion</span>
                  <span class="detail-value">${occasionEmoji}${(0, escape_1.escapeHtml)(r.occasion || 'None')}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Date & Time</span>
                  <span class="detail-value">📅 ${(0, escape_1.escapeHtml)(r.date)} @ ${(0, escape_1.escapeHtml)(r.time)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Code</span>
                  <span class="detail-value code-highlight">${(0, escape_1.escapeHtml)(r.reservationCode)}</span>
                </div>
              </div>
              
              <div class="stamp-badge ${badgeClass}">${(0, escape_1.escapeHtml)((r.stage || 'booked').replace('_', '-').toUpperCase())}</div>
              
              ${actions}
            </div>
          </div>
        `;
            }).join('');
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${(0, escape_1.escapeHtml)(displayName)} | Hostess Ledger</title>
  <meta name="description" content="Private Booking Ledger for ${(0, escape_1.escapeHtml)(displayName)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400;0,600;0,700;1,400&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Instrument Sans', -apple-system, sans-serif;
      background: #11100F;
      color: #F3EFE6;
      padding: 28px;
      min-height: 100vh;
      background-image: radial-gradient(#2A2724 1px, transparent 1px);
      background-size: 24px 24px;
    }
    body::before {
      content: '';
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: url('data:image/svg+xml,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)" opacity="0.045"/></svg>');
      pointer-events: none;
      z-index: 999;
    }
    .container { max-width: 1280px; margin: 0 auto; }
    .header-card {
      background: #1C1B18;
      border: 2px solid #322E28;
      padding: 24px 30px;
      border-radius: 16px;
      margin-bottom: 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      box-shadow: 0 4px 0px #0A0908;
      position: relative;
    }
    .header-card::before {
      content: '';
      position: absolute;
      top: -10px; left: 50%;
      transform: translateX(-50%);
      width: 120px; height: 16px;
      background: #2A2723;
      border-radius: 6px;
      border: 1px solid #3E3932;
    }
    .restaurant-title h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 24px;
      font-weight: 700;
      color: #F3EFE6;
    }
    .restaurant-title p { color: #A8A29E; font-size: 13px; margin-top: 4px; font-weight: 600; }
    .header-right { display: flex; align-items: center; gap: 14px; }
    .live-badge {
      background: rgba(34, 197, 94, 0.12);
      border: 1.5px solid #22C55E;
      color: #4ADE80;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 700;
      font-size: 12px;
      padding: 6px 14px;
      border-radius: 30px;
      display: flex;
      align-items: center;
      gap: 8px;
      text-transform: uppercase;
    }
    .btn-export {
      background: #F59E0B;
      color: #0D0C0B;
      border: none;
      padding: 10px 18px;
      border-radius: 10px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-export:hover { background: #D97706; }
    .pulse {
      width: 8px; height: 8px;
      background: #22C55E;
      border-radius: 50%;
      box-shadow: 0 0 10px #22C55E;
      animation: pulse-anim 1.5s infinite;
    }
    @keyframes pulse-anim { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .metric-card {
      background: #1C1B18;
      border: 2px solid #322E28;
      padding: 20px;
      border-radius: 14px;
      box-shadow: 0 3px 0px #0A0908;
      text-align: center;
    }
    .metric-value {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 34px;
      font-weight: 700;
      color: #F59E0B;
      margin-bottom: 4px;
    }
    .metric-label { font-size: 11px; color: #A8A29E; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; }
    .toolbar {
      background: #1C1B18;
      border: 2px solid #322E28;
      padding: 16px 20px;
      border-radius: 14px;
      margin-bottom: 28px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
      box-shadow: 0 3px 0px #0A0908;
    }
    .search-input {
      flex: 1;
      min-width: 260px;
      background: #121110;
      border: 1.5px solid #3E3A33;
      color: #F3EFE6;
      padding: 12px 18px;
      border-radius: 10px;
      font-size: 14px;
    }
    .tabs { display: flex; gap: 8px; flex-wrap: wrap; }
    .tab-btn {
      background: #121110;
      border: 1.5px solid #3E3A33;
      color: #A8A29E;
      padding: 10px 16px;
      border-radius: 8px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .tab-btn.active { background: #F59E0B; color: #0D0C0B; border-color: #F59E0B; }
    .reservations-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px;
    }
    .reservation-card {
      background: #1C1B18;
      border: 2px solid #322E28;
      border-left: 4px dashed #F59E0B;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.5);
      position: relative;
    }
    .guest-info { margin-bottom: 14px; }
    .guest-name { font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 700; color: #F3EFE6; }
    .guest-phone { color: #F59E0B; font-size: 13px; text-decoration: none; font-weight: 600; display: inline-block; margin-top: 2px; }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      background: #121110;
      padding: 12px;
      border-radius: 10px;
      margin-bottom: 14px;
    }
    .detail-label { font-size: 10px; color: #A8A29E; text-transform: uppercase; font-weight: 700; display: block; }
    .detail-value { font-size: 13px; color: #F3EFE6; font-weight: 600; margin-top: 2px; }
    .code-highlight { font-family: monospace; color: #F59E0B; }
    .stamp-badge {
      position: absolute;
      top: 18px; right: 18px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 11px;
      font-weight: 700;
      padding: 5px 10px;
      border-radius: 6px;
      transform: rotate(-3deg);
      text-transform: uppercase;
    }
    .badge-booked { background: rgba(245, 158, 11, 0.15); color: #F59E0B; border: 1.5px solid #F59E0B; }
    .badge-seated { background: rgba(59, 130, 246, 0.15); color: #60A5FA; border: 1.5px solid #60A5FA; }
    .badge-completed { background: rgba(34, 197, 94, 0.15); color: #4ADE80; border: 1.5px solid #4ADE80; }
    .badge-no-show { background: rgba(239, 68, 68, 0.15); color: #F87171; border: 1.5px solid #F87171; }
    .badge-cancelled { background: rgba(168, 162, 158, 0.15); color: #A8A29E; border: 1.5px solid #A8A29E; }
    .sticky-note {
      background: #FEF3C7;
      color: #78350F;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 12px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      transform: rotate(-1deg);
    }
    .card-actions { display: flex; gap: 8px; margin-top: 10px; }
    .btn-seated, .btn-complete, .btn-no-show {
      flex: 1;
      padding: 8px 12px;
      border-radius: 8px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      border: 1.5px solid;
    }
    .btn-seated { background: rgba(59, 130, 246, 0.1); border-color: #3B82F6; color: #60A5FA; }
    .btn-seated:hover { background: #3B82F6; color: #FFF; }
    .btn-complete { background: rgba(34, 197, 94, 0.1); border-color: #22C55E; color: #4ADE80; }
    .btn-complete:hover { background: #22C55E; color: #FFF; }
    .btn-no-show { background: rgba(239, 68, 68, 0.1); border-color: #EF4444; color: #F87171; }
    .btn-no-show:hover { background: #EF4444; color: #FFF; }
    .empty-state { text-align: center; padding: 60px 20px; grid-column: 1 / -1; background: #1C1B18; border: 2px solid #322E28; border-radius: 16px; }
    .demo-btn { margin-top: 16px; background: #F59E0B; border: none; color: #0D0C0B; padding: 12px 24px; border-radius: 10px; font-family: 'Space Grotesk', sans-serif; font-weight: 700; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-card">
      <div class="restaurant-title">
        <h1>${(0, escape_1.escapeHtml)(displayName)}</h1>
        <p>Hostess Front-Desk Ledger • URL Slug: /restaurant/${(0, escape_1.escapeHtml)(displaySlug)} • Logged in: <strong>${(0, escape_1.escapeHtml)(req.user?.email || 'User')}</strong></p>
      </div>
      <div class="header-right">
        ${req.user?.role === 'agency_admin' ? '<a href="/agency" class="btn-export" style="background:#262320; border:1px solid #3E3932; color:#F3EFE6;">🏛️ Agency Master</a>' : ''}
        <a href="/api/restaurant/${encodeURIComponent(displaySlug)}/export" class="btn-export">📥 Export CSV</a>
        <a href="/logout" class="btn-export" style="background:rgba(239,68,68,0.15); border:1px solid #EF4444; color:#FCA5A5;">🚪 Logout</a>
        <div class="live-badge">
          <div class="pulse"></div> Live Reception Sync
        </div>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value">${totalReservations}</div>
        <div class="metric-label">🍽️ Total Tables</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${seatedCount}</div>
        <div class="metric-label">🪑 Seated Now</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${birthdays}</div>
        <div class="metric-label">🎂 Birthdays</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${parties}</div>
        <div class="metric-label">🎉 Parties</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${noShows}</div>
        <div class="metric-label">❌ No-Shows</div>
      </div>
    </div>

    <div class="toolbar">
      <input type="text" class="search-input" id="searchInput" placeholder="Search name, phone, or code...">
      <div class="tabs" id="statusTabs">
        <button class="tab-btn active" data-filter="all">All</button>
        <button class="tab-btn" data-filter="booked">Booked</button>
        <button class="tab-btn" data-filter="seated">Seated</button>
        <button class="tab-btn" data-filter="completed">Completed</button>
        <button class="tab-btn" data-filter="no_show">No-Show</button>
      </div>
    </div>

    <div class="reservations-grid" id="reservationsGrid">
      ${cardsHtml}
    </div>
  </div>

  <script>
    const searchInput = document.getElementById('searchInput');
    const tabs = document.querySelectorAll('.tab-btn');
    const cards = document.querySelectorAll('.reservation-card');

    let currentFilter = 'all';

    function filterCards() {
      const searchVal = searchInput.value.toLowerCase();

      cards.forEach(card => {
        const status = card.dataset.status;
        const searchData = card.dataset.search;

        const matchesStatus = currentFilter === 'all' || status === currentFilter;
        const matchesSearch = searchData.includes(searchVal);

        if (matchesStatus && matchesSearch) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    }

    searchInput.addEventListener('input', filterCards);

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        filterCards();
      });
    });

    async function updateStatus(id, status) {
      try {
        const res = await fetch('/api/reservations/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationId: id, status })
        });
        if (res.ok) {
          window.location.reload();
        } else {
          alert('Failed to update status');
        }
      } catch (err) {
        console.error(err);
        alert('Error updating status');
      }
    }

    async function createDemo() {
      try {
        const res = await fetch('/api/reservations/demo', { method: 'POST' });
        if (res.ok) {
          window.location.reload();
        } else {
          alert('Failed to create demo reservation');
        }
      } catch (err) {
        console.error(err);
        alert('Error creating demo');
      }
    }
  </script>
</body>
</html>
    `;
        res.send(html);
    }
    catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).send('Internal Server Error');
    }
});
async function main() {
    await (0, connection_1.initializeDatabase)();
    // Run seed
    const { seedDatabase } = await Promise.resolve().then(() => __importStar(require('./db/seed')));
    await seedDatabase();
    // Start background outbound cron scheduler
    (0, cron_1.startScheduler)();
    app.listen(config_1.config.PORT, () => {
        console.log(`🚀 House of Bhaves Agency Platform running on port ${config_1.config.PORT}`);
        console.log(`🔒 Protected routes (/agency, /onboard, /restaurant/*) require Session/JWT Authentication (visit /login).`);
        console.log(`🔗 Webhook: http://localhost:${config_1.config.PORT}/webhook`);
    });
}
main().catch((err) => {
    console.error('❌ Fatal startup error:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map