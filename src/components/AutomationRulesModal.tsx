"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  X,
  Plus,
  Trash2,
  Check,
  Bell,
  MessageSquare,
  Briefcase,
  FileText,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: 'task_completed' | 'task_urgent';
  action: 'log_activity';
  enabled: boolean;
  triggerCount: number;
  lastTriggeredAt?: string;
}

export interface AutomationRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  addSyncLog?: (log: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
  workspaceId?: string;
  spaceId?: string;
  listId?: string | null;
}

export const AutomationRulesModal: React.FC<AutomationRulesModalProps> = ({
  isOpen,
  onClose,
  addSyncLog,
  triggerToast,
  workspaceId,
  spaceId,
  listId,
}) => {
  const [rules, setRules] = useState<AutomationRule[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleTrigger, setNewRuleTrigger] = useState<AutomationRule['trigger']>('task_completed');
  const [newRuleAction] = useState<AutomationRule['action']>('log_activity');

  useEffect(() => {
    if (!isOpen || !workspaceId) return;
    let active = true;
    const loadRules = async () => {
      let query = supabase.from('automation_rules').select('*').eq('workspace_id', workspaceId);
      query = spaceId ? query.eq('space_id', spaceId) : query.is('space_id', null);
      if (listId) query = query.eq('list_id', listId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!active) return;
      if (error) {
        triggerToast?.('warning', 'Không thể tải automation', error.message);
        return;
      }
      setRules((data || []).map(row => ({
        id: row.id, name: row.name, description: row.description,
        trigger: row.trigger_type, action: row.action_type,
        enabled: row.enabled, triggerCount: row.trigger_count,
        lastTriggeredAt: row.last_triggered_at || undefined
      })));
    };
    void loadRules();
    return () => { active = false; };
  }, [isOpen, workspaceId, spaceId, listId, triggerToast]);

  const toggleRule = async (id: string) => {
    const currentRule = rules.find(rule => rule.id === id);
    if (!currentRule) return;
    const nextState = !currentRule.enabled;
    const { error } = await supabase.from('automation_rules').update({
      enabled: !currentRule.enabled,
      updated_at: new Date().toISOString()
    }).eq('id', id);
    if (error) {
      triggerToast?.('warning', 'Không thể cập nhật automation', error.message);
      return;
    }
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          if (addSyncLog) addSyncLog(`Automation rule "${r.name}" ${nextState ? 'enabled' : 'disabled'}`);
          if (triggerToast) {
            triggerToast(
              'info',
              'Automation Updated',
              `Rule "${r.name}" is now ${nextState ? 'Active' : 'Paused'}.`
            );
          }
          return { ...r, enabled: nextState };
        }
        return r;
      })
    );
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase.from('automation_rules').delete().eq('id', id);
    if (error) {
      triggerToast?.('warning', 'Không thể xóa automation', error.message);
      return;
    }
    setRules((prev) => prev.filter((r) => r.id !== id));
    if (triggerToast) triggerToast('info', 'Rule Removed', 'Automation rule has been deleted.');
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    const triggerLabels: Record<string, string> = {
      task_completed: 'When a task is completed',
      task_urgent: 'When a task priority becomes Urgent',
      doc_created: 'When a new document is created',
      pomo_started: 'When a Pomodoro focus timer starts',
    };

    const actionLabels: Record<string, string> = {
      log_activity: 'Log to workspace activity feed',
    };

    const newRule: AutomationRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName.trim(),
      description: `${triggerLabels[newRuleTrigger]} -> ${actionLabels[newRuleAction]}.`,
      trigger: newRuleTrigger,
      action: newRuleAction,
      enabled: true,
      triggerCount: 0,
    };

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || !workspaceId) return;
    const { error } = await supabase.from('automation_rules').insert({
      id: newRule.id,
      workspace_id: workspaceId,
      space_id: spaceId || null,
      list_id: listId || null,
      name: newRule.name,
      description: newRule.description,
      trigger_type: newRule.trigger,
      action_type: newRule.action,
      enabled: true,
      config: {},
      user_id: session.user.id
    });
    if (error) {
      triggerToast?.('warning', 'Không thể tạo automation', error.message);
      return;
    }

    setRules((prev) => [newRule, ...prev]);
    setNewRuleName('');
    setShowCreateModal(false);

    if (addSyncLog) addSyncLog(`Created new automation rule: "${newRule.name}"`);
    if (triggerToast) triggerToast('success', 'Automation Created', `Rule "${newRule.name}" is active!`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Body */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh] z-10 font-sans"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/5 via-blue-500/5 to-cyan-500/5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-indigo-600 rounded-2xl text-white shadow-md">
                <Zap className="w-5 h-5 font-bold" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  Công cụ quy tắc tự động
                  <span className="text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase">
                    No-Code
                  </span>
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Ghi nhận thay đổi công việc tự động vào Activity
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Quy tắc mới</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Rules List Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[60vh]">
            {rules.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 mx-auto flex items-center justify-center">
                  <Zap className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Chưa cấu hình quy tắc tự động</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Tạo quy tắc để tự động ghi nhận các mốc quan trọng của công việc vào Activity.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      rule.enabled
                        ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs'
                        : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/40 dark:border-slate-800/40 opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{rule.name}</h4>
                          <span
                            className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                              rule.enabled
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {rule.enabled ? 'ACTIVE' : 'PAUSED'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {rule.description}
                        </p>

                        <div className="pt-2 flex items-center gap-4 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          <span>Đã chạy: {rule.triggerCount} times</span>
                          {rule.lastTriggeredAt && (
                            <span>
                              Lần cuối: {new Date(rule.lastTriggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Rule Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleRule(rule.id)}
                          className="p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                          title={rule.enabled ? 'Pause Rule' : 'Activate Rule'}
                        >
                          {rule.enabled ? (
                            <ToggleRight className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                          )}
                        </button>

                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="p-1 text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Xóa quy tắc"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Công cụ Apexa: {rules.filter(rule => rule.enabled).length} quy tắc đang hoạt động</span>
            </span>
          </div>
        </motion.div>

        {/* Create Rule Modal Overlay */}
        {showCreateModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.form
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onSubmit={handleCreateRule}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>Tạo quy tắc tự động tùy chỉnh</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tên quy tắc</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Thông báo cho nhóm khi có công việc ưu tiên cao"
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">NẾU (Điều kiện kích hoạt)</label>
                  <select
                    value={newRuleTrigger}
                    onChange={(e) => setNewRuleTrigger(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="task_completed">Khi công việc được đánh dấu Hoàn thành</option>
                    <option value="task_urgent">Khi mức ưu tiên chuyển thành Khẩn cấp</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">THÌ (Hành động)</label>
                  <select
                    value={newRuleAction}
                    disabled
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="log_activity">Ghi vào hoạt động khu vực</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
                >
                  Tạo quy tắc
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
