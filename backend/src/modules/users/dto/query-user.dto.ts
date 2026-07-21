import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { UserStatut } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryUserDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Recherche sur le nom ou l’e-mail' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: UserStatut, description: 'Filtrer par statut' })
  @IsOptional()
  @IsEnum(UserStatut)
  statut?: UserStatut;

  @ApiPropertyOptional({ description: 'Filtrer par identifiant de rôle' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  idRole?: number;

  @ApiPropertyOptional({ enum: ['id', 'nom', 'email'], default: 'id' })
  @IsOptional()
  @IsIn(['id', 'nom', 'email'])
  sortBy?: 'id' | 'nom' | 'email' = 'id';
}
