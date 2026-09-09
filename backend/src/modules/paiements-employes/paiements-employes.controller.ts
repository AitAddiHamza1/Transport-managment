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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaiementsEmployesService } from './paiements-employes.service';
import { CreatePaiementEmployeDto } from './dto/create-paiement-employe.dto';
import { UpdatePaiementEmployeDto } from './dto/update-paiement-employe.dto';
import { CreateVersementDto } from './dto/create-versement.dto';
import { CancelVersementDto } from './dto/cancel-versement.dto';
import { CreatePrimeDto } from './dto/create-prime.dto';
import { QueryPaiementEmployeDto } from './dto/query-paiement-employe.dto';

@Controller('paiements-employes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaiementsEmployesController {
  constructor(private readonly service: PaiementsEmployesService) {}

  @Post()
  @RequirePermission('paiements_employes', 'ajouter')
  async create(@CurrentUser('companyId') companyId: number, @Body() dto: CreatePaiementEmployeDto) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @RequirePermission('paiements_employes', 'voir')
  async findAll(
    @CurrentUser('companyId') companyId: number,
    @Query() query: QueryPaiementEmployeDto,
  ) {
    return this.service.findAll(companyId, query);
  }

  @Get('stats')
  @RequirePermission('paiements_employes', 'voir')
  async findStats(
    @CurrentUser('companyId') companyId: number,
    @Query() query: QueryPaiementEmployeDto,
  ) {
    return this.service.findStats(companyId, query);
  }

  @Get(':id')
  @RequirePermission('paiements_employes', 'voir')
  async findOne(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @RequirePermission('paiements_employes', 'modifier')
  async update(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaiementEmployeDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('paiements_employes', 'supprimer')
  async softDelete(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.softDelete(companyId, id);
  }

  // -------------------------------------------------------------------
  // Primes Endpoints
  // -------------------------------------------------------------------
  @Post(':id/primes')
  @RequirePermission('paiements_employes', 'ajouter')
  async createPrime(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePrimeDto,
  ) {
    return this.service.createPrime(companyId, id, dto);
  }

  // -------------------------------------------------------------------
  // Versements Endpoints
  // -------------------------------------------------------------------
  @Get(':id/versements')
  @RequirePermission('paiements_employes', 'voir')
  async listVersements(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.listVersements(companyId, id);
  }

  @Post(':id/versements')
  @RequirePermission('paiements_employes', 'ajouter')
  async createVersement(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateVersementDto,
  ) {
    return this.service.createVersement(companyId, id, dto);
  }

  @Post(':id/versements/:versementId/annuler')
  @RequirePermission('paiements_employes', 'modifier')
  async cancelVersement(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('versementId', ParseIntPipe) versementId: number,
    @Body() dto: CancelVersementDto,
  ) {
    return this.service.cancelVersement(companyId, id, versementId, dto);
  }
}
