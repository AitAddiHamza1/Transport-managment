/**
 * Timezone & Business Calendar Utilities (Africa/Casablanca)
 * French / Morocco ERP System Rules
 */

export const BUSINESS_TIMEZONE = 'Africa/Casablanca';

/**
 * Resolves the explicit business calendar date string (YYYY-MM-DD) in Africa/Casablanca.
 * Does not rely on local server timezone getters (getDate, getMonth, getFullYear).
 */
export function getCasablancaDateString(input?: Date | string | null): string {
  if (!input) {
    return getCasablancaDateString(new Date());
  }

  if (typeof input === 'string') {
    // If input is already YYYY-MM-DD string format
    if (/^\d{4}-\d{2}-\d{2}/.test(input)) {
      return input.substring(0, 10);
    }
    const d = new Date(input);
    if (isNaN(d.getTime())) return '';
    return getCasablancaDateString(d);
  }

  if (isNaN(input.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(input);
}

/**
 * Converts a YYYY-MM-DD calendar date string into a deterministic UTC Date (00:00:00.000Z).
 * Eliminates local timezone offsets during date arithmetic.
 */
export function parseCalendarDateToUtc(dateStr: string): Date {
  const clean = dateStr.substring(0, 10);
  const [year, month, day] = clean.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}
