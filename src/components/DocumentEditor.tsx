"use client";

import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
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
  MessageSquare, User, Check, Send, CheckSquare, List, ListOrdered, Quote, Heading1, Heading2, Heading3, Table2, Trash2, Download, FileText, Copy, FileCode, X,
  History, Share2, Globe2, LockKeyhole, RotateCcw, UserPlus, CheckCircle2, ListTodo, WifiOff, ShieldCheck, Pilcrow, Minus, Wand2, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMemberStore } from '@/store/memberStore';
import { callAiApi } from '@/lib/aiClient';
import { renderSpaceIcon } from './EmojiIconPicker';

interface DocumentEditorProps {
  documentId: string;
  initialDocument?: any;
  currentUser: any;
  isOffline?: boolean;
  onUpdateTitle: (title: string) => void;
  onUpdateCoverAndIcon: (coverUrl: string | null, icon: string | null) => void;
  onDocumentUpdated?: (updates: Record<string, unknown>) => void;
  onCreateTask?: (title: string, description: string) => void;
}

interface DocumentVersion {
  id: number;
  title: string;
  icon: string | null;
  cover_url: string | null;
  content: any;
  change_summary: string;
  created_by: string | null;
  created_at: string;
}

const resolveAuthUserId = (user: any): string => {
  const candidate = user?.user_id || user?.authUserId || user?.id || '';
  return typeof candidate === 'string' && candidate.startsWith('user-')
    ? candidate.slice(5)
    : candidate;
};

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

// Preset Covers
const COVERS = [
  'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #f43f5e 50%, #d946ef 100%)',
  'linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)',
  'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)',
  'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)',
];

const EMOJIS = ['📝', '💡', '🎨', '🚀', '🧠', '📅', '🛠️', '📊', '✨', '🌍', '🏠', '🎯', '📚', '⚡', '🔥', '💎', '🎉', '📌'];

type SlashCommandId = 'text' | 'h1' | 'h2' | 'h3' | 'bullet' | 'order' | 'todo' | 'quote' | 'code' | 'divider';

const SLASH_COMMANDS: Array<{
  id: SlashCommandId;
  name: string;
  desc: string;
  keywords: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'text', name: 'Văn bản', desc: 'Đoạn văn bản thông thường', keywords: 'text paragraph van ban doan', category: 'Cơ bản', icon: Pilcrow },
  { id: 'h1', name: 'Tiêu đề 1', desc: 'Tiêu đề phần chính', keywords: 'heading title h1 tieu de', category: 'Cơ bản', icon: Heading1 },
  { id: 'h2', name: 'Tiêu đề 2', desc: 'Tiêu đề cấp hai', keywords: 'heading title h2 tieu de', category: 'Cơ bản', icon: Heading2 },
  { id: 'h3', name: 'Tiêu đề 3', desc: 'Tiêu đề cấp ba', keywords: 'heading title h3 tieu de', category: 'Cơ bản', icon: Heading3 },
  { id: 'bullet', name: 'Danh sách dấu chấm', desc: 'Danh sách không thứ tự', keywords: 'bullet list danh sach cham', category: 'Danh sách', icon: List },
  { id: 'order', name: 'Danh sách số', desc: 'Danh sách có thứ tự', keywords: 'number ordered list danh sach so', category: 'Danh sách', icon: ListOrdered },
  { id: 'todo', name: 'Danh sách công việc', desc: 'Checklist có thể đánh dấu', keywords: 'todo task checklist cong viec', category: 'Danh sách', icon: CheckSquare },
  { id: 'quote', name: 'Trích dẫn', desc: 'Làm nổi bật trích dẫn', keywords: 'quote callout trich dan', category: 'Đặc biệt', icon: Quote },
  { id: 'code', name: 'Khối mã nguồn', desc: 'Đoạn mã lập trình', keywords: 'code block ma nguon', category: 'Đặc biệt', icon: Code },
  { id: 'divider', name: 'Đường phân cách', desc: 'Chia phần nội dung', keywords: 'divider separator horizontal rule duong phan cach', category: 'Đặc biệt', icon: Minus },
];

const normalizeSearchText = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .toLowerCase()
  .trim();

const filterSlashCommands = (query: string) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter(command =>
    normalizeSearchText(`${command.name} ${command.desc} ${command.keywords}`).includes(normalizedQuery)
  );
};

export default function DocumentEditor({
  documentId,
  initialDocument,
  currentUser,
  isOffline = false,
  onUpdateTitle,
  onUpdateCoverAndIcon,
  onDocumentUpdated,
  onCreateTask
}: DocumentEditorProps) {
  const [docDetails, setDocDetails] = useState<any>(initialDocument || null);
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentVal, setNewCommentVal] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuCoords, setSlashMenuCoords] = useState({ top: 0, left: 0 });
  const [slashQuery, setSlashQuery] = useState('');
  const [slashActiveIndex, setSlashActiveIndex] = useState(0);
  const [bubbleMenuOpen, setBubbleMenuOpen] = useState(false);
  const [bubbleMenuCoords, setBubbleMenuCoords] = useState({ top: 0, left: 0 });
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [shareRole, setShareRole] = useState<'editor' | 'commenter' | 'viewer'>('editor');
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const titleSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedDocumentId = useRef<string | null>(null);
  const editorWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const slashMenuRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<any>(null);
  const slashMenuOpenRef = useRef(false);
  const slashRangeRef = useRef({ from: 0, to: 0 });
  const slashActiveIndexRef = useRef(0);
  const filteredSlashCommandsRef = useRef(SLASH_COMMANDS);
  const authUserId = resolveAuthUserId(currentUser);
  
  const members = useMemberStore(s => s.members);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);

  const getCommentAuthor = (userId: string) => {
    const member = members.find(m => m.id === `user-${userId}` || m.id === userId || (m as any).user_id === userId);
    return {
      name: member?.name || 'Thành viên Apexa',
      avatar: member?.avatar || null
    };
  };

  const userColor = useMemo(() => {
    const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    return colors[Math.floor(Math.random() * colors.length)];
  }, []);

  const yDoc = useMemo(() => new Doc(), []);

  const provider = useMemo(() => {
    return new SupabaseYjsProvider(
      yDoc,
      `doc-collab-${documentId}`,
      authUserId || 'user',
      currentUser?.name || 'Anonymous User',
      userColor,
      currentUser?.avatar || ''
    );
  }, [yDoc, documentId, authUserId, currentUser, userColor]);

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
      if (initialDocument) setDocDetails(initialDocument);
      if (isOffline) return;

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();
      
      if (!error && data) {
        setDocDetails(data);
      }

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

    if (isOffline) {
      return () => provider.destroy();
    }

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
  }, [documentId, isOffline, provider, yDoc]);

  useEffect(() => () => {
    if (titleSaveTimeout.current) clearTimeout(titleSaveTimeout.current);
  }, []);

  const editorExtensions = useMemo(() => {
    const baseExtensions: any[] = [
      StarterKit.configure({
        history: !isOffline && yDoc && typeof yDoc.getXmlFragment === 'function' ? false : undefined,
      } as any),
      Placeholder.configure({
        placeholder: "Nhấn '/' để chèn tiêu đề, danh sách, mã nguồn...",
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ];

    if (!isOffline && yDoc && typeof yDoc.getXmlFragment === 'function') {
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
  }, [currentUser, isOffline, provider, userColor, yDoc]);

  const closeSlashMenu = useCallback(() => {
    slashMenuOpenRef.current = false;
    setSlashMenuOpen(false);
  }, []);

  const updateSlashMenu = useCallback((editorInstance: any) => {
    const { view, state } = editorInstance;
    const { selection } = state;
    if (!selection.empty) {
      closeSlashMenu();
      return;
    }

    const textBeforeCursor = selection.$from.parent.textBetween(
      0,
      selection.$from.parentOffset,
      undefined,
      '\ufffc'
    );
    const match = textBeforeCursor.match(/(?:^|\s)\/([^/]*)$/);
    if (!match) {
      closeSlashMenu();
      return;
    }

    const query = match[1];
    const range = { from: selection.from - query.length - 1, to: selection.from };
    const filteredCommands = filterSlashCommands(query);
    const coords = view.coordsAtPos(selection.from);
    const workspaceBounds = editorWorkspaceRef.current?.getBoundingClientRect() || view.dom.getBoundingClientRect();
    const menuWidth = 320;
    const menuHeight = 300;
    const spaceBelow = window.innerHeight - coords.bottom;
    const topPos = spaceBelow < menuHeight && coords.top > menuHeight
      ? coords.top - workspaceBounds.top - menuHeight - 8
      : coords.bottom - workspaceBounds.top + 8;

    slashRangeRef.current = range;
    filteredSlashCommandsRef.current = filteredCommands;
    slashMenuOpenRef.current = true;
    slashActiveIndexRef.current = 0;
    setSlashQuery(query);
    setSlashActiveIndex(0);
    setSlashMenuCoords({
      top: topPos,
      left: Math.max(8, Math.min(coords.left - workspaceBounds.left, workspaceBounds.width - menuWidth - 8)),
    });
    setSlashMenuOpen(true);
  }, [closeSlashMenu]);

  const runSlashCommand = useCallback((command: SlashCommandId) => {
    const editorInstance = editorRef.current;
    if (!editorInstance) return;

    const chain = editorInstance.chain().focus().deleteRange(slashRangeRef.current);
    switch (command) {
      case 'text': chain.setParagraph().run(); break;
      case 'h1': chain.setHeading({ level: 1 }).run(); break;
      case 'h2': chain.setHeading({ level: 2 }).run(); break;
      case 'h3': chain.setHeading({ level: 3 }).run(); break;
      case 'bullet': chain.toggleBulletList().run(); break;
      case 'order': chain.toggleOrderedList().run(); break;
      case 'todo': chain.toggleTaskList().run(); break;
      case 'quote': chain.toggleBlockquote().run(); break;
      case 'code': chain.toggleCodeBlock().run(); break;
      case 'divider': chain.setHorizontalRule().run(); break;
    }
    closeSlashMenu();
  }, [closeSlashMenu]);

  const editor = useEditor({
    extensions: editorExtensions,
    editorProps: {
      attributes: {
        class: 'document-editor prose prose-sm dark:prose-invert focus:outline-none max-w-none text-sm font-medium text-slate-800 dark:text-slate-200 min-h-[450px] select-text leading-relaxed break-words',
      },
      handleKeyDown: (_view, event) => {
        if (!slashMenuOpenRef.current) return false;
        const commands = filteredSlashCommandsRef.current;

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          if (!commands.length) return true;
          const direction = event.key === 'ArrowDown' ? 1 : -1;
          const nextIndex = (slashActiveIndexRef.current + direction + commands.length) % commands.length;
          slashActiveIndexRef.current = nextIndex;
          setSlashActiveIndex(nextIndex);
          return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          if (!commands.length) return false;
          event.preventDefault();
          runSlashCommand(commands[slashActiveIndexRef.current]?.id || commands[0].id);
          return true;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          closeSlashMenu();
          return true;
        }
        return false;
      },
    },
    onUpdate({ editor }) {
      updateSlashMenu(editor);
      if (isOffline) return;
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
        updateSlashMenu(editor);
      } else {
        closeSlashMenu();
        
        try {
          const startCoords = view.coordsAtPos(from);
          const endCoords = view.coordsAtPos(to);
          const editorBounds = editorWorkspaceRef.current?.getBoundingClientRect() || view.dom.getBoundingClientRect();
          
          const left = Math.max(16, Math.min((startCoords.left + endCoords.left) / 2 - editorBounds.left, editorBounds.width - 240));
          const rawTop = startCoords.top - editorBounds.top - 48;
          const top = rawTop < 10 ? startCoords.bottom - editorBounds.top + 8 : rawTop;
          
          setBubbleMenuCoords({ top, left });
          setBubbleMenuOpen(true);
        } catch (e) {
          console.warn('Error positioning bubble menu:', e);
        }
      }
    },
    onBlur() {
      closeSlashMenu();
    },
  }, [documentId, isOffline, yDoc, provider, closeSlashMenu, runSlashCommand, updateSlashMenu]);

  useEffect(() => {
    editorRef.current = editor;
    return () => {
      editorRef.current = null;
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || !docDetails || hydratedDocumentId.current === documentId) return;
    const content = docDetails.content;
    if (content && typeof content === 'object') {
      editor.commands.setContent(content, { emitUpdate: false });
    }
    editor.setEditable(!isOffline);
    hydratedDocumentId.current = documentId;
  }, [docDetails, documentId, editor, isOffline]);

  const filteredSlashCommands = filterSlashCommands(slashQuery);

  useEffect(() => {
    slashMenuRef.current
      ?.querySelector<HTMLElement>('[data-slash-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [slashActiveIndex, slashQuery]);

  const handleSaveTitle = async (val: string) => {
    setDocDetails((prev: any) => prev ? { ...prev, title: val } : null);
    onUpdateTitle(val);
    onDocumentUpdated?.({ title: val });
    if (isOffline) return;
    if (titleSaveTimeout.current) clearTimeout(titleSaveTimeout.current);
    titleSaveTimeout.current = setTimeout(async () => {
      await supabase
        .from('documents')
        .update({ title: val, updated_at: new Date().toISOString() })
        .eq('id', documentId);
    }, 500);
  };

  const selectEmoji = async (emoji: string) => {
    setDocDetails((prev: any) => prev ? { ...prev, icon: emoji } : null);
    onUpdateCoverAndIcon(docDetails?.cover_url || null, emoji);
    onDocumentUpdated?.({ icon: emoji });
    setShowIconPicker(false);
    if (isOffline) return;
    await supabase
      .from('documents')
      .update({ icon: emoji })
      .eq('id', documentId);
  };

  const selectCover = async (cover: string | null) => {
    setDocDetails((prev: any) => prev ? { ...prev, cover_url: cover } : null);
    onUpdateCoverAndIcon(cover, docDetails?.icon || null);
    onDocumentUpdated?.({ cover_url: cover });
    setShowCoverPicker(false);
    if (isOffline) return;
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
      user_id: authUserId,
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

  const handleResolveComment = async (commentId: string, isResolved: boolean) => {
    if (isOffline) return;
    const { error } = await supabase
      .from('document_comments')
      .update({ is_resolved: !isResolved, updated_at: new Date().toISOString() })
      .eq('id', commentId);
    if (!error) {
      setComments(prev => prev.map(comment => comment.id === commentId
        ? { ...comment, is_resolved: !isResolved }
        : comment));
    }
  };

  const loadVersions = async () => {
    if (isOffline) return;
    setVersionsLoading(true);
    const { data } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(50);
    setVersions((data || []) as DocumentVersion[]);
    setVersionsLoading(false);
  };

  const openHistory = () => {
    setShowHistory(!showHistory);
    setShowShareMenu(false);
    if (!showHistory) void loadVersions();
  };

  const restoreVersion = async (version: DocumentVersion) => {
    if (isOffline || !editor) return;
    const updates = {
      title: version.title,
      icon: version.icon,
      cover_url: version.cover_url,
      content: version.content
    };
    setDocDetails((prev: any) => ({ ...prev, ...updates }));
    onUpdateTitle(version.title);
    onUpdateCoverAndIcon(version.cover_url, version.icon);
    editor.commands.setContent(version.content);
    await supabase.from('documents').update(updates).eq('id', documentId);
  };

  const loadCollaborators = async () => {
    if (isOffline) return;
    const { data } = await supabase.from('document_collaborators').select('*').eq('document_id', documentId);
    if (data) setCollaborators(data);
  };

  const openShareMenu = () => {
    setShowShareMenu(!showShareMenu);
    setShowHistory(false);
    if (!showShareMenu) void loadCollaborators();
  };

  const addCollaborator = async () => {
    if (!selectedCollaboratorId || isOffline) return;
    const member = members.find(memberItem => memberItem.id === selectedCollaboratorId);
    const memberAuthId = resolveAuthUserId(member);
    if (!memberAuthId) return;
    const { error } = await supabase.from('document_collaborators').upsert({
      document_id: documentId,
      user_id: memberAuthId,
      role: shareRole
    }, { onConflict: 'document_id,user_id' });
    if (!error) {
      setSelectedCollaboratorId('');
      await loadCollaborators();
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    if (isOffline) return;
    const { error } = await supabase.from('document_collaborators').delete().eq('id', collaboratorId);
    if (!error) setCollaborators(prev => prev.filter(item => item.id !== collaboratorId));
  };

  const togglePublished = async () => {
    if (isOffline) return;
    const nextPublished = !docDetails?.is_published;
    const { error } = await supabase
      .from('documents')
      .update({ is_published: nextPublished })
      .eq('id', documentId);
    if (!error) {
      setDocDetails((current: any) => ({ ...current, is_published: nextPublished }));
      onDocumentUpdated?.({ is_published: nextPublished });
    }
  };

  const createTaskFromSelection = () => {
    if (!editor || !onCreateTask) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ').trim();
    if (!selectedText) return;
    onCreateTask(
      selectedText.length > 90 ? `${selectedText.slice(0, 87)}…` : selectedText,
      `Được tạo từ tài liệu “${docDetails?.title || 'Chưa có tiêu đề'}”.\n\n${selectedText}`
    );
    setBubbleMenuOpen(false);
  };

  if (!editor || !docDetails) {
    return (
      <div className="flex-1 flex items-center justify-center py-20 text-slate-400 dark:text-slate-500 font-bold text-xs gap-3 select-none">
        <Sparkles className="w-5 h-5 animate-pulse text-indigo-500" />
        Đang mở trình soạn thảo tài liệu...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 select-text overflow-y-auto font-sans relative scrollbar-thin">
      
      {/* Exit Focus Mode Floating Pill */}
      {isFocusMode && (
        <div className="sticky top-3 z-50 flex justify-center pointer-events-none select-none">
          <button
            type="button"
            onClick={() => setIsFocusMode(false)}
            className="pointer-events-auto px-4 py-1.5 rounded-full bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 text-xs font-extrabold shadow-xl backdrop-blur-md hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-600" />
            <span>Thoát chế độ tập trung</span>
          </button>
        </div>
      )}

      {/* 1. Cover Image Banner (Hidden in Focus Mode) */}
      {!isFocusMode && (
        <div 
          className="relative w-full h-36 md:h-48 group select-none shrink-0 transition-all duration-300 shadow-inner" 
          style={{ background: docDetails.cover_url || COVERS[0] }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-4 gap-2 z-10">
            <div className="relative">
              <button
                onClick={() => setShowCoverPicker(!showCoverPicker)}
                className="px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-white text-slate-800 dark:text-slate-100 text-xs font-extrabold backdrop-blur-md shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Đổi ảnh bìa</span>
              </button>

              {/* Cover Picker Popover */}
              {showCoverPicker && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute right-0 bottom-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-2xl z-40 w-64 space-y-2 text-left"
                >
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Chọn dải màu Gradient</span>
                  <div className="grid grid-cols-3 gap-2">
                    {COVERS.map((c, i) => (
                      <button 
                        key={i} 
                        onClick={() => selectCover(c)}
                        className="h-10 rounded-xl border border-white/40 hover:scale-105 transition-transform shadow-xs cursor-pointer"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <div className="pt-2 border-t border-slate-150 dark:border-slate-800">
                    <button
                      onClick={() => selectCover(null)}
                      className="w-full text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-1.5 rounded-xl transition-colors"
                    >
                      Gỡ ảnh bìa
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`max-w-4xl w-full mx-auto px-6 md:px-12 pb-24 relative flex flex-col flex-grow text-left ${isFocusMode ? 'pt-8' : 'mt-[-28px]'}`}>
        
        {/* 2. Page Icon & Realtime Active Users Header */}
        {!isFocusMode && (
          <div className="relative select-none z-20 flex justify-between items-end">
            
            {/* Icon Button & Popover */}
            <div className="relative group/emoji">
              <button 
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-3xl cursor-pointer hover:scale-105 transition-transform"
              >
                {docDetails.icon ? renderSpaceIcon(docDetails.icon, "w-8 h-8 text-slate-700 dark:text-slate-200") : '📝'}
              </button>
              
              {showIconPicker && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute left-0 top-full mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-2xl z-40 grid grid-cols-6 gap-1.5 w-64"
                >
                  {EMOJIS.map(emo => (
                    <button
                      key={emo}
                      onClick={() => selectEmoji(emo)}
                      className="w-8 h-8 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl flex items-center justify-center text-xl cursor-pointer hover:scale-110 transition-transform"
                    >
                      {emo}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Active Collaborators Presence Stack & Status */}
            <div className="flex items-center gap-3 bg-slate-50/90 dark:bg-slate-950/60 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 select-none shadow-2xs">
              <span className={`flex items-center gap-1.5 text-[11px] font-extrabold ${isOffline ? 'text-amber-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                <span className="relative flex h-2 w-2">
                  {!isOffline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isOffline ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                </span>
                {isOffline ? 'Ngoại tuyến' : 'Đã lưu tự động'}
              </span>

              {/* User Avatars */}
              {activeUsers.length > 0 && (
                <div className="flex -space-x-2 overflow-hidden pl-1">
                  {activeUsers.map((user, idx) => (
                    <div 
                      key={user.id || idx}
                      className="relative group/avatar cursor-pointer"
                    >
                      {user.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user.name} 
                          className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 object-cover shadow-xs" 
                          style={{ borderColor: user.color }}
                        />
                      ) : (
                        <div 
                          className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] font-black text-white shadow-xs" 
                          style={{ backgroundColor: user.color }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-slate-900 text-white text-[9px] font-bold rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none z-30">
                        {user.name} {user.id === authUserId ? '(Bạn)' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Document Title Input */}
        <div className="mt-4">
          <input 
            type="text" 
            value={docDetails.title || ''}
            onChange={e => handleSaveTitle(e.target.value)}
            readOnly={isOffline}
            placeholder="Chưa có tiêu đề"
            className="w-full bg-transparent border-0 outline-none font-black text-2xl md:text-4xl tracking-tight placeholder-slate-300 dark:placeholder-slate-700 text-slate-900 dark:text-white transition-all"
          />
        </div>

        {/* Document Actions Bar */}
        {!isFocusMode && (
          <div className="flex items-center justify-between gap-3 mt-3 select-none pb-2 border-b border-slate-150 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              {/* AI Assistant Button */}
              <div className="relative">
                <button
                  onClick={() => setShowAiMenu(!showAiMenu)}
                  disabled={isAiProcessing}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 hover:from-indigo-500/20 hover:to-pink-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80 transition-all font-extrabold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Wand2 className={`w-3.5 h-3.5 ${isAiProcessing ? 'animate-spin' : ''}`} />
                  <span>{isAiProcessing ? 'AI đang viết...' : 'AI Assistant'}</span>
                </button>

                {showAiMenu && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="absolute left-0 top-full mt-2 w-60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-1.5 z-40 space-y-1 text-left"
                  >
                    <button 
                      onClick={() => handleAiAction('expand')}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl cursor-pointer flex items-center gap-2"
                    >
                      ✨ Viết tiếp & Phát triển ý
                    </button>
                    <button 
                      onClick={() => handleAiAction('summarize')}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl cursor-pointer flex items-center gap-2"
                    >
                      📝 Tóm tắt nội dung
                    </button>
                    <button 
                      onClick={() => handleAiAction('translate')}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl cursor-pointer flex items-center gap-2"
                    >
                      🌐 Dịch sang Tiếng Anh
                    </button>
                    <button 
                      onClick={() => handleAiAction('formal')}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl cursor-pointer flex items-center gap-2"
                    >
                      👔 Đổi văn phong Trang trọng
                    </button>
                  </motion.div>
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

              {/* History Button */}
              <button
                onClick={openHistory}
                disabled={isOffline}
                className={`p-1.5 rounded-xl transition-colors disabled:opacity-40 cursor-pointer ${showHistory ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Lịch sử phiên bản"
              >
                <History className="w-4 h-4" />
              </button>

              {/* Share Button */}
              <button
                onClick={openShareMenu}
                disabled={isOffline}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer ${showShareMenu ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Chia sẻ</span>
              </button>

              {/* Focus Mode Toggle */}
              <button
                onClick={() => setIsFocusMode(!isFocusMode)}
                className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Chế độ tập trung (Focus Mode)"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>

            {/* Word Count Stats */}
            {editor && (() => {
              const words = editor.getText().trim().split(/\s+/).filter(Boolean).length;
              const readTime = Math.max(1, Math.ceil(words / 200));
              return (
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 shrink-0 bg-slate-100/60 dark:bg-slate-800/60 px-2.5 py-1 rounded-xl">
                  <span>{words} từ</span>
                  <span>•</span>
                  <span>{readTime} phút đọc</span>
                </div>
              );
            })()}
          </div>
        )}

        {/* Drawers: History & Share */}
        <AnimatePresence initial={false}>
          {showHistory && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/40 backdrop-blur-md"
              aria-label="Lịch sử phiên bản"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-indigo-500" /> Lịch sử phiên bản
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Các điểm khôi phục được lưu lại tự động.</p>
                </div>
                <button type="button" onClick={() => setShowHistory(false)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="max-h-56 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
                {versionsLoading ? (
                  <p className="py-5 text-center text-xs font-semibold text-slate-400">Đang tải lịch sử phiên bản...</p>
                ) : versions.length === 0 ? (
                  <p className="py-5 text-center text-xs font-semibold text-slate-400">Phiên bản sẽ tự động tạo sau các lần chỉnh sửa tiếp theo.</p>
                ) : versions.map(version => (
                  <div key={version.id} className="flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-slate-900 px-3 py-2 border border-slate-200/60 dark:border-slate-800">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">{version.icon || '📝'} {version.title}</p>
                      <p className="text-[10px] text-slate-400">{new Date(version.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                    <button type="button" onClick={() => restoreVersion(version)} className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex items-center gap-1 cursor-pointer">
                      <RotateCcw className="w-3 h-3" /> Khôi phục
                    </button>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {showShareMenu && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/40 backdrop-blur-md"
              aria-label="Quyền truy cập tài liệu"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Quyền truy cập & Chia sẻ
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Phân quyền trực tiếp hoặc công khai tài liệu.</p>
                </div>
                <button type="button" onClick={() => setShowShareMenu(false)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="p-3 space-y-3">
                <button type="button" onClick={togglePublished} className="w-full flex items-center justify-between rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-3.5 py-2.5 text-left cursor-pointer">
                  <span className="flex items-center gap-3">
                    {docDetails.is_published ? <Globe2 className="w-5 h-5 text-emerald-500" /> : <LockKeyhole className="w-5 h-5 text-slate-400" />}
                    <span>
                      <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">{docDetails.is_published ? 'Đã xuất bản (Công khai)' : 'Riêng tư'}</span>
                      <span className="block text-[10px] text-slate-400">{docDetails.is_published ? 'Bất kỳ ai có liên kết đều có thể đọc.' : 'Chỉ những thành viên được cấp quyền mới xem được.'}</span>
                    </span>
                  </span>
                  <span className={`w-9 h-5 rounded-full p-0.5 transition-colors ${docDetails.is_published ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${docDetails.is_published ? 'translate-x-4' : ''}`} />
                  </span>
                </button>

                <div className="flex gap-2">
                  <select value={selectedCollaboratorId} onChange={event => setSelectedCollaboratorId(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <option value="">Chọn thành viên...</option>
                    {members.filter(member => resolveAuthUserId(member) && resolveAuthUserId(member) !== authUserId).map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                  </select>
                  <select value={shareRole} onChange={event => setShareRole(event.target.value as typeof shareRole)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <option value="editor">Chỉnh sửa</option>
                    <option value="commenter">Bình luận</option>
                    <option value="viewer">Chỉ xem</option>
                  </select>
                  <button type="button" onClick={addCollaborator} disabled={!selectedCollaboratorId} className="px-3 py-2 rounded-xl bg-indigo-600 text-white disabled:opacity-40 font-bold text-xs flex items-center gap-1 cursor-pointer">
                    <UserPlus className="w-3.5 h-3.5" /> Thêm
                  </button>
                </div>

                {collaborators.length > 0 && (
                  <div className="space-y-1">
                    {collaborators.map(collaborator => {
                      const member = members.find(memberItem => resolveAuthUserId(memberItem) === collaborator.user_id);
                      return (
                        <div key={collaborator.id} className="flex items-center justify-between rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {member?.name || 'Thành viên'} <span className="text-slate-400 font-semibold">· {collaborator.role}</span>
                          </span>
                          <button type="button" onClick={() => removeCollaborator(collaborator.id)} className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* 4. Rich Editor Workspace & Comments Drawer */}
        <div ref={editorWorkspaceRef} className="flex-1 flex gap-6 relative min-h-0 mt-4">
          <div className="flex-grow min-w-0 pr-2">
            
            {/* Tiptap Floating Bubble Menu on text selections */}
            <AnimatePresence>
              {bubbleMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-1.5 shadow-2xl z-50 flex items-center gap-1 text-white"
                  style={{ top: bubbleMenuCoords.top, left: bubbleMenuCoords.left }}
                  onClick={e => e.stopPropagation()}
                >
                  <button 
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()} 
                    className={`p-1.5 rounded-lg hover:bg-slate-700 transition-colors ${editor.isActive('bold') ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
                    title="In đậm"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()} 
                    className={`p-1.5 rounded-lg hover:bg-slate-700 transition-colors ${editor.isActive('italic') ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
                    title="In nghiêng"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => editor.chain().focus().toggleStrike().run()} 
                    className={`p-1.5 rounded-lg hover:bg-slate-700 transition-colors ${editor.isActive('strike') ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
                    title="Gạch ngang"
                  >
                    <Strikethrough className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => editor.chain().focus().toggleCode().run()} 
                    className={`p-1.5 rounded-lg hover:bg-slate-700 transition-colors ${editor.isActive('code') ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
                    title="Mã nguồn"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                  
                  <div className="w-px h-4 bg-slate-700 mx-1" />

                  <button 
                    type="button"
                    onClick={() => {
                      const selectionPosition = editor.state.selection.$from.depth > 0
                        ? editor.state.selection.$from.before()
                        : 0;
                      const blockId = editor.state.selection.$from.parent.attrs.id || `block-${selectionPosition}`;
                      setSelectedBlockId(blockId);
                    }}
                    className="px-2 py-1 rounded-lg hover:bg-slate-700 flex items-center gap-1 text-xs font-bold transition-colors text-slate-300"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Bình luận
                  </button>
                  {onCreateTask && (
                    <button
                      type="button"
                      onClick={createTaskFromSelection}
                      className="px-2 py-1 rounded-lg hover:bg-slate-700 flex items-center gap-1 text-xs font-bold transition-colors text-slate-300"
                    >
                      <ListTodo className="w-3.5 h-3.5 text-emerald-400" /> Tạo task
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Editor Content Area */}
            <EditorContent editor={editor} className="relative z-10" />

            {/* Slash Command Floating Palette Menu */}
            <AnimatePresence>
              {slashMenuOpen && (
                <motion.div 
                  ref={slashMenuRef}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  role="listbox"
                  aria-label="Lệnh chèn khối"
                  className="absolute bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-40 w-80 max-h-80 overflow-y-auto text-left select-none scrollbar-thin"
                  style={{ top: slashMenuCoords.top, left: slashMenuCoords.left }}
                >
                  <div className="flex items-center justify-between gap-3 px-2 py-1.5 mb-1.5 border-b border-slate-150 dark:border-slate-800">
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Chèn khối</span>
                      <span className="block text-[11px] font-semibold text-slate-500 mt-0.5">
                        {slashQuery ? <>Kết quả cho “{slashQuery}”</> : 'Bắt đầu nhập để tìm lệnh'}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">↑↓ chọn · Enter chèn</span>
                  </div>
                  {filteredSlashCommands.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Không tìm thấy lệnh</p>
                      <p className="text-[10px] text-slate-400 mt-1">Thử “tiêu đề”, “todo”, “code” hoặc “divider”.</p>
                    </div>
                  ) : filteredSlashCommands.map((cmd, index) => {
                    const Icon = cmd.icon;
                    const isActive = index === slashActiveIndex;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        data-slash-active={isActive}
                        onMouseEnter={() => {
                          slashActiveIndexRef.current = index;
                          setSlashActiveIndex(index);
                        }}
                        onMouseDown={event => {
                          event.preventDefault();
                          runSlashCommand(cmd.id);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors cursor-pointer ${isActive ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'}`}
                      >
                        <div className={`w-8 h-8 shrink-0 rounded-xl border flex items-center justify-center ${isActive ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 border-slate-200/60 dark:border-slate-700 text-slate-500'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-bold">{cmd.name}</span>
                          <span className="block text-[10px] text-slate-400 font-medium mt-0.5">{cmd.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 5. Side Comments Drawer */}
          {selectedBlockId && (
            <div className="w-72 border-l border-slate-200/80 dark:border-slate-800 pl-4 flex flex-col h-full shrink-0 select-text bg-slate-50/50 dark:bg-slate-950/30 p-3 rounded-2xl max-h-[500px]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800 select-none">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Bình luận ({comments.filter(c => c.block_id === selectedBlockId).length})
                </span>
                <button 
                  onClick={() => setSelectedBlockId(null)} 
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Comments Thread list */}
              <div className="flex-grow overflow-y-auto py-3 space-y-3 scrollbar-thin min-h-0">
                {comments.filter(c => c.block_id === selectedBlockId).length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6 select-none font-medium">Chưa có bình luận nào.</p>
                ) : (
                  comments.filter(c => c.block_id === selectedBlockId).map(c => {
                    const author = getCommentAuthor(c.user_id);
                    return (
                      <div key={c.id} className={`text-left space-y-1.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border group ${c.is_resolved ? 'border-emerald-200 dark:border-emerald-900/50 opacity-70' : 'border-slate-200/70 dark:border-slate-800 shadow-2xs'}`}>
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 select-none">
                          <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                            {author.avatar ? (
                              <img src={author.avatar} alt={author.name} className="w-4 h-4 rounded-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-indigo-500" />
                            )}
                            {author.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span>{new Date(c.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                            {(c.user_id === authUserId || docDetails?.user_id === authUserId) && (
                              <button 
                                onClick={() => handleDeleteComment(c.id)}
                                className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className={`text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium break-all ${c.is_resolved ? 'line-through text-slate-400' : ''}`}>{c.content}</p>
                        <div className="flex items-center gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity select-none">
                          <button type="button" onClick={() => handleResolveComment(c.id, Boolean(c.is_resolved))} className="px-2 py-1 rounded-lg text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-1 cursor-pointer">
                            <CheckCircle2 className="w-3 h-3" /> {c.is_resolved ? 'Mở lại' : 'Giải quyết'}
                          </button>
                          {onCreateTask && (
                            <button type="button" onClick={() => onCreateTask(`Theo dõi: ${c.content.slice(0, 70)}`, `Được tạo từ bình luận trong tài liệu “${docDetails?.title || 'Chưa có tiêu đề'}”.\n\n${c.content}`)} className="px-2 py-1 rounded-lg text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex items-center gap-1 cursor-pointer">
                              <ListTodo className="w-3 h-3" /> Tạo task
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Comment Input */}
              <form onSubmit={handleAddComment} className="mt-2 flex gap-2 items-center select-text">
                <input 
                  type="text" 
                  value={newCommentVal}
                  onChange={e => setNewCommentVal(e.target.value)}
                  disabled={isOffline}
                  placeholder="Viết bình luận..."
                  className="flex-grow bg-white dark:bg-slate-900 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500 placeholder-slate-400 text-slate-800 dark:text-slate-100"
                />
                <button 
                  type="submit" 
                  disabled={!newCommentVal.trim()}
                  className={`p-2 rounded-xl text-white ${
                    newCommentVal.trim() 
                      ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-xs active:scale-95' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 pointer-events-none'
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
