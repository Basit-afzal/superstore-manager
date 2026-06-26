import { ROUTES } from '@/constants';
import { store } from '@/store';
import { clearCredentials } from '@/store/authSlice';

let isHandlingUnauthorized = false;

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register'];

export function shouldHandleUnauthorized(url?: string) {
  if (!url) return true;
  return !AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

export function handleUnauthorizedSession() {
  if (isHandlingUnauthorized || !localStorage.getItem('token')) {
    return;
  }

  isHandlingUnauthorized = true;

  store.dispatch(clearCredentials());
  localStorage.removeItem('currentStoreId');
  localStorage.removeItem('currentStore');

  if (
    window.location.pathname !== ROUTES.LOGIN &&
    window.location.pathname !== ROUTES.SIGNUP
  ) {
    window.location.href = ROUTES.LOGIN;
  } else {
    isHandlingUnauthorized = false;
  }
}
