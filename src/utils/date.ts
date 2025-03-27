/**
 * Format a date in the format: YY-MM-DD HH:mm:ss
 */
export function formatDate(date: Date): string {
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Parse a date string in multiple formats:
 * 1. YY-MM-DD HH:mm:ss (e.g., "25-01-27 01:35:04")
 * 2. ISO 8601 (e.g., "2025-01-27T08:23:25.946Z")
 */
export function parseDate(dateStr: string): Date {
    // Check if it's ISO format
    if (dateStr.includes('T') && dateStr.includes('Z')) {
        return new Date(dateStr);
    }

    // Handle YY-MM-DD HH:mm:ss format
    const [datePart, timePart] = dateStr.split(' ');
    const [year, month, day] = datePart.split('-');
    const [hours, minutes, seconds] = timePart.split(':');

    // Assume 20xx for two-digit years
    const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);

    return new Date(
        fullYear,
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        parseInt(seconds)
    );
}

/**
 * Calculate time spent between two dates in minutes
 */
export function calculateTimeSpent(startTime: string, endTime: string): string {
    const start = parseDate(startTime);
    const end = parseDate(endTime);
    const diffMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    return `${diffMinutes}m`;
}

/**
 * Get start of day (midnight) for a given date
 */
function startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

/**
 * Check if two dates are on the same day
 */
export function isToday(date1: Date, date2: Date): boolean {
    const start1 = startOfDay(date1);
    const start2 = startOfDay(date2);
    return start1.getTime() === start2.getTime();
}

/**
 * Check if date1 is the day before date2
 */
export function isYesterday(date1: Date, date2: Date): boolean {
    const start1 = startOfDay(date1);
    const start2 = startOfDay(date2);
    const oneDayMs = 24 * 60 * 60 * 1000;
    return start2.getTime() - start1.getTime() === oneDayMs;
}

/**
 * Get start of week (Sunday) for a given date
 */
export function startOfWeek(date: Date): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - result.getDay());
    result.setHours(0, 0, 0, 0);
    return result;
}

/**
 * Convert any date format to our standard format
 */
export function normalizeDate(dateStr: string): string {
    return formatDate(parseDate(dateStr));
}

/**
 * Debug utility to print date details
 */
export function debugDate(date: Date): string {
    return `${date.toISOString()} (${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()})`;
}