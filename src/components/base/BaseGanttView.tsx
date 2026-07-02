"use client";

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, GanttChart } from 'lucide-react';
import { BaseField, BaseRecord, BaseTable, User } from '../../types';
import { createEmptyRecord, getPrimaryValue } from '../../lib/baseUtils';

interface BaseGanttViewProps {
  table: BaseTable;
  records: BaseRecord[];
  members: User[];
  onAddRecord: (record: BaseRecord) => void;
  ganttStartFieldId?: string;
  ganttDurationFieldId?: string;
}

type Unit = 'day' | 'week' | 'month';

export default function BaseGanttView({
  table, records, members, onAddRecord, ganttStartFieldId, ganttDurationFieldId
}: BaseGanttViewProps) {
  const startField: BaseField | undefined = table.fields.find(f => f.id === ganttStartFieldId)
    || table.fields.find(f => f.type === 'date');

  const durationField: BaseField | undefined = table.fields.find(f => f.id === ganttDurationFieldId)
    || table.fields.find(f => f.type === 'number');

  const [unit, setUnit] = useState<Unit>('day');
  const [viewStart, setViewStart] = useState(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - 3);
    return d;
  });

  const dayMs = 24 * 60 * 60 * 1000;

  const timeline = useMemo(() => {
    const days: Date[] = [];
    const count = unit === 'day' ? 28 : unit === 'week' ? 8 : 4;
    for (let i = 0; i < count; i++) {
      const d = new Date(viewStart);
      if (unit === 'day') d.setDate(d.getDate() + i);
      else if (unit === 'week') d.setDate(d.getDate() + i * 7);
      else d.setMonth(d.getMonth() + i);
      days.push(d);
    }
    return days;
  }, [viewStart, unit]);

  const recordsWithDates = useMemo(() => {
    if (!startField) return [];
    return records
      .map(r => {
        const raw = r.values[startField.id];
        if (!raw) return null;
        const start = new Date(String(raw));
        if (isNaN(start.getTime())) return null;

        let durationDays = 1;
        if (durationField) {
          const dur = r.values[durationField.id];
          if (dur != null && !isNaN(Number(dur))) {
            durationDays = Math.max(1, Number(dur));
          }
        }

        const progress = typeof r.values.progress === 'number' ? r.values.progress : 0;

        return { record: r, start, durationDays, progress };
      })
      .filter(Boolean) as { record: BaseRecord; start: Date; durationDays: number; progress: number }[];
  }, [records, startField, durationField]);

  const timelineStart = timeline[0].getTime();
  const timelineEnd = timeline[timeline.length - 1].getTime();
  const timelineSpan = timelineEnd - timelineStart + dayMs;

  const barFor = (rec: { start: Date; durationDays: number }) => {
    const startOffset = rec.start.getTime() - timelineStart;
    const left = Math.max(0, (startOffset / timelineSpan) * 100);
    const width = Math.max(1, (rec.durationDays * dayMs / timelineSpan) * 100);
    return { left, width };
  };

  const navigate = (dir: -1 | 1) => {
    setViewStart(prev => {
      const d = new Date(prev);
      if (unit === 'day') d.setDate(d.getDate() + dir * 7);
      else if (unit === 'week') d.setDate(d.getDate() + dir * 28);
      else d.setMonth(d.getMonth() + dir * 2);
      return d;
    });
  };

  if (!startField) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        Add a Date field to use Gantt view
      </div>
    );
  }

  const today = new Date();
  const todayIdx = timeline.findIndex(d => {
    const diff = d.getTime() - today.getTime();
    return diff >= 0 && diff < dayMs;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(-1)} className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer">
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <button type="button" onClick={() => navigate(1)} className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer">
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
          <div className="flex items-center gap-1 ml-2">
            {(['day', 'week', 'month'] as Unit[]).map(u => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer capitalize ${
                  unit === u ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const record = createEmptyRecord(table);
            record.values[table.primaryFieldId] = 'New task';
            if (startField) record.values[startField.id] = new Date().toISOString().split('T')[0];
            onAddRecord(record);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Add task
        </button>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="flex border-b border-slate-200/60 bg-slate-50/50 sticky top-0 z-10">
            <div className="w-64 shrink-0 px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider border-r border-slate-200/60">
              Task
            </div>
            <div className="flex-1 flex">
              {timeline.map((d, i) => {
                const isToday = i === todayIdx;
                const label = unit === 'day'
                  ? d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
                  : unit === 'week'
                    ? `Week ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

                return (
                  <div
                    key={i}
                    className={`flex-1 text-center text-[10px] font-bold py-2 border-r border-slate-100 ${
                      isToday ? 'text-indigo-700 bg-indigo-50/60' : 'text-slate-500'
                    }`}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100">
            {recordsWithDates.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-400">
                No records with dates to display. Add a date field and create tasks.
              </div>
            )}
            {recordsWithDates.map(({ record, start, durationDays, progress }) => {
              const pos = barFor({ start, durationDays });
              const title = getPrimaryValue(record, table);
              const assigneeId = (record.values.assigneeId as string | undefined) || (record.values.assigneeIds as string[] | undefined)?.[0];
              const assignee = assigneeId ? members.find(m => m.id === assigneeId) : undefined;

              return (
                <div key={record.id} className="flex hover:bg-slate-50/40 transition-colors group">
                  <div className="w-64 shrink-0 px-3 py-2 border-r border-slate-100 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{title}</p>
                      <p className="text-[10px] text-slate-400">
                        {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {durationDays}d
                      </p>
                    </div>
                    {assignee && (
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-black text-slate-600">
                        {assignee.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 relative h-14">
                    {/* Grid lines */}
                    {unit === 'day' && timeline.map((d, i) => (
                      <div key={i} className={`absolute top-0 bottom-0 border-r border-slate-100 ${i === todayIdx ? 'bg-indigo-50/30' : ''}`} style={{ left: `${(i / timeline.length) * 100}%`, width: `${100 / timeline.length}%` }} />
                    ))}
                    {unit === 'week' && timeline.map((d, i) => (
                      <div key={i} className={`absolute top-0 bottom-0 border-r border-slate-100 ${i === todayIdx ? 'bg-indigo-50/30' : ''}`} style={{ left: `${(i / timeline.length) * 100}%`, width: `${100 / timeline.length}%` }} />
                    ))}
                    {unit === 'month' && timeline.map((d, i) => (
                      <div key={i} className={`absolute top-0 bottom-0 border-r border-slate-100 ${i === todayIdx ? 'bg-indigo-50/30' : ''}`} style={{ left: `${(i / timeline.length) * 100}%`, width: `${100 / timeline.length}%` }} />
                    ))}

                    {/* Today line */}
                    {todayIdx >= 0 && unit === 'day' && (
                      <div className="absolute top-0 bottom-0 w-px bg-indigo-400/60 z-10" style={{ left: `${(todayIdx / timeline.length) * 100 + 100 / timeline.length / 2}%` }} />
                    )}

                    {/* Task bar */}
                    <div
                      className="absolute top-3 h-7 rounded-md bg-indigo-500/90 hover:bg-indigo-600 cursor-pointer flex items-center px-2 shadow-sm group-hover:shadow-md transition-all"
                      style={{ left: `${pos.left}%`, width: `${pos.width}%` }}
                      title={`${title} - ${progress}%`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="h-1.5 rounded-full bg-white/30 overflow-hidden">
                          <div className="h-full bg-white/90 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
