import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { VEHICLE_DOCUMENT_TYPES } from './create-document-vehicule.dto';

export const DERIVED_DOCUMENT_STATUSES = ['VALIDE', 'BIENTOT_EXPIRE', 'EXPIRE'] as const;
export type DerivedDocumentStatus = (typeof DERIVED_DOCUMENT_STATUSES)[number];

export class QueryDocumentVehiculeDto {
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
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  immatriculation?: string;

  @IsOptional()
  @IsIn(VEHICLE_DOCUMENT_TYPES)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  typeDocument?: string;

  @IsOptional()
  @IsIn(DERIVED_DOCUMENT_STATUSES)
  statut?: DerivedDocumentStatus;

  @IsOptional()
  @IsDateString()
  dateExpirationDebut?: string;

  @IsOptional()
  @IsDateString()
  dateExpirationFin?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  hasFile?: boolean;

  @IsOptional()
  @IsIn(['dateExpiration', 'dateEmission', 'immatriculation', 'typeDocument', 'creeLe'])
  sortBy?: 'dateExpiration' | 'dateEmission' | 'immatriculation' | 'typeDocument' | 'creeLe' =
    'dateExpiration';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}
