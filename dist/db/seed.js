"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = seedDatabase;
require("dotenv/config");
const connection_1 = require("./connection");
const schema_1 = require("./schema");
const drizzle_orm_1 = require("drizzle-orm");
const config_1 = require("../config");
const auth_1 = require("../middleware/auth");
async function seedDatabase() {
    try {
        const today = new Date();
        const todayYmd = today.toISOString().split('T')[0];
        // ----------------------------------------------------
        // SEED CLIENT: SMIZE DENTAL CLINIC (DR. KHARAT)
        // ----------------------------------------------------
        const smizeWelcome = `🦷 Welcome to Smize Dental Clinic & Implant Center (Dr. Kharat)!\n\nWhether it's a routine dental checkup, clear aligners, teeth whitening, or painless root canal — we've got you covered!\n\nTap below to reserve your appointment slot in 10 seconds! 👇`;
        const smizeTreatments = `🦷 *Smize Dental Clinic — Treatments & Services* ✨\n\n✨ *Smile Design & Aligners*\n• Clear Aligners & Invisible Braces 🦷\n• Laser Teeth Whitening & Polishing ✨\n• Dental Veneers & Cosmetic Makeovers 😁\n\n🩺 *General & Advanced Treatments*\n• Painless Root Canal Treatment (RCT) 💉\n• Dental Implants & Tooth Replacement 🦷\n• Scaling, Cleaning & Gum Care 🪥\n• Pediatric / Kids Dental Care 👶\n\nTap below to reserve your consultation slot! 👇`;
        let smizeClientRecord = await connection_1.db.select().from(schema_1.clients).where((0, drizzle_orm_1.eq)(schema_1.clients.slug, 'smize-dental')).get();
        if (!smizeClientRecord) {
            const [smizeClient] = await connection_1.db.insert(schema_1.clients).values({
                businessName: 'Smize Dental Clinic & Implant Center (Dr. Kharat)',
                slug: 'smize-dental',
                whatsappPhoneNumberId: config_1.config.whatsappPhoneNumberId || '1167895203082852',
                metaAccessToken: config_1.config.metaAccessToken || 'PLACEHOLDER_TOKEN',
                prefix: 'SMIZE',
                googleReviewUrl: 'https://maps.google.com/?q=Smize+Dental+Clinic',
                customWelcomeText: smizeWelcome,
                customMenuText: smizeTreatments,
                openingHoursLunch: '10:00-14:00', // Morning OPD
                openingHoursDinner: '17:00-21:00', // Evening OPD
                managerPhone: '919511673214',
            }).returning();
            smizeClientRecord = smizeClient;
            // Seed Initial Demo Appointment
            const [smizeCust] = await connection_1.db.insert(schema_1.customers).values({
                clientId: smizeClient.id,
                phoneNumber: '919511673214',
                customerName: 'Patient Client',
                birthday: '09-15',
                lastInboundInteraction: new Date().toISOString(),
                lastDinedAt: todayYmd,
            }).returning();
            await connection_1.db.insert(schema_1.bookings).values([
                {
                    clientId: smizeClient.id,
                    customerId: smizeCust.id,
                    customerName: 'Patient Client',
                    customerPhone: '919511673214',
                    guests: 1,
                    occasion: 'casual',
                    date: todayYmd,
                    time: '18:00',
                    reservationCode: 'SMIZE-RES-1001',
                    status: 'booked',
                }
            ]);
            console.log('✅ Seed: Inserted Client: Smize Dental Clinic & Implant Center (Dr. Kharat).');
        }
        // ----------------------------------------------------
        // SEED AUTH USERS (agency_admin & client_owner)
        // ----------------------------------------------------
        // 1. Seed Agency Admin User
        const adminEmail = 'admin@houseofbhaves.com';
        const existingAdmin = await connection_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, adminEmail)).get();
        if (!existingAdmin) {
            const adminHash = await (0, auth_1.hashPassword)('AdminPass123!');
            await connection_1.db.insert(schema_1.users).values({
                email: adminEmail,
                passwordHash: adminHash,
                role: 'agency_admin',
                clientId: null,
            });
            console.log('✅ Seed: Inserted default agency admin user (admin@houseofbhaves.com).');
        }
        // 2. Seed Smize Dental Client Owner User
        if (smizeClientRecord) {
            const smizeEmail = 'owner@smizedental.com';
            const existingSmizeUser = await connection_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, smizeEmail)).get();
            if (!existingSmizeUser) {
                const smizeHash = await (0, auth_1.hashPassword)('SmizePass123!');
                await connection_1.db.insert(schema_1.users).values({
                    email: smizeEmail,
                    passwordHash: smizeHash,
                    role: 'client_owner',
                    clientId: smizeClientRecord.id,
                });
                console.log('✅ Seed: Inserted client owner user for Smize Dental (owner@smizedental.com).');
            }
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