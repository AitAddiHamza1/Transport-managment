import {
  BadRequestException,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateMaintenanceRuleDto } from './dto/create-maintenance-rule.dto';
import { UpdateMaintenanceRuleDto } from './dto/update-maintenance-rule.dto';
import { CreateMaintenanceInterventionDto } from './dto/create-maintenance-intervention.dto';
import { UpdateMaintenanceInterventionDto } from './dto/update-maintenance-intervention.dto';
import { QueryCarnetEntretienDto } from './dto/query-carnet-entretien.dto';
import {
  CarnetEntretienService,
  MaintenanceInterventionView,
  MaintenanceRuleView,
  VehicleSituationView,
} from './carnet-entretien.service';

@ApiTags('Carnet d’entretien')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('carnet-entretien')
export class CarnetEntretienController {
  constructor(private readonly service: CarnetEntretienService) {}

  // -------------------------------------------------------------------
  // Rules Endpoints
  // -------------------------------------------------------------------
  @Get('rules')
  @RequirePermission('carnet_entretien', 'voir')
  @ApiOperation({ summary: 'Lister toutes les règles d’entretien de l’entreprise' })
  @ApiResponse({ status: 200, description: 'Liste des règles d’entretien' })
  async findAllRules(
    @CurrentUser('companyId') companyId: number,
  ): Promise<MaintenanceRuleView[]> {
    return this.service.findAllRules(companyId);
  }

  @Post('rules')
  @RequirePermission('carnet_entretien', 'ajouter')
  @ApiOperation({ summary: 'Créer une nouvelle règle d’entretien' })
  @ApiResponse({ status: 201, description: 'Règle créée avec succès' })
  async createRule(
    @CurrentUser('companyId') companyId: number,
    @Body() dto: CreateMaintenanceRuleDto,
  ): Promise<MaintenanceRuleView> {
    return this.service.createRule(companyId, dto);
  }

  @Patch('rules/:id')
  @RequirePermission('carnet_entretien', 'modifier')
  @ApiOperation({ summary: 'Modifier une règle d’entretien' })
  @ApiResponse({ status: 200, description: 'Règle mise à jour' })
  async updateRule(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaintenanceRuleDto,
  ): Promise<MaintenanceRuleView> {
    return this.service.updateRule(companyId, id, dto);
  }

  @Delete('rules/:id')
  @RequirePermission('carnet_entretien', 'supprimer')
  @ApiOperation({ summary: 'Supprimer une règle d’entretien' })
  @ApiResponse({ status: 200, description: 'Règle supprimée' })
  async removeRule(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ id: number }> {
    return this.service.removeRule(companyId, id);
  }

  // -------------------------------------------------------------------
  // Vehicle Maintenance Situation Endpoint
  // -------------------------------------------------------------------
  @Get('vehicules/:immatriculation')
  @RequirePermission('carnet_entretien', 'voir')
  @ApiOperation({ summary: 'Obtenir la situation technique & d’échéances d’un véhicule' })
  @ApiResponse({ status: 200, description: 'Situation du véhicule' })
  async getVehicleSituation(
    @CurrentUser('companyId') companyId: number,
    @Param('immatriculation') immatriculation: string,
  ): Promise<VehicleSituationView> {
    return this.service.getVehicleSituation(companyId, immatriculation);
  }

  // -------------------------------------------------------------------
  // Interventions / Carnet Endpoints
  // -------------------------------------------------------------------
  @Get()
  @RequirePermission('carnet_entretien', 'voir')
  @ApiOperation({ summary: 'Lister les interventions du carnet d’entretien avec recherche & filtres' })
  @ApiResponse({ status: 200, description: 'Liste des interventions paginée' })
  async findAllInterventions(
    @CurrentUser('companyId') companyId: number,
    @Query() query: QueryCarnetEntretienDto,
  ) {
    return this.service.findAllInterventions(companyId, query);
  }

  @Get(':id')
  @RequirePermission('carnet_entretien', 'voir')
  @ApiOperation({ summary: 'Consulter le détail d’une intervention d’entretien' })
  @ApiResponse({ status: 200, description: 'Détails de l’intervention' })
  async findOneIntervention(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MaintenanceInterventionView> {
    return this.service.findOneIntervention(companyId, id);
  }

  @Post()
  @RequirePermission('carnet_entretien', 'ajouter')
  @ApiOperation({ summary: 'Enregistrer une nouvelle intervention d’entretien' })
  @ApiResponse({ status: 201, description: 'Intervention créée' })
  async createIntervention(
    @CurrentUser('companyId') _companyId: number,
    @Body() _dto: CreateMaintenanceInterventionDto,
  ): Promise<MaintenanceInterventionView> {
    throw new BadRequestException(
      "La création autonome d'interventions est désactivée. Veuillez enregistrer l'intervention via le module Charges Véhicules.",
    );
  }

  @Patch(':id')
  @RequirePermission('carnet_entretien', 'modifier')
  @ApiOperation({ summary: 'Modifier une intervention d’entretien' })
  @ApiResponse({ status: 200, description: 'Intervention mise à jour' })
  async updateIntervention(
    @CurrentUser('companyId') _companyId: number,
    @Param('id', ParseIntPipe) _id: number,
    @Body() _dto: UpdateMaintenanceInterventionDto,
  ): Promise<MaintenanceInterventionView> {
    throw new BadRequestException(
      "La modification autonome d'interventions est désactivée. Veuillez modifier la charge véhicule correspondante via le module Charges Véhicules.",
    );
  }

  @Delete(':id')
  @RequirePermission('carnet_entretien', 'supprimer')
  @ApiOperation({ summary: 'Supprimer une intervention d’entretien' })
  @ApiResponse({ status: 200, description: 'Intervention supprimée' })
  async removeIntervention(
    @CurrentUser('companyId') _companyId: number,
    @Param('id', ParseIntPipe) _id: number,
  ): Promise<{ id: number }> {
    throw new BadRequestException(
      "La suppression autonome d'interventions est désactivée. Veuillez supprimer la charge véhicule correspondante via le module Charges Véhicules.",
    );
  }
}
