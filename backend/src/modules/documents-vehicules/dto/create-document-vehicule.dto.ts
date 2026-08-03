import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export const VEHICLE_DOCUMENT_TYPES = [
  'CARTE_GRISE',
  'ASSURANCE',
  'VISITE_TECHNIQUE',
  'VIGNETTE',
  'AUTORISATION_TRANSPORT',
  'LICENCE',
  'CERTIFICAT_IMMATRICULATION',
  'CONTRAT_LEASING',
  'DOCUMENT_DOUANIER',
  'AUTRE',
] as const;

export type VehicleDocumentType = (typeof VEHICLE_DOCUMENT_TYPES)[number];

export class CreateDocumentVehiculeDto {
  @IsNotEmpty({ message: "L'immatriculation du véhicule est requise" })
  @IsString({ message: "L'immatriculation doit être une chaîne de caractères" })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  immatriculation: string;

  @IsNotEmpty({ message: 'Le type de document est requis' })
  @IsIn(VEHICLE_DOCUMENT_TYPES, { message: 'Type de document non valide' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  typeDocument: VehicleDocumentType;

  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'Le numéro de document ne doit pas dépasser 60 caractères' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  numeroDocument?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: "L'organisme émetteur ne doit pas dépasser 100 caractères" })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  organismeEmetteur?: string;

  @IsOptional()
  @IsDateString({}, { message: "La date d'émission doit être une date valide (YYYY-MM-DD)" })
  dateEmission?: string;

  @IsOptional()
  @IsDateString({}, { message: "La date d'expiration doit être une date valide (YYYY-MM-DD)" })
  dateExpiration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Les notes ne doivent pas dépasser 255 caractères' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  notes?: string;
}
