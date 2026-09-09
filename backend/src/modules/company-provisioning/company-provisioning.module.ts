import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CompanyProvisioningService } from './company-provisioning.service';

@Module({
  imports: [PrismaModule],
  providers: [CompanyProvisioningService],
  exports: [CompanyProvisioningService],
})
export class CompanyProvisioningModule {}
