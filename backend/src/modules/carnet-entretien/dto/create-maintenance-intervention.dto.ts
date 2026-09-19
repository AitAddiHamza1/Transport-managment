import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateMaintenanceInterventionDto {
  @ApiProperty({ description: 'Immatriculation du véhicule', maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  immatriculation: string;

  @ApiPropertyOptional({ description: 'Identifiant de la règle d’entretien appliquée' })
  @IsOptional()
  @IsInt()
  idRule?: number;

  @ApiProperty({ description: 'Libellé de l’intervention (ex: Vidange moteur & remplacement filtres)', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  libelle: string;

  @ApiProperty({ description: 'Date de réalisation de l’intervention (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  dateIntervention: string;

  @ApiProperty({ description: 'Kilométrage du véhicule lors de l’intervention' })
  @IsInt()
  @Min(0)
  kilometrageRealise: number;

  @ApiPropertyOptional({ description: 'Prochain kilométrage d’échéance (calculé automatiquement si idRule fourni, ou surchargé)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  prochainKmEcheance?: number;

  @ApiPropertyOptional({ description: 'Prochaine date d’échéance (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  prochaineDateEcheance?: string;

  @ApiPropertyOptional({ description: 'Identifiant de la dépense véhicule liée' })
  @IsOptional()
  @IsInt()
  idDepenseVehicule?: number;

  @ApiPropertyOptional({ description: 'Notes / Remarques complémentaires', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
