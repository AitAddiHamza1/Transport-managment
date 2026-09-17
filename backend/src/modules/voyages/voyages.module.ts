import { Module } from '@nestjs/common';
import { VoyagesController } from './voyages.controller';
import { VoyagesService } from './voyages.service';
import { VoyageResourceSyncService } from './voyage-resource-sync.service';
import { FacturesModule } from '../factures/factures.module';

@Module({
  imports: [FacturesModule],
  controllers: [VoyagesController],
  providers: [VoyagesService, VoyageResourceSyncService],
  exports: [VoyagesService, VoyageResourceSyncService],
})
export class VoyagesModule {}
