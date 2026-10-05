import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, CreanceStatut } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreatePaiementClientDto } from './dto/create-paiement-client.dto';
import { UpdatePaiementClientDto } from './dto/update-paiement-client.dto';
import { CancelPaiementClientDto } from './dto/cancel-paiement-client.dto';
import { QueryPaiementClientDto } from './dto/query-paiement-client.dto';
import { CreancesClientsService } from '../creances-clients/creances-clients.service';
import { ForexService } from '../forex/forex.service';
import { extractAndValidateChequeData } from '../cheques/cheques-validation.helper';

export interface CompactFactureForPaiement {
  id: number;
  numeroFacture: string;
  nomClient: string;
  sousTotal: number;
  montantTva: number;
  montantTotal: number;
  statut: string;
}

export interface CompactCreanceForPaiement {
  id: number;
  montantFacture: number;
  montantRecu: number;
  solde: number;
  statutPaiement: string;
}

export interface PaiementClientView {
  id: number;
  numeroFacture: string;
  nomClient: string;
  datePaiement: string;
  montantRecu: number;
  methodePaiement: string;
  devise: string;
  tauxChange?: number | null;
  montantConvertiMad?: number | null;
  sourceTaux?: string | null;
  estTauxManuel?: boolean;
  dateTauxUtilise?: string | null;
  estAnnule: boolean;
  dateAnnulation: string | null;
  motifAnnulation: string | null;
  annuleParId: number | null;
  creeParId: number | null;
  creeLe: string | null;
  misAJourLe: string;
  facture?: CompactFactureForPaiement | null;
  creance?: CompactCreanceForPaiement | null;
  lettreDeChange?: {
    id?: number;
    numero: string;
    dateEcheance: string;
    montant: number;
    beneficiaire: string;
    cause: string;
    tireNom: string;
    tireAdresse: string;
    statutBancaire?: string;
  } | null;
  cheque?: {
    id: number;
    numero: string;
    serie: string | null;
    dateCheque: string;
    banque: string;
    agence: string | null;
    beneficiaire: string;
    ville: string | null;
    statutBancaire?: string;
  } | null;
}

export interface PaiementClientStats {
  totalPaiements: number;
  montantTotalRecu: number;
  methodesCount: Record<string, number>;
  cancelledCount: number;
}

export function toPaiementView(paiement: any, creance?: any, facture?: any): PaiementClientView {
  const datePaiementStr = paiement.datePaiement
    ? new Date(paiement.datePaiement).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  let compactFacture: CompactFactureForPaiement | null = null;
  const f = facture || paiement.facture;
  if (f) {
    let statusStr = 'EMISE';
    if (f.supprimeLe) statusStr = 'ANNULEE';
    else if (creance?.statutPaiement === 'PAYE' || f.creance?.statutPaiement === 'PAYE')
      statusStr = 'PAYEE';
    else if (creance?.statutPaiement === 'PARTIEL' || f.creance?.statutPaiement === 'PARTIEL')
      statusStr = 'PARTIELLEMENT_PAYEE';

    compactFacture = {
      id: f.id,
      numeroFacture: f.numeroFacture,
      nomClient: f.nomClient,
      sousTotal: Number(f.sousTotal ?? 0),
      montantTva: Number(f.montantTva ?? 0),
      montantTotal: Number(f.montantTotal ?? 0),
      statut: statusStr,
    };
  }

  let compactCreance: CompactCreanceForPaiement | null = null;
  const c = creance || f?.creance;
  if (c) {
    const mf = Number(c.montantFacture ?? 0);
    const mr = Number(c.montantRecu ?? 0);
    compactCreance = {
      id: c.id,
      montantFacture: mf,
      montantRecu: mr,
      solde: c.solde !== undefined && c.solde !== null ? Number(c.solde) : Math.max(0, mf - mr),
      statutPaiement: String(c.statutPaiement),
    };
  }

  return {
    id: paiement.id,
    numeroFacture: paiement.numeroFacture,
    nomClient: paiement.nomClient,
    datePaiement: datePaiementStr,
    montantRecu: Number(paiement.montantRecu ?? 0),
    methodePaiement: String(paiement.methodePaiement),
    devise: paiement.devise || 'MAD',
    tauxChange:
      paiement.tauxChange !== null && paiement.tauxChange !== undefined
        ? Number(paiement.tauxChange)
        : null,
    montantConvertiMad:
      paiement.montantConvertiMad !== null && paiement.montantConvertiMad !== undefined
        ? Number(paiement.montantConvertiMad)
        : null,
    sourceTaux: paiement.sourceTaux || null,
    estTauxManuel: Boolean(paiement.estTauxManuel),
    dateTauxUtilise: paiement.dateTauxUtilise
      ? new Date(paiement.dateTauxUtilise).toISOString().split('T')[0]
      : null,
    estAnnule: Boolean(paiement.estAnnule),
    dateAnnulation: paiement.dateAnnulation
      ? new Date(paiement.dateAnnulation).toISOString()
      : null,
    motifAnnulation: paiement.motifAnnulation ?? null,
    annuleParId: paiement.annuleParId ?? null,
    creeParId: paiement.creeParId ?? null,
    creeLe: paiement.creeLe ? new Date(paiement.creeLe).toISOString() : null,
    misAJourLe: paiement.misAJourLe
      ? new Date(paiement.misAJourLe).toISOString()
      : new Date().toISOString(),
    facture: compactFacture,
    creance: compactCreance,
    lettreDeChange: paiement.lettreDeChange
      ? {
          id: paiement.lettreDeChange.id,
          numero: paiement.lettreDeChange.numero,
          dateEcheance: new Date(paiement.lettreDeChange.dateEcheance).toISOString().split('T')[0],
          montant: Number(paiement.lettreDeChange.montant),
          beneficiaire: paiement.lettreDeChange.beneficiaire,
          cause: paiement.lettreDeChange.cause,
          tireNom: paiement.lettreDeChange.tireNom,
          tireAdresse: paiement.lettreDeChange.tireAdresse,
          statutBancaire: paiement.lettreDeChange.statutBancaire,
        }
      : null,
    cheque: paiement.cheque
      ? {
          id: paiement.cheque.id,
          numero: paiement.cheque.numero,
          serie: paiement.cheque.serie ?? null,
          dateCheque: new Date(paiement.cheque.dateCheque).toISOString().split('T')[0],
          banque: paiement.cheque.banque,
          agence: paiement.cheque.agence ?? null,
          beneficiaire: paiement.cheque.beneficiaire,
          ville: paiement.cheque.ville ?? null,
          statutBancaire: paiement.cheque.statutBancaire,
        }
      : null,
  };
}

@Injectable()
export class PaiementsClientsService {
  private readonly effectiveForexService: ForexService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly creancesService: CreancesClientsService,
    forexService?: ForexService,
  ) {
    this.effectiveForexService = forexService || new ForexService();
  }

  /**
   * Centralized function to recalculate CreanceClient status and total received amount
   * strictly from ACTIVE payments (estAnnule = false) belonging to (companyId + factureId).
   */
  private async recalculateReceivable(
    tx: Prisma.TransactionClient,
    companyId: number,
    factureId: number,
  ) {
    // 1. Row Lock CreanceClient using companyId + factureId
    const lockedRows: any[] = await tx.$queryRaw`
      SELECT id, company_id, facture_id, montant_facture, montant_recu, solde, statut_paiement, date_echeance
      FROM creances_clients
      WHERE company_id = ${companyId} AND facture_id = ${factureId}
      FOR UPDATE;
    `;

    if (!lockedRows || lockedRows.length === 0) {
      throw new NotFoundException(
        `Créance client introuvable pour l'entreprise #${companyId} et la facture #${factureId}`,
      );
    }

    const creanceRow = lockedRows[0];
    const montantFactureDecimal = new Prisma.Decimal(creanceRow.montant_facture);

    // 2. Fetch all ACTIVE payments for this facture
    const activePayments = await tx.paiementClient.findMany({
      where: {
        companyId,
        factureId,
        estAnnule: false,
      },
      select: {
        montantRecu: true,
      },
    });

    let activeTotalDecimal = new Prisma.Decimal(0);
    for (const p of activePayments) {
      activeTotalDecimal = activeTotalDecimal.add(new Prisma.Decimal(p.montantRecu));
    }

    const soldeDecimal = montantFactureDecimal.sub(activeTotalDecimal);

    let newStatut: CreanceStatut = CreanceStatut.NON_PAYE;
    const dateEcheance = creanceRow.date_echeance ? new Date(creanceRow.date_echeance) : null;
    const isOverdue = dateEcheance && dateEcheance < new Date();

    if (activeTotalDecimal.greaterThanOrEqualTo(montantFactureDecimal)) {
      newStatut = CreanceStatut.PAYE;
    } else if (activeTotalDecimal.greaterThan(0)) {
      newStatut = isOverdue ? CreanceStatut.EN_RETARD : CreanceStatut.PARTIEL;
    } else {
      newStatut = isOverdue ? CreanceStatut.EN_RETARD : CreanceStatut.NON_PAYE;
    }

    // 3. Update CreanceClient summary record
    return tx.creanceClient.update({
      where: { id: Number(creanceRow.id) },
      data: {
        montantRecu: activeTotalDecimal,
        statutPaiement: newStatut,
      },
    });
  }

  /**
   * Registers a new customer payment with concurrency-safe row-level locking (SELECT FOR UPDATE)
   * and exact Prisma.Decimal overpayment validation + Phase 7F Forex conversion.
   */
  async create(
    companyIdOrDto: number | CreatePaiementClientDto,
    maybeDto?: CreatePaiementClientDto,
    maybeUserId?: number,
  ): Promise<PaiementClientView> {
    let companyId: number | undefined;
    let dto: CreatePaiementClientDto;
    let currentUserId: number | undefined;

    if (typeof companyIdOrDto === 'number') {
      companyId = companyIdOrDto;
      dto = maybeDto!;
      currentUserId = maybeUserId;
    } else {
      dto = companyIdOrDto;
    }

    if (!companyId || companyId <= 0) {
      throw new UnauthorizedException('Identifiant entreprise requis pour enregistrer un règlement');
    }

    if (!Number.isFinite(dto.montantRecu) || dto.montantRecu <= 0) {
      throw new BadRequestException('Le montant reçu doit être supérieur à 0');
    }

    const chequeData = extractAndValidateChequeData(dto.methodePaiement, dto);
    const numeroFacture = dto.numeroFacture.trim().toUpperCase();
    const requestedDecimal = new Prisma.Decimal(dto.montantRecu);

    // 1. Fetch Facture to verify existence, tenant ownership, soft-delete state, and currency integrity
    const facture = await this.prisma.facture.findFirst({
      where: {
        numeroFacture,
        companyId,
      },
    });

    if (!facture) {
      throw new NotFoundException(`La facture "${numeroFacture}" est introuvable`);
    }

    if (facture.supprimeLe) {
      throw new BadRequestException(
        `La facture "${numeroFacture}" est annulée et ne peut plus recevoir de règlements`,
      );
    }

    const invoiceCurrency = facture.devise || 'MAD';

    if (dto.devise && dto.devise !== invoiceCurrency) {
      throw new BadRequestException(
        `La devise du règlement (${dto.devise}) doit correspondre à la devise de la facture (${invoiceCurrency})`,
      );
    }

    // 2. Determine Phase 7F Forex Conversion Parameters
    let tauxChangeDecimal: Prisma.Decimal | null = null;
    let montantConvertiMadDecimal: Prisma.Decimal | null = null;
    let sourceTauxData: string | null = null;
    let estTauxManuelData = false;
    let dateTauxUtiliseData: Date | null = null;

    if (invoiceCurrency === 'EUR') {
      const isManualRate = dto.tauxChange !== undefined && dto.tauxChange !== null;

      if (isManualRate) {
        if (dto.tauxChange! <= 0) {
          throw new BadRequestException('Le taux de change doit être supérieur à 0');
        }
        tauxChangeDecimal = new Prisma.Decimal(dto.tauxChange!);
        sourceTauxData = 'MANUEL';
        estTauxManuelData = true;
        dateTauxUtiliseData = null;
      } else {
        const datePaiementStr = dto.datePaiement
          ? new Date(dto.datePaiement).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

        const rateResult = await this.effectiveForexService.getEurToMadRate(datePaiementStr);
        tauxChangeDecimal = rateResult.rate;
        sourceTauxData = rateResult.source;
        estTauxManuelData = false;
        dateTauxUtiliseData = new Date(rateResult.date);
      }

      montantConvertiMadDecimal = requestedDecimal
        .mul(tauxChangeDecimal!)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Row-level locking on creances_clients using companyId + facture.id
      let lockedRows: any[] = await tx.$queryRaw`
        SELECT id, company_id, facture_id, montant_facture, montant_recu, solde, statut_paiement
        FROM creances_clients
        WHERE company_id = ${companyId} AND facture_id = ${facture.id}
        FOR UPDATE;
      `;

      if (!lockedRows || lockedRows.length === 0) {
        const sousTotalNum = Number(facture.sousTotal);
        const tauxTvaNum = Number(facture.tauxTva);
        const montantTva = Math.round(sousTotalNum * (tauxTvaNum / 100) * 100) / 100;
        const montantTotal =
          facture.montantTotal !== null && facture.montantTotal !== undefined
            ? Number(facture.montantTotal)
            : sousTotalNum + montantTva;

        await this.creancesService.createFromInvoice(tx, {
          companyId,
          factureId: facture.id,
          numeroFacture,
          nomClient: facture.nomClient,
          dateFacture: facture.dateFacture,
          joursEcheance: facture.joursEcheance,
          montantTotal,
          dateEcheance: facture.dateEcheance,
          devise: invoiceCurrency,
        });

        lockedRows = await tx.$queryRaw`
          SELECT id, company_id, facture_id, montant_facture, montant_recu, solde, statut_paiement
          FROM creances_clients
          WHERE company_id = ${companyId} AND facture_id = ${facture.id}
          FOR UPDATE;
        `;
      }

      const creanceRow = lockedRows[0];
      const currentMontantFacture = new Prisma.Decimal(creanceRow.montant_facture);
      const currentMontantRecu = new Prisma.Decimal(creanceRow.montant_recu);
      const currentSolde = currentMontantFacture.sub(currentMontantRecu);

      if (currentSolde.lessThanOrEqualTo(0) || creanceRow.statut_paiement === 'PAYE') {
        throw new ConflictException(
          `La créance pour la facture "${numeroFacture}" est déjà intégralement réglée`,
        );
      }

      if (requestedDecimal.greaterThan(currentSolde)) {
        throw new ConflictException(
          `Le montant du règlement (${requestedDecimal.toFixed(2)} ${invoiceCurrency}) dépasse le solde restant de la créance (${currentSolde.toFixed(2)} ${invoiceCurrency})`,
        );
      }

      const datePaiement = dto.datePaiement ? new Date(dto.datePaiement) : new Date();
      const nomClient = dto.nomClient ? dto.nomClient.trim() : facture.nomClient;

      const createdPaiement = await tx.paiementClient.create({
        data: {
          companyId,
          factureId: facture.id,
          numeroFacture,
          nomClient,
          datePaiement,
          montantRecu: requestedDecimal,
          methodePaiement: dto.methodePaiement,
          devise: invoiceCurrency,
          tauxChange: tauxChangeDecimal,
          montantConvertiMad: montantConvertiMadDecimal,
          sourceTaux: sourceTauxData,
          estTauxManuel: estTauxManuelData,
          dateTauxUtilise: dateTauxUtiliseData,
          creeParId: currentUserId ?? null,
          creeLe: new Date(),
          lettreDeChange:
            dto.methodePaiement === 'EFFET'
              ? {
                  create: {
                    numero: dto.lettreNumero!,
                    dateEcheance: new Date(dto.lettreDateEcheance!),
                    montant: new Prisma.Decimal(dto.lettreMontant!),
                    beneficiaire: dto.lettreBeneficiaire!,
                    cause: dto.lettreCause!,
                    tireNom: dto.lettreTireNom ?? '',
                    tireAdresse: dto.lettreTireAdresse ?? '',
                  },
                }
              : undefined,
          cheque: chequeData ? { create: chequeData } : undefined,
        },
        include: {
          lettreDeChange: true,
          cheque: true,
        },
      });

      const updatedCreance = await this.recalculateReceivable(tx, companyId, facture.id);

      return {
        paiement: createdPaiement,
        creance: updatedCreance,
        facture,
      };
    });

    return toPaiementView(result.paiement, result.creance, result.facture);
  }

  /**
   * Edit an active customer payment with atomic child instrument synchronization
   * and complete active-payment recalculation.
   */
  async update(
    id: number,
    dto: UpdatePaiementClientDto,
    companyId: number,
    currentUserId?: number,
  ): Promise<PaiementClientView> {
    if (!companyId || companyId <= 0) {
      throw new UnauthorizedException('Identifiant entreprise requis pour modifier un règlement');
    }

    const existingPayment = await this.prisma.paiementClient.findFirst({
      where: {
        id,
        facture: {
          companyId,
          supprimeLe: null,
        },
      },
      include: {
        facture: true,
        cheque: true,
        lettreDeChange: true,
      },
    });

    if (!existingPayment) {
      throw new NotFoundException(`Règlement #${id} introuvable`);
    }

    if (existingPayment.estAnnule) {
      throw new ConflictException(`Le règlement #${id} est annulé et ne peut plus être modifié`);
    }

    // Banking instrument status validation
    const chequeStatus = existingPayment.cheque?.statutBancaire;
    const lettreStatus = existingPayment.lettreDeChange?.statutBancaire;

    if (
      chequeStatus === 'DEPOSE_EN_BANQUE' ||
      chequeStatus === 'ENCAISSE' ||
      lettreStatus === 'DEPOSE_EN_BANQUE' ||
      lettreStatus === 'ENCAISSE'
    ) {
      throw new ConflictException(
        'Modification impossible : l’instrument bancaire associé est déjà déposé ou encaissé',
      );
    }

    if (
      (chequeStatus === 'REJETE_IMPAYE' || lettreStatus === 'REJETE_IMPAYE') &&
      ((dto.montantRecu !== undefined && dto.montantRecu !== Number(existingPayment.montantRecu)) ||
        (dto.methodePaiement !== undefined &&
          dto.methodePaiement !== existingPayment.methodePaiement))
    ) {
      throw new ConflictException(
        'Modification du montant ou de la méthode impossible : l’instrument bancaire a été rejeté par la banque',
      );
    }

    const newMethode = dto.methodePaiement || existingPayment.methodePaiement;
    const chequeData =
      newMethode === 'CHEQUE' ? extractAndValidateChequeData(newMethode, dto) : null;

    const invoiceCurrency = existingPayment.facture.devise || 'MAD';

    if (dto.devise && dto.devise !== invoiceCurrency) {
      throw new BadRequestException(
        `La devise du règlement (${dto.devise}) doit correspondre à la devise de la facture (${invoiceCurrency})`,
      );
    }

    const updatedPaiement = await this.prisma.$transaction(async (tx) => {
      // 1. Lock CreanceClient row using tenant-safe companyId + factureId
      const lockedRows: any[] = await tx.$queryRaw`
        SELECT id, company_id, facture_id, montant_facture, montant_recu, solde, statut_paiement
        FROM creances_clients
        WHERE company_id = ${companyId} AND facture_id = ${existingPayment.factureId}
        FOR UPDATE;
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new NotFoundException(`Créance client introuvable pour la facture #${existingPayment.factureId}`);
      }

      const creanceRow = lockedRows[0];
      const montantFactureDecimal = new Prisma.Decimal(creanceRow.montant_facture);

      // 2. Fetch other active payments for overpayment validation
      const otherActivePayments = await tx.paiementClient.findMany({
        where: {
          companyId,
          factureId: existingPayment.factureId,
          estAnnule: false,
          id: { not: id },
        },
        select: { montantRecu: true },
      });

      let otherTotalDecimal = new Prisma.Decimal(0);
      for (const p of otherActivePayments) {
        otherTotalDecimal = otherTotalDecimal.add(new Prisma.Decimal(p.montantRecu));
      }

      const availableSolde = montantFactureDecimal.sub(otherTotalDecimal);
      const newAmountDecimal =
        dto.montantRecu !== undefined
          ? new Prisma.Decimal(dto.montantRecu)
          : new Prisma.Decimal(existingPayment.montantRecu);

      if (newAmountDecimal.greaterThan(availableSolde)) {
        throw new ConflictException(
          `Le nouveau montant (${newAmountDecimal.toFixed(2)} ${invoiceCurrency}) dépasse le solde disponible (${availableSolde.toFixed(2)} ${invoiceCurrency})`,
        );
      }

      // 3. Forex calculation
      let tauxChangeDecimal = existingPayment.tauxChange;
      let montantConvertiMadDecimal = existingPayment.montantConvertiMad;
      let sourceTauxData = existingPayment.sourceTaux;
      let estTauxManuelData = existingPayment.estTauxManuel;
      let dateTauxUtiliseData = existingPayment.dateTauxUtilise;

      if (invoiceCurrency === 'EUR') {
        const isManualRate = dto.tauxChange !== undefined && dto.tauxChange !== null;
        if (isManualRate) {
          if (dto.tauxChange! <= 0) {
            throw new BadRequestException('Le taux de change doit être supérieur à 0');
          }
          tauxChangeDecimal = new Prisma.Decimal(dto.tauxChange!);
          sourceTauxData = 'MANUEL';
          estTauxManuelData = true;
          dateTauxUtiliseData = null;
        } else if (dto.datePaiement || dto.montantRecu) {
          const datePaiementStr = dto.datePaiement
            ? new Date(dto.datePaiement).toISOString().split('T')[0]
            : new Date(existingPayment.datePaiement).toISOString().split('T')[0];

          const rateResult = await this.effectiveForexService.getEurToMadRate(datePaiementStr);
          tauxChangeDecimal = rateResult.rate;
          sourceTauxData = rateResult.source;
          estTauxManuelData = false;
          dateTauxUtiliseData = new Date(rateResult.date);
        }

        if (tauxChangeDecimal) {
          montantConvertiMadDecimal = newAmountDecimal
            .mul(tauxChangeDecimal)
            .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        }
      }

      // 4. Atomic instrument synchronization
      if (newMethode !== existingPayment.methodePaiement) {
        if (existingPayment.cheque) {
          await tx.cheque.delete({ where: { idPaiementClient: id } });
        }
        if (existingPayment.lettreDeChange) {
          await tx.lettreDeChange.delete({ where: { idPaiementClient: id } });
        }
      }

      // Handle cheque creation/update
      if (newMethode === 'CHEQUE') {
        if (chequeData) {
          await tx.cheque.upsert({
            where: { idPaiementClient: id },
            create: { ...chequeData, idPaiementClient: id },
            update: chequeData,
          });
        }
        if (existingPayment.lettreDeChange && newMethode !== existingPayment.methodePaiement) {
          await tx.lettreDeChange.deleteMany({ where: { idPaiementClient: id } });
        }
      }

      // Handle lettre de change creation/update
      if (newMethode === 'EFFET') {
        const existingLdc = existingPayment.lettreDeChange;
        if (dto.lettreNumero || existingLdc) {
          const ldcData = {
            numero: dto.lettreNumero || existingLdc?.numero || '',
            dateEcheance: dto.lettreDateEcheance
              ? new Date(dto.lettreDateEcheance)
              : existingLdc?.dateEcheance
                ? new Date(existingLdc.dateEcheance)
                : new Date(),
            montant:
              dto.lettreMontant !== undefined
                ? new Prisma.Decimal(dto.lettreMontant)
                : existingLdc?.montant
                  ? new Prisma.Decimal(existingLdc.montant)
                  : newAmountDecimal,
            beneficiaire: dto.lettreBeneficiaire ?? existingLdc?.beneficiaire ?? '',
            cause: dto.lettreCause ?? existingLdc?.cause ?? '',
            tireNom: dto.lettreTireNom ?? existingLdc?.tireNom ?? '',
            tireAdresse: dto.lettreTireAdresse ?? existingLdc?.tireAdresse ?? '',
          };
          await tx.lettreDeChange.upsert({
            where: { idPaiementClient: id },
            create: { ...ldcData, idPaiementClient: id },
            update: ldcData,
          });
        }
        if (existingPayment.cheque && newMethode !== existingPayment.methodePaiement) {
          await tx.cheque.deleteMany({ where: { idPaiementClient: id } });
        }
      }

      // If method is cash/virement, delete any remaining child instruments
      if (newMethode !== 'CHEQUE' && newMethode !== 'EFFET') {
        await tx.cheque.deleteMany({ where: { idPaiementClient: id } });
        await tx.lettreDeChange.deleteMany({ where: { idPaiementClient: id } });
      }

      // 5. Update PaiementClient record
      const datePaiement = dto.datePaiement
        ? new Date(dto.datePaiement)
        : existingPayment.datePaiement;

      const p = await tx.paiementClient.update({
        where: { id },
        data: {
          datePaiement,
          montantRecu: newAmountDecimal,
          methodePaiement: newMethode,
          tauxChange: tauxChangeDecimal,
          montantConvertiMad: montantConvertiMadDecimal,
          sourceTaux: sourceTauxData,
          estTauxManuel: estTauxManuelData,
          dateTauxUtilise: dateTauxUtiliseData,
        },
        include: {
          facture: { include: { creance: true } },
          cheque: true,
          lettreDeChange: true,
        },
      });

      // 6. Recalculate CreanceClient status and received total from active payments
      await this.recalculateReceivable(tx, companyId, existingPayment.factureId);

      return p;
    });

    return this.findOne(id, companyId);
  }

  /**
   * Logically cancel a customer payment preserving financial history.
   */
  async cancel(
    id: number,
    dto: CancelPaiementClientDto,
    companyId: number,
    currentUserId?: number,
  ): Promise<PaiementClientView> {
    if (!companyId || companyId <= 0) {
      throw new UnauthorizedException('Identifiant entreprise requis pour annuler un règlement');
    }

    const existingPayment = await this.prisma.paiementClient.findFirst({
      where: {
        id,
        facture: {
          companyId,
          supprimeLe: null,
        },
      },
      include: {
        facture: true,
        cheque: true,
        lettreDeChange: true,
      },
    });

    if (!existingPayment) {
      throw new NotFoundException(`Règlement #${id} introuvable`);
    }

    if (existingPayment.estAnnule) {
      throw new ConflictException(`Le règlement #${id} est déjà annulé`);
    }

    // Banking instrument status validation
    const chequeStatus = existingPayment.cheque?.statutBancaire;
    const lettreStatus = existingPayment.lettreDeChange?.statutBancaire;

    if (
      chequeStatus === 'DEPOSE_EN_BANQUE' ||
      chequeStatus === 'ENCAISSE' ||
      lettreStatus === 'DEPOSE_EN_BANQUE' ||
      lettreStatus === 'ENCAISSE'
    ) {
      throw new ConflictException(
        'Annulation impossible : l’instrument bancaire associé est déjà déposé ou encaissé',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Lock CreanceClient row using tenant-safe companyId + factureId
      const lockedRows: any[] = await tx.$queryRaw`
        SELECT id FROM creances_clients
        WHERE company_id = ${companyId} AND facture_id = ${existingPayment.factureId}
        FOR UPDATE;
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new NotFoundException(`Créance client introuvable pour la facture #${existingPayment.factureId}`);
      }

      // 2. Update PaiementClient cancellation fields
      await tx.paiementClient.update({
        where: { id },
        data: {
          estAnnule: true,
          dateAnnulation: new Date(),
          motifAnnulation: dto.motifAnnulation.trim(),
          annuleParId: currentUserId ?? null,
        },
      });

      // 3. Update child banking instrument status to ANNULE if present
      if (existingPayment.cheque) {
        await tx.cheque.update({
          where: { idPaiementClient: id },
          data: { statutBancaire: 'ANNULE' },
        });
      }

      if (existingPayment.lettreDeChange) {
        await tx.lettreDeChange.update({
          where: { idPaiementClient: id },
          data: { statutBancaire: 'ANNULE' },
        });
      }

      // 4. Recalculate CreanceClient status and received total excluding cancelled payments
      await this.recalculateReceivable(tx, companyId, existingPayment.factureId);
    });

    return this.findOne(id, companyId);
  }

  /**
   * Strictly read-only paginated payments list query.
   */
  async findAll(
    companyIdOrQuery?: number | QueryPaiementClientDto,
    maybeQuery?: QueryPaiementClientDto,
  ): Promise<PaginatedResult<PaiementClientView>> {
    let companyId: number | undefined;
    let query: QueryPaiementClientDto;
    if (typeof companyIdOrQuery === 'number') {
      companyId = companyIdOrQuery;
      query = maybeQuery ?? {};
    } else {
      query = companyIdOrQuery ?? {};
    }

    if (!companyId || companyId <= 0) {
      throw new UnauthorizedException('Identifiant entreprise requis pour consulter les règlements');
    }

    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);

    const allowedSortFields = ['id', 'numeroFacture', 'nomClient', 'datePaiement', 'montantRecu'];
    const sortBy = allowedSortFields.includes(query.sortBy ?? '') ? query.sortBy! : 'id';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.PaiementClientWhereInput = {
      facture: {
        companyId,
        supprimeLe: null,
      },
    };

    if (query.devise) {
      where.devise = query.devise.trim().toUpperCase();
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { numeroFacture: { contains: s, mode: 'insensitive' } },
        { nomClient: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query.nomClient) {
      where.nomClient = { contains: query.nomClient.trim(), mode: 'insensitive' };
    }

    if (query.numeroFacture) {
      where.numeroFacture = { contains: query.numeroFacture.trim(), mode: 'insensitive' };
    }

    if (query.methodePaiement) {
      where.methodePaiement = query.methodePaiement;
    }

    if (query.dateFrom || query.dateTo) {
      where.datePaiement = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.paiementClient.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          lettreDeChange: true,
          cheque: true,
        },
      }),
      this.prisma.paiementClient.count({ where }),
    ]);

    const numFactures = data.map((p) => p.numeroFacture);
    const factures = numFactures.length
      ? await this.prisma.facture.findMany({
          where: { numeroFacture: { in: numFactures }, companyId },
          include: { creance: true },
        })
      : [];
    const factureMap = new Map(factures.map((f) => [f.numeroFacture, f]));

    return {
      data: data.map((p) => {
        const f = factureMap.get(p.numeroFacture);
        return toPaiementView(p, f?.creance, f);
      }),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  /**
   * Strictly read-only single payment lookup with single-step relational ownership constraint.
   */
  async findOne(id: number, companyId?: number): Promise<PaiementClientView> {
    if (!companyId || companyId <= 0) {
      throw new UnauthorizedException('Identifiant entreprise requis pour consulter un règlement');
    }

    const paiement = await this.prisma.paiementClient.findFirst({
      where: {
        id,
        facture: {
          companyId,
          supprimeLe: null,
        },
      },
      include: {
        lettreDeChange: true,
        cheque: true,
        facture: {
          include: {
            creance: true,
          },
        },
      },
    });

    if (!paiement) {
      throw new NotFoundException(`Règlement #${id} introuvable`);
    }

    const f = (paiement as any).facture;
    return toPaiementView(paiement, f?.creance, f);
  }

  /**
   * Payment statistics calculation over active payments.
   */
  async findStats(
    companyIdOrQuery?: number | QueryPaiementClientDto,
    maybeQuery?: QueryPaiementClientDto,
  ): Promise<PaiementClientStats & { devise?: string }> {
    let companyId: number | undefined;
    let query: QueryPaiementClientDto | undefined;
    if (typeof companyIdOrQuery === 'number') {
      companyId = companyIdOrQuery;
      query = maybeQuery;
    } else {
      query = companyIdOrQuery;
    }

    if (!companyId || companyId <= 0) {
      throw new UnauthorizedException('Identifiant entreprise requis pour consulter les statistiques');
    }

    const where: Prisma.PaiementClientWhereInput = {
      facture: {
        companyId,
        supprimeLe: null,
      },
    };

    if (query?.devise) {
      where.devise = query.devise.trim().toUpperCase();
    }

    const paiements = await this.prisma.paiementClient.findMany({
      where,
    });

    const activePaiements = paiements.filter((p) => !p.estAnnule);
    const cancelledCount = paiements.filter((p) => p.estAnnule).length;

    const devisesInActive = new Set(activePaiements.map((p) => p.devise || 'MAD'));
    const isMixed = devisesInActive.size > 1;

    let totalDecimal = new Prisma.Decimal(0);
    const methodesCount: Record<string, number> = {};

    for (const p of activePaiements) {
      const montant = new Prisma.Decimal(p.montantRecu ?? 0);
      if (!isMixed) {
        totalDecimal = totalDecimal.add(montant);
      }

      const m = String(p.methodePaiement);
      methodesCount[m] = (methodesCount[m] || 0) + 1;
    }

    return {
      totalPaiements: activePaiements.length,
      montantTotalRecu: Math.round(totalDecimal.toNumber() * 100) / 100,
      methodesCount,
      cancelledCount,
      devise: isMixed ? 'MIXED' : query?.devise || Array.from(devisesInActive)[0] || 'MAD',
    };
  }
}
