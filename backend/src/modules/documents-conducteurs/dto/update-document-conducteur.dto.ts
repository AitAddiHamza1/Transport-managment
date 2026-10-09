import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDocumentConducteurDto {
  @IsOptional()
  @IsString({ message: 'Le type de document doit être une chaîne de caractères' })
  @MaxLength(50, { message: 'Le type de document ne doit pas dépasser 50 caractères' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  typeDocument?: string;

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
