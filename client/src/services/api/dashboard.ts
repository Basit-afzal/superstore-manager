import type { DashboardPeriod, DashboardStats, Sale } from '@/types';
import { request } from './request';
import { ApiClient } from '@/hooks/useApiClient';

type RequestOptions = Pick<RequestInit, 'signal'>;

export interface DashboardStatsParams {
  period?: DashboardPeriod;
  startDate?: string;
  endDate?: string;
}

export const dashboardApi = {
  getStats: (params?: DashboardStatsParams, options?: RequestOptions) => {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.set('period', params.period);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    const query = searchParams.toString();
    return request<DashboardStats>(
      `/dashboard/stats${query ? `?${query}` : ''}`,
      options,
    );
  },
  getRecentSales: (options?: RequestOptions) =>
    request<Sale[]>('/dashboard/recent-sales', options),
};

export const getDashboardStats = async (
  apiClient: ApiClient,
  params?: DashboardStatsParams,
  signal?: AbortSignal,
) => {
  return apiClient.get<DashboardStats>('/dashboard/stats', { params, signal });
};

export const getRecentSales = async (apiClient: ApiClient) => {
  return apiClient.get<Sale[]>('/dashboard/recent-sales');
};
