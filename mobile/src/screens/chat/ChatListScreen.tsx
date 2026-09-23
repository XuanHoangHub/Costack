import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import {
  Hash,
  Lock,
  MessageSquare,
  ChevronRight,
  Plus,
  X,
  User,
  Users,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useUiStore } from '../../store/uiStore';
import { useChatStore } from '../../store/chatStore';
import { useTranslation } from '../../locales';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';

interface ChatListScreenProps {
  navigation: any;
}

export const ChatListScreen: React.FC<ChatListScreenProps> = ({ navigation }) => {
  const colors = useUiStore((s) => s.getColors());
  const channels = useChatStore((s) => s.channels);
  const messages = useChatStore((s) => s.messages);
  const setActiveChannelId = useChatStore((s) => s.setActiveChannelId);
  const createChannel = useChatStore((s) => s.createChannel);
  const { t } = useTranslation();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const publicChannels = channels.filter((c) => c.type !== 'dm');
  const directMessages = channels.filter((c) => c.type === 'dm');

  const handleOpenChannel = (id: string, name: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setActiveChannelId(id);
    navigation.navigate('ChatRoom', { channelId: id, channelName: name });
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    setLoading(true);
    try {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      const chan = await createChannel(
        newChannelName.trim(),
        newChannelDesc.trim(),
        isPrivate ? 'private' : 'public'
      );

      Toast.show({
        type: 'success',
        text1: 'Đã tạo kênh mới! 🎉',
        text2: `Kênh #${chan.name} đã sẵn sàng hoạt động.`,
      });

      setNewChannelName('');
      setNewChannelDesc('');
      setIsPrivate(false);
      setShowCreateModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={t.chat.title}
        subtitle="Trao đổi công việc theo thời gian thực"
        rightAction={
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Plus size={18} color="#ffffff" />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Public & Private Channels */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t.chat.channels} ({publicChannels.length})
          </Text>
        </View>

        {publicChannels.map((ch) => {
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
                  style={[styles.lastMessage, { color: colors.textSecondary }]}
                >
                  {lastMsg ? `${lastMsg.senderName}: ${lastMsg.content}` : ch.description || 'Kênh thảo luận'}
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

        {/* Direct Messages Section */}
        {directMessages.length > 0 && (
          <View style={{ marginTop: 18 }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {t.chat.directMessages} ({directMessages.length})
              </Text>
            </View>

            {directMessages.map((dm) => {
              const dmMsgs = messages[dm.id] || [];
              const lastMsg = dmMsgs[dmMsgs.length - 1];

              return (
                <TouchableOpacity
                  key={dm.id}
                  activeOpacity={0.7}
                  onPress={() => handleOpenChannel(dm.id, dm.name)}
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
                      { backgroundColor: `${colors.accentCyan}20` },
                    ]}
                  >
                    <User size={18} color={colors.accentCyan} />
                  </View>

                  <View style={styles.channelInfo}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.channelName, { color: colors.textPrimary }]}>
                        {dm.name}
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
                      style={[styles.lastMessage, { color: colors.textSecondary }]}
                    >
                      {lastMsg ? `${lastMsg.senderName}: ${lastMsg.content}` : dm.description || 'Tin nhắn trực tiếp'}
                    </Text>
                  </View>

                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {channels.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MessageSquare size={28} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Chưa có kênh trò chuyện</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Nhấn nút "+" phía trên để tạo kênh trò chuyện đầu tiên cho nhóm!
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create Channel Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t.chat.createChannel}</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.closeBtn}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tên kênh</Text>
              <TextInput
                placeholder={t.chat.channelNamePlaceholder}
                placeholderTextColor={colors.textPlaceholder}
                value={newChannelName}
                onChangeText={setNewChannelName}
                style={[
                  styles.textInput,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary },
                ]}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>Mô tả mục đích</Text>
              <TextInput
                placeholder={t.chat.channelDescPlaceholder}
                placeholderTextColor={colors.textPlaceholder}
                value={newChannelDesc}
                onChangeText={setNewChannelDesc}
                style={[
                  styles.textInput,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary },
                ]}
              />

              <View style={styles.switchRow}>
                <View>
                  <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>{t.chat.isPrivate}</Text>
                  <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                    Chỉ các thành viên được mời mới có thể xem
                  </Text>
                </View>
                <Switch
                  value={isPrivate}
                  onValueChange={setIsPrivate}
                  trackColor={{ false: '#64748b', true: colors.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <Button
                title={t.common.create}
                onPress={handleCreateChannel}
                loading={loading}
                disabled={!newChannelName.trim()}
                style={{ marginTop: 20 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
    marginBottom: 3,
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
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  switchSub: {
    fontSize: 11,
    marginTop: 2,
  },
});
