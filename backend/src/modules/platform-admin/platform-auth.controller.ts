import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { PlatformChangePasswordDto } from './dto/platform-change-password.dto';
import { PlatformJwtAuthGuard } from './guards/platform-jwt-auth.guard';
import { PlatformAdminGuard } from './guards/platform-admin.guard';
import { AllowPlatformMustChangePassword } from './decorators/allow-platform-must-change-password.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedPlatformAdmin } from './types/platform-user.type';

@ApiTags('Platform Auth')
@Controller('platform/auth')
export class PlatformAuthController {
  constructor(private readonly authService: PlatformAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion Administrateur Plateforme' })
  login(@Body() dto: PlatformLoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rafraîchir la session Administrateur Plateforme' })
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Get('me')
  @UseGuards(PlatformJwtAuthGuard, PlatformAdminGuard)
  @AllowPlatformMustChangePassword()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil de l’administrateur plateforme connecté' })
  me(@CurrentUser('sub') adminId: number) {
    return this.authService.me(adminId);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PlatformJwtAuthGuard, PlatformAdminGuard)
  @AllowPlatformMustChangePassword()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Changement de mot de passe administrateur plateforme' })
  changePassword(
    @CurrentUser('sub') adminId: number,
    @Body() dto: PlatformChangePasswordDto,
  ) {
    return this.authService.changePassword(adminId, dto);
  }
}
