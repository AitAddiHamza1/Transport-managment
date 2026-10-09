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
import { CreateDocumentConducteurDto } from './dto/create-document-conducteur.dto';
import { UpdateDocumentConducteurDto } from './dto/update-document-conducteur.dto';
import { QueryDocumentConducteurDto } from './dto/query-document-conducteur.dto';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';

export interface DocumentConducteurView {
  id: number;
  idConducteur: number;
  conducteur: {
    id: number;
    nomConducteur: string;
    telephone: string | null;
    statut: string;
  };
  typeDocument: string;
  numeroDocument: string | null;
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

export interface DocumentConducteurStats {
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

export function toDocumentConducteurView(doc: any): DocumentConducteurView {
  const dateExpObj = doc.dateExpiration ? new Date(doc.dateExpiration) : null;
  const computed = computeDocumentStatus(dateExpObj);

  const idDoc = Number(doc.id);
  const fileSize =
    doc.tailleFichier !== null && doc.tailleFichier !== undefined
      ? Number(doc.tailleFichier)
      : null;
  const hasFile = Boolean(doc.cheminFichier);

  return {
    id: idDoc,
    idConducteur: Number(doc.idConducteur),
    conducteur: {
      id: doc.conducteur ? Number(doc.conducteur.id) : Number(doc.idConducteur),
      nomConducteur: doc.conducteur ? doc.conducteur.nomConducteur : 'N/A',
      telephone: doc.conducteur?.telephone ?? null,
      statut: doc.conducteur ? doc.conducteur.statut : 'DISPONIBLE',
    },
    typeDocument: doc.typeDocument,
    numeroDocument: doc.numeroDocument ?? null,
    dateEmission: doc.dateEmission ? new Date(doc.dateEmission).toISOString().split('T')[0] : null,
    dateExpiration: doc.dateExpiration
      ? new Date(doc.dateExpiration).toISOString().split('T')[0]
      : null,
    status: computed.status,
    daysUntilExpiry: computed.daysUntilExpiry,
    hasExpirationDate: computed.hasExpirationDate,
    notes: doc.notes ?? null,
    hasFile,
    fileUrl: hasFile ? `/api/documents-conducteurs/${idDoc}/fichier` : null,
    downloadUrl: hasFile ? `/api/documents-conducteurs/${idDoc}/fichier/download` : null,
    originalFileName: doc.nomOriginal ?? null,
    mimeType: doc.mimeType ?? null,
    fileSize,
    creeLe: doc.creeLe,
    misAJourLe: doc.misAJourLe || doc.creeLe,
  };
}

@Injectable()
export class DocumentsConducteursService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'documents-conducteurs');

  constructor(private readonly prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Resolves physical disk path safely and prevents path traversal attacks
   */
  public resolveSecurePath(relativePath: string): string {
    const baseName = path.basename(relativePath);
    const resolvedPath = path.resolve(this.uploadDir, baseName);
    const allowedDir = path.resolve(this.uploadDir);

    if (!resolvedPath.startsWith(allowedDir)) {
      throw new BadRequestException('Accès au fichier refusé (Chemin non autorisé)');
    }

    return resolvedPath;
  }

  async create(companyId: number, dto: CreateDocumentConducteurDto): Promise<DocumentConducteurView> {
    const idConducteur = dto.idConducteur;
    const typeDocument = dto.typeDocument.trim();

    // Verify conducteur exists and belongs to companyId
    const conducteur = await this.prisma.conducteur.findFirst({
      where: { id: idConducteur, companyId },
    });
    if (!conducteur) {
      throw new NotFoundException(`Le conducteur #${idConducteur} est introuvable`);
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

    // Check duplicate active document for conducteur + typeDocument (scoped to companyId)
    const existingActive = await this.prisma.documentConducteur.findFirst({
      where: {
        idConducteur,
        typeDocument,
        conducteur: { companyId },
        supprimeLe: null,
      },
    });

    if (existingActive) {
      throw new ConflictException(
        `Un document actif de type « ${typeDocument} » existe déjà pour le conducteur « ${conducteur.nomConducteur} »`,
      );
    }

    try {
      const created = await this.prisma.documentConducteur.create({
        data: {
          idConducteur,
          typeDocument,
          numeroDocument: dto.numeroDocument ? dto.numeroDocument.trim() : null,
          dateEmission: dto.dateEmission ? new Date(dto.dateEmission) : null,
          dateExpiration: dto.dateExpiration ? new Date(dto.dateExpiration) : null,
          notes: dto.notes ? dto.notes.trim() : null,
        },
        include: { conducteur: true },
      });

      return toDocumentConducteurView(created);
    } catch (error) {
      this.handlePrismaErrors(error, conducteur.nomConducteur, typeDocument);
      throw error;
    }
  }

  async findAll(
    companyId: number,
    query: QueryDocumentConducteurDto,
  ): Promise<PaginatedResult<DocumentConducteurView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const sortBy = query.sortBy ?? 'dateExpiration';
    const sortOrder = query.sortOrder ?? 'asc';

    const where: Prisma.DocumentConducteurWhereInput = {
      supprimeLe: null,
      conducteur: { companyId },
    };

    if (query.idConducteur) {
      where.idConducteur = query.idConducteur;
    }

    if (query.typeDocument) {
      where.typeDocument = query.typeDocument.trim();
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
        { typeDocument: { contains: s, mode: 'insensitive' } },
        { numeroDocument: { contains: s, mode: 'insensitive' } },
        { notes: { contains: s, mode: 'insensitive' } },
        { conducteur: { nomConducteur: { contains: s, mode: 'insensitive' } } },
      ];
    }

    // Fetch active documents scoped to companyId
    const allDocs = await this.prisma.documentConducteur.findMany({
      where,
      include: { conducteur: true },
      orderBy:
        sortBy === 'dateExpiration' ? { dateExpiration: sortOrder } : { [sortBy]: sortOrder },
    });

    let mapped = allDocs.map(toDocumentConducteurView);

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

  async findStats(companyId: number): Promise<DocumentConducteurStats> {
    const allDocs = await this.prisma.documentConducteur.findMany({
      where: { supprimeLe: null, conducteur: { companyId } },
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

  async findOne(companyId: number, id: number): Promise<DocumentConducteurView> {
    const doc = await this.prisma.documentConducteur.findFirst({
      where: { id, conducteur: { companyId }, supprimeLe: null },
      include: { conducteur: true },
    });

    if (!doc) {
      throw new NotFoundException(`Document conducteur #${id} introuvable`);
    }

    return toDocumentConducteurView(doc);
  }

  async update(
    companyId: number,
    id: number,
    dto: UpdateDocumentConducteurDto,
  ): Promise<DocumentConducteurView> {
    const existing = await this.prisma.documentConducteur.findFirst({
      where: { id, conducteur: { companyId }, supprimeLe: null },
      include: { conducteur: true },
    });

    if (!existing) {
      throw new NotFoundException(`Document conducteur #${id} introuvable`);
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

    const newType = dto.typeDocument ? dto.typeDocument.trim() : existing.typeDocument;

    if (newType !== existing.typeDocument) {
      const dupActive = await this.prisma.documentConducteur.findFirst({
        where: {
          idConducteur: existing.idConducteur,
          typeDocument: newType,
          id: { not: id },
          conducteur: { companyId },
          supprimeLe: null,
        },
      });
      if (dupActive) {
        throw new ConflictException(
          `Un document actif de type « ${newType} » existe déjà pour ce conducteur`,
        );
      }
    }

    try {
      const updated = await this.prisma.documentConducteur.update({
        where: { id },
        data: {
          ...(dto.typeDocument ? { typeDocument: newType } : {}),
          ...(dto.numeroDocument !== undefined
            ? { numeroDocument: dto.numeroDocument ? dto.numeroDocument.trim() : null }
            : {}),
          ...(dto.dateEmission !== undefined ? { dateEmission } : {}),
          ...(dto.dateExpiration !== undefined ? { dateExpiration } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes ? dto.notes.trim() : null } : {}),
          misAJourLe: new Date(),
        },
        include: { conducteur: true },
      });

      return toDocumentConducteurView(updated);
    } catch (error) {
      this.handlePrismaErrors(error, existing.conducteur.nomConducteur, newType);
      throw error;
    }
  }

  async softDelete(companyId: number, id: number): Promise<{ id: number; message: string }> {
    const existing = await this.prisma.documentConducteur.findFirst({
      where: { id, conducteur: { companyId }, supprimeLe: null },
    });

    if (!existing) {
      throw new NotFoundException(`Document conducteur #${id} introuvable`);
    }

    await this.prisma.documentConducteur.update({
      where: { id },
      data: { supprimeLe: new Date() },
    });

    return { id, message: `Document #${id} supprimé avec succès` };
  }

  async uploadFile(
    companyId: number,
    id: number,
    file: Express.Multer.File,
  ): Promise<DocumentConducteurView> {
    const doc = await this.prisma.documentConducteur.findFirst({
      where: { id, conducteur: { companyId }, supprimeLe: null },
    });
    if (!doc) {
      throw new NotFoundException(`Document conducteur #${id} introuvable`);
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

    // Write new file to disk first
    const uniqueName = `doc-cond-${id}-${Date.now()}${ext}`;
    const diskPath = path.join(this.uploadDir, uniqueName);
    fs.writeFileSync(diskPath, buffer);

    const relativePath = `/uploads/documents-conducteurs/${uniqueName}`;

    let updated;
    try {
      updated = await this.prisma.documentConducteur.update({
        where: { id },
        data: {
          cheminFichier: relativePath,
          nomOriginal: file.originalname,
          mimeType: file.mimetype,
          tailleFichier: BigInt(file.size),
          misAJourLe: new Date(),
        },
        include: { conducteur: true },
      });
    } catch (dbError) {
      // Cleanup newly written file if DB update fails
      if (fs.existsSync(diskPath)) {
        try {
          fs.unlinkSync(diskPath);
        } catch (_) {}
      }
      throw dbError;
    }

    // Remove old file ONLY AFTER successful DB update
    if (doc.cheminFichier) {
      try {
        const oldDiskPath = this.resolveSecurePath(doc.cheminFichier);
        if (fs.existsSync(oldDiskPath)) {
          fs.unlinkSync(oldDiskPath);
        }
      } catch (_) {}
    }

    return toDocumentConducteurView(updated);
  }

  async getFile(
    companyId: number,
    id: number,
  ): Promise<{ diskPath: string; mimeType: string; nomOriginal: string }> {
    const doc = await this.prisma.documentConducteur.findFirst({
      where: { id, conducteur: { companyId }, supprimeLe: null },
    });

    if (!doc || !doc.cheminFichier) {
      throw new NotFoundException(`Fichier du document #${id} introuvable`);
    }

    const diskPath = this.resolveSecurePath(doc.cheminFichier);
    if (!fs.existsSync(diskPath)) {
      throw new NotFoundException('Fichier physique introuvable sur le disque');
    }

    return {
      diskPath,
      mimeType: doc.mimeType || 'application/octet-stream',
      nomOriginal: doc.nomOriginal || `document-${id}${path.extname(diskPath)}`,
    };
  }

  async deleteFile(companyId: number, id: number): Promise<DocumentConducteurView> {
    const doc = await this.prisma.documentConducteur.findFirst({
      where: { id, conducteur: { companyId }, supprimeLe: null },
    });

    if (!doc) {
      throw new NotFoundException(`Document conducteur #${id} introuvable`);
    }

    if (doc.cheminFichier) {
      try {
        const diskPath = this.resolveSecurePath(doc.cheminFichier);
        if (fs.existsSync(diskPath)) {
          fs.unlinkSync(diskPath);
        }
      } catch (_) {}
    }

    const updated = await this.prisma.documentConducteur.update({
      where: { id },
      data: {
        cheminFichier: null,
        nomOriginal: null,
        mimeType: null,
        tailleFichier: null,
        misAJourLe: new Date(),
      },
      include: { conducteur: true },
    });

    return toDocumentConducteurView(updated);
  }

  private handlePrismaErrors(error: unknown, nomConducteur: string, typeDocument: string): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(
        `Un document actif de type « ${typeDocument} » existe déjà pour le conducteur « ${nomConducteur} »`,
      );
    }
  }

  async locatePosition(
    companyId: number,
    targetId: number,
    limit: number = 10,
  ): Promise<{ found: boolean; page: number; total: number; targetId: number }> {
    if (!companyId || !targetId) {
      return { found: false, page: 1, total: 0, targetId };
    }

    const doc = await this.prisma.documentConducteur.findFirst({
      where: {
        id: targetId,
        conducteur: { companyId },
        supprimeLe: null,
      },
      select: { id: true, dateExpiration: true },
    });

    if (!doc) {
      return { found: false, page: 1, total: 0, targetId };
    }

    const count = await this.prisma.documentConducteur.count({
      where: {
        conducteur: { companyId },
        supprimeLe: null,
        OR: [
          { dateExpiration: { lt: doc.dateExpiration ?? new Date('1970-01-01') } },
          {
            dateExpiration: doc.dateExpiration ?? new Date('1970-01-01'),
            id: { lt: doc.id },
          },
        ],
      },
    });

    const page = Math.floor(count / limit) + 1;
    return { found: true, page, total: count + 1, targetId: doc.id };
  }
}
