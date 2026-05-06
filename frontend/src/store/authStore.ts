import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  name: string | null;
  setAuth: (username: string, name: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      username: null,
      name: null,
      setAuth: (username, name) => set({ isAuthenticated: true, username, name }),
      clearAuth: () => set({ isAuthenticated: false, username: null, name: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
