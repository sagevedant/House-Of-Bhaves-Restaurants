"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
function nowIST() {
    const date = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
    return new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000 + istOffset);
}
function toIST(date) {
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000 + istOffset);
}
function todayIST() {
    const ist = nowIST();
    return ist.toISOString().split('T')[0];
}
function currentTimeIST() {
    const ist = nowIST();
    return ist.toISOString().split('T')[1].substring(0, 5);
}
function tomorrowIST() {
    const ist = nowIST();
    ist.setDate(ist.getDate() + 1);
    return ist.toISOString().split('T')[0];
}
function dayAfterTomorrowIST() {
    const ist = nowIST();
    ist.setDate(ist.getDate() + 2);
    return ist.toISOString().split('T')[0];
}
function getNextNDaysIST(count) {
    const days = [];
    for (let i = 0; i < count; i++) {
        const d = nowIST();
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const formattedDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
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
    const date = new Date(dateStr);
    const options = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
}
function formatTime(time24) {
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
}
function parseISTDateTime(dateStr, time24) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = time24.split(':').map(Number);
    const pseudoDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(pseudoDate.getTime() - istOffset);
}
function isWithinHoursRange(time, start, end) {
    return time >= start && time <= end;
}
function isPastByHours(dateStr, time24, hours) {
    const dateTime = parseISTDateTime(dateStr, time24);
    const diff = nowIST().getTime() - dateTime.getTime();
    return diff > hours * 60 * 60 * 1000;
}
function getDayName(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
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
        // Handle midnight wrap-around (e.g. 19:00 to 00:30 or 01:30 AM)
        if (eh < h || (eh === h && em < m)) {
            eh += 24;
        }
        while (h < eh || (h === eh && m <= em)) {
            const displayH = h >= 24 ? h - 24 : h;
            slots.push(`${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
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
        lunchSlots = lunchSlots.filter(s => s >= nowTime);
        dinnerSlots = dinnerSlots.filter(s => s >= nowTime);
    }
    const result = [];
    if (lunchSlots.length > 0)
        result.push({ period: 'Lunch', slots: lunchSlots });
    if (dinnerSlots.length > 0)
        result.push({ period: 'Dinner', slots: dinnerSlots });
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
        jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
        may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
        sep: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
    };
    const dayMatch = i.match(/(\d{1,2})(st|nd|rd|th)?/);
    const monthMatch = Object.keys(months).find(m => i.includes(m));
    if (dayMatch && monthMatch) {
        const dayNum = parseInt(dayMatch[1], 10);
        const monthNum = months[monthMatch];
        const now = nowIST();
        let year = now.getFullYear();
        const d = new Date(year, monthNum, dayNum);
        if (d < now) {
            d.setFullYear(year + 1);
        }
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
    // Try parsing weekday names (e.g. "monday", "friday", "mon", "aug 3")
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDayIdx = weekdays.indexOf(i);
    if (targetDayIdx !== -1) {
        const now = nowIST();
        const currentDayIdx = now.getDay();
        let diff = targetDayIdx - currentDayIdx;
        if (diff <= 0)
            diff += 7;
        now.setDate(now.getDate() + diff);
        return now.toISOString().split('T')[0];
    }
    return null;
}
//# sourceMappingURL=dateHelpers.js.map