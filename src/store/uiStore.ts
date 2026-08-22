import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NotificationSettings } from '@/types';
import { applyThemePreference, getStoredThemePreference, type ThemePreference } from '@/lib/theme';

interface UiState {
  activeTab: string;
  isMainSidebarCollapsed: boolean;
  isSearchOpen: boolean;
  searchQuery: string;
  searchCategory: 'all' | 'tasks' | 'docs' | 'spaces' | 'channels' | 'members' | 'commands';
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

  sidebarOrder: string[];

  setActiveTab: (tab: string) => void;
  setIsMainSidebarCollapsed: (collapsed: boolean) => void;
  setIsSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchCategory: (category: 'all' | 'tasks' | 'docs' | 'spaces' | 'channels' | 'members' | 'commands') => void;
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
}

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
      isDarkMode: false,
      themePreference: 'system',
      accentPreset: 'indigo',
      dateFormat: 'short',
      uiDensity: 'comfortable',
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
      sidebarOrder: [
        'dashboard', 'inbox', 'tasks', 'my-tasks', 'calendar', 'productivity', 'analytics',
        'crm', 'base', 'docs', 'whiteboard', 'chat', 'team'
      ],

      setActiveTab: (activeTab) => set({ activeTab }),
      setIsMobileSidebarOpen: (isMobileSidebarOpen) => set({ isMobileSidebarOpen }),
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
      setSidebarOrder: (sidebarOrder) => set({ sidebarOrder }),
    }),
    {
      name: 'apexa_ui',
      version: 3,
      migrate: (persistedState) => {
        const state = persistedState as Partial<UiState>;
        return {
          ...state,
          presencePreference: state.presencePreference || 'online',
          themePreference: getStoredThemePreference(),
        } as UiState;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const themePreference = getStoredThemePreference();
        const isDarkMode = applyThemePreference(themePreference, false, false);
        state.themePreference = themePreference;
        state.isDarkMode = isDarkMode;
      },
    }
  )
);
