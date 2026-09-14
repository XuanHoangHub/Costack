"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage, ChatChannel, User, Space, Priority } from '../types';
import { supabase, getCleanChannel } from '../supabaseClient';
import SignedImage from './SignedImage';
import { presenceDotClass, uiStatusToPresence } from '../lib/presence';
import { useTranslation } from '../contexts/TranslationContext';
import { 
  Hash, Send, Bot, Smile, Users, MessageSquare, Sparkles, Plus, X,
  Paperclip, ThumbsUp, Heart, Search, Trash2, Edit2, Loader2, ArrowRight,
  Volume2, VolumeX, Globe, MoreVertical, MoreHorizontal, Mic, Square, Play, Pause, FileAudio,
  Bold, Italic, Code, Quote, Pin, PinOff, CornerUpLeft, Copy,
  Forward, AtSign, Check, Settings, ChevronDown, ChevronLeft, ChevronRight, UserPlus, Clock, CheckSquare, Calendar,
  BarChart3, Download, Eye, Vote, HelpCircle, Video, FileText, Zap, Star, Sliders, Bell, SmilePlus, Image as ImageIcon,
  AlertCircle, RefreshCw, WifiOff, ZoomIn, ZoomOut, RotateCw
} from 'lucide-react';
import { callAiApi } from '@/lib/aiClient';
import { useSpaceStore } from '../store/spaceStore';
import { useUiStore } from '../store/uiStore';

const useChatAttachmentUrl = (filePath?: string) => {
  const [url, setUrl] = useState(filePath || '');

  useEffect(() => {
    let active = true;
    if (!filePath || /^(https?:|blob:|data:|\/)/.test(filePath)) {
      setUrl(filePath || '');
      return;
    }

    supabase.storage.from('chat-attachments').createSignedUrl(filePath, 3600).then(({ data, error }) => {
      if (!active) return;
      setUrl(error ? '' : (data?.signedUrl || ''));
    });

    return () => { active = false; };
  }, [filePath]);

  return url;
};

const ChatAttachmentDownload = ({ filePath, name }: { filePath: string; name: string }) => {
  const url = useChatAttachmentUrl(filePath);
  return (
    <a
      href={url || undefined}
      download={name}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={!url}
      className={`p-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 transition-colors shrink-0 flex items-center justify-center ${url ? 'hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer' : 'opacity-40 pointer-events-none'}`}
      title={url ? `Tải ${name}` : 'Đang chuẩn bị liên kết tải xuống'}
    >
      <ArrowRight className="w-3.5 h-3.5" />
    </a>
  );
};

const highlightSearchText = (text: string, query: string) => {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 px-0.5 rounded-xs font-bold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

const VoiceMessagePlayer = ({ filePath, duration }: { filePath: string; duration?: number }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const audioUrl = useChatAttachmentUrl(filePath);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setTotalDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.error("Playback error:", err));
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const seekTime = parseFloat(e.target.value);
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const barCount = 28;
  const bars = [4, 6, 8, 5, 3, 7, 9, 12, 10, 6, 8, 4, 3, 5, 8, 11, 7, 5, 9, 6, 4, 3, 5, 7, 8, 10, 6, 4];

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100 max-w-xs hover:bg-indigo-50 transition-colors">
      <button 
        type="button"
        onClick={togglePlay}
        className="w-8.5 h-8.5 rounded-full bg-indigo-650 hover:bg-indigo-750 text-white flex items-center justify-center transition-all shadow-md shrink-0 cursor-pointer active:scale-95"
      >
        {isPlaying ? (
          <Pause className="w-3.5 h-3.5 fill-white" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0 flex flex-col gap-1 text-left">
        <div className="flex items-end gap-0.5 h-6 select-none relative pt-1">
          {bars.map((height, idx) => {
            const barProgress = (idx / barCount) * totalDuration;
            const isPlayed = currentTime >= barProgress;
            return (
              <div 
                key={idx}
                className="w-1 rounded-t-xs transition-colors duration-150"
                style={{ 
                  height: `${(height / 12) * 100}%`, 
                  backgroundColor: isPlayed ? 'rgb(79, 70, 229)' : 'rgb(224, 231, 255)' 
                }}
              />
            );
          })}
          <input 
            type="range"
            min={0}
            max={totalDuration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <div className="flex justify-between text-[8px] font-bold text-slate-450 font-mono select-none mt-0.5 uppercase tracking-wider">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
};

interface ChatRoomProps {
  members: User[];
  currentUser: any;
  isOffline: boolean;
  onAddSyncLog: (action: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
  activeTab?: string;
  initialSelectedChannelId?: string | null;
  onClearInitialSelectedChannelId?: () => void;
  workspaceId: string;
  spaces?: Space[];
  onSaveSpaces?: (spaces: Space[]) => void;
  onAddTask?: (task: any) => void;
  setViewType?: (view: any) => void;
  forcedChannelId?: string;
  forcedChannelName?: string;
}

// Minimal markdown formatter
const formatLineMarkdown = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|@\w[\w\s]*?\b)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-black text-inherit">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return <em key={i} className="italic font-semibold text-inherit opacity-90">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="mx-0.5 rounded border border-current/15 bg-black/5 px-1.5 py-0.5 font-mono text-[10px] font-bold text-inherit dark:bg-white/10">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('@') && part.length > 1) {
      return <span key={i} className="cursor-pointer rounded-md bg-current/10 px-1 py-0.5 text-[11px] font-bold text-inherit transition-opacity hover:opacity-75">{part}</span>;
    }
    return part;
  });
};

const formatMessageContent = (text: string) => {
  if (!text) return '';
  const lines = text.split('\n');
  const processedLines = lines.map((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('>')) {
      const content = line.substring(line.indexOf('>') + 1).trim();
      return (
        <div key={idx} className="my-1 rounded-r-lg border-l-[3px] border-current/35 bg-black/5 py-1 pl-3 italic text-inherit opacity-80 dark:bg-white/5">
          {formatLineMarkdown(content)}
        </div>
      );
    }
    const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
    if (numMatch) {
      const num = numMatch[1];
      const content = numMatch[2];
      return (
        <div key={idx} className="flex items-start gap-2 py-0.5 min-h-[20px]">
          <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 select-none items-center justify-center rounded-full border border-current/15 bg-black/5 font-sans text-[9.5px] font-black text-inherit shadow-3xs dark:bg-white/10">
            {num}
          </span>
          <span className="flex-1 min-h-[16px]">
            {formatLineMarkdown(content)}
          </span>
        </div>
      );
    }
    return <div key={idx} className="min-h-[16px]">{formatLineMarkdown(line)}</div>;
  });
  return <div className="space-y-0.5">{processedLines}</div>;
};

const mapChatMessage = (row: any): ChatMessage => ({
  id: row.id,
  senderId: row.sender_id,
  senderName: row.sender_name,
  senderAvatar: row.sender_avatar || '',
  content: row.content,
  timestamp: row.timestamp,
  channelId: row.channel_id,
  isAi: row.is_ai_response,
  reactions: Array.isArray(row.reactions) ? row.reactions : [],
  attachment: row.attachment || undefined,
  parentId: row.parent_id || undefined,
  isPinned: Boolean(row.is_pinned),
  createdAt: row.created_at,
  editedAt: row.edited_at || undefined,
  deliveryState: 'sent'
});

const safeFileName = (name: string) => name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
const MAX_CHAT_MESSAGE_LENGTH = 4000;
const EMPTY_CHAT_SPACES: Space[] = [];
const resolveMemberAuthId = (member: User) => {
  const candidate = member.userId || member.id;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate) ? candidate : null;
};

type PendingChatAttachment = {
  name: string;
  size: number;
  type: string;
  url?: string;
  file?: File | Blob;
  isVoice?: boolean;
  duration?: number;
};

type PendingChatMessage = {
  message: ChatMessage;
  attachment?: PendingChatAttachment | null;
};

export default function ChatRoom({
  members,
  currentUser,
  isOffline,
  onAddSyncLog,
  triggerToast,
  activeTab,
  initialSelectedChannelId,
  onClearInitialSelectedChannelId,
  workspaceId,
  spaces = EMPTY_CHAT_SPACES,
  onSaveSpaces,
  onAddTask,
  setViewType
}: ChatRoomProps) {
  const { t } = useTranslation();
  const setViewingMemberProfileId = useUiStore((s) => s.setViewingMemberProfileId);
  // Navigation & Channels
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('');
  const [isMobileChatActive, setIsMobileChatActive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showMemberDrawer, setShowMemberDrawer] = useState(false);

  // Custom Channel Management states
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showNewDmModal, setShowNewDmModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [dmSearchQuery, setDmSearchQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelType, setNewChannelType] = useState<'public' | 'private'>('public');
  // Custom Channel Actions & Rename states
  const [activeChannelMenuId, setActiveChannelMenuId] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingChannelId, setRenamingChannelId] = useState<string | null>(null);
  const [renameChannelName, setRenameChannelName] = useState('');
  const [renameChannelDesc, setRenameChannelDesc] = useState('');
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const channelSubscriptionRef = useRef<any>(null);
  const messageCacheRef = useRef<Map<string, ChatMessage[]>>(new Map());
  const activeChannelIdRef = useRef('');
  const isNearBottomRef = useRef(true);
  const pendingMessagesRef = useRef<Map<string, PendingChatMessage>>(new Map());
  const flushingPendingRef = useRef(false);
  const typingRemovalTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const membersRef = useRef(members);
  useEffect(() => { membersRef.current = members; }, [members]);
  const spacesRef = useRef(spaces);
  useEffect(() => { spacesRef.current = spaces; }, [spaces]);

  // Emoji Picker Popover state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // File Attachment states
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number; type: string; url?: string; file?: File | Blob; isVoice?: boolean; duration?: number } | null>(null);

  // Voice Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const autoSendVoiceRef = useRef(false);
  const sendVoiceDirectlyRef = useRef<((file: any) => void) | null>(null);

  // Multi-tab Right Sidebar states
  const [activeSidebarTab, setActiveSidebarTab] = useState<'members' | 'pinned' | 'search' | 'files'>('members');
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  // Image Lightbox Modal state
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    name: string;
    size?: number;
    senderName?: string;
    timestamp?: string;
  } | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxRotation, setLightboxRotation] = useState(0);

  // Thread states
  const [activeThreadMessage, setActiveThreadMessage] = useState<ChatMessage | null>(null);
  const [threadInputVal, setThreadInputVal] = useState('');

  // @Mention states
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionCursorPos, setMentionCursorPos] = useState(0);

  // Typing indicator state
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<any>(null);
  const lastTypingBroadcastRef = useRef(0);

  // Unread badge tracking
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastReadTimestamps, setLastReadTimestamps] = useState<Record<string, string>>({});

  // Message forward modal
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);

  // Drag-and-drop state
  const [isDragOver, setIsDragOver] = useState(false);

  // Form input states
  const [inputVal, setInputVal] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [newMessagesBelow, setNewMessagesBelow] = useState(0);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  // ── Per-channel draft persistence (bản nháp theo kênh) ──
  const chatDraftsRef = useRef<Record<string, string>>({});
  const persistChatDrafts = () => {
    try { localStorage.setItem('apexa_chat_drafts', JSON.stringify(chatDraftsRef.current)); } catch {}
  };

  useEffect(() => {
    try {
      chatDraftsRef.current = JSON.parse(localStorage.getItem('apexa_chat_drafts') || '{}');
    } catch { chatDraftsRef.current = {}; }
  }, []);

  // Restore draft & reset reply context when switching channels
  useEffect(() => {
    if (!activeChannelId) return;
    setInputVal(chatDraftsRef.current[activeChannelId] || '');
    setReplyingToMessage(null);
  }, [activeChannelId]);

  // Search channels & sidebar collapse state
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    shortcuts: false,
    starred: false,
    channels: false,
    groups: false,
    dms: false,
  });
  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Speech Synthesis & Search Web states
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const utteranceRef = useRef<any>(null);
  const [searchWeb, setSearchWeb] = useState(false);

  // Convert Message to Task States
  const [convertTaskMessage, setConvertTaskMessage] = useState<ChatMessage | null>(null);
  const [convertTaskTitle, setConvertTaskTitle] = useState('');
  const [convertTaskSpaceId, setConvertTaskSpaceId] = useState('');
  const [convertTaskListId, setConvertTaskListId] = useState('');
  const [convertTaskPriority, setConvertTaskPriority] = useState<Priority>('medium');
  const [convertTaskAssigneeId, setConvertTaskAssigneeId] = useState('');

  // Slash Commands Dropdown States
  const [showCommandDropdown, setShowCommandDropdown] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);

  // AI Channel Summary state
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [aiSummaryText, setAiSummaryText] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Poll Creation state
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['Option 1', 'Option 2']);

  // Message Translation state
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
  const [translatingMsgId, setTranslatingMsgId] = useState<string | null>(null);

  // Markdown Preview state
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // ── Starred Channels State ──
  const [starredChannelIds, setStarredChannelIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('apexa_starred_channels');
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('apexa_starred_channels', JSON.stringify(starredChannelIds));
    } catch (e) {}
  }, [starredChannelIds]);

  const toggleStarChannel = (chanId: string) => {
    setStarredChannelIds(prev => {
      const exists = prev.includes(chanId);
      const updated = exists ? prev.filter(id => id !== chanId) : [...prev, chanId];
      if (!isOffline) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session?.user?.id) return;
          supabase.from('chat_channel_members').upsert({
            channel_id: chanId,
            user_id: session.user.id,
            is_starred: !exists
          }, { onConflict: 'channel_id,user_id' }).then(({ error }) => {
            if (error) console.error('Unable to save starred channel:', error);
          });
        });
      }
      triggerToast?.('info', exists ? 'Đã bỏ yêu thích ⭐' : 'Đã thêm vào Yêu thích ⭐', exists ? 'Kênh đã xóa khỏi mục Starred' : 'Kênh đã thêm vào mục Starred');
      return updated;
    });
  };

  // ── New Features & Icon Action States ──
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifCategory, setGifCategory] = useState('All');
  const [gifSearch, setGifSearch] = useState('');

  const [showVideoMeetModal, setShowVideoMeetModal] = useState(false);
  const [videoMeetTitle, setVideoMeetTitle] = useState('Cuộc họp nhanh');

  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklistItems, setChecklistItems] = useState<string[]>(['Hoàn thành giao diện Chat', 'Kiểm tra Video Call', 'Gửi báo cáo công việc']);

  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [autoSummaryEnabled, setAutoSummaryEnabled] = useState(true);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [keywordAlerts, setKeywordAlerts] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');

  const [showAiEnhanceMenu, setShowAiEnhanceMenu] = useState(false);
  const [isAiEnhancing, setIsAiEnhancing] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  const [showQuickCreateMenu, setShowQuickCreateMenu] = useState(false);
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);
  const [showChatSettingsModal, setShowChatSettingsModal] = useState(false);

  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const [moreMenuMsgId, setMoreMenuMsgId] = useState<string | null>(null);

  const [chatSettings, setChatSettings] = useState({
    soundEnabled: true,
    compactMode: false,
    desktopNotifications: false,
    enterToSend: true
  });
  const [chatSettingsReady, setChatSettingsReady] = useState(false);
  const chatSettingsRef = useRef(chatSettings);

  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
    isNearBottomRef.current = true;
    setNewMessagesBelow(0);
  }, [activeChannelId]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('apexa_chat_settings');
      if (saved) setChatSettings(previous => ({ ...previous, ...JSON.parse(saved) }));
    } catch {}
    setChatSettingsReady(true);
  }, []);

  useEffect(() => {
    chatSettingsRef.current = chatSettings;
    if (!chatSettingsReady) return;
    try { localStorage.setItem('apexa_chat_settings', JSON.stringify(chatSettings)); } catch {}
  }, [chatSettings, chatSettingsReady]);

  const handleDesktopNotificationsChange = async (enabled: boolean) => {
    if (enabled && 'Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        triggerToast?.('info', 'Chưa bật thông báo', 'Trình duyệt chưa cấp quyền hiển thị thông báo desktop.');
        setChatSettings(previous => ({ ...previous, desktopNotifications: false }));
        return;
      }
    }
    if (enabled && (!('Notification' in window) || Notification.permission === 'denied')) {
      triggerToast?.('info', 'Không thể bật thông báo', 'Hãy cấp quyền thông báo cho Apexa trong cài đặt trình duyệt.');
      setChatSettings(previous => ({ ...previous, desktopNotifications: false }));
      return;
    }
    setChatSettings(previous => ({ ...previous, desktopNotifications: enabled }));
  };

  // GIF dataset
  const GIF_GALLERY = [
    { id: '1', title: 'Party Celebrate 🎉', category: 'Congrats', url: 'https://media.giphy.com/media/26tOZbfHHHJVjB3ag/giphy.gif' },
    { id: '2', title: 'Thumbs Up 👍', category: 'Agree', url: 'https://media.giphy.com/media/l1KvZa0GgK6bW/giphy.gif' },
    { id: '3', title: 'Mind Blown 🤯', category: 'Mindblown', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
    { id: '4', title: 'Working Hard 💻', category: 'Work', url: 'https://media.giphy.com/media/13HgwVL9Z0FiIE/giphy.gif' },
    { id: '5', title: 'Coffee Time ☕', category: 'Work', url: 'https://media.giphy.com/media/h36vh423nycXSmFPMw/giphy.gif' },
    { id: '6', title: 'Victory Cheer 🏆', category: 'Congrats', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif' },
    { id: '7', title: 'Applaud Clapping 👏', category: 'Congrats', url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif' },
    { id: '8', title: 'Fire Flame 🔥', category: 'Fire', url: 'https://media.giphy.com/media/nrXif4YjgXwgE/giphy.gif' },
    { id: '9', title: 'Thank You 🙏', category: 'Thanks', url: 'https://media.giphy.com/media/3o6Zt6KH6vhqhll744/giphy.gif' },
    { id: '10', title: 'Laughing 😂', category: 'Laugh', url: 'https://media.giphy.com/media/10JhvtGPxq6EYU/giphy.gif' },
    { id: '11', title: 'Love Heart ❤️', category: 'Love', url: 'https://media.giphy.com/media/26hpKMTa5Hg1XUA12/giphy.gif' },
    { id: '12', title: 'Thinking 🤔', category: 'Mindblown', url: 'https://media.giphy.com/media/a5viI92PAF89q/giphy.gif' }
  ];

  // Message templates dataset
  const MESSAGE_TEMPLATES = [
    {
      id: 'standup',
      name: '🚀 Daily Standup',
      desc: 'Báo cáo công việc hằng ngày',
      content: `### 🚀 Báo cáo Hằng ngày (Daily Standup)\n- **Hôm qua đã làm:** \n- **Hôm nay sẽ làm:** \n- **Khó khăn / Vướng mắc:** Không có`
    },
    {
      id: 'bug',
      name: '🐛 Bug Report',
      desc: 'Mô tả lỗi sản phẩm chi tiết',
      content: `### 🐛 Báo cáo Lỗi (Bug Report)\n- **Mô tả lỗi:** \n- **Các bước tái hiện:**\n  1. \n  2. \n- **Kết quả mong đợi:** \n- **Mức độ ưu tiên:** High`
    },
    {
      id: 'feature',
      name: '💡 Feature Proposal',
      desc: 'Đề xuất tính năng mới',
      content: `### 💡 Đề xuất Tính năng Mới\n- **Tên tính năng:** \n- **Lợi ích mang lại:** \n- **Chi tiết kỹ thuật:** `
    },
    {
      id: 'notes',
      name: '📅 Meeting Notes',
      desc: 'Tóm tắt nội dung cuộc họp',
      content: `### 📅 Biên bản Cuộc họp (Meeting Notes)\n- **Thành phần tham dự:** \n- **Nội dung chính:** \n- **Hành động tiếp theo (Action Items):** `
    },
    {
      id: 'announcement',
      name: '📢 Team Announcement',
      desc: 'Thông báo quan trọng cho team',
      content: `### 📢 Thông báo Quan trọng\n- **Nội dung:** \n- **Đối tượng:** Tất cả thành viên\n- **Hạn chót:** `
    }
  ];

  const persistStructuredMessage = async (
    message: ChatMessage,
    channelId = activeChannelId
  ) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('Authentication required');
    const { error } = await supabase.from('chat_messages').insert({
      id: message.id,
      sender_id: message.senderId,
      sender_name: message.senderName,
      sender_avatar: message.senderAvatar || null,
      content: message.content,
      timestamp: message.timestamp,
      channel_id: channelId,
      is_ai_response: Boolean(message.isAi),
      workspace_id: workspaceId,
      user_id: session.user.id,
      attachment: message.attachment || null,
      parent_id: message.parentId || null,
      reactions: message.reactions || []
    });
    if (error) throw error;
  };

  // Handlers for Icon Actions
  const handleSendGif = async (gif: { title: string; url: string }) => {
    const msgId = `msg-${Date.now()}`;
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const newMsg: ChatMessage = {
      id: msgId,
      senderId: currentUser.id || 'user',
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      content: `GIF: ${gif.title}`,
      timestamp: timeStr,
      attachment: {
        name: `${gif.title}.gif`,
        size: 150000,
        type: 'image/gif',
        filePath: gif.url,
        isImage: true
      }
    };
    try {
      await persistStructuredMessage(newMsg);
      setMessages(prev => prev.some(message => message.id === newMsg.id) ? prev : [...prev, newMsg]);
      setShowGifPicker(false);
      scrollToBottom();
      triggerToast?.('success', 'Đã gửi GIF 🎞️', `Đã chia sẻ ${gif.title}`);
    } catch (error) {
      console.error('Unable to send GIF:', error);
      triggerToast?.('error', 'Không gửi được GIF', 'Vui lòng thử lại.');
    }
  };

  const handleCreateVideoMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    const roomName = `apexa-${activeChannelId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString(36)}`;
    const roomUrl = `https://meet.jit.si/${roomName}`;
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    
    const meetingMsg: ChatMessage = {
      id: `meet-${Date.now()}`,
      senderId: currentUser.id || 'user',
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      content: `📹 **CUỘC HỌP VIDEO TRỰC TUYẾN**\n\n🎯 **Chủ đề:** ${videoMeetTitle}\n🔗 **Link tham gia:** ${roomUrl}\n\n*Bấm vào thẻ bên dưới để tham gia cuộc họp!*`,
      timestamp: timeStr,
      attachment: {
        name: `Video Meeting: ${videoMeetTitle}`,
        size: 0,
        type: 'video/meeting',
        filePath: roomUrl,
        isVideoMeet: true,
        meetingUrl: roomUrl,
        meetingTitle: videoMeetTitle
      } as any
    };
    
    try {
      await persistStructuredMessage(meetingMsg);
      setMessages(prev => prev.some(message => message.id === meetingMsg.id) ? prev : [...prev, meetingMsg]);
      setShowVideoMeetModal(false);
      setVideoMeetTitle('Cuộc họp nhanh');
      scrollToBottom();
      triggerToast?.('success', 'Đã tạo cuộc họp Video 📹', 'Mọi người có thể tham gia ngay bây giờ.');
    } catch (error) {
      console.error('Unable to create meeting:', error);
      triggerToast?.('error', 'Không tạo được cuộc họp', 'Vui lòng thử lại.');
    }
  };

  const handleInsertChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = checklistItems.filter(item => item.trim());
    if (validItems.length === 0) return;
    
    const checklistMarkdown = `☑️ **Danh sách công việc (Checklist):**\n` + validItems.map(item => `- [ ] ${item}`).join('\n');
    
    setInputVal(prev => prev ? `${prev}\n\n${checklistMarkdown}` : checklistMarkdown);
    setShowChecklistModal(false);
    triggerToast?.('info', 'Đã chèn Checklist ☑️', 'Đã thêm danh sách vào khung soạn thảo.');
  };

  const handleSelectTemplate = (templateContent: string) => {
    setInputVal(templateContent);
    setShowTemplateModal(false);
    inputRef.current?.focus();
    triggerToast?.('success', 'Đã chèn mẫu tin nhắn 📝', 'Bạn có thể chỉnh sửa nội dung trước khi gửi.');
  };

  const handleAiEnhanceInput = async (action: 'expand' | 'formal' | 'shorten' | 'translate' | 'spelling') => {
    if (!inputVal.trim()) {
      triggerToast?.('warning', 'Khung soạn nhập trống', 'Vui lòng viết một đoạn văn trước khi dùng AI.');
      return;
    }
    setIsAiEnhancing(true);
    setShowAiEnhanceMenu(false);
    
    let promptInstruction = '';
    if (action === 'expand') promptInstruction = 'Hãy viết tiếp và mở rộng đoạn văn sau một cách tự nhiên, bổ sung các ý chi tiết:';
    else if (action === 'formal') promptInstruction = 'Hãy viết lại đoạn văn sau theo văn phong công sở chuyên nghiệp, lịch sự và rõ ràng:';
    else if (action === 'shorten') promptInstruction = 'Hãy súc tích hóa và tóm tắt đoạn văn sau trong 1-2 câu ngắn gọn:';
    else if (action === 'translate') promptInstruction = 'Hãy dịch đoạn văn sau sang tiếng Anh tự nhiên, chuẩn mực:';
    else if (action === 'spelling') promptInstruction = 'Hãy sửa toàn bộ lỗi chính tả và ngữ pháp cho đoạn văn sau, giữ nguyên nội dung gốc:';

    try {
      const response = await callAiApi('/api/ai/chat', {
        message: `${promptInstruction}\n\n"${inputVal}"`
      });
      const data = await response.json();
      if (data.success && data.text) {
        setInputVal(data.text.trim());
        triggerToast?.('success', 'AI đã tối ưu tin nhắn ✨', 'Nội dung văn bản đã được cập nhật.');
      }
    } catch (err) {
      triggerToast?.('error', 'Lỗi AI ✨', 'Không thể kết nối dịch vụ AI.');
    } finally {
      setIsAiEnhancing(false);
    }
  };

  const handleSaveAutomationSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setShowAutomationModal(false);
    triggerToast?.('success', 'Đã lưu Cấu hình Tự động hóa ⚡', `Đã cập nhật quy tắc cho kênh #${activeChannel?.name || 'chat'}`);
  };

  // ── AI Channel Summary Handler ──
  const handleSummarizeChannel = async () => {
    if (messages.length === 0) {
      triggerToast?.('info', 'No Messages', 'Channel has no messages to summarize.');
      return;
    }
    setIsSummarizing(true);
    setShowSummaryModal(true);
    setAiSummaryText('');

    try {
      const channelMessagesText = messages.slice(-25).map(m => `${m.senderName}: ${m.content}`).join('\n');
      const prompt = `Hãy phân tích cuộc trò chuyện sau từ kênh #${activeChannel?.name || 'chat'} và đưa ra bản tóm tắt ngắn gọn, cấu trúc bằng tiếng Việt gồm:
1. 📌 Tóm tắt chính (Key Discussion Points)
2. 🎯 Quyết định đã thống nhất (Key Decisions)
3. ⚡️ Công việc cần làm (Action Items / Next Steps)

Nội dung trò chuyện:
${channelMessagesText}`;

      const response = await callAiApi('/api/ai/chat', { message: prompt });
      const data = await response.json();
      if (data.success && data.text) {
        setAiSummaryText(data.text);
      } else {
        setAiSummaryText('Không thể tạo tóm tắt vào lúc này. Vui lòng thử lại sau.');
      }
    } catch (err) {
      console.error('Error generating channel summary:', err);
      setAiSummaryText('Lỗi kết nối AI khi tạo tóm tắt.');
    } finally {
      setIsSummarizing(false);
    }
  };

  // ── Channel Export Handler ──
  const handleExportChatMarkdown = () => {
    if (messages.length === 0) {
      triggerToast?.('info', 'No Messages', 'No chat history to export.');
      return;
    }

    const channelName = activeChannel?.name || 'chat';
    const lines = [
      `# Chat History - #${channelName}`,
      `*Exported on: ${new Date().toLocaleString()}*`,
      `---`,
      ''
    ];

    messages.forEach(m => {
      lines.push(`**${m.senderName}** *(${m.timestamp})*:`);
      lines.push(`${m.content}`);
      if (m.attachment) {
        lines.push(`> 📎 Attachment: ${m.attachment.name || 'file'}`);
      }
      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-export-${channelName}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    triggerToast?.('success', 'Export Complete 📥', `Exported #${channelName} history to Markdown.`);
  };

  // ── Translate Message Handler ──
  const handleTranslateMessage = async (msgId: string, content: string) => {
    if (translatedMessages[msgId]) {
      setTranslatedMessages(prev => {
        const next = { ...prev };
        delete next[msgId];
        return next;
      });
      return;
    }

    setTranslatingMsgId(msgId);
    try {
      const prompt = `Translate the following text accurately into Vietnamese (or if it is already Vietnamese, translate to English). Only return the translated text without extra explanation:\n"${content}"`;
      const response = await callAiApi('/api/ai/chat', { message: prompt });
      const data = await response.json();
      if (data.success && data.text) {
        setTranslatedMessages(prev => ({ ...prev, [msgId]: data.text }));
      }
    } catch (err) {
      console.error('Error translating message:', err);
    } finally {
      setTranslatingMsgId(null);
    }
  };

  // ── Copy Message Handler ──
  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      triggerToast?.('success', 'Đã sao chép 📋', 'Nội dung tin nhắn đã được vào clipboard.');
    } catch {
      triggerToast?.('error', 'Không sao chép được', 'Trình duyệt đã chặn truy cập clipboard.');
    }
  };

  // ── Poll Creation & Voting Handlers ──
  const handleCreatePollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion.trim()) return;
    const validOptions = pollOptions.filter(o => o.trim().length > 0);
    if (validOptions.length < 2) {
      triggerToast?.('info', 'Poll Requirement', 'Please provide at least 2 options for the poll.');
      return;
    }

    const pollAttachment = {
      isPoll: true,
      question: pollQuestion.trim(),
      options: validOptions.map((optText, i) => ({
        id: `opt-${i}-${Date.now()}`,
        text: optText.trim(),
        votes: [] as string[]
      }))
    };

    const msgId = `msg-poll-${Date.now()}`;
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const pollMsg: ChatMessage = {
      id: msgId,
      senderId: currentUser.id || 'user',
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      content: `📊 **Thăm dò ý kiến:** ${pollQuestion.trim()}`,
      timestamp: timeStr,
      attachment: pollAttachment as any
    };

    try {
      await persistStructuredMessage(pollMsg);
      setMessages(prev => prev.some(message => message.id === pollMsg.id) ? prev : [...prev, pollMsg]);
      setShowPollModal(false);
      setPollQuestion('');
      setPollOptions(['Option 1', 'Option 2']);
      scrollToBottom();
      triggerToast?.('success', 'Đã tạo thăm dò 📊', 'Mọi người trong kênh có thể bỏ phiếu.');
    } catch (error) {
      console.error('Unable to create poll:', error);
      triggerToast?.('error', 'Không tạo được thăm dò', 'Vui lòng thử lại.');
    }
  };

  const handleVotePoll = async (msgId: string, optionId: string) => {
    const { data, error } = await supabase.rpc('vote_chat_poll', { p_message_id: msgId, p_option_id: optionId });
    if (error) {
      triggerToast?.('error', 'Không ghi nhận được phiếu', error.message);
      return;
    }
    setMessages(prev => prev.map(message => message.id === msgId ? { ...message, attachment: data } : message));
    (window as any).playSystemSound?.('click');
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchDefault = localStorage.getItem('apexa_ai_search_grounding') === 'true';
      setSearchWeb(searchDefault);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!lightboxImage) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxImage(null);
        setLightboxZoom(1);
        setLightboxRotation(0);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxImage]);

  const handleToggleSpeech = (msgId: string, text: string) => {
    if (typeof window === 'undefined') return;

    if (playingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setPlayingMsgId(null);
    } else {
      window.speechSynthesis.cancel();
      
      const cleanText = text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/###/g, '')
        .replace(/##/g, '')
        .replace(/#/g, '');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'vi-VN';
      utterance.onend = () => setPlayingMsgId(null);
      utterance.onerror = () => setPlayingMsgId(null);

      utteranceRef.current = utterance;
      setPlayingMsgId(msgId);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Refs
  const messageEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const resolveChannelLocation = (chanId: string) => {
    if (chanId.includes(':folder-')) {
      const prefixIndex = chanId.indexOf(':folder-');
      const infoStr = chanId.substring(prefixIndex + 8);
      const space = spaces.find(s => infoStr.startsWith(s.id));
      if (space) {
        const localChanId = 'folder-' + infoStr.substring(space.id.length + 1);
        return { spaceId: space.id, localChanId, isWorkspaceLevel: false };
      }
    } else if (chanId.includes(':list-')) {
      const prefixIndex = chanId.indexOf(':list-');
      const infoStr = chanId.substring(prefixIndex + 6);
      const space = spaces.find(s => infoStr.startsWith(s.id));
      if (space) {
        const localChanId = 'list-' + infoStr.substring(space.id.length + 1);
        return { spaceId: space.id, localChanId, isWorkspaceLevel: false };
      }
    } else if (chanId.includes(':space-')) {
      const prefixIndex = chanId.indexOf(':space-');
      const infoStr = chanId.substring(prefixIndex + 7);
      const space = spaces.find(s => infoStr.startsWith(s.id));
      if (space) {
        const localChanId = infoStr.substring(space.id.length + 1);
        return { spaceId: space.id, localChanId, isWorkspaceLevel: false };
      }
    } else {
      const localChanId = chanId.split(':').pop() || '';
      const generalSpace = spaces.find(s => s.id.endsWith('-general')) || spaces[0];
      if (generalSpace && localChanId.startsWith('workspace-')) {
        return { spaceId: generalSpace.id, localChanId, isWorkspaceLevel: true };
      }
    }
    return null;
  };

  const ensureDefaultChannels = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const defaults = [
        { id: `${workspaceId}:general`, workspace_id: workspaceId, name: 'general', description: 'Kênh thảo luận chung cho tất cả thành viên.', channel_type: 'public', created_by: session.user.id }
      ];
      const { error } = await supabase.from('chat_channels').upsert(defaults, { onConflict: 'id', ignoreDuplicates: true });
      if (error) {
        console.warn('[ChatRoom] Note on ensuring default channels:', error.message || error);
      }
      // Purge any legacy brain-ai channels
      await supabase.from('chat_channels').delete().in('name', ['avaxa-brain-ai', 'apexa-brain-ai']).eq('workspace_id', workspaceId);
    } catch (err) {
      console.warn('[ChatRoom] Exception in ensureDefaultChannels:', err);
    }
  }, [workspaceId]);

  // Initialize channels from the durable workspace chat directory.
  useEffect(() => {
    let active = true;
    const defaultChannels: ChatChannel[] = [
      { id: `${workspaceId}:general`, workspaceId, name: 'general', description: 'Kênh thảo luận chung cho tất cả thành viên.', type: 'public' }
    ];

    const loadChannels = async () => {
      if (isOffline) {
        if (active) {
          setChannels(defaultChannels);
          setActiveChannelId(previous => previous || `${workspaceId}:general`);
        }
        return;
      }

      try {
        await ensureDefaultChannels();
        const { data, error } = await supabase
          .from('chat_channels')
          .select('id, workspace_id, name, description, channel_type, dm_key')
          .eq('workspace_id', workspaceId)
          .eq('is_archived', false)
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (!active) return;

        const loaded: ChatChannel[] = (data && data.length > 0)
          ? data
              .filter((channel: any) => channel.name !== 'avaxa-brain-ai' && channel.name !== 'apexa-brain-ai' && !channel.id.includes('brain-ai'))
              .map((channel: any) => ({
                id: channel.id,
                workspaceId: channel.workspace_id,
                name: channel.name,
                description: channel.description || '',
                type: channel.channel_type,
                dmKey: channel.dm_key || undefined
              }))
          : defaultChannels;

        // Ensure default channels exist in loaded array if missing
        const finalChannels = [...loaded];
        for (const def of defaultChannels) {
          if (!finalChannels.some(c => c.id === def.id)) {
            finalChannels.unshift(def);
          }
        }

        setChannels(finalChannels);
        setActiveChannelId(previous => {
          const requested = initialSelectedChannelId && finalChannels.some(c => c.id === initialSelectedChannelId)
            ? initialSelectedChannelId
            : previous;
          return requested && finalChannels.some(c => c.id === requested) ? requested : `${workspaceId}:general`;
        });
      } catch (error: any) {
        console.warn('[ChatRoom] Unable to load remote chat channels, falling back to defaults:', error?.message || error);
        if (!active) return;
        setChannels(defaultChannels);
        setActiveChannelId(previous => previous || `${workspaceId}:general`);
      }
    };
    loadChannels();
    return () => { active = false; };
  }, [workspaceId, initialSelectedChannelId, isOffline, ensureDefaultChannels]);

  // Handle cross-navigation to channel / DM from other views (e.g. TeamDirectory, MemberProfileModal)
  useEffect(() => {
    if (!initialSelectedChannelId) return;

    // Check if channel already exists in channels state
    const existing = channels.find(c => c.id === initialSelectedChannelId);
    if (existing) {
      setActiveChannelId(initialSelectedChannelId);
      setIsMobileChatActive(true);
      onClearInitialSelectedChannelId?.();
      return;
    }

    // If it's a DM channel, resolve or create the channel entry dynamically
    if (initialSelectedChannelId.includes(':dm-')) {
      const dmPart = initialSelectedChannelId.substring(initialSelectedChannelId.indexOf(':dm-') + 4);
      const targetMember = members.find(m => {
        if (m.id === currentUser?.id || m.id === 'user') return false;
        const cleanId = m.id.replace(/^user-/, '');
        return dmPart.includes(m.id) || (cleanId !== '' && dmPart.includes(cleanId));
      });
      const newDmChan: ChatChannel = {
        id: initialSelectedChannelId,
        workspaceId,
        name: targetMember?.name || 'Tin nhắn trực tiếp',
        description: `Tin nhắn trực tiếp với ${targetMember?.name || 'thành viên'}`,
        type: 'dm'
      };
      setChannels(prev => prev.some(c => c.id === initialSelectedChannelId) ? prev : [...prev, newDmChan]);
      setActiveChannelId(initialSelectedChannelId);
      setIsMobileChatActive(true);
      onClearInitialSelectedChannelId?.();
    }
  }, [initialSelectedChannelId, channels, members, currentUser?.id, workspaceId, onClearInitialSelectedChannelId]);

  // Channel Actions
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const cleanedName = newChannelName.trim().toLowerCase().replace(/\s+/g, '-');
    
    const channelId = `${workspaceId}:channel-${crypto.randomUUID()}`;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      triggerToast?.('error', 'Chưa đăng nhập', 'Bạn cần đăng nhập để tạo kênh.');
      return;
    }
    const newChannel: ChatChannel = {
      id: channelId,
      workspaceId,
      name: cleanedName,
      description: newChannelDesc.trim() || 'Custom chat channel',
      type: newChannelType
    };
    const { error } = await supabase.from('chat_channels').insert({
      id: channelId,
      workspace_id: workspaceId,
      name: cleanedName,
      description: newChannel.description,
      channel_type: newChannelType,
      created_by: session.user.id
    });
    if (error) {
      triggerToast?.('error', 'Không thể tạo kênh', error.code === '23505' ? 'Tên kênh đã tồn tại.' : error.message);
      return;
    }
    await supabase.from('chat_channel_members').upsert({ channel_id: channelId, user_id: session.user.id, role: 'owner' });
    setChannels(prev => [...prev, newChannel]);
    setActiveChannelId(channelId);
    setNewChannelName('');
    setNewChannelDesc('');
    setNewChannelType('public');
    setShowCreateChannelModal(false);
    onAddSyncLog(`Created chat channel: #${cleanedName}`);
    triggerToast?.('success', 'Channel Created 📣', `Channel #${cleanedName} has been successfully created.`);
  };

  const handleDeleteChannel = async (chanId: string, name: string) => {
    const { error } = await supabase.from('chat_channels').delete().eq('id', chanId);
    if (error) {
      triggerToast?.('error', 'Không thể xóa kênh', error.message);
      return;
    }
    setChannels(prev => prev.filter(channel => channel.id !== chanId));
    if (activeChannelId === chanId) {
      setActiveChannelId(`${workspaceId}:general`);
    }

    onAddSyncLog(`Deleted chat channel: #${name}`);
    triggerToast?.('info', 'Channel Deleted 🗑️', `Channel #${name} has been removed.`);
  };

  const handleRenameChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingChannelId || !renameChannelName.trim()) return;

    const cleanedName = renameChannelName.trim().toLowerCase().replace(/\s+/g, '-');
    const { error } = await supabase.from('chat_channels').update({
      name: cleanedName,
      description: renameChannelDesc.trim(),
      updated_at: new Date().toISOString()
    }).eq('id', renamingChannelId);
    if (error) {
      triggerToast?.('error', 'Không thể đổi tên kênh', error.code === '23505' ? 'Tên kênh đã tồn tại.' : error.message);
      return;
    }
    setChannels(prev => prev.map(channel => channel.id === renamingChannelId
      ? { ...channel, name: cleanedName, description: renameChannelDesc.trim() }
      : channel));

    onAddSyncLog(`Renamed chat channel to: #${cleanedName}`);
    triggerToast?.('success', 'Channel Renamed 📣', `Channel has been successfully renamed to #${cleanedName}.`);
    
    setRenamingChannelId(null);
    setRenameChannelName('');
    setRenameChannelDesc('');
    setShowRenameModal(false);
  };

  const handleTogglePinMessage = async (msgId: string, currentPinned: boolean) => {
    if (!isOffline) {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_pinned: !currentPinned })
        .eq('id', msgId);
      if (error) {
        triggerToast?.('error', 'Không thể cập nhật ghim', error.message);
        return;
      }
    }
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isPinned: !currentPinned } : m));

    if (currentPinned) {
      triggerToast?.('info', 'Message Unpinned 📌', 'This message has been unpinned.');
    } else {
      triggerToast?.('success', 'Message Pinned 📌', 'This message is pinned to the header board.');
    }
  };

  const handleScrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-amber-50');
      setTimeout(() => {
        el.classList.remove('bg-amber-50');
      }, 1500);
    } else {
      triggerToast?.('info', 'Scroll to Message 🧭', 'Message could not be located in current scroll bounds.');
    }
  };

  const handleOpenThread = (msg: ChatMessage) => {
    setShowMemberDrawer(false);
    setActiveThreadMessage(msg);
  };

  const handleSendThreadReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!threadInputVal.trim() || !activeThreadMessage) return;

    const userReplyText = threadInputVal.trim();
    setThreadInputVal('');

    const msgId = `reply-${Date.now()}`;
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const newReply: ChatMessage = {
      id: msgId,
      senderId: currentUser.id || 'user',
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      content: userReplyText,
      timestamp: timeStr,
      parentId: activeThreadMessage.id
    };

    setMessages(prev => [...prev, newReply]);

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        await supabase.from('chat_messages').insert({
          id: msgId,
          sender_id: currentUser.id || 'user',
          sender_name: currentUser.name,
          sender_avatar: currentUser.avatar,
          content: userReplyText,
          timestamp: timeStr,
          channel_id: activeChannelId,
          is_ai_response: false,
          workspace_id: workspaceId,
          user_id: userId || null,
          parent_id: activeThreadMessage.id
        });
      } catch (err) {
        console.error('Error sending thread reply:', err);
      }
    }
  };

  // Load default simulated/mock messages when channel changes
  useEffect(() => {
    if (!activeChannelId) return;
    let cancelled = false;
    let subscription: any = null;
    const typingRemovalTimers = typingRemovalTimersRef.current;
    setTypingUsers([]);

    const seedMessages: Record<string, ChatMessage[]> = {
      'apexa-brain-ai': [
        { id: 'mai1', senderId: 'ai-brain', senderName: 'Apexa Brain AI', senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ApexaBrain', content: 'Xin chào! Tôi là trợ lý Apexa Brain của workspace hiện tại. Tại kênh truyền này, bạn có thể hỏi tôi bất kỳ điều gì: từ cách lập kế hoạch dự án, phân chia KPI, soạn thảo tài liệu, cho đến viết mã tối ưu. Hãy thử gửi tin nhắn ngay nhé! 💡', timestamp: '09:00', isAi: true }
      ]
    };

    const loadMessages = async () => {
      const isSpace = activeChannelId.includes(':space-') || activeChannelId.includes(':folder-') || activeChannelId.includes(':list-');
      const isDm = activeChannelId.includes(':dm-');

      let spaceId = '';
      let entityId = '';
      let entityName = 'general';
      let entityType: 'space' | 'folder' | 'list' = 'space';

      if (isSpace) {
        if (activeChannelId.includes(':folder-')) {
          entityType = 'folder';
          const prefixIndex = activeChannelId.indexOf(':folder-');
          const infoStr = activeChannelId.substring(prefixIndex + 8);
          const space = spaces.find(s => infoStr.startsWith(s.id));
          if (space) {
            spaceId = space.id;
            entityId = infoStr.substring(space.id.length + 1);
            entityName = space.folders?.find(f => f.id === entityId)?.name || 'Folder';
          }
        } else if (activeChannelId.includes(':list-')) {
          entityType = 'list';
          const prefixIndex = activeChannelId.indexOf(':list-');
          const infoStr = activeChannelId.substring(prefixIndex + 6);
          const space = spaces.find(s => infoStr.startsWith(s.id));
          if (space) {
            spaceId = space.id;
            entityId = infoStr.substring(space.id.length + 1);
            entityName = space.lists?.find(l => l.id === entityId)?.name || 'List';
          }
        } else if (activeChannelId.includes(':space-')) {
          entityType = 'space';
          const prefixIndex = activeChannelId.indexOf(':space-');
          const infoStr = activeChannelId.substring(prefixIndex + 7);
          const space = spaces.find(s => infoStr.startsWith(s.id));
          if (space) {
            spaceId = space.id;
            entityId = infoStr.substring(space.id.length + 1);
            entityName = space.channels?.find(c => c.id === entityId)?.name || 'general';
          }
        }
      }

      if (isOffline) {
        const cachedMessages = messageCacheRef.current.get(activeChannelId);
        if (cachedMessages?.length) {
          setMessages(cachedMessages);
          scrollToBottom('auto');
          return;
        }
        if (isDm) {
          const memberId = activeChannelId.split('-').pop();
          const member = (membersRef.current || []).find(m => m.id === memberId);
          setMessages([
            { id: 'm1', senderId: 'system', senderName: 'System', senderAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=S', content: `Đây là bắt đầu cuộc trò chuyện trực tiếp của bạn với ${member ? member.name : 'thành viên này'}.`, timestamp: 'Vừa xong' }
          ]);
        } else if (isSpace) {
          setMessages([
            { id: 'm1', senderId: 'system', senderName: 'System', senderAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=S', content: `Đây là bắt đầu kênh thảo luận #${entityName}.`, timestamp: 'Vừa xong' }
          ]);
        } else {
          const channelKey = activeChannelId.split(':').pop() || 'general';
          setMessages(seedMessages[channelKey] || [
            { id: 'm1', senderId: 'system', senderName: 'System', senderAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=S', content: `Đây là bắt đầu kênh thảo luận #${channelKey}.`, timestamp: 'Vừa xong' }
          ]);
        }
        scrollToBottom('auto');
        return;
      }

      try {
        const cachedMessages = messageCacheRef.current.get(activeChannelId);
        setMessages(cachedMessages || []);
        setIsLoadingMessages(!cachedMessages);
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('channel_id', activeChannelId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        if (cancelled || activeChannelIdRef.current !== activeChannelId) return;
        const loadedMessages = (data || []).reverse().map(mapChatMessage);
        const pendingMessages = Array.from(pendingMessagesRef.current.values())
          .map(item => item.message)
          .filter(message => message.channelId === activeChannelId && !loadedMessages.some(remote => remote.id === message.id));
        const mergedMessages = [...loadedMessages, ...pendingMessages];
        messageCacheRef.current.set(activeChannelId, mergedMessages);
        setMessages(mergedMessages);
      } catch (err) {
        console.error('Error loading messages from Supabase:', err);
      } finally {
        if (!cancelled && activeChannelIdRef.current === activeChannelId) setIsLoadingMessages(false);
      }
      if (!cancelled && activeChannelIdRef.current === activeChannelId) scrollToBottom('auto');
    };

    loadMessages();

    // Set up Supabase Realtime channel subscription
    if (!isOffline) {
      subscription = getCleanChannel(`realtime-chat-${activeChannelId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_messages',
            filter: `channel_id=eq.${activeChannelId}`
          },
          (payload) => {
            const eventType = payload.eventType;
            const m = (payload.new || payload.old) as any;
            if (!m || m.channel_id !== activeChannelId) return;

            if (eventType === 'INSERT') {
              const newMsg = mapChatMessage(m);
              const shouldFollowMessage = isNearBottomRef.current || newMsg.senderId === currentUser.id;
              setMessages(prev => {
                const next = prev.some(x => x.id === newMsg.id)
                  ? prev.map(x => x.id === newMsg.id ? { ...newMsg, deliveryState: 'sent' as const } : x)
                  : [...prev, newMsg];
                messageCacheRef.current.set(activeChannelId, next);
                return next;
              });
              pendingMessagesRef.current.delete(newMsg.id);
              if (shouldFollowMessage) scrollToBottom();
              else setNewMessagesBelow(count => count + 1);
            } else if (eventType === 'UPDATE') {
              setMessages(prev => {
                const next = prev.map(x => x.id === m.id ? mapChatMessage(m) : x);
                messageCacheRef.current.set(activeChannelId, next);
                return next;
              });
            } else if (eventType === 'DELETE') {
              setMessages(prev => {
                const next = prev.filter(x => x.id !== m.id);
                messageCacheRef.current.set(activeChannelId, next);
                return next;
              });
            }
          }
        )
        .on(
          'broadcast',
          { event: 'typing' },
          (payload) => {
            const { userId, name, isTyping = true } = payload.payload || {};
            if (userId === currentUser.id) return;

            const existingTimer = typingRemovalTimers.get(userId);
            if (existingTimer) clearTimeout(existingTimer);
            if (!isTyping) {
              typingRemovalTimers.delete(userId);
              setTypingUsers(prev => prev.filter(n => n !== name));
              return;
            }

            setTypingUsers(prev => {
              if (prev.includes(name)) return prev;
              return [...prev, name];
            });

            const timer = setTimeout(() => {
              setTypingUsers(prev => prev.filter(n => n !== name));
              typingRemovalTimers.delete(userId);
            }, 3000);
            typingRemovalTimers.set(userId, timer);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Re-sync latest messages to catch up on any messages missed during reconnect
            supabase
              .from('chat_messages')
              .select('*')
              .eq('channel_id', activeChannelId)
              .order('created_at', { ascending: false })
              .limit(30)
              .then(({ data: recentRows, error: catchupErr }) => {
                if (!catchupErr && recentRows && recentRows.length > 0) {
                  const recentMsgs = recentRows.reverse().map(mapChatMessage);
                  setMessages(prev => {
                    const existingIds = new Set(prev.map(msg => msg.id));
                    const missing = recentMsgs.filter(msg => !existingIds.has(msg.id));
                    if (missing.length === 0) return prev;
                    const merged = [...prev, ...missing].sort((a, b) => new Date(a.createdAt || a.timestamp).getTime() - new Date(b.createdAt || b.timestamp).getTime());
                    messageCacheRef.current.set(activeChannelId, merged);
                    return merged;
                  });
                }
              });
          }
        });
      
      channelSubscriptionRef.current = subscription;
    }

    return () => {
      cancelled = true;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      lastTypingBroadcastRef.current = 0;
      typingRemovalTimers.forEach(timer => clearTimeout(timer));
      typingRemovalTimers.clear();
      if (subscription) {
        supabase.removeChannel(subscription);
      }
      if (channelSubscriptionRef.current === subscription) {
        channelSubscriptionRef.current = null;
      }
    };
  }, [activeChannelId, isOffline, currentUser.id, currentUser.name, workspaceId]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    isNearBottomRef.current = true;
    setNewMessagesBelow(0);
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior
        });
      }
    }, 100);
  };

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceFromBottom < 120;
    isNearBottomRef.current = isNearBottom;
    if (isNearBottom && newMessagesBelow > 0) {
      setNewMessagesBelow(0);
      if (activeChannelId) markChannelAsRead(activeChannelId);
    }
  };

  const insertFormatting = (type: 'bold' | 'italic' | 'code' | 'quote') => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const val = inputVal;
    const selectedText = val.substring(start, end);

    let replacement = '';
    if (type === 'bold') {
      replacement = `**${selectedText || 'chữ_đậm'}**`;
    } else if (type === 'italic') {
      replacement = `*${selectedText || 'chữ_nghiêng'}*`;
    } else if (type === 'code') {
      replacement = `\`${selectedText || 'mã_code'}\``;
    } else if (type === 'quote') {
      replacement = `\n> ${selectedText || 'trích_dẫn'}\n`;
    }

    const newVal = val.substring(0, start) + replacement + val.substring(end);
    setInputVal(newVal);

    // Refocus input
    setTimeout(() => {
      input.focus();
      const newPos = start + replacement.length;
      input.setSelectionRange(newPos, newPos);
    }, 50);
  };

  // @Mention handler
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputVal(val);

    // Persist per-channel draft
    if (activeChannelId) {
      if (val.trim()) chatDraftsRef.current[activeChannelId] = val;
      else delete chatDraftsRef.current[activeChannelId];
      persistChatDrafts();
    }

    const cursorPos = e.target.selectionStart || val.length;
    const textBeforeCursor = val.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (atMatch) {
      setShowMentionDropdown(true);
      setMentionQuery(atMatch[1]);
      setMentionCursorPos(cursorPos);
    } else {
      setShowMentionDropdown(false);
      setMentionQuery('');
    }

    const isSlash = val.startsWith('/');
    if (isSlash) {
      setShowCommandDropdown(true);
      const typedCmd = val.split(' ')[0].toLowerCase();
      setCommandQuery(typedCmd);
      setActiveCommandIndex(0);
    } else {
      setShowCommandDropdown(false);
      setCommandQuery('');
    }

    // Broadcast typing indicator
    broadcastTyping();
  };

  const handleSelectMention = (member: User) => {
    const textBefore = inputVal.substring(0, mentionCursorPos);
    const atIdx = textBefore.lastIndexOf('@');
    const before = inputVal.substring(0, atIdx);
    const after = inputVal.substring(mentionCursorPos);
    const newVal = `${before}@${member.name} ${after}`;
    setInputVal(newVal);
    setShowMentionDropdown(false);
    setMentionQuery('');
    inputRef.current?.focus();
  };

  const filteredMentionMembers = members.filter(m => 
    m.name.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 5);

  // Typing indicator broadcast (throttled: tối đa 1 broadcast / 2 giây)
  const sendTypingState = (isTyping: boolean) => {
    if (isOffline || !channelSubscriptionRef.current) return;
    channelSubscriptionRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUser.id, name: currentUser.name, isTyping }
    });
  };

  const broadcastTyping = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (!isOffline && channelSubscriptionRef.current) {
      const now = Date.now();
      if (now - lastTypingBroadcastRef.current > 2000) {
        lastTypingBroadcastRef.current = now;
        sendTypingState(true);
      }
    }

    typingTimeoutRef.current = setTimeout(() => {
      lastTypingBroadcastRef.current = 0;
      sendTypingState(false);
    }, 3000);
  };

  // Unread count helpers
  const markChannelAsRead = useCallback((channelId: string) => {
    const readAt = new Date().toISOString();
    setUnreadCounts(prev => ({ ...prev, [channelId]: 0 }));
    setLastReadTimestamps(prev => ({ ...prev, [channelId]: readAt }));
    if (!isOffline) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user?.id) return;
        supabase.from('chat_read_states').upsert({
          channel_id: channelId,
          user_id: session.user.id,
          last_read_at: readAt
        }, { onConflict: 'channel_id,user_id' }).then(({ error }) => {
          if (error && error.code !== 'PGRST116') {
            console.warn('Chat read state was not persisted:', error.message || error.code || 'unknown error');
          }
        });
      });
    }
  }, [isOffline]);

  const openDirectMessage = async (member: User) => {
    const peerUserId = resolveMemberAuthId(member);
    let sessionUserId: string | null = null;
    
    if (!isOffline && peerUserId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        sessionUserId = session?.user?.id || null;
      } catch {}
    }

    if (sessionUserId && peerUserId && !isOffline) {
      const dmKey = [sessionUserId, peerUserId].sort().join(':');
      const existing = channels.find(channel => channel.type === 'dm' && channel.dmKey === dmKey);
      if (existing) {
        setActiveChannelId(existing.id);
        setShowNewDmModal(false);
        setDmSearchQuery('');
        setIsMobileChatActive(true);
        return;
      }

      const channelId = `${workspaceId}:dm-${crypto.randomUUID()}`;
      const { error } = await supabase.from('chat_channels').insert({
        id: channelId,
        workspace_id: workspaceId,
        name: member.name,
        description: `Tin nhắn trực tiếp với ${member.name}`,
        channel_type: 'dm',
        dm_key: dmKey,
        created_by: sessionUserId
      });

      const resolvedId = error?.code === '23505'
        ? (await supabase.from('chat_channels').select('id').eq('workspace_id', workspaceId).eq('dm_key', dmKey).single()).data?.id || channelId
        : channelId;

      if (resolvedId) {
        await supabase.from('chat_channel_members').upsert([
          { channel_id: resolvedId, user_id: sessionUserId, role: 'owner' },
          { channel_id: resolvedId, user_id: peerUserId, role: 'member' }
        ], { onConflict: 'channel_id,user_id' });

        const channel: ChatChannel = { id: resolvedId, workspaceId, name: member.name, description: `Tin nhắn trực tiếp với ${member.name}`, type: 'dm', dmKey };
        setChannels(prev => prev.some(item => item.id === resolvedId) ? prev : [...prev, channel]);
        setActiveChannelId(resolvedId);
        setShowNewDmModal(false);
        setDmSearchQuery('');
        setIsMobileChatActive(true);
        triggerToast?.('info', 'Trò chuyện trực tiếp 💬', `Đã mở khung chat với ${member.name}`);
        return;
      }
    }

    // Fallback for offline / local demo / non-UUID member:
    const myId = currentUser?.id || 'user';
    const sorted = [myId, member.id].sort();
    const localDmId = `${workspaceId}:dm-${sorted[0]}-${sorted[1]}`;
    const existingLocal = channels.find(channel => channel.id === localDmId);
    if (existingLocal) {
      setActiveChannelId(existingLocal.id);
    } else {
      const channel: ChatChannel = {
        id: localDmId,
        workspaceId,
        name: member.name,
        description: `Tin nhắn trực tiếp với ${member.name}`,
        type: 'dm'
      };
      setChannels(prev => prev.some(c => c.id === localDmId) ? prev : [...prev, channel]);
      setActiveChannelId(localDmId);
    }
    setShowNewDmModal(false);
    setDmSearchQuery('');
    setIsMobileChatActive(true);
    triggerToast?.('info', 'Trò chuyện trực tiếp 💬', `Đã mở khung chat với ${member.name}`);
  };

  const handleCreateGroupChat = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!groupName.trim() || selectedGroupMemberIds.length < 2 || isCreatingGroup) return;
    setIsCreatingGroup(true);
    const cleanName = groupName.trim().slice(0, 60);
    const channelId = `${workspaceId}:group-${crypto.randomUUID()}`;
    const memberCount = selectedGroupMemberIds.length + 1;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentAuthId = session?.user?.id;

      if (currentAuthId && !isOffline) {
        const { error: channelError } = await supabase.from('chat_channels').insert({
          id: channelId,
          workspace_id: workspaceId,
          name: cleanName,
          description: `${memberCount} thành viên`,
          channel_type: 'group',
          created_by: currentAuthId
        });
        if (!channelError) {
          const validUuids = selectedGroupMemberIds.filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));
          const memberRows = [
            { channel_id: channelId, user_id: currentAuthId, role: 'owner' },
            ...validUuids.map(userId => ({ channel_id: channelId, user_id: userId, role: 'member' }))
          ];
          await supabase.from('chat_channel_members').insert(memberRows);
        }
      }

      const groupChannel: ChatChannel = {
        id: channelId,
        workspaceId,
        name: cleanName,
        description: `${memberCount} thành viên`,
        type: 'group'
      };
      setChannels(prev => [...prev, groupChannel]);
      setActiveChannelId(channelId);
      setIsMobileChatActive(true);
      setShowCreateGroupModal(false);
      setGroupName('');
      setGroupSearchQuery('');
      setSelectedGroupMemberIds([]);
      triggerToast?.('success', 'Đã tạo nhóm chat 👥', `${cleanName} có ${memberCount} thành viên.`);
    } catch (error) {
      console.error('Unable to create group chat:', error);
      const groupChannel: ChatChannel = {
        id: channelId,
        workspaceId,
        name: cleanName,
        description: `${memberCount} thành viên`,
        type: 'group'
      };
      setChannels(prev => [...prev, groupChannel]);
      setActiveChannelId(channelId);
      setIsMobileChatActive(true);
      setShowCreateGroupModal(false);
      setGroupName('');
      setGroupSearchQuery('');
      setSelectedGroupMemberIds([]);
      triggerToast?.('success', 'Đã tạo nhóm chat 👥', `${cleanName} có ${memberCount} thành viên.`);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Track unread when messages arrive on non-active channels
  const incrementUnread = (channelId: string) => {
    if (channelId !== activeChannelIdRef.current) {
      setUnreadCounts(prev => ({ ...prev, [channelId]: (prev[channelId] || 0) + 1 }));
    }
  };

  // Keep one workspace-level inbox subscription so inactive channels receive live unread badges.
  useEffect(() => {
    if (isOffline || !workspaceId) return;
    const inboxSubscription = getCleanChannel(`realtime-chat-inbox-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `workspace_id=eq.${workspaceId}`
        },
        payload => {
          const row = payload.new as any;
          if (!row?.channel_id || row.channel_id === activeChannelIdRef.current) return;
          const ownIds = [currentUser.id, currentUser.userId].filter(Boolean);
          if (ownIds.includes(row.sender_id) || ownIds.includes(row.user_id)) return;

          incrementUnread(row.channel_id);
          if (chatSettingsRef.current.soundEnabled) (window as any).playSystemSound?.('notification');

          if (
            chatSettingsRef.current.desktopNotifications &&
            document.visibilityState !== 'visible' &&
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            const channelName = channels.find(channel => channel.id === row.channel_id)?.name;
            new Notification(row.sender_name || 'Tin nhắn mới', {
              body: `${channelName ? `#${channelName}: ` : ''}${row.content || 'Đã gửi một tệp đính kèm'}`,
              tag: `apexa-chat-${row.channel_id}`,
              icon: row.sender_avatar || undefined
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(inboxSubscription); };
  }, [channels, currentUser.id, currentUser.userId, isOffline, workspaceId]);

  // Realtime subscription for workspace chat channels (add, rename, delete, new DM channels)
  useEffect(() => {
    if (isOffline || !workspaceId) return;
    const channelsSub = getCleanChannel(`realtime-chat-channels-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_channels',
          filter: `workspace_id=eq.${workspaceId}`
        },
        payload => {
          const eventType = payload.eventType;
          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const c = payload.new as any;
            if (!c || !c.id) return;
            const mappedChan: ChatChannel = {
              id: c.id,
              name: c.name,
              description: c.description || '',
              type: (c.type || (c.is_private ? 'private' : 'public')) as 'public' | 'private' | 'dm' | 'group',
              unreadCount: 0,
              workspaceId: c.workspace_id || workspaceId,
              dmKey: c.dm_key || undefined,
            };
            setChannels(prev => {
              const exists = prev.some(ch => ch.id === mappedChan.id);
              if (exists) {
                return prev.map(ch => ch.id === mappedChan.id ? { ...ch, ...mappedChan, unreadCount: ch.unreadCount } : ch);
              }
              return [...prev, mappedChan];
            });
          } else if (eventType === 'DELETE') {
            const oldId = payload.old?.id;
            if (!oldId) return;
            setChannels(prev => {
              const next = prev.filter(ch => ch.id !== oldId);
              if (activeChannelIdRef.current === oldId) {
                const fallback = next[0]?.id || 'general';
                setActiveChannelId(fallback);
              }
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channelsSub); };
  }, [isOffline, workspaceId]);

  // Sync read states across tabs/devices in realtime
  useEffect(() => {
    const authId = currentUser?.userId || currentUser?.id;
    if (isOffline || !authId) return;
    const readStateSub = getCleanChannel(`realtime-chat-reads-${authId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_read_states',
          filter: `user_id=eq.${authId}`
        },
        payload => {
          const row = payload.new as any;
          if (!row?.channel_id || !row?.last_read_at) return;
          setUnreadCounts(prev => ({ ...prev, [row.channel_id]: 0 }));
          setLastReadTimestamps(prev => ({ ...prev, [row.channel_id]: row.last_read_at }));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(readStateSub); };
  }, [currentUser?.id, currentUser?.userId, isOffline]);

  // Mark current channel as read when switching
  useEffect(() => {
    if (activeChannelId) {
      markChannelAsRead(activeChannelId);
      setShowHeaderMenu(false);
      setActiveChannelMenuId(null);
    }
  }, [activeChannelId, markChannelAsRead]);

  useEffect(() => {
    if (isOffline || channels.length === 0) return;
    let active = true;
    const loadUnreadCounts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const { data: readStates } = await supabase
        .from('chat_read_states')
        .select('channel_id,last_read_at')
        .eq('user_id', session.user.id);
      const reads = Object.fromEntries((readStates || []).map((row: any) => [row.channel_id, row.last_read_at]));
      const nextCounts: Record<string, number> = {};
      await Promise.all(channels.map(async channel => {
        let query = supabase.from('chat_messages').select('id', { count: 'exact', head: true }).eq('channel_id', channel.id);
        if (reads[channel.id]) query = query.gt('created_at', reads[channel.id]);
        const { count } = await query;
        nextCounts[channel.id] = channel.id === activeChannelId ? 0 : (count || 0);
      }));
      if (active) {
        setLastReadTimestamps(reads);
        setUnreadCounts(nextCounts);
      }
    };
    loadUnreadCounts();
    return () => { active = false; };
  }, [channels, isOffline, activeChannelId]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (activeChannelId) {
      setIsMobileChatActive(true);
    }
  }, [activeChannelId]);

  // Forward message handler
  const handleForwardMessage = async (targetChannelId: string) => {
    if (!forwardingMessage) return;
    
    const msgId = `fwd-${Date.now()}`;
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const fwdContent = `↪️ *Forwarded from ${forwardingMessage.senderName}:*\n${forwardingMessage.content}`;

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        await supabase.from('chat_messages').insert({
          id: msgId,
          sender_id: 'user',
          sender_name: currentUser.name,
          sender_avatar: currentUser.avatar,
          content: fwdContent,
          timestamp: timeStr,
          channel_id: targetChannelId,
          is_ai_response: false,
          workspace_id: workspaceId,
          user_id: userId || null,
        });
      } catch (err) {
        console.error('Error forwarding message:', err);
      }
    }

    triggerToast?.('success', 'Message Forwarded ↪️', 'Message has been forwarded successfully.');
    setForwardingMessage(null);
  };

  // Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        triggerToast?.('error', 'File quá lớn', 'Giới hạn file đính kèm là 25 MB.');
        return;
      }
      const isImg = file.type.startsWith('image/');
      if (isImg) {
        setSelectedFile({
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
          file
        });
      } else {
        setSelectedFile({
          name: file.name,
          size: file.size,
          type: file.type,
          file
        });
      }
      triggerToast?.('success', 'File Dropped 📎', `Ready to send: ${file.name}`);
    }
  };

  // Date separator utility
  const getDateLabel = (dateStr: string): string => {
    const today = new Date();
    const msgDate = new Date(dateStr);
    
    if (isNaN(msgDate.getTime())) return '';

    const todayStr = today.toDateString();
    const msgDateStr = msgDate.toDateString();
    
    if (todayStr === msgDateStr) return 'Hôm nay';
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (yesterday.toDateString() === msgDateStr) return 'Hôm qua';
    
    return msgDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      const startTime = Date.now();

      mediaRecorder.onstop = () => {
        const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const voiceAttachment = {
          name: `Voice Memo (${durationSec}s)`,
          size: audioBlob.size,
          type: 'audio/webm',
          url: audioUrl,
          file: audioBlob,
          isVoice: true,
          duration: durationSec
        };

        if (autoSendVoiceRef.current) {
          autoSendVoiceRef.current = false;
          sendVoiceDirectlyRef.current?.(voiceAttachment);
          triggerToast?.('success', 'Đã gửi ghi âm thoại 🎙️', `Thời lượng: ${durationSec}s`);
        } else {
          setSelectedFile(voiceAttachment);
          triggerToast?.('success', 'Voice recorded 🎙️', 'Ready to send.');
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      setIsRecording(true);
      setRecordingDuration(0);
      mediaRecorder.start();

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      triggerToast?.('info', 'Recording Voice 🎙️', 'Speak now...');
    } catch (err) {
      console.error('Error starting recording:', err);
      triggerToast?.('error', 'Microphone Error ⚠️', 'Failed to access mic. Please check permissions.');
    }
  };

  const stopRecording = (autoSend = false) => {
    if (mediaRecorderRef.current && isRecording) {
      autoSendVoiceRef.current = autoSend;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  // Task Converter & Slash Commands Logic
  const handleOpenConvertModal = (msg: ChatMessage) => {
    setConvertTaskMessage(msg);
    setConvertTaskTitle(msg.content);
    setConvertTaskPriority('medium');
    
    const firstSpace = spaces.find(s => s.workspaceId === workspaceId) || spaces[0];
    if (firstSpace) {
      setConvertTaskSpaceId(firstSpace.id);
      const firstList = firstSpace.lists?.[0];
      if (firstList) {
        setConvertTaskListId(firstList.id);
      } else {
        setConvertTaskListId('');
      }
    } else {
      setConvertTaskSpaceId('');
      setConvertTaskListId('');
    }
    setConvertTaskAssigneeId('');
  };

  const handleSpaceChange = (spaceId: string) => {
    setConvertTaskSpaceId(spaceId);
    const targetSpace = spaces.find(s => s.id === spaceId);
    const firstList = targetSpace?.lists?.[0];
    if (firstList) {
      setConvertTaskListId(firstList.id);
    } else {
      setConvertTaskListId('');
    }
  };

  const handleCreateTaskFromMsg = () => {
    if (!convertTaskTitle.trim() || !onAddTask) return;

    onAddTask({
      title: convertTaskTitle.trim(),
      description: `Được tạo từ tin nhắn chat: "${convertTaskMessage?.content}"`,
      status: 'todo',
      priority: convertTaskPriority,
      dueDate: '',
      startDate: '',
      assigneeId: convertTaskAssigneeId || undefined,
      assigneeIds: convertTaskAssigneeId ? [convertTaskAssigneeId] : [],
      subtasks: [],
      tags: [],
      spaceId: convertTaskSpaceId,
      listId: convertTaskListId,
      workspaceId: workspaceId
    });

    onAddSyncLog(`Created task from chat: "${convertTaskTitle.trim()}"`);
    if (triggerToast) {
      triggerToast('success', 'Task Created 🚀', `Đã thêm công việc "${convertTaskTitle.trim()}" thành công.`);
    }

    setConvertTaskMessage(null);
  };

  const COMMANDS = [
    { name: '/ai', desc: 'Hỏi Apexa Brain AI câu bất kỳ (VD: /ai gợi ý ý tưởng dự án)', action: 'ai' },
    { name: '/summary', desc: 'Tóm tắt các công việc hiện tại bằng AI', action: 'summary' },
    { name: '/addtask', desc: 'Tạo nhanh công việc (VD: /addtask Họp báo cáo)', action: 'addtask' },
    { name: '/poll', desc: 'Tạo nhanh cuộc thăm dò ý kiến trong kênh', action: 'poll' },
    { name: '/gantt', desc: 'Chuyển sang xem dạng Gantt Chart', action: 'gantt' },
    { name: '/board', desc: 'Chuyển sang xem dạng Kanban Board', action: 'board' },
    { name: '/table', desc: 'Chuyển sang xem dạng Table dữ liệu', action: 'table' },
    { name: '/list', desc: 'Chuyển sang xem dạng List danh sách', action: 'list' },
    { name: '/clear', desc: 'Làm mới tin nhắn hiển thị trong kênh này', action: 'clear' }
  ];

  const filteredCommands = COMMANDS.filter(cmd =>
    cmd.name.toLowerCase().startsWith(commandQuery)
  );

  const handleSelectCommand = (cmd: typeof COMMANDS[0]) => {
    setShowCommandDropdown(false);
    if (cmd.action === 'addtask') {
      setInputVal('/addtask ');
      inputRef.current?.focus();
    } else if (cmd.action === 'ai') {
      setInputVal('/ai ');
      inputRef.current?.focus();
    } else if (cmd.action === 'poll') {
      setShowPollModal(true);
      setInputVal('');
    } else {
      executeSlashCommand(cmd.name);
      setInputVal('');
    }
  };

  const executeSlashCommand = async (text: string) => {
    const parts = text.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    if (cmd === '/gantt' || cmd === '/board' || cmd === '/table' || cmd === '/list') {
      const view = cmd.substring(1);
      if (setViewType) {
        setViewType(view);
        if (triggerToast) triggerToast('success', 'View Changed 🚀', `Switched to ${view.toUpperCase()} view.`);
        onAddSyncLog(`Switched view to ${view} via chat command`);
      } else {
        if (triggerToast) triggerToast('error', 'Action Failed', 'Navigate action is not available.');
      }
      return;
    }

    if (cmd === '/addtask') {
      if (!args.trim()) {
        if (triggerToast) triggerToast('warning', 'Invalid Syntax', 'Please specify a task title: /addtask [title]');
        return;
      }
      if (onAddTask) {
        const firstSpace = spaces.find(s => s.workspaceId === workspaceId) || spaces[0];
        const spaceId = firstSpace?.id;
        const listId = firstSpace?.lists?.[0]?.id;

        onAddTask({
          title: args.trim(),
          description: 'Tạo nhanh từ chat command',
          status: 'todo',
          priority: 'medium',
          dueDate: '',
          startDate: '',
          subtasks: [],
          tags: [],
          spaceId,
          listId,
          workspaceId
        });
        onAddSyncLog(`Created task via chat command: "${args.trim()}"`);
        if (triggerToast) triggerToast('success', 'Task Created 🚀', `Added task "${args.trim()}".`);
      }
      return;
    }

    if (cmd === '/ai') {
      const prompt = args.trim();
      if (!prompt) {
        triggerToast?.('warning', 'Lệnh AI', 'Vui lòng nhập câu hỏi sau lệnh: /ai [câu hỏi]');
        return;
      }
      setIsAiTyping(true);
      try {
        const channelHistory = messageCacheRef.current.get(activeChannelId) || [];
        const historyToSend = channelHistory.slice(-8).map(message => ({
          senderId: message.senderId === 'apexa-ai' ? 'model' : 'user',
          content: message.content
        }));
        const response = await callAiApi('/api/ai/chat', { 
          message: prompt,
          history: historyToSend,
          googleSearch: searchWeb
        });
        const data = await response.json();
        
        if (data.success && data.text) {
          const aiMsgId = `ai-msg-${Date.now()}`;
          const aiMsgTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          const aiResponseMsg: ChatMessage = {
            id: aiMsgId,
            senderId: 'apexa-ai',
            senderName: 'Apexa Brain AI',
            senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ApexaBrain',
            content: `🤖 **Apexa Brain AI:**\n\n${data.text}`,
            timestamp: aiMsgTime,
            channelId: activeChannelId,
            isAi: true,
            deliveryState: 'sent'
          };
          setMessages(prev => [...prev, aiResponseMsg]);
          if (!isOffline) {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              await supabase.from('chat_messages').insert({
                id: aiMsgId,
                sender_id: 'apexa-ai',
                sender_name: 'Apexa Brain AI',
                sender_avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ApexaBrain',
                content: aiResponseMsg.content,
                timestamp: aiMsgTime,
                channel_id: activeChannelId,
                is_ai_response: true,
                workspace_id: workspaceId,
                user_id: session?.user?.id || currentUser?.id || null,
                attachment: null
              });
            } catch {}
          }
        }
      } catch (err) {
        console.error('Error executing /ai command:', err);
        triggerToast?.('error', 'Lỗi AI', 'Không thể kết nối với Apexa Brain AI.');
      } finally {
        setIsAiTyping(false);
        scrollToBottom();
      }
      return;
    }

    if (cmd === '/poll') {
      if (args.trim()) {
        setPollQuestion(args.trim());
      }
      setShowPollModal(true);
      return;
    }

    if (cmd === '/clear') {
      setMessages([]);
      messageCacheRef.current.set(activeChannelId, []);
      triggerToast?.('info', 'Làm mới kênh', 'Đã xóa tin nhắn tạm thời trong kênh này.');
      return;
    }

    if (cmd === '/summary') {
      setIsAiTyping(true);
      try {
        const response = await callAiApi('/api/ai/chat', { 
          message: 'Hãy tóm tắt ngắn gọn trạng thái các công việc hiện tại của tôi trong dự án này.',
          history: [],
          googleSearch: false
        });
        const data = await response.json();
        
        if (data.success && data.text) {
          const aiMsgId = `ai-msg-${Date.now()}`;
          const aiMsgTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          const aiResponseMsg: ChatMessage = {
            id: aiMsgId,
            senderId: 'apexa-ai',
            senderName: 'Apexa Brain AI',
            senderAvatar: '',
            content: data.text,
            timestamp: aiMsgTime,
            isAi: true
          };
          setMessages(prev => [...prev, aiResponseMsg]);
          
          if (!isOffline) {
            await supabase.from('chat_messages').insert({
              id: aiMsgId,
              sender_id: 'apexa-ai',
              sender_name: 'Apexa Brain AI',
              sender_avatar: '',
              content: data.text,
              timestamp: aiMsgTime,
              channel_id: activeChannelId,
              is_ai_response: true,
              workspace_id: workspaceId,
              user_id: currentUser?.id,
              attachment: null
            });
          }
        }
      } catch (err) {
        console.error('Error executing summary command:', err);
      } finally {
        setIsAiTyping(false);
        scrollToBottom();
      }
      return;
    }
  };

  const updateLocalMessage = useCallback((channelId: string, messageId: string, update: Partial<ChatMessage>) => {
    const applyUpdate = (items: ChatMessage[]) => items.map(message => message.id === messageId ? { ...message, ...update } : message);
    const cached = messageCacheRef.current.get(channelId);
    if (cached) messageCacheRef.current.set(channelId, applyUpdate(cached));
    if (activeChannelIdRef.current === channelId) {
      setMessages(previous => {
        const next = applyUpdate(previous);
        messageCacheRef.current.set(channelId, next);
        return next;
      });
    }
  }, []);

  const persistPendingMessage = useCallback(async (messageId: string) => {
    const pending = pendingMessagesRef.current.get(messageId);
    if (!pending) return;

    let message = pending.message;
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || (currentUser?.id && currentUser.id !== 'user' ? currentUser.id : null);
    if (!userId) {
      pendingMessagesRef.current.delete(messageId);
      updateLocalMessage(message.channelId || '', messageId, { deliveryState: 'sent', attachment: message.attachment });
      return;
    }

    if (pending.attachment?.file && (!message.attachment?.filePath || message.attachment.filePath.startsWith('blob:'))) {
      const storagePath = `${userId}/${workspaceId}/${message.channelId}/${crypto.randomUUID()}-${safeFileName(pending.attachment.name)}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(storagePath, pending.attachment.file, {
          contentType: pending.attachment.type || 'application/octet-stream',
          upsert: false
        });
      if (uploadError) throw uploadError;

      message = {
        ...message,
        attachment: message.attachment ? { ...message.attachment, filePath: storagePath } : undefined
      };
      pendingMessagesRef.current.set(messageId, { message, attachment: { ...pending.attachment, file: undefined } });
      updateLocalMessage(message.channelId || '', messageId, { attachment: message.attachment });
    }

    const { error } = await supabase.from('chat_messages').insert({
      id: message.id,
      sender_id: message.senderId,
      sender_name: message.senderName,
      sender_avatar: message.senderAvatar,
      content: message.content,
      timestamp: message.timestamp,
      channel_id: message.channelId,
      is_ai_response: false,
      workspace_id: workspaceId,
      user_id: userId,
      attachment: message.attachment || null,
      parent_id: message.parentId || null
    });
    if (error && error.code !== '23505') throw error;

    pendingMessagesRef.current.delete(messageId);
    updateLocalMessage(message.channelId || '', messageId, { deliveryState: 'sent', attachment: message.attachment });
    if (pending.attachment?.url?.startsWith('blob:')) URL.revokeObjectURL(pending.attachment.url);
  }, [updateLocalMessage, workspaceId]);

  const tryPersistPendingMessage = useCallback(async (messageId: string, showError = true) => {
    const pending = pendingMessagesRef.current.get(messageId);
    if (!pending) return true;
    const channelId = pending.message.channelId || '';
    pendingMessagesRef.current.set(messageId, {
      ...pending,
      message: { ...pending.message, deliveryState: 'sending' }
    });
    updateLocalMessage(channelId, messageId, { deliveryState: 'sending' });

    try {
      await persistPendingMessage(messageId);
      return true;
    } catch (error) {
      const latest = pendingMessagesRef.current.get(messageId) || pending;
      pendingMessagesRef.current.set(messageId, {
        ...latest,
        message: { ...latest.message, deliveryState: 'failed' }
      });
      updateLocalMessage(channelId, messageId, { deliveryState: 'failed' });
      console.error('Unable to send chat message:', error);
      if (showError) {
        triggerToast?.('error', 'Không gửi được tin nhắn', error instanceof Error ? error.message : 'Vui lòng thử lại.');
      }
      return false;
    }
  }, [persistPendingMessage, triggerToast, updateLocalMessage]);

  const handleRetryMessage = async (messageId: string) => {
    if (isOffline) {
      triggerToast?.('info', 'Đang chờ kết nối', 'Tin nhắn sẽ được gửi lại khi có mạng.');
      return;
    }
    await tryPersistPendingMessage(messageId);
  };

  // Send new messages optimistically; failed/offline messages remain visible and retryable.
  const handleSendMessage = async (e?: React.FormEvent, overrideText?: string, overrideFile?: any) => {
    e?.preventDefault();
    const userMsgText = (overrideText ?? inputVal).trim();
    const pendingFile = overrideFile ?? selectedFile;
    if ((!userMsgText && !pendingFile) || !activeChannelId) return;
    if (userMsgText.length > MAX_CHAT_MESSAGE_LENGTH) {
      triggerToast?.('info', 'Tin nhắn quá dài', `Mỗi tin nhắn tối đa ${MAX_CHAT_MESSAGE_LENGTH.toLocaleString('vi-VN')} ký tự.`);
      return;
    }

    if (!overrideText && userMsgText.startsWith('/') && !pendingFile) {
      executeSlashCommand(userMsgText);
      setInputVal('');
      return;
    }

    const targetChannelId = activeChannelId;
    const replyTarget = replyingToMessage;
    const createdAt = new Date().toISOString();
    const msgId = `msg-${crypto.randomUUID()}`;
    const timeStr = new Date(createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const attachmentObj: ChatMessage['attachment'] | undefined = pendingFile ? {
      name: pendingFile.name,
      filePath: pendingFile.url || '',
      size: pendingFile.size,
      type: pendingFile.type,
      isImage: pendingFile.type.startsWith('image/'),
      isVoice: pendingFile.isVoice,
      duration: pendingFile.duration
    } : undefined;
    const newMsg: ChatMessage = {
      id: msgId,
      senderId: currentUser.id || 'user',
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      content: userMsgText,
      timestamp: timeStr,
      channelId: targetChannelId,
      attachment: attachmentObj,
      parentId: replyTarget?.id,
      createdAt,
      deliveryState: 'sending'
    };

    pendingMessagesRef.current.set(msgId, { message: newMsg, attachment: pendingFile });
    setMessages(previous => {
      const next = previous.some(message => message.id === msgId) ? previous : [...previous, newMsg];
      messageCacheRef.current.set(targetChannelId, next);
      return next;
    });
    setInputVal('');
    delete chatDraftsRef.current[targetChannelId];
    persistChatDrafts();
    setSelectedFile(null);
    setReplyingToMessage(null);
    sendTypingState(false);
    scrollToBottom();

    if (isOffline) return;
    const sent = await tryPersistPendingMessage(msgId, false);
    if (!sent) {
      triggerToast?.('error', 'Không gửi được tin nhắn', 'Tin nhắn vẫn được giữ lại. Nhấn “Thử lại” khi kết nối ổn định.');
      return;
    }

    if (targetChannelId.endsWith('apexa-brain-ai')) {
        setIsAiTyping(true);
        try {
          const channelHistory = messageCacheRef.current.get(targetChannelId) || [];
          const historyToSend = channelHistory.slice(-10).map(message => ({
            senderId: message.senderId === 'apexa-ai' ? 'model' : 'user',
            content: message.content
          }));
          const response = await callAiApi('/api/ai/chat', {
            message: userMsgText,
            history: historyToSend,
            googleSearch: searchWeb
          });
          const data = await response.json();

          if (data.success && data.text) {
            const aiCreatedAt = new Date().toISOString();
            const aiResponseMsg: ChatMessage = {
              id: `ai-msg-${crypto.randomUUID()}`,
              senderId: 'apexa-ai',
              senderName: 'Apexa Brain AI',
              senderAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=S',
              content: data.text,
              timestamp: new Date(aiCreatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              channelId: targetChannelId,
              createdAt: aiCreatedAt,
              isAi: true,
              deliveryState: 'sent'
            };
            const cached = messageCacheRef.current.get(targetChannelId) || [];
            const next = cached.some(message => message.id === aiResponseMsg.id) ? cached : [...cached, aiResponseMsg];
            messageCacheRef.current.set(targetChannelId, next);
            if (activeChannelIdRef.current === targetChannelId) {
              setMessages(next);
              scrollToBottom();
            }
            if (chatSettingsRef.current.soundEnabled) (window as any).playSystemSound?.('notification');

            const { data: { session } } = await supabase.auth.getSession();
            await supabase.from('chat_messages').insert({
              id: aiResponseMsg.id,
              sender_id: aiResponseMsg.senderId,
              sender_name: aiResponseMsg.senderName,
              sender_avatar: '',
              content: aiResponseMsg.content,
              timestamp: aiResponseMsg.timestamp,
              channel_id: targetChannelId,
              is_ai_response: true,
              workspace_id: workspaceId,
              user_id: session?.user?.id,
              attachment: null
            });
          }
        } catch (error) {
          console.error('Error fetching AI response:', error);
          triggerToast?.('error', 'AI chưa thể phản hồi', 'Tin nhắn của bạn đã được lưu. Hãy thử hỏi lại sau.');
        } finally {
          setIsAiTyping(false);
        }
    } else if (chatSettingsRef.current.soundEnabled) {
      (window as any).playSystemSound?.('toggle');
    }
  };

  useEffect(() => {
    sendVoiceDirectlyRef.current = (file: any) => {
      void handleSendMessage(undefined, '', file);
    };
  });

  useEffect(() => {
    if (isOffline || flushingPendingRef.current || pendingMessagesRef.current.size === 0) return;
    flushingPendingRef.current = true;
    void (async () => {
      const pendingIds = Array.from(pendingMessagesRef.current.keys());
      for (const messageId of pendingIds) await tryPersistPendingMessage(messageId, false);
      flushingPendingRef.current = false;
    })();
  }, [isOffline, tryPersistPendingMessage]);

  // Message Actions: Edit & Delete & Reaction
  const handleEditMessage = async (id: string, newText: string) => {
    if (!newText.trim()) return;
    if (!isOffline) {
      const { error } = await supabase.from('chat_messages').update({ content: newText.trim(), edited_at: new Date().toISOString() }).eq('id', id);
      if (error) {
        triggerToast?.('error', 'Không cập nhật được tin nhắn', error.message);
        return;
      }
    }
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content: newText.trim(), editedAt: new Date().toISOString() } : m));
    setEditingMsgId(null);
    triggerToast?.('success', 'Message updated 📝', 'Your message changes have been saved.');
  };

  const handleDeleteMessage = async (id: string) => {
    const pending = pendingMessagesRef.current.get(id);
    if (pending) {
      pendingMessagesRef.current.delete(id);
      if (pending.attachment?.url?.startsWith('blob:')) URL.revokeObjectURL(pending.attachment.url);
      setMessages(prev => {
        const next = prev.filter(message => message.id !== id);
        if (pending.message.channelId) messageCacheRef.current.set(pending.message.channelId, next);
        return next;
      });
      return;
    }
    if (!isOffline) {
      const { error } = await supabase.from('chat_messages').delete().eq('id', id);
      if (error) {
        triggerToast?.('error', 'Không xóa được tin nhắn', error.message);
        return;
      }
    }
    setMessages(prev => prev.filter(m => m.id !== id));
    (window as any).playSystemSound?.('delete');
    triggerToast?.('info', 'Message deleted 🗑️', 'The message has been removed from the channel.');
  };

  const handleAddReaction = async (msgId: string, emoji: string) => {
    const { data, error } = await supabase.rpc('toggle_chat_message_reaction', { p_message_id: msgId, p_emoji: emoji });
    if (error) {
      triggerToast?.('error', 'Không thể thêm cảm xúc', error.message);
      return;
    }
    setMessages(prev => prev.map(message => message.id === msgId ? { ...message, reactions: data || [] } : message));
    (window as any).playSystemSound?.('click');
  };

  // Filter channels & members based on search
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredChannels = useMemo(() => {
    if (!normalizedSearch) return channels;
    return channels.filter(c => 
      c.name.toLowerCase().includes(normalizedSearch) || 
      (c.description && c.description.toLowerCase().includes(normalizedSearch))
    );
  }, [channels, normalizedSearch]);

  const filteredMembers = useMemo(() => {
    const validMembers = members.filter(m => {
      if (m.id === currentUser.id || m.id === 'user') return false;
      if (currentUser.userId && m.userId === currentUser.userId) return false;
      return true;
    });
    if (!normalizedSearch) return validMembers;
    return validMembers.filter(m => 
      m.name.toLowerCase().includes(normalizedSearch) ||
      (m.email && m.email.toLowerCase().includes(normalizedSearch)) ||
      (m.department && m.department.toLowerCase().includes(normalizedSearch)) ||
      (m.statusMessage && m.statusMessage.toLowerCase().includes(normalizedSearch))
    );
  }, [members, currentUser.id, currentUser.userId, normalizedSearch]);

  const activeChannel = channels.find(c => c.id === activeChannelId);

  // Resolve DM member if activeChannelId is a DM
  const isDm = activeChannelId.includes(':dm-');
  const currentUserId = currentUser?.id || 'user';

  const dmMember = useMemo(() => {
    if (!isDm) return undefined;
    const activeDm = channels.find(channel => channel.id === activeChannelId && channel.type === 'dm');
    if (activeDm?.dmKey) {
      const authUserId = currentUser.userId || currentUser.id;
      const peerId = activeDm.dmKey.split(':').find(id => id !== authUserId);
      const peer = members.find(member => (member.userId || member.id) === peerId);
      if (peer) return peer;
    }
    const dmPart = activeChannelId.substring(activeChannelId.indexOf(':dm-') + 4);
    
    // Find matching member from members list
    const found = members.find(m => {
      if (m.id === currentUserId || m.id === `user-${currentUserId}` || `user-${m.id}` === currentUserId) return false;
      const cleanId = m.id.replace(/^user-/, '');
      return dmPart.includes(m.id) || (cleanId !== '' && dmPart.includes(cleanId));
    });

    if (found) return found;

    // Fallback: search by member ID in dmPart
    return members.find(m => {
      if (m.id === currentUserId || m.id === `user-${currentUserId}`) return false;
      const cleanId = m.id.replace(/^user-/, '');
      return dmPart.endsWith(m.id) || (cleanId !== '' && dmPart.endsWith(cleanId));
    });
  }, [isDm, activeChannelId, members, currentUserId, currentUser.id, currentUser.userId, channels]);

  const isSelfDm = isDm && (
    activeChannelId.endsWith(`-${currentUser.id}-${currentUser.id}`) ||
    activeChannelId.endsWith('-user-user') ||
    (dmMember ? (dmMember.id === currentUser.id || dmMember.id === `user-${currentUser.id}`) : false)
  );
  const userStatus = useUiStore((s) => s.userStatus);
  const ownPresenceStatus = isOffline 
    ? 'offline' 
    : (userStatus 
        ? uiStatusToPresence(userStatus) 
        : (members.find((member) => member.id === 'user' || (currentUser?.id && member.id === currentUser.id) || (member.email && currentUser?.email && member.email.toLowerCase() === currentUser.email.toLowerCase()))?.status || 'online'));

  // Resolve Space channel if activeChannelId is a Space Channel
  const isSpaceChan = activeChannelId.includes(':space-') || activeChannelId.includes(':folder-') || activeChannelId.includes(':list-');

  const isEditableChannel = useMemo(() => {
    if (!activeChannelId) return false;
    if (activeChannelId.includes(':dm-')) return false;
    if (activeChannelId.endsWith('apexa-brain-ai')) return false;
    if (activeChannelId.includes(':folder-') || activeChannelId.includes(':list-')) return false;
    
    const localId = activeChannelId.split(':').pop() || '';
    if (['general', 'project-planning', 'design-review'].includes(localId)) return false;
    if (activeChannelId.includes(':space-') && activeChannelId.endsWith('-general')) return false;
    
    return true;
  }, [activeChannelId]);
  let spaceChanName = '';
  let spaceChanDesc = '';
  if (isSpaceChan) {
    let spaceId = '';
    let entityId = '';
    let entityType: 'space' | 'folder' | 'list' = 'space';

    if (activeChannelId.includes(':folder-')) {
      entityType = 'folder';
      const prefixIndex = activeChannelId.indexOf(':folder-');
      const infoStr = activeChannelId.substring(prefixIndex + 8);
      const space = spaces.find(s => infoStr.startsWith(s.id));
      if (space) {
        spaceId = space.id;
        entityId = infoStr.substring(space.id.length + 1);
        spaceChanName = space.folders?.find(f => f.id === entityId)?.name || 'Folder';
        spaceChanDesc = `📂 Thư mục trong Space: ${space.name}`;
      }
    } else if (activeChannelId.includes(':list-')) {
      entityType = 'list';
      const prefixIndex = activeChannelId.indexOf(':list-');
      const infoStr = activeChannelId.substring(prefixIndex + 6);
      const space = spaces.find(s => infoStr.startsWith(s.id));
      if (space) {
        spaceId = space.id;
        entityId = infoStr.substring(space.id.length + 1);
        spaceChanName = space.lists?.find(l => l.id === entityId)?.name || 'List';
        spaceChanDesc = `📋 Danh sách trong Space: ${space.name}`;
      }
    } else if (activeChannelId.includes(':space-')) {
      entityType = 'space';
      const prefixIndex = activeChannelId.indexOf(':space-');
      const infoStr = activeChannelId.substring(prefixIndex + 7);
      const space = spaces.find(s => infoStr.startsWith(s.id));
      if (space) {
        spaceId = space.id;
        entityId = infoStr.substring(space.id.length + 1);
        const foundChan = space.channels?.find(c => c.id === entityId);
        const spaceEmojiPrefix = space.emoji && /\p{Extended_Pictographic}/u.test(space.emoji) ? `${space.emoji} ` : '';
        spaceChanDesc = foundChan?.description || `${spaceEmojiPrefix}Kênh chat của Space: ${space.name}`;
      }
    }
  }

  const starredChannelsList = useMemo(() => {
    return channels.filter(c => starredChannelIds.includes(c.id) && (!normalizedSearch || c.name.toLowerCase().includes(normalizedSearch)));
  }, [channels, starredChannelIds, normalizedSearch]);

  const normalChannels = useMemo(() => {
    return filteredChannels.filter(c => c.type !== 'dm' && c.type !== 'group' && !c.name.includes('brain-ai') && !c.id.includes('brain-ai') && !c.id.includes(':space-'));
  }, [filteredChannels]);

  const groupChannels = useMemo(() => {
    return filteredChannels.filter(c => c.type === 'group');
  }, [filteredChannels]);

  return (
    <div className="apexa-chat flex min-h-[500px] h-full w-full rounded-3xl bg-white dark:bg-[var(--cu-surface)] border border-slate-200/60 dark:border-[var(--cu-border)] shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden font-sans select-none animate-fadeIn text-slate-800 dark:text-slate-100">
      
      {/* ── COLUMN 1: Channels Sidebar (w-68) ── */}
      <div className={`w-full md:w-[268px] border-r border-slate-200/70 dark:border-[var(--cu-border)] bg-slate-50/70 dark:bg-[var(--cu-bg-subtle)] flex flex-col justify-between shrink-0 text-left ${
          isMobileChatActive ? 'hidden md:flex' : 'flex'
        }`}>
        
        {/* Sidebar Top: Title, Action & Live Search */}
        <div className="p-3 pb-2 border-b border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between px-1 select-none">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">Trò chuyện</span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800/80 px-1.5 py-0.2 rounded-full font-mono">
                {channels.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowQuickCreateMenu(!showQuickCreateMenu)}
              className="p-1.5 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-2xs transition-all cursor-pointer active:scale-95"
              title="Tạo nhanh cuộc trò chuyện, kênh hoặc nhóm"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Live Search Input */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kênh, đồng đội..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/90 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto px-2 py-2.5 space-y-3.5 pr-1.5 scrollbar-thin min-h-0">
          {/* Quick Shortcuts: Personal Notes & Apexa Brain AI */}
          {!normalizedSearch && (
            <div className="space-y-1">
              {/* Saved Notes to Self */}
              {(() => {
                const selfDmId = `${workspaceId}:dm-${currentUser.id}-${currentUser.id}`;
                const isSelfActive = activeChannelId === selfDmId || activeChannelId.endsWith(`-${currentUser.id}-${currentUser.id}`) || activeChannelId.endsWith('-user-user');
                return (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChannelId(selfDmId);
                      triggerToast?.('info', 'Ghi chú cá nhân 📝', 'Đã mở không gian ghi chú của bạn');
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all border ${
                      isSelfActive 
                        ? 'bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-300/40 dark:border-amber-700/40 font-bold shadow-3xs' 
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/50 dark:border-amber-800/50">
                        <FileText className="w-3.5 h-3.5" />
                      </span>
                      <span className="truncate">Ghi chú cá nhân</span>
                    </div>
                    <span className="text-[9.5px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/50 px-1.5 py-0.2 rounded-md font-mono">
                      Bạn
                    </span>
                  </button>
                );
              })()}
            </div>
          )}

          {/* Starred Channels Section */}
          {starredChannelsList.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-1.5 mb-1 select-none">
                <button
                  type="button"
                  onClick={() => toggleSection('starred')}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 hover:text-amber-700 transition-colors cursor-pointer"
                >
                  {collapsedSections.starred ? <ChevronRight className="w-3 h-3 text-amber-500/70" /> : <ChevronDown className="w-3 h-3 text-amber-500/70" />}
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>Đã ghim</span>
                </button>
                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50 px-1.5 py-0.2 rounded-full font-mono">
                  {starredChannelsList.length}
                </span>
              </div>
              {!collapsedSections.starred && (
                <div className="space-y-0.5">
                  {starredChannelsList.map(c => {
                    const isActive = c.id === activeChannelId;
                    return (
                      <button
                        key={`starred-${c.id}`}
                        onClick={() => setActiveChannelId(c.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all border border-transparent ${
                          isActive 
                            ? 'bg-amber-500/10 text-amber-800 dark:text-amber-200 font-bold border-amber-300/40 dark:border-amber-700/40 shadow-3xs' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                          <span className="truncate">{c.name}</span>
                        </div>
                        {(unreadCounts[c.id] || 0) > 0 && (
                          <span className="ml-auto px-1.5 py-0.2 min-w-[18px] text-center text-[9px] font-black text-white bg-gradient-to-r from-rose-500 to-pink-500 rounded-full shadow-xs">
                            {unreadCounts[c.id] > 99 ? '99+' : unreadCounts[c.id]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Public / Workspace Channels */}
          <div>
            <div className="flex items-center justify-between px-1.5 mb-1 select-none">
              <button
                type="button"
                onClick={() => toggleSection('channels')}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                {collapsedSections.channels ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <span>Kênh trao đổi</span>
              </button>
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] font-bold text-slate-400 bg-slate-200/50 dark:bg-slate-800 px-1.5 py-0.2 rounded-full font-mono">
                  {normalChannels.length}
                </span>
                <button 
                  onClick={() => setShowCreateChannelModal(true)}
                  className="p-1 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  title="Tạo kênh mới"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {!collapsedSections.channels && (
              <div className="space-y-0.5">
                {normalChannels.map(c => {
                  const isActive = c.id === activeChannelId;
                  const isDefault = c.id === `${workspaceId}:general` || c.id === `${workspaceId}:project-planning` || c.id === `${workspaceId}:design-review`;
                  const isStarred = starredChannelIds.includes(c.id);
                  
                  return (
                    <div 
                      key={c.id}
                      className={`w-full flex items-center justify-between rounded-xl group/chan border border-transparent transition-all ${
                        isActive 
                          ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-300/40 dark:border-indigo-700/40 font-bold shadow-3xs' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <button
                        onClick={() => setActiveChannelId(c.id)}
                        className="flex-1 flex items-center gap-2 px-2.5 py-2 text-xs font-semibold cursor-pointer text-left truncate"
                      >
                        <Hash className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`} />
                        <span className="truncate">{c.name}</span>
                        {(unreadCounts[c.id] || 0) > 0 && (
                          <span className="ml-auto px-1.5 py-0.2 min-w-[18px] text-center text-[9px] font-black text-white bg-gradient-to-r from-rose-500 to-pink-500 rounded-full shadow-xs">
                            {unreadCounts[c.id] > 99 ? '99+' : unreadCounts[c.id]}
                          </span>
                        )}
                      </button>
                      
                      <div className="relative shrink-0 flex items-center pr-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveChannelMenuId(activeChannelMenuId === c.id ? null : c.id);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors opacity-0 group-hover/chan:opacity-100 cursor-pointer"
                          title="Tùy chọn kênh"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        {activeChannelMenuId === c.id && (
                          <>
                            <div className="fixed inset-0 z-20 cursor-default" onClick={(e) => { e.stopPropagation(); setActiveChannelMenuId(null); }} />
                            <div className="absolute right-0 top-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xl p-1 z-30 min-w-[145px] text-left animate-fadeIn">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveChannelMenuId(null);
                                  toggleStarChannel(c.id);
                                }}
                                className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                              >
                                <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
                                {isStarred ? 'Bỏ ghim' : 'Ghim kênh'}
                              </button>
                              {!isDefault && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveChannelMenuId(null);
                                      setRenamingChannelId(c.id);
                                      setRenameChannelName(c.name);
                                      setRenameChannelDesc(c.description || '');
                                      setShowRenameModal(true);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                    Đổi tên kênh
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveChannelMenuId(null);
                                      if (confirm(`Bạn có chắc chắn muốn xóa kênh #${c.name}? Hành động này không thể hoàn tác.`)) {
                                        handleDeleteChannel(c.id, c.name);
                                      }
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    Xóa kênh
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Group Chats Section */}
          {groupChannels.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-1.5 mb-1 select-none">
                <button
                  type="button"
                  onClick={() => toggleSection('groups')}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {collapsedSections.groups ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <span>Nhóm chat</span>
                </button>
                <div className="flex items-center gap-0.5">
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-200/50 dark:bg-slate-800 px-1.5 py-0.2 rounded-full font-mono">
                    {groupChannels.length}
                  </span>
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                    title="Tạo nhóm chat"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {!collapsedSections.groups && (
                <div className="space-y-0.5">
                  {groupChannels.map(channel => {
                    const isActive = channel.id === activeChannelId;
                    return (
                      <button
                        key={channel.id}
                        onClick={() => setActiveChannelId(channel.id)}
                        className={`flex w-full cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                          isActive 
                            ? 'border-indigo-300/40 dark:border-indigo-700/40 bg-indigo-500/10 font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 shadow-3xs' 
                            : 'border-transparent text-slate-600 hover:bg-slate-200/50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
                        }`}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950/70 dark:text-violet-300 border border-violet-200/50 dark:border-violet-800/50">
                          <Users className="h-3.5 w-3.5" />
                        </span>
                        <span className="flex-1 truncate text-left">{channel.name}</span>
                        {(unreadCounts[channel.id] || 0) > 0 && (
                          <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[9px] font-black text-white">
                            {unreadCounts[channel.id] > 99 ? '99+' : unreadCounts[channel.id]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Direct Messages Section */}
          <div>
            <div className="flex items-center justify-between px-1.5 mb-1 select-none">
              <button
                type="button"
                onClick={() => toggleSection('dms')}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                {collapsedSections.dms ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <span>Tin nhắn trực tiếp</span>
              </button>
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] font-bold text-slate-400 bg-slate-200/50 dark:bg-slate-800 px-1.5 py-0.2 rounded-full font-mono">
                  {filteredMembers.length}
                </span>
                <button 
                  onClick={() => setShowCreateGroupModal(true)} 
                  className="cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400" 
                  title="Tạo nhóm chat"
                >
                  <Users className="h-3.5 w-3.5" />
                </button>
                <button 
                  onClick={() => setShowNewDmModal(true)} 
                  className="cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400" 
                  title="Nhắn tin với thành viên"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {!collapsedSections.dms && (
              <div className="space-y-0.5">
                {filteredMembers.map(member => {
                  const peerId = member.userId || member.id;
                  const dmKey = [currentUser.userId || currentUser.id, peerId].sort().join(':');
                  const dmChannelId = channels.find(channel => channel.type === 'dm' && channel.dmKey === dmKey)?.id || '';
                  const isActive = activeChannelId === dmChannelId;
                  const unread = unreadCounts[dmChannelId] || 0;

                  const isOnline = member.status === 'online';
                  const isBusy = member.status === 'busy';
                  const isAway = member.status === 'away';
                  
                  const statusDotColor = isOnline 
                    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]' 
                    : isBusy 
                    ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]' 
                    : isAway 
                    ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]' 
                    : 'bg-slate-300 dark:bg-slate-600';

                  const statusLabel = isOnline ? 'Đang hoạt động' : isBusy ? 'Đang bận' : isAway ? 'Tạm vắng' : 'Ngoại tuyến';

                  return (
                    <button
                      key={member.id}
                      onClick={() => openDirectMessage(member)}
                      className={`w-full group/dm relative flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-xs cursor-pointer transition-all border ${
                        isActive 
                          ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-300/40 dark:border-indigo-700/40 font-bold shadow-3xs' 
                          : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <SignedImage 
                          filePath={member.avatar} 
                          alt={member.name} 
                          className="w-8 h-8 rounded-xl object-cover border border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800 shadow-2xs" 
                        />
                        <span 
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-[#0a0c10] ${statusDotColor}`}
                          title={statusLabel}
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`truncate text-xs ${isActive ? 'font-bold text-indigo-900 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-100'}`}>
                            {member.name}
                          </span>
                          {unread > 0 && (
                            <span className="px-1.5 py-0.2 min-w-[18px] text-center text-[9px] font-black text-white bg-gradient-to-r from-rose-500 to-pink-500 rounded-full shadow-xs shrink-0">
                              {unread > 99 ? '99+' : unread}
                            </span>
                          )}
                        </div>
                        <div className="truncate text-[10.5px] text-slate-400 dark:text-slate-500 font-normal mt-0.5 flex items-center gap-1">
                          {member.statusMessage ? (
                            <span className="truncate">{member.statusEmoji || '💬'} {member.statusMessage}</span>
                          ) : member.department ? (
                            <span className="truncate">{member.department}</span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDotColor}`} />
                              <span>{statusLabel}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* If search query has no results */}
          {normalizedSearch && normalChannels.length === 0 && groupChannels.length === 0 && filteredMembers.length === 0 && (
            <div className="text-center py-8 px-2 select-none">
              <Search className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Không tìm thấy kết quả</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Không có kênh hay thành viên nào khớp với &ldquo;{searchQuery}&rdquo;</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Xóa tìm kiếm
              </button>
            </div>
          )}

          {/* Quick Action prompt card to gracefully fill void */}
          {!normalizedSearch && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowNewDmModal(true)}
                className="w-full p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/60 bg-white/50 dark:bg-slate-900/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all flex items-center justify-center gap-2 text-xs font-semibold group cursor-pointer shadow-3xs"
              >
                <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <span>Nhắn tin với đồng đội</span>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Footer Bar: User Profile & Quick Actions */}
        <div className="relative p-2 bg-white/70 dark:bg-[#08090c] border-t border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between shrink-0 select-none gap-1.5">
          {/* Current User Pill */}
          <div 
            onClick={() => setShowChatSettingsModal(true)}
            className="flex items-center gap-2 flex-1 min-w-0 p-1 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
            title="Tùy chỉnh chat & tài khoản"
          >
            <div className="relative shrink-0">
              <SignedImage 
                filePath={currentUser?.avatar} 
                alt={currentUser?.name || 'User'} 
                className="w-8 h-8 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs"
              />
              <span 
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-[#08090c] ${
                  ownPresenceStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]' :
                  ownPresenceStatus === 'busy' ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]' :
                  ownPresenceStatus === 'away' ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]' :
                  'bg-slate-400'
                }`} 
              />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {currentUser?.name || 'Tài khoản của bạn'}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  ownPresenceStatus === 'online' ? 'bg-emerald-500' :
                  ownPresenceStatus === 'busy' ? 'bg-rose-500' :
                  ownPresenceStatus === 'away' ? 'bg-amber-400' :
                  'bg-slate-400'
                }`} />
                <span className="capitalize">{ownPresenceStatus === 'online' ? 'Đang hoạt động' : ownPresenceStatus === 'busy' ? 'Đang bận' : ownPresenceStatus === 'away' ? 'Tạm vắng' : 'Ngoại tuyến'}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0 text-slate-400 dark:text-slate-500">
            <button 
              type="button" 
              onClick={() => setShowActivityLogModal(true)}
              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Lịch sử hoạt động"
            >
              <Clock className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={() => setShowChatSettingsModal(true)}
              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Tùy chỉnh Chat"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Create Menu Popover */}
          {showQuickCreateMenu && (
            <div className="absolute left-3 bottom-14 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 min-w-[190px] text-left animate-fadeIn">
              <div className="px-2.5 py-1 mb-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Tạo nhanh</span>
                <button onClick={() => setShowQuickCreateMenu(false)} className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <button
                onClick={() => { setShowQuickCreateMenu(false); setShowCreateChannelModal(true); }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
              >
                <Hash className="w-3.5 h-3.5 text-indigo-500" />
                Tạo Kênh mới
              </button>
              <button
                onClick={() => { setShowQuickCreateMenu(false); setShowNewDmModal(true); }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                Tin nhắn cá nhân (DM)
              </button>
              <button
                onClick={() => { setShowQuickCreateMenu(false); setShowCreateGroupModal(true); }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
              >
                <Users className="w-3.5 h-3.5 text-violet-500" />
                Tạo Nhóm chat
              </button>
              <button
                onClick={() => {
                  setShowQuickCreateMenu(false);
                  const selfDmId = `${workspaceId}:dm-${currentUser.id}-${currentUser.id}`;
                  setActiveChannelId(selfDmId);
                  triggerToast?.('info', 'Ghi chú cá nhân 📝', 'Đã mở không gian ghi chú của bạn');
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                Viết ghi chú cá nhân
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── COLUMN 2: Main Chat Workspace ── */}
      <div 
        className={`flex-1 flex flex-col justify-between relative bg-white dark:bg-[var(--cu-surface)] ${isDragOver ? 'ring-2 ring-indigo-400 ring-inset' : ''} ${
          isMobileChatActive ? 'flex' : 'hidden md:flex'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag-drop overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-indigo-50/80 dark:bg-indigo-950/80 backdrop-blur-sm z-40 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-3 animate-pulse">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 border-2 border-dashed border-indigo-400 dark:border-indigo-500 flex items-center justify-center">
                <Paperclip className="w-7 h-7 text-indigo-500 dark:text-indigo-400" />
              </div>
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-300">Thả tệp vào đây để gửi</span>
              <span className="text-[10px] font-bold text-indigo-400 dark:text-indigo-400">Hình ảnh, tài liệu, tệp âm thanh…</span>
            </div>
          </div>
        )}
        
        {/* Chat header */}
        <header className="relative z-30 flex shrink-0 flex-col border-b border-slate-200/70 bg-white/80 shadow-xs backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#0a0a0a]/85">
          {/* Top row */}
          <div className="flex min-h-[68px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3.5">
              {/* Mobile Back Button to Channels List */}
              <button
                onClick={() => setIsMobileChatActive(false)}
                className="mr-0.5 shrink-0 cursor-pointer rounded-2xl border border-slate-200/70 bg-slate-50 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 md:hidden dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Quay lại danh sách chat"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {isSelfDm ? (
                <div className="relative shrink-0 flex">
                  <SignedImage filePath={currentUser.avatar} alt={currentUser.name} className="h-11 w-11 animate-fadeIn rounded-2xl border-2 border-indigo-200/80 dark:border-indigo-800/80 bg-white object-cover shadow-sm dark:bg-slate-800" />
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 ${presenceDotClass(ownPresenceStatus, true)}`} />
                </div>
              ) : isDm && dmMember ? (
                <div 
                  onClick={() => setViewingMemberProfileId(dmMember.id)}
                  className="relative shrink-0 flex cursor-pointer hover:opacity-85 transition-opacity"
                  title={`Xem hồ sơ của ${dmMember.name}`}
                >
                  <SignedImage filePath={dmMember.avatar} alt={dmMember.name} className="h-11 w-11 animate-fadeIn rounded-2xl border-2 border-indigo-200/80 dark:border-indigo-800/80 bg-white object-cover shadow-sm dark:bg-slate-800" />
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 ${presenceDotClass(dmMember.status, true)}`} />
                </div>
              ) : (
                <div className="flex h-11 w-11 shrink-0 select-none items-center justify-center rounded-2xl border border-indigo-200/70 bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-base font-black text-white shadow-md shadow-indigo-500/20">
                  {isSpaceChan ? (spaceChanName ? '📁' : '#') : '#'}
                </div>
              )}
              
              <div className="min-w-0 text-left">
                <div className="flex min-w-0 items-center gap-2">
                  <h2
                    onClick={() => isDm && dmMember && setViewingMemberProfileId(dmMember.id)}
                    className={`truncate text-sm font-black tracking-tight text-slate-900 dark:text-white sm:text-base ${isDm && dmMember ? 'cursor-pointer transition-colors hover:text-indigo-600 dark:hover:text-indigo-400' : ''}`}
                    title={isDm && dmMember ? `Xem hồ sơ của ${dmMember.name}` : undefined}
                  >
                    {isSelfDm ? currentUser.name : (isDm && dmMember) ? dmMember.name : isSpaceChan ? spaceChanName : (activeChannel?.name || 'chat-room')}
                  </h2>
                {isEditableChannel && (
                  <div className="relative flex items-center">
                    <button 
                      onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                      className={`text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 ${showHeaderMenu ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : ''}`}
                      title="Tùy chọn kênh"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                    {showHeaderMenu && (
                      <>
                        <div className="fixed inset-0 z-30 cursor-default" onClick={() => setShowHeaderMenu(false)} />
                        <div className="absolute left-0 top-7 bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-35 min-w-[150px] text-left animate-fadeIn backdrop-blur-xl">
                        <button
                          onClick={() => {
                            setShowHeaderMenu(false);
                            if (isSpaceChan) {
                              setRenamingChannelId(activeChannelId);
                              setRenameChannelName(spaceChanName);
                              setRenameChannelDesc(spaceChanDesc || '');
                            } else if (activeChannel) {
                              setRenamingChannelId(activeChannel.id);
                              setRenameChannelName(activeChannel.name);
                              setRenameChannelDesc(activeChannel.description || '');
                            }
                            setShowRenameModal(true);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                          Đổi tên kênh
                        </button>
                        <button
                          onClick={() => {
                            setShowHeaderMenu(false);
                            const nameToDelete = isSpaceChan ? spaceChanName : (activeChannel?.name || 'this-channel');
                            if (confirm(`Are you sure you want to delete the channel #${nameToDelete}? This action cannot be undone.`)) {
                              handleDeleteChannel(activeChannelId, nameToDelete);
                            }
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          Xóa kênh
                        </button>
                      </div>
                    </>
                  )}
                  </div>
                )}
                <button 
                  type="button"
                  onClick={() => toggleStarChannel(activeChannelId)}
                  className={`shrink-0 cursor-pointer rounded-xl p-1.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    starredChannelIds.includes(activeChannelId) ? 'text-amber-400 fill-amber-400 scale-110' : 'text-slate-400 hover:text-amber-400 hover:scale-110'
                  }`}
                  title={starredChannelIds.includes(activeChannelId) ? "Bỏ yêu thích kênh" : "Yêu thích kênh"}
                >
                  <Star className={`w-4 h-4 ${starredChannelIds.includes(activeChannelId) ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
                </div>
                <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {isDm ? (
                    <span className="flex items-center gap-1.5">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${presenceDotClass(dmMember?.status || 'offline', false)}`} />
                      <span>{isSelfDm ? 'Ghi chú cá nhân' : dmMember?.status === 'online' ? 'Đang hoạt động' : dmMember?.status === 'busy' ? 'Đang bận' : dmMember?.status === 'away' ? 'Tạm vắng' : 'Ngoại tuyến'}</span>
                    </span>
                  ) : (
                    <>
                      <span className="font-semibold text-slate-600 dark:text-slate-300 shrink-0">{activeChannel?.type === 'group' ? 'Nhóm chat' : activeChannel?.type === 'private' ? 'Kênh riêng tư' : 'Kênh workspace'}</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="max-w-[320px] truncate">{isSpaceChan ? (spaceChanDesc || 'Trao đổi công việc cùng nhóm') : (activeChannel?.description || 'Trao đổi công việc cùng nhóm')}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={handleSummarizeChannel}
                disabled={isSummarizing}
                className="flex h-9 px-2.5 cursor-pointer items-center gap-1.5 rounded-2xl border border-amber-200/80 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 transition-all hover:bg-amber-100 hover:scale-103 disabled:cursor-wait disabled:opacity-50 text-xs font-bold shadow-2xs"
                title="Tóm tắt cuộc trò chuyện bằng AI"
              >
                {isSummarizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 fill-amber-400" />}
                <span className="hidden sm:inline">AI Tóm tắt</span>
              </button>
              <button
                type="button"
                onClick={handleExportChatMarkdown}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-2xl border border-slate-200/70 bg-slate-50/80 hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-850 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all shadow-2xs hover:scale-105 active:scale-95"
                title="Xuất lịch sử trò chuyện (Markdown)"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => { setActiveSidebarTab('search'); setShowMemberDrawer(true); }}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-2xl border border-slate-200/70 bg-slate-50/80 hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-850 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all shadow-2xs hover:scale-105 active:scale-95"
                title="Tìm trong cuộc trò chuyện"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => { setActiveSidebarTab('members'); setShowMemberDrawer(true); }}
                className="hidden h-9 cursor-pointer items-center gap-1.5 rounded-2xl border border-slate-200/70 bg-slate-50/80 hover:bg-slate-100 px-3 text-xs font-extrabold text-slate-700 shadow-2xs transition-all hover:scale-103 sm:flex dark:border-slate-700 dark:bg-slate-850 dark:text-slate-200"
                title="Xem thành viên"
              >
                <Users className="h-3.5 w-3.5 text-indigo-500" />
                <span>{members.length}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Pinned Messages Bar */}
        {messages.filter(m => m.isPinned).length > 0 && (
          <div className="px-5 py-2 bg-amber-50/40 border-b border-amber-100/60 flex items-center gap-3 overflow-x-auto shrink-0 select-none scrollbar-none">
            <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider flex items-center gap-1 shrink-0">
              <Pin className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              Đã ghim:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto min-w-0">
              {messages.filter(m => m.isPinned).map(msg => (
                <div 
                  key={msg.id}
                  onClick={() => handleScrollToMessage(msg.id)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-amber-200/50 dark:border-amber-800/50 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer shadow-xs hover:border-amber-300 dark:hover:border-amber-700 transition-colors shrink-0 max-w-[200px]"
                >
                  <span className="truncate flex-1 text-[11px] font-semibold">{msg.content || (msg.attachment ? '[Attachment]' : 'Tin nhắn')}</span>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePinMessage(msg.id, true);
                    }}
                    className="text-slate-400 hover:text-rose-500 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages List Area */}
        <div
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          className="flex flex-1 flex-col space-y-0.5 overflow-y-auto px-3 py-4 scrollbar-thin sm:px-5"
        >
          {isLoadingMessages && messages.length === 0 && (
            <div className="space-y-5 px-2 py-4" aria-label="Đang tải tin nhắn">
              {[0, 1, 2].map(item => (
                <div key={item} className="flex animate-pulse items-start gap-3">
                  <div className="h-8 w-8 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800" />
                  <div className="flex-1 space-y-2 pt-0.5">
                    <div className="h-2.5 w-24 rounded-full bg-slate-100 dark:bg-slate-800" />
                    <div className={`h-3 rounded-full bg-slate-100 dark:bg-slate-800 ${item === 1 ? 'w-2/3' : 'w-1/2'}`} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Self DM Notes View */}
          {isSelfDm && (
            <div className="flex flex-col items-center justify-center text-center py-10 max-w-lg mx-auto select-none border-b border-slate-100 dark:border-slate-800/40 mb-6 animate-fadeIn">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 to-cyan-500 text-white flex items-center justify-center mb-4 text-2xl shadow-lg shadow-indigo-500/25">
                🧠
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white mb-1.5 tracking-tight">Không gian Ghi chú Cá nhân của bạn</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-medium max-w-md">
                Chỉ có bạn thấy những tin nhắn này. Thích hợp để lưu nháp, ghi chú việc cần làm, tệp đính kèm và ý tưởng sáng tạo.
              </p>

              {/* Quick Starters for Self DM */}
              <div className="w-full space-y-2 mb-6 text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block px-1">Gợi ý bắt đầu</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: '📝 Ghi chú việc cần làm hôm nay', prompt: '📝 Danh sách việc cần làm hôm nay:\n- [ ] ' },
                    { label: '💡 Lưu ý tưởng dự án mới', prompt: '💡 Ý tưởng mới: ' },
                    { label: '🎯 Đặt mục tiêu cá nhân tuần này', prompt: '🎯 Mục tiêu tuần này:\n1. ' },
                    { label: '🤖 Nhờ AI lên kế hoạch ngày', prompt: '@apexa-brain Hãy gợi ý lịch làm việc hiệu quả cho hôm nay' }
                  ].map(s => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => {
                        setInputVal(s.prompt);
                        inputRef.current?.focus();
                      }}
                      className="p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all text-left shadow-2xs hover:-translate-y-0.5 cursor-pointer"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Regular Channel / DM Welcome Hub (when channel is empty) */}
          {!isSelfDm && messages.filter(m => !m.parentId).length === 0 && !isLoadingMessages && (
            <div className="flex flex-col items-center justify-center text-center py-12 max-w-xl mx-auto select-none animate-fadeIn">
              {/* Glowing Icon Header */}
              <div className="relative mb-5">
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-cyan-500/20 rounded-full blur-xl animate-pulse pointer-events-none" />
                {isDm && dmMember ? (
                  <div className="relative">
                    <SignedImage
                      filePath={dmMember.avatar}
                      alt={dmMember.name}
                      className="w-20 h-20 rounded-3xl object-cover border-2 border-white dark:border-slate-800 shadow-xl"
                    />
                    <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${presenceDotClass(dmMember.status, true)}`} />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-600 text-white flex items-center justify-center text-3xl shadow-xl shadow-indigo-500/25 border border-white/20">
                    {isSpaceChan ? (spaceChanName ? '📁' : '#') : '#'}
                  </div>
                )}
              </div>

              {/* Title and Subtitle */}
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {isDm && dmMember 
                  ? `Trò chuyện cùng ${dmMember.name}` 
                  : isSpaceChan 
                    ? `Chào mừng đến với #${spaceChanName}` 
                    : `Chào mừng đến với #${activeChannel?.name || 'chat-room'}!`}
              </h2>
              <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                {isDm && dmMember 
                  ? `Đây là cuộc trò chuyện trực tiếp giữa bạn và ${dmMember.name} (${dmMember.role || 'Thành viên'}). Bắt đầu nhắn tin để trao đổi công việc!`
                  : isSpaceChan
                    ? (spaceChanDesc || 'Kênh trao đổi không gian làm việc. Bắt đầu cuộc trò chuyện cùng các thành viên trong nhóm!')
                    : (activeChannel?.description || 'Đây là sự khởi đầu của kênh này. Hãy gửi tin nhắn đầu tiên để kết nối và trao đổi cùng đội ngũ!')}
              </p>

              {/* 1-Click Quick Conversation Starters */}
              <div className="mt-8 w-full space-y-2.5 text-left">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Gợi ý mở đầu cuộc trò chuyện
                  </span>
                  <span className="text-[10px] text-slate-400 italic">Nhấn 1 chạm để chọn</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { label: '👋 Chào mọi người, chúc một ngày hiệu quả!', text: '👋 Chào mọi người, chúc một ngày làm việc hiệu quả!' },
                    { label: '🚀 Cập nhật tiến độ dự án hôm nay', text: '🚀 Cập nhật tiến độ: Hôm nay mình đang tập trung vào ' },
                    { label: '💡 Đề xuất ý tưởng mới cho nhóm', text: '💡 Mình có một ý tưởng muốn trao đổi cùng mọi người: ' },
                    { label: '🤖 @apexa-brain Tổng quan công việc tuần', text: '@apexa-brain Hãy tổng quan các đầu việc quan trọng tuần này' }
                  ].map(item => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setInputVal(item.text);
                        inputRef.current?.focus();
                      }}
                      className="group p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all text-left shadow-2xs hover:-translate-y-0.5 cursor-pointer flex items-center justify-between"
                    >
                      <span className="truncate">{item.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Action Feature Cards */}
              <div className="mt-6 w-full space-y-2.5 text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block px-1">
                  Công cụ & Tiện ích nhanh
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowPollModal(true)}
                    className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 hover:border-sky-400 dark:hover:border-sky-500 hover:bg-sky-50/50 dark:hover:bg-sky-950/20 transition-all text-center group cursor-pointer shadow-2xs hover:-translate-y-0.5"
                  >
                    <div className="w-9 h-9 mx-auto rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Vote className="w-4.5 h-4.5" />
                    </div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Tạo Thăm dò</span>
                    <span className="block text-[9.5px] text-slate-400 mt-0.5">Lấy ý kiến nhóm</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowChecklistModal(true)}
                    className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all text-center group cursor-pointer shadow-2xs hover:-translate-y-0.5"
                  >
                    <div className="w-9 h-9 mx-auto rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <CheckSquare className="w-4.5 h-4.5" />
                    </div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Checklist</span>
                    <span className="block text-[9.5px] text-slate-400 mt-0.5">Danh sách việc</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowVideoMeetModal(true)}
                    className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all text-center group cursor-pointer shadow-2xs hover:-translate-y-0.5"
                  >
                    <div className="w-9 h-9 mx-auto rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Video className="w-4.5 h-4.5" />
                    </div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Họp Video</span>
                    <span className="block text-[9.5px] text-slate-400 mt-0.5">Tạo phòng nhanh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all text-center group cursor-pointer shadow-2xs hover:-translate-y-0.5"
                  >
                    <div className="w-9 h-9 mx-auto rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Paperclip className="w-4.5 h-4.5" />
                    </div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Gửi Tệp</span>
                    <span className="block text-[9.5px] text-slate-400 mt-0.5">Đính kèm tài liệu</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {messages.filter(m => !m.parentId).map((msg, idx, filtered) => {
            const isMe = msg.senderId === currentUser.id || msg.senderId === 'user';
            const isEditing = editingMsgId === msg.id;

            // Date separator logic
            let showDateSep = false;
            const msgDateLabel = getDateLabel(msg.createdAt || msg.timestamp);
            if (idx === 0 && msgDateLabel) {
              showDateSep = true;
            } else if (idx > 0 && msgDateLabel) {
              const prevLabel = getDateLabel(filtered[idx - 1].createdAt || filtered[idx - 1].timestamp);
              if (prevLabel !== msgDateLabel) showDateSep = true;
            }

            const previousMessage = filtered[idx - 1];
            const nextMessage = filtered[idx + 1];
            const groupedWithPrevious = Boolean(
              !showDateSep &&
              previousMessage &&
              previousMessage.senderId === msg.senderId &&
              Boolean(previousMessage.isAi) === Boolean(msg.isAi)
            );
            const groupedWithNext = Boolean(
              nextMessage &&
              nextMessage.senderId === msg.senderId &&
              Boolean(nextMessage.isAi) === Boolean(msg.isAi) &&
              getDateLabel(nextMessage.createdAt || nextMessage.timestamp) === msgDateLabel
            );

            return (
              <div key={msg.id} className={idx === 0 ? 'mt-auto' : undefined}>
                {/* Date Separator Pill */}
                {showDateSep && msgDateLabel && (
                  <div className="flex items-center gap-3 py-3 mb-2">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
                    <span className="px-3.5 py-1 text-[9.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-full shadow-2xs whitespace-nowrap">
                      {msgDateLabel}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
                  </div>
                )}

              <div 
                id={`msg-${msg.id}`}
                className={`group relative flex items-end gap-2 transition-all ${isMe ? 'flex-row-reverse' : ''} ${groupedWithPrevious ? 'mt-0.5' : 'mt-3'}`}
              >
                {/* Sender Avatar */}
                {!isMe && (groupedWithNext ? (
                  <div className="mb-4 h-8 w-8 shrink-0" aria-hidden="true" />
                ) : msg.isAi ? (
                  <div className="mb-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400 text-white shadow-sm ring-2 ring-white dark:ring-slate-950">
                    <Bot className="h-4.5 w-4.5" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setViewingMemberProfileId(msg.senderId)}
                    className="group/avatar mb-4 shrink-0 cursor-pointer rounded-full transition-transform hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 active:scale-95"
                    title={`Xem hồ sơ của ${msg.senderName}`}
                  >
                    <SignedImage filePath={msg.senderAvatar} alt={msg.senderName} className="h-8 w-8 shrink-0 rounded-full border border-slate-200/50 bg-slate-100 object-cover ring-2 ring-white dark:border-slate-700 dark:bg-slate-800 dark:ring-slate-950" />
                  </button>
                ))}

                {/* Message Body */}
                <div className={`flex min-w-0 max-w-[84%] flex-col space-y-1 text-left sm:max-w-[72%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && !groupedWithPrevious && (
                  <div className="flex items-center gap-2 px-1">
                    {msg.isAi ? (
                      <span className="text-[11px] font-black text-indigo-650 dark:text-indigo-400">{msg.senderName}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setViewingMemberProfileId(msg.senderId)}
                        className="text-[11px] font-black text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors text-left"
                        title={`Xem hồ sơ của ${msg.senderName}`}
                      >
                        {msg.senderName}
                      </button>
                    )}
                    {msg.isAi && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[7.5px] font-black bg-indigo-650 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide leading-none scale-90 select-none">TRỢ LÝ AI</span>
                        <button
                          onClick={() => handleToggleSpeech(msg.id, msg.content)}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-450 dark:text-slate-500 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                          title={playingMsgId === msg.id ? "Mute speech" : "Read message out loud"}
                        >
                          {playingMsgId === msg.id ? <VolumeX className="w-3.5 h-3.5 text-indigo-650 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                  )}

                  {/* Message Bubble Row with Option 3 Dots Beside It */}
                  <div className={`group/bubble relative flex items-center gap-1.5 max-w-full ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`max-w-full break-words px-3.5 py-2.5 text-xs font-medium leading-relaxed shadow-sm ${
                      isMe
                        ? `bg-gradient-to-br from-blue-600 to-indigo-600 text-white ${groupedWithNext ? 'rounded-[20px] rounded-br-md' : 'rounded-[20px]'} ${groupedWithPrevious ? 'rounded-tr-md' : ''}`
                        : msg.isAi
                          ? `border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 text-slate-800 dark:border-indigo-900/70 dark:from-indigo-950/60 dark:to-violet-950/40 dark:text-slate-100 ${groupedWithNext ? 'rounded-[20px] rounded-bl-md' : 'rounded-[20px]'} ${groupedWithPrevious ? 'rounded-tl-md' : ''}`
                          : `border border-slate-200/70 bg-slate-100 text-slate-800 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-100 ${groupedWithNext ? 'rounded-[20px] rounded-bl-md' : 'rounded-[20px]'} ${groupedWithPrevious ? 'rounded-tl-md' : ''}`
                    }`}>

                  {/* Quoted reply context (trả lời tin nhắn nào) */}
                  {msg.parentId && (() => {
                    const parentMsg = messages.find(x => x.id === msg.parentId);
                    if (!parentMsg) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => handleScrollToMessage(parentMsg.id)}
                        className="mb-1 flex w-full items-center gap-2 rounded-xl border-l-[3px] border-indigo-400 bg-slate-100/80 px-2.5 py-1.5 text-left transition-colors hover:bg-slate-200/70 cursor-pointer dark:border-indigo-500 dark:bg-slate-800/60 dark:hover:bg-slate-700/60"
                        title="Nhảy tới tin nhắn gốc"
                      >
                        <span className="shrink-0 text-[10px] font-black text-indigo-600 dark:text-indigo-400">{parentMsg.senderName}</span>
                        <span className="truncate text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">
                          {parentMsg.content || (parentMsg.attachment ? `📎 ${parentMsg.attachment.name}` : 'Tin nhắn')}
                        </span>
                      </button>
                    );
                  })()}

                  {isEditing ? (
                    <div className="space-y-2 mt-1">
                      <input 
                        type="text" 
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-indigo-400 text-xs outline-none bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleEditMessage(msg.id, editVal);
                          if (e.key === 'Escape') setEditingMsgId(null);
                        }}
                      />
                      <div className="flex gap-2 text-[9px] font-bold">
                        <button onClick={() => handleEditMessage(msg.id, editVal)} className="text-indigo-650 hover:underline cursor-pointer">Lưu thay đổi</button>
                        <button onClick={() => setEditingMsgId(null)} className="text-slate-400 hover:underline cursor-pointer">Hủy</button>
                      </div>
                    </div>
                  ) : (
                    <div className="break-words text-xs font-medium leading-relaxed text-inherit">
                      {formatMessageContent(msg.content)}
                      
                      {msg.attachment && !msg.attachment.isPoll && (
                        <div className="mt-2 select-none">
                          {msg.attachment.isVoice ? (
                            <VoiceMessagePlayer 
                              filePath={msg.attachment.filePath} 
                              duration={msg.attachment.duration} 
                            />
                          ) : msg.attachment.isImage ? (
                            <div 
                              onClick={() => setLightboxImage({
                                url: msg.attachment!.filePath,
                                name: msg.attachment!.name,
                                size: msg.attachment!.size,
                                senderName: msg.senderName,
                                timestamp: msg.timestamp
                              })}
                              className="relative rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 max-w-[260px] shadow-xs group/img bg-slate-50 dark:bg-slate-800 cursor-pointer"
                              title="Nhấn để xem ảnh phóng to"
                            >
                              <SignedImage 
                                filePath={msg.attachment.filePath} 
                                alt={msg.attachment.name}
                                bucket="chat-attachments"
                                className="max-w-[260px] max-h-[200px] object-cover hover:scale-[1.03] transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-slate-900/35 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-between p-2">
                                <span className="text-[9.5px] text-white font-bold truncate bg-slate-900/70 px-2 py-0.5 rounded-lg">{msg.attachment.name}</span>
                                <span className="p-1 rounded-lg bg-white/20 text-white backdrop-blur-xs flex items-center justify-center">
                                  <Eye className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                          ) : (msg.attachment as any)?.isVideoMeet ? (
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-sky-500/10 to-cyan-500/10 dark:from-indigo-950/40 dark:via-cyan-950/30 border border-indigo-200 dark:border-indigo-800 max-w-sm space-y-3 text-left">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                                  <Video className="w-5 h-5 animate-pulse" />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{(msg.attachment as any).meetingTitle || 'Cuộc họp Video'}</h4>
                                  <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                    Phòng họp trực tuyến sẵn sàng
                                  </span>
                                </div>
                              </div>
                              <a
                                href={(msg.attachment as any).meetingUrl || msg.attachment.filePath}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
                              >
                                <Video className="w-3.5 h-3.5" />
                                Tham gia ngay
                              </a>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 max-w-sm hover:bg-indigo-50/20 dark:hover:bg-indigo-950/40 hover:border-indigo-200/50 dark:hover:border-indigo-800/50 transition-colors">
                              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                                <Globe className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1 text-left">
                                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{msg.attachment.name}</span>
                                <span className="block text-[9.5px] text-slate-400 dark:text-slate-500 font-bold mt-0.5 uppercase tracking-wider font-mono">
                                  {msg.attachment.size ? `${(msg.attachment.size / 1024).toFixed(1)} KB` : 'FILE'}
                                </span>
                              </div>
                              <ChatAttachmentDownload filePath={msg.attachment.filePath} name={msg.attachment.name} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  </div>

                  {/* UI Option 3 Chấm Kế Bên Tin Nhắn */}
                  {(!msg.deliveryState || msg.deliveryState === 'sent') && (
                    <div className="relative shrink-0 flex items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setReactionPickerMsgId(null);
                          setMoreMenuMsgId(moreMenuMsgId === msg.id ? null : msg.id);
                        }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer select-none ${
                          moreMenuMsgId === msg.id || reactionPickerMsgId === msg.id
                            ? 'opacity-100 border-indigo-300 dark:border-indigo-600 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md scale-105'
                            : 'opacity-0 group-hover:opacity-100 group-hover/bubble:opacity-100 border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 text-slate-400 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-800 hover:scale-110 shadow-xs'
                        }`}
                        title="Tùy chọn tin nhắn"
                        aria-label="Tùy chọn tin nhắn"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* Options Dropdown Menu */}
                      {moreMenuMsgId === msg.id && (
                        <>
                          <div className="fixed inset-0 z-30 cursor-default" onClick={() => setMoreMenuMsgId(null)} />
                          <div className={`absolute ${idx < 3 ? 'top-full mt-1.5' : 'bottom-full mb-1.5'} z-40 w-52 rounded-2xl border border-slate-200/90 bg-white/98 p-1.5 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/98 animate-fadeIn ${isMe ? 'right-0' : 'left-0'}`}>
                            {/* Quick Reactions Header */}
                            <div className="flex items-center justify-between gap-1 px-1 py-1 border-b border-slate-100 dark:border-slate-800 mb-1">
                              {['👍', '❤️', '😂', '🎉', '🔥'].map(emoji => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => {
                                    handleAddReaction(msg.id, emoji);
                                    setMoreMenuMsgId(null);
                                  }}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-sm select-none transition-transform hover:scale-125"
                                  title={`Thả ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setMoreMenuMsgId(null);
                                  setReactionPickerMsgId(msg.id);
                                }}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-slate-400 hover:text-indigo-600 transition-colors"
                                title="Thêm biểu cảm khác"
                              >
                                <SmilePlus className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Actions list */}
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingToMessage(msg);
                                inputRef.current?.focus();
                                setMoreMenuMsgId(null);
                              }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                            >
                              <CornerUpLeft className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Trả lời (Reply)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleCopyMessage(msg.content);
                                setMoreMenuMsgId(null);
                              }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Sao chép nội dung</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleOpenThread(msg);
                                setMoreMenuMsgId(null);
                              }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-sky-500" />
                              <span>Phản hồi luồng</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleTogglePinMessage(msg.id, !msg.isPinned);
                                setMoreMenuMsgId(null);
                              }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                            >
                              {msg.isPinned ? <PinOff className="w-3.5 h-3.5 text-amber-500" /> : <Pin className="w-3.5 h-3.5 text-amber-500" />}
                              <span>{msg.isPinned ? "Bỏ ghim tin nhắn" : "Ghim tin nhắn"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setForwardingMessage(msg);
                                setMoreMenuMsgId(null);
                              }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                            >
                              <Forward className="w-3.5 h-3.5 text-blue-500" />
                              <span>Chuyển tiếp</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleTranslateMessage(msg.id, msg.content);
                                setMoreMenuMsgId(null);
                              }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                            >
                              {translatingMsgId === msg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" /> : <Globe className="w-3.5 h-3.5 text-indigo-500" />}
                              <span>{translatedMessages[msg.id] ? "Ẩn bản dịch" : "Dịch bằng AI"}</span>
                            </button>

                            {onAddTask && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleOpenConvertModal(msg);
                                  setMoreMenuMsgId(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                              >
                                <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Tạo Task</span>
                              </button>
                            )}

                            {/* Owner Actions */}
                            {isMe && msg.deliveryState === 'sent' && (
                              <>
                                <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMsgId(msg.id);
                                    setEditVal(msg.content);
                                    setMoreMenuMsgId(null);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Chỉnh sửa</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDeleteMessage(msg.id);
                                    setMoreMenuMsgId(null);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-left"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Xóa tin nhắn</span>
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}

                      {/* Full Reaction Picker Popover */}
                      {reactionPickerMsgId === msg.id && (
                        <>
                          <div className="fixed inset-0 z-30 cursor-default" onClick={() => setReactionPickerMsgId(null)} />
                          <div className={`absolute ${idx < 3 ? 'top-full mt-1.5' : 'bottom-full mb-1.5'} p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl z-40 w-[232px] animate-fadeIn ${isMe ? 'right-0' : 'left-0'}`}>
                            <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider px-1 pb-1.5">Chọn biểu cảm</div>
                            <div className="grid grid-cols-7 gap-0.5">
                              {['😀', '😂', '😍', '🥳', '😎', '🤔', '😭', '👍', '🙌', '🤝', '👏', '🙏', '💪', '🔥', '🎉', '🚀', '❤️', '💜', '💡', '🧠', '👀', '💯', '✅', '⚡', '☕', '🏆', '🎯', '🤯'].map(emoji => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => { handleAddReaction(msg.id, emoji); setReactionPickerMsgId(null); }}
                                  className="w-7 h-7 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center justify-center text-sm select-none cursor-pointer transition-all hover:scale-110 active:scale-95"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                  {!groupedWithNext && (
                    <div className={`flex min-h-4 items-center gap-1.5 px-1 text-[9.5px] font-medium text-slate-400 dark:text-slate-500 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span className="font-mono tabular-nums tracking-tight">
                        {msg.createdAt && !Number.isNaN(new Date(msg.createdAt).getTime())
                          ? new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                          : msg.timestamp}
                      </span>
                      {msg.editedAt && <span>· đã chỉnh sửa</span>}
                      {isMe && (
                        msg.deliveryState === 'failed' ? (
                          <span className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleRetryMessage(msg.id)}
                              className="flex items-center gap-1 rounded-full px-1 py-0.5 font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                              title="Gửi lại tin nhắn"
                            >
                              <AlertCircle className="h-3 w-3" />
                              Thử lại
                            </button>
                            <button type="button" onClick={() => handleDeleteMessage(msg.id)} className="rounded-full p-0.5 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800" title="Xóa tin nhắn lỗi">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ) : msg.deliveryState === 'sending' ? (
                          <span className="flex items-center gap-1" title={isOffline ? 'Đang chờ kết nối' : 'Đang gửi'}>
                            {isOffline ? <WifiOff className="h-3 w-3" /> : <RefreshCw className="h-3 w-3 animate-spin" />}
                            {isOffline ? 'Chờ mạng' : 'Đang gửi'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5" title="Đã gửi">
                            <Check className="h-3 w-3" /> Đã gửi
                          </span>
                        )
                      )}
                    </div>
                  )}

                  {/* Interactive Poll Rendering */}
                  {msg.attachment?.isPoll && (
                    <div className="mt-2.5 p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2.5 max-w-[90%] sm:max-w-md text-left select-none">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="text-xs font-black text-slate-800 dark:text-slate-100">{msg.attachment.question}</span>
                      </div>
                      <div className="space-y-2">
                        {(() => {
                          const options = msg.attachment.options || [];
                          const totalVotes = options.reduce((acc: number, opt: any) => acc + (opt.votes?.length || 0), 0);
                          return options.map((opt: any) => {
                            const voteCount = opt.votes?.length || 0;
                            const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                            const hasVoted = (opt.votes || []).includes(currentUser.id || 'user');
                            return (
                              <div 
                                key={opt.id}
                                onClick={() => handleVotePoll(msg.id, opt.id)}
                                className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all relative overflow-hidden flex items-center justify-between ${
                                  hasVoted 
                                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold' 
                                    : 'border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <div 
                                  className="absolute left-0 top-0 bottom-0 bg-indigo-500/15 dark:bg-indigo-500/25 transition-all duration-500 pointer-events-none"
                                  style={{ width: `${pct}%` }}
                                />
                                <span className="relative z-10 font-bold">{opt.text}</span>
                                <span className="relative z-10 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                                  {voteCount} phiếu ({pct}%)
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Inline Translation Box */}
                  {translatedMessages[msg.id] && (
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1 text-left animate-fadeIn">
                      <div className="flex items-center gap-1.5 text-[9.5px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                        <Globe className="w-3 h-3 text-indigo-500" />
                        Bản dịch AI:
                      </div>
                      <p className="italic font-semibold">{translatedMessages[msg.id]}</p>
                    </div>
                  )}

                  {/* Render Reactions list */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.reactions.map((react, rIdx) => (
                        <button 
                          key={rIdx}
                          onClick={() => handleAddReaction(msg.id, react.emoji)}
                          className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer select-none"
                        >
                          <span>{react.emoji}</span>
                          <span className="font-bold text-slate-500 font-mono text-[9px]">{react.count}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Thread replies indicator */}
                  {messages.filter(m => m.parentId === msg.id).length > 0 && (
                    <button 
                      onClick={() => handleOpenThread(msg)}
                      className="mt-1 flex items-center gap-1 text-[10px] font-black text-indigo-650 hover:text-indigo-755 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-0.5 transition-colors cursor-pointer select-none"
                    >
                      <MessageSquare className="w-3 h-3 fill-indigo-100 text-indigo-500" />
                      <span>{messages.filter(m => m.parentId === msg.id).length} phản hồi</span>
                    </button>
                  )}
                </div>
              </div>
              </div>
            );
          })}

          {/* AI typing simulation tracker */}
          {isAiTyping && activeChannelId.endsWith('apexa-brain-ai') && (
            <div className="flex gap-3 items-start animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                <Bot className="w-4.5 h-4.5 animate-spin" />
              </div>
              <div className="space-y-1 text-left">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">AI Apexa Brain</span>
                <div className="flex gap-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 max-w-sm">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {typingUsers.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold px-2 py-1 select-none animate-pulse">
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span>
                {typingUsers.length === 1 
                  ? `${typingUsers[0]} đang nhập...` 
                  : `${typingUsers.join(', ')} đang nhập...`}
              </span>
            </div>
          )}

          <div ref={messageEndRef} />
        </div>

        {newMessagesBelow > 0 && (
          <button
            type="button"
            onClick={() => scrollToBottom()}
            className="absolute bottom-[86px] left-1/2 z-30 -translate-x-1/2 rounded-full border border-indigo-200/80 bg-white/95 px-3.5 py-2 text-[10.5px] font-black text-indigo-650 shadow-xl backdrop-blur-md transition-all hover:-translate-y-0.5 dark:border-indigo-800 dark:bg-slate-900/95 dark:text-indigo-300"
          >
            <ChevronDown className="mr-1 inline h-3.5 w-3.5" />
            {newMessagesBelow} tin nhắn mới
          </button>
        )}

        {/* Rich Emoji & Sticker Picker popover */}
        {showEmojiPicker && (
          <>
            <div className="fixed inset-0 z-30 cursor-default" onClick={() => setShowEmojiPicker(false)} />
            <div className="absolute bottom-16 right-4 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl z-40 w-72 animate-fadeIn text-left">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Smile className="w-4 h-4 text-indigo-500" />
                  Biểu cảm & Emoji
                </span>
                <button 
                  type="button" 
                  onClick={() => setShowEmojiPicker(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div className="space-y-2">
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Phổ biến & Công việc</div>
                <div className="grid grid-cols-7 gap-1 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                  {[
                    '😀', '😂', '😍', '🥳', '😎', '🤔', '😇',
                    '👍', '🙌', '🤝', '👏', '🙏', '💪', '🔥',
                    '🎉', '🚀', '⭐', '✨', '❤️', '💡', '🧠',
                    '📋', '📦', '📅', '📊', '📌', '🏷️', '✅',
                    '💯', '🏆', '🎯', '⚡', '☕', '👀', '🛡️'
                  ].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setInputVal(prev => prev + emoji);
                        setShowEmojiPicker(false);
                        inputRef.current?.focus();
                      }}
                      className="w-8 h-8 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center justify-center text-base select-none cursor-pointer transition-all hover:scale-110 active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* GIF Gallery Popover */}
        {showGifPicker && (
          <>
            <div className="fixed inset-0 z-30 cursor-default" onClick={() => setShowGifPicker(false)} />
            <div className="absolute bottom-16 right-4 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl z-40 w-80 animate-fadeIn text-left space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-black">GIF</span>
                  Kho Ảnh Động & Sticker
                </span>
                <button 
                  type="button" 
                  onClick={() => setShowGifPicker(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input 
                  type="text" 
                  value={gifSearch}
                  onChange={e => setGifSearch(e.target.value)}
                  placeholder="Tìm kiếm GIF theo từ khóa..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none font-semibold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                {['All', 'Congrats', 'Agree', 'Mindblown', 'Work', 'Fire', 'Thanks', 'Laugh', 'Love'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setGifCategory(cat)}
                    className={`px-2 py-0.5 text-[9.5px] font-bold rounded-lg transition-colors shrink-0 cursor-pointer ${
                      gifCategory === cat 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                {GIF_GALLERY
                  .filter(g => gifCategory === 'All' || g.category === gifCategory)
                  .filter(g => !gifSearch.trim() || g.title.toLowerCase().includes(gifSearch.toLowerCase()))
                  .map(gif => (
                    <button
                      key={gif.id}
                      type="button"
                      onClick={() => handleSendGif(gif)}
                      className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-video hover:border-indigo-500 transition-all cursor-pointer shadow-xs"
                    >
                      <img src={gif.url} alt={gif.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                        <span className="text-[9px] font-bold text-white truncate bg-slate-900/70 px-1.5 py-0.5 rounded-md">{gif.title}</span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </>
        )}

        {/* ── MESSENGER-STANDARD CHAT INPUT AREA ── */}
        <div className="px-3.5 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+10px)] bg-white/90 dark:bg-[#0a0a0a]/90 border-t border-slate-200/70 dark:border-slate-800/80 backdrop-blur-xl shrink-0 z-30">
          {isOffline && (
            <div className="mx-auto mb-2 flex max-w-7xl items-center justify-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
              <WifiOff className="h-3.5 w-3.5" />
              Đang ngoại tuyến — tin nhắn sẽ tự gửi khi kết nối trở lại
            </div>
          )}
          <form onSubmit={handleSendMessage} className="relative flex flex-col gap-2 max-w-7xl mx-auto select-text">

            {/* Reply Preview Bar */}
            {replyingToMessage && (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/70 text-xs text-slate-700 dark:text-slate-200 shadow-xs animate-fadeIn">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-1 h-7 rounded-full bg-indigo-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10.5px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      Đang trả lời {replyingToMessage.senderName}
                    </span>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                      {replyingToMessage.content || (replyingToMessage.attachment ? `📎 ${replyingToMessage.attachment.name}` : 'Tin nhắn')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingToMessage(null)}
                  className="p-1.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
                  title="Hủy trả lời"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Selected File / Image Preview Widget */}
            {selectedFile && (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs animate-fadeIn">
                <div className="flex items-center gap-2.5 truncate">
                  {selectedFile.url && selectedFile.type.startsWith('image/') ? (
                    <img src={selectedFile.url} alt="Preview" className="w-9 h-9 rounded-xl object-cover border border-slate-300 dark:border-slate-600 shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                      📎
                    </div>
                  )}
                  <div className="truncate">
                    <span className="block font-bold text-slate-800 dark:text-slate-100 truncate">{selectedFile.name}</span>
                    <span className="block text-[9.5px] text-slate-400 font-mono">{selectedFile.size ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Tệp đính kèm'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 25 * 1024 * 1024) {
                    triggerToast?.('error', 'File quá lớn', 'Giới hạn file đính kèm là 25 MB.');
                    e.target.value = '';
                    return;
                  }
                  const isImg = file.type.startsWith('image/');
                  setSelectedFile({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url: isImg ? URL.createObjectURL(file) : undefined,
                    file
                  });
                  triggerToast?.('success', 'Tệp đã chọn 📎', `Đã sẵn sàng gửi: ${file.name}`);
                  e.target.value = '';
                }
              }}
            />

            {/* Audio Recording Live Bar (Messenger Standard) */}
            {isRecording ? (
              <div className="flex items-center justify-between px-4 py-3 rounded-[24px] bg-rose-500/10 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800/80 shadow-md text-xs font-semibold text-rose-600 dark:text-rose-400 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping absolute" />
                    <span className="w-3 h-3 rounded-full bg-rose-600 relative" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-sm font-black text-rose-600 dark:text-rose-300">00:{recordingDuration < 10 ? `0${recordingDuration}` : recordingDuration}</span>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-1.5">Đang ghi âm thoại...</span>
                  </div>
                  {/* Animated Waveform indicator */}
                  <div className="hidden sm:flex items-center gap-1 ml-3 h-4">
                    {[40, 70, 30, 90, 50, 80, 40, 60].map((h, i) => (
                      <span key={i} className="w-1 bg-rose-500/70 dark:bg-rose-400/80 rounded-full animate-pulse" style={{ height: `${h}%`, animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (mediaRecorderRef.current && isRecording) {
                        autoSendVoiceRef.current = false;
                        mediaRecorderRef.current.stop();
                      }
                      setIsRecording(false);
                      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
                      triggerToast?.('info', 'Đã hủy', 'Đã xóa bản ghi âm.');
                    }}
                    className="px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-600 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hủy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => stopRecording(true)}
                    className="px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                    title="Gửi ngay tin nhắn thoại"
                  >
                    <Send className="w-3.5 h-3.5 fill-current" />
                    <span>Gửi thoại</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Unified Modern Chat Composer Bar */
              <div className="w-full bg-slate-100/80 dark:bg-[#11131a] focus-within:bg-white dark:focus-within:bg-[#0c0d14] border border-slate-200/90 dark:border-slate-800 focus-within:border-indigo-500/80 dark:focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/15 rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 transition-all shadow-xs flex items-end gap-1 sm:gap-1.5 relative">
                {/* Left Action: Expandable Tools Menu (+) */}
                <div className="relative shrink-0 select-none">
                  <button
                    type="button"
                    onClick={() => setShowToolsMenu(!showToolsMenu)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      showToolsMenu
                        ? 'bg-indigo-600 text-white shadow-md rotate-45'
                        : 'hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300'
                    }`}
                    title="Công cụ mở rộng & Định dạng"
                  >
                    <Plus className="w-4 h-4 transition-transform duration-200" />
                  </button>

                  {/* Expandable Tools Popover Grid */}
                  {showToolsMenu && (
                    <>
                      <div className="fixed inset-0 z-40 cursor-default" onClick={() => setShowToolsMenu(false)} />
                      <div className="absolute left-0 bottom-11 bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl p-2.5 z-50 min-w-[260px] animate-fadeIn text-left space-y-2">
                        <div className="px-2 py-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Khung công cụ nhắn tin</span>
                          <button type="button" onClick={() => setShowToolsMenu(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        {/* Formatting Tools Row */}
                        <div className="flex items-center gap-1 px-1 py-1 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 justify-around">
                          <button type="button" onClick={() => { insertFormatting('bold'); setShowToolsMenu(false); }} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer" title="In đậm (**text**)">
                            <Bold className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => { insertFormatting('italic'); setShowToolsMenu(false); }} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer" title="In nghiêng (*text*)">
                            <Italic className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => { insertFormatting('code'); setShowToolsMenu(false); }} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer" title="Khối mã (`code`)">
                            <Code className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => { insertFormatting('quote'); setShowToolsMenu(false); }} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer" title="Trích dẫn (> quote)">
                            <Quote className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Feature Apps List */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => { setShowVideoMeetModal(true); setShowToolsMenu(false); }}
                            className="flex items-center gap-2 p-2 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer text-left"
                          >
                            <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                              <Video className="w-3.5 h-3.5" />
                            </div>
                            <span>Họp Video</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => { setShowPollModal(true); setShowToolsMenu(false); }}
                            className="flex items-center gap-2 p-2 rounded-2xl hover:bg-sky-50 dark:hover:bg-sky-950/40 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer text-left"
                          >
                            <div className="w-7 h-7 rounded-xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                              <Vote className="w-3.5 h-3.5" />
                            </div>
                            <span>Tạo Thăm dò</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => { setShowChecklistModal(true); setShowToolsMenu(false); }}
                            className="flex items-center gap-2 p-2 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer text-left"
                          >
                            <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <CheckSquare className="w-3.5 h-3.5" />
                            </div>
                            <span>Tạo Checklist</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => { setShowTemplateModal(true); setShowToolsMenu(false); }}
                            className="flex items-center gap-2 p-2 rounded-2xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer text-left"
                          >
                            <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <span>Mẫu tin nhắn</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => { setShowAutomationModal(true); setShowToolsMenu(false); }}
                            className="flex items-center gap-2 p-2 rounded-2xl hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer text-left"
                          >
                            <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                              <Zap className="w-3.5 h-3.5" />
                            </div>
                            <span>Tự động hóa</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Left Action: Media / File Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center justify-center cursor-pointer active:scale-95 shrink-0 select-none"
                  title="Đính kèm Ảnh & Tệp"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                {/* Center: Textarea Input with Autocompletes */}
                <div className="flex-1 min-w-0 py-1 px-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputVal}
                    onChange={handleInputChange}
                    onBlur={() => sendTypingState(false)}
                    maxLength={MAX_CHAT_MESSAGE_LENGTH}
                    placeholder={
                      isSelfDm
                        ? `Nhắn tin cho chính bạn... (Space cho AI, / lệnh)`
                        : activeChannel?.name.includes('ai')
                          ? "Hỏi Apexa Brain AI bất cứ điều gì..."
                          : `Nhắn tin đến ${isDm && dmMember ? dmMember.name : (activeChannel?.name || 'chat')}...`
                    }
                    rows={1}
                    className="w-full bg-transparent border-0 outline-none ring-0 shadow-none text-xs sm:text-[13px] font-medium placeholder-slate-400 dark:placeholder-slate-500 text-slate-800 dark:text-slate-100 resize-none max-h-36 min-h-[22px] custom-scrollbar p-0 leading-relaxed focus:outline-hidden focus:outline-none focus:ring-0 focus:border-0 focus-visible:outline-none focus-visible:ring-0"
                    style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                    onKeyDown={e => {
                      if (showCommandDropdown && filteredCommands.length > 0) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setActiveCommandIndex(prev => (prev + 1) % filteredCommands.length);
                          return;
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setActiveCommandIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
                          return;
                        }
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSelectCommand(filteredCommands[activeCommandIndex]);
                          return;
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          setShowCommandDropdown(false);
                          return;
                        }
                      }

                      // Quick edit last message on ArrowUp when input is empty
                      if (!inputVal.trim() && e.key === 'ArrowUp' && !editingMsgId && !showCommandDropdown && !showMentionDropdown) {
                        const myLastMsg = [...messages].reverse().find(m => (m.senderId === currentUser.id || m.senderId === 'user') && !m.isAi && m.content?.trim());
                        if (myLastMsg) {
                          e.preventDefault();
                          setEditingMsgId(myLastMsg.id);
                          setEditVal(myLastMsg.content);
                          handleScrollToMessage(myLastMsg.id);
                          return;
                        }
                      }

                      if (chatSettings.enterToSend && e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />

                  {/* Autocomplete Dropdowns */}
                  {showMentionDropdown && filteredMentionMembers.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 min-w-[200px] max-h-[180px] overflow-y-auto animate-fadeIn">
                      <div className="px-2 py-1 mb-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Gợi ý thành viên</span>
                      </div>
                      {filteredMentionMembers.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSelectMention(m)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer text-left"
                        >
                          <SignedImage filePath={m.avatar} alt={m.name} className="w-5 h-5 rounded-full" />
                          <span className="text-[10.5px] font-bold text-slate-700 dark:text-slate-200">{m.name}</span>
                          <span className="text-[9px] font-semibold text-slate-400 ml-auto">{m.role}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {showCommandDropdown && filteredCommands.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-[60] min-w-[240px] max-h-[220px] overflow-y-auto animate-fadeIn">
                      <div className="px-2 py-1 mb-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Lệnh nhanh Slash (/)</span>
                      </div>
                      {filteredCommands.map((cmd, idx) => (
                        <button
                          key={cmd.name}
                          type="button"
                          onClick={() => handleSelectCommand(cmd)}
                          className={`w-full flex flex-col gap-0.5 px-2.5 py-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer text-left ${idx === activeCommandIndex ? 'bg-indigo-50 dark:bg-indigo-950/20 font-bold' : ''}`}
                        >
                          <span className="text-[10.5px] font-black text-indigo-600 dark:text-indigo-400">{cmd.name}</span>
                          <span className="text-[9px] font-bold text-slate-400">{cmd.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Actions: Voice Memo, AI, GIF, Emoji, and Send/Like */}
                <div className="flex items-center gap-0.5 sm:gap-1 text-slate-400 shrink-0 select-none pb-0.5">
                  {inputVal.length > 3600 && (
                    <span className={`text-[9px] font-bold tabular-nums pr-1 ${inputVal.length >= MAX_CHAT_MESSAGE_LENGTH ? 'text-rose-500' : 'text-slate-400'}`}>
                      {inputVal.length}/{MAX_CHAT_MESSAGE_LENGTH}
                    </span>
                  )}

                  {/* Mic Button */}
                  <button
                    type="button"
                    onClick={startRecording}
                    className="w-8 h-8 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-all flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
                    title="Ghi âm giọng nói"
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  {/* AI Assistant Popover inside Bar */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAiEnhanceMenu(!showAiEnhanceMenu)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/40 ${showAiEnhanceMenu ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'text-amber-500/80 hover:text-amber-500'}`}
                      title="AI Trợ lý viết & Tối ưu văn bản"
                    >
                      <Sparkles className={`w-4 h-4 text-amber-500 ${isAiEnhancing ? 'animate-spin' : ''}`} />
                    </button>

                    {showAiEnhanceMenu && (
                      <>
                        <div className="fixed inset-0 z-40 cursor-default" onClick={() => setShowAiEnhanceMenu(false)} />
                        <div className="absolute right-0 bottom-11 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 min-w-[210px] text-left animate-fadeIn">
                          <div className="px-2.5 py-1 mb-1 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Trợ lý viết AI Apexa</span>
                          </div>
                          <button type="button" onClick={() => handleAiEnhanceInput('expand')} className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 rounded-xl transition-colors cursor-pointer flex items-center gap-2">
                            🪄 Viết tiếp & Mở rộng ý
                          </button>
                          <button type="button" onClick={() => handleAiEnhanceInput('formal')} className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 rounded-xl transition-colors cursor-pointer flex items-center gap-2">
                            👔 Viết lại trang trọng
                          </button>
                          <button type="button" onClick={() => handleAiEnhanceInput('shorten')} className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 rounded-xl transition-colors cursor-pointer flex items-center gap-2">
                            🎯 Tóm tắt ngắn gọn
                          </button>
                          <button type="button" onClick={() => handleAiEnhanceInput('translate')} className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 rounded-xl transition-colors cursor-pointer flex items-center gap-2">
                            🌐 Dịch sang Tiếng Anh
                          </button>
                          <button type="button" onClick={() => handleAiEnhanceInput('spelling')} className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 rounded-xl transition-colors cursor-pointer flex items-center gap-2">
                            ✏️ Sửa lỗi chính tả
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* GIF Picker Trigger */}
                  <button
                    type="button"
                    onClick={() => setShowGifPicker(!showGifPicker)}
                    className={`h-8 px-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer text-[10px] font-black tracking-wider flex items-center ${showGifPicker ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                    title="Kho GIF & Sticker"
                  >
                    GIF
                  </button>

                  {/* Emoji Picker Trigger */}
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-800 ${showEmojiPicker ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                    title="Biểu cảm Emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </button>

                  {/* Divider */}
                  <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5" />

                  {/* Send or Quick Like Button */}
                  {inputVal.trim() || selectedFile ? (
                    <button
                      type="submit"
                      className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm shadow-blue-500/30 flex items-center justify-center cursor-pointer active:scale-90 transition-all shrink-0"
                      title="Gửi tin nhắn (Enter)"
                    >
                      <Send className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                        handleSendMessage(fakeEvent, '👍');
                      }}
                      className="w-8 h-8 rounded-full hover:bg-amber-100/70 dark:hover:bg-amber-950/50 text-amber-500 transition-all flex items-center justify-center cursor-pointer active:scale-90 text-base hover:scale-110 shrink-0"
                      title="Gửi Thumbs Up 👍"
                    >
                      👍
                    </button>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

      </div>

      {/* ── COLUMN 3: Chat Details Panel (w-[240px]) ── */}
      <AnimatePresence>
        {showMemberDrawer && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0a0a0a] flex flex-col justify-between shrink-0 text-left overflow-hidden absolute md:relative right-0 inset-y-0 z-40 h-full backdrop-blur-xl md:backdrop-blur-none"
          >
            <div className="p-4 space-y-4 flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Chi tiết cuộc trò chuyện</span>
                <button onClick={() => setShowMemberDrawer(false)} className="p-0.5 rounded-md hover:bg-slate-150 text-slate-400 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              </div>

              {/* Tab selectors */}
              <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-[10px] font-black tracking-wide uppercase shrink-0">
                {[
                  { id: 'members' as const, label: 'Người' },
                  { id: 'pinned' as const, label: 'Ghim', count: messages.filter(m => m.isPinned).length },
                  { id: 'search' as const, label: 'Tìm' },
                  { id: 'files' as const, label: 'Tệp' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSidebarTab(tab.id)}
                    className={`py-1.5 px-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      activeSidebarTab === tab.id 
                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs font-black' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {typeof tab.count === 'number' && tab.count > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black bg-amber-500 text-white leading-tight">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
                {activeSidebarTab === 'members' && (
                  <div className="space-y-2">
                    {members.map(m => (
                      <div 
                        key={m.id} 
                        onClick={() => setViewingMemberProfileId(m.id)}
                        className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors group/m"
                        title={`Xem hồ sơ của ${m.name}`}
                      >
                        <div className="relative shrink-0 flex">
                          <SignedImage filePath={m.avatar} alt={m.name} className="w-6.5 h-6.5 rounded-full border border-slate-200/50 dark:border-slate-700 object-cover bg-white dark:bg-slate-800 animate-fadeIn group-hover/m:scale-105 transition-transform" />
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${presenceDotClass(m.status, true)}`} />
                        </div>
                        <div className="min-w-0 leading-none">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block truncate group-hover/m:text-indigo-600 dark:group-hover/m:text-indigo-400 transition-colors">{m.name}</span>
                          <span className="text-[8px] text-slate-400 font-medium block mt-0.5">{m.role === 'admin' ? 'PM' : 'Developer'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeSidebarTab === 'pinned' && (
                  <div className="space-y-2">
                    {messages.filter(m => m.isPinned).map(m => (
                      <div
                        key={m.id}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/40 text-[10.5px] text-left hover:border-amber-400 dark:hover:border-amber-600 transition-colors shadow-2xs group/pin"
                      >
                        <div className="flex items-center justify-between mb-1.5 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                          <span className="font-black text-amber-600 dark:text-amber-400 flex items-center gap-1 truncate">
                            <Pin className="w-2.5 h-2.5 fill-amber-500 text-amber-500 shrink-0" />
                            {m.senderName}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span>{m.timestamp}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePinMessage(m.id, true);
                              }}
                              className="opacity-0 group-hover/pin:opacity-100 p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
                              title="Bỏ ghim tin nhắn"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 font-medium break-words leading-relaxed mb-2">
                          {m.content || (m.attachment ? `📎 ${m.attachment.name}` : '')}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (m.parentId) {
                              const parent = messages.find(x => x.id === m.parentId);
                              if (parent) {
                                handleOpenThread(parent);
                                handleScrollToMessage(parent.id);
                                return;
                              }
                            }
                            handleScrollToMessage(m.id);
                          }}
                          className="w-full py-1 px-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold text-[9.5px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <ArrowRight className="w-3 h-3" />
                          <span>Xem tin nhắn</span>
                        </button>
                      </div>
                    ))}
                    {messages.filter(m => m.isPinned).length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        <Pin className="w-6 h-6 mx-auto mb-2 opacity-30 text-slate-400" />
                        <p className="text-[10.5px] font-bold">Chưa có tin nhắn nào được ghim</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">Di chuột vào tin nhắn và chọn Ghim</p>
                      </div>
                    )}
                  </div>
                )}

                {activeSidebarTab === 'search' && (
                  <div className="space-y-3">
                    <div className="relative shrink-0">
                      <input 
                        type="text" 
                        value={localSearchQuery}
                        onChange={e => setLocalSearchQuery(e.target.value)}
                        placeholder="Tìm tin nhắn..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 outline-none text-[11px] font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 transition-colors"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>

                    <div className="space-y-2.5">
                      {localSearchQuery.trim() ? (
                        messages.filter(m => m.content.toLowerCase().includes(localSearchQuery.toLowerCase())).map(m => (
                          <div
                            key={m.id}
                            onClick={() => {
                              if (m.parentId) {
                                const parent = messages.find(x => x.id === m.parentId);
                                if (parent) {
                                  handleOpenThread(parent);
                                  handleScrollToMessage(parent.id);
                                  return;
                                }
                              }
                              handleScrollToMessage(m.id);
                            }}
                            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[10.5px] text-left hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer group/sr"
                            title="Nhảy tới tin nhắn này"
                          >
                            <div className="flex justify-between font-bold text-slate-500 dark:text-slate-400 text-[9px] mb-1">
                              <span className="group-hover/sr:text-indigo-600 dark:group-hover/sr:text-indigo-400 transition-colors">{m.senderName}{m.parentId ? ' · trong luồng' : ''}</span>
                              <span>{m.timestamp}</span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 font-semibold break-words leading-normal">
                              {highlightSearchText(m.content, localSearchQuery)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-slate-400 font-bold text-center py-4">Nhập từ khóa để tìm kiếm tin nhắn</p>
                      )}
                    </div>
                  </div>
                )}

                {activeSidebarTab === 'files' && (
                  <div className="space-y-2">
                    {messages.filter(m => m.attachment).map(m => {
                      const file = m.attachment!;
                      return (
                        <div key={m.id} className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-left hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors">
                          {file.isVoice ? (
                            <div className="p-2 rounded-lg bg-rose-50 text-rose-600 shrink-0">
                              <Mic className="w-4 h-4" />
                            </div>
                          ) : file.isImage ? (
                            <div 
                              onClick={() => setLightboxImage({
                                url: file.filePath,
                                name: file.name,
                                size: file.size,
                                senderName: m.senderName,
                                timestamp: m.timestamp
                              })}
                              className="cursor-pointer"
                              title="Xem ảnh phóng to"
                            >
                              <SignedImage filePath={file.filePath} alt={file.name} bucket="chat-attachments" className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shrink-0 hover:opacity-85 transition-opacity" />
                            </div>
                          ) : (
                            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                              <Globe className="w-4 h-4" />
                            </div>
                          )}
                          <div 
                            className={`min-w-0 flex-1 ${file.isImage ? 'cursor-pointer' : ''}`}
                            onClick={() => {
                              if (file.isImage) {
                                setLightboxImage({
                                  url: file.filePath,
                                  name: file.name,
                                  size: file.size,
                                  senderName: m.senderName,
                                  timestamp: m.timestamp
                                });
                              }
                            }}
                          >
                            <span className={`block text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate ${file.isImage ? 'hover:text-indigo-600 dark:hover:text-indigo-400' : ''}`}>{file.name}</span>
                            <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider font-mono mt-0.5">
                              {file.isVoice ? 'Audio Voice' : file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'File'}
                            </span>
                          </div>
                          <a 
                            href={file.filePath} 
                            download={file.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
                            title={`Tải ${file.name}`}
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      );
                    })}
                    {messages.filter(m => m.attachment).length === 0 && (
                      <p className="text-[10px] text-slate-400 font-bold text-center py-4">Chưa có tài liệu hay tệp tin nào</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Thread Panel ── */}
      <AnimatePresence>
        {activeThreadMessage && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0a0a0a] flex flex-col justify-between shrink-0 text-left overflow-hidden absolute md:relative right-0 inset-y-0 z-40 h-full backdrop-blur-xl md:backdrop-blur-none"
          >
            <div className="p-4 space-y-4 flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Thảo luận theo luồng</span>
                <button onClick={() => setActiveThreadMessage(null)} className="p-0.5 rounded-md hover:bg-slate-150 text-slate-400 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              </div>

              {/* Parent Message Bubble */}
              <div className="p-3 bg-indigo-50/30 border border-indigo-100/50 rounded-2xl shrink-0 text-left">
                <div className="flex items-center gap-2 mb-1.5">
                  <button
                    type="button"
                    onClick={() => setViewingMemberProfileId(activeThreadMessage.senderId)}
                    className="flex items-center gap-2 focus:outline-none cursor-pointer group/threadparent text-left"
                    title={`Xem hồ sơ của ${activeThreadMessage.senderName}`}
                  >
                    <SignedImage filePath={activeThreadMessage.senderAvatar} alt={activeThreadMessage.senderName} className="w-5.5 h-5.5 rounded-full object-cover group-hover/threadparent:opacity-85 transition-opacity" />
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 group-hover/threadparent:text-indigo-600 dark:group-hover/threadparent:text-indigo-400 transition-colors">{activeThreadMessage.senderName}</span>
                  </button>
                  <span className="text-[9px] text-slate-400 ml-auto font-medium">{activeThreadMessage.timestamp}</span>
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-200 leading-normal font-medium break-words">
                  {formatMessageContent(activeThreadMessage.content)}
                </div>
              </div>

              {/* Sub-Thread Replies Stream */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
                {messages.filter(m => m.parentId === activeThreadMessage.id).map(reply => (
                  <div key={reply.id} className="flex gap-2.5 items-start text-left p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setViewingMemberProfileId(reply.senderId)}
                      className="focus:outline-none cursor-pointer shrink-0"
                      title={`Xem hồ sơ của ${reply.senderName}`}
                    >
                      <SignedImage filePath={reply.senderAvatar} alt={reply.senderName} className="w-6.5 h-6.5 rounded-full border border-slate-200/50 dark:border-slate-700 object-cover bg-white dark:bg-slate-800 hover:opacity-85 transition-opacity" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingMemberProfileId(reply.senderId)}
                          className="text-[11px] font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors text-left"
                          title={`Xem hồ sơ của ${reply.senderName}`}
                        >
                          {reply.senderName}
                        </button>
                        <span className="text-[8.5px] text-slate-400 font-medium">{reply.timestamp}</span>
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-200 mt-1 font-medium leading-relaxed break-words bg-white dark:bg-slate-800/90 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-700 inline-block">
                        {formatMessageContent(reply.content)}
                      </div>
                    </div>
                  </div>
                ))}
                {messages.filter(m => m.parentId === activeThreadMessage.id).length === 0 && (
                  <p className="text-[10px] text-slate-400 font-bold text-center py-8">Chưa có phản hồi. Hãy bắt đầu cuộc thảo luận!</p>
                )}
              </div>

              {/* Thread Input box */}
              <form onSubmit={handleSendThreadReply} className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex gap-2 items-center shrink-0">
                <input 
                  type="text"
                  value={threadInputVal}
                  onChange={e => setThreadInputVal(e.target.value)}
                  placeholder="Phản hồi trong luồng..."
                  className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 focus:border-indigo-500 outline-none text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400"
                />
                <button 
                  type="submit"
                  className="p-2 rounded-xl text-white shadow-md hover:brightness-105 transition-all cursor-pointer shrink-0 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Channel Modal Overlay */}
      {showCreateChannelModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-left"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Hash className="w-4.5 h-4.5 text-indigo-500" />
                Tạo kênh mới
              </h3>
              <button 
                onClick={() => setShowCreateChannelModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tên kênh</label>
                <input 
                  type="text" 
                  required 
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  placeholder="Ví dụ: marketing, ho-tro-khach-hang" 
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 outline-none bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Mô tả</label>
                <textarea
                  value={newChannelDesc}
                  onChange={e => setNewChannelDesc(e.target.value)}
                  placeholder="Mô tả ngắn mục đích của kênh..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 outline-none bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:border-indigo-500 font-semibold h-20 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Quyền riêng tư</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['public', 'private'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewChannelType(type)}
                      className={`rounded-xl border px-3 py-2 text-left transition-colors ${newChannelType === type ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      <span className="block text-[11px] font-black">{type === 'public' ? 'Công khai' : 'Riêng tư'}</span>
                      <span className="block text-[9px] font-semibold mt-0.5">{type === 'public' ? 'Mọi thành viên workspace' : 'Chỉ thành viên được thêm'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 text-xs font-bold">
                <button type="button" onClick={() => setShowCreateChannelModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer">
                  Hủy
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl text-white shadow-md hover:brightness-105 transition-all cursor-pointer" style={{ background: 'linear-gradient(135deg, var(--apexa-gradient-start), var(--apexa-gradient-end))' }}>
                  Tạo kênh
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Rename Channel Modal Overlay */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-left"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Edit2 className="w-4.5 h-4.5 text-indigo-500" />
                Đổi tên kênh
              </h3>
              <button 
                onClick={() => setShowRenameModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameChannel} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tên kênh</label>
                <input 
                  type="text" 
                  required 
                  value={renameChannelName}
                  onChange={e => setRenameChannelName(e.target.value)}
                  placeholder="Ví dụ: cap-nhat-marketing" 
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 outline-none bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Mô tả</label>
                <textarea 
                  value={renameChannelDesc}
                  onChange={e => setRenameChannelDesc(e.target.value)}
                  placeholder="Mô tả ngắn mục đích của kênh..." 
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 outline-none bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:border-indigo-500 font-semibold h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 text-xs font-bold">
                <button 
                  type="button" 
                  onClick={() => setShowRenameModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-xl text-white shadow-md hover:brightness-105 transition-all cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, var(--apexa-gradient-start), var(--apexa-gradient-end))' }}
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Forward Message Modal */}
      {forwardingMessage && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-left"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Forward className="w-4.5 h-4.5 text-blue-500" />
                Chuyển tiếp tin nhắn
              </h3>
              <button 
                onClick={() => setForwardingMessage(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview of forwarded message */}
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl text-left">
              <div className="flex items-center gap-1.5 mb-1">
                <SignedImage filePath={forwardingMessage.senderAvatar} alt={forwardingMessage.senderName} className="w-4 h-4 rounded-full" />
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{forwardingMessage.senderName}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold line-clamp-3">{forwardingMessage.content}</p>
            </div>

            {/* Channel select list */}
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Chọn kênh</span>
              {channels.filter(c => c.id !== activeChannelId).map(c => (
                <button
                  key={c.id}
                  onClick={() => handleForwardMessage(c.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-indigo-50 transition-colors cursor-pointer text-left"
                >
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{c.name}</span>
                  <ArrowRight className="w-3 h-3 ml-auto text-slate-300" />
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Convert Message to Task Modal */}
      <AnimatePresence>
        {convertTaskMessage && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/60 dark:border-slate-800 shadow-2xl p-6 overflow-hidden backdrop-blur-xl space-y-4 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <CheckSquare className="w-4.5 h-4.5 text-indigo-500" />
                  Chuyển tin nhắn thành công việc
                </h3>
                <button 
                  onClick={() => setConvertTaskMessage(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Message Source Preview */}
              <div className="px-3 py-2 bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/40 dark:border-indigo-900/30 rounded-2xl text-[10px] text-slate-505 italic max-h-[80px] overflow-y-auto">
                <span className="font-bold text-slate-600 dark:text-slate-400 not-italic block mb-0.5">{convertTaskMessage.senderName}:</span>
                "{convertTaskMessage.content}"
              </div>

              {/* Task Title Form */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tiêu đề công việc</label>
                <input 
                  type="text" 
                  value={convertTaskTitle} 
                  onChange={e => setConvertTaskTitle(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-805 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-colors" 
                  placeholder="Tiêu đề công việc"
                />
              </div>

              {/* Space & List selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Khu vực đích</label>
                  <select 
                    value={convertTaskSpaceId}
                    onChange={e => {
                      setConvertTaskSpaceId(e.target.value);
                      const sel = spaces.find(s => s.id === e.target.value);
                      if (sel && sel.lists.length > 0) setConvertTaskListId(sel.lists[0].id);
                    }}
                    className="w-full text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 outline-none cursor-pointer"
                  >
                    {spaces.filter(s => s.workspaceId === workspaceId || !s.workspaceId).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Danh sách đích</label>
                  <select 
                    value={convertTaskListId}
                    onChange={e => setConvertTaskListId(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 outline-none cursor-pointer"
                  >
                    {spaces.find(s => s.id === convertTaskSpaceId)?.lists?.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    )) || <option value="">— Chưa có danh sách —</option>}
                  </select>
                </div>
              </div>

              {/* Priority & Assignee selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Priority</label>
                  <select 
                    value={convertTaskPriority}
                    onChange={e => setConvertTaskPriority(e.target.value as Priority)}
                    className="w-full text-xs font-semibold text-slate-705 dark:text-slate-350 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 outline-none cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Assignee</label>
                  <select 
                    value={convertTaskAssigneeId}
                    onChange={e => setConvertTaskAssigneeId(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-705 dark:text-slate-350 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 outline-none cursor-pointer"
                  >
                    <option value="">— Chưa giao —</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setConvertTaskMessage(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer text-center transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="button"
                  onClick={handleCreateTaskFromMsg}
                  disabled={!convertTaskTitle.trim() || !convertTaskListId}
                  className="flex-1 py-2 rounded-xl text-xs font-black text-white shadow-md hover:shadow-blue-500/20 active:shadow-none transition-all hover:brightness-105 cursor-pointer text-center disabled:opacity-50 disabled:pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, var(--apexa-gradient-start), var(--apexa-gradient-end))' }}
                >
                  Tạo công việc
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Channel Summary Modal */}
      <AnimatePresence>
        {showSummaryModal && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden space-y-4 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                  Tóm tắt Kênh bằng AI (#{activeChannel?.name || 'chat'})
                </h3>
                <button 
                  onClick={() => setShowSummaryModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isSummarizing ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className="text-xs font-bold text-slate-500">AI đang tổng hợp cuộc trò chuyện...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800 rounded-2xl max-h-[300px] overflow-y-auto text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-semibold space-y-2">
                    {formatMessageContent(aiSummaryText)}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(aiSummaryText);
                        triggerToast?.('success', 'Copied 📋', 'Summary copied to clipboard.');
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      📋 Sao chép
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSummaryModal(false);
                        const msgId = `ai-summary-${Date.now()}`;
                        const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                        const summaryMsg: ChatMessage = {
                          id: msgId,
                          senderId: 'apexa-ai',
                          senderName: 'Apexa Brain AI',
                          senderAvatar: '',
                          content: `✨ **Bản tóm tắt kênh từ AI:**\n${aiSummaryText}`,
                          timestamp: timeStr,
                          isAi: true
                        };
                        setMessages(prev => [...prev, summaryMsg]);
                        scrollToBottom();
                        triggerToast?.('success', 'Summary Shared 📣', 'Posted summary to channel.');
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-black text-white shadow-md transition-all cursor-pointer bg-indigo-600 hover:bg-indigo-700"
                    >
                      Gửi vào Kênh
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Poll Creation Modal */}
      <AnimatePresence>
        {showPollModal && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden space-y-4 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500" />
                  Tạo cuộc Thăm dò ý kiến (Poll)
                </h3>
                <button 
                  onClick={() => setShowPollModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreatePollSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Câu hỏi thăm dò</label>
                  <input 
                    type="text" 
                    required 
                    value={pollQuestion}
                    onChange={e => setPollQuestion(e.target.value)}
                    placeholder="Ví dụ: Thời gian họp tuần tới phù hợp nhất?" 
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 outline-none bg-slate-50 dark:bg-slate-955 text-slate-800 dark:text-slate-100 focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Các lựa chọn</label>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-none">
                    {pollOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input 
                          type="text" 
                          required 
                          value={opt}
                          onChange={e => {
                            const newOpts = [...pollOptions];
                            newOpts[i] = e.target.value;
                            setPollOptions(newOpts);
                          }}
                          placeholder={`Lựa chọn ${i + 1}`} 
                          className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 outline-none bg-slate-50 dark:bg-slate-955 text-slate-800 dark:text-slate-100 focus:border-indigo-500 font-semibold"
                        />
                        {pollOptions.length > 2 && (
                          <button 
                            type="button" 
                            onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {pollOptions.length < 5 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions([...pollOptions, `Lựa chọn ${pollOptions.length + 1}`])}
                      className="w-full py-1.5 border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 rounded-xl cursor-pointer text-center transition-colors"
                    >
                      + Thêm lựa chọn
                    </button>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
                  <button 
                    type="button"
                    onClick={() => setShowPollModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-500 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 rounded-xl text-white shadow-md hover:brightness-105 transition-all cursor-pointer bg-indigo-600 hover:bg-indigo-700"
                  >
                    Tạo cuộc thăm dò
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Direct Message Modal */}
      <AnimatePresence>
        {showNewDmModal && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden space-y-4 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-500" />
                  Nhắn tin với thành viên
                </h3>
                <button 
                  onClick={() => { setShowNewDmModal(false); setDmSearchQuery(''); }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text"
                  value={dmSearchQuery}
                  onChange={e => setDmSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên, email hoặc phòng ban..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 outline-none bg-slate-50 dark:bg-slate-955 text-slate-800 dark:text-slate-100 focus:border-indigo-500 font-semibold"
                />
              </div>

              {/* Member List */}
              <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin">
                {members
                  .filter(m => m.id !== currentUser.id && m.id !== 'user')
                  .filter(m => 
                    !dmSearchQuery.trim() || 
                    m.name.toLowerCase().includes(dmSearchQuery.toLowerCase()) || 
                    (m.email && m.email.toLowerCase().includes(dmSearchQuery.toLowerCase())) ||
                    (m.department && m.department.toLowerCase().includes(dmSearchQuery.toLowerCase()))
                  )
                  .map(member => {
                    return (
                      <div 
                        key={member.id}
                        onClick={() => openDirectMessage(member)}
                        className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 hover:border-indigo-200 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <SignedImage filePath={member.avatar} alt={member.name} className="w-8 h-8 rounded-full border border-slate-200/50 dark:border-slate-700 bg-white dark:bg-slate-800" />
                            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${presenceDotClass(member.status, true)}`}></span>
                          </div>
                          <div className="min-w-0 text-left">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">{member.name}</h4>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold truncate">{member.role || 'Member'} {member.department ? `• ${member.department}` : ''}</p>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10.5px] font-extrabold text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all shadow-xs shrink-0">
                          Nhắn tin
                        </span>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Group Chat Modal */}
      <AnimatePresence>
        {showCreateGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <motion.form
              onSubmit={handleCreateGroupChat}
              initial={{ scale: 0.96, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 12, opacity: 0 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300"><Users className="h-5 w-5" /></span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Tạo nhóm chat</h3>
                    <p className="mt-0.5 text-[10px] font-medium text-slate-500">Chọn ít nhất 2 thành viên</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setShowCreateGroupModal(false); setGroupSearchQuery(''); }} className="cursor-pointer rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-4 w-4" /></button>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <label className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-slate-400">Tên nhóm</label>
                  <input value={groupName} onChange={event => setGroupName(event.target.value)} maxLength={60} required placeholder="Ví dụ: Product Launch Team" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none transition-colors focus:border-violet-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Thành viên</label>
                    <span className="text-[9px] font-bold text-violet-600 dark:text-violet-300">Đã chọn {selectedGroupMemberIds.length}</span>
                  </div>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input value={groupSearchQuery} onChange={event => setGroupSearchQuery(event.target.value)} placeholder="Tìm tên hoặc email..." className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-medium outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                  </div>
                  <div className="max-h-64 space-y-1 overflow-y-auto pr-1 scrollbar-thin">
                    {members.filter(member => member.id !== currentUser.id && member.id !== 'user').filter(member => {
                      const query = groupSearchQuery.trim().toLowerCase();
                      return !query || member.name.toLowerCase().includes(query) || member.email?.toLowerCase().includes(query);
                    }).map(member => {
                      const userId = resolveMemberAuthId(member) || member.id;
                      const selected = selectedGroupMemberIds.includes(userId);
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => setSelectedGroupMemberIds(prev => selected ? prev.filter(id => id !== userId) : [...prev, userId])}
                          className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-2.5 text-left transition-all ${selected ? 'border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40' : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/60'}`}
                        >
                          <SignedImage filePath={member.avatar} alt={member.name} className="h-8 w-8 shrink-0 rounded-xl" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-bold text-slate-800 dark:text-slate-100">{member.name}</span>
                            <span className="block truncate text-[9.5px] font-medium text-slate-400">{member.email || member.department || 'Thành viên'}</span>
                          </span>
                          <span className={`flex h-5 w-5 items-center justify-center rounded-lg border ${selected ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-200 text-transparent dark:border-slate-700'}`}><Check className="h-3 w-3" /></span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                <button type="button" onClick={() => setShowCreateGroupModal(false)} className="cursor-pointer rounded-xl px-4 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">Hủy</button>
                <button type="submit" disabled={!groupName.trim() || selectedGroupMemberIds.length < 2 || isCreatingGroup} className="flex cursor-pointer items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40">
                  {isCreatingGroup ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
                  Tạo nhóm
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Video Meeting Modal */}
      <AnimatePresence>
        {showVideoMeetModal && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden space-y-4 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Video className="w-5 h-5 text-indigo-500" />
                  Tạo cuộc họp Video trực tuyến
                </h3>
                <button 
                  onClick={() => setShowVideoMeetModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateVideoMeeting} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Chủ đề cuộc họp</label>
                  <input 
                    type="text"
                    required
                    value={videoMeetTitle}
                    onChange={e => setVideoMeetTitle(e.target.value)}
                    placeholder="Ví dụ: Thảo luận tiến độ dự án tuần 3..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 outline-none bg-slate-50 dark:bg-slate-955 text-slate-800 dark:text-slate-100 focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-bold block text-indigo-600 dark:text-indigo-400">📹 Tính năng cuộc họp WebRTC/Jitsi:</span>
                  <p className="text-[11px] leading-relaxed">Một liên kết phòng họp bảo mật riêng sẽ được tạo và chia sẻ ngay vào kênh <strong>#{activeChannel?.name || 'chat'}</strong> cho mọi thành viên cùng tham gia.</p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
                  <button 
                    type="button"
                    onClick={() => setShowVideoMeetModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-500 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 rounded-xl text-white shadow-md hover:brightness-105 transition-all cursor-pointer bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5"
                  >
                    <Video className="w-4 h-4" />
                    Tạo & Gửi thẻ cuộc họp
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Checklist Creator Modal */}
      <AnimatePresence>
        {showChecklistModal && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden space-y-4 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-indigo-500" />
                  Tạo Danh sách Công việc (Checklist)
                </h3>
                <button 
                  onClick={() => setShowChecklistModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleInsertChecklist} className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Các việc cần hoàn thành</label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
                  {checklistItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-indigo-500 shrink-0" />
                      <input 
                        type="text" 
                        required
                        value={item}
                        onChange={e => {
                          const newItems = [...checklistItems];
                          newItems[i] = e.target.value;
                          setChecklistItems(newItems);
                        }}
                        placeholder={`Mục công việc ${i + 1}...`}
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 outline-none bg-slate-50 dark:bg-slate-955 text-slate-800 dark:text-slate-100 focus:border-indigo-500 font-semibold"
                      />
                      {checklistItems.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => setChecklistItems(checklistItems.filter((_, idx) => idx !== i))}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setChecklistItems([...checklistItems, ''])}
                  className="w-full py-1.5 border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 rounded-xl cursor-pointer text-center transition-colors"
                >
                  + Thêm mục công việc
                </button>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
                  <button 
                    type="button"
                    onClick={() => setShowChecklistModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-500 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 rounded-xl text-white shadow-md hover:brightness-105 transition-all cursor-pointer bg-indigo-600 hover:bg-indigo-700"
                  >
                    Chèn vào Khung Chat
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Message Template Picker Modal */}
      <AnimatePresence>
        {showTemplateModal && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden space-y-4 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  Mẫu Tin nhắn Chuẩn (Templates)
                </h3>
                <button 
                  onClick={() => setShowTemplateModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
                {MESSAGE_TEMPLATES.map((tmpl) => (
                  <div 
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl.content)}
                    className="p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 hover:border-indigo-300 transition-all cursor-pointer group space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{tmpl.name}</h4>
                      <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Sử dụng →</span>
                    </div>
                    <p className="text-[10.5px] text-slate-400 dark:text-slate-500 font-semibold">{tmpl.desc}</p>
                    <div className="mt-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-400 truncate">
                      {tmpl.content.replace(/\n/g, ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Channel Automation Modal */}
      <AnimatePresence>
        {showAutomationModal && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden space-y-4 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-500" />
                  Cấu hình Tự động hóa Kênh (#{activeChannel?.name || 'chat'})
                </h3>
                <button 
                  onClick={() => setShowAutomationModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAutomationSettings} className="space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 cursor-pointer">
                    <div>
                      <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-100">🤖 AI Tóm tắt Cuộc trò chuyện hằng ngày</span>
                      <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">Tổng hợp tin nhắn vào 17:00 chiều tự động</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={autoSummaryEnabled}
                      onChange={e => setAutoSummaryEnabled(e.target.checked)}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 cursor-pointer">
                    <div>
                      <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-100">💬 AI Phản hồi tự động khi Vắng mặt</span>
                      <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">Tự động trả lời câu hỏi cơ bản của thành viên</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={autoReplyEnabled}
                      onChange={e => setAutoReplyEnabled(e.target.checked)}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 cursor-pointer">
                    <div>
                      <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-100">🔔 Cảnh báo Từ khóa Quan trọng</span>
                      <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">Báo động khi có tin nhắn chứa @urgent, bug, deploy</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={keywordAlerts}
                      onChange={e => setKeywordAlerts(e.target.checked)}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                  </label>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">URL tích hợp webhook</label>
                    <input 
                      type="url"
                      value={webhookUrl}
                      onChange={e => setWebhookUrl(e.target.value)}
                      placeholder="https://api.yourcompany.com/webhook/chat"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 outline-none bg-slate-50 dark:bg-slate-955 text-slate-800 dark:text-slate-100 focus:border-indigo-500 font-semibold font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
                  <button 
                    type="button"
                    onClick={() => setShowAutomationModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-500 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 rounded-xl text-white shadow-md hover:brightness-105 transition-all cursor-pointer bg-indigo-600 hover:bg-indigo-700"
                  >
                    Lưu cấu hình
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Recent Activity Log Modal */}
      <AnimatePresence>
        {showActivityLogModal && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden space-y-4 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  Lịch sử Hoạt động & Hoạt động gần đây
                </h3>
                <button 
                  onClick={() => setShowActivityLogModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                    <span>💬 Đã truy cập kênh #{activeChannel?.name || 'chat'}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Vừa xong</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Xem tin nhắn và tương tác cùng các thành viên.</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                    <span>📌 Tin nhắn đã ghim (Pinned Messages)</span>
                    <span className="text-[10px] text-slate-400 font-mono">Hôm nay</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Tổng cộng {messages.filter(m => m.isPinned).length} tin nhắn quan trọng được ghim.</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                    <span>⭐ Kênh yêu thích (Starred)</span>
                    <span className="text-[10px] text-slate-400 font-mono">{starredChannelIds.length} kênh</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Các kênh đã được đánh dấu sao để truy cập nhanh.</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chat Settings Modal */}
      <AnimatePresence>
        {showChatSettingsModal && (
          <div className="fixed inset-0 modal-backdrop-blur flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowChatSettingsModal(false)}
              className="absolute inset-0" />
            <motion.div 
              initial={{ scale: 0.94, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 15, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 overflow-hidden space-y-4 text-left border border-slate-200 dark:border-slate-800 shadow-2xl shadow-blue-500/10 select-none z-10"
            >
              <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
              
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <h3 className="text-sm font-black text-slate-850 dark:text-white flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Settings className="w-4 h-4" />
                  </div>
                  <span>Cài đặt Tùy chỉnh Chat</span>
                </h3>
                <button 
                  onClick={() => setShowChatSettingsModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/70 transition-all hover:scale-[1.01]">
                  <div>
                    <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-100">🔊 Âm thanh thông báo (Sound effects)</span>
                    <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">Phát tiếng click khi nhận và gửi tin nhắn</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={chatSettings.soundEnabled}
                    onChange={e => setChatSettings({ ...chatSettings, soundEnabled: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/70 transition-all hover:scale-[1.01]">
                  <div>
                    <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-100">📲 Thông báo đẩy Desktop</span>
                    <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">Hiển thị popup khi có tin nhắn mới</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={chatSettings.desktopNotifications}
                    onChange={e => { void handleDesktopNotificationsChange(e.target.checked); }}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/70 transition-all hover:scale-[1.01]">
                  <div>
                    <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-100">⌨️ Phím Enter để Gửi</span>
                    <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">Bấm Shift + Enter để xuống dòng</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={chatSettings.enterToSend}
                    onChange={e => setChatSettings({ ...chatSettings, enterToSend: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer rounded"
                  />
                </label>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
                <button 
                  type="button"
                  onClick={() => {
                    setShowChatSettingsModal(false);
                    triggerToast?.('success', 'Đã lưu Cài đặt Chat ⚙️', 'Các tùy chọn đã được cập nhật thành công');
                  }}
                  className="px-5 py-2.5 rounded-xl text-white shadow-md hover:brightness-105 transition-all cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 font-black"
                >
                  Hoàn tất
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Fullscreen Image Lightbox Modal ── */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 select-none"
            onClick={() => {
              setLightboxImage(null);
              setLightboxZoom(1);
              setLightboxRotation(0);
            }}
          >
            {/* Top Toolbar */}
            <div 
              className="flex items-center justify-between z-10 w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-white min-w-0 mr-4">
                <div className="max-w-[200px] sm:max-w-md truncate">
                  <h4 className="text-xs sm:text-sm font-bold truncate text-white">{lightboxImage.name}</h4>
                  <p className="text-[10px] text-white/60">
                    {lightboxImage.senderName ? `${lightboxImage.senderName} · ` : ''}
                    {lightboxImage.timestamp || ''}
                    {lightboxImage.size ? ` · ${(lightboxImage.size / 1024).toFixed(1)} KB` : ''}
                  </p>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setLightboxZoom(prev => Math.max(0.5, Number((prev - 0.25).toFixed(2))))}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  title="Thu nhỏ (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setLightboxZoom(1); setLightboxRotation(0); }}
                  className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer font-mono"
                  title="Đặt lại tỷ lệ"
                >
                  {Math.round(lightboxZoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxZoom(prev => Math.min(3, Number((prev + 0.25).toFixed(2))))}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  title="Phóng to (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxRotation(prev => (prev + 90) % 360)}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  title="Xoay 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                {lightboxImage.url && (
                  <a
                    href={lightboxImage.url}
                    download={lightboxImage.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg"
                    title="Tải ảnh về máy"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Tải về</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setLightboxImage(null);
                    setLightboxZoom(1);
                    setLightboxRotation(0);
                  }}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/20 hover:bg-rose-600 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ml-2"
                  title="Đóng (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Center Image Container */}
            <div 
              className="flex-1 flex items-center justify-center overflow-hidden my-4 relative"
              onClick={e => e.stopPropagation()}
            >
              <div
                style={{
                  transform: `scale(${lightboxZoom}) rotate(${lightboxRotation}deg)`,
                  transition: 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)'
                }}
                className="max-w-full max-h-full flex items-center justify-center select-none"
              >
                <SignedImage
                  filePath={lightboxImage.url}
                  alt={lightboxImage.name}
                  bucket="chat-attachments"
                  className="max-w-[85vw] max-h-[75vh] object-contain rounded-xl shadow-2xl pointer-events-none"
                />
              </div>
            </div>

            {/* Bottom Hint */}
            <div className="text-center text-[11px] text-white/50 z-10 pointer-events-none">
              Nhấn <kbd className="px-1.5 py-0.5 rounded-sm bg-white/10 text-white/80 font-mono">Esc</kbd> hoặc bấm ra ngoài để đóng
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
