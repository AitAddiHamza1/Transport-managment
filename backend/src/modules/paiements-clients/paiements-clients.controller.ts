import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PaiementsClientsService } from './paiements-clients.service';
import { CreatePaiementClientDto } from './dto/create-paiement-client.dto';
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
  create(@Body() dto: CreatePaiementClientDto) {
    return this.paiementsService.create(dto);
  }

  @Get()
  @RequirePermission('paiements_clients', 'voir')
  @ApiOperation({ summary: 'Liste des règlements clients (paginée, filtrable)' })
  @ApiResponse({ status: 200, description: 'Liste des règlements récupérée avec succès' })
  findAll(@Query() query: QueryPaiementClientDto) {
    return this.paiementsService.findAll(query);
  }

  @Get('stats')
  @RequirePermission('paiements_clients', 'voir')
  @ApiOperation({ summary: 'Statistiques synthétiques des encaissements clients' })
  @ApiResponse({ status: 200, description: 'Statistiques des encaissements calculées' })
  findStats() {
    return this.paiementsService.findStats();
  }

  @Get(':id')
  @RequirePermission('paiements_clients', 'voir')
  @ApiOperation({ summary: 'Détail d’un règlement client par ID' })
  @ApiResponse({ status: 200, description: 'Règlement trouvé' })
  @ApiResponse({ status: 404, description: 'Règlement introuvable' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paiementsService.findOne(id);
  }
}
