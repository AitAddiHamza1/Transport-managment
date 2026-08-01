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
import { CreateVehiculeDto } from './dto/create-vehicule.dto';
import { UpdateVehiculeDto } from './dto/update-vehicule.dto';
import { UpdateVehiculeStatusDto } from './dto/update-vehicule-status.dto';
import { QueryVehiculeDto } from './dto/query-vehicule.dto';
import { VehiculesService, VehiculeStats, VehiculeView } from './vehicules.service';

@ApiTags('Véhicules')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('vehicules')
export class VehiculesController {
  constructor(private readonly vehiculesService: VehiculesService) {}

  @Post()
  @RequirePermission('vehicules', 'ajouter')
  @ApiOperation({ summary: 'Créer un nouveau véhicule' })
  @ApiResponse({ status: 201, description: 'Véhicule créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 409, description: 'Immatriculation ou châssis déjà utilisé' })
  async create(@Body() dto: CreateVehiculeDto): Promise<VehiculeView> {
    return this.vehiculesService.create(dto);
  }

  @Get('stats')
  @RequirePermission('vehicules', 'voir')
  @ApiOperation({ summary: 'Obtenir les statistiques synthétiques de la flotte de véhicules' })
  @ApiResponse({ status: 200, description: 'Statistiques obtenues' })
  async findStats(): Promise<VehiculeStats> {
    return this.vehiculesService.findStats();
  }

  @Get()
  @RequirePermission('vehicules', 'voir')
  @ApiOperation({ summary: 'Lister les véhicules avec pagination, recherche et filtres' })
  @ApiResponse({ status: 200, description: 'Liste des véhicules paginée' })
  async findAll(@Query() query: QueryVehiculeDto) {
    return this.vehiculesService.findAll(query);
  }

  @Get(':id')
  @RequirePermission('vehicules', 'voir')
  @ApiOperation({ summary: 'Consulter les détails d’un véhicule par son identifiant' })
  @ApiResponse({ status: 200, description: 'Détails du véhicule' })
  @ApiResponse({ status: 404, description: 'Véhicule introuvable' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<VehiculeView> {
    return this.vehiculesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('vehicules', 'modifier')
  @ApiOperation({ summary: 'Modifier les informations d’un véhicule' })
  @ApiResponse({ status: 200, description: 'Véhicule mis à jour' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Véhicule introuvable' })
  @ApiResponse({ status: 409, description: 'Immatriculation ou châssis déjà utilisé' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVehiculeDto,
  ): Promise<VehiculeView> {
    return this.vehiculesService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('vehicules', 'modifier')
  @ApiOperation({ summary: 'Changer le statut opérationnel d’un véhicule' })
  @ApiResponse({ status: 200, description: 'Statut du véhicule mis à jour' })
  @ApiResponse({ status: 400, description: 'Changement de statut invalide' })
  @ApiResponse({ status: 404, description: 'Véhicule introuvable' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVehiculeStatusDto,
  ): Promise<VehiculeView> {
    return this.vehiculesService.updateStatus(id, dto);
  }

  @Delete(':id')
  @RequirePermission('vehicules', 'supprimer')
  @ApiOperation({ summary: 'Supprimer un véhicule' })
  @ApiResponse({ status: 200, description: 'Véhicule supprimé' })
  @ApiResponse({ status: 404, description: 'Véhicule introuvable' })
  @ApiResponse({ status: 409, description: 'Véhicule lié à des données opérationnelles (bloqué)' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ id: number }> {
    return this.vehiculesService.remove(id);
  }
}
