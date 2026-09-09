import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelPaiementFournisseurDto {
  @IsString({ message: 'Le motif d annulation doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le motif d annulation est obligatoire' })
  @MaxLength(255, { message: 'Le motif d annulation ne peut dépasser 255 caractères' })
  motifAnnulation: string;
}
