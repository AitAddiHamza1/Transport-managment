import { IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const LIEUX_EMBARQUEMENT = ['Tanger Med', 'Nador', 'Almeria', 'Algeciras'] as const;
export type LieuEmbarquement = (typeof LIEUX_EMBARQUEMENT)[number];

export class CreateTraverseeMaritimeDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  idVoyage?: number;

  @IsNotEmpty({ message: 'Le véhicule est requis' })
  @IsString()
  immatriculation: string;

  @IsNotEmpty({ message: 'Le conducteur est requis' })
  @IsInt()
  @Type(() => Number)
  idConducteur: number;

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

  @IsOptional()
  @IsBoolean()
  estVerifiee?: boolean;
}
