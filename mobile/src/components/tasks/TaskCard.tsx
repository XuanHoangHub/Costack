import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Check,
  Calendar,
  MessageSquare,
  CheckSquare,
  Clock,
  Flame,
} from 'lucide-react-native';
import { Task } from '../../types';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { useMemberStore } from '../../store/memberStore';

interface TaskCardProps {
  task: Task;
  onPress: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onPress }) => {
  const colors = useUiStore((s) => s.getColors());
  const toggleTaskStatus = useTaskStore((s) => s.toggleTaskStatus);
  const members = useMemberStore((s) => s.members);

  const assignedMember = members.find((m) => m.id === task.assigneeId);
  const isCompleted = task.status === 'completed';
  const isOverdue =
    task.dueDate && !isCompleted && new Date(task.dueDate).getTime() < Date.now();

  const handleToggleCheck = () => {
    try {
      Haptics.notificationAsync(
        isCompleted
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success
      );
    } catch {}
    toggleTaskStatus(task.id);
  };

  const getPriorityInfo = () => {
    switch (task.priority) {
      case 'urgent':
        return { color: colors.priorityUrgent, bg: colors.dangerSubtle, label: 'Khẩn cấp' };
      case 'high':
        return { color: colors.priorityHigh, bg: colors.warningSubtle, label: 'Cao' };
      case 'medium':
        return { color: colors.priorityMedium, bg: colors.primarySubtle, label: 'Trung bình' };
      default:
        return { color: colors.priorityLow, bg: 'rgba(255,255,255,0.05)', label: 'Thấp' };
    }
  };

  const getStatusInfo = () => {
    switch (task.status) {
      case 'completed':
        return { color: colors.completed, bg: colors.successSubtle, label: 'Hoàn thành' };
      case 'review':
        return { color: colors.review, bg: colors.warningSubtle, label: 'Đang duyệt' };
      case 'inprogress':
        return { color: colors.inprogress, bg: colors.infoSubtle, label: 'Đang làm' };
      default:
        return { color: colors.todo, bg: 'rgba(255,255,255,0.05)', label: 'Cần làm' };
    }
  };

  const priorityInfo = getPriorityInfo();
  const statusInfo = getStatusInfo();

  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const progressPercent =
    totalSubtasks > 0
      ? Math.round((completedSubtasks / totalSubtasks) * 100)
      : isCompleted
      ? 100
      : task.progress || 0;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isCompleted
            ? colors.borderSubtle
            : isOverdue
            ? `${colors.danger}40`
            : colors.cardBorder,
        },
      ]}
    >
      <View style={styles.headerRow}>
        {/* Custom Animated-style Checkbox */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleToggleCheck}
          style={[
            styles.checkbox,
            {
              borderColor: isCompleted ? colors.completed : 'rgba(255,255,255,0.2)',
              backgroundColor: isCompleted ? colors.completed : colors.surfaceSubtle,
            },
          ]}
        >
          {isCompleted && <Check size={14} color="#ffffff" strokeWidth={3} />}
        </TouchableOpacity>

        {/* Title & Priority Row */}
        <View style={styles.titleWrap}>
          <Text
            numberOfLines={2}
            style={[
              styles.title,
              {
                color: isCompleted ? colors.textMuted : colors.textPrimary,
                textDecorationLine: isCompleted ? 'line-through' : 'none',
              },
            ]}
          >
            {task.title}
          </Text>
        </View>

        {/* Urgent Flame Icon if Urgent */}
        {task.priority === 'urgent' && !isCompleted && (
          <Flame size={16} color={colors.priorityUrgent} />
        )}
      </View>

      {/* Description Snippet */}
      {task.description ? (
        <Text
          numberOfLines={2}
          style={[styles.description, { color: colors.textSecondary }]}
        >
          {task.description}
        </Text>
      ) : null}

      {/* Modern Badges Row */}
      <View style={styles.badgeRow}>
        {/* Status Pill */}
        <View
          style={[
            styles.modernPill,
            {
              backgroundColor: statusInfo.bg,
              borderColor: `${statusInfo.color}35`,
            },
          ]}
        >
          <View style={[styles.pillDot, { backgroundColor: statusInfo.color }]} />
          <Text style={[styles.pillText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>

        {/* Priority Pill */}
        <View
          style={[
            styles.modernPill,
            {
              backgroundColor: priorityInfo.bg,
              borderColor: `${priorityInfo.color}35`,
            },
          ]}
        >
          <Text style={[styles.pillText, { color: priorityInfo.color }]}>
            {priorityInfo.label}
          </Text>
        </View>

        {/* Due Date Indicator */}
        {task.dueDate && (
          <View
            style={[
              styles.modernPill,
              {
                backgroundColor: isOverdue ? colors.dangerSubtle : 'rgba(255,255,255,0.04)',
                borderColor: isOverdue ? `${colors.danger}40` : colors.border,
              },
            ]}
          >
            <Calendar
              size={12}
              color={isOverdue ? colors.danger : colors.textMuted}
            />
            <Text
              style={[
                styles.pillText,
                { color: isOverdue ? colors.danger : colors.textMuted },
              ]}
            >
              {new Date(task.dueDate).toLocaleDateString('vi-VN', {
                month: 'numeric',
                day: 'numeric',
              })}
            </Text>
          </View>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <View
            style={[
              styles.modernPill,
              {
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                borderColor: 'rgba(99, 102, 241, 0.28)',
              },
            ]}
          >
            <Text style={[styles.pillText, { color: '#a5b4fc' }]}>
              #{task.tags[0]}
            </Text>
          </View>
        )}

        {/* Subtask, Comments & Assignee on right */}
        <View style={styles.rightStats}>
          {totalSubtasks > 0 && (
            <View style={styles.iconStat}>
              <CheckSquare size={13} color={colors.textMuted} />
              <Text style={[styles.iconStatText, { color: colors.textMuted }]}>
                {completedSubtasks}/{totalSubtasks}
              </Text>
            </View>
          )}

          {task.commentsCount > 0 && (
            <View style={styles.iconStat}>
              <MessageSquare size={13} color={colors.textMuted} />
              <Text style={[styles.iconStatText, { color: colors.textMuted }]}>
                {task.commentsCount}
              </Text>
            </View>
          )}

          {assignedMember && (
            <View style={styles.cardAvatar}>
              {assignedMember.avatar ? (
                <Image source={{ uri: assignedMember.avatar }} style={styles.cardAvatarImg} />
              ) : (
                <View style={[styles.cardAvatarFallback, { backgroundColor: colors.primary }]}>
                  <Text style={styles.cardAvatarText}>
                    {assignedMember.name.charAt(0)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Progress Bar Line at bottom of card if subtasks exist */}
      {totalSubtasks > 0 && (
        <View style={styles.progressBarWrap}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: isCompleted ? colors.completed : colors.primary,
              },
            ]}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    marginLeft: 36,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
    marginLeft: 36,
  },
  modernPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  pillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rightStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 'auto',
  },
  iconStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconStatText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressBarWrap: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 1.5,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  cardAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardAvatarImg: {
    width: '100%',
    height: '100%',
  },
  cardAvatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
});
