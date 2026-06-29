"use client";

import React, { useState } from 'react';
import { ArrowUpDown, Pin, MessageSquare, Paperclip } from 'lucide-react';
import { Task, User, Workspace } from '../../types';
import { PriorityPillSelect, StatusPillSelect } from './TaskSelects';
import SignedImage from '../SignedImage';

const SortHeader = ({ col, label, className = '', sortCol, sortDir, onToggleSort }: { col: string; label: string; className?: string; sortCol: string; sortDir: 'asc' | 'desc'; onToggleSort: (col: string) => void }) => (
  <th onClick={() => onToggleSort(col)}
    className={`px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors select-none ${className}`}>
    <div className="flex items-center gap-1">
      <span>{label}</span>
      {sortCol === col && <ArrowUpDown className={`w-3 h-3 ${sortDir === 'desc' ? 'rotate-180' : ''}`} />}
    </div>
  </th>
);

interface TaskTableViewProps {
  filteredTasks: Task[];
  members: User[];
  workspaces?: Workspace[];
  selectedTaskIds: string[];
  setSelectedTaskIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onAddSyncLog: (log: string) => void;
  triggerToast?: (type: string, title: string, message: string) => void;
}

export default function TaskTableView({
  filteredTasks, members, workspaces = [], selectedTaskIds, setSelectedTaskIds, setSelectedTask,
  onUpdateTask, onAddSyncLog, triggerToast
}: TaskTableViewProps) {
  const [sortCol, setSortCol] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (col: string) => {
    if (sortCol === col) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortCol(col); setSortDir('asc'); }
  };

  const sortedTasks = React.useMemo(() => {
    if (!sortCol) return filteredTasks;
    const sorted = [...filteredTasks];
    const dir = sortDir === 'asc' ? 1 : -1;
    sorted.sort((a, b) => {
      if (sortCol === 'title') return a.title.localeCompare(b.title) * dir;
      if (sortCol === 'priority') {
        const w: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
        return ((w[a.priority] || 0) - (w[b.priority] || 0)) * dir;
      }
      if (sortCol === 'dueDate') return (a.dueDate || '').localeCompare(b.dueDate || '') * dir;
      if (sortCol === 'progress') return (a.progress - b.progress) * dir;
      return 0;
    });
    return sorted;
  }, [filteredTasks, sortCol, sortDir]);

  const allSelected = sortedTasks.length > 0 && sortedTasks.every(t => selectedTaskIds.includes(t.id));

  const getDaysText = (dueDate?: string) => {
    if (!dueDate) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate.split('T')[0]); due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: `Overdue ${Math.abs(diff)}d`, cls: 'text-rose-600' };
    if (diff === 0) return { text: 'Today', cls: 'text-amber-600 font-black' };
    if (diff <= 3) return { text: `${diff}d left`, cls: 'text-amber-600' };
    return { text: `${diff}d`, cls: 'text-slate-500' };
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700">
            <th className="w-10 px-4 py-3">
              <input type="checkbox" checked={allSelected}
                onChange={e => { if (e.target.checked) setSelectedTaskIds(sortedTasks.map(t => t.id)); else setSelectedTaskIds([]); }}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600" />
            </th>
            <SortHeader col="title" label="Task" className="min-w-[250px]" sortCol={sortCol} sortDir={sortDir} onToggleSort={toggleSort} />
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
            <SortHeader col="priority" label="Priority" sortCol={sortCol} sortDir={sortDir} onToggleSort={toggleSort} />
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Assignee</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Space</th>
            <SortHeader col="dueDate" label="Due Date" sortCol={sortCol} sortDir={sortDir} onToggleSort={toggleSort} />
            <SortHeader col="progress" label="Progress" sortCol={sortCol} sortDir={sortDir} onToggleSort={toggleSort} />
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Tags</th>
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map((task, index) => {
            const assignee = members.find(m => m.id === task.assigneeId);
            const isSelected = selectedTaskIds.includes(task.id);
            const daysInfo = getDaysText(task.dueDate);

            return (
              <tr key={task.id} onClick={() => setSelectedTask(task)}
                className={`border-b border-slate-100 dark:border-slate-800/60 cursor-pointer transition-all ${isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/15' : index % 2 === 0 ? 'bg-white dark:bg-slate-900/40' : 'bg-slate-50/30 dark:bg-slate-900/20'} hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10`}>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={isSelected}
                    onChange={e => setSelectedTaskIds(prev => e.target.checked ? [...prev, task.id] : prev.filter(id => id !== task.id))}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {task.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}
                    <span className={`text-[13px] font-semibold truncate max-w-[300px] ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                      {task.title}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 text-slate-400">
                      {(task.comments?.length || 0) > 0 && <span className="flex items-center gap-0.5 text-[9px] font-bold"><MessageSquare className="w-2.5 h-2.5" />{task.comments?.length}</span>}
                      {(task.attachments?.length || 0) > 0 && <Paperclip className="w-2.5 h-2.5" />}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <StatusPillSelect value={task.status} onChange={newS => {
                    onUpdateTask({ ...task, status: newS });
                    onAddSyncLog(`Status "${task.title}" → ${newS}`);
                  }} />
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <PriorityPillSelect value={task.priority} onChange={newP => {
                    onUpdateTask({ ...task, priority: newP });
                    onAddSyncLog(`Priority "${task.title}" → ${newP}`);
                  }} />
                </td>
                <td className="px-4 py-3">
                  {assignee ? (
                    <div className="flex items-center gap-1.5">
                      <SignedImage filePath={assignee.avatar} className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-700 object-cover" alt={assignee.name} fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(assignee.name)}`} />
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate max-w-[80px]">{assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-300 dark:text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const ws = workspaces.find(w => w.id === (task.workspaceId || 'w2'));
                    return ws ? (
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        {ws.name}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-350">—</span>
                    );
                  })()}
                </td>
                <td className="px-4 py-3">
                  {daysInfo ? (
                    <span className={`text-[11px] font-bold ${daysInfo.cls}`}>{daysInfo.text}</span>
                  ) : (
                    <span className="text-[11px] text-slate-300 dark:text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {task.subtasks && task.subtasks.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${task.progress}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{task.progress}%</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-300 dark:text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {task.tags?.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">#{tag}</span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sortedTasks.length === 0 && (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm font-medium">
          No tasks match the active filters
        </div>
      )}
    </div>
  );
}
