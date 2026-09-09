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
    const istOffset = 5.5 * 60 * 60 * 1000;
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

/**
 * FIX (logic bug): slots that wrap past midnight (e.g. dinner "19:00-00:30")
 * previously stored display-corrected strings like "00:30" and then filtered
 * "today" slots via plain string comparison (`s >= nowTime`). Lexically,
 * "00:30" < "19:00", so a genuinely-future post-midnight slot would be
 * incorrectly dropped (or an already-past slot incorrectly kept) depending
 * on current time — a bug that only manifests late at night and is easy to
 * miss in testing.
 *
 * Fix: track each slot's *actual minutes-since-midnight-of-the-lunch/dinner-
 * window-start* (allowing values >= 1440 for post-midnight slots) alongside
 * its display string, and filter using that numeric value instead of the
 * display string.
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
            // minutesFromWindowStart lets us compare "is this slot still in the
            // future" using arithmetic instead of lexical string comparison.
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
        // A post-midnight slot (minutesFromWindowStart >= 1440) is only "past"
        // if we've also wrapped past midnight in real time relative to the
        // window; since both lunch and dinner windows start same-day, we
        // compare against nowMinutes directly — values >=1440 always compare
        // as "still ahead" today, which is correct: e.g. dinner window
        // 19:00-00:30 with now=21:00 (1260 min) should keep the 00:30 slot
        // (1470 min), which now correctly passes 1470 >= 1260.
        // If "now" is itself past midnight (e.g. 00:15 the next calendar day),
        // todayIST() would already refer to that new day and the dinner window
        // from the *previous* day is no longer relevant, so no special-casing
        // needed beyond straightforward minute arithmetic here.
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
