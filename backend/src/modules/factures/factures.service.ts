import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreancesClientsService } from '../creances-clients/creances-clients.service';
import { CreateFactureDto } from './dto/create-facture.dto';
import { UpdateFactureDto } from './dto/update-facture.dto';
import { QueryFactureDto } from './dto/query-facture.dto';
import {
  generateInvoicePdfBuffer,
  InvoicePdfViewModel,
  sanitizeFilename,
} from './utils/facture-pdf.generator';
import { formatInvoiceNumber } from './utils/invoice-number.formatter';
import { amountInWordsFR } from './utils/amount-in-words';
import { formatMoney } from './utils/format-money';
import { formatDateFR } from './utils/format-date';

export interface CompactVoyageSummary {
  idVoyage: number;
  lieuChargement: string;
  lieuDechargement: string;
  statut: string;
  tracteur: string | null;
  remorque: string | null;
  dateChargementStr: string | null;
  numeroCmr: string | null;
}

export interface FactureView {
  id: number;
  numeroFacture: string;
  nomClient: string;
  idVoyage: number | null;
  dateFacture: string;
  joursEcheance: number;
  dateEcheance: string | null;
  devise: string;
  sousTotal: number;
  tauxTva: number;
  montantTva: number;
  montantTotal: number;
  montantEnLettres: string | null;
  cheminPdf: string | null;
  notes: string | null;
  fichierJoint: string | null;
  creePar: number | null;
  statut: string;
  supprimeLe: string | null;
  voyage?: CompactVoyageSummary | null;
  montantPaye: string;
  soldeRestant: string;
}

export interface FactureStats {
  totalFactures: number;
  totalSousTotal: number;
  totalTva: number;
  totalTtc: number;
  emisesCount: number;
  payeesCount: number;
  annuleesCount: number;
}

// formatMoneyDecimal removed — replaced by formatMoney() from format-money.ts (Decimal-safe)

export function toFactureView(facture: any): FactureView {
  const sousTotal =
    facture.sousTotal !== undefined && facture.sousTotal !== null ? Number(facture.sousTotal) : 0;
  const tauxTva =
    facture.tauxTva !== undefined && facture.tauxTva !== null ? Number(facture.tauxTva) : 20.0;

  const calculatedTva = Math.round(sousTotal * (tauxTva / 100) * 100) / 100;
  const montantTva =
    facture.montantTva !== undefined && facture.montantTva !== null
      ? Number(facture.montantTva)
      : calculatedTva;

  const montantTotal =
    facture.montantTotal !== undefined && facture.montantTotal !== null
      ? Number(facture.montantTotal)
      : sousTotal + montantTva;

  // Decimal calculations for paid/remaining balances (preventing N+1 by using query relation loaded values)
  const payeDecimal = (facture.paiements ?? []).reduce(
    (total: Prisma.Decimal, p: any) => total.plus(p.montantRecu),
    new Prisma.Decimal(0),
  );
  const totalTtcDecimal = new Prisma.Decimal(facture.montantTotal ?? sousTotal + calculatedTva);
  const rawRemaining = totalTtcDecimal.minus(payeDecimal);
  const soldeDecimal = rawRemaining.isNegative() ? new Prisma.Decimal(0) : rawRemaining;

  const montantPaye = payeDecimal.toFixed(2);
  const soldeRestant = soldeDecimal.toFixed(2);

  let statut = 'EMISE';
  if (facture.supprimeLe) {
    statut = 'ANNULEE';
  } else if (soldeDecimal.isZero()) {
    statut = 'PAYEE';
  } else if (payeDecimal.greaterThan(0) && soldeDecimal.greaterThan(0)) {
    statut = 'PARTIELLEMENT_PAYEE';
  } else if (facture.dateEcheance && new Date(facture.dateEcheance) < new Date()) {
    statut = 'EN_RETARD';
  }

  return {
    id: facture.id,
    numeroFacture: facture.numeroFacture,
    nomClient: facture.nomClient,
    idVoyage: facture.idVoyage ?? null,
    dateFacture: facture.dateFacture
      ? new Date(facture.dateFacture).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    joursEcheance: facture.joursEcheance ?? 30,
    dateEcheance: facture.dateEcheance
      ? new Date(facture.dateEcheance).toISOString().split('T')[0]
      : null,
    devise: facture.devise || 'MAD',
    sousTotal,
    tauxTva,
    montantTva,
    montantTotal,
    montantEnLettres: facture.montantEnLettres ?? null,
    cheminPdf: facture.cheminPdf ?? null,
    notes: facture.notes ?? null,
    fichierJoint: facture.fichierJoint ?? null,
    creePar: facture.creePar ?? null,
    statut,
    supprimeLe: facture.supprimeLe ? new Date(facture.supprimeLe).toISOString() : null,
    voyage: facture.voyage
      ? {
          idVoyage: facture.voyage.idVoyage,
          lieuChargement: facture.voyage.lieuChargement,
          lieuDechargement: facture.voyage.lieuDechargement,
          statut: facture.voyage.statut,
          tracteur: facture.voyage.tracteur ?? null,
          remorque: facture.voyage.remorque ?? null,
          dateChargementStr: facture.voyage.dateChargement
            ? new Date(facture.voyage.dateChargement).toISOString().split('T')[0]
            : null,
          numeroCmr: facture.voyage.numeroCmr ?? null,
        }
      : null,
    montantPaye,
    soldeRestant,
  };
}

@Injectable()
export class FacturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creancesService: CreancesClientsService,
  ) {}

  async create(dto: CreateFactureDto, userId?: number): Promise<FactureView> {
    if (!dto.idVoyage) {
      throw new UnprocessableEntityException('Le voyage est obligatoire pour créer une facture');
    }

    const tauxTvaInput = dto.tauxTva !== undefined ? dto.tauxTva : 20.0;
    if (!Number.isFinite(tauxTvaInput) || tauxTvaInput < 0 || tauxTvaInput > 100) {
      throw new BadRequestException('Le taux de TVA doit être compris entre 0 et 100%');
    }

    const dateFacture = dto.dateFacture ? new Date(dto.dateFacture) : new Date();
    const joursEcheance = dto.joursEcheance ?? 30;

    return this.prisma.$transaction(async (tx) => {
      // 1. Load Voyage and verify existence
      const voyage = await tx.voyage.findUnique({
        where: { idVoyage: dto.idVoyage },
      });

      if (!voyage) {
        throw new NotFoundException(`Le voyage #${dto.idVoyage} est introuvable`);
      }

      // 2. Verify Voyage has a client name
      if (!voyage.nomClient) {
        throw new UnprocessableEntityException(
          `Le voyage #${dto.idVoyage} n'est pas rattaché à un client. Veuillez d'abord lui attribuer un client.`,
        );
      }

      const nomClient = voyage.nomClient;

      // 3. Derive authoritative HT amount from Voyage using Prisma.Decimal
      const sousTotalDecimal = new Prisma.Decimal(voyage.montantVoyage);
      const tauxTvaDecimal = new Prisma.Decimal(tauxTvaInput);
      const montantTvaDecimal = sousTotalDecimal.mul(tauxTvaDecimal).div(100).toDecimalPlaces(2);
      const montantTotalDecimal = sousTotalDecimal.add(montantTvaDecimal).toDecimalPlaces(2);

      // 4. Generate dynamic amount in words
      const montantEnLettres = amountInWordsFR(montantTotalDecimal);

      // 5. Concurrency-safe annual sequence generation
      const year = dateFacture.getFullYear();
      const seqResult: Array<{ dernier_numero: number }> = await tx.$queryRaw`
        INSERT INTO invoice_sequences (annee, dernier_numero)
        VALUES (${year}, 1)
        ON CONFLICT (annee) DO UPDATE
        SET dernier_numero = invoice_sequences.dernier_numero + 1
        RETURNING dernier_numero;
      `;
      const seqNum = seqResult[0].dernier_numero;
      const numeroFacture = formatInvoiceNumber(year, seqNum);

      // 6. Create Facture record (omitting generated columns montantTva and montantTotal)
      const facture = await tx.facture.create({
        data: {
          numeroFacture,
          nomClient,
          idVoyage: voyage.idVoyage,
          dateFacture,
          joursEcheance,
          sousTotal: sousTotalDecimal,
          tauxTva: tauxTvaDecimal,
          montantEnLettres,
          notes: dto.notes ? dto.notes.trim() : null,
          creePar: userId ?? null,
        },
        include: {
          voyage: true,
        },
      });

      // 7. Update Voyage status to FACTURE
      await tx.voyage.update({
        where: { idVoyage: voyage.idVoyage },
        data: { statut: 'FACTURE' },
      });

      // 8. Auto-create CreanceClient record in transaction
      await this.creancesService.createFromInvoice(tx, {
        numeroFacture,
        nomClient,
        dateFacture,
        joursEcheance,
        montantTotal: Number(montantTotalDecimal),
        dateEcheance: facture.dateEcheance ?? null,
      });

      const full = await tx.facture.findUnique({
        where: { id: facture.id },
        include: {
          voyage: true,
          creance: true,
          paiements: {
            select: {
              montantRecu: true,
            },
          },
        },
      });

      return toFactureView(full);
    });
  }

  async findAll(query: QueryFactureDto): Promise<PaginatedResult<FactureView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);

    const allowedSortFields = [
      'id',
      'numeroFacture',
      'nomClient',
      'dateFacture',
      'dateEcheance',
      'sousTotal',
      'montantTotal',
    ];
    const sortBy = allowedSortFields.includes(query.sortBy ?? '') ? query.sortBy! : 'id';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.FactureWhereInput = {
      supprimeLe: query.statut === 'ANNULEE' ? { not: null } : null,
    };

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { numeroFacture: { contains: s, mode: 'insensitive' } },
        { nomClient: { contains: s, mode: 'insensitive' } },
        { notes: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query.nomClient) {
      where.nomClient = { contains: query.nomClient.trim(), mode: 'insensitive' };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.facture.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          voyage: true,
          creance: true,
          paiements: {
            select: {
              montantRecu: true,
            },
          },
        },
      }),
      this.prisma.facture.count({ where }),
    ]);

    return {
      data: data.map(toFactureView),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findStats(): Promise<FactureStats> {
    const activeFactures = await this.prisma.facture.findMany({
      where: { supprimeLe: null },
      include: { creance: true },
    });

    const annuleesCount = await this.prisma.facture.count({
      where: { supprimeLe: { not: null } },
    });

    let totalSousTotal = 0;
    let totalTva = 0;
    let totalTtc = 0;
    let emisesCount = 0;
    let payeesCount = 0;

    for (const f of activeFactures) {
      const st = Number(f.sousTotal || 0);
      const ttc = Number(f.montantTotal || 0);
      const tva = Number(f.montantTva || ttc - st);

      totalSousTotal += st;
      totalTva += tva;
      totalTtc += ttc;

      if (f.creance?.statutPaiement === 'PAYE') {
        payeesCount++;
      } else {
        emisesCount++;
      }
    }

    return {
      totalFactures: activeFactures.length,
      totalSousTotal: Math.round(totalSousTotal * 100) / 100,
      totalTva: Math.round(totalTva * 100) / 100,
      totalTtc: Math.round(totalTtc * 100) / 100,
      emisesCount,
      payeesCount,
      annuleesCount,
    };
  }

  async findOne(id: number): Promise<FactureView> {
    const facture = await this.prisma.facture.findUnique({
      where: { id },
      include: {
        voyage: true,
        creance: true,
        paiements: {
          select: {
            montantRecu: true,
          },
        },
      },
    });

    if (!facture) {
      throw new NotFoundException(`Facture #${id} introuvable`);
    }

    return toFactureView(facture);
  }

  async update(id: number, dto: UpdateFactureDto): Promise<FactureView> {
    const existing = await this.prisma.facture.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Facture #${id} introuvable`);
    }

    if (
      dto.tauxTva !== undefined &&
      (!Number.isFinite(dto.tauxTva) || dto.tauxTva < 0 || dto.tauxTva > 100)
    ) {
      throw new BadRequestException('Le taux de TVA doit être compris entre 0 et 100%');
    }

    const updatedTauxTva =
      dto.tauxTva !== undefined ? new Prisma.Decimal(dto.tauxTva) : existing.tauxTva;
    const sousTotalDecimal = existing.sousTotal;
    const montantTvaDecimal = sousTotalDecimal.mul(updatedTauxTva).div(100).toDecimalPlaces(2);
    const montantTotalDecimal = sousTotalDecimal.add(montantTvaDecimal).toDecimalPlaces(2);
    const montantEnLettres = amountInWordsFR(montantTotalDecimal);

    const updated = await this.prisma.facture.update({
      where: { id },
      data: {
        tauxTva: updatedTauxTva,
        montantEnLettres,
        ...(dto.notes !== undefined ? { notes: dto.notes ? dto.notes.trim() : null } : {}),
      },
      include: {
        voyage: true,
        creance: true,
        paiements: {
          select: {
            montantRecu: true,
          },
        },
      },
    });

    return toFactureView(updated);
  }

  async remove(id: number): Promise<{ id: number; message: string }> {
    const existing = await this.prisma.facture.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Facture #${id} introuvable`);
    }

    await this.prisma.facture.update({
      where: { id },
      data: { supprimeLe: new Date() },
    });

    return { id, message: `Facture #${id} annulée avec succès (Soft delete)` };
  }

  async generatePdf(
    id: number,
    includeStamp: boolean = false,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const facture = await this.prisma.facture.findUnique({
      where: { id },
      include: {
        voyage: true,
        creance: true,
      },
    });

    if (!facture || facture.supprimeLe) {
      throw new NotFoundException(`Facture #${id} annulée ou introuvable`);
    }

    // Load company settings
    const company = await this.prisma.companySettings.findUnique({
      where: { singletonKey: 'DEFAULT' },
    });

    const hasName = Boolean(company?.nomEntreprise && company.nomEntreprise.trim().length > 0);
    const hasAddress = Boolean(company?.adresse && company.adresse.trim().length > 0);
    const hasPhone = Boolean(company?.telephone && company.telephone.trim().length > 0);
    const hasEmail = Boolean(company?.email && company.email.trim().length > 0);

    const isConfigured = hasName && hasAddress && hasPhone && hasEmail;

    if (!isConfigured || !company) {
      throw new UnprocessableEntityException(
        "Impossible de générer la facture PDF : le profil de l'entreprise est incomplet. Veuillez configurer le nom, l'adresse, le téléphone et l'email dans les paramètres.",
      );
    }

    // Resolve client details from nomClient (denormalized field)
    let clientDetails = {
      nomEntreprise: facture.nomClient,
      ice: null as string | null,
      adresse: null as string | null,
      telephone: null as string | null,
      email: null as string | null,
    };

    const clientDb = await this.prisma.client.findFirst({
      where: { nomEntreprise: { equals: facture.nomClient, mode: 'insensitive' } },
    });
    if (clientDb) {
      clientDetails = {
        nomEntreprise: clientDb.nomEntreprise,
        ice: clientDb.ice ?? null,
        adresse: clientDb.adresse ?? null,
        telephone: clientDb.telephone ?? null,
        email: clientDb.email ?? null,
      };
    }

    const view = toFactureView(facture);

    // Determine currency from facture or company settings
    const devise = facture.devise || company.devise || 'MAD';
    const tauxTvaNum = Number(facture.tauxTva ?? 20);

    const viewModel: InvoicePdfViewModel = {
      numeroFacture: facture.numeroFacture,
      dateFactureStr: formatDateFR(view.dateFacture),
      dateEcheanceStr: view.dateEcheance ? formatDateFR(view.dateEcheance) : '—',
      statut: view.statut,
      tauxTva: tauxTvaNum,
      sousTotalFormatted: formatMoney(facture.sousTotal, devise),
      tauxTvaFormatted: `${tauxTvaNum} %`,
      montantTvaFormatted: formatMoney(facture.montantTva ?? new Prisma.Decimal(0), devise),
      montantTotalFormatted: formatMoney(facture.montantTotal ?? new Prisma.Decimal(0), devise),
      montantEnLettres: facture.montantEnLettres || amountInWordsFR(facture.montantTotal || 0),
      notes: facture.notes ?? null,
      client: clientDetails,
      transport: facture.voyage
        ? {
            idVoyage: facture.voyage.idVoyage,
            typeVoyage: facture.voyage.typeVoyage,
            tracteur: facture.voyage.tracteur ?? null,
            remorque: facture.voyage.remorque ?? null,
            nomConducteur: facture.voyage.nomConducteur ?? null,
            lieuChargement: facture.voyage.lieuChargement,
            lieuDechargement: facture.voyage.lieuDechargement,
            dateChargementStr: formatDateFR(
              facture.voyage.dateChargement?.toISOString().split('T')[0],
            ),
            numeroCmr: facture.voyage.numeroCmr ?? null,
          }
        : null,
      company: {
        nomEntreprise: company.nomEntreprise!,
        nomLegal: company.nomLegal ?? null,
        adresse: company.adresse!,
        ville: company.ville ?? null,
        pays: company.pays ?? null,
        telephone: company.telephone!,
        telephoneSecondaire: company.telephoneSecondaire ?? null,
        email: company.email!,
        ice: company.ice ?? null,
        identifiantFiscal: company.identifiantFiscal ?? null,
        registreCommerce: company.registreCommerce ?? null,
        cnss: company.cnss ?? null,
        patente: company.patente ?? null,
        siteWeb: company.siteWeb ?? null,
        nomBanque: company.nomBanque ?? null,
        rib: company.rib ?? null,
        iban: company.iban ?? null,
        swiftBic: company.swiftBic ?? null,
        devise,
        footerText: company.textePiedDePage ?? null,
        legalTaxNote: company.noteLegaleTva ?? null,
        logoPhysicalPath: company.logoPath ?? null,
        stampPhysicalPath: company.stampPath ?? null,
      },
      template: company.templateFacture || 'CLASSIC_TRANSPORT',
    };

    const buffer = await generateInvoicePdfBuffer(viewModel, { includeStamp });
    const rawFilename = `Facture-${facture.numeroFacture}.pdf`;
    const filename = sanitizeFilename(rawFilename);

    return { buffer, filename };
  }
}
