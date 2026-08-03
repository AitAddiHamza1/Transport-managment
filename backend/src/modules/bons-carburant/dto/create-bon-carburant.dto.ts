import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBonCarburantDto {
  @ApiProperty({ description: 'Numéro du bon de carburant', example: 'BG-2026-001' })
  @IsString()
  @IsNotEmpty({ message: 'Le numéro du bon de carburant est obligatoire' })
  @MaxLength(50, { message: 'Le numéro du bon ne peut pas dépasser 50 caractères' })
  numeroBon: string;

  @ApiProperty({ description: 'Immatriculation du véhicule concerné', example: '12345-A-1' })
  @IsString()
  @IsNotEmpty({ message: 'L’immatriculation du véhicule est obligatoire' })
  @MaxLength(20, { message: 'L’immatriculation ne peut pas dépasser 20 caractères' })
  immatriculation: string;

  @ApiPropertyOptional({ description: 'Nom du conducteur (snapshot)', example: 'Mohamed Amine' })
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'Le nom du conducteur ne peut pas dépasser 150 caractères' })
  nomConducteur?: string;

  @ApiPropertyOptional({ description: 'Nom de la station-service', example: 'Afriquia Oasis' })
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Le nom de la station ne peut pas dépasser 120 caractères' })
  nomStation?: string;

  @ApiPropertyOptional({ description: 'Relevé kilométrique du véhicule (km)', example: 151200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Le kilométrage doit être un nombre entier' })
  @Min(0, { message: 'Le kilométrage doit être supérieur ou égal à 0' })
  kilometrage?: number;

  @ApiProperty({ description: 'Quantité de carburant en litres', example: 150.5 })
  @Type(() => Number)
  @IsNumber({}, { message: 'La quantité en litres doit être un nombre valide' })
  @Min(0.01, { message: 'La quantité de carburant doit être supérieure à 0' })
  litres: number;

  @ApiProperty({ description: 'Prix unitaire par litre (MAD)', example: 12.5 })
  @Type(() => Number)
  @IsNumber({}, { message: 'Le prix par litre doit être un nombre valide' })
  @Min(0.01, { message: 'Le prix par litre doit être supérieur à 0' })
  prixParLitre: number;

  @ApiPropertyOptional({ description: 'Date du carburant (YYYY-MM-DD)', example: '2026-07-23' })
  @IsOptional()
  @IsISO8601({}, { message: 'La date du carburant doit être au format ISO8601 (YYYY-MM-DD)' })
  dateCarburant?: string;
}
