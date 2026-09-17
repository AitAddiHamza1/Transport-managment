import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateChequeDto {
  @IsString({ message: 'Le numéro du chèque doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le numéro du chèque est obligatoire' })
  numero: string;

  @IsOptional()
  @IsString({ message: 'La série du chèque doit être une chaîne de caractères' })
  serie?: string;

  @IsDateString({}, { message: 'La date du chèque doit être une date valide' })
  @IsNotEmpty({ message: 'La date du chèque est obligatoire' })
  dateCheque: string;

  @IsString({ message: 'La banque du chèque doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'La banque est obligatoire' })
  banque: string;

  @IsOptional()
  @IsString({ message: 'L agence de la banque doit être une chaîne de caractères' })
  agence?: string;

  @IsString({ message: 'Le bénéficiaire du chèque doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le bénéficiaire est obligatoire' })
  beneficiaire: string;

  @IsOptional()
  @IsString({ message: 'La ville doit être une chaîne de caractères' })
  ville?: string;
}

export interface ChequeDataPayload {
  numero: string;
  serie?: string | null;
  dateCheque: Date;
  banque: string;
  agence?: string | null;
  beneficiaire: string;
  ville?: string | null;
}
