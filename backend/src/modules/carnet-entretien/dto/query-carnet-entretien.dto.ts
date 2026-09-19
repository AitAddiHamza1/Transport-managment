import { ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryCarnetEntretienDto {
  @ApiPropertyOptional({ description: 'Numéro de page', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Nombre d’éléments par page (max 100)', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filtrer par immatriculation' })
  @IsOptional()
  @IsString()
  immatriculation?: string;

  @ApiPropertyOptional({ enum: MaintenanceStatus, description: 'Filtrer par statut' })
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  statut?: MaintenanceStatus;

  @ApiPropertyOptional({ description: 'Filtrer par identifiant de règle' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idRule?: number;

  @ApiPropertyOptional({ description: 'Date de début d’intervention (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date de fin d’intervention (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Recherche textuelle (libellé, immatriculation, notes)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Champ de tri', default: 'dateIntervention' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'dateIntervention';

  @ApiPropertyOptional({ description: 'Ordre de tri', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
