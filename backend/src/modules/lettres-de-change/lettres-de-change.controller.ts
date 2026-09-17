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
import {
  LettresDeChangeService,
  LettreDeChangeDocumentView,
} from './lettres-de-change.service';

@ApiTags('Lettres de Change')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('lettres-de-change')
export class LettresDeChangeController {
  constructor(private readonly service: LettresDeChangeService) {}

  @Get(':id/document')
  @RequirePermission('gestion_paiements', 'voir')
  @ApiOperation({ summary: 'Consulter les métadonnées du document de la lettre de change' })
  @ApiResponse({ status: 200, description: 'Métadonnées du document' })
  @ApiResponse({ status: 404, description: 'Lettre de change introuvable' })
  async getDocumentMetadata(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<LettreDeChangeDocumentView> {
    return this.service.getDocumentMetadata(companyId, id);
  }

  @Post(':id/document')
  @RequirePermission('gestion_paiements', 'modifier')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Attacher un document à une lettre de change' })
  @ApiResponse({ status: 201, description: 'Document rattaché avec succès' })
  @ApiResponse({ status: 400, description: 'Fichier invalide ou trop volumineux' })
  @ApiResponse({ status: 404, description: 'Lettre de change introuvable' })
  @ApiResponse({ status: 409, description: 'Un document existe déjà pour cette lettre de change' })
  async uploadDocument(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<LettreDeChangeDocumentView> {
    return this.service.uploadDocument(companyId, id, file);
  }

  @Get(':id/document/fichier')
  @RequirePermission('gestion_paiements', 'voir')
  @ApiOperation({ summary: 'Consulter en ligne le fichier du document de la lettre de change' })
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
  @ApiOperation({ summary: 'Télécharger le fichier du document de la lettre de change' })
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
  @ApiOperation({ summary: 'Supprimer le document de la lettre de change' })
  @ApiResponse({ status: 200, description: 'Document supprimé' })
  @ApiResponse({ status: 404, description: 'Lettre de change ou document introuvable' })
  async removeDocument(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ id: number; message: string }> {
    return this.service.removeDocument(companyId, id);
  }
}
