import { Module } from '@nestjs/common';
import { ChequesLettresChangeController } from './cheques-lettres-change.controller';
import { ChequesLettresChangeService } from './cheques-lettres-change.service';

@Module({
  controllers: [ChequesLettresChangeController],
  providers: [ChequesLettresChangeService],
  exports: [ChequesLettresChangeService],
})
export class ChequesLettresChangeModule {}
