import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

export interface CompanySettingsView {
  id: number;
  singletonKey: string;
  nomEntreprise: string | null;
  nomLegal: string | null;
  adresse: string | null;
  ville: string | null;
  pays: string | null;
  telephone: string | null;
  telephoneSecondaire: string | null;
  email: string | null;
  siteWeb: string | null;
  ice: string | null;
  identifiantFiscal: string | null;
  registreCommerce: string | null;
  patente: string | null;
  cnss: string | null;
  nomBanque: string | null;
  rib: string | null;
  iban: string | null;
  swiftBic: string | null;
  tauxTvaParDefaut: number;
  delaiPaiementParDefaut: number;
  devise: string;
  prefixeFacture: string | null;
  separateurFacture: string;
  paddingFacture: number;
  templateFacture: string;
  textePiedDePage: string | null;
  noteLegaleTva: string | null;
  hasLogo: boolean;
  logoFilename: string | null;
  logoOriginalName: string | null;
  logoMimeType: string | null;
  logoSize: number | null;
  hasStamp: boolean;
  stampFilename: string | null;
  stampOriginalName: string | null;
  stampMimeType: string | null;
  stampSize: number | null;
  creeLe: string;
  misAJourLe: string;
}

export interface GetCompanySettingsResponse {
  isConfigured: boolean;
  settings: CompanySettingsView | null;
}

@Injectable()
export class CompanySettingsService {
  private readonly logger = new Logger(CompanySettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Strictly read-only GET endpoint helper. Performs ZERO database writes.
   */
  async getSettings(): Promise<GetCompanySettingsResponse> {
    const raw = await this.prisma.companySettings.findUnique({
      where: { singletonKey: 'DEFAULT' },
    });

    if (!raw) {
      return {
        isConfigured: false,
        settings: null,
      };
    }

    const hasName = Boolean(raw.nomEntreprise && raw.nomEntreprise.trim().length > 0);
    const hasAddress = Boolean(raw.adresse && raw.adresse.trim().length > 0);
    const hasPhone = Boolean(raw.telephone && raw.telephone.trim().length > 0);
    const hasEmail = Boolean(raw.email && raw.email.trim().length > 0);

    const isConfigured = hasName && hasAddress && hasPhone && hasEmail;

    return {
      isConfigured,
      settings: this.toSettingsView(raw),
    };
  }

  /**
   * Updates or seeds the single DEFAULT installation profile.
   */
  async updateSettings(dto: UpdateCompanySettingsDto): Promise<GetCompanySettingsResponse> {
    const data: any = {};
    if (dto.nomEntreprise !== undefined) data.nomEntreprise = dto.nomEntreprise;
    if (dto.nomLegal !== undefined) data.nomLegal = dto.nomLegal;
    if (dto.adresse !== undefined) data.adresse = dto.adresse;
    if (dto.ville !== undefined) data.ville = dto.ville;
    if (dto.pays !== undefined) data.pays = dto.pays;
    if (dto.telephone !== undefined) data.telephone = dto.telephone;
    if (dto.telephoneSecondaire !== undefined) data.telephoneSecondaire = dto.telephoneSecondaire;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.siteWeb !== undefined) data.siteWeb = dto.siteWeb;
    if (dto.ice !== undefined) data.ice = dto.ice;
    if (dto.identifiantFiscal !== undefined) data.identifiantFiscal = dto.identifiantFiscal;
    if (dto.registreCommerce !== undefined) data.registreCommerce = dto.registreCommerce;
    if (dto.patente !== undefined) data.patente = dto.patente;
    if (dto.cnss !== undefined) data.cnss = dto.cnss;
    if (dto.nomBanque !== undefined) data.nomBanque = dto.nomBanque;
    if (dto.rib !== undefined) data.rib = dto.rib;
    if (dto.iban !== undefined) data.iban = dto.iban;
    if (dto.swiftBic !== undefined) data.swiftBic = dto.swiftBic;
    if (dto.tauxTvaParDefaut !== undefined) data.tauxTvaParDefaut = dto.tauxTvaParDefaut;
    if (dto.delaiPaiementParDefaut !== undefined)
      data.delaiPaiementParDefaut = dto.delaiPaiementParDefaut;
    if (dto.devise !== undefined) data.devise = dto.devise;
    if (dto.prefixeFacture !== undefined) data.prefixeFacture = dto.prefixeFacture;
    if (dto.separateurFacture !== undefined) data.separateurFacture = dto.separateurFacture;
    if (dto.paddingFacture !== undefined) data.paddingFacture = dto.paddingFacture;
    if (dto.templateFacture !== undefined) {
      if (dto.templateFacture !== 'CLASSIC_TRANSPORT') {
        throw new BadRequestException(
          `Template de facture "${dto.templateFacture}" non supporté. Seul "CLASSIC_TRANSPORT" est valide.`,
        );
      }
      data.templateFacture = dto.templateFacture;
    }
    if (dto.textePiedDePage !== undefined) data.textePiedDePage = dto.textePiedDePage;
    if (dto.noteLegaleTva !== undefined) data.noteLegaleTva = dto.noteLegaleTva;

    data.misAJourLe = new Date();

    const updated = await this.prisma.companySettings.upsert({
      where: { singletonKey: 'DEFAULT' },
      create: {
        singletonKey: 'DEFAULT',
        ...data,
      },
      update: data,
    });

    const hasName = Boolean(updated.nomEntreprise && updated.nomEntreprise.trim().length > 0);
    const hasAddress = Boolean(updated.adresse && updated.adresse.trim().length > 0);
    const hasPhone = Boolean(updated.telephone && updated.telephone.trim().length > 0);
    const hasEmail = Boolean(updated.email && updated.email.trim().length > 0);

    const isConfigured = hasName && hasAddress && hasPhone && hasEmail;

    return {
      isConfigured,
      settings: this.toSettingsView(updated),
    };
  }

  /**
   * Upload logo asset safely.
   */
  async uploadLogo(file: Express.Multer.File): Promise<GetCompanySettingsResponse> {
    this.validateAssetFile(file);

    const uploadDir = path.join(process.cwd(), 'uploads', 'branding', 'logo');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const filename = `${randomUUID()}${ext}`;
    const targetPath = path.join(uploadDir, filename);

    // Save temporary file first
    fs.writeFileSync(targetPath, file.buffer);

    let oldPathToDelete: string | null = null;

    try {
      const current = await this.prisma.companySettings.findUnique({
        where: { singletonKey: 'DEFAULT' },
      });

      if (current && current.logoPath && fs.existsSync(current.logoPath)) {
        oldPathToDelete = current.logoPath;
      }

      await this.prisma.companySettings.upsert({
        where: { singletonKey: 'DEFAULT' },
        create: {
          singletonKey: 'DEFAULT',
          logoFilename: filename,
          logoOriginalName: file.originalname,
          logoMimeType: file.mimetype,
          logoSize: file.size,
          logoPath: targetPath,
        },
        update: {
          logoFilename: filename,
          logoOriginalName: file.originalname,
          logoMimeType: file.mimetype,
          logoSize: file.size,
          logoPath: targetPath,
          misAJourLe: new Date(),
        },
      });

      // DB update succeeded -> clean up old file if replacement
      if (oldPathToDelete) {
        try {
          fs.unlinkSync(oldPathToDelete);
        } catch (unlinkErr) {
          this.logger.warn(`Failed to remove old logo file: ${unlinkErr.message}`);
        }
      }

      return this.getSettings();
    } catch (err) {
      // Revert temporary new file if DB transaction failed
      if (fs.existsSync(targetPath)) {
        try {
          fs.unlinkSync(targetPath);
        } catch (_) {}
      }
      throw err;
    }
  }

  /**
   * Upload stamp asset safely.
   */
  async uploadStamp(file: Express.Multer.File): Promise<GetCompanySettingsResponse> {
    this.validateAssetFile(file);

    const uploadDir = path.join(process.cwd(), 'uploads', 'branding', 'stamp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const filename = `${randomUUID()}${ext}`;
    const targetPath = path.join(uploadDir, filename);

    fs.writeFileSync(targetPath, file.buffer);

    let oldPathToDelete: string | null = null;

    try {
      const current = await this.prisma.companySettings.findUnique({
        where: { singletonKey: 'DEFAULT' },
      });

      if (current && current.stampPath && fs.existsSync(current.stampPath)) {
        oldPathToDelete = current.stampPath;
      }

      await this.prisma.companySettings.upsert({
        where: { singletonKey: 'DEFAULT' },
        create: {
          singletonKey: 'DEFAULT',
          stampFilename: filename,
          stampOriginalName: file.originalname,
          stampMimeType: file.mimetype,
          stampSize: file.size,
          stampPath: targetPath,
        },
        update: {
          stampFilename: filename,
          stampOriginalName: file.originalname,
          stampMimeType: file.mimetype,
          stampSize: file.size,
          stampPath: targetPath,
          misAJourLe: new Date(),
        },
      });

      if (oldPathToDelete) {
        try {
          fs.unlinkSync(oldPathToDelete);
        } catch (unlinkErr) {
          this.logger.warn(`Failed to remove old stamp file: ${unlinkErr.message}`);
        }
      }

      return this.getSettings();
    } catch (err) {
      if (fs.existsSync(targetPath)) {
        try {
          fs.unlinkSync(targetPath);
        } catch (_) {}
      }
      throw err;
    }
  }

  /**
   * Delete logo asset safely & idempotently.
   */
  async deleteLogo(): Promise<GetCompanySettingsResponse> {
    const current = await this.prisma.companySettings.findUnique({
      where: { singletonKey: 'DEFAULT' },
    });

    if (!current || !current.logoPath) {
      return this.getSettings();
    }

    const fileToDelete = current.logoPath;

    // Clear DB metadata transactionally
    await this.prisma.companySettings.update({
      where: { singletonKey: 'DEFAULT' },
      data: {
        logoFilename: null,
        logoOriginalName: null,
        logoMimeType: null,
        logoSize: null,
        logoPath: null,
        misAJourLe: new Date(),
      },
    });

    // Attempt physical deletion after DB commit
    if (fileToDelete && fs.existsSync(fileToDelete)) {
      try {
        fs.unlinkSync(fileToDelete);
      } catch (err) {
        this.logger.warn(`Physical logo file deletion failed: ${err.message}`);
      }
    }

    return this.getSettings();
  }

  /**
   * Delete stamp asset safely & idempotently.
   */
  async deleteStamp(): Promise<GetCompanySettingsResponse> {
    const current = await this.prisma.companySettings.findUnique({
      where: { singletonKey: 'DEFAULT' },
    });

    if (!current || !current.stampPath) {
      return this.getSettings();
    }

    const fileToDelete = current.stampPath;

    await this.prisma.companySettings.update({
      where: { singletonKey: 'DEFAULT' },
      data: {
        stampFilename: null,
        stampOriginalName: null,
        stampMimeType: null,
        stampSize: null,
        stampPath: null,
        misAJourLe: new Date(),
      },
    });

    if (fileToDelete && fs.existsSync(fileToDelete)) {
      try {
        fs.unlinkSync(fileToDelete);
      } catch (err) {
        this.logger.warn(`Physical stamp file deletion failed: ${err.message}`);
      }
    }

    return this.getSettings();
  }

  /**
   * Stream logo asset file securely.
   */
  async getLogoFileStream(): Promise<{ stream: fs.ReadStream; mimeType: string; size: number }> {
    const current = await this.prisma.companySettings.findUnique({
      where: { singletonKey: 'DEFAULT' },
    });

    if (!current || !current.logoPath || !fs.existsSync(current.logoPath)) {
      throw new NotFoundException('Aucun logo configuré');
    }

    return {
      stream: fs.createReadStream(current.logoPath),
      mimeType: current.logoMimeType || 'image/png',
      size: current.logoSize || 0,
    };
  }

  /**
   * Stream stamp asset file securely.
   */
  async getStampFileStream(): Promise<{ stream: fs.ReadStream; mimeType: string; size: number }> {
    const current = await this.prisma.companySettings.findUnique({
      where: { singletonKey: 'DEFAULT' },
    });

    if (!current || !current.stampPath || !fs.existsSync(current.stampPath)) {
      throw new NotFoundException('Aucun cachet configuré');
    }

    return {
      stream: fs.createReadStream(current.stampPath),
      mimeType: current.stampMimeType || 'image/png',
      size: current.stampSize || 0,
    };
  }

  private validateAssetFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Format de fichier non autorisé. Formats acceptés : PNG, JPEG, WEBP',
      );
    }

    const maxBytes = 2 * 1024 * 1024; // 2 MB
    if (file.size > maxBytes) {
      throw new BadRequestException('La taille du fichier ne doit pas dépasser 2 Mo');
    }
  }

  private toSettingsView(raw: any): CompanySettingsView {
    return {
      id: raw.id,
      singletonKey: raw.singletonKey,
      nomEntreprise: raw.nomEntreprise,
      nomLegal: raw.nomLegal,
      adresse: raw.adresse,
      ville: raw.ville,
      pays: raw.pays,
      telephone: raw.telephone,
      telephoneSecondaire: raw.telephoneSecondaire,
      email: raw.email,
      siteWeb: raw.siteWeb,
      ice: raw.ice,
      identifiantFiscal: raw.identifiantFiscal,
      registreCommerce: raw.registreCommerce,
      patente: raw.patente,
      cnss: raw.cnss,
      nomBanque: raw.nomBanque,
      rib: raw.rib,
      iban: raw.iban,
      swiftBic: raw.swiftBic,
      tauxTvaParDefaut: Number(raw.tauxTvaParDefaut),
      delaiPaiementParDefaut: raw.delaiPaiementParDefaut,
      devise: raw.devise,
      prefixeFacture: raw.prefixeFacture,
      separateurFacture: raw.separateurFacture,
      paddingFacture: raw.paddingFacture,
      templateFacture: raw.templateFacture,
      textePiedDePage: raw.textePiedDePage,
      noteLegaleTva: raw.noteLegaleTva,
      hasLogo: Boolean(raw.logoPath && fs.existsSync(raw.logoPath)),
      logoFilename: raw.logoFilename,
      logoOriginalName: raw.logoOriginalName,
      logoMimeType: raw.logoMimeType,
      logoSize: raw.logoSize,
      hasStamp: Boolean(raw.stampPath && fs.existsSync(raw.stampPath)),
      stampFilename: raw.stampFilename,
      stampOriginalName: raw.stampOriginalName,
      stampMimeType: raw.stampMimeType,
      stampSize: raw.stampSize,
      creeLe: raw.creeLe ? raw.creeLe.toISOString() : new Date().toISOString(),
      misAJourLe: raw.misAJourLe ? raw.misAJourLe.toISOString() : new Date().toISOString(),
    };
  }
}
