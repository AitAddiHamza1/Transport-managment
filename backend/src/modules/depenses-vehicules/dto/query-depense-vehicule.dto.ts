import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryDepenseVehiculeDto {
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
    description: 'Recherche textuelle (catégorie, immatriculation, description, facture)',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ description: 'Filtre par catégorie de dépense' })
  @IsOptional()
  @IsString()
  categorieDepense?: string;

  @ApiPropertyOptional({ description: 'Filtre par immatriculation du véhicule' })
  @IsOptional()
  @IsString()
  immatriculation?: string;

  @ApiPropertyOptional({ description: 'Champ de tri', default: 'idDepense' })
  @IsOptional()
  @IsString()
  @IsIn(['idDepense', 'categorieDepense', 'immatriculation', 'montant', 'dateDepense'])
  sortBy?: string = 'idDepense';

  @ApiPropertyOptional({ description: 'Sens du tri', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
