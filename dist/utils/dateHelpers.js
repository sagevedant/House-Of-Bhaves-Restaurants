"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZONE_IST = void 0;
exports.nowIST = nowIST;
exports.toIST = toIST;
exports.todayIST = todayIST;
exports.currentTimeIST = currentTimeIST;
exports.tomorrowIST = tomorrowIST;
exports.dayAfterTomorrowIST = dayAfterTomorrowIST;
exports.getNextNDaysIST = getNextNDaysIST;
exports.formatDate = formatDate;
exports.formatTime = formatTime;
exports.parseISTDateTime = parseISTDateTime;
exports.isWithinHoursRange = isWithinHoursRange;
exports.isPastByHours = isPastByHours;
exports.getDayName = getDayName;
exports.isSunday = isSunday;
exports.isWithinOperatingHours = isWithinOperatingHours;
exports.getAvailableTimeSlots = getAvailableTimeSlots;
exports.resolveRelativeDay = resolveRelativeDay;
exports.resolveDateInput = resolveDateInput;
const luxon_1 = require("luxon");
exports.ZONE_IST = 'Asia/Kolkata';
function nowIST() {
    return luxon_1.DateTime.now().setZone(exports.ZONE_IST).toJSDate();
}
function toIST(date) {
    return luxon_1.DateTime.fromJSDate(date).setZone(exports.ZONE_IST).toJSDate();
}
function todayIST() {
    return luxon_1.DateTime.now().setZone(exports.ZONE_IST).toFormat('yyyy-MM-dd');
}
function currentTimeIST() {
    return luxon_1.DateTime.now().setZone(exports.ZONE_IST).toFormat('HH:mm');
}
function tomorrowIST() {
    return luxon_1.DateTime.now().setZone(exports.ZONE_IST).plus({ days: 1 }).toFormat('yyyy-MM-dd');
}
function dayAfterTomorrowIST() {
    return luxon_1.DateTime.now().setZone(exports.ZONE_IST).plus({ days: 2 }).toFormat('yyyy-MM-dd');
}
function getNextNDaysIST(count) {
    const days = [];
    const base = luxon_1.DateTime.now().setZone(exports.ZONE_IST);
    for (let i = 0; i < count; i++) {
        const d = base.plus({ days: i });
        const dateStr = d.toFormat('yyyy-MM-dd');
        const dayName = d.setLocale('en-US').toFormat('ccc');
        const formattedDate = d.setLocale('en-US').toFormat('dd LLL');
        let label = '';
        if (i === 0)
            label = `Today · ${formattedDate}`;
        else if (i === 1)
            label = `Tomorrow · ${formattedDate}`;
        else
            label = `${dayName}, ${formattedDate}`;
        days.push({ dateStr, label, dayName });
    }
    return days;
}
function formatDate(dateStr) {
    const dt = luxon_1.DateTime.fromISO(dateStr, { zone: exports.ZONE_IST });
    if (!dt.isValid) {
        // Fallback for non-ISO standard formats
        const parsed = luxon_1.DateTime.fromFormat(dateStr, 'yyyy-MM-dd', { zone: exports.ZONE_IST });
        if (parsed.isValid) {
            return parsed.setLocale('en-US').toFormat('ccc, dd LLL yyyy');
        }
        return dateStr;
    }
    return dt.setLocale('en-US').toFormat('ccc, dd LLL yyyy');
}
function formatTime(time24) {
    const dt = luxon_1.DateTime.fromFormat(time24.trim(), 'HH:mm', { zone: exports.ZONE_IST });
    if (!dt.isValid)
        return time24;
    return dt.toFormat('h:mm a');
}
function parseISTDateTime(dateStr, time24) {
    const dt = luxon_1.DateTime.fromFormat(`${dateStr.trim()} ${time24.trim()}`, 'yyyy-MM-dd HH:mm', { zone: exports.ZONE_IST });
    if (!dt.isValid) {
        throw new Error(`Invalid date/time format: ${dateStr} ${time24}`);
    }
    return dt.toJSDate();
}
function isWithinHoursRange(time, start, end) {
    return time >= start && time <= end;
}
function isPastByHours(dateStr, time24, hours) {
    const dt = luxon_1.DateTime.fromFormat(`${dateStr.trim()} ${time24.trim()}`, 'yyyy-MM-dd HH:mm', { zone: exports.ZONE_IST });
    const now = luxon_1.DateTime.now().setZone(exports.ZONE_IST);
    const diffHours = now.diff(dt, 'hours').hours;
    return diffHours > hours;
}
function getDayName(dateStr) {
    const dt = luxon_1.DateTime.fromISO(dateStr, { zone: exports.ZONE_IST });
    if (!dt.isValid) {
        const parsed = luxon_1.DateTime.fromFormat(dateStr, 'yyyy-MM-dd', { zone: exports.ZONE_IST });
        return parsed.isValid ? parsed.setLocale('en-US').toFormat('cccc').toLowerCase() : '';
    }
    return dt.setLocale('en-US').toFormat('cccc').toLowerCase();
}
function isSunday(dateStr) {
    return getDayName(dateStr) === 'sunday';
}
function isWithinOperatingHours(time24, lunchHours, dinnerHours) {
    if (lunchHours && lunchHours.includes('-')) {
        const [lunchStart, lunchEnd] = lunchHours.split('-');
        if (time24 >= lunchStart && time24 <= lunchEnd)
            return true;
    }
    if (dinnerHours && dinnerHours.includes('-')) {
        const [dinnerStart, dinnerEnd] = dinnerHours.split('-');
        if (time24 >= dinnerStart && time24 <= dinnerEnd)
            return true;
    }
    return false;
}
/**
 * Generates available time slots for lunch and dinner windows.
 * Handles midnight rollovers (e.g. 19:00 - 00:30) with minute calculations.
 */
function getAvailableTimeSlots(date, lunchHours, dinnerHours) {
    const generateSlots = (startEnd) => {
        if (!startEnd || !startEnd.includes('-'))
            return [];
        const [start, end] = startEnd.split('-');
        if (!start || !end || !start.includes(':') || !end.includes(':'))
            return [];
        const slots = [];
        let [h, m] = start.split(':').map(Number);
        let [eh, em] = end.split(':').map(Number);
        if (isNaN(h) || isNaN(m) || isNaN(eh) || isNaN(em))
            return [];
        if (eh < h || (eh === h && em < m)) {
            eh += 24;
        }
        while (h < eh || (h === eh && m <= em)) {
            const displayH = h >= 24 ? h - 24 : h;
            const display = `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            const minutesFromWindowStart = h * 60 + m;
            slots.push({ display, minutesFromWindowStart });
            m += 30;
            if (m >= 60) {
                h += 1;
                m -= 60;
            }
        }
        return slots;
    };
    let lunchSlots = generateSlots(lunchHours);
    let dinnerSlots = generateSlots(dinnerHours);
    if (date === todayIST()) {
        const nowTime = currentTimeIST();
        const [nowH, nowM] = nowTime.split(':').map(Number);
        const nowMinutes = nowH * 60 + nowM;
        lunchSlots = lunchSlots.filter(s => s.minutesFromWindowStart >= nowMinutes);
        dinnerSlots = dinnerSlots.filter(s => s.minutesFromWindowStart >= nowMinutes);
    }
    const result = [];
    if (lunchSlots.length > 0)
        result.push({ period: 'Lunch', slots: lunchSlots.map(s => s.display) });
    if (dinnerSlots.length > 0)
        result.push({ period: 'Dinner', slots: dinnerSlots.map(s => s.display) });
    return result;
}
function resolveRelativeDay(input) {
    return resolveDateInput(input);
}
function resolveDateInput(input) {
    const i = input.toLowerCase().trim();
    if (['today', 'aaj'].includes(i))
        return todayIST();
    if (['tomorrow', 'kal'].includes(i))
        return tomorrowIST();
    if (['day after', 'parson', 'parso', 'day after tomorrow'].includes(i))
        return dayAfterTomorrowIST();
    // Try parsing month names and numbers (e.g. "3rd august", "3 aug", "august 3")
    const months = {
        jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
        may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
        sep: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
    };
    const dayMatch = i.match(/(\d{1,2})(st|nd|rd|th)?/);
    const monthMatch = Object.keys(months).find(m => i.includes(m));
    if (dayMatch && monthMatch) {
        const dayNum = parseInt(dayMatch[1], 10);
        const monthNum = months[monthMatch];
        const now = luxon_1.DateTime.now().setZone(exports.ZONE_IST);
        let year = now.year;
        let dt = luxon_1.DateTime.fromObject({ year, month: monthNum, day: dayNum }, { zone: exports.ZONE_IST });
        if (dt < now.startOf('day')) {
            dt = dt.plus({ years: 1 });
        }
        return dt.toFormat('yyyy-MM-dd');
    }
    // Try parsing weekday names (e.g. "monday", "friday", "mon")
    const weekdayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const targetDayIdx = weekdayNames.indexOf(i) + 1; // Luxon: Monday=1, Sunday=7
    if (targetDayIdx > 0) {
        const now = luxon_1.DateTime.now().setZone(exports.ZONE_IST);
        const currentDayIdx = now.weekday; // 1..7
        let diff = targetDayIdx - currentDayIdx;
        if (diff <= 0)
            diff += 7;
        return now.plus({ days: diff }).toFormat('yyyy-MM-dd');
    }
    return null;
}
//# sourceMappingURL=dateHelpers.js.map