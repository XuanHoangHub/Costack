"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BaseField, BaseRecord, BaseTable, User } from '../../types';

interface BaseDashboardViewProps {
  table: BaseTable;
  records: BaseRecord[];
  members: User[];
}

const COLORS = ['#2563EB', '#FF3366', '#10b981', '#f59e0b', '#06b6d4', '#ef4444', '#8b5cf6', '#ec4899'];

export default function BaseDashboardView({ table, records, members }: BaseDashboardViewProps) {
  const numericFields = table.fields.filter(f => f.type === 'number' || f.type === 'currency');
  const selectFields = table.fields.filter(f => f.type === 'single_select' || f.type === 'multi_select');
  const dateFields = table.fields.filter(f => f.type === 'date');

  const metrics = useMemo(() => {
    const items: { label: string; value: string | number; sub?: string }[] = [];
    items.push({ label: 'Total Records', value: records.length });
    if (numericFields.length > 0) {
      numericFields.forEach(f => {
        const vals = records.map(r => Number(r.values[f.id])).filter(v => !isNaN(v));
        const sum = vals.reduce((a, b) => a + b, 0);
        const avg = vals.length ? sum / vals.length : 0;
        items.push({ label: `Sum ${f.name}`, value: sum.toFixed(1), sub: `${vals.length} records` });
        items.push({ label: `Avg ${f.name}`, value: avg.toFixed(1) });
      });
    }
    return items;
  }, [records, numericFields]);

  const categoricalData = useMemo(() => {
    if (selectFields.length === 0) return [];
    const field = selectFields[0];
    const counts: Record<string, number> = {};
    records.forEach(r => {
      const val = r.values[field.id];
      const key = val == null ? 'Empty' : String(val);
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [records, selectFields]);

  const barData = useMemo(() => {
    if (numericFields.length === 0 || selectFields.length === 0) return [];
    const numField = numericFields[0];
    const catField = selectFields[0];
    const groups: Record<string, number[]> = {};
    records.forEach(r => {
      const cat = r.values[catField.id];
      const key = cat == null ? 'Empty' : String(cat);
      const num = Number(r.values[numField.id]);
      if (!groups[key]) groups[key] = [];
      if (!isNaN(num)) groups[key].push(num);
    });
    return Object.entries(groups).map(([name, vals]) => ({
      name,
      [numField.name]: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100 : 0,
      count: vals.length,
    })).slice(0, 12);
  }, [records, numericFields, selectFields]);

  const timeSeries = useMemo(() => {
    if (dateFields.length === 0 || numericFields.length === 0) return [];
    const dateField = dateFields[0];
    const numField = numericFields[0];
    const map: Record<string, number> = {};
    records.forEach(r => {
      const raw = r.values[dateField.id];
      if (!raw) return;
      const d = new Date(String(raw));
      if (isNaN(d.getTime())) return;
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const num = Number(r.values[numField.id]);
      if (isNaN(num)) return;
      map[key] = (map[key] || 0) + num;
    });
    return Object.entries(map).map(([date, value]) => ({ date, value })).slice(0, 20);
  }, [records, dateFields, numericFields]);

  if (records.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        Thêm bản ghi để xem phân tích trên bảng điều khiển
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metrics.map((m, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{m.label}</p>
              <p className="text-lg font-black text-slate-800 dark:text-slate-100">{m.value}</p>
              {m.sub && <p className="text-[10px] text-slate-400 mt-0.5">{m.sub}</p>}
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {barData.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 mb-3">Tổng theo {selectFields[0]?.name}</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey={numericFields[0]?.name} radius={[4, 4, 0, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {timeSeries.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 mb-3">{numericFields[0]?.name} theo thời gian</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeSeries}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#2563EB" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {categoricalData.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 mb-3">Distribution</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoricalData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {categoricalData.map((entry, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Recent records table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 mb-3">Bản ghi gần đây</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {table.fields.slice(0, 5).map(f => (
                    <th key={f.id} className="text-left py-2 px-2 text-[10px] font-black text-slate-400 uppercase">{f.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 5).map(r => (
                  <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/60">
                    {table.fields.slice(0, 5).map(f => (
                      <td key={f.id} className="py-2 px-2 text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                        {String(r.values[f.id] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
