import { create } from 'zustand';

type ViewPreferences = {
  compact: boolean;
  setCompact: (compact: boolean) => void;
};

export const useViewPreferences = create<ViewPreferences>((set) => ({
  compact: false,
  setCompact: (compact) => set({ compact }),
}));
