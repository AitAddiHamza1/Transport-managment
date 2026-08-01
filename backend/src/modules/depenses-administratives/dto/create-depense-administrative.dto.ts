import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ADMINISTRATIVE_EXPENSE_CATEGORIES } from '../constants/administrative-expense-categories';

export class CreateDepenseAdministrativeDto {
  @IsString({ message: 'La catégorie de dépense doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'La catégorie de dépense administrative est obligatoire' })
  @IsIn(ADMINISTRATIVE_EXPENSE_CATEGORIES, {
    message: 'Catégorie de dépense administrative non valide',
  })
  categorieDepense: string;

  @IsOptional()
  @IsString({ message: 'La description doit être une chaîne de caractères' })
  @MaxLength(255, { message: 'La description ne doit pas dépasser 255 caractères' })
  description?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Le montant doit être un nombre valide' })
  @IsPositive({ message: 'Le montant doit être strictement supérieur à zéro' })
  montant: number;

  @IsOptional()
  @IsDateString({}, { message: 'La date de dépense doit être au format ISO (YYYY-MM-DD)' })
  dateDepense?: string;
}
