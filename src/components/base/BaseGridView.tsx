"use client";

import React, { useState } from 'react';
import { ArrowUpDown, Plus, Trash2 } from 'lucide-react';
import { BaseRecord, BaseTable, User } from '../../types';
import { createEmptyRecord, getPrimaryValue } from '../../lib/baseUtils';
import BaseFieldCell from './BaseFieldCell';

interface BaseGridViewProps {
  table: BaseTable;
  records: BaseRecord[];
  members: User[];
  visibleFields?: string[];
  onUpdateRecord: (record: BaseRecord) => void;
  onAddRecord: (record: BaseRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  onAddField?: () => void;
}

export default function BaseGridView({
  table, records, members, visibleFields, onUpdateRecord, onAddRecord, onDeleteRecord, onAddField
}: BaseGridViewProps) {
  const [sortField, setSortField] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fields = table.fields.filter(f =>
    !visibleFields || visibleFields.includes(f.id)
  );

  const sortedRecords = React.useMemo(() => {
    if (!sortField) return records;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...records].sort((a, b) => {
      const av = String(a.values[sortField] ?? '');
      const bv = String(b.values[sortField] ?? '');
      return av.localeCompare(bv, undefined, { numeric: true }) * dir;
    });
  }, [records, sortField, sortDir]);

  const toggleSort = (fieldId: string) => {
    if (sortField === fieldId) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(fieldId); setSortDir('asc'); }
  };

  const handleAddRow = () => {
    const record = createEmptyRecord(table);
    record.values[table.primaryFieldId] = 'New record';
    onAddRecord(record);
  };

  const allSelected = sortedRecords.length > 0 && sortedRecords.every(r => selectedIds.includes(r.id));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto rounded-xl border border-slate-200/80 bg-white/80 shadow-sm">
        <table className="w-full border-collapse min-w-max">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50/95 backdrop-blur-sm border-b border-slate-200">
              <th className="w-10 px-3 py-2.5 border-r border-slate-100">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={e => setSelectedIds(e.target.checked ? sortedRecords.map(r => r.id) : [])}
                  className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer"
                />
              </th>
              <th className="w-8 px-2 py-2.5 text-[10px] font-black text-slate-400 border-r border-slate-100">#</th>
              {fields.map(field => (
                <th
                  key={field.id}
                  onClick={() => toggleSort(field.id)}
                  className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-500 cursor-pointer hover:text-indigo-600 transition-colors border-r border-slate-100 select-none"
                  style={{ minWidth: field.width || 140 }}
                >
                  <div className="flex items-center gap-1">
                    <span>{field.name}</span>
                    {sortField === field.id && (
                      <ArrowUpDown className={`w-3 h-3 ${sortDir === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </th>
              ))}
              <th className="w-10 px-2 py-2.5">
                <button
                  type="button"
                  onClick={onAddField}
                  className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                  title="Add field"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((record, idx) => (
              <tr
                key={record.id}
                className={`group border-b border-slate-100 hover:bg-indigo-50/30 transition-colors ${selectedIds.includes(record.id) ? 'bg-indigo-50/50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
              >
                <td className="px-3 py-2 border-r border-slate-100">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(record.id)}
                    onChange={e => setSelectedIds(prev =>
                      e.target.checked ? [...prev, record.id] : prev.filter(id => id !== record.id)
                    )}
                    className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer"
                  />
                </td>
                <td className="px-2 py-2 text-[10px] font-bold text-slate-400 border-r border-slate-100 text-center">{idx + 1}</td>
                {fields.map(field => (
                  <td key={field.id} className="px-3 py-2 border-r border-slate-100 align-middle">
                    <BaseFieldCell
                      field={field}
                      value={record.values[field.id]}
                      members={members}
                      editable
                      onChange={val => onUpdateRecord({
                        ...record,
                        values: { ...record.values, [field.id]: val },
                        updatedAt: new Date().toISOString(),
                      })}
                    />
                  </td>
                ))}
                <td className="px-2 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => onDeleteRecord(record.id)}
                    className="p-1 hover:bg-rose-100 rounded text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedRecords.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <p className="text-sm font-medium">No records yet</p>
            <p className="text-xs mt-1">Click &quot;Add record&quot; to get started</p>
          </div>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-3 px-1 py-2">
        <button
          type="button"
          onClick={handleAddRow}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add record
        </button>
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={() => { selectedIds.forEach(id => onDeleteRecord(id)); setSelectedIds([]); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete {selectedIds.length} selected
          </button>
        )}
        <span className="text-[10px] text-slate-400 ml-auto">{sortedRecords.length} records</span>
      </div>
    </div>
  );
}
