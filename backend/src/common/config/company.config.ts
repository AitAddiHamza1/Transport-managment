export interface CompanyConfig {
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
  ice: string;
  if: string;
  rc: string;
  cnss: string;
  capital: string;
}

export const COMPANY_CONFIG: CompanyConfig = {
  nom: process.env.COMPANY_NAME || 'LOGISTIQUE & TRANSPORT MA',
  adresse: process.env.COMPANY_ADDRESS || '125, Boulevard Zektouni, Etage 3, Casablanca, Maroc',
  telephone: process.env.COMPANY_PHONE || '+212 522 12 34 56',
  email: process.env.COMPANY_EMAIL || 'contact@logistique-transport.ma',
  ice: process.env.COMPANY_ICE || '001584920000034',
  if: process.env.COMPANY_IF || '40293841',
  rc: process.env.COMPANY_RC || '145892 Casablanca',
  cnss: process.env.COMPANY_CNSS || '7849201',
  capital: process.env.COMPANY_CAPITAL || '1 000 000 MAD',
};
