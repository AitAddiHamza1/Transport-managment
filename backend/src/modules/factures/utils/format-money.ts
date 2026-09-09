import { Prisma } from '@prisma/client';

/**
 * Decimal-safe monetary formatter.
 *
 * Never converts Prisma.Decimal through floating-point Number arithmetic.
 * Uses Decimal.toFixed(2) for exact two-decimal string, then applies
 * French grouping (thousands = narrow no-break space \u202F, decimal = comma).
 *
 * Examples:
 *   formatMoney(Decimal('30000'))       → "30 000,00 MAD"
 *   formatMoney(Decimal('1250.50'))     → "1 250,50 MAD"
 *   formatMoney(Decimal('-1250.50'))    → "-1 250,50 MAD"
 *   formatMoney(Decimal('0'))           → "0,00 MAD"
 *   formatMoney(Decimal('999999999.99')) → "999 999 999,99 MAD"
 */
export function formatMoney(
  amount: Prisma.Decimal | number | string,
  currency: string = 'MAD',
): string {
  // Normalise to Prisma.Decimal for exact arithmetic
  const decimal =
    amount instanceof Prisma.Decimal
      ? amount
      : new Prisma.Decimal(amount === undefined || amount === null ? 0 : amount);

  // toFixed(2) returns an exact string e.g. "30000.00" or "-1250.50"
  const fixed = decimal.toFixed(2);

  // Handle negative sign separately
  const isNegative = fixed.startsWith('-');
  const absFixed = isNegative ? fixed.slice(1) : fixed;

  // Split integer and decimal parts
  const dotIndex = absFixed.indexOf('.');
  const intPart = dotIndex >= 0 ? absFixed.slice(0, dotIndex) : absFixed;
  const decPart = dotIndex >= 0 ? absFixed.slice(dotIndex + 1) : '00';

  // Apply thousands grouping with standard non-breaking space (\u00A0)
  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');

  // Reassemble with French decimal comma
  const formatted = `${isNegative ? '-' : ''}${groupedInt},${decPart}`;

  return `${formatted}\u00A0${currency}`;
}
