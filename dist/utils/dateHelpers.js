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
        days.push(d.toISOString().split('T')[0]);
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
    const [lunchStart, lunchEnd] = lunchHours.split('-');
    const [dinnerStart, dinnerEnd] = dinnerHours.split('-');
    return (time24 >= lunchStart && time24 <= lunchEnd) || (time24 >= dinnerStart && time24 <= dinnerEnd);
}
function getAvailableTimeSlots(date, lunchHours, dinnerHours) {
    const [lunchStart, lunchEnd] = lunchHours.split('-');
    const [dinnerStart, dinnerEnd] = dinnerHours.split('-');
    const generateSlots = (start, end) => {
        const slots = [];
        let [h, m] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        while (h < eh || (h === eh && m <= em)) {
            slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
            m += 30;
            if (m >= 60) {
                h += 1;
                m -= 60;
            }
        }
        return slots;
    };
    let lunchSlots = generateSlots(lunchStart, lunchEnd);
    let dinnerSlots = generateSlots(dinnerStart, dinnerEnd);
    if (date === todayIST()) {
        const nowTime = currentTimeIST();
        lunchSlots = lunchSlots.filter(s => s >= nowTime);
        dinnerSlots = dinnerSlots.filter(s => s >= nowTime);
    }
    return [
        { period: 'lunch', slots: lunchSlots },
        { period: 'dinner', slots: dinnerSlots }
    ];
}
function resolveRelativeDay(input) {
    const i = input.toLowerCase().trim();
    if (['today', 'aaj'].includes(i))
        return todayIST();
    if (['tomorrow', 'kal'].includes(i))
        return tomorrowIST();
    if (['day after', 'parson', 'parso', 'day after tomorrow'].includes(i))
        return dayAfterTomorrowIST();
    return null;
}
//# sourceMappingURL=dateHelpers.js.map