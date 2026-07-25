import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaiementMethode } from '@prisma/client';

export class QueryPaiementClientDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  nomClient?: string;

  @IsOptional()
  @IsString()
  numeroFacture?: string;

  @IsOptional()
  @IsEnum(PaiementMethode)
  methodePaiement?: PaiementMethode;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
