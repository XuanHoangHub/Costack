import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  X,
  Zap,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Bell,
  FileText,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useUiStore } from '../../store/uiStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { supabase } from '../../api/supabase';
import { AutomationRule } from '../../types';
import { Input } from './Input';
import { Button } from './Button';

interface AutomationRulesModalProps {
  visible: boolean;
  onClose: () => void;
}

const DEFAULT_STARTER_RULES: AutomationRule[] = [
  {
    id: 'rule-1',
    name: 'Ghi nhật ký khi hoàn thành',
    description: 'Khi công việc được đánh dấu hoàn thành, tự động ghi vào lịch sử hoạt động',
    triggerType: 'task_completed',
    actionType: 'log_activity',
    enabled: true,
    workspaceId: 'w2',
    triggerCount: 14,
  },
  {
    id: 'rule-2',
    name: 'Cảnh báo việc khẩn cấp',
    description: 'Khi độ ưu tiên được đổi sang Khẩn cấp (Urgent), gửi thông báo tức thì',
    triggerType: 'task_urgent',
    actionType: 'send_notification',
    enabled: true,
    workspaceId: 'w2',
    triggerCount: 3,
  },
  {
    id: 'rule-3',
    name: 'Thông báo việc mới tạo',
    description: 'Tự động gửi thông báo đến người được gán khi có công việc mới',
    triggerType: 'task_created',
    actionType: 'send_notification',
    enabled: false,
    workspaceId: 'w2',
    triggerCount: 8,
  },
];

export const AutomationRulesModal: React.FC<AutomationRulesModalProps> = ({
  visible,
  onClose,
}) => {
  const colors = useUiStore((s) => s.getColors());
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);

  const [rules, setRules] = useState<AutomationRule[]>(DEFAULT_STARTER_RULES);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New rule inputs
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleTrigger, setNewRuleTrigger] = useState<'task_completed' | 'task_urgent' | 'task_created'>('task_completed');
  const [newRuleAction, setNewRuleAction] = useState<'log_activity' | 'send_notification'>('log_activity');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible && activeWorkspaceId) {
      fetchRules();
    }
  }, [visible, activeWorkspaceId]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('workspace_id', activeWorkspaceId);

      if (!error && data && data.length > 0) {
        const mapped: AutomationRule[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          triggerType: d.trigger_type || 'task_completed',
          actionType: d.action_type || 'log_activity',
          enabled: d.enabled ?? true,
          workspaceId: d.workspace_id,
          triggerCount: d.trigger_count || 0,
          lastTriggeredAt: d.last_triggered_at,
        }));
        setRules(mapped);
      }
    } catch {
      // Keep defaults
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRule = async (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const target = rules.find((r) => r.id === id);
    if (!target) return;
    const nextState = !target.enabled;

    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: nextState } : r))
    );

    try {
      await supabase
        .from('automation_rules')
        .update({ enabled: nextState })
        .eq('id', id);
    } catch {}
  };

  const handleDeleteRule = async (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setRules((prev) => prev.filter((r) => r.id !== id));
    try {
      await supabase.from('automation_rules').delete().eq('id', id);
      Toast.show({
        type: 'success',
        text1: 'Đã xóa quy tắc',
        text2: 'Quy tắc tự động hóa đã được xóa thành công.',
      });
    } catch {}
  };

  const handleCreateRule = async () => {
    if (!newRuleName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Chưa nhập tên quy tắc',
        text2: 'Vui lòng đặt tên cho quy tắc tự động hóa.',
      });
      return;
    }

    setIsSaving(true);
    try {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      const newRule: AutomationRule = {
        id: `rule-${Date.now()}`,
        name: newRuleName.trim(),
        description:
          newRuleTrigger === 'task_completed'
            ? 'Tự động kích hoạt khi có công việc được hoàn thành'
            : newRuleTrigger === 'task_urgent'
            ? 'Tự động kích hoạt khi công việc chuyển sang khẩn cấp'
            : 'Tự động kích hoạt khi có công việc mới được tạo',
        triggerType: newRuleTrigger,
        actionType: newRuleAction,
        enabled: true,
        workspaceId: activeWorkspaceId || 'w2',
        triggerCount: 0,
      };

      setRules((prev) => [newRule, ...prev]);

      try {
        await supabase.from('automation_rules').insert({
          id: newRule.id,
          name: newRule.name,
          description: newRule.description,
          trigger_type: newRule.triggerType,
          action_type: newRule.actionType,
          enabled: true,
          workspace_id: newRule.workspaceId,
        });
      } catch {}

      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: `Quy tắc "${newRule.name}" đã được kích hoạt.`,
      });

      setNewRuleName('');
      setShowCreateModal(false);
    } finally {
      setIsSaving(false);
    }
  };

  const triggerLabels: Record<string, string> = {
    task_completed: 'Khi hoàn thành công việc',
    task_urgent: 'Khi công việc chuyển sang Khẩn cấp',
    task_created: 'Khi công việc mới được tạo',
  };

  const actionLabels: Record<string, string> = {
    log_activity: 'Ghi nhật ký hoạt động',
    send_notification: 'Gửi thông báo hệ thống',
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Tự động hóa (Automations)</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {activeWs?.name || 'Workspace'} • Giảm tải tác vụ thủ công
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceHover }]}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Top banner */}
            <View style={[styles.banner, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
              <View style={[styles.bannerIconBox, { backgroundColor: colors.primary }]}>
                <Zap size={20} color="#ffffff" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>
                  Quy tắc kích hoạt tự động
                </Text>
                <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>
                  Hệ thống tự động kích hoạt các thao tác khi có sự kiện thay đổi dữ liệu công việc.
                </Text>
              </View>
            </View>

            {/* List of rules */}
            <View style={styles.rulesList}>
              {loading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                    Đang tải quy tắc tự động...
                  </Text>
                </View>
              ) : rules.length === 0 ? (
                <View style={[styles.emptyWrap, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <Zap size={32} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    Chưa có quy tắc tự động hóa
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                    Tạo quy tắc đầu tiên để hệ thống tự động xử lý công việc thay bạn.
                  </Text>
                </View>
              ) : (
                rules.map((rule) => (
                  <View
                    key={rule.id}
                    style={[
                      styles.ruleCard,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: rule.enabled ? `${colors.primary}40` : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.ruleTop}>
                      <View style={styles.ruleHeaderLeft}>
                        <View
                          style={[
                            styles.zapBadge,
                            {
                              backgroundColor: rule.enabled ? colors.primary : colors.surfaceHover,
                            },
                          ]}
                        >
                          <Zap size={14} color={rule.enabled ? '#ffffff' : colors.textMuted} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.ruleName, { color: colors.textPrimary }]}>
                            {rule.name}
                          </Text>
                          <Text style={[styles.ruleDesc, { color: colors.textMuted }]}>
                            {rule.description}
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={rule.enabled}
                        onValueChange={() => handleToggleRule(rule.id)}
                        trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                        thumbColor={rule.enabled ? colors.primary : colors.textMuted}
                      />
                    </View>

                    {/* Flow Diagram Mini Pills */}
                    <View style={styles.flowRow}>
                      <View style={[styles.flowPill, { backgroundColor: colors.surfaceHover }]}>
                        <Clock size={11} color={colors.textSecondary} />
                        <Text style={[styles.flowPillText, { color: colors.textSecondary }]}>
                          {triggerLabels[rule.triggerType] || rule.triggerType}
                        </Text>
                      </View>
                      <ArrowRight size={12} color={colors.textMuted} />
                      <View style={[styles.flowPill, { backgroundColor: `${colors.primary}18` }]}>
                        {rule.actionType === 'send_notification' ? (
                          <Bell size={11} color={colors.primary} />
                        ) : (
                          <FileText size={11} color={colors.primary} />
                        )}
                        <Text style={[styles.flowPillText, { color: colors.primary }]}>
                          {actionLabels[rule.actionType] || rule.actionType}
                        </Text>
                      </View>
                    </View>

                    {/* Footer with execution count & delete */}
                    <View style={[styles.ruleFooter, { borderTopColor: colors.border }]}>
                      <Text style={[styles.ruleCount, { color: colors.textMuted }]}>
                        Đã kích hoạt {rule.triggerCount || 0} lần
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteRule(rule.id)}
                        style={styles.deleteBtn}
                      >
                        <Trash2 size={14} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Add Rule Button */}
            <Button
              title="Thêm quy tắc mới"
              icon={<Plus size={18} color="#ffffff" />}
              onPress={() => setShowCreateModal(true)}
              style={{ marginTop: 16 }}
            />
          </ScrollView>
        </View>

        {/* Modal Create Rule */}
        <Modal
          visible={showCreateModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCreateModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.innerModalOverlay}
          >
            <View style={[styles.createRuleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.createRuleHeader}>
                <Text style={[styles.createRuleTitle, { color: colors.textPrimary }]}>
                  Tạo quy tắc mới
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCreateModal(false)}
                  style={[styles.closeBtn, { backgroundColor: colors.surfaceHover }]}
                >
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ gap: 12, paddingVertical: 10 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Tên quy tắc
                </Text>
                <Input
                  placeholder="VD: Cảnh báo việc trễ hạn..."
                  value={newRuleName}
                  onChangeText={setNewRuleName}
                />

                <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 6 }]}>
                  Khi nào kích hoạt? (Trigger)
                </Text>
                {(['task_completed', 'task_urgent', 'task_created'] as const).map((tr) => (
                  <TouchableOpacity
                    key={tr}
                    onPress={() => setNewRuleTrigger(tr)}
                    style={[
                      styles.choicePill,
                      {
                        backgroundColor: newRuleTrigger === tr ? colors.primarySubtle : colors.surfaceSubtle,
                        borderColor: newRuleTrigger === tr ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        { color: newRuleTrigger === tr ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      {triggerLabels[tr]}
                    </Text>
                    {newRuleTrigger === tr && <CheckCircle2 size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}

                <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 6 }]}>
                  Hành động thực thi (Action)
                </Text>
                {(['log_activity', 'send_notification'] as const).map((ac) => (
                  <TouchableOpacity
                    key={ac}
                    onPress={() => setNewRuleAction(ac)}
                    style={[
                      styles.choicePill,
                      {
                        backgroundColor: newRuleAction === ac ? colors.primarySubtle : colors.surfaceSubtle,
                        borderColor: newRuleAction === ac ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        { color: newRuleAction === ac ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      {actionLabels[ac]}
                    </Text>
                    {newRuleAction === ac && <CheckCircle2 size={16} color={colors.primary} />}
                  </TouchableOpacity>
                ))}

                <Button
                  title={isSaving ? 'Đang lưu...' : 'Lưu và Kích hoạt'}
                  onPress={handleCreateRule}
                  loading={isSaving}
                  style={{ marginTop: 10 }}
                />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
  subtitle: {
    fontSize: 12,
    marginTop: 2,
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bannerSubtitle: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  rulesList: {
    gap: 12,
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyWrap: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  ruleCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  ruleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ruleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  zapBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleName: {
    fontSize: 14,
    fontWeight: '700',
  },
  ruleDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  flowPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ruleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  ruleCount: {
    fontSize: 11,
  },
  deleteBtn: {
    padding: 4,
  },
  innerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  createRuleCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: '85%',
  },
  createRuleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  createRuleTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  choicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
