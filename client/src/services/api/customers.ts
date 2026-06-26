import type {
  Customer,
  CustomerListParams,
  CustomerListResponse,
  PaginationMeta,
} from '@/types';
import { ApiClient } from '@/hooks/useApiClient';

export const getAllCustomers = async (
  client: ApiClient,
  params: CustomerListParams = {},
  signal?: AbortSignal,
): Promise<{ customers: Customer[]; pagination: PaginationMeta }> => {
  const data = await client.get<CustomerListResponse>('/customers', { params, signal });
  return {
    customers: data.customers ?? [],
    pagination: data.pagination,
  };
};

export const createCustomer = async (
  client: ApiClient,
  payload: Partial<Customer>,
): Promise<Customer> => {
  return client.post<Customer>('/customers', payload);
};

export const updateCustomer = async (
  client: ApiClient,
  id: string,
  payload: Partial<Customer>,
): Promise<Customer> => {
  return client.put<Customer>(`/customers/${id}`, payload);
};

export const deleteCustomer = async (client: ApiClient, id: string) => {
  return client.delete<{ message: string }>(`/customers/${id}`);
};
