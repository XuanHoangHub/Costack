"use client";

import { validateFieldDefinition, migrateTaskCustomField, isEmptyFieldValue } from "@/lib/customFields";
import { getStoredColumnNames, saveColumnNames, saveStatuses, savePriorities, getStoredStatuses, getStoredPriorities } from "@/utils/fieldConfig";

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  SlidersHorizontal, 
  Sparkles, 
  Plus, 
  Eye, 
  EyeOff, 
  Trash2, 
  Cog, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  Tag, 
  Calendar, 
  Hash, 
  AlignLeft, 
  CheckSquare, 
  DollarSign, 
  BarChart3, 
  Star, 
  Mail, 
  Phone, 
  Link as LinkIcon, 
  FileText, 
  User as UserIcon, 
  Bookmark, 
  Folder, 
  Flag, 
  Flame, 
  Layers, 
  Info,
  ArrowUpDown,
  ListChecks,
  CheckCircle2
} from 'lucide-react';
import { Task } from '../../types';
import { useTranslation } from '../../contexts/TranslationContext';
import FieldSettingsModal, { ALL_FIELD_TYPES } from './FieldSettingsModal';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

export interface CustomFieldsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  visibleFields: string[];
  setVisibleFields: (f: string[]) => void;
  customFields: any[];
  setCustomFields: (cf: any[]) => void;
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  activeSpace: any;
  spaces: any[];
  onSaveSpaces?: (newSpaces: any[]) => void;
  openDialog?: (config: { 
    title: string; 
    description: string; 
    onConfirm: () => void; 
    isDestructive?: boolean; 
    confirmText?: string; 
    cancelText?: string;
  }) => void;
  openPromptModal?: (config: any) => void;
  triggerToast?: (type: 'success' | 'error' | 'warning' | 'info' | 'comment', title: string, description: string) => void;
  anchorPosition?: { x: number; y: number } | null;
}

const FIELD_CATEGORY_META: Record<string, { category: 'popular' | 'metrics' | 'choices' | 'contact' | 'text' | 'advanced'; tags: string[] }> = {
  button: { category: 'advanced', tags: ['Nút bấm', 'Thao tác', 'Action', 'Kích hoạt'] },
  checkbox: { category: 'popular', tags: ['Có / Không', 'Checklist', 'Hoàn tất', 'Đánh dấu'] },
  date: { category: 'popular', tags: ['Ngày hạn', 'Lịch trình', 'Kèm giờ', 'Deadline'] },
  dropdown: { category: 'choices', tags: ['Chọn 1 giá trị', 'Màu sắc thẻ', 'Lọc dữ liệu', 'Menu'] },
  email: { category: 'contact', tags: ['Hòm thư', 'Gửi email nhanh', 'Liên hệ'] },
  files: { category: 'advanced', tags: ['Tài liệu', 'Đính kèm', 'Hình ảnh', 'PDF', 'Tệp tin'] },
  formula: { category: 'advanced', tags: ['Công thức', 'Tính toán', 'Toán học', 'Tự động'] },
  labels: { category: 'choices', tags: ['Nhiều nhãn/tags', 'Màu sắc', 'Đa lựa chọn', 'Phân loại'] },
  location: { category: 'contact', tags: ['Địa chỉ', 'Bản đồ', 'Vị trí', 'Chi nhánh', 'Tọa độ'] },
  money: { category: 'metrics', tags: ['VNĐ', 'USD', 'EUR', 'Chi phí', 'Ngân sách', 'Tiền tệ'] },
  number: { category: 'metrics', tags: ['Số nguyên', 'Thập phân', 'Đơn vị', 'Số lượng'] },
  people: { category: 'popular', tags: ['Phân công', 'Thành viên', 'Avatar', 'Người phụ trách'] },
  phone: { category: 'contact', tags: ['Số điện thoại', 'Gọi nhanh', 'Liên lạc', 'Hotline'] },
  progress_auto: { category: 'metrics', tags: ['Tiến độ tự động', 'Subtasks', 'Phần trăm', '% hoàn thành'] },
  progress_manual: { category: 'metrics', tags: ['Tiến độ thủ công', 'Thanh trượt %', '0 - 100%'] },
  rating: { category: 'metrics', tags: ['Sao ⭐', 'Tim ❤️', 'Lửa 🔥', 'Thang điểm', 'Đánh giá'] },
  relationship: { category: 'advanced', tags: ['Mối quan hệ', 'Liên kết Space', 'Tham chiếu'] },
  rollup: { category: 'advanced', tags: ['Tổng hợp', 'Sum', 'Average', 'Thống kê'] },
  signature: { category: 'advanced', tags: ['Chữ ký', 'Ký tên', 'Phê duyệt', 'Xác thực'] },
  tasks: { category: 'advanced', tags: ['Công việc liên kết', 'Tasks', 'Task chéo'] },
  text: { category: 'text', tags: ['Tiêu đề', 'Mã hiệu', 'Ký tự ngắn', 'Văn bản'] },
  textarea: { category: 'text', tags: ['Mô tả chi tiết', 'Ghi chú nhiều dòng', 'Nội dung'] },
  voting: { category: 'metrics', tags: ['Bình chọn', 'Vote', 'Thích 👍', 'Biểu quyết'] },
  website: { category: 'contact', tags: ['Website', 'Figma', 'GitHub', 'Liên kết', 'URL', 'Link'] },
  // Backward compatibility aliases
  progress: { category: 'metrics', tags: ['Thanh trượt %', 'Hoàn thành', '0 - 100%'] },
  url: { category: 'contact', tags: ['Website', 'Figma', 'GitHub', 'Liên kết'] },
  member: { category: 'popular', tags: ['Phân công', 'Thành viên', 'Avatar'] }
};

export default function CustomFieldsManagerModal({
  isOpen,
  onClose,
  visibleFields,
  setVisibleFields,
  customFields,
  setCustomFields,
  tasks,
  onUpdateTask,
  activeSpace,
  spaces,
  onSaveSpaces,
  openDialog,
  triggerToast,
  anchorPosition
}: CustomFieldsManagerModalProps) {
  const { locale } = useTranslation();
  const isVi = locale === 'vi';
  const isDropdown = !!anchorPosition;

  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingFieldConfig, setEditingFieldConfig] = useState<any>(null);

  // Compute dropdown position to stay within viewport
  const dropdownStyle = useMemo(() => {
    if (!anchorPosition) return {};
    const popupW = 380;
    const popupH = 480;
    let left = anchorPosition.x;
    let top = anchorPosition.y + 4;
    // Prevent going off-screen right
    if (typeof window !== 'undefined') {
      if (left + popupW > window.innerWidth - 16) {
        left = window.innerWidth - popupW - 16;
      }
      if (left < 16) left = 16;
      // Prevent going off-screen bottom
      if (top + popupH > window.innerHeight - 16) {
        top = anchorPosition.y - popupH - 4;
      }
      if (top < 16) top = 16;
    }
    return { position: 'fixed' as const, left, top, width: popupW };
  }, [anchorPosition]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !editingFieldConfig) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, editingFieldConfig, onClose]);

  // Standard properties defined by system
  interface PropertyListItem {
    key: string;
    label: string;
    type: string;
    icon: React.ComponentType<{ className?: string }>;
    isStandard: boolean;
    locked?: boolean;
    rawConfig?: any;
  }

  const standardProperties: PropertyListItem[] = useMemo(() => [
    { key: 'title', label: isVi ? 'Tên công việc' : 'Task Name', type: 'text', icon: FileText, isStandard: true, locked: true },
    { key: 'status', label: isVi ? 'Trạng thái' : 'Status', type: 'dropdown', icon: Tag, isStandard: true },
    { key: 'priority', label: isVi ? 'Mức ưu tiên' : 'Priority', type: 'dropdown', icon: Flag, isStandard: true },
    { key: 'assignee', label: isVi ? 'Người phụ trách' : 'Assignee', type: 'member', icon: UserIcon, isStandard: true },
    { key: 'dueDate', label: isVi ? 'Hạn chót' : 'Due Date', type: 'date', icon: Calendar, isStandard: true },
  ], [isVi]);

  // Combined property list
  const allPropertiesList: PropertyListItem[] = useMemo(() => [
    ...standardProperties,
    ...customFields.map((cf): PropertyListItem => {
      const typeMeta = ALL_FIELD_TYPES.find(t => t.id === cf.type) || ALL_FIELD_TYPES[0];
      return {
        key: cf.name,
        label: cf.name,
        type: cf.type || 'text',
        icon: typeMeta.icon,
        isStandard: false,
        rawConfig: cf
      };
    })
  ], [standardProperties, customFields]);

  // Filtered field catalog for Tab 1 (Create)
  const filteredCatalog = useMemo(() => {
    return ALL_FIELD_TYPES.filter(f => {
      const meta = FIELD_CATEGORY_META[f.id];
      const matchCategory = selectedCategory === 'all' || 
        (selectedCategory === 'popular' && (meta?.category === 'popular' || ['text', 'number', 'date', 'dropdown', 'labels', 'checkbox'].includes(f.id))) ||
        meta?.category === selectedCategory;

      if (!matchCategory) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        f.label.toLowerCase().includes(q) ||
        f.labelEn.toLowerCase().includes(q) ||
        f.desc.toLowerCase().includes(q) ||
        (meta?.tags && meta.tags.some(t => t.toLowerCase().includes(q)))
      );
    });
  }, [search, selectedCategory]);

  // Filtered properties for Tab 2 (Manage)
  const filteredProperties: PropertyListItem[] = useMemo(() => {
    if (!search.trim()) return allPropertiesList;
    const q = search.toLowerCase();
    return allPropertiesList.filter(p => 
      p.label.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)
    );
  }, [allPropertiesList, search]);

  const customPropertiesOnly: PropertyListItem[] = useMemo(() => {
    return filteredProperties.filter(p => !p.isStandard);
  }, [filteredProperties]);

  const standardPropertiesOnly: PropertyListItem[] = useMemo(() => {
    return filteredProperties.filter(p => p.isStandard);
  }, [filteredProperties]);

  // Handle open creation studio
  const handleOpenCreateStudio = (fieldMeta: typeof ALL_FIELD_TYPES[0]) => {
    setEditingFieldConfig({
      id: `cf-${Date.now()}`,
      name: isVi ? fieldMeta.label.split('(')[0].trim() : fieldMeta.labelEn,
      type: fieldMeta.id,
      isNew: true,
      isStandard: false,
      options: (fieldMeta.id === 'dropdown' || fieldMeta.id === 'labels') ? [
        { id: 'opt-1', label: isVi ? 'Kế hoạch' : 'Planning', color: 'blue' },
        { id: 'opt-2', label: isVi ? 'Đang làm' : 'In Progress', color: 'amber' },
        { id: 'opt-3', label: isVi ? 'Hoàn thành' : 'Completed', color: 'emerald' }
      ] : undefined
    });
  };

  // Handle open edit studio
  const handleOpenEditStudio = (prop: any) => {
    if (prop.isStandard) {
      setEditingFieldConfig({
        id: prop.key,
        name: prop.label,
        type: prop.type,
        isStandard: true,
        options: prop.key === 'status' ? getStoredStatuses() : prop.key === 'priority' ? getStoredPriorities() : undefined,
        isNew: false
      });
    } else {
      const cf = prop.rawConfig || customFields.find(f => f.name === prop.key);
      if (cf) {
        setEditingFieldConfig({
          id: cf.id || `cf-${Date.now()}`,
          name: cf.name,
          type: cf.type || 'text',
          isStandard: false,
          isNew: false,
          options: cf.options,
          placeholder: cf.placeholder,
          description: cf.description,
          isRequired: cf.isRequired,
          currencySymbol: cf.currencySymbol,
          currencyPosition: cf.currencyPosition,
          numberFormat: cf.numberFormat,
          numberMin: cf.numberMin,
          numberMax: cf.numberMax,
          numberPrecision: cf.numberPrecision,
          numberUnit: cf.numberUnit,
          dateFormat: cf.dateFormat,
          includeTime: cf.includeTime,
          defaultToToday: cf.defaultToToday,
          ratingMax: cf.ratingMax,
          ratingIcon: cf.ratingIcon,
          checkboxLabel: cf.checkboxLabel,
          progressMax: cf.progressMax,
          allowMultiple: cf.allowMultiple,
          defaultValue: cf.defaultValue
        });
      }
    }
  };

  // Save changes from FieldSettingsModal
  const handleSaveFieldFromModal = (updated: any) => {
    if (!editingFieldConfig) return false;
    if (editingFieldConfig.isStandard) {
      saveColumnNames({ ...getStoredColumnNames(), [editingFieldConfig.id]: updated.name });
      if (editingFieldConfig.id === 'status' && updated.options) saveStatuses(updated.options);
      if (editingFieldConfig.id === 'priority' && updated.options) savePriorities(updated.options);
    } else {
      const previous = customFields.find(field => field.id === editingFieldConfig.id);
      const field = { ...previous, ...updated, id: editingFieldConfig.id, name: updated.name.trim() };
      const message = validateFieldDefinition(field, customFields, locale);
      if (message) {
        triggerToast?.('warning', isVi ? 'Không thể lưu trường' : 'Cannot save field', message);
        return false;
      }
      const next = editingFieldConfig.isNew ? [...customFields, field] : customFields.map(item => item.id === field.id ? field : item);
      setCustomFields(next);
      if (onSaveSpaces && activeSpace) onSaveSpaces(spaces.map(space => space.id === activeSpace.id ? { ...space, customFields: next } : space));
      if (editingFieldConfig.isNew) {
        setVisibleFields([...new Set([...visibleFields, field.name])]);
      } else if (previous) {
        setVisibleFields(visibleFields.map(name => name === previous.name ? field.name : name));
        tasks.forEach(task => {
          const nextTask = migrateTaskCustomField(task, activeSpace.id, previous, field);
          if (nextTask !== task) onUpdateTask(nextTask);
        });
      }
    }
    window.dispatchEvent(new Event('apexa-field-config-changed'));
    triggerToast?.('success', isVi ? 'Đã lưu trường dữ liệu' : 'Field saved', updated.name);
    setActiveTab('manage');
    setEditingFieldConfig(null);
    return true;
  };

  // Reorder custom fields
  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= customFields.length) return;

    const reordered = [...customFields];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    setCustomFields(reordered);
    if (onSaveSpaces && spaces && activeSpace) {
      const updatedSpace = {
        ...activeSpace,
        customFields: reordered
      };
      onSaveSpaces(spaces.map(s => s.id === activeSpace.id ? updatedSpace : s));
    }
  };

  // Delete custom field
  const handleDeleteField = (fieldName: string) => {
    const performDelete = () => {
      const updatedCustomFields = customFields.filter(f => f.name !== fieldName);
      setCustomFields(updatedCustomFields);

      if (visibleFields.includes(fieldName)) {
        setVisibleFields(visibleFields.filter(f => f !== fieldName));
      }

      if (onSaveSpaces && spaces && activeSpace) {
        const updatedSpace = {
          ...activeSpace,
          customFields: updatedCustomFields
        };
        onSaveSpaces(spaces.map(s => s.id === activeSpace.id ? updatedSpace : s));
      }

      tasks.forEach(t => {
        if (t.spaceId === activeSpace.id && t.custom_fields && fieldName in t.custom_fields) {
          const nextCustomFields = { ...t.custom_fields };
          delete nextCustomFields[fieldName];
          onUpdateTask({
            ...t,
            custom_fields: nextCustomFields
          });
        }
      });

      triggerToast?.('info', isVi ? 'Đã xóa trường' : 'Field Deleted', isVi ? `Đã xóa trường “${fieldName}” khỏi Space.` : `Field "${fieldName}" deleted.`);
    };

    if (openDialog) {
      openDialog({
        title: isVi ? 'Xóa trường tùy chỉnh' : 'Delete Custom Field',
        description: isVi 
          ? `Bạn có chắc chắn muốn xóa trường tùy chỉnh "${fieldName}"? Hành động này sẽ xóa trường này và toàn bộ dữ liệu của nó khỏi tất cả công việc trong Không gian này vĩnh viễn.`
          : `Are you sure you want to delete "${fieldName}"? This will permanently remove this field and its data from all tasks in this space.`,
        onConfirm: performDelete,
        isDestructive: true,
        confirmText: isVi ? 'Xóa vĩnh viễn' : 'Delete permanently',
        cancelText: isVi ? 'Hủy' : 'Cancel'
      });
    } else if (confirm(`Bạn có chắc chắn muốn xóa trường "${fieldName}"?`)) {
      performDelete();
    }
  };

  // Toggle field visibility
  const toggleFieldVisibility = (fieldKey: string) => {
    if (visibleFields.includes(fieldKey)) {
      if (fieldKey === 'title') return;
      setVisibleFields(visibleFields.filter(f => f !== fieldKey));
    } else {
      setVisibleFields([...visibleFields, fieldKey]);
    }
  };

  // Show all or hide all
  const handleShowAll = () => {
    const allKeys = allPropertiesList.map(p => p.key);
    setVisibleFields(allKeys);
    triggerToast?.('success', isVi ? 'Đã hiện tất cả' : 'All Visible', isVi ? 'Tất cả các cột thuộc tính đã được bật.' : 'All columns enabled.');
  };

  const handleResetVisibility = () => {
    setVisibleFields(['title', 'status', 'priority', 'assignee', 'dueDate']);
    triggerToast?.('info', isVi ? 'Khôi phục mặc định' : 'Reset Defaults', isVi ? 'Đã đặt lại các cột cơ bản.' : 'Reset to default columns.');
  };

  if (isDropdown) {
    return (
      <Portal>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="custom-fields-dropdown-wrapper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Backdrop for click outside - Pure transparent, zero blur */}
              <div 
                className="fixed inset-0 z-[120] bg-transparent cursor-default"
                onClick={onClose}
                aria-hidden="true"
              />

              {/* Floating Dropdown Popup positioned right at the "+" button */}
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={isVi ? 'Thêm trường tùy chỉnh' : 'Add custom field'}
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className="fixed z-[121] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-[0_16px_40px_-8px_rgba(0,0,0,0.18),0_6px_16px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8),0_8px_20px_-4px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden text-slate-800 dark:text-zinc-100 select-none"
                style={{
                  left: `${dropdownStyle.left}px`,
                  top: `${dropdownStyle.top}px`,
                  width: `${dropdownStyle.width || 360}px`,
                  maxHeight: 'min(520px, 85vh)'
                }}
              >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-100 tracking-tight leading-tight">
                  {isVi ? 'Thêm trường dữ liệu' : 'Add Custom Field'}
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-zinc-400 font-medium">
                  {isVi ? 'Chọn loại trường hoặc quản lý cột' : 'Select field type or manage columns'}
                </p>
              </div>
            </div>

            <button 
              type="button"
              onClick={onClose}
              className="w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
              title={isVi ? 'Đóng (Esc)' : 'Close (Esc)'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search bar & Tabs */}
          <div className="p-2.5 border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isVi ? 'Tìm loại trường...' : 'Search field types...'} 
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-zinc-800/70 border border-slate-200/90 dark:border-zinc-700/80 rounded-xl outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-850 focus:ring-1 focus:ring-blue-500/20 transition-all text-slate-800 dark:text-zinc-100 font-medium placeholder:text-slate-400" 
              />
              {search && (
                <button 
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Compact Segmented Tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'create'
                    ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>{isVi ? 'Loại trường' : 'Field Types'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('manage')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'manage'
                    ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>{isVi ? 'Cột hiển thị' : 'Columns'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200">
                  {visibleFields.length}
                </span>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {activeTab === 'create' && (
              <div className="space-y-1.5">
                {/* Category Pills */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 px-0.5">
                  {[
                    { id: 'all', label: isVi ? 'Tất cả' : 'All' },
                    { id: 'popular', label: isVi ? '🔥 Phổ biến' : '🔥 Popular' },
                    { id: 'metrics', label: isVi ? '🔢 Số & Tiền' : '🔢 Metrics' },
                    { id: 'choices', label: isVi ? '🏷️ Nhãn' : '🏷️ Labels' },
                    { id: 'contact', label: isVi ? '🌐 Link' : '🌐 Links' },
                    { id: 'text', label: isVi ? '📝 Chữ' : '📝 Text' },
                    { id: 'advanced', label: isVi ? '⚡ Nâng cao' : '⚡ Advanced' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200/80 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* List of field types */}
                {filteredCatalog.length === 0 ? (
                  <div className="text-center py-8 space-y-1.5">
                    <p className="text-xs font-bold text-slate-400">
                      {isVi ? 'Không tìm thấy loại trường' : 'No field types found'}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setSearch(''); setSelectedCategory('all'); }}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {isVi ? 'Xem tất cả' : 'View all'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {filteredCatalog.map(fc => {
                      const IconComp = fc.icon;
                      return (
                        <button
                          key={fc.id}
                          type="button"
                          onClick={() => handleOpenCreateStudio(fc)}
                          className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/80 bg-transparent hover:bg-slate-100/90 dark:hover:bg-zinc-800/80 transition-all text-left group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${fc.color} text-white flex items-center justify-center shadow-2xs shrink-0 group-hover:scale-105 transition-transform`}>
                              <IconComp className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors">
                                {isVi ? fc.label : fc.labelEn}
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-zinc-400 truncate">
                                {isVi ? fc.desc : fc.labelEn}
                              </div>
                            </div>
                          </div>

                          <span className="shrink-0 text-[10px] font-bold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50">
                            <Plus className="w-3 h-3" />
                            <span>{isVi ? 'Thêm' : 'Add'}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'manage' && (
              <div className="space-y-3">
                {/* Quick actions */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {visibleFields.length} / {allPropertiesList.length} {isVi ? 'cột hiển thị' : 'visible'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleShowAll}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200/80 text-[10px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      {isVi ? 'Hiện tất cả' : 'Show All'}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetVisibility}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200/80 text-[10px] font-bold text-slate-400 cursor-pointer"
                    >
                      {isVi ? 'Đặt lại' : 'Reset'}
                    </button>
                  </div>
                </div>

                {/* Properties list */}
                <div className="space-y-1">
                  {filteredProperties.map(prop => {
                    const IconComponent = prop.icon || Tag;
                    const isVisible = visibleFields.includes(prop.key);
                    const isLocked = prop.locked;

                    return (
                      <div
                        key={prop.key}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                          isVisible
                            ? 'bg-white dark:bg-zinc-800/80 border-slate-200/90 dark:border-zinc-700/80 shadow-2xs'
                            : 'bg-slate-50/50 dark:bg-zinc-850/40 border-transparent opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                            <IconComponent className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {prop.label}
                            </div>
                            <div className="text-[9px] text-slate-400 uppercase tracking-wider">
                              {prop.isStandard ? (isVi ? 'Hệ thống' : 'System') : prop.type}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {!prop.isStandard && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditStudio(prop)}
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                title={isVi ? 'Cài đặt' : 'Settings'}
                              >
                                <Cog className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteField(prop.key)}
                                className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title={isVi ? 'Xóa' : 'Delete'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <label className="relative inline-flex items-center cursor-pointer ml-1">
                            <input
                              type="checkbox"
                              checked={isVisible}
                              disabled={isLocked}
                              onChange={() => toggleFieldVisibility(prop.key)}
                              className="sr-only peer"
                            />
                            <div className={`w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600 ${
                              isLocked ? 'opacity-40 cursor-not-allowed' : ''
                            }`}></div>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sub-modal studio */}
          {editingFieldConfig && (
            <FieldSettingsModal
              existingFields={customFields}
              config={editingFieldConfig}
              onClose={() => setEditingFieldConfig(null)}
              onSave={handleSaveFieldFromModal}
            />
          )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    );
  }

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="custom-fields-modal-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 md:p-8 font-sans select-none"
          >
            {/* Backdrop - Clean dark overlay */}
            <div 
              className="fixed inset-0 bg-black/40 dark:bg-black/65 transition-opacity cursor-pointer modal-backdrop-blur"
              onClick={onClose}
              aria-hidden="true"
            />

            {/* Centered Modal Window */}
            <motion.div 
              role="dialog"
              aria-modal="true"
              aria-label={isVi ? 'Quản lý trường dữ liệu' : 'Manage custom fields'}
              initial={{ scale: 0.94, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 16, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="relative w-full max-w-4xl max-h-[88vh] bg-white dark:bg-[#0a0b10] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10"
            >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-white/10 bg-white dark:bg-[#0a0b10] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs shrink-0">
                <SlidersHorizontal className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-100 tracking-tight">
                    {isVi ? 'Trường dữ liệu & Thuộc tính' : 'Custom Fields & Properties'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                    {allPropertiesList.length} {isVi ? 'thuộc tính' : 'properties'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
                  {isVi 
                    ? 'Tùy biến cấu hình cột, thêm trường dữ liệu tùy chỉnh và kiểm soát hiển thị trong Không gian'
                    : 'Customize column attributes, create custom fields and control visibility across views'}
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="w-7 h-7 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
              title={isVi ? 'Đóng (Esc)' : 'Close (Esc)'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation & Action Bar */}
          <div className="px-6 py-2.5 border-b border-slate-100 dark:border-white/10 bg-white dark:bg-[#0a0b10] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'create'
                    ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isVi ? 'Khám phá & Tạo mới' : 'Explore & Create'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('manage')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'manage'
                    ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isVi ? 'Quản lý thuộc tính' : 'Manage Properties'}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'manage'
                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-200 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400'
                }`}>
                  {allPropertiesList.length}
                </span>
              </button>
            </div>

            {/* Global Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isVi ? 'Tìm kiếm loại trường hoặc thuộc tính...' : 'Search field types or attributes...'} 
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-zinc-800/70 border border-slate-200/90 dark:border-zinc-700/80 rounded-xl outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-850 focus:ring-1 focus:ring-blue-500/20 transition-all text-slate-800 dark:text-zinc-100 font-medium placeholder:text-slate-400" 
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Modal Content Scroll Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            {/* TAB 1: EXPLORE & CREATE NEW FIELD */}
            {activeTab === 'create' && (
              <div className="space-y-5">
                {/* Category Pills */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
                  {[
                    { id: 'all', label: isVi ? 'Tất cả' : 'All' },
                    { id: 'popular', label: isVi ? '🔥 Phổ biến' : '🔥 Popular' },
                    { id: 'metrics', label: isVi ? '🔢 Số & Đo lường' : '🔢 Metrics & Money' },
                    { id: 'choices', label: isVi ? '🏷️ Lựa chọn & Nhãn' : '🏷️ Options & Labels' },
                    { id: 'contact', label: isVi ? '🌐 Liên kết & Web' : '🌐 Links & Contact' },
                    { id: 'text', label: isVi ? '📝 Văn bản & Ghi chú' : '📝 Text & Notes' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                        selectedCategory === cat.id
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                          : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* 3-Column Responsive Grid of Field Cards */}
                {filteredCatalog.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      {isVi ? 'Không tìm thấy loại trường phù hợp' : 'No field types matching your search'}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setSearch(''); setSelectedCategory('all'); }}
                      className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {isVi ? 'Xem tất cả các loại trường' : 'View all field types'}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredCatalog.map(fc => {
                      const IconComp = fc.icon;
                      const meta = FIELD_CATEGORY_META[fc.id];
                      return (
                        <div
                          key={fc.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`${isVi ? 'Tạo trường' : 'Create field'} ${isVi ? fc.label : fc.labelEn}`}
                          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleOpenCreateStudio(fc); } }}
                          onClick={() => handleOpenCreateStudio(fc)}
                          className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0d0f15] hover:border-indigo-400 dark:hover:border-blue-500/60 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group flex flex-col justify-between"
                        >
                          <div>
                            {/* Top row */}
                            <div className="flex items-center justify-between mb-3">
                              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${fc.color} text-white flex items-center justify-center shadow-md shadow-blue-500/15 group-hover:scale-110 transition-transform`}>
                                <IconComp className="w-4.5 h-4.5 stroke-[2.5]" />
                              </div>

                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-blue-400 bg-indigo-50 dark:bg-blue-600/10 px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus className="w-3 h-3" />
                                {isVi ? 'Tạo' : 'Add'}
                              </span>
                            </div>

                            {/* Title & Desc */}
                            <h3 className="text-xs font-black text-slate-850 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-blue-400 transition-colors">
                              {isVi ? fc.label : fc.labelEn}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                              {isVi ? fc.desc : fc.labelEn}
                            </p>
                          </div>

                          {/* Feature tags */}
                          {isVi && meta?.tags && (
                            <div className="flex flex-wrap gap-1 mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.04]">
                              {meta.tags.slice(0, 3).map((tag, idx) => (
                                <span 
                                  key={idx} 
                                  className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.04] px-1.5 py-0.5 rounded-md"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: MANAGE PROPERTIES (LIST & REORDER) */}
            {activeTab === 'manage' && (
              <div className="space-y-6">
                {/* Stats & Quick Actions Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-[#0d0f15] border border-slate-200/80 dark:border-white/[0.06]">
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs">
                      {allPropertiesList.length}
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{isVi ? 'Tổng số thuộc tính' : 'Total Fields'}</div>
                      <div className="text-xs font-black text-slate-800 dark:text-slate-200">{customFields.length} {isVi ? 'tùy chỉnh' : 'custom'} • {standardProperties.length} {isVi ? 'hệ thống' : 'standard'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-2 border-t sm:border-t-0 sm:border-l border-slate-200/60 dark:border-white/[0.06] pt-2 sm:pt-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs">
                      {visibleFields.length}
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{isVi ? 'Đang hiển thị' : 'Active Columns'}</div>
                      <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">{visibleFields.length} / {allPropertiesList.length} {isVi ? 'cột' : 'columns'}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 sm:border-l border-slate-200/60 dark:border-white/[0.06] pt-2 sm:pt-0 sm:pl-3">
                    <button
                      type="button"
                      onClick={handleShowAll}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer shadow-3xs transition-colors"
                    >
                      {isVi ? 'Hiện tất cả' : 'Show All'}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetVisibility}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 text-[11px] font-bold text-slate-500 dark:text-slate-400 cursor-pointer shadow-3xs transition-colors"
                    >
                      {isVi ? 'Đặt lại' : 'Reset'}
                    </button>
                  </div>
                </div>

                {/* Section 1: Custom Fields */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-2">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                        {isVi ? 'Trường tùy chỉnh của Space' : 'Custom Fields of this Space'}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                        {customFields.length}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('create')}
                      className="text-xs font-bold text-indigo-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isVi ? 'Tạo trường mới' : 'Add Field'}</span>
                    </button>
                  </div>

                  {customPropertiesOnly.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] space-y-2">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {isVi ? 'Chưa có trường tùy chỉnh nào trong Không gian này' : 'No custom fields in this Space yet'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('create')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-500/25 hover:bg-indigo-700 cursor-pointer transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isVi ? 'Tạo trường đầu tiên' : 'Create first field'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customPropertiesOnly.map((prop) => {
                        const index = customFields.findIndex(field => field.id === prop.rawConfig?.id);
                        const scoped = tasks.filter(task => task.spaceId === activeSpace?.id && !task.deletedAt);
                        const filled = scoped.filter(task => !isEmptyFieldValue(task.custom_fields?.[prop.key])).length;
                        const IconComponent = prop.icon || Tag;
                        const isVisible = visibleFields.includes(prop.key);
                        return (
                          <div 
                            key={prop.key}
                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                              isVisible 
                                ? 'bg-white dark:bg-[#0d0f15] border-slate-200/90 dark:border-white/[0.08] shadow-3xs' 
                                : 'bg-slate-50/50 dark:bg-[#07080c]/60 border-slate-200/50 dark:border-white/[0.04] opacity-75'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Reorder buttons */}
                              <div className="flex flex-col gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleMoveField(index, 'up')}
                                  disabled={index === 0}
                                  className="p-0.5 text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                                  title={isVi ? 'Chuyển lên' : 'Move up'}
                                >
                                  <ChevronUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveField(index, 'down')}
                                  disabled={index === customFields.length - 1}
                                  className="p-0.5 text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                                  title={isVi ? 'Chuyển xuống' : 'Move down'}
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                              </div>

                              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                <IconComponent className="w-4 h-4" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-slate-850 dark:text-slate-100 truncate block">
                                    {prop.label}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400">
                                    {prop.type}
                                  </span>
                                  {prop.rawConfig?.numberUnit && (
                                    <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40">
                                      {prop.rawConfig.numberUnit}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-[10px] text-slate-400">
                                  {filled}/{scoped.length} {isVi ? 'Task đã điền' : 'tasks filled'}{prop.rawConfig?.isRequired ? (isVi ? ' · Bắt buộc khi hoàn thành' : ' · Required to complete') : ''}
                                </p>
                                {prop.rawConfig?.description && (
                                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                    {prop.rawConfig.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 shrink-0">
                              {/* Configure Studio Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditStudio(prop)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-600 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors shadow-3xs"
                                title={isVi ? 'Cài đặt cấu hình trường' : 'Configure field'}
                              >
                                <Cog className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{isVi ? 'Cài đặt' : 'Settings'}</span>
                              </button>

                              {/* Delete button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteField(prop.key)}
                                className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                                title={isVi ? 'Xóa trường' : 'Delete field'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                              {/* Visibility Toggle Switch */}
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  aria-label={`${isVi ? 'Hiển thị trường' : 'Show field'} ${prop.label}`}
                                  checked={isVisible}
                                  onChange={() => toggleFieldVisibility(prop.key)}
                                  className="sr-only peer" 
                                />
                                <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section 2: Standard System Properties */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-2">
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-slate-400" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        {isVi ? 'Trường hệ thống' : 'Standard System Properties'}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/[0.06] text-slate-500">
                        {standardProperties.length}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {standardPropertiesOnly.map(prop => {
                      const IconComponent = prop.icon || Tag;
                      const isVisible = visibleFields.includes(prop.key);
                      const isLocked = prop.locked;

                      return (
                        <div 
                          key={prop.key}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                            isVisible 
                              ? 'bg-white dark:bg-[#0d0f15] border-slate-200/90 dark:border-white/[0.08] shadow-3xs' 
                              : 'bg-slate-50/50 dark:bg-[#07080c]/60 border-slate-200/50 dark:border-white/[0.04] opacity-75'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                              <IconComponent className="w-4 h-4" />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                                  {prop.label}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-white/[0.04] text-slate-400">
                                  {isVi ? 'Hệ thống' : 'System'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {/* Option edit for status/priority/date */}
                            {['status', 'priority', 'dueDate'].includes(prop.key) && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditStudio(prop)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-600 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors shadow-3xs"
                                title={isVi ? 'Tùy biến tùy chọn' : 'Configure options'}
                              >
                                <Cog className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{isVi ? 'Tùy chọn' : 'Options'}</span>
                              </button>
                            )}

                            {/* Visibility Toggle Switch */}
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={isVisible}
                                disabled={isLocked}
                                onChange={() => toggleFieldVisibility(prop.key)}
                                className="sr-only peer" 
                              />
                              <div className={`w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600 ${
                                isLocked ? 'opacity-40 cursor-not-allowed' : ''
                              }`}></div>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3.5 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/60 dark:bg-[#07080c] flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isVi 
                  ? 'Trường tùy chỉnh được đồng bộ vào tất cả các dạng xem (Bảng, Kanban, Chi tiết).' 
                  : 'Custom fields synchronize automatically across all views (Table, Board, Details).'}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              {isVi ? 'Hoàn tất' : 'Done'}
            </button>
          </div>
            </motion.div>

            {/* Field Settings Studio Sub-modal */}
            {editingFieldConfig && (
              <FieldSettingsModal
                existingFields={customFields}
                config={editingFieldConfig}
                onClose={() => setEditingFieldConfig(null)}
                onSave={handleSaveFieldFromModal}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
