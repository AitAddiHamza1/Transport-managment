import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryFactureDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Le numéro de page doit être un entier' })
  @Min(1, { message: 'La page minimale est 1' })
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La limite par page doit être un entier' })
  @Min(1, { message: 'La limite minimale est 1' })
  @Max(100, { message: 'La limite maximale est 100' })
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Recherche globale' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrer par client' })
  @IsOptional()
  @IsString()
  nomClient?: string;

  @ApiPropertyOptional({ description: 'Filtrer par ID voyage' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idVoyage?: number;

  @ApiPropertyOptional({
    description: 'Filtrer par statut (EMISE, PAYEE, PARTIEL, EN_RETARD, ANNULEE)',
  })
  @IsOptional()
  @IsString()
  statut?: string;

  @ApiPropertyOptional({ description: 'Date de début (ISO8601)' })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date de fin (ISO8601)' })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Champ de tri', default: 'id' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'id';

  @ApiPropertyOptional({ description: 'Ordre de tri', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
