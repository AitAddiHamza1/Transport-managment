import { PartialType } from '@nestjs/swagger';
import { CreateVoyageDto } from './create-voyage.dto';

export class UpdateVoyageDto extends PartialType(CreateVoyageDto) {}
