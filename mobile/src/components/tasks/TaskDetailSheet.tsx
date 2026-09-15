import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import {
  X,
  Check,
  Calendar,
  Trash2,
  Plus,
  MessageSquare,
  Clock,
  CheckSquare,
  Send,
  User,
  Tag,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Task, Priority, TaskStatus } from '../../types';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { useSpaceStore } from '../../store/spaceStore';
import { useMemberStore } from '../../store/memberStore';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from '../../locales';

interface TaskDetailSheetProps {
  task: Task | null;
  visible: boolean;
  onClose: () => void;
}

const PRESET_TAGS = ['Design', 'Frontend', 'Backend', 'Bug', 'Feature', 'Urgent', 'Marketing'];

export const TaskDetailSheet: React.FC<TaskDetailSheetProps> = ({
  task,
  visible,
  onClose,
}) => {
  const colors = useUiStore((s) => s.getColors());
  const currentUser = useAuthStore((s) => s.currentUser);
  const updateTask = useTaskStore((s) => s.updateTask);
  const softDeleteTask = useTaskStore((s) => s.softDeleteTask);
  const toggleSubtask = useTaskStore((s) => s.toggleSubtask);
  const spaces = useSpaceStore((s) => s.spaces);
  const members = useMemberStore((s) => s.members);
  const { t } = useTranslation();

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  if (!task) return null;

  const taskSpace = spaces.find((s) => s.id === task.spaceId);
  const assignedMember = members.find((m) => m.id === task.assigneeId);

  const handleStatusChange = async (status: TaskStatus) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await updateTask({
      ...task,
      status,
      completedAt: status === 'completed' ? new Date().toISOString() : undefined,
    });
  };

  const handlePriorityChange = async (priority: Priority) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await updateTask({ ...task, priority });
  };

  const handleAssigneeChange = async (memberId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await updateTask({
      ...task,
      assigneeId: memberId || undefined,
      assigneeIds: memberId ? [memberId] : [],
    });
  };

  const handleToggleTag = async (tag: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const currentTags = task.tags || [];
    const updatedTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    await updateTask({
      ...task,
      tags: updatedTags,
    });
  };

  const handleQuickDueDate = async (type: 'today' | 'tomorrow' | '3days' | '1week' | 'clear') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const now = new Date();
    let dueDate: string | undefined;
    if (type === 'today') {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      dueDate = d.toISOString();
    } else if (type === 'tomorrow') {
      const d = new Date(now.getTime() + 86400000);
      d.setHours(18, 0, 0, 0);
      dueDate = d.toISOString();
    } else if (type === '3days') {
      const d = new Date(now.getTime() + 3 * 86400000);
      d.setHours(18, 0, 0, 0);
      dueDate = d.toISOString();
    } else if (type === '1week') {
      const d = new Date(now.getTime() + 7 * 86400000);
      d.setHours(18, 0, 0, 0);
      dueDate = d.toISOString();
    } else if (type === 'clear') {
      dueDate = undefined;
    }
    await updateTask({
      ...task,
      dueDate,
    });
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    const newSt = {
      id: `st-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    const updatedSubtasks = [...(task.subtasks || []), newSt];
    await updateTask({ ...task, subtasks: updatedSubtasks });
    setNewSubtaskTitle('');
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim()) return;
    const newC = {
      id: `c-${Date.now()}`,
      senderName: currentUser?.name || 'Bạn',
      senderAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      content: newCommentText.trim(),
      timestamp: new Date().toISOString(),
    };
    const updatedComments = [...(task.comments || []), newC];
    await updateTask({
      ...task,
      comments: updatedComments,
      commentsCount: updatedComments.length,
    });
    setNewCommentText('');
  };

  const handleDelete = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    await softDeleteTask(task.id);
    onClose();
  };

  const statuses: Array<{ key: TaskStatus; label: string; color: string }> = [
    { key: 'todo', label: t.tasks.statusTodo, color: colors.todo },
    { key: 'inprogress', label: t.tasks.statusInProgress, color: colors.inprogress },
    { key: 'review', label: t.tasks.statusReview, color: colors.review },
    { key: 'completed', label: t.tasks.statusCompleted, color: colors.completed },
  ];

  const priorities: Array<{ key: Priority; label: string; color: string }> = [
    { key: 'low', label: t.tasks.priorityLow, color: colors.priorityLow },
    { key: 'medium', label: t.tasks.priorityMedium, color: colors.priorityMedium },
    { key: 'high', label: t.tasks.priorityHigh, color: colors.priorityHigh },
    { key: 'urgent', label: t.tasks.priorityUrgent, color: colors.priorityUrgent },
  ];

  const totalSubtasks = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const formatDueDateLabel = () => {
    if (!task.dueDate) return t.tasks.noDueDate;
    const date = new Date(task.dueDate);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow =
      new Date(now.getTime() + 86400000).toDateString() === date.toDateString();

    if (isToday) return `Hôm nay, ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    if (isTomorrow) return `Ngày mai, ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    return `${date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* iOS Grabber Handle */}
          <View style={styles.grabberWrap}>
            <View style={styles.grabber} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
              <Trash2 size={18} color={colors.danger} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {taskSpace && (
                <View style={[styles.spaceBadge, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 11 }}>{taskSpace.emoji || '📦'}</Text>
                  <Text style={[styles.spaceBadgeText, { color: colors.textSecondary }]}>
                    {taskSpace.name}
                  </Text>
                </View>
              )}
              <Text style={[styles.sheetTitle, { color: colors.textMuted }]}>
                {task.id.slice(0, 8)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.iconBtn, { backgroundColor: colors.surfaceHover }]}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Task Title */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {task.title}
            </Text>

            {/* Description */}
            {task.description ? (
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {task.description}
              </Text>
            ) : null}

            {/* Space & Due Date Indicator Pill */}
            <View style={styles.metaRow}>
              <View style={[styles.metaPill, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Calendar size={13} color={task.dueDate ? colors.primary : colors.textMuted} />
                <Text
                  style={[
                    styles.metaPillText,
                    { color: task.dueDate ? colors.textPrimary : colors.textMuted },
                  ]}
                >
                  {formatDueDateLabel()}
                </Text>
              </View>

              {assignedMember && (
                <View style={[styles.metaPill, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  {assignedMember.avatar ? (
                    <Image source={{ uri: assignedMember.avatar }} style={styles.memberAvatarSmall} />
                  ) : (
                    <User size={12} color={colors.primary} />
                  )}
                  <Text style={[styles.metaPillText, { color: colors.textPrimary }]}>
                    {assignedMember.name}
                  </Text>
                </View>
              )}
            </View>

            {/* Quick Due Date buttons */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t.tasks.dueDate}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              {[
                { key: 'today', label: 'Hôm nay' },
                { key: 'tomorrow', label: 'Ngày mai' },
                { key: '3days', label: '+3 ngày' },
                { key: '1week', label: '+1 tuần' },
                { key: 'clear', label: 'Xóa hạn' },
              ].map((d) => (
                <TouchableOpacity
                  key={d.key}
                  onPress={() => handleQuickDueDate(d.key as any)}
                  style={[
                    styles.quickDueChip,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.quickDueText, { color: colors.textSecondary }]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Assignee Selector */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t.tasks.assignee}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              <TouchableOpacity
                onPress={() => handleAssigneeChange('')}
                style={[
                  styles.assigneeOptionChip,
                  {
                    backgroundColor: !task.assigneeId ? colors.primarySubtle : colors.surfaceSubtle,
                    borderColor: !task.assigneeId ? colors.primary : colors.border,
                  },
                ]}
              >
                <View style={[styles.avatarMiniPlaceholder, { backgroundColor: colors.surfaceHover }]}>
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>-</Text>
                </View>
                <Text
                  style={[
                    styles.assigneeOptionText,
                    { color: !task.assigneeId ? colors.primaryText : colors.textSecondary },
                  ]}
                >
                  {t.tasks.unassigned}
                </Text>
              </TouchableOpacity>

              {members.map((m) => {
                const isSelected = task.assigneeId === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => handleAssigneeChange(m.id)}
                    style={[
                      styles.assigneeOptionChip,
                      {
                        backgroundColor: isSelected ? colors.primarySubtle : colors.surfaceSubtle,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {m.avatar ? (
                      <Image source={{ uri: m.avatar }} style={styles.avatarMiniImg} />
                    ) : (
                      <View style={[styles.avatarMiniPlaceholder, { backgroundColor: colors.primary }]}>
                        <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>
                          {m.name.charAt(0)}
                        </Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.assigneeOptionText,
                        { color: isSelected ? colors.primaryText : colors.textSecondary },
                      ]}
                    >
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Status Grid */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t.tasks.status}
            </Text>
            <View style={styles.chipRow}>
              {statuses.map((s) => {
                const active = task.status === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => handleStatusChange(s.key)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active
                          ? `${s.color}25`
                          : colors.surfaceSubtle,
                        borderColor: active ? s.color : colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.dot, { backgroundColor: s.color }]} />
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? s.color : colors.textSecondary },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Priority Grid */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t.tasks.priority}
            </Text>
            <View style={styles.chipRow}>
              {priorities.map((p) => {
                const active = task.priority === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    onPress={() => handlePriorityChange(p.key)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? `${p.color}25` : colors.surfaceSubtle,
                        borderColor: active ? p.color : colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.dot, { backgroundColor: p.color }]} />
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? p.color : colors.textSecondary },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tags Section */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t.tasks.tags}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              {PRESET_TAGS.map((tag) => {
                const isSelected = (task.tags || []).includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => handleToggleTag(tag)}
                    style={[
                      styles.tagChip,
                      {
                        backgroundColor: isSelected ? '#6366f125' : colors.surfaceSubtle,
                        borderColor: isSelected ? '#6366f1' : colors.border,
                      },
                    ]}
                  >
                    {isSelected && <Check size={11} color="#6366f1" strokeWidth={3} />}
                    <Text
                      style={[
                        styles.tagChipText,
                        { color: isSelected ? '#a5b4fc' : colors.textSecondary },
                      ]}
                    >
                      #{tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Subtasks Checklist */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {t.tasks.subtasks}
              </Text>
              <Text style={[styles.countLabel, { color: colors.textMuted }]}>
                {completedSubtasks}/{totalSubtasks} ({progressPercent}%)
              </Text>
            </View>

            {/* Subtask progress bar */}
            {totalSubtasks > 0 && (
              <View style={styles.subtaskProgressTrack}>
                <View
                  style={[
                    styles.subtaskProgressFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
            )}

            {task.subtasks?.map((st) => (
              <TouchableOpacity
                key={st.id}
                onPress={() => toggleSubtask(task.id, st.id)}
                style={[
                  styles.subtaskItem,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: st.completed ? colors.completed : 'transparent',
                      borderColor: st.completed ? colors.completed : colors.border,
                    },
                  ]}
                >
                  {st.completed && <Check size={12} color="#ffffff" strokeWidth={3} />}
                </View>
                <Text
                  style={[
                    styles.subtaskText,
                    {
                      color: st.completed ? colors.textMuted : colors.textPrimary,
                      textDecorationLine: st.completed ? 'line-through' : 'none',
                    },
                  ]}
                >
                  {st.title}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Add Subtask Input */}
            <View style={styles.addSubtaskRow}>
              <TextInput
                placeholder={t.tasks.addSubtask}
                placeholderTextColor={colors.textPlaceholder}
                value={newSubtaskTitle}
                onChangeText={setNewSubtaskTitle}
                onSubmitEditing={handleAddSubtask}
                style={[
                  styles.subtaskInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  },
                ]}
              />
              <TouchableOpacity
                onPress={handleAddSubtask}
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
              >
                <Plus size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Comments Stream */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t.tasks.comments} ({task.comments?.length || 0})
            </Text>
            {task.comments?.map((c) => (
              <View
                key={c.id}
                style={[
                  styles.commentBox,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.commentHeader}>
                  <Text style={[styles.commentSender, { color: colors.textPrimary }]}>
                    {c.senderName}
                  </Text>
                  <Text style={[styles.commentTime, { color: colors.textMuted }]}>
                    {new Date(c.timestamp).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <Text style={[styles.commentContent, { color: colors.textSecondary }]}>
                  {c.content}
                </Text>
              </View>
            ))}

            {/* Add Comment Input */}
            <View style={styles.addCommentRow}>
              <TextInput
                placeholder={t.tasks.addComment}
                placeholderTextColor={colors.textPlaceholder}
                value={newCommentText}
                onChangeText={setNewCommentText}
                style={[
                  styles.commentInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  },
                ]}
              />
              <TouchableOpacity
                onPress={handleAddComment}
                disabled={!newCommentText.trim()}
                style={[
                  styles.sendCommentBtn,
                  {
                    backgroundColor: newCommentText.trim()
                      ? colors.primary
                      : colors.surfaceHover,
                  },
                ]}
              >
                <Send size={15} color={newCommentText.trim() ? '#ffffff' : colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxHeight: '92%',
    paddingBottom: 24,
  },
  grabberWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  body: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  countLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  subtaskProgressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 2,
    marginBottom: 12,
    marginTop: 6,
    overflow: 'hidden',
  },
  subtaskProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskText: {
    fontSize: 14,
    flex: 1,
  },
  addSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  subtaskInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentSender: {
    fontSize: 13,
    fontWeight: '700',
  },
  commentTime: {
    fontSize: 11,
  },
  commentContent: {
    fontSize: 13,
    lineHeight: 19,
  },
  addCommentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendCommentBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  spaceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  memberAvatarSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  quickDueChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  quickDueText: {
    fontSize: 12,
    fontWeight: '500',
  },
  assigneeOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    marginRight: 8,
  },
  avatarMiniPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniImg: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  assigneeOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    marginRight: 8,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
