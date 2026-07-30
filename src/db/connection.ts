import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import * as schema from './schema';

const dbDir = path.dirname(config.absoluteDatabasePath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const sqlite = createClient({
  url: `file:${config.absoluteDatabasePath}`
});

export const db = drizzle(sqlite, { schema });

export async function initializeDatabase() {
  await sqlite.execute(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL DEFAULT 'spice-factory',
      address TEXT NOT NULL,
      whatsapp_phone_number_id TEXT NOT NULL UNIQUE,
      meta_access_token TEXT NOT NULL,
      prefix TEXT NOT NULL,
      manager_phone TEXT,
      opening_hours_lunch TEXT DEFAULT '12:00-15:30',
      opening_hours_dinner TEXT DEFAULT '19:00-23:00',
      closed_days TEXT DEFAULT '',
      max_pax_normal INTEGER DEFAULT 12,
      google_review_url TEXT DEFAULT 'https://maps.google.com',
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

  // Safe migration helpers for existing SQLite DBs
  try { await sqlite.execute(`ALTER TABLE restaurants ADD COLUMN slug TEXT DEFAULT 'spice-factory';`); } catch {}
  try { await sqlite.execute(`ALTER TABLE restaurants ADD COLUMN google_review_url TEXT DEFAULT 'https://maps.google.com';`); } catch {}
  try { await sqlite.execute(`ALTER TABLE conversations ADD COLUMN birthday_discount_claimed_year INTEGER;`); } catch {}
  try { await sqlite.execute(`ALTER TABLE conversations ADD COLUMN last_dined_at TEXT;`); } catch {}
  try { await sqlite.execute(`ALTER TABLE reservations ADD COLUMN review_sent INTEGER DEFAULT 0;`); } catch {}

  await sqlite.execute(`PRAGMA journal_mode = WAL`);
  await sqlite.execute(`PRAGMA foreign_keys = ON`);
}
