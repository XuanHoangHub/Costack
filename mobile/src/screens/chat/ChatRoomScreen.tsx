import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Send, Smile, MessagesSquare } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useTranslation } from '../../locales';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { PressableScale } from '../../components/common/PressableScale';

interface ChatRoomScreenProps {
  route: any;
  navigation: any;
}

const EMPTY_MESSAGES: any[] = [];
const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🎉', '🚀', '👀'];

export const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({
  route,
  navigation,
}) => {
  const { channelId, channelName } = route.params;
  const insets = useSafeAreaInsets();
  const colors = useUiStore((s) => s.colors);
  const currentUser = useAuthStore((s) => s.currentUser);
  const messagesMap = useChatStore((s) => s.messages);
  const messages = messagesMap[channelId] || EMPTY_MESSAGES;
  const sendMessage = useChatStore((s) => s.sendMessage);
  const addReaction = useChatStore((s) => s.addReaction);
  const subscribeToChat = useChatStore((s) => s.subscribeToChat);
  const { t } = useTranslation();

  const [inputMessage, setInputMessage] = useState('');
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const unsub = subscribeToChat(channelId);
    return unsub;
  }, [channelId, subscribeToChat]);

  useEffect(() => {
    // Auto scroll to bottom
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const handleSend = async () => {
    if (!inputMessage.trim()) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const text = inputMessage.trim();
    setInputMessage('');
    await sendMessage(
      channelId,
      text,
      currentUser?.name || 'Bạn',
      currentUser?.avatar
    );
  };

  const handleReaction = (msgId: string, emoji: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    addReaction(channelId, msgId, emoji, currentUser?.id || 'user-default');
    setActiveReactionMsgId(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Header
        title={`# ${channelName}`}
        subtitle={t.chat.onlineNow}
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* Messages Feed */}
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messagesContainer}
        onScrollBeginDrag={() => setActiveReactionMsgId(null)}
      >
        {messages.map((msg) => {
          const isMe = msg.senderId === 'user-default' || msg.senderName === currentUser?.name;
          const showPicker = activeReactionMsgId === msg.id;

          return (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                isMe ? styles.myMessageRow : styles.otherMessageRow,
              ]}
            >
              {!isMe && (
                <Avatar
                  name={msg.senderName}
                  url={msg.senderAvatar}
                  size={34}
                />
              )}

              <View
                style={[
                  styles.bubbleWrap,
                  isMe ? styles.myBubbleWrap : styles.otherBubbleWrap,
                ]}
              >
                {!isMe && (
                  <Text style={[styles.senderName, { color: colors.textMuted }]}>
                    {msg.senderName}
                  </Text>
                )}

                <View
                  style={[
                    styles.bubble,
                    isMe ? styles.myBubble : styles.otherBubble,
                    {
                      backgroundColor: isMe ? colors.primary : colors.surface,
                      borderColor: isMe ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      { color: isMe ? '#ffffff' : colors.textPrimary },
                    ]}
                  >
                    {msg.content}
                  </Text>

                  <Text
                    style={[
                      styles.messageTime,
                      { color: isMe ? 'rgba(255,255,255,0.75)' : colors.textMuted },
                    ]}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                {/* Quick Emoji Picker Floating Bar */}
                {showPicker && (
                  <View
                    style={[
                      styles.quickEmojiBar,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {QUICK_EMOJIS.map((emoji) => (
                      <TouchableOpacity
                        key={emoji}
                        activeOpacity={0.7}
                        onPress={() => handleReaction(msg.id, emoji)}
                        style={styles.quickEmojiBtn}
                      >
                        <Text style={styles.quickEmojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Reactions */}
                <View style={styles.reactionsRow}>
                  {msg.reactions?.map((r, i) => (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.7}
                      onPress={() => handleReaction(msg.id, r.emoji)}
                      style={[
                        styles.reactionPill,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={styles.reactionText}>
                        {r.emoji} {r.count}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    onPress={() => {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {}
                      setActiveReactionMsgId(showPicker ? null : msg.id);
                    }}
                    style={[
                      styles.addReactionBtn,
                      {
                        backgroundColor: showPicker ? colors.surfaceHover : colors.surfaceSubtle,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Smile size={13} color={showPicker ? colors.primary : colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {messages.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: `${colors.primary}15` }]}>
              <MessagesSquare size={36} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Chưa có tin nhắn nào
            </Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Hãy bắt đầu cuộc trò chuyện trong kênh này!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Input Bar with dynamic Safe Area padding */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <TextInput
          placeholder={t.chat.typeMessage}
          placeholderTextColor={colors.textPlaceholder}
          value={inputMessage}
          onChangeText={setInputMessage}
          onSubmitEditing={handleSend}
          multiline
          style={[
            styles.textInput,
            {
              backgroundColor: colors.surfaceSubtle,
              color: colors.textPrimary,
              borderColor: colors.border,
            },
          ]}
        />

        <PressableScale
          onPress={handleSend}
          disabled={!inputMessage.trim()}
          activeScale={0.9}
          style={[
            styles.sendBtn,
            {
              backgroundColor: inputMessage.trim()
                ? colors.primary
                : colors.surfaceHover,
            },
          ]}
        >
          <Send
            size={18}
            color={inputMessage.trim() ? '#ffffff' : colors.textMuted}
          />
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  bubbleWrap: {
    maxWidth: '78%',
  },
  myBubbleWrap: {
    alignItems: 'flex-end',
  },
  otherBubbleWrap: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  myBubble: {
    borderTopRightRadius: 4,
  },
  otherBubble: {
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  quickEmojiBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 6,
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  quickEmojiBtn: {
    padding: 4,
  },
  quickEmojiText: {
    fontSize: 18,
  },
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  reactionText: {
    fontSize: 12,
  },
  addReactionBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    maxHeight: 100,
    minHeight: 42,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
});
