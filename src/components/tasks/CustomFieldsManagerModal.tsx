"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
}

const FIELD_CATEGORY_META: Record<string, { category: 'popular' | 'metrics' | 'choices' | 'contact' | 'text'; tags: string[] }> = {
  text: { category: 'text', tags: ['Tiêu đề', 'Mã hiệu', 'Ký tự ngắn'] },
  number: { category: 'metrics', tags: ['Số nguyên', 'Thập phân', 'Đơn vị'] },
  date: { category: 'popular', tags: ['Ngày hạn', 'Lịch trình', 'Kèm giờ'] },
  textarea: { category: 'text', tags: ['Mô tả chi tiết', 'Ghi chú nhiều dòng'] },
  dropdown: { category: 'choices', tags: ['Chọn 1 giá trị', 'Màu sắc thẻ', 'Lọc dữ liệu'] },
  labels: { category: 'choices', tags: ['Nhiều nhãn/tags', 'Màu sắc', 'Đa lựa chọn'] },
  checkbox: { category: 'popular', tags: ['Có / Không', 'Checklist', 'Hoàn tất'] },
  money: { category: 'metrics', tags: ['VNĐ', 'USD', 'EUR', 'Chi phí', 'Ngân sách'] },
  rating: { category: 'metrics', tags: ['Sao ⭐', 'Tim ❤️', 'Lửa 🔥', 'Thang điểm'] },
  progress: { category: 'metrics', tags: ['Thanh trượt %', 'Hoàn thành', '0 - 100%'] },
  email: { category: 'contact', tags: ['Hòm thư', 'Gửi email nhanh'] },
  phone: { category: 'contact', tags: ['Số điện thoại', 'Gọi nhanh'] },
  url: { category: 'contact', tags: ['Website', 'Figma', 'GitHub', 'Liên kết'] },
  member: { category: 'text', tags: ['Phân công', 'Thành viên', 'Avatar'] }
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
  triggerToast
}: CustomFieldsManagerModalProps) {
  const { locale } = useTranslation();
  const isVi = locale === 'vi';

  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingFieldConfig, setEditingFieldConfig] = useState<any>(null);

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
    { key: 'progress', label: isVi ? 'Tiến độ' : 'Progress', type: 'progress', icon: BarChart3, isStandard: true },
    { key: 'tags', label: isVi ? 'Thẻ phân loại' : 'Tags', type: 'labels', icon: Bookmark, isStandard: true },
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
    if (!editingFieldConfig) return;

    if (editingFieldConfig.isNew) {
      const cleanName = updated.name.trim();
      if (customFields.some(f => f.name.toLowerCase() === cleanName.toLowerCase())) {
        triggerToast?.('warning', isVi ? 'Tên trường đã tồn tại' : 'Field name exists', isVi ? `Hãy chọn tên khác cho “${cleanName}”.` : `Please pick another name for "${cleanName}".`);
        return;
      }

      const newField = {
        id: editingFieldConfig.id || `cf-${Date.now()}`,
        name: cleanName,
        type: updated.type,
        options: updated.options,
        placeholder: updated.placeholder,
        description: updated.description,
        isRequired: updated.isRequired,
        currencySymbol: updated.currencySymbol,
        currencyPosition: updated.currencyPosition,
        numberFormat: updated.numberFormat,
        numberMin: updated.numberMin,
        numberMax: updated.numberMax,
        numberPrecision: updated.numberPrecision,
        numberUnit: updated.numberUnit,
        dateFormat: updated.dateFormat,
        includeTime: updated.includeTime,
        defaultToToday: updated.defaultToToday,
        ratingMax: updated.ratingMax,
        ratingIcon: updated.ratingIcon,
        checkboxLabel: updated.checkboxLabel,
        progressMax: updated.progressMax,
        allowMultiple: updated.allowMultiple,
        defaultValue: updated.defaultValue
      };

      const updatedCustomFields = [...customFields, newField];
      setCustomFields(updatedCustomFields);
      setVisibleFields([...visibleFields, cleanName]);

      if (onSaveSpaces && spaces && activeSpace) {
        const updatedSpace = {
          ...activeSpace,
          customFields: updatedCustomFields
        };
        onSaveSpaces(spaces.map(s => s.id === activeSpace.id ? updatedSpace : s));
      }

      tasks.forEach(t => {
        onUpdateTask({
          ...t,
          custom_fields: {
            ...(t.custom_fields || {}),
            [cleanName]: updated.defaultValue !== undefined ? updated.defaultValue : ''
          }
        });
      });

      triggerToast?.('success', isVi ? 'Tạo trường thành công' : 'Field Created', isVi ? `Trường “${cleanName}” đã được thêm vào Không gian.` : `Field "${cleanName}" has been added.`);
      setActiveTab('manage');
    } else {
      const oldName = editingFieldConfig.name;
      const newName = updated.name.trim();

      const updatedCustomFields = customFields.map(cf => {
        if (cf.name === oldName || cf.id === editingFieldConfig.id) {
          return {
            ...cf,
            name: newName,
            type: updated.type,
            options: updated.options,
            placeholder: updated.placeholder,
            description: updated.description,
            isRequired: updated.isRequired,
            currencySymbol: updated.currencySymbol,
            currencyPosition: updated.currencyPosition,
            numberFormat: updated.numberFormat,
            numberMin: updated.numberMin,
            numberMax: updated.numberMax,
            numberPrecision: updated.numberPrecision,
            numberUnit: updated.numberUnit,
            dateFormat: updated.dateFormat,
            includeTime: updated.includeTime,
            defaultToToday: updated.defaultToToday,
            ratingMax: updated.ratingMax,
            ratingIcon: updated.ratingIcon,
            checkboxLabel: updated.checkboxLabel,
            progressMax: updated.progressMax,
            allowMultiple: updated.allowMultiple,
            defaultValue: updated.defaultValue
          };
        }
        return cf;
      });

      setCustomFields(updatedCustomFields);

      if (oldName !== newName) {
        setVisibleFields(visibleFields.map(f => f === oldName ? newName : f));

        tasks.forEach(t => {
          if (t.custom_fields && oldName in t.custom_fields) {
            const { [oldName]: oldVal, ...rest } = t.custom_fields;
            onUpdateTask({
              ...t,
              custom_fields: {
                ...rest,
                [newName]: oldVal
              }
            });
          }
        });
      }

      if (onSaveSpaces && spaces && activeSpace) {
        const updatedSpace = {
          ...activeSpace,
          customFields: updatedCustomFields
        };
        onSaveSpaces(spaces.map(s => s.id === activeSpace.id ? updatedSpace : s));
      }

      triggerToast?.('success', isVi ? 'Cập nhật thành công' : 'Updated Field', isVi ? `Cấu hình trường “${newName}” đã được lưu.` : `Configuration for "${newName}" saved.`);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('apexa-field-config-changed'));
    }

    setEditingFieldConfig(null);
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

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 md:p-8 font-sans select-none animate-in fade-in duration-200">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 modal-backdrop bg-black/25 dark:bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Centered Modal Window */}
        <div 
          className="relative w-full max-w-4xl max-h-[88vh] bg-white dark:bg-[#13151b] border border-slate-200/90 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200"
          style={{
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/60 dark:bg-[#161922] shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
                <SlidersHorizontal className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-850 dark:text-white tracking-tight">
                    {isVi ? 'Trường dữ liệu & Thuộc tính' : 'Custom Fields & Properties'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50">
                    {allPropertiesList.length} {isVi ? 'thuộc tính' : 'properties'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  {isVi 
                    ? 'Tùy biến cấu hình cột, thêm trường dữ liệu tùy chỉnh và kiểm soát hiển thị trong Không gian'
                    : 'Customize column attributes, create custom fields and control visibility across views'}
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-200/70 dark:hover:bg-white/[0.08] rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              title={isVi ? 'Đóng (Esc)' : 'Close (Esc)'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation & Action Bar */}
          <div className="px-6 py-3 border-b border-slate-100 dark:border-white/[0.06] bg-white dark:bg-[#13151b] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#1a1d26] rounded-2xl shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'create'
                    ? 'bg-white dark:bg-blue-600 text-indigo-700 dark:text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isVi ? '✨ Khám phá & Tạo mới' : 'Explore & Create'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('manage')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'manage'
                    ? 'bg-white dark:bg-blue-600 text-indigo-700 dark:text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isVi ? '⚙️ Quản lý thuộc tính' : 'Manage Properties'}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'manage'
                    ? 'bg-indigo-100 dark:bg-white/20 text-indigo-800 dark:text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
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
                className="w-full pl-8 pr-7 py-2 text-xs bg-slate-50 dark:bg-[#1a1d26] border border-slate-200/80 dark:border-white/[0.08] rounded-xl outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-[#13151b] focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800 dark:text-slate-100 font-semibold placeholder:text-slate-400" 
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
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
                          onClick={() => handleOpenCreateStudio(fc)}
                          className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#181b24] hover:border-indigo-400 dark:hover:border-blue-500/60 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group flex flex-col justify-between"
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
                              {fc.label}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                              {fc.desc}
                            </p>
                          </div>

                          {/* Feature tags */}
                          {meta?.tags && (
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-[#181b24] border border-slate-200/80 dark:border-white/[0.06]">
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
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1f2330] border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer shadow-3xs transition-colors"
                    >
                      {isVi ? 'Hiện tất cả' : 'Show All'}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetVisibility}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1f2330] border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 text-[11px] font-bold text-slate-500 dark:text-slate-400 cursor-pointer shadow-3xs transition-colors"
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
                      {customPropertiesOnly.map((prop, index) => {
                        const IconComponent = prop.icon || Tag;
                        const isVisible = visibleFields.includes(prop.key);
                        return (
                          <div 
                            key={prop.key}
                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                              isVisible 
                                ? 'bg-white dark:bg-[#181b24] border-slate-200/90 dark:border-white/[0.08] shadow-3xs' 
                                : 'bg-slate-50/50 dark:bg-[#14161e]/60 border-slate-200/50 dark:border-white/[0.04] opacity-75'
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
                                  disabled={index === customPropertiesOnly.length - 1}
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
                              ? 'bg-white dark:bg-[#181b24] border-slate-200/90 dark:border-white/[0.08] shadow-3xs' 
                              : 'bg-slate-50/50 dark:bg-[#14161e]/60 border-slate-200/50 dark:border-white/[0.04] opacity-75'
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
          <div className="px-6 py-3.5 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/60 dark:bg-[#161922] flex items-center justify-between text-xs shrink-0">
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
        </div>

        {/* Field Settings Studio Sub-modal */}
        {editingFieldConfig && (
          <FieldSettingsModal
            config={editingFieldConfig}
            onClose={() => setEditingFieldConfig(null)}
            onSave={handleSaveFieldFromModal}
          />
        )}
      </div>
    </Portal>
  );
}
