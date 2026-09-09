import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../../prisma/prisma.module';
import { CompanyProvisioningModule } from '../company-provisioning/company-provisioning.module';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformJwtStrategy } from './strategies/platform-jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    CompanyProvisioningModule,
    PassportModule.register({ defaultStrategy: 'platform-jwt' }),
    JwtModule.register({}),
  ],
  controllers: [PlatformAuthController, PlatformAdminController],
  providers: [PlatformAuthService, PlatformAdminService, PlatformJwtStrategy],
  exports: [PlatformAuthService, PlatformAdminService],
})
export class PlatformAdminModule {}
