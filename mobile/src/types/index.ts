export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'inprogress' | 'review' | 'completed';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'member' | 'guest';
  status: 'online' | 'busy' | 'offline' | 'away';
  statusMessage?: string;
  statusEmoji?: string;
  phone?: string;
  department?: string;
  bio?: string;
  joinedDate?: string;
  isPremium?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  theme?: string;
  initial?: string;
  user_id?: string;
  created_at?: string;
  coverUrl?: string;
  logoUrl?: string;
  settings?: any;
  role?: 'owner' | 'admin' | 'member' | 'guest';
  memberCount?: number;
  spaceCount?: number;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskComment {
  id: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  assigneeId?: string;
  assigneeIds?: string[];
  startDate?: string;
  dueDate?: string;
  subtasks: SubTask[];
  progress: number;
  createdAt: string;
  completedAt?: string;
  deletedAt?: string;
  aiSummary?: string;
  hoursEstimate?: number;
  hoursLogged?: number;
  commentsCount: number;
  tags?: string[];
  isPinned?: boolean;
  workspaceId?: string;
  spaceId?: string;
  listId?: string;
  comments?: TaskComment[];
}

export interface SpaceList {
  id: string;
  name: string;
  folderId?: string;
  position?: number;
  isPrivate?: boolean;
}

export interface SpaceFolder {
  id: string;
  name: string;
  color?: string;
  position?: number;
}

export interface Space {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  themeColor?: string;
  workspaceId: string;
  lists: SpaceList[];
  folders?: SpaceFolder[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  channelId?: string;
  isAi?: boolean;
  reactions?: {
    emoji: string;
    count: number;
    userIds: string[];
  }[];
}

export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'dm';
  unreadCount?: number;
  workspaceId?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'task_assigned' | 'mention' | 'deadline' | 'system' | 'comment';
  timestamp: string;
  read: boolean;
  targetId?: string;
  targetType?: 'task' | 'chat' | 'doc';
}

export interface DocumentItem {
  id: string;
  title: string;
  content: string;
  category?: string;
  emoji?: string;
  updatedAt: string;
  updatedBy?: string;
  workspaceId?: string;
  spaceId?: string;
  isFavorite?: boolean;
}

export interface FinanceTransaction {
  id: string;
  workspaceId?: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  category: string;
  title: string;
  description?: string;
  date: string;
  status: 'completed' | 'pending';
  createdBy?: string;
}

export interface FinanceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
}

export interface FinanceAccount {
  id: string;
  bank: string;
  accountNumber: string;
  balance: number;
  color?: string;
}
