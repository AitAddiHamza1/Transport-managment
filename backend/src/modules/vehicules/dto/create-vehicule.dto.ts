import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehiculeStatut } from '@prisma/client';

export class CreateVehiculeDto {
  @ApiProperty({
    description: 'Immatriculation unique du véhicule (ex: 12345-A-6)',
    example: '12345-A-6',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  immatriculation: string;

  @ApiProperty({ description: 'Marque du véhicule', example: 'Volvo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  marque: string;

  @ApiPropertyOptional({ description: 'Modèle du véhicule', example: 'FH16' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  modele?: string | null;

  @ApiPropertyOptional({ description: 'Type de véhicule', example: 'CAMION', default: 'CAMION' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() || 'CAMION' : value,
  )
  typeVehicule?: string;

  @ApiPropertyOptional({ description: 'Année de fabrication', example: 2022 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  annee?: number | null;

  @ApiPropertyOptional({ description: 'Numéro de châssis / VIN unique', example: 'VIN1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() || null : value,
  )
  numeroChassis?: string | null;

  @ApiPropertyOptional({ description: 'Capacité de charge en tonnes (T)', example: 25.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  capaciteCharge?: number | null;

  @ApiPropertyOptional({
    description: 'Statut opérationnel',
    enum: VehiculeStatut,
    default: VehiculeStatut.DISPONIBLE,
  })
  @IsOptional()
  @IsEnum(VehiculeStatut)
  statut?: VehiculeStatut;
}
