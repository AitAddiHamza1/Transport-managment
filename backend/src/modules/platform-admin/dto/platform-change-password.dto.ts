import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class PlatformChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe actuel est requis' })
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Le nouveau mot de passe est requis' })
  @MinLength(6, { message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' })
  newPassword: string;
}
