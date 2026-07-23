import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VoyageStatut, VoyageType } from '@prisma/client';

export class CreateVoyageDto {
  @ApiPropertyOptional({
    description: 'Type de voyage',
    enum: VoyageType,
    default: VoyageType.NATIONAL,
  })
  @IsOptional()
  @IsEnum(VoyageType)
  typeVoyage?: VoyageType;

  @ApiPropertyOptional({
    description: 'Immatriculation du véhicule tracteur',
    example: '12345-A-1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  tracteur?: string | null;

  @ApiPropertyOptional({ description: 'Immatriculation de la remorque', example: '67890-B-1' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  remorque?: string | null;

  @ApiPropertyOptional({
    description: 'Nom complet du conducteur principal',
    example: 'Mohammed Alami',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  nomConducteur?: string | null;

  @ApiPropertyOptional({
    description: 'Raison sociale du client',
    example: 'Maghreb Transport S.A.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  nomClient?: string | null;

  @ApiProperty({ description: 'Lieu de chargement / départ *', example: 'Casablanca Port' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  lieuChargement: string;

  @ApiProperty({ description: 'Lieu de déchargement / arrivée *', example: 'Tanger Med' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  lieuDechargement: string;

  @ApiPropertyOptional({
    description: 'Date de chargement (format ISO 8601 YYYY-MM-DD)',
    example: '2026-08-01',
  })
  @IsOptional()
  @IsISO8601()
  dateChargement?: string | null;

  @ApiPropertyOptional({ description: 'Numéro de lettre de voiture CMR', example: 'CMR-2026-0089' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  numeroCmr?: string | null;

  @ApiPropertyOptional({
    description: 'Statut du voyage',
    enum: VoyageStatut,
    default: VoyageStatut.PLANIFIE,
  })
  @IsOptional()
  @IsEnum(VoyageStatut)
  statut?: VoyageStatut;

  @ApiPropertyOptional({ description: 'Montant du voyage (MAD)', default: 0, example: 12500.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantVoyage?: number;
}
