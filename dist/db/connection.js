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
    await exports.sqlite.execute(`
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
    // Safe migration helpers for existing SQLite DBs
    try {
        await exports.sqlite.execute(`ALTER TABLE restaurants ADD COLUMN slug TEXT DEFAULT 'spice-factory';`);
    }
    catch { }
    try {
        await exports.sqlite.execute(`ALTER TABLE restaurants ADD COLUMN google_review_url TEXT DEFAULT 'https://maps.google.com';`);
    }
    catch { }
    try {
        await exports.sqlite.execute(`ALTER TABLE conversations ADD COLUMN birthday_discount_claimed_year INTEGER;`);
    }
    catch { }
    try {
        await exports.sqlite.execute(`ALTER TABLE conversations ADD COLUMN last_dined_at TEXT;`);
    }
    catch { }
    try {
        await exports.sqlite.execute(`ALTER TABLE reservations ADD COLUMN review_sent INTEGER DEFAULT 0;`);
    }
    catch { }
    await exports.sqlite.execute(`PRAGMA journal_mode = WAL`);
    await exports.sqlite.execute(`PRAGMA foreign_keys = ON`);
}
//# sourceMappingURL=connection.js.map