"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = seedDatabase;
require("dotenv/config");
const connection_1 = require("./connection");
const schema_1 = require("./schema");
const drizzle_orm_1 = require("drizzle-orm");
const config_1 = require("../config");
async function seedDatabase() {
    try {
        const existing = await connection_1.db
            .select()
            .from(schema_1.restaurants)
            .where((0, drizzle_orm_1.eq)(schema_1.restaurants.prefix, 'HOB'))
            .get();
        let restaurantId = existing?.id;
        if (!existing) {
            const [inserted] = await connection_1.db.insert(schema_1.restaurants).values({
                name: 'House of Bhaves Rooftop & Lounge (HOB)',
                slug: 'hob-restaurant',
                address: 'Baner Road, Pune 411045',
                whatsappPhoneNumberId: config_1.config.whatsappPhoneNumberId || 'PLACEHOLDER_PHONE_ID',
                metaAccessToken: config_1.config.metaAccessToken || 'PLACEHOLDER_TOKEN',
                prefix: 'HOB',
                managerPhone: config_1.config.managerPhone || '919699533441',
                openingHoursLunch: '12:00-15:30',
                openingHoursDinner: '19:00-23:00',
                closedDays: 'monday',
                maxPaxNormal: 12,
                googleReviewUrl: 'https://maps.google.com',
                active: true,
            }).returning();
            restaurantId = inserted.id;
            console.log('✅ Seed: Inserted House of Bhaves (HOB) restaurant.');
        }
        else {
            const updates = { name: 'House of Bhaves Rooftop & Lounge (HOB)', slug: 'hob-restaurant' };
            if (config_1.config.whatsappPhoneNumberId && config_1.config.whatsappPhoneNumberId !== existing.whatsappPhoneNumberId) {
                updates.whatsappPhoneNumberId = config_1.config.whatsappPhoneNumberId;
            }
            if (config_1.config.metaAccessToken && config_1.config.metaAccessToken !== existing.metaAccessToken) {
                updates.metaAccessToken = config_1.config.metaAccessToken;
            }
            if (config_1.config.managerPhone && config_1.config.managerPhone !== existing.managerPhone) {
                updates.managerPhone = config_1.config.managerPhone;
            }
            await connection_1.db.update(schema_1.restaurants).set(updates).where((0, drizzle_orm_1.eq)(schema_1.restaurants.id, existing.id));
            console.log('✅ Seed: Updated HOB restaurant credentials and slug in DB.');
        }
        // Seed demo reservations if empty
        const existingRes = await connection_1.db.select().from(schema_1.reservations).limit(1);
        if (existingRes.length === 0 && restaurantId) {
            const today = new Date().toISOString().split('T')[0];
            await connection_1.db.insert(schema_1.reservations).values([
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
    }
    catch (error) {
        console.error('❌ Seed error:', error);
    }
}
if (require.main === module) {
    (0, connection_1.initializeDatabase)().then(() => seedDatabase());
}
//# sourceMappingURL=seed.js.map