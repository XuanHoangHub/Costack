import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import {
  List,
  Columns3,
  Calendar as CalendarIcon,
  Plus,
  Search,
  X,
  Trash2,
  RotateCcw,
  Download,
  Table as TableIcon,
  MoreVertical,
  ClipboardList,
  RefreshCw,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { useSpaceStore } from '../../store/spaceStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from '../../locales';
import { Task } from '../../types';
import { Header } from '../../components/common/Header';
import { RenderSpaceIcon } from '../../components/common/RenderSpaceIcon';
import { SpaceFilterBar } from '../../components/tasks/SpaceFilterBar';
import { TaskFilterBar } from '../../components/tasks/TaskFilterBar';
import { TaskCard } from '../../components/tasks/TaskCard';
import { KanbanView } from '../../components/tasks/KanbanView';
import { CalendarAgendaView } from '../../components/tasks/CalendarAgendaView';
import { TaskTableView } from '../../components/tasks/TaskTableView';
import { TaskDetailSheet } from '../../components/tasks/TaskDetailSheet';
import { TaskCreateModal } from '../../components/tasks/TaskCreateModal';
import { FloatingActionButton } from '../../components/common/FloatingActionButton';
import { GlobalSearchModal } from '../../components/common/GlobalSearchModal';
import { ExportDataModal } from '../../components/common/ExportDataModal';

interface TasksScreenProps {
  navigation?: any;
}

export const TasksScreen: React.FC<TasksScreenProps> = ({ navigation }) => {
  const colors = useUiStore((s) => s.getColors());
  const tasks = useTaskStore((s) => s.tasks);
  const deletedTasks = useTaskStore((s) => s.deletedTasks);
  const filter = useTaskStore((s) => s.filter);
  const searchQuery = useTaskStore((s) => s.searchQuery);
  const fetchTasks = useTaskStore((s) => s.fetchTasksFromSupabase);
  const fetchDeletedTasks = useTaskStore((s) => s.fetchDeletedTasks);
  const restoreTask = useTaskStore((s) => s.restoreTask);
  const permanentDeleteTask = useTaskStore((s) => s.permanentDeleteTask);
  const emptyTrash = useTaskStore((s) => s.emptyTrash);

  const spaces = useSpaceStore((s) => s.spaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);
  const setActiveSpaceId = useSpaceStore((s) => s.setActiveSpaceId);
  const activeListId = useSpaceStore((s) => s.activeListId);
  const setActiveListId = useSpaceStore((s) => s.setActiveListId);
  const currentUser = useAuthStore((s) => s.currentUser);
  const { t } = useTranslation();

  const currentSpace = spaces.find((s) => s.id === activeSpaceId);
  const currentList = currentSpace?.lists?.find((l) => l.id === activeListId);

  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar' | 'table'>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await Promise.allSettled([
      fetchTasks(),
      useSpaceStore.getState().fetchSpacesFromSupabase(),
      useWorkspaceStore.getState().fetchWorkspacesFromSupabase(),
    ]);
    setRefreshing(false);
    Toast.show({
      type: 'success',
      text1: 'Đã cập nhật',
      text2: 'Danh sách công việc đã được đồng bộ.',
      visibilityTime: 2000,
    });
  };

  const handleModeChange = (mode: 'list' | 'board' | 'calendar' | 'table') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setViewMode(mode);
  };

  const handleOpenTrash = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await fetchDeletedTasks();
    setShowMoreMenu(false);
    setShowTrashModal(true);
  };

  // Filter tasks
  const now = Date.now();
  const workspaceSpaceIds = new Set(
    spaces.filter((s) => !activeWorkspaceId || s.workspaceId === activeWorkspaceId).map((s) => s.id)
  );

  const filteredTasks = tasks.filter((task) => {
    // Workspace filter
    if (activeWorkspaceId) {
      if (task.workspaceId && task.workspaceId !== activeWorkspaceId) return false;
      if (!task.workspaceId && task.spaceId && !workspaceSpaceIds.has(task.spaceId)) return false;
    }

    // Space & List filter
    if (activeSpaceId && task.spaceId !== activeSpaceId) return false;
    if (activeListId && task.listId !== activeListId) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    // Category filter
    switch (filter) {
      case 'dueToday': {
        if (!task.dueDate) return false;
        const d = new Date(task.dueDate);
        const today = new Date();
        return d.toDateString() === today.toDateString();
      }
      case 'overdue':
        return (
          Boolean(task.dueDate) &&
          task.status !== 'completed' &&
          new Date(task.dueDate!).getTime() < now
        );
      case 'highPriority':
        return task.priority === 'high' || task.priority === 'urgent';
      case 'assignedToMe':
        return Boolean(currentUser && (task.assigneeId === currentUser.id || task.assigneeIds?.includes(currentUser.id)));
      default:
        return true;
    }
  });

  const viewTabs: Array<{ id: 'list' | 'board' | 'calendar' | 'table'; label: string; icon: any }> = [
    { id: 'list', label: 'Danh sách', icon: List },
    { id: 'board', label: 'Bảng', icon: Columns3 },
    { id: 'calendar', label: 'Lịch', icon: CalendarIcon },
    { id: 'table', label: 'Bảng tính', icon: TableIcon },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with clean & spacious layout */}
      <Header
        title={t.tasks.title}
        subtitle={`${filteredTasks.length} ${t.tasks.title.toLowerCase()}`}
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                navigation?.navigate('More', { screen: 'AiBrain' });
              }}
              style={[
                styles.headerActionBtn,
                {
                  backgroundColor: `${colors.primary}18`,
                  borderColor: `${colors.primary}50`,
                },
              ]}
            >
              <Sparkles size={18} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setShowGlobalSearch(true)}
              style={[styles.headerActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Search size={18} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setShowMoreMenu(true);
              }}
              style={[styles.headerActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <MoreVertical size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Segmented View Switcher: List vs Board vs Calendar vs Table */}
      <View style={styles.segmentedContainer}>
        <View style={[styles.segmentedWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {viewTabs.map((tab) => {
            const isActive = viewMode === tab.id;
            const TabIcon = tab.icon;

            return (
              <TouchableOpacity
                key={tab.id}
                activeOpacity={0.8}
                onPress={() => handleModeChange(tab.id)}
                style={[
                  styles.segmentBtn,
                  isActive && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
                ]}
              >
                <TabIcon
                  size={15}
                  color={isActive ? '#ffffff' : colors.textSecondary}
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color: isActive ? '#ffffff' : colors.textSecondary,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Space and Lists Filter Bar */}
      <SpaceFilterBar />

      {/* Active Space Indicator Banner */}
      {currentSpace && (
        <View
          style={[
            styles.activeSpaceBanner,
            {
              backgroundColor: `${currentSpace.themeColor || colors.primary}15`,
              borderColor: `${currentSpace.themeColor || colors.primary}35`,
            },
          ]}
        >
          <View style={styles.activeSpaceLeft}>
            <RenderSpaceIcon
              icon={currentSpace.emoji || 'Folder'}
              size={14}
              color={currentSpace.themeColor || colors.primary}
            />
            <Text
              numberOfLines={1}
              style={[styles.activeSpaceTitle, { color: colors.textPrimary }]}
            >
              {currentSpace.name}
              {currentList ? ` • ${currentList.name}` : ''}
            </Text>
            <View
              style={[
                styles.activeSpaceCountBadge,
                { backgroundColor: `${currentSpace.themeColor || colors.primary}25` },
              ]}
            >
              <Text
                style={[
                  styles.activeSpaceCountText,
                  { color: currentSpace.themeColor || colors.primary },
                ]}
              >
                {filteredTasks.length} việc
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              setActiveSpaceId(null);
              setActiveListId(null);
            }}
            style={styles.clearSpaceBtn}
          >
            <Text style={[styles.clearSpaceText, { color: colors.textMuted }]}>Tất cả</Text>
            <X size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Task Category Filter Bar (All, Due Today, Overdue, etc.) */}
      <TaskFilterBar />

      {/* Views rendering */}
      {viewMode === 'list' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: 110 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onPress={() => setSelectedTask(task)}
            />
          ))}

          {filteredTasks.length === 0 && (
            <View
              style={[
                styles.emptyWrap,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={[styles.emptyIconCircle, { backgroundColor: `${colors.primary}18` }]}>
                <ClipboardList size={32} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {filter === 'all' ? 'Chưa có công việc nào' : 'Không tìm thấy công việc'}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {filter === 'all'
                  ? 'Bắt đầu ngày mới bằng việc thêm công việc cần làm.'
                  : 'Hãy thử chọn tab bộ lọc khác hoặc tạo một công việc mới.'}
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowCreateModal(true)}
                style={[styles.emptyCreateBtn, { backgroundColor: colors.primary }]}
              >
                <Plus size={16} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.emptyCreateBtnText}>Tạo công việc ngay</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      ) : viewMode === 'calendar' ? (
        <CalendarAgendaView
          tasks={filteredTasks}
          onTaskPress={(task) => setSelectedTask(task)}
        />
      ) : viewMode === 'table' ? (
        <TaskTableView
          tasks={filteredTasks}
          onSelectTask={(task) => setSelectedTask(task)}
        />
      ) : (
        <KanbanView
          tasks={filteredTasks}
          onSelectTask={(task) => setSelectedTask(task)}
          onAddTask={() => setShowCreateModal(true)}
        />
      )}

      {/* Floating Action Button */}
      <FloatingActionButton onPress={() => setShowCreateModal(true)} />

      {/* Task Creation Modal */}
      <TaskCreateModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        task={selectedTask}
        visible={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />

      {/* More Options Sheet / Modal */}
      <Modal
        visible={showMoreMenu}
        animationType="fade"
        transparent
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowMoreMenu(false)}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.actionMenuCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.actionMenuHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.actionMenuTitle, { color: colors.textPrimary }]}>
                Tùy chọn công việc
              </Text>
              <TouchableOpacity onPress={() => setShowMoreMenu(false)} style={styles.closeBtn}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOpenTrash}
              style={[styles.actionMenuItem, { borderBottomColor: colors.border }]}
            >
              <View style={[styles.actionMenuIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                <Trash2 size={18} color={colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionMenuItemLabel, { color: colors.textPrimary }]}>
                  {t.tasks.trash}
                </Text>
                <Text style={[styles.actionMenuItemDesc, { color: colors.textMuted }]}>
                  Xem và khôi phục các công việc đã xóa gần đây
                </Text>
              </View>
              {deletedTasks.length > 0 && (
                <View style={[styles.menuBadge, { backgroundColor: colors.danger }]}>
                  <Text style={styles.menuBadgeText}>{deletedTasks.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowMoreMenu(false);
                setShowExportModal(true);
              }}
              style={[styles.actionMenuItem, { borderBottomColor: colors.border }]}
            >
              <View style={[styles.actionMenuIconWrap, { backgroundColor: `${colors.primary}15` }]}>
                <Download size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionMenuItemLabel, { color: colors.textPrimary }]}>
                  Xuất dữ liệu công việc
                </Text>
                <Text style={[styles.actionMenuItemDesc, { color: colors.textMuted }]}>
                  Tải danh sách công việc dưới định dạng CSV hoặc JSON
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowMoreMenu(false);
                onRefresh();
              }}
              style={styles.actionMenuItem}
            >
              <View style={[styles.actionMenuIconWrap, { backgroundColor: `${colors.primary}15` }]}>
                <RefreshCw size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionMenuItemLabel, { color: colors.textPrimary }]}>
                  Đồng bộ ngay
                </Text>
                <Text style={[styles.actionMenuItemDesc, { color: colors.textMuted }]}>
                  Cập nhật các thay đổi mới nhất từ máy chủ
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Trash Bin Modal */}
      <Modal visible={showTrashModal} animationType="slide" transparent onRequestClose={() => setShowTrashModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Trash2 size={20} color={colors.danger} />
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t.tasks.trash}</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {deletedTasks.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      emptyTrash();
                      Toast.show({ type: 'info', text1: 'Đã dọn sạch thùng rác' });
                    }}
                    style={[styles.emptyTrashBtn, { backgroundColor: colors.dangerSubtle }]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.danger }}>
                      {t.tasks.emptyTrash}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowTrashModal(false)} style={styles.closeBtn}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={{ paddingHorizontal: 16, paddingTop: 10 }} showsVerticalScrollIndicator={false}>
              {deletedTasks.length > 0 ? (
                deletedTasks.map((dTask) => (
                  <View
                    key={dTask.id}
                    style={[styles.trashRow, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={[styles.trashTaskTitle, { color: colors.textPrimary }]}>
                        {dTask.title}
                      </Text>
                      <Text style={[styles.trashDate, { color: colors.textMuted }]}>
                        {dTask.deletedAt ? `Đã xóa: ${new Date(dTask.deletedAt).toLocaleDateString('vi-VN')}` : 'Đã xóa'}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => {
                          try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          } catch {}
                          restoreTask(dTask.id);
                          Toast.show({ type: 'success', text1: 'Đã khôi phục công việc' });
                        }}
                        style={[styles.trashActionBtn, { backgroundColor: colors.primarySubtle }]}
                      >
                        <RotateCcw size={15} color={colors.primary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          try {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                          } catch {}
                          permanentDeleteTask(dTask.id);
                        }}
                        style={[styles.trashActionBtn, { backgroundColor: colors.dangerSubtle }]}
                      >
                        <Trash2 size={15} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.trashEmptyWrap}>
                  <Trash2 size={36} color={colors.textMuted} />
                  <Text style={[styles.trashEmptyText, { color: colors.textMuted }]}>{t.tasks.trashEmpty}</Text>
                </View>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Global Search Modal */}
      {showGlobalSearch && (
        <GlobalSearchModal
          visible={showGlobalSearch}
          onClose={() => setShowGlobalSearch(false)}
          navigation={navigation}
          onOpenTask={(task) => setSelectedTask(task)}
          onOpenCreateTask={() => setShowCreateModal(true)}
        />
      )}

      {/* Export Data Modal */}
      <ExportDataModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  segmentedWrap: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 10,
    gap: 5,
  },
  segmentBtnActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  emptyWrap: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginHorizontal: 4,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  emptyCreateBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  activeSpaceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  activeSpaceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  activeSpaceTitle: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  activeSpaceCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  activeSpaceCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  clearSpaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 8,
  },
  clearSpaceText: {
    fontSize: 11,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  actionMenuCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingBottom: 32,
  },
  actionMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionMenuTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  actionMenuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMenuItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionMenuItemDesc: {
    fontSize: 12,
  },
  menuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  menuBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '80%',
    paddingBottom: 24,
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
  emptyTrashBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  closeBtn: {
    padding: 4,
  },
  trashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  trashTaskTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  trashDate: {
    fontSize: 11,
    marginTop: 2,
  },
  trashActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashEmptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  trashEmptyText: {
    fontSize: 13,
  },
});
