"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Sliders, 
  Tag, 
  Calendar, 
  Hash, 
  AlignLeft, 
  CheckSquare, 
  DollarSign, 
  BarChart3, 
  Star,
  AlertOctagon,
  AlertTriangle,
  CircleDot,
  Circle,
  Flag,
  Flame,
  Zap,
  Bookmark
} from 'lucide-react';
import { useTranslation } from '../../contexts/TranslationContext';
import { 
  COLOR_PALETTE, 
  getColorOption, 
  DEFAULT_STATUSES, 
  DEFAULT_PRIORITIES, 
  OptionConfig,
  getLocalizedOptionLabel,
  DATE_FORMAT_PRESETS,
  getStoredDateFormat,
  saveDateFormat
} from '../../utils/fieldConfig';
import { renderSpaceIcon } from '../EmojiIconPicker';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

const PRIORITY_ICONS = [
  { id: 'AlertOctagon', label: 'Octagon', icon: AlertOctagon },
  { id: 'AlertTriangle', label: 'Triangle', icon: AlertTriangle },
  { id: 'CircleDot', label: 'Circle Dot', icon: CircleDot },
  { id: 'Circle', label: 'Circle', icon: Circle },
  { id: 'Flame', label: 'Flame', icon: Flame },
  { id: 'Zap', label: 'Zap', icon: Zap },
  { id: 'Flag', label: 'Flag', icon: Flag },
  { id: 'Star', label: 'Star', icon: Star },
  { id: 'Bookmark', label: 'Bookmark', icon: Bookmark },
];

export interface FieldSettingsModalProps {
  config: { 
    id: string; 
    name: string; 
    type: string; 
    isStandard: boolean; 
    options?: any[];
  } | null;
  onClose: () => void;
  onSave: (updated: { name: string; type: string; options?: any[] }) => void;
}

export default function FieldSettingsModal({
  config,
  onClose,
  onSave
}: FieldSettingsModalProps) {
  const { t, locale } = useTranslation();
  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [options, setOptions] = useState<OptionConfig[]>([]);
  const [activeIconPicker, setActiveIconPicker] = useState<string | null>(null);
  const [selectedDateFormat, setSelectedDateFormat] = useState(getStoredDateFormat());
  const optionsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (config) {
      setName(config.name);
      setType(config.type);
      
      if (config.options && config.options.length > 0) {
        // Normalize options
        const normalized: OptionConfig[] = config.options.map((opt: any, index: number) => {
          if (typeof opt === 'string') {
            const paletteItem = COLOR_PALETTE[index % COLOR_PALETTE.length];
            return {
              id: `opt-${Date.now()}-${index}`,
              label: opt,
              color: paletteItem.id
            };
          }
          return {
            id: opt.id || `opt-${Date.now()}-${index}`,
            label: opt.label || `Option ${index + 1}`,
            color: opt.color ? opt.color.replace('bg-', '').replace('text-', '').replace('-500', '').replace('-600', '') : COLOR_PALETTE[index % COLOR_PALETTE.length].id,
            icon: opt.icon
          };
        });
        setOptions(normalized);
      } else if (config.id === 'status') {
        setOptions(DEFAULT_STATUSES);
      } else if (config.id === 'priority') {
        setOptions(DEFAULT_PRIORITIES);
      } else if (config.type === 'dropdown' || config.type === 'labels') {
        setOptions([
          { id: `opt-1`, label: 'Option 1', color: 'indigo' },
          { id: `opt-2`, label: 'Option 2', color: 'emerald' },
          { id: `opt-3`, label: 'Option 3', color: 'amber' }
        ]);
      } else {
        setOptions([]);
      }
    }
  }, [config]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!config) return null;

  const isOptionField = 
    config.id === 'status' || 
    config.id === 'priority' || 
    type === 'dropdown' || 
    type === 'labels';

  const isDateField = 
    config.id === 'startDate' || 
    config.id === 'dueDate' || 
    type === 'date';

  const handleAddOption = () => {
    const nextColorIndex = options.length % COLOR_PALETTE.length;
    const newOpt: OptionConfig = {
      id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      label: `${locale === 'vi' ? 'Tùy chọn' : 'Option'} ${options.length + 1}`,
      color: COLOR_PALETTE[nextColorIndex].id,
      icon: config.id === 'priority' ? 'Circle' : undefined
    };
    setOptions(prev => [...prev, newOpt]);
    
    // Auto scroll to bottom
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

  const handleUpdateOptionIcon = (id: string, icon: string) => {
    setOptions(prev => prev.map(o => o.id === id ? { ...o, icon } : o));
    setActiveIconPicker(null);
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
      alert(t('minOptionWarning') || 'Must have at least 1 option in the list');
      return;
    }
    setOptions(prev => prev.filter(o => o.id !== id));
  };

  const handleResetDefaults = () => {
    if (config.id === 'status') {
      setName('Status');
      setOptions(DEFAULT_STATUSES);
    } else if (config.id === 'priority') {
      setName('Priority');
      setOptions(DEFAULT_PRIORITIES);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isDateField) {
      saveDateFormat(selectedDateFormat);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('apexa-field-config-changed'));
      }
    }

    const payloadOptions = isOptionField 
      ? options.map(o => {
          const colorMeta = getColorOption(o.color);
          return {
            id: o.id,
            label: o.label.trim(),
            color: colorMeta.id,
            dot: colorMeta.dot,
            bg: config.id === 'status' ? colorMeta.statusPill : (config.id === 'priority' ? colorMeta.priorityPill : colorMeta.badge),
            icon: o.icon
          };
        })
      : undefined;

    onSave({
      name: name.trim(),
      type,
      options: payloadOptions
    });
    onClose();
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
          onClick={onClose} 
        />
        
        {/* Modal content */}
        <form 
          onSubmit={handleSave} 
          className="relative w-full max-w-[540px] max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col z-10 font-sans text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-wide flex items-center gap-2">
                  <span>{t('fieldSettingsTitle') || 'Cài đặt trường'}:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{config.name}</span>
                </h3>
                <div className="text-[10px] font-medium text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[9px]">
                    {config.isStandard ? (t('systemField') || 'Trường hệ thống') : (t('customField') || 'Trường tùy chỉnh')}
                  </span>
                  <span>•</span>
                  <span className="capitalize font-semibold">{type}</span>
                </div>
              </div>
            </div>

            <button 
              type="button" 
              onClick={onClose} 
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
            {/* Field Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
                <span>{t('fieldName') || 'Tên trường'}</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('fieldName') || 'Nhập tên trường...'}
                className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-800 dark:text-slate-100 transition-all text-xs"
                required
              />
            </div>

            {/* Field Data Type (Custom fields only) */}
            {!config.isStandard && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('dataType') || 'Loại dữ liệu'}</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'text', label: 'Text', icon: AlignLeft },
                    { id: 'number', label: 'Number', icon: Hash },
                    { id: 'date', label: 'Date', icon: Calendar },
                    { id: 'checkbox', label: 'Checkbox', icon: CheckSquare },
                    { id: 'dropdown', label: 'Dropdown', icon: Tag },
                    { id: 'labels', label: 'Labels', icon: Tag },
                    { id: 'money', label: 'Money', icon: DollarSign },
                    { id: 'progress', label: 'Progress', icon: BarChart3 },
                    { id: 'rating', label: 'Rating', icon: Star },
                  ].map(dt => {
                    const IconComponent = dt.icon;
                    const isSelected = type === dt.id;
                    return (
                      <button
                        key={dt.id}
                        type="button"
                        onClick={() => {
                          setType(dt.id);
                          if ((dt.id === 'dropdown' || dt.id === 'labels') && options.length === 0) {
                            setOptions([
                              { id: `opt-1`, label: 'Option 1', color: 'indigo' },
                              { id: `opt-2`, label: 'Option 2', color: 'emerald' },
                              { id: `opt-3`, label: 'Option 3', color: 'amber' }
                            ]);
                          }
                        }}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <IconComponent className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                        <span className="truncate text-[11px]">{dt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Date format presets (when date field) */}
            {isDateField && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('dateFormat') || 'Định dạng ngày'}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DATE_FORMAT_PRESETS.map(preset => {
                    const isSelected = selectedDateFormat === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedDateFormat(preset.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="text-[11px] font-bold">{preset.label}</div>
                          <div className="text-[10px] text-slate-400">{preset.sample}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Options List Editor (Status, Priority, Dropdown, Labels) */}
            {isOptionField && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t('optionsList') || 'Danh sách Options'}</span>
                    <span className="text-[10px] text-slate-400 lowercase font-normal">({options.length})</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{locale === 'vi' ? 'Thêm Option' : 'Add Option'}</span>
                  </button>
                </div>

                <div 
                  ref={optionsContainerRef}
                  className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar border border-slate-150 dark:border-slate-800/80 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-950/30"
                >
                  {options.map((opt, index) => {
                    const colorMeta = getColorOption(opt.color);
                    const localizedLabel = getLocalizedOptionLabel(opt.id, opt.label, locale);
                    
                    return (
                      <div 
                        key={opt.id} 
                        className="flex flex-col gap-2 p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs transition-all hover:border-slate-300 dark:hover:border-slate-700"
                      >
                        {/* Top row: reorder, icon, name input, preview pill, delete */}
                        <div className="flex items-center gap-2">
                          {/* Reorder Up/Down */}
                          <div className="flex flex-col gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveOption(index, 'up')}
                              disabled={index === 0}
                              className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              title={t('moveUp') || 'Di chuyển lên'}
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveOption(index, 'down')}
                              disabled={index === options.length - 1}
                              className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              title={t('moveDown') || 'Di chuyển xuống'}
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Icon Selector (Priority or icon-enabled) */}
                          {config.id === 'priority' ? (
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                onClick={() => setActiveIconPicker(activeIconPicker === opt.id ? null : opt.id)}
                                className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-indigo-500 cursor-pointer transition-colors"
                                title="Chọn icon"
                              >
                                {renderSpaceIcon(opt.icon || 'Circle', 'w-3.5 h-3.5')}
                              </button>

                              {activeIconPicker === opt.id && (
                                <div className="absolute top-8 left-0 z-50 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl grid grid-cols-3 gap-1 w-32">
                                  {PRIORITY_ICONS.map(pi => (
                                    <button
                                      key={pi.id}
                                      type="button"
                                      onClick={() => handleUpdateOptionIcon(opt.id, pi.id)}
                                      className={`p-1.5 rounded-lg flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 ${opt.icon === pi.id ? 'bg-indigo-50 text-indigo-600 font-bold' : ''}`}
                                    >
                                      {renderSpaceIcon(pi.id, 'w-3.5 h-3.5')}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span 
                              className="w-3 h-3 rounded-full shrink-0 shadow-2xs border border-white/40"
                              style={{ backgroundColor: colorMeta.hex }}
                            />
                          )}

                          {/* Option Text Input */}
                          <input
                            type="text"
                            value={opt.label}
                            onChange={e => handleUpdateOptionLabel(opt.id, e.target.value)}
                            placeholder={t('optionNamePlaceholder') || 'Tên tùy chọn...'}
                            className="flex-1 min-w-0 px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-lg outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 font-bold text-slate-800 dark:text-slate-200 text-xs transition-all"
                            required
                          />

                          {/* Live Preview Pill */}
                          <div 
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border truncate max-w-[120px] shrink-0 select-none shadow-3xs flex items-center gap-1 ${
                              config.id === 'status' 
                                ? colorMeta.statusPill 
                                : config.id === 'priority' 
                                  ? `${colorMeta.priorityPill} ${colorMeta.text}` 
                                  : colorMeta.badge
                            }`}
                          >
                            {opt.icon && renderSpaceIcon(opt.icon, 'w-2.5 h-2.5 shrink-0')}
                            <span className="truncate">{localizedLabel || opt.label || 'Preview'}</span>
                          </div>

                          {/* Delete Option */}
                          <button
                            type="button"
                            onClick={() => handleDeleteOption(opt.id)}
                            disabled={options.length <= 1}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
                            title={t('deleteOption') || 'Xóa tùy chọn'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Bottom row: Color Swatch Palette */}
                        <div className="flex items-center gap-1.5 pl-6 pt-1 border-t border-slate-100 dark:border-slate-800/60 overflow-x-auto custom-scrollbar pb-0.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest shrink-0 mr-1">
                            {t('pickColor') || 'Màu'}:
                          </span>
                          {COLOR_PALETTE.map(c => {
                            const isSelected = opt.color === c.id || opt.color === c.hex;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => handleUpdateOptionColor(opt.id, c.id)}
                                className={`w-4 h-4 rounded-full transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                                  isSelected 
                                    ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900 scale-125 shadow-xs' 
                                    : 'hover:scale-120 opacity-80 hover:opacity-100'
                                }`}
                                style={{ backgroundColor: c.hex }}
                                title={`${locale === 'vi' ? c.nameVi : c.name}`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3] drop-shadow-xs" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            {/* Reset to Defaults (for Standard Fields like Status & Priority) */}
            <div>
              {(config.id === 'status' || config.id === 'priority') && (
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('resetDefaults') || 'Khôi phục mặc định'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors cursor-pointer"
              >
                {t('cancel') || 'Hủy'}
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{t('saveChanges') || 'Lưu thay đổi'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </Portal>
  );
}
