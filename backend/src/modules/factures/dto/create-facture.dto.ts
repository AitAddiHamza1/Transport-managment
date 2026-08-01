import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFactureDto {
  @ApiProperty({ description: 'ID du voyage facturé *', example: 42 })
  @Type(() => Number)
  @IsInt({ message: 'L’ID du voyage doit être un nombre entier' })
  @Min(1, { message: 'L’ID du voyage est obligatoire' })
  idVoyage: number;

  @ApiPropertyOptional({ description: 'Date de facturation (YYYY-MM-DD)', example: '2026-07-25' })
  @IsOptional()
  @IsISO8601({}, { message: 'La date de facture doit être au format ISO8601 (YYYY-MM-DD)' })
  dateFacture?: string;

  @ApiPropertyOptional({ description: 'Délai d’échéance en jours', example: 30, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Les jours d’échéance doivent être un nombre entier' })
  @Min(0, { message: 'Les jours d’échéance ne peuvent pas être négatifs' })
  joursEcheance?: number;

  @ApiPropertyOptional({ description: 'Taux de TVA (%)', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Le taux de TVA doit être un nombre valide' })
  @Min(0, { message: 'Le taux de TVA ne peut pas être négatif' })
  @Max(100, { message: 'Le taux de TVA ne peut pas dépasser 100%' })
  tauxTva?: number;

  @ApiPropertyOptional({
    description: 'Notes ou observations',
    example: 'Prestation de transport routier de marchandises',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  // Optional legacy preview fields (ignored by backend authoritative derivation)
  @IsOptional()
  @IsString()
  nomClient?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sousTotal?: number;

  @IsOptional()
  @IsString()
  montantEnLettres?: string;
}
