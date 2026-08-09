import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core';

// ----------------------------------------------------
// COMMERCIAL AGENCY LAYER (Tiers, Quotas, Customers, Bookings)
// ----------------------------------------------------

export const clients = sqliteTable('clients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  businessName: text('business_name').notNull(),
  slug: text('slug').notNull().unique(),
  billingCycle: text('billing_cycle', { enum: ['monthly', 'quarterly'] }).default('monthly'),
  outboundAllowanceMonthly: integer('outbound_allowance_monthly').default(1000),
  outboundSentThisMonth: integer('outbound_sent_this_month').default(0),
  nextMonthlyResetDate: text('next_monthly_reset_date'), // YYYY-MM-DD
  whatsappPhoneNumberId: text('whatsapp_phone_number_id').notNull(),
  metaAccessToken: text('meta_access_token').notNull(),
  prefix: text('prefix').notNull().default('HOB'),
  googleReviewUrl: text('google_review_url').default('https://maps.google.com'),
  customWelcomeText: text('custom_welcome_text'),
  customMenuText: text('custom_menu_text'),
  openingHoursLunch: text('opening_hours_lunch').default(''),
  openingHoursDinner: text('opening_hours_dinner').default('19:00-00:30'),
  active: integer('active', { mode: 'boolean' }).default(true),
});

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: integer('client_id').notNull().references(() => clients.id),
  phoneNumber: text('phone_number').notNull(),
  customerName: text('customer_name'),
  birthday: text('birthday'), // MM-DD format, e.g. "07-28"
  anniversary: text('anniversary'), // MM-DD format
  lastInboundInteraction: text('last_inbound_interaction'), // ISO string for 24h Meta Customer Service Window
  birthdayDiscountClaimedYear: integer('birthday_discount_claimed_year'),
  lastDinedAt: text('last_dined_at'), // YYYY-MM-DD
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  idxCustomersPhoneClient: index('idx_customers_phone_client').on(table.phoneNumber, table.clientId),
}));

export const bookings = sqliteTable('bookings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: integer('client_id').notNull().references(() => clients.id),
  customerId: integer('customer_id').references(() => customers.id),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone').notNull(),
  guests: integer('guests').notNull().default(2),
  occasion: text('occasion', {
    enum: ['casual', 'birthday', 'anniversary', 'corporate', 'party'],
  }).default('casual'),
  bookingTimestamp: text('booking_timestamp'), // ISO string
  date: text('date').notNull(), // YYYY-MM-DD
  time: text('time').notNull(), // HH:MM (24h)
  reservationCode: text('reservation_code').unique(),
  status: text('status', {
    enum: ['booked', 'seated', 'completed', 'no_show', 'cancelled'],
  }).default('booked'),
  specialRequest: text('special_request'),
  reviewSent: integer('review_sent', { mode: 'boolean' }).default(false),
  reviewScheduledAt: text('review_scheduled_at'), // ISO string for 2-hour delay queue
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  idxBookingsStatus: index('idx_bookings_status').on(table.status),
  idxBookingsDate: index('idx_bookings_date').on(table.date),
}));

// ----------------------------------------------------
// SINGLE RESTAURANT LAYER (Legacy / Backward Compatibility)
// ----------------------------------------------------

export const restaurants = sqliteTable('restaurants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().default('hob-restaurant'),
  address: text('address').notNull(),
  whatsappPhoneNumberId: text('whatsapp_phone_number_id').notNull(),
  metaAccessToken: text('meta_access_token').notNull(),
  prefix: text('prefix').notNull(),
  managerPhone: text('manager_phone'),
  openingHoursLunch: text('opening_hours_lunch').default('12:00-15:30'),
  openingHoursDinner: text('opening_hours_dinner').default('19:00-23:00'),
  closedDays: text('closed_days').default(''),
  maxPaxNormal: integer('max_pax_normal').default(12),
  googleReviewUrl: text('google_review_url').default('https://maps.google.com'),
  customWelcomeText: text('custom_welcome_text'),
  customMenuText: text('custom_menu_text'),
  active: integer('active', { mode: 'boolean' }).default(true),
});

export const conversations = sqliteTable('conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  phone: text('phone').notNull(),
  restaurantId: integer('restaurant_id').notNull().references(() => restaurants.id),
  customerName: text('customer_name'),
  currentStep: text('current_step', {
    enum: ['entry', 'guests', 'occasion', 'datetime_date', 'datetime_time', 'confirm', 'finalized'],
  }).default('entry'),
  stepData: text('step_data').default('{}'), // JSON string
  interruptedStep: text('interrupted_step'),
  birthdayDiscountClaimedYear: integer('birthday_discount_claimed_year'),
  lastDinedAt: text('last_dined_at'), // YYYY-MM-DD
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  idxConversationsPhoneRestaurant: index('idx_conversations_phone_restaurant').on(table.phone, table.restaurantId),
}));

export const reservations = sqliteTable('reservations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  restaurantId: integer('restaurant_id').notNull().references(() => restaurants.id),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone').notNull(),
  guests: integer('guests').notNull().default(2),
  occasion: text('occasion', {
    enum: ['casual', 'birthday', 'anniversary', 'corporate', 'party'],
  }).default('casual'),
  date: text('date').notNull(), // YYYY-MM-DD
  time: text('time').notNull(), // HH:MM (24h)
  reservationCode: text('reservation_code').unique(),
  stage: text('stage', {
    enum: ['booked', 'seated', 'reminded', 'completed', 'no_show', 'cancelled'],
  }).default('booked'),
  specialRequest: text('special_request'),
  reviewSent: integer('review_sent', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  idxReservationsStage: index('idx_reservations_stage').on(table.stage),
  idxReservationsDate: index('idx_reservations_date').on(table.date),
}));

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = typeof restaurants.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;

export interface StepData {
  guests?: number;
  occasion?: 'casual' | 'birthday' | 'anniversary' | 'corporate' | 'party';
  date?: string;       // YYYY-MM-DD
  time?: string;       // HH:MM
  reservationId?: number;
  reservationCode?: string;
  specialRequest?: string;
  customerName?: string;
}
