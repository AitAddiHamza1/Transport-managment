import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelVersementDto {
  @IsString()
  @IsNotEmpty({ message: 'Le motif d’annulation est obligatoire' })
  @MaxLength(255)
  motifAnnulation: string;
}
