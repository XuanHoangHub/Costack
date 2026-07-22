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
      
      {/* ── Bento Stats Strip (Top Header) ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
        {/* Card 1: Core Space Identity (Lg Span 5) */}
        <div className={`md:col-span-5 glass-panel rounded-3xl p-6 flex items-center gap-5 relative overflow-hidden group hover:border-indigo-500/25 transition-all duration-300 shadow-3xs`}>
          <div className={`absolute -right-16 -top-16 w-36 h-36 rounded-full bg-gradient-to-br ${theme.gradient} opacity-5 blur-2xl group-hover:scale-125 transition-transform duration-500`} />
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-display shadow-sm relative overflow-hidden bg-slate-55 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-805 shrink-0`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${theme.gradient}`} />
            {space.emoji || '📁'}
          </div>
          <div className="min-w-0 flex-1 space-y-1.5 text-left">
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 font-sans tracking-tight truncate">{space.name}</h2>
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-850">
                {totalListsCount} {totalListsCount === 1 ? (locale === 'vi' ? 'Danh sách' : 'List') : (locale === 'vi' ? 'Danh sách' : 'Lists')}
              </span>
              {totalFoldersCount > 0 && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-850">
                  {totalFoldersCount} {totalFoldersCount === 1 ? (locale === 'vi' ? 'Thư mục' : 'Folder') : (locale === 'vi' ? 'Thư mục' : 'Folders')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Space Task Completion Analytics (Lg Span 4) */}
        <div className="md:col-span-4 glass-panel rounded-3xl p-6 shadow-3xs flex items-center justify-between relative overflow-hidden group hover:border-indigo-505/25 transition-all duration-300">
          <div className="space-y-1 text-left">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{locale === 'vi' ? 'Tiến độ' : 'Progress'}</h4>
            <div className="space-y-0.5">
              <span className="text-2xl font-black font-mono text-slate-800 dark:text-slate-100 tracking-tight">{completionPercentage}%</span>
              <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium">
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
              <CheckCircle2 className="w-4 h-4" style={{ color: theme.accent }} />
            </div>
          </div>
        </div>

        {/* Card 3: Space Member Presence Hub (Lg Span 3) */}
        <div className="md:col-span-3 glass-panel rounded-3xl p-6 shadow-3xs flex flex-col justify-between gap-4 relative overflow-hidden group hover:border-indigo-505/25 transition-all duration-300 text-left">
          <div className="space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{locale === 'vi' ? 'Thành viên' : 'Team Members'}</h4>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium">
              {locale === 'vi' ? `${members.length} thành viên tham gia` : `${members.length} active space members`}
            </p>
          </div>
          <div className="flex items-center -space-x-2.5 overflow-hidden">
            {members.slice(0, 5).map(m => (
              <SignedImage
                key={m.id}
                filePath={m.avatar}
                className="inline-block h-8 w-8 rounded-full ring-4 ring-white dark:ring-slate-900 object-cover hover:scale-105 hover:z-10 transition-all cursor-pointer"
                alt={m.name}
              />
            ))}
            {members.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-black text-slate-505 shrink-0">
                +{members.length - 5}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upper Grid Layout: Recent, Docs, Bookmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        
        {/* Recent Section */}
        <div className="glass-panel rounded-3xl p-6 shadow-3xs flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-left">
              {locale === 'vi' ? 'Hoạt động gần đây' : 'Recent Activity'}
            </h3>
            
            <div className="space-y-3">
              {recentActivities.map(task => {
                const listName = space.lists.find(l => l.id === task.listId)?.name || 'Space';
                return (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-55 dark:hover:bg-slate-850 border border-slate-100/50 dark:border-slate-800/60 transition-all hover:shadow-2xs cursor-pointer text-left group"
                    onClick={() => onOpenList(task.listId || '')}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 text-indigo-500 group-hover:scale-105 transition-transform shrink-0 shadow-3xs">
                        <List className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{task.title}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate font-semibold">{listName} • {space.name}</p>
                      </div>
                    </div>
                    
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider ${
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
                <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl bg-slate-50/20 dark:bg-slate-950/10">
                  <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-80 animate-pulse" />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold">{locale === 'vi' ? 'Không có hoạt động gần đây' : 'No recent activities in this space'}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Docs Section */}
        <div className="glass-panel rounded-3xl p-6 shadow-3xs flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {locale === 'vi' ? 'Tài liệu' : 'Documents'}
              </h3>
              <button
                onClick={onAddDoc}
                className="p-1.5 hover:bg-slate-55 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title={locale === 'vi' ? 'Thêm tài liệu' : 'Add Document'}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {docs.filter(d => d.spaceId === space.id && (!activeFolderId || d.folderId === activeFolderId)).map(doc => (
                <div 
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/40 hover:bg-slate-55 dark:hover:bg-slate-850 group/item hover:border-indigo-500/20 transition-all hover:shadow-3xs cursor-pointer text-left"
                  onClick={() => onOpenDoc?.(doc.id)}
                >
                  <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-650 dark:hover:text-indigo-400 truncate min-w-0">
                    <span className="text-sm shrink-0">📄</span>
                    <span className="truncate">{doc.title}</span>
                  </div>
                </div>
              ))}

              {docs.filter(d => d.spaceId === space.id && (!activeFolderId || d.folderId === activeFolderId)).length === 0 && (
                <div className="text-center py-8 flex flex-col items-center justify-center bg-slate-50/20 dark:bg-slate-950/10 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl">
                  <svg className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-[200px] leading-relaxed mx-auto font-semibold">
                    {locale === 'vi' ? 'Chưa có tài liệu nào trong Space này.' : 'There are no Docs in this location yet.'}
                  </p>
                  <button 
                    onClick={onAddDoc}
                    className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white text-[10px] font-black rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    {locale === 'vi' ? 'Tạo tài liệu mới' : 'Add a Doc'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bookmarks Section */}
        <div className="glass-panel rounded-3xl p-6 shadow-3xs flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {locale === 'vi' ? 'Liên kết đã lưu' : 'Bookmarks'}
              </h3>
              <button
                onClick={() => setShowAddBookmarkModal(true)}
                className="p-1.5 hover:bg-slate-55 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title={locale === 'vi' ? 'Thêm liên kết' : 'Add Bookmark'}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {bookmarks.map(item => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/40 hover:bg-slate-55 dark:hover:bg-slate-850 group/item hover:border-indigo-500/20 transition-all hover:shadow-3xs"
                >
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-650 dark:hover:text-indigo-400 truncate min-w-0 text-left"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{item.title}</span>
                    <ExternalLink className="w-3 h-3 text-slate-400 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </a>
                  
                  <button
                    onClick={() => handleDeleteBookmark(item.id)}
                    className="p-1 hover:bg-rose-50 dark:hover:bg-rose-955/20 text-slate-400 hover:text-rose-500 rounded-lg shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {bookmarks.length === 0 && (
                <div className="text-center py-8 flex flex-col items-center justify-center bg-slate-50/20 dark:bg-slate-950/10 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl">
                  <svg className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                  </svg>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-[200px] leading-relaxed mx-auto font-semibold">
                    {locale === 'vi' ? 'Lưu trữ tài nguyên web quan trọng để truy cập nhanh chóng.' : 'Bookmarks save URLs and workspace resources from the web.'}
                  </p>
                  <button 
                    onClick={() => setShowAddBookmarkModal(true)}
                    className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white text-[10px] font-black rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    {locale === 'vi' ? 'Thêm liên kết' : 'Add Bookmark'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Folders Section - full width below grid */}
      {!activeFolderId && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 shadow-3xs text-left relative z-10 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4.5 h-4.5 text-slate-400 shrink-0" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {locale === 'vi' ? 'Thư mục' : 'Folders'}
              </h3>
            </div>
            <button 
              onClick={onAddFolder}
              className="p-1.5 hover:bg-slate-55 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title={locale === 'vi' ? 'Tạo thư mục' : 'Create new folder'}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
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
                  className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white/60 dark:bg-slate-950/40 hover:bg-white dark:hover:bg-slate-850 hover:border-indigo-500/20 hover:shadow-md transition-all cursor-pointer text-left space-y-3.5 group relative overflow-hidden"
                  onClick={() => {
                    if (folderLists.length > 0) onOpenList(folderLists[0].id);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center shadow-3xs group-hover:scale-105 transition-transform">
                      <Folder className="w-5 h-5 shrink-0" style={{ color: folder.color || '#6366f1' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate block tracking-tight">{folder.name}</span>
                      <p className="text-[10px] text-slate-400 dark:text-slate-505 font-bold">{folderLists.length} Lists</p>
                    </div>
                  </div>

                  {folderTotalCount > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-[9px] font-extrabold text-slate-400">
                        <span>Progress</span>
                        <span>{folderProgressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden p-0.5 border border-slate-200/20 dark:border-slate-800/30">
                        <div 
                          className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-indigo-500 to-purple-500"
                          style={{ 
                            width: `${folderProgressPct}%`,
                            backgroundImage: folder.color ? `linear-gradient(to right, ${folder.color}, ${folder.color}dd)` : undefined
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-[9px] text-slate-400 dark:text-slate-550 italic pt-1">No tasks in folder</p>
                  )}
                </div>
              );
            })}
            {(!space.folders || space.folders.length === 0) && (
              <div className="col-span-full text-center py-10 text-slate-400 dark:text-slate-500 italic text-xs font-semibold border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/20 dark:bg-slate-950/10">
                {locale === 'vi' ? 'Không có thư mục nào trong Space này.' : 'No folders in this space yet.'}
              </div>
            )}
          </div>
        </div>
      )}

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
