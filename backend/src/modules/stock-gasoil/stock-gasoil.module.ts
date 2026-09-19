import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { StockGasoilController } from './stock-gasoil.controller';
import { StockGasoilService } from './stock-gasoil.service';

@Module({
  imports: [NotificationsModule],
  controllers: [StockGasoilController],
  providers: [StockGasoilService],
  exports: [StockGasoilService],
})
export class StockGasoilModule {}
