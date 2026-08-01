import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClientStatut } from '@prisma/client';

export class CreateClientDto {
  @ApiProperty({
    description: 'Nom de l’entreprise / Raison sociale du client',
    example: 'Société Maghreb Transport',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  nomEntreprise: string;

  @ApiPropertyOptional({
    description: 'Identifiant Commun de l’Entreprise (ICE 15 chiffres)',
    example: '001524389000045',
  })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() || null : value,
  )
  ice?: string | null;

  @ApiPropertyOptional({ description: 'Numéro de téléphone du client', example: '+212522001122' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  telephone?: string | null;

  @ApiPropertyOptional({
    description: 'Adresse email du client',
    example: 'contact@maghreb-transport.ma',
  })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() || null : value,
  )
  email?: string | null;

  @ApiPropertyOptional({
    description: 'Adresse postale complète',
    example: 'Boulevard Zerktouni, Casablanca',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  adresse?: string | null;

  @ApiPropertyOptional({ description: 'Délai de paiement accordé en jours', default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  delaiPaiementJours?: number = 30;

  @ApiPropertyOptional({ description: 'Limite de crédit accordée (MAD)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(999999999999.99)
  limiteCredit?: number = 0;

  @ApiPropertyOptional({
    description: 'Statut du client',
    enum: ClientStatut,
    default: ClientStatut.ACTIF,
  })
  @IsOptional()
  @IsEnum(ClientStatut)
  statut?: ClientStatut;
}
