export declare function nowIST(): Date;
export declare function toIST(date: Date): Date;
export declare function todayIST(): string;
export declare function currentTimeIST(): string;
export declare function tomorrowIST(): string;
export declare function dayAfterTomorrowIST(): string;
export declare function getNextNDaysIST(count: number): {
    dateStr: string;
    label: string;
    dayName: string;
}[];
export declare function formatDate(dateStr: string): string;
export declare function formatTime(time24: string): string;
export declare function parseISTDateTime(dateStr: string, time24: string): Date;
export declare function isWithinHoursRange(time: string, start: string, end: string): boolean;
export declare function isPastByHours(dateStr: string, time24: string, hours: number): boolean;
export declare function getDayName(dateStr: string): string;
export declare function isSunday(dateStr: string): boolean;
export declare function isWithinOperatingHours(time24: string, lunchHours: string, dinnerHours: string): boolean;
export declare function getAvailableTimeSlots(date: string, lunchHours: string, dinnerHours: string): {
    period: string;
    slots: string[];
}[];
export declare function resolveRelativeDay(input: string): string | null;
export declare function resolveDateInput(input: string): string | null;
//# sourceMappingURL=dateHelpers.d.ts.map