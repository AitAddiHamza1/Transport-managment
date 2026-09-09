import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from './dashboardApi';
import { dashboardKeys } from './dashboardKeys';
import { DashboardOverviewParams } from './types';

export function useDashboardOverview(params?: DashboardOverviewParams) {
  return useQuery({
    queryKey: dashboardKeys.overview(params),
    queryFn: () => dashboardApi.getOverview(params),
    staleTime: 60 * 1000,
  });
}

export function useDashboardCharts(params?: DashboardOverviewParams) {
  return useQuery({
    queryKey: dashboardKeys.charts(params),
    queryFn: () => dashboardApi.getCharts(params),
    staleTime: 60 * 1000,
  });
}

export function useDashboardAlerts() {
  return useQuery({
    queryKey: dashboardKeys.alerts(),
    queryFn: () => dashboardApi.getAlerts(),
    staleTime: 60 * 1000,
  });
}

export function useDashboardRecentActivity(params?: DashboardOverviewParams) {
  return useQuery({
    queryKey: dashboardKeys.recentActivity(params),
    queryFn: () => dashboardApi.getRecentActivity(params),
    staleTime: 30 * 1000,
  });
}
