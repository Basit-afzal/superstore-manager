import type {
  Employee,
  EmployeeListParams,
  EmployeeListResponse,
  PaginationMeta,
} from '@/types';
import { request } from './request';
import { ApiClient } from '@/hooks/useApiClient';


type RequestOptions = Pick<RequestInit, 'signal'>;

export const employeesApi = {
  getAll: async (options?: RequestOptions) => {
    const data = await request<EmployeeListResponse>('/employees', options);
    return data.employees ?? [];
  },
  create: (payload: Partial<Employee>) =>
    request<Employee>('/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Partial<Employee>) =>
    request<Employee>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  delete: (id: string) =>
    request<void>(`/employees/${id}`, { method: 'DELETE' }),
};

export const getAllEmployee = async (
  client: ApiClient,
  params: EmployeeListParams = {},
  signal?: AbortSignal,
): Promise<{ employees: Employee[]; pagination: PaginationMeta }> => {
  const data = await client.get<EmployeeListResponse>('/employees', { params, signal });
  return {
    employees: data.employees ?? [],
    pagination: data.pagination,
  };
};


export const createEmployee = async (
  client: ApiClient,
  payload: Partial<Employee>,
): Promise<Employee> => {
  return client.post<Employee>('/employees', payload);
};

export const updateEmployee = async (
  client: ApiClient,
  id: string,
  payload: Partial<Employee>,
): Promise<Employee> => {
  return client.put<Employee>(`/employees/${id}`, payload);
};

export const deleteEmployee = async ( client: ApiClient, id: string ) => {
  return client.delete<{ message: string }>(`/employees/${id}`);
};