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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.sqlite = void 0;
exports.initializeDatabase = initializeDatabase;
const client_1 = require("@libsql/client");
const libsql_1 = require("drizzle-orm/libsql");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
const schema = __importStar(require("./schema"));
const dbDir = path_1.default.dirname(config_1.config.absoluteDatabasePath);
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
}
exports.sqlite = (0, client_1.createClient)({
    url: `file:${config_1.config.absoluteDatabasePath}`
});
exports.db = (0, libsql_1.drizzle)(exports.sqlite, { schema });
async function initializeDatabase() {
    // Commercial Agency Tables
    await exports.sqlite.execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      billing_cycle TEXT DEFAULT 'monthly',
      outbound_allowance_monthly INTEGER DEFAULT 1000,
      outbound_sent_this_month INTEGER DEFAULT 0,
      next_monthly_reset_date TEXT,
      whatsapp_phone_number_id TEXT NOT NULL UNIQUE,
      meta_access_token TEXT NOT NULL,
      prefix TEXT DEFAULT 'HOB',
      google_review_url TEXT DEFAULT 'https://maps.google.com',
      custom_welcome_text TEXT,
      custom_menu_text TEXT,
      active INTEGER DEFAULT 1
    )
  `);
    await exports.sqlite.execute(`
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
    await exports.sqlite.execute(`
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
    await exports.sqlite.execute(`CREATE INDEX IF NOT EXISTS idx_customers_phone_client ON customers(phone_number, client_id)`);
    await exports.sqlite.execute(`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)`);
    await exports.sqlite.execute(`CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date)`);
    // Single Restaurant / Legacy Tables
    await exports.sqlite.execute(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL DEFAULT 'hob-restaurant',
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
      custom_welcome_text TEXT,
      custom_menu_text TEXT,
      active INTEGER DEFAULT 1
    )
  `);
    await exports.sqlite.execute(`
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
    await exports.sqlite.execute(`
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
    await exports.sqlite.execute(`CREATE INDEX IF NOT EXISTS idx_conversations_phone_restaurant ON conversations(phone, restaurant_id)`);
    await exports.sqlite.execute(`CREATE INDEX IF NOT EXISTS idx_reservations_stage ON reservations(stage)`);
    await exports.sqlite.execute(`CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date)`);
    // Safe Migration Alter Helpers
    try {
        await exports.sqlite.execute(`ALTER TABLE clients ADD COLUMN billing_cycle TEXT DEFAULT 'monthly';`);
    }
    catch { }
    try {
        await exports.sqlite.execute(`ALTER TABLE clients ADD COLUMN outbound_allowance_monthly INTEGER DEFAULT 1000;`);
    }
    catch { }
    try {
        await exports.sqlite.execute(`ALTER TABLE clients ADD COLUMN outbound_sent_this_month INTEGER DEFAULT 0;`);
    }
    catch { }
    try {
        await exports.sqlite.execute(`ALTER TABLE clients ADD COLUMN next_monthly_reset_date TEXT;`);
    }
    catch { }
    try {
        await exports.sqlite.execute(`ALTER TABLE clients ADD COLUMN custom_welcome_text TEXT;`);
    }
    catch { }
    try {
        await exports.sqlite.execute(`ALTER TABLE clients ADD COLUMN custom_menu_text TEXT;`);
    }
    catch { }
    try {
        await exports.sqlite.execute(`ALTER TABLE restaurants ADD COLUMN custom_welcome_text TEXT;`);
    }
    catch { }
    try {
        await exports.sqlite.execute(`ALTER TABLE restaurants ADD COLUMN custom_menu_text TEXT;`);
    }
    catch { }
    try {
        await exports.sqlite.execute(`ALTER TABLE customers ADD COLUMN last_inbound_interaction TEXT;`);
    }
    catch { }
    try {
        await exports.sqlite.execute(`ALTER TABLE bookings ADD COLUMN review_scheduled_at TEXT;`);
    }
    catch { }
    await exports.sqlite.execute(`PRAGMA journal_mode = WAL`);
    await exports.sqlite.execute(`PRAGMA foreign_keys = ON`);
}
//# sourceMappingURL=connection.js.map