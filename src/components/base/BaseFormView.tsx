"use client";

import React, { useState } from 'react';
import { Check, Send } from 'lucide-react';
import { BaseRecord, BaseTable, User } from '../../types';
import { createEmptyRecord } from '../../lib/baseUtils';
import BaseFieldCell from './BaseFieldCell';

interface BaseFormViewProps {
  table: BaseTable;
  members: User[];
  onAddRecord: (record: BaseRecord) => void;
  triggerToast?: (type: 'success' | 'info' | 'assignment' | 'deadline' | 'comment' | 'message', title: string, message: string) => void;
}

export default function BaseFormView({ table, members, onAddRecord, triggerToast }: BaseFormViewProps) {
  const [draft, setDraft] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    table.fields.forEach(f => {
      if (f.type === 'checkbox') initial[f.id] = false;
      else if (f.type === 'multi_select') initial[f.id] = [];
      else if (f.type === 'rating') initial[f.id] = 0;
      else if (f.type === 'percent' || f.type === 'number' || f.type === 'currency') initial[f.id] = 0;
      else initial[f.id] = '';
    });
    return initial;
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const record = createEmptyRecord(table);
    record.values = { ...draft };
    onAddRecord(record);
    setSubmitted(true);
    triggerToast?.('success', 'Record submitted', 'New entry added to the table.');
    setTimeout(() => {
      setSubmitted(false);
      const reset: Record<string, unknown> = {};
      table.fields.forEach(f => {
        if (f.type === 'checkbox') reset[f.id] = false;
        else if (f.type === 'multi_select') reset[f.id] = [];
        else if (f.type === 'rating') reset[f.id] = 0;
        else if (f.type === 'percent' || f.type === 'number' || f.type === 'currency') reset[f.id] = 0;
        else reset[f.id] = '';
      });
      setDraft(reset);
    }, 1500);
  };

  return (
    <div className="max-w-xl mx-auto py-6 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40">
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">{table.name} — Biểu mẫu</h2>
          <p className="text-xs text-slate-500 mt-1">Điền thông tin bên dưới để thêm bản ghi mới</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {table.fields.map(field => (
            <div key={field.id}>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                {field.name}
                {field.id === table.primaryFieldId && <span className="text-rose-400 ml-1">*</span>}
              </label>
              <div className="bg-slate-50/50 dark:bg-slate-950/50 rounded-xl border border-slate-200/60 dark:border-slate-800 px-3 py-2.5">
                <BaseFieldCell
                  field={field}
                  value={draft[field.id]}
                  members={members}
                  editable
                  onChange={val => setDraft(prev => ({ ...prev, [field.id]: val }))}
                />
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={submitted}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white transition-all cursor-pointer disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg, var(--apexa-gradient-start, #7B61FF), var(--apexa-gradient-end, #FF3366))' }}
          >
            {submitted ? (
              <><Check className="w-4 h-4" /> Đã gửi!</>
            ) : (
              <><Send className="w-4 h-4" /> Submit</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
