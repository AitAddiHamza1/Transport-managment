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
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import {
  DepensesAdministrativesService,
  DepenseAdministrativeStats,
  DepenseAdministrativeView,
} from './depenses-administratives.service';
import { CreateDepenseAdministrativeDto } from './dto/create-depense-administrative.dto';
import { UpdateDepenseAdministrativeDto } from './dto/update-depense-administrative.dto';
import { QueryDepenseAdministrativeDto } from './dto/query-depense-administrative.dto';
import { PaginatedResult } from '../../common/dto/paginated-result';

@ApiTags('Dépenses administratives')
@Controller('depenses-administratives')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DepensesAdministrativesController {
  constructor(private readonly service: DepensesAdministrativesService) {}

  @Get('stats')
  @RequirePermission('depenses_administratives', 'voir')
  async getStats(
    @Query() query: QueryDepenseAdministrativeDto,
  ): Promise<DepenseAdministrativeStats> {
    return this.service.findStats(query);
  }

  @Get()
  @RequirePermission('depenses_administratives', 'voir')
  async findAll(
    @Query() query: QueryDepenseAdministrativeDto,
  ): Promise<PaginatedResult<DepenseAdministrativeView>> {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermission('depenses_administratives', 'voir')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<DepenseAdministrativeView> {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermission('depenses_administratives', 'ajouter')
  @UseInterceptors(FileInterceptor('recu'))
  async create(
    @Body() dto: CreateDepenseAdministrativeDto,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<DepenseAdministrativeView> {
    const userId = req.user?.id || req.user?.userId;
    return this.service.create(dto, userId, file);
  }

  @Patch(':id')
  @RequirePermission('depenses_administratives', 'modifier')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepenseAdministrativeDto,
  ): Promise<DepenseAdministrativeView> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('depenses_administratives', 'supprimer')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ idDepense: number }> {
    return this.service.softDelete(id);
  }

  @Post(':id/recu')
  @RequirePermission('depenses_administratives', 'modifier')
  @UseInterceptors(FileInterceptor('recu'))
  async uploadReceipt(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<DepenseAdministrativeView> {
    return this.service.uploadOrReplaceReceipt(id, file);
  }

  @Get(':id/recu')
  @RequirePermission('depenses_administratives', 'voir')
  async getReceiptView(@Param('id', ParseIntPipe) id: number, @Res() res: Response): Promise<void> {
    const { physicalPath, filename, mimeType } = await this.service.getReceiptFileStream(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.sendFile(physicalPath);
  }

  @Get(':id/recu/download')
  @RequirePermission('depenses_administratives', 'voir')
  async downloadReceipt(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const { physicalPath, filename } = await this.service.getReceiptFileStream(id);
    res.download(physicalPath, filename);
  }

  @Delete(':id/recu')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('depenses_administratives', 'modifier')
  async deleteReceipt(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<DepenseAdministrativeView> {
    const userId = req.user?.id || req.user?.userId;
    return this.service.deleteReceipt(id, userId);
  }
}
