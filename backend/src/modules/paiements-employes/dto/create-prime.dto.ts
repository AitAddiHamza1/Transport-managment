import { IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreatePrimeDto {
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Le montant de la prime doit être un nombre valide (max 2 décimales)' },
  )
  @IsPositive({ message: 'Le montant de la prime doit être supérieur à 0' })
  montant: number;

  @IsString({ message: 'Date de prime non valide' })
  datePrime: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Le motif ne peut dépasser 255 caractères' })
  motif?: string;
}
