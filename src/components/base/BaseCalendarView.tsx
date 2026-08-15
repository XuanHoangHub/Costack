"use client";

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { BaseField, BaseRecord, BaseTable, User } from '../../types';
import { createEmptyRecord, getPrimaryValue } from '../../lib/baseUtils';

interface BaseCalendarViewProps {
  table: BaseTable;
  records: BaseRecord[];
  calendarFieldId?: string;
  members: User[];
  onAddRecord: (record: BaseRecord) => void;
}

export default function BaseCalendarView({
  table, records, calendarFieldId, onAddRecord
}: BaseCalendarViewProps) {
  const dateField: BaseField | undefined = table.fields.find(f => f.id === calendarFieldId)
    || table.fields.find(f => f.type === 'date');

  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthLabel = currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  const recordsByDate = useMemo(() => {
    const map: Record<string, BaseRecord[]> = {};
    if (!dateField) return map;
    records.forEach(r => {
      const dateVal = r.values[dateField.id];
      if (!dateVal) return;
      const key = String(dateVal).split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [records, dateField]);

  const navigate = (dir: -1 | 1) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + dir, 1));
  };

  const handleAddOnDate = (day: number) => {
    if (!dateField) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = createEmptyRecord(table);
    record.values[table.primaryFieldId] = 'New event';
    record.values[dateField.id] = dateStr;
    onAddRecord(record);
  };

  if (!dateField) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        Thêm trường Ngày để sử dụng chế độ xem Lịch
      </div>
    );
  }

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(<div key={`empty-${i}`} className="min-h-[90px] bg-slate-50/30 dark:bg-slate-950/30 rounded-lg" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayRecords = recordsByDate[dateKey] || [];
    const isToday = dateKey === todayKey;

    cells.push(
      <div
        key={day}
        className={`min-h-[90px] rounded-lg border p-1.5 flex flex-col group transition-colors ${isToday ? 'border-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/40' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800'}`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[11px] font-black ${isToday ? 'text-indigo-600' : 'text-slate-500'}`}>{day}</span>
          <button
            type="button"
            onClick={() => handleAddOnDate(day)}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-indigo-100 rounded text-indigo-500 cursor-pointer transition-all"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <div className="flex-1 space-y-0.5 overflow-hidden">
          {dayRecords.slice(0, 3).map(r => (
            <div key={r.id} className="text-[9px] font-bold text-white bg-indigo-500 rounded px-1.5 py-0.5 truncate">
              {getPrimaryValue(r, table)}
            </div>
          ))}
          {dayRecords.length > 3 && (
            <span className="text-[9px] text-slate-400 font-bold">+{dayRecords.length - 3} more</span>
          )}
        </div>
      </div>
    );
  }

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 px-1">
        <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 capitalize">{monthLabel}</h3>
        <button type="button" onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-black uppercase text-slate-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 flex-1 overflow-y-auto">
        {cells}
      </div>
    </div>
  );
}
