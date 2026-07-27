export function nowIST(): Date {
  const date = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  return new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000 + istOffset);
}

export function toIST(date: Date): Date {
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000 + istOffset);
}

export function todayIST(): string {
  const ist = nowIST();
  return ist.toISOString().split('T')[0];
}

export function currentTimeIST(): string {
  const ist = nowIST();
  return ist.toISOString().split('T')[1].substring(0, 5);
}

export function tomorrowIST(): string {
  const ist = nowIST();
  ist.setDate(ist.getDate() + 1);
  return ist.toISOString().split('T')[0];
}

export function dayAfterTomorrowIST(): string {
  const ist = nowIST();
  ist.setDate(ist.getDate() + 2);
  return ist.toISOString().split('T')[0];
}

export function getNextNDaysIST(count: number): string[] {
  const days: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = nowIST();
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('en-GB', options);
}

export function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export function parseISTDateTime(dateStr: string, time24: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = time24.split(':').map(Number);
  
  const pseudoDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(pseudoDate.getTime() - istOffset);
}

export function isWithinHoursRange(time: string, start: string, end: string): boolean {
  return time >= start && time <= end;
}

export function isPastByHours(dateStr: string, time24: string, hours: number): boolean {
  const dateTime = parseISTDateTime(dateStr, time24);
  const diff = nowIST().getTime() - dateTime.getTime();
  return diff > hours * 60 * 60 * 1000;
}

export function getDayName(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
}

export function isSunday(dateStr: string): boolean {
  return getDayName(dateStr) === 'sunday';
}

export function isWithinOperatingHours(time24: string, lunchHours: string, dinnerHours: string): boolean {
  const [lunchStart, lunchEnd] = lunchHours.split('-');
  const [dinnerStart, dinnerEnd] = dinnerHours.split('-');
  return (time24 >= lunchStart && time24 <= lunchEnd) || (time24 >= dinnerStart && time24 <= dinnerEnd);
}

export function getAvailableTimeSlots(date: string, lunchHours: string, dinnerHours: string): { period: string; slots: string[] }[] {
  const [lunchStart, lunchEnd] = lunchHours.split('-');
  const [dinnerStart, dinnerEnd] = dinnerHours.split('-');
  
  const generateSlots = (start: string, end: string) => {
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

export function resolveRelativeDay(input: string): string | null {
  const i = input.toLowerCase().trim();
  if (['today', 'aaj'].includes(i)) return todayIST();
  if (['tomorrow', 'kal'].includes(i)) return tomorrowIST();
  if (['day after', 'parson', 'parso', 'day after tomorrow'].includes(i)) return dayAfterTomorrowIST();
  return null;
}
