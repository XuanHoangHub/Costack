"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useWorkspaceStore } from '../store/workspaceStore';
import PageTreeSidebar from './PageTreeSidebar';
import DocumentEditor from './DocumentEditor';
import { Sparkles } from 'lucide-react';

interface DocumentHubProps {
  currentUser: any;
  isOffline: boolean;
  onAddSyncLog: (action: string) => void;
  initialSelectedDocId?: string | null;
  onClearInitialSelectedDocId?: () => void;
  // Legacy props for compatibility
  docs?: any[];
  onAddDoc?: (doc: any) => void;
  onUpdateDoc?: (doc: any) => void;
  onDeleteDoc?: (id: string) => void;
}

export default function DocumentHub({
  currentUser,
  isOffline,
  onAddSyncLog,
  initialSelectedDocId,
  onClearInitialSelectedDocId,
  docs,
  onAddDoc,
  onUpdateDoc,
  onDeleteDoc
}: DocumentHubProps) {
  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const [documents, setDocuments] = useState<any[]>([]);
  const [activeDocId, setActiveDocId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // 1. Initial documents load
  useEffect(() => {
    const fetchDocs = async () => {
      if (!activeWorkspaceId) return;
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('workspace_id', activeWorkspaceId)
        .order('created_at', { ascending: true });
        
      if (!error && data) {
        setDocuments(data);
        if (data.length > 0) {
          // Default to first non-archived document
          const firstActive = data.find(d => !d.is_archived);
          if (firstActive) {
            setActiveDocId(firstActive.id);
          }
        }
      }
      setIsLoading(false);
    };

    fetchDocs();
  }, [activeWorkspaceId]);

  // 2. Realtime listener for workspace document updates
  useEffect(() => {
    if (!activeWorkspaceId) return;

    const channel = supabase.channel(`documents-realtime-${activeWorkspaceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'documents',
        filter: `workspace_id=eq.${activeWorkspaceId}`
      }, (payload) => {
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
  }, [activeWorkspaceId]);

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
    if (!activeWorkspaceId) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const payload = {
      title: 'Tài liệu mới',
      workspace_id: activeWorkspaceId,
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const payload = {
      title: `${doc.title} (Nhân bản)`,
      workspace_id: doc.workspace_id,
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
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    
    const { error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id);

    if (!error) {
      if (updates.is_archived === true) {
        onAddSyncLog(`Đã di chuyển tài liệu vào Thùng rác`);
        // If the active document was archived, switch selection
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
    setDocuments(prev => prev.filter(d => d.id !== id));
    
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (!error) {
      onAddSyncLog(`Đã xóa vĩnh viễn tài liệu`);
      if (activeDocId === id) {
        const nextActive = documents.find(d => d.id !== id && !d.is_archived);
        setActiveDocId(nextActive ? nextActive.id : '');
      }
    }
  };

  const handleCreateFromTemplate = async (template: any) => {
    if (!activeWorkspaceId) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const payload = {
      title: template.title,
      workspace_id: activeWorkspaceId,
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
      <div className="flex h-[calc(100vh-125px)] md:h-[calc(100vh-105px)] w-full items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 text-slate-400 dark:text-slate-500 font-semibold gap-2 select-none">
        <Sparkles className="w-5 h-5 animate-pulse text-indigo-500" />
        Đang tải không gian tài liệu...
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-125px)] md:h-[calc(100vh-105px)] w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 shadow-[0_4px_25px_rgba(0,0,0,0.012)] overflow-hidden font-sans select-none text-slate-800">
      
      {/* Page Tree Navigation Sidebar */}
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

      {/* Editor Main Area */}
      {activeDocId ? (
        <DocumentEditor 
          key={activeDocId}
          documentId={activeDocId}
          currentUser={currentUser}
          onUpdateTitle={(title) => {
            setDocuments(prev => prev.map(d => d.id === activeDocId ? { ...d, title } : d));
          }}
          onUpdateCoverAndIcon={(coverUrl, icon) => {
            setDocuments(prev => prev.map(d => d.id === activeDocId ? { ...d, cover_url: coverUrl, icon } : d));
          }}
        />
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center bg-slate-50/15 dark:bg-slate-900/10 p-6 md:p-12 overflow-y-auto scrollbar-none">
          <div className="max-w-md text-center space-y-2 mb-8">
            <span className="text-4xl">📄</span>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Chào mừng đến với Trình soạn thảo tài liệu</h3>
            <p className="text-[11px] text-slate-400 font-medium">Chọn hoặc tạo mới một tài liệu từ thanh bên, hoặc bắt đầu nhanh bằng một trong các mẫu dưới đây.</p>
          </div>
          
          <div className="max-w-md w-full grid grid-cols-1 gap-3">
            {TEMPLATES.map((tmpl) => (
              <div 
                key={tmpl.title}
                onClick={() => handleCreateFromTemplate(tmpl)}
                className="p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-indigo-500/50 hover:shadow-xs transition-all cursor-pointer flex gap-3 group"
              >
                <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">{tmpl.icon}</span>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{tmpl.title}</h4>
                  <p className="text-[10px] text-slate-400 leading-normal font-medium">{tmpl.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
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
