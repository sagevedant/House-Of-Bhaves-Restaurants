"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reservations = exports.conversations = exports.restaurants = exports.bookings = exports.customers = exports.clients = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
// ----------------------------------------------------
// COMMERCIAL AGENCY LAYER (Tiers, Quotas, Customers, Bookings)
// ----------------------------------------------------
exports.clients = (0, sqlite_core_1.sqliteTable)('clients', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    businessName: (0, sqlite_core_1.text)('business_name').notNull(),
    slug: (0, sqlite_core_1.text)('slug').notNull().unique(),
    billingCycle: (0, sqlite_core_1.text)('billing_cycle', { enum: ['monthly', 'quarterly'] }).default('monthly'),
    outboundAllowanceMonthly: (0, sqlite_core_1.integer)('outbound_allowance_monthly').default(1000),
    outboundSentThisMonth: (0, sqlite_core_1.integer)('outbound_sent_this_month').default(0),
    nextMonthlyResetDate: (0, sqlite_core_1.text)('next_monthly_reset_date'), // YYYY-MM-DD
    whatsappPhoneNumberId: (0, sqlite_core_1.text)('whatsapp_phone_number_id').notNull(),
    metaAccessToken: (0, sqlite_core_1.text)('meta_access_token').notNull(),
    prefix: (0, sqlite_core_1.text)('prefix').notNull().default('HOB'),
    googleReviewUrl: (0, sqlite_core_1.text)('google_review_url').default('https://maps.google.com'),
    customWelcomeText: (0, sqlite_core_1.text)('custom_welcome_text'),
    customMenuText: (0, sqlite_core_1.text)('custom_menu_text'),
    active: (0, sqlite_core_1.integer)('active', { mode: 'boolean' }).default(true),
});
exports.customers = (0, sqlite_core_1.sqliteTable)('customers', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    clientId: (0, sqlite_core_1.integer)('client_id').notNull().references(() => exports.clients.id),
    phoneNumber: (0, sqlite_core_1.text)('phone_number').notNull(),
    customerName: (0, sqlite_core_1.text)('customer_name'),
    birthday: (0, sqlite_core_1.text)('birthday'), // MM-DD format, e.g. "07-28"
    anniversary: (0, sqlite_core_1.text)('anniversary'), // MM-DD format
    lastInboundInteraction: (0, sqlite_core_1.text)('last_inbound_interaction'), // ISO timestamp
    birthdayDiscountClaimedYear: (0, sqlite_core_1.integer)('birthday_discount_claimed_year'),
    lastDinedAt: (0, sqlite_core_1.text)('last_dined_at'), // YYYY-MM-DD
    updatedAt: (0, sqlite_core_1.text)('updated_at').$defaultFn(() => new Date().toISOString())
}, (table) => {
    return {
        phoneClientIdx: (0, sqlite_core_1.index)('idx_customers_phone_client').on(table.phoneNumber, table.clientId)
    };
});
exports.bookings = (0, sqlite_core_1.sqliteTable)('bookings', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    clientId: (0, sqlite_core_1.integer)('client_id').notNull().references(() => exports.clients.id),
    customerId: (0, sqlite_core_1.integer)('customer_id').references(() => exports.customers.id),
    customerName: (0, sqlite_core_1.text)('customer_name'),
    customerPhone: (0, sqlite_core_1.text)('customer_phone').notNull(),
    guests: (0, sqlite_core_1.integer)('guests').notNull().default(2),
    occasion: (0, sqlite_core_1.text)('occasion', { enum: ['casual', 'birthday', 'anniversary', 'corporate', 'party'] }).default('casual'),
    bookingTimestamp: (0, sqlite_core_1.text)('booking_timestamp').$defaultFn(() => new Date().toISOString()),
    date: (0, sqlite_core_1.text)('date').notNull(),
    time: (0, sqlite_core_1.text)('time').notNull(),
    reservationCode: (0, sqlite_core_1.text)('reservation_code').unique(),
    status: (0, sqlite_core_1.text)('status', { enum: ['booked', 'seated', 'completed', 'no_show', 'cancelled'] }).default('booked'),
    specialRequest: (0, sqlite_core_1.text)('special_request'),
    reviewSent: (0, sqlite_core_1.integer)('review_sent', { mode: 'boolean' }).default(false),
    reviewScheduledAt: (0, sqlite_core_1.text)('review_scheduled_at'), // ISO timestamp for 2-hr delay queue
    createdAt: (0, sqlite_core_1.text)('created_at').$defaultFn(() => new Date().toISOString())
}, (table) => {
    return {
        statusIdx: (0, sqlite_core_1.index)('idx_bookings_status').on(table.status),
        dateIdx: (0, sqlite_core_1.index)('idx_bookings_date').on(table.date)
    };
});
// ----------------------------------------------------
// LEGACY / SINGLE RESTAURANT SCHEMA (Maintained for full backward compatibility)
// ----------------------------------------------------
exports.restaurants = (0, sqlite_core_1.sqliteTable)('restaurants', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    name: (0, sqlite_core_1.text)('name').notNull(),
    slug: (0, sqlite_core_1.text)('slug').notNull().default('hob-restaurant'),
    address: (0, sqlite_core_1.text)('address').notNull(),
    whatsappPhoneNumberId: (0, sqlite_core_1.text)('whatsapp_phone_number_id').notNull(),
    metaAccessToken: (0, sqlite_core_1.text)('meta_access_token').notNull(),
    prefix: (0, sqlite_core_1.text)('prefix').notNull(),
    managerPhone: (0, sqlite_core_1.text)('manager_phone'),
    openingHoursLunch: (0, sqlite_core_1.text)('opening_hours_lunch').default('12:00-15:30'),
    openingHoursDinner: (0, sqlite_core_1.text)('opening_hours_dinner').default('19:00-23:00'),
    closedDays: (0, sqlite_core_1.text)('closed_days').default(''),
    maxPaxNormal: (0, sqlite_core_1.integer)('max_pax_normal').default(12),
    googleReviewUrl: (0, sqlite_core_1.text)('google_review_url').default('https://maps.google.com'),
    customWelcomeText: (0, sqlite_core_1.text)('custom_welcome_text'),
    customMenuText: (0, sqlite_core_1.text)('custom_menu_text'),
    active: (0, sqlite_core_1.integer)('active', { mode: 'boolean' }).default(true),
});
exports.conversations = (0, sqlite_core_1.sqliteTable)('conversations', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    phone: (0, sqlite_core_1.text)('phone').notNull(),
    restaurantId: (0, sqlite_core_1.integer)('restaurant_id').notNull().references(() => exports.restaurants.id),
    customerName: (0, sqlite_core_1.text)('customer_name'),
    currentStep: (0, sqlite_core_1.text)('current_step', { enum: ['entry', 'guests', 'occasion', 'datetime_date', 'datetime_time', 'confirm', 'finalized'] }).default('entry'),
    stepData: (0, sqlite_core_1.text)('step_data').default('{}'),
    interruptedStep: (0, sqlite_core_1.text)('interrupted_step'),
    birthdayDiscountClaimedYear: (0, sqlite_core_1.integer)('birthday_discount_claimed_year'),
    lastDinedAt: (0, sqlite_core_1.text)('last_dined_at'),
    updatedAt: (0, sqlite_core_1.text)('updated_at').$defaultFn(() => new Date().toISOString())
}, (table) => {
    return {
        phoneRestaurantIdx: (0, sqlite_core_1.index)('idx_conversations_phone_restaurant').on(table.phone, table.restaurantId)
    };
});
exports.reservations = (0, sqlite_core_1.sqliteTable)('reservations', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    restaurantId: (0, sqlite_core_1.integer)('restaurant_id').notNull().references(() => exports.restaurants.id),
    customerName: (0, sqlite_core_1.text)('customer_name'),
    customerPhone: (0, sqlite_core_1.text)('customer_phone').notNull(),
    guests: (0, sqlite_core_1.integer)('guests').notNull().default(2),
    occasion: (0, sqlite_core_1.text)('occasion', { enum: ['casual', 'birthday', 'anniversary', 'corporate', 'party'] }).default('casual'),
    date: (0, sqlite_core_1.text)('date').notNull(),
    time: (0, sqlite_core_1.text)('time').notNull(),
    reservationCode: (0, sqlite_core_1.text)('reservation_code').unique(),
    stage: (0, sqlite_core_1.text)('stage', { enum: ['booked', 'seated', 'reminded', 'completed', 'no_show', 'cancelled'] }).default('booked'),
    specialRequest: (0, sqlite_core_1.text)('special_request'),
    reviewSent: (0, sqlite_core_1.integer)('review_sent', { mode: 'boolean' }).default(false),
    createdAt: (0, sqlite_core_1.text)('created_at').$defaultFn(() => new Date().toISOString())
}, (table) => {
    return {
        stageIdx: (0, sqlite_core_1.index)('idx_reservations_stage').on(table.stage),
        dateIdx: (0, sqlite_core_1.index)('idx_reservations_date').on(table.date)
    };
});
//# sourceMappingURL=schema.js.map