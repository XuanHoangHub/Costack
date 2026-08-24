export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'inprogress' | 'review' | 'completed';

export interface User {
  id: string;
  userId?: string;
  name: string;
  email: string;
  avatar: string;
  bannerUrl?: string;
  coverUrl?: string;
  role: 'admin' | 'member' | 'guest';
  status: 'online' | 'busy' | 'offline' | 'away';
  customStatus?: 'online' | 'busy' | 'offline' | 'away';
  statusMessage?: string;
  statusEmoji?: string;
  lastSeenAt?: string;
  workspaceIds?: string[];
  phone?: string;
  department?: string;
  bio?: string;
  skills?: string[];
  joinedDate?: string;
  isPremium?: boolean;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: 'admin' | 'member' | 'guest';
  invitedBy: string;
  invitedByName?: string;
  token?: string;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  createdAt: string;
  expiresAt?: string;
  workspaceName?: string;
  workspaceTheme?: string;
  workspaceCoverUrl?: string;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskAttachment {
  id: string;
  name: string;
  filePath: string;
  size: number;
  uploadedAt: string;
  mimeType?: string;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: 'dropdown' | 'text' | 'date' | 'textarea' | 'number' | 'labels' | 'checkbox' | 'email' | 'phone' | 'money' | 'rating' | 'progress' | 'url' | 'member';
  options?: Array<string | { id: string; label: string; color: string; icon?: string }>;
  placeholder?: string;
  description?: string;
  isRequired?: boolean;
  isPrivate?: boolean;
  currencySymbol?: string;
  currencyPosition?: 'prefix' | 'suffix';
  numberFormat?: 'normal' | 'percent' | 'currency';
  numberMin?: number;
  numberMax?: number;
  numberPrecision?: number;
  dateFormat?: string;
  includeTime?: boolean;
  defaultToToday?: boolean;
  ratingMax?: number;
  ratingIcon?: 'star' | 'heart' | 'flame' | 'thumb';
  checkboxLabel?: string;
  progressMax?: number;
  allowMultiple?: boolean;
  defaultValue?: unknown;
}

export interface Space {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  themeColor?: string;
  workspaceId: string;
  position?: number;
  lists: { id: string; name: string; folderId?: string; position?: number; isPrivate?: boolean; shareSettings?: Record<string, 'view' | 'edit'>; user_id?: string; isFavorite?: boolean; isArchived?: boolean }[];
  folders?: { id: string; name: string; color?: string; position?: number; isFavorite?: boolean; isArchived?: boolean }[];
  whiteboards?: { id: string; name: string; folderId?: string; position?: number }[];
  channels?: { id: string; name: string; description?: string; type?: string }[];
  statuses?: { id: string; label: string; color: string; type: TaskStatus }[];
  clickApps?: {
    timeTracking?: boolean;
    multipleAssignees?: boolean;
    customFields?: boolean;
    relationships?: boolean;
    subtasks?: boolean;
    priorities?: boolean;
    spacePreferences?: {
      description?: string;
      isFavorite?: boolean;
      isHidden?: boolean;
      isArchived?: boolean;
      listPreferences?: Record<string, { isFavorite?: boolean; isArchived?: boolean }>;
    };
  };
  customFields?: CustomFieldDefinition[];
  isPrivate?: boolean;
  isFavorite?: boolean;
  isHidden?: boolean;
  isArchived?: boolean;
  shareSettings?: Record<string, 'view' | 'edit'>;
  user_id?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  assigneeId?: string;
  assigneeIds?: string[]; // Multiple assignees
  startDate?: string;
  dueDate?: string;
  subtasks: SubTask[];
  progress: number; // 0 to 100
  createdAt: string;
  completedAt?: string;
  aiSummary?: string;
  position?: number;
  hoursEstimate?: number;
  hoursLogged?: number;
  commentsCount: number;
  tags?: string[];
  isPinned?: boolean;
  isMilestone?: boolean;
  workspaceId?: string;
  parentId?: string;
  spaceId?: string; // Workspace Space link
  listId?: string; // Workspace List link
  attachments?: TaskAttachment[];
  activities?: {
    id: string;
    userName: string;
    action: string;
    timestamp: string;
  }[];
  comments?: {
    id: string;
    senderName: string;
    senderAvatar: string;
    content: string;
    timestamp: string;
  }[];
  custom_fields?: Record<string, unknown>;
  relationships?: {
    tasks?: string[];
    docs?: string[];
    blockedBy?: string[];
    blocks?: string[];
  };
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'none';
    interval: number;
  };
}

export interface Document {
  id: string;
  title: string;
  content: string;
  category: string;
  updatedAt: string;
  updatedBy: string;
  isAiGenerated?: boolean;
  coverIndex?: number;
  emoji?: string;
  workspaceId?: string;
  spaceId?: string;
  folderId?: string;
  parentId?: string;
  isProtected?: boolean;
  isFavorite?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  theme: string;
  initial: string;
  user_id?: string;
  created_at?: string;
  coverUrl?: string;
  logoUrl?: string;
  membershipRole?: WorkspaceRole;
  memberCount?: number;
  settings?: {
    logoUrl?: string;
    description?: string;
    timezone?: string;
    weekStartsOn?: 'monday' | 'sunday';
    defaultRole?: Exclude<WorkspaceRole, 'owner'>;
    allowMemberInvites?: boolean;
    defaultClickApps?: {
      timeTracking?: boolean;
      multipleAssignees?: boolean;
      customFields?: boolean;
      relationships?: boolean;
      subtasks?: boolean;
      priorities?: boolean;
    };
  };
}

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'guest';

export interface WorkspaceMembership {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  status: 'active' | 'suspended';
  joinedAt: string;
  updatedAt?: string;
}

export interface NotificationSettings {
  enableAll: boolean;
  enableSound: boolean;
  onlyImportant: boolean;
  enableAssignments: boolean;
  enableDeadlines: boolean;
  enableComments: boolean;
  enableStatusChanges: boolean;
  enableFilteringTags: boolean;
  enableSystemNotify: boolean;
  toastDuration: number;
  dndActive: boolean;
  frequencyLimit: 'throttled' | 'minimal' | 'all';
  dndDurationUntil?: string | null;
  dndScheduleEnabled?: boolean;
  dndScheduleStart?: string;
  dndScheduleEnd?: string;
  dndAllowUrgent?: boolean;
  enableChatMessages: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  channelId?: string; // e.g., 'general', 'design', 'development'
  isAiResponse?: boolean;
  isAi?: boolean;
  reactions?: {
    emoji: string;
    count: number;
    userIds: string[];
  }[];
  attachment?: {
    name: string;
    filePath: string;
    size: number;
    isImage: boolean;
    type?: string;
    isVoice?: boolean;
    duration?: number;
    isPoll?: boolean;
    question?: string;
    options?: {
      id: string;
      text: string;
      votes: string[];
    }[];
    isVideoMeet?: boolean;
    meetingUrl?: string;
    meetingTitle?: string;
  };
  parentId?: string;
  isPinned?: boolean;
  createdAt?: string;
  editedAt?: string;
  deliveryState?: 'sending' | 'sent' | 'failed';
}

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  type: 'public' | 'private' | 'dm' | 'group';
  unreadCount?: number;
  workspaceId?: string;
  dmKey?: string;
}

export type WhiteboardTool = 'select' | 'pencil' | 'rectangle' | 'circle' | 'line' | 'sticky' | 'diamond' | 'parallelogram' | 'pill' | 'cylinder';

export interface WhiteboardProject {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  color: string;
  emoji?: string;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
}

export interface WhiteboardBoard {
  id: string;
  projectId?: string;
  workspaceId: string;
  name: string;
  description?: string;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
  tags?: string[];
  elementsCount?: number;
  templateType?: string;
}

export interface WhiteboardElement {
  id: string;
  type: WhiteboardTool;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  lineWidth?: number;
  text?: string;
  points?: Array<{ x: number; y: number }> | Record<string, unknown>; // Supports {x, y}[] for pencil, or connection metadata for lines
}

export interface SyncLog {
  id: string;
  action: string;
  time: string;
  status: 'offline_saved' | 'synced';
  userName?: string;
  userAvatar?: string;
  category?: 'task' | 'space' | 'workspace' | 'doc' | 'member' | 'security' | 'system';
}

export interface TeamMemberCursor {
  id: string;
  name: string;
  avatar: string;
  x: number;
  y: number;
}

// ─── Apexa Base (Bitable-style no-code database) ───

export type BaseFieldType =
  | 'text' | 'long_text' | 'number' | 'single_select' | 'multi_select'
  | 'date' | 'checkbox' | 'person' | 'url' | 'email' | 'phone'
  | 'currency' | 'rating' | 'percent';

export interface BaseFieldOption {
  id: string;
  label: string;
  color?: string;
}

export interface BaseField {
  id: string;
  name: string;
  type: BaseFieldType;
  options?: BaseFieldOption[];
  width?: number;
}

export interface BaseRecord {
  id: string;
  values: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type BaseViewType = 'grid' | 'kanban' | 'gallery' | 'form' | 'calendar' | 'gantt' | 'dashboard';

export interface BaseViewFilter {
  fieldId: string;
  operator: 'equals' | 'contains' | 'not_empty' | 'empty' | 'gt' | 'lt';
  value?: unknown;
}

export interface BaseViewSort {
  fieldId: string;
  direction: 'asc' | 'desc';
}

export interface BaseViewConfig {
  visibleFields?: string[];
  filters?: BaseViewFilter[];
  sorts?: BaseViewSort[];
  groupByFieldId?: string;
  kanbanFieldId?: string;
  calendarFieldId?: string;
  galleryCoverFieldId?: string;
  formTitleFieldId?: string;
  ganttStartFieldId?: string;
  ganttDurationFieldId?: string;
}

export interface BaseView {
  id: string;
  name: string;
  type: BaseViewType;
  config: BaseViewConfig;
}

export interface BaseTable {
  id: string;
  name: string;
  fields: BaseField[];
  records: BaseRecord[];
  views: BaseView[];
  primaryFieldId: string;
}

export interface BaseApp {
  id: string;
  name: string;
  emoji?: string;
  description?: string;
  tables: BaseTable[];
  activeTableId?: string;
  workspaceId?: string;
  createdAt: string;
  updatedAt: string;
}
