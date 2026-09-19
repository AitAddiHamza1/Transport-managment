import { Module } from '@nestjs/common';
import { TraverseesMaritimesController } from './traversees-maritimes.controller';
import { TraverseesMaritimesService } from './traversees-maritimes.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TraverseesMaritimesController],
  providers: [TraverseesMaritimesService],
  exports: [TraverseesMaritimesService],
})
export class TraverseesMaritimesModule {}
