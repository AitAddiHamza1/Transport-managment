import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum StatutPaiementFilter {
  EN_ATTENTE = 'EN_ATTENTE',
  PARTIELLEMENT_PAYEE = 'PARTIELLEMENT_PAYEE',
  PAYEE = 'PAYEE',
}

export class QueryDetteFournisseurDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idFournisseur?: number;

  @IsOptional()
  @IsEnum(StatutPaiementFilter, { message: 'Statut de paiement non valide' })
  statutPaiement?: StatutPaiementFilter;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  estEnRetard?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  dueDateStart?: string;

  @IsOptional()
  @IsDateString()
  dueDateEnd?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'creeLe';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
