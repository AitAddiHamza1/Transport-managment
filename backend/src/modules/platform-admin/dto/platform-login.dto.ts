import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class PlatformLoginDto {
  @ApiProperty({ example: 'admin@platform.ma' })
  @IsEmail({}, { message: 'Adresse email invalide' })
  @IsNotEmpty({ message: 'L’email est requis' })
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;
}
