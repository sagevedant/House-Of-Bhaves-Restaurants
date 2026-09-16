"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = seedDatabase;
require("dotenv/config");
const connection_1 = require("./connection");
const schema_1 = require("./schema");
const drizzle_orm_1 = require("drizzle-orm");
const config_1 = require("../config");
async function seedDatabase() {
    try {
        const today = new Date();
        const nextResetObj = new Date();
        nextResetObj.setDate(today.getDate() + 30);
        const nextResetDate = nextResetObj.toISOString().split('T')[0];
        const todayYmd = today.toISOString().split('T')[0];
        // ----------------------------------------------------
        // SEED CLIENT: SMIZE DENTAL CLINIC (DR. KHARAT)
        // ----------------------------------------------------
        const smizeWelcome = `🦷 Welcome to Smize Dental Clinic & Implant Center (Dr. Kharat)!\n\nWhether it's a routine dental checkup, clear aligners, teeth whitening, or painless root canal — we've got you covered!\n\nTap below to reserve your appointment slot in 10 seconds! 👇`;
        const smizeTreatments = `🦷 *Smize Dental Clinic — Treatments & Services* ✨\n\n✨ *Smile Design & Aligners*\n• Clear Aligners & Invisible Braces 🦷\n• Laser Teeth Whitening & Polishing ✨\n• Dental Veneers & Cosmetic Makeovers 😁\n\n🩺 *General & Advanced Treatments*\n• Painless Root Canal Treatment (RCT) 💉\n• Dental Implants & Tooth Replacement 🦷\n• Scaling, Cleaning & Gum Care 🪥\n• Pediatric / Kids Dental Care 👶\n\nTap below to reserve your consultation slot! 👇`;
        const existingSmizeClient = await connection_1.db.select().from(schema_1.clients).where((0, drizzle_orm_1.eq)(schema_1.clients.slug, 'smize-dental')).get();
        if (!existingSmizeClient) {
            const [smizeClient] = await connection_1.db.insert(schema_1.clients).values({
                businessName: 'Smize Dental Clinic & Implant Center (Dr. Kharat)',
                slug: 'smize-dental',
                billingCycle: 'quarterly',
                outboundAllowanceMonthly: 1000,
                outboundSentThisMonth: 0,
                nextMonthlyResetDate: nextResetDate,
                whatsappPhoneNumberId: config_1.config.whatsappPhoneNumberId || '1167895203082852',
                metaAccessToken: config_1.config.metaAccessToken || 'PLACEHOLDER_TOKEN',
                prefix: 'SMIZE',
                googleReviewUrl: 'https://maps.google.com/?q=Smize+Dental+Clinic',
                customWelcomeText: smizeWelcome,
                customMenuText: smizeTreatments,
                openingHoursLunch: '10:00-14:00', // Morning OPD
                openingHoursDinner: '17:00-21:00', // Evening OPD
                active: true,
            }).returning();
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
        // Ensure Smize Dental exists in restaurants table (for single router lookup)
        const existingSmizeRest = await connection_1.db.select().from(schema_1.restaurants).where((0, drizzle_orm_1.eq)(schema_1.restaurants.slug, 'smize-dental')).get();
        if (!existingSmizeRest) {
            await connection_1.db.insert(schema_1.restaurants).values({
                name: 'Smize Dental Clinic & Implant Center (Dr. Kharat)',
                slug: 'smize-dental',
                address: 'Pune, Maharashtra',
                whatsappPhoneNumberId: config_1.config.whatsappPhoneNumberId || '1167895203082852',
                metaAccessToken: config_1.config.metaAccessToken || 'PLACEHOLDER_TOKEN',
                prefix: 'SMIZE',
                managerPhone: '919511673214',
                openingHoursLunch: '10:00-14:00', // Morning OPD
                openingHoursDinner: '17:00-21:00', // Evening OPD
                closedDays: 'sunday',
                maxPaxNormal: 12,
                googleReviewUrl: 'https://maps.google.com/?q=Smize+Dental+Clinic',
                customWelcomeText: smizeWelcome,
                customMenuText: smizeTreatments,
                active: true,
            });
            console.log('✅ Seed: Inserted Smize Dental Clinic into restaurants.');
        }
        else {
            await connection_1.db.update(schema_1.restaurants).set({
                name: 'Smize Dental Clinic & Implant Center (Dr. Kharat)',
                openingHoursLunch: '10:00-14:00',
                openingHoursDinner: '17:00-21:00',
                customWelcomeText: smizeWelcome,
                customMenuText: smizeTreatments,
            }).where((0, drizzle_orm_1.eq)(schema_1.restaurants.id, existingSmizeRest.id));
        }
        // ----------------------------------------------------
        // SEED AUTH USERS (agency_admin & client_owner)
        // ----------------------------------------------------
        const { users } = await Promise.resolve().then(() => __importStar(require('./schema')));
        const { hashPassword } = await Promise.resolve().then(() => __importStar(require('../middleware/auth')));
        // 1. Seed Agency Admin User
        const adminEmail = 'admin@houseofbhaves.com';
        const existingAdmin = await connection_1.db.select().from(users).where((0, drizzle_orm_1.eq)(users.email, adminEmail)).get();
        if (!existingAdmin) {
            const adminHash = await hashPassword('AdminPass123!');
            await connection_1.db.insert(users).values({
                email: adminEmail,
                passwordHash: adminHash,
                role: 'agency_admin',
                clientId: null,
            });
            console.log('✅ Seed: Inserted default agency admin user (admin@houseofbhaves.com).');
        }
        // 2. Seed Smize Dental Client Owner User
        const smizeClientRecord = await connection_1.db.select().from(schema_1.clients).where((0, drizzle_orm_1.eq)(schema_1.clients.slug, 'smize-dental')).get();
        if (smizeClientRecord) {
            const smizeEmail = 'owner@smizedental.com';
            const existingSmizeUser = await connection_1.db.select().from(users).where((0, drizzle_orm_1.eq)(users.email, smizeEmail)).get();
            if (!existingSmizeUser) {
                const smizeHash = await hashPassword('SmizePass123!');
                await connection_1.db.insert(users).values({
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