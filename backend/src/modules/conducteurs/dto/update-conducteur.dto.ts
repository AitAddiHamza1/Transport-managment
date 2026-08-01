import { PartialType } from '@nestjs/swagger';
import { CreateConducteurDto } from './create-conducteur.dto';

export class UpdateConducteurDto extends PartialType(CreateConducteurDto) {}
