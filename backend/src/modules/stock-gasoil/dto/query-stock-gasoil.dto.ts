import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';
import { TypeMouvementGasoil } from '@prisma/client';

export enum PeriodPresetStock {
  AUJOURDHUI = 'AUJOURDHUI',
  CE_MOIS = 'CE_MOIS',
  CE_TRIMESTRE = 'CE_TRIMESTRE',
  CETTE_ANNEE = 'CETTE_ANNEE',
  PERSONNALISE = 'PERSONNALISE',
}

export class QueryStockGasoilDto {
  @ApiPropertyOptional({ description: 'Numéro de page', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Nombre d’éléments par page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Recherche textuelle (N° Bon, Fournisseur, Immatriculation, Chauffeur)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrer par type de mouvement (ENTREE / SORTIE)', enum: TypeMouvementGasoil })
  @IsOptional()
  @IsEnum(TypeMouvementGasoil)
  typeMouvement?: TypeMouvementGasoil;

  @ApiPropertyOptional({ description: 'Filtrer par immatriculation véhicule' })
  @IsOptional()
  @IsString()
  immatriculation?: string;

  @ApiPropertyOptional({ description: 'Période pré-définie', enum: PeriodPresetStock })
  @IsOptional()
  @IsEnum(PeriodPresetStock)
  preset?: PeriodPresetStock;

  @ApiPropertyOptional({ description: 'Date de début (YYYY-MM-DD)' })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date de fin (YYYY-MM-DD)' })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Champ de tri', default: 'dateMouvement' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Ordre de tri (asc / desc)', default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
