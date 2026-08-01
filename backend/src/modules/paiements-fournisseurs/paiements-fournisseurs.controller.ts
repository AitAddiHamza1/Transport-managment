import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
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
    @Query() query: QueryPaiementFournisseurDto,
  ): Promise<PaginatedResult<PaiementFournisseurGlobalView>> {
    return this.service.findAllGlobal(query);
  }

  @Get('paiements-fournisseurs/stats')
  @RequirePermission('paiements_fournisseurs', 'voir')
  async findGlobalStats(
    @Query() query: QueryPaiementFournisseurDto,
  ): Promise<PaiementFournisseurStats> {
    return this.service.findGlobalStats(query);
  }

  @Get('dettes-fournisseurs/:id/paiements')
  @RequirePermission('paiements_fournisseurs', 'voir')
  async findByDebtId(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PaiementFournisseurGlobalView[]> {
    return this.service.findByDebtId(id);
  }

  @Post('dettes-fournisseurs/:id/paiements')
  @RequirePermission('paiements_fournisseurs', 'ajouter')
  async createVersement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePaiementFournisseurDto,
    @Req() req: any,
  ): Promise<DetteFournisseurView> {
    const userId = req.user?.id ? Number(req.user.id) : undefined;
    return this.service.createVersement(id, dto, userId);
  }

  @Post('dettes-fournisseurs/:id/paiements/:versementId/annuler')
  @RequirePermission('paiements_fournisseurs', 'modifier')
  async cancelVersement(
    @Param('id', ParseIntPipe) id: number,
    @Param('versementId', ParseIntPipe) versementId: number,
    @Body() dto: CancelPaiementFournisseurDto,
    @Req() req: any,
  ): Promise<DetteFournisseurView> {
    const userId = req.user?.id ? Number(req.user.id) : undefined;
    return this.service.cancelVersement(id, versementId, dto, userId);
  }
}
