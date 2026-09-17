import { BadRequestException } from '@nestjs/common';
import { ChequeDataPayload } from './dto/create-cheque.dto';

export function extractAndValidateChequeData(
  methodeOrMode: string,
  dto: any,
): ChequeDataPayload | null {
  const isChequeMethod = methodeOrMode === 'CHEQUE';

  const nested = dto.cheque;
  const hasFlatFields = Boolean(
    (dto.chequeNumero && dto.chequeNumero.trim().length > 0) ||
      (dto.chequeDateCheque && dto.chequeDateCheque.trim().length > 0) ||
      (dto.chequeDate && dto.chequeDate.trim().length > 0) ||
      (dto.chequeBanque && dto.chequeBanque.trim().length > 0) ||
      (dto.chequeBeneficiaire && dto.chequeBeneficiaire.trim().length > 0),
  );

  const hasChequePayload = Boolean(nested || hasFlatFields);

  // CASE B: Payment method != CHEQUE but Cheque payload provided -> 400
  if (!isChequeMethod && hasChequePayload) {
    throw new BadRequestException(
      'Les informations du chèque ne peuvent pas être fournies lorsque le mode de paiement n’est pas CHÈQUE.',
    );
  }

  // If not CHEQUE method and no payload, return null
  if (!isChequeMethod) {
    return null;
  }

  // CASE A: Payment method = CHEQUE but Cheque payload missing -> 400
  if (!hasChequePayload) {
    throw new BadRequestException(
      'Les informations du chèque (numéro, date, banque, bénéficiaire) sont obligatoires pour un paiement par CHÈQUE.',
    );
  }

  // Extract values from nested or flat fields
  const rawNumero = nested?.numero ?? dto.chequeNumero;
  const rawSerie = nested?.serie ?? dto.chequeSerie;
  const rawDateStr = nested?.dateCheque ?? dto.chequeDateCheque ?? dto.chequeDate;
  const rawBanque = nested?.banque ?? dto.chequeBanque;
  const rawAgence = nested?.agence ?? dto.chequeAgence;
  const rawBeneficiaire = nested?.beneficiaire ?? dto.chequeBeneficiaire;
  const rawVille = nested?.ville ?? dto.chequeVille;

  const numero = typeof rawNumero === 'string' ? rawNumero.trim() : '';
  const serie = typeof rawSerie === 'string' && rawSerie.trim() ? rawSerie.trim() : null;
  const dateStr = typeof rawDateStr === 'string' ? rawDateStr.trim() : '';
  const banque = typeof rawBanque === 'string' ? rawBanque.trim() : '';
  const agence = typeof rawAgence === 'string' && rawAgence.trim() ? rawAgence.trim() : null;
  const beneficiaire = typeof rawBeneficiaire === 'string' ? rawBeneficiaire.trim() : '';
  const ville = typeof rawVille === 'string' && rawVille.trim() ? rawVille.trim() : null;

  if (!numero) {
    throw new BadRequestException('Le numéro du chèque est obligatoire');
  }
  if (!dateStr || isNaN(Date.parse(dateStr))) {
    throw new BadRequestException('La date du chèque est obligatoire et doit être une date valide');
  }
  if (!banque) {
    throw new BadRequestException('La banque du chèque est obligatoire');
  }
  if (!beneficiaire) {
    throw new BadRequestException('Le bénéficiaire du chèque est obligatoire');
  }

  return {
    numero,
    serie,
    dateCheque: new Date(dateStr),
    banque,
    agence,
    beneficiaire,
    ville,
  };
}
