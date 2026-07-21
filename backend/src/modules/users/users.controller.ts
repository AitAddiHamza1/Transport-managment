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
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';

@ApiTags('Utilisateurs')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Permissions insuffisantes' })
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post()
  @RequirePermission('utilisateurs', 'ajouter')
  @ApiOperation({ summary: 'Créer un utilisateur' })
  @ApiConflictResponse({ description: 'E-mail déjà utilisé' })
  @ApiBadRequestResponse({ description: 'Rôle inexistant / données invalides' })
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Get('stats')
  @RequirePermission('utilisateurs', 'voir')
  @ApiOperation({ summary: 'Statistiques des utilisateurs (mini tableau de bord)' })
  stats() {
    return this.service.findStats();
  }

  @Get()
  @RequirePermission('utilisateurs', 'voir')
  @ApiOperation({ summary: 'Lister les utilisateurs (pagination, recherche, filtre statut)' })
  findAll(@Query() query: QueryUserDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermission('utilisateurs', 'voir')
  @ApiOperation({ summary: 'Détail d’un utilisateur' })
  @ApiNotFoundResponse({ description: 'Utilisateur introuvable' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('utilisateurs', 'modifier')
  @ApiOperation({ summary: 'Modifier un utilisateur' })
  @ApiNotFoundResponse({ description: 'Utilisateur introuvable' })
  @ApiConflictResponse({ description: 'E-mail déjà utilisé' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, actor);
  }

  @Delete(':id')
  @RequirePermission('utilisateurs', 'supprimer')
  @ApiOperation({ summary: 'Supprimer un utilisateur' })
  @ApiNotFoundResponse({ description: 'Utilisateur introuvable' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.remove(id, actor);
  }
}
