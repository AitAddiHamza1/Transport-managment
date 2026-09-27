import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { dashboardApi } from './dashboardApi';
import { dashboardKeys } from './dashboardKeys';
import { DashboardOverviewParams } from './types';

export function useDashboardOverview(params?: DashboardOverviewParams) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: dashboardKeys.overview(companyId, params),
    queryFn: () => dashboardApi.getOverview(params),
    enabled: Boolean(companyId),
    staleTime: 60 * 1000,
  });
}

export function useDashboardCharts(params?: DashboardOverviewParams) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: dashboardKeys.charts(companyId, params),
    queryFn: () => dashboardApi.getCharts(params),
    enabled: Boolean(companyId),
    staleTime: 60 * 1000,
  });
}

export function useDashboardAlerts() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: dashboardKeys.alerts(companyId),
    queryFn: () => dashboardApi.getAlerts(),
    enabled: Boolean(companyId),
    staleTime: 60 * 1000,
  });
}

export function useDashboardRecentActivity(params?: DashboardOverviewParams) {
  const { user } = useAuth();
  const companyId = user?.companyId;

  return useQuery({
    queryKey: dashboardKeys.recentActivity(companyId, params),
    queryFn: () => dashboardApi.getRecentActivity(params),
    enabled: Boolean(companyId),
    staleTime: 30 * 1000,
  });
}
