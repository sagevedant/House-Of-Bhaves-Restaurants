"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReservationCode = generateReservationCode;
const connection_1 = require("../db/connection");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * FIX: previously only checked uniqueness against the `reservations` table,
 * but `bookings.reservationCode` is a separate unique column that receives
 * the SAME generated code. If the two tables ever drifted (see dual-write
 * fix in confirm.js), this check could pass while still colliding with an
 * existing `bookings` row, causing a DB unique-constraint failure or a
 * silently reused code. Now checks both tables.
 */
async function generateReservationCode(prefix) {
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
        const digits = String(Math.floor(1000 + Math.random() * 9000));
        const code = `${prefix}-RES-${digits}`;
        const [existingRes, existingBooking] = await Promise.all([
            connection_1.db
                .select({ id: schema_1.reservations.id })
                .from(schema_1.reservations)
                .where((0, drizzle_orm_1.eq)(schema_1.reservations.reservationCode, code))
                .get(),
            connection_1.db
                .select({ id: schema_1.bookings.id })
                .from(schema_1.bookings)
                .where((0, drizzle_orm_1.eq)(schema_1.bookings.reservationCode, code))
                .get(),
        ]);
        if (!existingRes && !existingBooking)
            return code;
    }
    const ts = Date.now().toString(36).slice(-6).toUpperCase();
    return `${prefix}-RES-${ts}`;
}
//# sourceMappingURL=reservationCode.js.map