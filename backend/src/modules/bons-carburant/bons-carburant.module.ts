import { Module } from '@nestjs/common';
import { StockGasoilModule } from '../stock-gasoil/stock-gasoil.module';
import { BonsCarburantController } from './bons-carburant.controller';
import { BonsCarburantService } from './bons-carburant.service';

@Module({
  imports: [StockGasoilModule],
  controllers: [BonsCarburantController],
  providers: [BonsCarburantService],
  exports: [BonsCarburantService],
})
export class BonsCarburantModule {}
