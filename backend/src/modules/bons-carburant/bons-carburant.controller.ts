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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  BonsCarburantService,
  BonCarburantStats,
  BonCarburantView,
} from './bons-carburant.service';
import { CreateBonCarburantDto } from './dto/create-bon-carburant.dto';
import { QueryBonCarburantDto } from './dto/query-bon-carburant.dto';
import { UpdateBonCarburantDto } from './dto/update-bon-carburant.dto';
import { PaginatedResult } from '../../common/dto/paginated-result';

@ApiTags('Bons Carburant / Consommation Gasoil')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller(['bons-carburant', 'consommations-gasoil'])
export class BonsCarburantController {
  constructor(private readonly service: BonsCarburantService) {}

  @Post()
  @RequirePermission('bons_carburant', 'ajouter')
  @ApiOperation({ summary: 'Créer un bon de carburant / consommation gasoil' })
  @ApiResponse({ status: 201, description: 'Bon de carburant créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Véhicule introuvable' })
  async create(@Body() dto: CreateBonCarburantDto): Promise<BonCarburantView> {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('bons_carburant', 'voir')
  @ApiOperation({ summary: 'Liste paginée des bons de carburant avec recherche et filtres' })
  @ApiResponse({ status: 200, description: 'Liste paginée récupérée avec succès' })
  async findAll(@Query() query: QueryBonCarburantDto): Promise<PaginatedResult<BonCarburantView>> {
    return this.service.findAll(query);
  }

  @Get('stats')
  @RequirePermission('bons_carburant', 'voir')
  @ApiOperation({ summary: 'Statistiques globales de consommation gasoil' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async findStats(): Promise<BonCarburantStats> {
    return this.service.findStats();
  }

  @Get(':id')
  @RequirePermission('bons_carburant', 'voir')
  @ApiOperation({ summary: 'Détails d’un bon de carburant' })
  @ApiResponse({ status: 200, description: 'Détails récupérés avec succès' })
  @ApiResponse({ status: 404, description: 'Bon introuvable' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<BonCarburantView> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('bons_carburant', 'modifier')
  @ApiOperation({ summary: 'Mettre à jour un bon de carburant' })
  @ApiResponse({ status: 200, description: 'Bon mis à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Bon introuvable' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBonCarburantDto,
  ): Promise<BonCarburantView> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('bons_carburant', 'supprimer')
  @ApiOperation({ summary: 'Supprimer un bon de carburant' })
  @ApiResponse({ status: 200, description: 'Bon supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Bon introuvable' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ idBon: number }> {
    return this.service.remove(id);
  }
}
