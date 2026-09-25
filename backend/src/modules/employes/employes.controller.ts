import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { Response } from 'express';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EmployesService, EmployeView } from './employes.service';
import { CreateEmployeDto } from './dto/create-employe.dto';
import { UpdateEmployeDto } from './dto/update-employe.dto';
import { EmployesQueryDto } from './dto/employes-query.dto';
import { CreateDocumentEmployeDto } from './dto/create-document-employe.dto';
import { DocumentEmploye } from '@prisma/client';

@Controller('employes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployesController {
  constructor(private readonly employesService: EmployesService) {}

  @Get()
  @RequirePermission('employes', 'voir')
  async findAll(@Query() query: EmployesQueryDto, @CurrentUser('companyId') companyId: number) {
    return this.employesService.findAll(query, companyId);
  }

  // NOTE: /stats declared before /:id to prevent route conflicts
  @Get('stats')
  @RequirePermission('employes', 'voir')
  async getStats(@CurrentUser('companyId') companyId: number) {
    return this.employesService.getStats(companyId);
  }

  @Get(':id')
  @RequirePermission('employes', 'voir')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ): Promise<EmployeView> {
    return this.employesService.findOne(id, companyId);
  }

  @Post()
  @RequirePermission('employes', 'ajouter')
  async create(
    @Body() dto: CreateEmployeDto,
    @CurrentUser('companyId') companyId: number,
  ): Promise<EmployeView> {
    return this.employesService.create(dto, companyId);
  }

  @Patch(':id')
  @RequirePermission('employes', 'modifier')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeDto,
    @CurrentUser('companyId') companyId: number,
  ): Promise<EmployeView> {
    return this.employesService.update(id, dto, companyId);
  }

  @Delete(':id')
  @RequirePermission('employes', 'supprimer')
  async softDelete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ): Promise<{ message: string }> {
    return this.employesService.softDelete(id, companyId);
  }

  // -------------------------------------------------------------------
  // Photo Upload Routes
  // -------------------------------------------------------------------
  @Post(':id/photo')
  @RequirePermission('employes', 'modifier')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('companyId') companyId: number,
  ): Promise<EmployeView> {
    return this.employesService.uploadPhoto(id, file, companyId);
  }

  @Delete(':id/photo')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('employes', 'modifier')
  async deletePhoto(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ): Promise<EmployeView> {
    return this.employesService.deletePhoto(id, companyId);
  }

  @Get(':id/photo')
  @RequirePermission('employes', 'voir')
  async getPhotoStream(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
    @CurrentUser('companyId') companyId: number,
  ): Promise<void> {
    const { physicalPath, mimeType } = await this.employesService.getPhotoFileStream(id, companyId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    fs.createReadStream(physicalPath).pipe(res);
  }

  // -------------------------------------------------------------------
  // HR Documents Routes
  // -------------------------------------------------------------------
  @Get(':id/documents')
  @RequirePermission('employes', 'voir')
  async listDocuments(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ): Promise<DocumentEmploye[]> {
    return this.employesService.listDocuments(id, companyId);
  }

  @Post(':id/documents')
  @RequirePermission('employes', 'modifier')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDocumentEmployeDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('companyId') companyId: number,
  ): Promise<DocumentEmploye> {
    return this.employesService.uploadDocument(id, dto, file, companyId);
  }

  @Get(':id/documents/:docId/file')
  @RequirePermission('employes', 'voir')
  async getDocumentFileStream(
    @Param('id', ParseIntPipe) id: number,
    @Param('docId', ParseIntPipe) docId: number,
    @Res() res: Response,
    @CurrentUser('companyId') companyId: number,
  ): Promise<void> {
    const { physicalPath, filename, mimeType } = await this.employesService.getDocumentFileStream(
      id,
      docId,
      companyId,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    fs.createReadStream(physicalPath).pipe(res);
  }

  @Delete(':id/documents/:docId')
  @RequirePermission('employes', 'modifier')
  async deleteDocument(
    @Param('id', ParseIntPipe) id: number,
    @Param('docId', ParseIntPipe) docId: number,
    @CurrentUser('companyId') companyId: number,
  ): Promise<{ message: string }> {
    return this.employesService.deleteDocument(id, docId, companyId);
  }
}
