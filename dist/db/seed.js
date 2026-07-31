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
        // ----------------------------------------------------
        // SEED COMMERCIAL AGENCY CLIENTS
        // ----------------------------------------------------
        const existingClient = await connection_1.db.select().from(schema_1.clients).where((0, drizzle_orm_1.eq)(schema_1.clients.slug, 'hob-restaurant')).get();
        const today = new Date();
        const nextResetObj = new Date();
        nextResetObj.setDate(today.getDate() + 25);
        const nextResetDate = nextResetObj.toISOString().split('T')[0];
        const todayYmd = today.toISOString().split('T')[0];
        if (!existingClient) {
            // 1. House of Bhaves (Tier 2 Quarterly Plan)
            const [hobClient] = await connection_1.db.insert(schema_1.clients).values({
                businessName: 'House of Bhaves Rooftop & Lounge (HOB)',
                slug: 'hob-restaurant',
                billingCycle: 'quarterly',
                outboundAllowanceMonthly: 1000,
                outboundSentThisMonth: 420,
                nextMonthlyResetDate: nextResetDate,
                whatsappPhoneNumberId: config_1.config.whatsappPhoneNumberId || '1167895203082852',
                metaAccessToken: config_1.config.metaAccessToken || 'PLACEHOLDER_TOKEN',
                prefix: 'HOB',
                googleReviewUrl: 'https://maps.google.com',
                active: true,
            }).returning();
            // 2. Garve Hyundai Showroom (Tier 1 Monthly Plan)
            await connection_1.db.insert(schema_1.clients).values({
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
            await connection_1.db.insert(schema_1.clients).values({
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
            const [cust1] = await connection_1.db.insert(schema_1.customers).values({
                clientId: hobClient.id,
                phoneNumber: '919699533441',
                customerName: 'Vedant Bhave',
                birthday: '08-05',
                anniversary: '12-14',
                lastInboundInteraction: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hrs ago (within 24h)
                lastDinedAt: todayYmd,
            }).returning();
            await connection_1.db.insert(schema_1.bookings).values([
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
                whatsappPhoneNumberId: config_1.config.whatsappPhoneNumberId || '1167895203082852',
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
            console.log('✅ Seed: Updated HOB restaurant credentials in DB.');
        }
        const existingRes = await connection_1.db.select().from(schema_1.reservations).limit(1);
        if (existingRes.length === 0 && restaurantId) {
            await connection_1.db.insert(schema_1.reservations).values([
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
    }
    catch (error) {
        console.error('❌ Seed error:', error);
    }
}
if (require.main === module) {
    (0, connection_1.initializeDatabase)().then(() => seedDatabase());
}
//# sourceMappingURL=seed.js.map