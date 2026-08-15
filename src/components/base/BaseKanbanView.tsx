"use client";

import React from 'react';
import { Plus } from 'lucide-react';
import { BaseField, BaseRecord, BaseTable, User } from '../../types';
import { createEmptyRecord, getOptionColor, getOptionLabel, getPrimaryValue } from '../../lib/baseUtils';
import BaseFieldCell from './BaseFieldCell';

interface BaseKanbanViewProps {
  table: BaseTable;
  records: BaseRecord[];
  members: User[];
  kanbanFieldId?: string;
  onUpdateRecord: (record: BaseRecord) => void;
  onAddRecord: (record: BaseRecord) => void;
}

export default function BaseKanbanView({
  table, records, members, kanbanFieldId, onUpdateRecord, onAddRecord
}: BaseKanbanViewProps) {
  const kanbanField: BaseField | undefined = table.fields.find(f => f.id === kanbanFieldId)
    || table.fields.find(f => f.type === 'single_select');

  if (!kanbanField || !kanbanField.options?.length) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        Thêm trường Chọn một để sử dụng chế độ xem Kanban
      </div>
    );
  }

  const columns = kanbanField.options;
  const otherFields = table.fields.filter(f => f.id !== kanbanField.id && f.id !== table.primaryFieldId).slice(0, 3);

  const getColumnRecords = (optionId: string) =>
    records.filter(r => r.values[kanbanField.id] === optionId);

  const unassigned = records.filter(r => !r.values[kanbanField.id]);

  const handleDrop = (recordId: string, optionId: string) => {
    const record = records.find(r => r.id === recordId);
    if (!record) return;
    onUpdateRecord({
      ...record,
      values: { ...record.values, [kanbanField.id]: optionId },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddToColumn = (optionId: string) => {
    const record = createEmptyRecord(table);
    record.values[table.primaryFieldId] = 'New card';
    record.values[kanbanField.id] = optionId;
    onAddRecord(record);
  };

  const Column = ({ optionId, label, color, columnRecords }: { optionId: string; label: string; color: string; columnRecords: BaseRecord[] }) => (
    <div
      className="flex flex-col w-[260px] shrink-0 bg-slate-50/80 dark:bg-slate-950/60 rounded-2xl border border-slate-200/60 dark:border-slate-800 overflow-hidden"
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        const recordId = e.dataTransfer.getData('recordId');
        if (recordId) handleDrop(recordId, optionId);
      }}
    >
      <div className="px-3 py-2.5 flex items-center gap-2 border-b border-slate-200/60">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">{label}</span>
        <span className="ml-auto text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded-full">{columnRecords.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px] max-h-[calc(100vh-280px)]">
        {columnRecords.map(record => (
          <div
            key={record.id}
            draggable
            onDragStart={e => e.dataTransfer.setData('recordId', record.id)}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-grab active:cursor-grabbing"
          >
            <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 mb-2">{getPrimaryValue(record, table)}</p>
            {otherFields.map(field => (
              <div key={field.id} className="mb-1.5">
                <BaseFieldCell field={field} value={record.values[field.id]} members={members} compact />
              </div>
            ))}
          </div>
        ))}
        <button
          type="button"
          onClick={() => handleAddToColumn(optionId)}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-bold text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3" /> Thêm thẻ
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full px-1">
      {columns.map(col => (
        <Column
          key={col.id}
          optionId={col.id}
          label={col.label}
          color={col.color || '#6366f1'}
          columnRecords={getColumnRecords(col.id)}
        />
      ))}
      {unassigned.length > 0 && (
        <Column
          optionId=""
          label="Unassigned"
          color="#94a3b8"
          columnRecords={unassigned}
        />
      )}
    </div>
  );
}
