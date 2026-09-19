import { Module } from '@nestjs/common';
import { DepensesVehiculesController } from './depenses-vehicules.controller';
import { DepensesVehiculesService } from './depenses-vehicules.service';
import { DettesFournisseursModule } from '../dettes-fournisseurs/dettes-fournisseurs.module';
import { CarnetEntretienModule } from '../carnet-entretien/carnet-entretien.module';

@Module({
  imports: [DettesFournisseursModule, CarnetEntretienModule],
  controllers: [DepensesVehiculesController],
  providers: [DepensesVehiculesService],
  exports: [DepensesVehiculesService],
})
export class DepensesVehiculesModule {}
