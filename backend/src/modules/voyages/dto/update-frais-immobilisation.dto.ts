import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFraisImmobilisationDto {
  @ApiPropertyOptional({ description: 'Prix par jour de retard (≥ 0)', example: 700 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Le prix par jour doit être un nombre valide' })
  @Min(0, { message: 'Le prix par jour ne peut pas être négatif' })
  prixParJour?: number;

  @ApiPropertyOptional({ description: 'Nombre de jours de retard (entier ≥ 0)', example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Le nombre de jours de retard doit être un entier' })
  @Min(0, { message: 'Le nombre de jours de retard ne peut pas être négatif' })
  nombreJoursRetard?: number;
}
