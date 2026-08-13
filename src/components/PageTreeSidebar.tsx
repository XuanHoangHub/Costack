"use client";

import React, { useState, useMemo } from 'react';
import { 
  FileText, Plus, ChevronRight, ChevronDown, Trash2, Star, 
  MoreVertical, Copy, RefreshCw, Archive, Search, Globe2, LockKeyhole,
  SlidersHorizontal, Sparkles, FolderPlus, FilePlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { renderSpaceIcon } from './EmojiIconPicker';

interface PageTreeDoc {
  id: string;
  title: string;
  parent_document_id?: string | null;
  workspace_id: string;
  icon?: string | null;
  cover_url?: string | null;
  is_archived: boolean;
  is_published: boolean;
  is_favorite?: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  content?: unknown;
}

interface PageTreeSidebarProps {
  documents: PageTreeDoc[];
  activeDocId: string;
  onSelectDoc: (id: string) => void;
  onAddDoc: (parentId?: string) => void;
  onDuplicateDoc: (doc: PageTreeDoc) => void;
  onUpdateDoc: (id: string, updates: Partial<PageTreeDoc>) => void;
  onDeleteDoc: (id: string) => void;
  workspaceId: string;
}

export default function PageTreeSidebar({
  documents,
  activeDocId,
  onSelectDoc,
  onAddDoc,
  onDuplicateDoc,
  onUpdateDoc,
  onDeleteDoc,
  workspaceId
}: PageTreeSidebarProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [scope, setScope] = useState<'all' | 'favorites' | 'published'>('all');

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter archived vs active
  const activeDocs = useMemo(() => {
    return documents
      .filter(d => !d.is_archived && d.workspace_id === workspaceId)
      .filter(d => scope === 'favorites' ? d.is_favorite : true)
      .filter(d => scope === 'published' ? d.is_published : true)
      .sort((a, b) => {
        if (Boolean(a.is_favorite) !== Boolean(b.is_favorite)) return a.is_favorite ? -1 : 1;
        return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
      });
  }, [documents, scope, workspaceId]);

  const archivedDocs = useMemo(() => {
    return documents.filter(d => d.is_archived && d.workspace_id === workspaceId);
  }, [documents, workspaceId]);

  // Build tree index of documents for fast lookup
  const docsByParent = useMemo(() => {
    const map: Record<string, PageTreeDoc[]> = {};
    activeDocs.forEach(doc => {
      const pid = doc.parent_document_id || 'root';
      if (!map[pid]) map[pid] = [];
      map[pid].push(doc);
    });
    return map;
  }, [activeDocs]);

  // Root level documents or search result
  const rootDocs = useMemo(() => {
    if (searchQuery.trim() !== '') {
      const normalizedQuery = searchQuery.trim().toLocaleLowerCase('vi');
      return activeDocs.filter(d => {
        const searchableContent = typeof d.content === 'string' ? d.content : JSON.stringify(d.content || '');
        return `${d.title} ${searchableContent}`.toLocaleLowerCase('vi').includes(normalizedQuery);
      });
    }
    return docsByParent['root'] || [];
  }, [docsByParent, searchQuery, activeDocs]);

  // Recursive node renderer
  const renderTreeNode = (doc: PageTreeDoc, level: number = 0) => {
    const children = docsByParent[doc.id] || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds[doc.id] || false;
    const isActive = doc.id === activeDocId;

    return (
      <div key={doc.id} className="select-none text-left relative">
        {/* Indent Guide Lines */}
        {level > 0 && searchQuery.trim() === '' && (
          <div 
            className="absolute left-0 top-0 bottom-0 border-l border-slate-200/60 dark:border-slate-800/60 pointer-events-none"
            style={{ left: `${level * 14 + 10}px` }}
          />
        )}

        <div 
          onClick={() => onSelectDoc(doc.id)}
          style={{ paddingLeft: `${Math.max(level * 14 + 8, 8)}px` }}
          className={`group flex items-center justify-between py-1.5 pr-2 rounded-xl cursor-pointer transition-all duration-150 relative ${
            isActive 
              ? 'bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs shadow-indigo-500/5 border border-indigo-200/40 dark:border-indigo-800/40' 
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent'
          }`}
        >
          {/* Active Highlight Bar */}
          {isActive && (
            <motion.div 
              layoutId="activeDocIndicator"
              className="absolute left-1 top-1.5 bottom-1.5 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-indigo-600 shadow-xs"
            />
          )}

          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Expand / Collapse Toggle */}
            {searchQuery.trim() === '' && (
              <button 
                type="button"
                onClick={(e) => toggleExpand(e, doc.id)}
                className={`p-0.5 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition-colors text-slate-400 dark:text-slate-500 ${
                  !hasChildren ? 'opacity-0 cursor-default pointer-events-none' : 'opacity-100'
                }`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 transition-transform" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 transition-transform" />
                )}
              </button>
            )}

            {/* Document icon */}
            <span className="shrink-0 flex items-center justify-center min-w-[16px] text-sm">
              {doc.icon ? renderSpaceIcon(doc.icon, "w-4 h-4 text-slate-600 dark:text-slate-300") : <FileText className="w-4 h-4 text-indigo-500/80 dark:text-indigo-400/80 stroke-[1.75]" />}
            </span>

            {/* Title */}
            <span className="truncate text-[12.5px] font-semibold flex-1 leading-tight">{doc.title || 'Chưa có tiêu đề'}</span>

            {/* Status Badges */}
            {doc.is_favorite && (
              <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0 animate-pulse" />
            )}
            {doc.is_published ? (
              <span title="Đã xuất bản (Public)">
                <Globe2 className="w-3 h-3 text-emerald-500 shrink-0" />
              </span>
            ) : (
              <span title="Riêng tư">
                <LockKeyhole className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            )}
          </div>

          {/* Quick Actions (Show on hover) */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all shrink-0 relative z-20">
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddDoc(doc.id);
                setExpandedIds(prev => ({ ...prev, [doc.id]: true }));
              }}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              title="Thêm trang con mới"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuId(activeMenuId === doc.id ? null : doc.id);
              }}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              title="Tùy chọn"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {/* Context Dropdown Menu */}
            {activeMenuId === doc.id && (
              <>
                <div className="fixed inset-0 z-[90]" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-7 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-[100] min-w-[150px] space-y-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      onUpdateDoc(doc.id, { is_favorite: !doc.is_favorite });
                      setActiveMenuId(null);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Star className={`w-3.5 h-3.5 ${doc.is_favorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                    {doc.is_favorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                  </button>

                  <button
                    onClick={() => {
                      onAddDoc(doc.id);
                      setExpandedIds(prev => ({ ...prev, [doc.id]: true }));
                      setActiveMenuId(null);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <FilePlus className="w-3.5 h-3.5 text-indigo-500" />
                    Thêm trang con
                  </button>
                  
                  <button
                    onClick={() => {
                      onDuplicateDoc(doc);
                      setActiveMenuId(null);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5 text-sky-500" />
                    Nhân bản
                  </button>
                  
                  <div className="my-1 border-t border-slate-150 dark:border-slate-800" />

                  <button
                    onClick={() => {
                      onUpdateDoc(doc.id, { is_archived: true });
                      setActiveMenuId(null);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Archive className="w-3.5 h-3.5 text-rose-500" />
                    Bỏ vào Thùng rác
                  </button>
                </motion.div>
              </>
            )}
          </div>
        </div>

        {/* Child tree nodes */}
        {searchQuery.trim() === '' && hasChildren && isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/80 dark:bg-slate-950/60 backdrop-blur-md border-r border-slate-200/70 dark:border-slate-800/70 w-72 shrink-0 select-none font-sans">
      
      {/* Header & Primary CTA */}
      <div className="p-3 pb-2 shrink-0 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Tài liệu
            </h2>
          </div>

          <button
            onClick={() => onAddDoc()}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
            title="Tạo trang mới"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Mới</span>
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Tìm kiếm tài liệu..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900/90 pl-8 pr-8 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-slate-400 text-slate-800 dark:text-slate-100 shadow-2xs"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
          <SlidersHorizontal className="w-3 h-3 text-slate-400 shrink-0 ml-1.5 mr-0.5" />
          {([
            ['all', 'Tất cả'],
            ['favorites', 'Yêu thích'],
            ['published', 'Đã chia sẻ']
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setScope(value)}
              className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer text-center ${
                scope === value
                  ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Page Tree List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5 scrollbar-thin min-h-0 py-1">
        {rootDocs.length === 0 ? (
          <div className="py-8 text-center px-4 space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <FileText className="w-5 h-5 stroke-[1.5]" />
            </div>
            <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">
              {searchQuery.trim() ? 'Không tìm thấy tài liệu nào' : 'Chưa có tài liệu nào'}
            </p>
            {!searchQuery.trim() && (
              <button
                onClick={() => onAddDoc()}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Tạo trang đầu tiên
              </button>
            )}
          </div>
        ) : (
          rootDocs.map(doc => renderTreeNode(doc, 0))
        )}
      </div>

      {/* Trash Drawer Footer */}
      <div className="border-t border-slate-200/60 dark:border-slate-800/70 shrink-0 p-2 bg-slate-50/50 dark:bg-slate-950/40">
        <button 
          onClick={() => setShowTrash(!showTrash)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            Thùng rác ({archivedDocs.length})
          </span>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${showTrash ? 'rotate-90' : ''}`} />
        </button>

        <AnimatePresence>
          {showTrash && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {archivedDocs.length === 0 ? (
                <div className="py-3 text-center text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Thùng rác trống
                </div>
              ) : (
                <div className="mt-1.5 max-h-44 overflow-y-auto px-1 space-y-1 py-1 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 scrollbar-thin">
                  {archivedDocs.map(doc => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-[11.5px] font-semibold text-slate-700 dark:text-slate-300 group"
                    >
                      <span className="truncate flex-1 pr-2">{doc.title || 'Chưa có tiêu đề'}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button 
                          onClick={() => onUpdateDoc(doc.id, { is_archived: false })}
                          className="p-1 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 cursor-pointer"
                          title="Khôi phục"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài liệu "${doc.title}"?`)) {
                              onDeleteDoc(doc.id);
                            }
                          }}
                          className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer"
                          title="Xóa vĩnh viễn"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
