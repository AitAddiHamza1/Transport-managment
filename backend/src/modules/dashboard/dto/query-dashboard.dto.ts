import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';

export const DASHBOARD_PRESETS = [
  'AUJOURDHUI',
  'CE_MOIS',
  'CE_TRIMESTRE',
  'CETTE_ANNEE',
  'PERSONNALISE',
] as const;

export type DashboardPreset = (typeof DASHBOARD_PRESETS)[number];

export class QueryDashboardDto {
  @IsOptional()
  @IsIn(DASHBOARD_PRESETS, { message: 'Preset non valide' })
  preset?: DashboardPreset = 'CE_MOIS';

  @ValidateIf((o) => o.preset === 'PERSONNALISE')
  @IsDateString({}, { message: 'dateDebut doit être une date valide (YYYY-MM-DD)' })
  dateDebut?: string;

  @ValidateIf((o) => o.preset === 'PERSONNALISE')
  @IsDateString({}, { message: 'dateFin doit être une date valide (YYYY-MM-DD)' })
  dateFin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  months?: number = 6;
}
