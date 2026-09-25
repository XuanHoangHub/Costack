"use client";

import React, { useId, useState } from 'react';
import { ExternalLink, Flame, Heart, Star, ThumbsUp, MapPin, Globe, Paperclip, Calculator, PenTool, CheckCircle2, Play, Users } from 'lucide-react';
import type { CustomFieldDefinition, User } from '@/types';
import { fieldOptions, fieldSelections, validateCustomField } from '@/lib/customFields';
import { useTranslation } from '@/contexts/TranslationContext';
import { DropdownFieldSelect } from './TaskSelects';

interface Props {
  field: CustomFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  members?: User[];
  draft?: boolean;
  variant?: 'form' | 'table';
}

/** One editor for task creation, task details and table cells. */
export default function CustomFieldInput({ field, value, onChange, members = [], draft = false, variant = 'form' }: Props) {
  const { locale } = useTranslation();
  const vi = locale === 'vi';
  const id = useId();
  const [pending, setPending] = useState<{ value: string; base: unknown } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const current = pending && pending.base === value ? pending.value : value;
  const inputClass = 'w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
  const commit = (next: unknown) => {
    const message = validateCustomField(field, next, false, locale);
    setError(message);
    if (!message || draft) onChange(next);
    return !message;
  };
  const editingProps = {
    id, 'aria-label': field.name, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-error` : undefined,
    value: String(current ?? ''), placeholder: field.placeholder || (vi ? 'Chưa có giá trị' : 'No value'), className: inputClass,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setPending({ value: event.target.value, base: value });
      setError(null);
      if (draft) onChange(event.target.value);
    },
    onBlur: () => {
      if (pending) {
        const numeric = ['number', 'money', 'progress', 'progress_auto', 'progress_manual', 'rating', 'voting'].includes(field.type);
        if (commit(numeric && pending.value.trim() !== '' ? Number(pending.value) : pending.value)) setPending(null);
      }
      if (variant === 'table') setIsInlineEditing(false);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.key === 'Escape') { 
        event.stopPropagation(); 
        setPending(null); 
        setError(null); 
        if (variant === 'table') setIsInlineEditing(false);
      }
      if (event.key === 'Enter' && field.type !== 'textarea') { 
        event.preventDefault(); 
        event.currentTarget.blur(); 
        if (variant === 'table') setIsInlineEditing(false);
      }
    },
  };
  let control: React.ReactNode;
  if (field.type === 'checkbox') {
    if (variant === 'table') {
      control = (
        <div className="flex items-center">
          <input
            aria-label={field.name}
            type="checkbox"
            checked={value === true || value === 'true'}
            onChange={event => commit(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500/20 accent-blue-600 cursor-pointer"
          />
        </div>
      );
    } else {
      control = (
        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
          <input aria-label={field.name} type="checkbox" checked={value === true || value === 'true'} onChange={event => commit(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 accent-indigo-600 cursor-pointer" />
          <span>{field.checkboxLabel || (vi ? 'Đã chọn' : 'Checked')}</span>
        </label>
      );
    }
  } else if (field.type === 'dropdown') {
    const options = fieldOptions(field);
    control = (
      <DropdownFieldSelect 
        value={String(value ?? '')} 
        options={options.map(o => ({ id: o.id, label: o.label, color: o.color }))} 
        fieldId={field.id}
        fieldName={field.name}
        onChange={v => commit(v)} 
      />
    );
  } else if (field.type === 'labels' || ((field.type === 'member' || field.type === 'people') && field.allowMultiple)) {
    const selected = fieldSelections(value);
    const options = (field.type === 'member' || field.type === 'people') ? members.map(member => ({ id: member.id, label: member.name })) : fieldOptions(field);
    control = <details className="relative min-w-[140px] text-xs">
      <summary aria-label={field.name} className={`${inputClass} cursor-pointer list-none flex items-center justify-between`}>
        <span className="truncate">{selected.length ? selected.map(item => options.find(option => option.id === item)?.label || item).join(', ') : (vi ? 'Chọn nhiều giá trị…' : 'Select values…')}</span>
        <span className="text-[10px] text-slate-400">▼</span>
      </summary>
      <div className="absolute left-0 top-full mt-1 z-50 w-full min-w-[160px] max-h-44 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        {options.length === 0 && <p className="text-slate-400">{vi ? 'Chưa có lựa chọn' : 'No options available'}</p>}
        {options.map(option => {
          const token = (field.type === 'member' || field.type === 'people') ? option.id : option.label;
          const checked = selected.includes(token) || selected.includes(option.id);
          return <label key={option.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"><input type="checkbox" checked={checked} onChange={() => commit(checked ? selected.filter(item => item !== token && item !== option.id) : [...selected, token])} className="accent-indigo-600 rounded" /><span>{option.label}</span></label>;
        })}
        {selected.length > 0 && <button type="button" onClick={() => commit([])} className="text-indigo-500 font-bold hover:underline">{vi ? 'Bỏ chọn tất cả' : 'Clear selection'}</button>}
      </div>
    </details>;
  } else if (field.type === 'member' || field.type === 'people') {
    control = <select aria-label={field.name} value={String(value ?? '')} onChange={event => commit(event.target.value)} className={inputClass}>
      <option value="">{vi ? 'Chọn thành viên…' : 'Select member…'}</option>
      {value && !members.some(member => member.id === value) ? <option value={String(value)}>{String(value)}</option> : null}
      {members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
    </select>;
  } else if (field.type === 'rating') {
    const Icon = field.ratingIcon === 'heart' ? Heart : field.ratingIcon === 'flame' ? Flame : field.ratingIcon === 'thumb' ? ThumbsUp : Star;
    const max = Math.min(10, Math.max(1, field.ratingMax ?? 5));
    control = <div role="group" aria-label={field.name} className="flex flex-wrap gap-1">{Array.from({ length: max }, (_, index) => <button key={index} type="button" aria-label={`${field.name}: ${index + 1}/${max}`} aria-pressed={Number(value) === index + 1} onClick={() => commit(Number(value) === index + 1 ? '' : index + 1)} className="rounded p-0.5 text-amber-500 focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer hover:scale-110 transition-transform"><Icon size={16} fill={Number(value) > index ? 'currentColor' : 'none'} /></button>)}</div>;
  } else if (field.type === 'voting') {
    const votes = Number(value) || 0;
    control = <button type="button" onClick={() => commit(votes + 1)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700/80 bg-slate-50 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-3xs cursor-pointer" title={vi ? 'Bình chọn' : 'Vote'}><ThumbsUp size={13} className="text-slate-500 dark:text-zinc-400" /><span>{votes}</span></button>;
  } else if (field.type === 'button') {
    control = <button type="button" onClick={() => { if (field.buttonAction === 'open_url' && value) { window.open(String(value), '_blank'); } else { commit(new Date().toISOString()); } }} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95"><Play size={12} className="fill-current" /><span>{field.buttonText || (vi ? 'Thực hiện' : 'Action')}</span></button>;
  } else if (field.type === 'location') {
    if (variant === 'table' && !isInlineEditing) {
      const isEmpty = value == null || String(value).trim() === '';
      control = (
        <div
          onClick={() => setIsInlineEditing(true)}
          className="group/cell inline-flex items-center gap-1.5 min-h-[26px] max-w-full px-2 py-0.5 rounded-lg hover:bg-slate-100/70 dark:hover:bg-white/[0.04] cursor-pointer transition-colors"
          title={vi ? 'Nhấp để chỉnh sửa' : 'Click to edit'}
        >
          <MapPin size={12} className="text-slate-400 dark:text-zinc-500 shrink-0 group-hover/cell:text-blue-500 transition-colors" />
          <span className={`text-xs truncate ${isEmpty ? 'text-slate-300 dark:text-zinc-600 font-normal' : 'font-medium text-slate-800 dark:text-zinc-200'}`}>
            {isEmpty ? '—' : String(value)}
          </span>
          {value ? <a href={`https://maps.google.com/?q=${encodeURIComponent(String(value))}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-slate-400 hover:text-blue-500" title="Google Maps"><ExternalLink size={11} /></a> : null}
        </div>
      );
    } else {
      control = <div className="relative flex items-center"><input autoFocus={variant === 'table'} {...editingProps} type="text" placeholder={field.placeholder || (vi ? 'Nhập địa chỉ…' : 'Enter location…')} className={`${inputClass} pl-7`} /><MapPin size={13} className="absolute left-2 text-slate-400 dark:text-zinc-500 shrink-0 pointer-events-none" />{value ? <a href={`https://maps.google.com/?q=${encodeURIComponent(String(value))}`} target="_blank" rel="noopener noreferrer" className="absolute right-2 text-slate-400 hover:text-blue-500" title="Google Maps"><ExternalLink size={12} /></a> : null}</div>;
    }
  } else if (field.type === 'formula' || field.type === 'rollup') {
    control = <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-mono border border-slate-200 dark:border-zinc-700/80"><Calculator size={13} className="text-slate-500 dark:text-zinc-400" /><span>{String(value || (vi ? 'Tự động tính' : 'Auto'))}</span></div>;
  } else if (field.type === 'signature') {
    control = <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700/80 bg-slate-50 dark:bg-zinc-900 text-xs text-slate-600 dark:text-slate-400"><PenTool size={13} className="text-slate-500 dark:text-zinc-400" /><span>{value ? String(value) : (vi ? 'Chưa ký' : 'Unsigned')}</span></div>;
  } else if (field.type === 'tasks') {
    control = <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold border border-slate-200 dark:border-zinc-700/60"><CheckCircle2 size={13} className="text-slate-500 dark:text-zinc-400" /><span>{value ? String(value) : (vi ? 'Chưa liên kết' : 'No tasks')}</span></div>;
  } else if (field.type === 'files') {
    control = <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 text-xs text-slate-600 dark:text-slate-300"><Paperclip size={13} className="text-slate-500 dark:text-zinc-400" /><span>{value ? `${String(value)} ${vi ? 'tệp' : 'files'}` : (vi ? 'Đính kèm tệp' : 'Attach file')}</span></div>;
  } else if (field.type === 'textarea') {
    if (variant === 'table' && !isInlineEditing) {
      const isEmpty = value == null || String(value).trim() === '';
      control = (
        <div
          onClick={() => setIsInlineEditing(true)}
          className="group/cell inline-flex items-center min-h-[26px] max-w-full px-2 py-0.5 rounded-lg hover:bg-slate-100/70 dark:hover:bg-white/[0.04] cursor-pointer transition-colors"
          title={vi ? 'Nhấp để chỉnh sửa' : 'Click to edit'}
        >
          <span className={`text-xs truncate max-w-[200px] ${isEmpty ? 'text-slate-300 dark:text-zinc-600 font-normal' : 'font-medium text-slate-800 dark:text-zinc-200'}`}>
            {isEmpty ? '—' : String(value)}
          </span>
        </div>
      );
    } else {
      control = <textarea autoFocus={variant === 'table'} {...editingProps} rows={variant === 'table' ? 2 : 3} />;
    }
  } else {
    const isProgress = field.type === 'progress' || field.type === 'progress_auto' || field.type === 'progress_manual';
    const isUrl = field.type === 'url' || field.type === 'website';
    const numeric = ['number', 'money'].includes(field.type) || isProgress;
    const type = field.type === 'date' ? (field.includeTime ? 'datetime-local' : 'date') : numeric ? 'number' : field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : isUrl ? 'url' : 'text';
    const unit = field.type === 'money' ? field.currencySymbol || '₫' : isProgress || field.numberFormat === 'percent' ? '%' : field.numberUnit;

    if (variant === 'table' && !isInlineEditing) {
      const isEmpty = value == null || String(value).trim() === '';
      control = (
        <div
          onClick={() => setIsInlineEditing(true)}
          className={`group/cell inline-flex items-center gap-1.5 min-h-[26px] max-w-full px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
            isEmpty
              ? 'text-slate-400 dark:text-slate-500 hover:bg-slate-100/70 dark:hover:bg-white/[0.04]'
              : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100/80 dark:hover:bg-white/[0.06]'
          }`}
          title={vi ? 'Nhấp để chỉnh sửa' : 'Click to edit'}
        >
          {isUrl && !isEmpty && <Globe size={12} className="text-slate-400 dark:text-zinc-500 shrink-0 group-hover/cell:text-blue-500 transition-colors" />}
          {field.type === 'money' && !isEmpty && field.currencyPosition === 'prefix' && (
            <span className="text-[11px] font-bold text-slate-400">{unit}</span>
          )}
          <span className={`text-xs truncate ${isEmpty ? 'text-slate-300 dark:text-zinc-600 font-normal' : 'font-medium'}`}>
            {isEmpty ? '—' : String(value)}
          </span>
          {unit && !isEmpty && !(field.type === 'money' && field.currencyPosition === 'prefix') && (
            <span className="text-[10px] text-slate-400 font-bold ml-0.5">{unit}</span>
          )}
          {isProgress && !isEmpty && (
            <div className="w-12 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden ml-1">
              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, Number(value) || 0))}%` }} />
            </div>
          )}
        </div>
      );
    } else {
      control = <div className="space-y-1"><div className="flex min-w-[100px] items-center gap-1.5">
        {field.type === 'money' && field.currencyPosition === 'prefix' && <span className="text-xs text-slate-400 font-bold">{unit}</span>}
        {isUrl && <Globe size={13} className="text-slate-400 dark:text-zinc-500 shrink-0" />}
        <input 
          autoFocus={variant === 'table'} 
          {...editingProps} 
          type={type} 
          min={isProgress ? 0 : field.numberMin} 
          max={isProgress ? field.progressMax ?? 100 : field.numberMax} 
          step={numeric ? field.numberPrecision != null ? 10 ** -field.numberPrecision : 'any' : undefined} 
        />
        {unit && !(field.type === 'money' && field.currencyPosition === 'prefix') && <span className="text-xs text-slate-400 font-bold">{unit}</span>}
        {isUrl && value && !validateCustomField(field, value) ? <a href={String(value)} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer" aria-label={vi ? 'Mở liên kết' : 'Open link'}><ExternalLink size={14} /></a> : null}
      </div>{isProgress && <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden"><div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, Number(value) || 0))}%` }} /></div>}</div>;
    }
  }
  return <div className="min-w-0">{control}{error && <p id={`${id}-error`} role="alert" className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{error}</p>}</div>;
}
