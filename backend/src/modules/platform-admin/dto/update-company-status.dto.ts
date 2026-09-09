import { ApiProperty } from '@nestjs/swagger';
import { CompanyStatut } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateCompanyStatusDto {
  @ApiProperty({ enum: CompanyStatut })
  @IsNotEmpty({ message: 'Le statut est requis' })
  @IsEnum(CompanyStatut, { message: 'Statut de société invalide' })
  statut: CompanyStatut;
}
