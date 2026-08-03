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
import {
  DocumentsVehiculesService,
  DocumentVehiculeView,
  DocumentVehiculeStats,
} from './documents-vehicules.service';
import { CreateDocumentVehiculeDto } from './dto/create-document-vehicule.dto';
import { UpdateDocumentVehiculeDto } from './dto/update-document-vehicule.dto';
import { QueryDocumentVehiculeDto } from './dto/query-document-vehicule.dto';
import { PaginatedResult } from '../../common/dto/paginated-result';

@ApiTags('Documents véhicules')
@Controller('documents-vehicules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentsVehiculesController {
  constructor(private readonly service: DocumentsVehiculesService) {}

  @Post()
  @RequirePermission('documents_vehicules', 'ajouter')
  async create(@Body() dto: CreateDocumentVehiculeDto): Promise<DocumentVehiculeView> {
    return this.service.create(dto);
  }

  @Get('stats')
  @RequirePermission('documents_vehicules', 'voir')
  async findStats(): Promise<DocumentVehiculeStats> {
    return this.service.findStats();
  }

  @Get()
  @RequirePermission('documents_vehicules', 'voir')
  async findAll(
    @Query() query: QueryDocumentVehiculeDto,
  ): Promise<PaginatedResult<DocumentVehiculeView>> {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermission('documents_vehicules', 'voir')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<DocumentVehiculeView> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('documents_vehicules', 'modifier')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDocumentVehiculeDto,
  ): Promise<DocumentVehiculeView> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('documents_vehicules', 'supprimer')
  async softDelete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ id: number; message: string }> {
    return this.service.softDelete(id);
  }

  @Post(':id/fichier')
  @RequirePermission('documents_vehicules', 'modifier')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<DocumentVehiculeView> {
    return this.service.uploadFile(id, file);
  }

  @Get(':id/fichier')
  @RequirePermission('documents_vehicules', 'voir')
  async getFileInline(@Param('id', ParseIntPipe) id: number, @Res() res: Response): Promise<void> {
    const { diskPath, mimeType } = await this.service.getFile(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(diskPath);
  }

  @Get(':id/fichier/download')
  @RequirePermission('documents_vehicules', 'voir')
  async downloadFile(@Param('id', ParseIntPipe) id: number, @Res() res: Response): Promise<void> {
    const { diskPath, mimeType, nomOriginal } = await this.service.getFile(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(nomOriginal)}"`,
    );
    res.sendFile(diskPath);
  }

  @Delete(':id/fichier')
  @RequirePermission('documents_vehicules', 'modifier')
  async deleteFile(@Param('id', ParseIntPipe) id: number): Promise<DocumentVehiculeView> {
    return this.service.deleteFile(id);
  }
}
