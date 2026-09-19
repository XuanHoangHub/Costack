import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Folder, List, ChevronRight, Plus, X, ArrowRight, Layers } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '../../store/uiStore';
import { useSpaceStore } from '../../store/spaceStore';
import { useTaskStore } from '../../store/taskStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { RenderSpaceIcon } from '../../components/common/RenderSpaceIcon';
import Toast from 'react-native-toast-message';

interface SpacesScreenProps {
  navigation: any;
}

const EMOJI_PRESETS = [
  'Rocket:indigo',
  'Package:blue',
  'Folder:amber',
  'Target:rose',
  'Brain:pink',
  'Zap:amber',
  'Briefcase:slate',
  'Kanban:purple',
  'Sparkles:purple',
  'Flame:rose',
  '🚀',
  '🎯',
  '⚡',
  '💼',
  '💻',
];

export const SpacesScreen: React.FC<SpacesScreenProps> = ({ navigation }) => {
  const colors = useUiStore((s) => s.getColors());
  const spaces = useSpaceStore((s) => s.spaces);
  const tasks = useTaskStore((s) => s.tasks);
  const addSpace = useSpaceStore((s) => s.addSpace);
  const fetchSpaces = useSpaceStore((s) => s.fetchSpacesFromSupabase);
  const setActiveSpaceId = useSpaceStore((s) => s.setActiveSpaceId);
  const setActiveListId = useSpaceStore((s) => s.setActiveListId);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [spaceName, setSpaceName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('Rocket:indigo');
  const [initialListName, setInitialListName] = useState('Công việc chung');
  const [loading, setLoading] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await Promise.allSettled([
      fetchSpaces(),
      useTaskStore.getState().fetchTasksFromSupabase(),
      useWorkspaceStore.getState().fetchWorkspacesFromSupabase(),
    ]);
    setRefreshing(false);
    Toast.show({
      type: 'success',
      text1: 'Đã cập nhật',
      text2: 'Danh sách Không gian đã được đồng bộ.',
      visibilityTime: 2000,
    });
  };

  const handleSelectList = (spaceId: string, listId: string | null) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setActiveSpaceId(spaceId);
    setActiveListId(listId);
    (navigation.getParent() || navigation).navigate('Tasks');
  };

  const handleCreateSpace = async () => {
    if (!spaceName.trim()) return;
    setLoading(true);
    try {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      const newSpaceId = `sp-${Date.now()}`;
      const newListId = `l-${Date.now()}`;

      await addSpace({
        id: newSpaceId,
        name: spaceName.trim(),
        emoji: selectedEmoji,
        themeColor: colors.primary,
        workspaceId: activeWorkspaceId,
        lists: [
          { id: newListId, name: initialListName.trim() || 'Công việc chung' },
        ],
      });

      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: `Không gian "${spaceName.trim()}" đã được tạo.`,
      });

      setSpaceName('');
      setShowModal(false);
    } finally {
      setLoading(false);
    }
  };

  const currentSpaces = spaces.filter((s) => !activeWorkspaceId || s.workspaceId === activeWorkspaceId);

  const canGoBack = navigation.canGoBack ? navigation.canGoBack() : false;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Không gian làm việc"
        subtitle={`${currentSpaces.length} Không gian dự án`}
        showBack={canGoBack}
        onBack={canGoBack ? () => navigation.goBack() : undefined}
        rightAction={
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Plus size={18} color="#ffffff" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {currentSpaces.map((sp) => {
          const spTasks = tasks.filter((t) => t.spaceId === sp.id);
          const spColor = sp.themeColor || colors.primary;

          return (
            <View
              key={sp.id}
              style={[
                styles.spaceCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Space Header */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleSelectList(sp.id, null)}
                style={styles.spaceHeader}
              >
                <View style={[styles.emojiWrap, { backgroundColor: `${spColor}20` }]}>
                  <RenderSpaceIcon icon={sp.emoji || 'Folder'} size={24} color={spColor} />
                </View>
                <View style={styles.spaceInfo}>
                  <Text style={[styles.spaceName, { color: colors.textPrimary }]}>
                    {sp.name}
                  </Text>
                  <Text style={[styles.spaceMeta, { color: colors.textMuted }]}>
                    {sp.lists?.length || 0} danh sách • {spTasks.length} công việc
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Space Lists */}
              {sp.lists && sp.lists.length > 0 ? (
                <View style={styles.listsContainer}>
                  {sp.lists.map((l) => {
                    const listTasks = tasks.filter((t) => t.listId === l.id);

                    return (
                      <TouchableOpacity
                        key={l.id}
                        activeOpacity={0.7}
                        onPress={() => handleSelectList(sp.id, l.id)}
                        style={[
                          styles.listItem,
                          {
                            backgroundColor: colors.surfaceSubtle,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.listLeft}>
                          <List size={15} color={spColor} />
                          <Text
                            style={[styles.listName, { color: colors.textSecondary }]}
                          >
                            {l.name}
                          </Text>
                        </View>
                        <View style={styles.listRight}>
                          <View style={[styles.listCountPill, { backgroundColor: colors.surfaceHover }]}>
                            <Text style={[styles.listCountText, { color: colors.textMuted }]}>
                              {listTasks.length}
                            </Text>
                          </View>
                          <ChevronRight size={15} color={colors.textMuted} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}

              {/* Quick Action: Enter Space */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => handleSelectList(sp.id, null)}
                style={[styles.viewAllTasksBtn, { backgroundColor: `${spColor}12` }]}
              >
                <Text style={[styles.viewAllTasksText, { color: spColor }]}>
                  Vào không gian ({spTasks.length} công việc)
                </Text>
                <ArrowRight size={14} color={spColor} />
              </TouchableOpacity>
            </View>
          );
        })}

        {currentSpaces.length === 0 && (
          <View
            style={[
              styles.emptyWrap,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.primary}18` }]}>
              <Layers size={28} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Chưa có Không gian làm việc
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Hãy tạo Không gian đầu tiên để phân loại danh sách công việc và dự án
            </Text>
            <Button
              title="Tạo Không gian mới"
              onPress={() => setShowModal(true)}
              style={{ marginTop: 14 }}
            />
          </View>
        )}
      </ScrollView>

      {/* Modal Create Space */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Tạo Không gian mới
              </Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={[styles.modalClose, { backgroundColor: colors.surfaceHover }]}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
              {/* Emoji Picker */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Biểu tượng
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {EMOJI_PRESETS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => setSelectedEmoji(emoji)}
                    style={[
                      styles.emojiChip,
                      {
                        backgroundColor:
                          selectedEmoji === emoji
                            ? colors.primarySubtle
                            : colors.surfaceSubtle,
                        borderColor:
                          selectedEmoji === emoji ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
                      <RenderSpaceIcon icon={emoji} size={20} />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Space Name */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Tên không gian
              </Text>
              <Input
                placeholder="VD: Dự án Alpha, Thiết kế UI/UX..."
                value={spaceName}
                onChangeText={setSpaceName}
              />

              {/* Initial List Name */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Danh sách khởi đầu
              </Text>
              <Input
                placeholder="VD: Cần làm, Đang xử lý..."
                value={initialListName}
                onChangeText={setInitialListName}
              />

              <View style={{ marginTop: 10 }}>
                <Button
                  title="Tạo Không gian"
                  onPress={handleCreateSpace}
                  loading={loading}
                  disabled={!spaceName.trim()}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  spaceCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  spaceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  emojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaceInfo: {
    flex: 1,
  },
  spaceName: {
    fontSize: 16,
    fontWeight: '700',
  },
  spaceMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  listsContainer: {
    gap: 6,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  listLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  listRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listCountPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  listCountText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listName: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  viewAllTasksBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
    gap: 6,
  },
  viewAllTasksText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyWrap: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  emojiChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
});
