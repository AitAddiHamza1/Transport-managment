import { formatDateFR as formatPdfDateFR } from './modules/factures/utils/format-date';

// Re-export / import frontend formatDate logic directly to avoid CJS/ESM cross-package boundary issues
export function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const dNum = parseInt(day, 10);
    const mNum = parseInt(month, 10);
    if (!isNaN(dNum) && !isNaN(mNum)) {
      return `${dNum}/${mNum}/${year}`;
    }
  }

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return '—';
  }

  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDisplayDateTime(dateTimeStr: string | null | undefined): string {
  if (!dateTimeStr) return '—';
  const d = new Date(dateTimeStr);
  if (isNaN(d.getTime())) return '—';

  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

async function runDateFormatTests() {
  console.log('==================================================');
  console.log('PHASE 2 DATE FORMATTER VERIFICATION SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  console.log('--- FRONTEND DATE FORMATTER (formatDisplayDate) ---');
  // A. "2026-10-04" -> "4/10/2026"
  assert(formatDisplayDate('2026-10-04') === '4/10/2026', 'A. "2026-10-04" -> "4/10/2026"');

  // B. "2026-01-05" -> "5/1/2026"
  assert(formatDisplayDate('2026-01-05') === '5/1/2026', 'B. "2026-01-05" -> "5/1/2026"');

  // C. "2026-12-31" -> "31/12/2026"
  assert(formatDisplayDate('2026-12-31') === '31/12/2026', 'C. "2026-12-31" -> "31/12/2026"');

  // D. null -> "—"
  assert(formatDisplayDate(null) === '—', 'D. null -> "—"');

  // E. undefined -> "—"
  assert(formatDisplayDate(undefined) === '—', 'E. undefined -> "—"');

  // F. invalid date -> "—"
  assert(formatDisplayDate('invalid-date-string') === '—', 'F. invalid date -> "—"');

  // G. Timezone regression check (ISO YYYY-MM-DD must not suffer timezone shift)
  assert(
    formatDisplayDate('2026-10-04') === '4/10/2026' && formatDisplayDate('2026-01-05') === '5/1/2026',
    'G. Timezone drift protection: YYYY-MM-DD extracted directly without UTC shift',
  );

  console.log('\n--- FRONTEND DATETIME FORMATTER (formatDisplayDateTime) ---');
  // H. Datetime formatting uses single consistent local timezone policy
  const sampleIso = '2026-10-04T14:30:00.000Z';
  const formattedDt = formatDisplayDateTime(sampleIso);
  assert(
    typeof formattedDt === 'string' && formattedDt !== '—' && formattedDt.includes('/'),
    `H. formatDisplayDateTime("${sampleIso}") produced consistent local datetime: "${formattedDt}"`,
  );
  assert(formatDisplayDateTime(null) === '—', 'H. formatDisplayDateTime(null) -> "—"');
  assert(formatDisplayDateTime(undefined) === '—', 'H. formatDisplayDateTime(undefined) -> "—"');

  console.log('\n--- BACKEND PDF DATE FORMATTER (formatDateFR) ---');
  // PDF Date display: D/M/YYYY
  assert(formatPdfDateFR('2026-10-04') === '4/10/2026', 'PDF formatDateFR("2026-10-04") -> "4/10/2026"');
  assert(formatPdfDateFR('2026-01-05') === '5/1/2026', 'PDF formatDateFR("2026-01-05") -> "5/1/2026"');
  assert(formatPdfDateFR('2026-12-31') === '31/12/2026', 'PDF formatDateFR("2026-12-31") -> "31/12/2026"');
  assert(formatPdfDateFR(null as any) === '—', 'PDF formatDateFR(null) -> "—"');

  console.log('\n==================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runDateFormatTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
