"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, User, Space, Priority } from '../types';
import { useTranslation } from '../contexts/TranslationContext';
import { 
  Folder, FolderOpen, Bookmark, Plus, Trash2, ExternalLink, Calendar, 
  Flag, User as UserIcon, List, Clock, CheckCircle2, ChevronDown, ChevronRight
} from 'lucide-react';
import SignedImage from './SignedImage';

interface SpaceOverviewTabProps {
  space: Space;
  tasks: Task[];
  members: User[];
  docs?: any[];
  onOpenList: (listId: string) => void;
  onAddList: () => void;
  onAddTask: (taskObj: any) => void;
  triggerToast?: (type: string, title: string, message: string) => void;
  onAddFolder?: () => void;
  onAddDoc?: () => void;
  onOpenDoc?: (docId: string) => void;
  activeFolderId?: string | null;
}

interface BookmarkItem {
  id: string;
  title: string;
  url: string;
}

const THEME_COLORS: Record<string, {
  accent: string;
  bg: string;
  text: string;
  border: string;
  gradient: string;
  glow: string;
  accentLight: string;
}> = {
  indigo: {
    accent: '#6366f1',
    bg: 'bg-indigo-50/60 dark:bg-indigo-950/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-100/80 dark:border-indigo-900/40',
    gradient: 'from-indigo-500 to-violet-650',
    glow: 'shadow-indigo-500/10 dark:shadow-indigo-500/5',
    accentLight: 'rgba(99, 102, 241, 0.08)'
  },
  rose: {
    accent: '#f43f5e',
    bg: 'bg-rose-50/60 dark:bg-rose-955/20',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-100/80 dark:border-rose-900/40',
    gradient: 'from-rose-500 to-pink-650',
    glow: 'shadow-rose-500/10 dark:shadow-rose-500/5',
    accentLight: 'rgba(244, 63, 94, 0.08)'
  },
  sky: {
    accent: '#0ea5e9',
    bg: 'bg-sky-50/60 dark:bg-sky-955/20',
    text: 'text-sky-655 dark:text-sky-400',
    border: 'border-sky-100/80 dark:border-sky-900/40',
    gradient: 'from-sky-500 to-cyan-655',
    glow: 'shadow-sky-500/10 dark:shadow-sky-500/5',
    accentLight: 'rgba(14, 165, 233, 0.08)'
  },
  emerald: {
    accent: '#10b981',
    bg: 'bg-emerald-50/60 dark:bg-emerald-950/20',
    text: 'text-emerald-655 dark:text-emerald-400',
    border: 'border-emerald-100/80 dark:border-emerald-900/40',
    gradient: 'from-emerald-500 to-teal-655',
    glow: 'shadow-emerald-500/10 dark:shadow-emerald-500/5',
    accentLight: 'rgba(16, 185, 129, 0.08)'
  },
  amber: {
    accent: '#f59e0b',
    bg: 'bg-amber-50/60 dark:bg-amber-955/20',
    text: 'text-amber-655 dark:text-amber-400',
    border: 'border-amber-100/80 dark:border-amber-900/40',
    gradient: 'from-amber-500 to-orange-655',
    glow: 'shadow-amber-500/10 dark:shadow-amber-500/5',
    accentLight: 'rgba(245, 158, 11, 0.08)'
  },
  sunset: {
    accent: '#ea580c',
    bg: 'bg-orange-50/60 dark:bg-orange-955/20',
    text: 'text-orange-655 dark:text-orange-400',
    border: 'border-orange-100/80 dark:border-orange-900/40',
    gradient: 'from-orange-500 to-red-655',
    glow: 'shadow-orange-500/10 dark:shadow-orange-500/5',
    accentLight: 'rgba(234, 88, 12, 0.08)'
  }
};

export default function SpaceOverviewTab({
  space,
  tasks,
  members,
  docs = [],
  onOpenList,
  onAddList,
  onAddTask,
  triggerToast,
  onAddFolder,
  onAddDoc,
  onOpenDoc,
  activeFolderId = null
}: SpaceOverviewTabProps) {
  const { t, locale } = useTranslation();
  // Bookmarks state (persisted per space ID)
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [showAddBookmarkModal, setShowAddBookmarkModal] = useState(false);
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [bookmarkUrl, setBookmarkUrl] = useState('');

  // Folder open/collapsed states
  const [isFolderExpanded, setIsFolderExpanded] = useState(true);

  // Load bookmarks (persisted per space or folder ID)
  const bookmarkKey = activeFolderId ? `avaxa_bookmarks_folder_${activeFolderId}` : `avaxa_bookmarks_${space.id}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(bookmarkKey);
      if (saved) {
        setBookmarks(JSON.parse(saved));
      } else {
        setBookmarks([]);
      }
    } catch (e) {
      setBookmarks([]);
    }
  }, [bookmarkKey]);

  const handleAddBookmarkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookmarkTitle.trim() || !bookmarkUrl.trim()) return;

    let formattedUrl = bookmarkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const newBookmark: BookmarkItem = {
      id: `bookmark-${Date.now()}`,
      title: bookmarkTitle.trim(),
      url: formattedUrl
    };

    const updated = [...bookmarks, newBookmark];
    setBookmarks(updated);
    try {
      localStorage.setItem(bookmarkKey, JSON.stringify(updated));
    } catch (err) {}

    setBookmarkTitle('');
    setBookmarkUrl('');
    setShowAddBookmarkModal(false);
    triggerToast?.('success', 'Bookmark Added', 'Link saved successfully.');
  };

  const handleDeleteBookmark = (id: string) => {
    const updated = bookmarks.filter(b => b.id !== id);
    setBookmarks(updated);
    try {
      localStorage.setItem(bookmarkKey, JSON.stringify(updated));
    } catch (err) {}
    triggerToast?.('info', 'Bookmark Removed', 'Link removed successfully.');
  };

  // Total statistics for this space
  const spaceTasks = useMemo(() => tasks.filter(t => t.spaceId === space.id), [tasks, space.id]);
  const completedTasksCount = useMemo(() => spaceTasks.filter(t => t.status === 'completed').length, [spaceTasks]);
  const totalTasksCount = spaceTasks.length;
  const completionPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  
  // Total Lists & Folders
  const totalListsCount = space.lists?.length || 0;
  const totalFoldersCount = space.folders?.length || 0;

  // Active space theme styling helpers
  const activeColor = space.themeColor || 'indigo';
  const theme = THEME_COLORS[activeColor] || THEME_COLORS.indigo;

  // Derive recent activities from tasks in this space or folder
  const recentActivities = useMemo(() => {
    const folderListIds = space.lists?.filter(l => l.folderId === activeFolderId).map(l => l.id) || [];
    const spaceTasks = tasks.filter(t => t.spaceId === space.id && (!activeFolderId || (t.listId && folderListIds.includes(t.listId))));
    return spaceTasks
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [tasks, space.id, activeFolderId, space.lists]);

  // Quick add task inline to a list
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskListId, setQuickTaskListId] = useState<string | null>(null);

  const handleQuickTaskSubmit = (e: React.FormEvent, listId: string) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    onAddTask({
      title: quickTaskTitle.trim(),
      status: 'todo',
      priority: 'medium',
      spaceId: space.id,
      listId: listId
    });

    setQuickTaskTitle('');
    setQuickTaskListId(null);
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* ── Next-Gen Space Hero Header & Command Stats Bar ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
        {/* Card 1: Core Space Identity & Health Status (Lg Span 5) */}
        <div className="md:col-span-5 bg-white/80 dark:bg-[#07080c]/90 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 flex items-center gap-5 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300 shadow-3xs backdrop-blur-xl">
          <div className={`absolute -right-16 -top-16 w-40 h-40 rounded-full bg-gradient-to-br ${theme.gradient} opacity-10 blur-2xl group-hover:scale-125 transition-transform duration-500`} />
          
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-display shadow-sm relative overflow-hidden bg-slate-50 dark:bg-[#0d0e15] border border-slate-200/50 dark:border-slate-800 shrink-0`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${theme.gradient}`} />
            {space.emoji || '📁'}
          </div>

          <div className="min-w-0 flex-1 space-y-2 text-left">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-850 dark:text-slate-100 font-sans tracking-tight truncate">{space.name}</h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                On Track
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-slate-100/70 dark:bg-[#0d0e15] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
                {totalListsCount} {totalListsCount === 1 ? (locale === 'vi' ? 'Danh sách' : 'List') : (locale === 'vi' ? 'Danh sách' : 'Lists')}
              </span>
              {totalFoldersCount > 0 && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-slate-100/70 dark:bg-[#0d0e15] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800">
                  {totalFoldersCount} {totalFoldersCount === 1 ? (locale === 'vi' ? 'Thư mục' : 'Folder') : (locale === 'vi' ? 'Thư mục' : 'Folders')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Space Radial Completion Analytics (Lg Span 4) */}
        <div className="md:col-span-4 bg-white/80 dark:bg-[#07080c]/90 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-3xs flex items-center justify-between relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300 backdrop-blur-xl">
          <div className="space-y-1.5 text-left">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{locale === 'vi' ? 'Tiến độ hoàn thành' : 'Space Velocity'}</h4>
            <div className="space-y-0.5">
              <span className="text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">{completionPercentage}%</span>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold">
                {locale === 'vi' ? `${completedTasksCount} / ${totalTasksCount} việc hoàn thành` : `${completedTasksCount} / ${totalTasksCount} tasks completed`}
              </p>
            </div>
          </div>
          
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="26" className="stroke-slate-100 dark:stroke-slate-800/80 fill-none" strokeWidth="5" />
              <motion.circle
                cx="32" cy="32" r="26"
                stroke={theme.accent}
                className="fill-none"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 26}
                initial={{ strokeDashoffset: 2 * Math.PI * 26 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 26 - (completionPercentage / 100) * (2 * Math.PI * 26) }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" style={{ color: theme.accent }} />
            </div>
          </div>
        </div>

        {/* Card 3: Team OS Member Presence Hub (Lg Span 3) */}
        <div className="md:col-span-3 bg-white/80 dark:bg-[#07080c]/90 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-3xs flex flex-col justify-between gap-3 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300 text-left backdrop-blur-xl">
          <div className="space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{locale === 'vi' ? 'Đội ngũ tham gia' : 'Space Team'}</h4>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold">
              {locale === 'vi' ? `${members.length} thành viên đang hoạt động` : `${members.length} active space members`}
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center -space-x-2.5 overflow-hidden">
              {members.slice(0, 5).map(m => (
                <SignedImage
                  key={m.id}
                  filePath={m.avatar}
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-[#07080c] object-cover hover:scale-110 hover:z-10 transition-all cursor-pointer shadow-sm"
                  alt={m.name}
                  title={`Xem hồ sơ của ${m.name}`}
                />
              ))}
              {members.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#0d0e15] border-2 border-white dark:border-[#07080c] flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-slate-300 shrink-0">
                  +{members.length - 5}
                </div>
              )}
            </div>
            
            <button 
              onClick={onAddList}
              className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 border border-indigo-200/50 dark:border-indigo-500/30 transition-all cursor-pointer"
              title="Thêm danh sách"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 3-COLUMN COMMAND MATRIX LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* COL 1: Folders & Work Lists Tree (Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/80 dark:bg-[#07080c]/90 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-5 shadow-3xs text-left backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                  {locale === 'vi' ? 'Cấu trúc Work Matrix' : 'Work Matrix & Lists'}
                </h3>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={onAddFolder}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  title="Thêm thư mục"
                >
                  <Folder className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onAddList}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  title="Thêm danh sách"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Folders List Tree */}
            <div className="space-y-3">
              {space.folders?.map(folder => {
                const folderLists = space.lists?.filter(l => l.folderId === folder.id) || [];
                const folderListIds = folderLists.map(l => l.id);
                const folderTasks = tasks.filter(t => t.listId && folderListIds.includes(t.listId));
                const folderCompletedCount = folderTasks.filter(t => t.status === 'completed').length;
                const folderTotalCount = folderTasks.length;
                const folderProgressPct = folderTotalCount > 0 ? Math.round((folderCompletedCount / folderTotalCount) * 100) : 0;

                return (
                  <div 
                    key={folder.id} 
                    className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0d0e15]/90 hover:border-indigo-500/30 transition-all cursor-pointer text-left space-y-3 group"
                    onClick={() => {
                      if (folderLists.length > 0) onOpenList(folderLists[0].id);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Folder className="w-4 h-4 shrink-0 text-indigo-500" style={{ color: folder.color || '#6366f1' }} />
                        <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{folder.name}</span>
                      </div>
                      <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-lg bg-slate-200/50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {folderLists.length} Lists
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-extrabold text-slate-400 dark:text-slate-500">
                        <span>Tiến độ hoàn thành</span>
                        <span>{folderProgressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                          style={{ width: `${folderProgressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Lists direct under space */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block px-1">
                  Danh sách chính ({space.lists.length})
                </span>
                
                {space.lists.map(list => {
                  const listTasks = tasks.filter(t => t.listId === list.id);
                  const totalCount = listTasks.length;
                  const completedCount = listTasks.filter(t => t.status === 'completed').length;

                  return (
                    <div
                      key={list.id}
                      onClick={() => onOpenList(list.id)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-800 bg-white/50 dark:bg-[#0d0e15]/50 hover:bg-white dark:hover:bg-[#0d0e15] transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-3xs" style={{ backgroundColor: (list as any).color || '#6366f1' }} />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {list.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9.5px] font-mono font-bold text-slate-400 dark:text-slate-500">
                          {completedCount}/{totalCount}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-350 dark:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* COL 2: Workspace Pulse & Recent Activity & Docs (Span 5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Recent Activity Card */}
          <div className="bg-white/80 dark:bg-[#07080c]/90 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-5 shadow-3xs text-left backdrop-blur-xl space-y-4">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>{locale === 'vi' ? 'Hoạt động & Nhật ký nhóm' : 'Recent Activity Stream'}</span>
            </h3>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto custom-scrollbar">
              {recentActivities.map(task => {
                const listName = space.lists.find(l => l.id === task.listId)?.name || 'Space';
                return (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/60 dark:bg-[#0d0e15]/80 hover:bg-white dark:hover:bg-[#0d0e15] border border-slate-100/80 dark:border-slate-800/60 transition-all cursor-pointer group shadow-3xs"
                    onClick={() => onOpenList(task.listId || '')}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 shrink-0">
                        <List className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{task.title}</p>
                        <p className="text-[9.5px] text-slate-400 dark:text-slate-500 mt-0.5 truncate font-semibold">{listName} • {space.name}</p>
                      </div>
                    </div>
                    
                    <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider shrink-0 ${
                      task.status === 'completed' 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400' 
                        : 'bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:text-indigo-400'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                );
              })}
              {recentActivities.length === 0 && (
                <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl bg-slate-50/20 dark:bg-slate-950/10">
                  <Clock className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-80 animate-pulse" />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold">{locale === 'vi' ? 'Không có hoạt động gần đây' : 'No recent activities in this space'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Space Documents Hub Card */}
          <div className="bg-white/80 dark:bg-[#07080c]/90 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-5 shadow-3xs text-left backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>{locale === 'vi' ? 'Kho Tài Liệu Space' : 'Space Documents'}</span>
              </h3>
              <button
                onClick={onAddDoc}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {docs.filter(d => d.spaceId === space.id && (!activeFolderId || d.folderId === activeFolderId)).map(doc => (
                <div 
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0d0e15]/80 hover:border-indigo-500/30 transition-all cursor-pointer text-left group"
                  onClick={() => onOpenDoc?.(doc.id)}
                >
                  <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                    <span className="text-sm shrink-0">📄</span>
                    <span className="truncate">{doc.title}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>
              ))}

              {docs.filter(d => d.spaceId === space.id && (!activeFolderId || d.folderId === activeFolderId)).length === 0 && (
                <div className="text-center py-6 flex flex-col items-center justify-center bg-slate-50/20 dark:bg-slate-950/10 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl">
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold mb-3">
                    {locale === 'vi' ? 'Chưa có tài liệu nào trong Space này.' : 'There are no Docs in this location yet.'}
                  </p>
                  <button 
                    onClick={onAddDoc}
                    className="px-3.5 py-1.5 bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 text-indigo-400 text-[10px] font-black rounded-xl transition-all cursor-pointer"
                  >
                    + Tạo tài liệu
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COL 3: Pinboard, Bookmarks & Quick Scratchpad (Span 3) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Bookmarks Pinboard */}
          <div className="bg-white/80 dark:bg-[#07080c]/90 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-5 shadow-3xs text-left backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>{locale === 'vi' ? 'Liên kết ghim' : 'Space Pinboard'}</span>
              </h3>
              <button
                onClick={() => setShowAddBookmarkModal(true)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {bookmarks.map(item => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0d0e15]/80 hover:border-indigo-500/30 transition-all group"
                >
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 truncate text-left"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </a>
                  
                  <button
                    onClick={() => handleDeleteBookmark(item.id)}
                    className="p-1 hover:bg-rose-50 dark:hover:bg-rose-955/20 text-slate-400 hover:text-rose-500 rounded-lg shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {bookmarks.length === 0 && (
                <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl bg-slate-50/20 dark:bg-slate-950/10">
                  <p className="text-[10.5px] text-slate-400 dark:text-slate-500 font-semibold mb-3">
                    {locale === 'vi' ? 'Lưu trữ liên kết tài nguyên web.' : 'Pin URLs and web resources.'}
                  </p>
                  <button 
                    onClick={() => setShowAddBookmarkModal(true)}
                    className="px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 text-indigo-400 text-[10px] font-black rounded-xl transition-all cursor-pointer"
                  >
                    + Ghim liên kết
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lists Table Grid (Bottom Section) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 shadow-3xs overflow-hidden relative z-10 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {locale === 'vi' ? 'Danh sách công việc' : 'Lists'}
          </h3>
          <button 
            onClick={onAddList}
            className="py-1.5 px-3.5 border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-655 dark:text-slate-355 hover:bg-slate-50 dark:hover:bg-slate-855 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-3xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{locale === 'vi' ? 'Tạo danh sách' : 'Create List'}</span>
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[10px] font-black text-slate-400 dark:text-slate-505 uppercase tracking-wider">
                <th className="pb-3 w-1/3 pl-2">{locale === 'vi' ? 'Tên danh sách' : 'Name'}</th>
                <th className="pb-3 text-center w-16">{locale === 'vi' ? 'Màu' : 'Color'}</th>
                <th className="pb-3 w-40">{locale === 'vi' ? 'Tiến độ' : 'Progress'}</th>
                <th className="pb-3 text-center w-16" title={locale === 'vi' ? 'Bắt đầu' : 'Start Date'}>
                  <Calendar className="w-3.5 h-3.5 mx-auto text-slate-400" />
                </th>
                <th className="pb-3 text-center w-16" title={locale === 'vi' ? 'Hạn chót' : 'End Date'}>
                  <Calendar className="w-3.5 h-3.5 mx-auto text-slate-400" />
                </th>
                <th className="pb-3 text-center w-16" title={locale === 'vi' ? 'Độ ưu tiên' : 'Priority'}>
                  <Flag className="w-3.5 h-3.5 mx-auto text-slate-400" />
                </th>
                <th className="pb-3 text-center w-16" title={locale === 'vi' ? 'Phân công' : 'Assignees'}>
                  <UserIcon className="w-3.5 h-3.5 mx-auto text-slate-400" />
                </th>
                <th className="pb-3 text-right w-16 pr-2" title="Add Action">
                  <Plus className="w-3.5 h-3.5 ml-auto text-slate-400" />
                </th>
              </tr>
            </thead>
            <tbody>
              {space.lists.filter(l => !activeFolderId || l.folderId === activeFolderId).map(list => {
                const listTasks = tasks.filter(t => t.listId === list.id);
                const totalCount = listTasks.length;
                const completedCount = listTasks.filter(t => t.status === 'completed').length;
                const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                const listAssigneeIds = Array.from(new Set(listTasks.map(t => t.assigneeId).filter(Boolean)));
                const listOwners = members.filter(m => listAssigneeIds.includes(m.id === 'user' ? 'user' : m.id));

                let earliest: Date | null = null;
                let latest: Date | null = null;
                listTasks.forEach(t => {
                  if (t.startDate) {
                    const d = new Date(t.startDate);
                    if (!isNaN(d.getTime())) {
                      if (!earliest || d < earliest) earliest = d;
                    }
                  }
                  if (t.dueDate) {
                    const d = new Date(t.dueDate);
                    if (!isNaN(d.getTime())) {
                      if (!latest || d > latest) latest = d;
                      if (!earliest || d < earliest) earliest = d;
                    }
                  }
                });

                const weight = { urgent: 4, high: 3, medium: 2, low: 1 };
                let highestPrio: Priority | null = null;
                let maxWeight = 0;
                listTasks.forEach(t => {
                  const w = weight[t.priority] || 0;
                  if (w > maxWeight) {
                    maxWeight = w;
                    highestPrio = t.priority;
                  }
                });

                const formatDate = (date: Date | null) => {
                  if (!date) return '-';
                  return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric' });
                };

                const themeColors: Record<string, string> = {
                  indigo: 'bg-[#7B61FF]',
                  rose: 'bg-[#FF3366]',
                  sky: 'bg-[#33D1FF]',
                  emerald: 'bg-[#10b981]',
                  amber: 'bg-[#f59e0b]',
                  sunset: 'bg-[#f97316]'
                };
                const dotColorClass = themeColors[space.themeColor || 'indigo'] || 'bg-[#7B61FF]';

                return (
                  <tr 
                    key={list.id} 
                    className="border-b border-slate-100/60 dark:border-slate-800/40 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all text-slate-700 dark:text-slate-300 align-middle group/row"
                  >
                    <td className="py-4 pl-2 text-left">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 dark:bg-slate-950 text-slate-550 border border-slate-100 dark:border-slate-850 rounded-xl">
                          <List className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <button 
                          onClick={() => onOpenList(list.id)}
                          className="font-bold text-xs hover:underline text-left text-slate-800 dark:text-slate-100 cursor-pointer"
                        >
                          {list.name}
                        </button>
                      </div>
                    </td>
                    
                    <td className="py-4 text-center">
                      <div className={`inline-block w-2.5 h-2.5 rounded-full ${dotColorClass} shadow-2xs`} />
                    </td>

                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-28 bg-slate-105 dark:bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-850 p-0.5">
                          <div 
                            className="h-full rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min(100, progressPct)}%`,
                              backgroundColor: theme.accent
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 font-mono">{completedCount}/{totalCount}</span>
                      </div>
                    </td>

                    <td className="py-4 text-center">
                      {earliest ? (
                        <span className="text-[10px] font-bold text-slate-655 dark:text-slate-355 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800/80 font-mono">
                          {formatDate(earliest)}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 text-xs font-bold">-</span>
                      )}
                    </td>

                    <td className="py-4 text-center">
                      {latest ? (
                        <span className="text-[10px] font-bold text-slate-655 dark:text-slate-355 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800/80 font-mono">
                          {formatDate(latest)}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 text-xs font-bold">-</span>
                      )}
                    </td>

                    <td className="py-4 text-center">
                      {highestPrio ? (() => {
                        const prioColors: Record<Priority, string> = {
                          urgent: 'text-rose-500 bg-rose-50/50 dark:bg-rose-955/20 border-rose-100 dark:border-rose-900/30',
                          high: 'text-amber-500 bg-amber-50/50 dark:bg-amber-955/20 border-amber-100 dark:border-amber-900/30',
                          medium: 'text-blue-505 bg-blue-50/50 dark:bg-blue-955/20 border-blue-100 dark:border-blue-900/30',
                          low: 'text-slate-450 bg-slate-50/50 dark:bg-slate-855 border-slate-200/50 dark:border-slate-800'
                        };
                        const flagColorClass = prioColors[highestPrio] || prioColors.low;
                        return (
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${flagColorClass}`}>
                            <Flag className="w-2.5 h-2.5 fill-currentColor" />
                            <span>{highestPrio}</span>
                          </div>
                        );
                      })() : (
                        <span className="text-slate-300 dark:text-slate-700 text-xs font-bold">-</span>
                      )}
                    </td>

                    <td className="py-4 text-center">
                      <div className="flex items-center justify-center -space-x-2 overflow-hidden">
                        {listOwners.slice(0, 3).map(owner => (
                          <SignedImage 
                            key={owner.id}
                            filePath={owner.avatar}
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                            alt={owner.name}
                          />
                        ))}
                        {listOwners.length === 0 && (
                          <button className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-300 hover:text-slate-500 transition-colors flex mx-auto">
                            <UserIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-4 text-right pr-2">
                      {quickTaskListId === list.id ? (
                        <form 
                          onSubmit={(e) => handleQuickTaskSubmit(e, list.id)}
                          className="flex items-center gap-1.5 justify-end"
                        >
                          <input 
                            type="text"
                            required
                            autoFocus
                            placeholder={locale === 'vi' ? 'Thêm việc...' : 'Add task...'}
                            value={quickTaskTitle}
                            onChange={(e) => setQuickTaskTitle(e.target.value)}
                            className="px-2.5 py-1.5 text-[11px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 outline-none focus:border-indigo-500 font-semibold w-28 text-slate-800 dark:text-slate-100 shadow-3xs"
                          />
                          <button 
                            type="submit"
                            className="p-1.5 text-white rounded-xl cursor-pointer"
                            style={{ backgroundColor: theme.accent }}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setQuickTaskListId(null)}
                            className="text-[10px] text-slate-400 hover:text-slate-655 p-1"
                          >
                            ✕
                          </button>
                        </form>
                      ) : (
                        <button 
                          onClick={() => setQuickTaskListId(list.id)}
                          className="p-2 hover:bg-slate-55 dark:hover:bg-slate-800 rounded-xl text-slate-450 hover:text-slate-700 transition-colors inline-flex border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-3xs hover:-translate-y-0.5 cursor-pointer opacity-0 group-hover/row:opacity-100"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {space.lists.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-slate-400 dark:text-slate-500 italic font-semibold">
                    {locale === 'vi' ? 'Không có danh sách nào trong Space này. Hãy tạo một danh sách mới để bắt đầu.' : 'No lists in this space. Add one to start tracking tasks.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bookmarks Input Modal */}
      {showAddBookmarkModal && (
        <div className="fixed inset-0 z-[140] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-5 shadow-xl relative overflow-hidden">
            {/* Ambient Accent light */}
            <div className={`absolute -right-20 -top-20 w-44 h-44 rounded-full bg-gradient-to-br ${theme.gradient} opacity-5 blur-3xl`} />
            
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-50 tracking-tight">{locale === 'vi' ? 'Thêm liên kết mới' : 'Add Bookmark'}</h4>
              <button 
                onClick={() => setShowAddBookmarkModal(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddBookmarkSubmit} className="space-y-4 relative z-10">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">{locale === 'vi' ? 'Tên liên kết' : 'Link Title'}</label>
                <input 
                  type="text" 
                  required
                  placeholder={locale === 'vi' ? 'Ví dụ: Tài liệu thiết kế Figma' : 'e.g. Figma Design Spec'} 
                  value={bookmarkTitle}
                  onChange={(e) => setBookmarkTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none text-slate-800 dark:text-slate-100 font-semibold"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">{locale === 'vi' ? 'Địa chỉ URL' : 'URL / Link Address'}</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. figma.com/file/..." 
                  value={bookmarkUrl}
                  onChange={(e) => setBookmarkUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none text-slate-800 dark:text-slate-100 font-semibold"
                />
              </div>

              <div className="pt-2 flex gap-3 justify-end">
                <button 
                  type="button"
                  onClick={() => setShowAddBookmarkModal(false)}
                  className="py-2.5 px-4.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {locale === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button 
                  type="submit"
                  className="py-2.5 px-4.5 text-white text-xs font-black rounded-xl shadow-sm hover:shadow cursor-pointer transition-all active:scale-95"
                  style={{ backgroundColor: theme.accent }}
                >
                  {locale === 'vi' ? 'Thêm liên kết' : 'Add Bookmark'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
