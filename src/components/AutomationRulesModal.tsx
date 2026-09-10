"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from '../contexts/TranslationContext';
import { motion, AnimatePresence } from 'motion/react';
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
  const { localize: l, formatDate } = useTranslation();
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
        triggerToast?.('warning', l('Không thể tải quy tắc tự động', 'Could not load automations'), error.message);
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
  }, [isOpen, workspaceId, spaceId, listId, triggerToast, l]);

  const toggleRule = async (id: string) => {
    const currentRule = rules.find(rule => rule.id === id);
    if (!currentRule) return;
    const nextState = !currentRule.enabled;
    const { error } = await supabase.from('automation_rules').update({
      enabled: !currentRule.enabled,
      updated_at: new Date().toISOString()
    }).eq('id', id);
    if (error) {
      triggerToast?.('warning', l('Không thể cập nhật quy tắc', 'Could not update automation'), error.message);
      return;
    }
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          if (addSyncLog) addSyncLog(l(
            `Quy tắc tự động “${r.name}” đã ${nextState ? 'bật' : 'tạm dừng'}`,
            `Automation “${r.name}” ${nextState ? 'enabled' : 'paused'}`
          ));
          if (triggerToast) {
            triggerToast(
              'info',
              l('Đã cập nhật quy tắc', 'Automation updated'),
              l(`Quy tắc “${r.name}” hiện ${nextState ? 'đang hoạt động' : 'đã tạm dừng'}.`, `“${r.name}” is now ${nextState ? 'active' : 'paused'}.`)
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
      triggerToast?.('warning', l('Không thể xóa quy tắc', 'Could not delete automation'), error.message);
      return;
    }
    setRules((prev) => prev.filter((r) => r.id !== id));
    triggerToast?.('info', l('Đã xóa quy tắc', 'Automation deleted'), l('Quy tắc tự động đã được xóa.', 'The automation was deleted.'));
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    const triggerLabels: Record<string, string> = {
      task_completed: l('Khi một công việc hoàn thành', 'When a task is completed'),
      task_urgent: l('Khi mức ưu tiên chuyển thành Khẩn cấp', 'When a task priority becomes Urgent'),
      doc_created: l('Khi tài liệu mới được tạo', 'When a new document is created'),
      pomo_started: l('Khi phiên tập trung Pomodoro bắt đầu', 'When a Pomodoro focus timer starts'),
    };

    const actionLabels: Record<string, string> = {
      log_activity: l('Ghi vào nhật ký hoạt động', 'Log to the workspace activity feed'),
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
      triggerToast?.('warning', l('Không thể tạo quy tắc', 'Could not create automation'), error.message);
      return;
    }

    setRules((prev) => [newRule, ...prev]);
    setNewRuleName('');
    setShowCreateModal(false);

    addSyncLog?.(l(`Đã tạo quy tắc tự động: “${newRule.name}”`, `Created automation: “${newRule.name}”`));
    triggerToast?.('success', l('Đã tạo quy tắc', 'Automation created'), l(`Quy tắc “${newRule.name}” đang hoạt động.`, `“${newRule.name}” is active.`));
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
          className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh] z-10 font-sans"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/5 via-blue-500/5 to-cyan-500/5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-indigo-600 rounded-2xl text-white shadow-md">
                <Zap className="w-5 h-5 font-bold" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  {l('Quy tắc tự động', 'Automations')}
                  <span className="text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase">
                    {l('Không cần mã', 'No-code')}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {l('Tự động ghi nhận thay đổi công việc vào nhật ký hoạt động', 'Automatically log task changes to the activity feed')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{l('Quy tắc mới', 'New automation')}</span>
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
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {l('Chưa có quy tắc tự động', 'No automations yet')}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {l('Tạo quy tắc để tự động ghi nhận các mốc quan trọng vào nhật ký hoạt động.', 'Create an automation to log important task events to the activity feed.')}
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
                            {rule.enabled ? l('ĐANG BẬT', 'ACTIVE') : l('TẠM DỪNG', 'PAUSED')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {rule.description}
                        </p>

                        <div className="pt-2 flex items-center gap-4 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          <span>{l('Đã chạy', 'Runs')}: {rule.triggerCount}</span>
                          {rule.lastTriggeredAt && (
                            <span>
                              {l('Lần gần nhất', 'Last run')}: {formatDate(rule.lastTriggeredAt, { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Rule Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleRule(rule.id)}
                          className="p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                          title={rule.enabled ? l('Tạm dừng quy tắc', 'Pause automation') : l('Bật quy tắc', 'Activate automation')}
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
                          title={l('Xóa quy tắc', 'Delete automation')}
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
              <span>
                {l('Apexa Automations', 'Apexa Automations')}: {rules.filter(rule => rule.enabled).length}{' '}
                {l('quy tắc đang hoạt động', 'active')}
              </span>
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
                  <span>{l('Tạo quy tắc tự động', 'Create an automation')}</span>
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
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {l('Tên quy tắc', 'Automation name')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={l('Ví dụ: Thông báo cho nhóm khi có công việc khẩn cấp', 'For example: Notify the team about urgent tasks')}
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {l('NẾU (điều kiện kích hoạt)', 'WHEN (trigger)')}
                  </label>
                  <select
                    value={newRuleTrigger}
                    onChange={(e) => setNewRuleTrigger(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="task_completed">{l('Khi công việc được đánh dấu hoàn thành', 'When a task is completed')}</option>
                    <option value="task_urgent">{l('Khi mức ưu tiên chuyển thành khẩn cấp', 'When a task becomes urgent')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {l('THÌ (hành động)', 'THEN (action)')}
                  </label>
                  <select
                    value={newRuleAction}
                    disabled
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="log_activity">{l('Ghi vào nhật ký hoạt động', 'Log to the activity feed')}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {l('Hủy', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
                >
                  {l('Tạo quy tắc', 'Create automation')}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
