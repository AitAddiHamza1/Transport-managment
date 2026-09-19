import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceTriggerType } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateMaintenanceRuleDto {
  @ApiProperty({ description: 'Code unique de la règle (ex: VIDANGE_10K)', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Nom de la règle d’entretien', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nom: string;

  @ApiPropertyOptional({
    enum: MaintenanceTriggerType,
    default: MaintenanceTriggerType.KILOMETRAGE,
  })
  @IsOptional()
  @IsEnum(MaintenanceTriggerType)
  triggerType?: MaintenanceTriggerType;

  @ApiPropertyOptional({ description: 'Intervalle en kilomètres (ex: 10000)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  intervalleKm?: number;

  @ApiPropertyOptional({ description: 'Intervalle en mois (ex: 6)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  intervalleMois?: number;

  @ApiPropertyOptional({ description: 'Seuil d’alerte avant échéance en km (ex: 1000)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  seuilAlerteKm?: number;

  @ApiPropertyOptional({ description: 'Seuil d’alerte avant échéance en jours (ex: 15)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  seuilAlerteJours?: number;

  @ApiPropertyOptional({ description: 'Description explicative', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
