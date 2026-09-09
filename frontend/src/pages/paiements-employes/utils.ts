export function formatPeriodeFr(periodeStr: string): string {
  if (!periodeStr || !periodeStr.includes('-')) return periodeStr;
  const [year, month] = periodeStr.split('-');
  const monthsFr = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];
  const mIndex = parseInt(month, 10) - 1;
  if (mIndex >= 0 && mIndex < 12) {
    return `${monthsFr[mIndex]} ${year}`;
  }
  return periodeStr;
}
