import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ChatChannel, ChatMessage } from '../types';
import { supabase, getCleanChannel } from '../api/supabase';
import { safeAsyncStorage } from '../api/storage';
import { useWorkspaceStore } from './workspaceStore';

interface ChatState {
  channels: ChatChannel[];
  activeChannelId: string;
  messages: Record<string, ChatMessage[]>;
  isLoading: boolean;
  setActiveChannelId: (id: string) => void;
  sendMessage: (channelId: string, content: string, senderName: string, senderAvatar?: string) => Promise<void>;
  addReaction: (channelId: string, messageId: string, emoji: string, userId: string) => Promise<void>;
  createChannel: (name: string, description?: string, type?: 'public' | 'private') => Promise<ChatChannel>;
  getOrCreateDirectMessageChannel: (targetUserId: string, targetUserName: string) => Promise<string>;
  fetchChannels: () => Promise<void>;
  fetchMessages: (channelId: string) => Promise<void>;
  subscribeToChannels: () => () => void;
  subscribeToChat: (channelId: string) => () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      channels: [],
      activeChannelId: '',
      messages: {},
      isLoading: false,
      setActiveChannelId: (id) => {
        set({ activeChannelId: id });
        get().fetchMessages(id);
      },

      subscribeToChannels: () => {
        const channel = getCleanChannel('mobile-channels-sync')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'chat_channels' },
            () => {
              get().fetchChannels();
            }
          )
          .subscribe((status) => {
            if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !supabase.realtime.isConnected()) {
              supabase.realtime.connect();
            }
          });

        return () => {
          try {
            supabase.removeChannel(channel);
          } catch {}
        };
      },

      fetchChannels: async () => {
        try {
          const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;
          let query = supabase.from('chat_channels').select('*').order('created_at');
          if (workspaceId) query = query.eq('workspace_id', workspaceId);
          const { data, error } = await query;
          if (!error && data) {
            const mapped: ChatChannel[] = data.map((c: any) => ({
              id: c.id,
              name: c.name,
              description: c.description || '',
              type: c.type || 'public',
              workspaceId: c.workspace_id,
            }));
            set((state) => {
              const currentActive = state.activeChannelId;
              const nextActive = mapped.some((c) => c.id === currentActive)
                ? currentActive
                : mapped[0]?.id || '';
              return {
                channels: mapped,
                activeChannelId: nextActive,
              };
            });
          }
        } catch (e) {
          console.log('Error fetching chat channels:', e);
        }
      },

      createChannel: async (name: string, description: string = '', type: 'public' | 'private' = 'public') => {
        const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;
        const channelId = `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newChan: ChatChannel = {
          id: channelId,
          name: name.trim().replace(/^#+/, ''),
          description: description.trim(),
          type,
          workspaceId,
        };

        set((state) => ({
          channels: [...state.channels, newChan],
          activeChannelId: channelId,
        }));

        try {
          await supabase.from('chat_channels').insert({
            id: newChan.id,
            name: newChan.name,
            description: newChan.description,
            type: newChan.type,
            workspace_id: workspaceId,
          });
        } catch (e) {
          console.log('Error creating channel in Supabase:', e);
        }

        return newChan;
      },

      getOrCreateDirectMessageChannel: async (targetUserId: string, targetUserName: string) => {
        const workspaceId = useWorkspaceStore.getState().activeWorkspaceId || 'default';
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id || 'current_user';
        const sortedIds = [currentUserId, targetUserId].sort();
        const dmChannelId = `${workspaceId}:dm-${sortedIds[0]}-${sortedIds[1]}`;

        const existing = get().channels.find((c) => c.id === dmChannelId);
        if (!existing) {
          const newChan: ChatChannel = {
            id: dmChannelId,
            name: targetUserName,
            description: `Cuộc trò chuyện trực tiếp với ${targetUserName}`,
            type: 'dm',
            workspaceId,
          };
          set((state) => ({
            channels: [newChan, ...state.channels],
            activeChannelId: dmChannelId,
          }));

          try {
            await supabase.from('chat_channels').insert({
              id: dmChannelId,
              name: targetUserName,
              description: `Cuộc trò chuyện trực tiếp với ${targetUserName}`,
              type: 'dm',
              workspace_id: workspaceId,
            });
          } catch (e) {
            // Already created or ignore
          }
        } else {
          set({ activeChannelId: dmChannelId });
        }

        return dmChannelId;
      },

      fetchMessages: async (channelId: string) => {
        try {
          const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('channel_id', channelId)
            .order('timestamp', { ascending: true })
            .limit(100);

          if (!error && data) {
            const mapped: ChatMessage[] = data.map((m: any) => ({
              id: m.id,
              senderId: m.sender_id || m.senderId || 'user',
              senderName: m.sender_name || m.senderName || 'Thành viên',
              senderAvatar: m.sender_avatar || m.senderAvatar,
              content: m.content || '',
              timestamp: m.timestamp || new Date().toISOString(),
              channelId: m.channel_id || channelId,
              reactions: Array.isArray(m.reactions) ? m.reactions : [],
            }));

            set((state) => ({
              messages: {
                ...state.messages,
                [channelId]: mapped,
              },
            }));
          }
        } catch (e) {
          console.log('Error fetching chat messages:', e);
        }
      },

      sendMessage: async (channelId, content, senderName, senderAvatar) => {
        const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || 'user-default';

        const newMessage: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          senderId: userId,
          senderName,
          senderAvatar,
          content,
          timestamp: new Date().toISOString(),
          channelId,
          reactions: [],
        };

        // Optimistic UI update
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: [...(state.messages[channelId] || []), newMessage],
          },
        }));

        // Persist to Supabase chat_messages table
        try {
          await supabase.from('chat_messages').insert({
            id: newMessage.id,
            sender_id: userId,
            sender_name: senderName,
            sender_avatar: senderAvatar || null,
            content,
            timestamp: newMessage.timestamp,
            channel_id: channelId,
            workspace_id: activeWorkspaceId,
            user_id: session?.user?.id || null,
            reactions: [],
          });
        } catch (e) {
          console.log('Supabase insert chat message error:', e);
        }
      },

      addReaction: async (channelId, messageId, emoji, userId) => {
        const channelMsgs = get().messages[channelId] || [];
        const targetMsg = channelMsgs.find((m) => m.id === messageId);
        if (!targetMsg) return;

        let nextReactions = targetMsg.reactions ? [...targetMsg.reactions] : [];
        const existing = nextReactions.find((r) => r.emoji === emoji);

        if (existing) {
          if (existing.userIds.includes(userId)) {
            nextReactions = nextReactions
              .map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.count - 1, userIds: r.userIds.filter((id) => id !== userId) }
                  : r
              )
              .filter((r) => r.count > 0);
          } else {
            nextReactions = nextReactions.map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.count + 1, userIds: [...r.userIds, userId] }
                : r
            );
          }
        } else {
          nextReactions.push({ emoji, count: 1, userIds: [userId] });
        }

        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: (state.messages[channelId] || []).map((m) =>
              m.id === messageId ? { ...m, reactions: nextReactions } : m
            ),
          },
        }));

        try {
          await supabase
            .from('chat_messages')
            .update({ reactions: nextReactions })
            .eq('id', messageId);
        } catch (e) {
          console.log('Error updating reaction in Supabase:', e);
        }
      },

      subscribeToChat: (channelId) => {
        get().fetchMessages(channelId);

        const channelTopic = `chat-room-${channelId}`;
        const channel = getCleanChannel(channelTopic)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
            (payload) => {
              const m = payload.new as any;
              if (!m || !m.id) return;
              const mapped: ChatMessage = {
                id: m.id,
                senderId: m.sender_id || m.senderId || 'user',
                senderName: m.sender_name || m.senderName || 'Thành viên',
                senderAvatar: m.sender_avatar || m.senderAvatar,
                content: m.content || '',
                timestamp: m.timestamp || new Date().toISOString(),
                channelId: m.channel_id || channelId,
                reactions: Array.isArray(m.reactions) ? m.reactions : [],
              };

              set((state) => {
                const current = state.messages[channelId] || [];
                if (current.some((item) => item.id === mapped.id)) return state;
                return {
                  messages: {
                    ...state.messages,
                    [channelId]: [...current, mapped],
                  },
                };
              });
            }
          )
          .subscribe((status) => {
            if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !supabase.realtime.isConnected()) {
              supabase.realtime.connect();
            }
          });

        return () => {
          try {
            supabase.removeChannel(channel);
          } catch {}
        };
      },
    }),
    {
      name: 'apexa_mobile_chat',
      storage: createJSONStorage(() => safeAsyncStorage),
    }
  )
);
