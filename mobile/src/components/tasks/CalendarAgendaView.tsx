import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Task } from '../../types';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { Avatar } from '../common/Avatar';

interface CalendarAgendaViewProps {
  tasks: Task[];
  onTaskPress: (task: Task) => void;
}

interface DateGroup {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
}

export const CalendarAgendaView: React.FC<CalendarAgendaViewProps> = ({
  tasks,
  onTaskPress,
}) => {
  const colors = useUiStore((s) => s.getColors());
  const toggleTaskStatus = useTaskStore((s) => s.toggleTaskStatus);

  const handleToggle = (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    toggleTaskStatus(id);
  };

  // Grouping logic
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 86400000;
  const endOfTomorrow = endOfToday + 86400000;
  const endOfWeek = startOfToday + 7 * 86400000;

  const overdue: Task[] = [];
  const today: Task[] = [];
  const tomorrow: Task[] = [];
  const thisWeek: Task[] = [];
  const upcoming: Task[] = [];
  const noDueDate: Task[] = [];

  tasks.forEach((t) => {
    if (!t.dueDate) {
      noDueDate.push(t);
      return;
    }

    const taskTime = new Date(t.dueDate).getTime();
    if (t.status !== 'completed' && taskTime < startOfToday) {
      overdue.push(t);
    } else if (taskTime >= startOfToday && taskTime < endOfToday) {
      today.push(t);
    } else if (taskTime >= endOfToday && taskTime < endOfTomorrow) {
      tomorrow.push(t);
    } else if (taskTime >= endOfTomorrow && taskTime < endOfWeek) {
      thisWeek.push(t);
    } else {
      upcoming.push(t);
    }
  });

  const groups: DateGroup[] = [
    { id: 'overdue', title: 'Quá hạn', color: colors.danger, tasks: overdue },
    { id: 'today', title: 'Hôm nay', color: colors.primary, tasks: today },
    { id: 'tomorrow', title: 'Ngày mai', color: '#f59e0b', tasks: tomorrow },
    { id: 'thisWeek', title: 'Trong tuần này', color: '#0ea5e9', tasks: thisWeek },
    { id: 'upcoming', title: 'Sắp tới', color: '#8b5cf6', tasks: upcoming },
    { id: 'noDate', title: 'Chưa có ngày hạn', color: colors.textMuted, tasks: noDueDate },
  ].filter((g) => g.tasks.length > 0);

  if (groups.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <CalendarIcon size={44} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Không có công việc nào trong lịch
        </Text>
      </View>
    );
  }

  const formatTaskDate = (dueDate?: string) => {
    if (!dueDate) return '';
    const d = new Date(dueDate);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} · ${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {groups.map((group) => (
        <View key={group.id} style={styles.groupSection}>
          {/* Group Header */}
          <View style={styles.groupHeader}>
            <View style={[styles.groupIndicator, { backgroundColor: group.color }]} />
            <Text style={[styles.groupTitle, { color: colors.textPrimary }]}>
              {group.title}
            </Text>
            <View style={[styles.badge, { backgroundColor: `${group.color}22` }]}>
              <Text style={[styles.badgeText, { color: group.color }]}>
                {group.tasks.length}
              </Text>
            </View>
          </View>

          {/* Group Tasks */}
          <View style={styles.tasksList}>
            {group.tasks.map((task) => {
              const isCompleted = task.status === 'completed';

              return (
                <TouchableOpacity
                  key={task.id}
                  activeOpacity={0.7}
                  onPress={() => onTaskPress(task)}
                  style={[
                    styles.taskRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {/* Status checkbox */}
                  <TouchableOpacity
                    onPress={() => handleToggle(task.id)}
                    style={styles.checkbox}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={20} color={colors.success} />
                    ) : (
                      <Circle size={20} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>

                  {/* Task Content */}
                  <View style={styles.contentCol}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.taskTitle,
                        {
                          color: isCompleted
                            ? colors.textMuted
                            : colors.textPrimary,
                          textDecorationLine: isCompleted
                            ? 'line-through'
                            : 'none',
                        },
                      ]}
                    >
                      {task.title}
                    </Text>

                    {task.dueDate && (
                      <View style={styles.dateRow}>
                        <Clock size={11} color={colors.textMuted} />
                        <Text style={[styles.dateText, { color: colors.textMuted }]}>
                          {formatTaskDate(task.dueDate)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Priority / Assignee */}
                  {task.priority === 'urgent' && (
                    <View style={[styles.priorityPill, { backgroundColor: `${colors.danger}20` }]}>
                      <Text style={{ color: colors.danger, fontSize: 10, fontWeight: '700' }}>
                        KHẨN CẤP
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  groupSection: {
    gap: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  groupIndicator: {
    width: 4,
    height: 16,
    borderRadius: 2,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tasksList: {
    gap: 8,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  checkbox: {
    padding: 2,
  },
  contentCol: {
    flex: 1,
    gap: 4,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
  },
  priorityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
