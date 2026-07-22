"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  X,
  Plus,
  Trash2,
  Check,
  Play,
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
  RotateCcw,
} from 'lucide-react';

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: 'task_completed' | 'task_urgent' | 'doc_created' | 'pomo_started';
  action: 'notify_toast' | 'post_chat' | 'log_activity' | 'set_focused';
  enabled: boolean;
  triggerCount: number;
  lastTriggeredAt?: string;
}

export interface AutomationRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  addSyncLog?: (log: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
}

const DEFAULT_RULES: AutomationRule[] = [
  {
    id: 'rule-1',
    name: 'Auto-broadcast Completed Tasks',
    description: 'When a task status changes to Completed, broadcast an update to the team and log activity.',
    trigger: 'task_completed',
    action: 'post_chat',
    enabled: true,
    triggerCount: 14,
    lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'rule-2',
    name: 'Urgent Task Alert Guard',
    description: 'When a task priority is updated to Urgent, display an immediate high-priority toast alert.',
    trigger: 'task_urgent',
    action: 'notify_toast',
    enabled: true,
    triggerCount: 8,
    lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 'rule-3',
    name: 'New Document Notification',
    description: 'When a new document is written or published, trigger a workspace notification.',
    trigger: 'doc_created',
    action: 'notify_toast',
    enabled: true,
    triggerCount: 5,
    lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
  },
  {
    id: 'rule-4',
    name: 'Pomodoro Auto-Focus State',
    description: 'When a Pomodoro focus timer starts, automatically set user status to Focused.',
    trigger: 'pomo_started',
    action: 'set_focused',
    enabled: false,
    triggerCount: 22,
    lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
  },
];

export const AutomationRulesModal: React.FC<AutomationRulesModalProps> = ({
  isOpen,
  onClose,
  addSyncLog,
  triggerToast,
}) => {
  const STORAGE_KEY = 'avaxa_automation_rules';
  const [rules, setRules] = useState<AutomationRule[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return DEFAULT_RULES;
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleTrigger, setNewRuleTrigger] = useState<AutomationRule['trigger']>('task_completed');
  const [newRuleAction, setNewRuleAction] = useState<AutomationRule['action']>('notify_toast');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    } catch (e) {}
  }, [rules]);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextState = !r.enabled;
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

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    if (triggerToast) triggerToast('info', 'Rule Removed', 'Automation rule has been deleted.');
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    const triggerLabels: Record<string, string> = {
      task_completed: 'When a task is completed',
      task_urgent: 'When a task priority becomes Urgent',
      doc_created: 'When a new document is created',
      pomo_started: 'When a Pomodoro focus timer starts',
    };

    const actionLabels: Record<string, string> = {
      notify_toast: 'Trigger a toast alert notification',
      post_chat: 'Post automated message to #general chat',
      log_activity: 'Log to workspace activity feed',
      set_focused: 'Set user status to Focused',
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

    setRules((prev) => [newRule, ...prev]);
    setNewRuleName('');
    setShowCreateModal(false);

    if (addSyncLog) addSyncLog(`Created new automation rule: "${newRule.name}"`);
    if (triggerToast) triggerToast('success', 'Automation Created', `Rule "${newRule.name}" is active!`);
  };

  const triggerTestRule = (rule: AutomationRule) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === rule.id
          ? {
              ...r,
              triggerCount: r.triggerCount + 1,
              lastTriggeredAt: new Date().toISOString(),
            }
          : r
      )
    );

    if (triggerToast) {
      triggerToast(
        'success',
        'Automation Test Fired',
        `Simulated rule "${rule.name}": Executed ${rule.action.toUpperCase()} action successfully.`
      );
    }
    if (addSyncLog) addSyncLog(`Test executed automation rule: "${rule.name}"`);
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
          <div className="px-6 py-4 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/5 via-indigo-500/5 to-purple-500/5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-indigo-600 rounded-2xl text-white shadow-md">
                <Zap className="w-5 h-5 font-bold" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  Automation Rules Engine
                  <span className="text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase">
                    No-Code
                  </span>
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Automate workflow actions, team notifications, and status updates
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Rule</span>
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
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Automation Rules Configured</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Create trigger-action automation rules to auto-update tasks, post chat alerts, and streamline team productivity.
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
                          <span>Fired: {rule.triggerCount} times</span>
                          {rule.lastTriggeredAt && (
                            <span>
                              Last: {new Date(rule.lastTriggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Rule Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => triggerTestRule(rule)}
                          className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="Run Test"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Test</span>
                        </button>

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
                          title="Delete Rule"
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
              <span>Avaxa Engine: 4 rules active in workspace</span>
            </span>
            <button
              onClick={() => {
                setRules(DEFAULT_RULES);
                if (triggerToast) triggerToast('info', 'Rules Reset', 'Restored default automation rules.');
              }}
              className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>
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
                  <span>Create Custom Automation Rule</span>
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
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Rule Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Notify Team on High Priority Tasks"
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">IF (Trigger)</label>
                  <select
                    value={newRuleTrigger}
                    onChange={(e) => setNewRuleTrigger(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="task_completed">When a task is marked Completed</option>
                    <option value="task_urgent">When a task priority becomes Urgent</option>
                    <option value="doc_created">When a new Document is created</option>
                    <option value="pomo_started">When a Pomodoro focus session starts</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">THEN (Action)</label>
                  <select
                    value={newRuleAction}
                    onChange={(e) => setNewRuleAction(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="notify_toast">Show Toast Alert Notification</option>
                    <option value="post_chat">Broadcast Message to #general Chat</option>
                    <option value="log_activity">Log Activity in Sync Log</option>
                    <option value="set_focused">Set User Status to Focused</option>
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
                  Create Rule
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
