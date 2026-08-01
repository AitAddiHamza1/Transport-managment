import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VoyageStatut, VoyageType } from '@prisma/client';

export class QueryVoyageDto {
  @ApiPropertyOptional({ description: 'Numéro de page', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Nombre d'éléments par page", default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Recherche textuelle (lieux, CMR, client, conducteur, véhicules)',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ description: 'Filtre par statut de voyage', enum: VoyageStatut })
  @IsOptional()
  @IsEnum(VoyageStatut)
  statut?: VoyageStatut;

  @ApiPropertyOptional({ description: 'Filtre par type de voyage', enum: VoyageType })
  @IsOptional()
  @IsEnum(VoyageType)
  typeVoyage?: VoyageType;

  @ApiPropertyOptional({ description: 'Filtre par nom de client' })
  @IsOptional()
  @IsString()
  nomClient?: string;

  @ApiPropertyOptional({ description: 'Filtre par immatriculation du tracteur' })
  @IsOptional()
  @IsString()
  tracteur?: string;

  @ApiPropertyOptional({ description: 'Filtre par nom du conducteur' })
  @IsOptional()
  @IsString()
  nomConducteur?: string;

  @ApiPropertyOptional({ description: 'Champ de tri', default: 'idVoyage' })
  @IsOptional()
  @IsString()
  @IsIn([
    'idVoyage',
    'typeVoyage',
    'dateChargement',
    'statut',
    'montantVoyage',
    'numeroCmr',
    'lieuChargement',
    'lieuDechargement',
  ])
  sortBy?: string = 'idVoyage';

  @ApiPropertyOptional({ description: 'Sens du tri', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
