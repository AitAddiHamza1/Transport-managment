import { Module } from '@nestjs/common';
import { PaiementsFournisseursController } from './paiements-fournisseurs.controller';
import { PaiementsFournisseursService } from './paiements-fournisseurs.service';
import { DettesFournisseursModule } from '../dettes-fournisseurs/dettes-fournisseurs.module';

@Module({
  imports: [DettesFournisseursModule],
  controllers: [PaiementsFournisseursController],
  providers: [PaiementsFournisseursService],
  exports: [PaiementsFournisseursService],
})
export class PaiementsFournisseursModule {}
