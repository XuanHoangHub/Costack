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
import { Send, Smile } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useTranslation } from '../../locales';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';

interface ChatRoomScreenProps {
  route: any;
  navigation: any;
}

const EMPTY_MESSAGES: any[] = [];

export const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({
  route,
  navigation,
}) => {
  const { channelId, channelName } = route.params;
  const colors = useUiStore((s) => s.colors);
  const currentUser = useAuthStore((s) => s.currentUser);
  const messagesMap = useChatStore((s) => s.messages);
  const messages = messagesMap[channelId] || EMPTY_MESSAGES;
  const sendMessage = useChatStore((s) => s.sendMessage);
  const addReaction = useChatStore((s) => s.addReaction);
  const subscribeToChat = useChatStore((s) => s.subscribeToChat);
  const { t } = useTranslation();

  const [inputMessage, setInputMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const unsub = subscribeToChat(channelId);
    return unsub;
  }, [channelId, subscribeToChat]);

  useEffect(() => {
    // Auto scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
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
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
      >
        {messages.map((msg) => {
          const isMe = msg.senderId === 'user-default' || msg.senderName === currentUser?.name;

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
                  size={32}
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
                      { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textMuted },
                    ]}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                {/* Reactions */}
                <View style={styles.reactionsRow}>
                  {msg.reactions?.map((r, i) => (
                    <TouchableOpacity
                      key={i}
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
                    onPress={() => handleReaction(msg.id, '👍')}
                    style={[
                      styles.addReactionBtn,
                      { backgroundColor: colors.surfaceSubtle },
                    ]}
                  >
                    <Smile size={13} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {messages.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t.chat.noMessages}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TextInput
          placeholder={t.chat.typeMessage}
          placeholderTextColor={colors.textPlaceholder}
          value={inputMessage}
          onChangeText={setInputMessage}
          onSubmitEditing={handleSend}
          style={[
            styles.textInput,
            {
              backgroundColor: colors.surfaceSubtle,
              color: colors.textPrimary,
              borderColor: colors.border,
            },
          ]}
        />

        <TouchableOpacity
          onPress={handleSend}
          disabled={!inputMessage.trim()}
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
        </TouchableOpacity>
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
    paddingBottom: 20,
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
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  reactionText: {
    fontSize: 11,
  },
  addReactionBtn: {
    padding: 4,
    borderRadius: 8,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
