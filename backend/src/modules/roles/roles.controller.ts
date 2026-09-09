import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Rôles')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Permissions insuffisantes' })
@Controller('roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Post()
  @Roles('ADMIN_GENERAL')
  @ApiOperation({ summary: 'Créer un rôle (Administrateur Général uniquement)' })
  @ApiConflictResponse({ description: 'Nom de rôle déjà existant' })
  create(@CurrentUser('companyId') companyId: number, @Body() dto: CreateRoleDto) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @RequirePermission('utilisateurs', 'voir')
  @ApiOperation({ summary: 'Lister les rôles (pagination + recherche)' })
  findAll(@CurrentUser('companyId') companyId: number, @Query() query: QueryRoleDto) {
    return this.service.findAll(companyId, query);
  }

  @Get(':id')
  @RequirePermission('utilisateurs', 'voir')
  @ApiOperation({ summary: 'Détail d’un rôle' })
  @ApiNotFoundResponse({ description: 'Rôle introuvable' })
  findOne(@CurrentUser('companyId') companyId: number, @Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @Roles('ADMIN_GENERAL')
  @ApiOperation({ summary: 'Modifier un rôle (Administrateur Général uniquement)' })
  @ApiNotFoundResponse({ description: 'Rôle introuvable' })
  @ApiConflictResponse({ description: 'Nom de rôle déjà existant' })
  update(
    @CurrentUser('companyId') companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN_GENERAL')
  @ApiOperation({ summary: 'Supprimer un rôle (Administrateur Général uniquement)' })
  @ApiNotFoundResponse({ description: 'Rôle introuvable' })
  @ApiConflictResponse({ description: 'Rôle utilisé par des utilisateurs' })
  remove(@CurrentUser('companyId') companyId: number, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(companyId, id);
  }
}
