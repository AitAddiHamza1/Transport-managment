import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
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
}
