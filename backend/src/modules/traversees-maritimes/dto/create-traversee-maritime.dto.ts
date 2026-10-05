import { IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const LIEUX_EMBARQUEMENT = ['Tanger Med', 'Nador', 'Almeria', 'Algeciras'] as const;
export type LieuEmbarquement = (typeof LIEUX_EMBARQUEMENT)[number];

export class CreateTraverseeMaritimeDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  idVoyage?: number;

  @IsOptional()
  @IsString()
  immatriculation?: string | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  idConducteur?: number | null;

  @IsOptional()
  @IsDateString({}, { message: "Date d'opération invalide" })
  dateOperation?: string;

  // --- Section 1 : Circuit Portuaire ---
  @IsOptional()
  @IsBoolean()
  hasCircuitPortuaire?: boolean;

  @IsOptional()
  @IsString()
  circuitNature?: string | null;

  @IsOptional()
  @IsNumber({}, { message: 'Le montant du circuit doit être un nombre' })
  @Min(0, { message: 'Le montant du circuit doit être supérieur ou égal à 0' })
  @Type(() => Number)
  circuitMontant?: number | null;

  @IsOptional()
  @IsString()
  circuitNotes?: string | null;

  @IsOptional()
  @IsBoolean()
  circuitEstVerifie?: boolean;

  // --- Section 2 : Bateau ---
  @IsOptional()
  @IsBoolean()
  hasBateau?: boolean;

  @IsOptional()
  @IsDateString({}, { message: 'Date de traversée invalide' })
  dateTraversee?: string | null;

  @IsOptional()
  @IsString()
  bateau?: string | null;

  @IsOptional()
  @IsEnum(LIEUX_EMBARQUEMENT, {
    message: "Le lieu d'embarquement doit être l'un des suivants : Tanger Med, Nador, Almeria, Algeciras",
  })
  lieuEmbarquement?: LieuEmbarquement | null;

  @IsOptional()
  @IsNumber({}, { message: 'Le prix doit être un nombre' })
  @Min(0, { message: 'Le prix doit être supérieur ou égal à 0' })
  @Type(() => Number)
  prix?: number | null;

  @IsOptional()
  @IsEnum(['MAD'], { message: 'Seule la devise MAD est autorisée' })
  devise?: string;

  @IsOptional()
  @IsBoolean()
  estVerifiee?: boolean;

  // --- Section 3 : Transit Aljaziras ---
  @IsOptional()
  @IsBoolean()
  hasTransitAljaziras?: boolean;

  @IsOptional()
  @IsString()
  transitTypeService?: string | null;

  @IsOptional()
  @IsNumber({}, { message: 'Le prix du transit doit être un nombre' })
  @Min(0, { message: 'Le prix du transit doit être supérieur ou égal à 0' })
  @Type(() => Number)
  transitPrix?: number | null;

  @IsOptional()
  @IsString()
  transitNotes?: string | null;

  @IsOptional()
  @IsBoolean()
  transitEstVerifie?: boolean;
}

