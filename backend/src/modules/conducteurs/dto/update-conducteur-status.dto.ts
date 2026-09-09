import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ConducteurStatut } from '@prisma/client';

export class UpdateConducteurStatusDto {
  @ApiProperty({ description: 'Nouveau statut opérationnel du conducteur', enum: ConducteurStatut })
  @IsNotEmpty()
  @IsEnum(ConducteurStatut)
  statut: ConducteurStatut;
}
