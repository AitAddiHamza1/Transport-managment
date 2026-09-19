import { PartialType } from '@nestjs/swagger';
import { CreateTraverseeMaritimeDto } from './create-traversee-maritime.dto';

export class UpdateTraverseeMaritimeDto extends PartialType(CreateTraverseeMaritimeDto) {}
