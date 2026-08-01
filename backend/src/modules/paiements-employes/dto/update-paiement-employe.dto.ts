import { IsNumber, IsOptional, IsPositive, IsString, Matches, MaxLength } from 'class-validator';

export class UpdatePaiementEmployeDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'La période doit être au format AAAA-MM (ex: 2026-07)',
  })
  periode?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive({ message: 'Le salaire de référence doit être supérieur à 0' })
  salaireReference?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive({ message: 'Le montant dû doit être supérieur à 0' })
  montantDu?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  motifAjustement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
