"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Extension } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import { Doc, applyUpdate, encodeStateAsUpdate } from 'yjs';
import { yCursorPlugin } from '@tiptap/y-tiptap';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import { supabase } from '../supabaseClient';
import { 
  Bold, Italic, Strikethrough, Code, Link, Sparkles, Smile, Image as ImageIcon,
  MessageSquare, User, Check, Send, CheckSquare, List, ListOrdered, Quote, Heading1, Heading2, Heading3, Table2, Trash2, Download, FileText, Copy, FileCode, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMemberStore } from '@/store/memberStore';
import { callAiApi } from '@/lib/aiClient';

interface DocumentEditorProps {
  documentId: string;
  currentUser: any;
  onUpdateTitle: (title: string) => void;
  onUpdateCoverAndIcon: (coverUrl: string | null, icon: string | null) => void;
}

const awarenessStatesToArray = (states: Map<number, any>) => {
  return Array.from(states.entries()).map(([key, value]) => {
    return {
      clientId: key,
      ...value.user,
    };
  });
};

// Custom Collaboration Cursor Extension built on @tiptap/y-tiptap's yCursorPlugin
const CollaborationCursor = Extension.create({
  name: 'collaborationCursor',
  addOptions() {
    return {
      provider: null,
      user: {
        name: null,
        color: null,
      },
      render: (user: any) => {
        const cursor = document.createElement('span');
        cursor.classList.add('collaboration-cursor__caret');
        cursor.setAttribute('style', `border-color: ${user.color}`);
        const label = document.createElement('div');
        label.classList.add('collaboration-cursor__label');
        label.setAttribute('style', `background-color: ${user.color}`);
        label.insertBefore(document.createTextNode(user.name || 'Anonymous'), null);
        cursor.insertBefore(label, null);
        return cursor;
      },
    };
  },
  addStorage() {
    return {
      users: [],
    };
  },
  addProseMirrorPlugins() {
    if (!this.options.provider || !this.options.provider.awareness) {
      return [];
    }
    return [
      yCursorPlugin(
        (() => {
          this.options.provider.awareness.setLocalStateField('user', this.options.user);
          this.storage.users = awarenessStatesToArray(this.options.provider.awareness.states);
          this.options.provider.awareness.on('update', () => {
            if (this.options.provider?.awareness) {
              this.storage.users = awarenessStatesToArray(this.options.provider.awareness.states);
            }
          });
          return this.options.provider.awareness;
        })(),
        {
          cursorBuilder: this.options.render,
        }
      ),
    ];
  },
});

// Custom Supabase Broadcast Yjs Provider for Peer-to-Peer Realtime Collaboration
class SupabaseYjsProvider {
  doc: any;
  channelName: string;
  channel: any;
  awareness: Awareness;
  userId: string;
  userName: string;
  userColor: string;
  private updateHandler: (update: Uint8Array, origin: any) => void;
  private awarenessHandler: (data: any) => void;

  constructor(doc: any, channelName: string, userId: string, userName: string, userColor: string, userAvatar: string) {
    this.doc = doc;
    this.channelName = channelName;
    this.userId = userId;
    this.userName = userName;
    this.userColor = userColor;
    this.awareness = new Awareness(doc);

    // Set local presence state
    this.awareness.setLocalStateField('user', {
      name: userName,
      color: userColor,
      id: userId,
      avatar: userAvatar
    });

    this.channel = supabase.channel(channelName);

    // Wire up listeners
    this.channel
      .on('broadcast', { event: 'yjs-update' }, (payload: any) => {
        if (payload.payload?.sender !== this.userId && this.doc) {
          const update = new Uint8Array(Buffer.from(payload.payload.update, 'base64'));
          applyUpdate(this.doc, update, this);
        }
      })
      .on('broadcast', { event: 'yjs-awareness' }, (payload: any) => {
        if (payload.payload?.sender !== this.userId && this.awareness) {
          const update = new Uint8Array(Buffer.from(payload.payload.update, 'base64'));
          applyAwarenessUpdate(this.awareness, update, this);
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          // Request sync from active clients
          this.channel.send({
            type: 'broadcast',
            event: 'yjs-request-sync',
            payload: { sender: this.userId }
          });
        }
      });

    // Handle incoming sync requests
    this.channel.on('broadcast', { event: 'yjs-request-sync' }, (payload: any) => {
      if (payload.payload?.sender !== this.userId && this.doc) {
        // Send state vector update
        const stateVector = encodeStateAsUpdate(this.doc);
        this.channel.send({
          type: 'broadcast',
          event: 'yjs-update',
          payload: {
            update: Buffer.from(stateVector).toString('base64'),
            sender: this.userId
          }
        });
        
        // Send awareness states
        const awarenessUpdate = encodeAwarenessUpdate(this.awareness, [this.awareness.clientID]);
        this.channel.send({
          type: 'broadcast',
          event: 'yjs-awareness',
          payload: {
            update: Buffer.from(awarenessUpdate).toString('base64'),
            sender: this.userId
          }
        });
      }
    });

    // Listen to local Yjs changes and broadcast them
    this.updateHandler = (update: Uint8Array, origin: any) => {
      if (origin !== this) {
        const updateBase64 = Buffer.from(update).toString('base64');
        this.channel.send({
          type: 'broadcast',
          event: 'yjs-update',
          payload: {
            update: updateBase64,
            sender: this.userId
          }
        });
      }
    };
    this.doc.on('update', this.updateHandler);

    // Listen to local awareness state changes and broadcast them
    this.awarenessHandler = ({ added, updated, removed }: any) => {
      const changedClients = [...added, ...updated, ...removed];
      if (changedClients.length > 0) {
        const awarenessUpdate = encodeAwarenessUpdate(this.awareness, changedClients);
        const updateBase64 = Buffer.from(awarenessUpdate).toString('base64');
        this.channel.send({
          type: 'broadcast',
          event: 'yjs-awareness',
          payload: {
            update: updateBase64,
            sender: this.userId
          }
        });
      }
    };
    this.awareness.on('update', this.awarenessHandler);
  }

  destroy() {
    if (this.doc) {
      this.doc.off('update', this.updateHandler);
    }
    if (this.awareness) {
      this.awareness.off('update', this.awarenessHandler);
    }
    if (this.channel) {
      supabase.removeChannel(this.channel);
    }
  }
}

// Cover options preset
const COVERS = [
  'linear-gradient(to right, #6366f1, #a855f7, #ec4899)',
  'linear-gradient(to right, #10b981, #3b82f6)',
  'linear-gradient(to right, #f59e0b, #e11d48)',
  'linear-gradient(to right, #00c6ff, #0072ff)',
  'linear-gradient(to right, #24243e, #300030, #0f0c1b)'
];

const EMOJIS = ['📝', '💡', '🎨', '🚀', '🧠', '📅', '🛠️', '📊', '✨', '🌍', '🏠', '🎯', '📚'];

export default function DocumentEditor({
  documentId,
  currentUser,
  onUpdateTitle,
  onUpdateCoverAndIcon
}: DocumentEditorProps) {
  const [docDetails, setDocDetails] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentVal, setNewCommentVal] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuCoords, setSlashMenuCoords] = useState({ top: 0, left: 0 });
  const [slashQuery, setSlashQuery] = useState('');
  const [bubbleMenuOpen, setBubbleMenuOpen] = useState(false);
  const [bubbleMenuCoords, setBubbleMenuCoords] = useState({ top: 0, left: 0 });
  
  const members = useMemberStore(s => s.members);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);

  const getCommentAuthor = (userId: string) => {
    const member = members.find(m => m.id === `user-${userId}` || m.id === userId || (m as any).user_id === userId);
    return {
      name: member?.name || 'Thành viên Avaxa',
      avatar: member?.avatar || null
    };
  };

  const userColor = useMemo(() => {
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    return colors[Math.floor(Math.random() * colors.length)];
  }, []);

  // Initialize Y.Doc & custom Yjs Supabase Broadcast provider
  const yDoc = useMemo(() => new Doc(), []);

  const provider = useMemo(() => {
    return new SupabaseYjsProvider(
      yDoc,
      `doc-collab-${documentId}`,
      currentUser?.id || 'user',
      currentUser?.name || 'Anonymous User',
      userColor,
      currentUser?.avatar || ''
    );
  }, [yDoc, documentId, currentUser, userColor]);

  // Track active collaborators via Yjs awareness
  useEffect(() => {
    const handleAwarenessUpdate = () => {
      const states = provider.awareness.getStates();
      const usersMap = new Map<string, any>();
      states.forEach((state: any) => {
        if (state.user && state.user.id) {
          usersMap.set(state.user.id, state.user);
        }
      });
      setActiveUsers(Array.from(usersMap.values()));
    };

    provider.awareness.on('change', handleAwarenessUpdate);
    handleAwarenessUpdate();

    return () => {
      provider.awareness.off('change', handleAwarenessUpdate);
    };
  }, [provider]);

  // Load document details and comments from database
  useEffect(() => {
    const loadDocData = async () => {
      // 1. Fetch document attributes
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();
      
      if (!error && data) {
        setDocDetails(data);
        
        // Initialize Y.Doc with current content if Y.Doc is empty
        if (data.content && data.content.content && yDoc && typeof yDoc.getXmlFragment === 'function' && yDoc.getXmlFragment('prosemirror').length === 0) {
          // Pre-populate content state vector
        }
      }

      // 2. Fetch comments
      const { data: commentData, error: commentError } = await supabase
        .from('document_comments')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });
      
      if (!commentError && commentData) {
        setComments(commentData);
      }
    };

    loadDocData();

    // Subscribe to realtime comments table changes
    const commentsSub = supabase.channel(`comments-realtime-${documentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'document_comments',
        filter: `document_id=eq.${documentId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setComments(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'DELETE') {
          setComments(prev => prev.filter(c => c.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
          setComments(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
        }
      })
      .subscribe();

    return () => {
      provider.destroy();
      supabase.removeChannel(commentsSub);
    };
  }, [documentId, yDoc, provider]);

  // Tiptap editor extensions
  const editorExtensions = useMemo(() => {
    const baseExtensions: any[] = [
      StarterKit.configure({
        history: yDoc && typeof yDoc.getXmlFragment === 'function' ? false : undefined,
      } as any),
      Placeholder.configure({
        placeholder: "Nhấn '/' để chọn các loại khối văn bản...",
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ];

    if (yDoc && typeof yDoc.getXmlFragment === 'function') {
      baseExtensions.push(
        Collaboration.configure({
          document: yDoc,
        }),
        CollaborationCursor.configure({
          provider: provider,
          user: {
            name: currentUser?.name || 'Anonymous User',
            color: userColor,
            avatar: currentUser?.avatar || '',
          },
        })
      );
    }

    return baseExtensions;
  }, [yDoc, provider, currentUser, userColor]);

  // Tiptap editor initialization
  const editor = useEditor({
    extensions: editorExtensions,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert focus:outline-none max-w-none text-xs font-medium text-slate-800 dark:text-slate-205 min-h-[400px] select-text',
      },
    },
    onUpdate({ editor }) {
      // Debounce saving JSON to database
      const saveContent = async () => {
        await supabase
          .from('documents')
          .update({ 
            content: editor.getJSON(),
            updated_at: new Date().toISOString()
          })
          .eq('id', documentId);
      };
      
      const timeoutId = (editor as any).saveTimeout;
      if (timeoutId) clearTimeout(timeoutId);
      (editor as any).saveTimeout = setTimeout(saveContent, 1000);
    },
    onSelectionUpdate({ editor }) {
      const { view, state } = editor;
      const { selection } = state;
      const { from, to } = selection;
      
      if (selection.empty) {
        setBubbleMenuOpen(false);
        
        // Detect slash command trigger '/'
        const nodeBefore = selection.$from.nodeBefore;
        if (nodeBefore && nodeBefore.isText && nodeBefore.text) {
          const text = nodeBefore.text;
          const slashIndex = text.lastIndexOf('/');
          if (slashIndex !== -1 && slashIndex === text.length - 1) {
            const coords = view.coordsAtPos(from);
            const editorBounds = view.dom.getBoundingClientRect();
            
            setSlashMenuCoords({
              top: coords.top - editorBounds.top + 20,
              left: coords.left - editorBounds.left
            });
            setSlashMenuOpen(true);
            setSlashQuery('');
            return;
          }
        }
        setSlashMenuOpen(false);
      } else {
        setSlashMenuOpen(false);
        
        try {
          const startCoords = view.coordsAtPos(from);
          const endCoords = view.coordsAtPos(to);
          const editorBounds = view.dom.getBoundingClientRect();
          
          const left = (startCoords.left + endCoords.left) / 2 - editorBounds.left;
          const top = startCoords.top - editorBounds.top - 45;
          
          setBubbleMenuCoords({ top, left });
          setBubbleMenuOpen(true);
        } catch (e) {
          console.warn('Error positioning bubble menu:', e);
        }
      }
    }
  }, [documentId, yDoc, provider]);

  const handleSlashSelect = (command: string) => {
    if (!editor) return;

    // Delete the slash trigger character '/'
    editor.chain().focus().deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from }).run();

    switch (command) {
      case 'h1':
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'h2':
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'h3':
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'bullet':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'order':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'todo':
        editor.chain().focus().toggleTaskList().run();
        break;
      case 'quote':
        editor.chain().focus().toggleBlockquote().run();
        break;
      case 'code':
        editor.chain().focus().toggleCodeBlock().run();
        break;
    }
    setSlashMenuOpen(false);
  };

  const handleSaveTitle = async (val: string) => {
    setDocDetails((prev: any) => prev ? { ...prev, title: val } : null);
    onUpdateTitle(val);
    await supabase
      .from('documents')
      .update({ title: val, updated_at: new Date().toISOString() })
      .eq('id', documentId);
  };

  const selectEmoji = async (emoji: string) => {
    setDocDetails((prev: any) => prev ? { ...prev, icon: emoji } : null);
    onUpdateCoverAndIcon(docDetails?.cover_url || null, emoji);
    await supabase
      .from('documents')
      .update({ icon: emoji })
      .eq('id', documentId);
  };

  const selectCover = async (cover: string) => {
    setDocDetails((prev: any) => prev ? { ...prev, cover_url: cover } : null);
    onUpdateCoverAndIcon(cover, docDetails?.icon || null);
    await supabase
      .from('documents')
      .update({ cover_url: cover })
      .eq('id', documentId);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentVal.trim()) return;

    const payload = {
      document_id: documentId,
      user_id: currentUser.id,
      block_id: selectedBlockId || 'general',
      content: newCommentVal.trim()
    };

    const { error } = await supabase
      .from('document_comments')
      .insert([payload]);

    if (!error) {
      setNewCommentVal('');
    }
  };

  const [showAiMenu, setShowAiMenu] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Export Document as Markdown file
  const handleExportMarkdown = () => {
    if (!editor) return;
    const textContent = editor.getText();
    const blob = new Blob([`# ${docDetails?.title || 'Document'}\n\n${textContent}`], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docDetails?.title || 'document'}-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // AI Assist Writer
  const handleAiAction = async (action: 'expand' | 'summarize' | 'translate' | 'formal') => {
    if (!editor) return;
    const currentText = editor.getText().trim();
    if (!currentText) return;

    setIsAiProcessing(true);
    setShowAiMenu(false);

    let instruction = '';
    if (action === 'expand') instruction = 'Hãy tiếp tục viết và phát triển thêm các ý chính cho tài liệu sau:';
    else if (action === 'summarize') instruction = 'Hãy tóm tắt ngắn gọn tài liệu sau thành các gạch đầu dòng súc tích:';
    else if (action === 'translate') instruction = 'Hãy dịch toàn bộ nội dung tài liệu sau sang Tiếng Anh chuẩn mực:';
    else if (action === 'formal') instruction = 'Hãy chỉnh sửa tài liệu sau theo văn phong trang trọng, chuyên nghiệp:';

    try {
      const response = await callAiApi('/api/ai/document', {
        message: `${instruction}\n\n"${currentText}"`
      });
      const data = await response.json();
      if (data.success && data.text) {
        editor.chain().focus().setContent(editor.getHTML() + `<p>${data.text}</p>`).run();
      }
    } catch (err) {
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase
      .from('document_comments')
      .delete()
      .eq('id', commentId);
  };

  if (!editor || !docDetails) {
    return (
      <div className="flex-1 flex items-center justify-center py-20 text-slate-400 dark:text-slate-500 font-semibold gap-2 select-none">
        <Sparkles className="w-5 h-5 animate-pulse text-indigo-500" />
        Đang tải trình soạn thảo tài liệu...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 select-text overflow-y-auto">
      
      {/* 1. Cover Image Panel */}
      <div className="relative w-full h-32 md:h-44 group select-none shrink-0" style={{ background: docDetails.cover_url || COVERS[0] }}>
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-3">
          <div className="flex gap-2">
            {COVERS.map((c, i) => (
              <button 
                key={i} 
                onClick={() => selectCover(c)}
                className="w-5 h-5 rounded-full border border-white hover:scale-115 transition-transform shadow-sm cursor-pointer"
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl w-full mx-auto px-6 md:px-12 pb-20 mt-[-24px] relative flex flex-col flex-grow text-left">
        {/* 2. Page Emoji / Icon Picker & Collaboration Status */}
        <div className="relative select-none z-20 flex justify-between items-center">
          <div className="relative group/emoji flex justify-start">
            <button className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white dark:bg-slate-850 shadow-md border border-slate-100 dark:border-slate-800 flex items-center justify-center text-2xl md:text-3xl cursor-pointer hover:bg-slate-50 transition-colors">
              {docDetails.icon || '📝'}
            </button>
            
            <div className="absolute left-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-2xl shadow-xl hidden group-hover/emoji:grid grid-cols-6 gap-1 w-52 z-30">
              {EMOJIS.map(emo => (
                <button
                  key={emo}
                  onClick={() => selectEmoji(emo)}
                  className="w-7 h-7 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center justify-center text-lg cursor-pointer"
                >
                  {emo}
                </button>
              ))}
            </div>
          </div>

          {/* Active Collaborators & Sync Indicator */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-850/60 px-3 py-1.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 select-none">
            {/* Realtime Pulse Badge */}
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-650 dark:text-emerald-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Đồng bộ Realtime
            </span>

            {/* Active Users Avatar Stack */}
            <div className="flex -space-x-1.5 overflow-hidden">
              {activeUsers.map((user, idx) => (
                <div 
                  key={user.id || idx}
                  className="relative group/avatar cursor-pointer"
                >
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 object-cover" 
                      style={{ borderColor: user.color }}
                    />
                  ) : (
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] font-black text-white" 
                      style={{ backgroundColor: user.color, borderColor: user.color }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-slate-950 text-white text-[9px] font-bold rounded shadow-lg whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none z-35">
                    {user.name} {user.id === currentUser.id ? '(Bạn)' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Title Input Field */}
        <div className="mt-4">
          <input 
            type="text" 
            value={docDetails.title || ''}
            onChange={e => handleSaveTitle(e.target.value)}
            placeholder="Chưa có tiêu đề"
            className="w-full bg-transparent border-0 outline-none font-black text-2xl md:text-3xl placeholder-slate-300 text-slate-850 dark:text-white"
          />
        </div>

        {/* Document Action Bar */}
        <div className="flex items-center justify-between gap-3 mt-2 select-none">
          <div className="flex items-center gap-2">
            {/* AI Assistant Button */}
            <div className="relative">
              <button
                onClick={() => setShowAiMenu(!showAiMenu)}
                disabled={isAiProcessing}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/60 hover:bg-indigo-100 transition-all font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAiProcessing ? 'animate-spin' : ''}`} />
                <span>{isAiProcessing ? 'AI đang soạn...' : 'AI Writer'}</span>
              </button>

              {showAiMenu && (
                <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-40 space-y-1 text-left">
                  <button 
                    onClick={() => handleAiAction('expand')}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl cursor-pointer"
                  >
                    ✨ Viết tiếp & Phát triển ý
                  </button>
                  <button 
                    onClick={() => handleAiAction('summarize')}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl cursor-pointer"
                  >
                    📝 Tóm tắt nội dung
                  </button>
                  <button 
                    onClick={() => handleAiAction('translate')}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl cursor-pointer"
                  >
                    🌐 Dịch sang Tiếng Anh
                  </button>
                  <button 
                    onClick={() => handleAiAction('formal')}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl cursor-pointer"
                  >
                    👔 Đổi văn phong Trang trọng
                  </button>
                </div>
              )}
            </div>

            {/* Export Markdown Button */}
            <button
              onClick={handleExportMarkdown}
              className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Xuất file Markdown (.md)"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Word Count & Reading Time Stats */}
          {editor && (() => {
            const words = editor.getText().trim().split(/\s+/).filter(Boolean).length;
            const readTime = Math.max(1, Math.ceil(words / 200));
            return (
              <div className="flex items-center gap-2 text-[10.5px] font-bold text-slate-400">
                <span>{words} từ</span>
                <span>•</span>
                <span>{readTime} phút đọc</span>
              </div>
            );
          })()}
        </div>

        <div className="h-px bg-slate-100 dark:bg-slate-800 my-4 shrink-0" />

        {/* 4. Editor Rich Workspace */}
        <div className="flex-1 flex gap-6 relative min-h-0">
          <div className="flex-grow min-w-0 pr-2">
            
            {/* Tiptap Floating Bubble Menu on text selections */}
            <AnimatePresence>
              {bubbleMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute bg-slate-900 dark:bg-slate-800 border border-slate-800 rounded-xl p-1 shadow-lg z-50 flex items-center gap-1"
                  style={{ top: bubbleMenuCoords.top, left: bubbleMenuCoords.left }}
                  onClick={e => e.stopPropagation()}
                >
                  <button 
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()} 
                    className={`p-1.5 rounded-lg text-slate-450 hover:text-white hover:bg-slate-700 transition-colors ${editor.isActive('bold') ? 'text-white bg-slate-700' : ''}`}
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()} 
                    className={`p-1.5 rounded-lg text-slate-455 hover:text-white hover:bg-slate-700 transition-colors ${editor.isActive('italic') ? 'text-white bg-slate-700' : ''}`}
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => editor.chain().focus().toggleStrike().run()} 
                    className={`p-1.5 rounded-lg text-slate-455 hover:text-white hover:bg-slate-700 transition-colors ${editor.isActive('strike') ? 'text-white bg-slate-700' : ''}`}
                  >
                    <Strikethrough className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => editor.chain().focus().toggleCode().run()} 
                    className={`p-1.5 rounded-lg text-slate-455 hover:text-white hover:bg-slate-700 transition-colors ${editor.isActive('code') ? 'text-white bg-slate-700' : ''}`}
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-slate-700 mx-1" />
                  <button 
                    type="button"
                    onClick={() => {
                      const blockId = editor.state.selection.$from.parent.attrs.id || `block-${Date.now()}`;
                      setSelectedBlockId(blockId);
                    }}
                    className="p-1.5 rounded-lg text-slate-455 hover:text-white hover:bg-slate-700 flex items-center gap-1 text-[10px] font-bold transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Bình luận
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Editor Workspace Component */}
            <EditorContent editor={editor} className="relative z-10" />

            {/* Custom Slash Command trigger Popup Overlay */}
            <AnimatePresence>
              {slashMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-40 w-52 max-h-60 overflow-y-auto text-left"
                  style={{ top: slashMenuCoords.top, left: slashMenuCoords.left }}
                >
                  <div className="px-2 py-1 mb-1 border-b border-slate-100 dark:border-slate-800 select-none">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Định dạng khối</span>
                  </div>
                  {[
                    { id: 'h1', name: 'Tiêu đề 1', desc: 'Tiêu đề lớn nhất', icon: <Heading1 className="w-3.5 h-3.5" /> },
                    { id: 'h2', name: 'Tiêu đề 2', desc: 'Tiêu đề vừa', icon: <Heading2 className="w-3.5 h-3.5" /> },
                    { id: 'h3', name: 'Tiêu đề 3', desc: 'Tiêu đề nhỏ', icon: <Heading3 className="w-3.5 h-3.5" /> },
                    { id: 'bullet', name: 'Danh sách dấu chấm', desc: 'Danh sách không thứ tự', icon: <List className="w-3.5 h-3.5" /> },
                    { id: 'order', name: 'Danh sách số', desc: 'Danh sách có thứ tự', icon: <ListOrdered className="w-3.5 h-3.5" /> },
                    { id: 'todo', name: 'Danh sách công việc', desc: 'Checklist công việc', icon: <CheckSquare className="w-3.5 h-3.5" /> },
                    { id: 'quote', name: 'Trích dẫn', desc: 'Tạo khối trích dẫn', icon: <Quote className="w-3.5 h-3.5" /> },
                    { id: 'code', name: 'Khối mã nguồn', desc: 'Mã nguồn có highlight', icon: <Code className="w-3.5 h-3.5" /> }
                  ].map(cmd => (
                    <button
                      key={cmd.id}
                      onClick={() => handleSlashSelect(cmd.id)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer"
                    >
                      <div className="p-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-500">
                        {cmd.icon}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">{cmd.name}</span>
                        <span className="block text-[8.5px] text-slate-400 font-semibold">{cmd.desc}</span>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 5. ClickUp Style Side Comments Drawer */}
          {selectedBlockId && (
            <div className="w-64 border-l border-slate-200 dark:border-slate-800 pl-4 flex flex-col h-full shrink-0 select-text bg-slate-50/20 dark:bg-slate-900/10 p-2 rounded-2xl max-h-[500px]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 select-none">
                <span className="text-[10px] font-black uppercase text-indigo-650 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Bình luận ({comments.filter(c => c.block_id === selectedBlockId).length})
                </span>
                <button 
                  onClick={() => setSelectedBlockId(null)} 
                  className="text-xs text-slate-400 hover:text-slate-650 cursor-pointer font-bold"
                >
                  Đóng
                </button>
              </div>

              {/* Comments Thread list */}
              <div className="flex-grow overflow-y-auto py-3 space-y-3 scrollbar-thin min-h-0">
                {comments.filter(c => c.block_id === selectedBlockId).length === 0 ? (
                  <p className="text-[10.5px] text-slate-450 italic text-center py-4 select-none">Chưa có bình luận nào. Hãy bắt đầu cuộc hội thoại!</p>
                ) : (
                  comments.filter(c => c.block_id === selectedBlockId).map(c => {
                    const author = getCommentAuthor(c.user_id);
                    return (
                      <div key={c.id} className="text-left space-y-1 p-2 rounded-xl bg-white dark:bg-slate-850 shadow-3xs border border-slate-100 dark:border-slate-800 group">
                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-450 select-none">
                          <span className="flex items-center gap-1 text-slate-750 dark:text-slate-300">
                            {author.avatar ? (
                              <img src={author.avatar} alt={author.name} className="w-3.5 h-3.5 rounded-full object-cover" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-indigo-500" />
                            )}
                            {author.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span>{new Date(c.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                            {c.user_id === currentUser.id && (
                              <button 
                                onClick={() => handleDeleteComment(c.id)}
                                className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[10.5px] text-slate-750 dark:text-slate-300 leading-relaxed font-medium break-all">{c.content}</p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Comment submit form */}
              <form onSubmit={handleAddComment} className="mt-2 flex gap-1.5 items-center select-text">
                <input 
                  type="text" 
                  value={newCommentVal}
                  onChange={e => setNewCommentVal(e.target.value)}
                  placeholder="Viết bình luận..."
                  className="flex-grow bg-white dark:bg-slate-850 px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500 placeholder-slate-400 text-slate-700 dark:text-slate-355"
                />
                <button 
                  type="submit" 
                  disabled={!newCommentVal.trim()}
                  className={`p-1.5 rounded-xl text-white ${
                    newCommentVal.trim() 
                      ? 'bg-indigo-650 hover:bg-indigo-755 cursor-pointer hover:scale-102 active:scale-95' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 pointer-events-none'
                  } transition-all flex items-center justify-center`}
                >
                  <Send className="w-3.5 h-3.5 fill-current" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
