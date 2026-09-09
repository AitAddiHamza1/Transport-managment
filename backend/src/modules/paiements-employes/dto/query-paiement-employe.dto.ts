import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaiementModeEmploye } from '@prisma/client';

export type StatutPaiementEmployeUnion = 'EN_ATTENTE' | 'PARTIELLEMENT_PAYE' | 'PAYE';

export class QueryPaiementEmployeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idEmploye?: number;

  @IsOptional()
  @IsString()
  periode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  annee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mois?: number;

  @IsOptional()
  @IsString()
  statut?: StatutPaiementEmployeUnion;

  @IsOptional()
  @IsEnum(PaiementModeEmploye)
  modePaiement?: PaiementModeEmploye;

  @IsOptional()
  @IsString()
  departement?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'creeLe';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
