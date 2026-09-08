"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  CheckSquare, 
  Plus, 
  Calendar, 
  User as UserIcon, 
  Flag, 
  Tag, 
  Paperclip, 
  Sparkles, 
  Bot, 
  Layers, 
  Clock, 
  Maximize2, 
  Minimize2, 
  Check, 
  Trash2, 
  Folder, 
  ListTodo, 
  BarChart3, 
  SlidersHorizontal,
  ChevronDown,
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Quote,
  Flame,
  Star,
  DollarSign,
  AlignLeft,
  RefreshCw,
  HelpCircle,
  FolderOpen,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react';
import { Task, TaskStatus, Priority, User, Space, Workspace, SubTask } from '../../types';
import { PriorityPillSelect, StatusPillSelect, AssigneePillSelect, PremiumDatePicker, DropdownFieldSelect, LabelsFieldSelect } from './TaskSelects';
import { Select } from '../ui/Select';
import NotionDocEditor from './NotionDocEditor';
import SignedImage from '../SignedImage';
import { callAiApi, generateSubtasksWithAi, autofillTaskWithAi } from '@/lib/aiClient';
import { useTranslation } from '../../contexts/TranslationContext';
import { getColorOption, COLOR_PALETTE } from '../../utils/fieldConfig';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

export interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress'> & { progress?: number }, createAnother?: boolean) => void;
  spaces?: Space[];
  activeSpaceId?: string | null;
  activeListId?: string | null;
  members: User[];
  customFields?: any[];
  activeWorkspaceId?: string;
  initialData?: Partial<Task>;
}

export default function TaskModal({
  isOpen,
  onClose,
  onSave,
  spaces = [],
  activeSpaceId,
  activeListId,
  members = [],
  customFields = [],
  activeWorkspaceId,
  initialData
}: TaskModalProps) {
  const { isVietnamese } = useTranslation();

  // Core Form State
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [status, setStatus] = useState<TaskStatus>(initialData?.status || 'todo');
  const [priority, setPriority] = useState<Priority>(initialData?.priority || 'medium');
  const [assigneeIds, setAssigneeIds] = useState<string[]>(initialData?.assigneeIds?.length ? initialData.assigneeIds : initialData?.assigneeId ? [initialData.assigneeId] : []);
  const [spaceId, setSpaceId] = useState<string>(initialData?.spaceId || activeSpaceId || (spaces[0]?.id || ''));
  const [listId, setListId] = useState<string | null>(initialData?.listId || activeListId || null);
  const [startDate, setStartDate] = useState<string>(initialData?.startDate || '');
  const [dueDate, setDueDate] = useState<string>(initialData?.dueDate || '');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [progress, setProgress] = useState<number>(initialData?.progress || 0);
  const [hoursEstimate, setHoursEstimate] = useState<string>(initialData?.hoursEstimate !== undefined ? String(initialData.hoursEstimate) : '');
  const [hoursLogged, setHoursLogged] = useState<string>(initialData?.hoursLogged !== undefined ? String(initialData.hoursLogged) : '');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'none' | 'daily' | 'weekly' | 'monthly'>(initialData?.recurrence?.frequency || 'none');
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(Math.max(1, initialData?.recurrence?.interval || 1));
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>(initialData?.custom_fields || {});

  // Subtasks & Checklist State
  const [subtasks, setSubtasks] = useState<SubTask[]>(initialData?.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);

  // UI Enhancements State - properties sidebar collapsed by default ("sidebar không hiện ra sẵn")
  const [isExpanded, setIsExpanded] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isAutofillingAi, setIsAutofillingAi] = useState(false);
  const [aiAutofillHint, setAiAutofillHint] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [validationError, setValidationError] = useState('');

  const titleInputRef = useRef<HTMLInputElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  // Reset every field on each open so data from a previous task can never leak into a new task.
  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!justOpened) return;
    const nextSpaceId = initialData?.spaceId || activeSpaceId || spaces[0]?.id || '';
    const nextSpace = spaces.find(space => space.id === nextSpaceId);
    const requestedListId = initialData?.listId || activeListId || null;
    const nextListId = requestedListId && nextSpace?.lists?.some(list => list.id === requestedListId)
      ? requestedListId
      : nextSpace?.lists?.[0]?.id || null;

    setTitle(initialData?.title || '');
    setDescription(initialData?.description || '');
    setStatus(initialData?.status || 'todo');
    setPriority(initialData?.priority || 'medium');
    setAssigneeIds(initialData?.assigneeIds?.length ? initialData.assigneeIds : initialData?.assigneeId ? [initialData.assigneeId] : []);
    setSpaceId(nextSpaceId);
    setListId(nextListId);
    setStartDate(initialData?.startDate || '');
    setDueDate(initialData?.dueDate || '');
    setTags(initialData?.tags || []);
    setProgress(initialData?.progress || 0);
    setHoursEstimate(initialData?.hoursEstimate !== undefined ? String(initialData.hoursEstimate) : '');
    setHoursLogged(initialData?.hoursLogged !== undefined ? String(initialData.hoursLogged) : '');
    setRecurrenceFrequency(initialData?.recurrence?.frequency || 'none');
    setRecurrenceInterval(Math.max(1, initialData?.recurrence?.interval || 1));
    setCustomFieldValues(initialData?.custom_fields || {});
    setSubtasks(initialData?.subtasks || []);
    setNewSubtaskTitle('');
    setNewTagInput('');
    setShowTagInput(false);
    setValidationError('');
    setAiAutofillHint(null);

    const focusTimer = window.setTimeout(() => titleInputRef.current?.focus(), 100);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen, initialData, activeSpaceId, activeListId, spaces]);

  // Current Space & Lists Resolution
  const selectedSpace = useMemo(() => {
    return spaces.find(s => s.id === spaceId) || spaces[0] || null;
  }, [spaces, spaceId]);

  const activeSpaceCustomFields = useMemo(() => {
    if (selectedSpace?.customFields && selectedSpace.customFields.length > 0) {
      return selectedSpace.customFields;
    }
    return customFields;
  }, [selectedSpace, customFields]);

  // Submit Handler
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setValidationError(isVietnamese ? 'Vui lòng nhập tên công việc.' : 'Please enter a task title.');
      titleInputRef.current?.focus();
      return;
    }

    if (startDate && dueDate && new Date(dueDate).getTime() < new Date(startDate).getTime()) {
      setValidationError(isVietnamese ? 'Hạn hoàn thành phải sau hoặc bằng ngày bắt đầu.' : 'Due date must be on or after the start date.');
      return;
    }

    setValidationError('');
    const primaryAssigneeId = assigneeIds[0] || undefined;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assigneeId: primaryAssigneeId,
      assigneeIds,
      spaceId: spaceId || undefined,
      listId: listId || undefined,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      tags,
      progress,
      hoursEstimate: hoursEstimate === '' ? undefined : Math.max(0, Number(hoursEstimate) || 0),
      hoursLogged: hoursLogged === '' ? undefined : Math.max(0, Number(hoursLogged) || 0),
      recurrence: recurrenceFrequency === 'none' ? undefined : {
        frequency: recurrenceFrequency,
        interval: Math.max(1, recurrenceInterval)
      },
      custom_fields: customFieldValues,
      subtasks
    };

    onSave(payload, createAnother);

    if (createAnother) {
      // Reset form for next entry
      setTitle('');
      setDescription('');
      setSubtasks([]);
      setNewSubtaskTitle('');
      setTags([]);
      setProgress(0);
      setHoursEstimate('');
      setHoursLogged('');
      setRecurrenceFrequency('none');
      setRecurrenceInterval(1);
      setCustomFieldValues({});
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
    } else {
      onClose();
    }
  }, [title, description, status, priority, assigneeIds, spaceId, listId, startDate, dueDate, tags, progress, hoursEstimate, hoursLogged, recurrenceFrequency, recurrenceInterval, customFieldValues, subtasks, createAnother, onSave, onClose, isVietnamese]);

  useEffect(() => {
    if (subtasks.length === 0) return;
    const completed = subtasks.filter(subtask => subtask.completed).length;
    setProgress(Math.round((completed / subtasks.length) * 100));
  }, [subtasks]);

  // Handle Keyboard Shortcuts (Escape to close, Ctrl/Cmd + Enter to submit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleSubmit, onClose]);

  // Subtask Handlers
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: SubTask = {
      id: `st-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      completed: false
    };
    setSubtasks(prev => [...prev, newSub]);
    setNewSubtaskTitle('');
  };

  const handleAiGenerateSubtasks = async () => {
    if (!title.trim()) {
      titleInputRef.current?.focus();
      return;
    }

    try {
      setIsGeneratingSubtasks(true);
      const generated = await generateSubtasksWithAi(title.trim(), description.trim());
      if (generated && generated.length > 0) {
        const newSubs: SubTask[] = generated.map((t, idx) => ({
          id: `st-ai-${Date.now()}-${idx}`,
          title: t,
          completed: false
        }));
        setSubtasks(prev => [...prev, ...newSubs]);
      }
    } catch (err) {
      console.error('Failed to generate subtasks with AI:', err);
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  const handleToggleSubtask = (stId: string) => {
    setSubtasks(prev => prev.map(st => st.id === stId ? { ...st, completed: !st.completed } : st));
  };

  const handleDeleteSubtask = (stId: string) => {
    setSubtasks(prev => prev.filter(st => st.id !== stId));
  };

  // Tag Handlers
  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const cleanTag = newTagInput.trim();
    if (!tags.includes(cleanTag)) {
      setTags(prev => [...prev, cleanTag]);
    }
    setNewTagInput('');
    setShowTagInput(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  // AI Smart Autofill Handler
  const handleSmartAutofill = async () => {
    if (!title.trim()) {
      titleInputRef.current?.focus();
      return;
    }

    try {
      setIsAutofillingAi(true);
      setAiAutofillHint(null);

      const currentSpace = spaces.find(s => s.id === spaceId);
      const res = await autofillTaskWithAi({
        title: title.trim(),
        currentDescription: description.trim(),
        spaceName: currentSpace?.name
      });

      if (res) {
        // 1. Priority
        if (res.suggestedPriority) {
          setPriority(res.suggestedPriority);
        }

        // 2. Hours Estimate (fill if currently empty or 0)
        if (res.suggestedHoursEstimate && (!hoursEstimate || hoursEstimate === '0')) {
          setHoursEstimate(String(res.suggestedHoursEstimate));
        }

        // 3. Tags (merge without duplicates)
        if (Array.isArray(res.suggestedTags) && res.suggestedTags.length > 0) {
          setTags(prev => Array.from(new Set([...prev, ...res.suggestedTags])));
        }

        // 4. Subtasks (append)
        if (Array.isArray(res.suggestedSubtasks) && res.suggestedSubtasks.length > 0) {
          const newSubs: SubTask[] = res.suggestedSubtasks.map((stTitle, idx) => ({
            id: `st-ai-autofill-${Date.now()}-${idx}`,
            title: stTitle,
            completed: false
          }));
          setSubtasks(prev => [...prev, ...newSubs]);
        }

        // 5. Enhanced description
        if (res.enhancedDescription) {
          if (!description.trim()) {
            setDescription(res.enhancedDescription);
          } else {
            setDescription(prev => `${prev}\n\n${res.enhancedDescription}`);
          }
        }

        // 6. User feedback hint
        const priorityLabels: Record<string, string> = {
          urgent: isVietnamese ? 'Khẩn cấp' : 'Urgent',
          high: isVietnamese ? 'Cao' : 'High',
          medium: isVietnamese ? 'Trung bình' : 'Medium',
          low: isVietnamese ? 'Thấp' : 'Low'
        };
        const prioText = priorityLabels[res.suggestedPriority] || res.suggestedPriority;
        setAiAutofillHint(
          isVietnamese
            ? `AI đã điền: Ưu tiên ${prioText} (${res.priorityReason}), ước lượng ${res.suggestedHoursEstimate}h, thêm ${res.suggestedTags.length} thẻ & ${res.suggestedSubtasks.length} việc con.`
            : `AI Autofilled: Priority ${prioText} (${res.priorityReason}), ${res.suggestedHoursEstimate}h, ${res.suggestedTags.length} tags & ${res.suggestedSubtasks.length} subtasks.`
        );
      }
    } catch (err: any) {
      console.error('Smart autofill error:', err);
      setAiAutofillHint(
        isVietnamese
          ? `Không thể phân tích bằng AI: ${err.message || 'Vui lòng thử lại'}`
          : `AI Autofill error: ${err.message || 'Please try again'}`
      );
    } finally {
      setIsAutofillingAi(false);
    }
  };

  // AI Description Generator
  const handleGenerateWithAi = async () => {
    if (!title.trim()) {
      titleInputRef.current?.focus();
      return;
    }

    try {
      setIsGeneratingAi(true);
      const res = await callAiApi('/api/ai/chat', {
        message: `Viết mô tả công việc chi tiết chuyên nghiệp và 3-4 tiêu chí hoàn thành cho công việc: "${title}". Ngôn ngữ: Tiếng Việt, ngắn gọn, cấu trúc rõ ràng, theo chuẩn Agile/Scrum.`,
        history: []
      });
      
      if (res.ok) {
        const data = await res.json();
        const text = data.text || data.reply || '';
        if (text && text.trim()) {
          setDescription(prev => prev ? `${prev}\n\n${text.trim()}` : text.trim());
        }
      }
    } catch (err) {
      console.error('AI generation error:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Quick Description Formatting Tools
  const handleInsertFormat = (prefix: string, suffix: string = '') => {
    setDescription(prev => `${prev}${prefix}${suffix}`);
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 font-sans select-none">
        {/* Backdrop overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/65 backdrop-blur-md"
        />

        {/* Modal Window Container */}
        <motion.div 
          ref={modalContentRef}
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className={`relative z-10 w-full bg-white dark:bg-[#181818] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 ${
            isExpanded ? 'max-w-6xl h-[94vh]' : 'max-w-4xl max-h-[88vh]'
          }`}
          style={{ boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)' }}
        >
          {/* Top Decorative Gradient Accent Bar */}
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 shrink-0" />

          {/* Modal Header */}
          <div className="px-5 sm:px-6 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
            {/* Left Header Breadcrumbs & Status */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black shadow-xs shrink-0">
                <CheckSquare className="w-4 h-4" />
              </div>

              {/* Space Selector Pill */}
              <div className="flex items-center gap-1.5 text-xs">
                <Select
                  value={spaceId}
                  onChange={v => {
                    const nextSpace = spaces.find(space => space.id === v);
                    setSpaceId(v);
                    setListId(nextSpace?.lists?.[0]?.id || null);
                  }}
                  size="sm"
                  ariaLabel={isVietnamese ? 'Không gian' : 'Space'}
                  options={spaces.map(sp => ({ value: sp.id, label: `${sp.emoji ? `${sp.emoji} ` : '📁 '} ${sp.name}` }))}
                />

                {/* List selector within selected space if available */}
                {selectedSpace?.lists && selectedSpace.lists.length > 0 && (
                  <>
                    <span className="text-slate-400 font-bold">/</span>
                    <Select
                      value={listId || ''}
                      onChange={v => setListId(v || null)}
                      size="sm"
                      ariaLabel={isVietnamese ? 'Danh sách' : 'List'}
                      options={[{ value: '', label: isVietnamese ? '📋 Tất cả danh sách' : '📋 All Lists' }, ...selectedSpace.lists.map(lst => ({ value: lst.id, label: lst.name }))]}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Right Header Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <StatusPillSelect value={status} onChange={(value) => {
                const nextStatus = value || 'todo';
                setStatus(nextStatus);
                if (nextStatus === 'completed') setProgress(100);
              }} />

              <button
                type="button"
                onClick={() => setShowProperties(!showProperties)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none ${
                  showProperties
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-800/60 shadow-3xs'
                    : 'bg-slate-50 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
                title={showProperties ? (isVietnamese ? 'Thu gọn thuộc tính' : 'Collapse properties') : (isVietnamese ? 'Mở thuộc tính' : 'Expand properties')}
              >
                {showProperties ? <PanelRightClose className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline text-[11px] font-bold">
                  {showProperties ? (isVietnamese ? 'Thu gọn' : 'Collapse') : (isVietnamese ? 'Thuộc tính' : 'Properties')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title={isExpanded ? (isVietnamese ? 'Thu nhỏ' : 'Collapse') : (isVietnamese ? 'Phóng to' : 'Expand')}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title={isVietnamese ? 'Đóng (Esc)' : 'Close (Esc)'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Main Form Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col md:flex-row">
            
            {/* LEFT COLUMN: Title, Description, Subtasks, AI Assistant */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-5">
              
              {/* Task Title Input & AI Smart Autofill */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <input
                    ref={titleInputRef}
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={isVietnamese ? 'Tên công việc cần thực hiện...' : 'Task title or objective...'}
                    className="w-full text-base sm:text-lg font-black text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 focus:border-none p-0 leading-tight"
                  />
                  <button
                    type="button"
                    onClick={handleSmartAutofill}
                    disabled={isAutofillingAi || !title.trim()}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 hover:from-indigo-500/20 hover:via-purple-500/20 hover:to-pink-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60 text-xs font-bold transition-all shadow-3xs hover:shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title={isVietnamese ? 'AI tự động phân tích tiêu đề, điền độ ưu tiên, ước lượng giờ, gắn tag, việc con và mô tả' : 'AI Smart Autofill'}
                  >
                    {isAutofillingAi ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                        <span className="hidden sm:inline">{isVietnamese ? 'Đang phân tích...' : 'Analyzing...'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{isVietnamese ? 'AI Điền thông minh' : 'Smart Autofill'}</span>
                      </>
                    )}
                  </button>
                </div>

                {aiAutofillHint && (
                  <motion.div 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-gradient-to-r from-indigo-50/90 to-purple-50/90 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200/60 dark:border-indigo-800/50 text-[11px] text-indigo-900 dark:text-indigo-200 font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      <span>{aiAutofillHint}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setAiAutofillHint(null)}
                      className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                )}

                {validationError && (
                  <p role="alert" className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    {validationError}
                  </p>
                )}
              </div>

              {/* Quick Properties Strip when right sidebar is collapsed */}
              {!showProperties && (
                <div className="flex flex-wrap items-center gap-2 p-2 px-3 rounded-2xl bg-slate-50/90 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] shadow-3xs">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-0.5 hidden sm:inline select-none">
                    {isVietnamese ? 'Thuộc tính:' : 'Properties:'}
                  </span>

                  <PriorityPillSelect value={priority} onChange={(v) => setPriority(v || 'medium')} />

                  <AssigneePillSelect
                    value={assigneeIds}
                    members={members}
                    onChange={(ids) => setAssigneeIds(ids || [])}
                  />

                  <PremiumDatePicker
                    startDateValue={startDate}
                    onStartDateChange={(val) => setStartDate(val || '')}
                    dateValue={dueDate}
                    onChange={(val) => setDueDate(val || '')}
                    label={isVietnamese ? 'Hạn chót' : 'Due date'}
                    align="left"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium cursor-pointer border border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all ${dueDate ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/50 dark:bg-indigo-950/30' : 'text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900'}`}
                  />

                  {recurrenceFrequency !== 'none' ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 text-xs font-semibold shadow-3xs">
                      <RefreshCw className="w-3 h-3 text-purple-500 animate-spin-slow" />
                      <span>
                        {recurrenceFrequency === 'daily' ? (isVietnamese ? 'Hằng ngày' : 'Daily') :
                         recurrenceFrequency === 'weekly' ? (isVietnamese ? 'Hằng tuần' : 'Weekly') :
                         (isVietnamese ? 'Hằng tháng' : 'Monthly')}
                        {recurrenceInterval > 1 ? ` (${recurrenceInterval})` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRecurrenceFrequency('none')}
                        className="ml-0.5 p-0.5 text-purple-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full transition-colors cursor-pointer"
                        title={isVietnamese ? 'Bỏ lặp lại' : 'Remove recurrence'}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRecurrenceFrequency('daily')}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-medium text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 border border-dashed border-slate-200/80 dark:border-slate-800 hover:border-purple-300 transition-all cursor-pointer"
                      title={isVietnamese ? 'Bật lặp lại hằng ngày' : 'Set daily recurrence'}
                    >
                      <RefreshCw className="w-3 h-3 text-purple-400" />
                      <span className="hidden md:inline">{isVietnamese ? '+ Lặp lại' : '+ Repeat'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowProperties(true)}
                    className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer select-none"
                    title={isVietnamese ? 'Mở bảng thuộc tính chi tiết' : 'Open full properties'}
                  >
                    <PanelRightOpen className="w-3.5 h-3.5" />
                    <span>{isVietnamese ? 'Mở thuộc tính' : 'All properties'}</span>
                  </button>
                </div>
              )}

              {/* Subtasks / Checklist Builder Section */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    <ListTodo className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{isVietnamese ? 'Danh sách công việc con (Checklist)' : 'Subtasks & Checklist'}</span>
                    {subtasks.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500">
                        {subtasks.filter(s => s.completed).length}/{subtasks.length}
                      </span>
                    )}
                  </div>

                  {/* AI Subtasks Generation Button */}
                  <button
                    type="button"
                    disabled={isGeneratingSubtasks}
                    onClick={handleAiGenerateSubtasks}
                    className="px-2 py-1 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-3xs"
                  >
                    {isGeneratingSubtasks ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                        <span>Đang tạo...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        <span>{isVietnamese ? 'Gợi ý việc con bằng AI' : 'AI Subtasks'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Subtasks List */}
                {subtasks.length > 0 && (
                  <div className="space-y-1.5">
                    {subtasks.map((st) => (
                      <div 
                        key={st.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => handleToggleSubtask(st.id)}
                            className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              st.completed 
                                ? 'bg-indigo-600 border-indigo-600 text-white' 
                                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
                            }`}
                          >
                            {st.completed && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                          <span className={`text-xs font-semibold truncate ${st.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                            {st.title}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteSubtask(st.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded transition-opacity cursor-pointer shrink-0"
                          title="Xóa mục"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Subtask Input */}
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-dashed border-slate-200/80 dark:border-white/[0.08] focus-within:border-indigo-500 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:border-solid focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all shadow-3xs">
                  <div className="w-5 h-5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Plus className="w-3 h-3" />
                  </div>
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                    placeholder={isVietnamese ? 'Thêm mục kiểm tra con (nhấn Enter)...' : 'Add checklist item (press Enter)...'}
                    className="flex-1 text-xs font-medium text-slate-800 dark:text-slate-100 bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 focus:border-none p-0 placeholder:text-slate-400"
                  />
                  {newSubtaskTitle.trim() && (
                    <button
                      type="button"
                      onClick={handleAddSubtask}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      {isVietnamese ? 'Thêm' : 'Add'}
                    </button>
                  )}
                </div>
              </div>

              {/* Description Section with Notion Doc Editor (At the bottom) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
                      {isVietnamese ? 'Mô tả & tiêu chí nghiệm thu' : 'Description & acceptance criteria'}
                    </p>
                    <p className="text-[9px] font-medium text-slate-400">
                      {isVietnamese ? 'Soạn thảo dạng tài liệu, hỗ trợ khối nội dung.' : 'Rich document editing with content blocks.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isGeneratingAi || !title.trim()}
                    onClick={handleGenerateWithAi}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200/70 bg-indigo-50 px-2.5 py-1.5 text-[10px] font-black text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-300"
                  >
                    {isGeneratingAi ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {isGeneratingAi ? (isVietnamese ? 'Đang viết…' : 'Writing…') : (isVietnamese ? 'AI viết mô tả' : 'Write with AI')}
                  </button>
                </div>
                <NotionDocEditor
                  value={description}
                  onChange={setDescription}
                  placeholder={isVietnamese ? 'Thêm ghi chú, hướng dẫn thực hiện, tiêu chí nghiệm thu...' : 'Add details, instructions, acceptance criteria...'}
                  taskTitle={title}
                />
              </div>
            </div>

            {/* RIGHT COLUMN: Attributes Panel & Custom Fields */}
            <AnimatePresence initial={false}>
              {showProperties && (
                <motion.div 
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 340, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="w-full md:w-[320px] lg:w-[340px] bg-slate-50/60 dark:bg-slate-900/30 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800/80 p-5 space-y-4 overflow-y-auto custom-scrollbar shrink-0 overflow-x-hidden"
                >
                  <div className="w-full min-w-[280px] space-y-4">
                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-1.5 select-none">
                      <div className="flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3 h-3 text-indigo-500" />
                        <span>{isVietnamese ? 'Thuộc tính công việc' : 'Task Properties'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowProperties(false)}
                        className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
                        title={isVietnamese ? 'Thu gọn thuộc tính' : 'Collapse properties'}
                      >
                        <PanelRightClose className="w-3.5 h-3.5" />
                      </button>
                    </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  {isVietnamese ? 'Mức ưu tiên' : 'Priority'}
                </label>
                <PriorityPillSelect value={priority} onChange={(v) => setPriority(v || 'medium')} />
              </div>

              {/* Assignee */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  {isVietnamese ? 'Người phụ trách' : 'Assignee'}
                </label>
                <AssigneePillSelect
                  members={members.filter(m => !activeWorkspaceId || m.workspaceIds?.includes(activeWorkspaceId))}
                  value={assigneeIds}
                  onChange={(value) => setAssigneeIds(value || [])}
                />
                <p className="text-[9px] font-medium text-slate-400">
                  {isVietnamese ? 'Có thể chọn nhiều người phụ trách.' : 'Multiple assignees are supported.'}
                </p>
              </div>

              {/* Time estimate and recurrence */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isVietnamese ? 'Ước tính & thời gian đã làm' : 'Estimate & logged time'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="relative">
                    <Clock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={hoursEstimate}
                      onChange={event => setHoursEstimate(event.target.value)}
                      placeholder={isVietnamese ? 'Ước tính (giờ)' : 'Estimate (hours)'}
                      className="w-full rounded-xl border border-slate-200/90 bg-white py-2 pl-8 pr-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 shadow-3xs placeholder:text-slate-400"
                    />
                  </label>
                  <label className="relative">
                    <BarChart3 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={hoursLogged}
                      onChange={event => setHoursLogged(event.target.value)}
                      placeholder={isVietnamese ? 'Đã làm (giờ)' : 'Logged (hours)'}
                      className="w-full rounded-xl border border-slate-200/90 bg-white py-2 pl-8 pr-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 shadow-3xs placeholder:text-slate-400"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {isVietnamese ? 'Lặp lại công việc' : 'Task recurrence'}
                  </label>
                  {recurrenceFrequency !== 'none' && (
                    <button
                      type="button"
                      onClick={() => setRecurrenceFrequency('none')}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer"
                    >
                      {isVietnamese ? 'Bỏ lặp lại' : 'Remove'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-[1fr_88px] gap-2">
                  <Select
                    value={recurrenceFrequency}
                    onChange={v => setRecurrenceFrequency(v)}
                    className="w-full"
                    size="sm"
                    ariaLabel={isVietnamese ? 'Tần suất lặp lại' : 'Recurrence frequency'}
                    options={[
                      { value: 'none', label: isVietnamese ? 'Không lặp lại' : 'Does not repeat' },
                      { value: 'daily', label: isVietnamese ? 'Hằng ngày' : 'Daily' },
                      { value: 'weekly', label: isVietnamese ? 'Hằng tuần' : 'Weekly' },
                      { value: 'monthly', label: isVietnamese ? 'Hằng tháng' : 'Monthly' },
                    ]}
                  />
                  <input
                    type="number"
                    min="1"
                    max="365"
                    disabled={recurrenceFrequency === 'none'}
                    value={recurrenceInterval}
                    onChange={event => setRecurrenceInterval(Math.max(1, Number(event.target.value) || 1))}
                    aria-label={isVietnamese ? 'Chu kỳ lặp' : 'Repeat interval'}
                    className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-center text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 transition-all shadow-3xs"
                  />
                </div>
              </div>

              {/* Start & Due Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  {isVietnamese ? 'Thời hạn thực hiện' : 'Dates & Timeline'}
                </label>
                <PremiumDatePicker
                  startDateValue={startDate}
                  onStartDateChange={(val) => setStartDate(val || '')}
                  dateValue={dueDate}
                  onChange={(val) => setDueDate(val || '')}
                  label={isVietnamese ? 'Thời hạn' : 'Dates'}
                  align="left"
                  taskId={initialData?.id}
                  taskTitle={title}
                  className="w-full"
                />
              </div>

              {/* Progress Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <span>{isVietnamese ? 'Tiến độ' : 'Progress'}</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-black">{progress}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={e => setProgress(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>

              {/* Tags / Labels Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {isVietnamese ? 'Thẻ nhãn (Tags)' : 'Tags'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTagInput(!showTagInput)}
                    className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isVietnamese ? 'Thêm nhãn' : 'Add tag'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {tags.map(tag => (
                    <span 
                      key={tag} 
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200/50 dark:border-indigo-800/50 shadow-3xs"
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-rose-500 cursor-pointer ml-0.5"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                {showTagInput && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={e => setNewTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Tên nhãn mới..."
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-200/90 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 font-bold text-slate-800 dark:text-slate-100 transition-all shadow-3xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-all shadow-2xs"
                    >
                      Lưu
                    </button>
                  </div>
                )}
              </div>

              {/* Dynamic Custom Fields Section */}
              {activeSpaceCustomFields.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center justify-between">
                    <span>{isVietnamese ? 'Trường tùy chỉnh Space' : 'Custom Fields'}</span>
                    <span className="text-[9px] text-slate-400 font-semibold">{activeSpaceCustomFields.length}</span>
                  </div>

                  <div className="space-y-3">
                    {activeSpaceCustomFields.map(field => {
                      const curVal = customFieldValues[field.name];

                      return (
                        <div key={field.id || field.name} className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block truncate">
                            {field.name}
                          </label>

                          {/* Render type-specific input */}
                          {field.type === 'checkbox' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomFieldValues(prev => ({
                                  ...prev,
                                  [field.name]: curVal === 'true' || curVal === true ? 'false' : 'true'
                                }));
                              }}
                              className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-2 transition-all text-xs font-bold cursor-pointer ${
                                curVal === 'true' || curVal === true
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500'
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${curVal === 'true' || curVal === true ? 'bg-white text-indigo-600 border-white' : 'border-slate-400'}`}>
                                {(curVal === 'true' || curVal === true) && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                              <span>{field.checkboxLabel || (curVal === 'true' || curVal === true ? 'Bật' : 'Tắt')}</span>
                            </button>
                          ) : field.type === 'rating' ? (
                            <div className="flex items-center gap-1">
                              {Array.from({ length: field.ratingMax || 5 }).map((_, idx) => {
                                const starVal = idx + 1;
                                const isSelected = parseInt(String(curVal)) >= starVal;
                                return (
                                  <button
                                    key={starVal}
                                    type="button"
                                    onClick={() => {
                                      setCustomFieldValues(prev => ({
                                        ...prev,
                                        [field.name]: curVal === String(starVal) ? '' : String(starVal)
                                      }));
                                    }}
                                    className={`text-base cursor-pointer hover:scale-125 transition-transform ${
                                      isSelected ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700'
                                    }`}
                                  >
                                    ★
                                  </button>
                                );
                              })}
                            </div>
                          ) : field.type === 'dropdown' ? (
                            <DropdownFieldSelect
                              value={String(curVal || '')}
                              options={field.options || []}
                              fieldId={field.id}
                              onChange={newV => setCustomFieldValues(prev => ({ ...prev, [field.name]: newV }))}
                            />
                          ) : field.type === 'labels' ? (
                            <LabelsFieldSelect
                              value={String(curVal || '')}
                              options={field.options || []}
                              fieldId={field.id}
                              onChange={newV => setCustomFieldValues(prev => ({ ...prev, [field.name]: newV }))}
                            />
                          ) : field.type === 'money' ? (
                            <div className="relative flex items-center">
                              <span className="absolute left-2.5 text-xs font-bold text-slate-400">{field.currencySymbol || '$'}</span>
                              <input
                                type="text"
                                placeholder={field.placeholder || "0.00"}
                                value={String(curVal || '')}
                                onChange={e => setCustomFieldValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                                className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200/90 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 font-bold transition-all shadow-3xs"
                              />
                            </div>
                          ) : field.type === 'textarea' ? (
                            <textarea
                              rows={3}
                              placeholder={field.placeholder || '...'}
                              value={String(curVal || '')}
                              onChange={event => setCustomFieldValues(prev => ({ ...prev, [field.name]: event.target.value }))}
                              className="w-full resize-y rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 shadow-3xs"
                            />
                          ) : field.type === 'date' ? (
                            <input
                              type="date"
                              value={String(curVal || '')}
                              onChange={event => setCustomFieldValues(prev => ({ ...prev, [field.name]: event.target.value }))}
                              className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 shadow-3xs"
                            />
                          ) : (
                            <input
                              type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                              placeholder={field.placeholder || '...'}
                              value={String(curVal || '')}
                              onChange={e => setCustomFieldValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                              className="w-full px-3 py-1.5 text-xs border border-slate-200/90 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 font-medium transition-all shadow-3xs"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>

          {/* Modal Footer Bar */}
          <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between gap-3 shrink-0">
            
            {/* Left Footer: Create another toggle & Keyboard hint */}
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={createAnother}
                  onChange={e => setCreateAnother(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                  {isVietnamese ? 'Tạo & tiếp tục tạo việc khác' : 'Create & add another'}
                </span>
              </label>
            </div>

            {/* Right Footer: Cancel & Submit Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {isVietnamese ? 'Hủy bỏ' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!title.trim()}
                className={`px-5 py-2 rounded-xl text-xs font-black text-white flex items-center gap-1.5 transition-all shadow-md ${
                  title.trim()
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-650 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-95 shadow-indigo-500/25 cursor-pointer'
                    : 'bg-slate-300 dark:bg-slate-800 text-slate-500 pointer-events-none'
                }`}
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{isVietnamese ? 'Tạo công việc' : 'Create Task'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </Portal>
  );
}
