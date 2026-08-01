import { Module } from '@nestjs/common';
import { VoyagesController } from './voyages.controller';
import { VoyagesService } from './voyages.service';
import { VoyageResourceSyncService } from './voyage-resource-sync.service';

@Module({
  controllers: [VoyagesController],
  providers: [VoyagesService, VoyageResourceSyncService],
  exports: [VoyagesService, VoyageResourceSyncService],
})
export class VoyagesModule {}
