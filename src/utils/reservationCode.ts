import { db } from '../db/connection';
import { reservations, bookings } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * FIX: previously only checked uniqueness against the `reservations` table,
 * but `bookings.reservationCode` is a separate unique column that receives
 * the SAME generated code. If the two tables ever drifted (see dual-write
 * fix in confirm.js), this check could pass while still colliding with an
 * existing `bookings` row, causing a DB unique-constraint failure or a
 * silently reused code. Now checks both tables.
 */
export async function generateReservationCode(prefix: string): Promise<string> {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    const digits = String(Math.floor(1000 + Math.random() * 9000));
    const code = `${prefix}-RES-${digits}`;
    const [existingRes, existingBooking] = await Promise.all([
      db
        .select({ id: reservations.id })
        .from(reservations)
        .where(eq(reservations.reservationCode, code))
        .get(),
      db
        .select({ id: bookings.id })
        .from(bookings)
        .where(eq(bookings.reservationCode, code))
        .get(),
    ]);

    if (!existingRes && !existingBooking) return code;
  }
  const ts = Date.now().toString(36).slice(-6).toUpperCase();
  return `${prefix}-RES-${ts}`;
}
