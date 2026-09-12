"use client";

import CustomFieldInput from "./CustomFieldInput";
import { validateFieldDefinition } from "@/lib/customFields";
import type { CustomFieldDefinition } from "@/types";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  Sliders, 
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
  Link,
  FileText,
  User,
  HelpCircle,
  Eye,
  Bookmark,
  Heart,
  ThumbsUp,
  Flame
} from 'lucide-react';
import { useTranslation } from '../../contexts/TranslationContext';
import { 
  COLOR_PALETTE, 
  getColorOption, 
  DEFAULT_STATUSES, 
  DEFAULT_PRIORITIES, 
  OptionConfig,
  DATE_FORMAT_PRESETS,
  getStoredDateFormat,
  saveDateFormat
} from '../../utils/fieldConfig';
import { Select } from '../ui/Select';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

export const ALL_FIELD_TYPES = [
  { id: 'text', label: 'Văn bản (Text)', labelEn: 'Text', icon: AlignLeft, color: 'from-blue-500 to-indigo-500', desc: 'Chuỗi ký tự ngắn, tiêu đề, mã hiệu' },
  { id: 'number', label: 'Con số (Number)', labelEn: 'Number', icon: Hash, color: 'from-indigo-500 to-purple-500', desc: 'Số nguyên, số thập phân, số lượng' },
  { id: 'date', label: 'Ngày tháng (Date)', labelEn: 'Date', icon: Calendar, color: 'from-purple-500 to-pink-500', desc: 'Ngày hạn, mốc thời gian, lịch trình' },
  { id: 'textarea', label: 'Văn bản dài (Long Text)', labelEn: 'Long Text', icon: FileText, color: 'from-emerald-500 to-teal-500', desc: 'Mô tả chi tiết, ghi chú nhiều dòng' },
  { id: 'dropdown', label: 'Menu lựa chọn (Dropdown)', labelEn: 'Dropdown', icon: Tag, color: 'from-amber-500 to-orange-500', desc: 'Chọn 1 giá trị từ danh sách màu sắc' },
  { id: 'labels', label: 'Nhãn phân loại (Labels)', labelEn: 'Labels', icon: Bookmark, color: 'from-rose-500 to-red-500', desc: 'Gắn nhiều nhãn/thẻ màu trực quan' },
  { id: 'checkbox', label: 'Hộp kiểm (Checkbox)', labelEn: 'Checkbox', icon: CheckSquare, color: 'from-violet-500 to-purple-500', desc: 'Đánh dấu hoàn tất, có/không' },
  { id: 'money', label: 'Tiền tệ (Money)', labelEn: 'Money', icon: DollarSign, color: 'from-emerald-500 to-green-600', desc: 'Ngân sách, chi phí (VNĐ, USD, EUR)' },
  { id: 'rating', label: 'Đánh giá (Rating)', labelEn: 'Rating', icon: Star, color: 'from-amber-400 to-yellow-500', desc: 'Xếp hạng độ ưu tiên, sao/tim' },
  { id: 'progress', label: 'Tiến độ (Progress)', labelEn: 'Progress', icon: BarChart3, color: 'from-cyan-500 to-blue-500', desc: 'Thanh trượt % hoàn thành (0 - 100%)' },
  { id: 'email', label: 'Email', labelEn: 'Email', icon: Mail, color: 'from-sky-500 to-blue-600', desc: 'Hòm thư điện tử kèm nút gửi mail' },
  { id: 'phone', label: 'Số điện thoại (Phone)', labelEn: 'Phone', icon: Phone, color: 'from-teal-500 to-emerald-600', desc: 'Số liên hệ kèm nút gọi nhanh' },
  { id: 'url', label: 'Đường dẫn (URL / Link)', labelEn: 'URL', icon: Link, color: 'from-blue-500 to-cyan-500', desc: 'Liên kết web, tài liệu Figma/GitHub' },
  { id: 'member', label: 'Thành viên (Member)', labelEn: 'Member', icon: User, color: 'from-indigo-600 to-violet-600', desc: 'Gán người phụ trách từ nhóm làm việc' }
];

export interface FieldSettingsModalProps {
  existingFields?: CustomFieldDefinition[];
  config: { 
    id: string; 
    name: string; 
    type: string; 
    isStandard?: boolean; 
    isNew?: boolean;
    options?: any[];
    placeholder?: string;
    description?: string;
    isRequired?: boolean;
    currencySymbol?: string;
    currencyPosition?: 'prefix' | 'suffix';
    numberFormat?: 'normal' | 'percent' | 'currency';
    numberMin?: number;
    numberMax?: number;
    numberPrecision?: number;
    numberUnit?: string;
    dateFormat?: string;
    includeTime?: boolean;
    defaultToToday?: boolean;
    ratingMax?: number;
    ratingIcon?: 'star' | 'heart' | 'flame' | 'thumb';
    checkboxLabel?: string;
    progressMax?: number;
    allowMultiple?: boolean;
    defaultValue?: any;
  } | null;
  onClose: () => void;
  onSave: (updated: { 
    name: string; 
    type: string; 
    options?: any[];
    placeholder?: string;
    description?: string;
    isRequired?: boolean;
    currencySymbol?: string;
    currencyPosition?: 'prefix' | 'suffix';
    numberFormat?: 'normal' | 'percent' | 'currency';
    numberMin?: number;
    numberMax?: number;
    numberPrecision?: number;
    numberUnit?: string;
    dateFormat?: string;
    includeTime?: boolean;
    defaultToToday?: boolean;
    ratingMax?: number;
    ratingIcon?: 'star' | 'heart' | 'flame' | 'thumb';
    checkboxLabel?: string;
    progressMax?: number;
    allowMultiple?: boolean;
    defaultValue?: any;
  }) => void | boolean;
}

export default function FieldSettingsModal({
  config,
  onClose,
  onSave,
  existingFields = []
}: FieldSettingsModalProps) {
  const { locale } = useTranslation();
  const isVietnamese = locale === 'vi';

  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [placeholder, setPlaceholder] = useState('');
  const [description, setDescription] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [options, setOptions] = useState<OptionConfig[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState('₫');
  const [currencyPosition, setCurrencyPosition] = useState<'prefix' | 'suffix'>('suffix');
  const [numberFormat, setNumberFormat] = useState<'normal' | 'percent' | 'currency'>('normal');
  const [numberMin, setNumberMin] = useState<number | undefined>(undefined);
  const [numberMax, setNumberMax] = useState<number | undefined>(undefined);
  const [numberPrecision, setNumberPrecision] = useState<number>(0);
  const [numberUnit, setNumberUnit] = useState<string>('');
  const [selectedDateFormat, setSelectedDateFormat] = useState(getStoredDateFormat());
  const [includeTime, setIncludeTime] = useState(false);
  const [defaultToToday, setDefaultToToday] = useState(false);
  const [ratingMax, setRatingMax] = useState<number>(5);
  const [ratingIcon, setRatingIcon] = useState<'star' | 'heart' | 'flame' | 'thumb'>('star');
  const [checkboxLabel, setCheckboxLabel] = useState('');
  const [checkboxDefault, setCheckboxDefault] = useState(false);
  const [defaultValue, setDefaultValue] = useState<unknown>('');
  const [progressMax, setProgressMax] = useState<number>(100);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [previewValue, setPreviewValue] = useState<any>('');
  const [validationMessage, setValidationMessage] = useState('');
  const optionsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (config) {
      setValidationMessage('');
      setName(config.name || '');
      setType(config.type || 'text');
      setPlaceholder(config.placeholder || '');
      setDescription(config.description || '');
      setIsRequired(!!config.isRequired);
      setCurrencySymbol(config.currencySymbol || (isVietnamese ? '₫' : '$'));
      setCurrencyPosition(config.currencyPosition || (isVietnamese ? 'suffix' : 'prefix'));
      setNumberFormat(config.numberFormat || 'normal');
      setNumberMin(config.numberMin);
      setNumberMax(config.numberMax);
      setNumberPrecision(config.numberPrecision ?? 0);
      setNumberUnit(config.numberUnit || '');
      setSelectedDateFormat((config.dateFormat as any) || getStoredDateFormat());
      setIncludeTime(!!config.includeTime);
      setDefaultToToday(!!config.defaultToToday);
      setRatingMax(config.ratingMax || 5);
      setRatingIcon(config.ratingIcon || 'star');
      setCheckboxLabel(config.checkboxLabel || '');
      setCheckboxDefault(config.defaultValue === true || config.defaultValue === 'true');
      setDefaultValue(config.defaultValue ?? '');
      setProgressMax(config.progressMax || 100);
      setAllowMultiple(!!config.allowMultiple);

      if (config.options && config.options.length > 0) {
        setOptions(config.options.map((option, index) => typeof option === 'string' ? { id: `option-${index}`, label: option, color: 'indigo' } : option));
      } else if (config.id === 'status') {
        setOptions(DEFAULT_STATUSES);
      } else if (config.id === 'priority') {
        setOptions(DEFAULT_PRIORITIES);
      } else if (config.type === 'dropdown' || config.type === 'labels') {
        setOptions([
          { id: `opt-1`, label: isVietnamese ? 'Kế hoạch' : 'Planning', color: 'blue' },
          { id: `opt-2`, label: isVietnamese ? 'Đang làm' : 'In Progress', color: 'amber' },
          { id: `opt-3`, label: isVietnamese ? 'Hoàn thành' : 'Done', color: 'emerald' }
        ]);
      } else {
        setOptions([]);
      }

      if (config.type === 'rating') setPreviewValue(3);
      else if (config.type === 'progress') setPreviewValue(65);
      else if (config.type === 'checkbox') setPreviewValue(config.defaultValue || false);
      else if (config.type === 'money') setPreviewValue('250000');
      else if (config.type === 'number') setPreviewValue('42');
      else setPreviewValue('');
    }
  }, [config, isVietnamese]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!config) return null;
  const isOptionField = type === 'dropdown' || type === 'labels' || config.id === 'status' || config.id === 'priority';
  const isDateField = type === 'date';

  const handleAddOption = () => {
    const nextColorIndex = options.length % COLOR_PALETTE.length;
    const newOpt: OptionConfig = {
      id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      label: `${isVietnamese ? 'Lựa chọn' : 'Option'} ${options.length + 1}`,
      color: COLOR_PALETTE[nextColorIndex].id
    };
    setOptions(prev => [...prev, newOpt]);
    setTimeout(() => {
      if (optionsContainerRef.current) {
        optionsContainerRef.current.scrollTop = optionsContainerRef.current.scrollHeight;
      }
    }, 50);
  };

  const handleUpdateOptionLabel = (id: string, label: string) => {
    setOptions(prev => prev.map(o => o.id === id ? { ...o, label } : o));
  };

  const handleUpdateOptionColor = (id: string, color: string) => {
    setOptions(prev => prev.map(o => o.id === id ? { ...o, color } : o));
  };

  const handleMoveOption = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= options.length) return;
    const next = [...options];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setOptions(next);
  };

  const handleDeleteOption = (id: string) => {
    if (options.length <= 1) {
      setValidationMessage(isVietnamese ? 'Cần giữ ít nhất một tùy chọn trong danh sách.' : 'Keep at least one option in the list.');
      return;
    }
    setValidationMessage('');
    setOptions(prev => prev.filter(o => o.id !== id));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isDateField && config.isStandard) {
      saveDateFormat(selectedDateFormat as any);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('apexa-field-config-changed'));
      }
    }

    const updated = {
      name: name.trim(),
      type,
      options: isOptionField ? options : undefined,
      placeholder: placeholder.trim(),
      description: description.trim(),
      isRequired,
      currencySymbol,
      currencyPosition,
      numberFormat,
      numberMin,
      numberMax,
      numberPrecision,
      numberUnit: numberUnit.trim() || undefined,
      dateFormat: selectedDateFormat,
      includeTime,
      defaultToToday,
      ratingMax,
      ratingIcon,
      checkboxLabel: checkboxLabel.trim(),
      progressMax,
      allowMultiple,
      defaultValue: type === 'checkbox' ? checkboxDefault : defaultValue
    };
    if (!config.isStandard) {
      const message = validateFieldDefinition({ ...updated, id: config.id } as CustomFieldDefinition, existingFields, locale);
      if (message) { setValidationMessage(message); return; }
    }
    if (onSave(updated) !== false) onClose();
  };

  const currentTypeMeta = ALL_FIELD_TYPES.find(f => f.id === type) || ALL_FIELD_TYPES[0];
  const CurrentTypeIcon = currentTypeMeta.icon;

  return (
    <Portal>
      <div className="fixed inset-0 z-[400] flex items-center justify-center p-3 sm:p-4 font-sans select-none">
        <div 
          className="absolute inset-0 modal-backdrop bg-black/25 dark:bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer" 
          onClick={onClose} 
        />
        
        <form 
          role="dialog"
          aria-modal="true"
          aria-label={isVietnamese ? 'Cài đặt trường dữ liệu' : 'Field settings'}
          onSubmit={handleSave} 
          className="relative w-full max-w-[620px] max-h-[92vh] bg-white dark:bg-[#181818] border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col z-10 text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                <CurrentTypeIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                  <span>{config.isNew ? (isVietnamese ? 'Tạo trường tùy chỉnh mới' : 'Create Custom Field') : (isVietnamese ? 'Cài đặt trường' : 'Field Settings')}</span>
                  {!config.isNew && <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">• {name || config.name}</span>}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  {isVietnamese ? currentTypeMeta.desc : currentTypeMeta.labelEn}
                </p>
              </div>
            </div>

            <button 
              type="button" 
              onClick={onClose} 
              className="p-2 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(92vh-145px)] custom-scrollbar text-left select-text">
            {validationMessage && (
              <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[11px] font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                {validationMessage}
              </div>
            )}
            {!config.isStandard && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{isVietnamese ? 'Loại trường dữ liệu' : 'Field Type'}</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_FIELD_TYPES.map(ft => {
                    const IconComp = ft.icon;
                    const isSelected = type === ft.id;
                    return (
                      <button
                        key={ft.id}
                        disabled={!config.isNew && !isSelected}
                        title={!config.isNew ? (isVietnamese ? "Tạo trường mới để sử dụng loại dữ liệu khác" : "Create a new field to use a different type") : undefined}
                        type="button"
                        onClick={() => {
                          setType(ft.id);
                          setDefaultValue('');
                          if ((ft.id === 'dropdown' || ft.id === 'labels') && options.length === 0) {
                            setOptions([
                              { id: `opt-1`, label: isVietnamese ? 'Lựa chọn 1' : 'Option 1', color: 'blue' },
                              { id: `opt-2`, label: isVietnamese ? 'Lựa chọn 2' : 'Option 2', color: 'emerald' },
                              { id: `opt-3`, label: isVietnamese ? 'Lựa chọn 3' : 'Option 3', color: 'amber' }
                            ]);
                          }
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-2xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-extrabold shadow-sm ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className={`p-1.5 rounded-xl ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'} shrink-0`}>
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate text-[11px] font-bold">{isVietnamese ? ft.label.split('(')[0].trim() : ft.labelEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{isVietnamese ? 'Tên trường' : 'Field Name'} *</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={isVietnamese ? 'VD: Mức độ ưu tiên, Khách hàng, Ngân sách...' : 'Enter field name...'}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-800 dark:text-slate-100 transition-all text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isVietnamese ? 'Gợi ý nhập liệu (Placeholder)' : 'Placeholder'}</span>
                </label>
                <input
                  type="text"
                  value={placeholder}
                  onChange={e => setPlaceholder(e.target.value)}
                  placeholder={isVietnamese ? 'Gợi ý hiển thị khi ô trống...' : 'Hint shown when empty...'}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-800 dark:text-slate-100 transition-all text-xs"
                />
              </div>
            </div>

            <label className="block space-y-1.5 text-xs font-semibold">
              <span>{isVietnamese ? 'Mô tả và hướng dẫn nhập' : 'Description and instructions'}</span>
              <textarea value={description} onChange={event => setDescription(event.target.value)} rows={2} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <Sliders className="w-4 h-4 text-indigo-500" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  {isVietnamese ? 'Cài đặt riêng cho loại trường' : 'Field Specific Settings'}: <span className="text-indigo-600 dark:text-indigo-400">{currentTypeMeta.label}</span>
                </span>
              </div>

              {isOptionField && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {isVietnamese ? 'Danh sách các tùy chọn' : 'Options List'} ({options.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-400 font-extrabold text-[11px] cursor-pointer transition-colors shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isVietnamese ? 'Thêm tùy chọn' : 'Add Option'}</span>
                    </button>
                  </div>

                  <div 
                    ref={optionsContainerRef}
                    className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar border border-slate-200/60 dark:border-slate-800 rounded-xl p-2.5 bg-white dark:bg-slate-950/40"
                  >
                    {options.map((opt, index) => {
                      const colorMeta = getColorOption(opt.color);
                      return (
                        <div 
                          key={opt.id} 
                          className="flex items-center gap-2 p-2 bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 rounded-xl shadow-3xs"
                        >
                          <div className="flex flex-col gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveOption(index, 'up')}
                              disabled={index === 0}
                              className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveOption(index, 'down')}
                              disabled={index === options.length - 1}
                              className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="relative group/color shrink-0">
                            <button
                              type="button"
                              className={`w-6 h-6 rounded-lg ${colorMeta.badge} border flex items-center justify-center cursor-pointer shadow-3xs hover:scale-105 transition-transform`}
                              title={isVietnamese ? 'Chọn màu thẻ' : 'Choose color'}
                            >
                              <span className={`w-2.5 h-2.5 rounded-full ${colorMeta.dot}`} />
                            </button>

                            <div className="hidden group-hover/color:grid absolute left-0 top-full mt-1.5 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 grid-cols-7 gap-1 w-52">
                              {COLOR_PALETTE.map(cp => (
                                <button
                                  key={cp.id}
                                  type="button"
                                  onClick={() => handleUpdateOptionColor(opt.id, cp.id)}
                                  className={`w-6 h-6 rounded-lg ${cp.badge} flex items-center justify-center cursor-pointer hover:scale-110 transition-transform ${opt.color === cp.id ? 'ring-2 ring-indigo-500' : ''}`}
                                  title={isVietnamese ? cp.nameVi : cp.name}
                                >
                                  <span className={`w-2 h-2 rounded-full ${cp.dot}`} />
                                </button>
                              ))}
                            </div>
                          </div>

                          <input
                            type="text"
                            value={opt.label}
                            onChange={e => handleUpdateOptionLabel(opt.id, e.target.value)}
                            className="flex-1 px-2 py-1 text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg outline-none focus:border-indigo-500"
                            placeholder={isVietnamese ? 'Tên lựa chọn...' : 'Option label...'}
                          />

                          <button
                            type="button"
                            onClick={() => handleDeleteOption(opt.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                            title={isVietnamese ? 'Xóa tùy chọn' : 'Delete option'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {type === 'money' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      {isVietnamese ? 'Ký hiệu tiền tệ' : 'Currency Symbol'}
                    </label>
                    <div className="flex gap-2">
                      {[
                        { sym: '₫', label: 'VNĐ (₫)' },
                        { sym: '$', label: 'USD ($)' },
                        { sym: '€', label: 'EUR (€)' },
                        { sym: '¥', label: 'JPY (¥)' },
                        { sym: '£', label: 'GBP (£)' }
                      ].map(c => (
                        <button
                          key={c.sym}
                          type="button"
                          onClick={() => setCurrencySymbol(c.sym)}
                          className={`px-3 py-1.5 rounded-xl border font-black text-xs cursor-pointer transition-all ${
                            currencySymbol === c.sym 
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {c.sym}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      {isVietnamese ? 'Vị trí ký hiệu' : 'Symbol Position'}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrencyPosition('suffix')}
                        className={`flex-1 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          currencyPosition === 'suffix' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300' 
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {isVietnamese ? 'Phía sau (100.000 ₫)' : 'After (100 ₫)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrencyPosition('prefix')}
                        className={`flex-1 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          currencyPosition === 'prefix' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300' 
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {isVietnamese ? 'Phía trước ($100)' : 'Before ($100)'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {(type === 'number' || type === 'money') && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {isVietnamese ? 'Định dạng số' : 'Format'}
                      </label>
                      <Select
                        value={numberFormat}
                        onChange={v => setNumberFormat(v)}
                        className="w-full"
                        size="sm"
                        ariaLabel={isVietnamese ? 'Định dạng số' : 'Format'}
                        options={[
                          { value: 'normal', label: isVietnamese ? 'Số thuần (1.234)' : 'Standard (1,234)' },
                          { value: 'percent', label: isVietnamese ? 'Phần trăm (%)' : 'Percentage (%)' },
                          { value: 'currency', label: isVietnamese ? 'Tiền tệ' : 'Currency' },
                        ]}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {isVietnamese ? 'Số chữ số thập phân' : 'Decimals'}
                      </label>
                      <Select<number>
                        value={numberPrecision}
                        onChange={v => setNumberPrecision(v)}
                        className="w-full"
                        size="sm"
                        ariaLabel={isVietnamese ? 'Số chữ số thập phân' : 'Decimals'}
                        options={[
                          { value: 0, label: '0 (Số nguyên 100)' },
                          { value: 1, label: '1 (100.5)' },
                          { value: 2, label: '2 (100.25)' },
                        ]}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {isVietnamese ? 'Giới hạn (Min - Max)' : 'Range'}
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          placeholder="Min"
                          value={numberMin ?? ''}
                          onChange={e => setNumberMin(e.target.value ? Number(e.target.value) : undefined)}
                          className="w-1/2 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={numberMax ?? ''}
                          onChange={e => setNumberMax(e.target.value ? Number(e.target.value) : undefined)}
                          className="w-1/2 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>{isVietnamese ? 'Đơn vị đo lường (Tùy chọn)' : 'Unit of Measurement (Optional)'}</span>
                      <span className="text-[10px] text-slate-400 font-normal">VD: kg, giờ, điểm, pts, km...</span>
                    </label>
                    <input
                      type="text"
                      placeholder={isVietnamese ? 'VD: kg, giờ, điểm, pts...' : 'e.g. kg, hrs, pts...'}
                      value={numberUnit}
                      onChange={e => setNumberUnit(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 transition-colors font-medium"
                    />
                  </div>
                </div>
              )}

              {isDateField && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DATE_FORMAT_PRESETS.map(preset => {
                      const isSelected = selectedDateFormat === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSelectedDateFormat(preset.id)}
                          className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <div className="text-[11px] font-bold">{preset.label}</div>
                          <div className="text-[10px] text-slate-400">{preset.sample}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-4 pt-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeTime}
                        onChange={e => setIncludeTime(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {isVietnamese ? 'Bao gồm giờ:phút (Time)' : 'Include Time'}
                      </span>
                    </label>

                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={defaultToToday}
                        onChange={e => setDefaultToToday(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {isVietnamese ? 'Mặc định ngày hôm nay' : 'Default to Today'}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {type === 'rating' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      {isVietnamese ? 'Thang điểm đánh giá' : 'Rating Scale'}
                    </label>
                    <div className="flex gap-2">
                      {[5, 10].map(scale => (
                        <button
                          key={scale}
                          type="button"
                          onClick={() => setRatingMax(scale)}
                          className={`flex-1 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                            ratingMax === scale 
                              ? 'bg-amber-500 text-white border-amber-500 shadow-xs' 
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {scale} {isVietnamese ? 'mức' : 'stars'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      {isVietnamese ? 'Biểu tượng' : 'Icon Style'}
                    </label>
                    <div className="flex gap-2">
                      {[
                        { id: 'star', icon: Star, label: 'Sao' },
                        { id: 'heart', icon: Heart, label: 'Tim' },
                        { id: 'flame', icon: Flame, label: 'Lửa' },
                        { id: 'thumb', icon: ThumbsUp, label: 'Like' }
                      ].map(ic => {
                        const Icon = ic.icon;
                        return (
                          <button
                            key={ic.id}
                            type="button"
                            onClick={() => setRatingIcon(ic.id as any)}
                            className={`flex-1 py-1.5 rounded-xl border flex items-center justify-center gap-1 text-xs font-bold cursor-pointer transition-all ${
                              ratingIcon === ic.id 
                                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-600 dark:text-amber-400' 
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 fill-current" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {type === 'checkbox' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      {isVietnamese ? 'Nhãn tùy biến' : 'Custom Label'}
                    </label>
                    <input
                      type="text"
                      value={checkboxLabel}
                      onChange={e => setCheckboxLabel(e.target.value)}
                      placeholder={isVietnamese ? 'VD: Đạt chuẩn / Hoàn tất' : 'e.g. Approved / Verified'}
                      className="w-full px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      {isVietnamese ? 'Trạng thái mặc định' : 'Default State'}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCheckboxDefault(false)}
                        className={`flex-1 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          !checkboxDefault 
                            ? 'bg-slate-200 dark:bg-slate-700 border-slate-400 text-slate-800 dark:text-white' 
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        {isVietnamese ? 'Chưa chọn (Off)' : 'Unchecked'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCheckboxDefault(true)}
                        className={`flex-1 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          checkboxDefault 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        {isVietnamese ? 'Đã chọn (On)' : 'Checked'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {type === 'progress' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    {isVietnamese ? 'Thang đo tối đa' : 'Max Progress Scale'}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="10"
                      value={progressMax}
                      onChange={e => setProgressMax(Number(e.target.value))}
                      className="flex-1 accent-indigo-600 cursor-pointer"
                    />
                    <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-extrabold text-xs text-indigo-600">
                      {progressMax}%
                    </span>
                  </div>
                </div>
              )}

              {type === 'member' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allowMult"
                    checked={allowMultiple}
                    onChange={e => setAllowMultiple(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <label htmlFor="allowMult" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    {isVietnamese ? 'Cho phép gán nhiều thành viên cùng lúc' : 'Allow multiple assignees'}
                  </label>
                </div>
              )}
            </div>

            {!config.isStandard && !['checkbox', 'member'].includes(type) && !(type === 'date' && defaultToToday) && (
              <div className="space-y-2">
                <label className="text-xs font-bold">{isVietnamese ? 'Giá trị mặc định cho Task mới' : 'Default value for new tasks'}</label>
                <CustomFieldInput draft field={{ id: config.id, name: name || 'Default', type, options, numberMin, numberMax, numberPrecision, numberUnit, currencySymbol, currencyPosition, ratingMax, ratingIcon, progressMax, includeTime } as CustomFieldDefinition} value={defaultValue} onChange={setDefaultValue} />
              </div>
            )}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-blue-50/50 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-slate-900/40 border border-indigo-200/60 dark:border-indigo-900/40 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-sky-400">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> {isVietnamese ? 'Xem trước trực tiếp (Live Preview)' : 'Live Interactive Preview'}
                </span>
                <span className="font-semibold text-slate-400">{isVietnamese ? 'Hãy thử thao tác' : 'Try interacting'}</span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 min-w-[100px] truncate">
                  {name || (isVietnamese ? 'Tên trường' : 'Field Name')}
                </span>

                <div className="flex-1 flex justify-end">
                  {type === 'dropdown' && (
                    <div className="flex gap-1.5 overflow-x-auto max-w-[280px]">
                      {options.slice(0, 3).map((opt, i) => {
                        const cm = getColorOption(opt.color);
                        return (
                          <span key={i} className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${cm.badge}`}>
                            {opt.label}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {type === 'money' && (
                    <div className="px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/30 font-black text-xs text-emerald-700 dark:text-emerald-300">
                      {currencyPosition === 'prefix' ? `${currencySymbol} 250,000` : `250,000 ${currencySymbol}`}
                    </div>
                  )}

                  {type === 'rating' && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: ratingMax }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setPreviewValue(i + 1)}
                          className={`text-base cursor-pointer transition-transform hover:scale-125 ${
                            i < (previewValue || 3) ? 'text-amber-400' : 'text-slate-200 dark:text-slate-800'
                          }`}
                        >
                          {ratingIcon === 'heart' ? '❤️' : ratingIcon === 'flame' ? '🔥' : ratingIcon === 'thumb' ? '👍' : '★'}
                        </button>
                      ))}
                    </div>
                  )}

                  {type === 'progress' && (
                    <div className="flex items-center gap-2 w-44">
                      <input
                        type="range"
                        min="0"
                        max={progressMax}
                        value={previewValue || 65}
                        onChange={e => setPreviewValue(Number(e.target.value))}
                        className="flex-1 accent-indigo-600 cursor-pointer"
                      />
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 w-10 text-right">
                        {previewValue || 65}%
                      </span>
                    </div>
                  )}

                  {type === 'checkbox' && (
                    <button
                      type="button"
                      onClick={() => setPreviewValue(!previewValue)}
                      className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all ${
                        previewValue 
                          ? 'bg-indigo-600 text-white border-indigo-600' 
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      <Check className={`w-3.5 h-3.5 ${previewValue ? 'opacity-100' : 'opacity-0'}`} />
                      <span>{checkboxLabel || (previewValue ? (isVietnamese ? 'Hoàn tất' : 'Done') : (isVietnamese ? 'Chưa' : 'Todo'))}</span>
                    </button>
                  )}

                  {(type === 'text' || type === 'textarea' || type === 'number' || type === 'email' || type === 'phone' || type === 'url') && (
                    <input
                      type={type === 'number' ? 'number' : 'text'}
                      placeholder={placeholder || (isVietnamese ? 'Nhập giá trị...' : 'Enter value...')}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 outline-none max-w-[200px]"
                    />
                  )}

                  {type === 'date' && (
                    <div className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>17/07/2026 {includeTime ? '14:30' : ''}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  {isVietnamese ? 'Bắt buộc nhập dữ liệu' : 'Required Field'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {isVietnamese ? 'Yêu cầu điền trường này trước khi hoàn thành công việc' : 'Must be filled before marking completed'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isRequired}
                  onChange={e => setIsRequired(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isVietnamese ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className={`px-5 py-2 rounded-xl text-xs font-black text-white flex items-center gap-1.5 transition-all shadow-md ${
                name.trim() 
                  ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-indigo-500/25 cursor-pointer' 
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-500 pointer-events-none'
              }`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{config.isNew ? (isVietnamese ? 'Tạo trường dữ liệu' : 'Create Field') : (isVietnamese ? 'Lưu thay đổi' : 'Save Changes')}</span>
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
}
