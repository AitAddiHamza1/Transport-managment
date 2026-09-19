import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ChequesLettresChangeService,
  PaymentInstrumentView,
  InstrumentStatsView,
} from './cheques-lettres-change.service';
import { QueryChequesLettresChangeDto } from './dto/query-cheques-lettres-change.dto';
import { UpdateStatutInstrumentDto } from './dto/update-statut-instrument.dto';
import { PaginatedResult } from '../../common/dto/paginated-result';

@ApiTags('Chèques & Lettres de Change')
@ApiBearerAuth()
@Controller('cheques-lettres-change')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChequesLettresChangeController {
  constructor(private readonly service: ChequesLettresChangeService) {}

  @Get('stats')
  @RequirePermission('cheques_lettres_change', 'voir')
  @ApiOperation({ summary: 'Obtenir les statistiques consolidées du suivi bancaire' })
  @ApiResponse({ status: 200, description: 'Statistiques du suivi bancaire' })
  async getStats(
    @CurrentUser('companyId') companyId: number,
    @Query() query: QueryChequesLettresChangeDto,
  ): Promise<InstrumentStatsView> {
    return this.service.findStats(companyId, query);
  }

  @Get()
  @RequirePermission('cheques_lettres_change', 'voir')
  @ApiOperation({ summary: 'Consulter la liste consolidée des chèques et lettres de change' })
  @ApiResponse({ status: 200, description: 'Liste des instruments avec statut bancaire' })
  async findAll(
    @CurrentUser('companyId') companyId: number,
    @Query() query: QueryChequesLettresChangeDto,
  ): Promise<PaginatedResult<PaymentInstrumentView>> {
    return this.service.findAll(companyId, query);
  }

  @Patch('cheques/:id/statut')
  @RequirePermission('cheques_lettres_change', 'modifier')
  @ApiOperation({ summary: 'Mettre à jour le statut bancaire d un chèque' })
  @ApiResponse({ status: 200, description: 'Statut bancaire du chèque mis à jour' })
  async updateStatutCheque(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatutInstrumentDto,
  ): Promise<PaymentInstrumentView> {
    return this.service.updateStatutCheque(companyId, id, dto);
  }

  @Patch('lettres-de-change/:id/statut')
  @RequirePermission('cheques_lettres_change', 'modifier')
  @ApiOperation({ summary: 'Mettre à jour le statut bancaire d une lettre de change' })
  @ApiResponse({ status: 200, description: 'Statut bancaire de la lettre mis à jour' })
  async updateStatutLettre(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatutInstrumentDto,
  ): Promise<PaymentInstrumentView> {
    return this.service.updateStatutLettre(companyId, id, dto);
  }
}
