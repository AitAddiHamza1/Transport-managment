import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsDateString,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContratType, EmployeStatut, PaiementModeEmploye } from '@prisma/client';

export class CreateEmployeDto {
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @IsString()
  @MaxLength(100)
  nom: string;

  @IsNotEmpty({ message: 'Le prénom est obligatoire' })
  @IsString()
  @MaxLength(100)
  prenom: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  cin?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Date de naissance invalide' })
  dateNaissance?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telephone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Adresse email invalide' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  adresse?: string;

  @IsNotEmpty({ message: 'Le poste est obligatoire' })
  @IsString()
  @MaxLength(100)
  poste: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  departement?: string;

  @IsNotEmpty({ message: 'La date d’embauche est obligatoire' })
  @IsDateString({}, { message: 'Date d’embauche invalide' })
  dateEmbauche: string;

  @IsNotEmpty({ message: 'Le type de contrat est obligatoire' })
  @IsEnum(ContratType, { message: 'Type de contrat invalide' })
  typeContrat: ContratType;

  @IsOptional()
  @IsEnum(EmployeStatut, { message: 'Statut employé invalide' })
  statut?: EmployeStatut;

  @IsOptional()
  @IsDateString({}, { message: 'Date de sortie invalide' })
  dateSortie?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  motifSortie?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Le salaire de base doit être un nombre valide' })
  @Min(0, { message: 'Le salaire de base ne peut pas être négatif' })
  salaireBase?: number;

  @IsOptional()
  @IsEnum(PaiementModeEmploye, { message: 'Mode de paiement invalide' })
  modePaiement?: PaiementModeEmploye;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nomBanque?: string;

  @IsOptional()
  @IsString()
  @MaxLength(34)
  rib?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observations?: string;
}
