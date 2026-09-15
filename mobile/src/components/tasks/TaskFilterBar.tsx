import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore, TaskFilterType } from '../../store/taskStore';
import { useTranslation } from '../../locales';

export const TaskFilterBar: React.FC = () => {
  const colors = useUiStore((s) => s.getColors());
  const filter = useTaskStore((s) => s.filter);
  const setFilter = useTaskStore((s) => s.setFilter);
  const tasks = useTaskStore((s) => s.tasks);
  const { t } = useTranslation();

  const handleSelect = (item: TaskFilterType) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setFilter(item);
  };

  const getCount = (key: TaskFilterType) => {
    const now = Date.now();
    switch (key) {
      case 'all':
        return tasks.length;
      case 'dueToday':
        return tasks.filter((t) => {
          if (!t.dueDate) return false;
          const d = new Date(t.dueDate);
          const today = new Date();
          return d.toDateString() === today.toDateString();
        }).length;
      case 'overdue':
        return tasks.filter(
          (t) => t.dueDate && t.status !== 'completed' && new Date(t.dueDate).getTime() < now
        ).length;
      case 'highPriority':
        return tasks.filter((t) => t.priority === 'high' || t.priority === 'urgent').length;
      case 'assignedToMe':
        return tasks.length; // placeholder
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

          return (
            <TouchableOpacity
              key={f.key}
              activeOpacity={0.7}
              onPress={() => handleSelect(f.key)}
              style={[
                styles.pill,
                {
                  backgroundColor: isActive ? colors.primary : colors.surface,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  {
                    color: isActive ? '#ffffff' : colors.textSecondary,
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
                        : colors.surfaceHover,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      { color: isActive ? '#ffffff' : colors.textMuted },
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
    paddingVertical: 10,
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
