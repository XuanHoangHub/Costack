"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Space, Task, User } from '../types';
import Whiteboard from './Whiteboard';
import { 
  Plus, Search, Pencil, Trash2, Check, X, LayoutGrid,
  Sparkles, ChevronRight, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

interface WhiteboardHubProps {
  spaces: Space[];
  onSaveSpaces: (newSpaces: Space[]) => void;
  activeWorkspaceId: string;
  members: User[];
  tasks: Task[];
  isOffline: boolean;
  currentUser?: any;
  onUpgradePremium?: () => void;
  onAddSyncLog: (action: string) => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress' | 'comments'>) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
}

export default function WhiteboardHub({
  spaces,
  onSaveSpaces,
  activeWorkspaceId,
  members,
  tasks,
  isOffline,
  currentUser,
  onUpgradePremium,
  onAddSyncLog,
  onAddTask,
  triggerToast
}: WhiteboardHubProps) {
  const [activeWhiteboardId, setActiveWhiteboardId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // Create modal form states
  const [newWbName, setNewWbName] = useState('');
  const [newWbSpaceId, setNewWbSpaceId] = useState('');

  // Gather all whiteboards from all spaces in the active workspace
  const allWhiteboards = useMemo(() => {
    const wsSpaces = spaces.filter(s => s.workspaceId === activeWorkspaceId);
    const wbs: { id: string; name: string; spaceId: string; spaceName: string; spaceEmoji: string; folderId?: string }[] = [];
    wsSpaces.forEach(space => {
      (space.whiteboards || []).forEach(wb => {
        wbs.push({
          id: wb.id,
          name: wb.name,
          spaceId: space.id,
          spaceName: space.name,
          spaceEmoji: space.emoji || 'Package',
          folderId: wb.folderId
        });
      });
    });
    return wbs;
  }, [spaces, activeWorkspaceId]);

  // Active workspace spaces for the create modal dropdown
  const workspaceSpaces = useMemo(() => {
    return spaces.filter(s => s.workspaceId === activeWorkspaceId);
  }, [spaces, activeWorkspaceId]);

  // Filtered whiteboards by search
  const filteredWhiteboards = useMemo(() => {
    if (!searchQuery.trim()) return allWhiteboards;
    const q = searchQuery.toLowerCase();
    return allWhiteboards.filter(wb =>
      wb.name.toLowerCase().includes(q) || wb.spaceName.toLowerCase().includes(q)
    );
  }, [allWhiteboards, searchQuery]);

  // Selected whiteboard meta
  const activeWb = useMemo(() => {
    return allWhiteboards.find(wb => wb.id === activeWhiteboardId) || null;
  }, [allWhiteboards, activeWhiteboardId]);

  useEffect(() => {
    if (!activeWhiteboardId && allWhiteboards.length > 0) {
      setActiveWhiteboardId(allWhiteboards[0].id);
    }
  }, [activeWhiteboardId, allWhiteboards]);

  // Create whiteboard
  const handleCreate = () => {
    if (!newWbName.trim() || !newWbSpaceId) return;
    const newWbId = `wb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const updated = spaces.map(s => {
      if (s.id === newWbSpaceId) {
        return {
          ...s,
          whiteboards: [...(s.whiteboards || []), { id: newWbId, name: newWbName.trim() }]
        };
      }
      return s;
    });
    onSaveSpaces(updated);
    setActiveWhiteboardId(newWbId);
    setIsSidebarExpanded(false);
    setShowCreateModal(false);
    setNewWbName('');
    setNewWbSpaceId('');
    onAddSyncLog(`Created whiteboard "${newWbName.trim()}"`);
    if (triggerToast) triggerToast('success', 'Whiteboard Created', `Created "${newWbName.trim()}" successfully.`);
  };

  // Rename whiteboard
  const handleRename = (wbId: string) => {
    if (!renameValue.trim()) return;
    const updated = spaces.map(s => ({
      ...s,
      whiteboards: (s.whiteboards || []).map(wb =>
        wb.id === wbId ? { ...wb, name: renameValue.trim() } : wb
      )
    }));
    onSaveSpaces(updated);
    setRenamingId(null);
    setRenameValue('');
    onAddSyncLog(`Renamed whiteboard to "${renameValue.trim()}"`);
  };

  // Delete whiteboard
  const handleDelete = (wbId: string) => {
    const updated = spaces.map(s => ({
      ...s,
      whiteboards: (s.whiteboards || []).filter(wb => wb.id !== wbId)
    }));
    onSaveSpaces(updated);
    if (activeWhiteboardId === wbId) setActiveWhiteboardId(null);
    onAddSyncLog(`Deleted whiteboard`);
    if (triggerToast) triggerToast('success', 'Whiteboard Deleted', 'Whiteboard removed successfully.');
  };

  return (
    <div className="w-full h-[calc(100dvh-140px)] min-h-[620px] flex flex-col md:flex-row gap-0 bg-white dark:bg-slate-900 rounded-[22px] border border-slate-200/80 dark:border-slate-800 shadow-[0_14px_40px_rgba(15,23,42,0.08)] overflow-hidden">

      {/* Left Column: Whiteboard List Sidebar */}
      <div className={`${isSidebarExpanded ? 'w-[250px]' : 'w-[68px]'} border-r border-slate-200/80 dark:border-slate-800/80 bg-[#f7f7f9] dark:bg-slate-950 flex flex-col shrink-0 select-none transition-[width] duration-200 ${
        activeWb ? 'hidden md:flex' : 'flex'
      }`}>

        {/* Header */}
        <div className={`${isSidebarExpanded ? 'p-4' : 'p-3'} border-b border-slate-200/70 dark:border-slate-800/80 space-y-3`}>
          <div className="flex items-center justify-between">
            <div className={isSidebarExpanded ? 'block' : 'hidden'}>
              <h2 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Whiteboards</h2>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">Động não và vẽ lưu đồ trực quan</span>
            </div>
            <div className={`flex ${isSidebarExpanded ? 'gap-1' : 'w-full flex-col gap-2'}`}>
              <button
                onClick={() => setIsSidebarExpanded((value) => !value)}
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"
                title={isSidebarExpanded ? 'Thu gọn danh sách' : 'Mở danh sách bảng'}
              >
                {isSidebarExpanded ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  setNewWbSpaceId(workspaceSpaces[0]?.id || '');
                  setShowCreateModal(true);
                }}
                className="p-1.5 bg-indigo-600 text-white rounded-lg cursor-pointer transition-colors shadow-sm hover:bg-indigo-700"
                title="Tạo bảng trắng"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className={`${isSidebarExpanded ? 'flex' : 'hidden'} items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl px-2.5 py-2 shadow-sm`}>
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Tìm bảng trắng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-[11px] font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none"
            />
          </div>
        </div>

        {/* Whiteboard List */}
        <div className={`flex-1 overflow-y-auto ${isSidebarExpanded ? 'p-3' : 'p-2'} space-y-2 custom-scrollbar`}>
          {filteredWhiteboards.map(wb => {
            const isActive = activeWhiteboardId === wb.id;
            const isRenaming = renamingId === wb.id;

            return (
              <div
                key={wb.id}
                onClick={() => {
                  if (!isRenaming) {
                    setActiveWhiteboardId(wb.id);
                    setIsSidebarExpanded(false);
                  }
                }}
                title={!isSidebarExpanded ? wb.name : undefined}
                className={`group ${isSidebarExpanded ? 'p-2.5' : 'p-2 justify-center'} rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  isActive
                    ? 'bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/30 shadow-xs'
                    : 'bg-white dark:bg-slate-900/40 border-slate-150/40 dark:border-slate-800/40 hover:bg-slate-50/80 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm ${
                    isActive ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-slate-100 dark:bg-slate-800'
                  }`}>
                    {wb.spaceEmoji}
                  </div>
                  <div className={`${isSidebarExpanded ? 'block' : 'hidden'} min-w-0 flex-1`}>
                    {isRenaming ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRename(wb.id); if (e.key === 'Escape') setRenamingId(null); }}
                          autoFocus
                          className="w-full px-1.5 py-0.5 text-[11px] font-bold rounded-md border border-indigo-300 outline-none bg-white dark:bg-slate-900"
                        />
                        <button onClick={() => handleRename(wb.id)} className="p-0.5 text-emerald-500 hover:bg-emerald-50 rounded">
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={() => setRenamingId(null)} className="p-0.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={`text-[11px] font-bold truncate block ${isActive ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {wb.name}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium truncate block">
                          {wb.spaceName}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Hover actions */}
                {!isRenaming && isSidebarExpanded && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setRenamingId(wb.id);
                        setRenameValue(wb.name);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Đổi tên"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(wb.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty state */}
          {filteredWhiteboards.length === 0 && isSidebarExpanded && (
            <div className="flex flex-col items-center justify-center py-14 text-center space-y-2.5">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/40 flex items-center justify-center text-slate-400 shadow-3xs">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Chưa có bảng trắng</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Nhấn + để tạo bảng trắng đầu tiên.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`${isSidebarExpanded ? 'block' : 'hidden'} p-3 border-t border-slate-200/40 dark:border-slate-800/80 text-[10px] text-slate-400 dark:text-slate-500 font-mono`}>
          {allWhiteboards.length} whiteboard{allWhiteboards.length !== 1 ? 's' : ''} total
        </div>
      </div>

      {/* Right Column: Canvas Pane */}
      <div className={`flex-1 min-w-0 flex flex-col ${activeWb ? 'flex' : 'hidden md:flex'}`}>
        {activeWb ? (
          <div className="w-full h-full flex flex-col min-h-0">
            {/* Canvas Header */}
            <div className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-slate-200/40 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 select-none shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm">{activeWb.spaceEmoji}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{activeWb.spaceName}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{activeWb.name}</span>
                  </div>
                </div>
              </div>
              {/* Mobile back button */}
              <button
                onClick={() => setActiveWhiteboardId(null)}
                className="md:hidden px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                ← Quay lại
              </button>
            </div>

            {/* Whiteboard Canvas */}
            <div className="flex-1 min-h-0 relative">
              <Whiteboard
                members={members}
                isOffline={isOffline}
                onAddSyncLog={onAddSyncLog}
                whiteboardId={activeWb.id}
                onAddTask={onAddTask}
                tasks={tasks}
                currentUser={currentUser}
                onUpgradePremium={onUpgradePremium}
                boardName={activeWb.name}
                spaceName={activeWb.spaceName}
              />
            </div>
          </div>
        ) : (
          /* Empty placeholder */
          <div className="flex flex-col items-center justify-center h-full p-10 text-center space-y-3.5 select-none">
            <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200/40 flex items-center justify-center shadow-3xs">
              <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
            </div>
            <div className="max-w-xs">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Chọn bảng trắng</p>
              <p className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                Chọn bảng trắng trong danh sách hoặc tạo mới để bắt đầu động não với hình khối, ghi chú và lưu đồ hỗ trợ bởi AI.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Whiteboard Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800/80 cursor-default"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="font-display font-extrabold text-slate-800 dark:text-slate-50 text-base">Tạo bảng trắng mới</span>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Tên bảng trắng</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Lưu đồ lập kế hoạch Sprint"
                    value={newWbName}
                    onChange={(e) => setNewWbName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                    autoFocus
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Khu vực đích</label>
                  <select
                    value={newWbSpaceId}
                    onChange={(e) => setNewWbSpaceId(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none cursor-pointer"
                  >
                    <option value="">Chọn khu vực...</option>
                    {workspaceSpaces.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 flex gap-3 justify-end border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newWbName.trim() || !newWbSpaceId}
                    className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Tạo bảng trắng
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
