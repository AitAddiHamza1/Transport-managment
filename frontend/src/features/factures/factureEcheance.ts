/**
 * Facture Échéance & Retard Calculation Utilities
 * Centralized business calendar rules for invoice due dates and overdue delays.
 *
 * Requirements:
 * - Timezone: Africa/Casablanca (Morocco standard ERP business calendar)
 * - Due Date = Date d'émission + Délai d'échéance (jours calendaires)
 * - Thresholds:
 *   - > 7 days remaining: Green ("X jours restants")
 *   - 1 to 7 days remaining: Orange ("X jours restants", singular "1 jour restant")
 *   - Today: Red ("Échéance aujourd'hui")
 *   - Overdue >= 1 day: Red ("En retard de X jours", singular "En retard de 1 jour")
 * - Invoices fully paid: No false overdue/unpaid alert (displays "—")
 * - Invoices cancelled: No active due date (displays "—")
 * - Invoices without exploitable date: Displays "—"
 */

export const BUSINESS_TIMEZONE = 'Africa/Casablanca';

export interface FactureDueDateInfo {
  date: Date | null;
  display: string;
  isoDate: string | null;
}

export interface FactureRetardInfo {
  text: string;
  color: 'success' | 'warning' | 'error' | 'default';
  variant: 'success' | 'warning' | 'error' | 'neutral' | 'default';
  diffDays: number | null;
  isOverdue: boolean;
  isDueToday: boolean;
  isPaid: boolean;
  isCancelled: boolean;
  tooltip?: string;
}

export interface FactureEcheanceInput {
  dateFacture?: string | Date | null;
  joursEcheance?: number | null;
  dateEcheance?: string | Date | null;
  statut?: string | null;
  montantPaye?: string | number | null;
  soldeRestant?: string | number | null;
  montantTotal?: string | number | null;
  supprimeLe?: string | null;
}

/**
 * Extracts [year, month, day] from a date input string or Date object
 * without timezone conversions.
 */
function extractYearMonthDay(input: string | Date | null | undefined): [number, number, number] | null {
  if (!input) return null;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return [year, month, day];
      }
    }
  }

  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return null;

  // Use Casablanca calendar for Date objects
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.format(d).split('-');
  return [parseInt(parts[0], 10), parseInt(parts[1], 10), parseInt(parts[2], 10)];
}

/**
 * Computes Date Échéance = Date d'émission + Délai d'échéance (jours calendaires)
 * Formats date as D/M/YYYY (e.g. 8/11/2026).
 *
 * Example: 9/10/2026 + 30 days = 8/11/2026
 */
export function computeFactureDueDate(
  dateEmission?: string | Date | null,
  delaiJours?: number | null,
  storedDateEcheance?: string | Date | null,
): FactureDueDateInfo {
  // Primary computation: Date d'émission + Délai d'échéance (Jours)
  const emissionYMD = extractYearMonthDay(dateEmission);
  if (emissionYMD) {
    const [year, month, day] = emissionYMD;
    const daysToAdd = typeof delaiJours === 'number' && !isNaN(delaiJours) ? delaiJours : 30;

    // Use UTC to perform deterministic calendar day addition free of DST / local timezone artifacts
    const utcDate = new Date(Date.UTC(year, month - 1, day + daysToAdd, 0, 0, 0, 0));
    const dueYear = utcDate.getUTCFullYear();
    const dueMonth = utcDate.getUTCMonth() + 1;
    const dueDay = utcDate.getUTCDate();

    return {
      date: utcDate,
      display: `${dueDay}/${dueMonth}/${dueYear}`,
      isoDate: `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`,
    };
  }

  // Fallback: stored dateEcheance if dateFacture was somehow unparseable
  const fallbackYMD = extractYearMonthDay(storedDateEcheance);
  if (fallbackYMD) {
    const [dueYear, dueMonth, dueDay] = fallbackYMD;
    const utcDate = new Date(Date.UTC(dueYear, dueMonth - 1, dueDay, 0, 0, 0, 0));
    return {
      date: utcDate,
      display: `${dueDay}/${dueMonth}/${dueYear}`,
      isoDate: `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`,
    };
  }

  return {
    date: null,
    display: '—',
    isoDate: null,
  };
}

/**
 * Returns the current calendar date in Africa/Casablanca.
 */
export function getCasablancaToday(referenceDate?: Date | string | null): [number, number, number] {
  if (referenceDate) {
    const ymd = extractYearMonthDay(referenceDate);
    if (ymd) return ymd;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [yearStr, monthStr, dayStr] = formatter.format(new Date()).split('-');
  return [parseInt(yearStr, 10), parseInt(monthStr, 10), parseInt(dayStr, 10)];
}

/**
 * Computes Retard column status and styling based on business thresholds:
 *
 * | Situation                           | Affichage            | Couleur |
 * |-------------------------------------|----------------------|---------|
 * | Échéance dans plus de 7 jours       | X jours restants     | Vert    |
 * | Échéance dans 1 à 7 jours           | X jours restants     | Orange  |
 * | Échéance aujourd'hui                | Échéance aujourd'hui | Rouge   |
 * | Échéance dépassée de 1 jour ou plus | En retard de X jours | Rouge   |
 *
 * Rules:
 * - Paid invoices: returns "—" (no misleading overdue indicator)
 * - Cancelled invoices: returns "—" (not an active due date)
 * - Missing/unusable dates: returns "—"
 * - Partially paid invoices with positive remaining balance: calculated normally
 */
export function computeFactureRetard(
  facture: FactureEcheanceInput,
  referenceDate?: Date | string | null,
): FactureRetardInfo {
  // 1. Cancelled invoices
  const isCancelled = facture.statut === 'ANNULEE' || Boolean(facture.supprimeLe);
  if (isCancelled) {
    return {
      text: '—',
      color: 'default',
      variant: 'neutral',
      diffDays: null,
      isOverdue: false,
      isDueToday: false,
      isPaid: false,
      isCancelled: true,
      tooltip: 'Facture annulée',
    };
  }

  // 2. Fully paid invoices
  const soldeNum = facture.soldeRestant !== undefined && facture.soldeRestant !== null
    ? Number(facture.soldeRestant)
    : NaN;
  const totalNum = facture.montantTotal !== undefined && facture.montantTotal !== null
    ? Number(facture.montantTotal)
    : NaN;

  const isPaid = facture.statut === 'PAYEE' || (!isNaN(soldeNum) && soldeNum <= 0 && !isNaN(totalNum) && totalNum > 0);
  if (isPaid) {
    return {
      text: '—',
      color: 'default',
      variant: 'neutral',
      diffDays: null,
      isOverdue: false,
      isDueToday: false,
      isPaid: true,
      isCancelled: false,
      tooltip: 'Facture payée',
    };
  }

  // 3. Resolve Due Date
  const dueDateInfo = computeFactureDueDate(facture.dateFacture, facture.joursEcheance, facture.dateEcheance);
  if (!dueDateInfo.isoDate) {
    return {
      text: '—',
      color: 'default',
      variant: 'neutral',
      diffDays: null,
      isOverdue: false,
      isDueToday: false,
      isPaid: false,
      isCancelled: false,
    };
  }

  // 4. Compare calendar dates in Africa/Casablanca (ignoring time)
  const [dueYear, dueMonth, dueDay] = extractYearMonthDay(dueDateInfo.isoDate)!;
  const [todayYear, todayMonth, todayDay] = getCasablancaToday(referenceDate);

  const dueUtc = Date.UTC(dueYear, dueMonth - 1, dueDay, 0, 0, 0, 0);
  const todayUtc = Date.UTC(todayYear, todayMonth - 1, todayDay, 0, 0, 0, 0);

  const MS_PER_DAY = 86_400_000;
  const diffDays = Math.round((dueUtc - todayUtc) / MS_PER_DAY);

  // 5. Apply thresholds
  if (diffDays > 7) {
    return {
      text: `${diffDays} jours restants`,
      color: 'success',
      variant: 'success',
      diffDays,
      isOverdue: false,
      isDueToday: false,
      isPaid: false,
      isCancelled: false,
    };
  }

  if (diffDays >= 1 && diffDays <= 7) {
    return {
      text: diffDays === 1 ? '1 jour restant' : `${diffDays} jours restants`,
      color: 'warning',
      variant: 'warning',
      diffDays,
      isOverdue: false,
      isDueToday: false,
      isPaid: false,
      isCancelled: false,
    };
  }

  if (diffDays === 0) {
    return {
      text: 'Échéance aujourd’hui',
      color: 'error',
      variant: 'error',
      diffDays: 0,
      isOverdue: false,
      isDueToday: true,
      isPaid: false,
      isCancelled: false,
    };
  }

  // diffDays < 0 (Overdue)
  const overdueDays = Math.abs(diffDays);
  return {
    text: overdueDays === 1 ? 'En retard de 1 jour' : `En retard de ${overdueDays} jours`,
    color: 'error',
    variant: 'error',
    diffDays,
    isOverdue: true,
    isDueToday: false,
    isPaid: false,
    isCancelled: false,
  };
}
