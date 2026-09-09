import { Module } from '@nestjs/common';
import { ForexService } from './forex.service';
import { ForexController } from './forex.controller';

@Module({
  controllers: [ForexController],
  providers: [ForexService],
  exports: [ForexService],
})
export class ForexModule {}
