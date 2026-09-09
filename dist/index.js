"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const config_1 = require("./config");
const connection_1 = require("./db/connection");
const schema_1 = require("./db/schema");
const webhook_1 = __importDefault(require("./whatsapp/webhook"));
const makeIntegration_1 = require("./services/makeIntegration");
const drizzle_orm_1 = require("drizzle-orm");
const cron_1 = require("./scheduler/cron");
const reviewEngine_1 = require("./services/reviewEngine");
const auth_1 = require("./middleware/auth"); // FIX: admin auth middleware
const escape_1 = require("./utils/escape"); // FIX: HTML/CSV escaping
const reservationCode_1 = require("./utils/reservationCode");

const app = (0, express_1.default)();

// FIX (critical): capture the raw request body on the webhook route so
// webhook.js can verify Meta's X-Hub-Signature-256 HMAC. Only the /webhook
// path needs this; other routes use plain json parsing.
app.use('/webhook', express_1.default.json({
    verify: (req, _res, buf) => { req.rawBody = buf; }
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));

// Mount webhook router (signature verification happens inside)
app.use('/webhook', webhook_1.default);

// Health check — intentionally left public
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
// no CSV-injection escaping. Now requires admin auth + escapes every field.
app.get('/api/restaurant/:slug/export', auth_1.requireAdminAuth, async (req, res) => {
    try {
        const slug = req.params.slug;
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
app.post('/api/reservations/demo', auth_1.requireAdminAuth, async (req, res) => {
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
app.post('/api/reservations/status', auth_1.requireAdminAuth, async (req, res) => {
    try {
        const { reservationId, status } = req.body;
        const ALLOWED_STATUSES = ['booked', 'seated', 'completed', 'no_show', 'cancelled'];
        if (!reservationId || !status || !ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({ error: 'Missing or invalid reservationId/status' });
        }
        const [updatedBooking] = await connection_1.db.update(schema_1.bookings)
            .set({ status })
            .where((0, drizzle_orm_1.eq)(schema_1.bookings.id, reservationId))
            .returning();
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

// Agency Control API — auth-gated
app.post('/api/agency/trigger-review-queue', auth_1.requireAdminAuth, async (req, res) => {
    const result = await (0, reviewEngine_1.processPendingReviewQueue)();
    res.json(result);
});

// FIX (critical): onboarding form was previously public — anyone could view
// AND submit it, creating arbitrary tenants with attacker-supplied Meta
// credentials. Now auth-gated end to end.
app.get('/onboard', auth_1.requireAdminAuth, (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Onboard Restaurant Client | House of Bhaves Agency</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; background:#0B0A09; color:#F3EFE6; padding:48px 20px; }
    .form-container { max-width: 720px; margin: 0 auto; background:#141311; border:1.5px solid #2D2923; border-radius:24px; padding:44px; }
    .form-group { margin-bottom: 22px; }
    label { display:block; font-size:12px; font-weight:700; color:#D6D3D1; margin-bottom:8px; text-transform:uppercase; }
    input, select, textarea { width:100%; background:#0E0D0C; border:1.5px solid #2D2923; color:#F3EFE6; padding:14px 18px; border-radius:12px; font-size:14px; }
    textarea { height: 95px; resize: vertical; }
    .row-2 { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
    .submit-btn { width:100%; background:#F59E0B; border:none; color:#0D0C0B; padding:18px; border-radius:14px; font-weight:700; cursor:pointer; margin-top:14px; }
    .note { font-size: 11px; color: #78716C; margin-top: 6px; }
  </style>
</head>
<body>
  <div class="form-container">
    <h1>🍽️ Onboard Restaurant Client</h1>
    <form action="/api/agency/onboard" method="POST">
      <div class="form-group"><label>Restaurant Business Name *</label><input type="text" name="businessName" required></div>
      <div class="row-2">
        <div class="form-group"><label>Custom URL Slug *</label><input type="text" name="slug" required><div class="note">Generates /restaurant/:slug logbook</div></div>
        <div class="form-group"><label>Commercial Billing Plan *</label>
          <select name="billingCycle" required>
            <option value="monthly">Monthly Automation Plan</option>
            <option value="quarterly" selected>Quarterly Automation Bundle</option>
          </select>
        </div>
      </div>
      <div class="row-2">
        <div class="form-group"><label>Lunch Hours</label><input type="text" name="openingHoursLunch" placeholder="e.g. 12:00-15:30"></div>
        <div class="form-group"><label>Dinner Hours</label><input type="text" name="openingHoursDinner" placeholder="e.g. 19:00-00:30"></div>
      </div>
      <div class="form-group"><label>Custom Bot Welcome Greeting</label><textarea name="customWelcomeText"></textarea></div>
      <div class="form-group"><label>Custom Menu/Services Text</label><textarea name="customMenuText"></textarea></div>
      <div class="form-group"><label>Address</label><input type="text" name="address"></div>
      <div class="row-2">
        <div class="form-group"><label>Meta WhatsApp Phone Number ID</label><input type="text" name="whatsappPhoneNumberId" placeholder="Leave blank to require manual setup"></div>
        <div class="form-group"><label>Reservation Code Prefix *</label><input type="text" name="prefix" required></div>
      </div>
      <div class="form-group"><label>Meta Permanent Access Token</label><input type="password" name="metaAccessToken" placeholder="Leave blank to require manual setup"></div>
      <div class="row-2">
        <div class="form-group"><label>Manager WhatsApp Phone</label><input type="text" name="managerPhone"></div>
        <div class="form-group"><label>Google Review URL</label><input type="text" name="googleReviewUrl"></div>
      </div>
      <button type="submit" class="submit-btn">✨ Save & Activate Restaurant Client</button>
    </form>
  </div>
</body>
</html>
  `);
});

// FIX (critical): was public with zero auth — anyone could create a tenant
// pointed at arbitrary Meta credentials. Also removed the hardcoded
// placeholder token/phone-ID fallbacks that silently let a client go live
// with agency-wide shared credentials without anyone noticing.
app.post('/api/agency/onboard', auth_1.requireAdminAuth, async (req, res) => {
    try {
        const { businessName, slug, billingCycle, address, whatsappPhoneNumberId, metaAccessToken, prefix, managerPhone, googleReviewUrl, customWelcomeText, customMenuText, openingHoursLunch, openingHoursDinner } = req.body;
        if (!businessName || !slug || !prefix) {
            return res.status(400).send('Missing required fields: businessName, slug, prefix');
        }
        const RESERVED_SLUGS = new Set(['agency', 'onboard', 'api', 'webhook', 'health', 'demo', 'privacy', 'terms', 'deletion', 'restaurant']);
        const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').slice(0, 64);
        if (!cleanSlug || RESERVED_SLUGS.has(cleanSlug)) {
            return res.status(400).send('Invalid or reserved slug.');
        }
        const today = new Date();
        const nextResetObj = new Date();
        nextResetObj.setDate(today.getDate() + 30);
        const nextResetDate = nextResetObj.toISOString().split('T')[0];
        // FIX: no more silent fallback to shared/placeholder credentials —
        // each tenant either supplies their own creds or is created inactive
        // pending manual credential setup, so nobody accidentally goes live
        // sending on the agency's shared WhatsApp number without knowing it.
        const phoneId = whatsappPhoneNumberId && whatsappPhoneNumberId.trim();
        const token = metaAccessToken && metaAccessToken.trim();
        const readyToActivate = Boolean(phoneId && token);
        await connection_1.db.insert(schema_1.clients).values({
            businessName,
            slug: cleanSlug,
            billingCycle: billingCycle || 'monthly',
            outboundAllowanceMonthly: 1000,
            outboundSentThisMonth: 0,
            nextMonthlyResetDate: nextResetDate,
            whatsappPhoneNumberId: phoneId || 'PENDING_SETUP',
            metaAccessToken: token || 'PENDING_SETUP',
            prefix,
            googleReviewUrl: googleReviewUrl || 'https://maps.google.com',
            customWelcomeText: customWelcomeText || null,
            customMenuText: customMenuText || null,
            active: readyToActivate,
        });
        await connection_1.db.insert(schema_1.restaurants).values({
            name: businessName,
            slug: cleanSlug,
            address: address || '',
            whatsappPhoneNumberId: phoneId || 'PENDING_SETUP',
            metaAccessToken: token || 'PENDING_SETUP',
            prefix,
            managerPhone: managerPhone || '',
            openingHoursLunch: openingHoursLunch !== undefined ? openingHoursLunch : '',
            openingHoursDinner: openingHoursDinner || '19:00-00:30',
            googleReviewUrl: googleReviewUrl || 'https://maps.google.com',
            customWelcomeText: customWelcomeText || null,
            customMenuText: customMenuText || null,
            active: readyToActivate,
        });
        console.log(`✅ [Onboarding] Onboarded: ${businessName} (${cleanSlug}) — active=${readyToActivate}`);
        if (!readyToActivate) {
            console.warn(`⚠️ [Onboarding] Client '${cleanSlug}' created INACTIVE — missing Meta credentials. Set them before enabling.`);
        }
        res.redirect(`/agency?onboarded=${cleanSlug}`);
    }
    catch (error) {
        console.error('Onboarding error:', error);
        res.status(500).send('Onboarding failed. Check server logs.');
    }
});

// FIX (critical): master dashboard (MRR, all clients) was fully public.
app.get('/agency', auth_1.requireAdminAuth, async (req, res) => {
    try {
        const clientList = await connection_1.db.select().from(schema_1.clients);
        const activeClientsCount = clientList.filter(c => c.active).length;
        const tier1Count = clientList.filter(c => c.billingCycle === 'monthly').length;
        const tier2Count = clientList.filter(c => c.billingCycle === 'quarterly').length;
        const mrr = (tier1Count * 9999) + (tier2Count * 8333);
        const clientRowsHtml = clientList.length === 0
            ? `<tr><td colspan="6" style="text-align:center; padding: 40px; color: #A8A29E;">No restaurants onboarded yet.</td></tr>`
            : clientList.map(c => {
                const tierBadge = c.billingCycle === 'quarterly' ? 'QUARTERLY' : 'MONTHLY';
                // FIX: escape businessName/slug before interpolating into HTML
                const safeName = (0, escape_1.escapeHtml)(c.businessName);
                const safeSlug = (0, escape_1.escapeHtml)(c.slug);
                return `
        <tr>
          <td><strong>${safeName}</strong><div>Slug: /restaurant/${safeSlug}</div></td>
          <td>${tierBadge}${c.active ? '' : ' — <span style="color:#F87171">INACTIVE (needs Meta creds)</span>'}</td>
          <td>${c.active ? '⚡ Live' : '⏸ Pending setup'}</td>
          <td>📅 Active 24/7 Engine</td>
          <td>₹0.00</td>
          <td><a href="/restaurant/${encodeURIComponent(c.slug)}" target="_blank">📋 Open Logbook</a></td>
        </tr>`;
            }).join('');
        res.send(`
<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Agency Operations Master | House of Bhaves</title>
<style>body{font-family:sans-serif;background:#0B0A0A;color:#F3EFE6;padding:32px;} table{width:100%;border-collapse:collapse;} th,td{padding:14px;border-bottom:1px solid #282522;text-align:left;} .metric{display:inline-block;margin-right:24px;}</style>
</head><body>
  <h1>🍽️ Restaurant Agency Operations Master</h1>
  <div class="metric">Active: ${activeClientsCount}</div>
  <div class="metric">Monthly/Quarterly: ${tier1Count}/${tier2Count}</div>
  <div class="metric">MRR: ₹${mrr.toLocaleString('en-IN')}/mo</div>
  <p><a href="/onboard" style="color:#F59E0B;">➕ Onboard New Restaurant</a></p>
  <button onclick="fetch('/api/agency/trigger-review-queue',{method:'POST'}).then(r=>r.json()).then(d=>{alert(JSON.stringify(d));location.reload();})">⏱️ Process Review Queue</button>
  <table><thead><tr><th>Client</th><th>Plan</th><th>Status</th><th>Availability</th><th>Meta Cost</th><th>Logbook</th></tr></thead>
  <tbody>${clientRowsHtml}</tbody></table>
</body></html>`);
    }
    catch (error) {
        console.error('Agency dashboard error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// FIX (critical): full reservation logbook (customer names + phone numbers)
// for any tenant was reachable by anyone who guessed a slug — a slugified
// business name is trivially guessable. Now auth-gated + XSS-escaped.
app.get('/restaurant/:slug?', auth_1.requireAdminAuth, async (req, res) => {
    try {
        const targetSlug = req.params.slug || '';
        if (!targetSlug) {
            return res.status(400).send('Restaurant slug required.');
        }
        let clientMatches = await connection_1.db.select().from(schema_1.clients).where((0, drizzle_orm_1.eq)(schema_1.clients.slug, targetSlug)).limit(1);
        let restaurantMatches = await connection_1.db.select().from(schema_1.restaurants).where((0, drizzle_orm_1.eq)(schema_1.restaurants.slug, targetSlug)).limit(1);
        const client = clientMatches[0];
        const restaurant = restaurantMatches[0];
        if (!client && !restaurant) {
            return res.status(404).send('Restaurant not found.');
        }
        const displayName = client?.businessName || restaurant?.name || targetSlug;
        const clientId = client?.id;
        const restaurantId = restaurant?.id;
        let allRes = [];
        if (clientId) {
            const clientBookings = await connection_1.db.select().from(schema_1.bookings).where((0, drizzle_orm_1.eq)(schema_1.bookings.clientId, clientId)).orderBy((0, drizzle_orm_1.desc)(schema_1.bookings.createdAt));
            allRes = clientBookings.map(b => ({ id: b.id, customerName: b.customerName || 'Guest', customerPhone: b.customerPhone, guests: b.guests, occasion: b.occasion, date: b.date, time: b.time, reservationCode: b.reservationCode || '', stage: b.status || 'booked' }));
        }
        if (allRes.length === 0 && restaurantId) {
            const restReservations = await connection_1.db.select().from(schema_1.reservations).where((0, drizzle_orm_1.eq)(schema_1.reservations.restaurantId, restaurantId)).orderBy((0, drizzle_orm_1.desc)(schema_1.reservations.createdAt));
            allRes = restReservations.map(r => ({ id: r.id, customerName: r.customerName || 'Guest', customerPhone: r.customerPhone, guests: r.guests, occasion: r.occasion, date: r.date, time: r.time, reservationCode: r.reservationCode || '', stage: r.stage || 'booked' }));
        }
        // FIX: escapeHtml applied to every user-controlled field before interpolation
        const cardsHtml = allRes.length === 0
            ? `<div>No reservations yet.</div>`
            : allRes.map(r => `
          <div class="reservation-card">
            <h3>${(0, escape_1.escapeHtml)(r.customerName)}</h3>
            <a href="https://wa.me/${(0, escape_1.escapeHtml)(r.customerPhone)}">+${(0, escape_1.escapeHtml)(r.customerPhone)}</a>
            <div>Guests: ${(0, escape_1.escapeHtml)(r.guests)}</div>
            <div>Occasion: ${(0, escape_1.escapeHtml)(r.occasion || 'None')}</div>
            <div>${(0, escape_1.escapeHtml)(r.date)} @ ${(0, escape_1.escapeHtml)(r.time)}</div>
            <div>Code: ${(0, escape_1.escapeHtml)(r.reservationCode)}</div>
            <div>Status: ${(0, escape_1.escapeHtml)((r.stage || 'booked').replace('_', '-').toUpperCase())}</div>
            <div>
              <button onclick="updateStatus(${r.id}, 'seated')">Mark Seated</button>
              <button onclick="updateStatus(${r.id}, 'completed')">Completed</button>
              <button onclick="updateStatus(${r.id}, 'no_show')">No-Show</button>
            </div>
          </div>`).join('');
        res.send(`
<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${(0, escape_1.escapeHtml)(displayName)} | Hostess Ledger</title>
<style>body{font-family:sans-serif;background:#11100F;color:#F3EFE6;padding:28px;} .reservation-card{background:#1C1B18;border:1px solid #322E28;border-radius:12px;padding:16px;margin-bottom:12px;}</style>
</head><body>
  <h1>${(0, escape_1.escapeHtml)(displayName)}</h1>
  <p><a href="/api/restaurant/${encodeURIComponent(targetSlug)}/export" style="color:#F59E0B;">📥 Export CSV</a></p>
  <div id="grid">${cardsHtml}</div>
  <script>
    async function updateStatus(id, status) {
      const res = await fetch('/api/reservations/status', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ reservationId: id, status }) });
      if (res.ok) location.reload(); else alert('Failed to update status');
    }
  </script>
</body></html>`);
    }
    catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).send('Internal Server Error');
    }
});

async function main() {
    await (0, connection_1.initializeDatabase)();
    const { seedDatabase } = await Promise.resolve().then(() => require('./db/seed'));
    await seedDatabase();
    (0, cron_1.startScheduler)();
    app.listen(config_1.config.PORT, () => {
        console.log(`🚀 House of Bhaves Agency Platform running on port ${config_1.config.PORT}`);
        console.log(`🔒 Admin routes (/agency, /onboard, /restaurant/*) require HTTP Basic Auth.`);
        console.log(`🔗 Webhook: http://localhost:${config_1.config.PORT}/webhook`);
    });
}
main().catch((err) => {
    console.error('❌ Fatal startup error:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map
