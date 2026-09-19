import { IsEnum, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { StatutInstrumentBancaire } from '@prisma/client';

export enum InstrumentType {
  CHEQUE = 'CHEQUE',
  LETTRE_DE_CHANGE = 'LETTRE_DE_CHANGE',
}

export enum InstrumentSource {
  CLIENT = 'CLIENT',
  FOURNISSEUR = 'FOURNISSEUR',
}

export class QueryChequesLettresChangeDto {
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
  search?: string;

  @IsOptional()
  @IsEnum(InstrumentType)
  type?: InstrumentType;

  @IsOptional()
  @IsEnum(InstrumentSource)
  source?: InstrumentSource;

  @IsOptional()
  @IsEnum(StatutInstrumentBancaire)
  statutBancaire?: StatutInstrumentBancaire;

  @IsOptional()
  @IsString()
  dateDebut?: string;

  @IsOptional()
  @IsString()
  dateFin?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
