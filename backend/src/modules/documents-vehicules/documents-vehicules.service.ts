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
import { CreateDocumentVehiculeDto } from './dto/create-document-vehicule.dto';
import { UpdateDocumentVehiculeDto } from './dto/update-document-vehicule.dto';
import { QueryDocumentVehiculeDto } from './dto/query-document-vehicule.dto';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';

export interface DocumentVehiculeView {
  idDocument: number;
  immatriculation: string;
  vehicle: {
    id: number;
    immatriculation: string;
    marque: string;
    modele: string | null;
    typeVehicule: string;
  };
  typeDocument: string;
  numeroDocument: string | null;
  organismeEmetteur: string | null;
  dateEmission: string | null;
  dateExpiration: string | null;
  status: 'VALIDE' | 'BIENTOT_EXPIRE' | 'EXPIRE';
  daysUntilExpiry: number | null;
  hasExpirationDate: boolean;
  notes: string | null;
  hasFile: boolean;
  fileUrl: string | null;
  downloadUrl: string | null;
  originalFileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  creeLe: Date;
  misAJourLe: Date;
}

export interface DocumentVehiculeStats {
  total: number;
  valides: number;
  bientotExpires: number;
  expires: number;
}

export function computeDocumentStatus(dateExpiration: Date | null | undefined): {
  status: 'VALIDE' | 'BIENTOT_EXPIRE' | 'EXPIRE';
  daysUntilExpiry: number | null;
  hasExpirationDate: boolean;
} {
  if (!dateExpiration) {
    return { status: 'VALIDE', daysUntilExpiry: null, hasExpirationDate: false };
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const exp = new Date(dateExpiration);
  exp.setUTCHours(0, 0, 0, 0);

  const diffTime = exp.getTime() - today.getTime();
  const daysUntilExpiry = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return { status: 'EXPIRE', daysUntilExpiry, hasExpirationDate: true };
  } else if (daysUntilExpiry <= 30) {
    return { status: 'BIENTOT_EXPIRE', daysUntilExpiry, hasExpirationDate: true };
  } else {
    return { status: 'VALIDE', daysUntilExpiry, hasExpirationDate: true };
  }
}

export function toDocumentVehiculeView(doc: any): DocumentVehiculeView {
  const dateExpObj = doc.dateExpiration ? new Date(doc.dateExpiration) : null;
  const computed = computeDocumentStatus(dateExpObj);

  const idDoc = typeof doc.idDocument === 'bigint' ? Number(doc.idDocument) : doc.idDocument;
  const fileSize =
    doc.tailleFichier !== null && doc.tailleFichier !== undefined
      ? Number(doc.tailleFichier)
      : null;
  const hasFile = Boolean(doc.cheminFichier);

  return {
    idDocument: idDoc,
    immatriculation: doc.immatriculation,
    vehicle: {
      id: doc.vehicule ? Number(doc.vehicule.id) : 0,
      immatriculation: doc.vehicule ? doc.vehicule.immatriculation : doc.immatriculation,
      marque: doc.vehicule ? doc.vehicule.marque : 'N/A',
      modele: doc.vehicule?.modele ?? null,
      typeVehicule: doc.vehicule ? doc.vehicule.typeVehicule : 'CAMION',
    },
    typeDocument: doc.typeDocument,
    numeroDocument: doc.numeroDocument ?? null,
    organismeEmetteur: doc.organismeEmetteur ?? null,
    dateEmission: doc.dateEmission ? new Date(doc.dateEmission).toISOString().split('T')[0] : null,
    dateExpiration: doc.dateExpiration
      ? new Date(doc.dateExpiration).toISOString().split('T')[0]
      : null,
    status: computed.status,
    daysUntilExpiry: computed.daysUntilExpiry,
    hasExpirationDate: computed.hasExpirationDate,
    notes: doc.notes ?? null,
    hasFile,
    fileUrl: hasFile ? `/api/documents-vehicules/${idDoc}/fichier` : null,
    downloadUrl: hasFile ? `/api/documents-vehicules/${idDoc}/fichier/download` : null,
    originalFileName: doc.nomOriginal ?? null,
    mimeType: doc.mimeType ?? null,
    fileSize,
    creeLe: doc.creeLe,
    misAJourLe: doc.misAJourLe || doc.creeLe,
  };
}

@Injectable()
export class DocumentsVehiculesService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'documents-vehicules');

  constructor(private readonly prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async create(dto: CreateDocumentVehiculeDto): Promise<DocumentVehiculeView> {
    const immatriculation = dto.immatriculation.trim().toUpperCase();

    // Verify vehicle exists
    const vehicule = await this.prisma.vehicule.findUnique({
      where: { immatriculation },
    });
    if (!vehicule) {
      throw new NotFoundException(
        `Le véhicule avec l'immatriculation « ${immatriculation} » est introuvable`,
      );
    }

    // Validate dates
    if (dto.dateEmission && dto.dateExpiration) {
      const emission = new Date(dto.dateEmission);
      const expiration = new Date(dto.dateExpiration);
      if (expiration < emission) {
        throw new BadRequestException(
          "La date d'expiration ne peut pas être antérieure à la date d'émission",
        );
      }
    }

    // Check duplicate active document for vehicle + type
    const existingActive = await this.prisma.documentVehicule.findFirst({
      where: {
        immatriculation,
        typeDocument: dto.typeDocument,
        supprimeLe: null,
      },
    });

    if (existingActive) {
      throw new ConflictException(
        `Un document actif de type « ${dto.typeDocument} » existe déjà pour le véhicule « ${immatriculation} »`,
      );
    }

    try {
      const created = await this.prisma.documentVehicule.create({
        data: {
          immatriculation,
          typeDocument: dto.typeDocument,
          numeroDocument: dto.numeroDocument ? dto.numeroDocument.trim() : null,
          organismeEmetteur: dto.organismeEmetteur ? dto.organismeEmetteur.trim() : null,
          dateEmission: dto.dateEmission ? new Date(dto.dateEmission) : null,
          dateExpiration: dto.dateExpiration ? new Date(dto.dateExpiration) : null,
          notes: dto.notes ? dto.notes.trim() : null,
        },
        include: { vehicule: true },
      });

      return toDocumentVehiculeView(created);
    } catch (error) {
      this.handlePrismaErrors(error, immatriculation, dto.typeDocument);
      throw error;
    }
  }

  async findAll(query: QueryDocumentVehiculeDto): Promise<PaginatedResult<DocumentVehiculeView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const sortBy = query.sortBy ?? 'dateExpiration';
    const sortOrder = query.sortOrder ?? 'asc';

    const where: Prisma.DocumentVehiculeWhereInput = {
      supprimeLe: null,
    };

    if (query.immatriculation) {
      where.immatriculation = query.immatriculation.trim().toUpperCase();
    }

    if (query.typeDocument) {
      where.typeDocument = query.typeDocument.trim().toUpperCase();
    }

    if (query.hasFile !== undefined) {
      where.cheminFichier = query.hasFile ? { not: null } : null;
    }

    if (query.dateExpirationDebut || query.dateExpirationFin) {
      where.dateExpiration = {
        ...(query.dateExpirationDebut ? { gte: new Date(query.dateExpirationDebut) } : {}),
        ...(query.dateExpirationFin ? { lte: new Date(query.dateExpirationFin) } : {}),
      };
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { immatriculation: { contains: s, mode: 'insensitive' } },
        { numeroDocument: { contains: s, mode: 'insensitive' } },
        { organismeEmetteur: { contains: s, mode: 'insensitive' } },
        { notes: { contains: s, mode: 'insensitive' } },
        { vehicule: { marque: { contains: s, mode: 'insensitive' } } },
        { vehicule: { modele: { contains: s, mode: 'insensitive' } } },
      ];
    }

    // Fetch active documents
    const allDocs = await this.prisma.documentVehicule.findMany({
      where,
      include: { vehicule: true },
      orderBy:
        sortBy === 'dateExpiration' ? { dateExpiration: sortOrder } : { [sortBy]: sortOrder },
    });

    let mapped = allDocs.map(toDocumentVehiculeView);

    // Apply status filter if provided
    if (query.statut) {
      mapped = mapped.filter((doc) => doc.status === query.statut);
    }

    const total = mapped.length;
    const paginated = mapped.slice((page - 1) * limit, page * limit);

    return {
      data: paginated,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findStats(): Promise<DocumentVehiculeStats> {
    const allDocs = await this.prisma.documentVehicule.findMany({
      where: { supprimeLe: null },
      select: { dateExpiration: true },
    });

    let valides = 0;
    let bientotExpires = 0;
    let expires = 0;

    for (const doc of allDocs) {
      const { status } = computeDocumentStatus(doc.dateExpiration);
      if (status === 'VALIDE') valides++;
      else if (status === 'BIENTOT_EXPIRE') bientotExpires++;
      else if (status === 'EXPIRE') expires++;
    }

    return {
      total: allDocs.length,
      valides,
      bientotExpires,
      expires,
    };
  }

  async findOne(id: number): Promise<DocumentVehiculeView> {
    const doc = await this.prisma.documentVehicule.findFirst({
      where: { idDocument: id, supprimeLe: null },
      include: { vehicule: true },
    });

    if (!doc) {
      throw new NotFoundException(`Document véhicule #${id} introuvable`);
    }

    return toDocumentVehiculeView(doc);
  }

  async update(id: number, dto: UpdateDocumentVehiculeDto): Promise<DocumentVehiculeView> {
    const existing = await this.prisma.documentVehicule.findFirst({
      where: { idDocument: id, supprimeLe: null },
    });

    if (!existing) {
      throw new NotFoundException(`Document véhicule #${id} introuvable`);
    }

    const dateEmission =
      dto.dateEmission !== undefined
        ? dto.dateEmission
          ? new Date(dto.dateEmission)
          : null
        : existing.dateEmission;
    const dateExpiration =
      dto.dateExpiration !== undefined
        ? dto.dateExpiration
          ? new Date(dto.dateExpiration)
          : null
        : existing.dateExpiration;

    if (dateEmission && dateExpiration && dateExpiration < dateEmission) {
      throw new BadRequestException(
        "La date d'expiration ne peut pas être antérieure à la date d'émission",
      );
    }

    if (dto.typeDocument && dto.typeDocument !== existing.typeDocument) {
      const dupActive = await this.prisma.documentVehicule.findFirst({
        where: {
          immatriculation: existing.immatriculation,
          typeDocument: dto.typeDocument,
          idDocument: { not: id },
          supprimeLe: null,
        },
      });
      if (dupActive) {
        throw new ConflictException(
          `Un document actif de type « ${dto.typeDocument} » existe déjà pour le véhicule « ${existing.immatriculation} »`,
        );
      }
    }

    try {
      const updated = await this.prisma.documentVehicule.update({
        where: { idDocument: id },
        data: {
          ...(dto.typeDocument ? { typeDocument: dto.typeDocument } : {}),
          ...(dto.numeroDocument !== undefined
            ? { numeroDocument: dto.numeroDocument ? dto.numeroDocument.trim() : null }
            : {}),
          ...(dto.organismeEmetteur !== undefined
            ? { organismeEmetteur: dto.organismeEmetteur ? dto.organismeEmetteur.trim() : null }
            : {}),
          ...(dto.dateEmission !== undefined ? { dateEmission } : {}),
          ...(dto.dateExpiration !== undefined ? { dateExpiration } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes ? dto.notes.trim() : null } : {}),
          misAJourLe: new Date(),
        },
        include: { vehicule: true },
      });

      return toDocumentVehiculeView(updated);
    } catch (error) {
      this.handlePrismaErrors(
        error,
        existing.immatriculation,
        dto.typeDocument ?? existing.typeDocument,
      );
      throw error;
    }
  }

  async softDelete(id: number): Promise<{ id: number; message: string }> {
    const existing = await this.prisma.documentVehicule.findFirst({
      where: { idDocument: id, supprimeLe: null },
    });

    if (!existing) {
      throw new NotFoundException(`Document véhicule #${id} introuvable`);
    }

    await this.prisma.documentVehicule.update({
      where: { idDocument: id },
      data: { supprimeLe: new Date() },
    });

    return { id, message: `Document #${id} supprimé avec succès` };
  }

  async uploadFile(id: number, file: Express.Multer.File): Promise<DocumentVehiculeView> {
    const doc = await this.prisma.documentVehicule.findFirst({
      where: { idDocument: id, supprimeLe: null },
    });
    if (!doc) {
      throw new NotFoundException(`Document véhicule #${id} introuvable`);
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

    // Remove old file if present
    if (doc.cheminFichier) {
      const oldDiskPath = path.join(process.cwd(), doc.cheminFichier.replace(/^\//, ''));
      if (fs.existsSync(oldDiskPath)) {
        try {
          fs.unlinkSync(oldDiskPath);
        } catch (_) {}
      }
    }

    const uniqueName = `doc-veh-${id}-${Date.now()}${ext}`;
    const diskPath = path.join(this.uploadDir, uniqueName);
    fs.writeFileSync(diskPath, buffer);

    const relativePath = `/uploads/documents-vehicules/${uniqueName}`;

    const updated = await this.prisma.documentVehicule.update({
      where: { idDocument: id },
      data: {
        cheminFichier: relativePath,
        nomOriginal: file.originalname,
        mimeType: file.mimetype,
        tailleFichier: BigInt(file.size),
        misAJourLe: new Date(),
      },
      include: { vehicule: true },
    });

    return toDocumentVehiculeView(updated);
  }

  async getFile(id: number): Promise<{ diskPath: string; mimeType: string; nomOriginal: string }> {
    const doc = await this.prisma.documentVehicule.findFirst({
      where: { idDocument: id, supprimeLe: null },
    });

    if (!doc || !doc.cheminFichier) {
      throw new NotFoundException(`Fichier du document #${id} introuvable`);
    }

    const diskPath = path.join(process.cwd(), doc.cheminFichier.replace(/^\//, ''));
    if (!fs.existsSync(diskPath)) {
      throw new NotFoundException('Fichier physique introuvable sur le disque');
    }

    return {
      diskPath,
      mimeType: doc.mimeType || 'application/octet-stream',
      nomOriginal: doc.nomOriginal || `document-${id}${path.extname(diskPath)}`,
    };
  }

  async deleteFile(id: number): Promise<DocumentVehiculeView> {
    const doc = await this.prisma.documentVehicule.findFirst({
      where: { idDocument: id, supprimeLe: null },
    });

    if (!doc) {
      throw new NotFoundException(`Document véhicule #${id} introuvable`);
    }

    if (doc.cheminFichier) {
      const diskPath = path.join(process.cwd(), doc.cheminFichier.replace(/^\//, ''));
      if (fs.existsSync(diskPath)) {
        try {
          fs.unlinkSync(diskPath);
        } catch (_) {}
      }
    }

    const updated = await this.prisma.documentVehicule.update({
      where: { idDocument: id },
      data: {
        cheminFichier: null,
        nomOriginal: null,
        mimeType: null,
        tailleFichier: null,
        misAJourLe: new Date(),
      },
      include: { vehicule: true },
    });

    return toDocumentVehiculeView(updated);
  }

  private handlePrismaErrors(error: unknown, immatriculation: string, typeDocument: string): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(
        `Un document actif de type « ${typeDocument} » existe déjà pour le véhicule « ${immatriculation} »`,
      );
    }
  }
}
