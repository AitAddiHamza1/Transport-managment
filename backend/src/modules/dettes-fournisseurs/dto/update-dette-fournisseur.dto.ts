import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateDetteFournisseurDto {
  @IsOptional()
  @IsInt({ message: 'Fournisseur non valide' })
  @Min(1, { message: 'Fournisseur non valide' })
  idFournisseur?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'La référence facture fournisseur ne peut dépasser 60 caractères' })
  referenceFactureFournisseur?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Date de dette non valide' })
  dateDette?: string;

  @IsOptional()
  @IsInt({ message: 'Le délai de paiement doit être un nombre entier' })
  @Min(0, { message: 'Le délai de paiement ne peut être négatif' })
  delaiPaiementJours?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Date d echéance non valide' })
  dateEcheance?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Le montant dû doit être un nombre valide' })
  @Min(0.01, { message: 'Le montant dû doit être supérieur à 0' })
  montantDu?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'La catégorie ne peut dépasser 60 caractères' })
  categorie?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Les remarques ne peuvent dépasser 500 caractères' })
  remarques?: string;
}
