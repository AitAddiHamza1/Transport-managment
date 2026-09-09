import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ConducteurStatut } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreateConducteurDto } from './dto/create-conducteur.dto';
import { UpdateConducteurDto } from './dto/update-conducteur.dto';
import { UpdateConducteurStatusDto } from './dto/update-conducteur-status.dto';
import { QueryConducteurDto } from './dto/query-conducteur.dto';

export interface ConducteurDocumentSummary {
  id: number;
  typeDocument: string;
  numeroDocument: string | null;
  dateExpiration: Date | null;
  statut: string;
}

export interface ConducteurView {
  id: number;
  nomConducteur: string;
  telephone: string | null;
  adresse: string | null;
  statut: ConducteurStatut;
  creeLe: Date;
  idEmploye: number | null;
  employe: {
    id: number;
    matricule: string;
    nom: string;
    prenom: string;
    nomComplet: string;
    telephone: string | null;
    adresse: string | null;
    statut: string;
    poste: string;
    salaireBase: number | null;
  } | null;
  documents?: ConducteurDocumentSummary[];
}

export interface ConducteurStats {
  total: number;
  disponibles: number;
  enVoyage: number;
  indisponibles: number;
  inactifs: number;
}

export function toConducteurView(conducteur: any, hasEmployesVoir: boolean = true): ConducteurView {
  const emp = conducteur.employe;
  const employeView = emp
    ? {
        id: emp.id,
        matricule: emp.matricule,
        nom: emp.nom,
        prenom: emp.prenom,
        nomComplet: `${emp.prenom} ${emp.nom}`,
        telephone: emp.telephone ?? null,
        adresse: emp.adresse ?? null,
        statut: emp.statut,
        poste: emp.poste,
        salaireBase: hasEmployesVoir && emp.salaireBase !== null ? Number(emp.salaireBase) : null,
      }
    : null;

  return {
    id: conducteur.id,
    nomConducteur: emp ? `${emp.prenom} ${emp.nom}` : conducteur.nomConducteur,
    telephone: emp ? emp.telephone : (conducteur.telephone ?? null),
    adresse: emp ? emp.adresse : (conducteur.adresse ?? null),
    statut: conducteur.statut,
    creeLe: conducteur.creeLe,
    idEmploye: conducteur.idEmploye ?? null,
    employe: employeView,
    documents: conducteur.documents
      ? conducteur.documents.map((doc: any) => ({
          id: doc.id,
          typeDocument: doc.typeDocument,
          numeroDocument: doc.numeroDocument ?? null,
          dateExpiration: doc.dateExpiration ?? null,
          statut: doc.statut,
        }))
      : undefined,
  };
}

@Injectable()
export class ConducteursService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateConducteurDto,
    companyId: number,
    hasEmployesVoir: boolean = true,
  ): Promise<ConducteurView> {
    try {
      let nomConducteur = dto.nomConducteur ? dto.nomConducteur.trim() : '';
      let telephone = dto.telephone ? dto.telephone.trim() : null;
      let adresse = dto.adresse ? dto.adresse.trim() : null;
      const idEmploye = dto.idEmploye ?? null;

      if (idEmploye) {
        const employee = await this.prisma.employe.findFirst({
          where: { id: idEmploye, supprimeLe: null },
          include: { conducteur: true },
        });

        if (!employee || employee.companyId !== companyId) {
          throw new NotFoundException(`L'employé #${idEmploye} est introuvable`);
        }

        if (employee.statut !== 'ACTIF') {
          throw new BadRequestException(
            `Impossible de créer un profil conducteur pour un employé non-actif (${employee.statut})`,
          );
        }

        if (employee.conducteur) {
          throw new ConflictException(
            `Cet employé est déjà rattaché au conducteur #${employee.conducteur.id}`,
          );
        }

        nomConducteur = `${employee.prenom} ${employee.nom}`;
        telephone = employee.telephone ?? null;
        adresse = employee.adresse ?? null;
      } else {
        if (!nomConducteur) {
          throw new BadRequestException('Le nom du conducteur est obligatoire');
        }
      }

      const created = await this.prisma.conducteur.create({
        data: {
          companyId,
          nomConducteur,
          telephone,
          adresse,
          statut: dto.statut ?? 'DISPONIBLE',
          idEmploye,
        },
        include: {
          employe: true,
        },
      });
      return toConducteurView(created, hasEmployesVoir);
    } catch (error) {
      this.handlePrismaErrors(error);
      throw error;
    }
  }

  async findAll(
    query: QueryConducteurDto,
    companyId: number,
    hasEmployesVoir: boolean = true,
  ): Promise<PaginatedResult<ConducteurView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const sortBy = query.sortBy ?? 'id';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.ConducteurWhereInput = {
      companyId,
    };

    if (query.search) {
      const s = query.search.trim();
      where.AND = [
        {
          OR: [
            { nomConducteur: { contains: s, mode: 'insensitive' } },
            { telephone: { contains: s, mode: 'insensitive' } },
            { adresse: { contains: s, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (query.statut) {
      where.statut = query.statut;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.conducteur.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employe: true,
        },
      }),
      this.prisma.conducteur.count({ where }),
    ]);

    return {
      data: data.map((c) => toConducteurView(c, hasEmployesVoir)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findStats(companyId: number): Promise<ConducteurStats> {
    const [total, disponibles, enVoyage, indisponibles, inactifs] = await Promise.all([
      this.prisma.conducteur.count({ where: { companyId } }),
      this.prisma.conducteur.count({ where: { companyId, statut: ConducteurStatut.DISPONIBLE } }),
      this.prisma.conducteur.count({ where: { companyId, statut: ConducteurStatut.EN_VOYAGE } }),
      this.prisma.conducteur.count({ where: { companyId, statut: ConducteurStatut.INDISPONIBLE } }),
      this.prisma.conducteur.count({ where: { companyId, statut: ConducteurStatut.INACTIF } }),
    ]);

    return { total, disponibles, enVoyage, indisponibles, inactifs };
  }

  async findOne(
    id: number,
    companyId: number,
    hasEmployesVoir: boolean = true,
  ): Promise<ConducteurView> {
    const conducteur = await this.prisma.conducteur.findFirst({
      where: { id, companyId },
      include: {
        employe: true,
        documents: {
          select: {
            id: true,
            typeDocument: true,
            numeroDocument: true,
            dateExpiration: true,
            statut: true,
          },
          orderBy: { dateExpiration: 'asc' },
        },
      },
    });

    if (!conducteur) {
      throw new NotFoundException(`Conducteur #${id} introuvable`);
    }

    return toConducteurView(conducteur, hasEmployesVoir);
  }

  async update(
    id: number,
    dto: UpdateConducteurDto,
    companyId: number,
    hasEmployesVoir: boolean = true,
  ): Promise<ConducteurView> {
    const existing = await this.prisma.conducteur.findFirst({ where: { id, companyId } });
    if (!existing) {
      throw new NotFoundException(`Conducteur #${id} introuvable`);
    }

    try {
      let nomConducteur =
        dto.nomConducteur !== undefined ? dto.nomConducteur.trim() : existing.nomConducteur;
      let telephone =
        dto.telephone !== undefined
          ? dto.telephone
            ? dto.telephone.trim()
            : null
          : existing.telephone;
      let adresse =
        dto.adresse !== undefined ? (dto.adresse ? dto.adresse.trim() : null) : existing.adresse;
      const idEmploye = dto.idEmploye !== undefined ? dto.idEmploye : existing.idEmploye;

      if (dto.idEmploye !== undefined && dto.idEmploye !== existing.idEmploye) {
        if (dto.idEmploye) {
          const employee = await this.prisma.employe.findFirst({
            where: { id: dto.idEmploye, supprimeLe: null },
            include: { conducteur: true },
          });

          if (!employee || employee.companyId !== companyId) {
            throw new NotFoundException(`L'employé #${dto.idEmploye} est introuvable`);
          }

          if (employee.statut !== 'ACTIF') {
            throw new BadRequestException(
              `Impossible de relier un employé non-actif (${employee.statut})`,
            );
          }

          if (employee.conducteur && employee.conducteur.id !== id) {
            throw new ConflictException(
              `Cet employé est déjà rattaché au conducteur #${employee.conducteur.id}`,
            );
          }

          nomConducteur = `${employee.prenom} ${employee.nom}`;
          telephone = employee.telephone ?? null;
          adresse = employee.adresse ?? null;
        }
      }

      const updated = await this.prisma.conducteur.update({
        where: { id },
        data: {
          nomConducteur,
          telephone,
          adresse,
          statut: dto.statut ?? undefined,
          idEmploye,
        },
        include: {
          employe: true,
        },
      });
      return toConducteurView(updated, hasEmployesVoir);
    } catch (error) {
      this.handlePrismaErrors(error);
      throw error;
    }
  }

  async updateStatus(
    id: number,
    dto: UpdateConducteurStatusDto,
    companyId: number,
    hasEmployesVoir: boolean = true,
  ): Promise<ConducteurView> {
    const existing = await this.prisma.conducteur.findFirst({
      where: { id, companyId },
      include: { employe: true },
    });
    if (!existing) {
      throw new NotFoundException(`Conducteur #${id} introuvable`);
    }

    if (existing.statut === dto.statut) {
      return toConducteurView(existing, hasEmployesVoir);
    }

    // Check active trips for this driver
    const activeTrip = await this.prisma.voyage.findFirst({
      where: {
        companyId,
        statut: 'EN_COURS',
        nomConducteur: existing.nomConducteur,
      },
    });

    // Rule 1: Cannot manually set EN_VOYAGE
    if (dto.statut === ConducteurStatut.EN_VOYAGE) {
      throw new BadRequestException(
        'Le statut EN_VOYAGE est géré automatiquement par les voyages.',
      );
    }

    // Rule 2: Cannot manually set DISPONIBLE while an active trip is still in progress
    if (
      existing.statut === ConducteurStatut.EN_VOYAGE &&
      dto.statut === ConducteurStatut.DISPONIBLE &&
      activeTrip
    ) {
      throw new BadRequestException(
        `Ce conducteur est actuellement en voyage actif (#${activeTrip.idVoyage}) et ne peut pas être marqué DISPONIBLE tant que le voyage n'est pas clôturé`,
      );
    }

    const updated = await this.prisma.conducteur.update({
      where: { id },
      data: { statut: dto.statut },
      include: { employe: true },
    });

    return toConducteurView(updated, hasEmployesVoir);
  }

  async remove(id: number, companyId: number): Promise<{ id: number }> {
    const existing = await this.prisma.conducteur.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException(`Conducteur #${id} introuvable`);
    }

    // Relation checks: Voyages and Bons Carburant by driver name
    const [voyagesCount, bonsCount] = await Promise.all([
      this.prisma.voyage.count({
        where: { companyId, nomConducteur: existing.nomConducteur },
      }),
      this.prisma.bonCarburant.count({
        where: { nomConducteur: existing.nomConducteur },
      }),
    ]);

    if (voyagesCount > 0) {
      throw new ConflictException(
        `Ce conducteur est associé à ${voyagesCount} voyage(s) dans l'historique et ne peut pas être supprimé`,
      );
    }

    if (bonsCount > 0) {
      throw new ConflictException(
        `Ce conducteur est lié à ${bonsCount} bon(s) de carburant et ne peut pas être supprimé`,
      );
    }

    try {
      await this.prisma.conducteur.delete({ where: { id } });
      return { id };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'Ce conducteur est associé à des enregistrements dépendants et ne peut pas être supprimé',
        );
      }
      throw error;
    }
  }

  private handlePrismaErrors(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Un conducteur avec des identifiants similaires existe déjà');
    }
  }
}
