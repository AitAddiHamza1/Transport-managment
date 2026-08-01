import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeDto } from './dto/create-employe.dto';
import { UpdateEmployeDto } from './dto/update-employe.dto';
import { EmployesQueryDto } from './dto/employes-query.dto';
import { CreateDocumentEmployeDto } from './dto/create-document-employe.dto';
import {
  ContratType,
  Employe,
  DocumentEmploye,
  EmployeStatut,
  PaiementModeEmploye,
  Prisma,
} from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

export interface EmployeView {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  cin: string | null;
  dateNaissance: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  poste: string;
  departement: string | null;
  dateEmbauche: string;
  typeContrat: ContratType;
  statut: EmployeStatut;
  dateSortie: string | null;
  motifSortie: string | null;
  salaireBase: number | null;
  modePaiement: PaiementModeEmploye | null;
  nomBanque: string | null;
  rib: string | null;
  hasPhoto: boolean;
  photoFilename: string | null;
  photoOriginalName: string | null;
  photoMimeType: string | null;
  photoSize: number | null;
  observations: string | null;
  creeLe: string;
  misAJourLe: string;
}

export function toEmployeView(entity: Employe): EmployeView {
  return {
    id: entity.id,
    matricule: entity.matricule,
    nom: entity.nom,
    prenom: entity.prenom,
    cin: entity.cin ?? null,
    dateNaissance: entity.dateNaissance ? entity.dateNaissance.toISOString().split('T')[0] : null,
    telephone: entity.telephone ?? null,
    email: entity.email ?? null,
    adresse: entity.adresse ?? null,
    poste: entity.poste,
    departement: entity.departement ?? null,
    dateEmbauche: entity.dateEmbauche.toISOString().split('T')[0],
    typeContrat: entity.typeContrat,
    statut: entity.statut,
    dateSortie: entity.dateSortie ? entity.dateSortie.toISOString().split('T')[0] : null,
    motifSortie: entity.motifSortie ?? null,
    salaireBase: entity.salaireBase !== null ? Number(entity.salaireBase) : null,
    modePaiement: entity.modePaiement ?? null,
    nomBanque: entity.nomBanque ?? null,
    rib: entity.rib ?? null,
    hasPhoto: Boolean(entity.photoPath && fs.existsSync(entity.photoPath)),
    photoFilename: entity.photoFilename ?? null,
    photoOriginalName: entity.photoOriginalName ?? null,
    photoMimeType: entity.photoMimeType ?? null,
    photoSize: entity.photoSize ?? null,
    observations: entity.observations ?? null,
    creeLe: entity.creeLe.toISOString(),
    misAJourLe: entity.misAJourLe.toISOString(),
  };
}

const DEPARTURE_STATUSES: EmployeStatut[] = [
  EmployeStatut.DEMISSIONNAIRE,
  EmployeStatut.LICENCIE,
  EmployeStatut.RETRAITE,
];

@Injectable()
export class EmployesService {
  private readonly logger = new Logger(EmployesService.name);

  constructor(private readonly prisma: PrismaService) {}

  private normalizeCin(cin?: string): string | null {
    if (!cin) return null;
    const trimmed = cin.trim().toUpperCase();
    return trimmed.length > 0 ? trimmed : null;
  }

  async create(dto: CreateEmployeDto): Promise<EmployeView> {
    const normalizedCin = this.normalizeCin(dto.cin);

    // 1. Duplicate active CIN check
    if (normalizedCin) {
      const existingCin = await this.prisma.employe.findFirst({
        where: { cin: normalizedCin, supprimeLe: null },
      });
      if (existingCin) {
        throw new ConflictException(
          `Un employé actif existe déjà avec le N° CIN "${normalizedCin}"`,
        );
      }
    }

    // 2. Payment mode conditional validation
    if (dto.modePaiement === PaiementModeEmploye.VIREMENT) {
      if (!dto.nomBanque?.trim() || !dto.rib?.trim()) {
        throw new BadRequestException(
          'Le nom de la banque et le RIB sont obligatoires lorsque le mode de paiement est VIREMENT',
        );
      }
    }

    // 3. Status transition and departure date validation
    const dateEmbaucheObj = new Date(dto.dateEmbauche);
    let dateSortieObj: Date | null = null;
    if (dto.dateSortie) {
      dateSortieObj = new Date(dto.dateSortie);
    }

    const targetStatut = dto.statut ?? EmployeStatut.ACTIF;
    if (DEPARTURE_STATUSES.includes(targetStatut)) {
      if (!dateSortieObj) {
        throw new BadRequestException(
          `La date de sortie est obligatoire pour le statut ${targetStatut}`,
        );
      }
      if (dateSortieObj < dateEmbaucheObj) {
        throw new BadRequestException(
          'La date de sortie doit être égale ou supérieure à la date d’embauche',
        );
      }
    }

    // 4. Atomic matricule sequence generation
    return this.prisma.$transaction(async (tx) => {
      const seqResult: Array<{ dernier_numero: number }> = await tx.$queryRaw`
        INSERT INTO employe_sequences (prefixe, dernier_numero)
        VALUES ('EMP', 1)
        ON CONFLICT (prefixe) DO UPDATE
        SET dernier_numero = employe_sequences.dernier_numero + 1
        RETURNING dernier_numero;
      `;
      const seqNum = seqResult[0].dernier_numero;
      const matricule = `EMP-${String(seqNum).padStart(4, '0')}`;

      const created = await tx.employe.create({
        data: {
          matricule,
          nom: dto.nom.trim(),
          prenom: dto.prenom.trim(),
          cin: normalizedCin,
          dateNaissance: dto.dateNaissance ? new Date(dto.dateNaissance) : null,
          telephone: dto.telephone?.trim() || null,
          email: dto.email?.trim().toLowerCase() || null,
          adresse: dto.adresse?.trim() || null,
          poste: dto.poste.trim(),
          departement: dto.departement?.trim() || null,
          dateEmbauche: dateEmbaucheObj,
          typeContrat: dto.typeContrat,
          statut: targetStatut,
          dateSortie: dateSortieObj,
          motifSortie: dto.motifSortie?.trim() || null,
          salaireBase:
            dto.salaireBase !== undefined && dto.salaireBase !== null
              ? new Prisma.Decimal(dto.salaireBase)
              : null,
          modePaiement: dto.modePaiement ?? null,
          nomBanque: dto.nomBanque?.trim() || null,
          rib: dto.rib?.trim() || null,
          observations: dto.observations?.trim() || null,
        },
      });

      return toEmployeView(created);
    });
  }

  async findAll(query: EmployesQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      statut,
      departement,
      typeContrat,
      modePaiement,
      sortBy = 'creeLe',
      sortOrder = 'desc',
    } = query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.EmployeWhereInput = {
      supprimeLe: null,
      ...(statut ? { statut } : {}),
      ...(departement ? { departement: { contains: departement, mode: 'insensitive' } } : {}),
      ...(typeContrat ? { typeContrat } : {}),
      ...(modePaiement ? { modePaiement } : {}),
      ...(search
        ? {
            OR: [
              { matricule: { contains: search, mode: 'insensitive' } },
              { nom: { contains: search, mode: 'insensitive' } },
              { prenom: { contains: search, mode: 'insensitive' } },
              { cin: { contains: search, mode: 'insensitive' } },
              { telephone: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { poste: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const validSortFields = ['matricule', 'nom', 'dateEmbauche', 'salaireBase', 'creeLe'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'creeLe';

    const [total, items] = await Promise.all([
      this.prisma.employe.count({ where }),
      this.prisma.employe.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [orderByField]: sortOrder },
      }),
    ]);

    return {
      data: items.map(toEmployeView),
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  async getStats() {
    const [total, actifs, suspendus, sortis] = await Promise.all([
      this.prisma.employe.count({ where: { supprimeLe: null } }),
      this.prisma.employe.count({ where: { statut: EmployeStatut.ACTIF, supprimeLe: null } }),
      this.prisma.employe.count({ where: { statut: EmployeStatut.SUSPENDU, supprimeLe: null } }),
      this.prisma.employe.count({
        where: {
          statut: { in: DEPARTURE_STATUSES },
          supprimeLe: null,
        },
      }),
    ]);

    return {
      total,
      actifs,
      suspendus,
      sortis,
    };
  }

  async findOne(id: number): Promise<EmployeView> {
    const entity = await this.prisma.employe.findFirst({
      where: { id, supprimeLe: null },
    });

    if (!entity) {
      throw new NotFoundException(`Employé #${id} introuvable`);
    }

    return toEmployeView(entity);
  }

  async update(id: number, dto: UpdateEmployeDto): Promise<EmployeView> {
    const existing = await this.prisma.employe.findFirst({
      where: { id, supprimeLe: null },
    });

    if (!existing) {
      throw new NotFoundException(`Employé #${id} introuvable`);
    }

    // 1. Duplicate CIN check if updated
    const normalizedCin = dto.cin !== undefined ? this.normalizeCin(dto.cin) : existing.cin;
    if (normalizedCin && normalizedCin !== existing.cin) {
      const existingCin = await this.prisma.employe.findFirst({
        where: { cin: normalizedCin, supprimeLe: null, id: { not: id } },
      });
      if (existingCin) {
        throw new ConflictException(
          `Un employé actif existe déjà avec le N° CIN "${normalizedCin}"`,
        );
      }
    }

    // 2. Payment mode conditional validation
    const effectiveModePaiement =
      dto.modePaiement !== undefined ? dto.modePaiement : existing.modePaiement;
    const effectiveNomBanque =
      dto.nomBanque !== undefined ? dto.nomBanque?.trim() || null : existing.nomBanque;
    const effectiveRib = dto.rib !== undefined ? dto.rib?.trim() || null : existing.rib;

    if (effectiveModePaiement === PaiementModeEmploye.VIREMENT) {
      if (!effectiveNomBanque || !effectiveRib) {
        throw new BadRequestException(
          'Le nom de la banque et le RIB sont obligatoires lorsque le mode de paiement est VIREMENT',
        );
      }
    }

    // 3. Departure status & dateSortie validation
    const effectiveStatut = dto.statut !== undefined ? dto.statut : existing.statut;
    const effectiveDateEmbauche =
      dto.dateEmbauche !== undefined ? new Date(dto.dateEmbauche) : existing.dateEmbauche;

    let effectiveDateSortie: Date | null = existing.dateSortie;
    if (dto.dateSortie !== undefined) {
      effectiveDateSortie = dto.dateSortie ? new Date(dto.dateSortie) : null;
    }

    let effectiveMotifSortie: string | null = existing.motifSortie;
    if (dto.motifSortie !== undefined) {
      effectiveMotifSortie = dto.motifSortie ? dto.motifSortie.trim() : null;
    }

    if (DEPARTURE_STATUSES.includes(effectiveStatut)) {
      if (!effectiveDateSortie) {
        throw new BadRequestException(
          `La date de sortie est obligatoire pour le statut ${effectiveStatut}`,
        );
      }
      if (effectiveDateSortie < effectiveDateEmbauche) {
        throw new BadRequestException(
          'La date de sortie doit être égale ou supérieure à la date d’embauche',
        );
      }
    } else {
      // Clears departure date if updated back to ACTIF, SUSPENDU, or INACTIF
      effectiveDateSortie = null;
      effectiveMotifSortie = null;
    }

    const updated = await this.prisma.employe.update({
      where: { id },
      data: {
        ...(dto.nom !== undefined ? { nom: dto.nom.trim() } : {}),
        ...(dto.prenom !== undefined ? { prenom: dto.prenom.trim() } : {}),
        cin: normalizedCin,
        ...(dto.dateNaissance !== undefined
          ? { dateNaissance: dto.dateNaissance ? new Date(dto.dateNaissance) : null }
          : {}),
        ...(dto.telephone !== undefined ? { telephone: dto.telephone?.trim() || null } : {}),
        ...(dto.email !== undefined ? { email: dto.email?.trim().toLowerCase() || null } : {}),
        ...(dto.adresse !== undefined ? { adresse: dto.adresse?.trim() || null } : {}),
        ...(dto.poste !== undefined ? { poste: dto.poste.trim() } : {}),
        ...(dto.departement !== undefined ? { departement: dto.departement?.trim() || null } : {}),
        ...(dto.dateEmbauche !== undefined ? { dateEmbauche: effectiveDateEmbauche } : {}),
        ...(dto.typeContrat !== undefined ? { typeContrat: dto.typeContrat } : {}),
        statut: effectiveStatut,
        dateSortie: effectiveDateSortie,
        motifSortie: effectiveMotifSortie,
        ...(dto.salaireBase !== undefined
          ? {
              salaireBase: dto.salaireBase !== null ? new Prisma.Decimal(dto.salaireBase) : null,
            }
          : {}),
        modePaiement: effectiveModePaiement,
        nomBanque: effectiveNomBanque,
        rib: effectiveRib,
        ...(dto.observations !== undefined
          ? { observations: dto.observations?.trim() || null }
          : {}),
        misAJourLe: new Date(),
      },
    });

    return toEmployeView(updated);
  }

  async softDelete(id: number): Promise<{ message: string }> {
    const existing = await this.prisma.employe.findFirst({
      where: { id, supprimeLe: null },
    });

    if (!existing) {
      throw new NotFoundException(`Employé #${id} introuvable`);
    }

    await this.prisma.employe.update({
      where: { id },
      data: { supprimeLe: new Date() },
    });

    return { message: `Employé #${id} supprimé avec succès` };
  }

  // -------------------------------------------------------------------
  // Photo Upload Management
  // -------------------------------------------------------------------
  private validateImageFile(file: Express.Multer.File): void {
    if (!file || !file.buffer || file.size === 0) {
      throw new BadRequestException('Aucun fichier fourni ou fichier vide');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('La taille du fichier photo ne doit pas dépasser 5 Mo');
    }

    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      throw new BadRequestException('Format de photo non autorisé. Acceptés: PNG, JPEG, WEBP');
    }

    // Magic Bytes Verification
    const magic = file.buffer.slice(0, 4).toString('hex');
    const isPng = magic.startsWith('89504e47');
    const isJpeg = magic.startsWith('ffd8ff');
    const isWebp = magic.startsWith('52494646'); // 'RIFF'

    if (!isPng && !isJpeg && !isWebp) {
      throw new BadRequestException('Signature de fichier photo invalide');
    }
  }

  async uploadPhoto(id: number, file: Express.Multer.File): Promise<EmployeView> {
    const employe = await this.prisma.employe.findFirst({
      where: { id, supprimeLe: null },
    });

    if (!employe) {
      throw new NotFoundException(`Employé #${id} introuvable`);
    }

    this.validateImageFile(file);

    const uploadDir = path.join(process.cwd(), 'uploads', 'employes', 'photos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const filename = `${randomUUID()}${ext}`;
    const targetPath = path.join(uploadDir, filename);

    fs.writeFileSync(targetPath, file.buffer);

    let oldPhotoPathToDelete: string | null = null;
    if (employe.photoPath && fs.existsSync(employe.photoPath)) {
      oldPhotoPathToDelete = employe.photoPath;
    }

    try {
      const updated = await this.prisma.employe.update({
        where: { id },
        data: {
          photoFilename: filename,
          photoOriginalName: file.originalname,
          photoMimeType: file.mimetype,
          photoSize: file.size,
          photoPath: targetPath,
          misAJourLe: new Date(),
        },
      });

      if (oldPhotoPathToDelete) {
        try {
          fs.unlinkSync(oldPhotoPathToDelete);
        } catch (unlinkErr: any) {
          this.logger.warn(`Échec de la suppression de l'ancienne photo: ${unlinkErr.message}`);
        }
      }

      return toEmployeView(updated);
    } catch (err) {
      if (fs.existsSync(targetPath)) {
        try {
          fs.unlinkSync(targetPath);
        } catch {
          // ignore
        }
      }
      throw err;
    }
  }

  async deletePhoto(id: number): Promise<EmployeView> {
    const employe = await this.prisma.employe.findFirst({
      where: { id, supprimeLe: null },
    });

    if (!employe) {
      throw new NotFoundException(`Employé #${id} introuvable`);
    }

    const photoPath = employe.photoPath;

    const updated = await this.prisma.employe.update({
      where: { id },
      data: {
        photoFilename: null,
        photoOriginalName: null,
        photoMimeType: null,
        photoSize: null,
        photoPath: null,
        misAJourLe: new Date(),
      },
    });

    if (photoPath && fs.existsSync(photoPath)) {
      try {
        fs.unlinkSync(photoPath);
      } catch (unlinkErr: any) {
        this.logger.warn(`Échec de la suppression du fichier photo: ${unlinkErr.message}`);
      }
    }

    return toEmployeView(updated);
  }

  async getPhotoFileStream(id: number): Promise<{ physicalPath: string; mimeType: string }> {
    const employe = await this.prisma.employe.findFirst({
      where: { id, supprimeLe: null },
    });

    if (!employe || !employe.photoPath || !fs.existsSync(employe.photoPath)) {
      throw new NotFoundException(`Photo de l’employé #${id} introuvable`);
    }

    return {
      physicalPath: employe.photoPath,
      mimeType: employe.photoMimeType || 'image/png',
    };
  }

  // -------------------------------------------------------------------
  // Document Management
  // -------------------------------------------------------------------
  private validateDocumentFile(file: Express.Multer.File): void {
    if (!file || !file.buffer || file.size === 0) {
      throw new BadRequestException('Aucun fichier fourni ou fichier vide');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('La taille du document ne doit pas dépasser 5 Mo');
    }

    const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

    if (!allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      throw new BadRequestException(
        'Format de document non autorisé. Acceptés: PDF, PNG, JPEG, WEBP',
      );
    }

    const magic = file.buffer.slice(0, 4).toString('hex');
    const isPdf = file.buffer.slice(0, 4).toString('ascii') === '%PDF';
    const isPng = magic.startsWith('89504e47');
    const isJpeg = magic.startsWith('ffd8ff');
    const isWebp = magic.startsWith('52494646');

    if (!isPdf && !isPng && !isJpeg && !isWebp) {
      throw new BadRequestException('Signature de fichier document invalide');
    }
  }

  async listDocuments(idEmploye: number): Promise<DocumentEmploye[]> {
    const employe = await this.prisma.employe.findFirst({
      where: { id: idEmploye, supprimeLe: null },
    });

    if (!employe) {
      throw new NotFoundException(`Employé #${idEmploye} introuvable`);
    }

    return this.prisma.documentEmploye.findMany({
      where: { idEmploye },
      orderBy: { creeLe: 'desc' },
    });
  }

  async uploadDocument(
    idEmploye: number,
    dto: CreateDocumentEmployeDto,
    file: Express.Multer.File,
  ): Promise<DocumentEmploye> {
    const employe = await this.prisma.employe.findFirst({
      where: { id: idEmploye, supprimeLe: null },
    });

    if (!employe) {
      throw new NotFoundException(`Employé #${idEmploye} introuvable`);
    }

    this.validateDocumentFile(file);

    const uploadDir = path.join(process.cwd(), 'uploads', 'employes', 'documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    const filename = `${randomUUID()}${ext}`;
    const targetPath = path.join(uploadDir, filename);

    fs.writeFileSync(targetPath, file.buffer);

    try {
      return await this.prisma.documentEmploye.create({
        data: {
          idEmploye,
          typeDocument: dto.typeDocument.trim(),
          numeroDocument: dto.numeroDocument?.trim() || null,
          dateEmission: dto.dateEmission ? new Date(dto.dateEmission) : null,
          dateExpiration: dto.dateExpiration ? new Date(dto.dateExpiration) : null,
          filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          cheminFichier: targetPath,
          notes: dto.notes?.trim() || null,
        },
      });
    } catch (err) {
      if (fs.existsSync(targetPath)) {
        try {
          fs.unlinkSync(targetPath);
        } catch {
          // ignore
        }
      }
      throw err;
    }
  }

  async getDocumentFileStream(
    idEmploye: number,
    docId: number,
  ): Promise<{ physicalPath: string; filename: string; mimeType: string }> {
    const doc = await this.prisma.documentEmploye.findFirst({
      where: { id: docId, idEmploye, employe: { supprimeLe: null } },
    });

    if (!doc || !fs.existsSync(doc.cheminFichier)) {
      throw new NotFoundException(`Document #${docId} introuvable`);
    }

    return {
      physicalPath: doc.cheminFichier,
      filename: doc.originalName,
      mimeType: doc.mimeType,
    };
  }

  async deleteDocument(idEmploye: number, docId: number): Promise<{ message: string }> {
    const doc = await this.prisma.documentEmploye.findFirst({
      where: { id: docId, idEmploye, employe: { supprimeLe: null } },
    });

    if (!doc) {
      throw new NotFoundException(`Document #${docId} introuvable`);
    }

    // 1. Delete DB record first
    await this.prisma.documentEmploye.delete({
      where: { id: docId },
    });

    // 2. Delete file from disk
    if (fs.existsSync(doc.cheminFichier)) {
      try {
        fs.unlinkSync(doc.cheminFichier);
      } catch (unlinkErr: any) {
        this.logger.warn(
          `Échec de la suppression du fichier sur disque pour document #${docId}: ${unlinkErr.message}`,
        );
      }
    }

    return { message: `Document #${docId} supprimé avec succès` };
  }
}
