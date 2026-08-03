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
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import {
  DettesFournisseursService,
  DetteFournisseurStats,
  DetteFournisseurView,
} from './dettes-fournisseurs.service';
import { CreateDetteFournisseurDto } from './dto/create-dette-fournisseur.dto';
import { UpdateDetteFournisseurDto } from './dto/update-dette-fournisseur.dto';
import { QueryDetteFournisseurDto } from './dto/query-dette-fournisseur.dto';
import { PaginatedResult } from '../../common/dto/paginated-result';

@Controller('dettes-fournisseurs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DettesFournisseursController {
  constructor(private readonly service: DettesFournisseursService) {}

  @Get()
  @RequirePermission('dettes_fournisseurs', 'voir')
  async findAll(
    @Query() query: QueryDetteFournisseurDto,
  ): Promise<PaginatedResult<DetteFournisseurView>> {
    return this.service.findAll(query);
  }

  @Get('stats')
  @RequirePermission('dettes_fournisseurs', 'voir')
  async findStats(@Query() query: QueryDetteFournisseurDto): Promise<DetteFournisseurStats> {
    return this.service.findStats(query);
  }

  @Get(':id')
  @RequirePermission('dettes_fournisseurs', 'voir')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<DetteFournisseurView> {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermission('dettes_fournisseurs', 'ajouter')
  async create(
    @Body() dto: CreateDetteFournisseurDto,
    @Req() req: any,
  ): Promise<DetteFournisseurView> {
    const userId = req.user?.id ? Number(req.user.id) : undefined;
    return this.service.create(dto, userId);
  }

  @Patch(':id')
  @RequirePermission('dettes_fournisseurs', 'modifier')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDetteFournisseurDto,
  ): Promise<DetteFournisseurView> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('dettes_fournisseurs', 'supprimer')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.service.remove(id);
  }
}
