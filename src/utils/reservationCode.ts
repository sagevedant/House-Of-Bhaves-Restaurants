import { db } from '../db/connection';
import { bookings } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function generateReservationCode(prefix: string = 'BK'): Promise<string> {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    const digits = String(Math.floor(1000 + Math.random() * 9000));
    const code = `${prefix.toUpperCase()}-RES-${digits}`;
    const existingBooking = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.reservationCode, code))
      .get();

    if (!existingBooking) return code;
  }
  const ts = Date.now().toString(36).slice(-6).toUpperCase();
  return `${prefix.toUpperCase()}-RES-${ts}`;
}
