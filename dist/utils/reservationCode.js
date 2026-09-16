"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReservationCode = generateReservationCode;
const connection_1 = require("../db/connection");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
async function generateReservationCode(prefix = 'BK') {
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
        const digits = String(Math.floor(1000 + Math.random() * 9000));
        const code = `${prefix.toUpperCase()}-RES-${digits}`;
        const existingBooking = await connection_1.db
            .select({ id: schema_1.bookings.id })
            .from(schema_1.bookings)
            .where((0, drizzle_orm_1.eq)(schema_1.bookings.reservationCode, code))
            .get();
        if (!existingBooking)
            return code;
    }
    const ts = Date.now().toString(36).slice(-6).toUpperCase();
    return `${prefix.toUpperCase()}-RES-${ts}`;
}
//# sourceMappingURL=reservationCode.js.map