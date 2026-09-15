import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import { Task, TaskStatus } from '../../types';
import { useUiStore } from '../../store/uiStore';
import { useTranslation } from '../../locales';
import { TaskCard } from './TaskCard';

interface KanbanViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onAddTask: (status?: TaskStatus) => void;
}

const COLUMN_WIDTH = Dimensions.get('window').width * 0.78;

export const KanbanView: React.FC<KanbanViewProps> = ({
  tasks,
  onSelectTask,
  onAddTask,
}) => {
  const colors = useUiStore((s) => s.getColors());
  const { t } = useTranslation();

  const columns: Array<{ status: TaskStatus; label: string; color: string }> = [
    { status: 'todo', label: t.tasks.statusTodo, color: colors.todo },
    { status: 'inprogress', label: t.tasks.statusInProgress, color: colors.inprogress },
    { status: 'review', label: t.tasks.statusReview, color: colors.review },
    { status: 'completed', label: t.tasks.statusCompleted, color: colors.completed },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status);

        return (
          <View
            key={col.status}
            style={[
              styles.column,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Column Header */}
            <View style={styles.columnHeader}>
              <View style={styles.titleRow}>
                <View style={[styles.statusDot, { backgroundColor: col.color }]} />
                <Text style={[styles.columnTitle, { color: colors.textPrimary }]}>
                  {col.label}
                </Text>
                <View
                  style={[
                    styles.countBadge,
                    { backgroundColor: `${col.color}25` },
                  ]}
                >
                  <Text style={[styles.countText, { color: col.color }]}>
                    {colTasks.length}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => onAddTask(col.status)}
                style={[styles.addBtn, { backgroundColor: colors.surfaceHover }]}
              >
                <Plus size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Column Tasks */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.columnTaskList}
            >
              {colTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onPress={() => onSelectTask(task)}
                />
              ))}

              {colTasks.length === 0 && (
                <View style={styles.emptyColumn}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    {t.tasks.noTasks}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  column: {
    width: COLUMN_WIDTH,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    maxHeight: '100%',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  columnTaskList: {
    paddingBottom: 20,
  },
  emptyColumn: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
