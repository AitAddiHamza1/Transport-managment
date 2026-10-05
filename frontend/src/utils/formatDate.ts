/**
 * Centralized Frontend Date Utility — Transport ERP
 * Standard display format: D/M/YYYY (e.g. 4/10/2026, 5/1/2026)
 * Single-digit day and month without leading zero padding.
 */

/**
 * Formats a DATE-only value or ISO string into D/M/YYYY display format.
 * For ISO date strings matching YYYY-MM-DD, year/month/day are extracted directly
 * without timezone conversion to avoid timezone drift across different regions.
 *
 * Examples:
 *   formatDisplayDate("2026-10-04") -> "4/10/2026"
 *   formatDisplayDate("2026-01-05") -> "5/1/2026"
 *   formatDisplayDate(null)         -> "—"
 */
export function formatDisplayDate(date: string | Date | null | undefined): string {
  if (date === null || date === undefined || date === '') return '—';

  // Fast path: ISO date strings matching YYYY-MM-DD or starting with YYYY-MM-DD
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (!trimmed) return '—';

    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = match[1];
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);
      if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
        return '—';
      }
      return `${day}/${month}/${year}`;
    }
  }

  // Date object
  if (date instanceof Date) {
    if (isNaN(date.getTime())) return '—';
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // String fallback parse
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats a DATETIME/TIMESTAMPTZ value into D/M/YYYY HH:mm display format.
 * Uses a single consistent timezone policy (browser/local timezone) for both date and time.
 *
 * Example:
 *   formatDisplayDateTime("2026-10-04T14:30:00Z") -> "4/10/2026 15:30" (in UTC+1)
 */
export function formatDisplayDateTime(date: string | Date | null | undefined): string {
  if (date === null || date === undefined || date === '') return '—';

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';

  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
