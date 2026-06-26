import { useMemo } from 'react';
import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  AxiosHeaders,
} from 'axios';
import { useAuth } from '@/context/AuthContext';
import {
  handleUnauthorizedSession,
  shouldHandleUnauthorized,
} from '@/utils/handleUnauthorizedSession';

const apiConfig = {
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
};

export interface ApiClient
  extends Omit<AxiosInstance, 'get' | 'post' | 'put' | 'patch' | 'delete'> {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T>;
  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T>;
  patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T>;
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

function handleAxiosError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;
    const message =
      axiosError.response?.data?.message ??
      axiosError.message ??
      'Request failed';
    return new Error(message);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error('Request failed');
}

export function useApiClient(): ApiClient {
  const { token } = useAuth();

  const apiClient = useMemo(() => {
    const client = axios.create({
      baseURL: apiConfig.baseURL,
      timeout: apiConfig.timeout,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        config.headers = config.headers ?? new AxiosHeaders();

        if (token) {
          config.headers.set('Authorization', `Bearer ${token}`);
        }

        const storeId = localStorage.getItem('currentStoreId');
        if (storeId) {
          config.headers.set('X-Store-Id', storeId);
        }

        return config;
      },
      (error: unknown) => Promise.reject(error),
    );

    client.interceptors.response.use(
      (response: AxiosResponse) =>
        (response.config as { rawResponse?: boolean }).rawResponse === true
          ? response
          : response.data,
      (error: unknown) => {
        if (axios.isCancel(error)) {
          return Promise.reject(error);
        }

        if (axios.isAxiosError(error) && error.response?.status === 401) {
          if (shouldHandleUnauthorized(error.config?.url)) {
            handleUnauthorizedSession();
          }
        }

        return Promise.reject(handleAxiosError(error));
      },
    );

    return client as ApiClient;
  }, [token]);

  return apiClient;
}

