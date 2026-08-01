import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VehiculeStatut } from '@prisma/client';

export class UpdateVehiculeStatusDto {
  @ApiProperty({ description: 'Nouveau statut opérationnel du véhicule', enum: VehiculeStatut })
  @IsNotEmpty()
  @IsEnum(VehiculeStatut)
  statut: VehiculeStatut;
}
