import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { LIEUX_EMBARQUEMENT, LieuEmbarquement } from './create-traversee-maritime.dto';

export class QueryTraverseeMaritimeDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  immatriculation?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  idConducteur?: number;

  @IsOptional()
  @IsEnum(LIEUX_EMBARQUEMENT)
  lieuEmbarquement?: LieuEmbarquement;

  @IsOptional()
  @IsEnum(['tous', 'avec_voyage', 'sans_voyage'])
  associationVoyage?: 'tous' | 'avec_voyage' | 'sans_voyage';

  @IsOptional()
  @IsDateString()
  dateDebut?: string;

  @IsOptional()
  @IsDateString()
  dateFin?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
