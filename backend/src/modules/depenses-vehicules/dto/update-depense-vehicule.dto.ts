import { PartialType } from '@nestjs/swagger';
import { CreateDepenseVehiculeDto } from './create-depense-vehicule.dto';

export class UpdateDepenseVehiculeDto extends PartialType(CreateDepenseVehiculeDto) {}
