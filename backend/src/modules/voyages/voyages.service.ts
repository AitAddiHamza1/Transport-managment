import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, VoyageStatut, VoyageType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreateVoyageDto } from './dto/create-voyage.dto';
import { UpdateVoyageDto } from './dto/update-voyage.dto';
import { UpdateVoyageStatusDto } from './dto/update-voyage-status.dto';
import { QueryVoyageDto } from './dto/query-voyage.dto';
import { VoyageResourceSyncService } from './voyage-resource-sync.service';

export interface CompactVehiculeSummary {
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  typeVehicule: string;
  statut: string;
}

export interface VoyageView {
  idVoyage: number;
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
  tracteurVehicule?: CompactVehiculeSummary | null;
  remorqueVehicule?: CompactVehiculeSummary | null;
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
  };
}

@Injectable()
export class VoyagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: VoyageResourceSyncService,
  ) {}

  async create(dto: CreateVoyageDto): Promise<VoyageView> {
    const lieuChargement = dto.lieuChargement.trim();
    const lieuDechargement = dto.lieuDechargement.trim();
    const nomClient = dto.nomClient ? dto.nomClient.trim() : null;
    const tracteur = dto.tracteur ? dto.tracteur.trim() : null;
    const remorque = dto.remorque ? dto.remorque.trim() : null;
    const nomConducteur = dto.nomConducteur ? dto.nomConducteur.trim() : null;
    const numeroCmr = dto.numeroCmr ? dto.numeroCmr.trim() : null;
    const targetStatus = dto.statut ?? VoyageStatut.PLANIFIE;

    return this.prisma.$transaction(async (tx) => {
      // Validate client existence if provided
      if (nomClient) {
        const clientExists = await tx.client.findFirst({
          where: { nomEntreprise: { equals: nomClient, mode: 'insensitive' } },
        });
        if (!clientExists) {
          throw new NotFoundException(`Le client "${nomClient}" est introuvable`);
        }
      }

      let validated: { driver?: { id: number } } = {};

      if (targetStatus === VoyageStatut.EN_COURS) {
        validated = await this.syncService.validateActivationEligibility(tx, {
          tracteurImmat: tracteur,
          remorqueImmat: remorque,
          nomConducteur,
        });
      } else {
        // Validate existence for non-active voyage
        if (tracteur && remorque && tracteur.toUpperCase() === remorque.toUpperCase()) {
          throw new ConflictException('Le tracteur et la remorque doivent être différents');
        }
        if (tracteur) {
          const tVeh = await tx.vehicule.findUnique({ where: { immatriculation: tracteur } });
          if (!tVeh)
            throw new NotFoundException(`Le véhicule tracteur "${tracteur}" est introuvable`);
        }
        if (remorque) {
          const rVeh = await tx.vehicule.findUnique({ where: { immatriculation: remorque } });
          if (!rVeh)
            throw new NotFoundException(`Le véhicule remorque "${remorque}" est introuvable`);
        }
        if (nomConducteur) {
          await this.syncService.resolveDriverByName(tx, nomConducteur);
        }
      }

      const created = await tx.voyage.create({
        data: {
          typeVoyage: dto.typeVoyage ?? VoyageType.NATIONAL,
          tracteur,
          remorque,
          nomConducteur,
          nomClient,
          lieuChargement,
          lieuDechargement,
          dateChargement: dto.dateChargement ? new Date(dto.dateChargement) : null,
          numeroCmr,
          statut: targetStatus,
          montantVoyage: dto.montantVoyage ?? 0,
        },
        include: {
          tracteurVehicule: true,
          remorqueVehicule: true,
        },
      });

      if (targetStatus === VoyageStatut.EN_COURS) {
        await this.syncService.acquireResources(tx, {
          tracteurImmat: tracteur,
          remorqueImmat: remorque,
          driverId: validated.driver?.id,
        });
      }

      return toVoyageView(created);
    });
  }

  async findAll(query: QueryVoyageDto): Promise<PaginatedResult<VoyageView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const sortBy = query.sortBy ?? 'idVoyage';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.VoyageWhereInput = {};

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
        },
      }),
      this.prisma.voyage.count({ where }),
    ]);

    return {
      data: data.map(toVoyageView),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findStats(): Promise<VoyageStats> {
    const [total, planifies, enCours, livres, annules, factures] = await Promise.all([
      this.prisma.voyage.count(),
      this.prisma.voyage.count({ where: { statut: VoyageStatut.PLANIFIE } }),
      this.prisma.voyage.count({ where: { statut: VoyageStatut.EN_COURS } }),
      this.prisma.voyage.count({ where: { statut: VoyageStatut.LIVRE } }),
      this.prisma.voyage.count({ where: { statut: VoyageStatut.ANNULE } }),
      this.prisma.voyage.count({ where: { statut: VoyageStatut.FACTURE } }),
    ]);

    return { total, planifies, enCours, livres, annules, factures };
  }

  async findOne(idVoyage: number): Promise<VoyageView> {
    const voyage = await this.prisma.voyage.findUnique({
      where: { idVoyage },
      include: {
        tracteurVehicule: true,
        remorqueVehicule: true,
      },
    });

    if (!voyage) {
      throw new NotFoundException(`Voyage #${idVoyage} introuvable`);
    }

    return toVoyageView(voyage);
  }

  async update(idVoyage: number, dto: UpdateVoyageDto): Promise<VoyageView> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.voyage.findUnique({ where: { idVoyage } });
      if (!existing) {
        throw new NotFoundException(`Voyage #${idVoyage} introuvable`);
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
      const updatedClient =
        dto.nomClient !== undefined
          ? dto.nomClient
            ? dto.nomClient.trim()
            : null
          : existing.nomClient;
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

      if (updatedClient) {
        const clientExists = await tx.client.findFirst({
          where: { nomEntreprise: { equals: updatedClient, mode: 'insensitive' } },
        });
        if (!clientExists) {
          throw new NotFoundException(`Le client "${updatedClient}" est introuvable`);
        }
      }

      let validated: { driver?: { id: number } } = {};

      if (newStatus === VoyageStatut.EN_COURS && existing.statut !== VoyageStatut.EN_COURS) {
        // Transition to EN_COURS
        validated = await this.syncService.validateActivationEligibility(tx, {
          idVoyageToExclude: idVoyage,
          tracteurImmat: updatedTracteur,
          remorqueImmat: updatedRemorque,
          nomConducteur: updatedDriver,
        });
      } else if (newStatus !== VoyageStatut.EN_COURS) {
        // Validate resources for non-active voyage
        if (
          updatedTracteur &&
          updatedRemorque &&
          updatedTracteur.toUpperCase() === updatedRemorque.toUpperCase()
        ) {
          throw new ConflictException('Le tracteur et la remorque doivent être différents');
        }
        if (updatedTracteur) {
          const tVeh = await tx.vehicule.findUnique({
            where: { immatriculation: updatedTracteur },
          });
          if (!tVeh)
            throw new NotFoundException(
              `Le véhicule tracteur "${updatedTracteur}" est introuvable`,
            );
        }
        if (updatedRemorque) {
          const rVeh = await tx.vehicule.findUnique({
            where: { immatriculation: updatedRemorque },
          });
          if (!rVeh)
            throw new NotFoundException(
              `Le véhicule remorque "${updatedRemorque}" est introuvable`,
            );
        }
        if (updatedDriver) {
          await this.syncService.resolveDriverByName(tx, updatedDriver);
        }
      }

      const wasEnCours = existing.statut === VoyageStatut.EN_COURS;

      const updated = await tx.voyage.update({
        where: { idVoyage },
        data: {
          ...(dto.typeVoyage ? { typeVoyage: dto.typeVoyage } : {}),
          ...(dto.tracteur !== undefined ? { tracteur: updatedTracteur } : {}),
          ...(dto.remorque !== undefined ? { remorque: updatedRemorque } : {}),
          ...(dto.nomConducteur !== undefined ? { nomConducteur: updatedDriver } : {}),
          ...(dto.nomClient !== undefined ? { nomClient: updatedClient } : {}),
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
        },
        include: {
          tracteurVehicule: true,
          remorqueVehicule: true,
        },
      });

      if (newStatus === VoyageStatut.EN_COURS && !wasEnCours) {
        await this.syncService.acquireResources(tx, {
          tracteurImmat: updatedTracteur,
          remorqueImmat: updatedRemorque,
          driverId: validated.driver?.id,
        });
      } else if (wasEnCours && newStatus !== VoyageStatut.EN_COURS) {
        await this.syncService.releaseResources(tx, {
          tracteurImmat: existing.tracteur,
          remorqueImmat: existing.remorque,
          nomConducteur: existing.nomConducteur,
          excludeVoyageId: idVoyage,
        });
      }

      return toVoyageView(updated);
    });
  }

  async updateStatus(idVoyage: number, dto: UpdateVoyageStatusDto): Promise<VoyageView> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.voyage.findUnique({ where: { idVoyage } });
      if (!existing) {
        throw new NotFoundException(`Voyage #${idVoyage} introuvable`);
      }

      if (existing.statut === dto.statut) {
        return toVoyageView(existing);
      }

      let validated: { driver?: { id: number } } = {};

      if (dto.statut === VoyageStatut.EN_COURS) {
        validated = await this.syncService.validateActivationEligibility(tx, {
          idVoyageToExclude: idVoyage,
          tracteurImmat: existing.tracteur,
          remorqueImmat: existing.remorque,
          nomConducteur: existing.nomConducteur,
        });
      }

      const wasEnCours = existing.statut === VoyageStatut.EN_COURS;

      const updated = await tx.voyage.update({
        where: { idVoyage },
        data: { statut: dto.statut },
        include: {
          tracteurVehicule: true,
          remorqueVehicule: true,
        },
      });

      if (dto.statut === VoyageStatut.EN_COURS) {
        await this.syncService.acquireResources(tx, {
          tracteurImmat: existing.tracteur,
          remorqueImmat: existing.remorque,
          driverId: validated.driver?.id,
        });
      } else if (wasEnCours) {
        await this.syncService.releaseResources(tx, {
          tracteurImmat: existing.tracteur,
          remorqueImmat: existing.remorque,
          nomConducteur: existing.nomConducteur,
          excludeVoyageId: idVoyage,
        });
      }

      return toVoyageView(updated);
    });
  }

  async remove(idVoyage: number): Promise<{ idVoyage: number }> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.voyage.findUnique({
        where: { idVoyage },
      });

      if (!existing) {
        throw new NotFoundException(`Voyage #${idVoyage} introuvable`);
      }

      if (existing.statut === VoyageStatut.EN_COURS) {
        throw new ConflictException('Un voyage en cours doit être annulé avant d’être supprimé.');
      }

      // Check linked factures relation
      const facturesCount = await tx.facture.count({
        where: { idVoyage },
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
}
