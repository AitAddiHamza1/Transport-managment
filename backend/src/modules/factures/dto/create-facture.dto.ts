import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFactureDto {
  @ApiPropertyOptional({
    description: 'Numéro de facture unique (ex. FAC-2026-0001)',
    example: 'FAC-2026-0001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'Le numéro de facture ne peut pas dépasser 30 caractères' })
  numeroFacture?: string;

  @ApiProperty({ description: 'Nom du client facturé', example: 'SARL Transport Atlas' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom du client est obligatoire' })
  @MaxLength(150, { message: 'Le nom du client ne peut pas dépasser 150 caractères' })
  nomClient: string;

  @ApiPropertyOptional({ description: 'ID du voyage lié', example: 42 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'L’ID du voyage doit être un entier' })
  @Min(1, { message: 'L’ID du voyage doit être positif' })
  idVoyage?: number;

  @ApiPropertyOptional({ description: 'Date de facturation (YYYY-MM-DD)', example: '2026-07-23' })
  @IsOptional()
  @IsISO8601({}, { message: 'La date de facture doit être au format ISO8601 (YYYY-MM-DD)' })
  dateFacture?: string;

  @ApiPropertyOptional({ description: 'Délai d’échéance en jours', example: 30, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Les jours d’échéance doivent être un nombre entier' })
  @Min(0, { message: 'Les jours d’échéance ne peuvent pas être négatifs' })
  joursEcheance?: number;

  @ApiProperty({ description: 'Sous-total HT en MAD', example: 15000 })
  @Type(() => Number)
  @IsNumber({}, { message: 'Le sous-total HT doit être un nombre valide' })
  @Min(0, { message: 'Le sous-total HT ne peut pas être négatif' })
  sousTotal: number;

  @ApiPropertyOptional({ description: 'Taux de TVA (%)', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Le taux de TVA doit être un nombre valide' })
  @Min(0, { message: 'Le taux de TVA ne peut pas être négatif' })
  tauxTva?: number;

  @ApiPropertyOptional({
    description: 'Montant en toutes lettres',
    example: 'Dix-huit mille dirhams',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  montantEnLettres?: string;

  @ApiPropertyOptional({
    description: 'Notes ou observations',
    example: 'Prestation de transport de marchandises',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
