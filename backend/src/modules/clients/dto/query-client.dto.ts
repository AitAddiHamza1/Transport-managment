import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ClientStatut } from '@prisma/client';

export class QueryClientDto {
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

  @ApiPropertyOptional({ description: 'Recherche textuelle (nom, ICE, téléphone, email, adresse)' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ description: 'Filtre par statut', enum: ClientStatut })
  @IsOptional()
  @IsEnum(ClientStatut)
  statut?: ClientStatut;

  @ApiPropertyOptional({ description: 'Champ de tri', default: 'id' })
  @IsOptional()
  @IsString()
  @IsIn(['id', 'nomEntreprise', 'ice', 'statut', 'limiteCredit', 'delaiPaiementJours'])
  sortBy?: string = 'id';

  @ApiPropertyOptional({ description: 'Sens du tri', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
