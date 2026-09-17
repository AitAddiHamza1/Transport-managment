export interface ChequeView {
  id: number;
  numero: string;
  serie: string | null;
  dateCheque: string;
  banque: string;
  agence: string | null;
  beneficiaire: string;
  ville: string | null;
  idPaiementClient: number | null;
  idPaiementFournisseur: number | null;
  hasDocument: boolean;
}

export interface ChequeDocumentView {
  id: number;
  chequeId: number;
  nomOriginal: string;
  mimeType: string;
  tailleFichier: number;
  fileUrl: string;
  downloadUrl: string;
}

export interface ChequeFields {
  chequeNumero?: string;
  chequeSerie?: string;
  chequeDateCheque?: string;
  chequeBanque?: string;
  chequeAgence?: string;
  chequeBeneficiaire?: string;
  chequeVille?: string;
}
