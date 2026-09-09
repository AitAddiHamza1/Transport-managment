import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreateDepenseVehiculeDto } from './dto/create-depense-vehicule.dto';
import { UpdateDepenseVehiculeDto } from './dto/update-depense-vehicule.dto';
import { QueryDepenseVehiculeDto } from './dto/query-depense-vehicule.dto';

export interface CompactVehiculeSummary {
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  typeVehicule: string;
  statut: string;
}

export interface DepenseVehiculeView {
  idDepense: number;
  categorieDepense: string;
  justificatifType: string;
  typeFacture: string | null;
  immatriculation: string;
  description: string | null;
  fichierRecu: string | null;
  hasReceipt: boolean;
  receiptUrl: string | null;
  receiptDownloadUrl: string | null;
  montant: number;
  dateDepense: string;
  vehicule?: CompactVehiculeSummary | null;
}

export interface DepenseVehiculeStats {
  totalCount: number;
  totalMontant: number;
  entretienMontant: number;
  reparationsMontant: number;
  carburantMontant: number;
  autresMontant: number;
}

export function toDepenseVehiculeView(depense: any): DepenseVehiculeView {
  const hasReceipt = Boolean(depense.fichierRecu && depense.fichierRecu.trim());

  return {
    idDepense: depense.idDepense,
    categorieDepense: depense.categorieDepense,
    justificatifType: depense.justificatifType,
    typeFacture: depense.typeFacture ?? null,
    immatriculation: depense.immatriculation,
    description: depense.description ?? null,
    fichierRecu: depense.fichierRecu ?? null,
    hasReceipt,
    receiptUrl: hasReceipt ? `/api/depenses-vehicules/${depense.idDepense}/recu` : null,
    receiptDownloadUrl: hasReceipt
      ? `/api/depenses-vehicules/${depense.idDepense}/recu/download`
      : null,
    montant: depense.montant !== undefined ? Number(depense.montant) : 0,
    dateDepense: depense.dateDepense
      ? new Date(depense.dateDepense).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    vehicule: depense.vehicule
      ? {
          immatriculation: depense.vehicule.immatriculation,
          marque: depense.vehicule.marque ?? null,
          modele: depense.vehicule.modele ?? null,
          typeVehicule: depense.vehicule.typeVehicule,
          statut: depense.vehicule.statut,
        }
      : null,
  };
}

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class DepensesVehiculesService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'depenses-vehicules');

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

    // Magic Bytes Check
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
    } catch {
      // Ignore physical delete errors to prevent blocking DB operations
    }
  }

  async create(
    companyId: number,
    dto: CreateDepenseVehiculeDto,
    file?: Express.Multer.File,
  ): Promise<DepenseVehiculeView> {
    const immatriculation = dto.immatriculation.trim();
    const categorieDepense = dto.categorieDepense.trim();
    const justificatifType = dto.justificatifType ?? 'AVEC_FACTURE';

    // Check vehicle existence scoped to current tenant
    const vehiculeExists = await this.prisma.vehicule.findFirst({
      where: { immatriculation, companyId },
    });
    if (!vehiculeExists) {
      throw new NotFoundException(`Le véhicule immatriculé "${immatriculation}" est introuvable`);
    }

    let typeFactureFinal: string | null = null;
    let storedPath: string | null = null;
    let physicalPathCreated: string | null = null;

    if (justificatifType === 'AVEC_FACTURE') {
      const trimmedTypeFacture = dto.typeFacture ? dto.typeFacture.trim() : '';
      if (!trimmedTypeFacture) {
        throw new BadRequestException(
          'Le numéro de facture/référence est requis pour une dépense avec facture',
        );
      }
      typeFactureFinal = trimmedTypeFacture;

      if (!file) {
        throw new BadRequestException(
          'Un fichier de reçu ou de facture est requis pour une dépense avec facture',
        );
      }

      this.validateFile(file);
      this.ensureUploadDirExists();
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `depense-${Date.now()}-${randomUUID()}${ext}`;
      physicalPathCreated = path.join(this.uploadDir, filename);
      fs.writeFileSync(physicalPathCreated, file.buffer);
      storedPath = `/uploads/depenses-vehicules/${filename}`;
    } else {
      typeFactureFinal = null;
      storedPath = null;
    }

    try {
      const created = await this.prisma.depenseVehicule.create({
        data: {
          categorieDepense,
          justificatifType,
          typeFacture: typeFactureFinal,
          immatriculation,
          description: dto.description ? dto.description.trim() : null,
          fichierRecu: storedPath,
          montant: dto.montant,
          dateDepense: dto.dateDepense ? new Date(dto.dateDepense) : new Date(),
        },
        include: {
          vehicule: true,
        },
      });

      return toDepenseVehiculeView(created);
    } catch (err) {
      if (physicalPathCreated && fs.existsSync(physicalPathCreated)) {
        try {
          fs.unlinkSync(physicalPathCreated);
        } catch (_) {}
      }
      throw err;
    }
  }

  async uploadReceipt(
    companyId: number,
    idDepense: number,
    file: Express.Multer.File,
  ): Promise<DepenseVehiculeView> {
    const existing = await this.prisma.depenseVehicule.findFirst({
      where: { idDepense, vehicule: { companyId } },
    });
    if (!existing) {
      throw new NotFoundException(`Dépense véhicule #${idDepense} introuvable`);
    }

    // Only allow uploading files if justificatifType is AVEC_FACTURE
    if (existing.justificatifType !== 'AVEC_FACTURE') {
      throw new BadRequestException(
        'Impossible de téléverser un reçu pour une dépense de type "Sans facture".',
      );
    }

    this.validateFile(file);
    this.ensureUploadDirExists();

    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `depense-${idDepense}-${Date.now()}-${randomUUID()}${ext}`;
    const physicalPath = path.join(this.uploadDir, filename);

    // Save new file
    fs.writeFileSync(physicalPath, file.buffer);
    const newStoredPath = `/uploads/depenses-vehicules/${filename}`;

    const oldStoredPath = existing.fichierRecu;

    try {
      // Update DB
      const updated = await this.prisma.depenseVehicule.update({
        where: { idDepense },
        data: { fichierRecu: newStoredPath },
        include: { vehicule: true },
      });

      // Clean up old file after successful DB update
      if (oldStoredPath && oldStoredPath !== newStoredPath) {
        this.deletePhysicalFile(oldStoredPath);
      }

      return toDepenseVehiculeView(updated);
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
    companyId: number,
    idDepense: number,
  ): Promise<{ physicalPath: string; filename: string; mimeType: string }> {
    const expense = await this.prisma.depenseVehicule.findFirst({
      where: { idDepense, vehicule: { companyId } },
    });
    if (!expense) {
      throw new NotFoundException(`Dépense véhicule #${idDepense} introuvable`);
    }

    if (!expense.fichierRecu || !expense.fichierRecu.trim()) {
      throw new NotFoundException(`Aucun reçu ou facture joint à la dépense #${idDepense}`);
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

  async deleteReceipt(companyId: number, idDepense: number): Promise<DepenseVehiculeView> {
    const existing = await this.prisma.depenseVehicule.findFirst({
      where: { idDepense, vehicule: { companyId } },
    });
    if (!existing) {
      throw new NotFoundException(`Dépense véhicule #${idDepense} introuvable`);
    }

    if (existing.justificatifType === 'AVEC_FACTURE') {
      throw new BadRequestException(
        'Impossible de supprimer le reçu pour une dépense de type "Avec facture".',
      );
    }

    const oldPath = existing.fichierRecu;

    const updated = await this.prisma.depenseVehicule.update({
      where: { idDepense },
      data: { fichierRecu: null },
      include: { vehicule: true },
    });

    if (oldPath) {
      this.deletePhysicalFile(oldPath);
    }

    return toDepenseVehiculeView(updated);
  }

  async findAll(
    companyId: number,
    query: QueryDepenseVehiculeDto,
  ): Promise<PaginatedResult<DepenseVehiculeView>> {
    const page = query.page ?? 1;
    const rawLimit = query.limit ?? 10;
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const sortBy = query.sortBy ?? 'idDepense';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.DepenseVehiculeWhereInput = {
      vehicule: { companyId },
    };

    if (query.search) {
      const s = query.search.trim();
      where.AND = [
        {
          OR: [
            { categorieDepense: { contains: s, mode: 'insensitive' } },
            { immatriculation: { contains: s, mode: 'insensitive' } },
            { description: { contains: s, mode: 'insensitive' } },
            { typeFacture: { contains: s, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (query.categorieDepense) {
      where.categorieDepense = { contains: query.categorieDepense.trim(), mode: 'insensitive' };
    }

    if (query.immatriculation) {
      where.immatriculation = { contains: query.immatriculation.trim(), mode: 'insensitive' };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.depenseVehicule.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          vehicule: true,
        },
      }),
      this.prisma.depenseVehicule.count({ where }),
    ]);

    return {
      data: data.map(toDepenseVehiculeView),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findStats(companyId: number): Promise<DepenseVehiculeStats> {
    const expenses = await this.prisma.depenseVehicule.findMany({
      where: { vehicule: { companyId } },
    });

    let totalMontant = 0;
    let entretienMontant = 0;
    let reparationsMontant = 0;
    let carburantMontant = 0;
    let autresMontant = 0;

    for (const exp of expenses) {
      const val = Number(exp.montant);
      totalMontant += val;
      const cat = exp.categorieDepense.toUpperCase();
      if (cat.includes('ENTRETIEN')) {
        entretienMontant += val;
      } else if (cat.includes('REPARATION') || cat.includes('PIECES')) {
        reparationsMontant += val;
      } else if (cat.includes('CARBURANT') || cat.includes('GASOIL')) {
        carburantMontant += val;
      } else {
        autresMontant += val;
      }
    }

    return {
      totalCount: expenses.length,
      totalMontant,
      entretienMontant,
      reparationsMontant,
      carburantMontant,
      autresMontant,
    };
  }

  async findOne(companyId: number, idDepense: number): Promise<DepenseVehiculeView> {
    const depense = await this.prisma.depenseVehicule.findFirst({
      where: { idDepense, vehicule: { companyId } },
      include: {
        vehicule: true,
      },
    });

    if (!depense) {
      throw new NotFoundException(`Dépense véhicule #${idDepense} introuvable`);
    }

    return toDepenseVehiculeView(depense);
  }

  async update(
    companyId: number,
    idDepense: number,
    dto: UpdateDepenseVehiculeDto,
    file?: Express.Multer.File,
  ): Promise<DepenseVehiculeView> {
    const existing = await this.prisma.depenseVehicule.findFirst({
      where: { idDepense, vehicule: { companyId } },
    });
    if (!existing) {
      throw new NotFoundException(`Dépense véhicule #${idDepense} introuvable`);
    }

    const updatedImmatriculation =
      dto.immatriculation !== undefined ? dto.immatriculation.trim() : undefined;
    if (updatedImmatriculation && updatedImmatriculation !== existing.immatriculation) {
      const vehiculeExists = await this.prisma.vehicule.findFirst({
        where: { immatriculation: updatedImmatriculation, companyId },
      });
      if (!vehiculeExists) {
        throw new NotFoundException(
          `Le véhicule immatriculé "${updatedImmatriculation}" est introuvable`,
        );
      }
    }

    const justificatifType = dto.justificatifType ?? existing.justificatifType;
    let typeFactureFinal: string | null = null;
    let fichierRecuFinal: string | null = existing.fichierRecu;
    let oldPathToDelete: string | null = null;

    if (justificatifType === 'AVEC_FACTURE') {
      if (dto.typeFacture !== undefined) {
        const trimmedTypeFacture = dto.typeFacture ? dto.typeFacture.trim() : '';
        if (!trimmedTypeFacture) {
          throw new BadRequestException(
            'Le numéro de facture/référence est requis pour une dépense avec facture',
          );
        }
        typeFactureFinal = trimmedTypeFacture;
      } else {
        const trimmedTypeFacture = existing.typeFacture ? existing.typeFacture.trim() : '';
        if (!trimmedTypeFacture) {
          throw new BadRequestException(
            'Le numéro de facture/référence est requis pour une dépense avec facture',
          );
        }
        typeFactureFinal = trimmedTypeFacture;
      }

      if (file) {
        this.validateFile(file);
        this.ensureUploadDirExists();
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `depense-${idDepense}-${Date.now()}-${randomUUID()}${ext}`;
        const physicalPath = path.join(this.uploadDir, filename);
        fs.writeFileSync(physicalPath, file.buffer);
        fichierRecuFinal = `/uploads/depenses-vehicules/${filename}`;
        oldPathToDelete = existing.fichierRecu;
      } else {
        if (dto.fichierRecu === null) {
          throw new BadRequestException(
            'Un fichier de reçu ou de facture est requis pour une dépense avec facture',
          );
        }
        if (!existing.fichierRecu && !dto.fichierRecu) {
          throw new BadRequestException(
            'Un fichier de reçu ou de facture est requis pour une dépense avec facture',
          );
        }
        if (dto.fichierRecu !== undefined) {
          fichierRecuFinal = dto.fichierRecu.trim() || null;
        }
      }
    } else {
      typeFactureFinal = null;
      fichierRecuFinal = null;
      if (existing.fichierRecu) {
        oldPathToDelete = existing.fichierRecu;
      }
    }

    const updated = await this.prisma.depenseVehicule.update({
      where: { idDepense },
      data: {
        ...(dto.categorieDepense ? { categorieDepense: dto.categorieDepense.trim() } : {}),
        justificatifType,
        typeFacture: typeFactureFinal,
        immatriculation: updatedImmatriculation ?? existing.immatriculation,
        description:
          dto.description !== undefined
            ? dto.description
              ? dto.description.trim()
              : null
            : undefined,
        fichierRecu: fichierRecuFinal,
        ...(dto.montant !== undefined ? { montant: dto.montant } : {}),
        ...(dto.dateDepense ? { dateDepense: new Date(dto.dateDepense) } : {}),
      },
      include: {
        vehicule: true,
      },
    });

    if (oldPathToDelete && oldPathToDelete !== fichierRecuFinal) {
      this.deletePhysicalFile(oldPathToDelete);
    }

    return toDepenseVehiculeView(updated);
  }

  async remove(companyId: number, idDepense: number): Promise<{ idDepense: number }> {
    const existing = await this.prisma.depenseVehicule.findFirst({
      where: { idDepense, vehicule: { companyId } },
    });

    if (!existing) {
      throw new NotFoundException(`Dépense véhicule #${idDepense} introuvable`);
    }

    await this.prisma.depenseVehicule.delete({ where: { idDepense } });

    if (existing.fichierRecu) {
      this.deletePhysicalFile(existing.fichierRecu);
    }

    return { idDepense };
  }
}
