"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage, ChatChannel, User } from '../types';
import { supabase } from '../supabaseClient';
import SignedImage from './SignedImage';
import { useTranslation } from '../contexts/TranslationContext';
import { 
  Hash, Send, Bot, Smile, Users, MessageSquare, Sparkles, Plus, X,
  Paperclip, ThumbsUp, Heart, Search, Trash2, Edit2, Loader2, ArrowRight
} from 'lucide-react';

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
}

// Minimal markdown formatter
const formatMessageContent = (text: string) => {
  if (!text) return '';
  // Simple bold and code formatter
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200/50 text-amber-800 font-mono text-[10px] font-bold mx-0.5">{part.slice(1, -1)}</code>;
    }
    return part;
  });
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
  forcedChannelName
}: ChatRoomProps) {
  const { t } = useTranslation();
  // Navigation & Channels
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showMemberDrawer, setShowMemberDrawer] = useState(false);

  // Form input states
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Search channels
  const [searchQuery, setSearchQuery] = useState('');

  // Refs
  const messageEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize channels
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
      { id: `${workspaceId}:general`, name: 'general', description: 'General discussion for the department', type: 'public' },
      { id: `${workspaceId}:project-planning`, name: 'project-planning', description: 'Project planning & KPI tracking', type: 'public' },
      { id: `${workspaceId}:avaxa-brain-ai`, name: 'avaxa-brain-ai', description: 'Avaxa Brain AI support assistant online', type: 'public' },
      { id: `${workspaceId}:design-review`, name: 'design-review', description: 'Design whiteboard reviews', type: 'public' }
    ];
    setChannels(defaultChannels);

    // Auto select first channel
    const defaultActive = initialSelectedChannelId || `${workspaceId}:general`;
    setActiveChannelId(defaultActive);
  }, [workspaceId, initialSelectedChannelId, forcedChannelId, forcedChannelName]);

  // Load default simulated/mock messages when channel changes
  useEffect(() => {
    if (!activeChannelId) return;

    const seedMessages: Record<string, ChatMessage[]> = {
      'general': [
        { id: 'm1', senderId: 'sim-1', senderName: 'Lan Anh (Dev)', senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=LanAnh', content: 'Welcome to the general discussion channel! Share your ideas here.', timestamp: '09:12' },
        { id: 'm2', senderId: 'sim-2', senderName: 'Hoang Long (Design)', senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=HoangLong', content: 'Completed initial design whiteboard UI draft, will demo tonight.', timestamp: '09:15', reactions: [{ emoji: '👍', count: 3, userIds: ['sim-1', 'sim-3'] }] }
      ],
      'project-planning': [
        { id: 'mp1', senderId: 'sim-3', senderName: 'Minh Tuan (PM)', senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MinhTuan', content: 'Sprint 1 Roadmap updated, please complete before Friday.', timestamp: '10:00' }
      ],
      'avaxa-brain-ai': [
        { id: 'mai1', senderId: 'avaxa-ai', senderName: 'Avaxa Brain AI', senderAvatar: '', content: 'Hello! I am **Avaxa Brain AI**. Ask me anything about productivity optimization or project planning.', timestamp: '08:00', isAi: true }
      ],
      'design-review': [
        { id: 'md1', senderId: 'sim-2', senderName: 'Hoang Long (Design)', senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=HoangLong', content: 'Design drafts have been pushed to the shared whiteboard, please review.', timestamp: '11:00' }
      ]
    };

    const loadMessages = async () => {
      if (isOffline) {
        if (forcedChannelId && activeChannelId === forcedChannelId) {
          setMessages([
            { id: 'm1', senderId: 'sim-1', senderName: 'Lan Anh (Dev)', senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=LanAnh', content: `Welcome to the #${forcedChannelName || 'Channel'} discussion! Send messages here to collaborate.`, timestamp: '09:12' },
            { id: 'm2', senderId: 'sim-2', senderName: 'Hoang Long (Design)', senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=HoangLong', content: `Hi team, let's keep all communication related to this workspace view inside this chat.`, timestamp: '09:15' }
          ]);
        } else {
          const channelKey = activeChannelId.split(':').pop() || 'general';
          setMessages(seedMessages[channelKey] || []);
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
            const channelKey = activeChannelId.split(':').pop() || 'general';
            let defaultMsgs: ChatMessage[] = [];
            if (forcedChannelId && activeChannelId === forcedChannelId) {
              defaultMsgs = [
                { id: 'm1', senderId: 'sim-1', senderName: 'Lan Anh (Dev)', senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=LanAnh', content: `Welcome to the #${forcedChannelName || 'Channel'} discussion! Send messages here to collaborate.`, timestamp: '09:12' },
                { id: 'm2', senderId: 'sim-2', senderName: 'Hoang Long (Design)', senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=HoangLong', content: `Hi team, let's keep all communication related to this workspace view inside this chat.`, timestamp: '09:15' }
              ];
            } else {
              defaultMsgs = seedMessages[channelKey] || [];
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
                user_id: userId || null
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
              senderAvatar: m.sender_avatar || '',
              content: m.content,
              timestamp: m.timestamp,
              isAi: m.is_ai_response
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
    let channelSubscription: any = null;
    if (!isOffline) {
      channelSubscription = supabase.channel(`realtime-chat-${activeChannelId}`)
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
            if (eventType === 'INSERT') {
              const m = payload.new;
              const newMsg: ChatMessage = {
                id: m.id,
                senderId: m.sender_id,
                senderName: m.sender_name,
                senderAvatar: m.sender_avatar || '',
                content: m.content,
                timestamp: m.timestamp,
                isAi: m.is_ai_response
              };
              setMessages(prev => {
                if (prev.some(x => x.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              scrollToBottom();
            } else if (eventType === 'UPDATE') {
              const m = payload.new;
              setMessages(prev => prev.map(x => x.id === m.id ? { ...x, content: m.content } : x));
            } else if (eventType === 'DELETE') {
              const m = payload.old;
              setMessages(prev => prev.filter(x => x.id !== m.id));
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (channelSubscription) {
        supabase.removeChannel(channelSubscription);
      }
    };
  }, [activeChannelId, forcedChannelId, forcedChannelName, isOffline]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Send new message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isSending) return;

    const userMsgText = inputVal.trim();
    setInputVal('');
    
    const msgId = `msg-${Date.now()}`;
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const newMsg: ChatMessage = {
      id: msgId,
      senderId: 'user',
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      content: userMsgText,
      timestamp: timeStr
    };

    setMessages(prev => [...prev, newMsg]);
    scrollToBottom();

    let userId: string | null = null;
    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id || null;
        await supabase.from('chat_messages').insert({
          id: msgId,
          sender_id: 'user',
          sender_name: currentUser.name,
          sender_avatar: currentUser.avatar,
          content: userMsgText,
          timestamp: timeStr,
          channel_id: activeChannelId,
          is_ai_response: false,
          workspace_id: workspaceId,
          user_id: userId
        });
      } catch (err) {
        console.error('Error saving user message to Supabase:', err);
      }
    }

    // Check if chat is with AI Assistant channel
    if (activeChannelId.endsWith('avaxa-brain-ai')) {
      setIsAiTyping(true);
      try {
        // Trigger AI chat API call
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMsgText })
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
              user_id: userId
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

  return (
    <div className="flex min-h-[500px] h-[calc(100vh-170px)] md:h-[calc(100vh-150px)] w-full rounded-3xl bg-white border border-slate-200/60 shadow-[0_4px_25px_rgba(0,0,0,0.012)] overflow-hidden font-sans select-none animate-fadeIn text-slate-800">
      
      {/* ── COLUMN 1: Channels Sidebar (w-64) ── */}
      {!forcedChannelId && (
        <div className="w-64 border-r border-slate-200/60 bg-slate-50/50 flex flex-col justify-between shrink-0 text-left">
        <div className="p-4 space-y-4 flex-1 flex flex-col">
          {/* Header search bar */}
          <div className="relative">
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search channels..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-105 border border-slate-200/60 dark:border-slate-700/60 outline-none text-[11px] font-medium placeholder-slate-400 focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Channels list scrollable */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1.5 scrollbar-thin">
            <div>
              <div className="flex items-center justify-between px-2 mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Channels</span>
                <button className="p-0.5 rounded hover:bg-slate-150 text-slate-450 hover:text-indigo-650 transition-colors cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
              </div>
              <div className="space-y-0.5">
                {filteredChannels.filter(c => c.id !== `${workspaceId}:avaxa-brain-ai`).map(c => {
                  const isActive = c.id === activeChannelId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveChannelId(c.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-transparent ${
                        isActive 
                          ? 'bg-indigo-50/80 text-indigo-650 border-indigo-200/20 font-bold' 
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                      }`}
                    >
                      <Hash className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="truncate">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="px-2 mb-1.5">
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
                          ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200/50 text-amber-700' 
                          : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800'
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

        {/* User Card at footer sidebar */}
        <div className="p-3 bg-slate-100/50 border-t border-slate-200/60 flex items-center gap-2.5">
          <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-slate-200/50 bg-white" alt="" />
          <div className="min-w-0">
            <span className="block text-[11px] font-black text-slate-800 leading-none truncate">{currentUser.name}</span>
            <span className="block text-[9px] text-slate-400 font-extrabold tracking-wider uppercase mt-1 leading-none">Me</span>
          </div>
        </div>

        </div>
      )}

      {/* ── COLUMN 2: Main Chat Workspace ── */}
      <div className="flex-1 flex flex-col justify-between relative bg-white">
        
        {/* Chat header */}
        <header className="px-5 py-3 border-b border-slate-150 flex items-center justify-between">
          <div className="text-left">
            <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1">
              {activeChannel?.name.includes('ai') ? (
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              ) : (
                <Hash className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              {activeChannel?.name}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[320px]">{activeChannel?.description}</p>
          </div>
          <button 
            onClick={() => setShowMemberDrawer(!showMemberDrawer)}
className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200/60 bg-slate-50 text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
           >
            <Users className="w-3.5 h-3.5" />
            <span>Members ({members.length})</span>
          </button>
        </header>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pr-3 scrollbar-thin">
          {messages.map((msg) => {
            const isMe = msg.senderId === 'user';
            const isEditing = editingMsgId === msg.id;

            return (
              <div 
                key={msg.id}
                className={`flex gap-3 items-start group relative rounded-xl p-2 transition-all ${
                  isMe ? 'hover:bg-slate-50/50' : 'hover:bg-slate-50/50'
                }`}
              >
                {/* Sender Avatar */}
                {msg.isAi ? (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Bot className="w-4.5 h-4.5 animate-pulse" />
                  </div>
                ) : (
                  <img src={msg.senderAvatar} className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/50 shrink-0 object-cover" alt="" />
                )}

                {/* Message Body */}
                <div className="flex-1 min-w-0 text-left space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-black ${msg.isAi ? 'text-amber-700' : 'text-slate-800'}`}>{msg.senderName}</span>
                    <span className="text-[9px] text-slate-400 font-mono">{msg.timestamp}</span>
                    {msg.isAi && <span className="text-[7.5px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wide leading-none scale-90 select-none">AI BOT</span>}
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
                  
                  {isMe && (
                    <>
                      <button 
                        onClick={() => { setEditingMsgId(msg.id); setEditVal(msg.content); }}
                        className="p-1 hover:bg-slate-105 rounded-md cursor-pointer text-slate-400 hover:text-indigo-600 transition-colors"
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

          <div ref={messageEndRef} />
        </div>

        {/* Input Text Box Footer */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-150 flex gap-2.5 items-center">
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
className="p-2 rounded-xl border border-slate-200/60 bg-slate-50 text-slate-400 hover:text-indigo-650 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
           title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={() => triggerToast?.('info', 'Upload Feature 💾', 'Attachment selected, simulating upload...')}
          />
          
          <input 
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder={activeChannel?.name.includes('ai') ? "Ask Avaxa Brain AI..." : "Type a message..."}
className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/60 focus:border-indigo-500 outline-none text-xs font-semibold placeholder-slate-400"
            />

          <button 
            type="submit"
            className="p-2.5 rounded-2xl text-white shadow-md hover:brightness-105 transition-all cursor-pointer shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--avaxa-gradient-start), var(--avaxa-gradient-end))' }}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>

      {/* ── COLUMN 3: Channel Members Drawer (w-56) ── */}
      <AnimatePresence>
        {showMemberDrawer && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-slate-200/60 bg-slate-50/50 flex flex-col justify-between shrink-0 text-left overflow-hidden relative"
          >
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Teammates ({members.length})</span>
                <button onClick={() => setShowMemberDrawer(false)} className="p-0.5 rounded-md hover:bg-slate-150 text-slate-400 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-2 p-1 rounded-lg">
                    <div className="relative shrink-0 flex">
                      <img src={m.avatar} className="w-6.5 h-6.5 rounded-full border border-slate-200/50 object-cover bg-white" alt="" />
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
