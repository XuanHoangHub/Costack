"use client";

import CustomFieldInput from "./CustomFieldInput";
import { applyCustomFieldDefaults, validateTaskCustomFields } from "@/lib/customFields";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CheckSquare,
  Plus,
  Sparkles,
  Clock,
  Check,
  Trash2,
  ListTodo,
  RefreshCw,
  Edit2,
  ChevronDown,
  ChevronRight,
  Tag,
  BarChart3,
  SlidersHorizontal,
  Timer,
  Pin,
  Flag,
  Repeat,
  Paperclip,
  Upload,
  FileText,
  Download,
  Bell,
  Link2,
  AlertCircle,
  FileUp,
  Boxes,
  LayoutTemplate,
  CheckCheck,
  Zap,
} from 'lucide-react';
import { Task, TaskStatus, Priority, User, Space, Workspace, SubTask, TaskAttachment } from '../../types';
import { PriorityPillSelect, StatusPillSelect, AssigneePillSelect, TeamPillSelect, PremiumDatePicker, DropdownFieldSelect, LabelsFieldSelect } from './TaskSelects';
import { getTaskTeamIds } from '@/lib/teamStore';
import { Select } from '../ui/Select';
import NotionDocEditor from './NotionDocEditor';
import SignedImage from '../SignedImage';
import { callAiApi, generateSubtasksWithAi, autofillTaskWithAi } from '@/lib/aiClient';
import { useTranslation } from '../../contexts/TranslationContext';
import { getColorOption, COLOR_PALETTE } from '../../utils/fieldConfig';
import { supabase } from '../../lib/supabaseClient';
import { ReminderOption, REMINDER_OPTIONS } from '@/lib/notificationManager';

// ── Portal Wrapper ──
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

// ── Quick Templates ──
interface QuickTemplate {
  id: string;
  nameVi: string;
  nameEn: string;
  icon: string;
  title: string;
  description: string;
  priority: Priority;
  tags: string[];
  hoursEstimate: string;
  subtasks: string[];
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: 'feature',
    nameVi: 'Tính năng mới',
    nameEn: 'New Feature',
    icon: '🚀',
    title: 'Tính năng: ',
    description: `### 🎯 Mục tiêu (Objective)\nMô tả tóm tắt tính năng và giá trị mang lại cho người dùng.\n\n### 📋 Tiêu chí nghiệm thu (Acceptance Criteria)\n- [ ] Giao diện trực quan, phản hồi tức thì\n- [ ] Hỗ trợ đa nền tảng (Desktop & Mobile)\n- [ ] Đã kiểm thử lỗi ngoại lệ (Edge cases)`,
    priority: 'high',
    tags: ['feature', 'enhancement'],
    hoursEstimate: '6',
    subtasks: [
      'Phân tích yêu cầu & thiết kế wireframe',
      'Hiện thực hóa giao diện UI/UX',
      'Tích hợp API và xử lý dữ liệu',
      'Kiểm thử đơn vị và nghiệm thu (QA)'
    ]
  },
  {
    id: 'bug',
    nameVi: 'Báo cáo lỗi',
    nameEn: 'Bug Fix',
    icon: '🐛',
    title: 'Lỗi: ',
    description: `### 🐞 Mô tả lỗi (Bug Summary)\nMô tả hiện tượng lỗi xảy ra.\n\n### 🔄 Các bước tái hiện (Steps to Reproduce)\n1. Đi đến trang...\n2. Nhấn vào nút...\n3. Quan sát thấy hành vi bất thường.\n\n### ✅ Kết quả kỳ vọng (Expected Behavior)\nHệ thống hoạt động đúng như thiết kế.`,
    priority: 'urgent',
    tags: ['bug', 'hotfix'],
    hoursEstimate: '2',
    subtasks: [
      'Tái hiện lỗi trên môi trường staging',
      'Tìm nguyên nhân gốc (Root cause analysis)',
      'Viết bản sửa lỗi (Hotfix)',
      'Kiểm thử hồi quy (Regression test)'
    ]
  },
  {
    id: 'planning',
    nameVi: 'Kế hoạch / RFC',
    nameEn: 'Planning',
    icon: '📝',
    title: 'Kế hoạch: ',
    description: `### 📌 Bối cảnh & Mục tiêu (Context & Goals)\nChi tiết định hướng kế hoạch và phạm vi thực thi.\n\n### 👥 Các bên liên quan (Stakeholders)\n- Người phụ trách chính: ...\n- Thành viên hỗ trợ: ...`,
    priority: 'medium',
    tags: ['planning', 'docs'],
    hoursEstimate: '4',
    subtasks: [
      'Thu thập yêu cầu từ các bên liên quan',
      'Dự thảo tài liệu kỹ thuật / kế hoạch chi tiết',
      'Họp thống nhất và duyệt phương án'
    ]
  },
  {
    id: 'design',
    nameVi: 'Thiết kế UI/UX',
    nameEn: 'UI/UX Design',
    icon: '🎨',
    title: 'Design: ',
    description: `### 🎨 Yêu cầu thiết kế (Design Scope)\nXây dựng giao diện hiện đại, tối ưu trải nghiệm người dùng (UX).\n\n### 📐 Quy chuẩn thiết kế (Guidelines)\n- Tuân thủ hệ thống màu sắc và typography\n- Thiết kế responsive cho mọi kích cỡ màn hình`,
    priority: 'medium',
    tags: ['design', 'ui-ux'],
    hoursEstimate: '5',
    subtasks: [
      'Lên ý tưởng Moodboard & phác thảo wireframe',
      'Thiết kế chi tiết trên Figma (UI components)',
      'Tạo prototype tương tác và kiểm thử usability'
    ]
  }
];

// ── Props Interface ──
export interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress'> & { progress?: number }, createAnother?: boolean) => void | Promise<void>;
  spaces?: Space[];
  activeSpaceId?: string | null;
  activeListId?: string | null;
  members: User[];
  customFields?: any[];
  activeWorkspaceId?: string;
  initialData?: Partial<Task>;
  allTasks?: Task[];
  triggerToast?: (type: any, title: string, message: string, ...args: any[]) => void;
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
  initialData,
  allTasks = [],
  triggerToast,
}: TaskModalProps) {
  const { isVietnamese, locale } = useTranslation();
  const isEditMode = Boolean(initialData?.id);
  const createDialogRef = useRef<HTMLDivElement>(null);
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  // ═══════════════════════════════════════════════
  // CORE FORM STATE
  // ═══════════════════════════════════════════════
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [status, setStatus] = useState<TaskStatus>(initialData?.status || 'todo');
  const [priority, setPriority] = useState<Priority | undefined>(initialData?.priority);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(initialData?.assigneeIds?.length ? initialData.assigneeIds : initialData?.assigneeId ? [initialData.assigneeId] : []);
  const [teamIds, setTeamIds] = useState<string[]>(initialData?.teamIds?.length ? initialData.teamIds : initialData?.teamId ? [initialData.teamId] : (getTaskTeamIds(initialData) || []));
  const [spaceId, setSpaceId] = useState<string>(initialData?.spaceId || activeSpaceId || (spaces[0]?.id || ''));
  const [listId, setListId] = useState<string | null>(initialData?.listId || activeListId || null);
  const [startDate, setStartDate] = useState<string>(initialData?.startDate || '');
  const [dueDate, setDueDate] = useState<string>(initialData?.dueDate || '');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [progress, setProgress] = useState<number>(initialData?.progress || 0);
  const [hoursEstimate, setHoursEstimate] = useState<string>(initialData?.hoursEstimate !== undefined ? String(initialData.hoursEstimate) : '');
  const [hoursLogged, setHoursLogged] = useState<string>(initialData?.hoursLogged !== undefined ? String(initialData.hoursLogged) : '');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>(initialData?.custom_fields || {});

  // ═══════════════════════════════════════════════
  // ADVANCED & HIGH-PRODUCTIVITY TASK PROPERTIES
  // ═══════════════════════════════════════════════
  const [isPinned, setIsPinned] = useState<boolean>(Boolean(initialData?.isPinned));
  const [isMilestone, setIsMilestone] = useState<boolean>(Boolean(initialData?.isMilestone || initialData?.custom_fields?.isMilestone));
  const [reminder, setReminder] = useState<ReminderOption>(
    (initialData?.reminder || initialData?.custom_fields?.reminder as ReminderOption) || 'none'
  );
  const [recurrence, setRecurrence] = useState<Task['recurrence']>(
    initialData?.recurrence || { frequency: 'none', interval: 1 }
  );
  const [attachments, setAttachments] = useState<TaskAttachment[]>(initialData?.attachments || []);
  const [blockedByIds, setBlockedByIds] = useState<string[]>(initialData?.relationships?.blockedBy || []);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentBusyId, setAttachmentBusyId] = useState<string | null>(null);
  const [isAttachmentDragActive, setIsAttachmentDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SUBTASKS STATE
  const [subtasks, setSubtasks] = useState<SubTask[]>(initialData?.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');

  // UI STATE
  const [createAnother, setCreateAnother] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isAutofillingAi, setIsAutofillingAi] = useState(false);
  const [aiAutofillHint, setAiAutofillHint] = useState<string | null>(null);
  const [validationError, setValidationError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const requestClose = useCallback(() => {
    if (!savingRef.current) onClose();
  }, [onClose]);
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // REFS
  const titleInputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);
  const lastTaskIdRef = useRef<string | undefined>(undefined);

  // ═══════════════════════════════════════════════
  // RESET ON OPEN / TASK SWITCH
  // ═══════════════════════════════════════════════
  useEffect(() => {
    const isNewOpening = isOpen && !wasOpenRef.current;
    const isTaskChanged = isOpen && initialData?.id !== lastTaskIdRef.current;
    wasOpenRef.current = isOpen;
    lastTaskIdRef.current = initialData?.id;

    if (!isNewOpening && !isTaskChanged) return;

    const nextSpaceId = initialData?.spaceId || activeSpaceId || spaces[0]?.id || '';
    const nextSpace = spaces.find(space => space.id === nextSpaceId);
    const requestedListId = initialData?.id ? initialData.listId : initialData?.listId || activeListId || null;
    const nextListId = requestedListId && nextSpace?.lists?.some(list => list.id === requestedListId)
      ? requestedListId
      : initialData?.id ? null : nextSpace?.lists?.[0]?.id || null;

    setTitle(initialData?.title || '');
    setDescription(initialData?.description || '');
    setStatus(initialData?.status || 'todo');
    setPriority(initialData?.priority);
    setAssigneeIds(initialData?.assigneeIds?.length ? initialData.assigneeIds : initialData?.assigneeId ? [initialData.assigneeId] : []);
    setTeamIds(initialData?.teamIds?.length ? initialData.teamIds : initialData?.teamId ? [initialData.teamId] : (getTaskTeamIds(initialData) || []));
    setSpaceId(nextSpaceId);
    setListId(nextListId);
    setStartDate(initialData?.startDate || '');
    setDueDate(initialData?.dueDate || '');
    setTags(initialData?.tags || []);
    setProgress(initialData?.progress || 0);
    setHoursEstimate(initialData?.hoursEstimate !== undefined ? String(initialData.hoursEstimate) : '');
    setHoursLogged(initialData?.hoursLogged !== undefined ? String(initialData.hoursLogged) : '');
    setCustomFieldValues(initialData?.custom_fields || {});
    setSubtasks(initialData?.subtasks || []);
    setIsPinned(Boolean(initialData?.isPinned));
    setIsMilestone(Boolean(initialData?.isMilestone || initialData?.custom_fields?.isMilestone));
    setReminder((initialData?.reminder || initialData?.custom_fields?.reminder as ReminderOption) || 'none');
    setRecurrence(initialData?.recurrence || { frequency: 'none', interval: 1 });
    setAttachments(initialData?.attachments || []);
    setBlockedByIds(initialData?.relationships?.blockedBy || []);
    setNewSubtaskTitle('');
    setNewTagInput('');
    setValidationError('');
    setAiAutofillHint(null);
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');

    // Auto-open subtasks if data exists
    setShowSubtasks((initialData?.subtasks && initialData.subtasks.length > 0) || true);

    // Auto-open "More Details" if there's existing data
    const hasExtraData = Boolean(
      (initialData?.tags && initialData.tags.length > 0) ||
      initialData?.hoursEstimate ||
      initialData?.hoursLogged ||
      (initialData?.attachments && initialData.attachments.length > 0) ||
      (initialData?.recurrence && initialData.recurrence.frequency !== 'none') ||
      (initialData?.relationships?.blockedBy && initialData.relationships.blockedBy.length > 0) ||
      (initialData?.custom_fields && Object.keys(initialData.custom_fields).length > 0)
    );
    setShowMoreDetails(hasExtraData);

    const focusTimer = window.setTimeout(() => titleInputRef.current?.focus(), 100);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen, initialData, activeSpaceId, activeListId, spaces]);

  // ═══════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════
  const completedSubtasksCount = useMemo(() => subtasks.filter(s => s.completed).length, [subtasks]);
  const subtaskPercent = useMemo(() => subtasks.length > 0 ? Math.round((completedSubtasksCount / subtasks.length) * 100) : 0, [subtasks.length, completedSubtasksCount]);

  const selectedSpace = useMemo(() => {
    return spaces.find(s => s.id === spaceId) || spaces[0] || null;
  }, [spaces, spaceId]);

  const activeSpaceCustomFields = useMemo(() => {
    return selectedSpace ? selectedSpace.customFields || [] : customFields;
  }, [selectedSpace, customFields]);

  const availableBlockerTasks = useMemo(() => {
    return (allTasks || []).filter(t => t.id !== initialData?.id && t.status !== 'completed');
  }, [allTasks, initialData?.id]);

  // ═══════════════════════════════════════════════
  // ATTACHMENT & HELPER HANDLERS
  // ═══════════════════════════════════════════════
  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return { color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' };
    }
    if (['pdf'].includes(ext)) {
      return { color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/30' };
    }
    if (['doc', 'docx'].includes(ext)) {
      return { color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' };
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return { color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' };
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return { color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' };
    }
    return { color: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' };
  };

  const handleAttachmentUpload = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      setValidationError(isVietnamese ? 'Tệp vượt quá giới hạn 25MB.' : 'File exceeds 25MB limit.');
      return;
    }
    setIsUploadingAttachment(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uuid = crypto.randomUUID();
      const ext = file.name.split('.').pop() || 'dat';
      const folderId = initialData?.id || `draft-${Date.now()}`;
      const filePath = session?.user?.id
        ? `${session.user.id}/tasks/${folderId}/${uuid}.${ext}`
        : `public/tasks/${folderId}/${uuid}.${ext}`;

      let uploadedToStorage = false;
      try {
        const { error } = await supabase.storage.from('app-files').upload(filePath, file, { upsert: true });
        if (!error) uploadedToStorage = true;
      } catch (uploadErr) {
        console.warn('Storage upload fallback:', uploadErr);
      }

      const newAtt: TaskAttachment = {
        id: uuid,
        name: file.name,
        filePath: uploadedToStorage ? filePath : URL.createObjectURL(file),
        size: file.size,
        uploadedAt: new Date().toISOString(),
        mimeType: file.type || undefined,
      };

      setAttachments(prev => [...prev, newAtt]);
      if (validationError) setValidationError('');
    } catch (err: any) {
      console.error('Failed to attach file:', err);
      setValidationError(err.message || (isVietnamese ? 'Không thể tải tệp lên' : 'Could not upload file'));
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleAttachmentDelete = async (att: TaskAttachment) => {
    try {
      if (att.filePath && !att.filePath.startsWith('blob:') && !att.filePath.startsWith('http')) {
        await supabase.storage.from('app-files').remove([att.filePath]);
      }
    } catch (e) {
      console.warn('Failed to delete file from storage:', e);
    }
    setAttachments(prev => prev.filter(a => a.id !== att.id));
  };

  const handleDownloadAttachment = async (att: TaskAttachment) => {
    if (!att.filePath) return;
    setAttachmentBusyId(att.id);
    try {
      if (att.filePath.startsWith('blob:') || att.filePath.startsWith('http')) {
        const anchor = document.createElement('a');
        anchor.href = att.filePath;
        anchor.download = att.name;
        anchor.rel = 'noopener';
        anchor.click();
        return;
      }
      const { data, error } = await supabase.storage.from('app-files').createSignedUrl(att.filePath, 60, {
        download: att.name,
      });
      if (error || !data?.signedUrl) throw error || new Error('No download URL returned');
      const anchor = document.createElement('a');
      anchor.href = data.signedUrl;
      anchor.download = att.name;
      anchor.rel = 'noopener';
      anchor.click();
    } catch (err: any) {
      console.error('Download error:', err);
    } finally {
      setAttachmentBusyId(null);
    }
  };

  // MOCK HELPERS (1-Click sample data for swift UX testing)
  const handleAddMockAttachments = () => {
    const mockFiles: TaskAttachment[] = [
      {
        id: `mock-att-${Date.now()}-1`,
        name: 'Technical_Specification_v1.pdf',
        filePath: 'https://example.com/spec.pdf',
        size: 1420000,
        uploadedAt: new Date().toISOString(),
        mimeType: 'application/pdf',
      },
      {
        id: `mock-att-${Date.now()}-2`,
        name: 'Feature_Flowchart_Wireframe.png',
        filePath: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60',
        size: 850000,
        uploadedAt: new Date().toISOString(),
        mimeType: 'image/png',
      },
    ];
    setAttachments(prev => [...prev, ...mockFiles]);
    setShowMoreDetails(true);
  };

  const handleAddMockSubtasks = () => {
    const defaultMocks = isVietnamese ? [
      'Phân tích yêu cầu và tiêu chuẩn kỹ thuật',
      'Thiết kế giao diện UI/UX và micro-interactions',
      'Hiện thực hóa component và tích hợp state',
      'Kiểm thử end-to-end và tối ưu hóa hiệu năng'
    ] : [
      'Analyze requirements & tech specs',
      'Design UI/UX & micro-interactions',
      'Implement components & wire state',
      'E2E testing & performance tuning'
    ];
    const newSubs: SubTask[] = defaultMocks.map((t, i) => ({
      id: `st-mock-${Date.now()}-${i}`,
      title: t,
      completed: false
    }));
    setSubtasks(prev => [...prev, ...newSubs]);
  };

  const applyTemplate = (tpl: QuickTemplate) => {
    if (!title || title.trim() === '' || title.startsWith('Tính năng:') || title.startsWith('Lỗi:') || title.startsWith('Kế hoạch:') || title.startsWith('Design:')) {
      setTitle(isVietnamese ? tpl.title : (tpl.id === 'feature' ? 'Feature: ' : tpl.id === 'bug' ? 'Bug: ' : tpl.id === 'planning' ? 'Plan: ' : 'Design: '));
    }
    setDescription(tpl.description);
    setPriority(tpl.priority);
    setTags(prev => Array.from(new Set([...prev, ...tpl.tags])));
    setHoursEstimate(tpl.hoursEstimate);
    setSubtasks(tpl.subtasks.map((st, idx) => ({
      id: `st-tpl-${Date.now()}-${idx}`,
      title: st,
      completed: false
    })));
    setShowSubtasks(true);
    setShowMoreDetails(true);
    if (validationError) setValidationError('');
    titleInputRef.current?.focus();
  };

  // ═══════════════════════════════════════════════
  // SUBMIT HANDLER
  // ═══════════════════════════════════════════════
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (savingRef.current || isUploadingAttachment) return;
    if (!title.trim()) {
      setValidationError(isVietnamese ? 'Vui lòng nhập tên công việc.' : 'Please enter a task title.');
      titleInputRef.current?.focus();
      return;
    }

    if (startDate && dueDate && new Date(dueDate).getTime() < new Date(startDate).getTime()) {
      setValidationError(isVietnamese ? 'Hạn hoàn thành phải sau hoặc bằng ngày bắt đầu.' : 'Due date must be on or after the start date.');
      return;
    }

    const resolvedValues = applyCustomFieldDefaults(activeSpaceCustomFields, customFieldValues);
    const fieldErrors = validateTaskCustomFields(activeSpaceCustomFields, resolvedValues, status === 'completed', isVietnamese ? 'vi' : 'en');
    if (fieldErrors.length) {
      setValidationError(fieldErrors.map(error => error.field + ': ' + error.message).join(' '));
      setShowMoreDetails(true);
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
      teamId: teamIds[0] || undefined,
      teamIds,
      spaceId: spaceId || undefined,
      listId: listId || undefined,
      workspaceId: activeWorkspaceId,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      tags,
      progress,
      hoursEstimate: hoursEstimate === '' ? undefined : Math.max(0, Number(hoursEstimate) || 0),
      hoursLogged: hoursLogged === '' ? undefined : Math.max(0, Number(hoursLogged) || 0),
      custom_fields: {
        ...resolvedValues,
        teamIds,
        reminder: reminder !== 'none' ? reminder : undefined,
        isMilestone: isMilestone ? true : undefined,
      },
      subtasks,
      isPinned,
      isMilestone,
      reminder: reminder !== 'none' ? reminder : undefined,
      recurrence: recurrence?.frequency && recurrence.frequency !== 'none' ? recurrence : undefined,
      attachments,
      relationships: {
        ...(initialData?.relationships || {}),
        blockedBy: blockedByIds.length > 0 ? blockedByIds : undefined,
      }
    };

    savingRef.current = true;
    setIsSaving(true);
    try {
      await onSave(payload, createAnother);
      if (createAnother) {
        setTitle('');
        setDescription('');
        setAssigneeIds([]);
        setTeamIds([]);
        setSubtasks([]);
        setNewSubtaskTitle('');
        setTags([]);
        setProgress(0);
        setHoursEstimate('');
        setHoursLogged('');
        setCustomFieldValues({});
        setIsPinned(false);
        setIsMilestone(false);
        setReminder('none');
        setRecurrence({ frequency: 'none', interval: 1 });
        setAttachments([]);
        setBlockedByIds([]);
        setTimeout(() => { titleInputRef.current?.focus(); }, 50);
      } else {
        onClose();
      }
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : (isVietnamese ? 'Không thể lưu công việc. Vui lòng thử lại.' : 'Could not save task. Please try again.'));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [
    title, description, status, priority, assigneeIds, teamIds, spaceId, listId, startDate, dueDate,
    tags, progress, hoursEstimate, hoursLogged, customFieldValues, subtasks, createAnother,
    onSave, onClose, isVietnamese, isPinned, isMilestone, reminder, recurrence, attachments,
    blockedByIds, initialData, activeWorkspaceId, isUploadingAttachment, activeSpaceCustomFields
  ]);

  // Sync progress from subtasks
  useEffect(() => {
    if (subtasks.length === 0) return;
    const completed = subtasks.filter(subtask => subtask.completed).length;
    setProgress(Math.round((completed / subtasks.length) * 100));
  }, [subtasks]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => titleInputRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.defaultPrevented || e.isComposing) return;
      if (e.key === 'Tab' && createDialogRef.current?.contains(document.activeElement)) {
        const controls = Array.from(createDialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
      if (e.key === 'Escape') { requestClose(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleSubmit, requestClose]);

  // ═══════════════════════════════════════════════
  // SUBTASK HANDLERS
  // ═══════════════════════════════════════════════
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: SubTask = { id: `st-${Date.now()}`, title: newSubtaskTitle.trim(), completed: false };
    setSubtasks(prev => [...prev, newSub]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (stId: string) => {
    setSubtasks(prev => prev.map(st => st.id === stId ? { ...st, completed: !st.completed } : st));
  };

  const handleDeleteSubtask = (stId: string) => {
    setSubtasks(prev => prev.filter(st => st.id !== stId));
    if (editingSubtaskId === stId) { setEditingSubtaskId(null); setEditingSubtaskTitle(''); }
  };

  const handleStartEditSubtask = (st: SubTask) => {
    setEditingSubtaskId(st.id);
    setEditingSubtaskTitle(st.title);
  };

  const handleSaveEditSubtask = (stId: string) => {
    if (!editingSubtaskTitle.trim()) {
      handleDeleteSubtask(stId);
    } else {
      setSubtasks(prev => prev.map(s => s.id === stId ? { ...s, title: editingSubtaskTitle.trim() } : s));
    }
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
  };

  const handleCancelEditSubtask = () => {
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
  };

  // ═══════════════════════════════════════════════
  // TAG HANDLERS
  // ═══════════════════════════════════════════════
  const handleAddTag = (rawInput?: string) => {
    const text = (rawInput !== undefined ? rawInput : newTagInput).trim();
    if (!text) return;
    const parts = text.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
    if (parts.length > 0) {
      setTags(prev => Array.from(new Set([...prev, ...parts])));
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  // ═══════════════════════════════════════════════
  // AI HANDLERS
  // ═══════════════════════════════════════════════
  const handleSmartAutofill = async () => {
    if (!title.trim()) { titleInputRef.current?.focus(); return; }
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
        if (res.suggestedPriority) setPriority(res.suggestedPriority);
        if (res.suggestedHoursEstimate && (!hoursEstimate || hoursEstimate === '0')) {
          setHoursEstimate(String(res.suggestedHoursEstimate));
        }
        if (Array.isArray(res.suggestedTags) && res.suggestedTags.length > 0) {
          setTags(prev => Array.from(new Set([...prev, ...res.suggestedTags])));
        }
        if (Array.isArray(res.suggestedSubtasks) && res.suggestedSubtasks.length > 0) {
          const newSubs: SubTask[] = res.suggestedSubtasks.map((stTitle: string, idx: number) => ({
            id: `st-ai-autofill-${Date.now()}-${idx}`,
            title: stTitle,
            completed: false
          }));
          setSubtasks(prev => [...prev, ...newSubs]);
        }
        if (res.enhancedDescription) {
          if (!description.trim()) { setDescription(res.enhancedDescription); }
          else { setDescription(prev => `${prev}\n\n${res.enhancedDescription}`); }
        }
        // Auto-open more details if AI added tags/hours
        if ((res.suggestedTags?.length > 0) || res.suggestedHoursEstimate) {
          setShowMoreDetails(true);
        }
        const priorityLabels: Record<string, string> = {
          urgent: isVietnamese ? 'Khẩn cấp' : 'Urgent',
          high: isVietnamese ? 'Cao' : 'High',
          medium: isVietnamese ? 'Trung bình' : 'Medium',
          low: isVietnamese ? 'Thấp' : 'Low'
        };
        const prioText = priorityLabels[res.suggestedPriority] || res.suggestedPriority;
        setAiAutofillHint(
          isVietnamese
            ? `AI đã điền: ${prioText}, ~${res.suggestedHoursEstimate}h, ${res.suggestedTags.length} thẻ, ${res.suggestedSubtasks.length} việc con`
            : `AI filled: ${prioText}, ~${res.suggestedHoursEstimate}h, ${res.suggestedTags.length} tags, ${res.suggestedSubtasks.length} subtasks`
        );
      }
    } catch (err: any) {
      console.error('Smart autofill error:', err);
      setAiAutofillHint(isVietnamese ? `Lỗi AI: ${err.message || 'Thử lại'}` : `AI error: ${err.message || 'Try again'}`);
    } finally {
      setIsAutofillingAi(false);
    }
  };

  const handleAiGenerateSubtasks = async () => {
    if (!title.trim()) { titleInputRef.current?.focus(); return; }
    try {
      setIsGeneratingSubtasks(true);
      const generated = await generateSubtasksWithAi(title.trim(), description.trim());
      if (generated && generated.length > 0) {
        const newSubs: SubTask[] = generated.map((t: string, idx: number) => ({
          id: `st-ai-${Date.now()}-${idx}`, title: t, completed: false
        }));
        setSubtasks(prev => [...prev, ...newSubs]);
      }
    } catch (err) {
      console.error('Failed to generate subtasks with AI:', err);
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  const handleGenerateWithAi = async () => {
    if (!title.trim()) { titleInputRef.current?.focus(); return; }
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

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════
  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="task-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 font-sans select-none"
          >
            {/* Backdrop */}
            <motion.div
              key="task-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={requestClose}
              className="fixed inset-0 modal-backdrop bg-black/40 dark:bg-black/75 backdrop-blur-md cursor-pointer"
            />

            {/* ════════════════════════════════════════ */}
            {/* MODAL CARD                               */}
            {/* ════════════════════════════════════════ */}
            <motion.div
              key="task-modal-card"
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          ref={createDialogRef}
          role="dialog" aria-modal="true" aria-label={isVietnamese ? (isEditMode ? 'Chỉnh sửa công việc' : 'Tạo công việc mới') : (isEditMode ? 'Edit task' : 'Create task')}
          className="task-create-studio relative z-10 w-full max-w-2xl bg-white dark:bg-[#0a0b10] border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] outline-none"
          style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08) inset, 0 25px 60px -15px rgba(0,0,0,0.35)' }}
        >
          {/* Top Accent Bar */}
          <div className="task-create-accent" />

          {/* ── HEADER ── */}
          <div className="px-5 py-3 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/70 bg-slate-50/60 dark:bg-white/[0.02] shrink-0">
            {/* Left: Mode icon + Space/List selector */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                isEditMode
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                  : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
              }`}>
                {isEditMode ? <Edit2 className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none">
                  {isEditMode ? (isVietnamese ? 'Chỉnh sửa' : 'Edit Task') : (isVietnamese ? 'Tạo mới' : 'New Task')}
                </span>
                <div className="flex items-center gap-1.5 text-xs mt-0.5">
                  <Select
                    value={spaceId}
                    onChange={v => {
                      const nextSpace = spaces.find(space => space.id === v);
                      setSpaceId(v);
                      setListId(nextSpace?.lists?.[0]?.id || null);
                    }}
                    size="sm"
                    ariaLabel={isVietnamese ? 'Không gian' : 'Space'}
                    options={spaces.map(sp => ({ value: sp.id, label: sp.name }))}
                  />
                  {selectedSpace?.lists && selectedSpace.lists.length > 0 && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600 text-[10px]">/</span>
                      <Select
                        value={listId || ''}
                        onChange={v => setListId(v || null)}
                        size="sm"
                        ariaLabel={isVietnamese ? 'Danh sách' : 'List'}
                        options={[
                          { value: '', label: isVietnamese ? 'Không thuộc danh sách' : 'No list' },
                          ...selectedSpace.lists.map(lst => ({ value: lst.id, label: lst.name }))
                        ]}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Close */}
            <button
              type="button"
              onClick={requestClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              title={isVietnamese ? 'Đóng (Esc)' : 'Close (Esc)'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── SCROLLABLE CONTENT ── */}
          <form onSubmit={handleSubmit} inert={isSaving} className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="task-create-content">

              {/* ─── SECTION 1: Title + AI Autofill ─── */}
              <div className="space-y-2">
                {/* Quick Templates (Create Mode Only) */}
                {!isEditMode && (
                  <div className="task-create-templates">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
                      <LayoutTemplate className="w-3 h-3 text-indigo-500" />
                      {isVietnamese ? 'Mẫu nhanh:' : 'Templates:'}
                    </span>
                    {QUICK_TEMPLATES.map(tpl => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-950/40 dark:text-slate-300 dark:hover:text-indigo-400 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer"
                        title={isVietnamese ? `Áp dụng mẫu ${tpl.nameVi}` : `Apply ${tpl.nameEn} template`}
                      >
                        <span className="text-xs">{tpl.icon}</span>
                        <span>{isVietnamese ? tpl.nameVi : tpl.nameEn}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <input
                    ref={titleInputRef}
                    type="text"
                    required
                    value={title}
                    onChange={e => {
                      setTitle(e.target.value);
                      if (validationError) setValidationError('');
                    }}
                    aria-label={isVietnamese ? 'Tên công việc' : 'Task title'}
                    placeholder={isVietnamese ? 'Bạn cần hoàn thành việc gì?' : 'What needs to get done?'}
                    className={`flex-1 text-lg font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 bg-transparent border-none outline-none p-0 leading-snug ${
                      validationError ? 'text-rose-600 dark:text-rose-400 placeholder:text-rose-300' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSmartAutofill}
                    disabled={isAutofillingAi || !title.trim()}
                    className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/50 text-[11px] font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title={isVietnamese ? 'AI tự động phân tích & điền thông tin' : 'AI Smart Autofill'}
                  >
                    {isAutofillingAi ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">{isAutofillingAi ? (isVietnamese ? 'Đang phân tích...' : 'Analyzing...') : 'AI'}</span>
                  </button>
                </div>

                {/* AI Hint */}
                <AnimatePresence>
                  {aiAutofillHint && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/40 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium"
                    >
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
                        <span>{aiAutofillHint}</span>
                      </div>
                      <button type="button" onClick={() => setAiAutofillHint(null)} className="text-indigo-400 hover:text-indigo-600 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Validation Error */}
                <AnimatePresence>
                  {validationError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      role="alert"
                      className="text-[11px] font-semibold text-rose-500 dark:text-rose-400 flex items-center gap-1"
                    >
                      <span>⚠️</span>
                      <span>{validationError}</span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* ─── SECTION 2: Property Row (Single Line) ─── */}
              <div className="flex flex-wrap items-center gap-2 py-2.5 px-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.025] border border-slate-100 dark:border-slate-800/60">
                <StatusPillSelect value={status} onChange={(value) => {
                  const nextStatus = value || 'todo';
                  setStatus(nextStatus);
                  if (nextStatus === 'completed') setProgress(100);
                }} />

                <div className="w-px h-5 bg-slate-200 dark:bg-slate-700/60 hidden sm:block" />

                <PriorityPillSelect value={priority} onChange={(v) => setPriority(v)} />

                <div className="w-px h-5 bg-slate-200 dark:bg-slate-700/60 hidden sm:block" />

                <AssigneePillSelect
                  value={assigneeIds}
                  members={members.filter(m => !activeWorkspaceId || !m.workspaceIds?.length || m.workspaceIds.includes(activeWorkspaceId))}
                  onChange={(ids) => setAssigneeIds(ids || [])}
                  teamIds={teamIds}
                  onTeamChange={(tIds) => setTeamIds(tIds || [])}
                  workspaceId={activeWorkspaceId}
                />

                <div className="w-px h-5 bg-slate-200 dark:bg-slate-700/60 hidden sm:block" />

                <TeamPillSelect
                  value={teamIds}
                  workspaceId={activeWorkspaceId}
                  onChange={(tIds) => setTeamIds(tIds || [])}
                />

                <div className="w-px h-5 bg-slate-200 dark:bg-slate-700/60 hidden sm:block" />

                <PremiumDatePicker
                  startDateValue={startDate}
                  onStartDateChange={(val) => setStartDate(val || '')}
                  dateValue={dueDate}
                  onChange={(val) => setDueDate(val || '')}
                  reminderValue={reminder}
                  onReminderChange={(r) => setReminder(r)}
                  taskId={initialData?.id}
                  taskTitle={title}
                  label={isVietnamese ? 'Hạn chót' : 'Due date'}
                  align="left"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    dueDate
                      ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/50'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                />

                <div className="w-px h-5 bg-slate-200 dark:bg-slate-700/60 hidden sm:block" />

                {/* Quick Toggle: Pin Task */}
                <button
                  type="button"
                  onClick={() => setIsPinned(!isPinned)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    isPinned
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 font-semibold shadow-2xs'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                  title={isVietnamese ? (isPinned ? 'Bỏ ghim' : 'Ghim lên đầu bảng/danh sách') : (isPinned ? 'Unpin task' : 'Pin to top')}
                >
                  <Pin className={`w-3.5 h-3.5 transition-transform ${isPinned ? 'rotate-45 fill-current text-amber-500' : ''}`} />
                  <span className="hidden sm:inline">{isVietnamese ? (isPinned ? 'Đã ghim' : 'Ghim') : (isPinned ? 'Pinned' : 'Pin')}</span>
                </button>

                {/* Quick Toggle: Milestone */}
                <button
                  type="button"
                  onClick={() => setIsMilestone(!isMilestone)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    isMilestone
                      ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60 font-semibold shadow-2xs'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                  title={isVietnamese ? (isMilestone ? 'Bỏ mốc' : 'Đánh dấu là mốc quan trọng (Milestone)') : (isMilestone ? 'Unset Milestone' : 'Mark as Milestone')}
                >
                  <Flag className={`w-3.5 h-3.5 ${isMilestone ? 'fill-current text-purple-500' : ''}`} />
                  <span className="hidden sm:inline">{isVietnamese ? 'Cột mốc' : 'Milestone'}</span>
                </button>
              </div>

              {/* ─── SECTION 3: Description ─── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    {isVietnamese ? 'Mô tả' : 'Description'}
                  </p>
                  <button
                    type="button"
                    disabled={isGeneratingAi || !title.trim()}
                    onClick={handleGenerateWithAi}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isGeneratingAi ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {isGeneratingAi ? (isVietnamese ? 'Đang viết…' : 'Writing…') : (isVietnamese ? 'AI viết' : 'AI Write')}
                  </button>
                </div>
                <NotionDocEditor
                  value={description}
                  onChange={setDescription}
                  placeholder={isVietnamese ? 'Thêm ghi chú, hướng dẫn, tiêu chí nghiệm thu...' : 'Add details, instructions, acceptance criteria...'}
                  taskTitle={title}
                />
              </div>

              {/* ─── SECTION 4: Subtasks (Collapsible) ─── */}
              <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3">
                {/* Section Header */}
                <div className="w-full flex items-center justify-between gap-2 mb-2">
                  <button type="button" aria-expanded={showSubtasks} onClick={() => setShowSubtasks(!showSubtasks)} className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                    {showSubtasks ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                    <ListTodo className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{isVietnamese ? 'Công việc con' : 'Subtasks'}</span>
                    {subtasks.length > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                        subtaskPercent === 100
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {completedSubtasksCount}/{subtasks.length}
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    {subtasks.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const allDone = subtasks.every(s => s.completed);
                          setSubtasks(prev => prev.map(s => ({ ...s, completed: !allDone })));
                        }}
                        className="px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                        title={
                          subtasks.every(s => s.completed)
                            ? (isVietnamese ? 'Bỏ chọn tất cả việc phụ' : 'Uncheck all subtasks')
                            : (isVietnamese ? 'Đánh dấu xong tất cả việc phụ' : 'Check all subtasks')
                        }
                      >
                        <CheckCheck className={`w-3 h-3 ${subtasks.every(s => s.completed) ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <span className="hidden sm:inline">
                          {subtasks.every(s => s.completed)
                            ? (isVietnamese ? 'Bỏ chọn hết' : 'Uncheck all')
                            : (isVietnamese ? 'Xong hết' : 'Check all')}
                        </span>
                      </button>
                    )}
                    {subtasks.length === 0 && (
                      <button
                        type="button"
                        onClick={handleAddMockSubtasks}
                        className="px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                        title={isVietnamese ? 'Thêm việc phụ mẫu' : 'Add mock subtasks'}
                      >
                        <Boxes className="w-3 h-3 text-slate-400" />
                        <span className="hidden sm:inline">{isVietnamese ? 'Mẫu việc con' : 'Mock tasks'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isGeneratingSubtasks || !title.trim()}
                      onClick={handleAiGenerateSubtasks}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors disabled:opacity-30 cursor-pointer flex items-center gap-1"
                    >
                      {isGeneratingSubtasks ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      <span className="hidden sm:inline">{isGeneratingSubtasks ? (isVietnamese ? 'Đang tạo...' : 'Generating...') : (isVietnamese ? 'AI gợi ý' : 'AI')}</span>
                    </button>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {showSubtasks && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden space-y-1.5"
                    >
                      {/* Progress Bar */}
                      {subtasks.length > 0 && (
                        <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                          <motion.div
                            className={`h-full rounded-full ${
                              subtaskPercent === 100
                                ? 'bg-emerald-500'
                                : 'bg-indigo-500'
                            }`}
                            style={{ width: `${subtaskPercent}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      )}

                      {/* Subtask Items */}
                      {subtasks.map((st) => (
                        <div
                          key={st.id}
                          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors group ${
                            st.completed
                              ? 'bg-slate-50/50 dark:bg-slate-900/30'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleSubtask(st.id)}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              st.completed
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 bg-white dark:bg-slate-800'
                            }`}
                          >
                            {st.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </button>

                          {editingSubtaskId === st.id ? (
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                              <input
                                type="text"
                                autoFocus
                                value={editingSubtaskTitle}
                                onChange={e => setEditingSubtaskTitle(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') { e.preventDefault(); handleSaveEditSubtask(st.id); }
                                  else if (e.key === 'Escape') { handleCancelEditSubtask(); }
                                }}
                                className="flex-1 text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-indigo-500 rounded-md px-2 py-0.5 outline-none"
                              />
                              <button type="button" onClick={() => handleSaveEditSubtask(st.id)} className="p-0.5 text-emerald-600 cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={handleCancelEditSubtask} className="p-0.5 text-slate-400 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <span
                              onDoubleClick={() => handleStartEditSubtask(st)}
                              className={`flex-1 text-xs font-medium truncate cursor-default ${
                                st.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {st.title}
                            </span>
                          )}

                          {editingSubtaskId !== st.id && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button type="button" onClick={() => handleStartEditSubtask(st)} className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button type="button" onClick={() => handleDeleteSubtask(st.id)} className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add Subtask Input */}
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-700/60 focus-within:border-indigo-400 focus-within:border-solid transition-all">
                        <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={newSubtaskTitle}
                          onChange={e => setNewSubtaskTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); }
                          }}
                          placeholder={isVietnamese ? 'Thêm công việc con...' : 'Add subtask...'}
                          className="flex-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-transparent border-none outline-none p-0 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                        />
                        {newSubtaskTitle.trim() && (
                          <button
                            type="button"
                            onClick={handleAddSubtask}
                            className="px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold cursor-pointer transition-colors"
                          >
                            {isVietnamese ? 'Thêm' : 'Add'}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ─── SECTION 5: More Details (Collapsible) ─── */}
              <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMoreDetails(!showMoreDetails)}
                  className="w-full flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors mb-2"
                >
                  {showMoreDetails ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{isVietnamese ? 'Thuộc tính nâng cao' : 'Advanced properties'}</span>
                  {/* Indicator badges for filled data */}
                  {!showMoreDetails && (
                    <div className="flex flex-wrap items-center gap-1 ml-1">
                      {tags.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 text-[9px] font-bold">
                          {tags.length} {isVietnamese ? 'thẻ' : 'tags'}
                        </span>
                      )}
                      {hoursEstimate && (
                        <span className="px-1.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/30 text-sky-500 text-[9px] font-bold">
                          {hoursEstimate}h
                        </span>
                      )}
                      {attachments.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-500 text-[9px] font-bold">
                          {attachments.length} {isVietnamese ? 'tệp' : 'files'}
                        </span>
                      )}
                      {recurrence?.frequency && recurrence.frequency !== 'none' && (
                        <span className="px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/30 text-purple-500 text-[9px] font-bold">
                          {isVietnamese ? 'Lặp lại' : 'Recurring'}
                        </span>
                      )}
                      {blockedByIds.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/30 text-rose-500 text-[9px] font-bold">
                          {blockedByIds.length} {isVietnamese ? 'bị chặn' : 'blocked'}
                        </span>
                      )}
                    </div>
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {showMoreDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden space-y-4"
                    >
                      {/* Hours Estimate & Logged */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                              {isVietnamese ? 'Ước tính (giờ)' : 'Estimate (hrs)'}
                            </label>
                            {hoursEstimate && parseFloat(hoursEstimate) > 0 && (
                              <button
                                type="button"
                                onClick={() => setHoursEstimate('')}
                                className="text-[10px] font-semibold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                              >
                                {isVietnamese ? 'Xóa' : 'Clear'}
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <Clock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <input
                              type="number"
                              min="0"
                              step="0.25"
                              value={hoursEstimate}
                              onChange={e => setHoursEstimate(e.target.value)}
                              placeholder="0"
                              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                            />
                          </div>
                          {/* Quick Time Add Chips */}
                          <div className="flex items-center gap-1 flex-wrap pt-0.5">
                            {[
                              { label: '+15m', val: 0.25 },
                              { label: '+30m', val: 0.5 },
                              { label: '+1h', val: 1 },
                              { label: '+2h', val: 2 },
                              { label: '+4h', val: 4 },
                              { label: '+8h', val: 8 },
                            ].map(chip => (
                              <button
                                key={chip.label}
                                type="button"
                                onClick={() => {
                                  const current = parseFloat(hoursEstimate) || 0;
                                  setHoursEstimate((Math.round((current + chip.val) * 100) / 100).toString());
                                }}
                                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-[10px] font-semibold border border-slate-200/50 dark:border-slate-700/50 transition-colors cursor-pointer"
                              >
                                {chip.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                            {isVietnamese ? 'Đã làm (giờ)' : 'Logged (hrs)'}
                          </label>
                          <div className="relative">
                            <BarChart3 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <input
                              type="number"
                              min="0"
                              step="0.25"
                              value={hoursLogged}
                              onChange={e => setHoursLogged(e.target.value)}
                              placeholder="0"
                              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Recurrence Setting */}
                      <div className="space-y-2.5 p-3 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-slate-800/60">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Repeat className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{isVietnamese ? 'Lặp lại định kỳ' : 'Recurrence'}</span>
                          </label>
                          {recurrence?.frequency && recurrence.frequency !== 'none' && (
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                              {isVietnamese ? 'Đang bật' : 'Active'}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {[
                            { id: 'none', labelVi: 'Không lặp', labelEn: 'None' },
                            { id: 'daily', labelVi: 'Hàng ngày', labelEn: 'Daily' },
                            { id: 'weekly', labelVi: 'Hàng tuần', labelEn: 'Weekly' },
                            { id: 'monthly', labelVi: 'Hàng tháng', labelEn: 'Monthly' }
                          ].map(freq => {
                            const isSelected = (recurrence?.frequency || 'none') === freq.id;
                            return (
                              <button
                                key={freq.id}
                                type="button"
                                onClick={() => setRecurrence({ frequency: freq.id as any, interval: recurrence?.interval || 1 })}
                                className={`px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border text-center ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-600 font-semibold shadow-xs'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                }`}
                              >
                                {isVietnamese ? freq.labelVi : freq.labelEn}
                              </button>
                            );
                          })}
                        </div>

                        {recurrence?.frequency && recurrence.frequency !== 'none' && (
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {isVietnamese ? 'Lặp lại mỗi' : 'Repeat every'}
                            </span>
                            <input
                              type="number"
                              min="1"
                              max="99"
                              value={recurrence.interval || 1}
                              onChange={e => setRecurrence({ ...recurrence, interval: Math.max(1, parseInt(e.target.value) || 1) })}
                              className="w-14 px-2 py-1 text-xs font-bold text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                            />
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {recurrence.frequency === 'daily'
                                ? (isVietnamese ? 'ngày' : 'day(s)')
                                : recurrence.frequency === 'weekly'
                                ? (isVietnamese ? 'tuần' : 'week(s)')
                                : (isVietnamese ? 'tháng' : 'month(s)')}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 italic ml-auto">
                              {isVietnamese ? '• Tự tạo việc mới khi hoàn thành' : '• Clones next task on completion'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Attachments Section */}
                      <div className="space-y-2.5 p-3 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-slate-800/60">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5 text-amber-500" />
                            <span>{isVietnamese ? 'Tệp đính kèm' : 'Attachments'}</span>
                            {attachments.length > 0 && (
                              <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold">
                                {attachments.length}
                              </span>
                            )}
                          </label>

                          <div className="flex items-center gap-1.5">
                            {attachments.length === 0 && (
                              <button
                                type="button"
                                onClick={handleAddMockAttachments}
                                className="px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                                title={isVietnamese ? 'Thêm tệp mẫu minh họa' : 'Add mock attachments'}
                              >
                                <Boxes className="w-3 h-3 text-slate-400" />
                                <span className="hidden sm:inline">{isVietnamese ? 'Tệp mẫu' : 'Mock files'}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploadingAttachment}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:border-indigo-300 hover:text-indigo-600 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                            >
                              {isUploadingAttachment ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 text-indigo-500" />}
                              <span>{isUploadingAttachment ? (isVietnamese ? 'Đang tải...' : 'Uploading...') : (isVietnamese ? 'Tải tệp lên' : 'Upload')}</span>
                            </button>
                            <input
                              ref={fileInputRef}
                              type="file"
                              multiple
                              className="hidden"
                              onChange={e => {
                                const files = e.target.files;
                                if (files && files.length > 0) {
                                  Array.from(files).forEach(f => handleAttachmentUpload(f));
                                  e.target.value = '';
                                }
                              }}
                            />
                          </div>
                        </div>

                        {/* Dropzone / Drag Area */}
                        <div
                          onDragOver={e => { e.preventDefault(); setIsAttachmentDragActive(true); }}
                          onDragLeave={e => { if (e.currentTarget === e.target) setIsAttachmentDragActive(false); }}
                          onDrop={e => {
                            e.preventDefault();
                            setIsAttachmentDragActive(false);
                            const files = e.dataTransfer.files;
                            if (files && files.length > 0) {
                              Array.from(files).forEach(f => handleAttachmentUpload(f));
                            }
                          }}
                          className={`rounded-xl border border-dashed transition-all p-2.5 text-center ${
                            isAttachmentDragActive
                              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                              : 'border-slate-200 dark:border-slate-700/70 bg-transparent hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          {attachments.length === 0 ? (
                            <div className="py-3 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                              <FileUp className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {isVietnamese ? 'Kéo thả tệp vào đây hoặc nhấn để duyệt' : 'Drag & drop files here, or click to browse'}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                PNG, JPG, PDF, DOCX, ZIP (tối đa 25MB)
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                              {attachments.map(att => {
                                const iconStyle = getFileIcon(att.name);
                                return (
                                  <div
                                    key={att.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs group"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className={`w-7 h-7 rounded-md ${iconStyle.bg} flex items-center justify-center shrink-0`}>
                                        <FileText className={`w-3.5 h-3.5 ${iconStyle.color}`} />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]" title={att.name}>
                                          {att.name}
                                        </p>
                                        <p className="text-[9px] text-slate-400">
                                          {(att.size / 1024).toFixed(1)} KB
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadAttachment(att)}
                                        disabled={attachmentBusyId === att.id}
                                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                                        title={isVietnamese ? 'Tải xuống' : 'Download'}
                                      >
                                        <Download className={`w-3.5 h-3.5 ${attachmentBusyId === att.id ? 'animate-bounce' : ''}`} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleAttachmentDelete(att)}
                                        className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                                        title={isVietnamese ? 'Xóa tệp' : 'Delete'}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Task Dependencies (Blocked By) */}
                      {availableBlockerTasks.length > 0 && (
                        <div className="space-y-2.5 p-3 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-slate-800/60">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Link2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>{isVietnamese ? 'Phụ thuộc (Bị chặn bởi)' : 'Dependencies (Blocked By)'}</span>
                            </label>
                            {blockedByIds.length > 0 && (
                              <span className="px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-[10px] font-bold">
                                {blockedByIds.length} {isVietnamese ? 'công việc' : 'tasks'}
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <select
                              value=""
                              onChange={e => {
                                const selectedId = e.target.value;
                                if (selectedId && !blockedByIds.includes(selectedId)) {
                                  setBlockedByIds(prev => [...prev, selectedId]);
                                }
                              }}
                              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 cursor-pointer"
                            >
                              <option value="">{isVietnamese ? '+ Chọn công việc tiên quyết...' : '+ Select blocker task...'}</option>
                              {availableBlockerTasks
                                .filter(t => !blockedByIds.includes(t.id))
                                .map(t => (
                                  <option key={t.id} value={t.id}>
                                    [{t.status.toUpperCase()}] {t.title}
                                  </option>
                                ))}
                            </select>

                            {blockedByIds.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {blockedByIds.map(bId => {
                                  const taskObj = allTasks?.find(t => t.id === bId);
                                  return (
                                    <span
                                      key={bId}
                                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-medium border border-rose-200/60 dark:border-rose-800/50"
                                    >
                                      <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                      <span className="truncate max-w-[160px]">{taskObj?.title || bId}</span>
                                      <button
                                        type="button"
                                        onClick={() => setBlockedByIds(prev => prev.filter(id => id !== bId))}
                                        className="hover:text-rose-900 dark:hover:text-rose-100 cursor-pointer ml-0.5"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Custom Fields */}
                      {activeSpaceCustomFields.length > 0 && (
                        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {isVietnamese ? 'Trường tùy chỉnh' : 'Custom Fields'}
                          </p>
                          <div className="space-y-3">
                            {activeSpaceCustomFields.map(field => {
                              const curVal = applyCustomFieldDefaults(activeSpaceCustomFields, customFieldValues)[field.name];
                              return (
                                <div key={field.id || field.name} className="space-y-1">
                                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 block truncate">
                                    {field.name}{field.isRequired && <span className="ml-1 text-rose-500">*</span>}
                                  </label>
                                  {field.description && <p className="text-[10px] text-slate-400">{field.description}</p>}
                                  <CustomFieldInput field={field} value={curVal} members={members} draft onChange={value => setCustomFieldValues(prev => ({ ...prev, [field.name]: value }))} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </form>

          {/* ── FOOTER ── */}
          <div className="task-create-footer px-5 py-3 border-t border-slate-100 dark:border-slate-800/70 bg-slate-50/60 dark:bg-white/[0.02] flex items-center justify-between gap-3 shrink-0">
            {/* Left: Create another / Edit mode indicator */}
            <div className="flex items-center gap-2">
              {!isEditMode ? (
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createAnother}
                    disabled={isSaving}
                    onChange={e => setCreateAnother(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                  />
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {isVietnamese ? 'Tạo & tiếp tục' : 'Create another'}
                  </span>
                </label>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <Edit2 className="w-3 h-3 text-amber-500" />
                  <span>{isVietnamese ? 'Đang chỉnh sửa' : 'Editing'}</span>
                </div>
              )}
            </div>

            {/* Right: Cancel + Submit */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={requestClose}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {isVietnamese ? 'Hủy' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!title.trim() || isSaving || isUploadingAttachment}
                aria-busy={isSaving}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 transition-all ${
                  title.trim()
                    ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] shadow-sm shadow-indigo-500/20 cursor-pointer'
                    : 'bg-slate-300 dark:bg-slate-700 pointer-events-none'
                }`}
              >
                {isEditMode ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>
                  {isSaving ? (isVietnamese ? 'Đang lưu…' : 'Saving…') : isEditMode
                    ? (isVietnamese ? 'Lưu' : 'Save')
                    : (isVietnamese ? 'Tạo' : 'Create')}
                </span>
                <kbd className="hidden sm:inline-flex items-center px-1 py-0.5 rounded bg-white/20 text-[9px] font-mono text-white/80 border border-white/15 ml-0.5">
                  {modKey}↵
                </kbd>
              </button>
            </div>
          </div>
        </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
