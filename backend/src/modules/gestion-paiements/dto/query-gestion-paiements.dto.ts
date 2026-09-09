import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const GESTION_PAIEMENTS_SOURCE_TYPES = [
  'CLIENT_PAYMENT',
  'SUPPLIER_PAYMENT',
  'EMPLOYEE_PAYMENT',
  'ADMINISTRATIVE_EXPENSE',
] as const;

export type GestionPaiementsSourceType = (typeof GESTION_PAIEMENTS_SOURCE_TYPES)[number];

export const GESTION_PAIEMENTS_DIRECTIONS = ['IN', 'OUT'] as const;
export type GestionPaiementsDirection = (typeof GESTION_PAIEMENTS_DIRECTIONS)[number];

export const GESTION_PAIEMENTS_STATUSES = ['ACTIVE', 'CANCELLED'] as const;
export type GestionPaiementsStatus = (typeof GESTION_PAIEMENTS_STATUSES)[number];

export const GESTION_PAIEMENTS_METHODS = [
  'ESPECES',
  'VIREMENT',
  'CHEQUE',
  'CARTE',
  'PRELEVEMENT',
  'EFFET',
  'AUTRE',
] as const;
export type GestionPaiementsMethod = (typeof GESTION_PAIEMENTS_METHODS)[number];

export const GESTION_PAIEMENTS_PARTY_TYPES = [
  'CLIENT',
  'SUPPLIER',
  'EMPLOYEE',
  'ADMINISTRATIVE_CATEGORY',
] as const;
export type GestionPaiementsPartyType = (typeof GESTION_PAIEMENTS_PARTY_TYPES)[number];

export class QueryGestionPaiementsDto {
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
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @IsOptional()
  @IsIn(GESTION_PAIEMENTS_SOURCE_TYPES)
  sourceType?: GestionPaiementsSourceType;

  @IsOptional()
  @IsIn(GESTION_PAIEMENTS_DIRECTIONS)
  direction?: GestionPaiementsDirection;

  @IsOptional()
  @IsIn(GESTION_PAIEMENTS_METHODS)
  paymentMethod?: GestionPaiementsMethod;

  @IsOptional()
  @IsIn(GESTION_PAIEMENTS_STATUSES)
  status?: GestionPaiementsStatus;

  @IsOptional()
  @IsDateString()
  dateDebut?: string;

  @IsOptional()
  @IsDateString()
  dateFin?: string;

  @IsOptional()
  @IsIn(GESTION_PAIEMENTS_PARTY_TYPES)
  partyType?: GestionPaiementsPartyType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountMax?: number;

  @IsOptional()
  @IsIn(['date', 'amount', 'sourceType', 'reference'])
  sortBy?: 'date' | 'amount' | 'sourceType' | 'reference' = 'date';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
