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
  Alert,
} from 'react-native';
import { Folder, List, ChevronRight, Plus, X, ArrowRight, Layers, Trash2, PlusCircle } from 'lucide-react-native';
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
  const deleteSpace = useSpaceStore((s) => s.deleteSpace);
  const addList = useSpaceStore((s) => s.addList);
  const deleteList = useSpaceStore((s) => s.deleteList);
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

  // Add list modal state
  const [showAddListModal, setShowAddListModal] = useState(false);
  const [targetSpaceIdForList, setTargetSpaceIdForList] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [addingList, setAddingList] = useState(false);

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

  const handleAddListToSpace = async () => {
    if (!targetSpaceIdForList || !newListName.trim()) return;
    setAddingList(true);
    try {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      await addList(targetSpaceIdForList, newListName.trim());
      Toast.show({
        type: 'success',
        text1: 'Đã thêm danh sách',
        text2: `Danh sách "${newListName.trim()}" đã được tạo thành công.`,
      });
      setNewListName('');
      setShowAddListModal(false);
    } finally {
      setAddingList(false);
    }
  };

  const handleDeleteSpace = (spaceId: string, name: string) => {
    Alert.alert(
      'Xóa không gian',
      `Bạn có chắc chắn muốn xóa không gian "${name}"? Toàn bộ danh sách bên trong sẽ bị xóa.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch {}
            await deleteSpace(spaceId);
            Toast.show({
              type: 'success',
              text1: 'Đã xóa không gian',
              text2: `Không gian "${name}" đã được xóa.`,
            });
          },
        },
      ]
    );
  };

  const handleDeleteList = (spaceId: string, listId: string, listName: string) => {
    Alert.alert(
      'Xóa danh sách',
      `Bạn có chắc chắn muốn xóa danh sách "${listName}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
            await deleteList(spaceId, listId);
            Toast.show({
              type: 'success',
              text1: 'Đã xóa danh sách',
              text2: `Danh sách "${listName}" đã được xóa.`,
            });
          },
        },
      ]
    );
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
          const completedTasks = spTasks.filter((t) => t.status === 'completed').length;
          const progressPercent = spTasks.length > 0 ? Math.round((completedTasks / spTasks.length) * 100) : 0;
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
                    {sp.lists?.length || 0} danh sách • {spTasks.length} việc {spTasks.length > 0 ? `(${completedTasks} xong)` : ''}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => handleDeleteSpace(sp.id, sp.name)}
                    style={styles.actionIconBtn}
                  >
                    <Trash2 size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                  <ChevronRight size={18} color={colors.textMuted} />
                </View>
              </TouchableOpacity>

              {/* Space Progress Bar */}
              {spTasks.length > 0 && (
                <View style={styles.spaceProgressWrap}>
                  <View style={styles.spaceProgressRow}>
                    <Text style={[styles.spaceProgressText, { color: colors.textMuted }]}>
                      Tiến độ hoàn thành
                    </Text>
                    <Text style={[styles.spaceProgressPercent, { color: spColor }]}>
                      {progressPercent}%
                    </Text>
                  </View>
                  <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceHover }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${progressPercent}%`, backgroundColor: spColor },
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* Space Lists */}
              {sp.lists && sp.lists.length > 0 ? (
                <View style={styles.listsContainer}>
                  {sp.lists.map((l) => {
                    const listTasks = tasks.filter((t) => t.listId === l.id);
                    const listDone = listTasks.filter((t) => t.status === 'completed').length;

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
                              {listTasks.length > 0 ? `${listDone}/${listTasks.length}` : '0'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            onPress={() => handleDeleteList(sp.id, l.id, l.name)}
                            style={styles.actionIconBtn}
                          >
                            <X size={14} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}

              {/* Space Action Buttons */}
              <View style={styles.spaceBottomActionRow}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    setTargetSpaceIdForList(sp.id);
                    setNewListName('');
                    setShowAddListModal(true);
                  }}
                  style={[
                    styles.addListBtn,
                    { backgroundColor: colors.surfaceHover, borderColor: colors.border },
                  ]}
                >
                  <PlusCircle size={14} color={spColor} />
                  <Text style={[styles.addListBtnText, { color: spColor }]}>Thêm danh sách</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => handleSelectList(sp.id, null)}
                  style={[styles.viewAllTasksBtn, { backgroundColor: `${spColor}12` }]}
                >
                  <Text style={[styles.viewAllTasksText, { color: spColor }]}>
                    Vào ({spTasks.length})
                  </Text>
                  <ArrowRight size={14} color={spColor} />
                </TouchableOpacity>
              </View>
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

      {/* Modal Add List to Space */}
      <Modal
        visible={showAddListModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddListModal(false)}
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
                Thêm danh sách mới
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddListModal(false)}
                style={[styles.modalClose, { backgroundColor: colors.surfaceHover }]}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20, gap: 14 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Tên danh sách
              </Text>
              <Input
                placeholder="VD: Cần xử lý gấp, Lưu trữ, Bug fix..."
                value={newListName}
                onChangeText={setNewListName}
                autoFocus
              />

              <Button
                title={addingList ? 'Đang thêm...' : 'Tạo danh sách'}
                onPress={handleAddListToSpace}
                loading={addingList}
                disabled={!newListName.trim()}
                style={{ marginTop: 8 }}
              />
            </View>
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
    paddingBottom: 110,
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
    marginBottom: 12,
  },
  spaceProgressWrap: {
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  spaceProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  spaceProgressText: {
    fontSize: 11,
    fontWeight: '500',
  },
  spaceProgressPercent: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionIconBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
  spaceBottomActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  addListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  addListBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
