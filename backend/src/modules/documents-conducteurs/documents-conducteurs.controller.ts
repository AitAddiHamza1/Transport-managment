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
  DocumentsConducteursService,
  DocumentConducteurView,
  DocumentConducteurStats,
} from './documents-conducteurs.service';
import { CreateDocumentConducteurDto } from './dto/create-document-conducteur.dto';
import { UpdateDocumentConducteurDto } from './dto/update-document-conducteur.dto';
import { QueryDocumentConducteurDto } from './dto/query-document-conducteur.dto';
import { PaginatedResult } from '../../common/dto/paginated-result';

@ApiTags('Documents conducteurs')
@Controller('documents-conducteurs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentsConducteursController {
  constructor(private readonly service: DocumentsConducteursService) {}

  @Post()
  @RequirePermission('documents_conducteurs', 'ajouter')
  async create(
    @CurrentUser('companyId') companyId: number,
    @Body() dto: CreateDocumentConducteurDto,
  ): Promise<DocumentConducteurView> {
    return this.service.create(companyId, dto);
  }

  @Get('stats')
  @RequirePermission('documents_conducteurs', 'voir')
  async findStats(@CurrentUser('companyId') companyId: number): Promise<DocumentConducteurStats> {
    return this.service.findStats(companyId);
  }

  @Get('locate/:id')
  @RequirePermission('documents_conducteurs', 'voir')
  async locate(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limitStr?: string,
  ): Promise<{ found: boolean; page: number; total: number; targetId: number }> {
    const limit = Math.min(Math.max(Number(limitStr) || 10, 1), 100);
    return this.service.locatePosition(companyId, id, limit);
  }

  @Get()
  @RequirePermission('documents_conducteurs', 'voir')
  async findAll(
    @CurrentUser('companyId') companyId: number,
    @Query() query: QueryDocumentConducteurDto,
  ): Promise<PaginatedResult<DocumentConducteurView>> {
    return this.service.findAll(companyId, query);
  }

  @Get(':id')
  @RequirePermission('documents_conducteurs', 'voir')
  async findOne(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DocumentConducteurView> {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @RequirePermission('documents_conducteurs', 'modifier')
  async update(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDocumentConducteurDto,
  ): Promise<DocumentConducteurView> {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('documents_conducteurs', 'supprimer')
  async softDelete(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ id: number; message: string }> {
    return this.service.softDelete(companyId, id);
  }

  @Post(':id/fichier')
  @RequirePermission('documents_conducteurs', 'modifier')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<DocumentConducteurView> {
    return this.service.uploadFile(companyId, id, file);
  }

  @Get(':id/fichier')
  @RequirePermission('documents_conducteurs', 'voir')
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
  @RequirePermission('documents_conducteurs', 'voir')
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
  @RequirePermission('documents_conducteurs', 'modifier')
  async deleteFile(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DocumentConducteurView> {
    return this.service.deleteFile(companyId, id);
  }
}
