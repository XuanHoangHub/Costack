"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, User, Space, Priority } from '../types';
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
      
      {/* Upper Grid Layout: Recent, Docs, Bookmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-3xs flex flex-col justify-between">
          <div>
            <h3 className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-555 tracking-wider mb-4">
              Recent
            </h3>
            
            <div className="space-y-2.5">
              {recentActivities.map(task => {
                const listName = space.lists.find(l => l.id === task.listId)?.name || 'Space';
                return (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950/20 dark:hover:bg-slate-950/45 border border-slate-150/40 dark:border-slate-800/30 transition-all cursor-pointer text-left"
                    onClick={() => onOpenList(task.listId || '')}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-500 shrink-0">
                        <List className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{task.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{listName} • in {space.name}</p>
                      </div>
                    </div>
                    
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider ${
                      task.status === 'completed' 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                        : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                );
              })}
              {recentActivities.length === 0 && (
                <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <Clock className="w-8 h-8 text-slate-350 dark:text-slate-655 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">No recent activities in this space</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Docs Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-3xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-555 tracking-wider">
                Docs
              </h3>
              <button
                onClick={onAddDoc}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                title="Add Doc"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {docs.filter(d => d.spaceId === space.id && (!activeFolderId || d.folderId === activeFolderId)).map(doc => (
                <div 
                  key={doc.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-150/65 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10 group/item hover:border-indigo-500/30 transition-all cursor-pointer text-left"
                  onClick={() => onOpenDoc?.(doc.id)}
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-355 hover:text-indigo-650 dark:hover:text-indigo-400 truncate min-w-0">
                    <span className="text-sm shrink-0">📄</span>
                    <span className="truncate">{doc.title}</span>
                  </div>
                </div>
              ))}

              {docs.filter(d => d.spaceId === space.id && (!activeFolderId || d.folderId === activeFolderId)).length === 0 && (
                <div className="text-center py-10 flex flex-col items-center justify-center">
                  <div className="relative mb-3">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-850 border border-slate-250/60 dark:border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 shadow-3xs">
                      <span className="text-xl">📄</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-455 max-w-[200px] leading-relaxed mx-auto">
                    There are no Docs in this location yet.
                  </p>
                  <button 
                    onClick={onAddDoc}
                    className="mt-4 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[11px] font-black rounded-xl shadow-xs cursor-pointer transition-colors"
                  >
                    Add a Doc
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bookmarks Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-3xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-555 tracking-wider">
                Bookmarks
              </h3>
              <button
                onClick={() => setShowAddBookmarkModal(true)}
                className="p-1 hover:bg-slate-105 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                title="Add Bookmark"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {bookmarks.map(item => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-150/65 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10 group/item hover:border-indigo-500/30 transition-all"
                >
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-355 hover:text-indigo-650 dark:hover:text-indigo-400 truncate min-w-0 text-left"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{item.title}</span>
                    <ExternalLink className="w-3 h-3 text-slate-400 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </a>
                  
                  <button
                    onClick={() => handleDeleteBookmark(item.id)}
                    className="p-1 hover:bg-rose-50 dark:hover:bg-rose-955/20 text-slate-400 hover:text-rose-550 rounded-lg shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {bookmarks.length === 0 && (
                <div className="text-center py-10 flex flex-col items-center justify-center">
                  <div className="relative mb-3">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-850 border border-slate-250/60 dark:border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 shadow-3xs">
                      <Bookmark className="w-5 h-5" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 bg-slate-200 dark:bg-slate-700 border border-white dark:border-slate-900 rounded-full w-5 h-5 flex items-center justify-center text-[11px] text-slate-655 dark:text-slate-300 font-bold shadow-3xs leading-none">
                      +
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-455 max-w-[200px] leading-relaxed mx-auto">
                    Bookmarks make it easy to save ClickUp items or any URL from around the web.
                  </p>
                  <button 
                    onClick={() => setShowAddBookmarkModal(true)}
                    className="mt-4 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[11px] font-black rounded-xl shadow-xs cursor-pointer transition-colors"
                  >
                    Add Bookmark
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

            {/* Folders Section - full width below grid */}
      {!activeFolderId && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-3xs text-left">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-slate-400 shrink-0" />
              <h3 className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-555 tracking-wider">
                Folders
              </h3>
            </div>
            <button 
              onClick={onAddFolder}
              className="p-1 hover:bg-slate-105 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              title="Create new folder"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {space.folders?.map(folder => {
              const folderLists = space.lists?.filter(l => l.folderId === folder.id) || [];
              return (
                <div 
                  key={folder.id} 
                  className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/10 hover:border-indigo-500/30 transition-all cursor-pointer text-left space-y-2 group"
                  onClick={() => {
                    if (folderLists.length > 0) onOpenList(folderLists[0].id);
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <Folder className="w-5 h-5 shrink-0" style={{ color: folder.color || '#6366f1' }} />
                    <span className="text-xs font-bold text-slate-850 dark:text-slate-255 truncate">{folder.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">{folderLists.length} Lists</p>
                </div>
              );
            })}
            {(!space.folders || space.folders.length === 0) && (
              <div className="col-span-full text-center py-8 text-slate-400 italic text-xs font-medium border border-dashed border-slate-200 dark:border-slate-85b rounded-xl">
                No folders in this space yet.
              </div>
            )}
          </div>
        </div>
      )}  </div>      {/* Lists Table Grid (Bottom Section) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-3xs overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-550 tracking-wider">
            Lists
          </h3>
          <button 
            onClick={onAddList}
            className="py-1.5 px-3 border border-slate-200 dark:border-slate-850 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create List</span>
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-150 dark:border-slate-800/80 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="pb-3 w-1/3">Name</th>
                <th className="pb-3 text-center w-16">Color</th>
                <th className="pb-3 w-40">Progress</th>
                <th className="pb-3 text-center w-16" title="Start Date">
                  <Calendar className="w-3.5 h-3.5 mx-auto text-slate-400" />
                </th>
                <th className="pb-3 text-center w-16" title="End Date">
                  <Calendar className="w-3.5 h-3.5 mx-auto text-slate-400" />
                </th>
                <th className="pb-3 text-center w-16" title="Priority">
                  <Flag className="w-3.5 h-3.5 mx-auto text-slate-400" />
                </th>
                <th className="pb-3 text-center w-16" title="Owner">
                  <UserIcon className="w-3.5 h-3.5 mx-auto text-slate-400" />
                </th>
                <th className="pb-3 text-right w-16" title="Add Action">
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

                // Find owners (unique assignees)
                const listAssigneeIds = Array.from(new Set(listTasks.map(t => t.assigneeId).filter(Boolean)));
                const listOwners = members.filter(m => listAssigneeIds.includes(m.id === 'user' ? 'user' : m.id));

                // Calculate date range of tasks in this list
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

                // Calculate highest priority of tasks in this list
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
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                };

                // Dynamic dot color map based on space theme
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
                    className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/20 dark:hover:bg-slate-900/30 transition-colors text-slate-700 dark:text-slate-355 align-middle"
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-slate-50 dark:bg-slate-955 text-slate-500 border border-slate-200/40 dark:border-slate-800 rounded-lg">
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
                      <div className={`inline-block w-2.5 h-2.5 rounded-full ${dotColorClass} shadow-3xs`} />
                    </td>

                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-28 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/55 p-0.5">
                          <div 
                            className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, progressPct)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-455">{completedCount}/{totalCount}</span>
                      </div>
                    </td>

                    <td className="py-4 text-center">
                      {earliest ? (
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-850 px-2 py-1 rounded-md border border-slate-200/40 dark:border-slate-800/80">
                          {formatDate(earliest)}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 text-xs font-semibold">-</span>
                      )}
                    </td>

                    <td className="py-4 text-center">
                      {latest ? (
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-850 px-2 py-1 rounded-md border border-slate-200/40 dark:border-slate-800/80">
                          {formatDate(latest)}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 text-xs font-semibold">-</span>
                      )}
                    </td>

                    <td className="py-4 text-center">
                      {highestPrio ? (() => {
                        const prioColors: Record<Priority, string> = {
                          urgent: 'text-rose-500 bg-rose-50 dark:bg-rose-955/20 border-rose-100 dark:border-rose-900/30',
                          high: 'text-amber-500 bg-amber-50 dark:bg-amber-955/20 border-amber-100 dark:border-amber-900/30',
                          medium: 'text-blue-500 bg-blue-50 dark:bg-blue-955/20 border-blue-100 dark:border-blue-900/30',
                          low: 'text-slate-400 bg-slate-50 dark:bg-slate-855 border-slate-200/50 dark:border-slate-800'
                        };
                        const flagColorClass = prioColors[highestPrio] || prioColors.low;
                        return (
                          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${flagColorClass}`}>
                            <Flag className="w-2.5 h-2.5 fill-currentColor" />
                            <span>{highestPrio}</span>
                          </div>
                        );
                      })() : (
                        <span className="text-slate-300 dark:text-slate-700 text-xs font-semibold">-</span>
                      )}
                    </td>

                    <td className="py-4 text-center">
                      <div className="flex items-center justify-center -space-x-1.5 overflow-hidden">
                        {listOwners.slice(0, 3).map(owner => (
                          <SignedImage 
                            key={owner.id}
                            filePath={owner.avatar}
                            className="inline-block h-5.5 w-5.5 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                            alt={owner.name}
                            fallback={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(owner.name)}`}
                          />
                        ))}
                        {listOwners.length === 0 && (
                          <button className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md text-slate-300 hover:text-slate-500 transition-colors flex mx-auto">
                            <UserIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-4 text-right">
                      {quickTaskListId === list.id ? (
                        <form 
                          onSubmit={(e) => handleQuickTaskSubmit(e, list.id)}
                          className="flex items-center gap-1.5 justify-end"
                        >
                          <input 
                            type="text"
                            required
                            autoFocus
                            placeholder="Add task..."
                            value={quickTaskTitle}
                            onChange={(e) => setQuickTaskTitle(e.target.value)}
                            className="px-2 py-1 text-[11px] rounded-lg border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none focus:border-indigo-500 font-semibold w-24"
                          />
                          <button 
                            type="submit"
                            className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setQuickTaskListId(null)}
                            className="text-[10px] text-slate-400 hover:text-slate-600"
                          >
                            ✕
                          </button>
                        </form>
                      ) : (
                        <button 
                          onClick={() => setQuickTaskListId(list.id)}
                          className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 transition-colors inline-flex border border-transparent hover:border-slate-200/50"
                          title="Add task quickly"
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
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-400 italic font-medium">
                    No lists in this space. Add one to start tracking tasks.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bookmarks Input Modal */}
      {showAddBookmarkModal && (
        <div className="fixed inset-0 z-[140] bg-slate-955/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-50">Add Bookmark</h4>
              <button 
                onClick={() => setShowAddBookmarkModal(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-505 cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddBookmarkSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Link Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Design Spec Document" 
                  value={bookmarkTitle}
                  onChange={(e) => setBookmarkTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none text-slate-800 dark:text-slate-100 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">URL / Link Address</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. docs.google.com/..." 
                  value={bookmarkUrl}
                  onChange={(e) => setBookmarkUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none text-slate-800 dark:text-slate-100 font-semibold"
                />
              </div>

              <div className="pt-2 flex gap-3 justify-end">
                <button 
                  type="button"
                  onClick={() => setShowAddBookmarkModal(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-sm cursor-pointer"
                >
                  Add Bookmark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
