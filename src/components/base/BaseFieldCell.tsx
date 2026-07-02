"use client";

import React, { useState, useRef, useEffect } from 'react';
import { BaseField, User } from '../../types';
import { getOptionColor, getOptionLabel, getPersonName } from '../../lib/baseUtils';
import SignedImage from '../SignedImage';
import { Star, ExternalLink } from 'lucide-react';

interface BaseFieldCellProps {
  field: BaseField;
  value: unknown;
  members?: User[];
  editable?: boolean;
  onChange?: (value: unknown) => void;
  compact?: boolean;
}

export default function BaseFieldCell({ field, value, members = [], editable = false, onChange, compact = false }: BaseFieldCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(String(value ?? ''));
  }, [value]);

  const commit = (newVal: unknown) => {
    onChange?.(newVal);
    setEditing(false);
  };

  const handleClick = () => {
    if (editable) setEditing(true);
  };

  if (field.type === 'checkbox') {
    return (
      <div className={`flex items-center ${compact ? 'justify-center' : ''}`} onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={!!value}
          disabled={!editable}
          onChange={e => onChange?.(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-indigo-600 accent-indigo-600 cursor-pointer"
        />
      </div>
    );
  }

  if (field.type === 'single_select' && !editing) {
    if (!value) return <span className="text-slate-300 text-xs">—</span>;
    const color = getOptionColor(field, value);
    const label = getOptionLabel(field, value);
    return (
      <span
        onClick={handleClick}
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold text-white ${editable ? 'cursor-pointer hover:opacity-80' : ''}`}
        style={{ backgroundColor: color }}
      >
        {label}
      </span>
    );
  }

  if (field.type === 'single_select' && editing) {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={String(value ?? '')}
        onChange={e => commit(e.target.value)}
        onBlur={() => setEditing(false)}
        className="w-full text-xs border border-indigo-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        onClick={e => e.stopPropagation()}
      >
        <option value="">—</option>
        {field.options?.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'rating') {
    const rating = Number(value) || 0;
    return (
      <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            disabled={!editable}
            onClick={() => onChange?.(star)}
            className={`${editable ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          >
            <Star className={`w-3.5 h-3.5 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
          </button>
        ))}
      </div>
    );
  }

  if (field.type === 'person' && !editing) {
    const name = getPersonName(members, value);
    const member = members.find(m => m.id === value);
    if (!name) return <span className="text-slate-300 text-xs">—</span>;
    return (
      <div onClick={handleClick} className={`flex items-center gap-1.5 ${editable ? 'cursor-pointer' : ''}`}>
        {member && (
          <SignedImage src={member.avatar} alt={name} className="w-5 h-5 rounded-full object-cover" />
        )}
        <span className="text-xs font-medium text-slate-700 truncate">{name}</span>
      </div>
    );
  }

  if (field.type === 'person' && editing) {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={String(value ?? '')}
        onChange={e => commit(e.target.value)}
        onBlur={() => setEditing(false)}
        className="w-full text-xs border border-indigo-300 rounded-lg px-2 py-1 bg-white focus:outline-none"
        onClick={e => e.stopPropagation()}
      >
        <option value="">—</option>
        {members.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'url' && value) {
    return (
      <a
        href={String(value)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="text-xs text-indigo-600 hover:underline flex items-center gap-1 truncate max-w-[180px]"
      >
        {String(value).replace(/^https?:\/\//, '')}
        <ExternalLink className="w-3 h-3 shrink-0" />
      </a>
    );
  }

  if (field.type === 'currency' && !editing) {
    const formatted = value != null && value !== ''
      ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value))
      : '';
    return (
      <span onClick={handleClick} className={`text-xs font-medium text-slate-700 ${editable ? 'cursor-pointer' : ''}`}>
        {formatted || <span className="text-slate-300">—</span>}
      </span>
    );
  }

  if (field.type === 'percent' && !editing) {
    const pct = Number(value) || 0;
    return (
      <div onClick={handleClick} className={`flex items-center gap-2 ${editable ? 'cursor-pointer' : ''}`}>
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <span className="text-[10px] font-bold text-slate-500 w-8">{pct}%</span>
      </div>
    );
  }

  if (field.type === 'date' && !editing) {
    const formatted = value
      ? new Date(String(value)).toLocaleDateString('vi-VN')
      : '';
    return (
      <span onClick={handleClick} className={`text-xs text-slate-600 ${editable ? 'cursor-pointer hover:text-indigo-600' : ''}`}>
        {formatted || <span className="text-slate-300">—</span>}
      </span>
    );
  }

  if (field.type === 'date' && editing) {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="date"
        value={String(value ?? '').split('T')[0]}
        onChange={e => commit(e.target.value)}
        onBlur={() => setEditing(false)}
        className="w-full text-xs border border-indigo-300 rounded-lg px-2 py-1 bg-white focus:outline-none"
        onClick={e => e.stopPropagation()}
      />
    );
  }

  if (field.type === 'long_text' && editing) {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
        rows={2}
        className="w-full text-xs border border-indigo-300 rounded-lg px-2 py-1 bg-white focus:outline-none resize-none"
        onClick={e => e.stopPropagation()}
      />
    );
  }

  if (editing) {
    const inputType = field.type === 'number' || field.type === 'currency' || field.type === 'percent'
      ? 'number'
      : field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text';

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={inputType}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => {
          const parsed = inputType === 'number' ? Number(draft) : draft;
          commit(parsed);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            const parsed = inputType === 'number' ? Number(draft) : draft;
            commit(parsed);
          }
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-full text-xs border border-indigo-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        onClick={e => e.stopPropagation()}
      />
    );
  }

  const display = value != null && value !== '' ? String(value) : null;
  return (
    <span
      onClick={handleClick}
      className={`text-xs text-slate-700 truncate block max-w-full ${editable ? 'cursor-text hover:bg-indigo-50/50 rounded px-1 -mx-1' : ''} ${field.type === 'long_text' ? 'line-clamp-2 whitespace-normal' : ''}`}
    >
      {display ?? <span className="text-slate-300">—</span>}
    </span>
  );
}
