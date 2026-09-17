import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ChequesService, ChequeView, ChequeDocumentView } from './cheques.service';

@ApiTags('Chèques')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('cheques')
export class ChequesController {
  constructor(private readonly service: ChequesService) {}

  @Get(':id')
  @RequirePermission('gestion_paiements', 'voir')
  @ApiOperation({ summary: 'Consulter les informations d un chèque par son ID' })
  @ApiResponse({ status: 200, description: 'Informations du chèque' })
  @ApiResponse({ status: 404, description: 'Chèque introuvable' })
  async getChequeById(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ChequeView> {
    return this.service.getChequeById(companyId, id);
  }

  @Get('client-paiement/:paymentId')
  @RequirePermission('gestion_paiements', 'voir')
  @ApiOperation({ summary: 'Consulter le chèque associé à un règlement client' })
  @ApiResponse({ status: 200, description: 'Informations du chèque client' })
  @ApiResponse({ status: 404, description: 'Chèque ou règlement introuvable' })
  async getChequeByClientPaymentId(
    @CurrentUser('companyId') companyId: number,
    @Param('paymentId', ParseIntPipe) paymentId: number,
  ): Promise<ChequeView> {
    return this.service.getChequeByClientPaymentId(companyId, paymentId);
  }

  @Get('fournisseur-paiement/:paymentId')
  @RequirePermission('gestion_paiements', 'voir')
  @ApiOperation({ summary: 'Consulter le chèque associé à un versement fournisseur' })
  @ApiResponse({ status: 200, description: 'Informations du chèque fournisseur' })
  @ApiResponse({ status: 404, description: 'Chèque ou versement introuvable' })
  async getChequeBySupplierPaymentId(
    @CurrentUser('companyId') companyId: number,
    @Param('paymentId', ParseIntPipe) paymentId: number,
  ): Promise<ChequeView> {
    return this.service.getChequeBySupplierPaymentId(companyId, paymentId);
  }

  @Get(':id/document')
  @RequirePermission('gestion_paiements', 'voir')
  @ApiOperation({ summary: 'Consulter les métadonnées du document du chèque' })
  @ApiResponse({ status: 200, description: 'Métadonnées du document' })
  @ApiResponse({ status: 404, description: 'Chèque ou document introuvable' })
  async getDocumentMetadata(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ChequeDocumentView> {
    return this.service.getDocumentMetadata(companyId, id);
  }

  @Post(':id/document')
  @RequirePermission('gestion_paiements', 'modifier')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Attacher un document à un chèque' })
  @ApiResponse({ status: 201, description: 'Document rattaché avec succès' })
  @ApiResponse({ status: 400, description: 'Fichier invalide ou trop volumineux' })
  @ApiResponse({ status: 404, description: 'Chèque introuvable' })
  @ApiResponse({ status: 409, description: 'Un document existe déjà pour ce chèque' })
  async uploadDocument(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ChequeDocumentView> {
    return this.service.uploadDocument(companyId, id, file);
  }

  @Get(':id/document/fichier')
  @RequirePermission('gestion_paiements', 'voir')
  @ApiOperation({ summary: 'Consulter en ligne le fichier du document du chèque' })
  async getDocumentFileInline(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const { diskPath, mimeType } = await this.service.getDocumentFile(companyId, id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(diskPath);
  }

  @Get(':id/document/download')
  @RequirePermission('gestion_paiements', 'voir')
  @ApiOperation({ summary: 'Télécharger le fichier du document du chèque' })
  async downloadDocumentFile(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const { diskPath, mimeType, nomOriginal } = await this.service.getDocumentFile(companyId, id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(nomOriginal)}"`,
    );
    res.sendFile(diskPath);
  }

  @Delete(':id/document')
  @RequirePermission('gestion_paiements', 'modifier')
  @ApiOperation({ summary: 'Supprimer le document du chèque' })
  @ApiResponse({ status: 200, description: 'Document supprimé' })
  @ApiResponse({ status: 404, description: 'Chèque ou document introuvable' })
  async removeDocument(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ id: number; message: string }> {
    return this.service.removeDocument(companyId, id);
  }
}

