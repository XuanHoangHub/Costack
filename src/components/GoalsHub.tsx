"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, User } from '../types';
import SignedImage from './SignedImage';
import { 
  Target, Plus, Trash2, Calendar, User as UserIcon, CheckSquare, 
  ChevronRight, Sparkles, Trophy, PlusCircle, Check, X, ArrowUpRight, 
  Sliders, TrendingUp, AlertCircle, BarChart3, HelpCircle, Download, FileText, Filter, Layers
} from 'lucide-react';
import { callAiApi } from '@/lib/aiClient';

export interface GoalTarget {
  id: string;
  title: string;
  type: 'task' | 'number' | 'boolean';
  taskId?: string;
  targetValue?: number;
  currentValue?: number;
  completed?: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  ownerId?: string;
  dueDate?: string;
  workspaceId: string;
  targets: GoalTarget[];
}

interface GoalsHubProps {
  tasks: Task[];
  members: User[];
  workspaceId: string;
  currentUser: any;
  onAddSyncLog?: (action: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
}

export default function GoalsHub({
  tasks = [],
  members = [],
  workspaceId,
  currentUser,
  onAddSyncLog,
  triggerToast
}: GoalsHubProps) {
  // Goals State
  const [goals, setGoals] = useState<Goal[]>([]);
  const [expandedGoalIds, setExpandedGoalIds] = useState<string[]>([]);
  
  // Modal States
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  
  // New Goal Fields
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalOwnerId, setNewGoalOwnerId] = useState(currentUser?.id || '');
  const [newGoalDueDate, setNewGoalDueDate] = useState('');

  // New Target Fields
  const [showAddTargetForm, setShowAddTargetForm] = useState(false);
  const [newTargetTitle, setNewTargetTitle] = useState('');
  const [newTargetType, setNewTargetType] = useState<'task' | 'number' | 'boolean'>('boolean');
  const [newTargetTaskId, setNewTargetTaskId] = useState('');
  const [newTargetValue, setNewTargetValue] = useState<number>(100);

  // Load goals from local storage on mount/workspace change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`avaxa_goals_${workspaceId}`);
      if (stored) {
        try {
          setGoals(JSON.parse(stored));
        } catch (e) {
          setGoals([]);
        }
      } else {
        // Seed some sample goals if empty
        const sampleGoals: Goal[] = [
          {
            id: `g-sample-1`,
            title: "Launch Product Feature Audit",
            description: "Perform code and UI audit across all workspace modules before release.",
            ownerId: currentUser?.id || '',
            dueDate: new Date(Date.now() + 7 * 24 * 3650 * 1000).toISOString().split('T')[0],
            workspaceId,
            targets: [
              { id: 'gt-s1-1', title: "Complete TypeScript compilation checks", type: 'boolean', completed: true },
              { id: 'gt-s1-2', title: "Review UI consistency across board views", type: 'boolean', completed: false }
            ]
          },
          {
            id: `g-sample-2`,
            title: "Increase Productivity Metrics",
            description: "Hit target Pomodoro counts and complete tasks to optimize output.",
            ownerId: currentUser?.id || '',
            dueDate: new Date(Date.now() + 14 * 24 * 3650 * 1000).toISOString().split('T')[0],
            workspaceId,
            targets: [
              { id: 'gt-s2-1', title: "Complete 15 total tasks", type: 'number', targetValue: 15, currentValue: 8 }
            ]
          }
        ];
        setGoals(sampleGoals);
        localStorage.setItem(`avaxa_goals_${workspaceId}`, JSON.stringify(sampleGoals));
      }
    }
  }, [workspaceId, currentUser]);

  // Sync back to local storage helper
  const saveGoals = (updatedGoals: Goal[]) => {
    setGoals(updatedGoals);
    localStorage.setItem(`avaxa_goals_${workspaceId}`, JSON.stringify(updatedGoals));
  };

  // Create Goal
  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    const newGoal: Goal = {
      id: `g-${Date.now()}`,
      title: newGoalTitle.trim(),
      description: newGoalDesc.trim(),
      ownerId: newGoalOwnerId || undefined,
      dueDate: newGoalDueDate || undefined,
      workspaceId,
      targets: []
    };

    const updated = [newGoal, ...goals];
    saveGoals(updated);
    if (onAddSyncLog) onAddSyncLog(`Created Goal: "${newGoal.title}"`);
    if (triggerToast) triggerToast('success', 'Goal Created 🎯', `Mục tiêu "${newGoal.title}" đã được tạo.`);

    // Reset Form
    setNewGoalTitle('');
    setNewGoalDesc('');
    setNewGoalOwnerId(currentUser?.id || '');
    setNewGoalDueDate('');
    setShowCreateGoalModal(false);
  };

  // Delete Goal
  const handleDeleteGoal = (goalId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Bạn có chắc chắn muốn xóa mục tiêu "${title}" không?`)) {
      const updated = goals.filter(g => g.id !== goalId);
      saveGoals(updated);
      if (selectedGoal?.id === goalId) {
        setSelectedGoal(null);
      }
    }
  };

  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Export OKRs Report as Markdown file
  const handleExportOkrReport = () => {
    let report = `# 🎯 BÁO CÁO MỤC TIÊU VÀ KẾT QUẢ THEN CHỐT (OKRs)\n\nNgày xuất: ${new Date().toLocaleDateString('vi-VN')}\nWorkspace ID: ${workspaceId}\n\n---\n\n`;

    goals.forEach((goal, i) => {
      const overall = getGoalProgress(goal);
      report += `### ${i + 1}. ${goal.title} (${overall}% Hoàn thành)\n`;
      if (goal.description) report += `> ${goal.description}\n\n`;
      report += `**Các chỉ số Key Results:**\n`;
      
      goal.targets.forEach(t => {
        const prog = getTargetProgress(t);
        report += `- [${prog === 100 ? 'x' : ' '}] ${t.title} (${prog}%)\n`;
      });
      report += `\n`;
    });

    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `okr-report-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
    if (triggerToast) triggerToast('success', 'Báo cáo OKRs 🎯', 'Đã tải xuống tập tin okr-report.md.');
  };

  // AI Key Result Advisor
  const handleAiSuggestKeyResults = async () => {
    if (!selectedGoal) return;
    setIsAiGenerating(true);

    try {
      const response = await callAiApi('/api/ai/subtasks', {
        title: selectedGoal.title,
        description: selectedGoal.description || ''
      });
      const data = await response.json();
      
      if (data.success && Array.isArray(data.subtasks)) {
        const generatedTargets: GoalTarget[] = data.subtasks.map((st: string, idx: number) => ({
          id: `gt-ai-${Date.now()}-${idx}`,
          title: st,
          type: 'boolean',
          completed: false
        }));

        const updatedGoals = goals.map(g => {
          if (g.id === selectedGoal.id) {
            const updatedGoal = { ...g, targets: [...g.targets, ...generatedTargets] };
            setSelectedGoal(updatedGoal);
            return updatedGoal;
          }
          return g;
        });

        saveGoals(updatedGoals);
        if (triggerToast) triggerToast('success', 'AI Key Results ✨', `Đã gợi ý thêm ${generatedTargets.length} chỉ số cho mục tiêu.`);
      }
    } catch (err) {
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Add Target to Goal
  const handleAddTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !newTargetTitle.trim()) return;

    const newTarget: GoalTarget = {
      id: `gt-${Date.now()}`,
      title: newTargetTitle.trim(),
      type: newTargetType,
      taskId: newTargetType === 'task' ? newTargetTaskId || undefined : undefined,
      targetValue: newTargetType === 'number' ? Number(newTargetValue) || 100 : undefined,
      currentValue: newTargetType === 'number' ? 0 : undefined,
      completed: newTargetType === 'boolean' ? false : undefined
    };

    const updatedGoals = goals.map(g => {
      if (g.id === selectedGoal.id) {
        const updatedGoal = { ...g, targets: [...g.targets, newTarget] };
        setSelectedGoal(updatedGoal);
        return updatedGoal;
      }
      return g;
    });

    saveGoals(updatedGoals);
    if (onAddSyncLog) onAddSyncLog(`Added Target "${newTarget.title}" to Goal "${selectedGoal.title}"`);
    
    // Reset Form
    setNewTargetTitle('');
    setNewTargetType('boolean');
    setNewTargetTaskId('');
    setNewTargetValue(100);
    setShowAddTargetForm(false);
  };

  // Remove Target from Goal
  const handleRemoveTarget = (targetId: string, title: string) => {
    if (!selectedGoal) return;

    const updatedGoals = goals.map(g => {
      if (g.id === selectedGoal.id) {
        const updatedGoal = { ...g, targets: g.targets.filter(t => t.id !== targetId) };
        setSelectedGoal(updatedGoal);
        return updatedGoal;
      }
      return g;
    });

    saveGoals(updatedGoals);
    if (onAddSyncLog) onAddSyncLog(`Removed Target "${title}" from Goal "${selectedGoal.title}"`);
  };

  // Update Target Value (number input or checkbox)
  const handleUpdateTargetValue = (targetId: string, val: any) => {
    if (!selectedGoal) return;

    const updatedGoals = goals.map(g => {
      if (g.id === selectedGoal.id) {
        const updatedTargets = g.targets.map(t => {
          if (t.id === targetId) {
            if (t.type === 'boolean') {
              return { ...t, completed: !!val };
            }
            if (t.type === 'number') {
              return { ...t, currentValue: Math.max(0, Math.min(t.targetValue || 100, Number(val))) };
            }
          }
          return t;
        });

        const updatedGoal = { ...g, targets: updatedTargets };
        setSelectedGoal(updatedGoal);
        return updatedGoal;
      }
      return g;
    });

    saveGoals(updatedGoals);
  };

  // Helper: Get progress percentage of a Target
  const getTargetProgress = (target: GoalTarget): number => {
    if (target.type === 'boolean') {
      return target.completed ? 100 : 0;
    }
    if (target.type === 'task') {
      const task = tasks.find(t => t.id === target.taskId);
      return task?.status === 'completed' ? 100 : 0;
    }
    if (target.type === 'number') {
      const targetVal = target.targetValue || 100;
      const currentVal = target.currentValue || 0;
      return Math.round((currentVal / targetVal) * 100);
    }
    return 0;
  };

  // Helper: Get overall progress of a Goal
  const getGoalProgress = (goal: Goal): number => {
    if (!goal.targets || goal.targets.length === 0) return 0;
    const totalProgress = goal.targets.reduce((acc, t) => acc + getTargetProgress(t), 0);
    return Math.round(totalProgress / goal.targets.length);
  };

  // Global Goal statistics
  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => getGoalProgress(g) === 100).length;
  const averageProgress = totalGoals > 0 ? Math.round(goals.reduce((acc, g) => acc + getGoalProgress(g), 0) / totalGoals) : 0;

  // Filter tasks to link
  const linkableTasks = tasks.filter(t => t.workspaceId === workspaceId || !t.workspaceId);

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 min-h-full pb-8">
      
      {/* Upper Glassmorphic Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total Goals Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 p-5 backdrop-blur-xl flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-955/30 text-indigo-650 dark:text-indigo-400 rounded-2xl">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Active Goals</span>
            <span className="text-2xl font-black tabular-nums">{totalGoals}</span>
          </div>
          <div className="absolute right-4 top-4 text-[10px] font-black bg-indigo-50 dark:bg-indigo-955/40 text-indigo-600 px-2 py-0.5 rounded-lg">
            Avaxa OKRs
          </div>
        </div>

        {/* Goals Completed Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 p-5 backdrop-blur-xl flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Completed</span>
            <span className="text-2xl font-black tabular-nums">{completedGoals} <span className="text-xs font-semibold text-slate-400">/ {totalGoals}</span></span>
          </div>
        </div>

        {/* Average Progress Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 p-5 backdrop-blur-xl flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-955/20 text-amber-500 dark:text-amber-400 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Average Progress</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-black tabular-nums">{averageProgress}%</span>
              <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${averageProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Main Row: Goal Grid and Actions */}
      <div className="flex justify-between items-center">
        <div className="text-left">
          <h2 className="text-lg font-black tracking-tight">Objectives & Key Results</h2>
          <p className="text-[10px] font-bold text-slate-405">Track and coordinate team goals with task targets.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportOkrReport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
            title="Xuất Báo cáo OKRs (.md)"
          >
            <Download className="w-3.5 h-3.5" /> Xuất Báo cáo
          </button>
          <button
            onClick={() => setShowCreateGoalModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white rounded-2xl shadow-lg hover:shadow-indigo-500/20 active:shadow-none hover:brightness-105 transition-all cursor-pointer"
            style={{ background: 'linear-gradient(135deg, var(--avaxa-gradient-start), var(--avaxa-gradient-end))' }}
          >
            <Plus className="w-4 h-4" /> Create Goal
          </button>
        </div>
      </div>

      {/* Grid of goals */}
      {goals.length === 0 ? (
        <div className="border border-dashed border-slate-200 dark:border-slate-805 rounded-3xl p-10 text-center space-y-3 bg-white/30 dark:bg-slate-900/10">
          <Target className="w-8 h-8 mx-auto text-slate-350 animate-bounce" />
          <div className="space-y-1">
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-300">No Goals Tracked Yet</h4>
            <p className="text-[10px] text-slate-400 max-w-xs mx-auto">Create a goal, define key targets, and link them to tasks to see aggregate progress!</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => {
            const progress = getGoalProgress(goal);
            const owner = members.find(m => m.id === goal.ownerId);

            return (
              <div 
                key={goal.id}
                onClick={() => setSelectedGoal(goal)}
                className="group relative flex flex-col justify-between p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl hover:border-indigo-400 dark:hover:border-indigo-800/60 shadow-3xs hover:shadow-lg transition-all duration-300 cursor-pointer text-left"
              >
                {/* Delete button */}
                <button
                  onClick={(e) => handleDeleteGoal(goal.id, goal.title, e)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-405 hover:text-rose-605 dark:bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Xóa mục tiêu"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="space-y-3">
                  <div className="flex items-start justify-between pr-6">
                    <h3 className="text-xs font-black text-slate-855 dark:text-white line-clamp-1">{goal.title}</h3>
                  </div>

                  {goal.description && (
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 line-clamp-2">{goal.description}</p>
                  )}

                  {/* Targets count list summary */}
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-650 dark:text-indigo-400">
                    <CheckSquare className="w-3 h-3" />
                    <span>{goal.targets.length} targets ({goal.targets.filter(t => getTargetProgress(t) === 100).length} done)</span>
                  </div>
                </div>

                {/* Progress bar and Footer */}
                <div className="mt-5 space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-450">
                      <span>Progress</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-550 ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Collapsible Key Results list */}
                  {goal.targets.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-800/40 pt-2 select-text" onClick={e => e.stopPropagation()}>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedGoalIds(prev => prev.includes(goal.id) ? prev.filter(id => id !== goal.id) : [...prev, goal.id]);
                        }}
                        className="text-[9.5px] font-black text-slate-500 dark:text-slate-400 hover:text-indigo-650 flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronRight className={`w-3 h-3 transition-transform ${expandedGoalIds.includes(goal.id) ? 'rotate-90' : ''}`} />
                        <span>{expandedGoalIds.includes(goal.id) ? 'Ẩn mục tiêu con' : 'Xem mục tiêu con'}</span>
                      </button>
                      
                      <AnimatePresence>
                        {expandedGoalIds.includes(goal.id) && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mt-2 space-y-1 pl-3 border-l border-slate-200/50 dark:border-slate-800/50"
                          >
                            {goal.targets.map(target => {
                              const p = getTargetProgress(target);
                              return (
                                <div key={target.id} className="flex items-center justify-between text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                                  <span className="truncate max-w-[70%]">{target.title}</span>
                                  <span className={p === 100 ? "text-emerald-500 font-extrabold" : "text-indigo-500"}>
                                    {p === 100 ? "Xong" : `${p}%`}
                                  </span>
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Owner & Due Date */}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      {owner ? (
                        <>
                          <SignedImage filePath={owner.avatar} alt={owner.name} className="w-4.5 h-4.5 rounded-full" />
                          <span className="text-[9px] font-bold text-slate-500">{owner.name}</span>
                        </>
                      ) : (
                        <>
                          <div className="w-4.5 h-4.5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <UserIcon className="w-2.5 h-2.5 text-slate-450" />
                          </div>
                          <span className="text-[9px] font-bold text-slate-400">—</span>
                        </>
                      )}
                    </div>

                    {goal.dueDate && (
                      <div className="flex items-center gap-1 text-slate-450 text-[9px] font-semibold">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Due: {new Date(goal.dueDate).toLocaleDateString('vi-VN')}</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Goal Details & Targets panel */}
      <AnimatePresence>
        {selectedGoal && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-[70] p-4 animate-fadeIn">
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-lg rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/60 dark:border-slate-800 shadow-2xl p-6 overflow-hidden backdrop-blur-xl space-y-4 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-500" />
                  <div>
                    <h3 className="text-xs font-black text-slate-855 dark:text-white line-clamp-1">{selectedGoal.title}</h3>
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Goal Target Dashboard</span>
                  </div>
                </div>
                <button 
                  onClick={() => { setSelectedGoal(null); setShowAddTargetForm(false); }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedGoal.description && (
                <p className="text-[10.5px] font-semibold text-slate-505 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-150/40 dark:border-slate-800/30">
                  {selectedGoal.description}
                </p>
              )}

              {/* Targets List */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-450">Key Results & Targets</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAiSuggestKeyResults}
                      disabled={isAiGenerating}
                      className="text-[9px] font-black text-indigo-600 hover:text-indigo-850 flex items-center gap-1 cursor-pointer bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-lg border border-indigo-200/60"
                      title="Gợi ý Key Results bằng Gemini AI"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isAiGenerating ? 'animate-spin' : ''}`} />
                      <span>{isAiGenerating ? 'AI đang tạo...' : 'AI Key Results'}</span>
                    </button>
                    {!showAddTargetForm && (
                      <button
                        onClick={() => setShowAddTargetForm(true)}
                        className="text-[9px] font-black text-indigo-600 hover:text-indigo-850 flex items-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Add Target
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline form to add target */}
                {showAddTargetForm && (
                  <form onSubmit={handleAddTarget} className="p-3 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 animate-fadeIn">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase tracking-wider text-indigo-650">New Key Result Target</span>
                      <button type="button" onClick={() => setShowAddTargetForm(false)} className="text-[9px] text-slate-400 hover:text-slate-600 cursor-pointer">Hủy</button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-400">Target Title</label>
                      <input 
                        type="text" 
                        value={newTargetTitle} 
                        onChange={e => setNewTargetTitle(e.target.value)}
                        className="w-full text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 outline-none focus:border-indigo-500"
                        placeholder="e.g. Complete audit document"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-slate-400">Target Type</label>
                        <select
                          value={newTargetType}
                          onChange={e => setNewTargetType(e.target.value as any)}
                          className="w-full text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 outline-none cursor-pointer"
                        >
                          <option value="boolean">Yes / No Completion</option>
                          <option value="number">Numeric Tracker</option>
                          <option value="task">Linked Task Completed</option>
                        </select>
                      </div>

                      {newTargetType === 'number' && (
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase text-slate-400">Goal Target Value</label>
                          <input 
                            type="number" 
                            min={1}
                            value={newTargetValue}
                            onChange={e => setNewTargetValue(Number(e.target.value) || 100)}
                            className="w-full text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 outline-none"
                          />
                        </div>
                      )}

                      {newTargetType === 'task' && (
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase text-slate-400">Choose Task</label>
                          <select
                            value={newTargetTaskId}
                            onChange={e => setNewTargetTaskId(e.target.value)}
                            className="w-full text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 outline-none truncate cursor-pointer"
                            required
                          >
                            <option value="">— Select Task —</option>
                            {linkableTasks.map(t => (
                              <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-1.5 rounded-xl text-xs font-black text-white shadow-sm hover:brightness-105 transition-all cursor-pointer text-center"
                      style={{ background: 'linear-gradient(135deg, var(--avaxa-gradient-start), var(--avaxa-gradient-end))' }}
                    >
                      Add Target
                    </button>
                  </form>
                )}

                {/* List targets */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {selectedGoal.targets.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic py-4 text-center">No targets defined for this goal yet.</p>
                  ) : (
                    selectedGoal.targets.map(target => {
                      const pct = getTargetProgress(target);
                      const isComplete = pct === 100;

                      return (
                        <div 
                          key={target.id}
                          className="flex items-center justify-between p-3 rounded-2xl border border-slate-150/70 dark:border-slate-800/85 bg-slate-50/30 dark:bg-slate-950/20 gap-3 text-left"
                        >
                          <div className="flex-1 space-y-1 min-w-0">
                            <span className="text-[10.5px] font-bold text-slate-755 dark:text-slate-200 block truncate leading-tight">
                              {target.title}
                            </span>
                            <div className="flex items-center gap-1.5 text-[8.5px] font-black uppercase text-indigo-500/80">
                              <span>{target.type}</span>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span className={isComplete ? 'text-emerald-500' : 'text-slate-400'}>{pct}% completed</span>
                            </div>
                          </div>

                          {/* Control Input */}
                          <div className="flex items-center gap-2 shrink-0">
                            {target.type === 'boolean' && (
                              <button 
                                type="button"
                                onClick={() => handleUpdateTargetValue(target.id, !target.completed)}
                                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${target.completed ? 'bg-emerald-500 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'}`}
                              >
                                {target.completed && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                              </button>
                            )}

                            {target.type === 'number' && (
                              <div className="flex items-center gap-1 text-[10px] font-bold">
                                <input 
                                  type="number"
                                  min={0}
                                  max={target.targetValue}
                                  value={target.currentValue || 0}
                                  onChange={e => handleUpdateTargetValue(target.id, Number(e.target.value))}
                                  className="w-12 px-1.5 py-0.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-center text-[10px] font-bold"
                                />
                                <span className="text-slate-400">/ {target.targetValue}</span>
                              </div>
                            )}

                            {target.type === 'task' && (
                              <div className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 uppercase tracking-wide">
                                {tasks.find(t => t.id === target.taskId)?.status === 'completed' ? 'Task Completed' : 'Task Active'}
                              </div>
                            )}

                            <button
                              onClick={() => handleRemoveTarget(target.id, target.title)}
                              className="p-1 hover:bg-rose-50 text-slate-405 hover:text-rose-605 rounded-lg transition-colors cursor-pointer"
                              title="Delete target"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Progress Summary */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black">
                  <span className="text-slate-450">OVERALL OBJECTIVE PROGRESS</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{getGoalProgress(selectedGoal)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-805 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${getGoalProgress(selectedGoal)}%` }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Goal Modal */}
      <AnimatePresence>
        {showCreateGoalModal && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-[70] p-4 animate-fadeIn">
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-sm rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/60 dark:border-slate-800 shadow-2xl p-6 overflow-hidden backdrop-blur-xl space-y-4 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-855 dark:text-white flex items-center gap-1.5">
                  <Target className="w-4.5 h-4.5 text-indigo-500 animate-pulse" />
                  Create Goal (Objective)
                </h3>
                <button 
                  type="button" 
                  onClick={() => setShowCreateGoalModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateGoal} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Goal Title</label>
                  <input 
                    type="text" 
                    value={newGoalTitle} 
                    onChange={e => setNewGoalTitle(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-805 dark:text-slate-100 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-colors" 
                    placeholder="e.g. Q3 Marketing Launch"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Description</label>
                  <textarea 
                    value={newGoalDesc} 
                    onChange={e => setNewGoalDesc(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-805 dark:text-slate-100 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-colors resize-none h-16" 
                    placeholder="Describe target details..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Owner</label>
                    <select 
                      value={newGoalOwnerId}
                      onChange={e => setNewGoalOwnerId(e.target.value)}
                      className="w-full text-xs font-semibold text-slate-705 dark:text-slate-350 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 outline-none cursor-pointer"
                    >
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Due Date</label>
                    <input 
                      type="date" 
                      value={newGoalDueDate}
                      onChange={e => setNewGoalDueDate(e.target.value)}
                      className="w-full text-xs font-semibold text-slate-705 dark:text-slate-350 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 outline-none cursor-pointer" 
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    type="button" 
                    onClick={() => setShowCreateGoalModal(false)}
                    className="flex-1 py-2 rounded-xl border border-slate-250 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-bold text-slate-550 dark:text-slate-400 cursor-pointer text-center transition-colors"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-2 rounded-xl text-xs font-black text-white shadow-md hover:shadow-indigo-500/20 active:shadow-none transition-all hover:brightness-105 cursor-pointer text-center"
                    style={{ background: 'linear-gradient(135deg, var(--avaxa-gradient-start), var(--avaxa-gradient-end))' }}
                  >
                    Tạo mục tiêu
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
