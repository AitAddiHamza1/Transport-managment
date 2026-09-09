import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ProvisionCompanyDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom de l’entreprise est requis' })
  @MaxLength(150)
  companyName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nom de l’administrateur est requis' })
  @MaxLength(120)
  adminName!: string;

  @IsEmail({}, { message: 'E-mail d’administrateur invalide' })
  @IsNotEmpty({ message: 'L’e-mail de l’administrateur est requis' })
  @MaxLength(190)
  adminEmail!: string;
}
