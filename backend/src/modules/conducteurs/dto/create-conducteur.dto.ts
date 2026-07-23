import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConducteurStatut } from '@prisma/client';

export class CreateConducteurDto {
  @ApiProperty({
    description: 'Nom complet du conducteur (ex: Mohamed Alami)',
    example: 'Mohamed Alami',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  nomConducteur: string;

  @ApiPropertyOptional({
    description: 'Numéro de téléphone du conducteur',
    example: '+212600112233',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  telephone?: string | null;

  @ApiPropertyOptional({
    description: 'Adresse du conducteur',
    example: '12, Rue Hassan II, Casablanca',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  adresse?: string | null;

  @ApiPropertyOptional({
    description: 'Statut opérationnel du conducteur',
    enum: ConducteurStatut,
    default: ConducteurStatut.DISPONIBLE,
  })
  @IsOptional()
  @IsEnum(ConducteurStatut)
  statut?: ConducteurStatut;
}
