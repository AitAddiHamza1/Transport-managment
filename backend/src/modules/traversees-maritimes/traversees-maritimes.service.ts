import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreateTraverseeMaritimeDto } from './dto/create-traversee-maritime.dto';
import { UpdateTraverseeMaritimeDto } from './dto/update-traversee-maritime.dto';
import { QueryTraverseeMaritimeDto } from './dto/query-traversee-maritime.dto';

export interface TraverseeMaritimeView {
  id: number;
  companyId: number;
  idVoyage: number | null;
  immatriculation: string;
  idConducteur: number;
  dateTraversee: string;
  bateau: string;
  lieuEmbarquement: string;
  prix: number;
  devise: string;
  estVerifiee: boolean;
  cheminFichier: string | null;
  nomOriginal: string | null;
  mimeType: string | null;
  tailleFichier: number | null;
  fileUrl: string | null;
  downloadUrl: string | null;
  creeLe: string;
  misAJourLe: string;
  vehicule?: { immatriculation: string; marque: string; modele: string | null } | null;
  conducteur?: { id: number; nomConducteur: string } | null;
  voyage?: { idVoyage: number; numeroCmr: string | null; statut: string } | null;
}

export interface TraverseeMaritimeStats {
  total: number;
  avecVoyage: number;
  sansVoyage: number;
  coutTotalMad: number;
}

export function toTraverseeMaritimeView(t: any): TraverseeMaritimeView {
  const id = Number(t.id);
  const hasFile = Boolean(t.cheminFichier);
  const fileSize =
    t.tailleFichier !== null && t.tailleFichier !== undefined ? Number(t.tailleFichier) : null;

  return {
    id,
    companyId: Number(t.companyId),
    idVoyage: t.idVoyage ? Number(t.idVoyage) : null,
    immatriculation: t.immatriculation,
    idConducteur: Number(t.idConducteur),
    dateTraversee: new Date(t.dateTraversee).toISOString().split('T')[0],
    bateau: t.bateau,
    lieuEmbarquement: t.lieuEmbarquement,
    prix: t.prix !== undefined ? Number(t.prix) : 0,
    devise: 'MAD',
    estVerifiee: Boolean(t.estVerifiee),
    cheminFichier: t.cheminFichier || null,
    nomOriginal: t.nomOriginal || null,
    mimeType: t.mimeType || null,
    tailleFichier: fileSize,
    fileUrl: hasFile ? `/api/traversees-maritimes/${id}/fichier` : null,
    downloadUrl: hasFile ? `/api/traversees-maritimes/${id}/fichier/download` : null,
    creeLe: new Date(t.creeLe).toISOString(),
    misAJourLe: new Date(t.misAJourLe || t.creeLe).toISOString(),
    vehicule: t.vehicule
      ? {
          immatriculation: t.vehicule.immatriculation,
          marque: t.vehicule.marque,
          modele: t.vehicule.modele ?? null,
        }
      : null,
    conducteur: t.conducteur
      ? {
          id: Number(t.conducteur.id),
          nomConducteur: t.conducteur.nomConducteur,
        }
      : null,
    voyage: t.voyage
      ? {
          idVoyage: Number(t.voyage.idVoyage),
          numeroCmr: t.voyage.numeroCmr ?? null,
          statut: t.voyage.statut,
        }
      : null,
  };
}

@Injectable()
export class TraverseesMaritimesService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'justificatifs-traversees');

  constructor(private readonly prisma: PrismaService) {
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

  async create(
    companyId: number,
    dto: CreateTraverseeMaritimeDto,
    file?: Express.Multer.File,
  ): Promise<TraverseeMaritimeView> {
    if (dto.devise && dto.devise !== 'MAD') {
      throw new BadRequestException('Seule la devise MAD est autorisée pour les traversées maritimes.');
    }

    const immatriculation = dto.immatriculation.trim();
    const bateau = dto.bateau.trim();
    const lieuEmbarquement = dto.lieuEmbarquement;

    // Tenant isolation validation
    const vehicule = await this.prisma.vehicule.findFirst({
      where: { immatriculation, companyId },
    });
    if (!vehicule) {
      throw new NotFoundException(`Le véhicule "${immatriculation}" est introuvable`);
    }

    const conducteur = await this.prisma.conducteur.findFirst({
      where: { id: dto.idConducteur, companyId },
    });
    if (!conducteur) {
      throw new NotFoundException(`Le conducteur #${dto.idConducteur} est introuvable`);
    }

    if (dto.idVoyage) {
      const voyage = await this.prisma.voyage.findFirst({
        where: { idVoyage: dto.idVoyage, companyId },
      });
      if (!voyage) {
        throw new NotFoundException(`Le voyage #${dto.idVoyage} est introuvable`);
      }

      const existingCrossing = await this.prisma.traverseeMaritime.findUnique({
        where: { idVoyage: dto.idVoyage },
      });
      if (existingCrossing && !existingCrossing.supprimeLe) {
        throw new ConflictException(`Une traversée maritime existe déjà pour le voyage #${dto.idVoyage}`);
      }
    }

    let fileData: {
      cheminFichier?: string;
      nomOriginal?: string;
      mimeType?: string;
      tailleFichier?: bigint;
    } = {};

    if (file) {
      this.validateFile(file);
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${path.extname(file.originalname)}`;
      const diskPath = path.join(this.uploadDir, filename);
      fs.writeFileSync(diskPath, file.buffer);

      fileData = {
        cheminFichier: filename,
        nomOriginal: file.originalname,
        mimeType: file.mimetype,
        tailleFichier: BigInt(file.size),
      };
    }

    try {
      const created = await this.prisma.traverseeMaritime.create({
        data: {
          companyId,
          idVoyage: dto.idVoyage || null,
          immatriculation,
          idConducteur: dto.idConducteur,
          dateTraversee: new Date(dto.dateTraversee),
          bateau,
          lieuEmbarquement,
          prix: new Prisma.Decimal(dto.prix),
          devise: 'MAD',
          estVerifiee: Boolean(dto.estVerifiee),
          ...fileData,
        },
        include: {
          vehicule: true,
          conducteur: true,
          voyage: true,
        },
      });

      return toTraverseeMaritimeView(created);
    } catch (error) {
      if (fileData.cheminFichier) {
        const diskPath = path.join(this.uploadDir, fileData.cheminFichier);
        if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Une traversée maritime existe déjà pour le voyage #${dto.idVoyage}`);
      }
      throw error;
    }
  }

  async findAll(
    companyId: number,
    query: QueryTraverseeMaritimeDto,
  ): Promise<PaginatedResult<TraverseeMaritimeView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const sortBy = query.sortBy ?? 'id';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.TraverseeMaritimeWhereInput = {
      companyId,
      supprimeLe: null,
    };

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { bateau: { contains: s, mode: 'insensitive' } },
        { immatriculation: { contains: s, mode: 'insensitive' } },
        { conducteur: { nomConducteur: { contains: s, mode: 'insensitive' } } },
        { lieuEmbarquement: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query.immatriculation) {
      where.immatriculation = { contains: query.immatriculation.trim(), mode: 'insensitive' };
    }

    if (query.idConducteur) {
      where.idConducteur = query.idConducteur;
    }

    if (query.lieuEmbarquement) {
      where.lieuEmbarquement = query.lieuEmbarquement;
    }

    if (query.associationVoyage === 'avec_voyage') {
      where.idVoyage = { not: null };
    } else if (query.associationVoyage === 'sans_voyage') {
      where.idVoyage = null;
    }

    if (query.dateDebut || query.dateFin) {
      where.dateTraversee = {};
      if (query.dateDebut) where.dateTraversee.gte = new Date(query.dateDebut);
      if (query.dateFin) where.dateTraversee.lte = new Date(query.dateFin);
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.traverseeMaritime.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          vehicule: true,
          conducteur: true,
          voyage: true,
        },
      }),
      this.prisma.traverseeMaritime.count({ where }),
    ]);

    return {
      data: data.map(toTraverseeMaritimeView),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findStats(companyId: number): Promise<TraverseeMaritimeStats> {
    const baseWhere: Prisma.TraverseeMaritimeWhereInput = {
      companyId,
      supprimeLe: null,
    };

    const [total, avecVoyage, sansVoyage, sumMad] = await Promise.all([
      this.prisma.traverseeMaritime.count({ where: baseWhere }),
      this.prisma.traverseeMaritime.count({ where: { ...baseWhere, idVoyage: { not: null } } }),
      this.prisma.traverseeMaritime.count({ where: { ...baseWhere, idVoyage: null } }),
      this.prisma.traverseeMaritime.aggregate({
        where: baseWhere,
        _sum: { prix: true },
      }),
    ]);

    return {
      total,
      avecVoyage,
      sansVoyage,
      coutTotalMad: Number(sumMad._sum.prix ?? 0),
    };
  }

  async findOne(companyId: number, id: number): Promise<TraverseeMaritimeView> {
    const traversee = await this.prisma.traverseeMaritime.findFirst({
      where: { id, companyId, supprimeLe: null },
      include: {
        vehicule: true,
        conducteur: true,
        voyage: true,
      },
    });

    if (!traversee) {
      throw new NotFoundException(`Traversée maritime #${id} introuvable`);
    }

    return toTraverseeMaritimeView(traversee);
  }

  async update(
    companyId: number,
    id: number,
    dto: UpdateTraverseeMaritimeDto,
  ): Promise<TraverseeMaritimeView> {
    if (dto.devise && dto.devise !== 'MAD') {
      throw new BadRequestException('Seule la devise MAD est autorisée pour les traversées maritimes.');
    }

    const existing = await this.prisma.traverseeMaritime.findFirst({
      where: { id, companyId, supprimeLe: null },
    });

    if (!existing) {
      throw new NotFoundException(`Traversée maritime #${id} introuvable`);
    }

    let updatedImmatriculation = existing.immatriculation;
    if (dto.immatriculation) {
      const immat = dto.immatriculation.trim();
      const vehicule = await this.prisma.vehicule.findFirst({
        where: { immatriculation: immat, companyId },
      });
      if (!vehicule) {
        throw new NotFoundException(`Le véhicule "${immat}" est introuvable`);
      }
      updatedImmatriculation = immat;
    }

    let updatedIdConducteur = existing.idConducteur;
    if (dto.idConducteur) {
      const conducteur = await this.prisma.conducteur.findFirst({
        where: { id: dto.idConducteur, companyId },
      });
      if (!conducteur) {
        throw new NotFoundException(`Le conducteur #${dto.idConducteur} est introuvable`);
      }
      updatedIdConducteur = dto.idConducteur;
    }

    if (dto.idVoyage !== undefined && dto.idVoyage !== existing.idVoyage) {
      if (dto.idVoyage !== null) {
        const voyage = await this.prisma.voyage.findFirst({
          where: { idVoyage: dto.idVoyage, companyId },
        });
        if (!voyage) {
          throw new NotFoundException(`Le voyage #${dto.idVoyage} est introuvable`);
        }

        const conflict = await this.prisma.traverseeMaritime.findUnique({
          where: { idVoyage: dto.idVoyage },
        });
        if (conflict && conflict.id !== id && !conflict.supprimeLe) {
          throw new ConflictException(`Une traversée maritime existe déjà pour le voyage #${dto.idVoyage}`);
        }
      }
    }

    const updated = await this.prisma.traverseeMaritime.update({
      where: { id },
      data: {
        ...(dto.idVoyage !== undefined ? { idVoyage: dto.idVoyage } : {}),
        immatriculation: updatedImmatriculation,
        idConducteur: updatedIdConducteur,
        ...(dto.dateTraversee ? { dateTraversee: new Date(dto.dateTraversee) } : {}),
        ...(dto.bateau ? { bateau: dto.bateau.trim() } : {}),
        ...(dto.lieuEmbarquement ? { lieuEmbarquement: dto.lieuEmbarquement } : {}),
        ...(dto.prix !== undefined ? { prix: new Prisma.Decimal(dto.prix) } : {}),
        devise: 'MAD',
        ...(dto.estVerifiee !== undefined ? { estVerifiee: Boolean(dto.estVerifiee) } : {}),
      },
      include: {
        vehicule: true,
        conducteur: true,
        voyage: true,
      },
    });

    return toTraverseeMaritimeView(updated);
  }

  async toggleVerification(
    companyId: number,
    id: number,
    targetState?: boolean,
  ): Promise<TraverseeMaritimeView> {
    const existing = await this.prisma.traverseeMaritime.findFirst({
      where: { id, companyId, supprimeLe: null },
    });

    if (!existing) {
      throw new NotFoundException(`Traversée maritime #${id} introuvable`);
    }

    const newState = targetState !== undefined ? targetState : !existing.estVerifiee;

    const updated = await this.prisma.traverseeMaritime.update({
      where: { id },
      data: { estVerifiee: newState },
      include: {
        vehicule: true,
        conducteur: true,
        voyage: true,
      },
    });

    return toTraverseeMaritimeView(updated);
  }

  async softDelete(companyId: number, id: number): Promise<{ id: number; message: string }> {
    const existing = await this.prisma.traverseeMaritime.findFirst({
      where: { id, companyId, supprimeLe: null },
    });

    if (!existing) {
      throw new NotFoundException(`Traversée maritime #${id} introuvable`);
    }

    await this.prisma.traverseeMaritime.update({
      where: { id },
      data: { supprimeLe: new Date() },
    });

    return { id, message: 'Traversée maritime supprimée avec succès' };
  }

  async uploadFile(
    companyId: number,
    id: number,
    file: Express.Multer.File,
  ): Promise<TraverseeMaritimeView> {
    const existing = await this.prisma.traverseeMaritime.findFirst({
      where: { id, companyId, supprimeLe: null },
    });

    if (!existing) {
      throw new NotFoundException(`Traversée maritime #${id} introuvable`);
    }

    this.validateFile(file);

    if (existing.cheminFichier) {
      const oldDiskPath = path.join(this.uploadDir, path.basename(existing.cheminFichier));
      if (fs.existsSync(oldDiskPath)) {
        fs.unlinkSync(oldDiskPath);
      }
    }

    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${path.extname(file.originalname)}`;
    const diskPath = path.join(this.uploadDir, filename);
    fs.writeFileSync(diskPath, file.buffer);

    const updated = await this.prisma.traverseeMaritime.update({
      where: { id },
      data: {
        cheminFichier: filename,
        nomOriginal: file.originalname,
        mimeType: file.mimetype,
        tailleFichier: BigInt(file.size),
      },
      include: {
        vehicule: true,
        conducteur: true,
        voyage: true,
      },
    });

    return toTraverseeMaritimeView(updated);
  }

  async getFile(
    companyId: number,
    id: number,
  ): Promise<{ diskPath: string; mimeType: string; nomOriginal: string }> {
    const existing = await this.prisma.traverseeMaritime.findFirst({
      where: { id, companyId, supprimeLe: null },
    });

    if (!existing || !existing.cheminFichier) {
      throw new NotFoundException(`Aucun justificatif trouvé pour la traversée maritime #${id}`);
    }

    const diskPath = this.resolveSecurePath(existing.cheminFichier);
    if (!fs.existsSync(diskPath)) {
      throw new NotFoundException(`Fichier physique introuvable sur le serveur`);
    }

    return {
      diskPath,
      mimeType: existing.mimeType || 'application/octet-stream',
      nomOriginal: existing.nomOriginal || 'justificatif',
    };
  }

  async deleteFile(companyId: number, id: number): Promise<TraverseeMaritimeView> {
    const existing = await this.prisma.traverseeMaritime.findFirst({
      where: { id, companyId, supprimeLe: null },
    });

    if (!existing || !existing.cheminFichier) {
      throw new NotFoundException(`Aucun justificatif trouvé pour la traversée maritime #${id}`);
    }

    const diskPath = path.join(this.uploadDir, path.basename(existing.cheminFichier));
    if (fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
    }

    const updated = await this.prisma.traverseeMaritime.update({
      where: { id },
      data: {
        cheminFichier: null,
        nomOriginal: null,
        mimeType: null,
        tailleFichier: null,
      },
      include: {
        vehicule: true,
        conducteur: true,
        voyage: true,
      },
    });

    return toTraverseeMaritimeView(updated);
  }

  private validateFile(file: Express.Multer.File): void {
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Format de fichier non pris en charge. Formats acceptés : PDF, JPG, JPEG, PNG',
      );
    }

    if (file.size > maxSizeBytes) {
      throw new BadRequestException('Le fichier dépasse la taille maximale autorisée de 5 Mo');
    }
  }
}
