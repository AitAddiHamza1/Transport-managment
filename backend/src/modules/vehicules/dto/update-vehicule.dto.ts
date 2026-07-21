import { PartialType } from '@nestjs/swagger';
import { CreateVehiculeDto } from './create-vehicule.dto';

export class UpdateVehiculeDto extends PartialType(CreateVehiculeDto) {}
