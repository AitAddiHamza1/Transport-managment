import { api } from '../../lib/axios';
import {
  DashboardAlertItem,
  DashboardChartsResponse,
  DashboardOverviewParams,
  DashboardOverviewResponse,
  DashboardRecentActivityItem,
} from './types';

export const dashboardApi = {
  getOverview: async (params?: DashboardOverviewParams): Promise<DashboardOverviewResponse> => {
    const { data } = await api.get<DashboardOverviewResponse>('/dashboard/overview', { params });
    return data;
  },

  getCharts: async (params?: DashboardOverviewParams): Promise<DashboardChartsResponse> => {
    const { data } = await api.get<DashboardChartsResponse>('/dashboard/charts', { params });
    return data;
  },

  getAlerts: async (): Promise<DashboardAlertItem[]> => {
    const { data } = await api.get<DashboardAlertItem[]>('/dashboard/alerts');
    return data;
  },

  getRecentActivity: async (params?: DashboardOverviewParams): Promise<DashboardRecentActivityItem[]> => {
    const { data } = await api.get<DashboardRecentActivityItem[]>('/dashboard/recent-activity', { params });
    return data;
  },
};
