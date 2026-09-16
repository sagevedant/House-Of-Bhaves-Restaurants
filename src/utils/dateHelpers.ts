import { DateTime } from 'luxon';

export const ZONE_IST = 'Asia/Kolkata';

export function nowIST(): Date {
  return DateTime.now().setZone(ZONE_IST).toJSDate();
}

export function toIST(date: Date): Date {
  return DateTime.fromJSDate(date).setZone(ZONE_IST).toJSDate();
}

export function todayIST(): string {
  return DateTime.now().setZone(ZONE_IST).toFormat('yyyy-MM-dd');
}

export function currentTimeIST(): string {
  return DateTime.now().setZone(ZONE_IST).toFormat('HH:mm');
}

export function tomorrowIST(): string {
  return DateTime.now().setZone(ZONE_IST).plus({ days: 1 }).toFormat('yyyy-MM-dd');
}

export function dayAfterTomorrowIST(): string {
  return DateTime.now().setZone(ZONE_IST).plus({ days: 2 }).toFormat('yyyy-MM-dd');
}

export function getNextNDaysIST(count: number): { dateStr: string; label: string; dayName: string }[] {
  const days: { dateStr: string; label: string; dayName: string }[] = [];
  const base = DateTime.now().setZone(ZONE_IST);

  for (let i = 0; i < count; i++) {
    const d = base.plus({ days: i });
    const dateStr = d.toFormat('yyyy-MM-dd');
    const dayName = d.setLocale('en-US').toFormat('ccc');
    const formattedDate = d.setLocale('en-US').toFormat('dd LLL');
    
    let label = '';
    if (i === 0) label = `Today · ${formattedDate}`;
    else if (i === 1) label = `Tomorrow · ${formattedDate}`;
    else label = `${dayName}, ${formattedDate}`;

    days.push({ dateStr, label, dayName });
  }
  return days;
}

export function formatDate(dateStr: string): string {
  const dt = DateTime.fromISO(dateStr, { zone: ZONE_IST });
  if (!dt.isValid) {
    // Fallback for non-ISO standard formats
    const parsed = DateTime.fromFormat(dateStr, 'yyyy-MM-dd', { zone: ZONE_IST });
    if (parsed.isValid) {
      return parsed.setLocale('en-US').toFormat('ccc, dd LLL yyyy');
    }
    return dateStr;
  }
  return dt.setLocale('en-US').toFormat('ccc, dd LLL yyyy');
}

export function formatTime(time24: string): string {
  const dt = DateTime.fromFormat(time24.trim(), 'HH:mm', { zone: ZONE_IST });
  if (!dt.isValid) return time24;
  return dt.toFormat('h:mm a');
}

export function parseISTDateTime(dateStr: string, time24: string): Date {
  const dt = DateTime.fromFormat(`${dateStr.trim()} ${time24.trim()}`, 'yyyy-MM-dd HH:mm', { zone: ZONE_IST });
  if (!dt.isValid) {
    throw new Error(`Invalid date/time format: ${dateStr} ${time24}`);
  }
  return dt.toJSDate();
}

export function isWithinHoursRange(time: string, start: string, end: string): boolean {
  return time >= start && time <= end;
}

export function isPastByHours(dateStr: string, time24: string, hours: number): boolean {
  const dt = DateTime.fromFormat(`${dateStr.trim()} ${time24.trim()}`, 'yyyy-MM-dd HH:mm', { zone: ZONE_IST });
  const now = DateTime.now().setZone(ZONE_IST);
  const diffHours = now.diff(dt, 'hours').hours;
  return diffHours > hours;
}

export function getDayName(dateStr: string): string {
  const dt = DateTime.fromISO(dateStr, { zone: ZONE_IST });
  if (!dt.isValid) {
    const parsed = DateTime.fromFormat(dateStr, 'yyyy-MM-dd', { zone: ZONE_IST });
    return parsed.isValid ? parsed.setLocale('en-US').toFormat('cccc').toLowerCase() : '';
  }
  return dt.setLocale('en-US').toFormat('cccc').toLowerCase();
}

export function isSunday(dateStr: string): boolean {
  return getDayName(dateStr) === 'sunday';
}

export function isWithinOperatingHours(time24: string, lunchHours: string, dinnerHours: string): boolean {
  if (lunchHours && lunchHours.includes('-')) {
    const [lunchStart, lunchEnd] = lunchHours.split('-');
    if (time24 >= lunchStart && time24 <= lunchEnd) return true;
  }
  if (dinnerHours && dinnerHours.includes('-')) {
    const [dinnerStart, dinnerEnd] = dinnerHours.split('-');
    if (time24 >= dinnerStart && time24 <= dinnerEnd) return true;
  }
  return false;
}

/**
 * Generates available time slots for lunch and dinner windows.
 * Handles midnight rollovers (e.g. 19:00 - 00:30) with minute calculations.
 */
export function getAvailableTimeSlots(date: string, lunchHours: string, dinnerHours: string): { period: string; slots: string[] }[] {
  interface SlotEntry {
    display: string;
    minutesFromWindowStart: number;
  }

  const generateSlots = (startEnd: string): SlotEntry[] => {
    if (!startEnd || !startEnd.includes('-')) return [];
    const [start, end] = startEnd.split('-');
    if (!start || !end || !start.includes(':') || !end.includes(':')) return [];
    
    const slots: SlotEntry[] = [];
    let [h, m] = start.split(':').map(Number);
    let [eh, em] = end.split(':').map(Number);
    if (isNaN(h) || isNaN(m) || isNaN(eh) || isNaN(em)) return [];

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

  const result: { period: string; slots: string[] }[] = [];
  if (lunchSlots.length > 0) result.push({ period: 'Lunch', slots: lunchSlots.map(s => s.display) });
  if (dinnerSlots.length > 0) result.push({ period: 'Dinner', slots: dinnerSlots.map(s => s.display) });
  return result;
}

export function resolveRelativeDay(input: string): string | null {
  return resolveDateInput(input);
}

export function resolveDateInput(input: string): string | null {
  const i = input.toLowerCase().trim();
  if (['today', 'aaj'].includes(i)) return todayIST();
  if (['tomorrow', 'kal'].includes(i)) return tomorrowIST();
  if (['day after', 'parson', 'parso', 'day after tomorrow'].includes(i)) return dayAfterTomorrowIST();

  // Try parsing month names and numbers (e.g. "3rd august", "3 aug", "august 3")
  const months: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
    may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
    sep: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
  };

  const dayMatch = i.match(/(\d{1,2})(st|nd|rd|th)?/);
  const monthMatch = Object.keys(months).find(m => i.includes(m));

  if (dayMatch && monthMatch) {
    const dayNum = parseInt(dayMatch[1], 10);
    const monthNum = months[monthMatch];
    const now = DateTime.now().setZone(ZONE_IST);
    let year = now.year;
    let dt = DateTime.fromObject({ year, month: monthNum, day: dayNum }, { zone: ZONE_IST });

    if (dt < now.startOf('day')) {
      dt = dt.plus({ years: 1 });
    }
    return dt.toFormat('yyyy-MM-dd');
  }

  // Try parsing weekday names (e.g. "monday", "friday", "mon")
  const weekdayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const targetDayIdx = weekdayNames.indexOf(i) + 1; // Luxon: Monday=1, Sunday=7
  if (targetDayIdx > 0) {
    const now = DateTime.now().setZone(ZONE_IST);
    const currentDayIdx = now.weekday; // 1..7
    let diff = targetDayIdx - currentDayIdx;
    if (diff <= 0) diff += 7;
    return now.plus({ days: diff }).toFormat('yyyy-MM-dd');
  }

  return null;
}

