import { PartialType } from '@nestjs/swagger';
import { CreateBonCarburantDto } from './create-bon-carburant.dto';

export class UpdateBonCarburantDto extends PartialType(CreateBonCarburantDto) {}
