import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NotificationSettings } from '@/types';
import { applyThemePreference, getStoredThemePreference, type ThemePreference } from '@/lib/theme';

interface UiState {
  activeTab: string;
  isMainSidebarCollapsed: boolean;
  isSearchOpen: boolean;
  searchQuery: string;
  searchCategory: 'all' | 'tasks' | 'spaces' | 'channels' | 'members' | 'commands';
  isOffline: boolean;
  syncing: boolean;
  syncProgress: number;
  showPremiumModal: boolean;
  showWorkspaceMenu: boolean;
  showAddWorkspaceModal: boolean;
  showNotificationsMenu: boolean;
  showStatusMenu: boolean;
  userStatus: 'online' | 'focused' | 'away' | 'offline';
  presencePreference: 'online' | 'focused' | 'away' | 'offline';
  blurIntensity: 'soft' | 'default' | 'immersive';
  accentPreset: 'indigo' | 'ocean' | 'forest' | 'sunset';
  soundEnabled: boolean;
  isDarkMode: boolean;
  themePreference: ThemePreference;
  dateFormat: 'short' | 'full' | 'vi' | 'numeric' | 'clock';
  uiDensity: 'comfortable' | 'compact';
  defaultStartupTab: string;
  notificationSettings: NotificationSettings;

  // Search selection triggers
  initialSelectedTaskId: string | null;
  initialSelectedDocId: string | null;
  initialSelectedChannelId: string | null;

  // Space modals
  showAddSpaceModal: boolean;
  newSpaceName: string;
  newSpaceEmoji: string;
  newSpaceColor: string;
  newSpaceDescription: string;
  newSpaceIsPrivate: boolean;
  newSpacePermission: string;
  showAddListSpaceId: string | null;
  newListName: string;
  showSpaceSettingsId: string | null;
  editSpaceName: string;
  editSpaceEmoji: string;
  editSpaceColor: string;
  editSpaceClickApps: any;
  editSpaceStatuses: any[];

  // Workspace modal
  showWorkspaceSettingsModal: boolean;
  showWorkspaceSettingsId: string | null;
  editingWorkspaceForModal: any;
  modalSelectedCover: string;
  editWSName: string;
  editWSTheme: 'indigo' | 'ocean' | 'forest' | 'sunset';

  // Pomodoro settings
  showPomoSettings: boolean;

  // Member profile viewing modal
  viewingMemberProfileId: string | null;
  setViewingMemberProfileId: (id: string | null) => void;

  // Mobile drawer state
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;

  // AI Assistant drawer/modal state
  isAiAssistantOpen: boolean;
  setIsAiAssistantOpen: (open: boolean) => void;
  toggleAiAssistant: () => void;

  sidebarOrder: string[];
  sidebarZones: SidebarZone[];

  setActiveTab: (tab: string) => void;
  setIsMainSidebarCollapsed: (collapsed: boolean) => void;
  setIsSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchCategory: (category: 'all' | 'tasks' | 'spaces' | 'channels' | 'members' | 'commands') => void;
  setIsOffline: (offline: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setSyncProgress: (progress: number | ((prev: number) => number)) => void;
  setShowPremiumModal: (show: boolean) => void;
  setShowWorkspaceMenu: (show: boolean) => void;
  setShowAddWorkspaceModal: (show: boolean) => void;
  setShowNotificationsMenu: (show: boolean) => void;
  setShowStatusMenu: (show: boolean) => void;
  setUserStatus: (status: 'online' | 'focused' | 'away' | 'offline') => void;
  setPresencePreference: (status: 'online' | 'focused' | 'away' | 'offline') => void;
  setBlurIntensity: (intensity: 'soft' | 'default' | 'immersive') => void;
  setAccentPreset: (preset: 'indigo' | 'ocean' | 'forest' | 'sunset') => void;
  setSoundEnabled: (enabled: boolean) => void;
  setIsDarkMode: (isDarkMode: boolean) => void;
  setThemePreference: (preference: ThemePreference) => void;
  setDateFormat: (format: 'short' | 'full' | 'vi' | 'numeric' | 'clock') => void;
  setUiDensity: (density: 'comfortable' | 'compact') => void;
  setDefaultStartupTab: (tab: string) => void;
  setNotificationSettings: (settings: NotificationSettings | ((prev: NotificationSettings) => NotificationSettings)) => void;

  setInitialSelectedTaskId: (id: string | null) => void;
  setInitialSelectedDocId: (id: string | null) => void;
  setInitialSelectedChannelId: (id: string | null) => void;

  setShowAddSpaceModal: (show: boolean) => void;
  setNewSpaceName: (name: string) => void;
  setNewSpaceEmoji: (emoji: string) => void;
  setNewSpaceColor: (color: string) => void;
  setNewSpaceDescription: (desc: string) => void;
  setNewSpaceIsPrivate: (v: boolean) => void;
  setNewSpacePermission: (v: string) => void;
  setShowAddListSpaceId: (id: string | null) => void;
  setNewListName: (name: string) => void;
  setShowSpaceSettingsId: (id: string | null) => void;
  setEditSpaceName: (name: string) => void;
  setEditSpaceEmoji: (emoji: string) => void;
  setEditSpaceColor: (color: string) => void;
  setEditSpaceClickApps: (v: any | ((prev: any) => any)) => void;
  setEditSpaceStatuses: (v: any[] | ((prev: any[]) => any[])) => void;

  setShowWorkspaceSettingsModal: (show: boolean) => void;
  setShowWorkspaceSettingsId: (id: string | null) => void;
  setEditingWorkspaceForModal: (w: any) => void;
  setModalSelectedCover: (url: string) => void;
  setEditWSName: (name: string) => void;
  setEditWSTheme: (theme: 'indigo' | 'ocean' | 'forest' | 'sunset') => void;

  setShowPomoSettings: (show: boolean) => void;
  setSidebarOrder: (order: string[]) => void;
  setSidebarZones: (zones: SidebarZone[]) => void;
  createSidebarZone: (zone: Omit<SidebarZone, 'id'>) => string;
  updateSidebarZone: (zoneId: string, updates: Partial<SidebarZone>) => void;
  deleteSidebarZone: (zoneId: string) => void;
  toggleSidebarZoneCollapse: (zoneId: string) => void;
  moveItemToZone: (itemId: string, targetZoneId: string, targetIndex?: number) => void;
  removeItemFromZone: (itemId: string, zoneId?: string, rootIndex?: number) => void;
  reorderSidebarZones: (zones: SidebarZone[]) => void;
}

export interface SidebarZone {
  id: string;
  name: string;
  emoji?: string;
  color?: 'sky' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple';
  itemIds: string[];
  isCollapsed?: boolean;
}

export const REMOVED_MODULE_IDS = new Set(['goals', 'planner', 'whiteboard', 'base', 'crm', 'erp', 'docs']);

export const DEFAULT_SIDEBAR_ORDER: string[] = [
  'dashboard', 'tasks', 'inbox', 'finance', 'team', 'calendar', 'chat'
];

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      activeTab: 'dashboard',
      isMainSidebarCollapsed: false,
      isSearchOpen: false,
      searchQuery: '',
      searchCategory: 'all',
      isOffline: false,
      syncing: false,
      syncProgress: 0,
      showPremiumModal: false,
      showWorkspaceMenu: false,
      showAddWorkspaceModal: false,
      showNotificationsMenu: false,
      showStatusMenu: false,
      userStatus: 'online',
      presencePreference: 'online',
      blurIntensity: 'default',
      isDarkMode: true,
      themePreference: 'dark',
      accentPreset: 'indigo',
      dateFormat: 'short',
      uiDensity: 'comfortable',
      defaultStartupTab: 'dashboard',
      soundEnabled: false,
      notificationSettings: {
        enableAll: true,
        enableSound: false,
        onlyImportant: false,
        enableAssignments: true,
        enableDeadlines: true,
        enableComments: true,
        enableStatusChanges: true,
        enableFilteringTags: false,
        enableSystemNotify: true,
        toastDuration: 4000,
        dndActive: false,
        frequencyLimit: 'throttled',
        enableChatMessages: true
      },
      initialSelectedTaskId: null,
      initialSelectedDocId: null,
      initialSelectedChannelId: null,
      showAddSpaceModal: false,
      newSpaceName: '',
      newSpaceEmoji: 'Package',
      newSpaceColor: 'indigo',
      newSpaceDescription: '',
      newSpaceIsPrivate: false,
      newSpacePermission: 'Full edit',
      showAddListSpaceId: null,
      newListName: '',
      showSpaceSettingsId: null,
      editSpaceName: '',
      editSpaceEmoji: 'Package',
      editSpaceColor: 'indigo',
      editSpaceClickApps: {},
      editSpaceStatuses: [],
      showWorkspaceSettingsModal: false,
      showWorkspaceSettingsId: null,
      editingWorkspaceForModal: null,
      modalSelectedCover: '',
      editWSName: '',
      editWSTheme: 'indigo',
      showPomoSettings: false,
      viewingMemberProfileId: null,
      isMobileSidebarOpen: false,
      isAiAssistantOpen: false,
      sidebarOrder: [...DEFAULT_SIDEBAR_ORDER],
      sidebarZones: [],

      setActiveTab: (activeTab) => set({ activeTab }),
      setIsMobileSidebarOpen: (isMobileSidebarOpen) => set({ isMobileSidebarOpen }),
      setIsAiAssistantOpen: (isAiAssistantOpen) => set({ isAiAssistantOpen }),
      toggleAiAssistant: () => set((state) => ({ isAiAssistantOpen: !state.isAiAssistantOpen })),
      setIsMainSidebarCollapsed: (isMainSidebarCollapsed) => set({ isMainSidebarCollapsed }),
      setIsSearchOpen: (isSearchOpen) => set({ isSearchOpen }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSearchCategory: (searchCategory) => set({ searchCategory }),
      setIsOffline: (isOffline) => set({ isOffline }),
      setSyncing: (syncing) => set({ syncing }),
      setSyncProgress: (syncProgress) => set({ syncProgress: typeof syncProgress === 'function' ? syncProgress(get().syncProgress) : syncProgress }),
      setShowPremiumModal: (showPremiumModal) => set({ showPremiumModal }),
      setShowWorkspaceMenu: (showWorkspaceMenu) => set({ showWorkspaceMenu }),
      setShowAddWorkspaceModal: (showAddWorkspaceModal) => set({ showAddWorkspaceModal }),
      setShowNotificationsMenu: (showNotificationsMenu) => set({ showNotificationsMenu }),
      setShowStatusMenu: (showStatusMenu) => set({ showStatusMenu }),
      setUserStatus: (userStatus) => set({ userStatus }),
      setPresencePreference: (presencePreference) => set({ presencePreference }),
      setBlurIntensity: (blurIntensity) => set({ blurIntensity }),
      setAccentPreset: (accentPreset) => set({ accentPreset }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setIsDarkMode: (isDarkMode) => {
        const themePreference: ThemePreference = isDarkMode ? 'dark' : 'light';
        applyThemePreference(themePreference);
        set({ isDarkMode, themePreference });
      },
      setThemePreference: (themePreference) => {
        const isDarkMode = applyThemePreference(themePreference);
        set({ themePreference, isDarkMode });
      },
      setDateFormat: (dateFormat) => set({ dateFormat }),
      setUiDensity: (uiDensity) => set({ uiDensity }),
      setDefaultStartupTab: (defaultStartupTab) => set({ defaultStartupTab }),
      setNotificationSettings: (notificationSettings) => set({ notificationSettings: typeof notificationSettings === 'function' ? notificationSettings(get().notificationSettings) : notificationSettings }),

      setInitialSelectedTaskId: (initialSelectedTaskId) => set({ initialSelectedTaskId }),
      setInitialSelectedDocId: (initialSelectedDocId) => set({ initialSelectedDocId }),
      setInitialSelectedChannelId: (initialSelectedChannelId) => set({ initialSelectedChannelId }),

      setShowAddSpaceModal: (showAddSpaceModal) => set({ showAddSpaceModal }),
      setNewSpaceName: (newSpaceName) => set({ newSpaceName }),
      setNewSpaceEmoji: (newSpaceEmoji) => set({ newSpaceEmoji }),
      setNewSpaceColor: (newSpaceColor) => set({ newSpaceColor }),
      setNewSpaceDescription: (newSpaceDescription) => set({ newSpaceDescription }),
      setNewSpaceIsPrivate: (newSpaceIsPrivate) => set({ newSpaceIsPrivate }),
      setNewSpacePermission: (newSpacePermission) => set({ newSpacePermission }),
      setShowAddListSpaceId: (showAddListSpaceId) => set({ showAddListSpaceId }),
      setNewListName: (newListName) => set({ newListName }),
      setShowSpaceSettingsId: (showSpaceSettingsId) => set({ showSpaceSettingsId }),
      setEditSpaceName: (editSpaceName) => set({ editSpaceName }),
      setEditSpaceEmoji: (editSpaceEmoji) => set({ editSpaceEmoji }),
      setEditSpaceColor: (editSpaceColor) => set({ editSpaceColor }),
      setEditSpaceClickApps: (editSpaceClickApps) => set({ editSpaceClickApps: typeof editSpaceClickApps === 'function' ? editSpaceClickApps(get().editSpaceClickApps) : editSpaceClickApps }),
      setEditSpaceStatuses: (editSpaceStatuses) => set({ editSpaceStatuses: typeof editSpaceStatuses === 'function' ? editSpaceStatuses(get().editSpaceStatuses) : editSpaceStatuses }),

      setShowWorkspaceSettingsModal: (showWorkspaceSettingsModal) => set({ showWorkspaceSettingsModal }),
      setShowWorkspaceSettingsId: (showWorkspaceSettingsId) => set({ showWorkspaceSettingsId }),
      setEditingWorkspaceForModal: (editingWorkspaceForModal) => set({ editingWorkspaceForModal }),
      setModalSelectedCover: (modalSelectedCover) => set({ modalSelectedCover }),
      setEditWSName: (editWSName) => set({ editWSName }),
      setEditWSTheme: (editWSTheme) => set({ editWSTheme }),

      setShowPomoSettings: (showPomoSettings) => set({ showPomoSettings }),
      setViewingMemberProfileId: (viewingMemberProfileId) => set({ viewingMemberProfileId }),
      setSidebarOrder: (sidebarOrder) => set({ sidebarOrder: (sidebarOrder || []).filter(id => !REMOVED_MODULE_IDS.has(id)) }),
      setSidebarZones: (sidebarZones) => set({ sidebarZones: sidebarZones || [] }),
      createSidebarZone: (zoneData) => {
        const id = `zone_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const newZone: SidebarZone = {
          id,
          name: zoneData.name.trim() || 'New Zone',
          emoji: zoneData.emoji || '📁',
          color: zoneData.color || 'sky',
          itemIds: (zoneData.itemIds || []).filter(itemId => !REMOVED_MODULE_IDS.has(itemId)),
          isCollapsed: zoneData.isCollapsed ?? false,
        };
        const existingZones = (get().sidebarZones || []).map(z => ({
          ...z,
          itemIds: z.itemIds.filter(itemId => !(newZone.itemIds.includes(itemId)) && !REMOVED_MODULE_IDS.has(itemId))
        }));
        set({ sidebarZones: [...existingZones, newZone] });
        return id;
      },
      updateSidebarZone: (zoneId, updates) => {
        set(state => ({
          sidebarZones: (state.sidebarZones || []).map(z => {
            if (z.id !== zoneId) return z;
            return { 
              ...z, 
              ...updates,
              itemIds: updates.itemIds ? updates.itemIds.filter(itemId => !REMOVED_MODULE_IDS.has(itemId)) : z.itemIds
            };
          })
        }));
      },
      deleteSidebarZone: (zoneId) => {
        const state = get();
        const zoneToDelete = (state.sidebarZones || []).find(z => z.id === zoneId);
        if (!zoneToDelete) return;
        const newSidebarOrder = [...(state.sidebarOrder || DEFAULT_SIDEBAR_ORDER)].filter(id => !REMOVED_MODULE_IDS.has(id));
        zoneToDelete.itemIds.forEach(itemId => {
          if (!newSidebarOrder.includes(itemId) && !REMOVED_MODULE_IDS.has(itemId)) {
            newSidebarOrder.push(itemId);
          }
        });
        set({
          sidebarOrder: newSidebarOrder,
          sidebarZones: (state.sidebarZones || []).filter(z => z.id !== zoneId),
        });
      },
      toggleSidebarZoneCollapse: (zoneId) => {
        set(state => ({
          sidebarZones: (state.sidebarZones || []).map(z => 
            z.id === zoneId ? { ...z, isCollapsed: !z.isCollapsed } : z
          )
        }));
      },
      moveItemToZone: (itemId, targetZoneId, targetIndex) => {
        if (REMOVED_MODULE_IDS.has(itemId)) return;
        set(state => {
          const currentZones = state.sidebarZones || [];
          const updatedZones = currentZones.map(z => {
            const filtered = z.itemIds.filter(id => id !== itemId && !REMOVED_MODULE_IDS.has(id));
            if (z.id === targetZoneId) {
              const newItems = [...filtered];
              if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= newItems.length) {
                newItems.splice(targetIndex, 0, itemId);
              } else {
                newItems.push(itemId);
              }
              return { ...z, itemIds: newItems };
            }
            return { ...z, itemIds: filtered };
          });
          return { sidebarZones: updatedZones };
        });
      },
      removeItemFromZone: (itemId, zoneId, rootIndex) => {
        set(state => {
          const currentZones = state.sidebarZones || [];
          const updatedZones = currentZones.map(z => {
            if (zoneId && z.id !== zoneId) return z;
            return { ...z, itemIds: z.itemIds.filter(id => id !== itemId && !REMOVED_MODULE_IDS.has(id)) };
          });
          const newSidebarOrder = (state.sidebarOrder || DEFAULT_SIDEBAR_ORDER).filter(id => id !== itemId && !REMOVED_MODULE_IDS.has(id));
          if (!REMOVED_MODULE_IDS.has(itemId)) {
            if (typeof rootIndex === 'number' && rootIndex >= 0 && rootIndex <= newSidebarOrder.length) {
              newSidebarOrder.splice(rootIndex, 0, itemId);
            } else {
              newSidebarOrder.push(itemId);
            }
          }
          return {
            sidebarZones: updatedZones,
            sidebarOrder: newSidebarOrder,
          };
        });
      },
      reorderSidebarZones: (zones) => set({ 
        sidebarZones: (zones || []).map(z => ({
          ...z,
          itemIds: (z.itemIds || []).filter(id => !REMOVED_MODULE_IDS.has(id))
        }))
      }),
    }),
    {
      name: 'apexa_ui',
      version: 5,
      migrate: (persistedState) => {
        const state = persistedState as Partial<UiState>;
        const cleanZones = (Array.isArray(state.sidebarZones) ? state.sidebarZones : []).map(z => ({
          ...z,
          itemIds: (z.itemIds || []).filter(id => !REMOVED_MODULE_IDS.has(id))
        }));
        const activeTab = state.activeTab && REMOVED_MODULE_IDS.has(state.activeTab) ? 'dashboard' : (state.activeTab || 'dashboard');
        const defaultStartupTab = state.defaultStartupTab && REMOVED_MODULE_IDS.has(state.defaultStartupTab) ? 'dashboard' : (state.defaultStartupTab || 'dashboard');
        return {
          ...state,
          activeTab,
          defaultStartupTab,
          presencePreference: state.presencePreference || 'online',
          themePreference: getStoredThemePreference(),
          sidebarOrder: (state.sidebarOrder || []).filter(id => !REMOVED_MODULE_IDS.has(id)),
          sidebarZones: cleanZones,
        } as UiState;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const themePreference = getStoredThemePreference();
        const isDarkMode = applyThemePreference(themePreference, false, false);
        state.themePreference = themePreference;
        state.isDarkMode = isDarkMode;
        if (state.defaultStartupTab && !REMOVED_MODULE_IDS.has(state.defaultStartupTab)) {
          state.activeTab = state.defaultStartupTab;
        } else if (REMOVED_MODULE_IDS.has(state.activeTab)) {
          state.activeTab = 'dashboard';
        }
        if (state.sidebarOrder) {
          state.sidebarOrder = state.sidebarOrder.filter(id => !REMOVED_MODULE_IDS.has(id));
        }
        if (state.sidebarZones && Array.isArray(state.sidebarZones)) {
          state.sidebarZones = state.sidebarZones.map(z => ({
            ...z,
            itemIds: (z.itemIds || []).filter(id => !REMOVED_MODULE_IDS.has(id))
          }));
        } else {
          state.sidebarZones = [];
        }
      },
    }
  )
);
