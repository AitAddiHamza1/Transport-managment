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
import { CreateConducteurDto } from './dto/create-conducteur.dto';
import { UpdateConducteurDto } from './dto/update-conducteur.dto';
import { UpdateConducteurStatusDto } from './dto/update-conducteur-status.dto';
import { QueryConducteurDto } from './dto/query-conducteur.dto';
import { ConducteursService, ConducteurStats, ConducteurView } from './conducteurs.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/auth-user.type';
import { canAll } from '../../common/permissions';

@ApiTags('Conducteurs')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('conducteurs')
export class ConducteursController {
  constructor(private readonly conducteursService: ConducteursService) {}

  @Post()
  @RequirePermission('conducteurs', 'ajouter')
  @ApiOperation({ summary: 'Créer un nouveau conducteur' })
  @ApiResponse({ status: 201, description: 'Conducteur créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async create(
    @Body() dto: CreateConducteurDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ConducteurView> {
    const hasEmployesVoir = canAll(actor.permissions, Boolean(actor.isAdminGeneral), [
      { module: 'employes', action: 'voir' },
    ]);
    return this.conducteursService.create(dto, hasEmployesVoir);
  }

  @Get('stats')
  @RequirePermission('conducteurs', 'voir')
  @ApiOperation({ summary: 'Obtenir les statistiques synthétiques des conducteurs' })
  @ApiResponse({ status: 200, description: 'Statistiques obtenues' })
  async findStats(): Promise<ConducteurStats> {
    return this.conducteursService.findStats();
  }

  @Get()
  @RequirePermission('conducteurs', 'voir')
  @ApiOperation({ summary: 'Lister les conducteurs avec pagination, recherche et filtres' })
  @ApiResponse({ status: 200, description: 'Liste des conducteurs paginée' })
  async findAll(@Query() query: QueryConducteurDto, @CurrentUser() actor: AuthenticatedUser) {
    const hasEmployesVoir = canAll(actor.permissions, Boolean(actor.isAdminGeneral), [
      { module: 'employes', action: 'voir' },
    ]);
    return this.conducteursService.findAll(query, hasEmployesVoir);
  }

  @Get(':id')
  @RequirePermission('conducteurs', 'voir')
  @ApiOperation({ summary: 'Consulter les détails d’un conducteur par son identifiant' })
  @ApiResponse({ status: 200, description: 'Détails du conducteur' })
  @ApiResponse({ status: 404, description: 'Conducteur introuvable' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ConducteurView> {
    const hasEmployesVoir = canAll(actor.permissions, Boolean(actor.isAdminGeneral), [
      { module: 'employes', action: 'voir' },
    ]);
    return this.conducteursService.findOne(id, hasEmployesVoir);
  }

  @Patch(':id')
  @RequirePermission('conducteurs', 'modifier')
  @ApiOperation({ summary: 'Modifier les informations d’un conducteur' })
  @ApiResponse({ status: 200, description: 'Conducteur mis à jour' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Conducteur introuvable' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConducteurDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ConducteurView> {
    const hasEmployesVoir = canAll(actor.permissions, Boolean(actor.isAdminGeneral), [
      { module: 'employes', action: 'voir' },
    ]);
    return this.conducteursService.update(id, dto, hasEmployesVoir);
  }

  @Patch(':id/status')
  @RequirePermission('conducteurs', 'modifier')
  @ApiOperation({ summary: 'Changer le statut opérationnel d’un conducteur' })
  @ApiResponse({ status: 200, description: 'Statut du conducteur mis à jour' })
  @ApiResponse({ status: 400, description: 'Changement de statut invalide' })
  @ApiResponse({ status: 404, description: 'Conducteur introuvable' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConducteurStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ConducteurView> {
    const hasEmployesVoir = canAll(actor.permissions, Boolean(actor.isAdminGeneral), [
      { module: 'employes', action: 'voir' },
    ]);
    return this.conducteursService.updateStatus(id, dto, hasEmployesVoir);
  }

  @Delete(':id')
  @RequirePermission('conducteurs', 'supprimer')
  @ApiOperation({ summary: 'Supprimer un conducteur' })
  @ApiResponse({ status: 200, description: 'Conducteur supprimé' })
  @ApiResponse({ status: 404, description: 'Conducteur introuvable' })
  @ApiResponse({
    status: 409,
    description: 'Conducteur lié à des données opérationnelles (bloqué)',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ id: number }> {
    return this.conducteursService.remove(id);
  }
}
