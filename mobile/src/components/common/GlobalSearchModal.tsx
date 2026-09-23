import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Search,
  X,
  CheckSquare,
  Layers,
  MessageSquare,
  Users,
  Sparkles,
  ArrowRight,
  Wallet,
  Calendar,
  BarChart3,
  Clock,
  Plus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { useSpaceStore } from '../../store/spaceStore';
import { useChatStore } from '../../store/chatStore';
import { useMemberStore } from '../../store/memberStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTranslation } from '../../locales';
import { Task } from '../../types';
import { Avatar } from './Avatar';
import { Badge } from './Badge';

interface GlobalSearchModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
  onOpenTask?: (task: Task) => void;
  onOpenCreateTask?: () => void;
}

type SearchCategory = 'all' | 'tasks' | 'spaces' | 'channels' | 'members' | 'actions';

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  visible,
  onClose,
  navigation,
  onOpenTask,
  onOpenCreateTask,
}) => {
  const colors = useUiStore((s) => s.getColors());
  const { t } = useTranslation();

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');

  const tasks = useTaskStore((s) => s.tasks);
  const spaces = useSpaceStore((s) => s.spaces);
  const channels = useChatStore((s) => s.channels);
  const members = useMemberStore((s) => s.members);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveSpaceId = useSpaceStore((s) => s.setActiveSpaceId);
  const setActiveChannelId = useChatStore((s) => s.setActiveChannelId);

  const cleanQuery = query.trim().toLowerCase();

  // Search Results
  const matchedTasks = useMemo(() => {
    if (!cleanQuery) return tasks.slice(0, 5);
    return tasks.filter((t) => {
      const titleMatch = t.title.toLowerCase().includes(cleanQuery);
      const descMatch = t.description?.toLowerCase().includes(cleanQuery);
      const tagMatch = t.tags?.some((tag) => tag.toLowerCase().includes(cleanQuery));
      return titleMatch || descMatch || tagMatch;
    }).slice(0, 10);
  }, [tasks, cleanQuery]);

  const matchedSpaces = useMemo(() => {
    const wsSpaces = spaces.filter((s) => !activeWorkspaceId || s.workspaceId === activeWorkspaceId);
    if (!cleanQuery) return wsSpaces.slice(0, 4);
    return wsSpaces.filter((s) => s.name.toLowerCase().includes(cleanQuery));
  }, [spaces, activeWorkspaceId, cleanQuery]);

  const matchedChannels = useMemo(() => {
    if (!cleanQuery) return channels.slice(0, 4);
    return channels.filter(
      (c) => c.name.toLowerCase().includes(cleanQuery) || c.description?.toLowerCase().includes(cleanQuery)
    );
  }, [channels, cleanQuery]);

  const matchedMembers = useMemo(() => {
    if (!cleanQuery) return members.slice(0, 4);
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(cleanQuery) ||
        m.email.toLowerCase().includes(cleanQuery) ||
        m.department?.toLowerCase().includes(cleanQuery)
    );
  }, [members, cleanQuery]);

  const quickActions = useMemo(() => {
    const allActions = [
      {
        id: 'new-task',
        title: 'Tạo công việc mới',
        subtitle: 'Thêm công việc vào không gian hiện tại',
        icon: Plus,
        color: colors.primary,
        action: () => {
          onClose();
          onOpenCreateTask?.();
        },
      },
      {
        id: 'nav-analytics',
        title: 'Báo cáo & Phân tích',
        subtitle: 'Xem tiến độ và hiệu suất công việc',
        icon: BarChart3,
        color: '#06b6d4',
        action: () => {
          onClose();
          navigation.navigate('More', { screen: 'Analytics' });
        },
      },
      {
        id: 'nav-calendar',
        title: 'Lịch toàn diện',
        subtitle: 'Lộ trình và công việc theo ngày',
        icon: Calendar,
        color: '#8b5cf6',
        action: () => {
          onClose();
          navigation.navigate('More', { screen: 'Calendar' });
        },
      },
      {
        id: 'nav-timer',
        title: 'Đồng hồ Focus Pomodoro',
        subtitle: 'Bắt đầu phiên làm việc tập trung 25 phút',
        icon: Clock,
        color: '#f59e0b',
        action: () => {
          onClose();
          navigation.navigate('More', { screen: 'Timer' });
        },
      },
      {
        id: 'nav-ai',
        title: 'Hỏi Costack Brain AI',
        subtitle: 'Trợ lý lập kế hoạch và tóm tắt tiến độ',
        icon: Sparkles,
        color: colors.primary,
        action: () => {
          onClose();
          navigation.navigate('More', { screen: 'AiBrain' });
        },
      },
      {
        id: 'nav-finance',
        title: 'Sổ quỹ & Tài chính',
        subtitle: 'Xem thu chi và số dư ví dự án',
        icon: Wallet,
        color: colors.success,
        action: () => {
          onClose();
          navigation.navigate('More', { screen: 'Finance' });
        },
      },
    ];

    if (!cleanQuery) return allActions;
    return allActions.filter(
      (a) => a.title.toLowerCase().includes(cleanQuery) || a.subtitle.toLowerCase().includes(cleanQuery)
    );
  }, [cleanQuery, colors, navigation, onClose, onOpenCreateTask]);

  const handleSelectTask = (task: Task) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onClose();
    if (onOpenTask) {
      onOpenTask(task);
    } else {
      navigation.navigate('Tasks');
    }
  };

  const handleSelectSpace = (spaceId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setActiveSpaceId(spaceId);
    onClose();
    navigation.navigate('Tasks');
  };

  const handleSelectChannel = (channelId: string, channelName: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setActiveChannelId(channelId);
    onClose();
    navigation.navigate('Chat', {
      screen: 'ChatRoom',
      params: { channelId, channelName },
    });
  };

  const handleSelectMember = async (memberId: string, memberName: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const dmId = await useChatStore.getState().getOrCreateDirectMessageChannel(memberId, memberName);
    onClose();
    navigation.navigate('Chat', {
      screen: 'ChatRoom',
      params: { channelId: dmId, channelName: memberName },
    });
  };

  const categories: Array<{ id: SearchCategory; label: string }> = [
    { id: 'all', label: t.search.categoryAll },
    { id: 'tasks', label: t.search.categoryTasks },
    { id: 'spaces', label: t.search.categorySpaces },
    { id: 'channels', label: t.search.categoryChannels },
    { id: 'members', label: t.search.categoryMembers },
    { id: 'actions', label: t.search.categoryActions },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.75)' }]}>
        <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Search Header */}
          <View style={[styles.searchBar, { borderBottomColor: colors.border }]}>
            <Search size={20} color={colors.primary} style={{ marginRight: 10 }} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder={t.search.placeholder}
              placeholderTextColor={colors.textPlaceholder}
              style={[styles.input, { color: colors.textPrimary }]}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} style={{ padding: 4, marginRight: 6 }}>
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.closeText, { color: colors.textSecondary }]}>Esc</Text>
            </TouchableOpacity>
          </View>

          {/* Categories Pill Bar */}
          <View style={styles.categoriesWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
              {categories.map((c) => {
                const isActive = activeCategory === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => {
                      try {
                        Haptics.selectionAsync();
                      } catch {}
                      setActiveCategory(c.id);
                    }}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isActive ? colors.primarySubtle : colors.surfaceSubtle,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        { color: isActive ? colors.primaryText : colors.textSecondary, fontWeight: isActive ? '700' : '500' },
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Search Results List */}
          <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
            {/* Quick Actions */}
            {(activeCategory === 'all' || activeCategory === 'actions') && quickActions.length > 0 && (
              <View style={styles.resultGroup}>
                <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{t.search.categoryActions}</Text>
                {quickActions.map((act) => {
                  const Icon = act.icon;
                  return (
                    <TouchableOpacity
                      key={act.id}
                      onPress={act.action}
                      style={[styles.resultItem, { borderBottomColor: colors.borderSubtle }]}
                    >
                      <View style={[styles.itemIcon, { backgroundColor: `${act.color}18` }]}>
                        <Icon size={18} color={act.color} />
                      </View>
                      <View style={styles.itemBody}>
                        <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{act.title}</Text>
                        <Text style={[styles.itemSub, { color: colors.textMuted }]}>{act.subtitle}</Text>
                      </View>
                      <ArrowRight size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Tasks */}
            {(activeCategory === 'all' || activeCategory === 'tasks') && matchedTasks.length > 0 && (
              <View style={styles.resultGroup}>
                <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{t.search.categoryTasks}</Text>
                {matchedTasks.map((tItem) => (
                  <TouchableOpacity
                    key={tItem.id}
                    onPress={() => handleSelectTask(tItem)}
                    style={[styles.resultItem, { borderBottomColor: colors.borderSubtle }]}
                  >
                    <View style={[styles.itemIcon, { backgroundColor: colors.primarySubtle }]}>
                      <CheckSquare size={17} color={colors.primary} />
                    </View>
                    <View style={styles.itemBody}>
                      <Text numberOfLines={1} style={[styles.itemTitle, { color: colors.textPrimary }]}>
                        {tItem.title}
                      </Text>
                      <Text numberOfLines={1} style={[styles.itemSub, { color: colors.textMuted }]}>
                        {tItem.status.toUpperCase()} • {tItem.priority}
                        {tItem.dueDate ? ` • Hạn: ${new Date(tItem.dueDate).toLocaleDateString('vi-VN')}` : ''}
                      </Text>
                    </View>
                    <Badge label={tItem.status} color={tItem.status === 'completed' ? colors.completed : colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Spaces */}
            {(activeCategory === 'all' || activeCategory === 'spaces') && matchedSpaces.length > 0 && (
              <View style={styles.resultGroup}>
                <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{t.search.categorySpaces}</Text>
                {matchedSpaces.map((sItem) => (
                  <TouchableOpacity
                    key={sItem.id}
                    onPress={() => handleSelectSpace(sItem.id)}
                    style={[styles.resultItem, { borderBottomColor: colors.borderSubtle }]}
                  >
                    <View style={[styles.itemIcon, { backgroundColor: `${colors.accentCyan}18` }]}>
                      <Layers size={17} color={colors.accentCyan} />
                    </View>
                    <View style={styles.itemBody}>
                      <Text numberOfLines={1} style={[styles.itemTitle, { color: colors.textPrimary }]}>
                        {sItem.name}
                      </Text>
                      <Text numberOfLines={1} style={[styles.itemSub, { color: colors.textMuted }]}>
                        {sItem.lists?.length || 0} danh sách
                      </Text>
                    </View>
                    <ArrowRight size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Channels */}
            {(activeCategory === 'all' || activeCategory === 'channels') && matchedChannels.length > 0 && (
              <View style={styles.resultGroup}>
                <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{t.search.categoryChannels}</Text>
                {matchedChannels.map((cItem) => (
                  <TouchableOpacity
                    key={cItem.id}
                    onPress={() => handleSelectChannel(cItem.id, cItem.name)}
                    style={[styles.resultItem, { borderBottomColor: colors.borderSubtle }]}
                  >
                    <View style={[styles.itemIcon, { backgroundColor: `${colors.primary}18` }]}>
                      <MessageSquare size={17} color={colors.primary} />
                    </View>
                    <View style={styles.itemBody}>
                      <Text numberOfLines={1} style={[styles.itemTitle, { color: colors.textPrimary }]}>
                        #{cItem.name}
                      </Text>
                      <Text numberOfLines={1} style={[styles.itemSub, { color: colors.textMuted }]}>
                        {cItem.description || 'Kênh trò chuyện'}
                      </Text>
                    </View>
                    <ArrowRight size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Members */}
            {(activeCategory === 'all' || activeCategory === 'members') && matchedMembers.length > 0 && (
              <View style={styles.resultGroup}>
                <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{t.search.categoryMembers}</Text>
                {matchedMembers.map((mItem) => (
                  <TouchableOpacity
                    key={mItem.id}
                    onPress={() => handleSelectMember(mItem.id, mItem.name)}
                    style={[styles.resultItem, { borderBottomColor: colors.borderSubtle }]}
                  >
                    <Avatar name={mItem.name} url={mItem.avatar} size={36} online={mItem.status === 'online'} />
                    <View style={[styles.itemBody, { marginLeft: 12 }]}>
                      <Text numberOfLines={1} style={[styles.itemTitle, { color: colors.textPrimary }]}>
                        {mItem.name}
                      </Text>
                      <Text numberOfLines={1} style={[styles.itemSub, { color: colors.textMuted }]}>
                        {mItem.department || mItem.email}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Nhắn tin</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Empty State */}
            {matchedTasks.length === 0 &&
              matchedSpaces.length === 0 &&
              matchedChannels.length === 0 &&
              matchedMembers.length === 0 &&
              quickActions.length === 0 && (
                <View style={styles.emptyWrap}>
                  <Search size={32} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t.search.noResults}</Text>
                </View>
              )}
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 54 : 32,
    paddingHorizontal: 14,
    paddingBottom: 24,
  },
  modalBox: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  closeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  closeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  categoriesWrap: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  categoriesScroll: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
  },
  resultsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultGroup: {
    marginTop: 14,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemBody: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemSub: {
    fontSize: 12,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
  },
});
