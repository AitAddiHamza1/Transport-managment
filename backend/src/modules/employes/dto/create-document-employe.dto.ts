import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDocumentEmployeDto {
  @IsNotEmpty({ message: 'Le type de document est obligatoire' })
  @IsString()
  @MaxLength(50)
  typeDocument: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  numeroDocument?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Date d’émission invalide' })
  dateEmission?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Date d’expiration invalide' })
  dateExpiration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}
