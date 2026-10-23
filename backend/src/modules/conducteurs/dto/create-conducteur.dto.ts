import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConducteurStatut } from '@prisma/client';

export class CreateConducteurDto {
  @ApiPropertyOptional({
    description: 'Nom complet du conducteur (dérivé automatiquement de l’employé si omis)',
    example: 'Mohamed Alami',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  nomConducteur?: string;

  @ApiPropertyOptional({
    description: 'Numéro de téléphone du conducteur (dérivé de l’employé si omis)',
    example: '+212600112233',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  telephone?: string | null;

  @ApiPropertyOptional({
    description: 'Adresse du conducteur (dérivée de l’employé si omise)',
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

  @ApiPropertyOptional({
    description: 'ID de l’employé rattaché (obligatoire)',
    example: 15,
  })
  @IsNotEmpty({ message: 'L’identifiant de l’employé est obligatoire' })
  @IsInt({ message: 'L’identifiant de l’employé doit être un entier valide' })
  @Min(1, { message: 'L’identifiant de l’employé doit être supérieur à 0' })
  idEmploye: number;
}
