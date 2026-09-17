import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';

export interface LettreDeChangeDocumentView {
  idLettreDeChange: number;
  hasDocument: boolean;
  cheminFichier: string | null;
  nomOriginal: string | null;
  mimeType: string | null;
  tailleFichier: number | null;
  fileUrl: string | null;
  downloadUrl: string | null;
}

@Injectable()
export class LettresDeChangeService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'lettres-change');

  constructor(private readonly prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private resolveSecurePath(relativePath: string): string {
    const normalizedRelative = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    const absolutePath = path.resolve(process.cwd(), normalizedRelative);
    const resolvedUploadDir = path.resolve(this.uploadDir);

    if (!absolutePath.startsWith(resolvedUploadDir)) {
      throw new BadRequestException('Chemin de fichier invalide (tentative de traversée)');
    }
    return absolutePath;
  }

  private validateFileHeaderAndMetadata(file: Express.Multer.File): void {
    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Aucun fichier fourni ou fichier vide');
    }
    if (file.size > maxSizeBytes || file.buffer.length > maxSizeBytes) {
      throw new BadRequestException('Le fichier dépasse la taille maximale autorisée de 5 Mo');
    }

    const allowedExtensions = ['.pdf', '.jpeg', '.jpg', '.png', '.webp'];
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new BadRequestException(
        'Format de fichier non supporté. Formats acceptés : PDF, JPEG, PNG, WEBP',
      );
    }

    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
    if (file.mimetype && !allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      throw new BadRequestException('Type MIME du fichier non supporté');
    }

    // Magic Bytes Verification
    const buf = file.buffer;
    let isValidMagic = false;

    // PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46 0x2D)
    if (
      buf.length >= 5 &&
      buf[0] === 0x25 &&
      buf[1] === 0x50 &&
      buf[2] === 0x44 &&
      buf[3] === 0x46 &&
      buf[4] === 0x2d
    ) {
      isValidMagic = true;
    }
    // JPEG magic bytes: FF D8 FF
    else if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
      isValidMagic = true;
    }
    // PNG magic bytes: 89 50 4E 47
    else if (
      buf.length >= 4 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47
    ) {
      isValidMagic = true;
    }
    // WEBP magic bytes: RIFF at 0..3 and WEBP at 8..11
    else if (
      buf.length >= 12 &&
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50
    ) {
      isValidMagic = true;
    }

    if (!isValidMagic) {
      throw new BadRequestException(
        'Signature de fichier (magic bytes) invalide ou ne correspondant pas au format déclaré',
      );
    }
  }

  private async getLettreAndVerifyTenant(companyId: number, id: number) {
    const lettre = await this.prisma.lettreDeChange.findUnique({
      where: { id },
    });

    if (!lettre) {
      throw new NotFoundException(`Lettre de change #${id} introuvable`);
    }

    let lettreCompanyId: number | null = null;
    if (lettre.idPaiementClient) {
      const pc = await this.prisma.paiementClient.findUnique({
        where: { id: lettre.idPaiementClient },
      });
      if (pc) {
        const facture = await this.prisma.facture.findFirst({
          where: {
            companyId,
            numeroFacture: pc.numeroFacture,
          },
        });
        lettreCompanyId = facture?.companyId ?? null;
      }
    } else if (lettre.idPaiementFournisseur) {
      const pf = await this.prisma.paiementFournisseur.findUnique({
        where: { id: lettre.idPaiementFournisseur },
      });
      if (pf) {
        const df = await this.prisma.detteFournisseur.findFirst({
          where: {
            id: pf.idDetteFournisseur,
            companyId,
          },
        });
        lettreCompanyId = df?.companyId ?? null;
      }
    }

    if (!lettreCompanyId || lettreCompanyId !== companyId) {
      throw new NotFoundException(`Lettre de change #${id} introuvable`);
    }

    return lettre;
  }

  public toDocumentView(lettre: any): LettreDeChangeDocumentView {
    const hasDoc = Boolean(lettre.cheminFichier);
    return {
      idLettreDeChange: Number(lettre.id),
      hasDocument: hasDoc,
      cheminFichier: lettre.cheminFichier ?? null,
      nomOriginal: lettre.nomOriginal ?? null,
      mimeType: lettre.mimeType ?? null,
      tailleFichier:
        lettre.tailleFichier !== null && lettre.tailleFichier !== undefined
          ? Number(lettre.tailleFichier)
          : null,
      fileUrl: hasDoc ? `/api/lettres-de-change/${lettre.id}/document/fichier` : null,
      downloadUrl: hasDoc ? `/api/lettres-de-change/${lettre.id}/document/download` : null,
    };
  }

  async getDocumentMetadata(
    companyId: number,
    id: number,
  ): Promise<LettreDeChangeDocumentView> {
    const lettre = await this.getLettreAndVerifyTenant(companyId, id);
    return this.toDocumentView(lettre);
  }

  async uploadDocument(
    companyId: number,
    id: number,
    file: Express.Multer.File,
  ): Promise<LettreDeChangeDocumentView> {
    const lettre = await this.getLettreAndVerifyTenant(companyId, id);

    if (lettre.cheminFichier) {
      throw new ConflictException('Cette lettre de change possède déjà un document.');
    }

    this.validateFileHeaderAndMetadata(file);

    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const ext = path.extname(file.originalname || '.pdf').toLowerCase();
    const filename = `lc-${id}-${timestamp}-${random}${ext}`;
    const relativePath = path.join('uploads', 'lettres-change', filename).replace(/\\/g, '/');
    const diskPath = path.join(this.uploadDir, filename);

    fs.writeFileSync(diskPath, file.buffer);

    try {
      const updateResult = await this.prisma.lettreDeChange.updateMany({
        where: {
          id,
          cheminFichier: null,
        },
        data: {
          cheminFichier: relativePath,
          nomOriginal: file.originalname || filename,
          mimeType: file.mimetype,
          tailleFichier: BigInt(file.size),
        },
      });

      if (updateResult.count === 0) {
        if (fs.existsSync(diskPath)) {
          try {
            fs.unlinkSync(diskPath);
          } catch (_) {}
        }
        throw new ConflictException('Cette lettre de change possède déjà un document.');
      }

      const updatedLettre = await this.getLettreAndVerifyTenant(companyId, id);
      return this.toDocumentView(updatedLettre);
    } catch (dbError) {
      if (fs.existsSync(diskPath)) {
        try {
          fs.unlinkSync(diskPath);
        } catch (_) {}
      }
      throw dbError;
    }
  }

  async getDocumentFile(
    companyId: number,
    id: number,
  ): Promise<{ diskPath: string; mimeType: string; nomOriginal: string }> {
    const lettre = await this.getLettreAndVerifyTenant(companyId, id);

    if (!lettre.cheminFichier) {
      throw new NotFoundException(`Aucun document associé à la lettre de change #${id}`);
    }

    const diskPath = this.resolveSecurePath(lettre.cheminFichier);
    if (!fs.existsSync(diskPath)) {
      throw new NotFoundException('Fichier physique introuvable sur le disque');
    }

    return {
      diskPath,
      mimeType: lettre.mimeType || 'application/octet-stream',
      nomOriginal: lettre.nomOriginal || `lc-document-${id}${path.extname(diskPath)}`,
    };
  }

  async removeDocument(
    companyId: number,
    id: number,
  ): Promise<{ id: number; message: string }> {
    const lettre = await this.getLettreAndVerifyTenant(companyId, id);

    if (!lettre.cheminFichier) {
      throw new NotFoundException(`Aucun document associé à la lettre de change #${id}`);
    }

    const diskPath = lettre.cheminFichier ? this.resolveSecurePath(lettre.cheminFichier) : null;

    await this.prisma.lettreDeChange.update({
      where: { id },
      data: {
        cheminFichier: null,
        nomOriginal: null,
        mimeType: null,
        tailleFichier: null,
      },
    });

    if (diskPath && fs.existsSync(diskPath)) {
      try {
        fs.unlinkSync(diskPath);
      } catch (_) {}
    }

    return { id, message: `Document de la lettre de change #${id} supprimé avec succès` };
  }
}
