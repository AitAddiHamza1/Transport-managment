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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateStockEntreeDto } from './dto/create-stock-entree.dto';
import { QueryStockGasoilDto } from './dto/query-stock-gasoil.dto';
import { UpdateStockEntreeDto } from './dto/update-stock-entree.dto';
import {
  StockGasoilMovementView,
  StockGasoilService,
  StockGasoilStats,
} from './stock-gasoil.service';
import { PaginatedResult } from '../../common/dto/paginated-result';

@ApiTags('Gestion du stock gasoil')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('stock-gasoil')
export class StockGasoilController {
  constructor(private readonly service: StockGasoilService) {}

  @Get()
  @RequirePermission('stock_gasoil', 'voir')
  @ApiOperation({ summary: 'Liste paginée des mouvements de stock gasoil' })
  @ApiResponse({ status: 200, description: 'Liste des mouvements récupérée avec succès' })
  async findAll(
    @CurrentUser('companyId') companyId: number,
    @Query() query: QueryStockGasoilDto,
  ): Promise<PaginatedResult<StockGasoilMovementView>> {
    return this.service.findAll(query, companyId);
  }

  @Get('stats')
  @RequirePermission('stock_gasoil', 'voir')
  @ApiOperation({ summary: 'Statistiques et KPIs du stock gasoil (Stock actuel, PMP, Entrées, Sorties)' })
  @ApiResponse({ status: 200, description: 'Statistiques du stock récupérées avec succès' })
  async findStats(
    @CurrentUser('companyId') companyId: number,
    @Query() query: QueryStockGasoilDto,
  ): Promise<StockGasoilStats> {
    return this.service.findStats(query, companyId);
  }

  @Get(':id')
  @RequirePermission('stock_gasoil', 'voir')
  @ApiOperation({ summary: 'Détails d’un mouvement de stock gasoil' })
  @ApiResponse({ status: 200, description: 'Détails récupérés avec succès' })
  @ApiResponse({ status: 404, description: 'Mouvement introuvable' })
  async findOne(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StockGasoilMovementView> {
    return this.service.findOne(id, companyId);
  }

  @Post('entrees')
  @RequirePermission('stock_gasoil', 'ajouter')
  @ApiOperation({ summary: 'Créer une entrée de stock gasoil (approvisionnement citerne)' })
  @ApiResponse({ status: 201, description: 'Entrée de stock créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async createEntree(
    @CurrentUser('companyId') companyId: number,
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateStockEntreeDto,
  ): Promise<StockGasoilMovementView> {
    return this.service.createEntree(companyId, dto, userId);
  }

  @Patch('entrees/:id')
  @RequirePermission('stock_gasoil', 'modifier')
  @ApiOperation({ summary: 'Mettre à jour une entrée de stock gasoil' })
  @ApiResponse({ status: 200, description: 'Entrée de stock mise à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Entrée introuvable' })
  @ApiResponse({ status: 409, description: 'Modification refusée car produisant un stock négatif' })
  async updateEntree(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockEntreeDto,
  ): Promise<StockGasoilMovementView> {
    return this.service.updateEntree(id, companyId, dto);
  }

  @Delete('entrees/:id')
  @RequirePermission('stock_gasoil', 'supprimer')
  @ApiOperation({ summary: 'Supprimer une entrée de stock gasoil' })
  @ApiResponse({ status: 200, description: 'Entrée supprimée avec succès' })
  @ApiResponse({ status: 404, description: 'Entrée introuvable' })
  @ApiResponse({ status: 409, description: 'Suppression impossible car des sorties en dépendent' })
  async removeEntree(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ idMouvement: number }> {
    return this.service.removeEntree(id, companyId);
  }
}
