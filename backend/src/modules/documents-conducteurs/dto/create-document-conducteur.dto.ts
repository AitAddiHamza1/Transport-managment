import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export const CONDUCTEUR_DOCUMENT_TYPES = [
  'PASSEPORT',
  'VISA',
  'PERMIS_DE_CONDUIRE',
  'CARTE_DE_SANTE',
  'AUTRE',
] as const;

export class CreateDocumentConducteurDto {
  @IsNotEmpty({ message: 'Le conducteur est requis' })
  @IsInt({ message: "L'ID du conducteur doit être un entier" })
  @Min(1)
  @Transform(({ value }) => (value !== undefined && value !== null ? Number(value) : value))
  idConducteur: number;

  @IsNotEmpty({ message: 'Le type de document est requis' })
  @IsString({ message: 'Le type de document doit être une chaîne de caractères' })
  @MaxLength(50, { message: 'Le type de document ne doit pas dépasser 50 caractères' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  typeDocument: string;

  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'Le numéro de document ne doit pas dépasser 60 caractères' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  numeroDocument?: string;

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
