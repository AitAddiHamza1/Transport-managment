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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  TraverseesMaritimesService,
  TraverseeMaritimeView,
  TraverseeMaritimeStats,
} from './traversees-maritimes.service';
import { CreateTraverseeMaritimeDto } from './dto/create-traversee-maritime.dto';
import { UpdateTraverseeMaritimeDto } from './dto/update-traversee-maritime.dto';
import { QueryTraverseeMaritimeDto } from './dto/query-traversee-maritime.dto';
import { PaginatedResult } from '../../common/dto/paginated-result';

@ApiTags('Traversées maritimes')
@Controller('traversees-maritimes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TraverseesMaritimesController {
  constructor(private readonly service: TraverseesMaritimesService) {}

  @Post()
  @RequirePermission('traversees_maritimes', 'ajouter')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @CurrentUser('companyId') companyId: number,
    @Body() dto: CreateTraverseeMaritimeDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<TraverseeMaritimeView> {
    return this.service.create(companyId, dto, file);
  }

  @Get('stats')
  @RequirePermission('traversees_maritimes', 'voir')
  async findStats(@CurrentUser('companyId') companyId: number): Promise<TraverseeMaritimeStats> {
    return this.service.findStats(companyId);
  }

  @Get()
  @RequirePermission('traversees_maritimes', 'voir')
  async findAll(
    @CurrentUser('companyId') companyId: number,
    @Query() query: QueryTraverseeMaritimeDto,
  ): Promise<PaginatedResult<TraverseeMaritimeView>> {
    return this.service.findAll(companyId, query);
  }

  @Get(':id')
  @RequirePermission('traversees_maritimes', 'voir')
  async findOne(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TraverseeMaritimeView> {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @RequirePermission('traversees_maritimes', 'modifier')
  async update(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTraverseeMaritimeDto,
  ): Promise<TraverseeMaritimeView> {
    return this.service.update(companyId, id, dto);
  }

  @Patch(':id/verification')
  @RequirePermission('traversees_maritimes', 'modifier')
  async toggleVerification(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('estVerifiee') estVerifiee?: boolean,
  ): Promise<TraverseeMaritimeView> {
    return this.service.toggleVerification(companyId, id, estVerifiee);
  }

  @Delete(':id')
  @RequirePermission('traversees_maritimes', 'supprimer')
  async softDelete(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ id: number; message: string }> {
    return this.service.softDelete(companyId, id);
  }

  @Post(':id/fichier')
  @RequirePermission('traversees_maritimes', 'modifier')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<TraverseeMaritimeView> {
    return this.service.uploadFile(companyId, id, file);
  }

  @Get(':id/fichier')
  @RequirePermission('traversees_maritimes', 'voir')
  async getFileInline(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const { diskPath, mimeType } = await this.service.getFile(companyId, id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(diskPath);
  }

  @Get(':id/fichier/download')
  @RequirePermission('traversees_maritimes', 'voir')
  async downloadFile(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const { diskPath, mimeType, nomOriginal } = await this.service.getFile(companyId, id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(nomOriginal)}"`,
    );
    res.sendFile(diskPath);
  }

  @Delete(':id/fichier')
  @RequirePermission('traversees_maritimes', 'modifier')
  async deleteFile(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TraverseeMaritimeView> {
    return this.service.deleteFile(companyId, id);
  }
}
