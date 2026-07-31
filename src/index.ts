import 'dotenv/config';
import express from 'express';
import { config } from './config';
import { db, initializeDatabase } from './db/connection';
import { restaurants, reservations, conversations, clients, customers, bookings } from './db/schema';
import webhookRouter from './whatsapp/webhook';
import { sendToMakeWebhook } from './services/makeIntegration';
import { eq, desc, and } from 'drizzle-orm';
import { startScheduler, runBirthdayPushCron, runRetentionCron, runReviewRequestCron } from './scheduler/cron';
import { processMonthlyQuotaResets } from './services/quotaService';
import { processPendingReviewQueue, scheduleSameDayReview } from './services/reviewEngine';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount webhook router
app.use('/webhook', webhookRouter);

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
    
    const allRestaurants = await db.select().from(restaurants).limit(1);
    const restaurantId = allRestaurants.length > 0 ? allRestaurants[0].id : 1;
    const restaurantName = allRestaurants.length > 0 ? allRestaurants[0].name : 'House of Bhaves Rooftop & Lounge (HOB)';

    const [newRes] = await db.insert(reservations).values({
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
    
    await sendToMakeWebhook({
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
  } catch (error) {
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
    
    const [updated] = await db.update(reservations)
      .set({ stage: status })
      .where(eq(reservations.id, reservationId))
      .returning();
      
    if (updated) {
      const currentYear = new Date().getFullYear();
      const today = new Date().toISOString().split('T')[0];

      // 🛡️ Once-Per-Year Birthday Guardrail & Last Dined Tracker
      if (status === 'seated' || status === 'completed') {
        const updates: any = { lastDinedAt: today };
        if (updated.occasion === 'birthday') {
          updates.birthdayDiscountClaimedYear = currentYear;
          console.log(`🛡️ [Guardrail] Stamped 2026 birthday offer claimed for guest ${updated.customerPhone}`);
        }

        await db
          .update(conversations)
          .set(updates)
          .where(
            and(
              eq(conversations.phone, updated.customerPhone),
              eq(conversations.restaurantId, updated.restaurantId)
            )
          );

        // Schedule 2-Hour Asynchronous Same-Day Review Delay Queue
        await scheduleSameDayReview(updated.id, 120);
      }

      await sendToMakeWebhook({
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
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Agency Control API Endpoints
app.post('/api/agency/reset-quotas', async (req, res) => {
  const result = await processMonthlyQuotaResets();
  res.json(result);
});

app.post('/api/agency/trigger-review-queue', async (req, res) => {
  const result = await processPendingReviewQueue();
  res.json(result);
});

app.post('/api/agency/trigger-marketing-cron', async (req, res) => {
  const result = await runBirthdayPushCron();
  res.json(result);
});

// ----------------------------------------------------
// 📝 RESTAURANT CLIENT ONBOARDING PORTAL (GET /onboard)
// ----------------------------------------------------
app.get('/onboard', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Onboard New Restaurant | House of Bhaves Agency</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Instrument Sans', -apple-system, sans-serif;
      background: #0D0C0B;
      color: #F3EFE6;
      padding: 32px 20px;
      min-height: 100vh;
    }
    .form-container {
      max-width: 680px;
      margin: 0 auto;
      background: #171614;
      border: 2px solid #322E28;
      border-radius: 20px;
      padding: 36px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.7);
    }
    .form-header { text-align: center; margin-bottom: 28px; }
    .form-header h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 26px;
      color: #F59E0B;
      font-weight: 700;
    }
    .form-header p { color: #A8A29E; font-size: 14px; margin-top: 6px; }
    .form-group { margin-bottom: 20px; }
    label {
      display: block;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: #F3EFE6;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    input, select, textarea {
      width: 100%;
      background: #0E0D0C;
      border: 1.5px solid #3A352E;
      color: #F3EFE6;
      padding: 14px 16px;
      border-radius: 10px;
      font-size: 15px;
      font-family: inherit;
    }
    input:focus, select:focus { border-color: #F59E0B; outline: none; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .submit-btn {
      width: 100%;
      background: #F59E0B;
      border: none;
      color: #0D0C0B;
      padding: 16px;
      border-radius: 12px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 10px;
    }
    .submit-btn:hover { background: #D97706; }
    .note { font-size: 12px; color: #78716C; margin-top: 6px; }
    .pricing-box {
      background: #11100E;
      border: 1px dashed #F59E0B;
      padding: 14px;
      border-radius: 10px;
      margin-bottom: 20px;
      font-size: 13px;
      line-height: 1.5;
    }
    .pricing-box strong { color: #F59E0B; }
  </style>
</head>
<body>
  <div class="form-container">
    <div class="form-header">
      <h1>🍽️ Onboard New Restaurant Client</h1>
      <p>Configure WhatsApp Credentials, Custom URL Slug & Itemized Commercial Offer</p>
    </div>

    <div class="pricing-box">
      💰 <strong>Itemized Commercial Plan Breakdown:</strong><br>
      • <strong>Core Automation Package:</strong> ₹9,999/mo (Unlimited Inbound Booking Bot + Same-Day Reviews)<br>
      • <strong>Outbound Marketing Add-on:</strong> +₹5,000/mo (Monthly Plan) OR +₹9,999/qtr (Quarterly Bundle - Save ₹5,001). Capped at 1,000 msgs/mo.
    </div>

    <form action="/api/agency/onboard" method="POST">
      <div class="form-group">
        <label>Restaurant Business Name *</label>
        <input type="text" name="businessName" placeholder="e.g. Spice Factory Rooftop & Lounge" required>
      </div>

      <div class="row-2">
        <div class="form-group">
          <label>Custom URL Slug *</label>
          <input type="text" name="slug" placeholder="e.g. spice-factory-baner" required>
          <div class="note">Generates /restaurant/:slug logbook</div>
        </div>

        <div class="form-group">
          <label>Commercial Billing Option *</label>
          <select name="billingCycle" required>
            <option value="monthly">Monthly Option: ₹9,999 Base + ₹5,000 Outbound (₹14,999/mo)</option>
            <option value="quarterly" selected>Quarterly Bundle: ₹29,997 Base + ₹9,999 Outbound (₹39,996/qtr)</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Restaurant Address & Landmark</label>
        <input type="text" name="address" placeholder="Baner Road, Pune 411045" value="Baner Road, Pune 411045">
      </div>

      <div class="row-2">
        <div class="form-group">
          <label>Meta WhatsApp Phone Number ID *</label>
          <input type="text" name="whatsappPhoneNumberId" placeholder="1167895203082852" required>
        </div>

        <div class="form-group">
          <label>Reservation Code Prefix *</label>
          <input type="text" name="prefix" placeholder="SPF" value="SPF" required>
        </div>
      </div>

      <div class="form-group">
        <label>Meta Permanent Access Token *</label>
        <input type="text" name="metaAccessToken" placeholder="EAA4bXmG..." required>
      </div>

      <div class="row-2">
        <div class="form-group">
          <label>Manager WhatsApp Phone</label>
          <input type="text" name="managerPhone" placeholder="919699533441" value="919699533441">
        </div>

        <div class="form-group">
          <label>Google Review URL</label>
          <input type="text" name="googleReviewUrl" placeholder="https://maps.google.com" value="https://maps.google.com">
        </div>
      </div>

      <button type="submit" class="submit-btn">✨ Save & Activate Restaurant Client</button>
    </form>
  </div>
</body>
</html>
  `);
});

// Client Onboarding Submission Endpoint
app.post('/api/agency/onboard', async (req, res) => {
  try {
    const {
      businessName,
      slug,
      billingCycle,
      address,
      whatsappPhoneNumberId,
      metaAccessToken,
      prefix,
      managerPhone,
      googleReviewUrl
    } = req.body;

    if (!businessName || !slug || !whatsappPhoneNumberId || !metaAccessToken) {
      return res.status(400).send('Missing required fields: businessName, slug, whatsappPhoneNumberId, metaAccessToken');
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
    const today = new Date();
    const nextResetObj = new Date();
    nextResetObj.setDate(today.getDate() + 30);
    const nextResetDate = nextResetObj.toISOString().split('T')[0];

    // Insert into clients table
    await db.insert(clients).values({
      businessName,
      slug: cleanSlug,
      billingCycle: billingCycle || 'monthly',
      outboundAllowanceMonthly: 1000,
      outboundSentThisMonth: 0,
      nextMonthlyResetDate: nextResetDate,
      whatsappPhoneNumberId,
      metaAccessToken,
      prefix: prefix || 'HOB',
      googleReviewUrl: googleReviewUrl || 'https://maps.google.com',
      active: true
    });

    // Also insert into restaurants table (for backward compatibility)
    await db.insert(restaurants).values({
      name: businessName,
      slug: cleanSlug,
      address: address || 'Baner Road, Pune',
      whatsappPhoneNumberId,
      metaAccessToken,
      prefix: prefix || 'HOB',
      managerPhone: managerPhone || '919699533441',
      googleReviewUrl: googleReviewUrl || 'https://maps.google.com',
      active: true
    });

    console.log(`✅ [Onboarding Success] Successfully onboarded restaurant: ${businessName} (${cleanSlug})`);

    res.redirect(`/agency?onboarded=${cleanSlug}`);
  } catch (error: any) {
    console.error('Onboarding error:', error);
    res.status(500).send(`Onboarding Error: ${error.message}`);
  }
});

// ----------------------------------------------------
// 🏛️ MASTER AGENCY DASHBOARD (GET /agency)
// ----------------------------------------------------
app.get('/agency', async (req, res) => {
  try {
    const clientList = await db.select().from(clients);
    
    // Financial & Metric Calculations
    const activeClientsCount = clientList.filter(c => c.active).length;
    const tier1Count = clientList.filter(c => c.billingCycle === 'monthly').length;
    const tier2Count = clientList.filter(c => c.billingCycle === 'quarterly').length;

    // Itemized MRR Calculation:
    // Core Engine = ₹9,999/mo per client
    // Outbound Add-on: Monthly = ₹5,000/mo | Quarterly = ₹9,999/3 = ₹3,333/mo
    const mrr = (activeClientsCount * 9999) + (tier1Count * 5000) + (tier2Count * 3333);
    
    let totalOutboundSent = 0;
    clientList.forEach(c => totalOutboundSent += (c.outboundSentThisMonth || 0));

    // Meta API Base Cost (India Outbound Marketing): ₹1.02 per message
    const totalMetaCost = Math.round(totalOutboundSent * 1.02);
    const netProfit = mrr - totalMetaCost;
    const profitMargin = mrr > 0 ? Math.round((netProfit / mrr) * 100) : 93;

    const clientRowsHtml = clientList.length === 0
      ? `<tr><td colspan="6" style="text-align:center; padding: 40px; color: #A8A29E;">No restaurants onboarded yet. Click "Onboard New Restaurant" to get started!</td></tr>`
      : clientList.map(c => {
      const sent = c.outboundSentThisMonth || 0;
      const maxQuota = c.outboundAllowanceMonthly || 1000;
      const pct = Math.min(Math.round((sent / maxQuota) * 100), 100);
      const isQuotaFull = sent >= maxQuota;
      
      const metaExpense = (sent * 1.02).toFixed(2);
      const tierPrice = c.billingCycle === 'quarterly' ? 'Quarterly: ₹29,997 Base + ₹9,999 Add-on' : 'Monthly: ₹9,999 Base + ₹5,000 Add-on';
      const tierBadgeClass = c.billingCycle === 'quarterly' ? 'tier-quarterly' : 'tier-monthly';

      return `
        <tr class="${isQuotaFull ? 'row-quota-full' : ''}">
          <td class="client-name">
            <strong>${c.businessName}</strong>
            <div class="client-slug">Slug: /restaurant/${c.slug}</div>
          </td>
          <td>
            <span class="tier-badge ${tierBadgeClass}">${(c.billingCycle || 'monthly').toUpperCase()}</span>
            <div style="font-size:11px; color:#A8A29E; margin-top:4px;">${tierPrice}</div>
          </td>
          <td>
            <div class="quota-meter-container">
              <div class="quota-text">
                <span>${sent} / ${maxQuota} msgs</span>
                <span class="${isQuotaFull ? 'text-danger' : 'text-success'}">${pct}%</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill ${isQuotaFull ? 'fill-full' : ''}" style="width: ${pct}%"></div>
              </div>
              ${isQuotaFull ? '<div class="quota-warning">🛑 Smart Cut-off Active (Quota Limit Reached)</div>' : ''}
            </div>
          </td>
          <td>
            <div class="resets-date">📅 ${c.nextMonthlyResetDate || 'Next Midnight'}</div>
          </td>
          <td>
            <div class="meta-cost">₹${metaExpense}</div>
            <div class="cost-note">@ ₹1.02/msg</div>
          </td>
          <td>
            <a href="/restaurant/${c.slug}" target="_blank" class="btn-view-logbook">📋 Open Logbook</a>
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
    .quota-meter-container { width: 220px; }
    .quota-text { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; margin-bottom: 4px; }
    .progress-bar-bg { width: 100%; height: 8px; background: #22201D; border-radius: 4px; overflow: hidden; }
    .progress-bar-fill { height: 100%; background: #F59E0B; border-radius: 4px; }
    .fill-full { background: #EF4444 !important; }
    .text-danger { color: #EF4444; font-weight: 700; }
    .text-success { color: #4ADE80; font-weight: 700; }
    .quota-warning { font-size: 10px; color: #EF4444; font-weight: 700; margin-top: 4px; }
    .meta-cost { font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; color: #F3EFE6; }
    .cost-note { font-size: 10px; color: #78716C; }
    .btn-view-logbook {
      background: #1C1917;
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
        <p>Itemized Commercial Accounts & Meta API Cost Ledger • House of Bhaves</p>
      </div>
      <div class="header-right-btns">
        <a href="/onboard" class="btn-onboard">➕ Onboard New Restaurant</a>
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
        <div class="metric-lbl">Monthly / Quarterly Tiers</div>
      </div>
      <div class="metric-card">
        <div class="metric-val val-green">~${profitMargin}%</div>
        <div class="metric-lbl">Net Profit Margin</div>
      </div>
      <div class="metric-card">
        <div class="metric-val">${totalOutboundSent}</div>
        <div class="metric-lbl">Outbound Msgs Sent</div>
      </div>
      <div class="metric-card">
        <div class="metric-val">₹${totalMetaCost}</div>
        <div class="metric-lbl">Meta Out-of-Pocket Expense</div>
      </div>
    </div>

    <div class="control-actions">
      <strong style="font-size: 13px; text-transform: uppercase; color: #A8A29E; font-family: 'Space Grotesk';">⚡ Agency Admin Actions:</strong>
      <button onclick="triggerAction('/api/agency/reset-quotas')" class="action-btn">🔄 Trigger Midnight Quota Reset</button>
      <button onclick="triggerAction('/api/agency/trigger-review-queue')" class="action-btn">⏱️ Process 2-Hr Review Queue</button>
      <button onclick="triggerAction('/api/agency/trigger-marketing-cron')" class="action-btn">📢 Run 10 AM Outbound Cron</button>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Restaurant Client</th>
            <th>Itemized Subscription Breakdown</th>
            <th>Monthly Outbound Quota (1,000 Cap)</th>
            <th>Reset Schedule</th>
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
  } catch (error) {
    console.error('Agency dashboard error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Multi-tenant slug route & fallback
app.get('/restaurant/:slug?', async (req, res) => {
  try {
    const slug = (req.params as any).slug || 'hob-restaurant';
    
    let restaurantList = await db.select().from(restaurants).where(eq(restaurants.slug, slug)).limit(1);
    if (restaurantList.length === 0) {
      restaurantList = await db.select().from(restaurants).limit(1);
    }
    
    const restaurant = restaurantList[0] || {
      name: 'House of Bhaves Rooftop & Lounge (HOB)',
      slug: 'hob-restaurant',
      address: 'Baner Road, Pune',
      prefix: 'HOB'
    };

    const allRes = await db
      .select()
      .from(reservations)
      .where(eq(reservations.restaurantId, restaurant.id))
      .orderBy(desc(reservations.createdAt));
    
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
        if (r.stage === 'booked') badgeClass = 'badge-booked';
        else if (r.stage === 'seated') badgeClass = 'badge-seated';
        else if (r.stage === 'completed') badgeClass = 'badge-completed';
        else if (r.stage === 'cancelled') badgeClass = 'badge-cancelled';
        else if (r.stage === 'no_show') badgeClass = 'badge-no-show';
        
        let stickyNote = '';
        if (r.occasion?.toLowerCase() === 'birthday') {
          stickyNote = `<div class="sticky-note">🎂 Birthday — Prep cake & décor! (1x/yr Offer)</div>`;
        } else if (r.occasion?.toLowerCase() === 'anniversary') {
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
        } else if (r.stage === 'seated') {
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
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Internal Server Error');
  }
});

async function main() {
  await initializeDatabase();
  
  // Run seed
  const { seedDatabase } = await import('./db/seed');
  await seedDatabase();
  
  // Start background outbound cron scheduler
  startScheduler();
  
  app.listen(config.PORT, () => {
    console.log(`🚀 House of Bhaves Agency Platform running on port ${config.PORT}`);
    console.log(`🏛️ Master Agency Dashboard: http://localhost:${config.PORT}/agency`);
    console.log(`📝 Onboard Restaurant Portal: http://localhost:${config.PORT}/onboard`);
    console.log(`📋 Client Logbook: http://localhost:${config.PORT}/restaurant/hob-restaurant`);
    console.log(`🔗 Webhook: http://localhost:${config.PORT}/webhook`);
  });
}

main().catch(console.error);
