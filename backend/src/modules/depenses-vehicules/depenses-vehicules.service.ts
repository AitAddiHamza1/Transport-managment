import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MaintenanceStatus, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPaginationMeta, type PaginatedResult } from '../../common/dto/paginated-result';
import { CreateDepenseVehiculeDto } from './dto/create-depense-vehicule.dto';
import { UpdateDepenseVehiculeDto } from './dto/update-depense-vehicule.dto';
import { QueryDepenseVehiculeDto } from './dto/query-depense-vehicule.dto';
import { CarnetEntretienService } from '../carnet-entretien/carnet-entretien.service';

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
  idFournisseur?: number | null;
  nomFournisseur?: string | null;
  idDetteFournisseur?: number | null;
  numeroDette?: string | null;
  idMaintenanceIntervention?: number | null;
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

export function toDepenseVehiculeView(
  depense: any,
  vehiculeSummary?: CompactVehiculeSummary | null,
): DepenseVehiculeView {
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
    idFournisseur: depense.idFournisseur ?? null,
    nomFournisseur: depense.fournisseur?.nomFournisseur ?? null,
    idDetteFournisseur: depense.idDetteFournisseur ?? null,
    numeroDette: depense.detteFournisseur?.numeroDette ?? null,
    idMaintenanceIntervention: depense.maintenanceIntervention?.id ?? null,
    vehicule: vehiculeSummary ?? (depense.vehicule
      ? {
          immatriculation: depense.vehicule.immatriculation,
          marque: depense.vehicule.marque ?? null,
          modele: depense.vehicule.modele ?? null,
          typeVehicule: depense.vehicule.typeVehicule,
          statut: depense.vehicule.statut,
        }
      : null),
  };
}

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class DepensesVehiculesService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'depenses-vehicules');

  constructor(
    private readonly prisma: PrismaService,
    private readonly carnetEntretienService: CarnetEntretienService,
  ) {}

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

    const dateDepenseDate = dto.dateDepense ? new Date(dto.dateDepense) : new Date();

    const isMaintenance = Boolean(
      dto.isMaintenanceIntervention ?? dto.createMaintenanceIntervention,
    );

    if (isMaintenance) {
      const libelle = dto.libelleIntervention?.trim() || dto.description?.trim();
      if (!libelle) {
        throw new BadRequestException("Le libellé de l'intervention est obligatoire");
      }
      if (
        dto.kilometrageRealise === undefined ||
        dto.kilometrageRealise === null ||
        dto.kilometrageRealise < 0
      ) {
        throw new BadRequestException(
          "Le kilométrage réalisé est obligatoire et doit être supérieur ou égal à 0",
        );
      }
      if (
        dto.intervalleKm === undefined ||
        dto.intervalleKm === null ||
        dto.intervalleKm <= 0
      ) {
        throw new BadRequestException("L'intervalle kilométrique doit être supérieur à 0");
      }
    }

    try {
      const createdId = await this.prisma.$transaction(async (tx) => {
        let idFournisseurFinal: number | null = null;
        let idDetteFournisseurFinal: number | null = null;

        if (justificatifType === 'AVEC_FACTURE' && dto.idFournisseur) {
          const fournisseur = await tx.fournisseur.findFirst({
            where: { id: dto.idFournisseur, companyId },
          });
          if (!fournisseur) {
            throw new NotFoundException(`Fournisseur #${dto.idFournisseur} introuvable`);
          }

          idFournisseurFinal = fournisseur.id;

          const year = dateDepenseDate.getFullYear();
          const seqRes: Array<{ dernier_numero: number }> = await tx.$queryRaw`
            INSERT INTO dette_fournisseur_sequences (company_id, annee, dernier_numero)
            VALUES (${companyId}, ${year}, 1)
            ON CONFLICT (company_id, annee) DO UPDATE
            SET dernier_numero = dette_fournisseur_sequences.dernier_numero + 1
            RETURNING dernier_numero;
          `;
          const seq = seqRes[0].dernier_numero;
          const numeroDette = `DF-${year}-${String(seq).padStart(6, '0')}`;

          const dateEcheance = new Date(dateDepenseDate);
          dateEcheance.setDate(dateEcheance.getDate() + 30);

          const createdDette = await tx.detteFournisseur.create({
            data: {
              companyId,
              numeroDette,
              referenceFactureFournisseur:
                dto.referenceFactureFournisseur?.trim() || typeFactureFinal || null,
              idFournisseur: fournisseur.id,
              nomFournisseurSnapshot: fournisseur.nomFournisseur,
              categorie: categorieDepense,
              dateDette: dateDepenseDate,
              delaiPaiementJours: 30,
              dateEcheance,
              montantDu: new Prisma.Decimal(dto.montant),
              remarques: dto.description?.trim() || `Charge véhicule ${immatriculation}`,
            },
          });

          idDetteFournisseurFinal = createdDette.id;
        }

        const createdExpense = await tx.depenseVehicule.create({
          data: {
            categorieDepense,
            justificatifType,
            typeFacture: typeFactureFinal,
            immatriculation,
            description: dto.description ? dto.description.trim() : null,
            fichierRecu: storedPath,
            montant: dto.montant,
            dateDepense: dateDepenseDate,
            idFournisseur: idFournisseurFinal,
            idDetteFournisseur: idDetteFournisseurFinal,
          },
        });

        if (isMaintenance) {
          const libelle = (dto.libelleIntervention?.trim() || dto.description?.trim())!;
          const kmRealise = dto.kilometrageRealise!;
          const intervalle = dto.intervalleKm!;
          const prochainKmEcheance = kmRealise + intervalle;

          const currentMileage = await this.carnetEntretienService.getCurrentMileage(
            companyId,
            immatriculation,
          );

          let statut: MaintenanceStatus = MaintenanceStatus.OK;
          if (currentMileage !== null) {
            if (currentMileage > prochainKmEcheance) {
              statut = MaintenanceStatus.OVERDUE;
            } else if (currentMileage === prochainKmEcheance) {
              statut = MaintenanceStatus.DUE;
            } else {
              statut = MaintenanceStatus.UPCOMING;
            }
          } else {
            statut = MaintenanceStatus.UPCOMING;
          }

          await tx.maintenanceIntervention.create({
            data: {
              companyId,
              immatriculation,
              idRule: dto.idRule ?? null,
              libelle,
              dateIntervention: dateDepenseDate,
              kilometrageRealise: kmRealise,
              prochainKmEcheance,
              prochaineDateEcheance: null,
              statut,
              idDepenseVehicule: createdExpense.idDepense,
              notes: dto.notesIntervention?.trim() || null,
            },
          });
        }

        return createdExpense.idDepense;
      });

      return this.findOne(companyId, createdId);
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
      where: { idDepense, immatriculation: { in: (await this.prisma.vehicule.findMany({ where: { companyId }, select: { immatriculation: true } })).map(v => v.immatriculation) } },
    });
    if (!existing) {
      throw new NotFoundException(`Dépense véhicule #${idDepense} introuvable`);
    }

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

    fs.writeFileSync(physicalPath, file.buffer);
    const newStoredPath = `/uploads/depenses-vehicules/${filename}`;
    const oldStoredPath = existing.fichierRecu;

    try {
      await this.prisma.depenseVehicule.update({
        where: { idDepense },
        data: { fichierRecu: newStoredPath },
      });

      if (oldStoredPath && oldStoredPath !== newStoredPath) {
        this.deletePhysicalFile(oldStoredPath);
      }

      return this.findOne(companyId, idDepense);
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
      where: { idDepense, immatriculation: { in: (await this.prisma.vehicule.findMany({ where: { companyId }, select: { immatriculation: true } })).map(v => v.immatriculation) } },
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
      where: { idDepense, immatriculation: { in: (await this.prisma.vehicule.findMany({ where: { companyId }, select: { immatriculation: true } })).map(v => v.immatriculation) } },
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

    await this.prisma.depenseVehicule.update({
      where: { idDepense },
      data: { fichierRecu: null },
    });

    if (oldPath) {
      this.deletePhysicalFile(oldPath);
    }

    return this.findOne(companyId, idDepense);
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

    const companyVehicules = await this.prisma.vehicule.findMany({
      where: { companyId },
      select: { immatriculation: true, marque: true, modele: true, typeVehicule: true, statut: true },
    });

    const companyImmatriculations = companyVehicules.map((v) => v.immatriculation);
    const vehiculeMap = new Map<string, CompactVehiculeSummary>(
      companyVehicules.map((v) => [
        v.immatriculation,
        {
          immatriculation: v.immatriculation,
          marque: v.marque ?? null,
          modele: v.modele ?? null,
          typeVehicule: v.typeVehicule,
          statut: v.statut,
        },
      ]),
    );

    const where: Prisma.DepenseVehiculeWhereInput = {
      immatriculation: { in: companyImmatriculations },
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
          fournisseur: true,
          detteFournisseur: true,
          maintenanceIntervention: true,
        },
      }),
      this.prisma.depenseVehicule.count({ where }),
    ]);

    return {
      data: data.map((d) => toDepenseVehiculeView(d, vehiculeMap.get(d.immatriculation) ?? null)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findStats(companyId: number): Promise<DepenseVehiculeStats> {
    const companyVehicules = await this.prisma.vehicule.findMany({
      where: { companyId },
      select: { immatriculation: true },
    });
    const companyImmatriculations = companyVehicules.map((v) => v.immatriculation);

    const expenses = await this.prisma.depenseVehicule.findMany({
      where: { immatriculation: { in: companyImmatriculations } },
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
      where: { idDepense },
      include: {
        fournisseur: true,
        detteFournisseur: true,
        maintenanceIntervention: true,
      },
    });

    if (!depense) {
      throw new NotFoundException(`Dépense véhicule #${idDepense} introuvable`);
    }

    const vehicule = await this.prisma.vehicule.findFirst({
      where: { immatriculation: depense.immatriculation, companyId },
    });

    if (!vehicule) {
      throw new NotFoundException(`Dépense véhicule #${idDepense} introuvable`);
    }

    const vehiculeSummary: CompactVehiculeSummary = {
      immatriculation: vehicule.immatriculation,
      marque: vehicule.marque ?? null,
      modele: vehicule.modele ?? null,
      typeVehicule: vehicule.typeVehicule,
      statut: vehicule.statut,
    };

    return toDepenseVehiculeView(depense, vehiculeSummary);
  }

  async update(
    companyId: number,
    idDepense: number,
    dto: UpdateDepenseVehiculeDto,
    file?: Express.Multer.File,
  ): Promise<DepenseVehiculeView> {
    const existingView = await this.findOne(companyId, idDepense);

    const existing = await this.prisma.depenseVehicule.findFirst({
      where: { idDepense },
      include: {
        detteFournisseur: {
          include: { paiements: true },
        },
        maintenanceIntervention: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Dépense véhicule #${idDepense} introuvable`);
    }

    if (existing.detteFournisseur && existing.detteFournisseur.paiements.length > 0) {
      if (dto.montant !== undefined && dto.montant !== Number(existing.montant)) {
        throw new ConflictException(
          'Le montant d’une dépense liée à une dette fournisseur ayant des versements enregistrés est immutable',
        );
      }
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

    const isMaintenanceExplicit = dto.isMaintenanceIntervention ?? dto.createMaintenanceIntervention;

    await this.prisma.$transaction(async (tx) => {
      await tx.depenseVehicule.update({
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
      });

      const targetImmat = updatedImmatriculation ?? existing.immatriculation;
      const targetDate = dto.dateDepense ? new Date(dto.dateDepense) : existing.dateDepense;

      if (isMaintenanceExplicit === false) {
        if (existing.maintenanceIntervention) {
          await tx.maintenanceIntervention.delete({
            where: { id: existing.maintenanceIntervention.id },
          });
        }
      } else if (
        isMaintenanceExplicit === true ||
        (isMaintenanceExplicit === undefined && existing.maintenanceIntervention)
      ) {
        const existingIntervention = existing.maintenanceIntervention;

        const libelle =
          dto.libelleIntervention?.trim() ||
          dto.description?.trim() ||
          existingIntervention?.libelle;

        if (!libelle) {
          throw new BadRequestException("Le libellé de l'intervention est obligatoire");
        }

        const kmRealise =
          dto.kilometrageRealise ?? existingIntervention?.kilometrageRealise;

        if (kmRealise === undefined || kmRealise === null || kmRealise < 0) {
          throw new BadRequestException(
            "Le kilométrage réalisé doit être un nombre supérieur ou égal à 0",
          );
        }

        let intervalle: number;
        if (dto.intervalleKm !== undefined && dto.intervalleKm !== null) {
          if (dto.intervalleKm <= 0) {
            throw new BadRequestException("L'intervalle kilométrique doit être supérieur à 0");
          }
          intervalle = dto.intervalleKm;
        } else if (
          existingIntervention &&
          existingIntervention.prochainKmEcheance !== null &&
          existingIntervention.kilometrageRealise !== null
        ) {
          intervalle =
            existingIntervention.prochainKmEcheance - existingIntervention.kilometrageRealise;
        } else {
          throw new BadRequestException("L'intervalle kilométrique est obligatoire et doit être > 0");
        }

        const meProchainKm = kmRealise + intervalle;

        const currentMileage = await this.carnetEntretienService.getCurrentMileage(
          companyId,
          targetImmat,
        );

        let statut: MaintenanceStatus = MaintenanceStatus.OK;
        if (currentMileage !== null) {
          if (currentMileage > meProchainKm) {
            statut = MaintenanceStatus.OVERDUE;
          } else if (currentMileage === meProchainKm) {
            statut = MaintenanceStatus.DUE;
          } else {
            statut = MaintenanceStatus.UPCOMING;
          }
        } else {
          statut = MaintenanceStatus.UPCOMING;
        }

        if (existingIntervention) {
          await tx.maintenanceIntervention.update({
            where: { id: existingIntervention.id },
            data: {
              immatriculation: targetImmat,
              libelle,
              dateIntervention: targetDate,
              kilometrageRealise: kmRealise,
              prochainKmEcheance: meProchainKm,
              statut,
              notes:
                dto.notesIntervention !== undefined
                  ? dto.notesIntervention
                    ? dto.notesIntervention.trim()
                    : null
                  : existingIntervention.notes,
              ...(dto.idRule !== undefined ? { idRule: dto.idRule } : {}),
            },
          });
        } else {
          await tx.maintenanceIntervention.create({
            data: {
              companyId,
              immatriculation: targetImmat,
              idRule: dto.idRule ?? null,
              libelle,
              dateIntervention: targetDate,
              kilometrageRealise: kmRealise,
              prochainKmEcheance: meProchainKm,
              prochaineDateEcheance: null,
              statut,
              idDepenseVehicule: idDepense,
              notes: dto.notesIntervention?.trim() || null,
            },
          });
        }
      }
    });

    if (oldPathToDelete && oldPathToDelete !== fichierRecuFinal) {
      this.deletePhysicalFile(oldPathToDelete);
    }

    return this.findOne(companyId, idDepense);
  }

  async remove(companyId: number, idDepense: number): Promise<{ idDepense: number }> {
    const existingView = await this.findOne(companyId, idDepense);

    const existing = await this.prisma.depenseVehicule.findFirst({
      where: { idDepense },
      include: {
        detteFournisseur: {
          include: { paiements: true },
        },
        maintenanceIntervention: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Dépense véhicule #${idDepense} introuvable`);
    }

    if (existing.detteFournisseur && existing.detteFournisseur.paiements.length > 0) {
      throw new ConflictException(
        `La dépense #${idDepense} est liée à la dette #${existing.detteFournisseur.numeroDette} qui possède ${existing.detteFournisseur.paiements.length} versement(s). Elle ne peut pas être supprimée.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (existing.maintenanceIntervention) {
        await tx.maintenanceIntervention.delete({
          where: { id: existing.maintenanceIntervention.id },
        });
      }

      await tx.depenseVehicule.delete({ where: { idDepense } });

      if (existing.detteFournisseur) {
        await tx.detteFournisseur.update({
          where: { id: existing.detteFournisseur.id },
          data: { supprimeLe: new Date() },
        });
      }
    });

    if (existing.fichierRecu) {
      this.deletePhysicalFile(existing.fichierRecu);
    }

    return { idDepense };
  }
}
