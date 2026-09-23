import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { useSpaceStore } from '../../store/spaceStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useTranslation } from '../../locales';
import { Task } from '../../types';
import { Header } from '../../components/common/Header';
import { TaskDetailSheet } from '../../components/tasks/TaskDetailSheet';
import { TaskCreateModal } from '../../components/tasks/TaskCreateModal';
import { Avatar } from '../../components/common/Avatar';
import { Badge } from '../../components/common/Badge';

interface CalendarScreenProps {
  navigation: any;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const CalendarScreen: React.FC<CalendarScreenProps> = ({ navigation }) => {
  const colors = useUiStore((s) => s.getColors());
  const tasks = useTaskStore((s) => s.tasks);
  const fetchTasks = useTaskStore((s) => s.fetchTasksFromSupabase);
  const toggleTaskStatus = useTaskStore((s) => s.toggleTaskStatus);
  const spaces = useSpaceStore((s) => s.spaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { t } = useTranslation();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('all');

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await fetchTasks();
    setRefreshing(false);
  };

  const currentSpaces = spaces.filter((s) => !activeWorkspaceId || s.workspaceId === activeWorkspaceId);

  // Filter tasks by workspace & space
  const workspaceTasks = useMemo(() => {
    let list = tasks.filter((t) => !activeWorkspaceId || t.workspaceId === activeWorkspaceId);
    if (selectedSpaceId !== 'all') {
      list = list.filter((t) => t.spaceId === selectedSpaceId);
    }
    return list;
  }, [tasks, activeWorkspaceId, selectedSpaceId]);

  // Tasks mapped by date string YYYY-MM-DD
  const tasksByDateMap = useMemo(() => {
    const map: Record<string, Task[]> = {};
    workspaceTasks.forEach((t) => {
      if (!t.dueDate) return;
      const d = new Date(t.dueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [workspaceTasks]);

  // Month navigation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Generate Calendar Days (Monday-based)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Day of week: 0 (Sun) -> 6, 1 (Mon) -> 0
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      dateKey: string;
      tasks: Task[];
    }> = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        date: d,
        isCurrentMonth: false,
        dateKey: key,
        tasks: tasksByDateMap[key] || [],
      });
    }

    // Current month days
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(year, month, i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        date: d,
        isCurrentMonth: true,
        dateKey: key,
        tasks: tasksByDateMap[key] || [],
      });
    }

    // Next month padding days to complete grid (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        date: d,
        isCurrentMonth: false,
        dateKey: key,
        tasks: tasksByDateMap[key] || [],
      });
    }

    return days;
  }, [year, month, tasksByDateMap]);

  // Selected date key
  const selectedDateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  const selectedDayTasks = tasksByDateMap[selectedDateKey] || [];

  const isToday = (d: Date) => {
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  const isSelected = (d: Date) => {
    return d.toDateString() === selectedDate.toDateString();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={t.calendar.title}
        subtitle={t.calendar.subtitle}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={handleGoToday}
            style={[styles.todayBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.todayText, { color: colors.primary }]}>{t.calendar.today}</Text>
          </TouchableOpacity>
        }
      />

      {/* Month Navigator Header */}
      <View style={[styles.monthHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.monthTitleRow}>
          <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
            Tháng {month + 1}, {year}
          </Text>
        </View>

        <View style={styles.navControls}>
          <TouchableOpacity
            onPress={handlePrevMonth}
            style={[styles.navBtn, { backgroundColor: colors.surfaceHover }]}
          >
            <ChevronLeft size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNextMonth}
            style={[styles.navBtn, { backgroundColor: colors.surfaceHover }]}
          >
            <ChevronRight size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekday Names Row */}
      <View style={styles.weekdaysRow}>
        {WEEKDAYS.map((w, idx) => (
          <Text key={idx} style={[styles.weekdayLabel, { color: colors.textMuted }]}>
            {w}
          </Text>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Month Grid */}
        <View style={[styles.calendarGrid, { borderColor: colors.border }]}>
          {calendarDays.map((item, idx) => {
            const daySelected = isSelected(item.date);
            const dayToday = isToday(item.date);
            const hasTasks = item.tasks.length > 0;
            const completedCount = item.tasks.filter((t) => t.status === 'completed').length;
            const allCompleted = hasTasks && completedCount === item.tasks.length;

            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.7}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch {}
                  setSelectedDate(item.date);
                  if (!item.isCurrentMonth) {
                    setCurrentDate(new Date(item.date.getFullYear(), item.date.getMonth(), 1));
                  }
                }}
                style={[
                  styles.dayCell,
                  daySelected && [styles.selectedCell, { backgroundColor: colors.primarySubtle, borderColor: colors.primary }],
                ]}
              >
                <View
                  style={[
                    styles.dayNumWrap,
                    dayToday && [styles.todayNumWrap, { backgroundColor: colors.primary }],
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      {
                        color: !item.isCurrentMonth
                          ? colors.textPlaceholder
                          : dayToday
                          ? '#ffffff'
                          : daySelected
                          ? colors.primaryText
                          : colors.textPrimary,
                        fontWeight: dayToday || daySelected ? '800' : '500',
                      },
                    ]}
                  >
                    {item.date.getDate()}
                  </Text>
                </View>

                {/* Task Indicators */}
                {hasTasks && (
                  <View style={styles.dotsRow}>
                    <View
                      style={[
                        styles.taskDot,
                        { backgroundColor: allCompleted ? colors.completed : colors.primary },
                      ]}
                    />
                    {item.tasks.length > 1 && (
                      <Text style={[styles.taskCountBadge, { color: colors.textMuted }]}>
                        {item.tasks.length}
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Day Agenda Header */}
        <View style={styles.dayTasksHeader}>
          <View>
            <Text style={[styles.dayTasksTitle, { color: colors.textPrimary }]}>
              {selectedDate.toLocaleDateString('vi-VN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
            <Text style={[styles.dayTasksSub, { color: colors.textMuted }]}>
              {selectedDayTasks.length} {t.tasks.title.toLowerCase()}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Plus size={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>Tạo việc</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Day Tasks List */}
        {selectedDayTasks.length > 0 ? (
          <View style={styles.tasksList}>
            {selectedDayTasks.map((task) => {
              const isDone = task.status === 'completed';
              return (
                <TouchableOpacity
                  key={task.id}
                  activeOpacity={0.7}
                  onPress={() => setSelectedTask(task)}
                  style={[
                    styles.taskRow,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {}
                      toggleTaskStatus(task.id);
                    }}
                    style={styles.checkboxBtn}
                  >
                    {isDone ? (
                      <CheckCircle2 size={20} color={colors.completed} />
                    ) : (
                      <Circle size={20} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>

                  <View style={styles.taskInfo}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.taskTitle,
                        { color: colors.textPrimary },
                        isDone && { textDecorationLine: 'line-through', color: colors.textMuted },
                      ]}
                    >
                      {task.title}
                    </Text>
                    {task.description ? (
                      <Text numberOfLines={1} style={[styles.taskDesc, { color: colors.textMuted }]}>
                        {task.description}
                      </Text>
                    ) : null}
                  </View>

                  <Badge
                    label={task.priority}
                    color={
                      task.priority === 'urgent'
                        ? colors.priorityUrgent
                        : task.priority === 'high'
                        ? colors.priorityHigh
                        : colors.primary
                    }
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={[styles.emptyDayBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
            <CalendarIcon size={32} color={colors.textMuted} />
            <Text style={[styles.emptyDayText, { color: colors.textMuted }]}>
              {t.calendar.noTasksOnDate}
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Task Detail Sheet */}
      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          visible={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Create Task Modal for this date */}
      {showCreateModal && (
        <TaskCreateModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  todayText: {
    fontSize: 12,
    fontWeight: '700',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  monthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdaysRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 16,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'transparent',
    paddingVertical: 4,
  },
  selectedCell: {
    borderRadius: 12,
    borderWidth: 1.5,
  },
  dayNumWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayNumWrap: {
    borderRadius: 14,
  },
  dayNum: {
    fontSize: 13,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  taskDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  taskCountBadge: {
    fontSize: 9,
    fontWeight: '700',
  },
  dayTasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayTasksTitle: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  dayTasksSub: {
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
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
    gap: 10,
  },
  checkboxBtn: {
    padding: 2,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyDayBox: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyDayText: {
    fontSize: 13,
  },
});
