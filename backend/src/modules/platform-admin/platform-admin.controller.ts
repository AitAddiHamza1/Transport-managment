import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformAdminService } from './platform-admin.service';
import { QueryCompaniesDto } from './dto/query-companies.dto';
import { UpdateCompanyStatusDto } from './dto/update-company-status.dto';
import { ProvisionCompanyDto } from '../company-provisioning/dto/provision-company.dto';
import { PlatformJwtAuthGuard } from './guards/platform-jwt-auth.guard';
import { PlatformAdminGuard } from './guards/platform-admin.guard';

@ApiTags('Platform Companies')
@ApiBearerAuth()
@UseGuards(PlatformJwtAuthGuard, PlatformAdminGuard)
@Controller('platform/companies')
export class PlatformAdminController {
  constructor(private readonly service: PlatformAdminService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les entreprises (pagination, recherche, statut)' })
  findAll(@Query() query: QueryCompaniesDto) {
    return this.service.findAllCompanies(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’une entreprise (métadonnées administratives)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneCompany(id);
  }

  @Post()
  @ApiOperation({ summary: 'Provisionner une nouvelle entreprise' })
  provision(@Body() dto: ProvisionCompanyDto) {
    return this.service.provisionCompany(dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Modifier le statut d’une entreprise (ACTIF, SUSPENDU, INACTIF)' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyStatusDto,
  ) {
    return this.service.updateCompanyStatus(id, dto);
  }
}
