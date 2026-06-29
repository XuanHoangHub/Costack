export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'inprogress' | 'review' | 'completed';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'member' | 'guest';
  status: 'online' | 'busy' | 'offline';
  workspaceIds?: string[];
  phone?: string;
  department?: string;
  bio?: string;
  joinedDate?: string;
  isPremium?: boolean;
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
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: 'dropdown' | 'text' | 'date' | 'textarea' | 'number' | 'labels' | 'checkbox' | 'email' | 'phone' | 'money';
  options?: string[]; // for dropdown or labels
}

export interface Space {
  id: string;
  name: string;
  emoji?: string;
  themeColor?: string;
  workspaceId: string;
  lists: { id: string; name: string; folderId?: string }[];
  folders?: { id: string; name: string }[];
  whiteboards?: { id: string; name: string; folderId?: string }[];
  channels?: { id: string; name: string }[];
  statuses?: { id: string; label: string; color: string; type: TaskStatus }[];
  clickApps?: {
    timeTracking?: boolean;
    multipleAssignees?: boolean;
    customFields?: boolean;
    relationships?: boolean;
    subtasks?: boolean;
    priorities?: boolean;
  };
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
  hoursEstimate?: number;
  hoursLogged?: number;
  commentsCount: number;
  tags?: string[];
  isPinned?: boolean;
  workspaceId?: string;
  spaceId?: string; // ClickUp Space link
  listId?: string; // ClickUp List link
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
}

export interface Workspace {
  id: string;
  name: string;
  theme: string;
  initial: string;
  user_id?: string;
  created_at?: string;
  coverUrl?: string;
  settings?: {
    logoUrl?: string;
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
  };
}

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  type: 'public' | 'private' | 'dm';
  unreadCount?: number;
}

export type WhiteboardTool = 'select' | 'pencil' | 'rectangle' | 'circle' | 'line' | 'sticky' | 'diamond' | 'parallelogram' | 'pill' | 'cylinder';

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
  points?: any; // Supports {x, y}[] for pencil, or connection metadata for lines
}

export interface SyncLog {
  id: string;
  action: string;
  time: string;
  status: 'offline_saved' | 'synced';
}

export interface TeamMemberCursor {
  id: string;
  name: string;
  avatar: string;
  x: number;
  y: number;
}
