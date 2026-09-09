import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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
  findAll(@Query() query: QueryCreanceClientDto, @CurrentUser('companyId') companyId: number) {
    return this.creancesService.findAll(companyId, query);
  }

  @Get('stats')
  @RequirePermission('creances_clients', 'voir')
  @ApiOperation({ summary: 'Statistiques synthétiques des créances clients' })
  @ApiResponse({ status: 200, description: 'Statistiques synthétiques calculées' })
  findStats(@Query() query: QueryCreanceClientDto, @CurrentUser('companyId') companyId: number) {
    return this.creancesService.findStats(companyId, query);
  }

  @Get(':id')
  @RequirePermission('creances_clients', 'voir')
  @ApiOperation({ summary: 'Détail d’une créance client par ID' })
  @ApiResponse({ status: 200, description: 'Créance client trouvée' })
  @ApiResponse({ status: 404, description: 'Créance introuvable' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('companyId') companyId: number) {
    return this.creancesService.findOne(id, companyId);
  }
}
