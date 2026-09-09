import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ClientStatut } from '@prisma/client';

export class UpdateClientStatusDto {
  @ApiProperty({ description: 'Nouveau statut du client', enum: ClientStatut })
  @IsNotEmpty()
  @IsEnum(ClientStatut)
  statut: ClientStatut;
}
