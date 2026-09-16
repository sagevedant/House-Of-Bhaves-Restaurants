"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const luxon_1 = require("luxon");
const dateHelpers_1 = require("./dateHelpers");
(0, node_test_1.describe)('dateHelpers with Luxon & IST Timezone', () => {
    (0, node_test_1.it)('should always return correct IST date and time regardless of system TZ', () => {
        // Simulate a fixed instant: 2026-09-16T18:30:00.000Z (which is 2026-09-17T00:00:00.000+05:30)
        const fixedUtcMillis = Date.UTC(2026, 8, 16, 18, 30, 0); // 2026-09-16 18:30 UTC
        luxon_1.Settings.now = () => fixedUtcMillis;
        // At 18:30 UTC, it is exactly midnight (00:00) on 2026-09-17 in IST
        strict_1.default.equal((0, dateHelpers_1.todayIST)(), '2026-09-17');
        strict_1.default.equal((0, dateHelpers_1.currentTimeIST)(), '00:00');
        strict_1.default.equal((0, dateHelpers_1.tomorrowIST)(), '2026-09-18');
        strict_1.default.equal((0, dateHelpers_1.dayAfterTomorrowIST)(), '2026-09-19');
        // 1 minute before midnight in IST: 2026-09-16 18:29 UTC -> 2026-09-16 23:59 IST
        luxon_1.Settings.now = () => Date.UTC(2026, 8, 16, 18, 29, 0);
        strict_1.default.equal((0, dateHelpers_1.todayIST)(), '2026-09-16');
        strict_1.default.equal((0, dateHelpers_1.currentTimeIST)(), '23:59');
        strict_1.default.equal((0, dateHelpers_1.tomorrowIST)(), '2026-09-17');
        strict_1.default.equal((0, dateHelpers_1.dayAfterTomorrowIST)(), '2026-09-18');
        // Reset Settings.now
        luxon_1.Settings.now = () => Date.now();
    });
    (0, node_test_1.it)('should produce identical outputs when mocked across various timezones', () => {
        const fixedInstant = Date.UTC(2026, 8, 16, 14, 0, 0); // 14:00 UTC = 19:30 IST
        luxon_1.Settings.now = () => fixedInstant;
        const expectedToday = '2026-09-16';
        const expectedTime = '19:30';
        const expectedTomorrow = '2026-09-17';
        strict_1.default.equal((0, dateHelpers_1.todayIST)(), expectedToday);
        strict_1.default.equal((0, dateHelpers_1.currentTimeIST)(), expectedTime);
        strict_1.default.equal((0, dateHelpers_1.tomorrowIST)(), expectedTomorrow);
        // Verify parseISTDateTime returns exact expected UTC timestamp
        const parsed = (0, dateHelpers_1.parseISTDateTime)('2026-09-16', '19:30');
        strict_1.default.equal(parsed.toISOString(), new Date(fixedInstant).toISOString());
        luxon_1.Settings.now = () => Date.now();
    });
    (0, node_test_1.it)('should parse IST date-time correctly via parseISTDateTime', () => {
        const dt = (0, dateHelpers_1.parseISTDateTime)('2026-10-25', '14:30');
        // 2026-10-25 14:30 IST = 2026-10-25 09:00 UTC
        const expectedUtc = '2026-10-25T09:00:00.000Z';
        strict_1.default.equal(dt.toISOString(), expectedUtc);
    });
    (0, node_test_1.it)('should format dates and times correctly', () => {
        strict_1.default.equal((0, dateHelpers_1.formatDate)('2026-09-16'), 'Wed, 16 Sep 2026');
        strict_1.default.equal((0, dateHelpers_1.formatDate)('2026-01-01'), 'Thu, 01 Jan 2026');
        strict_1.default.equal((0, dateHelpers_1.formatTime)('19:30'), '7:30 PM');
        strict_1.default.equal((0, dateHelpers_1.formatTime)('00:30'), '12:30 AM');
        strict_1.default.equal((0, dateHelpers_1.formatTime)('12:00'), '12:00 PM');
        strict_1.default.equal((0, dateHelpers_1.formatTime)('09:05'), '9:05 AM');
    });
    (0, node_test_1.it)('should check day names and sundays', () => {
        strict_1.default.equal((0, dateHelpers_1.getDayName)('2026-09-20'), 'sunday'); // Sep 20 2026 is Sunday
        strict_1.default.equal((0, dateHelpers_1.isSunday)('2026-09-20'), true);
        strict_1.default.equal((0, dateHelpers_1.getDayName)('2026-09-16'), 'wednesday');
        strict_1.default.equal((0, dateHelpers_1.isSunday)('2026-09-16'), false);
    });
    (0, node_test_1.it)('should calculate isPastByHours correctly based on IST time', () => {
        // Current time: 2026-09-16 19:30 IST
        const fixedInstant = Date.UTC(2026, 8, 16, 14, 0, 0);
        luxon_1.Settings.now = () => fixedInstant;
        // Booking at 16:30 IST (3 hours ago)
        strict_1.default.equal((0, dateHelpers_1.isPastByHours)('2026-09-16', '16:30', 2), true); // 3h > 2h
        strict_1.default.equal((0, dateHelpers_1.isPastByHours)('2026-09-16', '16:30', 4), false); // 3h < 4h
        // Booking in future (21:00 IST)
        strict_1.default.equal((0, dateHelpers_1.isPastByHours)('2026-09-16', '21:00', 1), false);
        luxon_1.Settings.now = () => Date.now();
    });
    (0, node_test_1.it)('should generate available time slots with midnight wrapping support', () => {
        // Fixed time at 20:00 IST on 2026-09-16
        luxon_1.Settings.now = () => Date.UTC(2026, 8, 16, 14, 30, 0);
        const slotsToday = (0, dateHelpers_1.getAvailableTimeSlots)('2026-09-16', '12:00-15:00', '19:00-00:30');
        // Lunch is completely in the past (now is 20:00)
        // Dinner slots before 20:00 (19:00, 19:30) should be filtered out
        // Slots 20:00, 20:30, 21:00, 21:30, 22:00, 22:30, 23:00, 23:30, 00:00, 00:30 should remain
        strict_1.default.equal(slotsToday.length, 1);
        strict_1.default.equal(slotsToday[0].period, 'Dinner');
        strict_1.default.ok(slotsToday[0].slots.includes('20:00'));
        strict_1.default.ok(slotsToday[0].slots.includes('00:30'));
        strict_1.default.ok(!slotsToday[0].slots.includes('19:00'));
        // For a future date, all slots appear
        const slotsFuture = (0, dateHelpers_1.getAvailableTimeSlots)('2026-09-17', '12:00-15:00', '19:00-23:00');
        strict_1.default.equal(slotsFuture.length, 2);
        strict_1.default.equal(slotsFuture[0].period, 'Lunch');
        strict_1.default.equal(slotsFuture[1].period, 'Dinner');
        strict_1.default.ok(slotsFuture[0].slots.includes('12:00'));
        strict_1.default.ok(slotsFuture[1].slots.includes('19:00'));
        luxon_1.Settings.now = () => Date.now();
    });
    (0, node_test_1.it)('should resolve natural language relative date inputs in IST', () => {
        // Fixed: Wednesday 2026-09-16 12:00 IST
        luxon_1.Settings.now = () => Date.UTC(2026, 8, 16, 6, 30, 0);
        strict_1.default.equal((0, dateHelpers_1.resolveDateInput)('today'), '2026-09-16');
        strict_1.default.equal((0, dateHelpers_1.resolveDateInput)('aaj'), '2026-09-16');
        strict_1.default.equal((0, dateHelpers_1.resolveDateInput)('tomorrow'), '2026-09-17');
        strict_1.default.equal((0, dateHelpers_1.resolveDateInput)('kal'), '2026-09-17');
        strict_1.default.equal((0, dateHelpers_1.resolveDateInput)('day after tomorrow'), '2026-09-18');
        strict_1.default.equal((0, dateHelpers_1.resolveDateInput)('parso'), '2026-09-18');
        // Friday
        strict_1.default.equal((0, dateHelpers_1.resolveDateInput)('friday'), '2026-09-18');
        luxon_1.Settings.now = () => Date.now();
    });
    (0, node_test_1.it)('should generate next N days with correct relative labels in IST', () => {
        luxon_1.Settings.now = () => Date.UTC(2026, 8, 16, 6, 30, 0);
        const nextDays = (0, dateHelpers_1.getNextNDaysIST)(3);
        strict_1.default.equal(nextDays.length, 3);
        strict_1.default.equal(nextDays[0].dateStr, '2026-09-16');
        strict_1.default.ok(nextDays[0].label.startsWith('Today · 16 Sep'));
        strict_1.default.equal(nextDays[1].dateStr, '2026-09-17');
        strict_1.default.ok(nextDays[1].label.startsWith('Tomorrow · 17 Sep'));
        strict_1.default.equal(nextDays[2].dateStr, '2026-09-18');
        strict_1.default.ok(nextDays[2].label.startsWith('Fri, 18 Sep'));
        luxon_1.Settings.now = () => Date.now();
    });
});
//# sourceMappingURL=dateHelpers.test.js.map