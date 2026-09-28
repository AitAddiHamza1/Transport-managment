import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CancelPaiementClientDto {
  @IsString({ message: 'Le motif d’annulation doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le motif d’annulation est obligatoire' })
  @MinLength(3, { message: 'Le motif d’annulation doit contenir au moins 3 caractères' })
  @MaxLength(255, { message: 'Le motif d’annulation ne peut pas dépasser 255 caractères' })
  motifAnnulation: string;
}
