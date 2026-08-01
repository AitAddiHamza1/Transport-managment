import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaiementEmployeDto } from './dto/create-paiement-employe.dto';
import { UpdatePaiementEmployeDto } from './dto/update-paiement-employe.dto';
import { CreateVersementDto } from './dto/create-versement.dto';
import { CancelVersementDto } from './dto/cancel-versement.dto';
import {
  QueryPaiementEmployeDto,
  StatutPaiementEmployeUnion,
} from './dto/query-paiement-employe.dto';
import { Prisma, EmployeStatut, PaiementModeEmploye } from '@prisma/client';
import { buildPaginationMeta, PaginatedResult } from '../../common/dto/paginated-result';

export interface VersementView {
  id: number;
  idPaiementEmploye: number;
  montant: number;
  dateVersement: string;
  modePaiement: PaiementModeEmploye;
  referenceExterne: string | null;
  notes: string | null;
  estAnnule: boolean;
  dateAnnulation: string | null;
  motifAnnulation: string | null;
  creeLe: string;
}

export interface CompactEmployeForPaiement {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  cin: string | null;
  poste: string;
  departement: string | null;
}

export interface PaiementEmployeView {
  id: number;
  numeroPaiement: string;
  idEmploye: number;
  periode: string;
  salaireReference: number;
  montantDu: number;
  montantPaye: number;
  soldeRestant: number;
  statut: StatutPaiementEmployeUnion;
  latestVersementDate: string | null;
  motifAjustement: string | null;
  notes: string | null;
  creeLe: string;
  misAJourLe: string;
  employe?: CompactEmployeForPaiement | null;
  versements: VersementView[];
}

export interface PaiementEmployeStats {
  totalDu: number;
  totalPaye: number;
  soldeRestant: number;
  countAttente: number;
  countPartiel: number;
  countPaye: number;
}

export function toVersementView(entity: any): VersementView {
  return {
    id: entity.id,
    idPaiementEmploye: entity.idPaiementEmploye,
    montant: Number(entity.montant ?? 0),
    dateVersement: entity.dateVersement
      ? new Date(entity.dateVersement).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    modePaiement: entity.modePaiement,
    referenceExterne: entity.referenceExterne ?? null,
    notes: entity.notes ?? null,
    estAnnule: Boolean(entity.estAnnule),
    dateAnnulation: entity.dateAnnulation ? new Date(entity.dateAnnulation).toISOString() : null,
    motifAnnulation: entity.motifAnnulation ?? null,
    creeLe: entity.creeLe ? new Date(entity.creeLe).toISOString() : new Date().toISOString(),
  };
}

export function toPaiementEmployeView(entity: any): PaiementEmployeView {
  const allVersements: any[] = entity.versements || [];
  const versementViews = allVersements.map(toVersementView);
  const activeVersements = allVersements.filter((v) => !v.estAnnule);

  let totalPayeDecimal = new Prisma.Decimal(0);
  let latestDate: Date | null = null;

  for (const v of activeVersements) {
    totalPayeDecimal = totalPayeDecimal.add(new Prisma.Decimal(v.montant ?? 0));
    const d = new Date(v.dateVersement);
    if (!latestDate || d > latestDate) {
      latestDate = d;
    }
  }

  const montantDuDecimal = new Prisma.Decimal(entity.montantDu ?? 0);
  const soldeRestantDecimal = montantDuDecimal.sub(totalPayeDecimal);

  let statut: StatutPaiementEmployeUnion = 'EN_ATTENTE';
  if (
    totalPayeDecimal.equals(montantDuDecimal) ||
    totalPayeDecimal.greaterThanOrEqualTo(montantDuDecimal)
  ) {
    statut = 'PAYE';
  } else if (totalPayeDecimal.greaterThan(0)) {
    statut = 'PARTIELLEMENT_PAYE';
  }

  let compactEmploye: CompactEmployeForPaiement | null = null;
  if (entity.employe) {
    compactEmploye = {
      id: entity.employe.id,
      matricule: entity.employe.matricule,
      nom: entity.employe.nom,
      prenom: entity.employe.prenom,
      cin: entity.employe.cin ?? null,
      poste: entity.employe.poste,
      departement: entity.employe.departement ?? null,
    };
  }

  return {
    id: entity.id,
    numeroPaiement: entity.numeroPaiement,
    idEmploye: entity.idEmploye,
    periode: entity.periode,
    salaireReference: Number(entity.salaireReference ?? 0),
    montantDu: Number(entity.montantDu ?? 0),
    montantPaye: Math.round(totalPayeDecimal.toNumber() * 100) / 100,
    soldeRestant: Math.max(0, Math.round(soldeRestantDecimal.toNumber() * 100) / 100),
    statut,
    latestVersementDate: latestDate ? latestDate.toISOString().split('T')[0] : null,
    motifAjustement: entity.motifAjustement ?? null,
    notes: entity.notes ?? null,
    creeLe: entity.creeLe ? new Date(entity.creeLe).toISOString() : new Date().toISOString(),
    misAJourLe: entity.misAJourLe
      ? new Date(entity.misAJourLe).toISOString()
      : new Date().toISOString(),
    employe: compactEmploye,
    versements: versementViews,
  };
}

@Injectable()
export class PaiementsEmployesService {
  private readonly logger = new Logger(PaiementsEmployesService.name);

  constructor(private readonly prisma: PrismaService) {}

  private checkEmploymentEligibility(employe: any, periode: string) {
    if (employe.statut === EmployeStatut.INACTIF) {
      throw new BadRequestException(
        `L’employé #${employe.id} est INACTIF et ne peut pas recevoir d’engagement de paiement`,
      );
    }

    const [yearStr, monthStr] = periode.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const dateEmbauche = new Date(employe.dateEmbauche);
    if (periodEnd < dateEmbauche) {
      throw new BadRequestException(
        `La période "${periode}" précède la date d’embauche (${dateEmbauche.toISOString().split('T')[0]}) de l’employé`,
      );
    }

    if (employe.dateSortie) {
      const dateSortie = new Date(employe.dateSortie);
      if (periodStart > dateSortie) {
        throw new BadRequestException(
          `La période "${periode}" excède la date de sortie (${dateSortie.toISOString().split('T')[0]}) de l’employé`,
        );
      }
    }
  }

  async create(dto: CreatePaiementEmployeDto): Promise<PaiementEmployeView> {
    const employe = await this.prisma.employe.findFirst({
      where: { id: dto.idEmploye, supprimeLe: null },
    });

    if (!employe) {
      throw new NotFoundException(`Employé #${dto.idEmploye} introuvable`);
    }

    this.checkEmploymentEligibility(employe, dto.periode);

    const baseSalaryNum = employe.salaireBase !== null ? Number(employe.salaireBase) : null;
    const effectiveSalaireRef =
      dto.salaireReference !== undefined ? dto.salaireReference : baseSalaryNum;

    if (effectiveSalaireRef === null || effectiveSalaireRef <= 0) {
      throw new BadRequestException(
        'Le salaire de référence est obligatoire et doit être supérieur à 0 car l’employé n’a pas de salaire de base défini',
      );
    }

    // Check if adjustment reason is required
    const isDifferentFromBase = baseSalaryNum === null || effectiveSalaireRef !== baseSalaryNum;
    if (isDifferentFromBase && (!dto.motifAjustement || !dto.motifAjustement.trim())) {
      throw new BadRequestException(
        'Un motif d’ajustement est obligatoire lorsque le salaire de référence diffère du salaire de base de l’employé',
      );
    }

    if (!dto.montantDu || dto.montantDu <= 0) {
      throw new BadRequestException('Le montant dû doit être un montant positif supérieur à 0');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Check duplicate active period for employee
      const existing = await tx.paiementEmploye.findFirst({
        where: { idEmploye: dto.idEmploye, periode: dto.periode, supprimeLe: null },
      });

      if (existing) {
        throw new ConflictException(
          `Un paiement ou engagement existe déjà pour cet employé sur la période "${dto.periode}"`,
        );
      }

      // 2. Generate atomic numeroPaiement (PE-YYYY-XXXX)
      const creationYear = new Date().getFullYear();
      const seqResult: Array<{ dernier_numero: number }> = await tx.$queryRaw`
        INSERT INTO paiement_employe_sequences (annee, dernier_numero)
        VALUES (${creationYear}, 1)
        ON CONFLICT (annee) DO UPDATE
        SET dernier_numero = paiement_employe_sequences.dernier_numero + 1
        RETURNING dernier_numero;
      `;

      const seqNum = seqResult[0].dernier_numero;
      const numeroPaiement = `PE-${creationYear}-${String(seqNum).padStart(4, '0')}`;

      // 3. Create obligation
      const createdObligation = await tx.paiementEmploye.create({
        data: {
          numeroPaiement,
          idEmploye: dto.idEmploye,
          periode: dto.periode,
          salaireReference: new Prisma.Decimal(effectiveSalaireRef),
          montantDu: new Prisma.Decimal(dto.montantDu),
          motifAjustement: dto.motifAjustement?.trim() || null,
          notes: dto.notes?.trim() || null,
        },
      });

      // 4. Initial versement if provided
      if (dto.initialVersement) {
        const v = dto.initialVersement;
        if (!v.montant || v.montant <= 0) {
          throw new BadRequestException('Le montant du versement initial doit être supérieur à 0');
        }
        if (v.montant > dto.montantDu) {
          throw new BadRequestException(
            `Le versement initial (${v.montant} MAD) dépasse le montant dû (${dto.montantDu} MAD)`,
          );
        }

        await tx.versementEmploye.create({
          data: {
            idPaiementEmploye: createdObligation.id,
            montant: new Prisma.Decimal(v.montant),
            dateVersement: new Date(v.dateVersement),
            modePaiement: v.modePaiement,
            referenceExterne: v.referenceExterne?.trim() || null,
            notes: v.notes?.trim() || null,
          },
        });
      }

      // 5. Refetch complete view inside transaction
      const full = await tx.paiementEmploye.findUnique({
        where: { id: createdObligation.id },
        include: {
          employe: true,
          versements: { orderBy: { dateVersement: 'asc' } },
        },
      });

      return toPaiementEmployeView(full);
    });
  }

  async findAll(query: QueryPaiementEmployeDto): Promise<PaginatedResult<PaiementEmployeView>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(Math.max(Number(query.limit ?? 10), 1), 100);

    const where: Prisma.PaiementEmployeWhereInput = {
      supprimeLe: null,
    };

    if (query.idEmploye) {
      where.idEmploye = Number(query.idEmploye);
    }

    if (query.periode) {
      where.periode = query.periode.trim();
    } else if (query.annee || query.mois) {
      if (query.annee && query.mois) {
        const mStr = String(query.mois).padStart(2, '0');
        where.periode = `${query.annee}-${mStr}`;
      } else if (query.annee) {
        where.periode = { startsWith: `${query.annee}-` };
      }
    }

    if (query.departement) {
      where.employe = {
        departement: { contains: query.departement.trim(), mode: 'insensitive' },
      };
    }

    if (query.modePaiement) {
      where.versements = {
        some: {
          modePaiement: query.modePaiement,
          estAnnule: false,
        },
      };
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { numeroPaiement: { contains: s, mode: 'insensitive' } },
        { employe: { matricule: { contains: s, mode: 'insensitive' } } },
        { employe: { nom: { contains: s, mode: 'insensitive' } } },
        { employe: { prenom: { contains: s, mode: 'insensitive' } } },
        { employe: { cin: { contains: s, mode: 'insensitive' } } },
        {
          versements: {
            some: { referenceExterne: { contains: s, mode: 'insensitive' }, estAnnule: false },
          },
        },
      ];
    }

    if (query.dateFrom || query.dateTo) {
      where.versements = {
        some: {
          estAnnule: false,
          ...(query.dateFrom ? { dateVersement: { gte: new Date(query.dateFrom) } } : {}),
          ...(query.dateTo ? { dateVersement: { lte: new Date(query.dateTo) } } : {}),
        },
      };
    }

    const items = await this.prisma.paiementEmploye.findMany({
      where,
      include: {
        employe: true,
        versements: { orderBy: { dateVersement: 'asc' } },
      },
      orderBy: { creeLe: query.sortOrder === 'asc' ? 'asc' : 'desc' },
    });

    let mapped = items.map(toPaiementEmployeView);

    if (query.statut) {
      mapped = mapped.filter((item) => item.statut === query.statut);
    }

    const total = mapped.length;
    const paginated = mapped.slice((page - 1) * limit, page * limit);

    return {
      data: paginated,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: number): Promise<PaiementEmployeView> {
    const obligation = await this.prisma.paiementEmploye.findFirst({
      where: { id, supprimeLe: null },
      include: {
        employe: true,
        versements: { orderBy: { dateVersement: 'asc' } },
      },
    });

    if (!obligation) {
      throw new NotFoundException(`Obligation de paiement #${id} introuvable`);
    }

    return toPaiementEmployeView(obligation);
  }

  async findStats(query: QueryPaiementEmployeDto): Promise<PaiementEmployeStats> {
    const where: Prisma.PaiementEmployeWhereInput = {
      supprimeLe: null,
    };

    if (query.idEmploye) where.idEmploye = Number(query.idEmploye);
    if (query.periode) where.periode = query.periode.trim();
    else if (query.annee && query.mois) {
      const mStr = String(query.mois).padStart(2, '0');
      where.periode = `${query.annee}-${mStr}`;
    } else if (query.annee) {
      where.periode = { startsWith: `${query.annee}-` };
    }

    if (query.departement) {
      where.employe = {
        departement: { contains: query.departement.trim(), mode: 'insensitive' },
      };
    }

    const items = await this.prisma.paiementEmploye.findMany({
      where,
      include: { versements: true },
    });

    const mapped = items.map(toPaiementEmployeView);

    let totalDuDecimal = new Prisma.Decimal(0);
    let totalPayeDecimal = new Prisma.Decimal(0);
    let countAttente = 0;
    let countPartiel = 0;
    let countPaye = 0;

    for (const item of mapped) {
      totalDuDecimal = totalDuDecimal.add(new Prisma.Decimal(item.montantDu));
      totalPayeDecimal = totalPayeDecimal.add(new Prisma.Decimal(item.montantPaye));

      if (item.statut === 'EN_ATTENTE') countAttente++;
      else if (item.statut === 'PARTIELLEMENT_PAYE') countPartiel++;
      else if (item.statut === 'PAYE') countPaye++;
    }

    const soldeDecimal = totalDuDecimal.sub(totalPayeDecimal);

    return {
      totalDu: Math.round(totalDuDecimal.toNumber() * 100) / 100,
      totalPaye: Math.round(totalPayeDecimal.toNumber() * 100) / 100,
      soldeRestant: Math.max(0, Math.round(soldeDecimal.toNumber() * 100) / 100),
      countAttente,
      countPartiel,
      countPaye,
    };
  }

  async update(id: number, dto: UpdatePaiementEmployeDto): Promise<PaiementEmployeView> {
    const existing = await this.prisma.paiementEmploye.findFirst({
      where: { id, supprimeLe: null },
      include: { employe: true, versements: true },
    });

    if (!existing) {
      throw new NotFoundException(`Obligation de paiement #${id} introuvable`);
    }

    // Check if ANY versement (active or cancelled) exists
    const totalVersementsCount = existing.versements.length;

    if (totalVersementsCount > 0) {
      // Freeze all financial fields & period
      if (
        dto.periode !== undefined ||
        dto.salaireReference !== undefined ||
        dto.montantDu !== undefined ||
        dto.motifAjustement !== undefined
      ) {
        throw new BadRequestException(
          'Impossible de modifier les conditions financières ou la période d’une obligation ayant déjà fait l’objet d’un versement',
        );
      }

      const updatedNotes = await this.prisma.paiementEmploye.update({
        where: { id },
        data: {
          ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
          misAJourLe: new Date(),
        },
        include: {
          employe: true,
          versements: { orderBy: { dateVersement: 'asc' } },
        },
      });

      return toPaiementEmployeView(updatedNotes);
    }

    // Draft updates allowed (0 versements)
    const effectivePeriode = dto.periode ?? existing.periode;
    if (dto.periode) {
      this.checkEmploymentEligibility(existing.employe, dto.periode);
    }

    const baseSalaryNum =
      existing.employe.salaireBase !== null ? Number(existing.employe.salaireBase) : null;
    const effectiveSalaireRef =
      dto.salaireReference !== undefined ? dto.salaireReference : Number(existing.salaireReference);

    if (effectiveSalaireRef <= 0) {
      throw new BadRequestException('Le salaire de référence doit être supérieur à 0');
    }

    const isDifferentFromBase = baseSalaryNum === null || effectiveSalaireRef !== baseSalaryNum;
    const effectiveMotifAjustement =
      dto.motifAjustement !== undefined
        ? dto.motifAjustement?.trim() || null
        : existing.motifAjustement;

    if (isDifferentFromBase && (!effectiveMotifAjustement || !effectiveMotifAjustement.trim())) {
      throw new BadRequestException(
        'Un motif d’ajustement est obligatoire lorsque le salaire de référence diffère du salaire de base de l’employé',
      );
    }

    const effectiveMontantDu =
      dto.montantDu !== undefined ? dto.montantDu : Number(existing.montantDu);
    if (effectiveMontantDu <= 0) {
      throw new BadRequestException('Le montant dû doit être supérieur à 0');
    }

    const updated = await this.prisma.paiementEmploye.update({
      where: { id },
      data: {
        periode: effectivePeriode,
        salaireReference: new Prisma.Decimal(effectiveSalaireRef),
        montantDu: new Prisma.Decimal(effectiveMontantDu),
        motifAjustement: effectiveMotifAjustement,
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
        misAJourLe: new Date(),
      },
      include: {
        employe: true,
        versements: { orderBy: { dateVersement: 'asc' } },
      },
    });

    return toPaiementEmployeView(updated);
  }

  async softDelete(id: number): Promise<{ message: string }> {
    const existing = await this.prisma.paiementEmploye.findFirst({
      where: { id, supprimeLe: null },
      include: { versements: true },
    });

    if (!existing) {
      throw new NotFoundException(`Obligation de paiement #${id} introuvable`);
    }

    if (existing.versements.length > 0) {
      throw new BadRequestException(
        'Impossible de supprimer une obligation de paiement contenant des versements (actifs ou annulés)',
      );
    }

    await this.prisma.paiementEmploye.update({
      where: { id },
      data: { supprimeLe: new Date() },
    });

    return { message: `Obligation de paiement #${id} supprimée avec succès` };
  }

  async createVersement(
    idPaiementEmploye: number,
    dto: CreateVersementDto,
  ): Promise<PaiementEmployeView> {
    if (!dto.montant || dto.montant <= 0) {
      throw new BadRequestException('Le montant du versement doit être supérieur à 0');
    }

    return this.prisma.$transaction(async (tx) => {
      // Row locking SELECT FOR UPDATE
      const lockedRows: any[] = await tx.$queryRaw`
        SELECT id, montant_du, supprime_le
        FROM paiements_employes
        WHERE id = ${idPaiementEmploye}
        FOR UPDATE;
      `;

      if (!lockedRows || lockedRows.length === 0 || lockedRows[0].supprime_le) {
        throw new NotFoundException(`Obligation de paiement #${idPaiementEmploye} introuvable`);
      }

      const obligationRow = lockedRows[0];
      const montantDuDecimal = new Prisma.Decimal(obligationRow.montant_du);

      const activeVersements = await tx.versementEmploye.findMany({
        where: { idPaiementEmploye, estAnnule: false },
      });

      let currentPayeDecimal = new Prisma.Decimal(0);
      for (const v of activeVersements) {
        currentPayeDecimal = currentPayeDecimal.add(new Prisma.Decimal(v.montant));
      }

      const currentSolde = montantDuDecimal.sub(currentPayeDecimal);
      const requestedDecimal = new Prisma.Decimal(dto.montant);

      if (currentSolde.lessThanOrEqualTo(0)) {
        throw new ConflictException(
          `L’obligation de paiement #${idPaiementEmploye} est déjà intégralement soldée`,
        );
      }

      if (requestedDecimal.greaterThan(currentSolde)) {
        throw new BadRequestException(
          `Le montant du versement (${requestedDecimal.toFixed(2)} MAD) dépasse le solde restant (${currentSolde.toFixed(2)} MAD)`,
        );
      }

      await tx.versementEmploye.create({
        data: {
          idPaiementEmploye,
          montant: requestedDecimal,
          dateVersement: new Date(dto.dateVersement),
          modePaiement: dto.modePaiement,
          referenceExterne: dto.referenceExterne?.trim() || null,
          notes: dto.notes?.trim() || null,
        },
      });

      const updated = await tx.paiementEmploye.findUnique({
        where: { id: idPaiementEmploye },
        include: {
          employe: true,
          versements: { orderBy: { dateVersement: 'asc' } },
        },
      });

      return toPaiementEmployeView(updated);
    });
  }

  async cancelVersement(
    idPaiementEmploye: number,
    versementId: number,
    dto: CancelVersementDto,
  ): Promise<PaiementEmployeView> {
    if (!dto.motifAnnulation || !dto.motifAnnulation.trim()) {
      throw new BadRequestException('Le motif d’annulation est obligatoire');
    }

    return this.prisma.$transaction(async (tx) => {
      const versement = await tx.versementEmploye.findFirst({
        where: { id: versementId, idPaiementEmploye },
      });

      if (!versement) {
        throw new NotFoundException(
          `Versement #${versementId} introuvable pour l’obligation #${idPaiementEmploye}`,
        );
      }

      if (versement.estAnnule) {
        throw new ConflictException(`Le versement #${versementId} est déjà annulé`);
      }

      await tx.versementEmploye.update({
        where: { id: versementId },
        data: {
          estAnnule: true,
          dateAnnulation: new Date(),
          motifAnnulation: dto.motifAnnulation.trim(),
          misAJourLe: new Date(),
        },
      });

      const updated = await tx.paiementEmploye.findUnique({
        where: { id: idPaiementEmploye },
        include: {
          employe: true,
          versements: { orderBy: { dateVersement: 'asc' } },
        },
      });

      return toPaiementEmployeView(updated);
    });
  }

  async listVersements(idPaiementEmploye: number): Promise<VersementView[]> {
    const obligation = await this.prisma.paiementEmploye.findFirst({
      where: { id: idPaiementEmploye, supprimeLe: null },
    });

    if (!obligation) {
      throw new NotFoundException(`Obligation de paiement #${idPaiementEmploye} introuvable`);
    }

    const items = await this.prisma.versementEmploye.findMany({
      where: { idPaiementEmploye },
      orderBy: { dateVersement: 'asc' },
    });

    return items.map(toVersementView);
  }
}
