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
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { FacturesService, FactureStats, FactureView } from './factures.service';
import { CreateFactureDto } from './dto/create-facture.dto';
import { QueryFactureDto } from './dto/query-facture.dto';
import { UpdateFactureDto } from './dto/update-facture.dto';
import { PaginatedResult } from '../../common/dto/paginated-result';

@ApiTags('Factures')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('factures')
export class FacturesController {
  constructor(private readonly service: FacturesService) {}

  @Post()
  @RequirePermission('factures', 'ajouter')
  @ApiOperation({ summary: 'Créer une nouvelle facture' })
  @ApiResponse({ status: 201, description: 'Facture créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Voyage introuvable' })
  @ApiResponse({ status: 409, description: 'Numéro de facture déjà utilisé' })
  async create(@Body() dto: CreateFactureDto, @Req() req: any): Promise<FactureView> {
    const userId = req.user?.id;
    return this.service.create(dto, userId);
  }

  @Get()
  @RequirePermission('factures', 'voir')
  @ApiOperation({ summary: 'Liste paginée des factures avec recherche et filtres' })
  @ApiResponse({ status: 200, description: 'Liste paginée récupérée avec succès' })
  async findAll(@Query() query: QueryFactureDto): Promise<PaginatedResult<FactureView>> {
    return this.service.findAll(query);
  }

  @Get('stats')
  @RequirePermission('factures', 'voir')
  @ApiOperation({ summary: 'Statistiques financières globales des factures' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async findStats(): Promise<FactureStats> {
    return this.service.findStats();
  }

  @Get(':id')
  @RequirePermission('factures', 'voir')
  @ApiOperation({ summary: 'Détails d’une facture' })
  @ApiResponse({ status: 200, description: 'Détails récupérés avec succès' })
  @ApiResponse({ status: 404, description: 'Facture introuvable' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<FactureView> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('factures', 'modifier')
  @ApiOperation({ summary: 'Mettre à jour une facture' })
  @ApiResponse({ status: 200, description: 'Facture mise à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Facture introuvable' })
  @ApiResponse({ status: 409, description: 'Numéro de facture déjà utilisé' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFactureDto,
  ): Promise<FactureView> {
    return this.service.update(id, dto);
  }

  @Get(':id/pdf')
  @RequirePermission('factures', 'voir')
  @ApiOperation({ summary: 'Télécharger la facture sous format PDF' })
  @ApiResponse({ status: 200, description: 'Fichier PDF généré avec succès' })
  @ApiResponse({ status: 400, description: 'Identifiant invalide' })
  @ApiResponse({ status: 404, description: 'Facture introuvable' })
  async downloadPdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response): Promise<void> {
    const { buffer, filename } = await this.service.generatePdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'private, no-store',
    });

    res.end(buffer);
  }

  @Delete(':id')
  @RequirePermission('factures', 'supprimer')
  @ApiOperation({ summary: 'Annuler / supprimer une facture (soft delete)' })
  @ApiResponse({ status: 200, description: 'Facture annulée avec succès' })
  @ApiResponse({ status: 404, description: 'Facture introuvable' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ id: number; message: string }> {
    return this.service.remove(id);
  }
}
