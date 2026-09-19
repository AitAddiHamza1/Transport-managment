import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { LIEUX_EMBARQUEMENT, LieuEmbarquement } from '../../traversees-maritimes/dto/create-traversee-maritime.dto';

export class CreateVoyageTraverseeDto {
  @IsNotEmpty({ message: 'La date de traversée est requise' })
  @IsDateString({}, { message: 'Date de traversée invalide' })
  dateTraversee: string;

  @IsNotEmpty({ message: 'Le nom du bateau est requis' })
  @IsString()
  bateau: string;

  @IsNotEmpty({ message: "Le lieu d'embarquement est requis" })
  @IsEnum(LIEUX_EMBARQUEMENT, {
    message: "Le lieu d'embarquement doit être l'un des suivants : Tanger Med, Nador, Almeria, Algeciras",
  })
  lieuEmbarquement: LieuEmbarquement;

  @IsNotEmpty({ message: 'Le prix est requis' })
  @IsNumber({}, { message: 'Le prix doit être un nombre' })
  @Min(0, { message: 'Le prix doit être supérieur ou égal à 0' })
  @Type(() => Number)
  prix: number;

  @IsOptional()
  @IsEnum(['MAD'], { message: 'Seule la devise MAD est autorisée' })
  devise?: string;
}
