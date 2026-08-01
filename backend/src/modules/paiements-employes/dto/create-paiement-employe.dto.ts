import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaiementModeEmploye } from '@prisma/client';

export class InitialVersementDto {
  @IsNumber()
  @IsPositive({ message: 'Le montant du versement doit être supérieur à 0' })
  montant: number;

  @IsString()
  dateVersement: string;

  @IsEnum(PaiementModeEmploye, { message: 'Mode de paiement invalide' })
  modePaiement: PaiementModeEmploye;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  referenceExterne?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreatePaiementEmployeDto {
  @IsInt()
  @Min(1)
  idEmploye: number;

  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'La période doit être au format AAAA-MM (ex: 2026-07)',
  })
  periode: string;

  @IsOptional()
  @IsNumber()
  @IsPositive({ message: 'Le salaire de référence doit être supérieur à 0' })
  salaireReference?: number;

  @IsNumber()
  @IsPositive({ message: 'Le montant dû doit être supérieur à 0' })
  montantDu: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  motifAjustement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => InitialVersementDto)
  initialVersement?: InitialVersementDto;
}
