import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LettresDeChangeController } from './lettres-de-change.controller';
import { LettresDeChangeService } from './lettres-de-change.service';

@Module({
  imports: [PrismaModule],
  controllers: [LettresDeChangeController],
  providers: [LettresDeChangeService],
  exports: [LettresDeChangeService],
})
export class LettresDeChangeModule {}
