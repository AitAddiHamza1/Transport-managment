import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import {
  GestionPaiementsService,
  FinancialMovementView,
  GestionPaiementsStats,
} from './gestion-paiements.service';
import {
  QueryGestionPaiementsDto,
  GestionPaiementsSourceType,
} from './dto/query-gestion-paiements.dto';
import { PaginatedResult } from '../../common/dto/paginated-result';

@ApiTags('Gestion des paiements')
@Controller('gestion-paiements')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GestionPaiementsController {
  constructor(private readonly service: GestionPaiementsService) {}

  @Get('stats')
  @RequirePermission('gestion_paiements', 'voir')
  async getStats(
    @Query() query: QueryGestionPaiementsDto,
    @Req() req: any,
  ): Promise<GestionPaiementsStats> {
    const userPermissions = req.user?.permissions;
    const userRole = req.user?.role;
    const isAdminGeneral = req.user?.isAdminGeneral;
    return this.service.findStats(query, userPermissions, userRole, isAdminGeneral);
  }

  @Get()
  @RequirePermission('gestion_paiements', 'voir')
  async findAll(
    @Query() query: QueryGestionPaiementsDto,
    @Req() req: any,
  ): Promise<PaginatedResult<FinancialMovementView>> {
    const userPermissions = req.user?.permissions;
    const userRole = req.user?.role;
    const isAdminGeneral = req.user?.isAdminGeneral;
    return this.service.findAll(query, userPermissions, userRole, isAdminGeneral);
  }

  @Get(':sourceType/:sourceId')
  @RequirePermission('gestion_paiements', 'voir')
  async findOne(
    @Param('sourceType') sourceType: GestionPaiementsSourceType,
    @Param('sourceId', ParseIntPipe) sourceId: number,
    @Req() req: any,
  ): Promise<FinancialMovementView> {
    const userPermissions = req.user?.permissions;
    const userRole = req.user?.role;
    const isAdminGeneral = req.user?.isAdminGeneral;
    return this.service.findOne(sourceType, sourceId, userPermissions, userRole, isAdminGeneral);
  }
}
