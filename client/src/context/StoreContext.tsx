/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Store } from '@/types';

interface StoreContextValue {
  currentStore: Store | null;
  setStore: (store: Store) => void;
  clearStore: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function loadStoredStore(): Store | null {
  try {
    const raw = localStorage.getItem('currentStore');
    return raw ? (JSON.parse(raw) as Store) : null;
  } catch {
    return null;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentStore, setCurrentStore] = useState<Store | null>(loadStoredStore);

  const setStore = useCallback((store: Store) => {
    localStorage.setItem('currentStoreId', store.id);
    localStorage.setItem('currentStore', JSON.stringify(store));
    setCurrentStore(store);
  }, []);

  const clearStore = useCallback(() => {
    localStorage.removeItem('currentStoreId');
    localStorage.removeItem('currentStore');
    setCurrentStore(null);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        currentStore,
        setStore,
        clearStore,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return context;
}
