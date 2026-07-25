export interface CompanySettings {
  id: number;
  singletonKey: string;
  nomEntreprise: string | null;
  nomLegal: string | null;
  adresse: string | null;
  ville: string | null;
  pays: string | null;
  telephone: string | null;
  telephoneSecondaire: string | null;
  email: string | null;
  siteWeb: string | null;
  ice: string | null;
  identifiantFiscal: string | null;
  registreCommerce: string | null;
  patente: string | null;
  cnss: string | null;
  nomBanque: string | null;
  rib: string | null;
  iban: string | null;
  swiftBic: string | null;
  tauxTvaParDefaut: number;
  delaiPaiementParDefaut: number;
  devise: string;
  prefixeFacture: string | null;
  separateurFacture: string;
  paddingFacture: number;
  templateFacture: string;
  textePiedDePage: string | null;
  noteLegaleTva: string | null;
  hasLogo: boolean;
  logoFilename: string | null;
  logoOriginalName: string | null;
  logoMimeType: string | null;
  logoSize: number | null;
  hasStamp: boolean;
  stampFilename: string | null;
  stampOriginalName: string | null;
  stampMimeType: string | null;
  stampSize: number | null;
  creeLe: string;
  misAJourLe: string;
}

export interface GetCompanySettingsResponse {
  isConfigured: boolean;
  settings: CompanySettings | null;
}

export interface UpdateCompanySettingsPayload {
  nomEntreprise?: string;
  nomLegal?: string;
  adresse?: string;
  ville?: string;
  pays?: string;
  telephone?: string;
  telephoneSecondaire?: string;
  email?: string;
  siteWeb?: string;
  ice?: string;
  identifiantFiscal?: string;
  registreCommerce?: string;
  patente?: string;
  cnss?: string;
  nomBanque?: string;
  rib?: string;
  iban?: string;
  swiftBic?: string;
  tauxTvaParDefaut?: number;
  delaiPaiementParDefaut?: number;
  devise?: string;
  prefixeFacture?: string;
  separateurFacture?: string;
  paddingFacture?: number;
  templateFacture?: string;
  textePiedDePage?: string;
  noteLegaleTva?: string;
}
