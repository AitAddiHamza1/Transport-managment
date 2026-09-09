import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
import {
  DashboardAlertItem,
  DashboardChartsResponse,
  DashboardOverviewResponse,
  DashboardRecentActivityItem,
  DashboardService,
} from './dashboard.service';

@ApiTags('Tableau de bord')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @RequirePermission('dashboard', 'voir')
  async getOverview(
    @CurrentUser('companyId') companyId: number,
    @Query() query: QueryDashboardDto,
    @Req() req: any,
  ): Promise<DashboardOverviewResponse> {
    const userPermissions = req.user?.permissions;
    const isSuperAdmin = req.user?.roleName === 'ADMIN_GENERAL';
    return this.dashboardService.getOverview(companyId, query, userPermissions, isSuperAdmin);
  }

  @Get('charts')
  @RequirePermission('dashboard', 'voir')
  async getCharts(
    @CurrentUser('companyId') companyId: number,
    @Query() query: QueryDashboardDto,
    @Req() req: any,
  ): Promise<DashboardChartsResponse> {
    const userPermissions = req.user?.permissions;
    const isSuperAdmin = req.user?.roleName === 'ADMIN_GENERAL';
    return this.dashboardService.getCharts(companyId, query, userPermissions, isSuperAdmin);
  }

  @Get('alerts')
  @RequirePermission('dashboard', 'voir')
  async getAlerts(
    @CurrentUser('companyId') companyId: number,
    @Req() req: any,
  ): Promise<DashboardAlertItem[]> {
    const userPermissions = req.user?.permissions;
    const isSuperAdmin = req.user?.roleName === 'ADMIN_GENERAL';
    return this.dashboardService.getAlerts(companyId, userPermissions, isSuperAdmin);
  }

  @Get('recent-activity')
  @RequirePermission('dashboard', 'voir')
  async getRecentActivity(
    @CurrentUser('companyId') companyId: number,
    @Query() query: QueryDashboardDto,
    @Req() req: any,
  ): Promise<DashboardRecentActivityItem[]> {
    const userPermissions = req.user?.permissions;
    const isSuperAdmin = req.user?.roleName === 'ADMIN_GENERAL';
    return this.dashboardService.getRecentActivity(companyId, query, userPermissions, isSuperAdmin);
  }
}
