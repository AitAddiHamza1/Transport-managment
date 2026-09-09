import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ContratType, EmployeStatut, PaiementModeEmploye } from '@prisma/client';

export class EmployesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(EmployeStatut, { message: 'Statut invalide' })
  statut?: EmployeStatut;

  @IsOptional()
  @IsString()
  departement?: string;

  @IsOptional()
  @IsEnum(ContratType, { message: 'Type de contrat invalide' })
  typeContrat?: ContratType;

  @IsOptional()
  @IsEnum(PaiementModeEmploye, { message: 'Mode de paiement invalide' })
  modePaiement?: PaiementModeEmploye;
}
