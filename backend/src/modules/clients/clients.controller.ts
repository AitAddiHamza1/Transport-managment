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
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateClientStatusDto } from './dto/update-client-status.dto';
import { QueryClientDto } from './dto/query-client.dto';
import { ClientsService, ClientStats, ClientView } from './clients.service';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @RequirePermission('clients', 'ajouter')
  @ApiOperation({ summary: 'Créer un nouveau client' })
  @ApiResponse({ status: 201, description: 'Client créé avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 409, description: 'Conflit d’identifiant unique (ICE)' })
  async create(@Body() dto: CreateClientDto): Promise<ClientView> {
    return this.clientsService.create(dto);
  }

  @Get('stats')
  @RequirePermission('clients', 'voir')
  @ApiOperation({ summary: 'Obtenir les statistiques synthétiques des clients' })
  @ApiResponse({ status: 200, description: 'Statistiques obtenues' })
  async findStats(): Promise<ClientStats> {
    return this.clientsService.findStats();
  }

  @Get()
  @RequirePermission('clients', 'voir')
  @ApiOperation({ summary: 'Lister les clients avec pagination, recherche et filtres' })
  @ApiResponse({ status: 200, description: 'Liste des clients paginée' })
  async findAll(@Query() query: QueryClientDto) {
    return this.clientsService.findAll(query);
  }

  @Get(':id')
  @RequirePermission('clients', 'voir')
  @ApiOperation({ summary: 'Consulter les détails d’un client par son identifiant' })
  @ApiResponse({ status: 200, description: 'Détails du client' })
  @ApiResponse({ status: 404, description: 'Client introuvable' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ClientView> {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('clients', 'modifier')
  @ApiOperation({ summary: 'Modifier les informations d’un client' })
  @ApiResponse({ status: 200, description: 'Client mis à jour' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Client introuvable' })
  @ApiResponse({ status: 409, description: 'Conflit d’identifiant unique (ICE)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientDto,
  ): Promise<ClientView> {
    return this.clientsService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('clients', 'modifier')
  @ApiOperation({ summary: 'Changer le statut d’un client' })
  @ApiResponse({ status: 200, description: 'Statut du client mis à jour' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Client introuvable' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientStatusDto,
  ): Promise<ClientView> {
    return this.clientsService.updateStatus(id, dto);
  }

  @Delete(':id')
  @RequirePermission('clients', 'supprimer')
  @ApiOperation({ summary: 'Supprimer un client' })
  @ApiResponse({ status: 200, description: 'Client supprimé' })
  @ApiResponse({ status: 404, description: 'Client introuvable' })
  @ApiResponse({ status: 409, description: 'Client lié à des voyages ou factures (bloqué)' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ id: number }> {
    return this.clientsService.remove(id);
  }
}
