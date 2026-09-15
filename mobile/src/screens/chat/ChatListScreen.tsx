import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Hash, Lock, MessageSquare, ChevronRight } from 'lucide-react-native';
import { useUiStore } from '../../store/uiStore';
import { useChatStore } from '../../store/chatStore';
import { useTranslation } from '../../locales';
import { Header } from '../../components/common/Header';

interface ChatListScreenProps {
  navigation: any;
}

export const ChatListScreen: React.FC<ChatListScreenProps> = ({ navigation }) => {
  const colors = useUiStore((s) => s.getColors());
  const channels = useChatStore((s) => s.channels);
  const messages = useChatStore((s) => s.messages);
  const setActiveChannelId = useChatStore((s) => s.setActiveChannelId);
  const { t } = useTranslation();

  const handleOpenChannel = (id: string, name: string) => {
    setActiveChannelId(id);
    navigation.navigate('ChatRoom', { channelId: id, channelName: name });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={t.chat.title} subtitle="Trao đổi công việc theo thời gian thực" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t.chat.channels}
        </Text>

        {channels.map((ch) => {
          const channelMsgs = messages[ch.id] || [];
          const lastMsg = channelMsgs[channelMsgs.length - 1];

          return (
            <TouchableOpacity
              key={ch.id}
              activeOpacity={0.7}
              onPress={() => handleOpenChannel(ch.id, ch.name)}
              style={[
                styles.channelCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.primarySubtle },
                ]}
              >
                {ch.type === 'private' ? (
                  <Lock size={18} color={colors.primary} />
                ) : (
                  <Hash size={18} color={colors.primary} />
                )}
              </View>

              <View style={styles.channelInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.channelName, { color: colors.textPrimary }]}>
                    {ch.name}
                  </Text>
                  {lastMsg && (
                    <Text style={[styles.timeText, { color: colors.textMuted }]}>
                      {new Date(lastMsg.timestamp).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  )}
                </View>

                <Text
                  numberOfLines={1}
                  style={[styles.lastMessage, { color: colors.textSecondary }]}>
                  {lastMsg ? `${lastMsg.senderName}: ${lastMsg.content}` : ch.description}
                </Text>
              </View>

              {ch.unreadCount && ch.unreadCount > 0 ? (
                <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.unreadText}>{ch.unreadCount}</Text>
                </View>
              ) : (
                <ChevronRight size={18} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          );
        })}

        {channels.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MessageSquare size={28} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Chưa có kênh trò chuyện</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Các kênh của workspace sẽ xuất hiện ở đây ngay khi được tạo trên web.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  channelName: {
    fontSize: 15,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 11,
  },
  lastMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: { alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 28, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
