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
const config_1 = require("./config");
const connection_1 = require("./db/connection");
const schema_1 = require("./db/schema");
const webhook_1 = __importDefault(require("./whatsapp/webhook"));
const makeIntegration_1 = require("./services/makeIntegration");
const drizzle_orm_1 = require("drizzle-orm");
const cron_1 = require("./scheduler/cron");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Mount webhook router
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
app.get('/privacy', (req, res) => {
    res.send(`
    <!DOCTYPE html><html><head><title>Privacy Policy - House of Bhaves (HOB)</title><style>body{font-family:sans-serif;padding:40px;line-height:1.6;max-width:800px;margin:0 auto;color:#222;}</style></head>
    <body><h1>Privacy Policy</h1><p><strong>House of Bhaves (HOB)</strong> respects your privacy. We process customer names, phone numbers, and reservation details solely for table booking and restaurant communication via WhatsApp.</p>
    <h2>Data Collection & Usage</h2><p>Data collected via WhatsApp is strictly used for managing table reservations, sending booking confirmations, and optional dining reminders.</p>
    <h2>Data Protection</h2><p>We do not sell or share personal data with third parties. For data deletion requests, contact us at bhavevedant18@gmail.com.</p></body></html>
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
    <body><h1>User Data Deletion Instructions</h1><p>To request deletion of your reservation data, please email <strong>bhavevedant18@gmail.com</strong> with your registered WhatsApp phone number. All data will be removed within 48 hours.</p></body></html>
  `);
});
// Demo reservation creation endpoint
app.post('/api/reservations/demo', async (req, res) => {
    try {
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const code = `HOB-RES-${randomDigits}`;
        const allRestaurants = await connection_1.db.select().from(schema_1.restaurants).limit(1);
        const restaurantId = allRestaurants.length > 0 ? allRestaurants[0].id : 1;
        const restaurantName = allRestaurants.length > 0 ? allRestaurants[0].name : 'Spice Factory Rooftop & Lounge';
        const [newRes] = await connection_1.db.insert(schema_1.reservations).values({
            restaurantId,
            customerName: 'Vedant Bhave',
            customerPhone: '919699533441',
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
// Status update endpoint (handles 'seated' | 'completed' | 'no_show' | 'cancelled')
app.post('/api/reservations/status', async (req, res) => {
    try {
        const { reservationId, status } = req.body;
        if (!reservationId || !status) {
            return res.status(400).json({ error: 'Missing reservationId or status' });
        }
        const [updated] = await connection_1.db.update(schema_1.reservations)
            .set({ stage: status })
            .where((0, drizzle_orm_1.eq)(schema_1.reservations.id, reservationId))
            .returning();
        if (updated) {
            const currentYear = new Date().getFullYear();
            const today = new Date().toISOString().split('T')[0];
            // 🛡️ Once-Per-Year Birthday Guardrail & Last Dined Tracker
            if (status === 'seated' || status === 'completed') {
                const updates = { lastDinedAt: today };
                if (updated.occasion === 'birthday') {
                    updates.birthdayDiscountClaimedYear = currentYear;
                    console.log(`🛡️ [Guardrail] Stamped 2026 birthday offer claimed for guest ${updated.customerPhone}`);
                }
                await connection_1.db
                    .update(schema_1.conversations)
                    .set(updates)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.conversations.phone, updated.customerPhone), (0, drizzle_orm_1.eq)(schema_1.conversations.restaurantId, updated.restaurantId)));
            }
            await (0, makeIntegration_1.sendToMakeWebhook)({
                event: 'status_updated',
                reservationId: updated.id,
                reservationCode: updated.reservationCode,
                customerName: updated.customerName,
                customerPhone: updated.customerPhone,
                guests: updated.guests,
                occasion: updated.occasion,
                date: updated.date,
                time: updated.time,
                stage: updated.stage,
                timestamp: new Date().toISOString(),
            });
        }
        res.json({ success: true, reservation: updated });
    }
    catch (error) {
        console.error('Status update error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});
// Test Cron Trigger Endpoints
app.post('/api/test/cron-birthday', async (req, res) => {
    const result = await (0, cron_1.runBirthdayPushCron)();
    res.json(result);
});
app.post('/api/test/cron-retention', async (req, res) => {
    const result = await (0, cron_1.runRetentionCron)();
    res.json(result);
});
app.post('/api/test/cron-review', async (req, res) => {
    const result = await (0, cron_1.runReviewRequestCron)();
    res.json(result);
});
// Multi-tenant slug route & fallback
app.get('/restaurant/:slug?', async (req, res) => {
    try {
        const slug = req.params.slug || 'hob-restaurant';
        // Find restaurant by slug
        let restaurantList = await connection_1.db.select().from(schema_1.restaurants).where((0, drizzle_orm_1.eq)(schema_1.restaurants.slug, slug)).limit(1);
        if (restaurantList.length === 0) {
            restaurantList = await connection_1.db.select().from(schema_1.restaurants).limit(1);
        }
        const restaurant = restaurantList[0] || {
            name: 'House of Bhaves Rooftop & Lounge (HOB)',
            slug: 'hob-restaurant',
            address: 'Baner Road, Pune',
            prefix: 'HOB'
        };
        const allRes = await connection_1.db
            .select()
            .from(schema_1.reservations)
            .where((0, drizzle_orm_1.eq)(schema_1.reservations.restaurantId, restaurant.id))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.reservations.createdAt));
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
                return `
          <div class="reservation-card" data-status="${r.stage}" data-search="${(r.customerName + ' ' + r.customerPhone + ' ' + r.reservationCode).toLowerCase()}">
            <div class="card-content">
              ${stickyNote}
              <div class="guest-info">
                <h3 class="guest-name">${r.customerName}</h3>
                <a href="https://wa.me/${r.customerPhone}" class="guest-phone" target="_blank">+${r.customerPhone}</a>
              </div>
              
              <div class="details-grid">
                <div class="detail-item">
                  <span class="detail-label">Guests</span>
                  <span class="detail-value">👥 ${r.guests}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Occasion</span>
                  <span class="detail-value">${occasionEmoji}${r.occasion || 'None'}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Date & Time</span>
                  <span class="detail-value">📅 ${r.date} @ ${r.time}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Code</span>
                  <span class="detail-value code-highlight">${r.reservationCode}</span>
                </div>
              </div>
              
              <div class="stamp-badge ${badgeClass}">${(r.stage || 'booked').replace('_', '-').toUpperCase()}</div>
              
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
  <title>${restaurant.name} | Hostess Ledger</title>
  <meta name="description" content="Private Booking Ledger for ${restaurant.name}">
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
    .header-right { display: flex; align-items: center; gap: 16px; }
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
        <h1>${restaurant.name}</h1>
        <p>Hostess Front-Desk Ledger • URL Slug: /restaurant/${restaurant.slug}</p>
      </div>
      <div class="header-right">
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
        console.log(`🍽️ Spice Factory Bot running on port ${config_1.config.PORT}`);
        console.log(`📊 Multi-Tenant Dashboard: http://localhost:${config_1.config.PORT}/restaurant/spice-factory`);
        console.log(`🔗 Webhook: http://localhost:${config_1.config.PORT}/webhook`);
    });
}
main().catch(console.error);
//# sourceMappingURL=index.js.map