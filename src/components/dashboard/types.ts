import { Task, User, SyncLog, Document } from '@/types';

export type DashboardScope = 'workspace' | 'mine';
export type DashboardRange = 7 | 30 | 90;
export type DashboardChartMode = 'area' | 'bar';
export type DashboardWidgetKey = 'focus' | 'kpis' | 'health' | 'charts' | 'velocity' | 'ai' | 'activity';
export type DashboardPriorityTab = 'all' | 'urgent' | 'overdue' | 'today' | 'pinned';
export type HealthFilterKey = 'none' | 'at_risk' | 'due_soon' | 'unassigned' | 'no_due_date';

export interface DashboardPreferences {
  range: DashboardRange;
  chartMode: DashboardChartMode;
  widgets: Record<DashboardWidgetKey, boolean>;
}

export interface DashboardOverviewProps {
  tasks: Task[];
  members: User[];
  docs: Document[];
  syncLogs: SyncLog[];
  isOffline: boolean;
  onNavigate: (tab: string) => void;
  onOpenTask?: (taskId: string) => void;
  onToggleOffline: () => void;
  currentUser: any;
  onUpgradePremium?: () => void;
  onAddSyncLog?: (action: string) => void;
  triggerToast?: (type: 'assignment' | 'deadline' | 'comment' | 'success' | 'info' | 'message', title: string, message: string) => void;
  onClearSyncLogs?: () => void;
  isLoading?: boolean;
  isSynced?: boolean;
  workspaceName?: string;
  onAddTask?: (task: any) => void;
}

export interface PeriodInsights {
  currentCreated: number;
  currentCompleted: number;
  previousCompleted: number;
  completionDelta: number;
  atRisk: number;
  dueSoon: number;
  unassigned: number;
  noDueDate: number;
  averageCycleDays: number;
}
