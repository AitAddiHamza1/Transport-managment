import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ClientStatut } from '@prisma/client';

export class UpdateFournisseurStatusDto {
  @ApiProperty({ description: 'Nouveau statut du fournisseur', enum: ClientStatut })
  @IsNotEmpty()
  @IsEnum(ClientStatut)
  statut: ClientStatut;
}
