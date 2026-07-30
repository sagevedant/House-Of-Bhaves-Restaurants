"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reservations = exports.conversations = exports.restaurants = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
exports.restaurants = (0, sqlite_core_1.sqliteTable)('restaurants', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    name: (0, sqlite_core_1.text)('name').notNull(),
    slug: (0, sqlite_core_1.text)('slug').notNull().default('spice-factory'),
    address: (0, sqlite_core_1.text)('address').notNull(),
    whatsappPhoneNumberId: (0, sqlite_core_1.text)('whatsapp_phone_number_id').notNull().unique(),
    metaAccessToken: (0, sqlite_core_1.text)('meta_access_token').notNull(),
    prefix: (0, sqlite_core_1.text)('prefix').notNull(),
    managerPhone: (0, sqlite_core_1.text)('manager_phone'),
    openingHoursLunch: (0, sqlite_core_1.text)('opening_hours_lunch').default('12:00-15:30'),
    openingHoursDinner: (0, sqlite_core_1.text)('opening_hours_dinner').default('19:00-23:00'),
    closedDays: (0, sqlite_core_1.text)('closed_days').default(''),
    maxPaxNormal: (0, sqlite_core_1.integer)('max_pax_normal').default(12),
    googleReviewUrl: (0, sqlite_core_1.text)('google_review_url').default('https://maps.google.com'),
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