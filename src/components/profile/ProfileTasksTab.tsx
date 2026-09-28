"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FolderKanban, Search, X, Check, Clock, Calendar, 
  ChevronRight, CheckCircle2, AlertTriangle, PieChart as PieChartIcon
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Task } from '../../types';

interface ProfileTasksTabProps {
  myTasks: Task[];
  filteredMyTasks: Task[];
  taskFilterStatus: 'all' | 'inprogress' | 'todo' | 'review' | 'completed';
  setTaskFilterStatus: (val: 'all' | 'inprogress' | 'todo' | 'review' | 'completed') => void;
  taskSearchQuery: string;
  setTaskSearchQuery: (val: string) => void;
  onSelectTask?: (task: Task) => void;
  locale: string;
  todoTasksCount: number;
  inProgressTasksCount: number;
  reviewTasksCount: number;
  completedTasksCount: number;
}

export const ProfileTasksTab: React.FC<ProfileTasksTabProps> = ({
  myTasks,
  filteredMyTasks,
  taskFilterStatus,
  setTaskFilterStatus,
  taskSearchQuery,
  setTaskSearchQuery,
  onSelectTask,
  locale,
  todoTasksCount,
  inProgressTasksCount,
  reviewTasksCount,
  completedTasksCount,
}) => {
  const overdueTasksCount = useMemo(() => {
    const now = Date.now();
    return myTasks.filter((t) => t.dueDate && t.status !== 'completed' && new Date(t.dueDate).getTime() < now).length;
  }, [myTasks]);

  const chartData = useMemo(() => [
    { name: locale === 'vi' ? 'Cần làm' : 'To Do', value: todoTasksCount, color: '#6366f1' },
    { name: locale === 'vi' ? 'Đang làm' : 'In Progress', value: inProgressTasksCount, color: '#f59e0b' },
    { name: locale === 'vi' ? 'Đang duyệt' : 'Review', value: reviewTasksCount, color: '#a855f7' },
    { name: locale === 'vi' ? 'Đã xong' : 'Completed', value: completedTasksCount, color: '#10b981' },
  ].filter((d) => d.value > 0), [todoTasksCount, inProgressTasksCount, reviewTasksCount, completedTasksCount, locale]);

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-8 rounded-[32px] shadow-sm text-left space-y-6 animate-fade-in">
      
      {/* ── Top Header & Chart Pulse Banner ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {locale === 'vi' ? 'Nhiệm vụ được giao của bạn' : 'Your Assigned Tasks'}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {locale === 'vi'
                ? `Đang quản lý ${myTasks.length} nhiệm vụ trên các dự án và workspace`
                : `Managing ${myTasks.length} assigned tasks across all projects`}
            </p>
          </div>
        </div>

        {/* Mini Recharts Donut & Overdue Indicator */}
        <div className="flex items-center gap-4 self-center lg:self-auto">
          {overdueTasksCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-500 animate-bounce" />
              <span>{overdueTasksCount} {locale === 'vi' ? 'task quá hạn' : 'overdue tasks'}</span>
            </div>
          )}

          {chartData.length > 0 && (
            <div className="w-24 h-16 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={18}
                    outerRadius={28}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Search & Filter Pill Capsules ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative min-w-[240px] flex-1 sm:flex-initial">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={taskSearchQuery}
            onChange={(e) => setTaskSearchQuery(e.target.value)}
            placeholder={locale === 'vi' ? 'Tìm nhanh nhiệm vụ...' : 'Search tasks...'}
            className="w-full pl-10 pr-8 py-2.5 text-xs font-semibold rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {taskSearchQuery && (
            <button
              type="button"
              onClick={() => setTaskSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Segmented Capsule */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800 overflow-x-auto max-w-full">
          {[
            { id: 'all', labelVi: 'Tất cả', labelEn: 'All', count: myTasks.length },
            { id: 'inprogress', labelVi: 'Đang làm', labelEn: 'In Progress', count: inProgressTasksCount },
            { id: 'todo', labelVi: 'Cần làm', labelEn: 'To Do', count: todoTasksCount },
            { id: 'review', labelVi: 'Đang duyệt', labelEn: 'Review', count: reviewTasksCount },
            { id: 'completed', labelVi: 'Đã xong', labelEn: 'Done', count: completedTasksCount },
          ].map((item) => {
            const isActive = taskFilterStatus === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTaskFilterStatus(item.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-black'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <span>{locale === 'vi' ? item.labelVi : item.labelEn}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isActive
                      ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300'
                      : 'bg-slate-200/60 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Task Cards List ── */}
      <div className="space-y-3">
        {filteredMyTasks.length === 0 ? (
          <div className="p-14 text-center rounded-[24px] bg-slate-50/50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {locale === 'vi' ? 'Không có nhiệm vụ nào phù hợp với bộ lọc' : 'No tasks match the selected filter'}
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              {locale === 'vi'
                ? 'Bạn có thể thử tìm kiếm từ khóa khác hoặc chuyển sang mục xem tất cả nhiệm vụ.'
                : 'Try changing your search query or reset the status filter to see more.'}
            </p>
          </div>
        ) : (
          filteredMyTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const statusMeta = {
              todo: { labelVi: 'Cần làm', labelEn: 'To Do', cls: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
              inprogress: { labelVi: 'Đang làm', labelEn: 'In Progress', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
              review: { labelVi: 'Đang duyệt', labelEn: 'In Review', cls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
              completed: { labelVi: 'Hoàn thành', labelEn: 'Completed', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
            }[task.status] || { labelVi: task.status, labelEn: task.status, cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };

            const priorityMeta = (task.priority
              ? {
                  urgent: { labelVi: 'Khẩn cấp', labelEn: 'Urgent', cls: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20' },
                  high: { labelVi: 'Cao', labelEn: 'High', cls: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20' },
                  medium: { labelVi: 'Trung bình', labelEn: 'Medium', cls: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
                  low: { labelVi: 'Thấp', labelEn: 'Low', cls: 'text-slate-500 dark:text-slate-400 bg-slate-500/10 border-slate-500/20' },
                }[task.priority]
              : null) || { labelVi: 'Thường', labelEn: 'Normal', cls: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };

            const completedSubtasks = task.subtasks?.filter((st) => st.completed).length || 0;
            const totalSubtasks = task.subtasks?.length || 0;
            const isOverdue = task.dueDate && !isCompleted && new Date(task.dueDate).getTime() < Date.now();

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask?.(task)}
                className="p-4 sm:p-4.5 rounded-[22px] bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-950/40 dark:hover:bg-slate-950/80 border border-slate-200/70 hover:border-indigo-400/40 dark:border-slate-800/80 dark:hover:border-indigo-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group shadow-2xs hover:shadow-md"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 group-hover:bg-indigo-500/15 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0">
                    <h4
                      className={`text-xs font-bold truncate transition-colors ${
                        isCompleted
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                      }`}
                    >
                      {task.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-2.5 pt-1 text-[11px] text-slate-400 font-medium">
                      {task.dueDate && (
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            isOverdue
                              ? 'text-rose-500 dark:text-rose-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(task.dueDate).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}</span>
                          {isOverdue && (
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-500 font-black">
                              {locale === 'vi' ? 'Quá hạn' : 'Overdue'}
                            </span>
                          )}
                        </span>
                      )}

                      {totalSubtasks > 0 && (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <span>•</span>
                          <span>
                            {completedSubtasks}/{totalSubtasks} {locale === 'vi' ? 'mục phụ' : 'subtasks'}
                          </span>
                        </span>
                      )}

                      {task.hoursEstimate ? (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <span>•</span>
                          <span>{task.hoursEstimate}h {locale === 'vi' ? 'dự kiến' : 'est'}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border tracking-wider ${priorityMeta.cls}`}>
                    {locale === 'vi' ? priorityMeta.labelVi : priorityMeta.labelEn}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${statusMeta.cls}`}>
                    {locale === 'vi' ? statusMeta.labelVi : statusMeta.labelEn}
                  </span>
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
