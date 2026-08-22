"use client";

import React, { useState, useEffect } from 'react';
import { supabase, getCleanChannel } from '../supabaseClient';
import { useWorkspaceStore } from '../store/workspaceStore';
import PageTreeSidebar from './PageTreeSidebar';
import DocumentEditor from './DocumentEditor';
import ScreenplayEditor from './script/ScreenplayEditor';
import { Sparkles, FileText, PanelLeftOpen, PanelLeftClose, Plus, ArrowRight, Zap, ChevronRight, Film, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DocumentHubProps {
  currentUser: any;
  isOffline: boolean;
  onAddSyncLog: (action: string) => void;
  initialSelectedDocId?: string | null;
  onClearInitialSelectedDocId?: () => void;
  docs?: any[];
  onAddDoc?: (doc: any) => void;
  onUpdateDoc?: (doc: any) => void;
  onDeleteDoc?: (id: string) => void;
  onCreateTaskFromDoc?: (title: string, description: string, documentId: string) => void;
  spaceId?: string | null;
  folderId?: string | null;
}

export default function DocumentHub({
  currentUser,
  isOffline,
  onAddSyncLog,
  initialSelectedDocId,
  onClearInitialSelectedDocId,
  docs: propDocs,
  onAddDoc: propOnAddDoc,
  onUpdateDoc: propOnUpdateDoc,
  onDeleteDoc: propOnDeleteDoc,
  onCreateTaskFromDoc,
  spaceId,
  folderId
}: DocumentHubProps) {
  const storeActiveWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const activeWorkspaceId = storeActiveWorkspaceId || (currentUser as any)?.workspaceId || 'workspace-default';
  const [documents, setDocuments] = useState<any[]>([]);
  const [activeDocId, setActiveDocId] = useState<string>('');
  const [isScreenplayMode, setIsScreenplayMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const cacheKey = activeWorkspaceId
    ? `apexa-documents:${activeWorkspaceId}:${spaceId || 'workspace'}`
    : 'apexa-documents:default';

  // 1. Initial documents load
  useEffect(() => {
    let isMounted = true;

    const fetchDocs = async () => {
      setIsLoading(true);

      // A. Load from LocalStorage Cache
      let localCached: any[] = [];
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localCached = parsed;
          }
        } catch { /* Ignore invalid local cache */ }
      }

      // B. Merge with propDocs if provided
      if (propDocs && propDocs.length > 0) {
        const propFormatted = propDocs.map(d => ({
          id: d.id,
          title: d.title || 'Tài liệu mới',
          workspace_id: d.workspace_id || d.workspaceId || activeWorkspaceId,
          space_id: d.space_id || d.spaceId || spaceId || null,
          folder_id: d.folder_id || d.folderId || folderId || null,
          parent_document_id: d.parent_document_id || null,
          icon: d.icon || '📝',
          cover_url: d.cover_url || null,
          content: d.content || { type: 'doc', content: [] },
          is_archived: Boolean(d.is_archived),
          is_published: Boolean(d.is_published),
          is_favorite: Boolean(d.is_favorite),
          position: d.position || 0,
          user_id: d.user_id || d.userId || null,
          created_at: d.created_at || d.createdAt || new Date().toISOString(),
          updated_at: d.updated_at || d.updatedAt || new Date().toISOString()
        }));

        const mergedMap = new Map<string, any>();
        localCached.forEach(d => mergedMap.set(d.id, d));
        propFormatted.forEach(d => mergedMap.set(d.id, { ...mergedMap.get(d.id), ...d }));
        localCached = Array.from(mergedMap.values());
      }

      if (localCached.length > 0 && isMounted) {
        setDocuments(localCached);
        setActiveDocId(curr => {
          if (curr && localCached.some(d => d.id === curr && !d.is_archived)) return curr;
          return localCached.find(d => !d.is_archived)?.id || '';
        });
      }

      if (isOffline) {
        if (isMounted) setIsLoading(false);
        return;
      }

      // C. Query Supabase
      try {
        let query = supabase
          .from('documents')
          .select('*')
          .order('created_at', { ascending: true });

        if (activeWorkspaceId && activeWorkspaceId !== 'workspace-default') {
          query = query.eq('workspace_id', activeWorkspaceId);
        }
        if (spaceId) {
          query = query.eq('space_id', spaceId);
        }

        const { data, error } = await query;
          
        if (!error && data && data.length > 0 && isMounted) {
          setDocuments(data);
          setActiveDocId(curr => {
            if (curr && data.some(d => d.id === curr && !d.is_archived)) return curr;
            return data.find(d => !d.is_archived)?.id || '';
          });
        }
      } catch (err) {
        console.warn('Documents initial fetch warning:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDocs();

    return () => {
      isMounted = false;
    };
  }, [activeWorkspaceId, cacheKey, isOffline, spaceId, folderId, propDocs]);

  useEffect(() => {
    if (!cacheKey) return;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(documents));
    } catch { /* storage full */ }
  }, [cacheKey, documents]);

  // 2. Realtime listener for workspace document updates
  useEffect(() => {
    if (!activeWorkspaceId || isOffline) return;

    const channel = getCleanChannel(`documents-realtime-${activeWorkspaceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'documents',
        filter: `workspace_id=eq.${activeWorkspaceId}`
      }, (payload) => {
        const payloadSpaceId = (payload.new as any)?.space_id ?? (payload.old as any)?.space_id ?? null;
        if (payloadSpaceId !== (spaceId ?? null)) return;
        if (payload.eventType === 'INSERT') {
          setDocuments(prev => {
            if (prev.some(d => d.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        } else if (payload.eventType === 'DELETE') {
          setDocuments(prev => prev.filter(d => d.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
          setDocuments(prev => prev.map(d => d.id === payload.new.id ? payload.new : d));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeWorkspaceId, isOffline, spaceId]);

  // 3. Handle external selection (from Global Search / Notifications)
  useEffect(() => {
    if (initialSelectedDocId) {
      const exists = documents.some(d => d.id === initialSelectedDocId);
      if (exists) {
        setActiveDocId(initialSelectedDocId);
        if (onClearInitialSelectedDocId) {
          onClearInitialSelectedDocId();
        }
      }
    }
  }, [initialSelectedDocId, documents, onClearInitialSelectedDocId]);

  // 4. Robust Document Operations
  const handleAddDoc = async (parentId?: string) => {
    const newDocId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const newDoc = {
      id: newDocId,
      title: 'Tài liệu mới',
      workspace_id: activeWorkspaceId,
      space_id: spaceId || null,
      folder_id: folderId || null,
      parent_document_id: parentId || null,
      icon: '📝',
      cover_url: null,
      content: { type: 'doc', content: [] },
      is_archived: false,
      is_published: false,
      is_favorite: false,
      position: documents.length,
      user_id: (currentUser as any)?.id || 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // A. Optimistically update local state immediately
    setDocuments(prev => [...prev, newDoc]);
    setActiveDocId(newDocId);
    onAddSyncLog?.(`Đã tạo tài liệu mới: "${newDoc.title}"`);
    propOnAddDoc?.(newDoc);

    // B. Sync to Supabase in background
    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const payload: any = {
          id: newDocId,
          title: newDoc.title,
          workspace_id: activeWorkspaceId,
          space_id: spaceId || null,
          folder_id: folderId || null,
          parent_document_id: parentId || null,
          icon: newDoc.icon,
          cover_url: null,
          content: newDoc.content,
          is_archived: false,
          is_published: false,
          position: newDoc.position
        };

        if (session?.user?.id) {
          payload.user_id = session.user.id;
        }

        const { data, error } = await supabase
          .from('documents')
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.warn('Supabase documents insert warning (using local doc):', error.message);
          // Fallback to docs table if available
          if (session?.user?.id) {
            try {
              await supabase.from('docs').insert([{
                id: newDocId,
                title: newDoc.title,
                content: JSON.stringify(newDoc.content),
                category: 'General',
                updatedAt: new Date().toISOString().split('T')[0],
                updatedBy: (currentUser as any)?.name || 'User',
                user_id: session.user.id,
                workspace_id: activeWorkspaceId
              }]);
            } catch { /* ignore fallback insert error */ }
          }
        } else if (data) {
          setDocuments(prev => prev.map(d => d.id === newDocId ? data : d));
        }
      } catch (err) {
        console.warn('Error saving document to Supabase:', err);
      }
    }
  };

  const handleDuplicateDoc = async (doc: any) => {
    if (!doc) return;
    const newDocId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const duplicateDoc = {
      ...doc,
      id: newDocId,
      title: `${doc.title || 'Tài liệu'} (Nhân bản)`,
      workspace_id: doc.workspace_id || activeWorkspaceId,
      space_id: doc.space_id || spaceId || null,
      folder_id: doc.folder_id || folderId || null,
      parent_document_id: doc.parent_document_id || null,
      icon: doc.icon || '📝',
      cover_url: doc.cover_url || null,
      content: doc.content || { type: 'doc', content: [] },
      is_archived: false,
      is_published: false,
      is_favorite: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setDocuments(prev => [...prev, duplicateDoc]);
    setActiveDocId(newDocId);
    onAddSyncLog?.(`Đã nhân bản tài liệu: "${doc.title}"`);
    propOnAddDoc?.(duplicateDoc);

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const payload: any = {
          id: newDocId,
          title: duplicateDoc.title,
          workspace_id: duplicateDoc.workspace_id,
          space_id: duplicateDoc.space_id,
          folder_id: duplicateDoc.folder_id,
          parent_document_id: duplicateDoc.parent_document_id,
          icon: duplicateDoc.icon,
          cover_url: duplicateDoc.cover_url,
          content: duplicateDoc.content,
          is_archived: false,
          is_published: false
        };

        if (session?.user?.id) {
          payload.user_id = session.user.id;
        }

        const { data, error } = await supabase
          .from('documents')
          .insert([payload])
          .select()
          .single();

        if (!error && data) {
          setDocuments(prev => prev.map(d => d.id === newDocId ? data : d));
        }
      } catch (err) {
        console.warn('Error saving duplicated doc to Supabase:', err);
      }
    }
  };

  const handleUpdateDoc = async (id: string, updates: any) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates, updated_at: new Date().toISOString() } : d));
    propOnUpdateDoc?.({ id, ...updates });

    if (updates.is_archived === true) {
      onAddSyncLog?.(`Đã di chuyển tài liệu vào Thùng rác`);
      if (activeDocId === id) {
        const nextActive = documents.find(d => d.id !== id && !d.is_archived);
        setActiveDocId(nextActive ? nextActive.id : '');
      }
    } else if (updates.is_archived === false) {
      onAddSyncLog?.(`Đã khôi phục tài liệu từ Thùng rác`);
    } else {
      onAddSyncLog?.(`Đã cập nhật thuộc tính tài liệu`);
    }

    if (!isOffline) {
      try {
        await supabase
          .from('documents')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (err) {
        console.warn('Error updating document in Supabase:', err);
      }
    }
  };

  const handleDeleteDoc = async (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    propOnDeleteDoc?.(id);
    onAddSyncLog?.(`Đã xóa vĩnh viễn tài liệu`);

    if (activeDocId === id) {
      const nextActive = documents.find(d => d.id !== id && !d.is_archived);
      setActiveDocId(nextActive ? nextActive.id : '');
    }

    if (!isOffline) {
      try {
        await supabase
          .from('documents')
          .delete()
          .eq('id', id);
      } catch (err) {
        console.warn('Error deleting document in Supabase:', err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 text-slate-400 dark:text-slate-500 font-bold text-xs gap-3 select-none">
        <Sparkles className="w-5 h-5 animate-pulse text-indigo-500" />
        Đang tải không gian tài liệu...
      </div>
    );
  }

  return (
    <div className="flex h-full w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden font-sans select-none text-slate-800 dark:text-slate-100 relative">
      
      {/* Sidebar Navigation */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Mobile Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed md:relative inset-y-0 left-0 z-50 md:z-auto h-full w-72 shrink-0 shadow-2xl md:shadow-none"
            >
              <PageTreeSidebar 
                documents={documents}
                activeDocId={activeDocId}
                onSelectDoc={(id) => {
                  setActiveDocId(id);
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setIsSidebarOpen(false);
                  }
                }}
                onAddDoc={handleAddDoc}
                onDuplicateDoc={handleDuplicateDoc}
                onUpdateDoc={handleUpdateDoc}
                onDeleteDoc={handleDeleteDoc}
                workspaceId={activeWorkspaceId || ''}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white dark:bg-slate-900 relative">
        
        {/* Top Header Navigation Bar */}
        {(() => {
          const activeDoc = documents.find(d => d.id === activeDocId);
          return (
            <div className="h-12 shrink-0 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between px-4 bg-slate-50/80 dark:bg-slate-900/90 backdrop-blur-md z-30 select-none">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60 shadow-2xs shrink-0"
                  title={isSidebarOpen ? "Ẩn danh mục tài liệu" : "Hiện danh mục tài liệu"}
                >
                  {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                </button>

                {/* Breadcrumbs Path */}
                {activeDoc ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                    <span className="hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">Tài liệu</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-850 dark:text-slate-100 truncate flex items-center gap-1">
                      <span>{activeDoc.icon || '📝'}</span>
                      <span>{activeDoc.title || 'Chưa có tiêu đề'}</span>
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Không gian Soạn thảo</span>
                )}
              </div>
            </div>
          );
        })()}

        {isScreenplayMode ? (
          <ScreenplayEditor
            currentUser={currentUser}
            initialTitle={activeDocId ? (documents.find(d => d.id === activeDocId)?.title || 'The Girl & the Fox') : 'The Girl & the Fox'}
            onBackToDocs={() => setIsScreenplayMode(false)}
          />
        ) : activeDocId ? (
          <div className="flex-1 flex flex-col min-w-0 h-full relative">
            <DocumentEditor 
              key={activeDocId}
              documentId={activeDocId}
              initialDocument={documents.find(d => d.id === activeDocId)}
              currentUser={currentUser}
              isOffline={isOffline}
              onCreateTask={(title, description) => onCreateTaskFromDoc?.(title, description, activeDocId)}
              onDocumentUpdated={(updates) => {
                setDocuments(prev => prev.map(d => d.id === activeDocId ? { ...d, ...updates } : d));
              }}
              onUpdateTitle={(title) => {
                setDocuments(prev => prev.map(d => d.id === activeDocId ? { ...d, title } : d));
              }}
              onUpdateCoverAndIcon={(coverUrl, icon) => {
                setDocuments(prev => prev.map(d => d.id === activeDocId ? { ...d, cover_url: coverUrl, icon } : d));
              }}
            />
          </div>
        ) : (
          /* Empty State / Welcome Screen */
          <div className="flex-grow flex flex-col items-center justify-center bg-gradient-to-b from-slate-50/80 via-white to-slate-50/50 dark:from-slate-950/60 dark:via-slate-900 dark:to-slate-950/40 p-6 md:p-12 overflow-y-auto scrollbar-thin">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="max-w-3xl w-full flex flex-col items-center text-center space-y-8"
            >
              {/* Hero Icon with Ambient Glow */}
              <div className="relative group">
                <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 opacity-25 blur-xl group-hover:opacity-40 transition duration-500 animate-pulse" />
                <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-500 flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 border border-white/20">
                  <FileText className="w-12 h-12 stroke-[1.5]" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-2xl bg-amber-400 flex items-center justify-center text-white shadow-lg border-2 border-white dark:border-slate-900">
                  <Sparkles className="w-5 h-5 fill-white" />
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-3 max-w-xl">
                <h3 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  Không gian Soạn thảo & Quản lý Tài liệu
                </h3>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Soạn thảo tài liệu thông minh, biên kịch kịch bản phim ảnh chuẩn Hollywood, lập kế hoạch dự án và hợp tác theo thời gian thực.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => handleAddDoc()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center gap-2.5 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Tạo tài liệu mới</span>
                </button>
                <button
                  onClick={() => setIsScreenplayMode(true)}
                  className="px-6 py-3 bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 hover:from-pink-700 hover:to-amber-600 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 transition-all flex items-center gap-2.5 cursor-pointer active:scale-95"
                >
                  <Film className="w-4 h-4 stroke-[2.5]" />
                  <span>Soạn thảo Kịch bản (Screenplay)</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
        
      </div>
      
    </div>
  );
}

