import { Transform, Type } from 'class-transformer';
import {
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepenseVehiculeDto {
  @ApiProperty({
    description: 'Catégorie de la dépense (e.g. ENTRETIEN, REPARATION, ASSURANCE, TAXE, PNEUS)',
    example: 'ENTRETIEN',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  categorieDepense: string;

  @ApiPropertyOptional({ description: 'Type ou référence de facture', example: 'FAC-2026-0045' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  typeFacture?: string | null;

  @ApiProperty({ description: 'Immatriculation du véhicule concerné *', example: '12345-A-1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  immatriculation: string;

  @ApiPropertyOptional({
    description: 'Description détaillée de la dépense',
    example: 'Vidange complète et remplacement des filtres',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Chemin ou URL du reçu joint',
    example: '/uploads/recus/vidange-123.pdf',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  fichierRecu?: string | null;

  @ApiProperty({ description: 'Montant de la dépense (MAD) *', example: 1850.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montant: number;

  @ApiPropertyOptional({ description: 'Date de la dépense (YYYY-MM-DD)', example: '2026-07-20' })
  @IsOptional()
  @IsISO8601()
  dateDepense?: string;
}
