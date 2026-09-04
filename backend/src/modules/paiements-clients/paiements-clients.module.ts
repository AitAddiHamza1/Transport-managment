import { Module } from '@nestjs/common';
import { PaiementsClientsController } from './paiements-clients.controller';
import { PaiementsClientsService } from './paiements-clients.service';
import { CreancesClientsModule } from '../creances-clients/creances-clients.module';
import { ForexModule } from '../forex/forex.module';

@Module({
  imports: [CreancesClientsModule, ForexModule],
  controllers: [PaiementsClientsController],
  providers: [PaiementsClientsService],
  exports: [PaiementsClientsService],
})
export class PaiementsClientsModule {}
