import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import {
  X,
  Mail,
  MessageSquare,
  Briefcase,
  CheckCircle2,
  Clock,
  Shield,
  Circle,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { User, Task } from '../../types';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Button } from './Button';

interface MemberProfileModalProps {
  visible: boolean;
  member: User | null;
  onClose: () => void;
  onDirectMessage: (memberId: string, memberName: string) => void;
}

const statusMap: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  online: { label: 'Trực tuyến', color: '#10b981', bg: '#10b98120' },
  busy: { label: 'Đang bận', color: '#f43f5e', bg: '#f43f5e20' },
  away: { label: 'Vắng mặt', color: '#f59e0b', bg: '#f59e0b20' },
  offline: { label: 'Ngoại tuyến', color: '#94a3b8', bg: '#94a3b820' },
};

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  visible,
  member,
  onClose,
  onDirectMessage,
}) => {
  const colors = useUiStore((s) => s.getColors());
  const tasks = useTaskStore((s) => s.tasks);

  if (!member) return null;

  const statusInfo = statusMap[member.status || 'offline'] || statusMap.offline;

  // Filter tasks assigned to this member
  const memberTasks = tasks.filter((t) => {
    if (t.assigneeId === member.id) return true;
    if (t.assigneeIds && t.assigneeIds.includes(member.id)) return true;
    return false;
  });

  const completedTasks = memberTasks.filter((t) => t.status === 'completed');
  const inProgressTasks = memberTasks.filter((t) => t.status === 'inprogress');
  const completionRate =
    memberTasks.length > 0
      ? Math.round((completedTasks.length / memberTasks.length) * 100)
      : 0;

  const handleOpenEmail = () => {
    if (!member.email) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    Linking.openURL(`mailto:${member.email}`).catch(() => {
      Toast.show({
        type: 'info',
        text1: 'Email',
        text2: member.email,
      });
    });
  };

  const handleStartDM = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    onClose();
    onDirectMessage(member.id, member.name);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Hồ sơ thành viên</Text>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceHover }]}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Profile Hero Card */}
            <View style={[styles.heroCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <View style={styles.avatarWrap}>
                <Avatar
                  name={member.name}
                  url={member.avatar}
                  size={64}
                  online={member.status === 'online'}
                />
              </View>

              <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                {member.name}
              </Text>
              <Text style={[styles.memberDepartment, { color: colors.textSecondary }]}>
                {member.department || 'Thành viên dự án'}
              </Text>
              <Text style={[styles.memberEmail, { color: colors.textMuted }]}>
                {member.email}
              </Text>

              {/* Status & Role Pill Row */}
              <View style={styles.pillRow}>
                <View style={[styles.statusPill, { backgroundColor: statusInfo.bg }]}>
                  <Circle size={8} fill={statusInfo.color} color={statusInfo.color} />
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>
                    {statusInfo.label}
                  </Text>
                </View>

                <Badge
                  label={member.role.toUpperCase()}
                  color={member.role === 'admin' ? colors.primary : colors.textMuted}
                />
              </View>

              {/* Quick Actions */}
              <View style={styles.actionRow}>
                <Button
                  title="Nhắn tin trực tiếp"
                  icon={<MessageSquare size={16} color="#ffffff" />}
                  onPress={handleStartDM}
                  style={{ flex: 1 }}
                />
                <TouchableOpacity
                  onPress={handleOpenEmail}
                  style={[
                    styles.iconActionBtn,
                    { backgroundColor: colors.surfaceHover, borderColor: colors.border },
                  ]}
                >
                  <Mail size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Performance KPIs */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Hiệu suất & Tiến độ
            </Text>
            <View style={styles.kpiGrid}>
              <View style={[styles.kpiCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>
                  {memberTasks.length}
                </Text>
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>
                  Tổng công việc
                </Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Text style={[styles.kpiValue, { color: colors.success }]}>
                  {completedTasks.length}
                </Text>
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>
                  Đã hoàn thành
                </Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Text style={[styles.kpiValue, { color: colors.primary }]}>
                  {completionRate}%
                </Text>
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>
                  Tỉ lệ đạt được
                </Text>
              </View>
            </View>

            {/* Recent Assigned Tasks */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 18 }]}>
              Công việc đang phụ trách ({memberTasks.length})
            </Text>
            {memberTasks.length === 0 ? (
              <View style={[styles.emptyTasks, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Layers size={28} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Chưa có công việc nào được gán cho thành viên này.
                </Text>
              </View>
            ) : (
              <View style={styles.taskList}>
                {memberTasks.slice(0, 5).map((task) => {
                  const isDone = task.status === 'completed';
                  return (
                    <View
                      key={task.id}
                      style={[
                        styles.taskItem,
                        { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.taskTitle,
                            {
                              color: isDone ? colors.textMuted : colors.textPrimary,
                              textDecorationLine: isDone ? 'line-through' : 'none',
                            },
                          ]}
                        >
                          {task.title}
                        </Text>
                        <View style={styles.taskMetaRow}>
                          <Badge
                            label={task.priority.toUpperCase()}
                            color={
                              task.priority === 'urgent'
                                ? colors.danger
                                : task.priority === 'high'
                                ? colors.warning
                                : colors.info
                            }
                          />
                          <Badge
                            label={
                              task.status === 'completed'
                                ? 'Hoàn thành'
                                : task.status === 'inprogress'
                                ? 'Đang làm'
                                : 'Cần làm'
                            }
                            color={isDone ? colors.success : colors.inprogress}
                          />
                        </View>
                      </View>
                      {isDone && <CheckCircle2 size={16} color={colors.success} />}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  avatarWrap: {
    marginBottom: 12,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  memberDepartment: {
    fontSize: 13,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
    marginBottom: 12,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  iconActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  emptyTasks: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
  },
  taskList: {
    gap: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  taskMetaRow: {
    flexDirection: 'row',
    gap: 6,
  },
});
