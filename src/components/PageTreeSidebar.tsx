"use client";

import React, { useState, useMemo } from 'react';
import { 
  FileText, Plus, ChevronRight, ChevronDown, Trash2, Star, 
  Settings, Folder, FolderOpen, MoreVertical, Copy, RefreshCw, Archive
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

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter archived vs active
  const activeDocs = useMemo(() => {
    return documents.filter(d => !d.is_archived && d.workspace_id === workspaceId);
  }, [documents, workspaceId]);

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

  // Root level documents
  const rootDocs = useMemo(() => {
    if (searchQuery.trim() !== '') {
      // Flat list for search
      return activeDocs.filter(d => 
        d.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
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
      <div key={doc.id} className="select-none text-left">
        <div 
          onClick={() => onSelectDoc(doc.id)}
          style={{ paddingLeft: `${Math.max(level * 12 + 8, 8)}px` }}
          className={`group flex items-center justify-between py-1.5 pr-2 rounded-xl cursor-pointer border border-transparent transition-all relative ${
            isActive 
              ? 'bg-indigo-50/80 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 border-indigo-200/20 font-bold' 
              : 'text-slate-650 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 hover:text-slate-850 dark:hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Expand / Collapse Toggle */}
            {searchQuery.trim() === '' && (
              <button 
                type="button"
                onClick={(e) => toggleExpand(e, doc.id)}
                className={`p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800/60 transition-colors text-slate-400 ${
                  !hasChildren ? 'opacity-0 cursor-default pointer-events-none' : 'opacity-100'
                }`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            )}

            {/* Document icon or emoji mapped to Lucide SVG */}
            <span className="shrink-0 flex items-center justify-center min-w-[14px]">
              {doc.icon ? renderSpaceIcon(doc.icon, "w-3.5 h-3.5 text-slate-500 dark:text-slate-400") : <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
            </span>

            {/* Title */}
            <span className="truncate text-xs font-semibold flex-1 leading-none">{doc.title || 'Untitled'}</span>

            {/* Favorite Indicator */}
            {doc.is_favorite && (
              <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
            )}
          </div>

          {/* Quick Actions (Show on hover) */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0 relative z-10">
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddDoc(doc.id);
                setExpandedIds(prev => ({ ...prev, [doc.id]: true }));
              }}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              title="Thêm trang con"
            >
              <Plus className="w-3 h-3" />
            </button>
            
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuId(activeMenuId === doc.id ? null : doc.id);
              }}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-3 h-3" />
            </button>

            {/* Dropdown Menu */}
            {activeMenuId === doc.id && (
              <div 
                className="absolute right-0 top-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-1 z-[99] min-w-[130px] animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    onUpdateDoc(doc.id, { is_favorite: !doc.is_favorite });
                    setActiveMenuId(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-[10.5px] font-bold text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Star className={`w-3 h-3 ${doc.is_favorite ? 'text-amber-500 fill-amber-500' : ''}`} />
                  {doc.is_favorite ? 'Unfavorite' : 'Favorite'}
                </button>
                
                <button
                  onClick={() => {
                    onDuplicateDoc(doc);
                    setActiveMenuId(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-[10.5px] font-bold text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Copy className="w-3 h-3" />
                  Nhân bản
                </button>
                
                <button
                  onClick={() => {
                    onUpdateDoc(doc.id, { is_archived: true });
                    setActiveMenuId(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-[10.5px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Archive className="w-3 h-3" />
                  Bỏ vào Thùng rác
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Render child tree nodes recursively */}
        {searchQuery.trim() === '' && hasChildren && isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/10 border-r border-slate-200/60 dark:border-slate-800/60 w-64 select-none">
      
      {/* Search Input bar */}
      <div className="p-3 shrink-0">
        <input 
          type="text"
          placeholder="Tìm kiếm tài liệu..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder-slate-400 text-slate-700 dark:text-slate-200"
        />
      </div>

      {/* Pages Section */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5 scrollbar-thin min-h-0">
        <div className="flex items-center justify-between px-2 mb-1.5 shrink-0">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-550">Tài liệu</span>
          <button 
            onClick={() => onAddDoc()}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            title="Thêm trang mới"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-0.5 pb-4">
          {rootDocs.length === 0 ? (
            <div className="py-6 text-center text-slate-400 dark:text-slate-550 text-[10px] font-semibold">
              Chưa có tài liệu nào.
            </div>
          ) : (
            rootDocs.map(doc => renderTreeNode(doc, 0))
          )}
        </div>
      </div>

      {/* Trash Section */}
      <div className="border-t border-slate-150 dark:border-slate-800 shrink-0 p-2 text-left">
        <button 
          onClick={() => setShowTrash(!showTrash)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Trash2 className="w-3.5 h-3.5 text-slate-450" />
            Thùng rác ({archivedDocs.length})
          </span>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showTrash ? 'rotate-90' : ''}`} />
        </button>

        {showTrash && archivedDocs.length > 0 && (
          <div className="mt-1 max-h-40 overflow-y-auto px-2 space-y-1 py-1 rounded-xl bg-slate-100/50 dark:bg-slate-900/30 scrollbar-thin">
            {archivedDocs.map(doc => (
              <div 
                key={doc.id}
                className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-650 dark:text-slate-400 group"
              >
                <span className="truncate flex-1 pr-2">{doc.title || 'Untitled'}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button 
                    onClick={() => onUpdateDoc(doc.id, { is_archived: false })}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-650 dark:text-indigo-400 cursor-pointer"
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
                    className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 cursor-pointer"
                    title="Xóa vĩnh viễn"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
