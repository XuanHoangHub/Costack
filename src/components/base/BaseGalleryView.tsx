"use client";

import React from 'react';
import { Plus } from 'lucide-react';
import { BaseRecord, BaseTable, User } from '../../types';
import { createEmptyRecord, formatFieldDisplay, getPrimaryValue } from '../../lib/baseUtils';
import BaseFieldCell from './BaseFieldCell';

interface BaseGalleryViewProps {
  table: BaseTable;
  records: BaseRecord[];
  members: User[];
  onAddRecord: (record: BaseRecord) => void;
}

export default function BaseGalleryView({ table, records, members, onAddRecord }: BaseGalleryViewProps) {
  const displayFields = table.fields.filter(f => f.id !== table.primaryFieldId).slice(0, 4);

  const GRADIENTS = [
    'linear-gradient(135deg, #6366f1, #a855f7)',
    'linear-gradient(135deg, #10b981, #3b82f6)',
    'linear-gradient(135deg, #f59e0b, #ef4444)',
    'linear-gradient(135deg, #ec4899, #8b5cf6)',
    'linear-gradient(135deg, #06b6d4, #6366f1)',
  ];

  const handleAdd = () => {
    const record = createEmptyRecord(table);
    record.values[table.primaryFieldId] = 'New item';
    onAddRecord(record);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-1">
        {records.map((record, idx) => (
          <div
            key={record.id}
            className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all group"
          >
            <div
              className="h-24 flex items-end p-3"
              style={{ background: GRADIENTS[idx % GRADIENTS.length] }}
            >
              <h3 className="text-white font-black text-sm truncate drop-shadow-sm">
                {getPrimaryValue(record, table)}
              </h3>
            </div>
            <div className="p-3 space-y-2">
              {displayFields.map(field => (
                <div key={field.id} className="flex items-start gap-2">
                  <span className="text-[9px] font-black uppercase text-slate-400 w-20 shrink-0 pt-0.5 truncate">{field.name}</span>
                  <div className="flex-1 min-w-0">
                    <BaseFieldCell field={field} value={record.values[field.id]} members={members} compact />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={handleAdd}
          className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 flex flex-col items-center justify-center gap-2 min-h-[180px] text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
        >
          <Plus className="w-6 h-6" />
          <span className="text-xs font-bold">Add item</span>
        </button>
      </div>
    </div>
  );
}
