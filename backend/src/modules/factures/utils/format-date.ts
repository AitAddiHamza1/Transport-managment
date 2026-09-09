/**
 * Timezone-safe French date formatter.
 *
 * PostgreSQL DATE columns arrive in Node.js as either:
 *   - ISO date string  "YYYY-MM-DD"  (from $queryRaw or some Prisma modes)
 *   - JavaScript Date object at UTC midnight
 *
 * Using new Date('2026-08-02') parses to UTC midnight, which in timezones
 * west of UTC can shift the calendar day by -1. This formatter avoids that
 * by extracting date components directly without timezone conversion.
 *
 * Examples:
 *   formatDateFR('2026-08-02')                          → '02/08/2026'
 *   formatDateFR(new Date('2026-08-02T00:00:00.000Z'))  → '02/08/2026'
 *   formatDateFR(null)                                  → '—'
 *   formatDateFR(undefined)                             → '—'
 *   formatDateFR('invalid')                             → '—'
 */
export function formatDateFR(date: Date | string | null | undefined): string {
  if (date === null || date === undefined || date === '') return '—';

  // Fast path: ISO date-only string 'YYYY-MM-DD[...]'
  // Extract components directly without Date parsing to avoid timezone drift
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }
    // Not a recognized ISO date string — attempt Date parse below
  }

  // Date object or ISO datetime string: use UTC components to avoid local-tz shift
  const d = date instanceof Date ? date : new Date(date as string);
  if (isNaN(d.getTime())) return '—';

  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}
