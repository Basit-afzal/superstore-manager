import type { Store } from '@/types';
import { request } from './request';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const getMyStore = async (options?: Pick<RequestInit, 'signal'>) => {
  return request<Store>('/stores/me', options);
};

export const uploadStoreProfileImage = async (
  file: File,
  options?: Pick<RequestInit, 'signal'>,
) => {
  const token = localStorage.getItem('token');
  const storeId = localStorage.getItem('currentStoreId');
  const formData = new FormData();
  formData.append('profile_image', file);

  const response = await fetch(`${API_URL}/stores/me/profile-image`, {
    method: 'PATCH',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(storeId ? { 'X-Store-Id': storeId } : {}),
    },
    body: formData,
    signal: options?.signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json() as Promise<Store>;
};

export function resolveProfileImageUrl(profileImage?: string): string | undefined {
  if (!profileImage?.trim()) return undefined;

  const value = profileImage.trim();
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
    return value;
  }

  return value.startsWith('/') ? value : `/${value}`;
}
