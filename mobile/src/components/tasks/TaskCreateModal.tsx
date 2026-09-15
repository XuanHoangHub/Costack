import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { X, Calendar, User, Tag, Check, Sparkles } from 'lucide-react-native';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { useSpaceStore } from '../../store/spaceStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useMemberStore } from '../../store/memberStore';
import { useTranslation } from '../../locales';
import { Priority, TaskStatus } from '../../types';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

interface TaskCreateModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRESET_TAGS = ['Design', 'Frontend', 'Backend', 'Bug', 'Feature', 'Urgent', 'Marketing'];

export const TaskCreateModal: React.FC<TaskCreateModalProps> = ({
  visible,
  onClose,
}) => {
  const colors = useUiStore((s) => s.getColors());
  const addTask = useTaskStore((s) => s.addTask);
  const spaces = useSpaceStore((s) => s.spaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);
  const members = useMemberStore((s) => s.members);
  const { t } = useTranslation();

  const currentSpaces = spaces.filter((s) => !activeWorkspaceId || s.workspaceId === activeWorkspaceId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(activeSpaceId || currentSpaces[0]?.id || '');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dueDateType, setDueDateType] = useState<'today' | 'tomorrow' | '3days' | '1week' | 'none'>('tomorrow');
  const [loading, setLoading] = useState(false);

  const calculateDueDate = () => {
    const now = new Date();
    switch (dueDateType) {
      case 'today': {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        return d.toISOString();
      }
      case 'tomorrow': {
        const d = new Date(now.getTime() + 86400000);
        d.setHours(18, 0, 0, 0);
        return d.toISOString();
      }
      case '3days': {
        const d = new Date(now.getTime() + 3 * 86400000);
        d.setHours(18, 0, 0, 0);
        return d.toISOString();
      }
      case '1week': {
        const d = new Date(now.getTime() + 7 * 86400000);
        d.setHours(18, 0, 0, 0);
        return d.toISOString();
      }
      case 'none':
      default:
        return undefined;
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const chosenSpace = currentSpaces.find((s) => s.id === selectedSpaceId);
      await addTask({
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        spaceId: selectedSpaceId || undefined,
        listId: chosenSpace?.lists?.[0]?.id || undefined,
        assigneeId: selectedAssigneeId || undefined,
        assigneeIds: selectedAssigneeId ? [selectedAssigneeId] : [],
        tags: selectedTags,
        dueDate: calculateDueDate(),
      });
      setTitle('');
      setDescription('');
      setSelectedTags([]);
      setSelectedAssigneeId('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const priorities: Array<{ key: Priority; label: string; color: string }> = [
    { key: 'low', label: t.tasks.priorityLow, color: colors.priorityLow },
    { key: 'medium', label: t.tasks.priorityMedium, color: colors.priorityMedium },
    { key: 'high', label: t.tasks.priorityHigh, color: colors.priorityHigh },
    { key: 'urgent', label: t.tasks.priorityUrgent, color: colors.priorityUrgent },
  ];

  const statuses: Array<{ key: TaskStatus; label: string }> = [
    { key: 'todo', label: t.tasks.statusTodo },
    { key: 'inprogress', label: t.tasks.statusInProgress },
    { key: 'review', label: t.tasks.statusReview },
    { key: 'completed', label: t.tasks.statusCompleted },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Grabber */}
          <View style={styles.grabberWrap}>
            <View style={styles.grabber} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color={colors.primary} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t.tasks.createTask}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: colors.surfaceHover }]}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Title Input */}
            <Input
              placeholder={t.tasks.taskTitlePlaceholder}
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            {/* Description Input */}
            <Input
              placeholder={t.tasks.descriptionPlaceholder}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
              style={{ minHeight: 60 }}
            />

            {/* Space Selector */}
            {currentSpaces.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  Không gian (Space)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                  {currentSpaces.map((sp) => {
                    const isSelected = selectedSpaceId === sp.id;
                    return (
                      <TouchableOpacity
                        key={sp.id}
                        onPress={() => setSelectedSpaceId(sp.id)}
                        style={[
                          styles.optionChip,
                          {
                            backgroundColor: isSelected ? colors.primarySubtle : colors.surfaceSubtle,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 14 }}>{sp.emoji || '📦'}</Text>
                        <Text
                          style={[
                            styles.optionText,
                            { color: isSelected ? colors.primaryText : colors.textSecondary },
                          ]}
                        >
                          {sp.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Assignee Selector */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <User size={14} color={colors.textSecondary} />
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  {t.tasks.assignee}
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                <TouchableOpacity
                  onPress={() => setSelectedAssigneeId('')}
                  style={[
                    styles.assigneeChip,
                    {
                      backgroundColor: !selectedAssigneeId ? colors.primarySubtle : colors.surfaceSubtle,
                      borderColor: !selectedAssigneeId ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceHover }]}>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>-</Text>
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      { color: !selectedAssigneeId ? colors.primaryText : colors.textSecondary },
                    ]}
                  >
                    {t.tasks.unassigned}
                  </Text>
                </TouchableOpacity>

                {members.map((m) => {
                  const isSelected = selectedAssigneeId === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setSelectedAssigneeId(m.id)}
                      style={[
                        styles.assigneeChip,
                        {
                          backgroundColor: isSelected ? colors.primarySubtle : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      {m.avatar ? (
                        <Image source={{ uri: m.avatar }} style={styles.avatarImg} />
                      ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                          <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>
                            {m.name.charAt(0)}
                          </Text>
                        </View>
                      )}
                      <Text
                        style={[
                          styles.optionText,
                          { color: isSelected ? colors.primaryText : colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Quick Due Date */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Calendar size={14} color={colors.textSecondary} />
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  {t.tasks.quickDueDate}
                </Text>
              </View>
              <View style={styles.optionsRow}>
                {[
                  { key: 'today', label: 'Hôm nay' },
                  { key: 'tomorrow', label: 'Ngày mai' },
                  { key: '3days', label: '3 ngày tới' },
                  { key: '1week', label: '1 tuần' },
                  { key: 'none', label: 'Không hạn' },
                ].map((item) => {
                  const isSelected = dueDateType === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => setDueDateType(item.key as any)}
                      style={[
                        styles.optionChip,
                        {
                          backgroundColor: isSelected ? colors.primarySubtle : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: isSelected ? colors.primaryText : colors.textSecondary },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Tags Selector */}
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Tag size={14} color={colors.textSecondary} />
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  {t.tasks.tags}
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {PRESET_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleTag(tag)}
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
                          styles.optionText,
                          { color: isSelected ? '#a5b4fc' : colors.textSecondary },
                        ]}
                      >
                        #{tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Priority Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t.tasks.priority}
              </Text>
              <View style={styles.optionsRow}>
                {priorities.map((p) => {
                  const isSelected = priority === p.key;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      onPress={() => setPriority(p.key)}
                      style={[
                        styles.optionChip,
                        {
                          backgroundColor: isSelected ? `${p.color}30` : colors.surfaceSubtle,
                          borderColor: isSelected ? p.color : colors.border,
                        },
                      ]}
                    >
                      <View style={[styles.dot, { backgroundColor: p.color }]} />
                      <Text
                        style={[
                          styles.optionText,
                          { color: isSelected ? p.color : colors.textSecondary },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Status Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t.tasks.status}
              </Text>
              <View style={styles.optionsRow}>
                {statuses.map((s) => {
                  const isSelected = status === s.key;
                  return (
                    <TouchableOpacity
                      key={s.key}
                      onPress={() => setStatus(s.key)}
                      style={[
                        styles.optionChip,
                        {
                          backgroundColor: isSelected ? colors.primarySubtle : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: isSelected ? colors.primaryText : colors.textSecondary },
                        ]}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Submit Action */}
            <View style={styles.footer}>
              <Button
                title={t.tasks.createTask}
                onPress={handleCreate}
                loading={loading}
                disabled={!title.trim()}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '88%',
    paddingBottom: 24,
  },
  grabberWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  horizontalScroll: {
    marginTop: 2,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    marginRight: 8,
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
  assigneeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 7,
    marginRight: 8,
  },
  avatarImg: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  avatarPlaceholder: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    marginTop: 16,
    marginBottom: 20,
  },
});

