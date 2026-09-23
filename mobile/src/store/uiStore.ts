import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeAsyncStorage } from '../api/storage';
import { getThemeColors, AccentPreset, ThemeColors } from '../theme/colors';

export type LanguageType = 'vi' | 'en';

interface UiState {
  isDarkMode: boolean;
  accentPreset: AccentPreset;
  language: LanguageType;
  colors: ThemeColors;
  toggleDarkMode: () => void;
  setDarkMode: (val: boolean) => void;
  setAccentPreset: (preset: AccentPreset) => void;
  setLanguage: (lang: LanguageType) => void;
  getColors: () => ThemeColors;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      isDarkMode: true,
      accentPreset: 'indigo',
      language: 'vi',
      colors: getThemeColors(true, 'indigo'),
      toggleDarkMode: () =>
        set((state) => {
          const next = !state.isDarkMode;
          return {
            isDarkMode: next,
            colors: getThemeColors(next, state.accentPreset),
          };
        }),
      setDarkMode: (val: boolean) =>
        set((state) => ({
          isDarkMode: val,
          colors: getThemeColors(val, state.accentPreset),
        })),
      setAccentPreset: (preset: AccentPreset) =>
        set((state) => ({
          accentPreset: preset,
          colors: getThemeColors(state.isDarkMode, preset),
        })),
      setLanguage: (lang: LanguageType) => set({ language: lang }),
      getColors: () => get().colors,
    }),
    {
      name: 'apexa_mobile_ui',
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        accentPreset: state.accentPreset,
        language: state.language,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.colors = getThemeColors(state.isDarkMode ?? true, state.accentPreset ?? 'indigo');
        }
      },
    }
  )
);
