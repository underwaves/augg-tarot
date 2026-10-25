/**
 * Date and Time utilities for Asia/Bangkok (UTC+7)
 * Ensures consistency across API routes and Frontend UI
 */

const BANGKOK_TIMEZONE = "Asia/Bangkok";

/**
 * Returns a date formatted as YYYY-MM-DD in the Asia/Bangkok timezone.
 * Defaults to current timestamp if no date is provided.
 */
export function getBangkokDateString(date: Date | number = new Date()): string {
  const targetDate = typeof date === "number" ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(targetDate);
}

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Bangkok.
 */
export function getBangkokToday(): string {
  return getBangkokDateString();
}

/**
 * Performs civil calendar arithmetic (adding or subtracting days)
 * on a YYYY-MM-DD string without timezone or DST shift side-effects.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some((p) => isNaN(p))) {
    // If somehow invalid, fallback safely
    return dateStr;
  }
  const [year, month, day] = parts;
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);

  const y = utcDate.getUTCFullYear();
  const m = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utcDate.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formats ISO or Date to Bangkok localized time string (HH:MM)
 */
export function formatBangkokTime(date: Date | string): string {
  const targetDate = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: BANGKOK_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(targetDate);
}
