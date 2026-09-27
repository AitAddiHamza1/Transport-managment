import { DashboardOverviewParams } from './types';

export const dashboardKeys = {
  all: (companyId?: number) => ['dashboard', companyId] as const,
  overview: (companyId?: number, params?: DashboardOverviewParams) => [...dashboardKeys.all(companyId), 'overview', params] as const,
  charts: (companyId?: number, params?: DashboardOverviewParams) => [...dashboardKeys.all(companyId), 'charts', params] as const,
  alerts: (companyId?: number) => [...dashboardKeys.all(companyId), 'alerts'] as const,
  recentActivity: (companyId?: number, params?: DashboardOverviewParams) => [...dashboardKeys.all(companyId), 'recentActivity', params] as const,
};
