import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  CheckCircle2,
  Circle,
  Clock,
  User,
  Calendar,
  Layers,
  ArrowUpDown,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Task, Priority, TaskStatus } from '../../types';
import { useUiStore } from '../../store/uiStore';
import { useMemberStore } from '../../store/memberStore';
import { useTaskStore } from '../../store/taskStore';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';

interface TaskTableViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}

const COLUMN_WIDTHS = {
  status: 44,
  title: 220,
  priority: 100,
  stage: 110,
  assignee: 120,
  dueDate: 110,
  hours: 80,
  logged: 80,
};

const TOTAL_TABLE_WIDTH = Object.values(COLUMN_WIDTHS).reduce((a, b) => a + b, 0);

export const TaskTableView: React.FC<TaskTableViewProps> = ({
  tasks,
  onSelectTask,
}) => {
  const colors = useUiStore((s) => s.getColors());
  const members = useMemberStore((s) => s.members);
  const toggleTaskStatus = useTaskStore((s) => s.toggleTaskStatus);

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case 'urgent':
        return colors.danger;
      case 'high':
        return colors.warning;
      case 'medium':
        return colors.info;
      case 'low':
      default:
        return colors.textMuted;
    }
  };

  const getStatusLabel = (st: TaskStatus) => {
    switch (st) {
      case 'completed':
        return 'Hoàn thành';
      case 'inprogress':
        return 'Đang làm';
      case 'review':
        return 'Chờ duyệt';
      case 'todo':
      default:
        return 'Cần làm';
    }
  };

  const getStatusColor = (st: TaskStatus) => {
    switch (st) {
      case 'completed':
        return colors.success;
      case 'inprogress':
        return colors.inprogress;
      case 'review':
        return colors.info;
      case 'todo':
      default:
        return colors.textMuted;
    }
  };

  if (tasks.length === 0) {
    return (
      <View style={[styles.emptyWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Layers size={36} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          Không có công việc nào
        </Text>
        <Text style={[styles.emptySub, { color: colors.textMuted }]}>
          Chưa có công việc nào trong danh sách hoặc bộ lọc hiện tại.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingHorizontal: 16 }}>
      <View style={[styles.tableContainer, { width: TOTAL_TABLE_WIDTH, borderColor: colors.border }]}>
        {/* Table Header */}
        <View style={[styles.tableHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[styles.th, { width: COLUMN_WIDTHS.status }]}>
            <Text style={[styles.thText, { color: colors.textMuted }]}>#</Text>
          </View>
          <View style={[styles.th, { width: COLUMN_WIDTHS.title }]}>
            <Text style={[styles.thText, { color: colors.textMuted }]}>Tiêu đề công việc</Text>
          </View>
          <View style={[styles.th, { width: COLUMN_WIDTHS.priority }]}>
            <Text style={[styles.thText, { color: colors.textMuted }]}>Ưu tiên</Text>
          </View>
          <View style={[styles.th, { width: COLUMN_WIDTHS.stage }]}>
            <Text style={[styles.thText, { color: colors.textMuted }]}>Trạng thái</Text>
          </View>
          <View style={[styles.th, { width: COLUMN_WIDTHS.assignee }]}>
            <Text style={[styles.thText, { color: colors.textMuted }]}>Người nhận</Text>
          </View>
          <View style={[styles.th, { width: COLUMN_WIDTHS.dueDate }]}>
            <Text style={[styles.thText, { color: colors.textMuted }]}>Hạn chót</Text>
          </View>
          <View style={[styles.th, { width: COLUMN_WIDTHS.hours }]}>
            <Text style={[styles.thText, { color: colors.textMuted }]}>Ước tính</Text>
          </View>
          <View style={[styles.th, { width: COLUMN_WIDTHS.logged }]}>
            <Text style={[styles.thText, { color: colors.textMuted }]}>Đã làm</Text>
          </View>
        </View>

        {/* Table Rows */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {tasks.map((task, idx) => {
            const isCompleted = task.status === 'completed';
            const assignee = members.find((m) => m.id === task.assigneeId || (task.assigneeIds && task.assigneeIds.includes(m.id)));

            return (
              <TouchableOpacity
                key={task.id}
                activeOpacity={0.7}
                onPress={() => onSelectTask(task)}
                style={[
                  styles.tableRow,
                  {
                    backgroundColor: idx % 2 === 0 ? colors.background : colors.surfaceSubtle,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                {/* Status Checkbox */}
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    toggleTaskStatus(task.id);
                  }}
                  style={[styles.td, { width: COLUMN_WIDTHS.status, alignItems: 'center' }]}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={18} color={colors.success} />
                  ) : (
                    <Circle size={18} color={colors.textMuted} />
                  )}
                </TouchableOpacity>

                {/* Title */}
                <View style={[styles.td, { width: COLUMN_WIDTHS.title }]}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.taskTitle,
                      {
                        color: isCompleted ? colors.textMuted : colors.textPrimary,
                        textDecorationLine: isCompleted ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {task.title}
                  </Text>
                </View>

                {/* Priority */}
                <View style={[styles.td, { width: COLUMN_WIDTHS.priority }]}>
                  <Badge
                    label={task.priority.toUpperCase()}
                    color={getPriorityColor(task.priority)}
                  />
                </View>

                {/* Stage */}
                <View style={[styles.td, { width: COLUMN_WIDTHS.stage }]}>
                  <Badge
                    label={getStatusLabel(task.status)}
                    color={getStatusColor(task.status)}
                  />
                </View>

                {/* Assignee */}
                <View style={[styles.td, { width: COLUMN_WIDTHS.assignee, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                  {assignee ? (
                    <>
                      <Avatar name={assignee.name} url={assignee.avatar} size={22} />
                      <Text numberOfLines={1} style={[styles.assigneeName, { color: colors.textSecondary }]}>
                        {assignee.name}
                      </Text>
                    </>
                  ) : (
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>-</Text>
                  )}
                </View>

                {/* Due Date */}
                <View style={[styles.td, { width: COLUMN_WIDTHS.dueDate }]}>
                  <Text style={[styles.dueDateText, { color: colors.textMuted }]}>
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString('vi-VN', {
                          month: 'numeric',
                          day: 'numeric',
                        })
                      : '-'}
                  </Text>
                </View>

                {/* Hours Estimate */}
                <View style={[styles.td, { width: COLUMN_WIDTHS.hours }]}>
                  <Text style={[styles.hoursText, { color: colors.textSecondary }]}>
                    {task.hoursEstimate ? `${task.hoursEstimate}h` : '-'}
                  </Text>
                </View>

                {/* Hours Logged */}
                <View style={[styles.td, { width: COLUMN_WIDTHS.logged }]}>
                  <Text style={[styles.hoursText, { color: colors.primary }]}>
                    {task.hoursLogged ? `${task.hoursLogged}h` : '-'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tableContainer: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 40,
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  th: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  thText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 11,
  },
  td: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  assigneeName: {
    fontSize: 12,
    flex: 1,
  },
  dueDateText: {
    fontSize: 12,
  },
  hoursText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyWrap: {
    padding: 36,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
  },
});
