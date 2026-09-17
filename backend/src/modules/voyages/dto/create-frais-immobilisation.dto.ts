import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFraisImmobilisationDto {
  @ApiProperty({ description: 'Prix par jour de retard (≥ 0)', example: 500 })
  @Type(() => Number)
  @IsNotEmpty({ message: 'Le prix par jour est obligatoire' })
  @IsNumber({}, { message: 'Le prix par jour doit être un nombre valide' })
  @Min(0, { message: 'Le prix par jour ne peut pas être négatif' })
  prixParJour: number;

  @ApiProperty({ description: 'Nombre de jours de retard (entier ≥ 0)', example: 3 })
  @Type(() => Number)
  @IsNotEmpty({ message: 'Le nombre de jours de retard est obligatoire' })
  @IsInt({ message: 'Le nombre de jours de retard doit être un entier' })
  @Min(0, { message: 'Le nombre de jours de retard ne peut pas être négatif' })
  nombreJoursRetard: number;
}
