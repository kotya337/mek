import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      role: null,
      user: null,
      login: (payload) =>
        set({
          token: payload.token,
          role: payload.role ?? payload.user?.role,
          user: payload.user,
        }),
      logout: () => set({ token: null, role: null, user: null }),
    }),
    { name: 'mek-auth' }
  )
);
