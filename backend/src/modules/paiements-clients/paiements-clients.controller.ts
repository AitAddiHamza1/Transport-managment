import {
  Body,
  Controller,
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
import { PaiementsClientsService } from './paiements-clients.service';
import { CreatePaiementClientDto } from './dto/create-paiement-client.dto';
import { UpdatePaiementClientDto } from './dto/update-paiement-client.dto';
import { CancelPaiementClientDto } from './dto/cancel-paiement-client.dto';
import { QueryPaiementClientDto } from './dto/query-paiement-client.dto';

@ApiTags('Paiements clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('paiements-clients')
export class PaiementsClientsController {
  constructor(private readonly paiementsService: PaiementsClientsService) {}

  @Post()
  @RequirePermission('paiements_clients', 'ajouter')
  @ApiOperation({ summary: 'Enregistrer un nouveau règlement client' })
  @ApiResponse({ status: 201, description: 'Règlement enregistré avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides ou facture annulée' })
  @ApiResponse({ status: 404, description: 'Facture introuvable' })
  @ApiResponse({
    status: 409,
    description: 'Dépassement du solde de la créance ou créance déjà réglée (Conflict)',
  })
  create(
    @CurrentUser('companyId') companyId: number,
    @CurrentUser('sub') userId: number,
    @Body() dto: CreatePaiementClientDto,
  ) {
    return this.paiementsService.create(companyId, dto, userId);
  }

  @Get()
  @RequirePermission('paiements_clients', 'voir')
  @ApiOperation({ summary: 'Liste des règlements clients (paginée, filtrable)' })
  @ApiResponse({ status: 200, description: 'Liste des règlements récupérée avec succès' })
  findAll(@CurrentUser('companyId') companyId: number, @Query() query: QueryPaiementClientDto) {
    return this.paiementsService.findAll(companyId, query);
  }

  @Get('stats')
  @RequirePermission('paiements_clients', 'voir')
  @ApiOperation({ summary: 'Statistiques synthétiques des encaissements clients' })
  @ApiResponse({ status: 200, description: 'Statistiques des encaissements calculées' })
  findStats(@CurrentUser('companyId') companyId: number, @Query() query: QueryPaiementClientDto) {
    return this.paiementsService.findStats(companyId, query);
  }

  @Get(':id')
  @RequirePermission('paiements_clients', 'voir')
  @ApiOperation({ summary: 'Détail d’un règlement client par ID' })
  @ApiResponse({ status: 200, description: 'Règlement trouvé' })
  @ApiResponse({ status: 404, description: 'Règlement introuvable' })
  findOne(@CurrentUser('companyId') companyId: number, @Param('id', ParseIntPipe) id: number) {
    return this.paiementsService.findOne(id, companyId);
  }

  @Patch(':id')
  @RequirePermission('paiements_clients', 'modifier')
  @ApiOperation({ summary: 'Modifier un règlement client existant' })
  @ApiResponse({ status: 200, description: 'Règlement modifié avec succès' })
  @ApiResponse({ status: 400, description: 'Données de modification invalides' })
  @ApiResponse({ status: 404, description: 'Règlement introuvable' })
  @ApiResponse({
    status: 409,
    description: 'Statut bancaire verrouillé ou solde dépassé (Conflict)',
  })
  update(
    @CurrentUser('companyId') companyId: number,
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaiementClientDto,
  ) {
    return this.paiementsService.update(id, dto, companyId, userId);
  }

  @Post(':id/annuler')
  @RequirePermission('paiements_clients', 'supprimer')
  @ApiOperation({ summary: 'Annuler un règlement client (annulation logique conservant l’historique)' })
  @ApiResponse({ status: 200, description: 'Règlement annulé avec succès' })
  @ApiResponse({ status: 400, description: 'Motif d’annulation manquant' })
  @ApiResponse({ status: 404, description: 'Règlement introuvable' })
  @ApiResponse({ status: 409, description: 'Déjà annulé ou instrument déjà déposé/encaissé' })
  cancel(
    @CurrentUser('companyId') companyId: number,
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelPaiementClientDto,
  ) {
    return this.paiementsService.cancel(id, dto, companyId, userId);
  }
}
