import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
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
import { CreateVoyageDto } from './dto/create-voyage.dto';
import { UpdateVoyageDto } from './dto/update-voyage.dto';
import { UpdateVoyageStatusDto } from './dto/update-voyage-status.dto';
import { QueryVoyageDto } from './dto/query-voyage.dto';
import { CreateFraisImmobilisationDto } from './dto/create-frais-immobilisation.dto';
import { UpdateFraisImmobilisationDto } from './dto/update-frais-immobilisation.dto';
import {
  VoyagesService,
  VoyageStats,
  VoyageView,
  FraisImmobilisationView,
  DocumentVoyageView,
} from './voyages.service';

@ApiTags('Voyages')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('voyages')
export class VoyagesController {
  constructor(private readonly voyagesService: VoyagesService) {}

  @Post()
  @RequirePermission('voyages', 'ajouter')
  @ApiOperation({ summary: 'Planifier un nouveau voyage' })
  @ApiResponse({ status: 201, description: 'Voyage créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Client ou véhicule non trouvé' })
  async create(
    @CurrentUser('companyId') companyId: number,
    @Body() dto: CreateVoyageDto,
  ): Promise<VoyageView> {
    return this.voyagesService.create(companyId, dto);
  }

  @Get('stats')
  @RequirePermission('voyages', 'voir')
  @ApiOperation({ summary: 'Obtenir les statistiques synthétiques des voyages' })
  @ApiResponse({ status: 200, description: 'Statistiques obtenues' })
  async findStats(@CurrentUser('companyId') companyId: number): Promise<VoyageStats> {
    return this.voyagesService.findStats(companyId);
  }

  @Get()
  @RequirePermission('voyages', 'voir')
  @ApiOperation({ summary: 'Lister les voyages avec pagination, recherche et filtres' })
  @ApiResponse({ status: 200, description: 'Liste des voyages paginée' })
  async findAll(@CurrentUser('companyId') companyId: number, @Query() query: QueryVoyageDto) {
    return this.voyagesService.findAll(companyId, query);
  }

  @Get(':id')
  @RequirePermission('voyages', 'voir')
  @ApiOperation({ summary: 'Consulter les détails d’un voyage par son identifiant' })
  @ApiResponse({ status: 200, description: 'Détails du voyage' })
  @ApiResponse({ status: 404, description: 'Voyage introuvable' })
  async findOne(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<VoyageView> {
    return this.voyagesService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequirePermission('voyages', 'modifier')
  @ApiOperation({ summary: 'Modifier les informations d’un voyage' })
  @ApiResponse({ status: 200, description: 'Voyage mis à jour' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Voyage introuvable' })
  async update(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVoyageDto,
  ): Promise<VoyageView> {
    return this.voyagesService.update(companyId, id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('voyages', 'modifier')
  @ApiOperation({ summary: 'Changer le statut d’un voyage (Lifecycle transition)' })
  @ApiResponse({ status: 200, description: 'Statut du voyage mis à jour' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Voyage introuvable' })
  async updateStatus(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVoyageStatusDto,
  ): Promise<VoyageView> {
    return this.voyagesService.updateStatus(companyId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('voyages', 'supprimer')
  @ApiOperation({ summary: 'Supprimer un voyage' })
  @ApiResponse({ status: 200, description: 'Voyage supprimé' })
  @ApiResponse({ status: 404, description: 'Voyage introuvable' })
  @ApiResponse({ status: 409, description: 'Voyage lié à des factures (bloqué)' })
  async remove(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ idVoyage: number }> {
    return this.voyagesService.remove(companyId, id);
  }

  // -------------------------------------------------------------------
  // FRAIS D'IMMOBILISATION ENDPOINTS (Sub-Step 4.4)
  // -------------------------------------------------------------------

  @Get(':id/frais-immobilisation')
  @RequirePermission('voyages', 'voir')
  @ApiOperation({ summary: 'Consulter le frais d’immobilisation d’un voyage' })
  @ApiResponse({ status: 200, description: 'Frais d’immobilisation trouvé' })
  @ApiResponse({ status: 404, description: 'Voyage ou frais d’immobilisation introuvable' })
  async findFraisImmobilisation(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<FraisImmobilisationView> {
    return this.voyagesService.findFraisImmobilisation(companyId, id);
  }

  @Post(':id/frais-immobilisation')
  @RequirePermission('voyages', 'modifier')
  @ApiOperation({ summary: 'Créer un frais d’immobilisation pour un voyage' })
  @ApiResponse({ status: 201, description: 'Frais d’immobilisation créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Voyage introuvable' })
  @ApiResponse({ status: 409, description: 'Un frais d’immobilisation existe déjà pour ce voyage' })
  async createFraisImmobilisation(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateFraisImmobilisationDto,
  ): Promise<FraisImmobilisationView> {
    return this.voyagesService.createFraisImmobilisation(companyId, id, dto);
  }

  @Patch(':id/frais-immobilisation')
  @RequirePermission('voyages', 'modifier')
  @ApiOperation({ summary: 'Modifier le frais d’immobilisation d’un voyage' })
  @ApiResponse({ status: 200, description: 'Frais d’immobilisation mis à jour' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Voyage ou frais d’immobilisation introuvable' })
  async updateFraisImmobilisation(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFraisImmobilisationDto,
  ): Promise<FraisImmobilisationView> {
    return this.voyagesService.updateFraisImmobilisation(companyId, id, dto);
  }

  @Delete(':id/frais-immobilisation')
  @RequirePermission('voyages', 'modifier')
  @ApiOperation({ summary: 'Supprimer le frais d’immobilisation d’un voyage' })
  @ApiResponse({ status: 200, description: 'Frais d’immobilisation supprimé' })
  @ApiResponse({ status: 404, description: 'Voyage ou frais d’immobilisation introuvable' })
  async removeFraisImmobilisation(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ idVoyage: number; message: string }> {
    return this.voyagesService.removeFraisImmobilisation(companyId, id);
  }

  // -------------------------------------------------------------------
  // DOCUMENTS DE VOYAGE ENDPOINTS (Sub-Step 4.7)
  // -------------------------------------------------------------------

  @Get(':id/documents')
  @RequirePermission('voyages', 'voir')
  @ApiOperation({ summary: 'Lister les documents d’un voyage' })
  @ApiResponse({ status: 200, description: 'Liste des documents du voyage' })
  @ApiResponse({ status: 404, description: 'Voyage introuvable' })
  async findAllVoyageDocuments(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DocumentVoyageView[]> {
    return this.voyagesService.findAllVoyageDocuments(companyId, id);
  }

  @Post(':id/documents')
  @RequirePermission('voyages', 'modifier')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Attacher un document à un voyage' })
  @ApiResponse({ status: 201, description: 'Document rattaché avec succès' })
  @ApiResponse({ status: 400, description: 'Fichier invalide ou trop volumineux' })
  @ApiResponse({ status: 404, description: 'Voyage introuvable' })
  async uploadVoyageDocument(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<DocumentVoyageView> {
    return this.voyagesService.uploadVoyageDocument(companyId, id, file);
  }

  @Get(':id/documents/:documentId/fichier')
  @RequirePermission('voyages', 'voir')
  @ApiOperation({ summary: 'Consulter en ligne le fichier d’un document de voyage' })
  async getVoyageDocumentFileInline(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('documentId', ParseIntPipe) documentId: number,
    @Res() res: Response,
  ): Promise<void> {
    const { diskPath, mimeType } = await this.voyagesService.getVoyageDocumentFile(
      companyId,
      id,
      documentId,
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(diskPath);
  }

  @Get(':id/documents/:documentId/download')
  @RequirePermission('voyages', 'voir')
  @ApiOperation({ summary: 'Télécharger le fichier d’un document de voyage' })
  async downloadVoyageDocumentFile(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('documentId', ParseIntPipe) documentId: number,
    @Res() res: Response,
  ): Promise<void> {
    const { diskPath, mimeType, nomOriginal } = await this.voyagesService.getVoyageDocumentFile(
      companyId,
      id,
      documentId,
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(nomOriginal)}"`,
    );
    res.sendFile(diskPath);
  }

  @Delete(':id/documents/:documentId')
  @RequirePermission('voyages', 'modifier')
  @ApiOperation({ summary: 'Supprimer un document de voyage' })
  @ApiResponse({ status: 200, description: 'Document supprimé' })
  @ApiResponse({ status: 404, description: 'Document ou voyage introuvable' })
  async removeVoyageDocument(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('documentId', ParseIntPipe) documentId: number,
  ): Promise<{ id: number; message: string }> {
    return this.voyagesService.removeVoyageDocument(companyId, id, documentId);
  }
}
