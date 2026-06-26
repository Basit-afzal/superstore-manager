import type {
  CreateProductPayload,
  PaginationMeta,
  Product,
  ProductListParams,
  ProductListResponse,
} from '@/types';
import type { ApiClient } from '@/hooks/useApiClient';

export const createProduct = async (
  client: ApiClient,
  payload: CreateProductPayload,
): Promise<Product> => {
  return client.post<Product>('/products', payload);
};

export const getAllProducts = async (
  client: ApiClient,
  params: ProductListParams = {},
  signal?: AbortSignal,
): Promise<{ products: Product[]; pagination: PaginationMeta }> => {
  const data = await client.get<ProductListResponse>('/products', { params, signal });
  return {
    products: data.products ?? [],
    pagination: data.pagination,
  };
};

export const getProductById = async (
  client: ApiClient,
  id: string,
): Promise<Product> => {
  return client.get<Product>(`/products/${id}`);
};

export const updateProduct = async (
  client: ApiClient,
  id: string,
  payload: CreateProductPayload,
): Promise<Product> => {
  return client.put<Product>(`/products/${id}`, payload);
};

export const deleteProduct = async (
  client: ApiClient,
  id: string,
): Promise<{ message: string }> => {
  return client.delete<{ message: string }>(`/products/${id}`);
};

export const restockProduct = async (
  client: ApiClient,
  id: string,
  quantity: number,
): Promise<Product> => {
  return client.post<Product>(`/products/${id}/restock`, { quantity });
};

export const adjustProductStock = async (
  client: ApiClient,
  id: string,
  data: { quantity: number; note: string },
): Promise<Product> => {
  return client.post<Product>(`/products/${id}/adjust`, data);
};

export const getProductUnits = async (
  client: ApiClient,
): Promise<string[]> => {
  return client.get<string[]>('/product-units');
};

export const productsApi = {
  getAll: getAllProducts,
  getById: getProductById,
  create: createProduct,
  update: updateProduct,
  delete: deleteProduct,
};
