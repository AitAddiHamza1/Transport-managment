import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreancesClientsService } from './creances-clients.service';
import { QueryCreanceClientDto } from './dto/query-creance-client.dto';

@ApiTags('Créances clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('creances-clients')
export class CreancesClientsController {
  constructor(private readonly creancesService: CreancesClientsService) {}

  @Get()
  @RequirePermission('creances_clients', 'voir')
  @ApiOperation({ summary: 'Liste des créances clients (paginée, filtrable)' })
  @ApiResponse({ status: 200, description: 'Liste des créances clients récupérée avec succès' })
  findAll(@Query() query: QueryCreanceClientDto) {
    return this.creancesService.findAll(query);
  }

  @Get('stats')
  @RequirePermission('creances_clients', 'voir')
  @ApiOperation({ summary: 'Statistiques synthétiques des créances clients' })
  @ApiResponse({ status: 200, description: 'Statistiques synthétiques calculées' })
  findStats() {
    return this.creancesService.findStats();
  }

  @Get(':id')
  @RequirePermission('creances_clients', 'voir')
  @ApiOperation({ summary: 'Détail d’une créance client par ID' })
  @ApiResponse({ status: 200, description: 'Créance client trouvée' })
  @ApiResponse({ status: 404, description: 'Créance introuvable' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.creancesService.findOne(id);
  }
}
