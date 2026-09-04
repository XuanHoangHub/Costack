"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Download,
  Edit3,
  Flag,
  Gauge,
  Link2,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Task, User } from '@/types';
import { useTranslation } from '@/contexts/TranslationContext';

type GoalPeriod = 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';
type GoalStatus = 'on_track' | 'at_risk' | 'off_track' | 'completed' | 'archived';

interface GoalRecord {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  owner_id: string | null;
  created_by: string;
  period: GoalPeriod;
  status: GoalStatus;
  start_date: string;
  due_date: string;
  color: string;
  created_at: string;
  updated_at: string;
}

interface KeyResultRecord {
  id: string;
  goal_id: string;
  title: string;
  owner_id: string | null;
  start_value: number;
  target_value: number;
  current_value: number;
  unit: string;
  linked_task_ids: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface GoalsHubProps {
  activeWorkspaceId: string;
  currentUser: User;
  members: User[];
  tasks: Task[];
  isOffline: boolean;
  onOpenTask?: (taskId: string) => void;
  onAddSyncLog?: (action: string) => void;
  triggerToast?: (
    type: 'assignment' | 'deadline' | 'comment' | 'success' | 'info' | 'message',
    title: string,
    message: string,
  ) => void;
}

interface GoalFormState {
  title: string;
  description: string;
  ownerId: string;
  period: GoalPeriod;
  status: GoalStatus;
  startDate: string;
  dueDate: string;
  color: string;
}

interface KeyResultFormState {
  title: string;
  ownerId: string;
  startValue: string;
  targetValue: string;
  currentValue: string;
  unit: string;
  linkedTaskIds: string[];
}

const GOAL_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return dateKey(next);
};

const defaultGoalForm = (): GoalFormState => ({
  title: '',
  description: '',
  ownerId: '',
  period: 'quarterly',
  status: 'on_track',
  startDate: dateKey(new Date()),
  dueDate: addDays(new Date(), 90),
  color: GOAL_COLORS[0],
});

const defaultKeyResultForm = (): KeyResultFormState => ({
  title: '',
  ownerId: '',
  startValue: '0',
  targetValue: '100',
  currentValue: '0',
  unit: '%',
  linkedTaskIds: [],
});

const clamp = (value: number) => Math.max(0, Math.min(100, value));

const isUuid = (value?: string | null) =>
  Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));

const resolveAuthUserId = (member?: User | null) => {
  if (!member) return null;
  if (isUuid(member.userId)) return member.userId!;
  if (isUuid(member.id)) return member.id;
  const stripped = member.id.startsWith('user-') ? member.id.slice(5) : '';
  return isUuid(stripped) ? stripped : null;
};

const memberMatchesAuthId = (member: User, authId?: string | null) => {
  if (!authId) return false;
  return resolveAuthUserId(member) === authId;
};

const getKeyResultProgress = (keyResult: KeyResultRecord, tasks: Task[]) => {
  if (keyResult.linked_task_ids?.length) {
    const linkedTasks = keyResult.linked_task_ids
      .map((taskId) => tasks.find((task) => task.id === taskId))
      .filter(Boolean) as Task[];
    if (linkedTasks.length) {
      const completed = linkedTasks.filter((task) => task.status === 'completed').length;
      return clamp((completed / linkedTasks.length) * 100);
    }
  }

  const range = Number(keyResult.target_value) - Number(keyResult.start_value);
  if (range === 0) return 0;
  return clamp(((Number(keyResult.current_value) - Number(keyResult.start_value)) / range) * 100);
};

const getGoalProgress = (goalId: string, keyResults: KeyResultRecord[], tasks: Task[]) => {
  const records = keyResults.filter((keyResult) => keyResult.goal_id === goalId);
  if (!records.length) return 0;
  return Math.round(records.reduce((sum, record) => sum + getKeyResultProgress(record, tasks), 0) / records.length);
};

const getGoalHealth = (goal: GoalRecord, progress: number): GoalStatus => {
  if (goal.status === 'completed' || progress >= 100) return 'completed';
  if (goal.status === 'archived') return 'archived';

  const start = new Date(`${goal.start_date}T00:00:00`).getTime();
  const due = new Date(`${goal.due_date}T23:59:59`).getTime();
  const now = Date.now();
  if (now > due) return 'off_track';
  const elapsed = due > start ? clamp(((now - start) / (due - start)) * 100) : 100;
  if (progress + 15 >= elapsed) return 'on_track';
  if (progress + 30 >= elapsed) return 'at_risk';
  return 'off_track';
};

const downloadJson = (workspaceId: string, goals: GoalRecord[], keyResults: KeyResultRecord[]) => {
  const blob = new Blob([
    JSON.stringify({ exportedAt: new Date().toISOString(), workspaceId, goals, keyResults }, null, 2),
  ], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `apexa-goals-${dateKey(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const ModalShell = ({ title, subtitle, onClose, children }: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <motion.div
    className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onMouseDown={(event) => event.target === event.currentTarget && onClose()}
  >
    <motion.div
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
        <div>
          <h2 className="text-lg font-black text-slate-950 dark:text-white">{title}</h2>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="custom-scrollbar max-h-[calc(92vh-88px)] overflow-y-auto p-5 sm:p-6">{children}</div>
    </motion.div>
  </motion.div>
);

export default function GoalsHub({
  activeWorkspaceId,
  currentUser,
  members,
  tasks,
  isOffline,
  onOpenTask,
  onAddSyncLog,
  triggerToast,
}: GoalsHubProps) {
  const { locale } = useTranslation();
  const isVietnamese = locale === 'vi';
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [keyResults, setKeyResults] = useState<KeyResultRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | GoalStatus>('all');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'mine'>('all');
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(new Set());
  const [editingGoal, setEditingGoal] = useState<GoalRecord | null>(null);
  const [goalForm, setGoalForm] = useState<GoalFormState>(defaultGoalForm);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [activeGoalForKeyResult, setActiveGoalForKeyResult] = useState<GoalRecord | null>(null);
  const [editingKeyResult, setEditingKeyResult] = useState<KeyResultRecord | null>(null);
  const [keyResultForm, setKeyResultForm] = useState<KeyResultFormState>(defaultKeyResultForm);
  const [showTemplates, setShowTemplates] = useState(false);
  const [taskPickerQuery, setTaskPickerQuery] = useState('');

  const offlineKey = `apexa_goals_${activeWorkspaceId}`;
  const currentUserAuthId = resolveAuthUserId(currentUser);

  useEffect(() => {
    let cancelled = false;

    const loadGoals = async () => {
      setIsLoading(true);
      setError('');

      if (isOffline) {
        try {
          const cached = JSON.parse(localStorage.getItem(offlineKey) || '{}');
          if (!cancelled) {
            setGoals(Array.isArray(cached.goals) ? cached.goals : []);
            setKeyResults(Array.isArray(cached.keyResults) ? cached.keyResults : []);
          }
        } catch {
          if (!cancelled) {
            setGoals([]);
            setKeyResults([]);
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
        return;
      }

      const { data: goalRows, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('workspace_id', activeWorkspaceId)
        .order('due_date', { ascending: true });

      if (goalError) {
        if (!cancelled) {
          setError(isVietnamese ? 'Không thể tải mục tiêu từ Supabase.' : 'Unable to load goals from Supabase.');
          setIsLoading(false);
        }
        return;
      }

      const loadedGoals = (goalRows || []) as GoalRecord[];
      let loadedKeyResults: KeyResultRecord[] = [];
      if (loadedGoals.length) {
        const { data: keyResultRows, error: keyResultError } = await supabase
          .from('goal_key_results')
          .select('*')
          .in('goal_id', loadedGoals.map((goal) => goal.id))
          .order('sort_order', { ascending: true });
        if (keyResultError) {
          if (!cancelled) setError(isVietnamese ? 'Không thể tải kết quả then chốt.' : 'Unable to load key results.');
        } else {
          loadedKeyResults = (keyResultRows || []) as KeyResultRecord[];
        }
      }

      if (!cancelled) {
        setGoals(loadedGoals);
        setKeyResults(loadedKeyResults);
        setIsLoading(false);
      }
    };

    void loadGoals();
    return () => { cancelled = true; };
  }, [activeWorkspaceId, isOffline, isVietnamese, offlineKey]);

  useEffect(() => {
    if (!isOffline) return;
    try {
      localStorage.setItem(offlineKey, JSON.stringify({ goals, keyResults }));
    } catch {}
  }, [goals, isOffline, keyResults, offlineKey]);

  const goalMetrics = useMemo(() => goals.map((goal) => {
    const progress = getGoalProgress(goal.id, keyResults, tasks);
    return { goal, progress, health: getGoalHealth(goal, progress) };
  }), [goals, keyResults, tasks]);

  const summary = useMemo(() => {
    const active = goalMetrics.filter(({ health }) => !['completed', 'archived'].includes(health));
    return {
      active: active.length,
      atRisk: active.filter(({ health }) => health === 'at_risk' || health === 'off_track').length,
      completed: goalMetrics.filter(({ health }) => health === 'completed').length,
      average: active.length ? Math.round(active.reduce((sum, item) => sum + item.progress, 0) / active.length) : 0,
    };
  }, [goalMetrics]);

  const filteredGoals = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return goalMetrics.filter(({ goal, health }) => {
      const matchesSearch = !normalizedQuery || `${goal.title} ${goal.description}`.toLocaleLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === 'all' || health === statusFilter;
      const matchesOwner = ownerFilter === 'all' || goal.owner_id === currentUserAuthId || goal.created_by === currentUserAuthId;
      return matchesSearch && matchesStatus && matchesOwner;
    });
  }, [currentUserAuthId, goalMetrics, ownerFilter, query, statusFilter]);

  const visibleTasks = useMemo(() => tasks
    .filter((task) => !taskPickerQuery.trim() || `${task.title} ${task.description || ''}`.toLocaleLowerCase().includes(taskPickerQuery.trim().toLocaleLowerCase()))
    .slice(0, 40), [taskPickerQuery, tasks]);

  const getOwner = (ownerId: string | null) => members.find((member) => memberMatchesAuthId(member, ownerId));

  const closeGoalModal = () => {
    setShowGoalModal(false);
    setEditingGoal(null);
    setGoalForm(defaultGoalForm());
  };

  const openCreateGoal = () => {
    const ownerId = currentUserAuthId || '';
    setEditingGoal(null);
    setGoalForm({ ...defaultGoalForm(), ownerId });
    setShowGoalModal(true);
  };

  const openEditGoal = (goal: GoalRecord) => {
    setEditingGoal(goal);
    setGoalForm({
      title: goal.title,
      description: goal.description,
      ownerId: goal.owner_id || '',
      period: goal.period,
      status: goal.status,
      startDate: goal.start_date,
      dueDate: goal.due_date,
      color: goal.color,
    });
    setShowGoalModal(true);
  };

  const saveGoal = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = goalForm.title.trim();
    if (!title || goalForm.dueDate < goalForm.startDate) return;
    setIsSaving(true);
    setError('');

    const now = new Date().toISOString();
    const goalId = editingGoal?.id || `goal-${crypto.randomUUID()}`;
    const record: GoalRecord = {
      id: goalId,
      workspace_id: activeWorkspaceId,
      title,
      description: goalForm.description.trim(),
      owner_id: isUuid(goalForm.ownerId) ? goalForm.ownerId : null,
      created_by: editingGoal?.created_by || currentUserAuthId || '',
      period: goalForm.period,
      status: goalForm.status,
      start_date: goalForm.startDate,
      due_date: goalForm.dueDate,
      color: goalForm.color,
      created_at: editingGoal?.created_at || now,
      updated_at: now,
    };

    if (!record.created_by) {
      setError(isVietnamese ? 'Phiên đăng nhập không hợp lệ.' : 'Your session is invalid.');
      setIsSaving(false);
      return;
    }

    if (!isOffline) {
      const { error: saveError } = editingGoal
        ? await supabase.from('goals').update(record).eq('id', goalId)
        : await supabase.from('goals').insert(record);
      if (saveError) {
        setError(saveError.message);
        setIsSaving(false);
        return;
      }
    }

    setGoals((current) => editingGoal
      ? current.map((goal) => goal.id === goalId ? record : goal)
      : [record, ...current]);
    setExpandedGoalIds((current) => new Set(current).add(goalId));
    onAddSyncLog?.(`${editingGoal ? 'Updated' : 'Created'} OKR: ${title}`);
    triggerToast?.('success', isVietnamese ? 'Đã lưu mục tiêu' : 'Goal saved', title);
    setIsSaving(false);
    closeGoalModal();
  };

  const deleteGoal = async (goal: GoalRecord) => {
    if (!window.confirm(isVietnamese ? `Xóa mục tiêu “${goal.title}” và toàn bộ key results?` : `Delete “${goal.title}” and all key results?`)) return;
    if (!isOffline) {
      const { error: deleteError } = await supabase.from('goals').delete().eq('id', goal.id);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }
    }
    setGoals((current) => current.filter((item) => item.id !== goal.id));
    setKeyResults((current) => current.filter((item) => item.goal_id !== goal.id));
    triggerToast?.('success', isVietnamese ? 'Đã xóa mục tiêu' : 'Goal deleted', goal.title);
  };

  const closeKeyResultModal = () => {
    setActiveGoalForKeyResult(null);
    setEditingKeyResult(null);
    setKeyResultForm(defaultKeyResultForm());
    setTaskPickerQuery('');
  };

  const openCreateKeyResult = (goal: GoalRecord) => {
    setActiveGoalForKeyResult(goal);
    setEditingKeyResult(null);
    setKeyResultForm({ ...defaultKeyResultForm(), ownerId: goal.owner_id || currentUserAuthId || '' });
  };

  const openEditKeyResult = (goal: GoalRecord, keyResult: KeyResultRecord) => {
    setActiveGoalForKeyResult(goal);
    setEditingKeyResult(keyResult);
    setKeyResultForm({
      title: keyResult.title,
      ownerId: keyResult.owner_id || '',
      startValue: String(keyResult.start_value),
      targetValue: String(keyResult.target_value),
      currentValue: String(keyResult.current_value),
      unit: keyResult.unit,
      linkedTaskIds: keyResult.linked_task_ids || [],
    });
  };

  const saveKeyResult = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeGoalForKeyResult || !keyResultForm.title.trim()) return;
    const startValue = Number(keyResultForm.startValue);
    const targetValue = Number(keyResultForm.targetValue);
    const currentValue = Number(keyResultForm.currentValue);
    if (![startValue, targetValue, currentValue].every(Number.isFinite) || targetValue === startValue) return;
    setIsSaving(true);

    const now = new Date().toISOString();
    const keyResultId = editingKeyResult?.id || `kr-${crypto.randomUUID()}`;
    const record: KeyResultRecord = {
      id: keyResultId,
      goal_id: activeGoalForKeyResult.id,
      title: keyResultForm.title.trim(),
      owner_id: isUuid(keyResultForm.ownerId) ? keyResultForm.ownerId : null,
      start_value: startValue,
      target_value: targetValue,
      current_value: currentValue,
      unit: keyResultForm.unit.trim() || '%',
      linked_task_ids: keyResultForm.linkedTaskIds,
      sort_order: editingKeyResult?.sort_order ?? keyResults.filter((item) => item.goal_id === activeGoalForKeyResult.id).length,
      created_at: editingKeyResult?.created_at || now,
      updated_at: now,
    };

    if (!isOffline) {
      const { error: saveError } = editingKeyResult
        ? await supabase.from('goal_key_results').update(record).eq('id', keyResultId)
        : await supabase.from('goal_key_results').insert(record);
      if (saveError) {
        setError(saveError.message);
        setIsSaving(false);
        return;
      }
    }

    setKeyResults((current) => editingKeyResult
      ? current.map((item) => item.id === keyResultId ? record : item)
      : [...current, record]);
    triggerToast?.('success', isVietnamese ? 'Đã lưu kết quả then chốt' : 'Key result saved', record.title);
    setIsSaving(false);
    closeKeyResultModal();
  };

  const deleteKeyResult = async (record: KeyResultRecord) => {
    if (!isOffline) {
      const { error: deleteError } = await supabase.from('goal_key_results').delete().eq('id', record.id);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }
    }
    setKeyResults((current) => current.filter((item) => item.id !== record.id));
  };

  const applyTemplate = (template: 'growth' | 'product' | 'operations') => {
    const templates = {
      growth: {
        title: isVietnamese ? 'Tăng trưởng doanh thu bền vững' : 'Drive sustainable revenue growth',
        description: isVietnamese ? 'Tập trung vào doanh thu, khách hàng mới và khả năng giữ chân.' : 'Focus on revenue, acquisition, and retention.',
        color: '#10b981',
      },
      product: {
        title: isVietnamese ? 'Nâng tầm trải nghiệm sản phẩm' : 'Elevate the product experience',
        description: isVietnamese ? 'Cải thiện chất lượng, tốc độ và mức độ hài lòng của người dùng.' : 'Improve quality, speed, and customer satisfaction.',
        color: '#6366f1',
      },
      operations: {
        title: isVietnamese ? 'Vận hành hiệu quả và có thể mở rộng' : 'Build scalable operations',
        description: isVietnamese ? 'Chuẩn hóa quy trình và giảm công việc thủ công.' : 'Standardize workflows and reduce manual effort.',
        color: '#f59e0b',
      },
    } as const;
    const selected = templates[template];
    setGoalForm({ ...defaultGoalForm(), ...selected, ownerId: currentUserAuthId || '' });
    setShowTemplates(false);
    setShowGoalModal(true);
  };

  const statusMeta: Record<GoalStatus, { label: string; className: string; icon: typeof CircleDot }> = {
    on_track: { label: isVietnamese ? 'Đúng tiến độ' : 'On track', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20', icon: CheckCircle2 },
    at_risk: { label: isVietnamese ? 'Có rủi ro' : 'At risk', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20', icon: AlertTriangle },
    off_track: { label: isVietnamese ? 'Chậm tiến độ' : 'Off track', className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20', icon: Flag },
    completed: { label: isVietnamese ? 'Hoàn thành' : 'Completed', className: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20', icon: Check },
    archived: { label: isVietnamese ? 'Đã lưu trữ' : 'Archived', className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', icon: CircleDot },
  };

  return (
    <div className="min-h-full bg-slate-50/70 px-3 py-4 dark:bg-[#000000] sm:px-5 sm:py-6 lg:px-7">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-indigo-50/70 p-5 shadow-sm dark:border-slate-800/90 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/30 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">Goals & OKRs</h1>
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">Workspace</span>
                </div>
                <p className="mt-1.5 max-w-2xl text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400 sm:text-sm">
                  {isVietnamese ? 'Biến chiến lược thành kết quả đo lường được, theo dõi tiến độ và kết nối trực tiếp với công việc.' : 'Turn strategy into measurable outcomes, track progress, and connect goals directly to work.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowTemplates(true)} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <Sparkles className="h-4 w-4" /> {isVietnamese ? 'Mẫu OKR' : 'Templates'}
              </button>
              <button type="button" onClick={() => downloadJson(activeWorkspaceId, goals, keyResults)} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <Download className="h-4 w-4" /> {isVietnamese ? 'Xuất dữ liệu' : 'Export'}
              </button>
              <button type="button" onClick={openCreateGoal} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-indigo-600 px-5 text-xs font-black text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700">
                <Plus className="h-4 w-4" /> {isVietnamese ? 'Tạo mục tiêu' : 'Create goal'}
              </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: isVietnamese ? 'Đang hoạt động' : 'Active goals', value: summary.active, icon: Target, tone: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-300' },
            { label: isVietnamese ? 'Tiến độ trung bình' : 'Average progress', value: `${summary.average}%`, icon: TrendingUp, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300' },
            { label: isVietnamese ? 'Cần chú ý' : 'Needs attention', value: summary.atRisk, icon: AlertTriangle, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300' },
            { label: isVietnamese ? 'Đã hoàn thành' : 'Completed', value: summary.completed, icon: CheckCircle2, tone: 'text-violet-600 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-300' },
          ].map((item) => (
            <div key={item.label} className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800/90 dark:bg-slate-950 sm:p-5">
              <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}><item.icon className="h-4 w-4" /></div>
              <p className="text-2xl font-black text-slate-950 dark:text-white">{item.value}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{item.label}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-3 rounded-[22px] border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-800/90 dark:bg-slate-950 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isVietnamese ? 'Tìm mục tiêu, mô tả...' : 'Search goals, descriptions...'} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | GoalStatus)} className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <option value="all">{isVietnamese ? 'Mọi trạng thái' : 'All statuses'}</option>
            {(Object.keys(statusMeta) as GoalStatus[]).map((status) => <option key={status} value={status}>{statusMeta[status].label}</option>)}
          </select>
          <button type="button" onClick={() => setOwnerFilter((current) => current === 'all' ? 'mine' : 'all')} className={`h-11 rounded-2xl border px-4 text-xs font-black transition ${ownerFilter === 'mine' ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'}`}>
            {isVietnamese ? 'Mục tiêu của tôi' : 'My goals'}
          </button>
        </section>

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-64 animate-pulse rounded-[26px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950" />)}
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-20 text-center dark:border-slate-700 dark:bg-slate-950">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"><Target className="h-7 w-7" /></div>
            <h3 className="mt-5 text-lg font-black text-slate-900 dark:text-white">{isVietnamese ? 'Bắt đầu với một mục tiêu rõ ràng' : 'Start with a clear objective'}</h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">{isVietnamese ? 'Tạo OKR đầu tiên hoặc sử dụng mẫu để đội nhóm tập trung vào kết quả quan trọng nhất.' : 'Create your first OKR or use a template to focus the team on the outcomes that matter.'}</p>
            <button type="button" onClick={openCreateGoal} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-black text-white"><Plus className="h-4 w-4" /> {isVietnamese ? 'Tạo mục tiêu đầu tiên' : 'Create first goal'}</button>
          </div>
        ) : (
          <div className="grid items-start gap-4 xl:grid-cols-2">
            {filteredGoals.map(({ goal, progress, health }) => {
              const records = keyResults.filter((item) => item.goal_id === goal.id);
              const owner = getOwner(goal.owner_id);
              const isExpanded = expandedGoalIds.has(goal.id);
              const HealthIcon = statusMeta[health].icon;
              const daysRemaining = Math.ceil((new Date(`${goal.due_date}T23:59:59`).getTime() - Date.now()) / 86400000);
              return (
                <motion.article key={goal.id} layout className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/90 dark:bg-slate-950">
                  <div className="h-1.5" style={{ backgroundColor: goal.color }} />
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] whitespace-nowrap shrink-0 ${statusMeta[health].className}`}><HealthIcon className="h-3 w-3 shrink-0" /> {statusMeta[health].label}</span>
                          <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap">{goal.period}</span>
                        </div>
                        <h2 className="text-lg font-black leading-snug text-slate-950 dark:text-white break-words text-balance">{goal.title}</h2>
                        {goal.description && <p className="mt-2 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400 break-words text-pretty">{goal.description}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button type="button" onClick={() => openEditGoal(goal)} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-900"><Edit3 className="h-4 w-4" /></button>
                        <button type="button" onClick={() => void deleteGoal(goal)} className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center gap-4">
                      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(${goal.color} ${progress * 3.6}deg, rgba(148,163,184,.16) 0deg)` }}>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-black text-slate-900 dark:bg-slate-950 dark:text-white whitespace-nowrap tabular-nums">{progress}%</div>
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.08em] text-slate-400"><span className="whitespace-nowrap">{isVietnamese ? 'Tiến độ tổng' : 'Overall progress'}</span><span className="whitespace-nowrap tabular-nums">{records.length} KR</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full rounded-full" style={{ backgroundColor: goal.color }} /></div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-slate-500">
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><CalendarDays className="h-3.5 w-3.5 shrink-0" /> {daysRemaining >= 0 ? `${daysRemaining} ${isVietnamese ? 'ngày còn lại' : 'days left'}` : `${Math.abs(daysRemaining)} ${isVietnamese ? 'ngày quá hạn' : 'days overdue'}`}</span>
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap truncate max-w-[200px]"><Users className="h-3.5 w-3.5 shrink-0" /> {owner?.name || currentUser.name}</span>
                        </div>
                      </div>
                    </div>

                    <button type="button" onClick={() => setExpandedGoalIds((current) => {
                      const next = new Set(current);
                      if (next.has(goal.id)) next.delete(goal.id);
                      else next.add(goal.id);
                      return next;
                    })} className="mt-5 flex w-full items-center justify-between border-t border-slate-100 pt-4 text-xs font-black text-slate-600 dark:border-slate-800 dark:text-slate-300">
                      <span>{isVietnamese ? 'Kết quả then chốt' : 'Key results'}</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="space-y-2 pt-3">
                            {records.map((record) => {
                              const recordProgress = Math.round(getKeyResultProgress(record, tasks));
                              const linkedTasks = (record.linked_task_ids || []).map((taskId) => tasks.find((task) => task.id === taskId)).filter(Boolean) as Task[];
                              return (
                                <div key={record.id} className="group rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-black text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-300">{recordProgress}%</div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-start justify-between gap-3">
                                        <p className="text-xs font-bold leading-relaxed text-slate-800 dark:text-slate-100">{record.title}</p>
                                        <div className="flex opacity-0 transition group-hover:opacity-100">
                                          <button type="button" onClick={() => openEditKeyResult(goal, record)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit3 className="h-3.5 w-3.5" /></button>
                                          <button type="button" onClick={() => void deleteKeyResult(record)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                                        </div>
                                      </div>
                                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${recordProgress}%` }} /></div>
                                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] font-bold text-slate-400">
                                        <span>{record.current_value}{record.unit} <ArrowRight className="mx-1 inline h-3 w-3" /> {record.target_value}{record.unit}</span>
                                        {linkedTasks.map((task) => <button key={task.id} type="button" onClick={() => onOpenTask?.(task.id)} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${task.status === 'completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}><Link2 className="h-2.5 w-2.5" /> {task.title}</button>)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            <button type="button" onClick={() => openCreateKeyResult(goal)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:hover:bg-indigo-500/10"><Plus className="h-3.5 w-3.5" /> {isVietnamese ? 'Thêm kết quả then chốt' : 'Add key result'}</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showGoalModal && (
          <ModalShell title={editingGoal ? (isVietnamese ? 'Chỉnh sửa mục tiêu' : 'Edit goal') : (isVietnamese ? 'Tạo mục tiêu mới' : 'Create goal')} subtitle={isVietnamese ? 'Xác định kết quả, chu kỳ và người chịu trách nhiệm.' : 'Define the outcome, cycle, and accountable owner.'} onClose={closeGoalModal}>
            <form onSubmit={saveGoal} className="space-y-5">
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{isVietnamese ? 'Tên mục tiêu' : 'Objective'}</label>
                <input autoFocus required maxLength={180} value={goalForm.title} onChange={(event) => setGoalForm((current) => ({ ...current, title: event.target.value }))} placeholder={isVietnamese ? 'VD: Trở thành sản phẩm được yêu thích nhất...' : 'e.g. Become the most loved product...'} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{isVietnamese ? 'Mô tả' : 'Description'}</label>
                <textarea rows={3} value={goalForm.description} onChange={(event) => setGoalForm((current) => ({ ...current, description: event.target.value }))} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-medium text-slate-800 outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{isVietnamese ? 'Chu kỳ' : 'Period'}<select value={goalForm.period} onChange={(event) => setGoalForm((current) => ({ ...current, period: event.target.value as GoalPeriod }))} className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold normal-case tracking-normal text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-white"><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option><option value="custom">Custom</option></select></label>
                <label className="space-y-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{isVietnamese ? 'Trạng thái' : 'Status'}<select value={goalForm.status} onChange={(event) => setGoalForm((current) => ({ ...current, status: event.target.value as GoalStatus }))} className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold normal-case tracking-normal text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-white">{(Object.keys(statusMeta) as GoalStatus[]).map((status) => <option key={status} value={status}>{statusMeta[status].label}</option>)}</select></label>
                <label className="space-y-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{isVietnamese ? 'Bắt đầu' : 'Start date'}<input type="date" required value={goalForm.startDate} onChange={(event) => setGoalForm((current) => ({ ...current, startDate: event.target.value }))} className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold normal-case tracking-normal text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-white" /></label>
                <label className="space-y-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{isVietnamese ? 'Hạn hoàn thành' : 'Due date'}<input type="date" min={goalForm.startDate} required value={goalForm.dueDate} onChange={(event) => setGoalForm((current) => ({ ...current, dueDate: event.target.value }))} className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold normal-case tracking-normal text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-white" /></label>
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{isVietnamese ? 'Người phụ trách' : 'Owner'}</label>
                <select value={goalForm.ownerId} onChange={(event) => setGoalForm((current) => ({ ...current, ownerId: event.target.value }))} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-white"><option value="">{isVietnamese ? 'Chưa chỉ định' : 'Unassigned'}</option>{members.map((member) => { const id = resolveAuthUserId(member); return id ? <option key={member.id} value={id}>{member.name}</option> : null; })}</select>
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{isVietnamese ? 'Màu nhận diện' : 'Color'}</label>
                <div className="flex gap-2">{GOAL_COLORS.map((color) => <button key={color} type="button" onClick={() => setGoalForm((current) => ({ ...current, color }))} className={`h-9 w-9 rounded-xl border-4 transition ${goalForm.color === color ? 'scale-110 border-slate-900 dark:border-white' : 'border-transparent'}`} style={{ backgroundColor: color }} />)}</div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-5 dark:border-slate-800"><button type="button" onClick={closeGoalModal} className="h-11 rounded-2xl border border-slate-200 px-5 text-xs font-black text-slate-600 dark:border-slate-800 dark:text-slate-300">{isVietnamese ? 'Hủy' : 'Cancel'}</button><button disabled={isSaving || !goalForm.title.trim() || goalForm.dueDate < goalForm.startDate} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-indigo-600 px-5 text-xs font-black text-white disabled:opacity-50">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{isVietnamese ? 'Lưu mục tiêu' : 'Save goal'}</button></div>
            </form>
          </ModalShell>
        )}

        {activeGoalForKeyResult && (
          <ModalShell title={editingKeyResult ? (isVietnamese ? 'Chỉnh sửa key result' : 'Edit key result') : (isVietnamese ? 'Thêm kết quả then chốt' : 'Add key result')} subtitle={activeGoalForKeyResult.title} onClose={closeKeyResultModal}>
            <form onSubmit={saveKeyResult} className="space-y-5">
              <div><label className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{isVietnamese ? 'Kết quả đo lường được' : 'Measurable result'}</label><input autoFocus required maxLength={180} value={keyResultForm.title} onChange={(event) => setKeyResultForm((current) => ({ ...current, title: event.target.value }))} placeholder={isVietnamese ? 'VD: Đạt 10.000 người dùng hoạt động...' : 'e.g. Reach 10,000 active users...'} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white" /></div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[['startValue', isVietnamese ? 'Bắt đầu' : 'Start'], ['currentValue', isVietnamese ? 'Hiện tại' : 'Current'], ['targetValue', isVietnamese ? 'Mục tiêu' : 'Target']].map(([field, label]) => <label key={field} className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{label}<input type="number" step="any" value={keyResultForm[field as 'startValue' | 'currentValue' | 'targetValue']} onChange={(event) => setKeyResultForm((current) => ({ ...current, [field]: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold normal-case tracking-normal text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-white" /></label>)}
                <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{isVietnamese ? 'Đơn vị' : 'Unit'}<input maxLength={20} value={keyResultForm.unit} onChange={(event) => setKeyResultForm((current) => ({ ...current, unit: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold normal-case tracking-normal text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-white" /></label>
              </div>
              <div><label className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{isVietnamese ? 'Người phụ trách' : 'Owner'}</label><select value={keyResultForm.ownerId} onChange={(event) => setKeyResultForm((current) => ({ ...current, ownerId: event.target.value }))} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-white"><option value="">{isVietnamese ? 'Chưa chỉ định' : 'Unassigned'}</option>{members.map((member) => { const id = resolveAuthUserId(member); return id ? <option key={member.id} value={id}>{member.name}</option> : null; })}</select></div>
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-black text-slate-800 dark:text-white">{isVietnamese ? 'Liên kết công việc' : 'Linked tasks'}</p><p className="mt-0.5 text-[10px] text-slate-400">{isVietnamese ? 'Tiến độ sẽ tự động tính theo task hoàn thành.' : 'Progress will roll up from completed tasks.'}</p></div><span className="rounded-full bg-indigo-50 px-2 py-1 text-[9px] font-black text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">{keyResultForm.linkedTaskIds.length}</span></div>
                <div className="relative mb-2"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={taskPickerQuery} onChange={(event) => setTaskPickerQuery(event.target.value)} placeholder={isVietnamese ? 'Tìm công việc...' : 'Search tasks...'} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white" /></div>
                <div className="custom-scrollbar max-h-44 space-y-1 overflow-y-auto">{visibleTasks.map((task) => { const selected = keyResultForm.linkedTaskIds.includes(task.id); return <button key={task.id} type="button" onClick={() => setKeyResultForm((current) => ({ ...current, linkedTaskIds: selected ? current.linkedTaskIds.filter((id) => id !== task.id) : [...current.linkedTaskIds, task.id] }))} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${selected ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}><span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700'}`}>{selected && <Check className="h-3 w-3" />}</span><span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{task.title}</span><span className="text-[9px] font-black uppercase text-slate-400">{task.status}</span></button>; })}</div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-5 dark:border-slate-800"><button type="button" onClick={closeKeyResultModal} className="h-11 rounded-2xl border border-slate-200 px-5 text-xs font-black text-slate-600 dark:border-slate-800 dark:text-slate-300">{isVietnamese ? 'Hủy' : 'Cancel'}</button><button disabled={isSaving || !keyResultForm.title.trim() || Number(keyResultForm.targetValue) === Number(keyResultForm.startValue)} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-indigo-600 px-5 text-xs font-black text-white disabled:opacity-50">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}{isVietnamese ? 'Lưu key result' : 'Save key result'}</button></div>
            </form>
          </ModalShell>
        )}

        {showTemplates && (
          <ModalShell title={isVietnamese ? 'Mẫu OKR khởi động nhanh' : 'Quick-start OKR templates'} subtitle={isVietnamese ? 'Chọn một khung mục tiêu rồi tùy chỉnh cho đội nhóm.' : 'Choose a starting point and tailor it to your team.'} onClose={() => setShowTemplates(false)}>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { id: 'growth' as const, title: isVietnamese ? 'Tăng trưởng' : 'Growth', desc: isVietnamese ? 'Doanh thu, chuyển đổi và giữ chân.' : 'Revenue, conversion, retention.', color: '#10b981', icon: TrendingUp },
                { id: 'product' as const, title: isVietnamese ? 'Sản phẩm' : 'Product', desc: isVietnamese ? 'Chất lượng và trải nghiệm người dùng.' : 'Quality and user experience.', color: '#6366f1', icon: Sparkles },
                { id: 'operations' as const, title: isVietnamese ? 'Vận hành' : 'Operations', desc: isVietnamese ? 'Quy trình, tốc độ và hiệu suất.' : 'Process, speed, efficiency.', color: '#f59e0b', icon: Gauge },
              ].map((template) => <button key={template.id} type="button" onClick={() => applyTemplate(template.id)} className="rounded-[22px] border border-slate-200 p-5 text-left transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg dark:border-slate-800 dark:hover:border-indigo-500/40"><span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ backgroundColor: template.color }}><template.icon className="h-5 w-5" /></span><h3 className="text-sm font-black text-slate-900 dark:text-white">{template.title}</h3><p className="mt-2 text-[11px] leading-relaxed text-slate-500">{template.desc}</p></button>)}
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
}
