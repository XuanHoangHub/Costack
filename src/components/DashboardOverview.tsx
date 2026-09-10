"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../contexts/TranslationContext';
import { Task, User, SyncLog, Document } from '../types';
import {
  DashboardHeader,
  DashboardControls,
  DashboardKpis,
  DashboardHealthBar,
  DashboardCharts,
  DashboardFocusQueue,
  DashboardAiReport,
  DashboardActivityFeed,
  DashboardUpcomingAgenda,
  DashboardTeamWorkload,
  DashboardScratchpad,
  DashboardMilestones,
  DashboardQuickTaskModal,
  DashboardScope,
  DashboardRange,
  DashboardChartMode,
  DashboardWidgetKey,
  HealthFilterKey,
  DashboardOverviewProps,
  PeriodInsights
} from './dashboard';

const DEFAULT_DASHBOARD_WIDGETS: Record<DashboardWidgetKey, boolean> = {
  kpis: true,
  health: true,
  focus: true,
  agenda: true,
  workload: true,
  scratchpad: true,
  milestones: true,
  charts: true,
  velocity: true,
  ai: true,
  activity: true,
};

const parseTaskDate = (value?: string, endOfDay = false) => {
  if (!value) return null;
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0
    );
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function DashboardOverview({
  tasks = [],
  members = [],
  docs = [],
  syncLogs = [],
  isOffline = false,
  onNavigate,
  onOpenTask,
  onToggleOffline,
  currentUser,
  onUpgradePremium,
  onAddSyncLog,
  triggerToast,
  isLoading = false,
  isSynced = false,
  workspaceName,
  onClearSyncLogs,
  spaces = [],
  onAddTask,
  onUpdateTask,
}: DashboardOverviewProps) {
  const { locale } = useTranslation();

  // Scope & Filter States
  const [dashboardScope, setDashboardScope] = useState<DashboardScope>('workspace');
  const [dashboardRange, setDashboardRange] = useState<DashboardRange>(30);
  const [chartMode, setChartMode] = useState<DashboardChartMode>('area');
  const [activeHealthFilter, setActiveHealthFilter] = useState<HealthFilterKey>('none');
  const [visibleWidgets, setVisibleWidgets] = useState<Record<DashboardWidgetKey, boolean>>(DEFAULT_DASHBOARD_WIDGETS);
  const [showQuickTaskModal, setShowQuickTaskModal] = useState(false);
  const [selectedWorkloadMemberId, setSelectedWorkloadMemberId] = useState<string | null>(null);

  // Restore Preferences from localStorage
  useEffect(() => {
    try {
      const savedScope = localStorage.getItem('apexa_dashboard_scope');
      if (savedScope === 'workspace' || savedScope === 'mine') {
        setDashboardScope(savedScope);
      }
      const savedPrefs = localStorage.getItem('apexa_dashboard_preferences');
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        if ([7, 30, 90].includes(parsed.range)) setDashboardRange(parsed.range);
        if (parsed.chartMode === 'area' || parsed.chartMode === 'bar') setChartMode(parsed.chartMode);
        if (parsed.widgets) {
          setVisibleWidgets({ ...DEFAULT_DASHBOARD_WIDGETS, ...parsed.widgets });
        }
      }
    } catch (e) {}
  }, []);

  // Save Preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        'apexa_dashboard_preferences',
        JSON.stringify({
          range: dashboardRange,
          chartMode,
          widgets: visibleWidgets,
        })
      );
    } catch (e) {}
  }, [dashboardRange, chartMode, visibleWidgets]);

  // Current User Task Assignment Helper
  const currentUserIds = useMemo(() => {
    return new Set([currentUser?.id, currentUser?.userId].filter(Boolean) as string[]);
  }, [currentUser?.id, currentUser?.userId]);

  const isAssignedToCurrentUser = useCallback(
    (task: Task) => {
      if (currentUserIds.size === 0) return false;
      if (task.assigneeId && currentUserIds.has(task.assigneeId)) return true;
      return task.assigneeIds?.some((id) => currentUserIds.has(id)) || false;
    },
    [currentUserIds]
  );

  const personalTaskCount = useMemo(
    () => tasks.filter(isAssignedToCurrentUser).length,
    [isAssignedToCurrentUser, tasks]
  );

  const baseScopedTasks = useMemo(
    () => (dashboardScope === 'mine' ? tasks.filter(isAssignedToCurrentUser) : tasks),
    [dashboardScope, isAssignedToCurrentUser, tasks]
  );

  const scopedTasks = useMemo(() => {
    if (!selectedWorkloadMemberId) return baseScopedTasks;
    return baseScopedTasks.filter(
      (t) => t.assigneeId === selectedWorkloadMemberId || t.assigneeIds?.includes(selectedWorkloadMemberId)
    );
  }, [baseScopedTasks, selectedWorkloadMemberId]);

  const handleScopeChange = (scope: DashboardScope) => {
    setDashboardScope(scope);
    try {
      localStorage.setItem('apexa_dashboard_scope', scope);
    } catch (e) {}
  };

  const handleRangeChange = (range: DashboardRange) => {
    if (range === 90 && !currentUser?.isPremium) {
      onUpgradePremium?.();
      return;
    }
    setDashboardRange(range);
  };

  const toggleWidget = (widget: DashboardWidgetKey) => {
    setVisibleWidgets((prev) => ({ ...prev, [widget]: !prev[widget] }));
  };

  const resetDashboardPreferences = () => {
    setDashboardRange(30);
    setChartMode('area');
    setVisibleWidgets(DEFAULT_DASHBOARD_WIDGETS);
    triggerToast?.(
      'success',
      locale === 'vi' ? 'Đã đặt lại Dashboard' : 'Dashboard Reset',
      locale === 'vi' ? 'Bố cục và bộ lọc đã trở về mặc định.' : 'Layout and filters restored to defaults.'
    );
  };

  // Export CSV
  const exportDashboardCsv = () => {
    const headers = [
      'ID',
      'Title',
      'Status',
      'Priority',
      'Assignee',
      'Start Date',
      'Due Date',
      'Estimated Hours',
      'Logged Hours',
    ];
    const memberMap = new Map(members.map((m) => [m.id, m.name]));
    const escapeCell = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = scopedTasks.map((t) => [
      t.id,
      t.title,
      t.status,
      t.priority,
      memberMap.get(t.assigneeId || '') || '',
      t.startDate || '',
      t.dueDate || '',
      t.hoursEstimate || 0,
      t.hoursLogged || 0,
    ]);

    const csv = `\uFEFF${[headers, ...rows].map((r) => r.map(escapeCell).join(',')).join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `apexa-dashboard-${getLocalDateKey(new Date())}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);

    triggerToast?.(
      'success',
      locale === 'vi' ? 'Đã xuất dữ liệu' : 'Export Complete',
      locale === 'vi' ? `${scopedTasks.length} công việc đã xuất sang CSV.` : `${scopedTasks.length} tasks exported to CSV.`
    );
  };

  // Core Metrics
  const metrics = useMemo(() => {
    const completed = scopedTasks.filter((t) => t.status === 'completed').length;
    const inProgress = scopedTasks.filter((t) => t.status === 'inprogress').length;
    const review = scopedTasks.filter((t) => t.status === 'review').length;
    const todo = scopedTasks.filter((t) => t.status === 'todo').length;
    const totalEstimated = scopedTasks.reduce((sum, t) => sum + Number(t.hoursEstimate || 0), 0);
    const totalLogged = scopedTasks.reduce((sum, t) => sum + Number(t.hoursLogged || 0), 0);

    const workspaceMemberIds = new Set(members.map((m) => m.id));
    const assignedMemberIds = new Set<string>();

    scopedTasks.forEach((t) => {
      if (t.assigneeId && workspaceMemberIds.has(t.assigneeId)) assignedMemberIds.add(t.assigneeId);
      t.assigneeIds?.forEach((id) => {
        if (workspaceMemberIds.has(id)) assignedMemberIds.add(id);
      });
    });

    return {
      total: scopedTasks.length,
      completed,
      inProgress,
      review,
      todo,
      totalEstimated,
      totalLogged,
      assignedMemberCount: assignedMemberIds.size,
    };
  }, [members, scopedTasks]);

  const completionPercentage = metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0;
  const onlineMembersCount = useMemo(() => {
    return members.filter((m) => m.status === 'online' || m.customStatus === 'online').length;
  }, [members]);

  // Period Insights (Health & Deltas)
  const periodInsights = useMemo<PeriodInsights>(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - (dashboardRange - 1));
    start.setHours(0, 0, 0, 0);

    const prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevEnd.getDate() - (dashboardRange - 1));
    prevStart.setHours(0, 0, 0, 0);

    let currentCreated = 0;
    let currentCompleted = 0;
    let previousCompleted = 0;
    let totalCycleTimeDays = 0;
    let completedWithCycleCount = 0;

    const nowTime = Date.now();
    const dueSoonThreshold = nowTime + 7 * 24 * 60 * 60 * 1000;

    let atRisk = 0;
    let dueSoon = 0;
    let unassigned = 0;
    let noDueDate = 0;

    scopedTasks.forEach((t) => {
      const createdAt = parseTaskDate(t.createdAt);
      const completedAt = parseTaskDate(t.completedAt);
      const dueDate = parseTaskDate(t.dueDate, true);

      if (createdAt && createdAt >= start && createdAt <= end) currentCreated++;
      if (completedAt && completedAt >= start && completedAt <= end) currentCompleted++;
      if (completedAt && completedAt >= prevStart && completedAt <= prevEnd) previousCompleted++;

      if (completedAt && createdAt) {
        const cycleDays = Math.max(0, (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        totalCycleTimeDays += cycleDays;
        completedWithCycleCount++;
      }

      if (t.status !== 'completed') {
        const isOverdue = Boolean(dueDate && dueDate.getTime() < nowTime);
        if (isOverdue || t.priority === 'urgent') atRisk++;
        if (dueDate && dueDate.getTime() >= nowTime && dueDate.getTime() <= dueSoonThreshold) dueSoon++;
        if (!t.assigneeId && (!t.assigneeIds || t.assigneeIds.length === 0)) unassigned++;
        if (!t.dueDate) noDueDate++;
      }
    });

    const completionDelta = previousCompleted > 0
      ? Math.round(((currentCompleted - previousCompleted) / previousCompleted) * 100)
      : currentCompleted > 0 ? 100 : 0;

    const averageCycleDays = completedWithCycleCount > 0
      ? Number((totalCycleTimeDays / completedWithCycleCount).toFixed(1))
      : 0;

    return {
      currentCreated,
      currentCompleted,
      previousCompleted,
      completionDelta,
      atRisk,
      dueSoon,
      unassigned,
      noDueDate,
      averageCycleDays,
    };
  }, [dashboardRange, scopedTasks]);

  // Chart Data Calculations
  const weeklyData = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    return Array.from({ length: dashboardRange }, (_, index) => {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - (dashboardRange - 1 - index));
      const dateKey = getLocalDateKey(targetDate);

      return {
        name: targetDate.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
          day: '2-digit',
          month: dashboardRange === 7 ? undefined : '2-digit',
          weekday: dashboardRange === 7 ? 'short' : undefined,
        }),
        fullDate: targetDate.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        created: scopedTasks.filter((t) => {
          const c = parseTaskDate(t.createdAt);
          return c ? getLocalDateKey(c) === dateKey : false;
        }).length,
        completed: scopedTasks.filter((t) => {
          if (t.status !== 'completed' || !t.completedAt) return false;
          const c = parseTaskDate(t.completedAt);
          return c ? getLocalDateKey(c) === dateKey : false;
        }).length,
      };
    });
  }, [dashboardRange, locale, scopedTasks]);

  const velocityData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: dashboardRange }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (dashboardRange - 1 - index));
      const dateKey = getLocalDateKey(date);
      return {
        date: `${date.getDate()}/${date.getMonth() + 1}`,
        completed: scopedTasks.filter((t) => {
          if (t.status !== 'completed' || !t.completedAt) return false;
          const c = parseTaskDate(t.completedAt);
          return c ? getLocalDateKey(c) === dateKey : false;
        }).length,
      };
    });
  }, [dashboardRange, scopedTasks]);

  const memberEffortData = useMemo(() => {
    return members
      .map((member) => {
        const memberTasks = scopedTasks.filter(
          (t) => t.assigneeId === member.id || t.assigneeIds?.includes(member.id)
        );
        return {
          name: member.name.split(' ')[0],
          estimated: memberTasks.reduce((sum, t) => sum + Number(t.hoursEstimate || 0), 0),
          logged: memberTasks.reduce((sum, t) => sum + Number(t.hoursLogged || 0), 0),
        };
      })
      .filter((item) => item.estimated > 0 || item.logged > 0);
  }, [members, scopedTasks]);

  const statusData = useMemo(() => {
    return [
      { name: locale === 'vi' ? 'Cần làm' : 'To Do', value: metrics.todo, color: '#6366f1' },
      { name: locale === 'vi' ? 'Đang làm' : 'In Progress', value: metrics.inProgress, color: '#f59e0b' },
      { name: locale === 'vi' ? 'Đang duyệt' : 'In Review', value: metrics.review, color: '#a855f7' },
      { name: locale === 'vi' ? 'Đã xong' : 'Completed', value: metrics.completed, color: '#10b981' },
    ].filter((item) => item.value > 0);
  }, [locale, metrics]);

  // Loading Skeleton
  if (isLoading && !isOffline) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-[1800px] flex-col space-y-6 p-4 sm:p-6 lg:p-8 animate-pulse">
        <div className="h-44 rounded-3xl bg-slate-100 dark:bg-slate-900" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-900" />
          ))}
        </div>
        <div className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-900" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="h-80 rounded-3xl bg-slate-100 dark:bg-slate-900 lg:col-span-8" />
          <div className="h-80 rounded-3xl bg-slate-100 dark:bg-slate-900 lg:col-span-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="apexa-dashboard mx-auto flex min-h-full w-full max-w-[1800px] select-none flex-col space-y-4 sm:space-y-6 lg:space-y-7 overflow-x-hidden bg-transparent px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8 text-slate-800 dark:text-slate-100">
      
      {/* 1. Header & Hero */}
      <DashboardHeader
        currentUser={currentUser}
        workspaceName={workspaceName}
        dashboardScope={dashboardScope}
        onScopeChange={handleScopeChange}
        personalTaskCount={personalTaskCount}
        totalTaskCount={tasks.length}
        isOffline={isOffline}
        isSynced={isSynced}
        onNavigate={onNavigate}
        onOpenAiReport={() => {
          const el = document.getElementById('dashboard-ai-report-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 2. Controls & Preferences Bar */}
      <DashboardControls
        range={dashboardRange}
        onRangeChange={handleRangeChange}
        chartMode={chartMode}
        onChartModeChange={setChartMode}
        periodInsights={periodInsights}
        isPremium={currentUser?.isPremium}
        onUpgradePremium={onUpgradePremium}
        onExportCsv={exportDashboardCsv}
        visibleWidgets={visibleWidgets}
        onToggleWidget={toggleWidget}
        onResetPreferences={resetDashboardPreferences}
        onOpenQuickTask={() => setShowQuickTaskModal(true)}
      />

      {/* 3. 4 Core KPI Cards */}
      {visibleWidgets.kpis && (
        <DashboardKpis
          totalTasks={metrics.total}
          completedTasks={metrics.completed}
          inProgressTasks={metrics.inProgress}
          reviewTasks={metrics.review}
          totalLoggedHours={metrics.totalLogged}
          totalEstimatedHours={metrics.totalEstimated}
          docsCount={docs.length}
          membersCount={members.length}
          onlineMembersCount={onlineMembersCount}
          completionPercentage={completionPercentage}
        />
      )}

      {/* 4. Task Health Strip */}
      {visibleWidgets.health && metrics.total > 0 && (
        <DashboardHealthBar
          periodInsights={periodInsights}
          activeHealthFilter={activeHealthFilter}
          onSelectHealthFilter={setActiveHealthFilter}
        />
      )}

      {/* 5. Priority Focus Queue */}
      {visibleWidgets.focus && (
        <DashboardFocusQueue
          tasks={scopedTasks}
          members={members}
          onOpenTask={onOpenTask}
          onNavigate={onNavigate}
          activeHealthFilter={activeHealthFilter}
          onClearHealthFilter={() => setActiveHealthFilter('none')}
        />
      )}

      {/* 6. Upcoming Agenda & Deadlines */}
      {visibleWidgets.agenda && (
        <DashboardUpcomingAgenda
          tasks={scopedTasks}
          members={members}
          onOpenTask={onOpenTask}
          onUpdateTask={onUpdateTask}
          onNavigate={onNavigate}
        />
      )}

      {/* 7. Space & Milestones Progress */}
      {visibleWidgets.milestones && spaces && spaces.length > 0 && (
        <DashboardMilestones
          tasks={baseScopedTasks}
          spaces={spaces}
          onNavigate={onNavigate}
        />
      )}

      {/* 8. Performance Trends, Status Donut & Velocity */}
      {visibleWidgets.charts && metrics.total > 0 && (
        <DashboardCharts
          weeklyData={weeklyData}
          velocityData={velocityData}
          memberEffortData={memberEffortData}
          statusData={statusData}
          dashboardRange={dashboardRange}
          chartMode={chartMode}
          totalTasks={metrics.total}
          completionPercentage={completionPercentage}
          isPremium={currentUser?.isPremium}
          onUpgradePremium={onUpgradePremium}
          showVelocity={visibleWidgets.velocity}
        />
      )}

      {/* 9. Team Workload & Capacity Matrix */}
      {visibleWidgets.workload && members && members.length > 0 && (
        <DashboardTeamWorkload
          tasks={baseScopedTasks}
          members={members}
          onOpenTask={onOpenTask}
          onNavigate={onNavigate}
          selectedMemberId={selectedWorkloadMemberId}
          onSelectMember={setSelectedWorkloadMemberId}
        />
      )}

      {/* 10. Personal Scratchpad & Sticky Notes */}
      {visibleWidgets.scratchpad && (
        <DashboardScratchpad
          onAddTask={onAddTask}
          triggerToast={triggerToast}
        />
      )}

      {/* 11. AI Smart Productivity Report */}
      {visibleWidgets.ai && metrics.total > 0 && (
        <div id="dashboard-ai-report-section">
          <DashboardAiReport
            tasks={scopedTasks}
            members={members}
            isPremium={currentUser?.isPremium}
            onUpgradePremium={onUpgradePremium}
            onAddSyncLog={onAddSyncLog}
            triggerToast={triggerToast}
            completedTasks={metrics.completed}
            totalTasks={metrics.total}
            totalLoggedHours={metrics.totalLogged}
            totalEstimatedHours={metrics.totalEstimated}
            assignedMemberCount={metrics.assignedMemberCount}
          />
        </div>
      )}

      {/* 12. Recent Activity Feed */}
      {visibleWidgets.activity && (
        <DashboardActivityFeed
          syncLogs={syncLogs}
          onClearSyncLogs={onClearSyncLogs}
        />
      )}

      {/* 13. Quick Task Creation Modal */}
      <DashboardQuickTaskModal
        isOpen={showQuickTaskModal}
        onClose={() => setShowQuickTaskModal(false)}
        onAddTask={onAddTask}
        members={members}
        spaces={spaces}
        triggerToast={triggerToast}
      />

    </div>
  );
}

const MemoizedDashboardOverview = React.memo(DashboardOverview);
export default MemoizedDashboardOverview;
export { DashboardOverview };
