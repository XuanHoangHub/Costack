"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage, ChatChannel, User, Space, Priority } from '../types';
import { supabase } from '../supabaseClient';
import SignedImage from './SignedImage';
import { useTranslation } from '../contexts/TranslationContext';
import { 
  Hash, Send, Bot, Smile, Users, MessageSquare, Sparkles, Plus, X,
  Paperclip, ThumbsUp, Heart, Search, Trash2, Edit2, Loader2, ArrowRight,
  Volume2, VolumeX, Globe, MoreVertical, Mic, Square, Play, Pause, FileAudio,
  Bold, Italic, Code, Quote, Pin, PinOff,
  Forward, AtSign, Check, Settings, ChevronDown, ChevronLeft, Clock, CheckSquare, Calendar,
  BarChart3, Download, Eye, Vote, HelpCircle, Video, FileText, Zap, Star, Sliders, Bell, SmilePlus, Image as ImageIcon
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
      return <strong key={i} className="font-black text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return <em key={i} className="italic text-slate-700 dark:text-slate-300 font-semibold">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-250/20 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold mx-0.5">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('@') && part.length > 1) {
      return <span key={i} className="px-1 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-[11px] cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors">{part}</span>;
    }
    return part;
  });
};

const formatMessageContent = (text: string) => {
  if (!text) return '';
  const lines = text.split('\n');
  const processedLines = lines.map((line, idx) => {
    if (line.trim().startsWith('>')) {
      const content = line.substring(line.indexOf('>') + 1).trim();
      return (
        <div key={idx} className="pl-3 py-1 border-l-3 border-indigo-400 bg-slate-50/50 dark:bg-slate-900/50 rounded-r-lg text-slate-500 dark:text-slate-400 italic my-1">
          {formatLineMarkdown(content)}
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
const resolveMemberAuthId = (member: User) => {
  const candidate = member.userId || member.id;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate) ? candidate : null;
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
  spaces = [],
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

  // Multi-tab Right Sidebar states
  const [activeSidebarTab, setActiveSidebarTab] = useState<'members' | 'search' | 'files'>('members');
  const [localSearchQuery, setLocalSearchQuery] = useState('');

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

  // Unread badge tracking
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastReadTimestamps, setLastReadTimestamps] = useState<Record<string, string>>({});

  // Message forward modal
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);

  // Drag-and-drop state
  const [isDragOver, setIsDragOver] = useState(false);

  // Form input states
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Search channels
  const [searchQuery, setSearchQuery] = useState('');

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
        const saved = localStorage.getItem('avaxa_starred_channels');
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('avaxa_starred_channels', JSON.stringify(starredChannelIds));
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

  const [showQuickCreateMenu, setShowQuickCreateMenu] = useState(false);
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);
  const [showChatSettingsModal, setShowChatSettingsModal] = useState(false);

  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);

  const [chatSettings, setChatSettings] = useState({
    soundEnabled: true,
    compactMode: false,
    desktopNotifications: true,
    enterToSend: true
  });

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
    const roomName = `avaxa-${activeChannelId.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString(36)}`;
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
      const searchDefault = localStorage.getItem('avaxa_ai_search_grounding') === 'true';
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

  const ensureDefaultChannels = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    const defaults = [
      { id: `${workspaceId}:general`, workspace_id: workspaceId, name: 'general', description: 'Kênh thảo luận chung cho tất cả thành viên.', channel_type: 'public', created_by: session.user.id },
      { id: `${workspaceId}:avaxa-brain-ai`, workspace_id: workspaceId, name: 'avaxa-brain-ai', description: 'Trợ lý AI của workspace.', channel_type: 'public', created_by: session.user.id }
    ];
    const { error } = await supabase.from('chat_channels').upsert(defaults, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw error;
  };

  // Initialize channels from the durable workspace chat directory.
  useEffect(() => {
    let active = true;
    const loadChannels = async () => {
      if (isOffline) {
        const defaults: ChatChannel[] = [
          { id: `${workspaceId}:general`, workspaceId, name: 'general', description: 'Kênh thảo luận chung cho tất cả thành viên.', type: 'public' },
          { id: `${workspaceId}:avaxa-brain-ai`, workspaceId, name: 'avaxa-brain-ai', description: 'Trợ lý AI của workspace.', type: 'public' }
        ];
        if (active) setChannels(defaults);
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
        const loaded: ChatChannel[] = (data || []).map((channel: any) => ({
          id: channel.id,
          workspaceId: channel.workspace_id,
          name: channel.name,
          description: channel.description || '',
          type: channel.channel_type,
          dmKey: channel.dm_key || undefined
        }));
        setChannels(loaded);
        setActiveChannelId(previous => {
          const requested = initialSelectedChannelId && loaded.some(c => c.id === initialSelectedChannelId)
            ? initialSelectedChannelId
            : previous;
          return requested && loaded.some(c => c.id === requested) ? requested : `${workspaceId}:general`;
        });
      } catch (error) {
        console.error('Unable to load chat channels:', error);
        triggerToast?.('error', 'Không thể tải kênh', 'Vui lòng kiểm tra kết nối và thử lại.');
      }
    };
    loadChannels();
    return () => { active = false; };
  }, [workspaceId, initialSelectedChannelId, isOffline]);

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

    const seedMessages: Record<string, ChatMessage[]> = {
      'avaxa-brain-ai': [
        { id: 'mai1', senderId: 'ai-brain', senderName: 'Avaxa Brain AI', senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AvaxaBrain', content: 'Xin chào! Tôi là trợ lý Avaxa Brain của workspace hiện tại. Tại kênh truyền này, bạn có thể hỏi tôi bất kỳ điều gì: từ cách lập kế hoạch dự án, phân chia KPI, soạn thảo tài liệu, cho đến viết mã tối ưu. Hãy thử gửi tin nhắn ngay nhé! 💡', timestamp: '09:00', isAi: true }
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
        if (isDm) {
          const memberId = activeChannelId.split('-').pop();
          const member = members.find(m => m.id === memberId);
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
        scrollToBottom();
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
        const loadedMessages = (data || []).reverse().map(mapChatMessage);
        messageCacheRef.current.set(activeChannelId, loadedMessages);
        setMessages(loadedMessages);
      } catch (err) {
        console.error('Error loading messages from Supabase:', err);
      } finally {
        setIsLoadingMessages(false);
      }
      scrollToBottom();
    };

    loadMessages();

    // Set up Supabase Realtime channel subscription
    if (!isOffline) {
      const sub = supabase.channel(`realtime-chat-${activeChannelId}`)
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
              setMessages(prev => {
                if (prev.some(x => x.id === newMsg.id)) return prev;
                const next = [...prev, newMsg];
                messageCacheRef.current.set(activeChannelId, next);
                return next;
              });
              scrollToBottom();
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
            const { userId, name } = payload.payload;
            if (userId === currentUser.id) return;
            
            setTypingUsers(prev => {
              if (prev.includes(name)) return prev;
              return [...prev, name];
            });
            
            const timeoutKey = `typing-timeout-${userId}`;
            if ((window as any)[timeoutKey]) {
              clearTimeout((window as any)[timeoutKey]);
            }
            (window as any)[timeoutKey] = setTimeout(() => {
              setTypingUsers(prev => prev.filter(n => n !== name));
            }, 3000);
          }
        )
        .subscribe();
      
      channelSubscriptionRef.current = sub;
    }

    return () => {
      if (channelSubscriptionRef.current) {
        supabase.removeChannel(channelSubscriptionRef.current);
        channelSubscriptionRef.current = null;
      }
    };
  }, [activeChannelId, isOffline, currentUser.id, currentUser.name, members, spaces, workspaceId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
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

  // Typing indicator broadcast
  const broadcastTyping = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    if (!isOffline && channelSubscriptionRef.current) {
      channelSubscriptionRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUser.id, name: currentUser.name }
      });
    }

    typingTimeoutRef.current = setTimeout(() => {
      // Clear after 3 seconds of no typing
    }, 3000);
  };

  // Unread count helpers
  const markChannelAsRead = (channelId: string) => {
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
  };

  const openDirectMessage = async (member: User) => {
    const { data: { session } } = await supabase.auth.getSession();
    const peerUserId = resolveMemberAuthId(member);
    if (!session?.user?.id || !peerUserId) {
      triggerToast?.('error', 'Không thể mở DM', 'Thành viên này chưa được liên kết với tài khoản đăng nhập.');
      return;
    }
    const dmKey = [session.user.id, peerUserId].sort().join(':');
    const existing = channels.find(channel => channel.type === 'dm' && channel.dmKey === dmKey);
    if (existing) {
      setActiveChannelId(existing.id);
      setShowNewDmModal(false);
      setDmSearchQuery('');
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
      created_by: session.user.id
    });
    if (error && error.code !== '23505') {
      triggerToast?.('error', 'Không thể mở DM', error.message);
      return;
    }

    const resolvedId = error?.code === '23505'
      ? (await supabase.from('chat_channels').select('id').eq('workspace_id', workspaceId).eq('dm_key', dmKey).single()).data?.id
      : channelId;
    if (!resolvedId) return;
    const { error: memberError } = await supabase.from('chat_channel_members').upsert([
      { channel_id: resolvedId, user_id: session.user.id, role: 'owner' },
      { channel_id: resolvedId, user_id: peerUserId, role: 'member' }
    ], { onConflict: 'channel_id,user_id' });
    if (memberError) {
      triggerToast?.('error', 'Không thể thêm thành viên DM', memberError.message);
      return;
    }
    const channel: ChatChannel = { id: resolvedId, workspaceId, name: member.name, description: `Tin nhắn trực tiếp với ${member.name}`, type: 'dm', dmKey };
    setChannels(prev => prev.some(item => item.id === resolvedId) ? prev : [...prev, channel]);
    setActiveChannelId(resolvedId);
    setShowNewDmModal(false);
    setDmSearchQuery('');
    triggerToast?.('info', 'Trò chuyện trực tiếp 💬', `Đã mở khung chat với ${member.name}`);
  };

  const handleCreateGroupChat = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!groupName.trim() || selectedGroupMemberIds.length < 2 || isCreatingGroup) return;
    setIsCreatingGroup(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('Bạn cần đăng nhập để tạo nhóm chat.');

      const channelId = `${workspaceId}:group-${crypto.randomUUID()}`;
      const cleanName = groupName.trim().slice(0, 60);
      const { error: channelError } = await supabase.from('chat_channels').insert({
        id: channelId,
        workspace_id: workspaceId,
        name: cleanName,
        description: `${selectedGroupMemberIds.length + 1} thành viên`,
        channel_type: 'group',
        created_by: session.user.id
      });
      if (channelError) throw channelError;

      const memberRows = [
        { channel_id: channelId, user_id: session.user.id, role: 'owner' },
        ...selectedGroupMemberIds.map(userId => ({ channel_id: channelId, user_id: userId, role: 'member' }))
      ];
      const { error: membersError } = await supabase.from('chat_channel_members').insert(memberRows);
      if (membersError) {
        await supabase.from('chat_channels').delete().eq('id', channelId);
        throw membersError;
      }

      const groupChannel: ChatChannel = {
        id: channelId,
        workspaceId,
        name: cleanName,
        description: `${memberRows.length} thành viên`,
        type: 'group'
      };
      setChannels(prev => [...prev, groupChannel]);
      setActiveChannelId(channelId);
      setShowCreateGroupModal(false);
      setGroupName('');
      setGroupSearchQuery('');
      setSelectedGroupMemberIds([]);
      triggerToast?.('success', 'Đã tạo nhóm chat', `${cleanName} có ${memberRows.length} thành viên.`);
    } catch (error) {
      console.error('Unable to create group chat:', error);
      triggerToast?.('error', 'Không thể tạo nhóm chat', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Track unread when messages arrive on non-active channels
  const incrementUnread = (channelId: string) => {
    if (channelId !== activeChannelId) {
      setUnreadCounts(prev => ({ ...prev, [channelId]: (prev[channelId] || 0) + 1 }));
    }
  };

  // Mark current channel as read when switching
  useEffect(() => {
    if (activeChannelId) {
      markChannelAsRead(activeChannelId);
      setShowHeaderMenu(false);
      setActiveChannelMenuId(null);
    }
  }, [activeChannelId]);

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
  }, [channels, isOffline]);

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
        
        setSelectedFile({
          name: `Voice Message (${durationSec}s)`,
          size: audioBlob.size,
          type: 'audio/webm',
          url: audioUrl,
          file: audioBlob,
          isVoice: true,
          duration: durationSec
        });
        
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

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      triggerToast?.('success', 'Voice recorded 🎙️', 'Ready to send.');
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
    { name: '/summary', desc: 'Tóm tắt các công việc hiện tại bằng AI', action: 'summary' },
    { name: '/addtask', desc: 'Tạo nhanh công việc (VD: /addtask Họp báo cáo)', action: 'addtask' },
    { name: '/gantt', desc: 'Chuyển sang xem dạng Gantt Chart', action: 'gantt' },
    { name: '/board', desc: 'Chuyển sang xem dạng Kanban Board', action: 'board' },
    { name: '/table', desc: 'Chuyển sang xem dạng Table dữ liệu', action: 'table' },
    { name: '/list', desc: 'Chuyển sang xem dạng List danh sách', action: 'list' }
  ];

  const filteredCommands = COMMANDS.filter(cmd =>
    cmd.name.toLowerCase().startsWith(commandQuery)
  );

  const handleSelectCommand = (cmd: typeof COMMANDS[0]) => {
    setShowCommandDropdown(false);
    if (cmd.action === 'addtask') {
      setInputVal('/addtask ');
      inputRef.current?.focus();
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
            senderId: 'avaxa-ai',
            senderName: 'Avaxa Brain AI',
            senderAvatar: '',
            content: data.text,
            timestamp: aiMsgTime,
            isAi: true
          };
          setMessages(prev => [...prev, aiResponseMsg]);
          
          if (!isOffline) {
            await supabase.from('chat_messages').insert({
              id: aiMsgId,
              sender_id: 'avaxa-ai',
              sender_name: 'Avaxa Brain AI',
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

  // Send new message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputVal.trim() && !selectedFile) || isSending) return;

    const userMsgText = inputVal.trim();
    if (userMsgText.startsWith('/') && !selectedFile) {
      executeSlashCommand(userMsgText);
      setInputVal('');
      return;
    }

    const pendingFile = selectedFile;
    setIsSending(true);
    const msgId = `msg-${Date.now()}`;
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    let attachmentObj: ChatMessage['attachment'] | undefined;

    try {
      let storedPath = pendingFile?.url || '';
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      if (!isOffline && pendingFile?.file) {
        if (!userId) throw new Error('Authentication required');
        const storagePath = `${userId}/${workspaceId}/${activeChannelId}/${crypto.randomUUID()}-${safeFileName(pendingFile.name)}`;
        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(storagePath, pendingFile.file, { contentType: pendingFile.type || 'application/octet-stream', upsert: false });
        if (uploadError) throw uploadError;
        storedPath = storagePath;
      }

      attachmentObj = pendingFile ? {
        name: pendingFile.name,
        filePath: storedPath,
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
        channelId: activeChannelId,
        attachment: attachmentObj,
        deliveryState: isOffline ? 'sending' : 'sent'
      };

      if (!isOffline) {
        if (!userId) throw new Error('Authentication required');
        const { error } = await supabase.from('chat_messages').insert({
          id: msgId,
          sender_id: currentUser.id || 'user',
          sender_name: currentUser.name,
          sender_avatar: currentUser.avatar,
          content: userMsgText,
          timestamp: timeStr,
          channel_id: activeChannelId,
          is_ai_response: false,
          workspace_id: workspaceId,
          user_id: userId,
          attachment: attachmentObj || null
        });
        if (error) throw error;
      }

      setMessages(prev => prev.some(message => message.id === msgId) ? prev : [...prev, newMsg]);
      setInputVal('');
      setSelectedFile(null);
      scrollToBottom();

      // Check if chat is with AI Assistant channel
      if (activeChannelId.endsWith('avaxa-brain-ai')) {
      setIsAiTyping(true);
      try {
        // Gather recent 10 messages for chat history
        const historyToSend = messages.slice(-10).map(m => ({
          senderId: m.senderId === 'avaxa-ai' ? 'model' : 'user',
          content: m.content
        }));

        // Trigger AI chat API call with history & search configuration
        const response = await callAiApi('/api/ai/chat', { 
          message: userMsgText,
          history: historyToSend,
          googleSearch: searchWeb
        });
        const data = await response.json();
        
        if (data.success && data.text) {
          const aiMsgId = `ai-msg-${Date.now()}`;
          const aiMsgTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          const aiResponseMsg: ChatMessage = {
            id: aiMsgId,
            senderId: 'avaxa-ai',
            senderName: 'Avaxa Brain AI',
            senderAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=S',
            content: data.text,
            timestamp: aiMsgTime,
            isAi: true
          };
          setMessages(prev => [...prev, aiResponseMsg]);
          (window as any).playSystemSound?.('notification');

          if (!isOffline) {
            await supabase.from('chat_messages').insert({
              id: aiMsgId,
              sender_id: 'avaxa-ai',
              sender_name: 'Avaxa Brain AI',
              sender_avatar: '',
              content: data.text,
              timestamp: aiMsgTime,
              channel_id: activeChannelId,
              is_ai_response: true,
              workspace_id: workspaceId,
              user_id: userId,
              attachment: null
            });
          }
        }
      } catch (err) {
        console.error('Error fetching AI response:', err);
      } finally {
        setIsAiTyping(false);
        scrollToBottom();
      }
      } else {
        (window as any).playSystemSound?.('toggle');
      }
    } catch (error) {
      console.error('Unable to send chat message:', error);
      triggerToast?.('error', 'Không gửi được tin nhắn', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setIsSending(false);
    }
  };

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

  // Filter channels based on search
  const filteredChannels = channels.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
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
  }, [isDm, activeChannelId, members, currentUserId, currentUser.userId, channels]);

  const isSelfDm = isDm && (
    activeChannelId.endsWith(`-${currentUser.id}-${currentUser.id}`) ||
    activeChannelId.endsWith('-user-user') ||
    (dmMember ? (dmMember.id === currentUser.id || dmMember.id === `user-${currentUser.id}`) : false)
  );

  // Resolve Space channel if activeChannelId is a Space Channel
  const isSpaceChan = activeChannelId.includes(':space-') || activeChannelId.includes(':folder-') || activeChannelId.includes(':list-');

  const isEditableChannel = useMemo(() => {
    if (!activeChannelId) return false;
    if (activeChannelId.includes(':dm-')) return false;
    if (activeChannelId.endsWith('avaxa-brain-ai')) return false;
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
        spaceChanName = foundChan?.name || 'general';
        spaceChanDesc = foundChan?.description || `${space.emoji || '📁'} Kênh chat của Space: ${space.name}`;
      }
    }
  }

  return (
    <div className="flex min-h-[500px] h-full w-full rounded-3xl bg-white dark:bg-[#07080c] border border-slate-200/60 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden font-sans select-none animate-fadeIn text-slate-800 dark:text-slate-100">
      
      {/* ── COLUMN 1: Channels Sidebar (w-64) ── */}
      <div className={`w-full md:w-64 border-r border-slate-200/60 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#07080c] flex flex-col justify-between shrink-0 text-left ${
          isMobileChatActive ? 'hidden md:flex' : 'flex'
        }`}>
        <div className="p-4 space-y-4 flex-1 flex flex-col min-h-0">
          {/* Header area */}
          <div className="flex items-center justify-between px-2 py-1 select-none shrink-0">
            <span className="text-[15px] font-black text-slate-800 dark:text-slate-100 tracking-tight">Chat</span>
            <button
              onClick={() => {
                const selfDmId = `${workspaceId}:dm-${currentUser.id}-${currentUser.id}`;
                setActiveChannelId(selfDmId);
              }}
              className="p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 shadow-xs transition-all cursor-pointer active:scale-95"
              title="New Chat"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Channels list scrollable */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1.5 scrollbar-thin min-h-0">
            {/* Starred Channels Section */}
            {starredChannelIds.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between px-2 mb-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    Starred
                  </span>
                  <span className="text-[9px] font-extrabold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full font-mono">
                    {starredChannelIds.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {channels.filter(c => starredChannelIds.includes(c.id)).map(c => {
                    const isActive = c.id === activeChannelId;
                    return (
                      <button
                        key={`starred-${c.id}`}
                        onClick={() => setActiveChannelId(c.id)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-transparent ${
                          isActive 
                            ? 'bg-amber-50/80 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-bold border-amber-200/40' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                          <span className="truncate">{c.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between px-2 mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Channels</span>
                <button 
                  onClick={() => setShowCreateChannelModal(true)}
                  className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-0.5">
                {filteredChannels.filter(c => c.type !== 'dm' && c.type !== 'group' && c.id !== `${workspaceId}:avaxa-brain-ai` && !c.id.includes(':space-')).map(c => {
                  const isActive = c.id === activeChannelId;
                  const isDefault = c.id === `${workspaceId}:general` || c.id === `${workspaceId}:project-planning` || c.id === `${workspaceId}:design-review`;
                  
                  return (
                    <div 
                      key={c.id}
                      className={`w-full flex items-center justify-between rounded-xl group/chan border border-transparent transition-all ${
                        isActive 
                          ? 'bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-transparent dark:from-indigo-950/50 dark:via-purple-950/30 dark:to-transparent text-indigo-650 dark:text-indigo-300 border-indigo-200/40 dark:border-indigo-800/40 font-bold shadow-3xs' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-900/60 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <button
                        onClick={() => setActiveChannelId(c.id)}
                        className="flex-1 flex items-center gap-2 px-3 py-2 text-xs font-semibold cursor-pointer text-left truncate"
                      >
                        <Hash className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`} />
                        <span className="truncate">{c.name}</span>
                        {(unreadCounts[c.id] || 0) > 0 && (
                          <span className="ml-auto px-1.5 py-0.5 min-w-[18px] text-center text-[9px] font-black text-white bg-gradient-to-r from-rose-500 to-pink-500 rounded-full shadow-sm animate-bounce">
                            {unreadCounts[c.id] > 99 ? '99+' : unreadCounts[c.id]}
                          </span>
                        )}
                      </button>
                      
                      {!isDefault && (
                        <div className="relative shrink-0 flex items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveChannelMenuId(activeChannelMenuId === c.id ? null : c.id);
                            }}
                            className="p-1 mr-1.5 rounded-lg text-slate-450 hover:text-indigo-650 hover:bg-slate-100 transition-colors opacity-0 group-hover/chan:opacity-100 cursor-pointer"
                            title="Channel options"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                          {activeChannelMenuId === c.id && (
                            <div className="absolute right-0 top-6 bg-white border border-slate-200/80 rounded-xl shadow-lg p-1 z-30 min-w-[100px] text-left">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveChannelMenuId(null);
                                  setRenamingChannelId(c.id);
                                  setRenameChannelName(c.name);
                                  setRenameChannelDesc(c.description || '');
                                  setShowRenameModal(true);
                                }}
                                className="w-full text-left px-2 py-1.5 text-[10.5px] font-bold text-slate-650 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                              >
                                <Edit2 className="w-3 h-3 text-slate-450" />
                                Rename
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveChannelMenuId(null);
                                  if (confirm(`Are you sure you want to delete the channel #${c.name}? This action cannot be undone.`)) {
                                    handleDeleteChannel(c.id, c.name);
                                  }
                                }}
                                className="w-full text-left px-2 py-1.5 text-[10.5px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                              >
                                <Trash2 className="w-3 h-3 text-rose-450" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {channels.some(channel => channel.type === 'group') && (
              <div>
                <div className="mb-1.5 mt-3 flex items-center justify-between px-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Nhóm chat</span>
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="cursor-pointer rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                    title="Tạo nhóm chat"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-0.5">
                  {channels.filter(channel => channel.type === 'group').map(channel => {
                    const isActive = channel.id === activeChannelId;
                    return (
                      <button
                        key={channel.id}
                        onClick={() => setActiveChannelId(channel.id)}
                        className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-transparent px-3 py-2 text-xs font-semibold transition-colors ${isActive ? 'border-indigo-200/30 bg-indigo-50/80 font-bold text-indigo-700 dark:border-indigo-800/40 dark:bg-indigo-950/40 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'}`}
                      >
                        <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300">
                          <Users className="h-3.5 w-3.5" />
                        </span>
                        <span className="flex-1 truncate text-left">{channel.name}</span>
                        {(unreadCounts[channel.id] || 0) > 0 && (
                          <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-black text-white">{unreadCounts[channel.id] > 99 ? '99+' : unreadCounts[channel.id]}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Direct Messages Section */}
            <div>
              <div className="flex items-center justify-between px-2 mb-1.5 mt-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Direct Messages</span>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setShowCreateGroupModal(true)} className="cursor-pointer rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400" title="Tạo nhóm chat"><Users className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setShowNewDmModal(true)} className="cursor-pointer rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400" title="Nhắn tin với thành viên"><Plus className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="space-y-0.5">
                {members.filter(m => m.id !== currentUser.id && m.id !== 'user').map(member => {
                  const peerId = member.userId || member.id;
                  const dmKey = [currentUser.userId || currentUser.id, peerId].sort().join(':');
                  const dmChannelId = channels.find(channel => channel.type === 'dm' && channel.dmKey === dmKey)?.id || '';
                  const isActive = activeChannelId === dmChannelId;
                  
                  return (
                    <button
                      key={member.id}
                      onClick={() => openDirectMessage(member)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-transparent ${
                        isActive 
                          ? 'bg-indigo-50/80 text-indigo-650 border-indigo-200/20 font-bold' 
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                      }`}
                    >
                      <div className="relative shrink-0 flex">
                        <SignedImage filePath={member.avatar} alt={member.name} className="w-5.5 h-5.5 rounded-full border border-slate-200/50 bg-white animate-fadeIn" />
                        <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white ${
                          member.status === 'online' ? 'bg-emerald-500 animate-pulse' :
                          member.status === 'busy' ? 'bg-indigo-500' : 'bg-amber-400'
                        }`}></span>
                      </div>
                      <span className="truncate flex-1 text-left">{member.name}</span>
                      {(unreadCounts[dmChannelId] || 0) > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9.5px] font-black shadow-xs">
                          {unreadCounts[dmChannelId] > 99 ? '99+' : unreadCounts[dmChannelId]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>



          </div>
        </div>

        {/* Sidebar Footer Bar */}
        <div className="relative px-4 py-2.5 bg-slate-100/30 dark:bg-[#07080c] border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between shrink-0 text-slate-400 dark:text-slate-500 select-none">
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={() => setShowQuickCreateMenu(!showQuickCreateMenu)}
              className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Tạo nhanh"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={() => setShowActivityLogModal(true)}
              className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Lịch sử hoạt động"
            >
              <Clock className="w-4 h-4" />
            </button>
          </div>
          <button 
            type="button" 
            onClick={() => setShowChatSettingsModal(true)}
            className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Tùy chỉnh Chat"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Quick Create Menu Popover */}
          {showQuickCreateMenu && (
            <div className="absolute left-4 bottom-12 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 min-w-[180px] text-left animate-fadeIn">
              <div className="px-2.5 py-1 mb-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Tạo nhanh</span>
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
                onClick={() => {
                  setShowQuickCreateMenu(false);
                  const selfDmId = `${workspaceId}:dm-${currentUser.id}-${currentUser.id}`;
                  setActiveChannelId(selfDmId);
                  triggerToast?.('info', 'Ghi chú cá nhân 📝', 'Đã mở không gian ghi chú của bạn');
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                Viết ghi chú cá nhân
              </button>
            </div>
          )}
        </div>

        </div>

      {/* ── COLUMN 2: Main Chat Workspace ── */}
      <div 
        className={`flex-1 flex flex-col justify-between relative bg-white dark:bg-[#07080c] ${isDragOver ? 'ring-2 ring-indigo-400 ring-inset' : ''} ${
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
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-300">Drop file here to send</span>
              <span className="text-[10px] font-bold text-indigo-400 dark:text-indigo-400">Images, documents, audio files…</span>
            </div>
          </div>
        )}
        
        {/* Chat header */}
        <header className="relative z-30 flex shrink-0 flex-col border-b border-slate-200/80 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.02)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#090a0f]/95">
          {/* Top row */}
          <div className="flex min-h-[66px] items-center justify-between gap-4 px-4 py-2.5 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              {/* Mobile Back Button to Channels List */}
              <button
                onClick={() => setIsMobileChatActive(false)}
                className="mr-0.5 shrink-0 cursor-pointer rounded-xl border border-slate-200/70 bg-slate-50 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 md:hidden dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Quay lại danh sách chat"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {isSelfDm ? (
                <div className="relative shrink-0 flex">
                  <SignedImage filePath={currentUser.avatar} alt={currentUser.name} className="h-10 w-10 animate-fadeIn rounded-2xl border border-slate-200/70 bg-white object-cover shadow-sm dark:border-slate-700" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900"></span>
                </div>
              ) : isDm && dmMember ? (
                <div 
                  onClick={() => setViewingMemberProfileId(dmMember.id)}
                  className="relative shrink-0 flex cursor-pointer hover:opacity-85 transition-opacity"
                  title={`Xem hồ sơ của ${dmMember.name}`}
                >
                  <SignedImage filePath={dmMember.avatar} alt={dmMember.name} className="h-10 w-10 animate-fadeIn rounded-2xl border border-slate-200/70 bg-white object-cover shadow-sm dark:border-slate-700" />
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${dmMember.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                </div>
              ) : (
                <div className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 to-violet-100 text-sm font-black text-indigo-600 shadow-sm dark:border-indigo-800/60 dark:from-indigo-950/70 dark:to-violet-950/50 dark:text-indigo-300">
                  {isSpaceChan ? '📁' : '#'}
                </div>
              )}
              
              <div className="min-w-0 text-left">
                <div className="flex min-w-0 items-center gap-1.5">
                  <h2
                    onClick={() => isDm && dmMember && setViewingMemberProfileId(dmMember.id)}
                    className={`truncate text-[13px] font-extrabold leading-5 text-slate-900 dark:text-slate-100 sm:text-sm ${isDm && dmMember ? 'cursor-pointer transition-colors hover:text-indigo-600 dark:hover:text-indigo-400' : ''}`}
                    title={isDm && dmMember ? `Xem hồ sơ của ${dmMember.name}` : undefined}
                  >
                    {isSelfDm ? currentUser.name : (isDm && dmMember) ? dmMember.name : isSpaceChan ? spaceChanName : (activeChannel?.name || 'chat-room')}
                  </h2>
                {isEditableChannel && (
                  <div className="relative flex items-center">
                    <button 
                      onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                      className={`text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer transition-colors p-0.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 ${showHeaderMenu ? 'bg-slate-100 dark:bg-slate-800 text-indigo-650 dark:text-indigo-400' : ''}`}
                      title="Channel options"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                    {showHeaderMenu && (
                      <div className="absolute left-0 top-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-35 min-w-[140px] text-left animate-fadeIn">
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
                          className="w-full text-left px-2.5 py-1.5 text-[10.5px] font-bold text-slate-650 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Edit2 className="w-3 h-3 text-slate-450" />
                          Rename Channel
                        </button>
                        <button
                          onClick={() => {
                            setShowHeaderMenu(false);
                            const nameToDelete = isSpaceChan ? spaceChanName : (activeChannel?.name || 'this-channel');
                            if (confirm(`Are you sure you want to delete the channel #${nameToDelete}? This action cannot be undone.`)) {
                              handleDeleteChannel(activeChannelId, nameToDelete);
                            }
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-[10.5px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-955/30 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3 h-3 text-rose-450" />
                          Delete Channel
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <button 
                  type="button"
                  onClick={() => toggleStarChannel(activeChannelId)}
                  className={`shrink-0 cursor-pointer rounded-lg p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    starredChannelIds.includes(activeChannelId) ? 'text-amber-400 fill-amber-400' : 'text-slate-400 hover:text-amber-400'
                  }`}
                  title={starredChannelIds.includes(activeChannelId) ? "Bỏ yêu thích kênh" : "Yêu thích kênh"}
                >
                  <Star className={`w-4 h-4 ${starredChannelIds.includes(activeChannelId) ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
                </div>
                <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {isDm ? (
                    <>
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isSelfDm || dmMember?.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span>{isSelfDm ? 'Ghi chú cá nhân' : dmMember?.status === 'online' ? 'Đang hoạt động' : 'Ngoại tuyến'}</span>
                    </>
                  ) : (
                    <>
                      <span className="shrink-0">{activeChannel?.type === 'group' ? 'Nhóm chat' : activeChannel?.type === 'private' ? 'Kênh riêng tư' : 'Kênh workspace'}</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="max-w-[280px] truncate">{isSpaceChan ? (spaceChanDesc || 'Trao đổi công việc cùng nhóm') : (activeChannel?.description || 'Trao đổi công việc cùng nhóm')}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={() => { setActiveSidebarTab('search'); setShowMemberDrawer(true); }}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-transparent text-slate-500 transition-all hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                title="Tìm trong cuộc trò chuyện"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => { setActiveSidebarTab('members'); setShowMemberDrawer(true); }}
                className="hidden h-8 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-2.5 text-[10.5px] font-bold text-slate-600 shadow-xs transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 sm:flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/50"
                title="Xem thành viên"
              >
                <Users className="h-3.5 w-3.5" />
                <span>{members.length}</span>
              </button>
              <div className="hidden h-8 items-center gap-2 rounded-xl bg-slate-950 px-3 text-[10.5px] font-extrabold text-white shadow-sm lg:flex dark:bg-white dark:text-slate-950">
                <span className={`h-1.5 w-1.5 rounded-full ${isOffline ? 'bg-amber-400' : 'bg-violet-400'}`} />
                <span>Brain² Chat</span>
              </div>
            </div>
          </div>

        </header>

        {/* Pinned Messages Bar */}
        {messages.filter(m => m.isPinned).length > 0 && (
          <div className="px-5 py-2 bg-amber-50/40 border-b border-amber-100/60 flex items-center gap-3 overflow-x-auto shrink-0 select-none scrollbar-none">
            <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider flex items-center gap-1 shrink-0">
              <Pin className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              Pinned:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto min-w-0">
              {messages.filter(m => m.isPinned).map(msg => (
                <div 
                  key={msg.id}
                  onClick={() => handleScrollToMessage(msg.id)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white border border-amber-200/50 rounded-full text-xs font-bold text-slate-700 cursor-pointer shadow-xs hover:border-amber-300 transition-colors shrink-0 max-w-[200px]"
                >
                  <span className="truncate flex-1 text-[11px] font-semibold">{msg.content || (msg.attachment ? '[Attachment]' : 'Tin nhắn')}</span>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePinMessage(msg.id, true);
                    }}
                    className="text-slate-400 hover:text-rose-500 p-0.5 rounded-full hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages List Area */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 pr-3 scrollbar-thin">
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
          {isSelfDm && (
            <div className="flex flex-col items-center justify-center text-center py-10 max-w-md mx-auto select-none border-b border-slate-100 dark:border-slate-800/40 mb-6 animate-fadeIn">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 flex items-center justify-center mb-4 text-2xl">
                🧠
              </div>
              <h2 className="text-[15px] font-black text-slate-800 dark:text-slate-105 mb-1.5">This is your personal space</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-semibold">
                It's just you and your brilliant ideas! Draft messages, set reminders, or store ideas and files for easy access later.
              </p>
              <button type="button" className="flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-350 transition-all w-full cursor-pointer shadow-xs">
                <span>👤</span> View Profile
              </button>
              
              {/* Calendar option card */}
              <div className="mt-4 w-full p-4 border border-rose-100 bg-rose-50/20 dark:border-rose-955/40 dark:bg-rose-955/10 rounded-2xl flex items-center gap-3 text-left hover:bg-rose-50/40 dark:hover:bg-rose-955/20 transition-all cursor-pointer">
                <span className="text-2xl">📅</span>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-800 dark:text-slate-150">View your calendar</span>
                  <span className="block text-[10px] text-slate-455 dark:text-slate-400 font-medium mt-0.5">Create events or manage your schedule</span>
                </div>
              </div>
            </div>
          )}

          {messages.filter(m => !m.parentId).map((msg, idx, filtered) => {
            const isMe = msg.senderId === currentUser.id || msg.senderId === 'user';
            const isEditing = editingMsgId === msg.id;

            // Date separator logic
            let showDateSep = false;
            const msgDateLabel = getDateLabel(msg.timestamp);
            if (idx === 0 && msgDateLabel) {
              showDateSep = true;
            } else if (idx > 0 && msgDateLabel) {
              const prevLabel = getDateLabel(filtered[idx - 1].timestamp);
              if (prevLabel !== msgDateLabel) showDateSep = true;
            }

            return (
              <div key={msg.id}>
                {/* Date Separator Pill */}
                {showDateSep && msgDateLabel && (
                  <div className="flex items-center gap-3 py-3 mb-2">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                    <span className="px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border border-slate-200/60 rounded-full shadow-sm whitespace-nowrap">
                      {msgDateLabel}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                  </div>
                )}

              <div 
                id={`msg-${msg.id}`}
                className={`flex gap-3 items-start group relative rounded-xl p-3 transition-all ${
                  msg.isAi 
                    ? 'bg-gradient-to-r from-indigo-50/20 via-purple-50/10 to-transparent border-l-[3px] border-indigo-505 dark:from-indigo-950/15 dark:via-purple-955/5 dark:to-transparent' 
                    : 'hover:bg-slate-50/40 dark:hover:bg-slate-800/10'
                }`}
              >
                {/* Sender Avatar */}
                {msg.isAi ? (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Bot className="w-4.5 h-4.5 animate-pulse" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setViewingMemberProfileId(msg.senderId)}
                    className="rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer transition-transform active:scale-95 hover:opacity-85 group/avatar shrink-0"
                    title={`Xem hồ sơ của ${msg.senderName}`}
                  >
                    <SignedImage filePath={msg.senderAvatar} alt={msg.senderName} className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/50 shrink-0 object-cover" />
                  </button>
                )}

                {/* Message Body */}
                <div className="flex-1 min-w-0 text-left space-y-1">
                  <div className="flex items-center gap-2">
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
                    <span className="text-[9px] text-slate-450 dark:text-slate-500 font-mono">{msg.timestamp}</span>
                    {msg.editedAt && <span className="text-[8.5px] text-slate-400 font-semibold">đã chỉnh sửa</span>}
                    {isMe && (
                      <span className="flex items-center gap-0.5 ml-1 select-none group/ticks relative" title={isOffline ? "Sent (Offline)" : "Read by team"}>
                        {isOffline ? (
                          <span className="text-slate-400 font-mono text-[9px] font-bold">✓</span>
                        ) : (
                          <>
                            <span className="text-emerald-500 font-mono text-[9.5px] font-black tracking-tighter">✓✓</span>
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-5 bg-slate-900 text-white text-[9.5px] font-bold px-2 py-1 rounded-lg opacity-0 pointer-events-none group-hover/ticks:opacity-100 transition-opacity whitespace-nowrap z-30 shadow-md">
                              Đã đọc bởi: {members.slice(0, 2).map(m => m.name).join(', ')}
                            </div>
                          </>
                        )}
                      </span>
                    )}
                    {msg.isAi && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[7.5px] font-black bg-indigo-650 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide leading-none scale-90 select-none">AI BOT</span>
                        <button
                          onClick={() => handleToggleSpeech(msg.id, msg.content)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-450 hover:text-indigo-650 transition-colors cursor-pointer"
                          title={playingMsgId === msg.id ? "Mute speech" : "Read message out loud"}
                        >
                          {playingMsgId === msg.id ? <VolumeX className="w-3.5 h-3.5 text-indigo-650 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 mt-1">
                      <input 
                        type="text" 
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-indigo-400 text-xs outline-none bg-slate-50"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleEditMessage(msg.id, editVal);
                          if (e.key === 'Escape') setEditingMsgId(null);
                        }}
                      />
                      <div className="flex gap-2 text-[9px] font-bold">
                        <button onClick={() => handleEditMessage(msg.id, editVal)} className="text-indigo-650 hover:underline cursor-pointer">Save changes</button>
                        <button onClick={() => setEditingMsgId(null)} className="text-slate-400 hover:underline cursor-pointer">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium break-words">
                      {formatMessageContent(msg.content)}
                      
                      {msg.attachment && (
                        <div className="mt-2 select-none">
                          {msg.attachment.isVoice ? (
                            <VoiceMessagePlayer 
                              filePath={msg.attachment.filePath} 
                              duration={msg.attachment.duration} 
                            />
                          ) : msg.attachment.isImage ? (
                            <div className="relative rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 max-w-[240px] shadow-xs group/img bg-slate-50 dark:bg-slate-800">
                              <SignedImage 
                                filePath={msg.attachment.filePath} 
                                alt={msg.attachment.name}
                                bucket="chat-attachments"
                                className="max-w-[240px] max-h-[180px] object-cover hover:scale-[1.02] transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-between p-2">
                                <span className="text-[9px] text-white font-bold truncate bg-slate-900/60 px-1.5 py-0.5 rounded-lg">{msg.attachment.name}</span>
                              </div>
                            </div>
                          ) : (msg.attachment as any)?.isVideoMeet ? (
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-950/40 dark:via-purple-950/30 border border-indigo-200 dark:border-indigo-800 max-w-sm space-y-3 text-left">
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
                                Tham gia ngay (Join Meeting)
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

                  {/* Interactive Poll Rendering */}
                  {msg.attachment?.isPoll && (
                    <div className="mt-2.5 p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2.5 max-w-md text-left select-none">
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
                          className="px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-[10px] flex items-center gap-1 hover:bg-slate-100 transition-colors cursor-pointer select-none"
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

                {/* Actions Popover (Hover menus) */}
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xl backdrop-blur-md p-1 z-20">
                  {/* Quick Reactions */}
                  {['👍', '❤️', '🎉', '😂'].map(emoji => (
                    <button 
                      key={emoji}
                      onClick={() => handleAddReaction(msg.id, emoji)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-xs select-none transition-all"
                    >
                      {emoji}
                    </button>
                  ))}

                  {/* Translate Message Button */}
                  <button 
                    onClick={() => handleTranslateMessage(msg.id, msg.content)}
                    className={`p-1 rounded-lg cursor-pointer transition-colors ${
                      translatedMessages[msg.id] ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={translatingMsgId === msg.id ? "Đang dịch..." : "Dịch tin nhắn bằng AI"}
                  >
                    {translatingMsgId === msg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" /> : <Globe className="w-3.5 h-3.5" />}
                  </button>

                  {/* Reply in Thread */}
                  <button 
                    onClick={() => handleOpenThread(msg)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-slate-400 dark:text-slate-500 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors"
                    title="Reply in Thread"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>

                  {/* Pin/Unpin Message */}
                  <button 
                    onClick={() => handleTogglePinMessage(msg.id, !!msg.isPinned)}
                    className={`p-1 rounded-lg cursor-pointer transition-colors ${
                      msg.isPinned 
                        ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-955/30' 
                        : 'text-slate-400 dark:text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-955/30'
                    }`}
                    title={msg.isPinned ? "Unpin message" : "Pin message"}
                  >
                    {msg.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  </button>

                  {/* Forward Message */}
                  <button 
                    onClick={() => setForwardingMessage(msg)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                    title="Forward message"
                  >
                    <Forward className="w-3.5 h-3.5" />
                  </button>

                  {/* Convert to Task */}
                  {onAddTask && (
                    <button 
                      onClick={() => handleOpenConvertModal(msg)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      title="Tạo Task từ tin nhắn"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Edit/Delete for own messages */}
                  {isMe && (
                    <>
                      <button 
                        onClick={() => { setEditingMsgId(msg.id); setEditVal(msg.content); }}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Edit Message"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1 hover:bg-rose-50 rounded-md cursor-pointer text-slate-400 hover:text-rose-500 transition-colors"
                        title="Delete message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

              </div>
              </div>
            );
          })}

          {/* AI typing simulation tracker */}
          {isAiTyping && (
            <div className="flex gap-3 items-start animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                <Bot className="w-4.5 h-4.5 animate-spin" />
              </div>
              <div className="space-y-1 text-left">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Avaxa Brain AI</span>
                <div className="flex gap-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 max-w-sm">
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

        {/* Attachment preview box */}
        {selectedFile && (
          <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3 animate-slideUp">
            <div className="flex items-center gap-2 min-w-0">
              {selectedFile.type.startsWith('image/') ? (
                <SignedImage filePath={selectedFile.url} alt={selectedFile.name} bucket="chat-attachments" className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
              ) : (
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Globe className="w-4.5 h-4.5" />
                </div>
              )}
              <div className="min-w-0 text-left">
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{selectedFile.name}</span>
                <span className="block text-[9.5px] text-slate-400 font-bold font-mono">{(selectedFile.size / 1024).toFixed(1)} KB</span>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setSelectedFile(null)}
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Rich Emoji & Sticker Picker popover */}
        {showEmojiPicker && (
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
        )}

        {/* GIF Gallery Popover */}
        {showGifPicker && (
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
        )}

                {/* Mockup-style unified rich editor box card */}
        <div className="px-3.5 py-2.5 bg-white/90 dark:bg-[#07080c]/90 border-t border-slate-200/60 dark:border-slate-800/80 backdrop-blur-md shrink-0">
          <form onSubmit={handleSendMessage} className="relative border border-slate-200/80 dark:border-slate-800/80 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 rounded-2xl px-3 py-2 bg-white dark:bg-[#0e0f17] transition-all shadow-sm flex flex-col gap-1.5 select-text">
            
            {/* Selected file preview widget */}
            {selectedFile && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <div className="flex items-center gap-2 truncate">
                  <span>📎</span>
                  <span className="truncate">{selectedFile.name}</span>
                </div>
                <button type="button" onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Input Text Area container */}
            {isRecording ? (
              <div className="flex-1 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-955/30 border border-rose-250 dark:border-rose-900/50 animate-pulse text-xs font-semibold text-rose-600 dark:text-rose-400">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-600 dark:bg-rose-400 animate-ping"></span>
                  <span>Recording Voice: {recordingDuration}s</span>
                </div>
                <button 
                  type="button" 
                  onClick={stopRecording}
                  className="p-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                </button>
              </div>
            ) : (
              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  value={inputVal}
                  onChange={handleInputChange}
                  placeholder={
                    isSelfDm 
                      ? `Write to ${currentUser.name}, press 'space' for AI, '/' for commands`
                      : activeChannel?.name.includes('ai') 
                        ? "Ask Avaxa Brain AI..." 
                        : `Write to ${isDm && dmMember ? dmMember.name : (activeChannel?.name || 'chat')}, press 'space' for AI...`
                  }
                  className="w-full bg-transparent border-0 outline-none text-xs font-semibold placeholder-slate-400 dark:placeholder-slate-500 text-slate-800 dark:text-slate-100 resize-none min-h-[38px] custom-scrollbar focus:ring-0 p-0"
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

                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />

                {/* @Mention Autocomplete Dropdown */}
                {showMentionDropdown && filteredMentionMembers.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 min-w-[180px] max-h-[180px] overflow-y-auto animate-fadeIn">
                    <div className="px-2 py-1 mb-1">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Mention a member</span>
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

                {/* Slash Commands Dropdown */}
                {showCommandDropdown && filteredCommands.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xl p-1.5 z-[60] min-w-[240px] max-h-[220px] overflow-y-auto animate-fadeIn">
                    <div className="px-2 py-1 mb-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-405 dark:text-slate-500">Quick Commands</span>
                    </div>
                    {filteredCommands.map((cmd, idx) => (
                      <button
                        key={cmd.name}
                        type="button"
                        onClick={() => handleSelectCommand(cmd)}
                        className={`w-full flex flex-col gap-0.5 px-2.5 py-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer text-left ${idx === activeCommandIndex ? 'bg-indigo-50 dark:bg-indigo-950/20 font-bold' : ''}`}
                      >
                        <span className="text-[10.5px] font-black text-indigo-600 dark:text-indigo-400">{cmd.name}</span>
                        <span className="text-[9px] font-bold text-slate-405 dark:text-slate-500">{cmd.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Hidden File Input handler */}
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
                  triggerToast?.('success', 'File selected 📎', `Ready to send: ${file.name}`);
                  e.target.value = '';
                }
              }}
            />

            {/* Bottom Row Utilities and Actions */}
            <div className="flex items-center justify-between mt-0.5 pt-1 border-t border-slate-100/60 dark:border-slate-800/60">
              {/* Left Utilities */}
              <div className="relative flex items-center gap-1 text-slate-400 dark:text-slate-500 select-none">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1 hover:text-slate-750 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title="Tải file đính kèm">
                  <Plus className="w-3.5 h-3.5" />
                </button>

                {/* AI Sparkles Assistant Dropdown */}
                <div className="relative">
                  <button 
                    type="button" 
                    onClick={() => setShowAiEnhanceMenu(!showAiEnhanceMenu)} 
                    className={`p-1 hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ${showAiEnhanceMenu ? 'bg-amber-50 text-amber-500' : ''}`} 
                    title="AI Trợ lý viết & Tối ưu văn bản"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-amber-500 ${isAiEnhancing ? 'animate-spin' : 'animate-pulse'}`} />
                  </button>

                  {showAiEnhanceMenu && (
                    <div className="absolute left-0 bottom-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 min-w-[200px] text-left animate-fadeIn">
                      <div className="px-2.5 py-1 mb-1 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Avaxa AI Writer</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAiEnhanceInput('expand')}
                        className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                      >
                        🪄 Viết tiếp & Mở rộng ý
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAiEnhanceInput('formal')}
                        className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                      >
                        👔 Viết lại trang trọng (Formal)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAiEnhanceInput('shorten')}
                        className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                      >
                        🎯 Tóm tắt ngắn gọn
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAiEnhanceInput('translate')}
                        className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                      >
                        🌐 Dịch sang Tiếng Anh
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAiEnhanceInput('spelling')}
                        className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                      >
                        ✏️ Sửa lỗi chính tả & Văn phong
                      </button>
                    </div>
                  )}
                </div>

                <button type="button" onClick={() => insertFormatting('bold')} className="p-1 hover:text-slate-750 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title="Định dạng Bold (**text**)">
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => insertFormatting('italic')} className="p-1 hover:text-slate-750 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title="Định dạng Nghiêng (*text*)">
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => insertFormatting('code')} className="p-1 hover:text-slate-750 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title="Định dạng Code (`code`)">
                  <Code className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1 hover:text-slate-750 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title="Đính kèm file">
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => { setInputVal(prev => prev + '@'); setShowMentionDropdown(true); setMentionQuery(''); }} className="p-1 hover:text-slate-750 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title="Tag tên thành viên (@)">
                  <AtSign className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1 hover:text-slate-750 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title="Biểu cảm Emoji">
                  <Smile className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setShowGifPicker(!showGifPicker)} className={`p-1 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ${showGifPicker ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' : ''}`} title="Kho GIF & Sticker">
                  <span className="text-[9px] font-black leading-none border border-slate-350 dark:border-slate-700 px-1 py-0.5 rounded">GIF</span>
                </button>
                <button type="button" onClick={() => setShowVideoMeetModal(true)} className="p-1 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title="Tạo cuộc họp Video (Video Call)">
                  <Video className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setShowChecklistModal(true)} className="p-1 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title="Tạo danh sách công việc (Checklist)">
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setShowTemplateModal(true)} className="p-1 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title="Mẫu tin nhắn chuẩn (Templates)">
                  <FileText className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setShowAutomationModal(true)} className="p-1 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title="Tự động hóa Kênh (Automation & Webhook)">
                  <Zap className="w-3.5 h-3.5 text-indigo-500" />
                </button>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2">
                {activeChannel?.name.includes('ai') && (
                  <button
                    type="button"
                    onClick={() => setSearchWeb(!searchWeb)}
                    className={`p-1 rounded-lg border transition-colors cursor-pointer shrink-0 flex items-center justify-center ${
                      searchWeb 
                        ? 'border-indigo-550 bg-indigo-50 text-indigo-650' 
                        : 'border-slate-200/60 bg-slate-50 text-slate-400 hover:text-indigo-650 hover:bg-slate-100'
                    }`}
                    title={searchWeb ? "Web Search Grounding Enabled" : "Web Search Grounding Disabled"}
                  >
                    <Globe className="w-3.5 h-3.5" />
                  </button>
                )}

                {!isRecording && (
                  <button type="button" onClick={startRecording} className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Record Voice">
                    <Mic className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
                
                <button type="submit" disabled={!inputVal.trim() && !selectedFile} className={`p-1.5 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  (inputVal.trim() || selectedFile) 
                    ? 'bg-indigo-650 text-white shadow-xs hover:bg-indigo-750 active:scale-95' 
                    : 'text-slate-350 bg-slate-50 border border-slate-200/60 pointer-events-none'
                }`} title="Send Message">
                  <Send className="w-3.5 h-3.5 fill-current" />
                </button>
                
                <button type="button" className="text-slate-400 hover:text-slate-750 transition-colors p-1 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
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
            className="border-l border-slate-200/60 bg-slate-50/50 flex flex-col justify-between shrink-0 text-left overflow-hidden relative"
          >
            <div className="p-4 space-y-4 flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Chat Details</span>
                <button onClick={() => setShowMemberDrawer(false)} className="p-0.5 rounded-md hover:bg-slate-150 text-slate-400 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              </div>

              {/* Tab selectors */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl text-[10px] font-black tracking-wide uppercase shrink-0">
                {(['members', 'search', 'files'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveSidebarTab(tab)}
                    className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer ${
                      activeSidebarTab === tab 
                        ? 'bg-white text-slate-800 shadow-sm' 
                        : 'text-slate-405 hover:text-slate-650'
                    }`}
                  >
                    {tab}
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
                          <SignedImage filePath={m.avatar} alt={m.name} className="w-6.5 h-6.5 rounded-full border border-slate-200/50 object-cover bg-white animate-fadeIn group-hover/m:scale-105 transition-transform" />
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                            m.status === 'online' ? 'bg-emerald-500 animate-pulse' :
                            m.status === 'busy' ? 'bg-indigo-500' : 'bg-amber-400'
                          }`} />
                        </div>
                        <div className="min-w-0 leading-none">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block truncate group-hover/m:text-indigo-600 dark:group-hover/m:text-indigo-400 transition-colors">{m.name}</span>
                          <span className="text-[8px] text-slate-400 font-medium block mt-0.5">{m.role === 'admin' ? 'PM' : 'Developer'}</span>
                        </div>
                      </div>
                    ))}
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
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200/60 outline-none text-[11px] font-medium placeholder-slate-400 focus:border-indigo-500 transition-colors"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>

                    <div className="space-y-2.5">
                      {localSearchQuery.trim() ? (
                        messages.filter(m => m.content.toLowerCase().includes(localSearchQuery.toLowerCase())).map(m => (
                          <div key={m.id} className="p-2 rounded-xl bg-white border border-slate-150 text-[10.5px] text-left hover:border-indigo-250 transition-colors">
                            <div className="flex justify-between font-bold text-slate-550 text-[9px] mb-1">
                              <span>{m.senderName}</span>
                              <span>{m.timestamp}</span>
                            </div>
                            <p className="text-slate-700 font-semibold break-words leading-normal">{m.content}</p>
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
                        <div key={m.id} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-150 text-left hover:border-indigo-255 transition-colors">
                          {file.isVoice ? (
                            <div className="p-2 rounded-lg bg-rose-50 text-rose-600 shrink-0">
                              <Mic className="w-4 h-4" />
                            </div>
                          ) : file.isImage ? (
                            <SignedImage filePath={file.filePath} alt={file.name} bucket="chat-attachments" className="w-8 h-8 rounded-lg object-cover border border-slate-200 bg-slate-50 shrink-0" />
                          ) : (
                            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                              <Globe className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="block text-[10px] font-bold text-slate-700 truncate">{file.name}</span>
                            <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider font-mono mt-0.5">
                              {file.isVoice ? 'Audio Voice' : file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'File'}
                            </span>
                          </div>
                          <a 
                            href={file.filePath} 
                            download={file.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
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
            className="border-l border-slate-200/60 bg-slate-50/50 flex flex-col justify-between shrink-0 text-left overflow-hidden relative h-full"
          >
            <div className="p-4 space-y-4 flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Thread Discussion</span>
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
                <div className="text-xs text-slate-700 leading-normal font-medium break-words">
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
                  <p className="text-[10px] text-slate-400 font-bold text-center py-8">No replies yet. Start the thread conversation!</p>
                )}
              </div>

              {/* Thread Input box */}
              <form onSubmit={handleSendThreadReply} className="pt-2 border-t border-slate-150 flex gap-2 items-center shrink-0">
                <input 
                  type="text"
                  value={threadInputVal}
                  onChange={e => setThreadInputVal(e.target.value)}
                  placeholder="Reply in thread..."
                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200/60 focus:border-indigo-500 outline-none text-xs font-semibold placeholder-slate-400"
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
            className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-left"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <Hash className="w-4.5 h-4.5 text-indigo-500" />
                Create New Channel
              </h3>
              <button 
                onClick={() => setShowCreateChannelModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Channel Name</label>
                <input 
                  type="text" 
                  required 
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  placeholder="e.g. marketing, customer-support" 
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 outline-none bg-white focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Description</label>
                <textarea 
                  value={newChannelDesc}
                  onChange={e => setNewChannelDesc(e.target.value)}
                  placeholder="Briefly describe what this channel is for..." 
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 outline-none bg-white focus:border-indigo-500 font-semibold h-20 resize-none"
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
                      className={`rounded-xl border px-3 py-2 text-left transition-colors ${newChannelType === type ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                      <span className="block text-[11px] font-black">{type === 'public' ? 'Công khai' : 'Riêng tư'}</span>
                      <span className="block text-[9px] font-semibold mt-0.5">{type === 'public' ? 'Mọi thành viên workspace' : 'Chỉ thành viên được thêm'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 text-xs font-bold">
                <button 
                  type="button"
                  onClick={() => setShowCreateChannelModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 rounded-xl text-white shadow-md hover:brightness-105 transition-all cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, var(--avaxa-gradient-start), var(--avaxa-gradient-end))' }}
                >
                  Create
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
            className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-left"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <Edit2 className="w-4.5 h-4.5 text-indigo-500" />
                Rename Channel
              </h3>
              <button 
                onClick={() => setShowRenameModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameChannel} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Channel Name</label>
                <input 
                  type="text" 
                  required 
                  value={renameChannelName}
                  onChange={e => setRenameChannelName(e.target.value)}
                  placeholder="e.g. marketing-updates" 
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 outline-none bg-white focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Description</label>
                <textarea 
                  value={renameChannelDesc}
                  onChange={e => setRenameChannelDesc(e.target.value)}
                  placeholder="Briefly describe what this channel is for..." 
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 outline-none bg-white focus:border-indigo-500 font-semibold h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 text-xs font-bold">
                <button 
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 rounded-xl text-white shadow-md hover:brightness-105 transition-all cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, var(--avaxa-gradient-start), var(--avaxa-gradient-end))' }}
                >
                  Save Changes
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
            className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-left"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <Forward className="w-4.5 h-4.5 text-blue-500" />
                Forward Message
              </h3>
              <button 
                onClick={() => setForwardingMessage(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview of forwarded message */}
            <div className="px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-left">
              <div className="flex items-center gap-1.5 mb-1">
                <SignedImage filePath={forwardingMessage.senderAvatar} alt={forwardingMessage.senderName} className="w-4 h-4 rounded-full" />
                <span className="text-[10px] font-black text-slate-700">{forwardingMessage.senderName}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold line-clamp-3">{forwardingMessage.content}</p>
            </div>

            {/* Channel select list */}
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Select channel</span>
              {channels.filter(c => c.id !== activeChannelId).map(c => (
                <button
                  key={c.id}
                  onClick={() => handleForwardMessage(c.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-indigo-50 transition-colors cursor-pointer text-left"
                >
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-700">{c.name}</span>
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
                  Convert Message to Task
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
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Task Title</label>
                <input 
                  type="text" 
                  value={convertTaskTitle} 
                  onChange={e => setConvertTaskTitle(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-805 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-colors" 
                  placeholder="Task title"
                />
              </div>

              {/* Space & List selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Target Space</label>
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
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Target List</label>
                  <select 
                    value={convertTaskListId}
                    onChange={e => setConvertTaskListId(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 outline-none cursor-pointer"
                  >
                    {spaces.find(s => s.id === convertTaskSpaceId)?.lists?.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    )) || <option value="">— No lists —</option>}
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
                    <option value="">— Unassigned —</option>
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
                  className="flex-1 py-2 rounded-xl border border-slate-250 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-bold text-slate-550 dark:text-slate-400 cursor-pointer text-center transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="button"
                  onClick={handleCreateTaskFromMsg}
                  disabled={!convertTaskTitle.trim() || !convertTaskListId}
                  className="flex-1 py-2 rounded-xl text-xs font-black text-white shadow-md hover:shadow-indigo-500/20 active:shadow-none transition-all hover:brightness-105 cursor-pointer text-center disabled:opacity-50 disabled:pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, var(--avaxa-gradient-start), var(--avaxa-gradient-end))' }}
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
                          senderId: 'avaxa-ai',
                          senderName: 'Avaxa Brain AI',
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
                            <SignedImage filePath={member.avatar} alt={member.name} className="w-8 h-8 rounded-full border border-slate-200/50 bg-white" />
                            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                              member.status === 'online' ? 'bg-emerald-500' :
                              member.status === 'busy' ? 'bg-indigo-500' : 'bg-amber-400'
                            }`}></span>
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
                    {members.filter(member => member.id !== currentUser.id && member.id !== 'user' && Boolean(resolveMemberAuthId(member))).filter(member => {
                      const query = groupSearchQuery.trim().toLowerCase();
                      return !query || member.name.toLowerCase().includes(query) || member.email?.toLowerCase().includes(query);
                    }).map(member => {
                      const userId = resolveMemberAuthId(member)!;
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
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Webhook Integration URL</label>
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
              className="relative w-full max-w-md rounded-3xl modal-glass-card p-6 overflow-hidden space-y-4 text-left border border-white/80 dark:border-slate-800/80 shadow-2xl shadow-indigo-500/10 select-none z-10"
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
                    onChange={e => setChatSettings({ ...chatSettings, desktopNotifications: e.target.checked })}
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
                  className="px-5 py-2.5 rounded-xl text-white shadow-md hover:brightness-105 transition-all cursor-pointer bg-gradient-to-r from-indigo-600 to-violet-600 font-black"
                >
                  Hoàn tất
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
