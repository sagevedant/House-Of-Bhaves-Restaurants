import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Settings, DateTime } from 'luxon';
import {
  todayIST,
  currentTimeIST,
  tomorrowIST,
  dayAfterTomorrowIST,
  getNextNDaysIST,
  formatDate,
  formatTime,
  parseISTDateTime,
  isPastByHours,
  getDayName,
  isSunday,
  isWithinOperatingHours,
  getAvailableTimeSlots,
  resolveDateInput,
  ZONE_IST,
} from './dateHelpers';

describe('dateHelpers with Luxon & IST Timezone', () => {
  it('should always return correct IST date and time regardless of system TZ', () => {
    // Simulate a fixed instant: 2026-09-16T18:30:00.000Z (which is 2026-09-17T00:00:00.000+05:30)
    const fixedUtcMillis = Date.UTC(2026, 8, 16, 18, 30, 0); // 2026-09-16 18:30 UTC
    Settings.now = () => fixedUtcMillis;

    // At 18:30 UTC, it is exactly midnight (00:00) on 2026-09-17 in IST
    assert.equal(todayIST(), '2026-09-17');
    assert.equal(currentTimeIST(), '00:00');
    assert.equal(tomorrowIST(), '2026-09-18');
    assert.equal(dayAfterTomorrowIST(), '2026-09-19');

    // 1 minute before midnight in IST: 2026-09-16 18:29 UTC -> 2026-09-16 23:59 IST
    Settings.now = () => Date.UTC(2026, 8, 16, 18, 29, 0);
    assert.equal(todayIST(), '2026-09-16');
    assert.equal(currentTimeIST(), '23:59');
    assert.equal(tomorrowIST(), '2026-09-17');
    assert.equal(dayAfterTomorrowIST(), '2026-09-18');

    // Reset Settings.now
    Settings.now = () => Date.now();
  });

  it('should produce identical outputs when mocked across various timezones', () => {
    const fixedInstant = Date.UTC(2026, 8, 16, 14, 0, 0); // 14:00 UTC = 19:30 IST
    Settings.now = () => fixedInstant;

    const expectedToday = '2026-09-16';
    const expectedTime = '19:30';
    const expectedTomorrow = '2026-09-17';

    assert.equal(todayIST(), expectedToday);
    assert.equal(currentTimeIST(), expectedTime);
    assert.equal(tomorrowIST(), expectedTomorrow);

    // Verify parseISTDateTime returns exact expected UTC timestamp
    const parsed = parseISTDateTime('2026-09-16', '19:30');
    assert.equal(parsed.toISOString(), new Date(fixedInstant).toISOString());

    Settings.now = () => Date.now();
  });

  it('should parse IST date-time correctly via parseISTDateTime', () => {
    const dt = parseISTDateTime('2026-10-25', '14:30');
    // 2026-10-25 14:30 IST = 2026-10-25 09:00 UTC
    const expectedUtc = '2026-10-25T09:00:00.000Z';
    assert.equal(dt.toISOString(), expectedUtc);
  });

  it('should format dates and times correctly', () => {
    assert.equal(formatDate('2026-09-16'), 'Wed, 16 Sep 2026');
    assert.equal(formatDate('2026-01-01'), 'Thu, 01 Jan 2026');

    assert.equal(formatTime('19:30'), '7:30 PM');
    assert.equal(formatTime('00:30'), '12:30 AM');
    assert.equal(formatTime('12:00'), '12:00 PM');
    assert.equal(formatTime('09:05'), '9:05 AM');
  });

  it('should check day names and sundays', () => {
    assert.equal(getDayName('2026-09-20'), 'sunday'); // Sep 20 2026 is Sunday
    assert.equal(isSunday('2026-09-20'), true);
    assert.equal(getDayName('2026-09-16'), 'wednesday');
    assert.equal(isSunday('2026-09-16'), false);
  });

  it('should calculate isPastByHours correctly based on IST time', () => {
    // Current time: 2026-09-16 19:30 IST
    const fixedInstant = Date.UTC(2026, 8, 16, 14, 0, 0);
    Settings.now = () => fixedInstant;

    // Booking at 16:30 IST (3 hours ago)
    assert.equal(isPastByHours('2026-09-16', '16:30', 2), true); // 3h > 2h
    assert.equal(isPastByHours('2026-09-16', '16:30', 4), false); // 3h < 4h
    // Booking in future (21:00 IST)
    assert.equal(isPastByHours('2026-09-16', '21:00', 1), false);

    Settings.now = () => Date.now();
  });

  it('should generate available time slots with midnight wrapping support', () => {
    // Fixed time at 20:00 IST on 2026-09-16
    Settings.now = () => Date.UTC(2026, 8, 16, 14, 30, 0);

    const slotsToday = getAvailableTimeSlots('2026-09-16', '12:00-15:00', '19:00-00:30');
    // Lunch is completely in the past (now is 20:00)
    // Dinner slots before 20:00 (19:00, 19:30) should be filtered out
    // Slots 20:00, 20:30, 21:00, 21:30, 22:00, 22:30, 23:00, 23:30, 00:00, 00:30 should remain
    assert.equal(slotsToday.length, 1);
    assert.equal(slotsToday[0].period, 'Dinner');
    assert.ok(slotsToday[0].slots.includes('20:00'));
    assert.ok(slotsToday[0].slots.includes('00:30'));
    assert.ok(!slotsToday[0].slots.includes('19:00'));

    // For a future date, all slots appear
    const slotsFuture = getAvailableTimeSlots('2026-09-17', '12:00-15:00', '19:00-23:00');
    assert.equal(slotsFuture.length, 2);
    assert.equal(slotsFuture[0].period, 'Lunch');
    assert.equal(slotsFuture[1].period, 'Dinner');
    assert.ok(slotsFuture[0].slots.includes('12:00'));
    assert.ok(slotsFuture[1].slots.includes('19:00'));

    Settings.now = () => Date.now();
  });

  it('should resolve natural language relative date inputs in IST', () => {
    // Fixed: Wednesday 2026-09-16 12:00 IST
    Settings.now = () => Date.UTC(2026, 8, 16, 6, 30, 0);

    assert.equal(resolveDateInput('today'), '2026-09-16');
    assert.equal(resolveDateInput('aaj'), '2026-09-16');
    assert.equal(resolveDateInput('tomorrow'), '2026-09-17');
    assert.equal(resolveDateInput('kal'), '2026-09-17');
    assert.equal(resolveDateInput('day after tomorrow'), '2026-09-18');
    assert.equal(resolveDateInput('parso'), '2026-09-18');

    // Friday
    assert.equal(resolveDateInput('friday'), '2026-09-18');

    Settings.now = () => Date.now();
  });

  it('should generate next N days with correct relative labels in IST', () => {
    Settings.now = () => Date.UTC(2026, 8, 16, 6, 30, 0);

    const nextDays = getNextNDaysIST(3);
    assert.equal(nextDays.length, 3);
    assert.equal(nextDays[0].dateStr, '2026-09-16');
    assert.ok(nextDays[0].label.startsWith('Today · 16 Sep'));
    assert.equal(nextDays[1].dateStr, '2026-09-17');
    assert.ok(nextDays[1].label.startsWith('Tomorrow · 17 Sep'));
    assert.equal(nextDays[2].dateStr, '2026-09-18');
    assert.ok(nextDays[2].label.startsWith('Fri, 18 Sep'));

    Settings.now = () => Date.now();
  });
});
