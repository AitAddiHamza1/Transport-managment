import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaiementMethode } from '@prisma/client';

export class CreatePaiementClientDto {
  @IsString()
  numeroFacture: string;

  @IsOptional()
  @IsString()
  nomClient?: string;

  @IsOptional()
  @IsString()
  datePaiement?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Le montant reçu doit être un nombre valide' })
  @Min(0.01, { message: 'Le montant reçu doit être supérieur à 0' })
  montantRecu: number;

  @IsEnum(PaiementMethode, {
    message: 'Méthode de paiement invalide (ESPECES, CHEQUE, VIREMENT, CARTE, EFFET, PRELEVEMENT)',
  })
  methodePaiement: PaiementMethode;

  @IsOptional()
  @IsString()
  devise?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Le taux de change doit être un nombre valide' })
  @Min(0.000001, { message: 'Le taux de change doit être supérieur à 0' })
  tauxChange?: number;

  // Lettre de change conditional fields
  @ValidateIf((o) => o.methodePaiement === 'EFFET')
  @IsString()
  @IsNotEmpty({ message: 'Le numéro de lettre de change est obligatoire' })
  lettreNumero?: string;

  @ValidateIf((o) => o.methodePaiement === 'EFFET')
  @IsDateString({}, { message: 'La date d échéance doit être valide' })
  lettreDateEcheance?: string;

  @ValidateIf((o) => o.methodePaiement === 'EFFET')
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Le montant en chiffres doit être un nombre valide (max 2 décimales)' },
  )
  @Min(0.01, { message: 'Le montant en chiffres doit être supérieur à 0' })
  lettreMontant?: number;

  @ValidateIf((o) => o.methodePaiement === 'EFFET')
  @IsString()
  @IsNotEmpty({ message: 'Le bénéficiaire de la lettre de change est obligatoire' })
  lettreBeneficiaire?: string;

  @ValidateIf((o) => o.methodePaiement === 'EFFET')
  @IsString()
  @IsNotEmpty({ message: 'La cause de la lettre de change est obligatoire' })
  lettreCause?: string;

  @ValidateIf((o) => o.methodePaiement === 'EFFET')
  @IsString()
  @IsNotEmpty({ message: 'Le nom du tiré est obligatoire' })
  lettreTireNom?: string;

  @ValidateIf((o) => o.methodePaiement === 'EFFET')
  @IsString()
  @IsNotEmpty({ message: 'L adresse du tiré est obligatoire' })
  lettreTireAdresse?: string;
}
