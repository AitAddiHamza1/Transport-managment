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
import { PaiementsEmployesService } from './paiements-employes.service';
import { CreatePaiementEmployeDto } from './dto/create-paiement-employe.dto';
import { UpdatePaiementEmployeDto } from './dto/update-paiement-employe.dto';
import { CreateVersementDto } from './dto/create-versement.dto';
import { CancelVersementDto } from './dto/cancel-versement.dto';
import { QueryPaiementEmployeDto } from './dto/query-paiement-employe.dto';

@Controller('paiements-employes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaiementsEmployesController {
  constructor(private readonly service: PaiementsEmployesService) {}

  @Post()
  @RequirePermission('paiements_employes', 'ajouter')
  async create(@Body() dto: CreatePaiementEmployeDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('paiements_employes', 'voir')
  async findAll(@Query() query: QueryPaiementEmployeDto) {
    return this.service.findAll(query);
  }

  @Get('stats')
  @RequirePermission('paiements_employes', 'voir')
  async findStats(@Query() query: QueryPaiementEmployeDto) {
    return this.service.findStats(query);
  }

  @Get(':id')
  @RequirePermission('paiements_employes', 'voir')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('paiements_employes', 'modifier')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePaiementEmployeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('paiements_employes', 'supprimer')
  async softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.service.softDelete(id);
  }

  // -------------------------------------------------------------------
  // Versements Endpoints
  // -------------------------------------------------------------------
  @Get(':id/versements')
  @RequirePermission('paiements_employes', 'voir')
  async listVersements(@Param('id', ParseIntPipe) id: number) {
    return this.service.listVersements(id);
  }

  @Post(':id/versements')
  @RequirePermission('paiements_employes', 'ajouter')
  async createVersement(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateVersementDto) {
    return this.service.createVersement(id, dto);
  }

  @Post(':id/versements/:versementId/annuler')
  @RequirePermission('paiements_employes', 'modifier')
  async cancelVersement(
    @Param('id', ParseIntPipe) id: number,
    @Param('versementId', ParseIntPipe) versementId: number,
    @Body() dto: CancelVersementDto,
  ) {
    return this.service.cancelVersement(id, versementId, dto);
  }
}
