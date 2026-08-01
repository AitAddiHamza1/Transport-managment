import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaiementMethode } from '@prisma/client';

export class CreatePaiementFournisseurDto {
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Le montant doit être un nombre valide (max 2 décimales)' },
  )
  @Min(0.01, { message: 'Le montant du paiement doit être supérieur à 0' })
  montant: number;

  @IsEnum(PaiementMethode, { message: 'Mode de paiement non valide' })
  modePaiement: PaiementMethode;

  @IsOptional()
  @IsDateString({}, { message: 'Date de paiement non valide' })
  datePaiement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80, { message: 'La référence externe ne peut dépasser 80 caractères' })
  referenceExterne?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Les notes ne peuvent dépasser 500 caractères' })
  notes?: string;
}
