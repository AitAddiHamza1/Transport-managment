import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CompanySettingsService, GetCompanySettingsResponse } from './company-settings.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

@Controller('company-settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CompanySettingsController {
  constructor(private readonly companySettingsService: CompanySettingsService) {}

  @Get()
  @RequirePermission('parametres_entreprise', 'voir')
  async getSettings(): Promise<GetCompanySettingsResponse> {
    return this.companySettingsService.getSettings();
  }

  @Patch()
  @RequirePermission('parametres_entreprise', 'modifier')
  async updateSettings(@Body() dto: UpdateCompanySettingsDto): Promise<GetCompanySettingsResponse> {
    return this.companySettingsService.updateSettings(dto);
  }

  @Post('logo')
  @RequirePermission('parametres_entreprise', 'modifier')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@UploadedFile() file: Express.Multer.File): Promise<GetCompanySettingsResponse> {
    return this.companySettingsService.uploadLogo(file);
  }

  @Delete('logo')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('parametres_entreprise', 'modifier')
  async deleteLogo(): Promise<GetCompanySettingsResponse> {
    return this.companySettingsService.deleteLogo();
  }

  @Get('logo')
  async getLogoFile(@Res() res: Response): Promise<void> {
    const { stream, mimeType } = await this.companySettingsService.getLogoFileStream();
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    stream.pipe(res);
  }

  @Post('stamp')
  @RequirePermission('parametres_entreprise', 'modifier')
  @UseInterceptors(FileInterceptor('file'))
  async uploadStamp(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<GetCompanySettingsResponse> {
    return this.companySettingsService.uploadStamp(file);
  }

  @Delete('stamp')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('parametres_entreprise', 'modifier')
  async deleteStamp(): Promise<GetCompanySettingsResponse> {
    return this.companySettingsService.deleteStamp();
  }

  @Get('stamp')
  async getStampFile(@Res() res: Response): Promise<void> {
    const { stream, mimeType } = await this.companySettingsService.getStampFileStream();
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    stream.pipe(res);
  }
}
