import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core';

export const restaurants = sqliteTable('restaurants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  address: text('address').notNull(),
  whatsappPhoneNumberId: text('whatsapp_phone_number_id').notNull().unique(),
  metaAccessToken: text('meta_access_token').notNull(),
  prefix: text('prefix').notNull(),
  managerPhone: text('manager_phone'),
  openingHoursLunch: text('opening_hours_lunch').default('12:00-15:30'),
  openingHoursDinner: text('opening_hours_dinner').default('19:00-23:00'),
  closedDays: text('closed_days').default(''),
  maxPaxNormal: integer('max_pax_normal').default(12),
  active: integer('active', { mode: 'boolean' }).default(true),
});

export const conversations = sqliteTable('conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  phone: text('phone').notNull(),
  restaurantId: integer('restaurant_id').notNull().references(() => restaurants.id),
  customerName: text('customer_name'),
  currentStep: text('current_step', { enum: ['entry','guests','occasion','datetime_date','datetime_time','confirm','finalized'] }).default('entry'),
  stepData: text('step_data').default('{}'),
  interruptedStep: text('interrupted_step'),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString())
}, (table) => {
  return {
    phoneRestaurantIdx: index('idx_conversations_phone_restaurant').on(table.phone, table.restaurantId)
  }
});

export const reservations = sqliteTable('reservations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  restaurantId: integer('restaurant_id').notNull().references(() => restaurants.id),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone').notNull(),
  guests: integer('guests').notNull().default(2),
  occasion: text('occasion', { enum: ['casual','birthday','anniversary','corporate','party'] }).default('casual'),
  date: text('date').notNull(),
  time: text('time').notNull(),
  reservationCode: text('reservation_code').unique(),
  stage: text('stage', { enum: ['booked','reminded','completed','no_show','cancelled'] }).default('booked'),
  specialRequest: text('special_request'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString())
}, (table) => {
  return {
    stageIdx: index('idx_reservations_stage').on(table.stage),
    dateIdx: index('idx_reservations_date').on(table.date)
  }
});

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
