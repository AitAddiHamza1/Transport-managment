import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { PaiementMethode } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreatePaiementFournisseurDto {
  @Type(() => Number)
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

  // Lettre de change conditional fields
  @ValidateIf((o) => o.modePaiement === 'EFFET')
  @IsString()
  @IsNotEmpty({ message: 'Le numéro de lettre de change est obligatoire' })
  lettreNumero?: string;

  @ValidateIf((o) => o.modePaiement === 'EFFET')
  @IsDateString({}, { message: 'La date d échéance doit être valide' })
  lettreDateEcheance?: string;

  @ValidateIf((o) => o.modePaiement === 'EFFET')
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Le montant en chiffres doit être un nombre valide (max 2 décimales)' },
  )
  @Min(0.01, { message: 'Le montant en chiffres doit être supérieur à 0' })
  lettreMontant?: number;

  @ValidateIf((o) => o.modePaiement === 'EFFET')
  @IsString()
  @IsNotEmpty({ message: 'Le bénéficiaire de la lettre de change est obligatoire' })
  lettreBeneficiaire?: string;

  @ValidateIf((o) => o.modePaiement === 'EFFET')
  @IsString()
  @IsNotEmpty({ message: 'La cause de la lettre de change est obligatoire' })
  lettreCause?: string;

  @ValidateIf((o) => o.modePaiement === 'EFFET')
  @IsString()
  @IsNotEmpty({ message: 'Le nom du tiré est obligatoire' })
  lettreTireNom?: string;

  @ValidateIf((o) => o.modePaiement === 'EFFET')
  @IsString()
  @IsNotEmpty({ message: 'L adresse du tiré est obligatoire' })
  lettreTireAdresse?: string;

  // Chèque conditional fields
  @IsOptional()
  cheque?: any;

  @IsOptional()
  @IsString()
  chequeNumero?: string;

  @IsOptional()
  @IsString()
  chequeSerie?: string;

  @IsOptional()
  @IsString()
  chequeDateCheque?: string;

  @IsOptional()
  @IsString()
  chequeDate?: string;

  @IsOptional()
  @IsString()
  chequeBanque?: string;

  @IsOptional()
  @IsString()
  chequeAgence?: string;

  @IsOptional()
  @IsString()
  chequeBeneficiaire?: string;

  @IsOptional()
  @IsString()
  chequeVille?: string;
}

