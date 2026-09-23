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
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { useSpaceStore } from '../../store/spaceStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from '../../locales';
import { Task, TaskStatus } from '../../types';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
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
  const setSearchQuery = useTaskStore((s) => s.setSearchQuery);
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
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

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
          task.dueDate &&
          task.status !== 'completed' &&
          new Date(task.dueDate).getTime() < now
        );
      case 'highPriority':
        return task.priority === 'high' || task.priority === 'urgent';
      case 'assignedToMe':
        return Boolean(currentUser && (task.assigneeId === currentUser.id || task.assigneeIds?.includes(currentUser.id)));
      default:
        return true;
    }
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Header
        title={t.tasks.title}
        subtitle={`${filteredTasks.length} ${t.tasks.title.toLowerCase()}`}
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowGlobalSearch(true)}
              style={[styles.modeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Search size={17} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenTrash}
              style={[styles.modeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Trash2 size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setShowExportModal(true);
              }}
              style={[styles.modeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Download size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* View Switcher: List vs Board vs Calendar */}
            <View style={[styles.segmentedWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => handleModeChange('list')}
                style={[
                  styles.segmentBtn,
                  viewMode === 'list' && { backgroundColor: colors.primary },
                ]}
              >
                <List
                  size={15}
                  color={viewMode === 'list' ? '#ffffff' : colors.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleModeChange('board')}
                style={[
                  styles.segmentBtn,
                  viewMode === 'board' && { backgroundColor: colors.primary },
                ]}
              >
                <Columns3
                  size={15}
                  color={viewMode === 'board' ? '#ffffff' : colors.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleModeChange('calendar')}
                style={[
                  styles.segmentBtn,
                  viewMode === 'calendar' && { backgroundColor: colors.primary },
                ]}
              >
                <CalendarIcon
                  size={15}
                  color={viewMode === 'calendar' ? '#ffffff' : colors.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleModeChange('table')}
                style={[
                  styles.segmentBtn,
                  viewMode === 'table' && { backgroundColor: colors.primary },
                ]}
              >
                <TableIcon
                  size={15}
                  color={viewMode === 'table' ? '#ffffff' : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
        }
      />

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
          contentContainerStyle={styles.listContent}
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
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t.tasks.noTasks}
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
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
  modeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedWrap: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  segmentBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyWrap: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
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
