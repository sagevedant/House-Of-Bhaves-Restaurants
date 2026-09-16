"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = exports.conversations = exports.bookings = exports.customers = exports.clients = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
// ----------------------------------------------------
// MULTI-TENANT AGENCY DATA LAYER
// ----------------------------------------------------
exports.clients = (0, sqlite_core_1.sqliteTable)('clients', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    businessName: (0, sqlite_core_1.text)('business_name').notNull(),
    slug: (0, sqlite_core_1.text)('slug').notNull().unique(),
    billingCycle: (0, sqlite_core_1.text)('billing_cycle', { enum: ['monthly', 'quarterly'] }).default('monthly'),
    outboundAllowanceMonthly: (0, sqlite_core_1.integer)('outbound_allowance_monthly').default(1000),
    outboundSentThisMonth: (0, sqlite_core_1.integer)('outbound_sent_this_month').default(0),
    nextMonthlyResetDate: (0, sqlite_core_1.text)('next_monthly_reset_date'), // YYYY-MM-DD
    wabaId: (0, sqlite_core_1.text)('waba_id'), // Meta WhatsApp Business Account ID (client-owned)
    whatsappPhoneNumberId: (0, sqlite_core_1.text)('whatsapp_phone_number_id').notNull(),
    metaAccessToken: (0, sqlite_core_1.text)('meta_access_token').notNull(),
    metaBusinessId: (0, sqlite_core_1.text)('meta_business_id'), // Client Meta Business Portfolio ID
    systemUserId: (0, sqlite_core_1.text)('system_user_id'), // Delegated System User ID
    embeddedSignupCompletedAt: (0, sqlite_core_1.text)('embedded_signup_completed_at'), // ISO string timestamp
    tokenExpiresAt: (0, sqlite_core_1.text)('token_expires_at'), // ISO string timestamp for token expiry tracking
    onboardingStatus: (0, sqlite_core_1.text)('onboarding_status', { enum: ['pending', 'connected', 'legacy', 'failed'] }).default('legacy'),
    prefix: (0, sqlite_core_1.text)('prefix').notNull().default('HOB'),
    address: (0, sqlite_core_1.text)('address').default(''),
    managerPhone: (0, sqlite_core_1.text)('manager_phone').default(''),
    googleReviewUrl: (0, sqlite_core_1.text)('google_review_url').default('https://maps.google.com'),
    customWelcomeText: (0, sqlite_core_1.text)('custom_welcome_text'),
    customMenuText: (0, sqlite_core_1.text)('custom_menu_text'),
    openingHoursLunch: (0, sqlite_core_1.text)('opening_hours_lunch').default(''),
    openingHoursDinner: (0, sqlite_core_1.text)('opening_hours_dinner').default('19:00-00:30'),
    active: (0, sqlite_core_1.integer)('active', { mode: 'boolean' }).default(true),
});
exports.customers = (0, sqlite_core_1.sqliteTable)('customers', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    clientId: (0, sqlite_core_1.integer)('client_id').notNull().references(() => exports.clients.id),
    phoneNumber: (0, sqlite_core_1.text)('phone_number').notNull(),
    customerName: (0, sqlite_core_1.text)('customer_name'),
    birthday: (0, sqlite_core_1.text)('birthday'), // MM-DD format, e.g. "07-28"
    anniversary: (0, sqlite_core_1.text)('anniversary'), // MM-DD format
    lastInboundInteraction: (0, sqlite_core_1.text)('last_inbound_interaction'), // ISO string for 24h Meta Customer Service Window
    birthdayDiscountClaimedYear: (0, sqlite_core_1.integer)('birthday_discount_claimed_year'),
    lastDinedAt: (0, sqlite_core_1.text)('last_dined_at'), // YYYY-MM-DD
    updatedAt: (0, sqlite_core_1.text)('updated_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
    idxCustomersPhoneClient: (0, sqlite_core_1.index)('idx_customers_phone_client').on(table.phoneNumber, table.clientId),
}));
exports.bookings = (0, sqlite_core_1.sqliteTable)('bookings', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    clientId: (0, sqlite_core_1.integer)('client_id').notNull().references(() => exports.clients.id),
    customerId: (0, sqlite_core_1.integer)('customer_id').references(() => exports.customers.id),
    customerName: (0, sqlite_core_1.text)('customer_name'),
    customerPhone: (0, sqlite_core_1.text)('customer_phone').notNull(),
    guests: (0, sqlite_core_1.integer)('guests').notNull().default(2),
    occasion: (0, sqlite_core_1.text)('occasion', {
        enum: ['casual', 'birthday', 'anniversary', 'corporate', 'party'],
    }).default('casual'),
    bookingTimestamp: (0, sqlite_core_1.text)('booking_timestamp'), // ISO string
    date: (0, sqlite_core_1.text)('date').notNull(), // YYYY-MM-DD
    time: (0, sqlite_core_1.text)('time').notNull(), // HH:MM (24h)
    reservationCode: (0, sqlite_core_1.text)('reservation_code').unique(),
    status: (0, sqlite_core_1.text)('status', {
        enum: ['booked', 'seated', 'completed', 'no_show', 'cancelled'],
    }).default('booked'),
    specialRequest: (0, sqlite_core_1.text)('special_request'),
    reviewSent: (0, sqlite_core_1.integer)('review_sent', { mode: 'boolean' }).default(false),
    reviewScheduledAt: (0, sqlite_core_1.text)('review_scheduled_at'), // ISO string for 2-hour delay queue
    createdAt: (0, sqlite_core_1.text)('created_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
    idxBookingsStatus: (0, sqlite_core_1.index)('idx_bookings_status').on(table.status),
    idxBookingsDate: (0, sqlite_core_1.index)('idx_bookings_date').on(table.date),
    idxBookingsClientId: (0, sqlite_core_1.index)('idx_bookings_client_id').on(table.clientId),
}));
exports.conversations = (0, sqlite_core_1.sqliteTable)('conversations', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    phone: (0, sqlite_core_1.text)('phone').notNull(),
    clientId: (0, sqlite_core_1.integer)('client_id').notNull().references(() => exports.clients.id),
    customerName: (0, sqlite_core_1.text)('customer_name'),
    currentStep: (0, sqlite_core_1.text)('current_step', {
        enum: ['entry', 'guests', 'occasion', 'datetime_date', 'datetime_time', 'confirm', 'finalized'],
    }).default('entry'),
    stepData: (0, sqlite_core_1.text)('step_data').default('{}'), // JSON string
    interruptedStep: (0, sqlite_core_1.text)('interrupted_step'),
    birthdayDiscountClaimedYear: (0, sqlite_core_1.integer)('birthday_discount_claimed_year'),
    lastDinedAt: (0, sqlite_core_1.text)('last_dined_at'), // YYYY-MM-DD
    updatedAt: (0, sqlite_core_1.text)('updated_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
    idxConversationsPhoneClient: (0, sqlite_core_1.index)('idx_conversations_phone_client').on(table.phone, table.clientId),
}));
exports.users = (0, sqlite_core_1.sqliteTable)('users', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    email: (0, sqlite_core_1.text)('email').notNull().unique(),
    passwordHash: (0, sqlite_core_1.text)('password_hash').notNull(),
    role: (0, sqlite_core_1.text)('role', { enum: ['agency_admin', 'client_owner'] }).notNull().default('client_owner'),
    clientId: (0, sqlite_core_1.integer)('client_id').references(() => exports.clients.id),
    createdAt: (0, sqlite_core_1.text)('created_at').$defaultFn(() => new Date().toISOString()),
    updatedAt: (0, sqlite_core_1.text)('updated_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
    idxUsersEmail: (0, sqlite_core_1.index)('idx_users_email').on(table.email),
    idxUsersClientId: (0, sqlite_core_1.index)('idx_users_client_id').on(table.clientId),
}));
//# sourceMappingURL=schema.js.map