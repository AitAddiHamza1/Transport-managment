import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateStockEntreeDto {
  @ApiPropertyOptional({ description: "Date d'entrée en stock (YYYY-MM-DD)", example: '2026-09-19' })
  @IsOptional()
  @IsISO8601({}, { message: "La date d'entrée doit être au format ISO8601 (YYYY-MM-DD)" })
  dateMouvement?: string;

  @ApiProperty({ description: 'Quantité de carburant entrée en litres', example: 1000.0 })
  @Type(() => Number)
  @IsNumber({}, { message: 'La quantité en litres doit être un nombre valide' })
  @Min(0.01, { message: 'La quantité entrée doit être supérieure à 0' })
  quantiteLitres: number;

  @ApiProperty({ description: 'Prix unitaire d’achat par litre (MAD)', example: 12.5 })
  @Type(() => Number)
  @IsNumber({}, { message: 'Le prix unitaire doit être un nombre valide' })
  @Min(0.01, { message: 'Le prix unitaire doit être supérieur à 0' })
  prixUnitaire: number;

  @ApiPropertyOptional({ description: 'Nom du fournisseur ou station d’origine', example: 'Afriquia Citerne' })
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'Le nom du fournisseur ne peut pas dépasser 150 caractères' })
  nomFournisseur?: string;

  @ApiPropertyOptional({ description: 'N° Bon de livraison / Référence facture', example: 'BL-2026-889' })
  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'La référence ne peut pas dépasser 60 caractères' })
  referenceFacture?: string;

  @ApiPropertyOptional({ description: 'Remarques / Observations', example: 'Remplissage citerne principale Dépôt' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Les remarques ne peuvent pas dépasser 500 caractères' })
  remarques?: string;
}
