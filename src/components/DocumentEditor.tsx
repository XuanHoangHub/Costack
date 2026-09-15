"use client";

import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { Extension } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import { yCursorPlugin } from '@tiptap/y-tiptap';
import { Doc } from 'yjs';
import { supabase, getCleanChannel } from '../supabaseClient';
import { 
  Bold, Italic, Strikethrough, Code, Sparkles, Image as ImageIcon,
  MessageSquare, User, Send, CheckSquare, List, ListOrdered, Quote, Heading1, Heading2, Heading3,
  Download, FileText, Copy, X, History, Share2, Globe2, LockKeyhole, Link2, Check,
  RotateCcw, RotateCw, UserPlus, CheckCircle2, ListTodo, ShieldCheck, Pilcrow, Minus, Wand2, Eye,
  Printer, BookOpen, Sliders, Lightbulb, AlertTriangle, Pin, ChevronDown, Lock, Unlock, Trash2,
  Cloud, CloudOff, WifiOff, LoaderCircle, Table2, Underline as UnderlineIcon, Palette,
  Plus, ExternalLink, RefreshCw, Columns3, Rows3, CheckCheck, Shuffle, Search,
  QrCode, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ShareSettingsModal from './ShareSettingsModal';
import { ShareRole } from '../types';
import { useMemberStore } from '@/store/memberStore';
import { callAiApi } from '@/lib/aiClient';
import EmojiIconPicker, { renderSpaceIcon } from './EmojiIconPicker';
import { Select } from './ui/Select';
import DocumentTools from './documents/DocumentTools';
import { documentExtensions } from './documents/documentExtensions';
import { documentToMarkdown, escapeDocumentHtml, normalizeDocumentContent } from '@/lib/documentModel';
import { useDocumentAutosave } from '@/hooks/useDocumentAutosave';
import { ApexaAiIcon } from './ApexaAiIcon';
import {
  SupabaseYjsProvider,
  type DocumentRealtimeStatus,
} from '@/lib/supabaseYjsProvider';

interface DocumentEditorProps {
  documentId: string;
  initialDocument?: any;
  currentUser: any;
  isOffline?: boolean;
  onUpdateTitle: (title: string) => void;
  onUpdateCoverAndIcon: (coverUrl: string | null, icon: string | null) => void;
  onDocumentUpdated?: (updates: Record<string, unknown>) => void;
  onCreateTask?: (title: string, description: string) => void;
  pendingInsertion?: { id: number; text: string } | null;
  onInsertionHandled?: () => void;
  onAddPage?: () => void;
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

type PaperStyle = 'blank' | 'lined' | 'grid' | 'warm';
type FontFamily = 'sans' | 'serif' | 'mono';
type FontSize = 'sm' | 'md' | 'lg';
type PageWidth = 'standard' | 'wide' | 'full';
type DocumentAccessLevel = 'owner' | 'editor' | 'commenter' | 'viewer' | 'none';
type DocumentSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const resolveAuthUserId = (user: any): string => {
  const candidate = user?.user_id || user?.authUserId || user?.id || '';
  return typeof candidate === 'string' && candidate.startsWith('user-')
    ? candidate.slice(5)
    : candidate;
};

export const COLLAB_COLORS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#f43f5e', // Rose
  '#14b8a6', // Teal
];

const getUserCollabColor = (userId?: string, seedName?: string) => {
  const str = userId || seedName || 'user';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return COLLAB_COLORS[Math.abs(hash) % COLLAB_COLORS.length];
};

// Custom Collaboration Cursor Extension using @tiptap/y-tiptap to avoid pluginKey mismatch
const CustomCollaborationCursor = Extension.create({
  name: 'collaborationCursor',
  addOptions() {
    return {
      provider: null as any,
      user: {
        name: 'Thành viên',
        color: '#6366f1',
        avatar: '',
      },
    };
  },
  addProseMirrorPlugins() {
    if (!this.options.provider?.awareness) {
      return [];
    }
    const awareness = this.options.provider.awareness;
    if (this.options.user) {
      try {
        awareness.setLocalStateField('user', this.options.user);
      } catch (e) {
        console.warn('Error setting awareness user:', e);
      }
    }
    try {
      return [
        yCursorPlugin(awareness, {
          cursorBuilder: (user: any) => {
            const cursor = document.createElement('span');
            cursor.classList.add('collaboration-cursor__caret');
            cursor.setAttribute('style', `border-left-color: ${user?.color || '#6366f1'}`);

            const label = document.createElement('div');
            label.classList.add('collaboration-cursor__label');
            label.setAttribute('style', `background-color: ${user?.color || '#6366f1'}`);

            const nameSpan = document.createElement('span');
            nameSpan.textContent = user?.name || 'Thành viên';
            label.appendChild(nameSpan);

            cursor.appendChild(label);
            return cursor;
          },
        }),
      ];
    } catch (err) {
      console.warn('Error initializing yCursorPlugin:', err);
      return [];
    }
  },
});

// Preset Gradients & Wallpapers
export const PRESET_GRADIENTS = [
  { label: 'Ánh hoàng hôn', value: 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)' },
  { label: 'Đại dương xanh', value: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)' },
  { label: 'Cực quang tím', value: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)' },
  { label: 'Bạc hà tươi mát', value: 'linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%)' },
  { label: 'Cam nhiệt đới', value: 'linear-gradient(135deg, #f59e0b 0%, #f43f5e 50%, #d946ef 100%)' },
  { label: 'Vũ trụ sâu thẳm', value: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)' },
  { label: 'Rừng thông Bắc Âu', value: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)' },
  { label: 'Đêm huyền bí', value: 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)' },
];

export const PRESET_WALLPAPERS = [
  { label: 'Kiến trúc tối giản', value: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80' },
  { label: 'Bàn làm việc sáng tạo', value: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1600&q=80' },
  { label: 'Sóng trừu tượng 3D', value: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80' },
  { label: 'Đỉnh núi sương mù', value: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80' },
  { label: 'Ánh sáng hình học', value: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1600&q=80' },
  { label: 'Thành phố Tokyo', value: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1600&q=80' },
];

export const EMOJI_CATEGORIES = [
  {
    id: 'work',
    name: 'Công việc',
    emojis: ['📝', '💼', '📊', '📈', '📅', '📋', '🗂️', '📌', '🖋️', '🏢', '🤝', '📁'],
  },
  {
    id: 'tech',
    name: 'Công nghệ',
    emojis: ['💻', '🚀', '⚡', '🧠', '⚙️', '🛠️', '🔬', '📡', '🌐', '🤖', '🔑', '📦'],
  },
  {
    id: 'creative',
    name: 'Sáng tạo',
    emojis: ['🎨', '✨', '💡', '🔮', '💎', '🎭', '🎬', '📸', '🎵', '🌈', '✒️', '🧩'],
  },
  {
    id: 'goals',
    name: 'Mục tiêu',
    emojis: ['🎯', '🏆', '🥇', '🔥', '🌟', '🚩', '🎖️', '🧭', '⏳', '👑', '💯', '🚀'],
  },
  {
    id: 'docs',
    name: 'Tài liệu',
    emojis: ['📑', '📚', '📖', '📘', '📗', '📙', '📕', '🔖', '📜', '🗞️', '📄', '🏷️'],
  },
  {
    id: 'moods',
    name: 'Đời sống',
    emojis: ['☕', '🌿', '🌸', '🍀', '☀️', '🌙', '🍕', '🎈', '🎉', '🧘', '🏖️', '🍵'],
  },
];

type SlashCommandId = 
  | 'text' 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'bullet' 
  | 'order' 
  | 'todo' 
  | 'table'
  | 'underline'
  | 'link'
  | 'quote' 
  | 'code' 
  | 'divider' 
  | 'note' 
  | 'warning' 
  | 'success' 
  | 'memo';

const SLASH_COMMANDS: Array<{
  id: SlashCommandId;
  name: string;
  desc: string;
  keywords: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'text', name: 'Văn bản thường', desc: 'Đoạn văn bản thông thường', keywords: 'text paragraph van ban doan', category: 'Cơ bản', icon: Pilcrow },
  { id: 'h1', name: 'Tiêu đề lớn (H1)', desc: 'Tiêu đề phần chính', keywords: 'heading title h1 tieu de lon', category: 'Cơ bản', icon: Heading1 },
  { id: 'h2', name: 'Tiêu đề vừa (H2)', desc: 'Tiêu đề mục nhỏ', keywords: 'heading title h2 tieu de vua', category: 'Cơ bản', icon: Heading2 },
  { id: 'h3', name: 'Tiêu đề nhỏ (H3)', desc: 'Tiêu đề cấp ba', keywords: 'heading title h3 tieu de nho', category: 'Cơ bản', icon: Heading3 },
  { id: 'bullet', name: 'Danh sách dấu chấm', desc: 'Danh sách không thứ tự', keywords: 'bullet list danh sach cham', category: 'Danh sách', icon: List },
  { id: 'order', name: 'Danh sách số', desc: 'Danh sách có thứ tự 1, 2, 3', keywords: 'number ordered list danh sach so', category: 'Danh sách', icon: ListOrdered },
  { id: 'todo', name: 'Danh sách việc cần làm', desc: 'Checklist có ô đánh dấu', keywords: 'todo task checklist cong viec', category: 'Danh sách', icon: CheckSquare },
  { id: 'table', name: 'Bảng dữ liệu', desc: 'Bảng có thể chỉnh sửa như Notion', keywords: 'table bang excel spreadsheet du lieu', category: 'Dữ liệu', icon: Table2 },
  { id: 'underline', name: 'Gạch chân', desc: 'Định dạng gạch dưới chân chữ', keywords: 'underline gach chan text', category: 'Cơ bản', icon: UnderlineIcon },
  { id: 'link', name: 'Liên kết web', desc: 'Chèn đường link liên kết ngoài', keywords: 'link url lien ket web', category: 'Cơ bản', icon: Link2 },
  { id: 'quote', name: 'Khối trích dẫn', desc: 'Làm nổi bật đoạn văn trích dẫn', keywords: 'quote callout trich dan', category: 'Đặc biệt', icon: Quote },
  { id: 'code', name: 'Khối mã nguồn', desc: 'Đoạn mã code lập trình', keywords: 'code block ma nguon lap trinh', category: 'Đặc biệt', icon: Code },
  { id: 'note', name: '💡 Hộp mẹo & ý tưởng', desc: 'Gợi ý nổi bật có màu sắc', keywords: 'note tip meo y tuong callout', category: 'Hộp thông tin', icon: Lightbulb },
  { id: 'warning', name: '⚠️ Hộp lưu ý & cảnh báo', desc: 'Cảnh báo quan trọng cần chú ý', keywords: 'warning alert canh bao luu y', category: 'Hộp thông tin', icon: AlertTriangle },
  { id: 'success', name: '✅ Hộp hoàn thành', desc: 'Đánh dấu kết quả hoặc giải pháp', keywords: 'success done hoan thanh ket qua', category: 'Hộp thông tin', icon: CheckCircle2 },
  { id: 'memo', name: '📌 Hộp ghi nhớ', desc: 'Ghi chú tài liệu quan trọng', keywords: 'memo pin ghi nho quan trong', category: 'Hộp thông tin', icon: Pin },
  { id: 'divider', name: 'Đường kẻ ngang', desc: 'Phân chia các phần nội dung', keywords: 'divider separator horizontal rule duong ke', category: 'Đặc biệt', icon: Minus },
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
  onCreateTask,
  pendingInsertion,
  onInsertionHandled,
  onAddPage,
}: DocumentEditorProps) {
  const [docDetails, setDocDetails] = useState<any>(initialDocument || null);
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentVal, setNewCommentVal] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  
  // Custom Paper Settings
  const [paperStyle, setPaperStyle] = useState<PaperStyle>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('apexa-doc-paper-style') as PaperStyle) || 'blank';
    }
    return 'blank';
  });
  const [fontFamily, setFontFamily] = useState<FontFamily>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('apexa-doc-font-family') as FontFamily) || 'sans';
    }
    return 'sans';
  });
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('apexa-doc-font-size') as FontSize) || 'md';
    }
    return 'md';
  });
  const [pageWidth, setPageWidth] = useState<PageWidth>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('apexa-doc-page-width') as PageWidth) || 'wide';
    }
    return 'wide';
  });

  const [isLocked, setIsLocked] = useState(false);
  const [showOutline, setShowOutline] = useState(true);
  const [showPaperSettings, setShowPaperSettings] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

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
  const [showFullShareModal, setShowFullShareModal] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [shareRole, setShareRole] = useState<'editor' | 'commenter' | 'viewer'>('editor');
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState('');
  const [copiedDocLink, setCopiedDocLink] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [coverTab, setCoverTab] = useState<'gradients' | 'wallpapers' | 'custom'>('gradients');
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const authUserId = resolveAuthUserId(currentUser);

  const isCreator = Boolean(
    (docDetails?.user_id && authUserId && (
      docDetails.user_id === authUserId || 
      docDetails.user_id === currentUser?.id || 
      docDetails.user_id === `user-${authUserId}` ||
      resolveAuthUserId({ id: docDetails.user_id }) === authUserId
    )) ||
    (initialDocument?.user_id && authUserId && (
      initialDocument.user_id === authUserId || 
      initialDocument.user_id === currentUser?.id || 
      initialDocument.user_id === `user-${authUserId}` ||
      resolveAuthUserId({ id: initialDocument.user_id }) === authUserId
    ))
  );

  const isWorkspaceAdminOrOwner = Boolean(
    currentUser?.role === 'owner' || 
    currentUser?.role === 'admin' || 
    currentUser?.workspaceRole === 'owner' || 
    currentUser?.workspaceRole === 'admin'
  );

  const [accessLevel, setAccessLevel] = useState<DocumentAccessLevel>(() => {
    if (isOffline || isCreator || isWorkspaceAdminOrOwner) return 'owner';
    return 'editor';
  });
  const [realtimeStatus, setRealtimeStatus] = useState<DocumentRealtimeStatus>(isOffline ? 'offline' : 'connecting');
  const autosave = useDocumentAutosave(documentId, authUserId, isOffline, onDocumentUpdated);
  const { saveStatus, lastSavedAt } = autosave;
  const saveDocumentRef = useRef(autosave.save);
  useEffect(() => {
    saveDocumentRef.current = autosave.save;
  }, [autosave.save]);
  const [contentRevision, setContentRevision] = useState(0);
  
  const titleSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedDocumentId = useRef<string | null>(null);
  const editorWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const slashMenuRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<any>(null);
  const onDocumentUpdatedRef = useRef(onDocumentUpdated);
  const slashMenuOpenRef = useRef(false);
  const slashRangeRef = useRef({ from: 0, to: 0 });
  const slashActiveIndexRef = useRef(0);
  const filteredSlashCommandsRef = useRef(SLASH_COMMANDS);
  
  const members = useMemberStore(s => s.members);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const canEdit = !isLocked && (
    isOffline || 
    isCreator || 
    isWorkspaceAdminOrOwner || 
    accessLevel === 'owner' || 
    accessLevel === 'editor'
  );
  const canComment = canEdit || accessLevel === 'commenter';

  useEffect(() => {
    onDocumentUpdatedRef.current = onDocumentUpdated;
  }, [onDocumentUpdated]);

  // Persist paper settings to localStorage
  const handleSetPaperStyle = (val: PaperStyle) => {
    setPaperStyle(val);
    localStorage.setItem('apexa-doc-paper-style', val);
  };
  const handleSetFontFamily = (val: FontFamily) => {
    setFontFamily(val);
    localStorage.setItem('apexa-doc-font-family', val);
  };
  const handleSetFontSize = (val: FontSize) => {
    setFontSize(val);
    localStorage.setItem('apexa-doc-font-size', val);
  };
  const handleSetPageWidth = (val: PageWidth) => {
    setPageWidth(val);
    localStorage.setItem('apexa-doc-page-width', val);
  };

  const getCommentAuthor = (userId: string) => {
    const member = members.find(m => m.id === `user-${userId}` || m.id === userId || (m as any).user_id === userId);
    return {
      name: member?.name || 'Thành viên Upgen',
      avatar: member?.avatar || null
    };
  };

  const userColor = useMemo(() => {
    return getUserCollabColor(authUserId, currentUser?.name);
  }, [authUserId, currentUser?.name]);

  const [yDoc] = useState(() => new Doc());

  const provider = useMemo(() => {
    if (isOffline || !authUserId) return null;

    return new SupabaseYjsProvider(
      yDoc,
      documentId,
      {
        userId: authUserId,
        name: currentUser?.name || 'Thành viên',
        avatar: currentUser?.avatar || '',
        color: userColor,
      },
    );
  }, [authUserId, currentUser?.avatar, currentUser?.name, documentId, isOffline, userColor, yDoc]);

  // Connect the private document channel and expose its Presence/status to the UI.
  useEffect(() => {
    if (!provider) {
      setRealtimeStatus('offline');
      setActiveUsers([]);
      return;
    }

    const unsubscribeStatus = provider.onStatus(status => setRealtimeStatus(status));
    const unsubscribePresence = provider.onPresence(users => setActiveUsers(users.map(user => ({
      id: user.userId,
      ...user,
    }))));
    void provider.connect();

    return () => {
      unsubscribeStatus();
      unsubscribePresence();
      provider.destroy();
    };
  }, [provider]);

  useEffect(() => {
    provider?.setCanWrite(canEdit);
  }, [canEdit, provider]);

  useEffect(() => {
    let cancelled = false;

    const loadAccessLevel = async () => {
      if (isOffline || isCreator || isWorkspaceAdminOrOwner) {
        setAccessLevel('owner');
        return;
      }

      const { data, error } = await supabase.rpc('get_document_access_level', {
        target_document_id: documentId,
      });

      if (cancelled) return;
      if (!error && ['owner', 'editor', 'commenter', 'viewer', 'none'].includes(String(data))) {
        setAccessLevel(data as DocumentAccessLevel);
      } else {
        setAccessLevel('editor');
      }
    };

    void loadAccessLevel();
    return () => {
      cancelled = true;
    };
  }, [authUserId, isCreator, isWorkspaceAdminOrOwner, documentId, isOffline]);

  // Load document details and comments from database
  useEffect(() => {
    if (initialDocument) setDocDetails(initialDocument);
  }, [initialDocument]);

  useEffect(() => {
    const loadDocData = async () => {
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
      return;
    }

    const commentsSub = getCleanChannel(`comments-realtime-${documentId}`)
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
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'documents',
        filter: `id=eq.${documentId}`
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as any;
          if (!updated) return;
          setDocDetails((prev: any) => ({ ...prev, ...updated }));
          if (updated.is_locked !== undefined) {
            setIsLocked(Boolean(updated.is_locked));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(commentsSub);
    };
  }, [documentId, isOffline]);

  useEffect(() => () => {
    if (titleSaveTimeout.current) clearTimeout(titleSaveTimeout.current);
    if (contentSaveTimeout.current) clearTimeout(contentSaveTimeout.current);
  }, []);

  const editorExtensions = useMemo(() => {
    const baseExtensions: any[] = [
      StarterKit.configure({
        undoRedo: provider ? false : undefined,
        link: false,
        underline: false,
      }),
      ...documentExtensions,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          class: 'text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:opacity-80 transition-opacity',
        },
      }),
      Placeholder.configure({
        placeholder: "Gõ '/' để chèn tiêu đề, danh sách, khối ghi chú hoặc bảng...",
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({ resizable: true, HTMLAttributes: { class: 'apexa-doc-table' } }),
      TableRow,
      TableHeader,
      TableCell,
    ];

    if (!isOffline && provider && yDoc && typeof yDoc.getXmlFragment === 'function') {
      baseExtensions.push(
        Collaboration.configure({
          document: yDoc,
        }),
        CustomCollaborationCursor.configure({
          provider: provider,
          user: {
            name: currentUser?.name || 'Thành viên',
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
    if (!editorInstance || !editorInstance.state || !editorInstance.view) {
      closeSlashMenu();
      return;
    }
    const { view, state } = editorInstance;
    const { selection } = state || {};
    if (!selection || !selection.$from) {
      closeSlashMenu();
      return;
    }
    if (!selection.empty) {
      closeSlashMenu();
      return;
    }

    const textBeforeCursor = selection.$from.parent?.textBetween
      ? selection.$from.parent.textBetween(
          0,
          selection.$from.parentOffset,
          undefined,
          '\ufffc'
        )
      : '';
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
      case 'table': chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); break;
      case 'underline': chain.toggleUnderline().run(); break;
      case 'link': {
        const url = window.prompt('Nhập địa chỉ URL liên kết:', 'https://');
        if (url) {
          chain.setLink({ href: url }).run();
        }
        break;
      }
      case 'quote': chain.toggleBlockquote().run(); break;
      case 'code': chain.toggleCodeBlock().run(); break;
      case 'divider': chain.setHorizontalRule().run(); break;
      case 'note': 
        chain.insertContent('<blockquote><p>💡 <strong>Ý tưởng:</strong> Nhập nội dung ghi chú mẹo vào đây...</p></blockquote>').run(); 
        break;
      case 'warning': 
        chain.insertContent('<blockquote><p>⚠️ <strong>Lưu ý:</strong> Cần đặc biệt chú ý đến nội dung này...</p></blockquote>').run(); 
        break;
      case 'success': 
        chain.insertContent('<blockquote><p>✅ <strong>Thành công:</strong> Mục tiêu hoặc giải pháp đã hoàn tất...</p></blockquote>').run(); 
        break;
      case 'memo': 
        chain.insertContent('<blockquote><p>📌 <strong>Ghi nhớ:</strong> Thông tin quan trọng cần lưu tâm...</p></blockquote>').run(); 
        break;
    }
    closeSlashMenu();
  }, [closeSlashMenu]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions,
    editable: canEdit && !isLocked,
    editorProps: {
      attributes: {
        class: `document-editor focus:outline-none max-w-none select-text leading-relaxed break-words min-h-[550px] ${
          fontFamily === 'serif' ? 'font-serif' : fontFamily === 'mono' ? 'font-mono' : 'font-sans'
        } ${
          fontSize === 'sm' ? 'text-[13.5px] leading-6' : fontSize === 'lg' ? 'text-[17px] leading-8' : 'text-[15px] leading-7'
        } text-slate-800 dark:text-slate-200`,
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
      setContentRevision(value => value + 1);
      if (!canEdit) return;
      saveDocumentRef.current({ content: editor.getJSON() });
    },
    onSelectionUpdate({ editor }) {
      if (!editor || !editor.state || !editor.view || !editor.state.doc) return;
      const { view, state } = editor;
      const { selection } = state || {};
      if (!selection) return;
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
          
          const left = Math.max(16, Math.min((startCoords.left + endCoords.left) / 2 - editorBounds.left, editorBounds.width - 260));
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
  }, [canEdit, documentId, isOffline, yDoc, provider, closeSlashMenu, runSlashCommand, updateSlashMenu, isLocked, fontFamily, fontSize]);

  useEffect(() => {
    editorRef.current = editor;
    return () => {
      editorRef.current = null;
    };
  }, [editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(canEdit && !isLocked);
    }
  }, [canEdit, editor, isLocked]);

  useEffect(() => {
    if (!editor || !docDetails || hydratedDocumentId.current === documentId) return;
    const content = autosave.draft?.content ?? docDetails.content;
    editor.commands.setContent(normalizeDocumentContent(content), { emitUpdate: false });
    if (autosave.draft) setDocDetails((previous: any) => ({ ...previous, ...autosave.draft }));
    setContentRevision(value => value + 1);
    editor.setEditable(canEdit && !isLocked);
    hydratedDocumentId.current = documentId;
  }, [canEdit, docDetails, documentId, editor, isLocked, autosave.draft]);

  useEffect(() => {
    if (!editor || !pendingInsertion?.text || !canEdit || isLocked) return;
    const paragraphs = pendingInsertion.text
      .split(/\n{2,}/)
      .map(value => value.trim())
      .filter(Boolean)
      .map(value => ({ type: 'paragraph', content: [{ type: 'text', text: value }] }));
    editor.chain().focus().insertContent(paragraphs).run();
    onInsertionHandled?.();
  }, [canEdit, editor, isLocked, onInsertionHandled, pendingInsertion]);

  const filteredSlashCommands = filterSlashCommands(slashQuery);

  useEffect(() => {
    slashMenuRef.current
      ?.querySelector<HTMLElement>('[data-slash-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [slashActiveIndex, slashQuery]);

  // Extract headings from editor for Table of Contents
  const headings = useMemo(() => {
    if (!editor || editor.isDestroyed || !editor.state || !editor.state.doc) return [];
    const items: { id: string; text: string; level: number; pos: number }[] = [];
    try {
      editor.state.doc.descendants((node, pos) => {
        if (node?.type?.name === 'heading') {
          const text = node.textContent?.trim() || '';
          if (text) {
            items.push({
              id: `heading-${pos}`,
              text,
              level: node.attrs?.level || 1,
              pos
            });
          }
        }
      });
    } catch (e) {
      console.warn('Error extracting headings:', e);
    }
    return items;
  }, [editor]);

  const scrollToHeading = (pos: number) => {
    if (!editor) return;
    editor.chain().focus().setTextSelection(pos).run();
  };

  const handleSaveTitle = async (val: string) => {
    if (!canEdit || isLocked) return;
    setDocDetails((prev: any) => prev ? { ...prev, title: val } : null);
    onUpdateTitle(val);
    onDocumentUpdated?.({ title: val });
    autosave.save({ title: val });
  };

  const selectEmoji = async (emoji: string | null) => {
    if (!canEdit || isLocked) return;
    setDocDetails((prev: any) => prev ? { ...prev, icon: emoji } : null);
    onUpdateCoverAndIcon(docDetails?.cover_url || null, emoji);
    onDocumentUpdated?.({ icon: emoji });
    autosave.save({ icon: emoji });
  };

  const selectCover = async (cover: string | null) => {
    if (!canEdit || isLocked) return;
    setDocDetails((prev: any) => prev ? { ...prev, cover_url: cover } : null);
    onUpdateCoverAndIcon(cover, docDetails?.icon || null);
    onDocumentUpdated?.({ cover_url: cover });
    setShowCoverPicker(false);
    autosave.save({ cover_url: cover });
  };

  const handleRandomCover = () => {
    const allPresets = [...PRESET_GRADIENTS.map(g => g.value), ...PRESET_WALLPAPERS.map(w => w.value)];
    const randomChoice = allPresets[Math.floor(Math.random() * allPresets.length)];
    selectCover(randomChoice);
  };

  const handleSetLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Nhập địa chỉ URL liên kết:', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canComment || !newCommentVal.trim()) return;

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

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    if (!editor) return;
    const textContent = `${docDetails?.title || 'Tài liệu'}\n\n${editor.getText()}`;
    navigator.clipboard.writeText(textContent);
    setShowExportMenu(false);
  };

  const handleExportMarkdown = () => {
    if (!editor) return;
    const textContent = documentToMarkdown(editor.getJSON());
    const blob = new Blob([`# ${docDetails?.title || 'Tài liệu'}\n\n${textContent}`], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docDetails?.title || 'document'}-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleExportHtml = () => {
    if (!editor) return;
    const title = escapeDocumentHtml(docDetails?.title || 'Tài liệu');
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.7;color:#1e293b;}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}img{max-width:100%}[data-doc-columns]{display:flex;gap:24px}[data-doc-column]{flex:1}[data-doc-callout]{padding:16px;background:#eff6ff}</style></head><body><h1>${title}</h1>${editor.getHTML()}</body></html>`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docDetails?.title || 'document'}-${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleAiAction = async (action: 'expand' | 'summarize' | 'translate' | 'formal' | 'proofread') => {
    if (!editor || !canEdit || isLocked) return;
    const currentText = editor.getText().trim();
    if (!currentText) return;

    setIsAiProcessing(true);
    setShowAiMenu(false);

    let instruction = '';
    if (action === 'expand') instruction = 'Hãy tiếp tục viết và phát triển thêm các ý chính một cách mạch lạc, phong phú cho tài liệu sau:';
    else if (action === 'summarize') instruction = 'Hãy tóm tắt ngắn gọn tài liệu sau thành các ý chính gạch đầu dòng rõ ràng:';
    else if (action === 'translate') instruction = 'Hãy dịch toàn bộ nội dung tài liệu sau sang Tiếng Anh tự nhiên và chuẩn mực:';
    else if (action === 'formal') instruction = 'Hãy chỉnh sửa lại tài liệu sau theo văn phong trang trọng, chuyên nghiệp và lịch thiệp:';
    else if (action === 'proofread') instruction = 'Hãy soát lỗi chính tả, dấu câu và hoàn thiện câu từ cho đoạn văn sau:';

    try {
      const response = await callAiApi('/api/ai/document', {
        message: `${instruction}\n\n"${currentText}"`
      });
      const data = await response.json();
      if (data.success && data.text) {
        editor.chain().focus().insertContent(`<p>${data.text}</p>`).run();
      }
    } catch (err) {
      console.warn('AI processing error:', err);
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
    if (isOffline || !editor || !canEdit || isLocked) return;
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
    if (!selectedCollaboratorId || isOffline || !canEdit) return;
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
    if (isOffline || !canEdit) return;
    const { error } = await supabase.from('document_collaborators').delete().eq('id', collaboratorId);
    if (!error) setCollaborators(prev => prev.filter(item => item.id !== collaboratorId));
  };

  const togglePublished = async () => {
    if (isOffline || !canEdit) return;
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
    if (!editor || !editor.state || !editor.state.doc || !onCreateTask) return;
    const { from, to } = editor.state.selection || { from: 0, to: 0 };
    const selectedText = editor.state.doc.textBetween(from, to, ' ')?.trim() || '';
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
        Đang mở không gian tài liệu...
      </div>
    );
  }

  // Paper background patterns
  const getPaperBgStyle = () => {
    if (paperStyle === 'lined') {
      return {
        backgroundImage: 'linear-gradient(transparent 31px, rgba(148, 163, 184, 0.18) 32px)',
        backgroundSize: '100% 32px'
      };
    }
    if (paperStyle === 'grid') {
      return {
        backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.25) 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      };
    }
    return {};
  };

  // Word count & stats
  const words = editor.getText().trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(words / 200));
  const collaborationStatus = (() => {
    if (isOffline || realtimeStatus === 'offline') {
      return { label: 'Lưu trên thiết bị', detail: 'Bản nháp được lưu trên trình duyệt; sẽ thử đồng bộ khi kết nối lại.', tone: 'amber', icon: CloudOff };
    }
    if (realtimeStatus === 'connecting') {
      return { label: 'Đang kết nối', detail: 'Đang mở phòng cộng tác riêng tư', tone: 'sky', icon: LoaderCircle };
    }
    if (realtimeStatus === 'reconnecting') {
      return { label: 'Đang kết nối lại', detail: 'Thay đổi mới sẽ được gửi khi kết nối phục hồi', tone: 'amber', icon: LoaderCircle };
    }
    if (realtimeStatus === 'error' || saveStatus === 'error') {
      return { label: 'Chưa thể lưu', detail: 'Kiểm tra kết nối hoặc quyền tài liệu', tone: 'rose', icon: WifiOff };
    }
    if (saveStatus === 'saving') {
      return { label: 'Đang lưu', detail: 'Đang lưu thay đổi vào đám mây...', tone: 'sky', icon: LoaderCircle };
    }
    return {
      label: 'Đã lưu',
      detail: lastSavedAt ? `Đã lưu lúc ${lastSavedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : 'Tất cả thay đổi đã được lưu',
      tone: 'emerald',
      icon: Cloud,
    };
  })();
  const CollaborationStatusIcon = collaborationStatus.icon;
  const collaborationToneClass = collaborationStatus.tone === 'emerald'
    ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/35 border-emerald-200/70 dark:border-emerald-900/60'
    : collaborationStatus.tone === 'rose'
      ? 'text-rose-700 dark:text-rose-300 bg-rose-50/90 dark:bg-rose-950/35 border-rose-200/70 dark:border-rose-900/60'
      : collaborationStatus.tone === 'sky'
        ? 'text-sky-700 dark:text-sky-300 bg-sky-50/90 dark:bg-sky-950/35 border-sky-200/70 dark:border-sky-900/60'
        : 'text-amber-700 dark:text-amber-300 bg-amber-50/90 dark:bg-amber-950/35 border-amber-200/70 dark:border-amber-900/60';


  return (
    <div 
      style={getPaperBgStyle()}
      className={`doc-editor-shell ${isFocusMode ? 'doc-focus-mode' : ''} flex-1 flex flex-col h-full ${
        paperStyle === 'warm' ? 'bg-[#fdfcf9] dark:bg-[var(--cu-surface)]' : 'bg-[#fbfbfc] dark:bg-[var(--cu-bg)]'
      } select-text overflow-y-auto font-sans relative scrollbar-thin print:bg-white print:p-0`}
    >
      
      {/* ── TOP STICKY PRO FORMATTING RIBBON & CONTROLS ── */}
      {!isFocusMode && (
        <div className="doc-ribbon sticky top-0 z-40 flex min-h-12 items-center justify-between gap-2 border-b border-slate-200/80 bg-white/95 px-2.5 py-1.5 backdrop-blur-xl sm:px-4 dark:border-slate-800/90 dark:bg-[var(--cu-surface)]/95 select-none print:hidden">
          
          {/* Left Ribbon: Text Styles & Block Types */}
          <div className="flex items-center gap-1 flex-nowrap shrink-0 overflow-x-auto scrollbar-none py-0.5">
            {/* History: Undo / Redo */}
            <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5 mr-1 gap-0.5">
              <button
                type="button"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer transition-colors"
                title="Hoàn tác (Ctrl+Z)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer transition-colors"
                title="Làm lại (Ctrl+Y)"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Block Type Dropdown / Selectors */}
            <button
              type="button"
              onClick={() => editor.chain().focus().setParagraph().run()}
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                editor.isActive('paragraph') && !editor.isActive('heading')
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Văn bản
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                editor.isActive('heading', { level: 1 })
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Tiêu đề 1 (H1)"
            >
              <Heading1 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                editor.isActive('heading', { level: 2 })
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Tiêu đề 2 (H2)"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                editor.isActive('heading', { level: 3 })
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Tiêu đề 3 (H3)"
            >
              <Heading3 className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-slate-200 dark:border-slate-800 mx-1" />

            {/* In-line Formatting */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive('bold') ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="In đậm (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive('italic') ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="In nghiêng (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive('underline') ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Gạch chân (Ctrl+U)"
            >
              <UnderlineIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive('strike') ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Gạch ngang"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive('code') ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Mã nội dòng"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleSetLink}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive('link') ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Chèn liên kết (Ctrl+K)"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-slate-200 dark:border-slate-800 mx-1" />

            {/* Lists & Tasks */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive('bulletList') ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Danh sách dấu chấm"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive('orderedList') ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Danh sách số"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive('taskList') ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Danh sách việc cần làm (Task Checklist)"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${editor.isActive('table') ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              title="Chèn bảng dữ liệu"
            >
              <Table2 className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-slate-200 dark:border-slate-800 mx-1" />

            {/* Special Callouts & Quotes */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                editor.isActive('blockquote') ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Trích dẫn"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().insertContent('<blockquote><p>💡 <strong>Ghi chú:</strong> </p></blockquote>').run()}
              className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all cursor-pointer"
              title="Chèn hộp ý tưởng (💡 Idea)"
            >
              <Lightbulb className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().insertContent('<blockquote><p>⚠️ <strong>Lưu ý:</strong> </p></blockquote>').run()}
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
              title="Chèn hộp lưu ý (⚠️ Warning)"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().insertContent('<blockquote><p>✅ <strong>Hoàn thành:</strong> </p></blockquote>').run()}
              className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer"
              title="Chèn hộp hoàn thành (✅ Done)"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().insertContent('<blockquote><p>📌 <strong>Ghi nhớ:</strong> </p></blockquote>').run()}
              className="p-1.5 rounded-lg text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-all cursor-pointer"
              title="Chèn hộp ghi nhớ (📌 Memo)"
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Chèn đường kẻ ngang"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Ribbon: AI Assistant, Paper Styles, Outline, Print & Export */}
          <div className="flex items-center gap-1.5 shrink-0">
            
            {/* AI Assistant Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAiMenu(!showAiMenu)}
                disabled={isAiProcessing}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-xs font-black text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <ApexaAiIcon className={`w-3.5 h-3.5 ${isAiProcessing ? 'animate-spin' : ''}`} variant="white" />
                <span className="hidden sm:inline">{isAiProcessing ? 'AI đang viết…' : 'Trợ lý AI'}</span>
                <ChevronDown className="w-3 h-3 text-white/80" />
              </button>

              <AnimatePresence>
                {showAiMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowAiMenu(false)} />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 5 }}
                      className="absolute right-0 top-full mt-2 w-64 bg-white/98 dark:bg-[#111218]/98 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-2 z-50 space-y-1 text-left select-none font-sans"
                    >
                      <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-1 flex items-center gap-2">
                        <ApexaAiIcon className="w-4 h-4" variant="gradient" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Upgen AI Writer</span>
                      </div>
                      <button 
                        onClick={() => handleAiAction('expand')}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl cursor-pointer flex items-center gap-2 transition-colors"
                      >
                        ✨ Viết tiếp & Phát triển ý
                      </button>
                      <button 
                        onClick={() => handleAiAction('summarize')}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl cursor-pointer flex items-center gap-2 transition-colors"
                      >
                        📝 Tóm tắt nội dung
                      </button>
                      <button 
                        onClick={() => handleAiAction('proofread')}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl cursor-pointer flex items-center gap-2 transition-colors"
                      >
                        🔍 Soát lỗi chính tả & ngữ pháp
                      </button>
                      <button 
                        onClick={() => handleAiAction('translate')}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl cursor-pointer flex items-center gap-2 transition-colors"
                      >
                        🌐 Dịch sang Tiếng Anh
                      </button>
                      <button 
                        onClick={() => handleAiAction('formal')}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl cursor-pointer flex items-center gap-2 transition-colors"
                      >
                        👔 Đổi văn phong Trang trọng
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Table of Contents / Outline Toggle */}
            <button
              type="button"
              onClick={() => setShowOutline(!showOutline)}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1 text-xs font-bold ${
                showOutline 
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' 
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Mục lục tài liệu (Outline)"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Mục lục</span>
            </button>

            {/* Paper & Layout Options */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPaperSettings(!showPaperSettings)}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1 text-xs font-bold ${
                  showPaperSettings 
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' 
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title="Tùy chỉnh trang giấy (Paper Options)"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Trang giấy</span>
              </button>

              <AnimatePresence>
                {showPaperSettings && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPaperSettings(false)} />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 5 }}
                      className="absolute right-0 top-full mt-2 w-72 bg-white/98 dark:bg-[#111218]/98 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 z-50 space-y-3.5 text-left font-sans select-none"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Kiểu Trang Giấy</span>
                        <button type="button" onClick={() => setShowPaperSettings(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                      </div>

                      {/* Paper Background Texture */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nền trang giấy</label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { id: 'blank', label: 'Trơn', icon: '📄' },
                            { id: 'lined', label: 'Kẻ dòng', icon: '📝' },
                            { id: 'grid', label: 'Ô ly', icon: '▦' },
                            { id: 'warm', label: 'Ấm áp', icon: '📜' },
                          ].map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSetPaperStyle(item.id as PaperStyle)}
                              className={`py-1.5 px-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                                paperStyle === item.id 
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span>{item.icon}</span>
                              <span className="text-[10px]">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Font Family */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Phông chữ</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: 'sans', label: 'Hiện đại (Sans)' },
                            { id: 'serif', label: 'Sách báo (Serif)' },
                            { id: 'mono', label: 'Lập trình (Mono)' },
                          ].map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSetFontFamily(item.id as FontFamily)}
                              className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                                fontFamily === item.id 
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className="text-[10.5px]">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Page Width */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Khổ trang</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: 'standard', label: 'Tiêu chuẩn' },
                            { id: 'wide', label: 'Mở rộng' },
                            { id: 'full', label: 'Tràn viền' },
                          ].map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSetPageWidth(item.id as PageWidth)}
                              className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                                pageWidth === item.id 
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className="text-[10.5px]">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Font Size */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Cỡ chữ</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: 'sm', label: 'Nhỏ (14px)' },
                            { id: 'md', label: 'Vừa (16px)' },
                            { id: 'lg', label: 'Lớn (18px)' },
                          ].map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSetFontSize(item.id as FontSize)}
                              className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                                fontSize === item.id 
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              <span className="text-[10.5px]">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Lock / Read-only Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsLocked(!isLocked)}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                isLocked 
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title={isLocked ? 'Tài liệu đang bị khóa (Chế độ chỉ đọc)' : 'Khóa chỉnh sửa'}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>

            {/* Export & Print Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="In ấn & Xuất file"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <AnimatePresence>
                {showExportMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 5 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-white/98 dark:bg-[#111218]/98 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-2 z-50 space-y-1 text-left font-sans select-none"
                    >
                      <button
                        type="button"
                        onClick={handlePrint}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl cursor-pointer flex items-center gap-2 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5 text-indigo-500" />
                        <span>In ấn & Xuất PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportMarkdown}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl cursor-pointer flex items-center gap-2 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-sky-500" />
                        <span>Xuất file Markdown (.md)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportHtml}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl cursor-pointer flex items-center gap-2 transition-colors"
                      >
                        <Globe2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Xuất file HTML (.html)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyText}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl cursor-pointer flex items-center gap-2 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Sao chép toàn bộ văn bản</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Live Active Collaborators Stack */}
            {activeUsers.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                <div className="flex items-center -space-x-1.5 overflow-hidden">
                  {activeUsers.slice(0, 4).map((u, i) => (
                    <div 
                      key={u.id || u.clientId || i}
                      className="relative group/avatar"
                      title={`${u.name || 'Thành viên'} (Đang cùng chỉnh sửa)`}
                    >
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white font-black text-[9.5px] ring-2 ring-white dark:ring-slate-900 overflow-hidden shadow-xs"
                        style={{ backgroundColor: u.color || '#6366f1' }}
                      >
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{(u.name || 'U').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span 
                        className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full ring-1 ring-white dark:ring-slate-900 animate-pulse"
                        style={{ backgroundColor: u.color || '#10b981' }}
                      />
                    </div>
                  ))}
                  {activeUsers.length > 4 && (
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 ring-2 ring-white dark:ring-slate-900 flex items-center justify-center text-[8.5px] font-black text-slate-700 dark:text-slate-200">
                      +{activeUsers.length - 4}
                    </div>
                  )}
                </div>
                <div className="hidden lg:flex items-center gap-1 text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>{activeUsers.length} người đang xem</span>
                </div>
              </div>
            )}

            {/* Share Menu Button */}
            <button
              type="button"
              onClick={openShareMenu}
              disabled={isOffline}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                showShareMenu 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chia sẻ</span>
            </button>

            {/* Zen Focus Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsFocusMode(!isFocusMode)}
              className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Chế độ tập trung (Zen Focus Mode)"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Exit Focus Mode Floating Pill */}
      {isFocusMode && (
        <div className="sticky top-4 z-50 flex justify-center pointer-events-none select-none">
          <button
            type="button"
            onClick={() => setIsFocusMode(false)}
            className="pointer-events-auto px-4 py-1.5 rounded-full bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 text-xs font-black shadow-2xl backdrop-blur-md hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-600" />
            <span>Thoát chế độ tập trung</span>
          </button>
        </div>
      )}

      {/* 1. Cover Image Banner - Full Width (Only rendered when document has a cover) */}
      {!isFocusMode && docDetails.cover_url && (
        <div className="relative h-44 sm:h-52 w-full shrink-0 select-none overflow-hidden transition-all duration-300 group/cover print:hidden">
          {docDetails.cover_url.startsWith('http') ? (
            <img
              src={docDetails.cover_url}
              alt="Ảnh bìa tài liệu"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full" style={{ background: docDetails.cover_url }} />
          )}

          {/* Hover Overlay with Cover Actions */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-end justify-end p-4 sm:p-6 gap-2 z-10 max-w-7xl mx-auto">
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => setShowCoverPicker(true)}
                  className="px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 hover:bg-white text-slate-800 dark:text-slate-100 text-xs font-black backdrop-blur-md shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Đổi ảnh bìa</span>
                </button>
                <button
                  type="button"
                  onClick={() => selectCover(null)}
                  className="px-2.5 py-1.5 rounded-xl bg-black/60 hover:bg-rose-600 text-white text-xs font-bold backdrop-blur-md shadow-lg transition-all flex items-center gap-1 cursor-pointer"
                  title="Gỡ ảnh bìa"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Gỡ</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cover Picker Modal */}
      <AnimatePresence>
        {showCoverPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs select-none">
            <div className="absolute inset-0 cursor-pointer" onClick={() => setShowCoverPicker(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-lg bg-white dark:bg-[#161922] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 overflow-hidden text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Ảnh bìa tài liệu</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Tùy biến hình nền không gian làm việc</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCoverPicker(false)}
                  className="w-7 h-7 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Cover Tabs */}
              <div className="flex items-center gap-2 mt-4 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/60">
                <button
                  type="button"
                  onClick={() => setCoverTab('gradients')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    coverTab === 'gradients'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Dải màu Gradient
                </button>
                <button
                  type="button"
                  onClick={() => setCoverTab('wallpapers')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    coverTab === 'wallpapers'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Hình nền nghệ thuật
                </button>
                <button
                  type="button"
                  onClick={() => setCoverTab('custom')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    coverTab === 'custom'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  URL tùy chỉnh
                </button>
              </div>

              {/* Tab Contents */}
              <div className="mt-4 min-h-[190px] max-h-[260px] overflow-y-auto scrollbar-thin">
                {coverTab === 'gradients' && (
                  <div className="grid grid-cols-4 gap-2.5">
                    {PRESET_GRADIENTS.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectCover(item.value)}
                        className="group relative h-16 rounded-2xl overflow-hidden border border-white/40 hover:scale-105 transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: item.value }}
                        title={item.label}
                      >
                        <span className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-bold px-1 text-center">
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {coverTab === 'wallpapers' && (
                  <div className="grid grid-cols-3 gap-2.5">
                    {PRESET_WALLPAPERS.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectCover(item.value)}
                        className="group relative h-20 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:scale-105 transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <img src={item.value} alt={item.label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                          <span className="text-[10px] font-bold text-white leading-tight">{item.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {coverTab === 'custom' && (
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                      Dán đường dẫn ảnh trực tiếp (Unsplash, Pexels, v.v.):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={customCoverUrl}
                        onChange={e => setCustomCoverUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customCoverUrl.trim()) {
                            selectCover(customCoverUrl.trim());
                            setCustomCoverUrl('');
                          }
                        }}
                        disabled={!customCoverUrl.trim()}
                        className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-black cursor-pointer shadow-xs active:scale-95 transition-all"
                      >
                        Áp dụng
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleRandomCover}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Shuffle className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Ngẫu nhiên</span>
                </button>
                {docDetails.cover_url && (
                  <button
                    type="button"
                    onClick={() => selectCover(null)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                  >
                    Gỡ ảnh bìa hiện tại
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MAIN WORKSPACE CONTAINER (FULL PAGE) ── */}
      {!isFocusMode && <DocumentTools editor={editor} canEdit={canEdit} workspaceId={docDetails?.workspace_id || docDetails?.workspaceId} onAddPage={onAddPage} />}
      {saveStatus === 'error' && !isOffline && <div className="doc-save-error" role="alert">Bản nháp đang chờ đồng bộ. <button type="button" onClick={() => void autosave.retry()}>Thử lưu lại</button></div>}
      <div className="doc-workspace flex w-full flex-1 justify-center px-4 py-5 sm:px-7 md:px-10 min-h-[calc(100vh-200px)] print:p-0">
        
        {/* Outline Drawer (Table of Contents on the side) */}
        {showOutline && !isFocusMode && (
          <aside className="doc-outline w-64 shrink-0 flex flex-col sticky top-20 select-none text-left print:hidden">
            <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col h-full">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Mục lục ({headings.length})
                </span>
                <button type="button" onClick={() => setShowOutline(false)} className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto py-2 space-y-1 scrollbar-thin text-xs">
                {headings.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-6 text-center">Thêm tiêu đề (H1, H2, H3) để tạo mục lục tự động.</p>
                ) : (
                  headings.map((h, i) => (
                    <button
                      key={h.id || i}
                      type="button"
                      onClick={() => scrollToHeading(h.pos)}
                      style={{ paddingLeft: `${(h.level - 1) * 10 + 6}px` }}
                      className="w-full text-left py-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 truncate font-semibold transition-colors cursor-pointer text-[11.5px]"
                    >
                      <span className="text-slate-400 mr-1">•</span> {h.text}
                    </button>
                  ))
                )}
              </div>
            </div>
          </aside>
        )}

        {/* ── DOCUMENT CANVAS (FULL PAGE) ── */}
        <main
          className={`doc-canvas flex-1 flex flex-col min-h-0 ${
            pageWidth === 'full' 
              ? 'max-w-full w-full' 
              : pageWidth === 'standard' 
                ? 'max-w-3xl w-full'
                : 'max-w-[980px] w-full'
          } transition-all duration-300 relative text-left`}
        >
          {/* Quick Notion-style hover chips when missing cover or icon */}
          {canEdit && !isFocusMode && (!docDetails.cover_url || !docDetails.icon) && (
            <div className="group/chips mb-3 -mt-1 flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity print:hidden">
              {!docDetails.icon && (
                <EmojiIconPicker
                  value=""
                  onChange={(newIcon) => selectEmoji(newIcon)}
                  onRemove={() => selectEmoji(null)}
                  allowClear={false}
                  size="custom"
                  defaultTab="emojis"
                  preserveEmoji={true}
                  title="Thêm biểu tượng tài liệu"
                >
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                    <span>➕</span>
                    <span>Thêm biểu tượng</span>
                  </div>
                </EmojiIconPicker>
              )}
              {!docDetails.cover_url && (
                <button
                  type="button"
                  onClick={() => setShowCoverPicker(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Thêm ảnh bìa</span>
                </button>
              )}
            </div>
          )}

          {/* 2. Page Icon & Live Status Header */}
          {!isFocusMode && (
            <div className={`relative z-20 mb-4 flex items-end justify-between ${docDetails.cover_url ? '-mt-10 sm:-mt-12' : 'mt-2'} select-none print:hidden`}>
              {docDetails.icon ? (
                <div className="relative group/emoji">
                  <EmojiIconPicker
                    value={docDetails.icon}
                    onChange={(newIcon) => selectEmoji(newIcon)}
                    onRemove={() => selectEmoji(null)}
                    allowClear={true}
                    size="custom"
                    defaultTab={/\p{Extended_Pictographic}/u.test(docDetails.icon) ? 'emojis' : 'icons'}
                    preserveEmoji={true}
                    title="Đổi biểu tượng trang"
                    disabled={!canEdit}
                  >
                    <div className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-2xl border border-slate-200/90 bg-white text-3xl shadow-xl transition-all hover:scale-105 sm:h-16 sm:w-16 sm:text-4xl dark:border-slate-800 dark:bg-slate-900">
                      {renderSpaceIcon(docDetails.icon, "w-8 h-8 text-slate-700 dark:text-slate-200", undefined, { preserveEmoji: true })}
                    </div>
                  </EmojiIconPicker>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectEmoji(null);
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center opacity-0 group-hover/emoji:opacity-100 transition-opacity hover:bg-rose-600 shadow-md cursor-pointer z-10"
                      title="Gỡ biểu tượng"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ) : (
                <div />
              )}

              {/* Status and metadata badge on right */}
              <div className="flex items-center gap-2 select-none ml-auto">
                {!canEdit && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/70 bg-amber-50/90 px-2.5 py-1.5 text-[10.5px] font-black text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300">
                    <Eye className="h-3.5 w-3.5" />
                    {isLocked ? 'Đã khóa chỉnh sửa' : accessLevel === 'commenter' ? 'Chỉ bình luận' : 'Chỉ xem'}
                  </span>
                )}
                <div
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 shadow-2xs backdrop-blur-md ${collaborationToneClass}`}
                  title={collaborationStatus.detail}
                >
                  <CollaborationStatusIcon className={`h-3.5 w-3.5 ${['connecting', 'reconnecting'].includes(realtimeStatus) || saveStatus === 'saving' ? 'animate-spin' : ''}`} />
                  <span className="text-[10.5px] font-black">{collaborationStatus.label}</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Document Title Input */}
          <div className="mb-2">
            <input 
              type="text" 
              value={docDetails.title || ''}
              onChange={e => handleSaveTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  editor?.commands.focus('start');
                }
              }}
              readOnly={!canEdit || isLocked}
              placeholder="Chưa có tiêu đề"
              className="w-full border-0 bg-transparent text-3xl font-black tracking-[-0.035em] text-slate-950 outline-none transition-all placeholder-slate-300 sm:text-4xl dark:text-white dark:placeholder-slate-700"
            />
          </div>

          {/* Document Subtitle & Metadata Row */}
          {!isFocusMode && (
            <div className="mb-6 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-400 select-none pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <span className="flex items-center gap-1">
                <History className="w-3.5 h-3.5" />
                {lastSavedAt ? `Đã lưu lúc ${lastSavedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : 'Đã lưu'}
              </span>
              <span>•</span>
              <span>{words} từ</span>
              <span>•</span>
              <span>{readTime} phút đọc</span>
              
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowOutline(!showOutline)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    showOutline ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Mục lục ({headings.length})</span>
                </button>
                {onCreateTask && (
                  <button
                    type="button"
                    onClick={() => {
                      const selText = editor?.state.doc.textBetween(
                        editor.state.selection.from,
                        editor.state.selection.to,
                        ' '
                      )?.trim();
                      onCreateTask(
                        selText ? selText.slice(0, 60) : `Việc từ: ${docDetails.title || 'Tài liệu'}`,
                        selText || `Được tạo từ tài liệu "${docDetails.title || 'Chưa có tiêu đề'}"`
                      );
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    <ListTodo className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Tạo việc</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedBlockId(selectedBlockId ? null : 'general')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    selectedBlockId ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Bình luận ({comments.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. Rich Editor Workspace & Comments Drawer */}
          <div ref={editorWorkspaceRef} className="flex-1 flex gap-8 relative min-h-0">
            <div className="flex-grow min-w-0">
                
                {/* Contextual Table Controls Bar */}
                {editor?.isActive('table') && canEdit && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="sticky top-14 z-30 mb-3 flex flex-wrap items-center gap-1.5 rounded-2xl border border-indigo-200/80 bg-white/95 px-3 py-1.5 text-xs font-bold shadow-md backdrop-blur-md dark:border-indigo-900/60 dark:bg-slate-900/95 select-none"
                  >
                    <div className="flex items-center gap-1.5 pr-2 mr-1 border-r border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400">
                      <Table2 className="w-4 h-4" />
                      <span className="text-[11px] font-black uppercase tracking-wider">Thao tác Bảng</span>
                    </div>
                    
                    {/* Rows */}
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().addRowBefore().run()}
                      className="px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs transition-colors cursor-pointer flex items-center gap-1"
                      title="Chèn hàng phía trên"
                    >
                      <Rows3 className="w-3.5 h-3.5 text-slate-400" />
                      <span>+ Hàng trên</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().addRowAfter().run()}
                      className="px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs transition-colors cursor-pointer flex items-center gap-1"
                      title="Chèn hàng phía dưới"
                    >
                      <Rows3 className="w-3.5 h-3.5 text-slate-400" />
                      <span>+ Hàng dưới</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().deleteRow().run()}
                      className="px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs transition-colors cursor-pointer"
                      title="Xóa hàng đang chọn"
                    >
                      ✕ Xóa hàng
                    </button>

                    <div className="w-px h-3.5 bg-slate-200 dark:border-slate-800 mx-1" />

                    {/* Columns */}
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().addColumnBefore().run()}
                      className="px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs transition-colors cursor-pointer flex items-center gap-1"
                      title="Chèn cột bên trái"
                    >
                      <Columns3 className="w-3.5 h-3.5 text-slate-400" />
                      <span>+ Cột trái</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().addColumnAfter().run()}
                      className="px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs transition-colors cursor-pointer flex items-center gap-1"
                      title="Chèn cột bên phải"
                    >
                      <Columns3 className="w-3.5 h-3.5 text-slate-400" />
                      <span>+ Cột phải</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().deleteColumn().run()}
                      className="px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs transition-colors cursor-pointer"
                      title="Xóa cột đang chọn"
                    >
                      ✕ Xóa cột
                    </button>

                    <div className="w-px h-3.5 bg-slate-200 dark:border-slate-800 mx-1" />

                    {/* Delete Table */}
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().deleteTable().run()}
                      className="px-2.5 py-1 rounded-lg hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer ml-auto flex items-center gap-1"
                      title="Xóa toàn bộ bảng"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa bảng</span>
                    </button>
                  </motion.div>
                )}

                {/* Tiptap Floating Bubble Menu on text selections */}
                <AnimatePresence>
                  {bubbleMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-1.5 shadow-2xl z-50 flex items-center gap-1 text-white select-none"
                      style={{ top: bubbleMenuCoords.top, left: bubbleMenuCoords.left }}
                      onClick={e => e.stopPropagation()}
                    >
                      <button 
                        type="button"
                        onClick={() => editor.chain().focus().toggleBold().run()} 
                        className={`p-1.5 rounded-lg hover:bg-slate-700 transition-colors ${editor.isActive('bold') ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
                        title="In đậm (Ctrl+B)"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => editor.chain().focus().toggleItalic().run()} 
                        className={`p-1.5 rounded-lg hover:bg-slate-700 transition-colors ${editor.isActive('italic') ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
                        title="In nghiêng (Ctrl+I)"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => editor.chain().focus().toggleUnderline().run()} 
                        className={`p-1.5 rounded-lg hover:bg-slate-700 transition-colors ${editor.isActive('underline') ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
                        title="Gạch chân (Ctrl+U)"
                      >
                        <UnderlineIcon className="w-3.5 h-3.5" />
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
                        title="Mã nội dòng"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button"
                        onClick={handleSetLink} 
                        className={`p-1.5 rounded-lg hover:bg-slate-700 transition-colors ${editor.isActive('link') ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
                        title="Chèn liên kết"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                      </button>
                      
                      <div className="w-px h-4 bg-slate-700 mx-1" />

                      <button 
                        type="button"
                        onClick={() => {
                          if (!editor || !editor.state || !editor.state.selection) return;
                          const $from = editor.state.selection.$from;
                          const selectionPosition = $from && $from.depth > 0
                            ? $from.before()
                            : ($from?.pos ?? 0);
                          const blockId = $from?.parent?.attrs?.id || `block-${selectionPosition}`;
                          setSelectedBlockId(blockId);
                        }}
                        className="px-2 py-1 rounded-lg hover:bg-slate-700 flex items-center gap-1 text-xs font-bold transition-colors text-slate-300 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Bình luận
                      </button>
                      {onCreateTask && (
                        <button
                          type="button"
                          onClick={createTaskFromSelection}
                          className="px-2 py-1 rounded-lg hover:bg-slate-700 flex items-center gap-1 text-xs font-bold transition-colors text-slate-300 cursor-pointer"
                        >
                          <ListTodo className="w-3.5 h-3.5 text-emerald-400" /> Tạo task
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Editor Content Area */}
                <EditorContent editor={editor} className="relative z-10 min-h-[500px]" />

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
                      <div className="flex items-center justify-between gap-3 px-2 py-1.5 mb-1.5 border-b border-slate-200/80 dark:border-slate-800">
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
                          <p className="text-[10px] text-slate-400 mt-1">Thử “tiêu đề”, “todo”, “ghi chú” hoặc “code”.</p>
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
                <div className="w-72 border-l border-slate-200/80 dark:border-slate-800 pl-4 flex flex-col h-full shrink-0 select-text bg-slate-50/50 dark:bg-slate-950/30 p-3 rounded-2xl max-h-[500px] print:hidden">
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
                            <p className={`text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium break-words text-pretty ${c.is_resolved ? 'line-through text-slate-400' : ''}`}>{c.content}</p>
                            <div className="flex items-center gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity select-none">
                              <button type="button" onClick={() => handleResolveComment(c.id, Boolean(c.is_resolved))} className="px-2 py-1 rounded-lg text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-1 cursor-pointer">
                                <CheckCircle2 className="w-3 h-3" /> {c.is_resolved ? 'Mở lại' : 'Giải quyết'}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={handleAddComment} className="mt-2 flex gap-2 items-center select-text">
                    <input 
                      type="text" 
                      value={newCommentVal}
                      onChange={e => setNewCommentVal(e.target.value)}
                      disabled={isOffline || !canComment}
                      placeholder={canComment ? 'Viết bình luận...' : 'Bạn chỉ có quyền xem'}
                      className="flex-grow bg-white dark:bg-slate-900 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500 placeholder-slate-400 text-slate-800 dark:text-slate-100"
                    />
                    <button 
                      type="submit" 
                      disabled={!canComment || !newCommentVal.trim()}
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
        </main>
      </div>

      {/* Share / History Drawers Modal */}
      <AnimatePresence>
        {showShareMenu && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
            <div className="absolute inset-0 cursor-pointer" onClick={() => setShowShareMenu(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 text-left font-sans select-none"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-sky-950/40 text-blue-600 dark:text-sky-400 flex items-center justify-center">
                    <ShieldCheck className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Quyền truy cập & Chia sẻ tài liệu</h3>
                    <p className="text-[11px] text-slate-400 font-bold truncate max-w-[260px]">{docDetails.title || 'Tài liệu không tên'}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowShareMenu(false)} className="w-7 h-7 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">✕</button>
              </div>

              {/* Quick Copy Link Bar */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <input 
                    readOnly 
                    value={typeof window !== 'undefined' ? `${window.location.origin}/?doc=${documentId}` : ''} 
                    className="w-full text-xs font-mono text-slate-600 dark:text-slate-300 bg-transparent border-none outline-none select-all truncate" 
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window === 'undefined') return;
                    navigator.clipboard.writeText(`${window.location.origin}/?doc=${documentId}`);
                    setCopiedDocLink(true);
                    setTimeout(() => setCopiedDocLink(false), 2500);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
                >
                  {copiedDocLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDocLink ? 'Đã chép' : 'Sao chép link'}</span>
                </button>
              </div>

              {/* Public/Private Publish Toggle */}
              <button type="button" onClick={togglePublished} className="w-full flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 p-3.5 text-left cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
                <span className="flex items-center gap-3">
                  {docDetails.is_published ? <Globe2 className="w-5 h-5 text-emerald-500" /> : <LockKeyhole className="w-5 h-5 text-slate-400" />}
                  <span>
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">{docDetails.is_published ? 'Đã xuất bản (Công khai qua liên kết)' : 'Riêng tư (Chỉ thành viên được cấp quyền)'}</span>
                    <span className="block text-[10px] text-slate-400">{docDetails.is_published ? 'Bất kỳ ai có liên kết đều có thể đọc tài liệu này.' : 'Chỉ những cộng tác viên được mời mới truy cập được.'}</span>
                  </span>
                </span>
                <span className={`w-9 h-5 rounded-full p-0.5 transition-colors ${docDetails.is_published ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${docDetails.is_published ? 'translate-x-4' : ''}`} />
                </span>
              </button>

              {/* Add Collaborator Form */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[10.5px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block">
                  Thêm cộng tác viên
                </label>
                <div className="flex gap-2">
                  <Select
                    value={selectedCollaboratorId}
                    onChange={v => setSelectedCollaboratorId(v)}
                    options={members.filter(member => resolveAuthUserId(member) && resolveAuthUserId(member) !== authUserId).map(member => ({ value: member.id, label: member.name }))}
                    className="min-w-0 flex-1"
                    size="sm"
                    placeholder="Chọn thành viên Workspace..."
                    ariaLabel="Thành viên chia sẻ"
                    menuWidth={280}
                  />
                  <Select
                    value={shareRole}
                    onChange={v => setShareRole(v)}
                    options={[
                      { value: 'editor', label: 'Chỉnh sửa (Editor)' },
                      { value: 'commenter', label: 'Bình luận (Commenter)' },
                      { value: 'viewer', label: 'Chỉ xem (Viewer)' }
                    ]}
                    className="w-40"
                    size="sm"
                    ariaLabel="Quyền chia sẻ"
                  />
                  <button type="button" onClick={addCollaborator} disabled={!selectedCollaboratorId} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0">
                    <UserPlus className="w-3.5 h-3.5" /> Thêm
                  </button>
                </div>
              </div>

              {/* List of Collaborators */}
              {collaborators.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">
                    Cộng tác viên ({collaborators.length})
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                    {collaborators.map(collaborator => {
                      const member = members.find(memberItem => resolveAuthUserId(memberItem) === collaborator.user_id);
                      return (
                        <div key={collaborator.id} className="flex items-center justify-between rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <span className="truncate">{member?.name || 'Thành viên'} <span className="text-slate-400 font-semibold">· {collaborator.role === 'editor' ? 'Chỉnh sửa' : collaborator.role === 'commenter' ? 'Bình luận' : 'Chỉ xem'}</span></span>
                          <button type="button" onClick={() => removeCollaborator(collaborator.id)} className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer" title="Gỡ cộng tác viên">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Advanced Share Modal Trigger */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowShareMenu(false); setShowFullShareModal(true); }}
                  className="w-full py-2.5 px-3 rounded-2xl bg-blue-50 hover:bg-blue-100/80 dark:bg-sky-950/40 dark:hover:bg-sky-900/40 text-blue-600 dark:text-sky-400 text-xs font-bold transition-all flex items-center justify-between cursor-pointer border border-blue-100 dark:border-sky-800/50"
                >
                  <span className="flex items-center gap-2">
                    <QrCode className="w-4 h-4" />
                    <span>Mã QR, Nhúng Iframe & Chia sẻ MXH...</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-blue-500" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unified Apexa Share Modal for Document */}
      {showFullShareModal && (
        <ShareSettingsModal
          isOpen={showFullShareModal}
          onClose={() => setShowFullShareModal(false)}
          targetType="doc"
          targetId={documentId}
          targetName={docDetails?.title || 'Tài liệu không tên'}
          isPrivate={!docDetails?.is_published}
          shareSettings={(() => {
            const map: Record<string, ShareRole> = {};
            collaborators.forEach(c => {
              if (c.user_id) {
                map[c.user_id] = c.role === 'editor' ? 'edit' : c.role === 'commenter' ? 'comment' : 'view';
              }
            });
            return map;
          })()}
          members={members}
          currentUser={currentUser || members[0] || { name: 'Tôi' }}
          canEdit={canEdit}
          customShareUrl={typeof window !== 'undefined' ? `${window.location.origin}/?doc=${documentId}` : ''}
          spaceId={docDetails?.spaceId || docDetails?.space_id}
          onSave={async (newIsPrivate, newShareSettings) => {
            const nextPublished = !newIsPrivate;
            if (docDetails?.is_published !== nextPublished) {
              await supabase
                .from('documents')
                .update({ is_published: nextPublished })
                .eq('id', documentId);
              setDocDetails((current: any) => ({ ...current, is_published: nextPublished }));
              onDocumentUpdated?.({ is_published: nextPublished });
            }
            for (const [userId, role] of Object.entries(newShareSettings)) {
              const dbRole = role === 'edit' ? 'editor' : role === 'comment' ? 'commenter' : 'viewer';
              await supabase.from('document_collaborators').upsert({
                document_id: documentId,
                user_id: userId,
                role: dbRole
              }, { onConflict: 'document_id,user_id' });
            }
            await loadCollaborators();
          }}
        />
      )}
    </div>
  );
}
