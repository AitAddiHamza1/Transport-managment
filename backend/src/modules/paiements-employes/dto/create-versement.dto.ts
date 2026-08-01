import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { PaiementModeEmploye } from '@prisma/client';

export class CreateVersementDto {
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
