import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClientStatut } from '@prisma/client';

export class CreateFournisseurDto {
  @ApiProperty({
    description: 'Raison sociale / Nom du fournisseur',
    example: 'TotalEnergies Marketing Maroc',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  nomFournisseur: string;

  @ApiPropertyOptional({
    description: 'Identifiant Commun de l’Entreprise (ICE 15 chiffres)',
    example: '001654321000099',
  })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() || null : value,
  )
  ice?: string | null;

  @ApiPropertyOptional({
    description: 'Numéro de téléphone du fournisseur',
    example: '+212522998877',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  telephone?: string | null;

  @ApiPropertyOptional({
    description: 'Adresse email du fournisseur',
    example: 'contact@totalenergies.ma',
  })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() || null : value,
  )
  email?: string | null;

  @ApiPropertyOptional({
    description: 'Adresse postale complète',
    example: 'Zone Industrielle, Mohammedia',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  adresse?: string | null;

  @ApiPropertyOptional({
    description: 'Statut du fournisseur',
    enum: ClientStatut,
    default: ClientStatut.ACTIF,
  })
  @IsOptional()
  @IsEnum(ClientStatut)
  statut?: ClientStatut;
}
