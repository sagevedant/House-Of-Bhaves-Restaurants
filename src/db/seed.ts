import 'dotenv/config';
import { db, initializeDatabase } from './connection';
import { restaurants, reservations } from './schema';
import { eq } from 'drizzle-orm';
import { config } from '../config';

export async function seedDatabase() {
  try {
    const existing = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.prefix, 'HOB'))
      .get();
      
    let restaurantId = existing?.id;

    if (!existing) {
      const [inserted] = await db.insert(restaurants).values({
        name: 'Spice Factory Rooftop & Lounge',
        slug: 'spice-factory',
        address: 'Baner Road, Pune 411045',
        whatsappPhoneNumberId: config.whatsappPhoneNumberId || 'PLACEHOLDER_PHONE_ID',
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
      console.log('✅ Seed: Inserted Spice Factory restaurant.');
    } else {
      const updates: Partial<typeof existing> = { slug: 'spice-factory' };
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
      console.log('✅ Seed: Updated restaurant credentials and slug in DB.');
    }

    // Seed demo reservations if empty
    const existingRes = await db.select().from(reservations).limit(1);
    if (existingRes.length === 0 && restaurantId) {
      const today = new Date().toISOString().split('T')[0];
      await db.insert(reservations).values([
        {
          restaurantId,
          customerName: 'Vedant Bhave',
          customerPhone: '919699533441',
          guests: 4,
          occasion: 'birthday',
          date: today,
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
          date: today,
          time: '21:00',
          reservationCode: 'HOB-RES-9102',
          stage: 'seated',
        },
        {
          restaurantId,
          customerName: 'Priya Patel',
          customerPhone: '919711244556',
          guests: 2,
          occasion: 'casual',
          date: today,
          time: '13:30',
          reservationCode: 'HOB-RES-3341',
          stage: 'completed',
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
