import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemePreference = {
  mode: 'light' | 'dark';
  toggleMode: () => void;
};

export const useThemePreference = create<ThemePreference>()(
  persist(
    (set) => ({
      mode: 'light',
      toggleMode: () =>
        set((state) => ({ mode: state.mode === 'light' ? 'dark' : 'light' })),
    }),
    { name: 'portal-theme' },
  ),
);
