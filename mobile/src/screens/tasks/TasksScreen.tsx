import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { List, Columns3, Calendar as CalendarIcon, Plus, Search, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
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
import { TaskDetailSheet } from '../../components/tasks/TaskDetailSheet';
import { TaskCreateModal } from '../../components/tasks/TaskCreateModal';
import { FloatingActionButton } from '../../components/common/FloatingActionButton';
import Toast from 'react-native-toast-message';
import { SkeletonCard } from '../../components/common/SkeletonLoader';

export const TasksScreen: React.FC = () => {
  const colors = useUiStore((s) => s.getColors());
  const tasks = useTaskStore((s) => s.tasks);
  const filter = useTaskStore((s) => s.filter);
  const searchQuery = useTaskStore((s) => s.searchQuery);
  const setSearchQuery = useTaskStore((s) => s.setSearchQuery);
  const fetchTasks = useTaskStore((s) => s.fetchTasksFromSupabase);
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

  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  const handleModeChange = (mode: 'list' | 'board' | 'calendar') => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setViewMode(mode);
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
              onPress={() => setShowSearch(!showSearch)}
              style={[styles.modeBtn, { backgroundColor: colors.surface }]}
            >
              <Search size={18} color={showSearch ? colors.primary : colors.textSecondary} />
            </TouchableOpacity>

            {/* View Switcher: List vs Board vs Calendar */}
            <View style={[styles.segmentedWrap, { backgroundColor: colors.surface }]}>
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
            </View>
          </View>
        }
      />

      {/* Search Input (Collapsible) */}
      {showSearch && (
        <View style={styles.searchBar}>
          <Input
            placeholder={t.common.search}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            rightIcon={
              searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : undefined
            }
          />
        </View>
      )}

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
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setActiveSpaceId(null);
              setActiveListId(null);
            }}
            style={styles.clearSpaceBtn}
          >
            <Text style={[styles.clearSpaceText, { color: colors.textMuted }]}>
              Xem tất cả
            </Text>
            <X size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Pills Bar */}
      <TaskFilterBar />

      {/* Main View: List, Board or Calendar */}
      {viewMode === 'calendar' ? (
        <CalendarAgendaView
          tasks={filteredTasks}
          onTaskPress={(task) => setSelectedTask(task)}
        />
      ) : viewMode === 'list' ? (
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
          {refreshing ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={() => setSelectedTask(task)}
              />
            ))
          ) : (
            <View
              style={[
                styles.emptyWrap,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {t.tasks.noTasks}
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
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
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedWrap: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 2,
  },
  segmentBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
});
