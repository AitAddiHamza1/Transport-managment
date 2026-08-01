import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreateDepenseAdministrativeDto } from './dto/create-depense-administrative.dto';
import { UpdateDepenseAdministrativeDto } from './dto/update-depense-administrative.dto';
import { QueryDepenseAdministrativeDto } from './dto/query-depense-administrative.dto';

export interface CompactAuthorSummary {
  id: number;
  nom: string;
}

export interface DepenseAdministrativeView {
  idDepense: number;
  categorieDepense: string;
  description: string | null;
  fichierRecu: string | null;
  hasReceipt: boolean;
  receiptUrl: string | null;
  receiptDownloadUrl: string | null;
  montant: string;
  dateDepense: string;
  creeLe: string;
  misAJourLe: string;
  auteur: CompactAuthorSummary | null;
}

export interface DepenseAdministrativeStats {
  totalCount: number;
  montantTotal: string;
  montantMoyen: string;
  withReceiptCount: number;
  withReceiptPercentage: number;
}

export function toDepenseAdministrativeView(depense: any): DepenseAdministrativeView {
  const hasReceipt = Boolean(depense.fichierRecu && depense.fichierRecu.trim());
  const numMontant = depense.montant !== undefined ? Number(depense.montant) : 0;

  return {
    idDepense: depense.idDepense,
    categorieDepense: depense.categorieDepense,
    description: depense.description ?? null,
    fichierRecu: depense.fichierRecu ?? null,
    hasReceipt,
    receiptUrl: hasReceipt ? `/api/depenses-administratives/${depense.idDepense}/recu` : null,
    receiptDownloadUrl: hasReceipt
      ? `/api/depenses-administratives/${depense.idDepense}/recu/download`
      : null,
    montant: numMontant.toFixed(2),
    dateDepense: depense.dateDepense
      ? new Date(depense.dateDepense).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    creeLe: depense.creeLe ? new Date(depense.creeLe).toISOString() : new Date().toISOString(),
    misAJourLe: depense.misAJourLe
      ? new Date(depense.misAJourLe).toISOString()
      : new Date().toISOString(),
    auteur: depense.auteur
      ? {
          id: depense.auteur.id,
          nom: depense.auteur.nom,
        }
      : null,
  };
}

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class DepensesAdministrativesService {
  private readonly logger = new Logger(DepensesAdministrativesService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'depenses-administratives');

  constructor(private readonly prisma: PrismaService) {}

  private ensureUploadDirExists(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private validateFile(file?: Express.Multer.File): void {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Aucun fichier valide fourni');
    }

    if (file.size > MAX_FILE_SIZE || file.buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException('La taille du fichier ne doit pas dépasser 5 Mo');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        'Format de fichier non autorisé. Formats acceptés : PDF, JPG, JPEG, PNG',
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Type MIME du fichier non autorisé. Types acceptés : application/pdf, image/jpeg, image/png',
      );
    }

    // Magic Bytes Verification
    const buf = file.buffer;
    let isValidSignature = false;

    if (ext === '.pdf' || file.mimetype === 'application/pdf') {
      isValidSignature = buf.subarray(0, 4).toString('utf8') === '%PDF';
    } else if (ext === '.jpg' || ext === '.jpeg' || file.mimetype === 'image/jpeg') {
      isValidSignature = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    } else if (ext === '.png' || file.mimetype === 'image/png') {
      isValidSignature = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    }

    if (!isValidSignature) {
      throw new BadRequestException(
        'Le contenu du fichier ne correspond pas à une image ou un PDF valide',
      );
    }
  }

  private getPhysicalPathFromStoredPath(storedPath: string): string {
    const filename = path.basename(storedPath);
    return path.join(this.uploadDir, filename);
  }

  private deletePhysicalFile(storedPath: string | null): void {
    if (!storedPath || !storedPath.trim()) return;
    try {
      const physicalPath = this.getPhysicalPathFromStoredPath(storedPath);
      if (fs.existsSync(physicalPath)) {
        fs.unlinkSync(physicalPath);
      }
    } catch (err: any) {
      this.logger.warn(`Échec de la suppression physique du reçu "${storedPath}": ${err.message}`);
    }
  }

  private buildWhereClause(
    query: QueryDepenseAdministrativeDto,
  ): Prisma.DepenseAdministrativeWhereInput {
    const where: Prisma.DepenseAdministrativeWhereInput = {
      supprimeLe: null,
    };

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { categorieDepense: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query.categorieDepense && query.categorieDepense.trim()) {
      where.categorieDepense = { contains: query.categorieDepense.trim(), mode: 'insensitive' };
    }

    if (query.dateDebut || query.dateFin) {
      where.dateDepense = {};
      if (query.dateDebut) {
        where.dateDepense.gte = new Date(query.dateDebut);
      }
      if (query.dateFin) {
        where.dateDepense.lte = new Date(query.dateFin);
      }
    }

    if (query.hasReceipt === 'true') {
      where.fichierRecu = { not: null };
    } else if (query.hasReceipt === 'false') {
      where.fichierRecu = null;
    }

    return where;
  }

  async findAll(
    query: QueryDepenseAdministrativeDto,
  ): Promise<PaginatedResult<DepenseAdministrativeView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const sortBy = query.sortBy ?? 'idDepense';
    const sortOrder = query.sortOrder ?? 'desc';

    const where = this.buildWhereClause(query);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.depenseAdministrative.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          auteur: {
            select: { id: true, nom: true },
          },
        },
      }),
      this.prisma.depenseAdministrative.count({ where }),
    ]);

    return {
      data: data.map(toDepenseAdministrativeView),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findStats(query: QueryDepenseAdministrativeDto): Promise<DepenseAdministrativeStats> {
    const where = this.buildWhereClause(query);

    const expenses = await this.prisma.depenseAdministrative.findMany({
      where,
      select: {
        montant: true,
        fichierRecu: true,
      },
    });

    const totalCount = expenses.length;
    let totalSum = 0;
    let withReceiptCount = 0;

    for (const exp of expenses) {
      const val = Number(exp.montant);
      totalSum += val;
      if (exp.fichierRecu && exp.fichierRecu.trim()) {
        withReceiptCount += 1;
      }
    }

    const montantMoyenNum = totalCount > 0 ? totalSum / totalCount : 0;
    const withReceiptPercentageNum = totalCount > 0 ? (withReceiptCount / totalCount) * 100 : 0;

    return {
      totalCount,
      montantTotal: totalSum.toFixed(2),
      montantMoyen: montantMoyenNum.toFixed(2),
      withReceiptCount,
      withReceiptPercentage: Math.round(withReceiptPercentageNum * 100) / 100,
    };
  }

  async findOne(idDepense: number): Promise<DepenseAdministrativeView> {
    const depense = await this.prisma.depenseAdministrative.findFirst({
      where: { idDepense, supprimeLe: null },
      include: {
        auteur: {
          select: { id: true, nom: true },
        },
      },
    });

    if (!depense) {
      throw new NotFoundException(`Dépense administrative #${idDepense} introuvable`);
    }

    return toDepenseAdministrativeView(depense);
  }

  async create(
    dto: CreateDepenseAdministrativeDto,
    userId?: number,
    file?: Express.Multer.File,
  ): Promise<DepenseAdministrativeView> {
    const categorieDepense = dto.categorieDepense.trim();
    let storedPath: string | null = null;
    let writtenPhysicalPath: string | null = null;

    if (file) {
      this.validateFile(file);
      this.ensureUploadDirExists();
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `depense-admin-${Date.now()}-${randomUUID()}${ext}`;
      writtenPhysicalPath = path.join(this.uploadDir, filename);
      fs.writeFileSync(writtenPhysicalPath, file.buffer);
      storedPath = `/uploads/depenses-administratives/${filename}`;
    }

    try {
      const created = await this.prisma.depenseAdministrative.create({
        data: {
          categorieDepense,
          description: dto.description ? dto.description.trim() : null,
          montant: dto.montant,
          dateDepense: dto.dateDepense ? new Date(dto.dateDepense) : new Date(),
          fichierRecu: storedPath,
          creePar: userId || null,
        },
        include: {
          auteur: {
            select: { id: true, nom: true },
          },
        },
      });

      return toDepenseAdministrativeView(created);
    } catch (err) {
      if (writtenPhysicalPath && fs.existsSync(writtenPhysicalPath)) {
        try {
          fs.unlinkSync(writtenPhysicalPath);
        } catch (_) {}
      }
      throw err;
    }
  }

  async update(
    idDepense: number,
    dto: UpdateDepenseAdministrativeDto,
  ): Promise<DepenseAdministrativeView> {
    const existing = await this.prisma.depenseAdministrative.findFirst({
      where: { idDepense, supprimeLe: null },
    });

    if (!existing) {
      throw new NotFoundException(`Dépense administrative #${idDepense} introuvable`);
    }

    const updated = await this.prisma.depenseAdministrative.update({
      where: { idDepense },
      data: {
        ...(dto.categorieDepense ? { categorieDepense: dto.categorieDepense.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description ? dto.description.trim() : null }
          : {}),
        ...(dto.montant !== undefined ? { montant: dto.montant } : {}),
        ...(dto.dateDepense ? { dateDepense: new Date(dto.dateDepense) } : {}),
      },
      include: {
        auteur: {
          select: { id: true, nom: true },
        },
      },
    });

    return toDepenseAdministrativeView(updated);
  }

  async uploadOrReplaceReceipt(
    idDepense: number,
    file: Express.Multer.File,
  ): Promise<DepenseAdministrativeView> {
    const existing = await this.prisma.depenseAdministrative.findFirst({
      where: { idDepense, supprimeLe: null },
    });

    if (!existing) {
      throw new NotFoundException(`Dépense administrative #${idDepense} introuvable`);
    }

    this.validateFile(file);
    this.ensureUploadDirExists();

    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `depense-admin-${idDepense}-${Date.now()}-${randomUUID()}${ext}`;
    const physicalPath = path.join(this.uploadDir, filename);

    fs.writeFileSync(physicalPath, file.buffer);
    const newStoredPath = `/uploads/depenses-administratives/${filename}`;
    const oldStoredPath = existing.fichierRecu;

    try {
      const updated = await this.prisma.depenseAdministrative.update({
        where: { idDepense },
        data: { fichierRecu: newStoredPath },
        include: {
          auteur: {
            select: { id: true, nom: true },
          },
        },
      });

      if (oldStoredPath && oldStoredPath !== newStoredPath) {
        this.deletePhysicalFile(oldStoredPath);
      }

      return toDepenseAdministrativeView(updated);
    } catch (err) {
      if (fs.existsSync(physicalPath)) {
        try {
          fs.unlinkSync(physicalPath);
        } catch (_) {}
      }
      throw err;
    }
  }

  async getReceiptFileStream(
    idDepense: number,
  ): Promise<{ physicalPath: string; filename: string; mimeType: string }> {
    const expense = await this.prisma.depenseAdministrative.findFirst({
      where: { idDepense, supprimeLe: null },
    });

    if (!expense) {
      throw new NotFoundException(`Dépense administrative #${idDepense} introuvable`);
    }

    if (!expense.fichierRecu || !expense.fichierRecu.trim()) {
      throw new NotFoundException(`Aucun reçu joint à la dépense administrative #${idDepense}`);
    }

    const physicalPath = this.getPhysicalPathFromStoredPath(expense.fichierRecu);
    if (!fs.existsSync(physicalPath)) {
      throw new NotFoundException(
        `Fichier du reçu introuvable sur le disque pour la dépense #${idDepense}`,
      );
    }

    const ext = path.extname(physicalPath).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === '.pdf') mimeType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.png') mimeType = 'image/png';

    const filename = path.basename(physicalPath);

    return { physicalPath, filename, mimeType };
  }

  async deleteReceipt(idDepense: number, userId?: number): Promise<DepenseAdministrativeView> {
    const existing = await this.prisma.depenseAdministrative.findFirst({
      where: { idDepense, supprimeLe: null },
    });

    if (!existing) {
      throw new NotFoundException(`Dépense administrative #${idDepense} introuvable`);
    }

    const oldPath = existing.fichierRecu;

    this.logger.log(
      `Suppression du reçu pour la dépense administrative #${idDepense} par l'utilisateur ID ${userId ?? 'Inconnu'} à ${new Date().toISOString()}`,
    );

    const updated = await this.prisma.depenseAdministrative.update({
      where: { idDepense },
      data: { fichierRecu: null },
      include: {
        auteur: {
          select: { id: true, nom: true },
        },
      },
    });

    if (oldPath) {
      this.deletePhysicalFile(oldPath);
    }

    return toDepenseAdministrativeView(updated);
  }

  async softDelete(idDepense: number): Promise<{ idDepense: number }> {
    const existing = await this.prisma.depenseAdministrative.findFirst({
      where: { idDepense, supprimeLe: null },
    });

    if (!existing) {
      throw new NotFoundException(`Dépense administrative #${idDepense} introuvable`);
    }

    await this.prisma.depenseAdministrative.update({
      where: { idDepense },
      data: { supprimeLe: new Date() },
    });

    // Note: Physical receipt is preserved on disk for accounting audit compliance.

    return { idDepense };
  }
}
