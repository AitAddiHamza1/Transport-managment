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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CompanySettingsService, GetCompanySettingsResponse } from './company-settings.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

@Controller('company-settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CompanySettingsController {
  constructor(private readonly companySettingsService: CompanySettingsService) {}

  @Get()
  @RequirePermission('parametres_entreprise', 'voir')
  async getSettings(
    @CurrentUser('companyId') companyId: number,
  ): Promise<GetCompanySettingsResponse> {
    return this.companySettingsService.getSettings(companyId);
  }

  @Patch()
  @RequirePermission('parametres_entreprise', 'modifier')
  async updateSettings(
    @CurrentUser('companyId') companyId: number,
    @Body() dto: UpdateCompanySettingsDto,
  ): Promise<GetCompanySettingsResponse> {
    return this.companySettingsService.updateSettings(dto, companyId);
  }

  @Post('logo')
  @RequirePermission('parametres_entreprise', 'modifier')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @CurrentUser('companyId') companyId: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<GetCompanySettingsResponse> {
    return this.companySettingsService.uploadLogo(file, companyId);
  }

  @Delete('logo')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('parametres_entreprise', 'modifier')
  async deleteLogo(
    @CurrentUser('companyId') companyId: number,
  ): Promise<GetCompanySettingsResponse> {
    return this.companySettingsService.deleteLogo(companyId);
  }

  @Get('logo')
  async getLogoFile(
    @CurrentUser('companyId') companyId: number,
    @Res() res: Response,
  ): Promise<void> {
    const { stream, mimeType } = await this.companySettingsService.getLogoFileStream(companyId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    stream.pipe(res);
  }

  @Post('stamp')
  @RequirePermission('parametres_entreprise', 'modifier')
  @UseInterceptors(FileInterceptor('file'))
  async uploadStamp(
    @CurrentUser('companyId') companyId: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<GetCompanySettingsResponse> {
    return this.companySettingsService.uploadStamp(file, companyId);
  }

  @Delete('stamp')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('parametres_entreprise', 'modifier')
  async deleteStamp(
    @CurrentUser('companyId') companyId: number,
  ): Promise<GetCompanySettingsResponse> {
    return this.companySettingsService.deleteStamp(companyId);
  }

  @Get('stamp')
  async getStampFile(
    @CurrentUser('companyId') companyId: number,
    @Res() res: Response,
  ): Promise<void> {
    const { stream, mimeType } = await this.companySettingsService.getStampFileStream(companyId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    stream.pipe(res);
  }
}
