import 'dotenv/config';
import { db, initializeDatabase } from './connection';
import { restaurants } from './schema';
import { eq } from 'drizzle-orm';
import { config } from '../config';

export async function seedDatabase() {
  try {
    const existing = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.prefix, 'HOB'))
      .get();
      
    if (!existing) {
      await db.insert(restaurants).values({
        name: 'Spice Factory Rooftop & Lounge',
        address: 'Baner Road, Pune 411045',
        whatsappPhoneNumberId: config.whatsappPhoneNumberId || 'PLACEHOLDER_PHONE_ID',
        metaAccessToken: config.metaAccessToken || 'PLACEHOLDER_TOKEN',
        prefix: 'HOB',
        managerPhone: config.managerPhone || '919699533441',
        openingHoursLunch: '12:00-15:30',
        openingHoursDinner: '19:00-23:00',
        closedDays: 'monday',
        maxPaxNormal: 12,
        active: true,
      });
      console.log('✅ Seed: Inserted Spice Factory restaurant.');
    } else {
      // Auto-update credentials from environment variables if present
      const updates: Partial<typeof existing> = {};
      if (config.whatsappPhoneNumberId && config.whatsappPhoneNumberId !== existing.whatsappPhoneNumberId) {
        updates.whatsappPhoneNumberId = config.whatsappPhoneNumberId;
      }
      if (config.metaAccessToken && config.metaAccessToken !== existing.metaAccessToken) {
        updates.metaAccessToken = config.metaAccessToken;
      }
      if (config.managerPhone && config.managerPhone !== existing.managerPhone) {
        updates.managerPhone = config.managerPhone;
      }

      if (Object.keys(updates).length > 0) {
        await db.update(restaurants).set(updates).where(eq(restaurants.id, existing.id));
        console.log('✅ Seed: Updated restaurant credentials from Environment Variables in DB.');
      } else {
        console.log('ℹ️ Seed: Restaurant already up to date.');
      }
    }
  } catch (error) {
    console.error('❌ Seed error:', error);
  }
}

// Auto-run when called directly
if (require.main === module) {
  initializeDatabase().then(() => seedDatabase());
}
