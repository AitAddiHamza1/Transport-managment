import { Prisma } from '@prisma/client';

const UNITES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const DIZAINES = [
  '',
  'dix',
  'vingt',
  'trente',
  'quarante',
  'cinquante',
  'soixante',
  'soixante-dix',
  'quatre-vingts',
  'quatre-vingt-dix',
];

function numberToWordsUnder100(n: number): string {
  if (n < 10) return UNITES[n];
  if (n === 10) return 'dix';
  if (n === 11) return 'onze';
  if (n === 12) return 'douze';
  if (n === 13) return 'treize';
  if (n === 14) return 'quatorze';
  if (n === 15) return 'quinze';
  if (n === 16) return 'seize';
  if (n < 20) return `dix-${UNITES[n - 10]}`;

  const dizaine = Math.floor(n / 10);
  const unite = n % 10;

  if (dizaine === 7) {
    if (unite === 1) return 'soixante et onze';
    return `soixante-${numberToWordsUnder100(10 + unite)}`;
  }

  if (dizaine === 9) {
    return `quatre-vingt-${numberToWordsUnder100(10 + unite)}`;
  }

  if (dizaine === 8) {
    if (unite === 0) return 'quatre-vingts';
    return `quatre-vingt-${UNITES[unite]}`;
  }

  if (unite === 1) return `${DIZAINES[dizaine]} et un`;
  if (unite > 0) return `${DIZAINES[dizaine]}-${UNITES[unite]}`;
  return DIZAINES[dizaine];
}

function numberToWordsUnder1000(n: number): string {
  if (n < 100) return numberToWordsUnder100(n);
  const centaine = Math.floor(n / 100);
  const reste = n % 100;

  let centStr = centaine === 1 ? 'cent' : `${UNITES[centaine]} cent`;
  if (centaine > 1 && reste === 0) centStr += 's';

  if (reste > 0) {
    return `${centStr} ${numberToWordsUnder100(reste)}`;
  }
  return centStr;
}

export function numberToWordsFR(n: number): string {
  if (n === 0) return 'zéro';

  const millions = Math.floor(n / 1000000);
  const milliers = Math.floor((n % 1000000) / 1000);
  const reste = Math.floor(n % 1000);

  const parts: string[] = [];

  if (millions > 0) {
    parts.push(millions === 1 ? 'un million' : `${numberToWordsUnder1000(millions)} millions`);
  }

  if (milliers > 0) {
    parts.push(milliers === 1 ? 'mille' : `${numberToWordsUnder1000(milliers)} mille`);
  }

  if (reste > 0) {
    parts.push(numberToWordsUnder1000(reste));
  }

  return parts.join(' ');
}

export function amountInWordsFR(amountDecimal: Prisma.Decimal | number): string {
  const num = typeof amountDecimal === 'number' ? amountDecimal : Number(amountDecimal);
  if (isNaN(num) || num <= 0) {
    return 'Zéro dirham TTC';
  }

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let result = numberToWordsFR(integerPart);
  // Capitalize first letter
  result = result.charAt(0).toUpperCase() + result.slice(1);

  if (integerPart === 1) {
    result += ' dirham';
  } else {
    result += ' dirhams';
  }

  if (decimalPart > 0) {
    const centimesStr = numberToWordsFR(decimalPart);
    result += ` et ${centimesStr} centime${decimalPart > 1 ? 's' : ''}`;
  }

  result += ' TTC';
  return result;
}
