import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateDepenseVehiculeDto } from './dto/create-depense-vehicule.dto';
import { UpdateDepenseVehiculeDto } from './dto/update-depense-vehicule.dto';
import { QueryDepenseVehiculeDto } from './dto/query-depense-vehicule.dto';
import {
  DepensesVehiculesService,
  DepenseVehiculeStats,
  DepenseVehiculeView,
} from './depenses-vehicules.service';

@ApiTags('Dépenses véhicules')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('depenses-vehicules')
export class DepensesVehiculesController {
  constructor(private readonly service: DepensesVehiculesService) {}

  @Post()
  @RequirePermission('depenses_vehicules', 'ajouter')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Créer une nouvelle dépense véhicule avec un reçu/facture optionnel' })
  @ApiResponse({ status: 201, description: 'Dépense créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides ou fichier non autorisé' })
  @ApiResponse({ status: 404, description: 'Véhicule introuvable' })
  async create(
    @Body() dto: CreateDepenseVehiculeDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<DepenseVehiculeView> {
    return this.service.create(dto, file);
  }

  @Post(':id/recu')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('depenses_vehicules', 'modifier')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Téléverser ou remplacer le reçu/facture d’une dépense véhicule' })
  @ApiResponse({ status: 200, description: 'Reçu téléversé avec succès' })
  @ApiResponse({ status: 400, description: 'Fichier invalide ou supérieur à 5 Mo' })
  @ApiResponse({ status: 404, description: 'Dépense introuvable' })
  async uploadReceipt(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<DepenseVehiculeView> {
    return this.service.uploadReceipt(id, file);
  }

  @Get(':id/recu')
  @RequirePermission('depenses_vehicules', 'voir')
  @ApiOperation({ summary: 'Consulter / afficher le reçu ou la facture d’une dépense' })
  @ApiResponse({ status: 200, description: 'Fichier affiché (inline stream)' })
  @ApiResponse({ status: 404, description: 'Dépense ou reçu introuvable' })
  async getReceiptStream(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const { physicalPath, filename, mimeType } = await this.service.getReceiptFileStream(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    fs.createReadStream(physicalPath).pipe(res);
  }

  @Get(':id/recu/download')
  @RequirePermission('depenses_vehicules', 'voir')
  @ApiOperation({ summary: 'Télécharger le reçu ou la facture d’une dépense' })
  @ApiResponse({ status: 200, description: 'Fichier téléchargé (attachment stream)' })
  @ApiResponse({ status: 404, description: 'Dépense ou reçu introuvable' })
  async downloadReceipt(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const { physicalPath, filename, mimeType } = await this.service.getReceiptFileStream(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(physicalPath).pipe(res);
  }

  @Delete(':id/recu')
  @RequirePermission('depenses_vehicules', 'modifier')
  @ApiOperation({ summary: 'Supprimer le reçu joint d’une dépense véhicule' })
  @ApiResponse({ status: 200, description: 'Reçu supprimé' })
  @ApiResponse({ status: 404, description: 'Dépense introuvable' })
  async deleteReceipt(@Param('id', ParseIntPipe) id: number): Promise<DepenseVehiculeView> {
    return this.service.deleteReceipt(id);
  }

  @Get('stats')
  @RequirePermission('depenses_vehicules', 'voir')
  @ApiOperation({ summary: 'Obtenir les statistiques synthétiques des dépenses véhicules' })
  @ApiResponse({ status: 200, description: 'Statistiques obtenues' })
  async findStats(): Promise<DepenseVehiculeStats> {
    return this.service.findStats();
  }

  @Get()
  @RequirePermission('depenses_vehicules', 'voir')
  @ApiOperation({ summary: 'Lister les dépenses véhicules avec pagination, recherche et filtres' })
  @ApiResponse({ status: 200, description: 'Liste des dépenses paginée' })
  async findAll(@Query() query: QueryDepenseVehiculeDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermission('depenses_vehicules', 'voir')
  @ApiOperation({ summary: 'Consulter les détails d’une dépense véhicule par son identifiant' })
  @ApiResponse({ status: 200, description: 'Détails de la dépense' })
  @ApiResponse({ status: 404, description: 'Dépense introuvable' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<DepenseVehiculeView> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('depenses_vehicules', 'modifier')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Modifier les informations d’une dépense véhicule' })
  @ApiResponse({ status: 200, description: 'Dépense mise à jour' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Dépense ou véhicule introuvable' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepenseVehiculeDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<DepenseVehiculeView> {
    return this.service.update(id, dto, file);
  }

  @Delete(':id')
  @RequirePermission('depenses_vehicules', 'supprimer')
  @ApiOperation({ summary: 'Supprimer une dépense véhicule et son reçu joint' })
  @ApiResponse({ status: 200, description: 'Dépense supprimée' })
  @ApiResponse({ status: 404, description: 'Dépense introuvable' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ idDepense: number }> {
    return this.service.remove(id);
  }
}
