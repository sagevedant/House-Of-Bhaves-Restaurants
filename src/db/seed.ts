import 'dotenv/config';
import { db, initializeDatabase } from './connection';
import { restaurants, reservations, clients, customers, bookings } from './schema';
import { eq } from 'drizzle-orm';
import { config } from '../config';

export async function seedDatabase() {
  try {
    // ----------------------------------------------------
    // SEED REAL COMMERCIAL RESTAURANT CLIENTS
    // ----------------------------------------------------
    const existingClient = await db.select().from(clients).where(eq(clients.slug, 'hob-restaurant')).get();
    const existingBbcClient = await db.select().from(clients).where(eq(clients.slug, 'big-bang-community')).get();
    
    const today = new Date();
    const nextResetObj = new Date();
    nextResetObj.setDate(today.getDate() + 30);
    const nextResetDate = nextResetObj.toISOString().split('T')[0];
    const todayYmd = today.toISOString().split('T')[0];

    if (!existingClient) {
      // 1. House of Bhaves Rooftop & Lounge (HOB)
      const [hobClient] = await db.insert(clients).values({
        businessName: 'House of Bhaves Rooftop & Lounge (HOB)',
        slug: 'hob-restaurant',
        billingCycle: 'quarterly',
        outboundAllowanceMonthly: 1000,
        outboundSentThisMonth: 0,
        nextMonthlyResetDate: nextResetDate,
        whatsappPhoneNumberId: config.whatsappPhoneNumberId || '1167895203082852',
        metaAccessToken: config.metaAccessToken || 'PLACEHOLDER_TOKEN',
        prefix: 'HOB',
        googleReviewUrl: 'https://maps.google.com',
        active: true,
      }).returning();

      // Seed Real Initial Customer & Booking for HOB
      const [cust1] = await db.insert(customers).values({
        clientId: hobClient.id,
        phoneNumber: '919699533441',
        customerName: 'Vedant Bhave',
        birthday: '08-05',
        anniversary: '12-14',
        lastInboundInteraction: new Date().toISOString(),
        lastDinedAt: todayYmd,
      }).returning();

      await db.insert(bookings).values([
        {
          clientId: hobClient.id,
          customerId: cust1.id,
          customerName: 'Vedant Bhave',
          customerPhone: '919699533441',
          guests: 4,
          occasion: 'birthday',
          date: todayYmd,
          time: '20:30',
          reservationCode: 'HOB-RES-4891',
          status: 'booked',
        }
      ]);

      console.log('✅ Seed: Inserted Real Restaurant Client: House of Bhaves (HOB).');
    }

    if (!existingBbcClient) {
      // 2. Big Bang Community (BBC)
      const bbcWelcome = `🌟 Welcome to Big Bang Community (BBC)!\n\nRelaxed outdoor seating, live music, sports screenings & delicious homestyle rice & pasta meals, dumplings & chicken!\n\nTap below to reserve your table instantly! 👇`;
      
      const bbcMenu = `🍽️ *Big Bang Community (BBC) — Menu & Specials* 🌟\n\n🥟 *Dumplings & Dim Sums*\n• Steamed Veg & Chicken Dumplings 🥟\n• Chilli Garlic Fried Dim Sums 🥟\n\n🍝 *Homestyle Rice & Pastas*\n• Creamy Alfredo & Arrabbiata Pasta 🍝\n• BBC Special Peri Peri Chicken Rice Bowl 🍚\n\n🍗 *Crispy Chicken & Bites*\n• Signature Korean Fried Chicken 🍗\n• Crunchy Wings Platter 🍗\n\n🍹 *Craft Drinks & Brews*\n• Cold Brew Shakerato & Tropical Fruit Punch 🍹\n\n✨ *Vibe & Amenities*: Outdoor Seating 🍃 • Live Music 🎵 • Live Sports Screening 📺`;

      const [bbcClient] = await db.insert(clients).values({
        businessName: 'Big Bang Community (BBC)',
        slug: 'big-bang-community',
        billingCycle: 'monthly',
        outboundAllowanceMonthly: 1000,
        outboundSentThisMonth: 0,
        nextMonthlyResetDate: nextResetDate,
        whatsappPhoneNumberId: config.whatsappPhoneNumberId || '1167895203082852',
        metaAccessToken: config.metaAccessToken || 'PLACEHOLDER_TOKEN',
        prefix: 'BBC',
        googleReviewUrl: 'https://maps.google.com/?q=Big+Bang+Community+Pune',
        customWelcomeText: bbcWelcome,
        customMenuText: bbcMenu,
        active: true,
      }).returning();

      // Seed Initial Demo Reservation for BBC
      const [bbcCust] = await db.insert(customers).values({
        clientId: bbcClient.id,
        phoneNumber: '919511673214',
        customerName: 'Guest Client',
        birthday: '09-15',
        lastInboundInteraction: new Date().toISOString(),
        lastDinedAt: todayYmd,
      }).returning();

      await db.insert(bookings).values([
        {
          clientId: bbcClient.id,
          customerId: bbcCust.id,
          customerName: 'Guest Client',
          customerPhone: '919511673214',
          guests: 2,
          occasion: 'casual',
          date: todayYmd,
          time: '21:00',
          reservationCode: 'BBC-RES-1001',
          status: 'booked',
        }
      ]);

      console.log('✅ Seed: Inserted Real Restaurant Client: Big Bang Community (BBC).');
    }

    // ----------------------------------------------------
    // SEED SINGLE RESTAURANT (Backward Compatibility)
    // ----------------------------------------------------
    const existing = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.prefix, 'HOB'))
      .get();

    if (!existing) {
      const [inserted] = await db.insert(restaurants).values({
        name: 'House of Bhaves Rooftop & Lounge (HOB)',
        slug: 'hob-restaurant',
        address: 'Baner Road, Pune 411045',
        whatsappPhoneNumberId: config.whatsappPhoneNumberId || '1167895203082852',
        metaAccessToken: config.metaAccessToken || 'PLACEHOLDER_TOKEN',
        prefix: 'HOB',
        managerPhone: config.managerPhone || '919699533441',
        openingHoursLunch: '12:00-15:30',
        openingHoursDinner: '19:00-23:00',
        closedDays: 'monday',
        maxPaxNormal: 12,
        googleReviewUrl: 'https://maps.google.com',
        active: true,
      }).returning();
      console.log('✅ Seed: Inserted House of Bhaves (HOB) restaurant.');
    } else {
      const updates: Partial<typeof existing> = { name: 'House of Bhaves Rooftop & Lounge (HOB)', slug: 'hob-restaurant' };
      if (config.whatsappPhoneNumberId && config.whatsappPhoneNumberId !== existing.whatsappPhoneNumberId) {
        updates.whatsappPhoneNumberId = config.whatsappPhoneNumberId;
      }
      if (config.metaAccessToken && config.metaAccessToken !== existing.metaAccessToken) {
        updates.metaAccessToken = config.metaAccessToken;
      }
      if (config.managerPhone && config.managerPhone !== existing.managerPhone) {
        updates.managerPhone = config.managerPhone;
      }

      await db.update(restaurants).set(updates).where(eq(restaurants.id, existing.id));
    }

    // Ensure BBC exists in restaurants table (Evening post 7 PM ONLY)
    const bbcWelcome = `🌟 Welcome to Big Bang Community (BBC)!\n\nRelaxed outdoor seating, live music, sports screenings & delicious homestyle rice & pasta meals, dumplings & chicken!\n\nTap below to reserve your table instantly! 👇`;
    const bbcMenu = `🍽️ *Big Bang Community (BBC) — Menu & Specials* 🌟\n\n🥟 *Dumplings & Dim Sums*\n• Steamed Veg & Chicken Dumplings 🥟\n• Chilli Garlic Fried Dim Sums 🥟\n\n🍝 *Homestyle Rice & Pastas*\n• Creamy Alfredo & Arrabbiata Pasta 🍝\n• BBC Special Peri Peri Chicken Rice Bowl 🍚\n\n🍗 *Crispy Chicken & Bites*\n• Signature Korean Fried Chicken 🍗\n• Crunchy Wings Platter 🍗\n\n🍹 *Craft Drinks & Brews*\n• Cold Brew Shakerato & Tropical Fruit Punch 🍹\n\n✨ *Vibe & Amenities*: Outdoor Seating 🍃 • Live Music 🎵 • Live Sports Screening 📺`;

    const existingBbcRest = await db.select().from(restaurants).where(eq(restaurants.prefix, 'BBC')).get();
    if (!existingBbcRest) {
      await db.insert(restaurants).values({
        name: 'Big Bang Community (BBC)',
        slug: 'big-bang-community',
        address: 'Royale Heritage Mall, 4th Floor, off NIBM Road, Autadwadi Handewadi, Dorabjee Paradise, Mohammed Wadi, Pune, Maharashtra 411060 (Landmark: K Raheja Vista Centerpoint)',
        whatsappPhoneNumberId: config.whatsappPhoneNumberId || '1167895203082852',
        metaAccessToken: config.metaAccessToken || 'PLACEHOLDER_TOKEN',
        prefix: 'BBC',
        managerPhone: '919511673214',
        openingHoursLunch: '', // Closed for Lunch
        openingHoursDinner: '19:00-00:30', // Evening post 7 PM only
        closedDays: '',
        maxPaxNormal: 12,
        googleReviewUrl: 'https://maps.google.com/?q=Big+Bang+Community+Pune',
        customWelcomeText: bbcWelcome,
        customMenuText: bbcMenu,
        active: true,
      });
      console.log('✅ Seed: Inserted Big Bang Community (BBC) restaurant.');
    } else {
      await db.update(restaurants).set({
        openingHoursLunch: '', // Closed for Lunch
        openingHoursDinner: '19:00-00:30', // Evening post 7 PM only
        customWelcomeText: bbcWelcome,
        customMenuText: bbcMenu,
      }).where(eq(restaurants.id, existingBbcRest.id));
      console.log('✅ Seed: Updated BBC operating hours to Evening post 7 PM only.');
    }
  } catch (error) {
    console.error('❌ Seed error:', error);
  }
}

if (require.main === module) {
  initializeDatabase().then(() => seedDatabase());
}
