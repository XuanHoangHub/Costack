import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Layers, Clock, AlertCircle, Flame, UserCheck } from 'lucide-react-native';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore, TaskFilterType } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useSpaceStore } from '../../store/spaceStore';
import { useTranslation } from '../../locales';

export const TaskFilterBar: React.FC = () => {
  const colors = useUiStore((s) => s.getColors());
  const filter = useTaskStore((s) => s.filter);
  const setFilter = useTaskStore((s) => s.setFilter);
  const tasks = useTaskStore((s) => s.tasks);
  const currentUser = useAuthStore((s) => s.currentUser);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);
  const activeListId = useSpaceStore((s) => s.activeListId);
  const spaces = useSpaceStore((s) => s.spaces);
  const { t } = useTranslation();

  const handleSelect = (item: TaskFilterType) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setFilter(item);
  };

  // Scope tasks to active workspace/space/list to keep count accurately aligned
  const workspaceSpaceIds = new Set(
    spaces.filter((s) => !activeWorkspaceId || s.workspaceId === activeWorkspaceId).map((s) => s.id)
  );

  const scopedTasks = tasks.filter((task) => {
    if (activeWorkspaceId) {
      if (task.workspaceId && task.workspaceId !== activeWorkspaceId) return false;
      if (!task.workspaceId && task.spaceId && !workspaceSpaceIds.has(task.spaceId)) return false;
    }
    if (activeSpaceId && task.spaceId !== activeSpaceId) return false;
    if (activeListId && task.listId !== activeListId) return false;
    return true;
  });

  const getCount = (key: TaskFilterType) => {
    const now = Date.now();
    switch (key) {
      case 'all':
        return scopedTasks.length;
      case 'dueToday':
        return scopedTasks.filter((t) => {
          if (!t.dueDate) return false;
          const d = new Date(t.dueDate);
          const today = new Date();
          return d.toDateString() === today.toDateString();
        }).length;
      case 'overdue':
        return scopedTasks.filter(
          (t) => t.dueDate && t.status !== 'completed' && new Date(t.dueDate).getTime() < now
        ).length;
      case 'highPriority':
        return scopedTasks.filter((t) => t.priority === 'high' || t.priority === 'urgent').length;
      case 'assignedToMe':
        return scopedTasks.filter(
          (t) => currentUser && (t.assigneeId === currentUser.id || t.assigneeIds?.includes(currentUser.id))
        ).length;
    }
  };

  const renderIcon = (key: TaskFilterType, isActive: boolean, count: number) => {
    const iconSize = 13;
    if (isActive) {
      const activeColor = '#ffffff';
      switch (key) {
        case 'all':
          return <Layers size={iconSize} color={activeColor} />;
        case 'dueToday':
          return <Clock size={iconSize} color={activeColor} />;
        case 'overdue':
          return <AlertCircle size={iconSize} color={activeColor} />;
        case 'highPriority':
          return <Flame size={iconSize} color={activeColor} />;
        case 'assignedToMe':
          return <UserCheck size={iconSize} color={activeColor} />;
      }
    }

    switch (key) {
      case 'all':
        return <Layers size={iconSize} color={colors.textSecondary} />;
      case 'dueToday':
        return <Clock size={iconSize} color={colors.primary} />;
      case 'overdue':
        return <AlertCircle size={iconSize} color={count > 0 ? colors.danger : colors.textSecondary} />;
      case 'highPriority':
        return <Flame size={iconSize} color={count > 0 ? '#f59e0b' : colors.textSecondary} />;
      case 'assignedToMe':
        return <UserCheck size={iconSize} color={colors.textSecondary} />;
    }
  };

  const filters: Array<{ key: TaskFilterType; label: string }> = [
    { key: 'all', label: t.tasks.allTasks },
    { key: 'dueToday', label: t.tasks.dueToday },
    { key: 'overdue', label: t.tasks.overdue },
    { key: 'highPriority', label: t.tasks.highPriority },
    { key: 'assignedToMe', label: t.tasks.assignedToMe },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((f) => {
          const isActive = filter === f.key;
          const count = getCount(f.key);
          const isOverdueAlert = f.key === 'overdue' && count > 0 && !isActive;

          return (
            <TouchableOpacity
              key={f.key}
              activeOpacity={0.75}
              onPress={() => handleSelect(f.key)}
              style={[
                styles.pill,
                {
                  backgroundColor: isActive
                    ? colors.primary
                    : isOverdueAlert
                    ? 'rgba(239, 68, 68, 0.08)'
                    : colors.surface,
                  borderColor: isActive
                    ? colors.primary
                    : isOverdueAlert
                    ? 'rgba(239, 68, 68, 0.35)'
                    : colors.border,
                },
              ]}
            >
              {renderIcon(f.key, isActive, count)}
              <Text
                style={[
                  styles.pillText,
                  {
                    color: isActive
                      ? '#ffffff'
                      : isOverdueAlert
                      ? colors.danger
                      : colors.textSecondary,
                    fontWeight: isActive ? '600' : '500',
                  },
                ]}
              >
                {f.label}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.countBadge,
                    {
                      backgroundColor: isActive
                        ? 'rgba(255, 255, 255, 0.25)'
                        : isOverdueAlert
                        ? 'rgba(239, 68, 68, 0.2)'
                        : colors.surfaceHover,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      {
                        color: isActive
                          ? '#ffffff'
                          : isOverdueAlert
                          ? colors.danger
                          : colors.textMuted,
                      },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  pillText: {
    fontSize: 13,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
