import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VoyageStatut } from '@prisma/client';

export class UpdateVoyageStatusDto {
  @ApiProperty({ description: 'Nouveau statut du voyage', enum: VoyageStatut })
  @IsNotEmpty()
  @IsEnum(VoyageStatut)
  statut: VoyageStatut;
}
