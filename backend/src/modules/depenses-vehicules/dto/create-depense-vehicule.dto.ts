import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JustificatifType } from '@prisma/client';

export class CreateDepenseVehiculeDto {
  @ApiPropertyOptional({
    description: 'Type de justificatif de dépense',
    enum: JustificatifType,
    example: JustificatifType.AVEC_FACTURE,
  })
  @IsOptional()
  @IsEnum(JustificatifType)
  justificatifType?: JustificatifType;
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

  @ApiPropertyOptional({ description: 'Identifiant du fournisseur pour la création de dette', example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  idFournisseur?: number;

  @ApiPropertyOptional({ description: 'Référence facture fournisseur' })
  @IsOptional()
  @IsString()
  referenceFactureFournisseur?: string;

  @ApiPropertyOptional({ description: 'Créer automatiquement une intervention dans le carnet d’entretien' })
  @Type(() => String)
  @Transform(({ value }) => {
    if (value === 'false' || value === false || value === '0' || value === 0) {
      return false;
    }
    if (value === 'true' || value === true || value === '1' || value === 1) {
      return true;
    }
    return undefined;
  })
  @IsOptional()
  @IsBoolean()
  isMaintenanceIntervention?: boolean;

  @ApiPropertyOptional({ description: 'Alias pour createMaintenanceIntervention' })
  @Type(() => String)
  @Transform(({ value }) => {
    if (value === 'false' || value === false || value === '0' || value === 0) {
      return false;
    }
    if (value === 'true' || value === true || value === '1' || value === 1) {
      return true;
    }
    return undefined;
  })
  @IsOptional()
  @IsBoolean()
  createMaintenanceIntervention?: boolean;

  @ApiPropertyOptional({ description: 'Libellé de l’intervention (ex: Changement des pneus, Vidange)' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  libelleIntervention?: string;

  @ApiPropertyOptional({ description: 'Identifiant de la règle d’entretien liée (optionnel / historique)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  idRule?: number;

  @ApiPropertyOptional({ description: 'Kilométrage réalisé lors de l’entretien' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  kilometrageRealise?: number;

  @ApiPropertyOptional({ description: 'Intervalle avant prochain entretien en km (> 0)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  intervalleKm?: number;

  @ApiPropertyOptional({ description: 'Notes pour l’intervention d’entretien' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  notesIntervention?: string;
}
