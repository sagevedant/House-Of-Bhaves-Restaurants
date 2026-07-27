import 'dotenv/config';
import express from 'express';
import { config } from './config';
import { db, initializeDatabase } from './db/connection';
import { restaurants, reservations } from './db/schema';
import webhookRouter from './whatsapp/webhook';
import { sendToMakeWebhook } from './services/makeIntegration';
import { eq, desc } from 'drizzle-orm';

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

app.post('/api/reservations/demo', async (req, res) => {
  try {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const code = `HOB-RES-${randomDigits}`;
    
    // Get first restaurant for demo
    const allRestaurants = await db.select().from(restaurants).limit(1);
    const restaurantId = allRestaurants.length > 0 ? allRestaurants[0].id : 1;

    const [newRes] = await db.insert(reservations).values({
      restaurantId,
      customerName: 'Vedant Bhave',
      customerPhone: '919876543210',
      guests: 4,
      occasion: 'birthday',
      date: new Date().toISOString().split('T')[0],
      time: '20:30',
      reservationCode: code,
      stage: 'booked',
    }).returning();
    
    // Sync to Make.com
    await sendToMakeWebhook({
      event: 'demo_created',
      reservationId: newRes.id,
      reservationCode: newRes.reservationCode,
      restaurantName: 'Spice Factory Rooftop & Lounge',
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

app.get('/restaurant', async (req, res) => {
  try {
    const allRes = await db.select().from(reservations).orderBy(desc(reservations.createdAt));
    
    const totalReservations = allRes.filter(r => r.stage !== 'cancelled').length;
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
        else if (r.stage === 'completed') badgeClass = 'badge-completed';
        else if (r.stage === 'cancelled') badgeClass = 'badge-cancelled';
        else if (r.stage === 'no_show') badgeClass = 'badge-no-show';
        
        let stickyNote = '';
        if (r.occasion?.toLowerCase() === 'birthday') {
          stickyNote = `<div class="sticky-note">🎂 Birthday celebration — Prep cake & décor!</div>`;
        } else if (r.occasion?.toLowerCase() === 'anniversary') {
          stickyNote = `<div class="sticky-note">🥂 Anniversary — Candlelight setup!</div>`;
        }
        
        let actions = '';
        if (r.stage === 'booked') {
          actions = `
            <div class="card-actions">
              <button onclick="updateStatus(${r.id}, 'completed')" class="btn-complete">✅ Mark Completed</button>
              <button onclick="updateStatus(${r.id}, 'no_show')" class="btn-no-show">❌ Mark No-Show</button>
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
                <a href="https://wa.me/${r.customerPhone}" class="guest-phone" target="_blank">${r.customerPhone}</a>
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
  <title>Spice Factory | Dashboard</title>
  <meta name="description" content="Private Booking Ledger for Spice Factory">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400;0,600;0,700;1,400&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #11100F;
      --card-bg: #1C1B18;
      --border: #322E28;
      --text-primary: #F3EFE6;
      --text-muted: #A8A29E;
      --amber: #F59E0B;
      --amber-bg: rgba(245, 158, 11, 0.15);
      --green: #22C55E;
      --green-bg: rgba(34, 197, 94, 0.12);
      --red: #EF4444;
      --red-bg: rgba(239, 68, 68, 0.12);
      --gray: #6B7280;
      --gray-bg: rgba(107, 114, 128, 0.12);
      --dash: #3E3A33;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      background-image: radial-gradient(#2A2724 1px, transparent 1px);
      background-size: 24px 24px;
      color: var(--text-primary);
      font-family: 'Instrument Sans', sans-serif;
      min-height: 100vh;
      position: relative;
      padding: 2rem;
    }

    /* Grain overlay */
    body::before {
      content: "";
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
      opacity: 0.045;
      pointer-events: none;
      z-index: 999;
    }

    h1, h2, h3, .space-font {
      font-family: 'Space Grotesk', sans-serif;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      position: relative;
      z-index: 10;
    }

    /* Header */
    .header-card {
      background: var(--card-bg);
      border: 2px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 4px 0px #0A0908;
      padding: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      position: relative;
    }

    .header-card::before {
      content: '';
      position: absolute;
      top: -10px;
      left: 50%;
      transform: translateX(-50%);
      width: 120px;
      height: 20px;
      background: #0A0908;
      border-radius: 4px;
      border: 2px solid #3E3A33;
    }

    .restaurant-title h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
      letter-spacing: -0.02em;
    }

    .restaurant-title p {
      color: var(--text-muted);
      font-size: 1.1rem;
    }

    .header-right {
      text-align: right;
    }

    .live-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      padding: 6px 12px;
      border-radius: 20px;
      color: var(--green);
      font-weight: 600;
      font-size: 0.85rem;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .pulse {
      width: 8px;
      height: 8px;
      background-color: var(--green);
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
      animation: pulse-green 2s infinite;
    }

    @keyframes pulse-green {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }

    .today-date {
      color: var(--text-muted);
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.2rem;
    }

    /* Metrics */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .metric-card {
      background: var(--card-bg);
      border: 2px solid var(--border);
      border-radius: 14px;
      padding: 1.5rem;
      box-shadow: 0 3px 0px #0A0908;
      text-align: center;
    }

    .metric-value {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 34px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }

    .metric-label {
      color: var(--text-muted);
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    /* Toolbar */
    .toolbar {
      background: var(--card-bg);
      border: 2px solid var(--border);
      border-radius: 14px;
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      box-shadow: 0 3px 0px #0A0908;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .search-input {
      background: #11100F;
      border: 1px solid var(--border);
      color: var(--text-primary);
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-family: 'Instrument Sans', sans-serif;
      width: 300px;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-input:focus {
      border-color: var(--amber);
    }

    .tabs {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
    }

    .tab-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-family: 'Instrument Sans', sans-serif;
      font-weight: 600;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .tab-btn:hover {
      color: var(--text-primary);
    }

    .tab-btn.active {
      background: #2A2724;
      border-color: var(--border);
      color: var(--text-primary);
    }

    /* Reservations Grid */
    .reservations-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
      gap: 1.5rem;
    }

    .reservation-card {
      background: var(--card-bg);
      border: 2px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 3px 0px #0A0908;
      position: relative;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      overflow: hidden;
    }

    .reservation-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 0px #0A0908;
    }

    .card-content {
      padding: 1.5rem;
      border-left: 2px dashed var(--dash);
      margin-left: 1.5rem;
      position: relative;
    }

    .guest-info {
      margin-bottom: 1.5rem;
    }

    .guest-name {
      font-size: 1.75rem;
      margin-bottom: 0.25rem;
    }

    .guest-phone {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 1.1rem;
      transition: color 0.2s;
    }

    .guest-phone:hover {
      color: var(--amber);
    }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .detail-label {
      font-size: 0.8rem;
      text-transform: uppercase;
      color: var(--text-muted);
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    .detail-value {
      font-size: 1.1rem;
      font-weight: 500;
    }

    .code-highlight {
      color: var(--amber);
      font-family: monospace;
      font-weight: 700;
      background: rgba(245, 158, 11, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
    }

    /* Rubber stamp */
    .stamp-badge {
      position: absolute;
      top: 1.5rem;
      right: 1.5rem;
      padding: 0.25rem 0.75rem;
      border: 2px solid;
      border-radius: 4px;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 700;
      font-size: 0.85rem;
      letter-spacing: 0.1em;
      transform: rotate(-3deg);
      text-transform: uppercase;
    }

    .badge-booked { background: var(--amber-bg); border-color: var(--amber); color: var(--amber); }
    .badge-completed { background: var(--green-bg); border-color: var(--green); color: var(--green); }
    .badge-cancelled { background: var(--gray-bg); border-color: var(--gray); color: var(--gray); }
    .badge-no-show { background: var(--red-bg); border-color: var(--red); color: var(--red); transform: rotate(4deg); }

    .sticky-note {
      position: absolute;
      top: -10px;
      right: 40%;
      background: var(--amber);
      color: #000;
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      font-weight: 600;
      transform: rotate(-2deg);
      box-shadow: 2px 4px 10px rgba(0,0,0,0.3);
      z-index: 2;
      border-bottom-right-radius: 12px;
    }

    .card-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
    }

    .card-actions button {
      flex: 1;
      padding: 0.75rem;
      border-radius: 8px;
      font-family: 'Instrument Sans', sans-serif;
      font-weight: 600;
      cursor: pointer;
      background: transparent;
      transition: all 0.2s;
    }

    .btn-complete {
      border: 1px solid var(--green);
      color: var(--green);
    }
    .btn-complete:hover {
      background: var(--green-bg);
    }

    .btn-no-show {
      border: 1px solid var(--red);
      color: var(--red);
    }
    .btn-no-show:hover {
      background: var(--red-bg);
    }

    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 4rem 2rem;
      background: var(--card-bg);
      border: 2px dashed var(--border);
      border-radius: 16px;
    }

    .empty-state h2 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: var(--text-muted);
      margin-bottom: 2rem;
    }

    .demo-btn {
      background: var(--text-primary);
      color: var(--bg);
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-family: 'Instrument Sans', sans-serif;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .demo-btn:hover {
      opacity: 0.9;
    }

    @media (max-width: 768px) {
      .header-card {
        flex-direction: column;
        text-align: center;
        gap: 1.5rem;
      }
      .header-right {
        text-align: center;
      }
      .toolbar {
        flex-direction: column;
      }
      .search-input {
        width: 100%;
      }
      .tabs {
        width: 100%;
        justify-content: center;
        flex-wrap: wrap;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-card">
      <div class="restaurant-title">
        <h1>Spice Factory</h1>
        <p>Private Booking Ledger</p>
      </div>
      <div class="header-right">
        <div class="live-badge">
          <div class="pulse"></div> LIVE
        </div>
        <div class="today-date" id="dateDisplay"></div>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value">${totalReservations}</div>
        <div class="metric-label">🍽️ Total Reservations</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${birthdays}</div>
        <div class="metric-label">🎂 Birthdays</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${parties}</div>
        <div class="metric-label">🎉 Parties / Corporate</div>
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
        <button class="tab-btn" data-filter="completed">Completed</button>
        <button class="tab-btn" data-filter="no_show">No-Show</button>
      </div>
    </div>

    <div class="reservations-grid" id="reservationsGrid">
      ${cardsHtml}
    </div>
  </div>

  <script>
    // Set date
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dateDisplay').textContent = new Date().toLocaleDateString('en-US', dateOptions);

    // Filtering logic
    const searchInput = document.getElementById('searchInput');
    const tabs = document.querySelectorAll('.tab-btn');
    const cards = document.querySelectorAll('.reservation-card');
    let currentFilter = 'all';

    function filterCards() {
      const searchTerm = searchInput.value.toLowerCase();
      
      cards.forEach(card => {
        const text = card.getAttribute('data-search');
        const status = card.getAttribute('data-status');
        
        const matchesSearch = text.includes(searchTerm);
        const matchesTab = currentFilter === 'all' || status === currentFilter;
        
        if (matchesSearch && matchesTab) {
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
        currentFilter = tab.getAttribute('data-filter');
        filterCards();
      });
    });

    async function updateStatus(reservationId, status) {
      try {
        const res = await fetch('/api/reservations/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationId, status })
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
  
  app.listen(config.PORT, () => {
    console.log(`🍽️ Spice Factory Bot running on port ${config.PORT}`);
    console.log(`📊 Dashboard: http://localhost:${config.PORT}/restaurant`);
    console.log(`🔗 Webhook: http://localhost:${config.PORT}/webhook`);
  });
}

main().catch(console.error);
