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
  Forward, AtSign, Check, Settings, ChevronDown, ChevronLeft, Clock, CheckSquare, Calendar
} from 'lucide-react';
import { callAiApi } from '@/lib/aiClient';
import { useSpaceStore } from '../store/spaceStore';

const VoiceMessagePlayer = ({ filePath, duration }: { filePath: string; duration?: number }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);

  useEffect(() => {
    const audio = new Audio(filePath);
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
  }, [filePath]);

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
  forcedChannelId?: string;
  forcedChannelName?: string;
  spaces?: Space[];
  onSaveSpaces?: (spaces: Space[]) => void;
  onAddTask?: (task: any) => void;
  setViewType?: (view: any) => void;
}

// Minimal markdown formatter
const formatLineMarkdown = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|@\w[\w\s]*?\b)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-black text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return <em key={i} className="italic text-slate-700 font-semibold">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-250/20 text-indigo-700 font-mono text-[10px] font-bold mx-0.5">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('@') && part.length > 1) {
      return <span key={i} className="px-1 py-0.5 rounded-md bg-blue-50 text-blue-600 font-bold text-[11px] cursor-pointer hover:bg-blue-100 transition-colors">{part}</span>;
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
        <div key={idx} className="pl-3 py-1 border-l-3 border-indigo-400 bg-slate-50/50 rounded-r-lg text-slate-500 italic my-1">
          {formatLineMarkdown(content)}
        </div>
      );
    }
    return <div key={idx} className="min-h-[16px]">{formatLineMarkdown(line)}</div>;
  });
  return <div className="space-y-0.5">{processedLines}</div>;
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
  forcedChannelId,
  forcedChannelName,
  spaces = [],
  onSaveSpaces,
  onAddTask,
  setViewType
}: ChatRoomProps) {
  const { t } = useTranslation();
  // Navigation & Channels
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('');
  const [isMobileChatActive, setIsMobileChatActive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showMemberDrawer, setShowMemberDrawer] = useState(false);

  // Custom Channel Management states
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [channelScope, setChannelScope] = useState<'workspace' | 'space'>('workspace');
  const [createChannelSpaceId, setCreateChannelSpaceId] = useState<string>('');

  useEffect(() => {
    if (spaces && spaces.length > 0 && !createChannelSpaceId) {
      setCreateChannelSpaceId(spaces[0].id);
    }
  }, [spaces, createChannelSpaceId]);
  
  // Custom Channel Actions & Rename states
  const [activeChannelMenuId, setActiveChannelMenuId] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingChannelId, setRenamingChannelId] = useState<string | null>(null);
  const [renameChannelName, setRenameChannelName] = useState('');
  const [renameChannelDesc, setRenameChannelDesc] = useState('');
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const channelSubscriptionRef = useRef<any>(null);

  // Emoji Picker Popover state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // File Attachment states
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number; type: string; url?: string; isVoice?: boolean; duration?: number } | null>(null);

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

  // Initialize channels and load custom channels
  useEffect(() => {
    if (forcedChannelId) {
      const channel: ChatChannel = {
        id: forcedChannelId,
        name: forcedChannelName || 'Channel',
        description: `Collaborate seamlessly across tasks and conversations. Start chatting with your team or connect tasks to stay on top of your work.`,
        type: 'public'
      };
      setChannels([channel]);
      setActiveChannelId(forcedChannelId);
      return;
    }

    const defaultChannels: ChatChannel[] = [
      { id: `${workspaceId}:general`, name: 'general', description: 'Kênh thảo luận chung cho tất cả thành viên.', type: 'public' },
      { id: `${workspaceId}:avaxa-brain-ai`, name: 'avaxa-brain-ai', description: 'Hỏi đáp với AI thông quang.', type: 'public' }
    ];

    const customChannels: ChatChannel[] = [];
    spaces.forEach(s => {
      if (s.channels && Array.isArray(s.channels)) {
        s.channels.forEach((c: any) => {
          if (c.id !== 'general' && c.id !== 'avaxa-brain-ai') {
            if (s.id.endsWith('-general') && c.id.startsWith('workspace-')) {
              customChannels.push({
                id: `${workspaceId}:${c.id}`,
                name: c.name,
                description: c.description || 'Kênh thảo luận chung của workspace',
                type: c.type || 'public'
              });
            } else if (c.id.startsWith('folder-')) {
              customChannels.push({
                id: `${workspaceId}:folder-${s.id}-${c.id.substring(7)}`,
                name: c.name,
                description: c.description || `Kênh chat của Folder ${c.name}`,
                type: c.type || 'public'
              });
            } else if (c.id.startsWith('list-')) {
              customChannels.push({
                id: `${workspaceId}:list-${s.id}-${c.id.substring(5)}`,
                name: c.name,
                description: c.description || `Kênh chat của List ${c.name}`,
                type: c.type || 'public'
              });
            } else {
              customChannels.push({
                id: `${workspaceId}:space-${s.id}-${c.id}`,
                name: c.name,
                description: c.description || `Kênh chat của Space ${s.name}`,
                type: c.type || 'public'
              });
            }
          }
        });
      }
    });

    const allChannels = [...defaultChannels, ...customChannels];
    setChannels(allChannels);

    // Auto select first channel if not set or active channel is deleted
    if (!activeChannelId || !allChannels.some(c => c.id === activeChannelId)) {
      const defaultActive = initialSelectedChannelId || `${workspaceId}:general`;
      setActiveChannelId(defaultActive);
    }
  }, [workspaceId, initialSelectedChannelId, forcedChannelId, forcedChannelName, spaces, activeChannelId]);

  // Channel Actions
  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const cleanedName = newChannelName.trim().toLowerCase().replace(/\s+/g, '-');
    
    let targetSpaceId = '';
    let localChanId = '';
    
    if (channelScope === 'workspace') {
      const generalSpace = spaces.find(s => s.id.endsWith('-general')) || spaces[0];
      if (!generalSpace) {
        triggerToast?.('info', 'Create Error', 'No general space found.');
        return;
      }
      targetSpaceId = generalSpace.id;
      localChanId = `workspace-custom-${Date.now()}`;
    } else {
      if (!createChannelSpaceId) {
        triggerToast?.('info', 'Create Error', 'Please select a Space.');
        return;
      }
      targetSpaceId = createChannelSpaceId;
      localChanId = `custom-${Date.now()}`;
    }

    const newChanObj = {
      id: localChanId,
      name: cleanedName,
      description: newChannelDesc.trim() || 'Custom chat channel',
      type: 'public'
    };

    if (onSaveSpaces) {
      const space = spaces.find(s => s.id === targetSpaceId);
      if (space) {
        const updatedChannels = [...(space.channels || []), newChanObj];
        const updatedSpaces = spaces.map(s => s.id === targetSpaceId ? { ...s, channels: updatedChannels } : s);
        onSaveSpaces(updatedSpaces);
      }
    }

    const nextActiveId = channelScope === 'workspace' 
      ? `${workspaceId}:${localChanId}`
      : `${workspaceId}:space-${targetSpaceId}-${localChanId}`;

    setActiveChannelId(nextActiveId);
    setNewChannelName('');
    setNewChannelDesc('');
    setShowCreateChannelModal(false);
    onAddSyncLog(`Created chat channel: #${cleanedName}`);
    triggerToast?.('success', 'Channel Created 📣', `Channel #${cleanedName} has been successfully created.`);
  };

  const handleDeleteChannel = (chanId: string, name: string) => {
    const loc = resolveChannelLocation(chanId);
    if (loc && onSaveSpaces) {
      const space = spaces.find(s => s.id === loc.spaceId);
      if (space) {
        const updatedChannels = (space.channels || []).filter((c: any) => c.id !== loc.localChanId);
        const updatedSpaces = spaces.map(s => s.id === loc.spaceId ? { ...s, channels: updatedChannels } : s);
        onSaveSpaces(updatedSpaces);
      }
    }

    if (activeChannelId === chanId) {
      setActiveChannelId(`${workspaceId}:general`);
    }

    onAddSyncLog(`Deleted chat channel: #${name}`);
    triggerToast?.('info', 'Channel Deleted 🗑️', `Channel #${name} has been removed.`);
  };

  const handleRenameChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingChannelId || !renameChannelName.trim()) return;

    const cleanedName = renameChannelName.trim().toLowerCase().replace(/\s+/g, '-');
    const loc = resolveChannelLocation(renamingChannelId);
    
    if (loc && onSaveSpaces) {
      const space = spaces.find(s => s.id === loc.spaceId);
      if (space) {
        const updatedChannels = (space.channels || []).map((c: any) => 
          c.id === loc.localChanId 
            ? { ...c, name: cleanedName, description: renameChannelDesc.trim() || c.description } 
            : c
        );
        const updatedSpaces = spaces.map(s => s.id === loc.spaceId ? { ...s, channels: updatedChannels } : s);
        onSaveSpaces(updatedSpaces);
      }
    }

    onAddSyncLog(`Renamed chat channel to: #${cleanedName}`);
    triggerToast?.('success', 'Channel Renamed 📣', `Channel has been successfully renamed to #${cleanedName}.`);
    
    setRenamingChannelId(null);
    setRenameChannelName('');
    setRenameChannelDesc('');
    setShowRenameModal(false);
  };

  const handleTogglePinMessage = async (msgId: string, currentPinned: boolean) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isPinned: !currentPinned } : m));

    if (!isOffline) {
      try {
        await supabase
          .from('chat_messages')
          .update({ is_pinned: !currentPinned })
          .eq('id', msgId);
      } catch (err) {
        console.error('Error toggling pin state:', err);
      }
    }

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
        if (forcedChannelId && activeChannelId === forcedChannelId) {
          setMessages([
            { id: 'm1', senderId: 'system', senderName: 'System', senderAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=S', content: `Đây là bắt đầu kênh thảo luận #${forcedChannelName || 'channel'}.`, timestamp: 'Vừa xong' }
          ]);
        } else if (isDm) {
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
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('channel_id', activeChannelId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          if (data.length === 0) {
            // Seed default messages
            let defaultMsgs: ChatMessage[] = [];
            if (forcedChannelId && activeChannelId === forcedChannelId) {
              defaultMsgs = [
                { id: 'm1', senderId: 'system', senderName: 'System', senderAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=S', content: `Đây là bắt đầu kênh thảo luận #${forcedChannelName || 'channel'}.`, timestamp: 'Vừa xong' }
              ];
            } else if (isDm) {
              const memberId = activeChannelId.split('-').pop();
              const member = members.find(m => m.id === memberId);
              defaultMsgs = [
                { id: 'm1', senderId: 'system', senderName: 'System', senderAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=S', content: `Đây là bắt đầu cuộc trò chuyện trực tiếp của bạn với ${member ? member.name : 'thành viên này'}.`, timestamp: 'Vừa xong' }
              ];
            } else if (isSpace) {
              defaultMsgs = [
                { id: 'm1', senderId: 'system', senderName: 'System', senderAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=S', content: `Đây là bắt đầu kênh thảo luận #${entityName}.`, timestamp: 'Vừa xong' }
              ];
            } else {
              const channelKey = activeChannelId.split(':').pop() || 'general';
              defaultMsgs = seedMessages[channelKey] || [
                { id: 'm1', senderId: 'system', senderName: 'System', senderAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=S', content: `Đây là bắt đầu kênh thảo luận #${channelKey}.`, timestamp: 'Vừa xong' }
              ];
            }

            if (defaultMsgs.length > 0) {
              const { data: { session } } = await supabase.auth.getSession();
              const userId = session?.user?.id;
              const toInsert = defaultMsgs.map(m => ({
                id: m.id,
                sender_id: m.senderId,
                sender_name: m.senderName,
                sender_avatar: m.senderAvatar || null,
                content: m.content,
                timestamp: m.timestamp,
                channel_id: activeChannelId,
                is_ai_response: m.isAi || false,
                workspace_id: workspaceId,
                user_id: userId || null,
                attachment: null
              }));
              await supabase.from('chat_messages').insert(toInsert);
              setMessages(defaultMsgs);
            } else {
              setMessages([]);
            }
          } else {
            setMessages(data.map(m => ({
              id: m.id,
              senderId: m.sender_id,
              senderName: m.sender_name,
              senderAvatar: m.sender_avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=S',
              content: m.content,
              timestamp: m.timestamp,
              isAi: m.is_ai_response,
              attachment: m.attachment || undefined,
              parentId: m.parent_id || undefined,
              isPinned: m.is_pinned || false
            })));
          }
        }
      } catch (err) {
        console.error('Error loading messages from Supabase:', err);
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
            filter: `channel_id=eq."${activeChannelId}"`
          },
          (payload) => {
            const eventType = payload.eventType;
            const m = (payload.new || payload.old) as any;
            if (!m || m.channel_id !== activeChannelId) return;

            if (eventType === 'INSERT') {
              const newMsg: ChatMessage = {
                id: m.id,
                senderId: m.sender_id,
                senderName: m.sender_name,
                senderAvatar: m.sender_avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=S',
                content: m.content,
                timestamp: m.timestamp,
                isAi: m.is_ai_response,
                attachment: m.attachment || undefined,
                parentId: m.parent_id || undefined,
                isPinned: m.is_pinned || false
              };
              setMessages(prev => {
                if (prev.some(x => x.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              scrollToBottom();
            } else if (eventType === 'UPDATE') {
              setMessages(prev => prev.map(x => x.id === m.id ? { 
                ...x, 
                content: m.content, 
                attachment: m.attachment || undefined,
                isPinned: m.is_pinned || false
              } : x));
            } else if (eventType === 'DELETE') {
              setMessages(prev => prev.filter(x => x.id !== m.id));
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
  }, [activeChannelId, forcedChannelId, forcedChannelName, isOffline, currentUser.id, currentUser.name]);

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
    setUnreadCounts(prev => ({ ...prev, [channelId]: 0 }));
    setLastReadTimestamps(prev => ({ ...prev, [channelId]: new Date().toISOString() }));
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
      const isImg = file.type.startsWith('image/');
      const fileUrl = isImg ? URL.createObjectURL(file) : '#';
      setSelectedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        url: fileUrl
      });
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

    setInputVal('');
    
    const msgId = `msg-${Date.now()}`;
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const attachmentObj = selectedFile ? {
      name: selectedFile.name,
      filePath: selectedFile.url || '#',
      size: selectedFile.size,
      isImage: selectedFile.type.startsWith('image/'),
      isVoice: selectedFile.isVoice,
      duration: selectedFile.duration
    } : undefined;

    const newMsg: ChatMessage = {
      id: msgId,
      senderId: currentUser.id || 'user',
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      content: userMsgText,
      timestamp: timeStr,
      attachment: attachmentObj
    };

    setMessages(prev => [...prev, newMsg]);
    setSelectedFile(null);
    scrollToBottom();

    let userId: string | null = null;

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id || null;
        await supabase.from('chat_messages').insert({
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
      } catch (err) {
        console.error('Error saving user message to Supabase:', err);
      }
    }

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
  };

  // Message Actions: Edit & Delete & Reaction
  const handleEditMessage = async (id: string, newText: string) => {
    if (!newText.trim()) return;
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content: newText } : m));
    setEditingMsgId(null);
    if (!isOffline) {
      try {
        await supabase.from('chat_messages').update({ content: newText }).eq('id', id);
      } catch (err) {
        console.error('Error updating message in Supabase:', err);
      }
    }
    triggerToast?.('success', 'Message updated 📝', 'Your message changes have been saved.');
  };

  const handleDeleteMessage = async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    if (!isOffline) {
      try {
        await supabase.from('chat_messages').delete().eq('id', id);
      } catch (err) {
        console.error('Error deleting message in Supabase:', err);
      }
    }
    (window as any).playSystemSound?.('delete');
    triggerToast?.('info', 'Message deleted 🗑️', 'The message has been removed from the channel.');
  };

  const handleAddReaction = (msgId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const currentReactions = m.reactions || [];
      const exists = currentReactions.find(r => r.emoji === emoji);
      
      let updated;
      if (exists) {
        updated = currentReactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r);
      } else {
        updated = [...currentReactions, { emoji, count: 1, userIds: ['user'] }];
      }
      return { ...m, reactions: updated };
    }));
    (window as any).playSystemSound?.('click');
  };

  // Filter channels based on search
  const filteredChannels = channels.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const activeChannel = channels.find(c => c.id === activeChannelId);

  // Resolve DM member if activeChannelId is a DM
  const isDm = activeChannelId.includes(':dm-');
  let dmMember: User | undefined;
  if (isDm) {
    const memberId = activeChannelId.split('-').pop();
    dmMember = members.find(m => m.id === memberId);
  }

  const isSelfDm = isDm && (activeChannelId.endsWith(`-${currentUser.id}-${currentUser.id}`) || activeChannelId.endsWith('-user-user') || dmMember?.id === currentUser.id);

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
    <div className="flex min-h-[500px] h-[calc(100vh-125px)] md:h-[calc(100vh-105px)] w-full rounded-3xl bg-white border border-slate-200/60 shadow-[0_4px_25px_rgba(0,0,0,0.012)] overflow-hidden font-sans select-none animate-fadeIn text-slate-800">
      
      {/* ── COLUMN 1: Channels Sidebar (w-64) ── */}
      {!forcedChannelId && (
        <div className={`w-full md:w-64 border-r border-slate-200/60 bg-slate-50/50 flex flex-col justify-between shrink-0 text-left ${
          isMobileChatActive ? 'hidden md:flex' : 'flex'
        }`}>
        <div className="p-4 space-y-4 flex-1 flex flex-col min-h-0">
          {/* Header area */}
          <div className="flex items-center justify-between px-2 py-1 select-none shrink-0">
            <span className="text-[15px] font-black text-slate-800 tracking-tight">Chat</span>
            <button
              onClick={() => {
                const selfDmId = `${workspaceId}:dm-${currentUser.id}-${currentUser.id}`;
                setActiveChannelId(selfDmId);
              }}
              className="p-1.5 rounded-lg border border-slate-200/60 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 shadow-xs transition-all cursor-pointer active:scale-95"
              title="New Chat"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Channels list scrollable */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1.5 scrollbar-thin min-h-0">
            <div>
              <div className="flex items-center justify-between px-2 mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Channels</span>
                <button 
                  onClick={() => setShowCreateChannelModal(true)}
                  className="p-0.5 rounded hover:bg-slate-150 text-slate-455 hover:text-indigo-650 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-0.5">
                {filteredChannels.filter(c => c.id !== `${workspaceId}:avaxa-brain-ai` && !c.id.includes(':space-') && !c.id.includes(':dm-')).map(c => {
                  const isActive = c.id === activeChannelId;
                  const isDefault = c.id === `${workspaceId}:general` || c.id === `${workspaceId}:project-planning` || c.id === `${workspaceId}:design-review`;
                  
                  return (
                    <div 
                      key={c.id}
                      className={`w-full flex items-center justify-between rounded-xl group/chan border border-transparent ${
                        isActive 
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 border-indigo-200/20 dark:border-indigo-900/20 font-bold' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-850 dark:hover:text-slate-200'
                      }`}
                    >
                      <button
                        onClick={() => setActiveChannelId(c.id)}
                        className="flex-1 flex items-center gap-2 px-3 py-2 text-xs font-semibold cursor-pointer text-left truncate"
                      >
                        <Hash className="w-4 h-4 shrink-0 text-slate-400" />
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

            {/* Space Channels Section */}
            {spaces.length > 0 && (
              <div>
                <div className="px-2 mb-1.5 mt-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Space Channels</span>
                </div>
                <div className="space-y-2">
                  {spaces.map(space => {
                    const spaceChannels = [
                      { id: `${workspaceId}:space-${space.id}-general`, name: 'general' },
                      ...(space.channels || [])
                        .filter((c: any) => c.id !== 'general' && !c.id.startsWith('workspace-'))
                        .map((c: any) => ({
                          id: `${workspaceId}:space-${space.id}-${c.id}`,
                          name: c.name,
                          description: c.description || '',
                          isCustomSpaceChan: true
                        })),
                      ...(space.folders || []).map(f => ({
                        id: `${workspaceId}:folder-${space.id}-${f.id}`,
                        name: f.name
                      })),
                      ...(space.lists || []).map(l => ({
                        id: `${workspaceId}:list-${space.id}-${l.id}`,
                        name: l.name
                      }))
                    ];
                        
                    return (
                      <div key={space.id} className="space-y-0.5">
                        <div className="flex items-center justify-between px-2 py-1 text-[9.5px] font-bold text-slate-500 bg-slate-100/50 rounded-lg">
                          <span className="flex items-center gap-1.5 truncate">
                            <span>{space.emoji || '📁'}</span>
                            <span className="truncate">{space.name}</span>
                          </span>
                        </div>
                        
                        <div className="pl-2.5 space-y-0.5">
                          {spaceChannels.map(chan => {
                            const chanId = chan.id;
                            const isActive = activeChannelId === chanId;
                            const isCustomSpaceChan = (chan as any).isCustomSpaceChan;
                            return (
                              <div 
                                key={chan.id}
                                className={`w-full flex items-center justify-between rounded-xl group/chan border border-transparent ${
                                  isActive 
                                    ? 'bg-indigo-50/80 text-indigo-650 border-indigo-200/20 font-bold' 
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                                }`}
                              >
                                <button
                                  onClick={() => setActiveChannelId(chanId)}
                                  className="flex-1 flex items-center gap-2 px-3 py-1.5 text-xs font-semibold cursor-pointer text-left truncate"
                                >
                                  <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{chan.name}</span>
                                  {(unreadCounts[chanId] || 0) > 0 && (
                                    <span className="ml-auto px-1.5 py-0.5 min-w-[18px] text-center text-[9px] font-black text-white bg-gradient-to-r from-rose-500 to-pink-500 rounded-full shadow-sm animate-bounce">
                                      {unreadCounts[chanId] > 99 ? '99+' : unreadCounts[chanId]}
                                    </span>
                                  )}
                                </button>
                                
                                {isCustomSpaceChan && (
                                  <div className="relative shrink-0 flex items-center">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveChannelMenuId(activeChannelMenuId === chan.id ? null : chan.id);
                                      }}
                                      className="p-1 mr-1.5 rounded-lg text-slate-450 hover:text-indigo-650 hover:bg-slate-100 transition-colors opacity-0 group-hover/chan:opacity-100 cursor-pointer"
                                      title="Channel options"
                                    >
                                      <MoreVertical className="w-3.5 h-3.5" />
                                    </button>
                                    {activeChannelMenuId === chan.id && (
                                      <div className="absolute right-0 top-6 bg-white border border-slate-200/80 rounded-xl shadow-lg p-1 z-30 min-w-[100px] text-left">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveChannelMenuId(null);
                                            setRenamingChannelId(chan.id);
                                            setRenameChannelName(chan.name);
                                            setRenameChannelDesc((chan as any).description || '');
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
                                            if (confirm(`Are you sure you want to delete the channel #${chan.name}? This action cannot be undone.`)) {
                                              handleDeleteChannel(chan.id, chan.name);
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
                    );
                  })}
                </div>
              </div>
            )}

            {/* Direct Messages Section */}
            <div>
              <div className="px-2 mb-1.5 mt-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Direct Messages</span>
              </div>
              <div className="space-y-0.5">
                {members.filter(m => m.id !== currentUser.id && m.id !== 'user').map(member => {
                  const sortedIds = ['user', member.id].sort();
                  const dmChannelId = `${workspaceId}:dm-${sortedIds[0]}-${sortedIds[1]}`;
                  const isActive = activeChannelId === dmChannelId;
                  
                  return (
                    <button
                      key={member.id}
                      onClick={() => setActiveChannelId(dmChannelId)}
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
                      <span className="truncate">{member.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Assistant Section */}
            <div>
              <div className="px-2 mb-1.5 mt-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">AI Assistant</span>
              </div>
              <div className="space-y-0.5">
                {filteredChannels.filter(c => c.id === `${workspaceId}:avaxa-brain-ai`).map(c => {
                  const isActive = c.id === activeChannelId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveChannelId(c.id)}
                     className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border relative overflow-hidden group ${
                        isActive 
                          ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10 border-amber-200/50 dark:border-amber-900/30 text-amber-705 dark:text-amber-400' 
                          : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 shrink-0 text-amber-500 animate-pulse" />
                      <span className="truncate">{c.name}</span>
                      <span className="absolute -top-1 -right-1 text-[7px] text-amber-500 opacity-60">✨</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Sidebar Footer Bar */}
        <div className="px-4 py-2.5 bg-slate-100/30 border-t border-slate-200/60 flex items-center justify-between shrink-0 text-slate-400 select-none">
          <div className="flex items-center gap-3">
            <button type="button" className="hover:text-slate-650 transition-colors cursor-pointer">
              <Plus className="w-4 h-4" />
            </button>
            <button type="button" className="hover:text-slate-650 transition-colors cursor-pointer">
              <Clock className="w-4 h-4" />
            </button>
          </div>
          <button type="button" className="hover:text-slate-650 transition-colors cursor-pointer">
            <Settings className="w-4 h-4" />
          </button>
        </div>

        </div>
      )}

      {/* ── COLUMN 2: Main Chat Workspace ── */}
      <div 
        className={`flex-1 flex flex-col justify-between relative bg-white ${isDragOver ? 'ring-2 ring-indigo-400 ring-inset' : ''} ${
          isMobileChatActive ? 'flex' : 'hidden md:flex'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag-drop overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-indigo-50/80 backdrop-blur-sm z-40 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-3 animate-pulse">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 border-2 border-dashed border-indigo-400 flex items-center justify-center">
                <Paperclip className="w-7 h-7 text-indigo-500" />
              </div>
              <span className="text-sm font-black text-indigo-600">Drop file here to send</span>
              <span className="text-[10px] font-bold text-indigo-400">Images, documents, audio files…</span>
            </div>
          </div>
        )}
        
        {/* Chat header */}
        <header className="border-b border-slate-200/80 bg-white flex flex-col shrink-0">
          {/* Top row */}
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Mobile Back Button to Channels List */}
              <button
                onClick={() => setIsMobileChatActive(false)}
                className="md:hidden p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200/60 dark:border-slate-700/80 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-350 cursor-pointer shrink-0 transition-colors mr-1"
                title="Quay lại danh sách chat"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {isSelfDm ? (
                <div className="relative shrink-0 flex">
                  <SignedImage filePath={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full border border-slate-200/50 bg-white animate-fadeIn" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white bg-emerald-500 animate-pulse"></span>
                </div>
              ) : isDm && dmMember ? (
                <div className="relative shrink-0 flex">
                  <SignedImage filePath={dmMember.avatar} alt={dmMember.name} className="w-8 h-8 rounded-full border border-slate-200/50 bg-white animate-fadeIn" />
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${dmMember.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-650 shrink-0 font-black text-xs select-none">
                  {isSpaceChan ? '📁' : '#'}
                </div>
              )}
              
              <div className="text-left min-w-0 flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-800 leading-none truncate">
                  {isSelfDm ? currentUser.name : (isDm && dmMember) ? dmMember.name : isSpaceChan ? spaceChanName : (activeChannel?.name || 'chat-room')}
                </h2>
                {isEditableChannel && (
                  <div className="relative flex items-center">
                    <button 
                      onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                      className={`text-slate-400 hover:text-slate-650 cursor-pointer transition-colors p-0.5 rounded-lg hover:bg-slate-50 ${showHeaderMenu ? 'bg-slate-100 text-indigo-650' : ''}`}
                      title="Channel options"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                    {showHeaderMenu && (
                      <div className="absolute left-0 top-6 bg-white border border-slate-200/80 rounded-xl shadow-lg p-1 z-35 min-w-[120px] text-left">
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
                          className="w-full text-left px-2.5 py-1.5 text-[10.5px] font-bold text-slate-650 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
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
                          className="w-full text-left px-2.5 py-1.5 text-[10.5px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3 h-3 text-rose-450" />
                          Delete Channel
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <button className="text-slate-355 hover:text-amber-500 cursor-pointer transition-colors p-0.5 rounded hover:bg-slate-50">★</button>
              </div>
            </div>

            {/* Branding Logo */}
            <div className="flex items-center gap-1.5 select-none font-bold text-xs text-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500" />
              <span>Brain²</span>
            </div>
          </div>

          {/* Bottom row (Tabs and Right Utilities) */}
          <div className="px-5 border-t border-slate-100 flex items-center justify-between select-none">
            {/* Tabs */}
            <div className="flex gap-4 text-xs font-bold text-slate-500 pt-2.5 pb-2">
              <button className="text-slate-800 border-b-2 border-indigo-600 pb-2 -mb-[9px] px-0.5 cursor-pointer">Chat</button>
              <button className="hover:text-slate-800 transition-colors pb-2 px-0.5 cursor-pointer">Calendar</button>
              <button className="hover:text-slate-800 transition-colors pb-2 px-0.5 cursor-pointer">Tasks</button>
            </div>

            {/* Right Action Utilities (float bar) */}
            <div className="flex items-center gap-1.5 text-slate-400 pb-1">
              <button className="p-1 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"><Search className="w-3.5 h-3.5" /></button>
              <button className="p-1 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"><MessageSquare className="w-3.5 h-3.5" /></button>
              <button className="p-1 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"><Smile className="w-3.5 h-3.5" /></button>
              <button className="p-1 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
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
                  <SignedImage filePath={msg.senderAvatar} alt={msg.senderName} className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/50 shrink-0 object-cover" />
                )}

                {/* Message Body */}
                <div className="flex-1 min-w-0 text-left space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-black ${msg.isAi ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>{msg.senderName}</span>
                    <span className="text-[9px] text-slate-450 dark:text-slate-500 font-mono">{msg.timestamp}</span>
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
                    <div className="text-xs text-slate-700 leading-relaxed font-medium break-words">
                      {formatMessageContent(msg.content)}
                      
                      {msg.attachment && (
                        <div className="mt-2 select-none">
                          {msg.attachment.isVoice ? (
                            <VoiceMessagePlayer 
                              filePath={msg.attachment.filePath} 
                              duration={msg.attachment.duration} 
                            />
                          ) : msg.attachment.isImage ? (
                            <div className="relative rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 max-w-[240px] shadow-xs group/img bg-slate-50">
                              <img 
                                src={msg.attachment.filePath} 
                                alt={msg.attachment.name}
                                className="max-w-[240px] max-h-[180px] object-cover hover:scale-[1.02] transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-between p-2">
                                <span className="text-[9px] text-white font-bold truncate bg-slate-900/60 px-1.5 py-0.5 rounded-lg">{msg.attachment.name}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-150 max-w-sm hover:bg-indigo-50/20 hover:border-indigo-200/50 transition-colors">
                              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                                <Globe className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1 text-left">
                                <span className="block text-xs font-bold text-slate-800 truncate">{msg.attachment.name}</span>
                                <span className="block text-[9.5px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider font-mono">
                                  {msg.attachment.size ? `${(msg.attachment.size / 1024).toFixed(1)} KB` : 'FILE'}
                                </span>
                              </div>
                              <a 
                                href={msg.attachment.filePath} 
                                download={msg.attachment.name}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      )}
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
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white border border-slate-200/80 rounded-xl shadow-md p-1 z-20">
                  {/* Quick Reactions */}
                  {['👍', '❤️', '🎉', '😂'].map(emoji => (
                    <button 
                      key={emoji}
                      onClick={() => handleAddReaction(msg.id, emoji)}
                      className="p-1 hover:bg-slate-105 rounded-md cursor-pointer text-xs select-none transition-all"
                    >
                      {emoji}
                    </button>
                  ))}

                  {/* Reply in Thread */}
                  <button 
                    onClick={() => handleOpenThread(msg)}
                    className="p-1 hover:bg-slate-105 rounded-md cursor-pointer text-slate-400 hover:text-indigo-650 transition-colors"
                    title="Reply in Thread"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>

                  {/* Pin/Unpin Message */}
                  <button 
                    onClick={() => handleTogglePinMessage(msg.id, !!msg.isPinned)}
                    className={`p-1 rounded-md cursor-pointer transition-colors ${
                      msg.isPinned 
                        ? 'text-amber-500 hover:bg-amber-55' 
                        : 'text-slate-400 hover:text-amber-500 hover:bg-amber-55'
                    }`}
                    title={msg.isPinned ? "Unpin message" : "Pin message"}
                  >
                    {msg.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  </button>

                  {/* Forward Message */}
                  <button 
                    onClick={() => setForwardingMessage(msg)}
                    className="p-1 hover:bg-slate-105 rounded-md cursor-pointer text-slate-400 hover:text-blue-500 transition-colors"
                    title="Forward message"
                  >
                    <Forward className="w-3.5 h-3.5" />
                  </button>

                  {/* Convert to Task */}
                  {onAddTask && (
                    <button 
                      onClick={() => handleOpenConvertModal(msg)}
                      className="p-1 hover:bg-slate-105 rounded-md cursor-pointer text-slate-400 hover:text-emerald-600 transition-colors"
                      title="Convert to Task"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                    </button>
                  )}
                  
                  {isMe && (
                    <>
                      <button 
                        onClick={() => { setEditingMsgId(msg.id); setEditVal(msg.content); }}
                        className="p-1 hover:bg-slate-105 rounded-md cursor-pointer text-slate-400 hover:text-indigo-650 transition-colors"
                        title="Edit message"
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
          <div className="px-4 py-2 border-t border-slate-150 bg-slate-50/50 flex items-center justify-between gap-3 animate-slideUp">
            <div className="flex items-center gap-2 min-w-0">
              {selectedFile.type.startsWith('image/') ? (
                <img src={selectedFile.url} className="w-9 h-9 rounded-lg object-cover border border-slate-200 bg-white" alt="" />
              ) : (
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                  <Globe className="w-4.5 h-4.5" />
                </div>
              )}
              <div className="min-w-0 text-left">
                <span className="block text-xs font-bold text-slate-700 truncate">{selectedFile.name}</span>
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

        {/* Emoji picker popover */}
        {showEmojiPicker && (
          <div className="absolute bottom-16 right-4 p-2 bg-white border border-slate-200 shadow-xl rounded-2xl z-30 grid grid-cols-6 gap-1 w-52 animate-fadeIn">
            {['😀', '😂', '😍', '👍', '🔥', '🎉', '🚀', '❤️', '👀', '✨', '👏', '💯'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setInputVal(prev => prev + emoji);
                  setShowEmojiPicker(false);
                }}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-lg select-none cursor-pointer transition-all hover:scale-105 active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

                {/* Mockup-style unified rich editor box card */}
        <div className="p-4 bg-white border-t border-slate-150 shrink-0">
          <form onSubmit={handleSendMessage} className="relative border border-slate-200 dark:border-slate-800 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 rounded-2xl p-3 bg-white dark:bg-slate-900 transition-all shadow-xs flex flex-col gap-2 select-text">
            
            {/* Selected file preview widget */}
            {selectedFile && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-250 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2 truncate">
                  <span>📎</span>
                  <span className="truncate">{selectedFile.name}</span>
                </div>
                <button type="button" onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Input Text Area container */}
            {isRecording ? (
              <div className="flex-1 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-rose-50 border border-rose-250 animate-pulse text-xs font-semibold text-rose-600">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
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
                  className="w-full bg-transparent border-0 outline-none text-xs font-semibold placeholder-slate-400 text-slate-800 resize-none min-h-[48px] custom-scrollbar focus:ring-0 p-0"
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
                  <div className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200/80 rounded-2xl shadow-xl p-1.5 z-50 min-w-[180px] max-h-[180px] overflow-y-auto animate-fadeIn">
                    <div className="px-2 py-1 mb-1">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Mention a member</span>
                    </div>
                    {filteredMentionMembers.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectMention(m)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-indigo-50 transition-colors cursor-pointer text-left"
                      >
                        <SignedImage filePath={m.avatar} alt={m.name} className="w-5 h-5 rounded-full" />
                        <span className="text-[10.5px] font-bold text-slate-700">{m.name}</span>
                        <span className="text-[9px] font-semibold text-slate-400 ml-auto">{m.role}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Slash Commands Dropdown */}
                {showCommandDropdown && filteredCommands.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xl p-1.5 z-[60] min-w-[240px] max-h-[220px] overflow-y-auto animate-fadeIn">
                    <div className="px-2 py-1 mb-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-405">Quick Commands</span>
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
                  const isImg = file.type.startsWith('image/');
                  const fileUrl = isImg ? URL.createObjectURL(file) : '#';
                  setSelectedFile({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url: fileUrl
                  });
                  triggerToast?.('success', 'File selected 📎', `Ready to send: ${file.name}`);
                }
              }}
            />

            {/* Bottom Row Utilities and Actions */}
            <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-100/60">
              {/* Left Utilities */}
              <div className="flex items-center gap-1.5 text-slate-400 select-none">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1 hover:text-slate-750 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" title="Add File">
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setInputVal(prev => prev + ' ')} className="p-1 hover:text-amber-500 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" title="AI Sparkles">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                </button>
                <button type="button" onClick={() => insertFormatting('bold')} className="p-1 hover:text-slate-750 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" title="Format Text">
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1 hover:text-slate-750 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" title="Attach file">
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => { setInputVal(prev => prev + '@'); setShowMentionDropdown(true); setMentionQuery(''); }} className="p-1 hover:text-slate-750 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" title="Mention @">
                  <AtSign className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1 hover:text-slate-750 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" title="Stickers & Emoji">
                  <Smile className="w-3.5 h-3.5" />
                </button>
                <button type="button" className="p-1 hover:text-slate-750 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" title="GIF">
                  <span className="text-[9px] font-black leading-none border border-slate-350 px-1 py-0.5 rounded">GIF</span>
                </button>
                <button type="button" className="p-1 hover:text-slate-750 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" title="Video Meeting">
                  <span className="text-sm">📹</span>
                </button>
                <button type="button" className="p-1 hover:text-slate-750 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" title="Checklist">
                  <span className="text-sm">☑️</span>
                </button>
                <button type="button" className="p-1 hover:text-slate-750 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" title="Template">
                  <span className="text-sm">📝</span>
                </button>
                <button type="button" className="p-1 hover:text-slate-750 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" title="Automation & Integrations">
                  <span className="text-sm">⚡</span>
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
                      <div key={m.id} className="flex items-center gap-2.5 p-1 rounded-lg">
                        <div className="relative shrink-0 flex">
                          <SignedImage filePath={m.avatar} alt={m.name} className="w-6.5 h-6.5 rounded-full border border-slate-200/50 object-cover bg-white animate-fadeIn" />
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                            m.status === 'online' ? 'bg-emerald-500 animate-pulse' :
                            m.status === 'busy' ? 'bg-indigo-500' : 'bg-amber-400'
                          }`} />
                        </div>
                        <div className="min-w-0 leading-none">
                          <span className="text-[11px] font-bold text-slate-700 block truncate">{m.name}</span>
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
                            <img src={file.filePath} className="w-8 h-8 rounded-lg object-cover border border-slate-200 bg-slate-50 shrink-0" alt="" />
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
                            rel="noreferrer"
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
                  <SignedImage filePath={activeThreadMessage.senderAvatar} alt={activeThreadMessage.senderName} className="w-5.5 h-5.5 rounded-full object-cover" />
                  <span className="text-[11px] font-bold text-slate-700">{activeThreadMessage.senderName}</span>
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
                    <SignedImage filePath={reply.senderAvatar} alt={reply.senderName} className="w-6.5 h-6.5 rounded-full border border-slate-200/50 object-cover bg-white" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[11px] font-bold text-slate-800">{reply.senderName}</span>
                        <span className="text-[8.5px] text-slate-400 font-medium">{reply.timestamp}</span>
                      </div>
                      <div className="text-xs text-slate-700 mt-1 font-medium leading-relaxed break-words bg-white p-2 rounded-2xl border border-slate-150 inline-block">
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
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Channel Scope</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChannelScope('workspace')}
                    className={`py-2 text-xs rounded-xl border font-bold cursor-pointer transition-all ${
                      channelScope === 'workspace'
                        ? 'border-indigo-500 bg-indigo-50/10 text-indigo-650'
                        : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    Workspace-wide
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannelScope('space')}
                    className={`py-2 text-xs rounded-xl border font-bold cursor-pointer transition-all ${
                      channelScope === 'space'
                        ? 'border-indigo-500 bg-indigo-50/10 text-indigo-650'
                        : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    Space-specific
                  </button>
                </div>
              </div>

              {channelScope === 'space' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Select Space</label>
                  <select
                    value={createChannelSpaceId}
                    onChange={e => setCreateChannelSpaceId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 outline-none bg-white focus:border-indigo-500 font-semibold cursor-pointer"
                  >
                    {spaces.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

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
                    onChange={e => handleSpaceChange(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-700 dark:text-slate-350 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 outline-none cursor-pointer"
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
                    className="w-full text-xs font-semibold text-slate-700 dark:text-slate-355 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 outline-none cursor-pointer"
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

    </div>
  );
}
