import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CustomMiniAppInput, MiniAppItem } from '@/types/miniapp';
import { DEFAULT_PINNED_APP_IDS, SYSTEM_MINI_APPS } from '@/lib/miniAppsRegistry';

interface MiniAppState {
  pinnedAppIds: string[];
  customApps: MiniAppItem[];
  recentAppIds: string[];
  activeMiniAppId: string | null;
  disabledAppIds: string[];

  pinApp: (appId: string) => void;
  unpinApp: (appId: string) => void;
  togglePin: (appId: string) => void;
  enableApp: (appId: string) => void;
  disableApp: (appId: string) => void;
  toggleAppEnabled: (appId: string) => void;
  enableAllApps: () => void;
  addCustomApp: (input: CustomMiniAppInput) => MiniAppItem;
  updateCustomApp: (appId: string, updates: Partial<MiniAppItem>) => void;
  deleteCustomApp: (appId: string) => void;
  recordAppLaunch: (appId: string) => void;
  setActiveMiniAppId: (appId: string | null) => void;
  resetToDefaults: () => void;
}

export const useMiniAppStore = create<MiniAppState>()(
  persist(
    (set, get) => ({
      pinnedAppIds: DEFAULT_PINNED_APP_IDS,
      customApps: [],
      recentAppIds: [],
      activeMiniAppId: null,
      disabledAppIds: [],

      pinApp: (appId) => {
        set((state) => {
          if (state.disabledAppIds.includes(appId)) return state; // Cannot pin disabled app
          if (state.pinnedAppIds.includes(appId)) return state;
          return { pinnedAppIds: [...state.pinnedAppIds, appId] };
        });
      },

      unpinApp: (appId) => {
        set((state) => ({
          pinnedAppIds: state.pinnedAppIds.filter((id) => id !== appId),
        }));
      },

      togglePin: (appId) => {
        set((state) => {
          if (state.disabledAppIds.includes(appId)) return state;
          const isPinned = state.pinnedAppIds.includes(appId);
          return {
            pinnedAppIds: isPinned
              ? state.pinnedAppIds.filter((id) => id !== appId)
              : [...state.pinnedAppIds, appId],
          };
        });
      },

      enableApp: (appId) => {
        set((state) => ({
          disabledAppIds: state.disabledAppIds.filter((id) => id !== appId),
        }));
      },

      disableApp: (appId) => {
        set((state) => ({
          disabledAppIds: state.disabledAppIds.includes(appId)
            ? state.disabledAppIds
            : [...state.disabledAppIds, appId],
          // When disabling, automatically remove from pinned sidebar list
          pinnedAppIds: state.pinnedAppIds.filter((id) => id !== appId),
          activeMiniAppId: state.activeMiniAppId === appId ? null : state.activeMiniAppId,
        }));
      },

      toggleAppEnabled: (appId) => {
        const state = get();
        const isDisabled = state.disabledAppIds.includes(appId);
        if (isDisabled) {
          state.enableApp(appId);
        } else {
          state.disableApp(appId);
        }
      },

      enableAllApps: () => {
        set({ disabledAppIds: [] });
      },

      addCustomApp: (input) => {
        const id = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const newApp: MiniAppItem = {
          id,
          name: input.name,
          nameVi: input.name,
          description: input.description,
          descriptionVi: input.description,
          icon: input.icon || '🌐',
          category: input.category || 'custom',
          color: input.color || '#3b82f6',
          gradient: 'from-blue-500 to-indigo-600',
          badge: 'Nhúng Web',
          badgeVariant: 'info',
          isSystem: false,
          isPinned: true,
          isEnabled: true,
          url: input.url,
          openMode: input.openMode || 'embedded',
          tags: input.tags || ['web', 'embed', 'custom'],
          author: 'Người dùng',
          version: '1.0.0',
          rating: 5.0,
        };

        set((state) => ({
          customApps: [newApp, ...state.customApps],
          pinnedAppIds: [...state.pinnedAppIds, id],
        }));

        return newApp;
      },

      updateCustomApp: (appId, updates) => {
        set((state) => ({
          customApps: state.customApps.map((app) =>
            app.id === appId ? { ...app, ...updates } : app
          ),
        }));
      },

      deleteCustomApp: (appId) => {
        set((state) => ({
          customApps: state.customApps.filter((app) => app.id !== appId),
          pinnedAppIds: state.pinnedAppIds.filter((id) => id !== appId),
          recentAppIds: state.recentAppIds.filter((id) => id !== appId),
          disabledAppIds: state.disabledAppIds.filter((id) => id !== appId),
          activeMiniAppId: state.activeMiniAppId === appId ? null : state.activeMiniAppId,
        }));
      },

      recordAppLaunch: (appId) => {
        set((state) => {
          const filtered = state.recentAppIds.filter((id) => id !== appId);
          return {
            recentAppIds: [appId, ...filtered].slice(0, 8),
            activeMiniAppId: appId,
          };
        });
      },

      setActiveMiniAppId: (activeMiniAppId) => {
        set({ activeMiniAppId });
      },

      resetToDefaults: () => {
        set({
          pinnedAppIds: DEFAULT_PINNED_APP_IDS,
          customApps: [],
          recentAppIds: [],
          disabledAppIds: [],
          activeMiniAppId: null,
        });
      },
    }),
    {
      name: 'apexa_miniapps_store',
    }
  )
);

/**
 * Selector helper to get all apps merged with their dynamic pin & enabled states
 */
export function selectAllMiniApps(
  pinnedAppIds: string[],
  customApps: MiniAppItem[],
  disabledAppIds: string[] = []
): MiniAppItem[] {
  const systemWithPinned = SYSTEM_MINI_APPS.map((app) => {
    const isEnabled = !disabledAppIds.includes(app.id);
    return {
      ...app,
      isEnabled,
      isPinned: isEnabled && pinnedAppIds.includes(app.id),
    };
  });

  const customWithPinned = customApps.map((app) => {
    const isEnabled = !disabledAppIds.includes(app.id);
    return {
      ...app,
      isEnabled,
      isPinned: isEnabled && pinnedAppIds.includes(app.id),
    };
  });

  return [...systemWithPinned, ...customWithPinned];
}
