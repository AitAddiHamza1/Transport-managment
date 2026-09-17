import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';

export interface ChequeView {
  id: number;
  numero: string;
  serie: string | null;
  dateCheque: string;
  banque: string;
  agence: string | null;
  beneficiaire: string;
  ville: string | null;
  idPaiementClient: number | null;
  idPaiementFournisseur: number | null;
  hasDocument: boolean;
}

export interface ChequeDocumentView {
  id: number;
  chequeId: number;
  nomOriginal: string;
  mimeType: string;
  tailleFichier: number;
  fileUrl: string;
  downloadUrl: string;
}

@Injectable()
export class ChequesService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'cheques');

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

  public async getChequeAndVerifyTenant(companyId: number, id: number) {
    const cheque = await this.prisma.cheque.findUnique({
      where: { id },
    });

    if (!cheque) {
      throw new NotFoundException(`Chèque #${id} introuvable`);
    }

    let chequeCompanyId: number | null = null;
    if (cheque.idPaiementClient) {
      const pc = await this.prisma.paiementClient.findUnique({
        where: { id: cheque.idPaiementClient },
      });
      if (pc) {
        const facture = await this.prisma.facture.findFirst({
          where: {
            companyId,
            numeroFacture: pc.numeroFacture,
          },
        });
        chequeCompanyId = facture?.companyId ?? null;
      }
    } else if (cheque.idPaiementFournisseur) {
      const pf = await this.prisma.paiementFournisseur.findUnique({
        where: { id: cheque.idPaiementFournisseur },
      });
      if (pf) {
        const df = await this.prisma.detteFournisseur.findFirst({
          where: {
            id: pf.idDetteFournisseur,
            companyId,
          },
        });
        chequeCompanyId = df?.companyId ?? null;
      }
    }

    if (!chequeCompanyId || chequeCompanyId !== companyId) {
      throw new NotFoundException(`Chèque #${id} introuvable`);
    }

    return cheque;
  }

  public toView(cheque: any): ChequeView {
    return {
      id: cheque.id,
      numero: cheque.numero,
      serie: cheque.serie ?? null,
      dateCheque: cheque.dateCheque
        ? new Date(cheque.dateCheque).toISOString().split('T')[0]
        : '',
      banque: cheque.banque,
      agence: cheque.agence ?? null,
      beneficiaire: cheque.beneficiaire,
      ville: cheque.ville ?? null,
      idPaiementClient: cheque.idPaiementClient ?? null,
      idPaiementFournisseur: cheque.idPaiementFournisseur ?? null,
      hasDocument: Boolean(cheque.cheminFichier),
    };
  }

  public toDocumentView(cheque: any): ChequeDocumentView {
    return {
      id: cheque.id,
      chequeId: cheque.id,
      nomOriginal: cheque.nomOriginal || '',
      mimeType: cheque.mimeType || '',
      tailleFichier:
        cheque.tailleFichier !== null && cheque.tailleFichier !== undefined
          ? Number(cheque.tailleFichier)
          : 0,
      fileUrl: `/api/cheques/${cheque.id}/document/fichier`,
      downloadUrl: `/api/cheques/${cheque.id}/document/download`,
    };
  }

  async getChequeById(companyId: number, id: number): Promise<ChequeView> {
    const cheque = await this.getChequeAndVerifyTenant(companyId, id);
    return this.toView(cheque);
  }

  async getChequeByClientPaymentId(companyId: number, paymentId: number): Promise<ChequeView> {
    const pc = await this.prisma.paiementClient.findUnique({
      where: { id: paymentId },
    });
    if (!pc) {
      throw new NotFoundException(`Règlement client #${paymentId} introuvable`);
    }

    const facture = await this.prisma.facture.findFirst({
      where: { companyId, numeroFacture: pc.numeroFacture },
    });
    if (!facture || facture.companyId !== companyId) {
      throw new NotFoundException(`Règlement client #${paymentId} introuvable`);
    }

    const cheque = await this.prisma.cheque.findUnique({
      where: { idPaiementClient: paymentId },
    });

    if (!cheque) {
      throw new NotFoundException(`Aucun chèque associé au règlement client #${paymentId}`);
    }

    return this.toView(cheque);
  }

  async getChequeBySupplierPaymentId(companyId: number, paymentId: number): Promise<ChequeView> {
    const pf = await this.prisma.paiementFournisseur.findUnique({
      where: { id: paymentId },
      include: { detteFournisseur: true },
    });

    if (!pf || !pf.detteFournisseur || pf.detteFournisseur.companyId !== companyId) {
      throw new NotFoundException(`Paiement fournisseur #${paymentId} introuvable`);
    }

    const cheque = await this.prisma.cheque.findUnique({
      where: { idPaiementFournisseur: paymentId },
    });

    if (!cheque) {
      throw new NotFoundException(`Aucun chèque associé au paiement fournisseur #${paymentId}`);
    }

    return this.toView(cheque);
  }

  async getDocumentMetadata(
    companyId: number,
    id: number,
  ): Promise<ChequeDocumentView> {
    const cheque = await this.getChequeAndVerifyTenant(companyId, id);
    if (!cheque.cheminFichier) {
      throw new NotFoundException(`Aucun document associé au chèque #${id}`);
    }
    return this.toDocumentView(cheque);
  }

  async uploadDocument(
    companyId: number,
    id: number,
    file: Express.Multer.File,
  ): Promise<ChequeDocumentView> {
    const cheque = await this.getChequeAndVerifyTenant(companyId, id);

    if (cheque.cheminFichier) {
      throw new ConflictException('Ce chèque possède déjà un document.');
    }

    this.validateFileHeaderAndMetadata(file);

    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const rawExt = path.extname(file.originalname || '.pdf').toLowerCase();
    const allowedExts = ['.pdf', '.jpeg', '.jpg', '.png', '.webp'];
    const ext = allowedExts.includes(rawExt) ? rawExt : '.pdf';
    const filename = `chq-${id}-${timestamp}-${random}${ext}`;
    const relativePath = path.join('uploads', 'cheques', filename).replace(/\\/g, '/');
    const diskPath = path.join(this.uploadDir, filename);

    fs.writeFileSync(diskPath, file.buffer);

    try {
      const updateResult = await this.prisma.cheque.updateMany({
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
        throw new ConflictException('Ce chèque possède déjà un document.');
      }

      const updatedCheque = await this.getChequeAndVerifyTenant(companyId, id);
      return this.toDocumentView(updatedCheque);
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
    const cheque = await this.getChequeAndVerifyTenant(companyId, id);

    if (!cheque.cheminFichier) {
      throw new NotFoundException(`Aucun document associé au chèque #${id}`);
    }

    const diskPath = this.resolveSecurePath(cheque.cheminFichier);
    if (!fs.existsSync(diskPath)) {
      throw new NotFoundException('Fichier physique introuvable sur le disque');
    }

    return {
      diskPath,
      mimeType: cheque.mimeType || 'application/octet-stream',
      nomOriginal: cheque.nomOriginal || `chq-document-${id}${path.extname(diskPath)}`,
    };
  }

  async removeDocument(
    companyId: number,
    id: number,
  ): Promise<{ id: number; message: string }> {
    const cheque = await this.getChequeAndVerifyTenant(companyId, id);

    if (!cheque.cheminFichier) {
      throw new NotFoundException(`Aucun document associé au chèque #${id}`);
    }

    const diskPath = cheque.cheminFichier ? this.resolveSecurePath(cheque.cheminFichier) : null;

    await this.prisma.cheque.update({
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

    return { id, message: `Document du chèque #${id} supprimé avec succès` };
  }
}

