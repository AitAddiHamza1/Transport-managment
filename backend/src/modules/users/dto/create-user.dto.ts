import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { UserStatut } from '@prisma/client';
import type { PermissionsMatrix } from '../../../common/permissions/permissions';

export class CreateUserDto {
  @ApiProperty({ example: 'Nadia Fassi', maxLength: 120 })
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  @MaxLength(120)
  nom!: string;

  @ApiProperty({ example: 'nadia@transport.ma' })
  @IsEmail({}, { message: 'E-mail invalide' })
  @MaxLength(190)
  email!: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telephone?: string;

  @ApiProperty({ minLength: 6, maxLength: 72, description: 'Mot de passe (haché côté serveur)' })
  @IsString()
  @MinLength(6, { message: 'Au moins 6 caractères' })
  @MaxLength(72)
  motDePasse!: string;

  @ApiProperty({ example: 2, description: 'Identifiant du rôle' })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Le rôle est requis' })
  idRole!: number;

  @ApiPropertyOptional({ enum: UserStatut, default: UserStatut.ACTIF })
  @IsOptional()
  @IsEnum(UserStatut)
  statut?: UserStatut;

  @ApiPropertyOptional({
    description:
      'Permissions personnalisées (matrice module → actions). Utilisé quand le profil est PERSONNALISE.',
    example: {
      voyages: {
        voir: true,
        ajouter: true,
        modifier: false,
        supprimer: false,
        exporter: false,
        imprimer: false,
        valider: false,
      },
    },
  })
  @IsOptional()
  @IsObject()
  permissions?: PermissionsMatrix;
}
