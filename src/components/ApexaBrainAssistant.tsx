"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Brain, Bot, Send, X, CheckSquare, Square,
  TrendingUp, AlertTriangle, Users, ArrowRight, Check, Play, HelpCircle, Loader2,
  Mic, MicOff, Globe, Volume2, VolumeX, Copy, RotateCcw, ChevronDown, Calendar,
  Flame, Trash2, Plus, Search, Clock, Sparkle, ExternalLink, Maximize2, Minimize2,
  Command, Terminal, RefreshCw, PanelRight, FileText, CheckCircle2, ChevronRight,
  Layers, ArrowUpRight, Zap
} from 'lucide-react';
import { Task, Document, User, Priority } from '../types';
import { callAiApi, callAiStreamApi, isAiAccessError } from '@/lib/aiClient';
import { useTranslation } from '../contexts/TranslationContext';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { ApexaAiIcon, ApexaAiAvatar } from './ApexaAiIcon';
import { isApexaSuperAdmin } from '@/lib/admin/constants';

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isFallback?: boolean;
  followUps?: string[];
}

export interface AiModelOption {
  id: string;
  name: string;
  tag: string;
  desc: string;
  isDefault?: boolean;
}

export const AI_MODELS: AiModelOption[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tag: 'Khuyên dùng', desc: 'Mới nhất, thông minh & phản hồi cực nhanh', isDefault: true },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tag: 'Lập luận cao', desc: 'Phân tích sâu, lập kế hoạch dự án phức tạp' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', tag: 'Siêu tốc', desc: 'Phản hồi tức thì, tối ưu độ trễ' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', tag: 'Đa năng', desc: 'Phiên bản tin cậy và đa năng' },
];

export const QUICK_PROMPTS = [
  {
    id: 'daily-brief',
    icon: Calendar,
    color: 'amber',
    iconBg: 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/20',
    title: 'Bản tin công việc hôm nay',
    titleEn: "Today's Briefing",
    desc: 'Việc quá hạn, việc cần làm ngay hôm nay',
    descEn: 'Overdue & due today priorities',
    query: 'Kiểm tra công việc hôm nay: việc nào quá hạn, đến hạn hôm nay hoặc ngày mai? Hãy chọn tối đa 3 việc tôi cần tập trung trước và giải thích ngắn gọn.'
  },
  {
    id: 'progress-summary',
    icon: TrendingUp,
    color: 'indigo',
    iconBg: 'bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-500/20',
    title: 'Tóm tắt tiến độ công việc',
    titleEn: 'Progress Summary',
    desc: 'Tỷ lệ hoàn thành & tiến trình dự án',
    descEn: 'Completion rate & blockers',
    query: 'Phân tích và tóm tắt tiến độ hiện tại. Có bao nhiêu công việc đang thực hiện, quá hạn và đã hoàn thành?'
  },
  {
    id: 'urgent-tasks',
    icon: Flame,
    color: 'rose',
    iconBg: 'bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400 border-rose-500/20',
    title: 'Công việc khẩn cấp & rủi ro',
    titleEn: 'Urgent Tasks',
    desc: 'Lọc các việc ưu tiên cao/urgent',
    descEn: 'High & urgent priority tasks',
    query: 'Những công việc nào có độ ưu tiên khẩn cấp (urgent) hoặc cao (high)? Có những điểm nghẽn hoặc rủi ro nào cần giải quyết trước?'
  },
  {
    id: 'resource-allocation',
    icon: Users,
    color: 'emerald',
    iconBg: 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20',
    title: 'Phân bổ nguồn lực nhóm',
    titleEn: 'Resource Allocation',
    desc: 'Xem ai đang nhận nhiều việc nhất',
    descEn: 'Team workload distribution',
    query: 'Tóm tắt phân bổ công việc cho từng thành viên trong nhóm. Ai đang được giao nhiều việc nhất và có ai đang bị quá tải không?'
  }
];

export const SLASH_COMMANDS = [
  { cmd: '/briefing', title: 'Bản tin đầu ngày', desc: 'Tóm tắt việc quá hạn & cần làm hôm nay', query: 'Kiểm tra công việc hôm nay: việc nào quá hạn, đến hạn hôm nay hoặc ngày mai? Hãy chọn tối đa 3 việc tôi cần tập trung trước.' },
  { cmd: '/urgent', title: 'Quét việc khẩn cấp', desc: 'Lọc các task priority urgent / high và rủi ro', query: 'Liệt kê tất cả công việc khẩn cấp (urgent) hoặc ưu tiên cao (high), phân tích rủi ro và thứ tự nên giải quyết.' },
  { cmd: '/plan', title: 'Lập kế hoạch dự án', desc: 'Phân rã mục tiêu lớn thành các công việc cụ thể', query: 'Hãy giúp tôi lập kế hoạch phân rã công việc cho mục tiêu: ' },
  { cmd: '/subtasks', title: 'Sinh việc con & checklist', desc: 'Gợi ý checklist chi tiết cho công việc', query: 'Hãy đề xuất danh sách các bước thực hiện chi tiết (subtasks) cho công việc: ' },
  { cmd: '/team', title: 'Phân bổ nhân sự', desc: 'Kiểm tra khối lượng công việc từng thành viên', query: 'Phân tích phân bổ công việc hiện tại của các thành viên trong đội ngũ. Ai đang làm nhiều việc nhất?' },
  { cmd: '/report', title: 'Báo cáo tổng quan dự án', desc: 'Xuất báo cáo tiến độ và KPI dự án hoàn chỉnh', query: 'Hãy xuất một báo cáo tổng quan dự án hoàn chỉnh kèm chỉ số tiến độ, các rủi ro chính và đề xuất các bước tiếp theo.' },
  { cmd: '/reschedule', title: 'Rà soát hạn chót', desc: 'Đề xuất dời lịch cho các task quá hạn', query: 'Rà soát các công việc đang quá hạn hoặc có nguy cơ trễ hạn và đề xuất phương án dời lịch (reschedule) hợp lý.' },
  { cmd: '/clear', title: 'Làm mới hội thoại', desc: 'Xóa toàn bộ lịch sử và bắt đầu phiên mới', action: 'clear' },
];

interface ApexaBrainAssistantProps {
  tasks: Task[];
  documents?: Document[];
  members: User[];
  isOffline: boolean;
  onUpdateTask: (updatedTask: Task) => void;
  onAddTask?: (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress' | 'comments'>) => void;
  onDeleteTask?: (taskId: string) => void;
  onAddSyncLog: (action: string) => void;
  triggerToast?: (type: 'assignment' | 'deadline' | 'comment' | 'success' | 'info' | 'message' | 'chat_message', title: string, message: string, options?: any) => void;
}

type TabType = 'query' | 'subtasks' | 'generate-tasks';
type ViewMode = 'drawer' | 'spotlight';

// ==========================================
// ADVANCED MARKDOWN RENDERER COMPONENT
// ==========================================
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 text-slate-100 shadow-sm text-xs font-mono">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400">
        <span className="uppercase font-bold tracking-wider text-sky-400">{lang || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[11px] leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MarkdownTable({ rows }: { rows: string[][] }) {
  if (rows.length === 0) return null;
  const header = rows[0];
  const body = rows.slice(1);

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
            {header.map((col, idx) => (
              <th key={idx} className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {col.trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white/70 dark:bg-slate-900/60">
          {body.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-3 py-2 text-slate-700 dark:text-slate-200 whitespace-nowrap">
                  {cell.trim()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgentActionCard({
  code,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  tasks,
  members,
  triggerToast,
  locale
}: {
  code: string;
  onAddTask?: (task: any) => void;
  onUpdateTask?: (task: any) => void;
  onDeleteTask?: (taskId: string) => void;
  tasks?: Task[];
  members?: User[];
  triggerToast?: (type: any, title: string, message: string, options?: any) => void;
  locale?: string;
}) {
  const [applied, setApplied] = useState(false);
  const isVi = locale === 'vi';

  let actionData: any = null;
  try {
    actionData = JSON.parse(code.trim());
  } catch {
    return <CodeBlock code={code} lang="action" />;
  }

  if (!actionData || typeof actionData !== 'object') {
    return <CodeBlock code={code} lang="action" />;
  }

  // Handle single task creation
  if (actionData.action === 'create_task' || actionData.type === 'create_task') {
    const title = actionData.title || (isVi ? 'Công việc mới từ AI Agent' : 'New Task from AI Agent');
    const priority = actionData.priority || 'medium';
    const dueDate = actionData.dueDate;
    const subtasks = Array.isArray(actionData.subtasks) ? actionData.subtasks : [];

    const handleExecute = () => {
      if (!onAddTask) return;
      onAddTask({
        title,
        description: actionData.description || '',
        priority: priority as Priority,
        status: 'todo',
        dueDate,
        subtasks: subtasks.map((st: string, idx: number) => ({
          id: `st-${Date.now()}-${idx}`,
          title: st,
          completed: false
        }))
      });
      setApplied(true);
      triggerToast?.('success', isVi ? 'Đã tạo công việc' : 'Task Created', title);
    };

    return (
      <div className="my-3 p-3.5 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs shadow-xs">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-sky-300 tracking-wider">
              {isVi ? 'Costack AI Agent · Đề xuất hành động' : 'Costack AI Agent · Proposed Action'}
            </span>
          </div>
          {applied ? (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3 stroke-[3]" />
              {isVi ? 'Đã thực thi' : 'Executed'}
            </span>
          ) : (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-sky-300">
              {isVi ? 'Sẵn sàng' : 'Ready'}
            </span>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{title}</h4>
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {priority}
            </span>
          </div>
          {dueDate && (
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{isVi ? `Hạn chót: ${dueDate}` : `Due: ${dueDate}`}</span>
            </div>
          )}
          {subtasks.length > 0 && (
            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{isVi ? `Gồm ${subtasks.length} việc phụ:` : `Includes ${subtasks.length} subtasks:`}</span>
              <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                {subtasks.slice(0, 3).map((st: string, idx: number) => (
                  <li key={idx} className="truncate">{st}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-0.5">
          <button
            type="button"
            disabled={applied || !onAddTask}
            onClick={handleExecute}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
              applied
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
            }`}
          >
            {applied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Zap className="w-3.5 h-3.5" />}
            <span>{applied ? (isVi ? 'Đã tạo công việc' : 'Task Created') : (isVi ? 'Tạo công việc ngay' : 'Create Task Now')}</span>
          </button>
        </div>
      </div>
    );
  }

  // Handle batch task creation
  if ((actionData.action === 'create_multiple_tasks' || actionData.type === 'create_multiple_tasks') && Array.isArray(actionData.tasks)) {
    const taskList = actionData.tasks;
    const handleExecuteAll = () => {
      if (!onAddTask) return;
      taskList.forEach((t: any) => {
        onAddTask({
          title: t.title || 'Công việc từ AI Agent',
          description: t.description || '',
          priority: (t.priority || 'medium') as Priority,
          status: 'todo',
          dueDate: t.dueDate,
          subtasks: Array.isArray(t.subtasks) ? t.subtasks.map((st: string, idx: number) => ({
            id: `st-${Date.now()}-${idx}`,
            title: st,
            completed: false
          })) : []
        });
      });
      setApplied(true);
      triggerToast?.('success', isVi ? 'Đã tạo nhiều việc' : 'Batch Created', isVi ? `Đã tạo ${taskList.length} công việc.` : `Created ${taskList.length} tasks.`);
    };

    return (
      <div className="my-3 p-3.5 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs shadow-xs">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-sky-300 tracking-wider">
              {isVi ? `Costack AI Agent · Lập kế hoạch (${taskList.length} công việc)` : `Costack AI Agent · Batch Plan (${taskList.length} tasks)`}
            </span>
          </div>
          {applied && (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3 stroke-[3]" />
              {isVi ? 'Đã tạo tất cả' : 'Created all'}
            </span>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
          {taskList.map((t: any, idx: number) => (
            <div key={idx} className="py-1.5 flex items-center justify-between text-xs gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate flex-1">{idx + 1}. {t.title}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {t.dueDate && <span className="text-[9px] text-slate-400 font-mono">{t.dueDate}</span>}
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {t.priority || 'medium'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 pt-0.5">
          <button
            type="button"
            disabled={applied || !onAddTask}
            onClick={handleExecuteAll}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
              applied
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
            }`}
          >
            {applied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Zap className="w-3.5 h-3.5" />}
            <span>{applied ? (isVi ? 'Đã tạo thành công' : 'Tasks Created') : (isVi ? `Tạo tất cả ${taskList.length} việc` : `Create all ${taskList.length} tasks`)}</span>
          </button>
        </div>
      </div>
    );
  }

  // Handle task update (status, priority, dueDate, progress)
  if ((actionData.action === 'update_task' || actionData.type === 'update_task') && tasks) {
    const targetTask = tasks.find(t => t.id === actionData.taskId || t.title.toLowerCase().includes(String(actionData.taskId || actionData.title || actionData.taskTitle || '').toLowerCase()));
    const newStatus = actionData.status;
    const newPriority = actionData.priority;
    const newDueDate = actionData.dueDate;

    const handleUpdate = () => {
      if (!targetTask || !onUpdateTask) return;
      onUpdateTask({
        ...targetTask,
        ...(newStatus ? { status: newStatus } : {}),
        ...(newPriority ? { priority: newPriority as Priority } : {}),
        ...(newDueDate ? { dueDate: newDueDate } : {}),
        ...(actionData.progress !== undefined ? { progress: Number(actionData.progress) } : {}),
      });
      setApplied(true);
      triggerToast?.('success', isVi ? 'Đã cập nhật công việc' : 'Task Updated', targetTask.title);
    };

    return (
      <div className="my-3 p-3.5 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs shadow-xs">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-sky-300 tracking-wider">
              {isVi ? 'Costack AI Agent · Cập nhật công việc' : 'Costack AI Agent · Update Task'}
            </span>
          </div>
          {applied && (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3 stroke-[3]" />
              {isVi ? 'Đã cập nhật' : 'Updated'}
            </span>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
          <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
            {targetTask ? targetTask.title : (actionData.title || actionData.taskTitle || actionData.taskId)}
          </h4>
          <div className="text-[11px] text-slate-500 space-y-0.5">
            {newStatus && (
              <div>
                {isVi ? 'Trạng thái: ' : 'Status: '}
                <strong className="text-indigo-600 dark:text-sky-400 uppercase">{newStatus}</strong>
              </div>
            )}
            {newPriority && (
              <div>
                {isVi ? 'Độ ưu tiên: ' : 'Priority: '}
                <strong className="text-amber-600 dark:text-amber-400 uppercase">{newPriority}</strong>
              </div>
            )}
            {newDueDate && (
              <div>
                {isVi ? 'Hạn chót: ' : 'Due date: '}
                <strong className="text-indigo-600 dark:text-sky-400">{newDueDate}</strong>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-0.5">
          <button
            type="button"
            disabled={applied || !targetTask || !onUpdateTask}
            onClick={handleUpdate}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
              applied
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
            }`}
          >
            {applied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Zap className="w-3.5 h-3.5" />}
            <span>{applied ? (isVi ? 'Đã áp dụng' : 'Applied') : (isVi ? 'Cập nhật ngay' : 'Apply Update')}</span>
          </button>
        </div>
      </div>
    );
  }

  // Handle adding subtasks to existing task
  if ((actionData.action === 'add_subtasks' || actionData.type === 'add_subtasks') && tasks) {
    const targetTask = tasks.find(t => t.id === actionData.taskId || t.title.toLowerCase().includes(String(actionData.taskId || actionData.taskTitle || '').toLowerCase()));
    const newSubtasks: string[] = Array.isArray(actionData.subtasks) ? actionData.subtasks : [];

    const handleAddSubtasks = () => {
      if (!targetTask || !onUpdateTask || newSubtasks.length === 0) return;
      const currentSubtasks = targetTask.subtasks || [];
      const created = newSubtasks.map((st: string, idx: number) => ({
        id: `st-${Date.now()}-${idx}`,
        title: st,
        completed: false
      }));
      const updatedList = [...currentSubtasks, ...created];
      const completedCount = updatedList.filter(s => s.completed).length;
      const progress = updatedList.length > 0 ? Math.round((completedCount / updatedList.length) * 100) : targetTask.progress;

      onUpdateTask({
        ...targetTask,
        subtasks: updatedList,
        progress
      });
      setApplied(true);
      triggerToast?.('success', isVi ? 'Đã thêm checklist' : 'Checklist Added', isVi ? `Đã thêm ${newSubtasks.length} mục vào "${targetTask.title}"` : `Added ${newSubtasks.length} items to "${targetTask.title}"`);
    };

    return (
      <div className="my-3 p-3.5 rounded-2xl bg-sky-50/90 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center text-xs shadow-xs">
              <CheckSquare className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black uppercase text-sky-700 dark:text-sky-300 tracking-wider">
              {isVi ? `Costack AI Agent · Thêm ${newSubtasks.length} việc phụ` : `Costack AI Agent · Add ${newSubtasks.length} Subtasks`}
            </span>
          </div>
          {applied && (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3 stroke-[3]" />
              {isVi ? 'Đã thêm checklist' : 'Added to task'}
            </span>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
              {targetTask ? targetTask.title : (actionData.taskTitle || actionData.taskId)}
            </h4>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
              +{newSubtasks.length} {isVi ? 'mục' : 'items'}
            </span>
          </div>
          <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
            {newSubtasks.map((st: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <Square className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{st}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-0.5">
          <button
            type="button"
            disabled={applied || !targetTask || !onUpdateTask || newSubtasks.length === 0}
            onClick={handleAddSubtasks}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
              applied
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-sky-600 hover:bg-sky-700 text-white active:scale-95'
            }`}
          >
            {applied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{applied ? (isVi ? 'Đã thêm việc phụ' : 'Subtasks Added') : (isVi ? 'Thêm checklist vào việc' : 'Add Subtasks to Task')}</span>
          </button>
        </div>
      </div>
    );
  }

  // Handle deleting a task
  if ((actionData.action === 'delete_task' || actionData.type === 'delete_task') && tasks) {
    const targetTask = tasks.find(t => t.id === actionData.taskId || t.title.toLowerCase().includes(String(actionData.taskId || actionData.taskTitle || actionData.title || '').toLowerCase()));

    const handleDelete = () => {
      if (!targetTask || !onDeleteTask) return;
      onDeleteTask(targetTask.id);
      setApplied(true);
      triggerToast?.('info', isVi ? 'Đã xóa công việc' : 'Task Deleted', targetTask.title);
    };

    return (
      <div className="my-3 p-3.5 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs shadow-xs">
              <Trash2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-300 tracking-wider">
              {isVi ? 'Costack AI Agent · Xác nhận xóa công việc' : 'Costack AI Agent · Confirm Task Deletion'}
            </span>
          </div>
          {applied && (
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <Check className="w-3 h-3 stroke-[3]" />
              {isVi ? 'Đã xóa' : 'Deleted'}
            </span>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
          <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
            {targetTask ? targetTask.title : (actionData.taskTitle || actionData.title || actionData.taskId)}
          </h4>
          <p className="text-[11px] text-slate-500">
            {isVi ? 'Công việc này sẽ được gỡ bỏ khỏi dự án.' : 'This task will be removed from workspace.'}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-0.5">
          <button
            type="button"
            disabled={applied || !targetTask || !onDeleteTask}
            onClick={handleDelete}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
              applied
                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                : 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95'
            }`}
          >
            {applied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>{applied ? (isVi ? 'Đã xóa công việc' : 'Task Deleted') : (isVi ? 'Xác nhận xóa' : 'Confirm Delete')}</span>
          </button>
        </div>
      </div>
    );
  }

  // Handle executive project report card
  if (actionData.action === 'project_report' || actionData.type === 'project_report') {
    const title = actionData.title || (isVi ? 'Báo cáo tổng quan dự án' : 'Project Overview Report');
    const summary = actionData.summary || '';
    const metrics = actionData.metrics || {};
    const risks: string[] = Array.isArray(actionData.risks) ? actionData.risks : [];
    const nextSteps: string[] = Array.isArray(actionData.nextSteps) ? actionData.nextSteps : [];

    const handleCopyReport = () => {
      const text = `# ${title}\n\n${summary}\n\n## Chỉ số chính\n- Tỷ lệ hoàn thành: ${metrics.completionRate ?? 0}%\n- Đã hoàn thành: ${metrics.completed ?? 0}/${metrics.totalTasks ?? 0}\n- Quá hạn: ${metrics.overdue ?? 0}\n\n## Rủi ro\n${risks.map((r: string) => `- ${r}`).join('\n')}\n\n## Bước tiếp theo\n${nextSteps.map((s: string) => `- ${s}`).join('\n')}`;
      navigator.clipboard.writeText(text);
      setApplied(true);
      triggerToast?.('success', isVi ? 'Đã sao chép' : 'Copied', isVi ? 'Đã chép nội dung báo cáo vào clipboard' : 'Report copied to clipboard');
    };

    return (
      <div className="my-3 p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-sky-50/80 to-purple-50/90 dark:from-indigo-950/40 dark:via-sky-950/30 dark:to-purple-950/40 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs shadow-xs">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-sky-300 tracking-wider">
              {isVi ? 'Costack AI Agent · Báo cáo điều hành' : 'Costack AI Agent · Executive Report'}
            </span>
          </div>
          {applied && (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3 stroke-[3]" />
              {isVi ? 'Đã lưu clipboard' : 'Copied'}
            </span>
          )}
        </div>

        <div className="bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
          <h4 className="text-xs font-black text-slate-900 dark:text-white">{title}</h4>
          {summary && <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{summary}</p>}

          {/* Metrics bar & badges */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
              <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">{metrics.completionRate ?? 0}%</div>
              <div className="text-[9px] text-slate-500">{isVi ? 'Hoàn thành' : 'Progress'}</div>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
              <div className="text-xs font-black text-blue-600 dark:text-blue-400">{metrics.completed ?? 0}/{metrics.totalTasks ?? 0}</div>
              <div className="text-[9px] text-slate-500">{isVi ? 'Đã xong' : 'Done'}</div>
            </div>
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
              <div className="text-xs font-black text-rose-600 dark:text-rose-400">{metrics.overdue ?? 0}</div>
              <div className="text-[9px] text-slate-500">{isVi ? 'Quá hạn' : 'Overdue'}</div>
            </div>
          </div>

          {/* Risks */}
          {risks.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {isVi ? 'Rủi ro cần chú ý:' : 'Identified Risks:'}
              </span>
              <ul className="list-disc pl-4 text-[10px] text-slate-600 dark:text-slate-300 space-y-0.5">
                {risks.map((r: string, idx: number) => <li key={idx}>{r}</li>)}
              </ul>
            </div>
          )}

          {/* Next Steps */}
          {nextSteps.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-indigo-600 dark:text-sky-400 flex items-center gap-1">
                <ArrowRight className="w-3 h-3" />
                {isVi ? 'Bước ưu tiên tiếp theo:' : 'Recommended Next Steps:'}
              </span>
              <ul className="list-disc pl-4 text-[10px] text-slate-600 dark:text-slate-300 space-y-0.5">
                {nextSteps.map((s: string, idx: number) => <li key={idx}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-0.5">
          <button
            type="button"
            onClick={handleCopyReport}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
              applied
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
            }`}
          >
            {applied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{applied ? (isVi ? 'Đã sao chép' : 'Copied') : (isVi ? 'Sao chép báo cáo' : 'Copy Report')}</span>
          </button>
        </div>
      </div>
    );
  }

  return <CodeBlock code={code} lang="action" />;
}

function RenderRichMarkdown({
  text,
  isStreaming,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  tasks,
  members,
  triggerToast,
  locale
}: {
  text: string;
  isStreaming?: boolean;
  onAddTask?: (task: any) => void;
  onUpdateTask?: (task: any) => void;
  onDeleteTask?: (taskId: string) => void;
  tasks?: Task[];
  members?: User[];
  triggerToast?: (type: any, title: string, message: string, options?: any) => void;
  locale?: string;
}) {
  if (!text) return null;

  // Pre-process fenced code blocks
  const parts: React.ReactNode[] = [];
  const lines = text.split('\n');
  let inCode = false;
  let codeBuffer: string[] = [];
  let codeLang = '';
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = (key: string) => {
    if (tableRows.length > 0) {
      parts.push(<MarkdownTable key={key} rows={tableRows} />);
      tableRows = [];
      inTable = false;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check code blocks
    if (trimmed.startsWith('```')) {
      if (inCode) {
        // End code block
        const langLower = codeLang.toLowerCase();
        const codeText = codeBuffer.join('\n');
        const isActionLang = langLower === 'action' || langLower === 'json:action';
        const isJsonWithAction = (langLower === 'json' || langLower === '') && (codeText.includes('"action"') || codeText.includes('"type"'));

        if (isActionLang || isJsonWithAction) {
          parts.push(
            <AgentActionCard
              key={`action-${index}`}
              code={codeText}
              onAddTask={onAddTask}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              tasks={tasks}
              members={members}
              triggerToast={triggerToast}
              locale={locale}
            />
          );
        } else {
          parts.push(<CodeBlock key={`code-${index}`} code={codeText} lang={codeLang} />);
        }
        codeBuffer = [];
        codeLang = '';
        inCode = false;
      } else {
        // Start code block
        flushTable(`table-before-code-${index}`);
        inCode = true;
        codeLang = trimmed.slice(3).trim();
      }
      return;
    }

    if (inCode) {
      codeBuffer.push(line);
      return;
    }

    // Check table rows
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // Ignore markdown separator row |---|---|
      if (/^\|[-|\s]+\|$/.test(trimmed)) {
        return;
      }
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map(c => c.trim());
      inTable = true;
      tableRows.push(cells);
      return;
    } else if (inTable) {
      flushTable(`table-${index}`);
    }

    // Headings
    if (trimmed.startsWith('###')) {
      parts.push(
        <h4 key={`h4-${index}`} className="text-xs sm:text-sm font-black text-indigo-600 dark:text-sky-400 tracking-tight mt-3 mb-1 flex items-center gap-1.5">
          <Sparkle className="w-3 h-3 text-indigo-500 shrink-0" />
          <span>{trimmed.replace(/^###\s*/, '')}</span>
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('##')) {
      parts.push(
        <h3 key={`h2-${index}`} className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-50 tracking-tight mt-3.5 mb-1.5">
          {trimmed.replace(/^##\s*/, '')}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('#')) {
      parts.push(
        <h2 key={`h1-${index}`} className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight mt-4 mb-2">
          {trimmed.replace(/^#\s*/, '')}
        </h2>
      );
      return;
    }

    // Bullet points
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const cleanLine = trimmed.replace(/^[\s-*]+/, '').trim();
      const boldMatch = cleanLine.match(/^\*\*(.*?)\*\*(.*)/);
      parts.push(
        <div key={`li-${index}`} className="flex gap-2 ml-1 items-start text-xs leading-relaxed">
          <span className="text-sky-500 font-extrabold mt-0.5">•</span>
          <span className="flex-1">
            {boldMatch ? (
              <>
                <strong className="text-slate-900 dark:text-white font-bold">{boldMatch[1]}</strong>
                {renderInlineStyles(boldMatch[2])}
              </>
            ) : (
              renderInlineStyles(cleanLine)
            )}
          </span>
        </div>
      );
      return;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
    if (numMatch) {
      const num = numMatch[1];
      const content = numMatch[2];
      const boldMatch = content.match(/^\*\*(.*?)\*\*(.*)/);
      parts.push(
        <div key={`num-${index}`} className="flex gap-2 ml-0.5 items-start text-xs leading-relaxed">
          <span className="shrink-0 w-4 h-4 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 text-[9px] font-black flex items-center justify-center shadow-3xs mt-0.5 select-none font-sans">
            {num}
          </span>
          <span className="flex-1 pt-0.5">
            {boldMatch ? (
              <>
                <strong className="text-slate-900 dark:text-white font-bold">{boldMatch[1]}</strong>
                {renderInlineStyles(boldMatch[2])}
              </>
            ) : (
              renderInlineStyles(content)
            )}
          </span>
        </div>
      );
      return;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      parts.push(
        <div key={`quote-${index}`} className="border-l-2 border-indigo-500/70 pl-3 py-1.5 my-1.5 text-slate-600 dark:text-slate-350 italic bg-indigo-50/30 dark:bg-indigo-950/20 rounded-r-xl text-xs">
          {renderInlineStyles(trimmed.replace(/^>\s*/, ''))}
        </div>
      );
      return;
    }

    if (trimmed === '') {
      parts.push(<div key={`empty-${index}`} className="h-1.5" />);
      return;
    }

    parts.push(
      <p key={`p-${index}`} className="pl-0.5 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
        {renderInlineStyles(trimmed)}
      </p>
    );
  });

  if (inCode && codeBuffer.length > 0) {
    parts.push(<CodeBlock key="code-final" code={codeBuffer.join('\n')} lang={codeLang} />);
  }
  flushTable('table-final');

  return (
    <div className="space-y-1.5 text-slate-700 dark:text-slate-200 font-sans text-xs leading-relaxed">
      {parts}
      {isStreaming && (
        <span className="inline-block w-1.5 h-3.5 bg-indigo-500 animate-pulse ml-1 align-middle rounded-xs" />
      )}
    </div>
  );
}

// Inline formatting helper for bold, code tags, etc.
function renderInlineStyles(str: string): React.ReactNode {
  if (!str) return '';
  const parts = str.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={i} className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-sky-300 font-mono text-[11px] border border-slate-200 dark:border-slate-700">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i} className="font-bold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ==========================================
// MAIN COMPONENT: COSTACK BRAIN ASSISTANT
// ==========================================
export default function ApexaBrainAssistant({
  tasks,
  documents = [],
  members,
  isOffline,
  onUpdateTask,
  onAddTask,
  onDeleteTask,
  onAddSyncLog,
  triggerToast
}: ApexaBrainAssistantProps) {
  const { locale } = useTranslation();
  const appActiveTab = useUiStore((s) => s.activeTab);
  const setShowPremiumModal = useUiStore((s) => s.setShowPremiumModal);
  const isOpen = useUiStore((s) => s.isAiAssistantOpen);
  const setIsOpen = useUiStore((s) => s.setIsAiAssistantOpen);
  const toggleAiAssistant = useUiStore((s) => s.toggleAiAssistant);
  const isPremium = useAuthStore((s) => Boolean(s.currentUser?.isPremium || (s.currentUser?.id && isApexaSuperAdmin(s.currentUser.id))));

  // Modal view mode & content states
  const [viewMode, setViewMode] = useState<ViewMode>('drawer');
  const [activeTab, setActiveTab] = useState<TabType>('query');
  const [loading, setLoading] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [responseText, setResponseText] = useState<string>('');
  const [isAiFallbackActive, setIsAiFallbackActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Slash command menu popover state
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);

  // Multi-turn chat conversation history with local storage persistence
  const [chatHistory, setChatHistory] = useState<AiChatMessage[]>([]);

  // AI Model selector states
  const [activeModelId, setActiveModelId] = useState<string>('gemini-2.5-flash');
  const [activeModelName, setActiveModelName] = useState('Gemini 2.5 Flash');
  const [showModelMenu, setShowModelMenu] = useState(false);

  // Voice transcription state variables
  const [isListening, setIsListening] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Speech & Web Search configurations
  const [searchWeb, setSearchWeb] = useState(false);
  const [playingSpeech, setPlayingSpeech] = useState(false);
  const utteranceRef = useRef<any>(null);

  // Tab 2 Subtask states
  const [selectedTaskId, setSelectedTaskId] = useState<string>(tasks[0]?.id || '');
  const [suggestedSubtasks, setSuggestedSubtasks] = useState<string[]>([]);
  const [subtasksApplied, setSubtasksApplied] = useState(false);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  // Tab 3 AI Task Generator states
  const [taskPrompt, setTaskPrompt] = useState('');
  const [generatedTasks, setGeneratedTasks] = useState<any[]>([]);
  const [tasksCreated, setTasksCreated] = useState(false);

  // Scroll to bottom of response refs
  const responseEndRef = useRef<HTMLDivElement>(null);

  // Listen to open-costack-ai custom event
  useEffect(() => {
    const handleOpenAi = () => {
      if (!isPremium) {
        setShowPremiumModal(true);
        return;
      }
      setIsOpen(true);
      if (tasks.length > 0 && !selectedTaskId) setSelectedTaskId(tasks[0].id);
    };
    window.addEventListener('open-costack-ai', handleOpenAi);
    return () => window.removeEventListener('open-costack-ai', handleOpenAi);
  }, [isPremium, selectedTaskId, setIsOpen, setShowPremiumModal, tasks]);

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('costack_ai_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatHistory(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to load AI chat history", e);
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (chatHistory.length > 0) {
      try {
        localStorage.setItem('costack_ai_chat_history', JSON.stringify(chatHistory.slice(-30)));
      } catch (e) {
        console.warn("Failed to save AI chat history", e);
      }
    }
  }, [chatHistory]);

  // Global Keyboard Shortcut: Cmd+J or Ctrl+J to toggle AI
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        if (!isPremium) {
          setShowPremiumModal(true);
          return;
        }
        toggleAiAssistant();
        if (tasks.length > 0 && !selectedTaskId) setSelectedTaskId(tasks[0].id);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPremium, selectedTaskId, setIsOpen, setShowPremiumModal, tasks, toggleAiAssistant]);

  // Load Model & Search Grounding preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchDefault = localStorage.getItem('apexa_ai_search_grounding') === 'true';
      setSearchWeb(searchDefault);
    }
  }, []);

  // Update Model from storage
  useEffect(() => {
    const updateModelInfo = () => {
      const raw = (typeof window !== 'undefined' ? localStorage.getItem('apexa_ai_model') : '') || 'gemini-3.6-flash';
      const found = AI_MODELS.find(m => m.id === raw);
      if (found) {
        setActiveModelId(found.id);
        setActiveModelName(found.name);
      } else {
        setActiveModelId('gemini-3.6-flash');
        setActiveModelName('Gemini 3.6 Flash');
      }
    };
    updateModelInfo();
    window.addEventListener('storage', updateModelInfo);
    return () => window.removeEventListener('storage', updateModelInfo);
  }, []);

  const handleSelectModel = (modelId: string) => {
    setActiveModelId(modelId);
    const found = AI_MODELS.find(m => m.id === modelId);
    if (found) setActiveModelName(found.name);
    setShowModelMenu(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('apexa_ai_model', modelId);
      window.dispatchEvent(new Event('storage'));
    }
  };

  // Auto-scroll on response update
  useEffect(() => {
    if (responseEndRef.current) {
      responseEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [chatHistory, responseText, loading, suggestedSubtasks, generatedTasks]);

  // Copy helper
  const handleCopyText = (text: string) => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Text-To-Speech
  const handleToggleSpeech = (text: string) => {
    if (typeof window === 'undefined') return;

    if (playingSpeech) {
      window.speechSynthesis.cancel();
      setPlayingSpeech(false);
    } else {
      window.speechSynthesis.cancel();
      const cleanText = text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/###/g, '')
        .replace(/##/g, '')
        .replace(/#/g, '');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = locale === 'vi' ? 'vi-VN' : 'en-US';
      utterance.onend = () => setPlayingSpeech(false);
      utterance.onerror = () => setPlayingSpeech(false);

      utteranceRef.current = utterance;
      setPlayingSpeech(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = locale === 'vi' ? 'vi-VN' : 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setRecognitionError(null);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition Error", event.error);
        if (event.error === 'not-allowed') {
          setRecognitionError(locale === 'vi' ? 'Quyền truy cập micro bị từ chối. Vui lòng cho phép quyền trong cài đặt trình duyệt.' : 'Microphone permission denied.');
        } else {
          setRecognitionError(locale === 'vi' ? `Lỗi micro: ${event.error}` : `Microphone error: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setQueryInput(prev => {
            const trimmedPrev = prev.trim();
            return trimmedPrev ? `${trimmedPrev} ${transcript}` : transcript;
          });
        }
      };

      recognitionRef.current = rec;
    }
  }, [locale]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setRecognitionError(locale === 'vi' ? "Trình duyệt của bạn chưa hỗ trợ Web Speech API." : "Browser does not support Web Speech API.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setRecognitionError(null);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Starting recognition failed", err);
      }
    }
  };

  // Clear Chat History & Storage
  const handleClearChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreamingMessageId(null);
    setLoading(false);
    setChatHistory([]);
    setResponseText('');
    localStorage.removeItem('costack_ai_chat_history');
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    }
    setPlayingSpeech(false);
  };

  // ==========================================
  // QUERY / CHAT STREAMING HANDLER
  // ==========================================
  const handleQuery = async (customQuery?: string) => {
    const finalQuery = (customQuery || queryInput).trim();
    if (!finalQuery) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setShowSlashMenu(false);
    const timeStr = new Date().toLocaleTimeString(locale === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' });

    // Append user message immediately
    const userMessage: AiChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: finalQuery,
      timestamp: timeStr
    };

    setChatHistory(prev => [...prev, userMessage]);
    setQueryInput('');
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    if (isOffline) {
      setTimeout(() => {
        setLoading(false);
        const offlineText = locale === 'vi' 
          ? "⚠️ **Ngoại tuyến**: Costack AI không thể kết nối tới máy chủ Gemini do không có mạng. Đang kích hoạt chế độ dự phòng nội bộ."
          : "⚠️ **Offline**: Costack AI cannot connect to Gemini servers. Activating local fallback.";
        const offlineMsg: AiChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: offlineText,
          timestamp: new Date().toLocaleTimeString(locale === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
          isFallback: true
        };
        setChatHistory(prev => [...prev, offlineMsg]);
        setResponseText(offlineText);
      }, 600);
      return;
    }

    const aiMessageId = `ai-${Date.now()}`;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let hasReceivedFirstChunk = false;

    try {
      onAddSyncLog(`Asked Costack AI: "${finalQuery.slice(0, 20)}..."`);

      const result = await callAiStreamApi(
        '/api/ai/query',
        {
          query: finalQuery,
          tasks,
          documents,
          members,
          model: activeModelId,
          history: chatHistory.slice(-14).map(m => ({ sender: m.sender, text: m.text })),
          now: new Date().toISOString(),
          googleSearch: searchWeb,
        },
        {
          signal: controller.signal,
          onChunk: (chunk) => {
            if (!hasReceivedFirstChunk) {
              hasReceivedFirstChunk = true;
              setLoading(false);
              setStreamingMessageId(aiMessageId);
              setIsAiFallbackActive(false);

              const initialMsg: AiChatMessage = {
                id: aiMessageId,
                sender: 'assistant',
                text: chunk,
                timestamp: new Date().toLocaleTimeString(locale === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
              };
              setChatHistory(prev => [...prev, initialMsg]);
              setResponseText(chunk);
            } else {
              setChatHistory(prev =>
                prev.map(m => (m.id === aiMessageId ? { ...m, text: m.text + chunk } : m))
              );
              setResponseText(prev => prev + chunk);
            }
          },
        }
      );

      const urgentCount = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length;
      const followUps = locale === 'vi' ? [
        urgentCount > 0 ? "Chi tiết các việc khẩn cấp & quá hạn" : "Đề xuất việc cần ưu tiên tiếp theo",
        "Ai đang nhận nhiều việc nhất trong nhóm?",
        "Tạo kế hoạch hành động giải quyết công việc"
      ] : [
        urgentCount > 0 ? "Details on urgent & overdue tasks" : "Recommend top priority next steps",
        "Who has the highest workload in the team?",
        "Create an action plan to resolve blockers"
      ];

      setChatHistory(prev =>
        prev.map(m => (m.id === aiMessageId ? { ...m, text: result.fullText || m.text, followUps } : m))
      );
      if (result.fullText) {
        setResponseText(result.fullText);
      }
    } catch (err: any) {
      if (controller.signal.aborted) return;
      console.error(err);
      if (isAiAccessError(err)) return;
      setIsAiFallbackActive(true);

      if (hasReceivedFirstChunk) {
        setStreamingMessageId(null);
        return;
      }

      const completedCount = tasks.filter(t => t.status === 'completed').length;
      const urgentTasks = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high');
      const inProgressCount = tasks.filter(t => t.status === 'inprogress').length;

      const fallbackText = locale === 'vi' ? `### Phân tích tiến độ dự án (Dự phòng cục bộ)
Dựa trên dữ liệu hiện tại trong không gian làm việc của bạn:
- 📊 **Tỷ lệ hoàn thành**: **${completedCount}/${tasks.length}** việc (${tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%).
- ⏳ **Đang tiến hành**: **${inProgressCount}** công việc.
- ⚠️ **Ưu tiên khẩn cấp/cao**: **${urgentTasks.length}** việc (${urgentTasks.slice(0, 2).map(t => `"${t.title}"`).join(', ')}${urgentTasks.length > 2 ? '...' : ''}).
- 👥 **Nhân sự tham gia**: **${members.length}** thành viên trong dự án.`
        : `### Task Progress Analysis (Local Fallback)
Based on current workspace data:
- 📊 **Completion Rate**: **${completedCount}/${tasks.length}** tasks (${tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%).
- ⏳ **In Progress**: **${inProgressCount}** tasks.
- ⚠️ **High / Urgent Priority**: **${urgentTasks.length}** tasks.
- 👥 **Assigned Members**: **${members.length}** active contributors.`;

      const aiFallbackMessage: AiChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString(locale === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
        isFallback: true,
        followUps: locale === 'vi' ? ["Lọc công việc quá hạn", "Phân bổ nhân sự chi tiết"] : ["Filter overdue tasks", "Team allocation details"]
      };

      setChatHistory(prev => [...prev, aiFallbackMessage]);
      setResponseText(fallbackText);
    } finally {
      setLoading(false);
      setStreamingMessageId(null);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  // Regenerate last assistant response
  const handleRegenerateLast = () => {
    const lastUserMsg = [...chatHistory].reverse().find(m => m.sender === 'user');
    if (lastUserMsg) {
      handleQuery(lastUserMsg.text);
    }
  };

  // Subtask generation
  const handleGenerateSubtasks = async () => {
    const task = tasks.find(t => t.id === selectedTaskId);
    if (!task) return;

    setLoading(true);
    setSuggestedSubtasks([]);
    setSubtasksApplied(false);

    try {
      const res = await callAiApi('/api/ai/subtasks', {
        title: task.title,
        description: task.description
      });
      const data = await res.json();
      if (data.subtasks && data.subtasks.length > 0) {
        setSuggestedSubtasks(data.subtasks);
        onAddSyncLog(`Costack AI suggested ${data.subtasks.length} subtasks for: "${task.title}"`);
      }
    } catch (err) {
      if (isAiAccessError(err)) return;
      setSuggestedSubtasks(locale === 'vi' ? [
        "Phác thảo kiến trúc giao diện người dùng",
        "Xây dựng cấu trúc dữ liệu cốt lõi",
        "Đánh giá hiệu năng và trải nghiệm người dùng"
      ] : [
        "Draft user interface wireframes",
        "Build foundational data structure",
        "Evaluate usability and responsiveness"
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomSubtask = () => {
    if (!newSubtaskInput.trim()) return;
    setSuggestedSubtasks(prev => [...prev, newSubtaskInput.trim()]);
    setNewSubtaskInput('');
  };

  const handleRemoveSubtask = (index: number) => {
    setSuggestedSubtasks(prev => prev.filter((_, i) => i !== index));
  };

  const applySubtasksToTask = () => {
    const task = tasks.find(t => t.id === selectedTaskId);
    if (!task || suggestedSubtasks.length === 0) return;

    const newSubtaskItems = suggestedSubtasks.map((title, index) => ({
      id: `sub-gen-${Date.now()}-${index}`,
      title,
      completed: false
    }));

    const updatedTask: Task = {
      ...task,
      subtasks: [...task.subtasks, ...newSubtaskItems],
      progress: Math.round(
        ((task.subtasks.filter(s => s.completed).length) / 
        (task.subtasks.length + newSubtaskItems.length)) * 100
      ) || 0
    };

    onUpdateTask(updatedTask);
    setSubtasksApplied(true);
    onAddSyncLog(`Applied ${suggestedSubtasks.length} subtasks to task: "${task.title}"`);
  };

  // Generate tasks from prompt
  const handleGenerateTasks = async (customPrompt?: string) => {
    const finalPrompt = customPrompt || taskPrompt;
    if (!finalPrompt.trim()) return;

    setLoading(true);
    setGeneratedTasks([]);
    setTasksCreated(false);

    try {
      const res = await callAiApi('/api/ai/generate-tasks', { prompt: finalPrompt });
      const data = await res.json();
      if (data.tasks) {
        setGeneratedTasks(data.tasks);
        onAddSyncLog(`Costack AI planned ${data.tasks.length} tasks for: "${finalPrompt.slice(0, 20)}..."`);
      }
    } catch (err) {
      console.error(err);
      if (isAiAccessError(err)) return;
      setGeneratedTasks([
        {
          title: locale === 'vi' ? "Thiết kế UI/UX" : "UI/UX Design",
          description: locale === 'vi' ? "Phác thảo wireframe và thiết kế chi tiết." : "Sketch wireframe & UI layout.",
          priority: "high",
          hoursEstimate: 8,
          tags: ["Design"],
          subtasks: locale === 'vi' ? ["Layout wireframe", "Figma prototype"] : ["Layout wireframe", "Figma prototype"]
        },
        {
          title: locale === 'vi' ? "Phát triển tính năng" : "Feature Development",
          description: locale === 'vi' ? "Xây dựng mã nguồn và kết nối API." : "Implement frontend and API integration.",
          priority: "medium",
          hoursEstimate: 12,
          tags: ["Frontend"],
          subtasks: locale === 'vi' ? ["Tạo component", "Kết nối API"] : ["Build components", "Connect API"]
        }
      ]);
    } finally {
      setLoading(false);
      if (!customPrompt) setTaskPrompt('');
    }
  };

  const applyGeneratedTasks = () => {
    if (generatedTasks.length === 0 || !onAddTask) return;

    generatedTasks.forEach((t, idx) => {
      const subtaskItems = (t.subtasks || []).map((stTitle: string, stIdx: number) => ({
        id: `sub-ai-${Date.now()}-${idx}-${stIdx}`,
        title: stTitle,
        completed: false
      }));

      onAddTask({
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: 'todo',
        subtasks: subtaskItems,
        hoursEstimate: t.hoursEstimate,
        hoursLogged: 0,
        tags: t.tags || []
      });
    });

    setTasksCreated(true);
    onAddSyncLog(`Added ${generatedTasks.length} tasks from Costack AI to Workspace`);
  };

  // Slash commands filtering
  const filteredSlashCommands = useMemo(() => {
    if (!queryInput.startsWith('/')) return [];
    const query = queryInput.slice(1).toLowerCase();
    return SLASH_COMMANDS.filter(s => s.cmd.includes(query) || s.title.toLowerCase().includes(query));
  }, [queryInput]);

  return (
    <>
      {/* PERSISTENT FLOATING BUTTON (Aura Glow + Hotkey Hint) */}
      <div className={`fixed right-4 sm:right-6 ${appActiveTab === 'chat' ? 'hidden pointer-events-none' : 'bottom-4 sm:bottom-6'} z-40 transition-all duration-300`}>
        <motion.button
          id="btn_apexa_ai_float"
          onClick={() => {
            if (!isPremium) {
              setShowPremiumModal(true);
              return;
            }
            setIsOpen(!isOpen);
            if (tasks.length > 0 && !selectedTaskId) setSelectedTaskId(tasks[0].id);
          }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="group relative flex items-center gap-2 px-3.5 py-3 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-sky-400/40 shadow-[0_8px_32px_rgba(59,130,246,0.35)] hover:shadow-[0_12px_40px_rgba(56,189,248,0.55)] cursor-pointer overflow-hidden transition-all"
          title="Trợ lý Costack AI (⌘J / Ctrl+J)"
        >
          {/* Specular shimmer highlight */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
          <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 rounded-2xl blur-md opacity-30 group-hover:opacity-75 transition-opacity -z-10" />

          {isOpen ? (
            <X className="w-5 h-5 shrink-0 text-white" />
          ) : (
            <>
              <ApexaAiIcon className="w-5 h-5 shrink-0 drop-shadow-[0_2px_8px_rgba(56,189,248,0.6)]" variant="gradient" />
              <span className="hidden md:inline text-xs font-black tracking-tight font-display bg-gradient-to-r from-white via-sky-200 to-indigo-200 bg-clip-text text-transparent">
                Costack AI
              </span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-white/10 text-sky-200 border border-white/15">
                ⌘J
              </kbd>
            </>
          )}
        </motion.button>
      </div>

      {/* ASSISTANT DRAWER / SPOTLIGHT MODAL */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 z-50 cursor-default transition-all"
            />

            {/* AI Assistant Container */}
            <motion.div
              id="apexa_ai_container"
              initial={viewMode === 'drawer' ? { x: '100%', opacity: 0.9 } : { scale: 0.95, opacity: 0, y: 20 }}
              animate={viewMode === 'drawer' ? { x: 0, opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
              exit={viewMode === 'drawer' ? { x: '100%', opacity: 0.9 } : { scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className={`fixed z-50 flex flex-col bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden ${
                viewMode === 'drawer'
                  ? 'right-0 top-0 bottom-0 w-full sm:w-[540px] md:w-[600px] border-l'
                  : 'inset-2 sm:inset-6 md:inset-10 max-w-5xl 2xl:max-w-6xl m-auto h-[90vh] sm:h-[85vh] rounded-3xl'
              }`}
            >
              {/* Top Header */}
              <div className="p-3.5 sm:p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 relative z-30 shrink-0 select-none">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <ApexaAiAvatar size="sm" showGlow={true} />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-slate-900" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black tracking-tight font-display text-slate-900 dark:text-white">
                        Costack AI Copilot
                      </h2>

                      {/* Model Selector Pill */}
                      <div className="relative z-40">
                        <button
                          type="button"
                          onClick={() => setShowModelMenu(!showModelMenu)}
                          className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-sky-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-indigo-200/60 dark:border-indigo-800/60 transition-all cursor-pointer shadow-3xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="truncate max-w-[110px]">{activeModelName}</span>
                          <ChevronDown className={`w-3 h-3 text-indigo-500 dark:text-sky-400 transition-transform ${showModelMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Model Dropdown */}
                        {showModelMenu && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowModelMenu(false)} />
                            <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                              <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                <span>{locale === 'vi' ? 'Chọn mô hình Gemini' : 'Select Gemini Model'}</span>
                                <span className="text-sky-500 font-bold">{AI_MODELS.length} models</span>
                              </div>
                              <div className="py-1 space-y-1 max-h-60 overflow-y-auto">
                                {AI_MODELS.map(m => {
                                  const isSelected = activeModelId === m.id;
                                  return (
                                    <button
                                      key={m.id}
                                      type="button"
                                      onClick={() => handleSelectModel(m.id)}
                                      className={`w-full text-left p-2 rounded-xl text-xs transition-all flex items-start gap-2.5 cursor-pointer ${
                                        isSelected 
                                          ? 'bg-indigo-50 dark:bg-sky-500/20 text-indigo-900 dark:text-white border border-indigo-200 dark:border-sky-500/40 shadow-xs' 
                                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                      }`}
                                    >
                                      <div className="pt-0.5">
                                        {isSelected ? <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-sky-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="font-bold text-[11px] truncate">{m.name}</span>
                                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-indigo-100/70 dark:bg-sky-500/20 text-indigo-700 dark:text-sky-300">
                                            {m.tag}
                                          </span>
                                        </div>
                                        <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{m.desc}</p>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Context Pill Indicator */}
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                        <Layers className="w-2.5 h-2.5 text-indigo-500" />
                        <span>{tasks.length} {locale === 'vi' ? 'việc' : 'tasks'}</span>
                      </span>
                      <span>•</span>
                      <span>{members.length} {locale === 'vi' ? 'nhân sự' : 'members'}</span>
                      {searchWeb && (
                        <>
                          <span>•</span>
                          <span className="text-sky-600 dark:text-sky-400 font-bold flex items-center gap-0.5">
                            <Globe className="w-2.5 h-2.5" /> Web Search
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right controls: ViewMode toggle, Clear, Close */}
                <div className="flex items-center gap-1.5">
                  {/* View Mode Toggle */}
                  <button
                    type="button"
                    onClick={() => setViewMode(prev => prev === 'drawer' ? 'spotlight' : 'drawer')}
                    className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                    title={viewMode === 'drawer' ? 'Mở rộng cửa sổ giữa (Spotlight)' : 'Thu về dạng thanh trượt (Drawer)'}
                  >
                    {viewMode === 'drawer' ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                  </button>

                  {/* Clear Chat */}
                  {activeTab === 'query' && chatHistory.length > 0 && (
                    <button 
                      type="button"
                      onClick={handleClearChat}
                      className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                      title={locale === 'vi' ? "Làm mới hội thoại" : "Clear conversation"}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Close */}
                  <button 
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                    title="Đóng (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Navigation Segmented Control */}
              <div className="flex border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-1.5 gap-1.5 shrink-0">
                {[
                  { id: 'query', label: locale === 'vi' ? '💬 Hỏi AI / Trò chuyện' : '💬 Ask Copilot', icon: TrendingUp },
                  { id: 'subtasks', label: locale === 'vi' ? '⚡ Bóc tách việc con' : '⚡ Subtasks', icon: CheckSquare },
                  { id: 'generate-tasks', label: locale === 'vi' ? '🎯 Lập kế hoạch dự án' : '🎯 Project Planner', icon: Sparkles }
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
                        isActive 
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-sky-300 shadow-xs border border-slate-200/80 dark:border-slate-700' 
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* CONTENT AREA */}
              <div className="flex-1 overflow-hidden p-3.5 sm:p-4 flex flex-col relative">
                
                {/* --- TAB 1: CONVERSATION --- */}
                {activeTab === 'query' && (
                  <div className="flex-1 flex flex-col overflow-hidden space-y-3">
                    
                    {/* Chat Messages Timeline or Empty Greeting State */}
                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="flex-1 p-3 sm:p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex flex-col justify-start overflow-y-auto shadow-xs space-y-4">
                        
                        {chatHistory.length === 0 ? (
                          <div className="space-y-4 my-auto py-3">
                            {/* Greeting & Workspace Metrics Card */}
                            <div className="bg-gradient-to-br from-indigo-500/10 via-sky-500/5 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-5 text-center space-y-3">
                              <div className="flex justify-center">
                                <ApexaAiAvatar size="md" showGlow={true} />
                              </div>
                              <div>
                                <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 font-display">
                                  {locale === 'vi' ? 'Xin chào! Tôi là Trợ lý Costack AI' : 'Hello! I am Costack AI Copilot'}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                                  {locale === 'vi' 
                                    ? 'Tôi nắm bắt toàn bộ công việc, tài liệu và phân bổ đội ngũ của bạn để đưa ra phân tích sắc bén nhất.'
                                    : 'I analyze your tasks, docs, and team capacity in real time to help you deliver faster.'}
                                </p>
                              </div>

                              {/* Live Metrics Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-center shadow-2xs">
                                  <span className="text-[10px] text-slate-400 block font-bold">{locale === 'vi' ? 'Tổng việc' : 'Total'}</span>
                                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">{tasks.length}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-center shadow-2xs">
                                  <span className="text-[10px] text-sky-500 block font-bold">{locale === 'vi' ? 'Đang làm' : 'Active'}</span>
                                  <span className="text-sm font-black text-sky-600 dark:text-sky-400">{tasks.filter(t => t.status === 'inprogress').length}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-center shadow-2xs">
                                  <span className="text-[10px] text-rose-500 block font-bold">{locale === 'vi' ? 'Khẩn cấp' : 'Urgent'}</span>
                                  <span className="text-sm font-black text-rose-600 dark:text-rose-400">{tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-center shadow-2xs">
                                  <span className="text-[10px] text-indigo-500 block font-bold">{locale === 'vi' ? 'Đồng đội' : 'Team'}</span>
                                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{members.length}</span>
                                </div>
                              </div>
                            </div>

                            {/* Quick Analysis Prompts */}
                            <div className="space-y-2">
                              <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-sky-500" />
                                <span>{locale === 'vi' ? 'Gợi ý phân tích thông minh' : 'Smart Quick Actions'}</span>
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {QUICK_PROMPTS.map((item) => {
                                  const IconComponent = item.icon;
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => handleQuery(item.query)}
                                      className="p-3 text-left border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400/60 dark:hover:border-indigo-400/60 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 rounded-2xl transition-all duration-200 cursor-pointer group flex items-start gap-3 bg-white dark:bg-slate-900/60 shadow-2xs hover:shadow-xs"
                                    >
                                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${item.iconBg}`}>
                                        <IconComponent className="w-4 h-4" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-sky-300 transition-colors block truncate">
                                          {locale === 'vi' ? item.title : item.titleEn}
                                        </span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1 block mt-0.5">
                                          {locale === 'vi' ? item.desc : item.descEn}
                                        </span>
                                      </div>
                                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-0.5" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Chat Message History Timeline */
                          <div className="space-y-4">
                            {chatHistory.map((msg) => (
                              <div key={msg.id} className="space-y-2">
                                {msg.sender === 'user' ? (
                                  /* User Message Bubble */
                                  <div className="flex justify-end">
                                    <div className="max-w-[85%] bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl rounded-tr-xs p-3.5 shadow-xs space-y-1">
                                      <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                      <span className="text-[9px] text-indigo-100/70 block text-right font-mono">{msg.timestamp}</span>
                                    </div>
                                  </div>
                                ) : (
                                  /* Assistant Message Bubble */
                                  <div className="flex gap-2.5 items-start">
                                    <ApexaAiAvatar size="sm" />
                                    <div className="flex-1 min-w-0 bg-slate-50/90 dark:bg-slate-800/50 p-4 rounded-2xl rounded-tl-xs border border-slate-200/70 dark:border-slate-700/60 shadow-2xs space-y-2 relative">
                                      
                                      {/* Message Top Bar */}
                                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/50 dark:border-slate-700/40">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-black text-indigo-600 dark:text-sky-400 uppercase tracking-wider">Costack AI</span>
                                          {msg.isFallback && (
                                            <span className="text-[8px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold px-1.5 py-0.2 rounded border border-amber-500/20">
                                              {locale === 'vi' ? 'Dự phòng' : 'Fallback'}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => handleCopyText(msg.text)}
                                            className="p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                            title="Sao chép câu trả lời"
                                          >
                                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleToggleSpeech(msg.text)}
                                            className="p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                            title="Đọc bằng giọng nói"
                                          >
                                            {playingSpeech ? <VolumeX className="w-3.5 h-3.5 text-indigo-600 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={handleRegenerateLast}
                                            className="p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                            title="Tạo lại câu trả lời"
                                          >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                          </button>
                                          <span className="text-[9px] text-slate-400 font-mono ml-1">{msg.timestamp}</span>
                                        </div>
                                      </div>

                                      {/* Rich Markdown Output with Agent Action execution */}
                                      <RenderRichMarkdown
                                        text={msg.text}
                                        isStreaming={streamingMessageId === msg.id}
                                        onAddTask={onAddTask}
                                        onUpdateTask={onUpdateTask}
                                        onDeleteTask={onDeleteTask}
                                        tasks={tasks}
                                        members={members}
                                        triggerToast={triggerToast}
                                        locale={locale}
                                      />

                                      {/* Follow-up Question Chips */}
                                      {msg.followUps && msg.followUps.length > 0 && (
                                        <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/40 space-y-1.5">
                                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block">
                                            {locale === 'vi' ? 'Gợi ý câu hỏi tiếp theo:' : 'Suggested next steps:'}
                                          </span>
                                          <div className="flex flex-wrap gap-1.5">
                                            {msg.followUps.map((chip, chipIdx) => (
                                              <button
                                                key={chipIdx}
                                                type="button"
                                                onClick={() => handleQuery(chip)}
                                                className="text-[10px] font-semibold px-2.5 py-1 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-sky-300 border border-indigo-200/50 dark:border-indigo-800/40 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                                              >
                                                <span>{chip}</span>
                                                <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Skeleton loader while awaiting first stream chunk */}
                        {loading && (
                          <div className="space-y-3 py-3 px-2">
                            <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-wider animate-pulse justify-center">
                              <ApexaAiIcon className="w-4 h-4 animate-bounce" variant="gradient" />
                              <span>{locale === 'vi' ? 'Costack AI đang phân tích dữ liệu...' : 'Costack AI is analyzing workspace...'}</span>
                            </div>
                            <div className="space-y-2 max-w-sm mx-auto">
                              <div className="h-3 animate-pulse rounded-lg bg-indigo-100/60 dark:bg-slate-800 w-3/4 mx-auto" />
                              <div className="h-3 animate-pulse rounded-lg bg-indigo-100/60 dark:bg-slate-800 w-full" />
                            </div>
                          </div>
                        )}

                        <div ref={responseEndRef} />
                      </div>
                    </div>

                    {/* Microphone Audio Waveform Active State */}
                    {isListening && (
                      <div className="p-3 border border-rose-200 dark:border-rose-900/40 bg-rose-50/80 dark:bg-rose-950/30 rounded-2xl flex items-center justify-between shrink-0 shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center gap-1 h-5">
                            <span className="w-1 h-3 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1 h-5 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1 h-2 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.45s]" />
                            <span className="w-1 h-4 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.2s]" />
                            <span className="w-1 h-3 bg-rose-500 rounded-full animate-bounce" />
                          </div>
                          <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                            {locale === 'vi' ? 'Đang nghe... Hãy nói yêu cầu của bạn' : 'Listening... Speak your query'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={toggleListening}
                          className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-rose-600 text-white cursor-pointer hover:bg-rose-700 transition-colors"
                        >
                          {locale === 'vi' ? 'Xong' : 'Done'}
                        </button>
                      </div>
                    )}

                    {/* Recognition Error notice */}
                    {recognitionError && (
                      <div className="p-2 border border-rose-200 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-950/20 text-xs text-rose-600 dark:text-rose-400 rounded-xl font-medium flex items-center gap-1.5 shrink-0">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>{recognitionError}</span>
                      </div>
                    )}

                    {/* Floating Slash Commands Menu */}
                    <AnimatePresence>
                      {showSlashMenu && filteredSlashCommands.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 max-h-52 overflow-y-auto space-y-1 text-xs"
                        >
                          <div className="px-2.5 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                            <span>{locale === 'vi' ? 'Lệnh nhanh (Slash Commands)' : 'Slash Commands'}</span>
                            <span className="text-indigo-500 font-mono">/</span>
                          </div>
                          {filteredSlashCommands.map((cmd, idx) => (
                            <button
                              key={cmd.cmd}
                              type="button"
                              onClick={() => {
                                if (cmd.action === 'clear') {
                                  handleClearChat();
                                  setQueryInput('');
                                  setShowSlashMenu(false);
                                } else {
                                  setQueryInput(cmd.query || '');
                                  setShowSlashMenu(false);
                                  textareaRef.current?.focus();
                                }
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                                selectedSlashIndex === idx
                                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-sky-300'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div>
                                <span className="font-bold text-xs text-indigo-600 dark:text-sky-400 font-mono mr-2">{cmd.cmd}</span>
                                <span className="font-medium">{cmd.title}</span>
                                <p className="text-[10px] text-slate-400 mt-0.5">{cmd.desc}</p>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* MULTI-LINE COMPOSER INPUT BAR */}
                    <div className="shrink-0 bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/60 transition-all flex flex-col gap-2">
                      <div className="flex gap-2 items-end">
                        
                        {/* Voice button */}
                        <button
                          type="button"
                          onClick={toggleListening}
                          className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                            isListening
                              ? 'bg-rose-500 text-white animate-pulse'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title="Thu âm giọng nói"
                        >
                          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>

                        {/* Multi-line auto-expanding textarea */}
                        <textarea
                          ref={textareaRef}
                          rows={1}
                          placeholder={locale === 'vi' ? "Hỏi Costack AI hoặc gõ '/' để xem lệnh nhanh..." : "Ask Costack AI or type '/' for slash commands..."}
                          value={queryInput}
                          onChange={(e) => {
                            setQueryInput(e.target.value);
                            setShowSlashMenu(e.target.value.startsWith('/'));
                            // Auto-resize
                            e.target.style.height = 'auto';
                            e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (showSlashMenu && filteredSlashCommands.length > 0) {
                                const selected = filteredSlashCommands[selectedSlashIndex] || filteredSlashCommands[0];
                                if (selected.action === 'clear') {
                                  handleClearChat();
                                  setQueryInput('');
                                } else {
                                  setQueryInput(selected.query || '');
                                }
                                setShowSlashMenu(false);
                                return;
                              }
                              handleQuery();
                            }
                          }}
                          className="flex-1 py-1 px-1 text-xs text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent font-medium resize-none max-h-36 leading-relaxed"
                          disabled={isListening}
                        />

                        {/* Google Search Grounding toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            const next = !searchWeb;
                            setSearchWeb(next);
                            localStorage.setItem('apexa_ai_search_grounding', String(next));
                          }}
                          className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                            searchWeb 
                              ? 'bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400' 
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title={searchWeb ? "Google Search đang BẬT" : "Google Search đang TẮT"}
                        >
                          <Globe className="w-4 h-4" />
                        </button>

                        {/* Send / Stop Button */}
                        {streamingMessageId ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (abortControllerRef.current) {
                                abortControllerRef.current.abort();
                                abortControllerRef.current = null;
                              }
                              setStreamingMessageId(null);
                              setLoading(false);
                            }}
                            className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-500 hover:bg-rose-600 active:scale-95 text-white cursor-pointer select-none transition-all shrink-0 shadow-xs"
                            title="Dừng phản hồi"
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleQuery()}
                            disabled={loading || !queryInput.trim() || isListening}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-white cursor-pointer select-none transition-all shrink-0 ${
                              (queryInput.trim() && !isListening) 
                                ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-sm' 
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                            }`}
                            title="Gửi câu hỏi (Enter)"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- TAB 2: SUBTASK DECOMPOSER --- */}
                {activeTab === 'subtasks' && (
                  <div className="flex-1 flex flex-col overflow-hidden space-y-3 font-sans">
                    <div className="space-y-1.5 shrink-0">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          {locale === 'vi' ? 'Chọn công việc chính để bóc tách' : 'Select Main Task'}
                        </label>
                        <span className="text-[9px] text-slate-400 font-semibold">{tasks.length} {locale === 'vi' ? 'công việc' : 'tasks'}</span>
                      </div>
                      <select
                        value={selectedTaskId}
                        onChange={(e) => {
                          setSelectedTaskId(e.target.value);
                          setSuggestedSubtasks([]);
                          setSubtasksApplied(false);
                        }}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-slate-800 dark:text-slate-200 font-bold outline-none focus:border-indigo-400 shadow-xs cursor-pointer"
                      >
                        {tasks.length === 0 ? (
                          <option value="">{locale === 'vi' ? 'Không có công việc nào' : 'No tasks available'}</option>
                        ) : (
                          tasks.map(t => (
                            <option key={t.id} value={t.id}>
                              [{(t.priority || 'none').toUpperCase()}] {t.title}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateSubtasks}
                      disabled={!selectedTaskId || loading}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-xs rounded-xl transition-all shadow-[0_4px_14px_rgba(99,102,241,0.25)] hover:shadow-[0_4px_18px_rgba(99,102,241,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0 active:scale-[0.99]"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>{locale === 'vi' ? 'Costack AI đang phân rã nhiệm vụ...' : 'Decomposing task into subtasks...'}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-sky-200 animate-pulse" />
                          <span>{locale === 'vi' ? 'Đề xuất việc con tự động bằng AI' : 'Generate Subtasks with AI'}</span>
                        </>
                      )}
                    </button>

                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="flex-1 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex flex-col overflow-y-auto shadow-xs">
                        {suggestedSubtasks.length > 0 ? (
                          <div className="space-y-3">
                            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                              {locale === 'vi' ? `Đề xuất (${suggestedSubtasks.length} việc con):` : `Suggested (${suggestedSubtasks.length} subtasks):`}
                            </span>

                            <div className="space-y-1.5">
                              {suggestedSubtasks.map((st, i) => (
                                <div key={i} className="flex gap-2 items-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs group hover:border-indigo-400/40 transition-colors">
                                  <div className="w-5 h-5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-[10px] font-black text-indigo-600 dark:text-sky-400 border border-indigo-100 dark:border-indigo-900/40 shrink-0">
                                    {i + 1}
                                  </div>
                                  <span className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-snug flex-1">{st}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSubtask(i)}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-500 transition-opacity cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* Add custom input */}
                            <div className="flex gap-1.5 pt-1">
                              <input
                                type="text"
                                placeholder={locale === 'vi' ? "+ Thêm việc con khác..." : "+ Add custom subtask..."}
                                value={newSubtaskInput}
                                onChange={(e) => setNewSubtaskInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddCustomSubtask();
                                }}
                                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-400"
                              />
                              <button
                                type="button"
                                onClick={handleAddCustomSubtask}
                                disabled={!newSubtaskInput.trim()}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs disabled:opacity-40 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Apply Button */}
                            {subtasksApplied ? (
                              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs">
                                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span>{locale === 'vi' ? 'Đã áp dụng thành công vào công việc!' : 'Subtasks successfully applied!'}</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={applySubtasksToTask}
                                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer text-center shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.99]"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{locale === 'vi' ? 'Áp dụng danh sách này vào công việc' : 'Apply these subtasks to task'}</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="m-auto text-center p-6 text-slate-400 dark:text-slate-500 max-w-xs space-y-2">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/40 flex items-center justify-center mx-auto text-indigo-500">
                              <CheckSquare className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {locale === 'vi' ? 'Phân rã công việc con thông minh' : 'Intelligent Subtask Breakdown'}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                              {locale === 'vi'
                                ? 'Chọn một công việc lớn ở trên và Costack AI sẽ tự động phân rã thành các bước cụ thể để hoàn thành nhanh hơn.'
                                : 'Select a major task above and AI will break it down into actionable subtasks with clear progress tracking.'}
                            </p>
                          </div>
                        )}
                        <div ref={responseEndRef} />
                      </div>
                    </div>
                  </div>
                )}

                {/* --- TAB 3: PROJECT PLANNER --- */}
                {activeTab === 'generate-tasks' && (
                  <div className="flex-1 flex flex-col overflow-hidden space-y-3 font-sans">
                    <div className="space-y-1.5 shrink-0">
                      <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        {locale === 'vi' ? 'Mục tiêu dự án hoặc ý tưởng' : 'Inspiration Ideas'}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { text: locale === 'vi' ? "Thiết kế Landing Page" : "Landing Page Design", q: "Lập kế hoạch thiết kế và phát triển Landing Page chuyển đổi cao" },
                          { text: locale === 'vi' ? "Chiến dịch Ra mắt Sản phẩm" : "Product Launch", q: "Lập kế hoạch chiến dịch ra mắt sản phẩm công nghệ mới" },
                          { text: locale === 'vi' ? "Tái cấu trúc API Backend" : "Backend Refactor", q: "Lập kế hoạch tối ưu hóa hiệu năng và bảo mật hệ thống backend" },
                          { text: locale === 'vi' ? "Đánh giá & Audit Bảo mật" : "Security Audit", q: "Lập kế hoạch kiểm thử lỗ hổng bảo mật và tuân thủ" }
                        ].map((btn, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setTaskPrompt(btn.q);
                              handleGenerateTasks(btn.q);
                            }}
                            className="p-2.5 text-left border border-slate-200 dark:border-slate-800 hover:border-indigo-400/60 dark:hover:border-indigo-400/60 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 rounded-xl transition-all cursor-pointer group text-xs flex flex-col justify-between h-14 bg-white dark:bg-slate-900/60 shadow-2xs"
                          >
                            <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-sky-300 transition-colors truncate">
                              {btn.text}
                            </span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                              {locale === 'vi' ? 'Chọn đề xuất' : 'Pick prompt'}
                              <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform text-indigo-500" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Task Prompt Input */}
                    <div className="shrink-0 bg-white dark:bg-slate-900 p-1.5 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/60 transition-all flex gap-1.5 items-center">
                      <input
                        type="text"
                        placeholder={locale === 'vi' ? "Mô tả mục tiêu (ví dụ: Ra mắt tính năng ví thanh toán)..." : "Describe project goal to generate tasks..."}
                        value={taskPrompt}
                        onChange={(e) => setTaskPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleGenerateTasks();
                        }}
                        className="flex-1 px-2.5 py-2 text-xs text-slate-800 dark:text-slate-50 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => handleGenerateTasks()}
                        disabled={loading || !taskPrompt.trim()}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-white cursor-pointer select-none transition-all shrink-0 ${
                          taskPrompt.trim() ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-sm' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Tasks Display */}
                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="flex-1 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex flex-col overflow-y-auto shadow-xs">
                        {loading ? (
                          <div className="m-auto w-full space-y-3 py-4 px-2">
                            <div className="flex items-center gap-2 text-indigo-500 font-bold text-[10px] uppercase tracking-wider animate-pulse justify-center">
                              <ApexaAiIcon className="w-4 h-4 animate-bounce" variant="gradient" />
                              <span>{locale === 'vi' ? 'Costack AI đang phân rã kế hoạch...' : 'Costack AI is planning tasks...'}</span>
                            </div>
                            <div className="space-y-2 max-w-sm mx-auto">
                              <div className="h-3.5 animate-pulse rounded-lg bg-indigo-100/60 dark:bg-slate-800 w-3/4 mx-auto" />
                              <div className="h-3 animate-pulse rounded-lg bg-indigo-100/60 dark:bg-slate-800 w-full" />
                            </div>
                          </div>
                        ) : generatedTasks.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center bg-slate-100/80 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
                              <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300">
                                {locale === 'vi' ? `Đã tạo ${generatedTasks.length} công việc:` : `Generated ${generatedTasks.length} tasks:`}
                              </span>
                              {tasksCreated ? (
                                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{locale === 'vi' ? 'Đã thêm thành công!' : 'Added successfully!'}</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={applyGeneratedTasks}
                                  className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] rounded-lg transition-colors cursor-pointer shadow-2xs active:scale-95"
                                >
                                  {locale === 'vi' ? '+ Thêm tất cả vào không gian' : '+ Add all to workspace'}
                                </button>
                              )}
                            </div>

                            <div className="space-y-2.5">
                              {generatedTasks.map((t, idx) => (
                                <div key={idx} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2 text-left hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                                  <div className="flex justify-between items-start gap-2">
                                    <span className="text-xs font-bold text-slate-850 dark:text-slate-100 leading-tight flex-1">{t.title}</span>
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase border shrink-0 ${
                                      t.priority === 'urgent' ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30' :
                                      t.priority === 'high' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' :
                                      t.priority === 'medium' ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30' :
                                      'bg-slate-50 text-slate-650 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                    }`}>
                                      {t.priority}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">{t.description}</p>
                                  
                                  <div className="flex flex-wrap gap-1.5 items-center pt-0.5">
                                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold mr-1 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {t.hoursEstimate} {locale === 'vi' ? 'giờ' : 'hrs'}
                                    </span>
                                    {t.tags && t.tags.map((tag: string, tagIdx: number) => (
                                      <span key={tagIdx} className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>

                                  {t.subtasks && t.subtasks.length > 0 && (
                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block">
                                        {locale === 'vi' ? 'Việc con kèm theo:' : 'Included subtasks:'}
                                      </span>
                                      <div className="space-y-0.5">
                                        {t.subtasks.map((st: string, stIdx: number) => (
                                          <div key={stIdx} className="flex gap-1.5 items-center text-[9px] text-slate-600 dark:text-slate-350">
                                            <span className="text-sky-500 shrink-0">•</span>
                                            <span className="truncate">{st}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="m-auto text-center p-6 text-slate-400 dark:text-slate-500 max-w-xs space-y-2">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/40 flex items-center justify-center mx-auto text-indigo-500">
                              <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                            </div>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {locale === 'vi' ? 'Trình lập kế hoạch dự án tự động' : 'Automatic Project Planner'}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                              {locale === 'vi'
                                ? 'Nhập mục tiêu dự án và Costack AI sẽ tự động phân rã thành các công việc chi tiết kèm thời gian ước tính và phân việc con.'
                                : 'Describe any objective and Costack AI will generate a complete set of tasks with time estimates and subtasks.'}
                            </p>
                          </div>
                        )}
                        <div ref={responseEndRef} />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Drawer Footer and credits */}
              <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
                <span className="flex items-center gap-1.5">
                  <ApexaAiIcon className="w-3.5 h-3.5 animate-pulse" variant="gradient" />
                  <span className="font-semibold">{locale === 'vi' ? 'Trợ lý Costack AI' : 'Costack AI Copilot'}</span>
                </span>
                <span className="flex items-center gap-1 text-[9px]">
                  <span>Vận hành bởi</span>
                  <span className="font-bold text-sky-500 dark:text-sky-400">{activeModelName}</span>
                </span>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
