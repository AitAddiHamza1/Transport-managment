import { DashboardOverviewParams } from './types';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: (params?: DashboardOverviewParams) => [...dashboardKeys.all, 'overview', params] as const,
  charts: (params?: DashboardOverviewParams) => [...dashboardKeys.all, 'charts', params] as const,
  alerts: () => [...dashboardKeys.all, 'alerts'] as const,
  recentActivity: (params?: DashboardOverviewParams) => [...dashboardKeys.all, 'recentActivity', params] as const,
};
