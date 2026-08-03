import {
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCompanySettingsDto {
  @IsOptional()
  @IsString()
  nomEntreprise?: string;

  @IsOptional()
  @IsString()
  nomLegal?: string;

  @IsOptional()
  @IsString()
  adresse?: string;

  @IsOptional()
  @IsString()
  ville?: string;

  @IsOptional()
  @IsString()
  pays?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  telephoneSecondaire?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Adresse email invalide' })
  email?: string;

  @IsOptional()
  @IsString()
  siteWeb?: string;

  @IsOptional()
  @IsString()
  ice?: string;

  @IsOptional()
  @IsString()
  identifiantFiscal?: string;

  @IsOptional()
  @IsString()
  registreCommerce?: string;

  @IsOptional()
  @IsString()
  patente?: string;

  @IsOptional()
  @IsString()
  cnss?: string;

  @IsOptional()
  @IsString()
  nomBanque?: string;

  @IsOptional()
  @IsString()
  rib?: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  swiftBic?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Le taux de TVA par défaut doit être un nombre valide' })
  @Min(0, { message: 'Le taux de TVA par défaut ne peut pas être négatif' })
  @Max(100, { message: 'Le taux de TVA ne peut pas dépasser 100%' })
  tauxTvaParDefaut?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  delaiPaiementParDefaut?: number;

  @IsOptional()
  @IsString()
  devise?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{0,10}$/, {
    message:
      'Le préfixe de facture doit contenir uniquement des lettres, chiffres, tirets ou underscore (max 10 caractères)',
  })
  prefixeFacture?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[-/.]{0,2}$/, {
    message: 'Le séparateur de facture doit être "-", "/", "." ou vide',
  })
  separateurFacture?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  paddingFacture?: number;

  @IsOptional()
  @IsString()
  @IsIn(['CLASSIC_TRANSPORT', 'TRANSPORT_V2'], {
    message: 'Le template de facture doit être CLASSIC_TRANSPORT ou TRANSPORT_V2',
  })
  templateFacture?: string;

  @IsOptional()
  @IsString()
  textePiedDePage?: string;

  @IsOptional()
  @IsString()
  noteLegaleTva?: string;
}
