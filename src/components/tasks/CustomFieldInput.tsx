"use client";

import React, { useId, useState } from 'react';
import { ExternalLink, Flame, Heart, Star, ThumbsUp } from 'lucide-react';
import type { CustomFieldDefinition, User } from '@/types';
import { fieldOptions, fieldSelections, validateCustomField } from '@/lib/customFields';
import { useTranslation } from '@/contexts/TranslationContext';

interface Props {
  field: CustomFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  members?: User[];
  draft?: boolean;
}

/** One editor for task creation, task details and table cells. */
export default function CustomFieldInput({ field, value, onChange, members = [], draft = false }: Props) {
  const { locale } = useTranslation();
  const vi = locale === 'vi';
  const id = useId();
  const [pending, setPending] = useState<{ value: string; base: unknown } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = pending && pending.base === value ? pending.value : value;
  const inputClass = 'w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
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
        const numeric = ['number', 'money', 'progress', 'rating'].includes(field.type);
        if (commit(numeric && pending.value.trim() !== '' ? Number(pending.value) : pending.value)) setPending(null);
      }
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.key === 'Escape') { event.stopPropagation(); setPending(null); setError(null); }
      if (event.key === 'Enter' && field.type !== 'textarea') { event.preventDefault(); event.currentTarget.blur(); }
    },
  };
  let control: React.ReactNode;
  if (field.type === 'checkbox') {
    control = <label className="flex items-center gap-2 text-xs"><input aria-label={field.name} type="checkbox" checked={value === true || value === 'true'} onChange={event => commit(event.target.checked)} className="h-4 w-4 accent-indigo-600" />{field.checkboxLabel || (vi ? 'Đã chọn' : 'Checked')}</label>;
  } else if (field.type === 'dropdown') {
    const options = fieldOptions(field);
    control = <select aria-label={field.name} className={inputClass} value={String(value ?? '')} onChange={event => commit(event.target.value)}>
      <option value="">{vi ? 'Chọn giá trị…' : 'Select…'}</option>
      {value != null && String(value) !== '' && !options.some(option => option.label === value || option.id === value) && <option value={String(value)}>{String(value)}</option>}
      {options.map(option => <option key={option.id} value={option.id === value ? option.id : option.label}>{option.label}</option>)}
    </select>;
  } else if (field.type === 'labels' || (field.type === 'member' && field.allowMultiple)) {
    const selected = fieldSelections(value);
    const options = field.type === 'member' ? members.map(member => ({ id: member.id, label: member.name })) : fieldOptions(field);
    control = <details className="relative min-w-[140px] text-xs">
      <summary aria-label={field.name} className={`${inputClass} cursor-pointer`}>{selected.length ? selected.map(item => options.find(option => option.id === item)?.label || item).join(', ') : (vi ? 'Chọn nhiều giá trị…' : 'Select values…')}</summary>
      <div className="mt-1 max-h-44 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
        {options.length === 0 && <p className="text-slate-400">{vi ? 'Chưa có lựa chọn' : 'No options available'}</p>}
        {options.map(option => {
          const token = field.type === 'member' ? option.id : option.label;
          const checked = selected.includes(token) || selected.includes(option.id);
          return <label key={option.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"><input type="checkbox" checked={checked} onChange={() => commit(checked ? selected.filter(item => item !== token && item !== option.id) : [...selected, token])} className="accent-indigo-600" />{option.label}</label>;
        })}
        {selected.length > 0 && <button type="button" onClick={() => commit([])} className="text-indigo-500">{vi ? 'Bỏ chọn tất cả' : 'Clear selection'}</button>}
      </div>
    </details>;
  } else if (field.type === 'member') {
    control = <select aria-label={field.name} value={String(value ?? '')} onChange={event => commit(event.target.value)} className={inputClass}>
      <option value="">{vi ? 'Chọn thành viên…' : 'Select member…'}</option>
      {value && !members.some(member => member.id === value) ? <option value={String(value)}>{String(value)}</option> : null}
      {members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
    </select>;
  } else if (field.type === 'rating') {
    const Icon = field.ratingIcon === 'heart' ? Heart : field.ratingIcon === 'flame' ? Flame : field.ratingIcon === 'thumb' ? ThumbsUp : Star;
    const max = Math.min(10, Math.max(1, field.ratingMax ?? 5));
    control = <div role="group" aria-label={field.name} className="flex flex-wrap gap-1">{Array.from({ length: max }, (_, index) => <button key={index} type="button" aria-label={`${field.name}: ${index + 1}/${max}`} aria-pressed={Number(value) === index + 1} onClick={() => commit(Number(value) === index + 1 ? '' : index + 1)} className="rounded p-0.5 text-amber-500 focus-visible:ring-2 focus-visible:ring-indigo-500"><Icon size={16} fill={Number(value) > index ? 'currentColor' : 'none'} /></button>)}</div>;
  } else if (field.type === 'textarea') {
    control = <textarea {...editingProps} rows={3} />;
  } else {
    const numeric = ['number', 'money', 'progress'].includes(field.type);
    const type = field.type === 'date' ? (field.includeTime ? 'datetime-local' : 'date') : numeric ? 'number' : field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'url' ? 'url' : 'text';
    const unit = field.type === 'money' ? field.currencySymbol || '₫' : field.type === 'progress' || field.numberFormat === 'percent' ? '%' : field.numberUnit;
    control = <div className="space-y-1"><div className="flex min-w-[100px] items-center gap-1.5">
      {field.type === 'money' && field.currencyPosition === 'prefix' && <span className="text-xs text-slate-400">{unit}</span>}
      <input {...editingProps} type={type} min={field.type === 'progress' ? 0 : field.numberMin} max={field.type === 'progress' ? field.progressMax ?? 100 : field.numberMax} step={numeric ? field.numberPrecision != null ? 10 ** -field.numberPrecision : 'any' : undefined} />
      {unit && !(field.type === 'money' && field.currencyPosition === 'prefix') && <span className="text-xs text-slate-400">{unit}</span>}
      {field.type === 'url' && value && !validateCustomField(field, value) ? <a href={String(value)} target="_blank" rel="noopener noreferrer" aria-label={vi ? 'Mở liên kết' : 'Open link'}><ExternalLink size={14} /></a> : null}
    </div>{field.type === 'progress' && <progress aria-label={field.name} max={field.progressMax ?? 100} value={Number(value) || 0} className="h-1 w-full accent-indigo-600" />}</div>;
  }
  return <div className="min-w-0">{control}{error && <p id={`${id}-error`} role="alert" className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{error}</p>}</div>;
}
