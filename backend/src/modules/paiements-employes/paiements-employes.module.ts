import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaiementsEmployesService } from './paiements-employes.service';
import { PaiementsEmployesController } from './paiements-employes.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PaiementsEmployesController],
  providers: [PaiementsEmployesService],
  exports: [PaiementsEmployesService],
})
export class PaiementsEmployesModule {}
