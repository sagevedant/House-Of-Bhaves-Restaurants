import 'dotenv/config';
import { db, initializeDatabase } from './connection';
import { restaurants, reservations, clients, customers, bookings } from './schema';
import { eq } from 'drizzle-orm';
import { config } from '../config';

export async function seedDatabase() {
  try {
    // ----------------------------------------------------
    // SEED COMMERCIAL AGENCY CLIENTS
    // ----------------------------------------------------
    const existingClient = await db.select().from(clients).where(eq(clients.slug, 'hob-restaurant')).get();
    
    const today = new Date();
    const nextResetObj = new Date();
    nextResetObj.setDate(today.getDate() + 25);
    const nextResetDate = nextResetObj.toISOString().split('T')[0];
    const todayYmd = today.toISOString().split('T')[0];

    if (!existingClient) {
      // 1. House of Bhaves (Tier 2 Quarterly Plan)
      const [hobClient] = await db.insert(clients).values({
        businessName: 'House of Bhaves Rooftop & Lounge (HOB)',
        slug: 'hob-restaurant',
        billingCycle: 'quarterly',
        outboundAllowanceMonthly: 1000,
        outboundSentThisMonth: 420,
        nextMonthlyResetDate: nextResetDate,
        whatsappPhoneNumberId: config.whatsappPhoneNumberId || '1167895203082852',
        metaAccessToken: config.metaAccessToken || 'PLACEHOLDER_TOKEN',
        prefix: 'HOB',
        googleReviewUrl: 'https://maps.google.com',
        active: true,
      }).returning();

      // 2. Garve Hyundai Showroom (Tier 1 Monthly Plan)
      await db.insert(clients).values({
        businessName: 'Garve Hyundai Showroom',
        slug: 'garve-hyundai',
        billingCycle: 'monthly',
        outboundAllowanceMonthly: 1000,
        outboundSentThisMonth: 850,
        nextMonthlyResetDate: nextResetDate,
        whatsappPhoneNumberId: '227890112345678',
        metaAccessToken: 'PLACEHOLDER_GARVE_TOKEN',
        prefix: 'GARVE',
        googleReviewUrl: 'https://maps.google.com',
        active: true,
      });

      // 3. Spice Factory Baner (Tier 1 Monthly Plan - Quota Limit Reached Demo)
      await db.insert(clients).values({
        businessName: 'Spice Factory Baner',
        slug: 'spice-factory',
        billingCycle: 'monthly',
        outboundAllowanceMonthly: 1000,
        outboundSentThisMonth: 1000, // Halts outbounds
        nextMonthlyResetDate: nextResetDate,
        whatsappPhoneNumberId: '334567890123456',
        metaAccessToken: 'PLACEHOLDER_SPICE_TOKEN',
        prefix: 'SPF',
        googleReviewUrl: 'https://maps.google.com',
        active: true,
      });

      // Seed Customers & Bookings for HOB
      const [cust1] = await db.insert(customers).values({
        clientId: hobClient.id,
        phoneNumber: '919699533441',
        customerName: 'Vedant Bhave',
        birthday: '08-05',
        anniversary: '12-14',
        lastInboundInteraction: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hrs ago (within 24h)
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
        },
        {
          clientId: hobClient.id,
          customerName: 'Amit Sharma',
          customerPhone: '919823011223',
          guests: 6,
          occasion: 'party',
          date: todayYmd,
          time: '21:00',
          reservationCode: 'HOB-RES-9102',
          status: 'seated',
          reviewScheduledAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // Ready for review queue
        }
      ]);

      console.log('✅ Seed: Inserted Commercial Agency Clients (HOB, Garve Hyundai, Spice Factory).');
    }

    // ----------------------------------------------------
    // SEED SINGLE RESTAURANT (Backward Compatibility)
    // ----------------------------------------------------
    const existing = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.prefix, 'HOB'))
      .get();
      
    let restaurantId = existing?.id;

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
      restaurantId = inserted.id;
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
      console.log('✅ Seed: Updated HOB restaurant credentials in DB.');
    }

    const existingRes = await db.select().from(reservations).limit(1);
    if (existingRes.length === 0 && restaurantId) {
      await db.insert(reservations).values([
        {
          restaurantId,
          customerName: 'Vedant Bhave',
          customerPhone: '919699533441',
          guests: 4,
          occasion: 'birthday',
          date: todayYmd,
          time: '20:30',
          reservationCode: 'HOB-RES-4891',
          stage: 'booked',
        },
        {
          restaurantId,
          customerName: 'Amit Sharma',
          customerPhone: '919823011223',
          guests: 6,
          occasion: 'party',
          date: todayYmd,
          time: '21:00',
          reservationCode: 'HOB-RES-9102',
          stage: 'seated',
        }
      ]);
      console.log('✅ Seed: Inserted initial demo reservations.');
    }
  } catch (error) {
    console.error('❌ Seed error:', error);
  }
}

if (require.main === module) {
  initializeDatabase().then(() => seedDatabase());
}
