import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeAsyncStorage } from '../api/storage';
import { darkColors, lightColors, ThemeColors } from '../theme/colors';

export type LanguageType = 'vi' | 'en';

interface UiState {
  isDarkMode: boolean;
  language: LanguageType;
  colors: ThemeColors;
  toggleDarkMode: () => void;
  setDarkMode: (val: boolean) => void;
  setLanguage: (lang: LanguageType) => void;
  getColors: () => ThemeColors;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      isDarkMode: true, // Default to sleek dark mode matching webapp
      language: 'vi',
      colors: darkColors,
      toggleDarkMode: () =>
        set((state) => {
          const next = !state.isDarkMode;
          return {
            isDarkMode: next,
            colors: next ? darkColors : lightColors,
          };
        }),
      setDarkMode: (val: boolean) =>
        set({
          isDarkMode: val,
          colors: val ? darkColors : lightColors,
        }),
      setLanguage: (lang: LanguageType) => set({ language: lang }),
      getColors: () => get().colors,
    }),
    {
      name: 'apexa_mobile_ui',
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        language: state.language,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.colors = state.isDarkMode ? darkColors : lightColors;
        }
      },
    }
  )
);
