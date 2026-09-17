import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ModeFacturation, Prisma, VoyageStatut, VoyageType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreateVoyageDto } from './dto/create-voyage.dto';
import { UpdateVoyageDto } from './dto/update-voyage.dto';
import { UpdateVoyageStatusDto } from './dto/update-voyage-status.dto';
import { QueryVoyageDto } from './dto/query-voyage.dto';
import { CreateFraisImmobilisationDto } from './dto/create-frais-immobilisation.dto';
import { UpdateFraisImmobilisationDto } from './dto/update-frais-immobilisation.dto';
import { VoyageResourceSyncService } from './voyage-resource-sync.service';
import { FacturesService } from '../factures/factures.service';

export interface CompactVehiculeSummary {
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  typeVehicule: string;
  statut: string;
}

export interface FraisImmobilisationView {
  id: number;
  idVoyage: number;
  prixParJour: number;
  nombreJoursRetard: number;
  montantTotal: number;
  creeLe: string;
  misAJourLe: string;
}

export function toFraisImmobilisationView(frais: any): FraisImmobilisationView {
  const prixParJour = Number(frais.prixParJour ?? 0);
  const nombreJoursRetard = Number(frais.nombreJoursRetard ?? 0);
  const calculatedTotal = Math.round(prixParJour * nombreJoursRetard * 100) / 100;
  const montantTotal =
    frais.montantTotal !== undefined && frais.montantTotal !== null
      ? Number(frais.montantTotal)
      : calculatedTotal;

  return {
    id: Number(frais.id),
    idVoyage: Number(frais.idVoyage),
    prixParJour,
    nombreJoursRetard,
    montantTotal,
    creeLe: new Date(frais.creeLe).toISOString(),
    misAJourLe: new Date(frais.misAJourLe).toISOString(),
  };
}

export interface DocumentVoyageView {
  id: number;
  idVoyage: number;
  cheminFichier: string;
  nomOriginal: string;
  mimeType: string;
  tailleFichier: number;
  fileUrl: string;
  downloadUrl: string;
  creeLe: string;
  misAJourLe: string;
}

export function toDocumentVoyageView(doc: any): DocumentVoyageView {
  const idDoc = Number(doc.id);
  const fileSize =
    doc.tailleFichier !== null && doc.tailleFichier !== undefined
      ? Number(doc.tailleFichier)
      : 0;

  return {
    id: idDoc,
    idVoyage: Number(doc.idVoyage),
    cheminFichier: doc.cheminFichier,
    nomOriginal: doc.nomOriginal,
    mimeType: doc.mimeType,
    tailleFichier: fileSize,
    fileUrl: `/api/voyages/${doc.idVoyage}/documents/${idDoc}/fichier`,
    downloadUrl: `/api/voyages/${doc.idVoyage}/documents/${idDoc}/download`,
    creeLe: new Date(doc.creeLe).toISOString(),
    misAJourLe: new Date(doc.misAJourLe || doc.creeLe).toISOString(),
  };
}

export interface VoyageView {
  idVoyage: number;
  idClient: number | null;
  modeFacturation: ModeFacturation;
  typeVoyage: VoyageType;
  tracteur: string | null;
  remorque: string | null;
  nomConducteur: string | null;
  nomClient: string | null;
  lieuChargement: string;
  lieuDechargement: string;
  dateChargement: string | null;
  numeroCmr: string | null;
  statut: VoyageStatut;
  montantVoyage: number;
  devise: string;
  tracteurVehicule?: CompactVehiculeSummary | null;
  remorqueVehicule?: CompactVehiculeSummary | null;
  fraisImmobilisation?: FraisImmobilisationView | null;
  documents?: DocumentVoyageView[];
}

export interface VoyageStats {
  total: number;
  planifies: number;
  enCours: number;
  livres: number;
  annules: number;
  factures: number;
}

export function toVoyageView(voyage: any): VoyageView {
  return {
    idVoyage: voyage.idVoyage,
    idClient: voyage.idClient ?? null,
    modeFacturation: voyage.modeFacturation || ModeFacturation.AVEC_FACTURE,
    typeVoyage: voyage.typeVoyage,
    tracteur: voyage.tracteur ?? null,
    remorque: voyage.remorque ?? null,
    nomConducteur: voyage.nomConducteur ?? null,
    nomClient: voyage.nomClient ?? null,
    lieuChargement: voyage.lieuChargement,
    lieuDechargement: voyage.lieuDechargement,
    dateChargement: voyage.dateChargement
      ? new Date(voyage.dateChargement).toISOString().split('T')[0]
      : null,
    numeroCmr: voyage.numeroCmr ?? null,
    statut: voyage.statut,
    montantVoyage: voyage.montantVoyage !== undefined ? Number(voyage.montantVoyage) : 0,
    devise: voyage.devise || 'MAD',
    tracteurVehicule: voyage.tracteurVehicule
      ? {
          immatriculation: voyage.tracteurVehicule.immatriculation,
          marque: voyage.tracteurVehicule.marque ?? null,
          modele: voyage.tracteurVehicule.modele ?? null,
          typeVehicule: voyage.tracteurVehicule.typeVehicule,
          statut: voyage.tracteurVehicule.statut,
        }
      : null,
    remorqueVehicule: voyage.remorqueVehicule
      ? {
          immatriculation: voyage.remorqueVehicule.immatriculation,
          marque: voyage.remorqueVehicule.marque ?? null,
          modele: voyage.remorqueVehicule.modele ?? null,
          typeVehicule: voyage.remorqueVehicule.typeVehicule,
          statut: voyage.remorqueVehicule.statut,
        }
      : null,
    fraisImmobilisation: voyage.fraisImmobilisation
      ? toFraisImmobilisationView(voyage.fraisImmobilisation)
      : null,
    documents: Array.isArray(voyage.documents)
      ? voyage.documents.map(toDocumentVoyageView)
      : [],
  };
}

@Injectable()
export class VoyagesService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'documents-voyages');

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: VoyageResourceSyncService,
    private readonly facturesService: FacturesService,
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  public resolveSecurePath(relativePath: string): string {
    const baseName = path.basename(relativePath);
    const resolvedPath = path.resolve(this.uploadDir, baseName);
    const allowedDir = path.resolve(this.uploadDir);

    if (!resolvedPath.startsWith(allowedDir)) {
      throw new BadRequestException('Accès au fichier refusé (Chemin non autorisé)');
    }

    return resolvedPath;
  }

  async create(companyId: number, dto: CreateVoyageDto): Promise<VoyageView> {
    const lieuChargement = dto.lieuChargement.trim();
    const lieuDechargement = dto.lieuDechargement.trim();
    const tracteur = dto.tracteur ? dto.tracteur.trim() : null;
    const remorque = dto.remorque ? dto.remorque.trim() : null;
    const nomConducteur = dto.nomConducteur ? dto.nomConducteur.trim() : null;
    const numeroCmr = dto.numeroCmr ? dto.numeroCmr.trim() : null;
    const targetStatus = dto.statut ?? VoyageStatut.PLANIFIE;

    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.findFirst({
        where: { id: dto.idClient, companyId },
      });
      if (!client) {
        throw new NotFoundException('Client introuvable');
      }

      let validated: { driver?: { id: number } } = {};

      if (targetStatus === VoyageStatut.EN_COURS) {
        validated = await this.syncService.validateActivationEligibility(
          tx,
          {
            tracteurImmat: tracteur,
            remorqueImmat: remorque,
            nomConducteur,
          },
          companyId,
        );
      } else {
        // Validate existence for non-active voyage within tenant
        if (tracteur && remorque && tracteur.toUpperCase() === remorque.toUpperCase()) {
          throw new ConflictException('Le tracteur et la remorque doivent être différents');
        }
        if (tracteur) {
          const tVeh = await tx.vehicule.findFirst({
            where: { immatriculation: tracteur, companyId },
          });
          if (!tVeh)
            throw new NotFoundException(`Le véhicule tracteur "${tracteur}" est introuvable`);
        }
        if (remorque) {
          const rVeh = await tx.vehicule.findFirst({
            where: { immatriculation: remorque, companyId },
          });
          if (!rVeh)
            throw new NotFoundException(`Le véhicule remorque "${remorque}" est introuvable`);
        }
        if (nomConducteur) {
          await this.syncService.resolveDriverByName(tx, nomConducteur, companyId);
        }
      }

      const created = await tx.voyage.create({
        data: {
          companyId,
          idClient: client.id,
          nomClient: client.nomEntreprise,
          modeFacturation: dto.modeFacturation ?? ModeFacturation.AVEC_FACTURE,
          typeVoyage: dto.typeVoyage ?? VoyageType.NATIONAL,
          tracteur,
          remorque,
          nomConducteur,
          lieuChargement,
          lieuDechargement,
          dateChargement: dto.dateChargement ? new Date(dto.dateChargement) : null,
          numeroCmr,
          statut: targetStatus,
          montantVoyage: dto.montantVoyage ?? 0,
          devise: dto.devise || client.deviseFacturation || 'MAD',
        },
        include: {
          tracteurVehicule: true,
          remorqueVehicule: true,
          fraisImmobilisation: true,
        },
      });

      if (targetStatus === VoyageStatut.EN_COURS) {
        await this.syncService.acquireResources(
          tx,
          {
            tracteurImmat: tracteur,
            remorqueImmat: remorque,
            driverId: validated.driver?.id,
          },
          companyId,
        );
      }

      return toVoyageView(created);
    });
  }

  async findAll(companyId: number, query: QueryVoyageDto): Promise<PaginatedResult<VoyageView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const sortBy = query.sortBy ?? 'idVoyage';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.VoyageWhereInput = { companyId };

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { lieuChargement: { contains: s, mode: 'insensitive' } },
        { lieuDechargement: { contains: s, mode: 'insensitive' } },
        { nomClient: { contains: s, mode: 'insensitive' } },
        { nomConducteur: { contains: s, mode: 'insensitive' } },
        { tracteur: { contains: s, mode: 'insensitive' } },
        { remorque: { contains: s, mode: 'insensitive' } },
        { numeroCmr: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query.statut) {
      where.statut = query.statut;
    }

    if (query.typeVoyage) {
      where.typeVoyage = query.typeVoyage;
    }

    if (query.nomClient) {
      where.nomClient = { contains: query.nomClient.trim(), mode: 'insensitive' };
    }

    if (query.tracteur) {
      where.tracteur = { contains: query.tracteur.trim(), mode: 'insensitive' };
    }

    if (query.nomConducteur) {
      where.nomConducteur = { contains: query.nomConducteur.trim(), mode: 'insensitive' };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.voyage.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          tracteurVehicule: true,
          remorqueVehicule: true,
          fraisImmobilisation: true,
        },
      }),
      this.prisma.voyage.count({ where }),
    ]);

    return {
      data: data.map(toVoyageView),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findStats(companyId: number): Promise<VoyageStats> {
    const [total, planifies, enCours, livres, annules, factures] = await Promise.all([
      this.prisma.voyage.count({ where: { companyId } }),
      this.prisma.voyage.count({ where: { companyId, statut: VoyageStatut.PLANIFIE } }),
      this.prisma.voyage.count({ where: { companyId, statut: VoyageStatut.EN_COURS } }),
      this.prisma.voyage.count({ where: { companyId, statut: VoyageStatut.LIVRE } }),
      this.prisma.voyage.count({ where: { companyId, statut: VoyageStatut.ANNULE } }),
      this.prisma.voyage.count({ where: { companyId, statut: VoyageStatut.FACTURE } }),
    ]);

    return { total, planifies, enCours, livres, annules, factures };
  }

  async findOne(companyId: number, idVoyage: number): Promise<VoyageView> {
    const voyage = await this.prisma.voyage.findFirst({
      where: { idVoyage, companyId },
      include: {
        tracteurVehicule: true,
        remorqueVehicule: true,
        fraisImmobilisation: true,
      },
    });

    if (!voyage) {
      throw new NotFoundException(`Voyage #${idVoyage} introuvable`);
    }

    return toVoyageView(voyage);
  }

  async update(companyId: number, idVoyage: number, dto: UpdateVoyageDto): Promise<VoyageView> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.voyage.findFirst({ where: { idVoyage, companyId } });
      if (!existing) {
        throw new NotFoundException(`Voyage #${idVoyage} introuvable`);
      }

      const isModeChanged =
        dto.modeFacturation !== undefined && dto.modeFacturation !== existing.modeFacturation;

      const isMontantChanged =
        dto.montantVoyage !== undefined &&
        !new Prisma.Decimal(dto.montantVoyage).equals(existing.montantVoyage);

      if (isMontantChanged) {
        const { isPayee } = await this.facturesService.isFacturePayeeInTx(tx, companyId, { idVoyage });
        if (isPayee) {
          throw new BadRequestException('Cette facture est déjà payée et ne peut plus être modifiée.');
        }
      }

      const updatedTracteur =
        dto.tracteur !== undefined
          ? dto.tracteur
            ? dto.tracteur.trim()
            : null
          : existing.tracteur;
      const updatedRemorque =
        dto.remorque !== undefined
          ? dto.remorque
            ? dto.remorque.trim()
            : null
          : existing.remorque;
      const updatedDriver =
        dto.nomConducteur !== undefined
          ? dto.nomConducteur
            ? dto.nomConducteur.trim()
            : null
          : existing.nomConducteur;
      const newStatus = dto.statut ?? existing.statut;

      // Rule: If Voyage is currently EN_COURS, changing resources (driver, tractor, trailer) is forbidden
      if (existing.statut === VoyageStatut.EN_COURS) {
        const isTracteurChanged = updatedTracteur !== existing.tracteur;
        const isRemorqueChanged = updatedRemorque !== existing.remorque;
        const isDriverChanged = updatedDriver !== existing.nomConducteur;

        if (isTracteurChanged || isRemorqueChanged || isDriverChanged) {
          throw new ConflictException(
            "Impossible de modifier le conducteur ou les véhicules d'un voyage en cours. Modifiez le statut du voyage d'abord.",
          );
        }
      }

      let updatedIdClient = existing.idClient;
      let updatedNomClient = existing.nomClient;

      if (dto.idClient !== undefined) {
        const client = await tx.client.findFirst({ where: { id: dto.idClient, companyId } });
        if (!client) {
          throw new NotFoundException('Client introuvable');
        }
        updatedIdClient = client.id;
        updatedNomClient = client.nomEntreprise;
      }

      let updatedDevise = existing.devise;
      if (dto.devise !== undefined) {
        updatedDevise = dto.devise;
      } else if (dto.idClient !== undefined && dto.idClient !== existing.idClient) {
        const client = await tx.client.findFirst({ where: { id: dto.idClient, companyId } });
        if (client) {
          updatedDevise = client.deviseFacturation || 'MAD';
        }
      }

      if (updatedDevise !== existing.devise) {
        const linkedFacture = await tx.facture.findFirst({
          where: { idVoyage: idVoyage, companyId, supprimeLe: null },
        });
        if (linkedFacture) {
          throw new ConflictException(
            'La devise du voyage ne peut plus être modifiée car une facture y est déjà associée.',
          );
        }
      }

      let validated: { driver?: { id: number } } = {};

      if (newStatus === VoyageStatut.EN_COURS && existing.statut !== VoyageStatut.EN_COURS) {
        // Transition to EN_COURS
        validated = await this.syncService.validateActivationEligibility(
          tx,
          {
            idVoyageToExclude: idVoyage,
            tracteurImmat: updatedTracteur,
            remorqueImmat: updatedRemorque,
            nomConducteur: updatedDriver,
          },
          companyId,
        );
      } else if (newStatus !== VoyageStatut.EN_COURS) {
        // Validate resources for non-active voyage within tenant
        if (
          updatedTracteur &&
          updatedRemorque &&
          updatedTracteur.toUpperCase() === updatedRemorque.toUpperCase()
        ) {
          throw new ConflictException('Le tracteur et la remorque doivent être différents');
        }
        if (updatedTracteur) {
          const tVeh = await tx.vehicule.findFirst({
            where: { immatriculation: updatedTracteur, companyId },
          });
          if (!tVeh)
            throw new NotFoundException(
              `Le véhicule tracteur "${updatedTracteur}" est introuvable`,
            );
        }
        if (updatedRemorque) {
          const rVeh = await tx.vehicule.findFirst({
            where: { immatriculation: updatedRemorque, companyId },
          });
          if (!rVeh)
            throw new NotFoundException(
              `Le véhicule remorque "${updatedRemorque}" est introuvable`,
            );
        }
        if (updatedDriver) {
          await this.syncService.resolveDriverByName(tx, updatedDriver, companyId);
        }
      }

      const wasEnCours = existing.statut === VoyageStatut.EN_COURS;

      const updated = await tx.voyage.update({
        where: { idVoyage },
        data: {
          idClient: updatedIdClient,
          nomClient: updatedNomClient,
          ...(dto.modeFacturation ? { modeFacturation: dto.modeFacturation } : {}),
          ...(dto.typeVoyage ? { typeVoyage: dto.typeVoyage } : {}),
          ...(dto.tracteur !== undefined ? { tracteur: updatedTracteur } : {}),
          ...(dto.remorque !== undefined ? { remorque: updatedRemorque } : {}),
          ...(dto.nomConducteur !== undefined ? { nomConducteur: updatedDriver } : {}),
          ...(dto.lieuChargement ? { lieuChargement: dto.lieuChargement.trim() } : {}),
          ...(dto.lieuDechargement ? { lieuDechargement: dto.lieuDechargement.trim() } : {}),
          ...(dto.dateChargement !== undefined
            ? { dateChargement: dto.dateChargement ? new Date(dto.dateChargement) : null }
            : {}),
          ...(dto.numeroCmr !== undefined
            ? { numeroCmr: dto.numeroCmr ? dto.numeroCmr.trim() : null }
            : {}),
          ...(dto.statut ? { statut: dto.statut } : {}),
          ...(dto.montantVoyage !== undefined ? { montantVoyage: dto.montantVoyage } : {}),
          devise: updatedDevise,
        },
        include: {
          tracteurVehicule: true,
          remorqueVehicule: true,
          fraisImmobilisation: true,
        },
      });

      if (isMontantChanged) {
        await this.facturesService.recalculateFactureInTx(tx, companyId, idVoyage);
      }

      if (newStatus === VoyageStatut.EN_COURS && !wasEnCours) {
        await this.syncService.acquireResources(
          tx,
          {
            tracteurImmat: updatedTracteur,
            remorqueImmat: updatedRemorque,
            driverId: validated.driver?.id,
          },
          companyId,
        );
      } else if (wasEnCours && newStatus !== VoyageStatut.EN_COURS) {
        await this.syncService.releaseResources(
          tx,
          {
            tracteurImmat: existing.tracteur,
            remorqueImmat: existing.remorque,
            nomConducteur: existing.nomConducteur,
            excludeVoyageId: idVoyage,
          },
          companyId,
        );
      }

      // SUB-STEP 4.3 BUSINESS RULE:
      // If Voyage already has a Facture and its modeFacturation changes (AVEC -> SANS or SANS -> AVEC):
      // 1. If existing Facture has ANY payments (partial or full), REJECT mode change with BadRequestException.
      // 2. If ZERO payments: preserve old Facture historically in DB, set supprimeLe to deactivate its active CreanceClient (preventing double debt), and create NEW Facture for the new mode.
      if (isModeChanged && dto.modeFacturation) {
        const existingActiveFactures = await tx.facture.findMany({
          where: { idVoyage, companyId, supprimeLe: null },
          include: { paiements: true },
        });

        if (existingActiveFactures.length > 0) {
          const hasPayments = existingActiveFactures.some(
            (f) => f.paiements && f.paiements.length > 0,
          );

          if (hasPayments) {
            throw new BadRequestException(
              'Impossible de modifier le mode de facturation : des paiements sont déjà enregistrés sur la facture existante.',
            );
          }

          const now = new Date();
          for (const f of existingActiveFactures) {
            await tx.facture.update({
              where: { id: f.id },
              data: { supprimeLe: now },
            });
          }

          await this.facturesService.createInvoiceInTx(tx, {
            idVoyage,
            companyId,
            overrideModeFacturation: dto.modeFacturation,
          });
        }
      }

      return toVoyageView(updated);
    });
  }

  async updateStatus(
    companyId: number,
    idVoyage: number,
    dto: UpdateVoyageStatusDto,
  ): Promise<VoyageView> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.voyage.findFirst({ where: { idVoyage, companyId } });
      if (!existing) {
        throw new NotFoundException(`Voyage #${idVoyage} introuvable`);
      }

      if (existing.statut === dto.statut) {
        return toVoyageView(existing);
      }

      let validated: { driver?: { id: number } } = {};

      if (dto.statut === VoyageStatut.EN_COURS) {
        validated = await this.syncService.validateActivationEligibility(
          tx,
          {
            idVoyageToExclude: idVoyage,
            tracteurImmat: existing.tracteur,
            remorqueImmat: existing.remorque,
            nomConducteur: existing.nomConducteur,
          },
          companyId,
        );
      }

      const wasEnCours = existing.statut === VoyageStatut.EN_COURS;

      const updated = await tx.voyage.update({
        where: { idVoyage },
        data: { statut: dto.statut },
        include: {
          tracteurVehicule: true,
          remorqueVehicule: true,
          fraisImmobilisation: true,
        },
      });

      if (dto.statut === VoyageStatut.EN_COURS) {
        await this.syncService.acquireResources(
          tx,
          {
            tracteurImmat: existing.tracteur,
            remorqueImmat: existing.remorque,
            driverId: validated.driver?.id,
          },
          companyId,
        );
      } else if (wasEnCours) {
        await this.syncService.releaseResources(
          tx,
          {
            tracteurImmat: existing.tracteur,
            remorqueImmat: existing.remorque,
            nomConducteur: existing.nomConducteur,
            excludeVoyageId: idVoyage,
          },
          companyId,
        );
      }

      return toVoyageView(updated);
    });
  }

  async remove(companyId: number, idVoyage: number): Promise<{ idVoyage: number }> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.voyage.findFirst({
        where: { idVoyage, companyId },
      });

      if (!existing) {
        throw new NotFoundException(`Voyage #${idVoyage} introuvable`);
      }

      if (existing.statut === VoyageStatut.EN_COURS) {
        throw new ConflictException('Un voyage en cours doit être annulé avant d’être supprimé.');
      }

      // Check linked factures relation
      const facturesCount = await tx.facture.count({
        where: { idVoyage, companyId },
      });

      if (facturesCount > 0) {
        throw new ConflictException(
          `Ce voyage est associé à ${facturesCount} facture(s) et ne peut pas être supprimé`,
        );
      }

      try {
        await tx.voyage.delete({ where: { idVoyage } });
        return { idVoyage };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
          throw new ConflictException(
            'Ce voyage est associé à des enregistrements dépendants et ne peut pas être supprimé',
          );
        }
        throw error;
      }
    });
  }

  // -------------------------------------------------------------------
  // FRAIS D'IMMOBILISATION CRUD (Sub-Step 4.4)
  // -------------------------------------------------------------------

  async createFraisImmobilisation(
    companyId: number,
    idVoyage: number,
    dto: CreateFraisImmobilisationDto,
  ): Promise<FraisImmobilisationView> {
    return this.prisma.$transaction(async (tx) => {
      const voyage = await tx.voyage.findFirst({
        where: { idVoyage, companyId },
      });
      if (!voyage) {
        throw new NotFoundException(`Voyage #${idVoyage} introuvable`);
      }

      const existing = await tx.fraisImmobilisation.findUnique({
        where: { idVoyage },
      });
      if (existing) {
        throw new ConflictException(
          `Un frais d'immobilisation existe déjà pour le voyage #${idVoyage}`,
        );
      }

      const { isPayee } = await this.facturesService.isFacturePayeeInTx(tx, companyId, { idVoyage });
      if (isPayee) {
        throw new BadRequestException('Cette facture est déjà payée et ne peut plus être modifiée.');
      }

      const prixDecimal = new Prisma.Decimal(dto.prixParJour);
      const retardInt = dto.nombreJoursRetard;

      const created = await tx.fraisImmobilisation.create({
        data: {
          idVoyage,
          prixParJour: prixDecimal,
          nombreJoursRetard: retardInt,
        },
      });

      await this.facturesService.recalculateFactureInTx(tx, companyId, idVoyage);

      return toFraisImmobilisationView(created);
    });
  }

  async findFraisImmobilisation(
    companyId: number,
    idVoyage: number,
  ): Promise<FraisImmobilisationView> {
    const voyage = await this.prisma.voyage.findFirst({
      where: { idVoyage, companyId },
    });
    if (!voyage) {
      throw new NotFoundException(`Voyage #${idVoyage} introuvable`);
    }

    const frais = await this.prisma.fraisImmobilisation.findUnique({
      where: { idVoyage },
    });
    if (!frais) {
      throw new NotFoundException(
        `Frais d'immobilisation introuvable pour le voyage #${idVoyage}`,
      );
    }

    return toFraisImmobilisationView(frais);
  }

  async updateFraisImmobilisation(
    companyId: number,
    idVoyage: number,
    dto: UpdateFraisImmobilisationDto,
  ): Promise<FraisImmobilisationView> {
    return this.prisma.$transaction(async (tx) => {
      const voyage = await tx.voyage.findFirst({
        where: { idVoyage, companyId },
      });
      if (!voyage) {
        throw new NotFoundException(`Voyage #${idVoyage} introuvable`);
      }

      const existing = await tx.fraisImmobilisation.findUnique({
        where: { idVoyage },
      });
      if (!existing) {
        throw new NotFoundException(
          `Frais d'immobilisation introuvable pour le voyage #${idVoyage}`,
        );
      }

      const { isPayee } = await this.facturesService.isFacturePayeeInTx(tx, companyId, { idVoyage });
      if (isPayee) {
        throw new BadRequestException('Cette facture est déjà payée et ne peut plus être modifiée.');
      }

      const prixDecimal =
        dto.prixParJour !== undefined
          ? new Prisma.Decimal(dto.prixParJour)
          : existing.prixParJour;
      const retardInt =
        dto.nombreJoursRetard !== undefined
          ? dto.nombreJoursRetard
          : existing.nombreJoursRetard;

      const updated = await tx.fraisImmobilisation.update({
        where: { idVoyage },
        data: {
          prixParJour: prixDecimal,
          nombreJoursRetard: retardInt,
        },
      });

      await this.facturesService.recalculateFactureInTx(tx, companyId, idVoyage);

      return toFraisImmobilisationView(updated);
    });
  }

  async removeFraisImmobilisation(
    companyId: number,
    idVoyage: number,
  ): Promise<{ idVoyage: number; message: string }> {
    return this.prisma.$transaction(async (tx) => {
      const voyage = await tx.voyage.findFirst({
        where: { idVoyage, companyId },
      });
      if (!voyage) {
        throw new NotFoundException(`Voyage #${idVoyage} introuvable`);
      }

      const existing = await tx.fraisImmobilisation.findUnique({
        where: { idVoyage },
      });
      if (!existing) {
        throw new NotFoundException(
          `Frais d'immobilisation introuvable pour le voyage #${idVoyage}`,
        );
      }

      const { isPayee } = await this.facturesService.isFacturePayeeInTx(tx, companyId, { idVoyage });
      if (isPayee) {
        throw new BadRequestException('Cette facture est déjà payée et ne peut plus être modifiée.');
      }

      await tx.fraisImmobilisation.delete({
        where: { idVoyage },
      });

      await this.facturesService.recalculateFactureInTx(tx, companyId, idVoyage);

      return {
        idVoyage,
        message: `Frais d'immobilisation pour le voyage #${idVoyage} supprimé avec succès`,
      };
    });
  }

  // -------------------------------------------------------------------
  // DOCUMENTS DE VOYAGE (Sub-Step 4.7)
  // -------------------------------------------------------------------

  async uploadVoyageDocument(
    companyId: number,
    idVoyage: number,
    file: Express.Multer.File,
  ): Promise<DocumentVoyageView> {
    const voyage = await this.prisma.voyage.findFirst({
      where: { idVoyage, companyId },
    });
    if (!voyage) {
      throw new NotFoundException(`Voyage #${idVoyage} introuvable`);
    }

    if (!file) {
      throw new BadRequestException('Fichier requis');
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Le fichier dépasse la taille maximale autorisée de 5 Mo');
    }

    // Validate extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.pdf', '.jpeg', '.jpg', '.png', '.webp'];
    if (!allowedExts.includes(ext)) {
      throw new BadRequestException(
        'Format de fichier non supporté. Formats acceptés : PDF, JPEG, PNG, WEBP',
      );
    }

    // Validate Magic Bytes
    const buffer = file.buffer;
    const isPdf = buffer.length >= 4 && buffer.toString('utf8', 0, 4) === '%PDF';
    const isJpeg =
      buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng =
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;
    const isWebp =
      buffer.length >= 12 &&
      buffer.toString('utf8', 0, 4) === 'RIFF' &&
      buffer.toString('utf8', 8, 12) === 'WEBP';

    if (!isPdf && !isJpeg && !isPng && !isWebp) {
      throw new BadRequestException('Fichier corrompu ou type MIME non valide');
    }

    // Write file to disk
    const uniqueName = `doc-voy-${idVoyage}-${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`;
    const diskPath = path.join(this.uploadDir, uniqueName);
    fs.writeFileSync(diskPath, buffer);

    const relativePath = `/uploads/documents-voyages/${uniqueName}`;

    try {
      const created = await this.prisma.documentVoyage.create({
        data: {
          idVoyage,
          cheminFichier: relativePath,
          nomOriginal: file.originalname,
          mimeType: file.mimetype,
          tailleFichier: BigInt(file.size),
        },
      });

      return toDocumentVoyageView(created);
    } catch (dbError) {
      if (fs.existsSync(diskPath)) {
        try {
          fs.unlinkSync(diskPath);
        } catch (_) {}
      }
      throw dbError;
    }
  }

  async findAllVoyageDocuments(
    companyId: number,
    idVoyage: number,
  ): Promise<DocumentVoyageView[]> {
    const voyage = await this.prisma.voyage.findFirst({
      where: { idVoyage, companyId },
    });
    if (!voyage) {
      throw new NotFoundException(`Voyage #${idVoyage} introuvable`);
    }

    const docs = await this.prisma.documentVoyage.findMany({
      where: { idVoyage, supprimeLe: null },
      orderBy: { id: 'desc' },
    });

    return docs.map(toDocumentVoyageView);
  }

  async getVoyageDocumentFile(
    companyId: number,
    idVoyage: number,
    documentId: number,
  ): Promise<{ diskPath: string; mimeType: string; nomOriginal: string }> {
    const doc = await this.prisma.documentVoyage.findFirst({
      where: {
        id: documentId,
        idVoyage,
        supprimeLe: null,
        voyage: { companyId },
      },
    });

    if (!doc || !doc.cheminFichier) {
      throw new NotFoundException(`Document #${documentId} introuvable pour ce voyage`);
    }

    const diskPath = this.resolveSecurePath(doc.cheminFichier);
    if (!fs.existsSync(diskPath)) {
      throw new NotFoundException('Fichier physique introuvable sur le disque');
    }

    return {
      diskPath,
      mimeType: doc.mimeType || 'application/octet-stream',
      nomOriginal: doc.nomOriginal || `document-${documentId}${path.extname(diskPath)}`,
    };
  }

  async removeVoyageDocument(
    companyId: number,
    idVoyage: number,
    documentId: number,
  ): Promise<{ id: number; message: string }> {
    const doc = await this.prisma.documentVoyage.findFirst({
      where: {
        id: documentId,
        idVoyage,
        supprimeLe: null,
        voyage: { companyId },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Document #${documentId} introuvable pour ce voyage`);
    }

    await this.prisma.documentVoyage.update({
      where: { id: documentId },
      data: { supprimeLe: new Date() },
    });

    return { id: documentId, message: `Document #${documentId} supprimé avec succès` };
  }
}
