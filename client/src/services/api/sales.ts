import type { CreateSalePayload, Sale, SaleListResponse } from '@/types';
import { ApiClient } from '@/hooks/useApiClient';

export const createSale = async (
  client: ApiClient,
  payload: CreateSalePayload,
): Promise<Sale> => {
  return client.post<Sale>('/sales', payload);
};

export const getSales = async (
  client: ApiClient,
  page: number,
  limit: number,
  signal?: AbortSignal,
): Promise<SaleListResponse> => {
  return client.get<SaleListResponse>(`/sales?page=${page}&limit=${limit}`, {
    signal,
  });
};

export const getSaleById = async (
  client: ApiClient,
  id: string,
): Promise<Sale> => {
  return client.get<Sale>(`/sales/${id}`);
};
