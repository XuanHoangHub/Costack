"use client";

import React, { useMemo, useState } from 'react';
import {
  Activity, ArrowRight, BarChart3, BriefcaseBusiness, Building2, CalendarClock,
  Check, CheckCircle2, ChevronDown, CircleDollarSign, Clock3, Filter, Handshake,
  LayoutDashboard, Mail, MessageSquare, MoreHorizontal, Phone, Plus, Search,
  Sparkles, Target, TrendingUp, UserRound, UsersRound, X
} from 'lucide-react';
import { BaseApp, BaseField, BaseRecord, BaseTable, User } from '@/types';
import { createBaseFromTemplate } from '@/lib/baseTemplates';
import SignedImage from './SignedImage';

interface CRMWorkspaceProps {
  bases: BaseApp[];
  members: User[];
  activeWorkspaceId: string;
  isOffline: boolean;
  onAddBase: (base: BaseApp) => void;
  onUpdateBase: (base: BaseApp) => void;
  onAddSyncLog: (action: string) => void;
  triggerToast?: (type: 'success' | 'info', title: string, message: string) => void;
}

type CRMView = 'overview' | 'pipeline' | 'contacts' | 'activities' | 'reports';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const findField = (table: BaseTable | undefined, ...names: string[]) => table?.fields.find(field =>
  names.some(name => normalize(field.name).includes(normalize(name)))
);
const valueOf = (record: BaseRecord, field?: BaseField) => field ? record.values[field.id] : undefined;
const displayOption = (field: BaseField | undefined, value: unknown) => field?.options?.find(option => option.id === value)?.label || String(value || '');
const optionColor = (field: BaseField | undefined, value: unknown) => field?.options?.find(option => option.id === value)?.color || '#64748b';

export default function CRMWorkspace({
  bases, members, activeWorkspaceId, isOffline, onAddBase, onUpdateBase, onAddSyncLog, triggerToast
}: CRMWorkspaceProps) {
  const [view, setView] = useState<CRMView>('overview');
  const [query, setQuery] = useState('');
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', value: '', stage: '', followUp: '' });

  const crmBase = bases.find(base =>
    normalize(`${base.name} ${base.description || ''}`).includes('crm') ||
    base.tables.some(table => table.fields.some(field => normalize(field.name).includes('deal value')))
  );
  const opportunities = crmBase?.tables.find(table => findField(table, 'Stage') && findField(table, 'Deal Value'))
    || crmBase?.tables.find(table => normalize(table.name).includes('contact'))
    || crmBase?.tables[0];
  const companies = crmBase?.tables.find(table => normalize(table.name).includes('compan'));
  const activities = crmBase?.tables.find(table => normalize(table.name).includes('activit'));

  const fields = useMemo(() => ({
    name: findField(opportunities, 'Contact Name', 'Name'),
    company: findField(opportunities, 'Company'),
    email: findField(opportunities, 'Email'),
    phone: findField(opportunities, 'Phone'),
    stage: findField(opportunities, 'Stage', 'Status'),
    value: findField(opportunities, 'Deal Value', 'Value'),
    probability: findField(opportunities, 'Probability'),
    owner: findField(opportunities, 'Owner'),
    source: findField(opportunities, 'Source'),
    followUp: findField(opportunities, 'Follow-up', 'Follow up'),
    notes: findField(opportunities, 'Notes'),
  }), [opportunities]);

  const records = opportunities?.records || [];
  const stages = fields.stage?.options || [];
  const stageLabel = (record: BaseRecord) => displayOption(fields.stage, valueOf(record, fields.stage));
  const activeDeals = records.filter(record => !['won', 'lost'].includes(normalize(stageLabel(record))));
  const wonDeals = records.filter(record => normalize(stageLabel(record)) === 'won');
  const pipelineValue = activeDeals.reduce((sum, record) => sum + Number(valueOf(record, fields.value) || 0), 0);
  const wonValue = wonDeals.reduce((sum, record) => sum + Number(valueOf(record, fields.value) || 0), 0);
  const weightedValue = activeDeals.reduce((sum, record) => {
    const probability = Number(valueOf(record, fields.probability) || 30);
    return sum + Number(valueOf(record, fields.value) || 0) * probability / 100;
  }, 0);
  const nowKey = new Date().toISOString().split('T')[0];
  const overdueFollowUps = activeDeals.filter(record => {
    const date = String(valueOf(record, fields.followUp) || '');
    return date && date < nowKey;
  });
  const conversion = records.length ? Math.round((wonDeals.length / records.length) * 100) : 0;

  const filteredRecords = records.filter(record => {
    const text = Object.values(record.values).map(String).join(' ');
    return normalize(text).includes(normalize(query));
  });
  const selectedRecord = records.find(record => record.id === selectedRecordId);

  const updateTable = (table: BaseTable, nextRecords: BaseRecord[]) => {
    if (!crmBase) return;
    onUpdateBase({
      ...crmBase,
      tables: crmBase.tables.map(item => item.id === table.id ? { ...item, records: nextRecords } : item),
      updatedAt: new Date().toISOString(),
    });
  };

  const createCRM = () => {
    const base = { ...createBaseFromTemplate('crm'), workspaceId: activeWorkspaceId };
    onAddBase(base);
    onAddSyncLog('Đã khởi tạo CRM Workspace');
    triggerToast?.('success', 'CRM đã sẵn sàng', 'Pipeline, khách hàng và lịch follow-up đã được tạo.');
  };

  const upgradeCRM = () => {
    if (!crmBase) return;
    const completeTemplate = createBaseFromTemplate('crm');
    const existingKinds = new Set(crmBase.tables.map(table => normalize(table.name)));
    const missingTables = completeTemplate.tables.filter(table =>
      !existingKinds.has(normalize(table.name)) &&
      (normalize(table.name).includes('compan') || normalize(table.name).includes('activit'))
    );
    if (!missingTables.length) return;
    onUpdateBase({ ...crmBase, tables: [...crmBase.tables, ...missingTables], updatedAt: new Date().toISOString() });
    onAddSyncLog('CRM: nâng cấp cấu trúc Companies và Activities');
    triggerToast?.('success', 'CRM đã được nâng cấp', 'Đã bổ sung quản lý doanh nghiệp và hoạt động chăm sóc.');
  };

  const moveDeal = (recordId: string, stageId: string) => {
    if (!opportunities || !fields.stage) return;
    updateTable(opportunities, records.map(record => record.id === recordId ? {
      ...record,
      values: { ...record.values, [fields.stage!.id]: stageId },
      updatedAt: new Date().toISOString(),
    } : record));
    onAddSyncLog(`CRM: cập nhật giai đoạn cơ hội thành ${displayOption(fields.stage, stageId)}`);
  };

  const addDeal = (event: React.FormEvent) => {
    event.preventDefault();
    if (!opportunities || !fields.name || !form.name.trim()) return;
    const values: Record<string, unknown> = { [fields.name.id]: form.name.trim() };
    if (fields.company) values[fields.company.id] = form.company.trim();
    if (fields.email) values[fields.email.id] = form.email.trim();
    if (fields.phone) values[fields.phone.id] = form.phone.trim();
    if (fields.value) values[fields.value.id] = Number(form.value || 0);
    if (fields.stage) values[fields.stage.id] = form.stage || stages[0]?.id;
    if (fields.followUp) values[fields.followUp.id] = form.followUp;
    if (fields.probability) values[fields.probability.id] = 20;
    const timestamp = new Date().toISOString();
    updateTable(opportunities, [...records, { id: `crm-${Date.now()}`, values, createdAt: timestamp, updatedAt: timestamp }]);
    setForm({ name: '', company: '', email: '', phone: '', value: '', stage: '', followUp: '' });
    setShowNewDeal(false);
    onAddSyncLog(`CRM: thêm cơ hội ${form.name.trim()}`);
    triggerToast?.('success', 'Đã thêm cơ hội', `${form.name.trim()} đã được đưa vào pipeline.`);
  };

  const toggleActivity = (record: BaseRecord) => {
    if (!activities) return;
    const completedField = findField(activities, 'Completed');
    if (!completedField) return;
    updateTable(activities, activities.records.map(item => item.id === record.id ? {
      ...item, values: { ...item.values, [completedField.id]: !item.values[completedField.id] }, updatedAt: new Date().toISOString()
    } : item));
  };

  if (!crmBase || !opportunities) {
    return <div className="flex min-h-[70vh] items-center justify-center">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-indigo-200/70 bg-white p-8 text-center shadow-xl shadow-indigo-500/10 dark:border-indigo-900/50 dark:bg-slate-900 md:p-12">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg"><Handshake className="h-8 w-8" /></div><p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Avaxa CRM</p><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">Xây dựng quan hệ. Chốt giao dịch.</h2><p className="mx-auto mt-3 max-w-lg text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">Khởi tạo CRM đầy đủ gồm pipeline, cơ hội, doanh nghiệp, hoạt động chăm sóc và báo cáo doanh thu — đồng bộ cùng workspace của bạn.</p><button type="button" onClick={createCRM} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-700"><Sparkles className="h-4 w-4" /> Khởi tạo CRM Workspace</button>{isOffline && <p className="mt-3 text-[10px] font-semibold text-amber-600">Đang ngoại tuyến: CRM sẽ lưu cục bộ và đồng bộ khi có mạng.</p>}</div>
      </div>
    </div>;
  }

  const tabs = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'pipeline', label: 'Pipeline', icon: BriefcaseBusiness },
    { id: 'contacts', label: 'Khách hàng', icon: UsersRound },
    { id: 'activities', label: 'Hoạt động', icon: Activity },
    { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
  ] as const;

  return <div className="space-y-5">
    <section className="flex flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md"><Handshake className="h-5 w-5" /></div><div><div className="flex items-center gap-2"><h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">CRM Workspace</h2><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[8px] font-black uppercase text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">Đã đồng bộ</span></div><p className="mt-0.5 text-[10px] font-semibold text-slate-400">Pipeline · Contacts · Activities · Revenue intelligence</p></div></div>
      <div className="flex flex-wrap items-center gap-2">{(!companies || !activities) && <button type="button" onClick={upgradeCRM} className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-[10px] font-black text-violet-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-400"><Sparkles className="h-3.5 w-3.5" /> Nâng cấp dữ liệu CRM</button>}<div className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm khách hàng, công ty..." className="w-56 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-semibold outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white" /></div><button type="button" onClick={() => setShowNewDeal(true)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-md hover:bg-indigo-700"><Plus className="h-4 w-4" /> Thêm cơ hội</button></div>
    </section>

    <nav className="flex overflow-x-auto rounded-2xl border border-slate-200/70 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">{tabs.map(tab => <button key={tab.id} type="button" onClick={() => setView(tab.id)} className={`flex min-w-32 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition ${view === tab.id ? 'bg-indigo-50 text-indigo-700 shadow-sm dark:bg-indigo-950/40 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><tab.icon className="h-4 w-4" /> {tab.label}</button>)}</nav>

    {view === 'overview' && <>
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[
        { label: 'Giá trị pipeline', value: money.format(pipelineValue), note: `${activeDeals.length} cơ hội đang mở`, icon: CircleDollarSign, style: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' },
        { label: 'Doanh thu đã chốt', value: money.format(wonValue), note: `${wonDeals.length} giao dịch thắng`, icon: CheckCircle2, style: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' },
        { label: 'Dự báo có trọng số', value: money.format(weightedValue), note: 'Theo xác suất chốt', icon: TrendingUp, style: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400' },
        { label: 'Cần follow-up', value: overdueFollowUps.length, note: 'Đã quá ngày chăm sóc', icon: CalendarClock, style: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' },
      ].map(stat => <div key={stat.label} className="rounded-2xl border border-slate-200/70 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{stat.label}</p><p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{stat.value}</p></div><div className={`rounded-xl p-2.5 ${stat.style}`}><stat.icon className="h-5 w-5" /></div></div><p className="mt-2 text-[9px] font-semibold text-slate-400">{stat.note}</p></div>)}</section>
      <section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]"><div className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-sm font-black text-slate-900 dark:text-white">Pipeline theo giai đoạn</h3><p className="mt-1 text-[10px] text-slate-400">Giá trị và số lượng cơ hội hiện tại</p></div><button type="button" onClick={() => setView('pipeline')} className="flex items-center gap-1 text-[10px] font-black text-indigo-600">Mở pipeline <ArrowRight className="h-3 w-3" /></button></div><div className="space-y-4">{stages.filter(stage => !['lost'].includes(normalize(stage.label))).map(stage => { const stageRecords = records.filter(record => valueOf(record, fields.stage) === stage.id); const amount = stageRecords.reduce((sum, record) => sum + Number(valueOf(record, fields.value) || 0), 0); const percent = pipelineValue ? Math.round(amount / pipelineValue * 100) : 0; return <div key={stage.id}><div className="mb-1.5 flex items-center justify-between text-[10px] font-bold"><span className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />{stage.label} <span className="text-slate-400">({stageRecords.length})</span></span><span className="text-slate-500">{money.format(amount)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full" style={{ width: `${Math.max(stageRecords.length ? 3 : 0, percent)}%`, backgroundColor: stage.color }} /></div></div>})}</div></div>
      <div className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><div><h3 className="text-sm font-black text-slate-900 dark:text-white">Việc cần làm</h3><p className="mt-1 text-[10px] text-slate-400">Follow-up ưu tiên</p></div><span className="rounded-full bg-rose-50 px-2 py-1 text-[9px] font-black text-rose-600 dark:bg-rose-950/40">{overdueFollowUps.length} quá hạn</span></div><div className="mt-4 space-y-2">{activeDeals.sort((a,b) => String(valueOf(a, fields.followUp)||'9999').localeCompare(String(valueOf(b, fields.followUp)||'9999'))).slice(0,5).map(record => <button key={record.id} onClick={() => setSelectedRecordId(record.id)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left dark:border-slate-800"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-black text-indigo-600 dark:bg-indigo-950/40">{String(valueOf(record, fields.name)||'?').charAt(0)}</div><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-black text-slate-700 dark:text-slate-200">{String(valueOf(record, fields.name)||'Chưa đặt tên')}</p><p className="mt-0.5 truncate text-[9px] text-slate-400">{String(valueOf(record, fields.company)||'')} · {String(valueOf(record, fields.followUp)||'Chưa có lịch')}</p></div><Phone className="h-3.5 w-3.5 text-slate-300" /></button>)}</div></div></section>
    </>}

    {view === 'pipeline' && <section className="overflow-x-auto pb-3"><div className="flex min-w-max gap-3">{stages.map(stage => { const stageRecords = filteredRecords.filter(record => valueOf(record, fields.stage) === stage.id); return <div key={stage.id} className="w-72 rounded-2xl bg-slate-100/70 p-2.5 dark:bg-slate-900"><div className="mb-2 flex items-center justify-between px-1"><span className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-200"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />{stage.label}</span><span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-black text-slate-500 dark:bg-slate-800">{stageRecords.length}</span></div><div className="space-y-2">{stageRecords.map(record => <div key={record.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950"><button type="button" onClick={() => setSelectedRecordId(record.id)} className="w-full text-left"><p className="text-xs font-black text-slate-800 dark:text-white">{String(valueOf(record, fields.name)||'Chưa đặt tên')}</p><p className="mt-1 text-[9px] font-semibold text-slate-400">{String(valueOf(record, fields.company)||'Khách hàng cá nhân')}</p><p className="mt-3 text-sm font-black text-slate-900 dark:text-slate-100">{money.format(Number(valueOf(record, fields.value)||0))}</p></button><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800"><span className="text-[9px] font-semibold text-slate-400">{String(valueOf(record, fields.followUp)||'Chưa follow-up')}</span><select aria-label="Chuyển giai đoạn" value={String(valueOf(record, fields.stage)||'')} onChange={event => moveDeal(record.id, event.target.value)} className="max-w-24 rounded-lg bg-slate-50 px-1.5 py-1 text-[8px] font-bold text-slate-500 outline-none dark:bg-slate-800">{stages.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div></div>)}</div></div>})}</div></section>}

    {view === 'contacts' && <section className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h3 className="text-sm font-black text-slate-900 dark:text-white">Khách hàng & Cơ hội</h3><p className="mt-1 text-[10px] text-slate-400">{filteredRecords.length} hồ sơ trong CRM</p></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead><tr className="bg-slate-50 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:bg-slate-950/40"><th className="px-5 py-3">Khách hàng</th><th className="px-4 py-3">Công ty</th><th className="px-4 py-3">Liên hệ</th><th className="px-4 py-3">Giai đoạn</th><th className="px-4 py-3">Giá trị</th><th className="px-4 py-3">Follow-up</th></tr></thead><tbody>{filteredRecords.map(record => <tr key={record.id} onClick={() => setSelectedRecordId(record.id)} className="cursor-pointer border-t border-slate-100 text-xs hover:bg-indigo-50/30 dark:border-slate-800 dark:hover:bg-indigo-950/10"><td className="px-5 py-3"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 font-black text-indigo-600 dark:bg-indigo-950/40">{String(valueOf(record, fields.name)||'?').charAt(0)}</div><span className="font-black text-slate-800 dark:text-slate-100">{String(valueOf(record, fields.name)||'—')}</span></div></td><td className="px-4 py-3 font-semibold text-slate-500">{String(valueOf(record, fields.company)||'—')}</td><td className="px-4 py-3"><p className="font-semibold text-slate-600 dark:text-slate-300">{String(valueOf(record, fields.email)||'—')}</p><p className="mt-0.5 text-[9px] text-slate-400">{String(valueOf(record, fields.phone)||'')}</p></td><td className="px-4 py-3"><span className="rounded-full px-2 py-1 text-[9px] font-black text-white" style={{ backgroundColor: optionColor(fields.stage, valueOf(record, fields.stage)) }}>{stageLabel(record)||'—'}</span></td><td className="px-4 py-3 font-black text-slate-800 dark:text-slate-100">{money.format(Number(valueOf(record, fields.value)||0))}</td><td className="px-4 py-3 font-semibold text-slate-500">{String(valueOf(record, fields.followUp)||'—')}</td></tr>)}</tbody></table></div></section>}

    {view === 'activities' && <ActivitiesPanel activities={activities} opportunities={opportunities} fields={fields} onToggle={toggleActivity} onSelect={setSelectedRecordId} />}
    {view === 'reports' && <ReportsPanel records={records} fields={fields} stages={stages} conversion={conversion} companiesCount={companies?.records.length || 0} />}

    {showNewDeal && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><form onSubmit={addDeal} className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between"><div><h3 className="text-lg font-black text-slate-900 dark:text-white">Thêm cơ hội mới</h3><p className="mt-1 text-[10px] text-slate-400">Tạo khách hàng và đưa ngay vào pipeline bán hàng.</p></div><button type="button" onClick={() => setShowNewDeal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{[
      { key: 'name', label: 'Tên khách hàng *', type: 'text', placeholder: 'Nguyễn Văn A' }, { key: 'company', label: 'Công ty', type: 'text', placeholder: 'Acme Inc.' }, { key: 'email', label: 'Email', type: 'email', placeholder: 'name@company.com' }, { key: 'phone', label: 'Điện thoại', type: 'tel', placeholder: '090...' }, { key: 'value', label: 'Giá trị cơ hội', type: 'number', placeholder: '100000000' }, { key: 'followUp', label: 'Ngày follow-up', type: 'date', placeholder: '' }
    ].map(input => <label key={input.key} className="space-y-1.5"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{input.label}</span><input required={input.key === 'name'} type={input.type} value={form[input.key as keyof typeof form]} onChange={event => setForm(prev => ({ ...prev, [input.key]: event.target.value }))} placeholder={input.placeholder} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white" /></label>)}<label className="space-y-1.5 sm:col-span-2"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Giai đoạn</span><select value={form.stage} onChange={event => setForm(prev => ({ ...prev, stage: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950 dark:text-white"><option value="">Giai đoạn đầu tiên</option>{stages.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowNewDeal(false)} className="rounded-xl px-4 py-2.5 text-xs font-black text-slate-500">Hủy</button><button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white">Tạo cơ hội</button></div></form></div>}
    {selectedRecord && <ContactDrawer record={selectedRecord} fields={fields} stageLabel={stageLabel(selectedRecord)} onClose={() => setSelectedRecordId(null)} />}
  </div>;
}

function ActivitiesPanel({ activities, opportunities, fields, onToggle, onSelect }: { activities?: BaseTable; opportunities: BaseTable; fields: Record<string, BaseField | undefined>; onToggle: (record: BaseRecord) => void; onSelect: (id: string) => void }) {
  const title = findField(activities, 'Activity'); const type = findField(activities, 'Type'); const due = findField(activities, 'Due Date'); const completed = findField(activities, 'Completed');
  const activityRecords = activities?.records || [];
  return <section className="grid gap-5 xl:grid-cols-[1fr_0.45fr]"><div className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div><h3 className="text-sm font-black text-slate-900 dark:text-white">Lịch hoạt động bán hàng</h3><p className="mt-1 text-[10px] text-slate-400">Cuộc gọi, email, meeting và nhiệm vụ follow-up</p></div><div className="mt-4 space-y-2">{activityRecords.map(record => { const done = Boolean(valueOf(record, completed)); return <button key={record.id} type="button" onClick={() => onToggle(record)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-3 text-left dark:border-slate-800"><span className={`flex h-7 w-7 items-center justify-center rounded-lg ${done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>{done ? <Check className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><p className={`truncate text-xs font-black ${done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{String(valueOf(record,title)||'Hoạt động')}</p><p className="mt-0.5 text-[9px] text-slate-400">{displayOption(type,valueOf(record,type))} · {String(valueOf(record,due)||'Chưa có lịch')}</p></div></button>})}{!activityRecords.length && <p className="py-12 text-center text-xs text-slate-400">CRM cũ chưa có bảng Activities. Các follow-up vẫn hiển thị bên phải.</p>}</div></div><div className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h3 className="text-sm font-black text-slate-900 dark:text-white">Follow-up cơ hội</h3><div className="mt-4 space-y-2">{opportunities.records.filter(record => valueOf(record,fields.followUp)).sort((a,b) => String(valueOf(a,fields.followUp)).localeCompare(String(valueOf(b,fields.followUp)))).slice(0,8).map(record => <button key={record.id} onClick={() => onSelect(record.id)} className="w-full rounded-xl bg-slate-50 p-3 text-left dark:bg-slate-950/50"><p className="truncate text-[11px] font-black text-slate-700 dark:text-slate-200">{String(valueOf(record,fields.name)||'Khách hàng')}</p><p className="mt-1 text-[9px] font-semibold text-indigo-500">{String(valueOf(record,fields.followUp))}</p></button>)}</div></div></section>;
}

function ReportsPanel({ records, fields, stages, conversion, companiesCount }: { records: BaseRecord[]; fields: Record<string, BaseField | undefined>; stages: NonNullable<BaseField['options']>; conversion: number; companiesCount: number }) {
  const sources = fields.source?.options?.map(option => ({ ...option, count: records.filter(record => valueOf(record,fields.source) === option.id).length })) || [];
  return <div className="grid gap-5 xl:grid-cols-2"><section className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h3 className="text-sm font-black text-slate-900 dark:text-white">Phễu chuyển đổi</h3><p className="mt-1 text-[10px] text-slate-400">Tỷ lệ qua từng giai đoạn pipeline</p><div className="mt-5 space-y-3">{stages.map((stage,index) => { const count = records.filter(record => valueOf(record,fields.stage) === stage.id).length; const width = records.length ? Math.max(8,count/records.length*100) : 0; return <div key={stage.id} className="flex items-center gap-3"><span className="w-20 truncate text-[10px] font-bold text-slate-500">{stage.label}</span><div className="h-8 flex-1 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800"><div className="flex h-full items-center rounded-lg px-2 text-[9px] font-black text-white" style={{ width: `${width}%`, backgroundColor: stage.color }}>{count}</div></div></div>})}</div></section><section className="space-y-5"><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><Target className="h-5 w-5 text-emerald-500" /><p className="mt-4 text-3xl font-black text-slate-900 dark:text-white">{conversion}%</p><p className="mt-1 text-[10px] font-bold text-slate-400">Tỷ lệ thắng tổng thể</p></div><div className="rounded-2xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><Building2 className="h-5 w-5 text-indigo-500" /><p className="mt-4 text-3xl font-black text-slate-900 dark:text-white">{companiesCount}</p><p className="mt-1 text-[10px] font-bold text-slate-400">Doanh nghiệp quản lý</p></div></div><div className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h3 className="text-sm font-black text-slate-900 dark:text-white">Nguồn cơ hội</h3><div className="mt-4 grid grid-cols-2 gap-2">{sources.map(source => <div key={source.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50"><span className="h-2 w-2 rounded-full inline-block" style={{backgroundColor:source.color}} /> <span className="ml-1 text-[10px] font-bold text-slate-500">{source.label}</span><p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{source.count}</p></div>)}</div></div></section></div>;
}

function ContactDrawer({ record, fields, stageLabel, onClose }: { record: BaseRecord; fields: Record<string, BaseField | undefined>; stageLabel: string; onClose: () => void }) {
  return <><button aria-label="Đóng hồ sơ" onClick={onClose} className="fixed inset-0 z-[90] bg-slate-950/30 backdrop-blur-[2px]" /><aside className="fixed inset-y-0 right-0 z-[95] w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-black text-indigo-600 dark:bg-indigo-950/40">{String(valueOf(record,fields.name)||'?').charAt(0)}</div><div><h3 className="text-lg font-black text-slate-900 dark:text-white">{String(valueOf(record,fields.name)||'Khách hàng')}</h3><p className="mt-0.5 text-[10px] font-semibold text-slate-400">{String(valueOf(record,fields.company)||'Khách hàng cá nhân')}</p></div></div><button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button></div><div className="mt-6 flex gap-2"><a href={`mailto:${String(valueOf(record,fields.email)||'')}`} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-black text-white"><Mail className="h-4 w-4" /> Email</a><a href={`tel:${String(valueOf(record,fields.phone)||'')}`} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-black text-slate-600 dark:border-slate-700 dark:text-slate-300"><Phone className="h-4 w-4" /> Gọi</a></div><div className="mt-6 space-y-3">{[
    ['Giai đoạn',stageLabel],['Giá trị',money.format(Number(valueOf(record,fields.value)||0))],['Xác suất',`${Number(valueOf(record,fields.probability)||0)}%`],['Email',String(valueOf(record,fields.email)||'—')],['Điện thoại',String(valueOf(record,fields.phone)||'—')],['Follow-up',String(valueOf(record,fields.followUp)||'—')],['Nguồn',displayOption(fields.source,valueOf(record,fields.source))||'—']
  ].map(([label,value]) => <div key={label} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950/50"><span className="text-[10px] font-bold text-slate-400">{label}</span><span className="text-right text-xs font-black text-slate-700 dark:text-slate-200">{value}</span></div>)}</div>{valueOf(record,fields.notes) ? <div className="mt-5 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Ghi chú</p><p className="mt-2 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">{String(valueOf(record,fields.notes))}</p></div> : null}</aside></>;
}
