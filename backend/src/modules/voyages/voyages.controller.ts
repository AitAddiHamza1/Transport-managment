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
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateVoyageDto } from './dto/create-voyage.dto';
import { UpdateVoyageDto } from './dto/update-voyage.dto';
import { UpdateVoyageStatusDto } from './dto/update-voyage-status.dto';
import { QueryVoyageDto } from './dto/query-voyage.dto';
import { VoyagesService, VoyageStats, VoyageView } from './voyages.service';

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
  async create(@Body() dto: CreateVoyageDto): Promise<VoyageView> {
    return this.voyagesService.create(dto);
  }

  @Get('stats')
  @RequirePermission('voyages', 'voir')
  @ApiOperation({ summary: 'Obtenir les statistiques synthétiques des voyages' })
  @ApiResponse({ status: 200, description: 'Statistiques obtenues' })
  async findStats(): Promise<VoyageStats> {
    return this.voyagesService.findStats();
  }

  @Get()
  @RequirePermission('voyages', 'voir')
  @ApiOperation({ summary: 'Lister les voyages avec pagination, recherche et filtres' })
  @ApiResponse({ status: 200, description: 'Liste des voyages paginée' })
  async findAll(@Query() query: QueryVoyageDto) {
    return this.voyagesService.findAll(query);
  }

  @Get(':id')
  @RequirePermission('voyages', 'voir')
  @ApiOperation({ summary: 'Consulter les détails d’un voyage par son identifiant' })
  @ApiResponse({ status: 200, description: 'Détails du voyage' })
  @ApiResponse({ status: 404, description: 'Voyage introuvable' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<VoyageView> {
    return this.voyagesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('voyages', 'modifier')
  @ApiOperation({ summary: 'Modifier les informations d’un voyage' })
  @ApiResponse({ status: 200, description: 'Voyage mis à jour' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Voyage introuvable' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVoyageDto,
  ): Promise<VoyageView> {
    return this.voyagesService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('voyages', 'modifier')
  @ApiOperation({ summary: 'Changer le statut d’un voyage (Lifecycle transition)' })
  @ApiResponse({ status: 200, description: 'Statut du voyage mis à jour' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Voyage introuvable' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVoyageStatusDto,
  ): Promise<VoyageView> {
    return this.voyagesService.updateStatus(id, dto);
  }

  @Delete(':id')
  @RequirePermission('voyages', 'supprimer')
  @ApiOperation({ summary: 'Supprimer un voyage' })
  @ApiResponse({ status: 200, description: 'Voyage supprimé' })
  @ApiResponse({ status: 404, description: 'Voyage introuvable' })
  @ApiResponse({ status: 409, description: 'Voyage lié à des factures (bloqué)' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ idVoyage: number }> {
    return this.voyagesService.remove(id);
  }
}
