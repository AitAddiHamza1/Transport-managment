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
import { CreateFournisseurDto } from './dto/create-fournisseur.dto';
import { UpdateFournisseurDto } from './dto/update-fournisseur.dto';
import { UpdateFournisseurStatusDto } from './dto/update-fournisseur-status.dto';
import { QueryFournisseurDto } from './dto/query-fournisseur.dto';
import { FournisseursService, FournisseurStats, FournisseurView } from './fournisseurs.service';

@ApiTags('Fournisseurs')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('fournisseurs')
export class FournisseursController {
  constructor(private readonly fournisseursService: FournisseursService) {}

  @Post()
  @RequirePermission('fournisseurs', 'ajouter')
  @ApiOperation({ summary: 'Créer un nouveau fournisseur' })
  @ApiResponse({ status: 201, description: 'Fournisseur créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 409, description: 'Conflit d’identifiant unique (nom ou ICE)' })
  async create(@Body() dto: CreateFournisseurDto): Promise<FournisseurView> {
    return this.fournisseursService.create(dto);
  }

  @Get('stats')
  @RequirePermission('fournisseurs', 'voir')
  @ApiOperation({ summary: 'Obtenir les statistiques synthétiques des fournisseurs' })
  @ApiResponse({ status: 200, description: 'Statistiques obtenues' })
  async findStats(): Promise<FournisseurStats> {
    return this.fournisseursService.findStats();
  }

  @Get()
  @RequirePermission('fournisseurs', 'voir')
  @ApiOperation({ summary: 'Lister les fournisseurs avec pagination, recherche et filtres' })
  @ApiResponse({ status: 200, description: 'Liste des fournisseurs paginée' })
  async findAll(@Query() query: QueryFournisseurDto) {
    return this.fournisseursService.findAll(query);
  }

  @Get(':id')
  @RequirePermission('fournisseurs', 'voir')
  @ApiOperation({ summary: 'Consulter les détails d’un fournisseur par son identifiant' })
  @ApiResponse({ status: 200, description: 'Détails du fournisseur' })
  @ApiResponse({ status: 404, description: 'Fournisseur introuvable' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<FournisseurView> {
    return this.fournisseursService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('fournisseurs', 'modifier')
  @ApiOperation({ summary: 'Modifier les informations d’un fournisseur' })
  @ApiResponse({ status: 200, description: 'Fournisseur mis à jour' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Fournisseur introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit d’identifiant unique (nom ou ICE)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFournisseurDto,
  ): Promise<FournisseurView> {
    return this.fournisseursService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('fournisseurs', 'modifier')
  @ApiOperation({ summary: 'Changer le statut d’un fournisseur' })
  @ApiResponse({ status: 200, description: 'Statut du fournisseur mis à jour' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Fournisseur introuvable' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFournisseurStatusDto,
  ): Promise<FournisseurView> {
    return this.fournisseursService.updateStatus(id, dto);
  }

  @Delete(':id')
  @RequirePermission('fournisseurs', 'supprimer')
  @ApiOperation({ summary: 'Supprimer un fournisseur' })
  @ApiResponse({ status: 200, description: 'Fournisseur supprimé' })
  @ApiResponse({ status: 404, description: 'Fournisseur introuvable' })
  @ApiResponse({ status: 409, description: 'Fournisseur lié à des dettes ou paiements (bloqué)' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ id: number }> {
    return this.fournisseursService.remove(id);
  }
}
