"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useWorkspaceStore } from '../store/workspaceStore';
import PageTreeSidebar from './PageTreeSidebar';
import DocumentEditor from './DocumentEditor';
import { Sparkles, FileText, PanelLeftOpen, PanelLeftClose, Plus, ArrowRight, Zap, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

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
  onCreateTaskFromDoc,
  spaceId,
  folderId
}: DocumentHubProps) {
  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const [documents, setDocuments] = useState<any[]>([]);
  const [activeDocId, setActiveDocId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const cacheKey = activeWorkspaceId
    ? `apexa-documents:${activeWorkspaceId}:${spaceId || 'workspace'}`
    : '';

  // 1. Initial documents load
  useEffect(() => {
    const fetchDocs = async () => {
      if (!activeWorkspaceId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      const cached = cacheKey ? localStorage.getItem(cacheKey) : null;
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setDocuments(parsed);
        } catch { /* Ignore invalid local cache */ }
      }

      if (isOffline) {
        setIsLoading(false);
        return;
      }

      let query = supabase
        .from('documents')
        .select('*')
        .eq('workspace_id', activeWorkspaceId)
        .order('created_at', { ascending: true });

      query = spaceId ? query.eq('space_id', spaceId) : query.is('space_id', null);
      const { data, error } = await query;
        
      if (!error && data) {
        setDocuments(data);
        setActiveDocId(current => data.some(d => d.id === current && !d.is_archived)
          ? current
          : (data.find(d => !d.is_archived)?.id || ''));
      }
      setIsLoading(false);
    };

    fetchDocs();
  }, [activeWorkspaceId, cacheKey, isOffline, spaceId]);

  useEffect(() => {
    if (!cacheKey) return;
    localStorage.setItem(cacheKey, JSON.stringify(documents));
  }, [cacheKey, documents]);

  // 2. Realtime listener for workspace document updates
  useEffect(() => {
    if (!activeWorkspaceId || isOffline) return;

    const channel = supabase.channel(`documents-realtime-${activeWorkspaceId}`)
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

  // 4. Document Operations
  const handleAddDoc = async (parentId?: string) => {
    if (!activeWorkspaceId || isOffline) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const payload = {
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
      user_id: session.user.id
    };

    const { data, error } = await supabase
      .from('documents')
      .insert([payload])
      .select()
      .single();

    if (!error && data) {
      setDocuments(prev => [...prev, data]);
      setActiveDocId(data.id);
      onAddSyncLog(`Đã tạo tài liệu mới: "${data.title}"`);
    }
  };

  const handleDuplicateDoc = async (doc: any) => {
    if (isOffline) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const payload = {
      title: `${doc.title} (Nhân bản)`,
      workspace_id: doc.workspace_id,
      space_id: doc.space_id || spaceId || null,
      folder_id: doc.folder_id || folderId || null,
      parent_document_id: doc.parent_document_id || null,
      icon: doc.icon || '📝',
      cover_url: doc.cover_url || null,
      content: doc.content || { type: 'doc', content: [] },
      is_archived: false,
      is_published: false,
      user_id: session.user.id
    };

    const { data, error } = await supabase
      .from('documents')
      .insert([payload])
      .select()
      .single();

    if (!error && data) {
      setDocuments(prev => [...prev, data]);
      setActiveDocId(data.id);
      onAddSyncLog(`Đã nhân bản tài liệu: "${doc.title}"`);
    }
  };

  const handleUpdateDoc = async (id: string, updates: any) => {
    if (isOffline) return;
    const previous = documents;
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    
    const { error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id);

    if (error) {
      setDocuments(previous);
      return;
    }

    if (!error) {
      if (updates.is_archived === true) {
        onAddSyncLog(`Đã di chuyển tài liệu vào Thùng rác`);
        if (activeDocId === id) {
          const nextActive = documents.find(d => d.id !== id && !d.is_archived);
          setActiveDocId(nextActive ? nextActive.id : '');
        }
      } else if (updates.is_archived === false) {
        onAddSyncLog(`Đã khôi phục tài liệu từ Thùng rác`);
      } else {
        onAddSyncLog(`Đã cập nhật thuộc tính tài liệu`);
      }
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (isOffline) return;
    const previous = documents;
    setDocuments(prev => prev.filter(d => d.id !== id));
    
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) {
      setDocuments(previous);
      return;
    }

    if (!error) {
      onAddSyncLog(`Đã xóa vĩnh viễn tài liệu`);
      if (activeDocId === id) {
        const nextActive = documents.find(d => d.id !== id && !d.is_archived);
        setActiveDocId(nextActive ? nextActive.id : '');
      }
    }
  };

  const handleCreateFromTemplate = async (template: any) => {
    if (!activeWorkspaceId || isOffline) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const payload = {
      title: template.title,
      workspace_id: activeWorkspaceId,
      space_id: spaceId || null,
      folder_id: folderId || null,
      parent_document_id: null,
      icon: template.icon,
      cover_url: null,
      content: template.content,
      is_archived: false,
      is_published: false,
      user_id: session.user.id
    };

    const { data, error } = await supabase
      .from('documents')
      .insert([payload])
      .select()
      .single();

    if (!error && data) {
      setDocuments(prev => [...prev, data]);
      setActiveDocId(data.id);
      onAddSyncLog(`Đã tạo tài liệu từ mẫu: "${data.title}"`);
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
      {isSidebarOpen && (
        <PageTreeSidebar 
          documents={documents}
          activeDocId={activeDocId}
          onSelectDoc={setActiveDocId}
          onAddDoc={handleAddDoc}
          onDuplicateDoc={handleDuplicateDoc}
          onUpdateDoc={handleUpdateDoc}
          onDeleteDoc={handleDeleteDoc}
          workspaceId={activeWorkspaceId || ''}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white dark:bg-slate-900 relative">
        
        {/* Top Mini Toolbar when sidebar is closed or for quick toggle */}
        <div className="absolute left-4 top-3 z-30 flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 transition-all cursor-pointer shadow-xs"
            title={isSidebarOpen ? "Ẩn danh mục tài liệu" : "Hiện danh mục tài liệu"}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        </div>

        {activeDocId ? (
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
        ) : (
          /* Empty State / Welcome Screen */
          <div className="flex-grow flex flex-col items-center justify-center bg-slate-50/40 dark:bg-slate-950/20 p-6 md:p-12 overflow-y-auto scrollbar-thin">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl w-full flex flex-col items-center text-center space-y-6"
            >
              {/* Hero Icon */}
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                  <FileText className="w-10 h-10 stroke-[1.5]" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-white shadow-md border-2 border-white dark:border-slate-900">
                  <Sparkles className="w-4 h-4 fill-white" />
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-2 max-w-lg">
                <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Không gian Soạn thảo & Quản lý Tài liệu
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Tạo tài liệu làm việc, ghi chú cuộc họp, bản yêu cầu sản phẩm (PRD) hoặc làm việc nhóm đồng thời theo thời gian thực cùng đồng nghiệp.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAddDoc()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Tạo tài liệu mới</span>
                </button>
              </div>

              {/* Template Section */}
              <div className="w-full pt-6 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> Khởi đầu nhanh bằng mẫu
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
                  {TEMPLATES.map((tmpl) => (
                    <motion.div 
                      key={tmpl.title}
                      whileHover={{ y: -3 }}
                      onClick={() => handleCreateFromTemplate(tmpl)}
                      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500/60 hover:shadow-lg hover:shadow-indigo-500/5 transition-all cursor-pointer flex flex-col justify-between group space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                          {tmpl.icon}
                        </div>
                        <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                          {tmpl.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-medium line-clamp-2">
                          {tmpl.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Sử dụng mẫu này</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

            </motion.div>
          </div>
        )}
        
      </div>
      
    </div>
  );
}

const TEMPLATES = [
  {
    title: 'Biên bản cuộc họp (Meeting Notes)',
    icon: '📅',
    description: 'Theo dõi chương trình cuộc họp, quyết định và danh sách công việc cần làm.',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '📅 Biên Bản Cuộc Họp' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Ngày: ' + new Date().toLocaleDateString('vi-VN') + ' | Người ghi chép: Team Leader' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Nội dung thảo luận' }] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Đánh giá tiến độ dự án quý này' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Thảo luận kế hoạch ra mắt tính năng mới' }] }] }
        ] }
      ]
    }
  },
  {
    title: 'Yêu cầu sản phẩm (PRD)',
    icon: '🚀',
    description: 'Xác định phạm vi tính năng mới, mục tiêu và danh sách các User Stories.',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '🚀 Product Requirements Document (PRD)' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Trạng thái: Bản nháp | Nhóm sở hữu: Product Team' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1. Mục tiêu (Objective)' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Mô tả ngắn gọn lý do xây dựng tính năng này và tác động mong đợi đối với người dùng.' }] }
      ]
    }
  },
  {
    title: 'Nhật ký công việc (Daily Journal)',
    icon: '📔',
    description: 'Ghi lại các việc đã hoàn thành, khó khăn gặp phải và mục tiêu ngày tiếp theo.',
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '📔 Nhật Ký Hằng Ngày' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Ghi chép phản hồi công việc cá nhân.' }] }
      ]
    }
  }
];
