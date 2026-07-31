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
        // SEED REAL COMMERCIAL RESTAURANT CLIENTS
        // ----------------------------------------------------
        const existingClient = await connection_1.db.select().from(schema_1.clients).where((0, drizzle_orm_1.eq)(schema_1.clients.slug, 'hob-restaurant')).get();
        const existingBbcClient = await connection_1.db.select().from(schema_1.clients).where((0, drizzle_orm_1.eq)(schema_1.clients.slug, 'big-bang-community')).get();
        const today = new Date();
        const nextResetObj = new Date();
        nextResetObj.setDate(today.getDate() + 30);
        const nextResetDate = nextResetObj.toISOString().split('T')[0];
        const todayYmd = today.toISOString().split('T')[0];
        if (!existingClient) {
            // 1. House of Bhaves Rooftop & Lounge (HOB)
            const [hobClient] = await connection_1.db.insert(schema_1.clients).values({
                businessName: 'House of Bhaves Rooftop & Lounge (HOB)',
                slug: 'hob-restaurant',
                billingCycle: 'quarterly',
                outboundAllowanceMonthly: 1000,
                outboundSentThisMonth: 0,
                nextMonthlyResetDate: nextResetDate,
                whatsappPhoneNumberId: config_1.config.whatsappPhoneNumberId || '1167895203082852',
                metaAccessToken: config_1.config.metaAccessToken || 'PLACEHOLDER_TOKEN',
                prefix: 'HOB',
                googleReviewUrl: 'https://maps.google.com',
                active: true,
            }).returning();
            // Seed Real Initial Customer & Booking for HOB
            const [cust1] = await connection_1.db.insert(schema_1.customers).values({
                clientId: hobClient.id,
                phoneNumber: '919699533441',
                customerName: 'Vedant Bhave',
                birthday: '08-05',
                anniversary: '12-14',
                lastInboundInteraction: new Date().toISOString(),
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
                }
            ]);
            console.log('✅ Seed: Inserted Real Restaurant Client: House of Bhaves (HOB).');
        }
        if (!existingBbcClient) {
            // 2. Big Bang Community (BBC)
            const bbcWelcome = `🌟 Welcome to Big Bang Community (BBC)!\n\nRelaxed outdoor seating, live music, sports screenings & delicious homestyle rice & pasta meals, dumplings & chicken!\n\nTap below to reserve your table instantly! 👇`;
            const bbcMenu = `🍽️ *Big Bang Community (BBC) — Menu & Specials* 🌟\n\n🥟 *Dumplings & Dim Sums*\n• Steamed Veg & Chicken Dumplings 🥟\n• Chilli Garlic Fried Dim Sums 🥟\n\n🍝 *Homestyle Rice & Pastas*\n• Creamy Alfredo & Arrabbiata Pasta 🍝\n• BBC Special Peri Peri Chicken Rice Bowl 🍚\n\n🍗 *Crispy Chicken & Bites*\n• Signature Korean Fried Chicken 🍗\n• Crunchy Wings Platter 🍗\n\n🍹 *Craft Drinks & Brews*\n• Cold Brew Shakerato & Tropical Fruit Punch 🍹\n\n✨ *Vibe & Amenities*: Outdoor Seating 🍃 • Live Music 🎵 • Live Sports Screening 📺`;
            const [bbcClient] = await connection_1.db.insert(schema_1.clients).values({
                businessName: 'Big Bang Community (BBC)',
                slug: 'big-bang-community',
                billingCycle: 'monthly',
                outboundAllowanceMonthly: 1000,
                outboundSentThisMonth: 0,
                nextMonthlyResetDate: nextResetDate,
                whatsappPhoneNumberId: config_1.config.whatsappPhoneNumberId || '1167895203082852',
                metaAccessToken: config_1.config.metaAccessToken || 'PLACEHOLDER_TOKEN',
                prefix: 'BBC',
                googleReviewUrl: 'https://maps.google.com/?q=Big+Bang+Community+Pune',
                customWelcomeText: bbcWelcome,
                customMenuText: bbcMenu,
                active: true,
            }).returning();
            // Seed Initial Demo Reservation for BBC
            const [bbcCust] = await connection_1.db.insert(schema_1.customers).values({
                clientId: bbcClient.id,
                phoneNumber: '919511673214',
                customerName: 'Guest Client',
                birthday: '09-15',
                lastInboundInteraction: new Date().toISOString(),
                lastDinedAt: todayYmd,
            }).returning();
            await connection_1.db.insert(schema_1.bookings).values([
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
        }
        // Also ensure BBC exists in restaurants table
        const existingBbcRest = await connection_1.db.select().from(schema_1.restaurants).where((0, drizzle_orm_1.eq)(schema_1.restaurants.prefix, 'BBC')).get();
        if (!existingBbcRest) {
            const bbcWelcome = `🌟 Welcome to Big Bang Community (BBC)!\n\nRelaxed outdoor seating, live music, sports screenings & delicious homestyle rice & pasta meals, dumplings & chicken!\n\nTap below to reserve your table instantly! 👇`;
            const bbcMenu = `🍽️ *Big Bang Community (BBC) — Menu & Specials* 🌟\n\n🥟 *Dumplings & Dim Sums*\n• Steamed Veg & Chicken Dumplings 🥟\n• Chilli Garlic Fried Dim Sums 🥟\n\n🍝 *Homestyle Rice & Pastas*\n• Creamy Alfredo & Arrabbiata Pasta 🍝\n• BBC Special Peri Peri Chicken Rice Bowl 🍚\n\n🍗 *Crispy Chicken & Bites*\n• Signature Korean Fried Chicken 🍗\n• Crunchy Wings Platter 🍗\n\n🍹 *Craft Drinks & Brews*\n• Cold Brew Shakerato & Tropical Fruit Punch 🍹\n\n✨ *Vibe & Amenities*: Outdoor Seating 🍃 • Live Music 🎵 • Live Sports Screening 📺`;
            await connection_1.db.insert(schema_1.restaurants).values({
                name: 'Big Bang Community (BBC)',
                slug: 'big-bang-community',
                address: 'Royale Heritage Mall, 4th Floor, off NIBM Road, Autadwadi Handewadi, Dorabjee Paradise, Mohammed Wadi, Pune, Maharashtra 411060 (Landmark: K Raheja Vista Centerpoint)',
                whatsappPhoneNumberId: config_1.config.whatsappPhoneNumberId || '1167895203082852',
                metaAccessToken: config_1.config.metaAccessToken || 'PLACEHOLDER_TOKEN',
                prefix: 'BBC',
                managerPhone: '919511673214',
                openingHoursLunch: '12:00-16:00',
                openingHoursDinner: '18:00-00:30',
                closedDays: '',
                maxPaxNormal: 12,
                googleReviewUrl: 'https://maps.google.com/?q=Big+Bang+Community+Pune',
                customWelcomeText: bbcWelcome,
                customMenuText: bbcMenu,
                active: true,
            });
            console.log('✅ Seed: Inserted Big Bang Community (BBC) restaurant.');
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