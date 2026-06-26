/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';
import type { User } from '@/types';
import { useAppDispatch, useAppSelector } from '@/store';
import { clearCredentials, setCredentials } from '@/store/authSlice';

export function AuthProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useAuth() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const token = useAppSelector((state) => state.auth.token);

  const login = (userData: User, authToken: string) => {
    dispatch(setCredentials({ user: userData, token: authToken }));
  };

  const logout = () => {
    dispatch(clearCredentials());
  };

  return {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token,
  };
}
