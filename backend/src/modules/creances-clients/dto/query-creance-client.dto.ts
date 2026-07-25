import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CreanceStatut } from '@prisma/client';

export class QueryCreanceClientDto {
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
  @IsEnum(CreanceStatut, {
    message: 'Le statut de paiement doit être NON_PAYE, PARTIEL, PAYE ou EN_RETARD',
  })
  statutPaiement?: CreanceStatut;

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
