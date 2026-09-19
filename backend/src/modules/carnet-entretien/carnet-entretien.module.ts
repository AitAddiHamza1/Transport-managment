import { Module } from '@nestjs/common';
import { CarnetEntretienController } from './carnet-entretien.controller';
import { CarnetEntretienService } from './carnet-entretien.service';

@Module({
  controllers: [CarnetEntretienController],
  providers: [CarnetEntretienService],
  exports: [CarnetEntretienService],
})
export class CarnetEntretienModule {}
