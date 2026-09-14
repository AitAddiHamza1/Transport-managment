import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/auth-user.type';

@ApiTags('Notifications')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Accès non autorisé' })
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  private checkTenantAccess(actor: AuthenticatedUser): void {
    if (!actor || !actor.companyId || !actor.sub) {
      throw new ForbiddenException('Accès réservé aux utilisateurs d’entreprise');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lister les notifications de l’utilisateur connecté' })
  findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: QueryNotificationDto,
  ) {
    this.checkTenantAccess(actor);
    return this.service.findAllForUser(actor.companyId, actor.sub, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Obtenir le nombre de notifications non lues' })
  getUnreadCount(@CurrentUser() actor: AuthenticatedUser) {
    this.checkTenantAccess(actor);
    return this.service.getUnreadCount(actor.companyId, actor.sub);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marquer toutes les notifications comme lues' })
  markAllAsRead(@CurrentUser() actor: AuthenticatedUser) {
    this.checkTenantAccess(actor);
    return this.service.markAllAsRead(actor.companyId, actor.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  @ApiNotFoundResponse({ description: 'Notification introuvable' })
  markAsRead(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.checkTenantAccess(actor);
    return this.service.markAsRead(actor.companyId, actor.sub, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Masquer/effacer une notification pour l’utilisateur' })
  @ApiNotFoundResponse({ description: 'Notification introuvable' })
  dismiss(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.checkTenantAccess(actor);
    return this.service.dismissNotification(actor.companyId, actor.sub, id);
  }
}
