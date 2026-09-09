import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  PaiementsFournisseursService,
  PaiementFournisseurGlobalView,
  PaiementFournisseurStats,
} from './paiements-fournisseurs.service';
import { CreatePaiementFournisseurDto } from './dto/create-paiement-fournisseur.dto';
import { CancelPaiementFournisseurDto } from './dto/cancel-paiement-fournisseur.dto';
import { QueryPaiementFournisseurDto } from './dto/query-paiement-fournisseur.dto';
import { DetteFournisseurView } from '../dettes-fournisseurs/dettes-fournisseurs.service';
import { PaginatedResult } from '../../common/dto/paginated-result';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaiementsFournisseursController {
  constructor(private readonly service: PaiementsFournisseursService) {}

  @Get('paiements-fournisseurs')
  @RequirePermission('paiements_fournisseurs', 'voir')
  async findAllGlobal(
    @CurrentUser('companyId') companyId: number,
    @Query() query: QueryPaiementFournisseurDto,
  ): Promise<PaginatedResult<PaiementFournisseurGlobalView>> {
    return this.service.findAllGlobal(companyId, query);
  }

  @Get('paiements-fournisseurs/stats')
  @RequirePermission('paiements_fournisseurs', 'voir')
  async findGlobalStats(
    @CurrentUser('companyId') companyId: number,
    @Query() query: QueryPaiementFournisseurDto,
  ): Promise<PaiementFournisseurStats> {
    return this.service.findGlobalStats(companyId, query);
  }

  @Get('dettes-fournisseurs/:id/paiements')
  @RequirePermission('paiements_fournisseurs', 'voir')
  async findByDebtId(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ): Promise<PaiementFournisseurGlobalView[]> {
    return this.service.findByDebtId(id, companyId);
  }

  @Post('dettes-fournisseurs/:id/paiements')
  @RequirePermission('paiements_fournisseurs', 'ajouter')
  async createVersement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePaiementFournisseurDto,
    @CurrentUser('companyId') companyId: number,
    @CurrentUser('sub') userId: number,
  ): Promise<DetteFournisseurView> {
    return this.service.createVersement(id, dto, companyId, userId);
  }

  @Post('dettes-fournisseurs/:id/paiements/:versementId/annuler')
  @RequirePermission('paiements_fournisseurs', 'modifier')
  async cancelVersement(
    @Param('id', ParseIntPipe) id: number,
    @Param('versementId', ParseIntPipe) versementId: number,
    @Body() dto: CancelPaiementFournisseurDto,
    @CurrentUser('companyId') companyId: number,
    @CurrentUser('sub') userId: number,
  ): Promise<DetteFournisseurView> {
    return this.service.cancelVersement(id, versementId, dto, companyId, userId);
  }
}
