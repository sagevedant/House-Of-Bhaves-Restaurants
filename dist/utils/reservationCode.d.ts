/**
 * FIX: previously only checked uniqueness against the `reservations` table,
 * but `bookings.reservationCode` is a separate unique column that receives
 * the SAME generated code. If the two tables ever drifted (see dual-write
 * fix in confirm.js), this check could pass while still colliding with an
 * existing `bookings` row, causing a DB unique-constraint failure or a
 * silently reused code. Now checks both tables.
 */
export declare function generateReservationCode(prefix: string): Promise<string>;
//# sourceMappingURL=reservationCode.d.ts.map