import { db } from '../db/connection';
import { reservations } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function generateReservationCode(prefix: string): Promise<string> {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    const digits = String(Math.floor(1000 + Math.random() * 9000));
    const code = `${prefix}-RES-${digits}`;
    const existing = await db
      .select({ id: reservations.id })
      .from(reservations)
      .where(eq(reservations.reservationCode, code))
      .get();
    if (!existing) return code;
  }
  const ts = Date.now().toString(36).slice(-4).toUpperCase();
  return `${prefix}-RES-${ts}`;
}
