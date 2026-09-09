import { PartialType } from '@nestjs/swagger';
import { CreateDepenseAdministrativeDto } from './create-depense-administrative.dto';

export class UpdateDepenseAdministrativeDto extends PartialType(CreateDepenseAdministrativeDto) {}
