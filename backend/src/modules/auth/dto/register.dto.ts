import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Jean Dupont', maxLength: 120, description: 'Nom complet de l\'utilisateur' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  @MaxLength(120, { message: 'Le nom ne doit pas dépasser 120 caractères' })
  nom!: string;

  @ApiProperty({ example: 'jean.dupont@transport.com', description: 'E-mail de connexion' })
  @IsEmail({}, { message: 'E-mail invalide' })
  @MaxLength(190, { message: 'L\'e-mail ne doit pas dépasser 190 caractères' })
  email!: string;

  @ApiProperty({ example: 'Secr3tPassword!', minLength: 6, maxLength: 72, description: 'Mot de passe' })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  @MaxLength(72, { message: 'Le mot de passe ne doit pas dépasser 72 caractères' })
  password!: string;
}
