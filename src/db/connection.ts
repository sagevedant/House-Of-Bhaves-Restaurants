import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import * as schema from './schema';

let dbUrl = `file:${config.absoluteDatabasePath}`;
let authToken: string | undefined = undefined;

if (config.tursoDatabaseUrl) {
  dbUrl = config.tursoDatabaseUrl;
  authToken = config.tursoAuthToken || undefined;
  console.log(`🌐 [DATABASE CONNECTED]: Using Turso Cloud SQLite Persistent Storage (${dbUrl})`);
} else {
  const dbDir = path.dirname(config.absoluteDatabasePath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  console.log(`📁 [DATABASE CONNECTED]: Using Local Disk SQLite Storage (${config.absoluteDatabasePath})`);
}

export const sqlite = createClient({
  url: dbUrl,
  authToken: authToken
});

export const db = drizzle(sqlite, { schema });

export async function initializeDatabase() {
  // Commercial Agency Tables
  await sqlite.execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      billing_cycle TEXT DEFAULT 'monthly',
      outbound_allowance_monthly INTEGER DEFAULT 1000,
      outbound_sent_this_month INTEGER DEFAULT 0,
      next_monthly_reset_date TEXT,
      whatsapp_phone_number_id TEXT NOT NULL,
      meta_access_token TEXT NOT NULL,
      prefix TEXT DEFAULT 'HOB',
      google_review_url TEXT DEFAULT 'https://maps.google.com',
      custom_welcome_text TEXT,
      custom_menu_text TEXT,
      active INTEGER DEFAULT 1
    )
  `);

  await sqlite.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id),
      phone_number TEXT NOT NULL,
      customer_name TEXT,
      birthday TEXT,
      anniversary TEXT,
      last_inbound_interaction TEXT,
      birthday_discount_claimed_year INTEGER,
      last_dined_at TEXT,
      updated_at TEXT
    )
  `);

  await sqlite.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id),
      customer_id INTEGER REFERENCES customers(id),
      customer_name TEXT,
      customer_phone TEXT NOT NULL,
      guests INTEGER NOT NULL DEFAULT 2,
      occasion TEXT DEFAULT 'casual',
      booking_timestamp TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      reservation_code TEXT UNIQUE,
      status TEXT DEFAULT 'booked',
      special_request TEXT,
      review_sent INTEGER DEFAULT 0,
      review_scheduled_at TEXT,
      created_at TEXT
    )
  `);

  await sqlite.execute(`CREATE INDEX IF NOT EXISTS idx_customers_phone_client ON customers(phone_number, client_id)`);
  await sqlite.execute(`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)`);
  await sqlite.execute(`CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date)`);

  // Single Restaurant / Legacy Tables
  await sqlite.execute(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL DEFAULT 'hob-restaurant',
      address TEXT NOT NULL,
      whatsapp_phone_number_id TEXT NOT NULL,
      meta_access_token TEXT NOT NULL,
      prefix TEXT NOT NULL,
      manager_phone TEXT,
      opening_hours_lunch TEXT DEFAULT '12:00-15:30',
      opening_hours_dinner TEXT DEFAULT '19:00-23:00',
      closed_days TEXT DEFAULT '',
      max_pax_normal INTEGER DEFAULT 12,
      google_review_url TEXT DEFAULT 'https://maps.google.com',
      custom_welcome_text TEXT,
      custom_menu_text TEXT,
      active INTEGER DEFAULT 1
    )
  `);

  await sqlite.execute(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
      customer_name TEXT,
      current_step TEXT DEFAULT 'entry',
      step_data TEXT DEFAULT '{}',
      interrupted_step TEXT,
      birthday_discount_claimed_year INTEGER,
      last_dined_at TEXT,
      updated_at TEXT
    )
  `);

  await sqlite.execute(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
      customer_name TEXT,
      customer_phone TEXT NOT NULL,
      guests INTEGER NOT NULL DEFAULT 2,
      occasion TEXT DEFAULT 'casual',
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      reservation_code TEXT UNIQUE,
      stage TEXT DEFAULT 'booked',
      special_request TEXT,
      review_sent INTEGER DEFAULT 0,
      created_at TEXT
    )
  `);

  await sqlite.execute(`CREATE INDEX IF NOT EXISTS idx_conversations_phone_restaurant ON conversations(phone, restaurant_id)`);
  await sqlite.execute(`CREATE INDEX IF NOT EXISTS idx_reservations_stage ON reservations(stage)`);
  await sqlite.execute(`CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date)`);

  // Safe Migration Alter Helpers
  try { await sqlite.execute(`ALTER TABLE clients ADD COLUMN billing_cycle TEXT DEFAULT 'monthly';`); } catch {}
  try { await sqlite.execute(`ALTER TABLE clients ADD COLUMN outbound_allowance_monthly INTEGER DEFAULT 1000;`); } catch {}
  try { await sqlite.execute(`ALTER TABLE clients ADD COLUMN outbound_sent_this_month INTEGER DEFAULT 0;`); } catch {}
  try { await sqlite.execute(`ALTER TABLE clients ADD COLUMN next_monthly_reset_date TEXT;`); } catch {}
  try { await sqlite.execute(`ALTER TABLE clients ADD COLUMN custom_welcome_text TEXT;`); } catch {}
  try { await sqlite.execute(`ALTER TABLE clients ADD COLUMN custom_menu_text TEXT;`); } catch {}
  try { await sqlite.execute(`ALTER TABLE restaurants ADD COLUMN custom_welcome_text TEXT;`); } catch {}
  try { await sqlite.execute(`ALTER TABLE restaurants ADD COLUMN custom_menu_text TEXT;`); } catch {}
  try { await sqlite.execute(`ALTER TABLE customers ADD COLUMN last_inbound_interaction TEXT;`); } catch {}
  try { await sqlite.execute(`ALTER TABLE bookings ADD COLUMN review_scheduled_at TEXT;`); } catch {}

  await sqlite.execute(`PRAGMA journal_mode = WAL`);
  await sqlite.execute(`PRAGMA foreign_keys = ON`);
}
