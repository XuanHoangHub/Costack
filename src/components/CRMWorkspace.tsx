"use client";

import React, { useMemo, useState, useRef } from 'react';
import {
  Activity, ArrowRight, BarChart3, BriefcaseBusiness, Building2, CalendarClock,
  Check, CheckCircle2, ChevronDown, CircleDollarSign, Clock3, Download, FileText,
  Filter, Handshake, LayoutDashboard, Mail, MessageSquare, MoreHorizontal, Phone,
  Plus, Printer, RefreshCw, Search, Send, Sparkles, Star, Target, Trash2, TrendingUp,
  Upload, UserRound, UsersRound, X, Zap
} from 'lucide-react';
import { BaseApp, BaseField, BaseRecord, BaseTable, User } from '@/types';
import { createBaseFromTemplate } from '@/lib/baseTemplates';
import SignedImage from './SignedImage';
import { useTranslation } from '@/contexts/TranslationContext';
import { callAiApi } from '@/lib/aiClient';
import { supabase } from '@/lib/supabaseClient';

interface CRMWorkspaceProps {
  bases: BaseApp[];
  members: User[];
  activeWorkspaceId: string;
  isOffline: boolean;
  onAddBase: (base: BaseApp) => void;
  onUpdateBase: (base: BaseApp) => void;
  onAddSyncLog: (action: string) => void;
  triggerToast?: (type: 'assignment' | 'deadline' | 'comment' | 'success' | 'info' | 'message' | 'chat_message', title: string, message: string, options?: { taskId?: string; workspaceId?: string; persistInInbox?: boolean; }) => void;
}

type CRMView = 'overview' | 'pipeline' | 'contacts' | 'companies' | 'activities' | 'reports';

interface QuoteItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

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
  const { isVietnamese, locale } = useTranslation();
  const [view, setView] = useState<CRMView>('overview');
  const [query, setQuery] = useState('');
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [quoteRecord, setQuoteRecord] = useState<BaseRecord | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [draggedRecordId, setDraggedRecordId] = useState<string | null>(null);

  // Form states
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', value: '', stage: '', followUp: '', source: 'Website', notes: '' });
  const [companyForm, setCompanyForm] = useState({ name: '', industry: 'Công nghệ', website: '', employees: '25', status: 'acc1' });

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

  const companyFields = useMemo(() => ({
    name: findField(companies, 'Company Name', 'Name'),
    industry: findField(companies, 'Industry'),
    website: findField(companies, 'Website'),
    employees: findField(companies, 'Employees'),
    status: findField(companies, 'Account Status', 'Status'),
  }), [companies]);

  const records = opportunities?.records || [];
  const companyRecords = companies?.records || [];
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
    const targetStage = stages.find(s => s.id === stageId)?.label || stageId;
    onAddSyncLog(`CRM: chuyển cơ hội sang ${targetStage}`);
    triggerToast?.('info', isVietnamese ? 'Cập nhật giai đoạn' : 'Stage updated', `${isVietnamese ? 'Cơ hội đã chuyển sang' : 'Deal moved to'} ${targetStage}`);
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
    if (fields.notes) values[fields.notes.id] = form.notes;
    if (fields.probability) {
      const stageIdx = stages.findIndex(s => s.id === (form.stage || stages[0]?.id));
      values[fields.probability.id] = stageIdx >= 0 ? Math.min(95, 20 + stageIdx * 18) : 25;
    }
    const timestamp = new Date().toISOString();
    updateTable(opportunities, [...records, { id: `crm-${Date.now()}`, values, createdAt: timestamp, updatedAt: timestamp }]);
    setForm({ name: '', company: '', email: '', phone: '', value: '', stage: '', followUp: '', source: 'Website', notes: '' });
    setShowNewDeal(false);
    onAddSyncLog(`CRM: thêm cơ hội ${form.name.trim()}`);
    triggerToast?.('success', 'Đã thêm cơ hội', `${form.name.trim()} đã được đưa vào pipeline.`);
  };

  const addCompany = (event: React.FormEvent) => {
    event.preventDefault();
    if (!companies || !companyFields.name || !companyForm.name.trim()) return;
    const values: Record<string, unknown> = {
      [companyFields.name.id]: companyForm.name.trim(),
    };
    if (companyFields.industry) values[companyFields.industry.id] = companyForm.industry;
    if (companyFields.website) values[companyFields.website.id] = companyForm.website;
    if (companyFields.employees) values[companyFields.employees.id] = Number(companyForm.employees || 10);
    if (companyFields.status) values[companyFields.status.id] = companyForm.status;

    const timestamp = new Date().toISOString();
    updateTable(companies, [...companyRecords, { id: `comp-${Date.now()}`, values, createdAt: timestamp, updatedAt: timestamp }]);
    setCompanyForm({ name: '', industry: 'Công nghệ', website: '', employees: '25', status: 'acc1' });
    setShowNewCompany(false);
    onAddSyncLog(`CRM: thêm doanh nghiệp ${companyForm.name.trim()}`);
    triggerToast?.('success', 'Đã thêm doanh nghiệp', `${companyForm.name.trim()} đã được lưu vào hệ thống.`);
  };

  const toggleActivity = (record: BaseRecord) => {
    if (!activities) return;
    const completedField = findField(activities, 'Completed');
    if (!completedField) return;
    updateTable(activities, activities.records.map(item => item.id === record.id ? {
      ...item, values: { ...item.values, [completedField.id]: !item.values[completedField.id] }, updatedAt: new Date().toISOString()
    } : item));
  };

  const handleAddActivity = (title: string, type: string, dueDate: string, contactName: string) => {
    if (!activities) return;
    const titleField = findField(activities, 'Activity');
    const typeField = findField(activities, 'Type');
    const dueField = findField(activities, 'Due Date');
    const contactField = findField(activities, 'Contact');
    const doneField = findField(activities, 'Completed');
    if (!titleField) return;

    const values: Record<string, unknown> = {
      [titleField.id]: title,
    };
    if (typeField) values[typeField.id] = type;
    if (dueField) values[dueField.id] = dueDate;
    if (contactField) values[contactField.id] = contactName;
    if (doneField) values[doneField.id] = false;

    const timestamp = new Date().toISOString();
    updateTable(activities, [...activities.records, { id: `act-${Date.now()}`, values, createdAt: timestamp, updatedAt: timestamp }]);
    triggerToast?.('success', isVietnamese ? 'Đã thêm hoạt động' : 'Activity Added', title);
  };

  // Export CRM Contacts & Deals to CSV
  const handleExportCSV = () => {
    const headers = ['Tên khách hàng', 'Công ty', 'Email', 'Điện thoại', 'Giai đoạn', 'Giá trị (VNĐ)', 'Xác suất (%)', 'Follow-up', 'Ghi chú'];
    const rows = records.map(r => [
      `"${String(valueOf(r, fields.name) || '').replace(/"/g, '""')}"`,
      `"${String(valueOf(r, fields.company) || '').replace(/"/g, '""')}"`,
      `"${String(valueOf(r, fields.email) || '').replace(/"/g, '""')}"`,
      `"${String(valueOf(r, fields.phone) || '').replace(/"/g, '""')}"`,
      `"${stageLabel(r)}"`,
      Number(valueOf(r, fields.value) || 0),
      Number(valueOf(r, fields.probability) || 0),
      `"${String(valueOf(r, fields.followUp) || '')}"`,
      `"${String(valueOf(r, fields.notes) || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apexa-crm-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    triggerToast?.('success', isVietnamese ? 'Đã xuất dữ liệu CRM' : 'CRM exported', isVietnamese ? 'Tệp CSV khách hàng đã tải về máy.' : 'Leads CSV downloaded.');
  };

  if (!crmBase || !opportunities) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <div className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-indigo-200/70 bg-white p-8 text-center shadow-2xl shadow-blue-500/10 dark:border-indigo-900/50 dark:bg-slate-900 md:p-12">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-xl shadow-blue-500/20">
              <Handshake className="h-8 w-8" />
            </div>
            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Apexa CRM Enterprise</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Quản Trị Bán Hàng & Chăm Sóc Khách Hàng
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              Khởi tạo trọn bộ giải pháp CRM gồm Pipeline kéo thả, Quản lý Doanh nghiệp, Báo giá chuyên nghiệp, Lịch chăm sóc tự động và Báo cáo dự báo doanh thu.
            </p>
            <button 
              type="button" 
              onClick={createCRM} 
              className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-xs font-black text-white shadow-xl shadow-blue-500/25 transition-all hover:scale-105 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" /> Khởi tạo CRM Workspace Ngay
            </button>
            {isOffline && <p className="mt-3 text-[10px] font-semibold text-amber-600">Đang ngoại tuyến: CRM sẽ lưu cục bộ và tự động đồng bộ khi có mạng.</p>}
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: isVietnamese ? 'Tổng quan' : 'Overview', icon: LayoutDashboard },
    { id: 'pipeline', label: isVietnamese ? 'Pipeline Bán hàng' : 'Pipeline', icon: BriefcaseBusiness },
    { id: 'contacts', label: isVietnamese ? 'Khách hàng & Cơ hội' : 'Contacts', icon: UsersRound },
    { id: 'companies', label: isVietnamese ? 'Doanh nghiệp' : 'Companies', icon: Building2 },
    { id: 'activities', label: isVietnamese ? 'Lịch chăm sóc' : 'Activities', icon: Activity },
    { id: 'reports', label: isVietnamese ? 'Báo cáo Doanh thu' : 'Reports', icon: BarChart3 },
  ] as const;

  return (
    <div className="space-y-5 font-sans select-none">
      {/* Top Header Card */}
      <section className="apexa-module-header flex flex-col gap-4 rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 xl:flex-row xl:items-center xl:justify-between shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
            <Handshake className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                {isVietnamese ? 'Apexa CRM Workspace' : 'Apexa CRM Workspace'}
              </h2>
            </div>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
              {isVietnamese ? 'Pipeline Kéo thả · Khách hàng · Báo giá · Chăm sóc AI · Phân tích Doanh thu' : 'Drag & Drop Pipeline · Contacts · Quotes · AI Sales · Revenue Analytics'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(!companies || !activities) && (
            <button 
              type="button" 
              onClick={upgradeCRM} 
              className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-black text-violet-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-400 hover:bg-violet-100 transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" /> {isVietnamese ? 'Nâng cấp Doanh nghiệp & Hoạt động' : 'Upgrade CRM'}
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" />
            <span>{isVietnamese ? 'Xuất CSV' : 'Export'}</span>
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input 
              value={query} 
              onChange={event => setQuery(event.target.value)} 
              placeholder={isVietnamese ? "Tìm khách hàng, cơ hội..." : "Search leads, contacts..."} 
              className="w-56 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all" 
            />
          </div>

          <button 
            type="button" 
            onClick={() => setShowNewDeal(true)} 
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-black text-white shadow-md shadow-blue-500/20 hover:opacity-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> {isVietnamese ? 'Thêm Cơ hội' : 'New Deal'}
          </button>
        </div>
      </section>

      {/* Tabs Bar */}
      <nav className="flex overflow-x-auto rounded-2xl border border-slate-200/70 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            type="button" 
            onClick={() => setView(tab.id)} 
            className={`flex min-w-32 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              view === tab.id 
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-xs font-black' 
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <tab.icon className="h-4 w-4" /> 
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* View: Overview */}
      {view === 'overview' && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
              { label: isVietnamese ? 'Giá trị Pipeline' : 'Pipeline Value', value: money.format(pipelineValue), note: isVietnamese ? `${activeDeals.length} cơ hội đang mở` : `${activeDeals.length} open deals`, icon: CircleDollarSign, style: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' },
              { label: isVietnamese ? 'Doanh thu Đã Chốt' : 'Won Revenue', value: money.format(wonValue), note: isVietnamese ? `${wonDeals.length} hợp đồng thành công` : `${wonDeals.length} deals won`, icon: CheckCircle2, style: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' },
              { label: isVietnamese ? 'Dự báo Trọng số' : 'Weighted Forecast', value: money.format(weightedValue), note: isVietnamese ? 'Tính theo xác suất chốt %' : 'Calculated by probability', icon: TrendingUp, style: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400' },
              { label: isVietnamese ? 'Cần Chăm sóc Hôm nay' : 'Follow-up Due', value: overdueFollowUps.length, note: isVietnamese ? 'Đến hạn hoặc quá hạn' : 'Pending touchpoint', icon: CalendarClock, style: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' },
            ].map(stat => (
              <div key={stat.label} className="rounded-3xl border border-slate-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{stat.label}</p>
                    <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white tabular-nums">{stat.value}</p>
                  </div>
                  <div className={`rounded-2xl p-3 ${stat.style}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-[10px] font-bold text-slate-400">{stat.note}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-3xl border border-slate-200/70 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {isVietnamese ? 'Phân bổ Pipeline theo Giai đoạn' : 'Pipeline by Stage'}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">{isVietnamese ? 'Giá trị và số lượng cơ hội đang tiến triển' : 'Active deals & weighted values'}</p>
                </div>
                <button type="button" onClick={() => setView('pipeline')} className="flex items-center gap-1 text-xs font-black text-indigo-600 dark:text-indigo-400 cursor-pointer">
                  {isVietnamese ? 'Mở Pipeline' : 'Open Pipeline'} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-4">
                {stages.filter(stage => !['lost'].includes(normalize(stage.label))).map(stage => {
                  const stageRecords = records.filter(record => valueOf(record, fields.stage) === stage.id);
                  const amount = stageRecords.reduce((sum, record) => sum + Number(valueOf(record, fields.value) || 0), 0);
                  const percent = pipelineValue ? Math.round(amount / pipelineValue * 100) : 0;
                  return (
                    <div key={stage.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                          <span>{stage.label}</span> 
                          <span className="text-slate-400 font-normal">({stageRecords.length} deals)</span>
                        </span>
                        <span className="text-slate-900 dark:text-white font-black tabular-nums">{money.format(amount)}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.max(stageRecords.length ? 4 : 0, percent)}%`, backgroundColor: stage.color }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">{isVietnamese ? 'Follow-up Ưu tiên' : 'Priority Follow-ups'}</h3>
                    <p className="mt-0.5 text-xs text-slate-400">{isVietnamese ? 'Khách hàng cần liên hệ lại' : 'Pending touchpoints'}</p>
                  </div>
                  <span className="rounded-full bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 text-[10px] font-black text-rose-600 dark:text-rose-400 border border-rose-200/60">
                    {overdueFollowUps.length} {isVietnamese ? 'quá hạn' : 'overdue'}
                  </span>
                </div>

                <div className="mt-4 space-y-2.5">
                  {activeDeals
                    .sort((a, b) => String(valueOf(a, fields.followUp) || '9999').localeCompare(String(valueOf(b, fields.followUp) || '9999')))
                    .slice(0, 5)
                    .map(record => (
                      <button 
                        key={record.id} 
                        onClick={() => setSelectedRecordId(record.id)} 
                        className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3 text-left hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer bg-slate-50/40 dark:bg-slate-950/30"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-xs font-black text-white shrink-0 shadow-xs">
                          {String(valueOf(record, fields.name) || '?').charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-black text-slate-800 dark:text-slate-100">
                            {String(valueOf(record, fields.name) || (isVietnamese ? 'Chưa đặt tên' : 'Unnamed'))}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] text-slate-400">
                            {String(valueOf(record, fields.company) || 'Khách hàng cá nhân')} · {String(valueOf(record, fields.followUp) || 'Hôm nay')}
                          </p>
                        </div>
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 tabular-nums shrink-0">
                          {money.format(Number(valueOf(record, fields.value) || 0))}
                        </span>
                      </button>
                    ))}
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setView('activities')} 
                className="mt-4 w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black transition-colors cursor-pointer text-center"
              >
                {isVietnamese ? 'Xem tất cả lịch chăm sóc' : 'View all activities'}
              </button>
            </div>
          </section>
        </>
      )}

      {/* View: Pipeline (Kanban Drag & Drop) */}
      {view === 'pipeline' && (
        <section className="overflow-x-auto pb-4">
          <div className="flex min-w-max gap-4">
            {stages.map(stage => {
              const stageRecords = filteredRecords.filter(record => valueOf(record, fields.stage) === stage.id);
              const isDragOver = dragOverStageId === stage.id;
              const stageTotal = stageRecords.reduce((sum, r) => sum + Number(valueOf(r, fields.value) || 0), 0);

              return (
                <div 
                  key={stage.id} 
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverStageId(stage.id);
                  }}
                  onDragLeave={() => setDragOverStageId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedRecordId) {
                      moveDeal(draggedRecordId, stage.id);
                    }
                    setDragOverStageId(null);
                    setDraggedRecordId(null);
                  }}
                  className={`w-80 rounded-3xl p-3.5 transition-all flex flex-col ${
                    isDragOver 
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-500 scale-[1.01]' 
                      : 'bg-slate-100/70 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60'
                  }`}
                >
                  {/* Column Header */}
                  <div className="mb-3 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full shadow-xs" style={{ backgroundColor: stage.color }} />
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100">{stage.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-slate-400 tabular-nums">
                        {money.format(stageTotal)}
                      </span>
                      <span className="rounded-full bg-white dark:bg-slate-800 px-2 py-0.5 text-[9px] font-black text-slate-600 dark:text-slate-300 shadow-xs">
                        {stageRecords.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards container */}
                  <div className="space-y-3 flex-1 min-h-[300px]">
                    {stageRecords.map(record => {
                      const prob = Number(valueOf(record, fields.probability) || 20);
                      const isHot = prob >= 70;
                      const isWarm = prob >= 40 && prob < 70;

                      return (
                        <div 
                          key={record.id} 
                          draggable
                          onDragStart={(e) => {
                            setDraggedRecordId(record.id);
                            e.dataTransfer.setData('text/plain', record.id);
                          }}
                          onDragEnd={() => {
                            setDraggedRecordId(null);
                            setDragOverStageId(null);
                          }}
                          className={`rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
                            draggedRecordId === record.id ? 'opacity-40 scale-95' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button 
                              type="button" 
                              onClick={() => setSelectedRecordId(record.id)} 
                              className="text-left flex-1 cursor-pointer group"
                            >
                              <p className="text-xs font-black text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {String(valueOf(record, fields.name) || 'Chưa đặt tên')}
                              </p>
                              <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                                {String(valueOf(record, fields.company) || 'Khách hàng cá nhân')}
                              </p>
                            </button>
                            
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 ${
                              isHot ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50' : isWarm ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                            }`}>
                              {isHot ? '🔥 Hot' : isWarm ? '⚡ Warm' : '❄️ Lead'}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                            <span className="text-sm font-black text-slate-900 dark:text-slate-100 tabular-nums">
                              {money.format(Number(valueOf(record, fields.value) || 0))}
                            </span>
                            
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setQuoteRecord(record)}
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                title="Tạo báo giá"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <select 
                                aria-label="Chuyển giai đoạn" 
                                value={String(valueOf(record, fields.stage) || '')} 
                                onChange={event => moveDeal(record.id, event.target.value)} 
                                className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[9px] font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
                              >
                                {stages.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {stageRecords.length === 0 && (
                      <div className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center text-xs font-bold text-slate-400">
                        {isVietnamese ? 'Kéo thả cơ hội vào đây' : 'Drop deals here'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* View: Contacts & Deals Table */}
      {view === 'contacts' && (
        <section className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Danh bạ Khách hàng & Cơ hội</h3>
              <p className="mt-0.5 text-xs text-slate-400">{filteredRecords.length} hồ sơ trong hệ thống</p>
            </div>
            <button 
              type="button" 
              onClick={() => setShowNewDeal(true)} 
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-black text-white hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Thêm khách hàng
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/40 text-[9px] font-black uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3.5">Khách hàng</th>
                  <th className="px-4 py-3.5">Công ty</th>
                  <th className="px-4 py-3.5">Liên hệ</th>
                  <th className="px-4 py-3.5">Giai đoạn</th>
                  <th className="px-4 py-3.5">Giá trị</th>
                  <th className="px-4 py-3.5">Follow-up</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredRecords.map(record => (
                  <tr 
                    key={record.id} 
                    onClick={() => setSelectedRecordId(record.id)} 
                    className="cursor-pointer text-xs hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 font-black text-indigo-600 dark:text-indigo-400">
                          {String(valueOf(record, fields.name) || '?').charAt(0)}
                        </div>
                        <span className="font-black text-slate-800 dark:text-slate-100">{String(valueOf(record, fields.name) || '—')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-500">{String(valueOf(record, fields.company) || '—')}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-600 dark:text-slate-300">{String(valueOf(record, fields.email) || '—')}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{String(valueOf(record, fields.phone) || '')}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-full px-2.5 py-1 text-[9px] font-black text-white" style={{ backgroundColor: optionColor(fields.stage, valueOf(record, fields.stage)) }}>
                        {stageLabel(record) || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-black text-slate-900 dark:text-slate-100 tabular-nums">
                      {money.format(Number(valueOf(record, fields.value) || 0))}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-500">{String(valueOf(record, fields.followUp) || '—')}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuoteRecord(record);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition-colors"
                        title="Tạo báo giá"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* View: Companies / Accounts */}
      {view === 'companies' && (
        <section className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Danh bạ Doanh nghiệp & Tài khoản B2B</h3>
              <p className="mt-0.5 text-xs text-slate-400">{companyRecords.length} doanh nghiệp đối tác</p>
            </div>
            <button 
              type="button" 
              onClick={() => setShowNewCompany(true)} 
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-black text-white hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Thêm doanh nghiệp
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/40 text-[9px] font-black uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3.5">Tên doanh nghiệp</th>
                  <th className="px-4 py-3.5">Ngành nghề</th>
                  <th className="px-4 py-3.5">Quy mô</th>
                  <th className="px-4 py-3.5">Website</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-4 py-3.5">Tổng deal liên kết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {companyRecords.map(company => {
                  const compName = String(valueOf(company, companyFields.name) || '');
                  const linkedDeals = records.filter(r => normalize(String(valueOf(r, fields.company) || '')) === normalize(compName));
                  const totalLinkedValue = linkedDeals.reduce((sum, r) => sum + Number(valueOf(r, fields.value) || 0), 0);

                  return (
                    <tr key={company.id} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 font-black text-indigo-600 dark:text-indigo-400">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <span className="font-black text-slate-800 dark:text-slate-100">{compName || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-600 dark:text-slate-300">{String(valueOf(company, companyFields.industry) || 'Công nghệ')}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-500">{Number(valueOf(company, companyFields.employees) || 20)} nhân sự</td>
                      <td className="px-4 py-3.5">
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{String(valueOf(company, companyFields.website) || '—')}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-full px-2.5 py-1 text-[9px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                          Khách hàng
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-black text-slate-900 dark:text-slate-100 tabular-nums">
                        {money.format(totalLinkedValue)} ({linkedDeals.length} deals)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* View: Activities */}
      {view === 'activities' && (
        <ActivitiesPanel 
          activities={activities} 
          opportunities={opportunities} 
          fields={fields} 
          onToggle={toggleActivity} 
          onSelect={setSelectedRecordId} 
          onAddActivity={handleAddActivity}
        />
      )}

      {/* View: Reports */}
      {view === 'reports' && (
        <ReportsPanel 
          records={records} 
          fields={fields} 
          stages={stages} 
          conversion={conversion} 
          companiesCount={companyRecords.length} 
        />
      )}

      {/* Modal: New Deal */}
      {showNewDeal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setShowNewDeal(false)} />
          <form onSubmit={addDeal} className="relative z-10 max-h-[90dvh] overflow-y-auto w-[min(95vw,576px)] rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Thêm cơ hội bán hàng mới</h3>
                <p className="mt-1 text-xs text-slate-400">Tạo thông tin khách hàng và tự động đưa vào pipeline CRM.</p>
              </div>
              <button type="button" onClick={() => setShowNewDeal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { key: 'name', label: 'Tên khách hàng *', type: 'text', placeholder: 'Nguyễn Văn A' },
                { key: 'company', label: 'Công ty', type: 'text', placeholder: 'Acme Studio' },
                { key: 'email', label: 'Email', type: 'email', placeholder: 'name@company.com' },
                { key: 'phone', label: 'Điện thoại', type: 'tel', placeholder: '0901234567' },
                { key: 'value', label: 'Giá trị cơ hội (VNĐ)', type: 'number', placeholder: '150000000' },
                { key: 'followUp', label: 'Ngày follow-up', type: 'date', placeholder: '' }
              ].map(input => (
                <label key={input.key} className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{input.label}</span>
                  <input 
                    required={input.key === 'name'} 
                    type={input.type} 
                    value={form[input.key as keyof typeof form]} 
                    onChange={event => setForm(prev => ({ ...prev, [input.key]: event.target.value }))} 
                    placeholder={input.placeholder} 
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white" 
                  />
                </label>
              ))}
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Giai đoạn Pipeline</span>
                <select 
                  value={form.stage} 
                  onChange={event => setForm(prev => ({ ...prev, stage: event.target.value }))} 
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">Giai đoạn đầu tiên ({stages[0]?.label})</option>
                  {stages.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <button type="button" onClick={() => setShowNewDeal(false)} className="rounded-xl px-4 py-2.5 text-xs font-black text-slate-500 cursor-pointer hover:bg-slate-100">Hủy</button>
              <button type="submit" className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-black text-white cursor-pointer hover:opacity-95 shadow-md shadow-blue-500/20">Tạo cơ hội</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: New Company */}
      {showNewCompany && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setShowNewCompany(false)} />
          <form onSubmit={addCompany} className="relative z-10 max-h-[90dvh] overflow-y-auto w-[min(95vw,512px)] rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Thêm doanh nghiệp đối tác</h3>
                <p className="mt-1 text-xs text-slate-400">Lưu thông tin công ty để quản trị tập trung khách hàng B2B.</p>
              </div>
              <button type="button" onClick={() => setShowNewCompany(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 space-y-3.5">
              <label className="space-y-1.5 block">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Tên doanh nghiệp *</span>
                <input 
                  required 
                  type="text" 
                  value={companyForm.name} 
                  onChange={e => setCompanyForm(prev => ({ ...prev, name: e.target.value }))} 
                  placeholder="Ví dụ: VNG Corporation, MoMo..." 
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white" 
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5 block">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Ngành nghề</span>
                  <input 
                    type="text" 
                    value={companyForm.industry} 
                    onChange={e => setCompanyForm(prev => ({ ...prev, industry: e.target.value }))} 
                    placeholder="SaaS / Fintech / Retail" 
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" 
                  />
                </label>
                <label className="space-y-1.5 block">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Quy mô nhân sự</span>
                  <input 
                    type="number" 
                    value={companyForm.employees} 
                    onChange={e => setCompanyForm(prev => ({ ...prev, employees: e.target.value }))} 
                    placeholder="50" 
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" 
                  />
                </label>
              </div>
              <label className="space-y-1.5 block">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Website</span>
                <input 
                  type="text" 
                  value={companyForm.website} 
                  onChange={e => setCompanyForm(prev => ({ ...prev, website: e.target.value }))} 
                  placeholder="https://company.vn" 
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" 
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <button type="button" onClick={() => setShowNewCompany(false)} className="rounded-xl px-4 py-2.5 text-xs font-black text-slate-500 cursor-pointer">Hủy</button>
              <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white cursor-pointer hover:bg-indigo-700">Lưu doanh nghiệp</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Quotation Generator */}
      {quoteRecord && (
        <QuotationModal 
          record={quoteRecord} 
          fields={fields} 
          activeWorkspaceId={activeWorkspaceId}
          onClose={() => setQuoteRecord(null)} 
          triggerToast={triggerToast}
        />
      )}

      {/* Drawer: Contact Detail */}
      {selectedRecord && (
        <ContactDrawer 
          record={selectedRecord} 
          fields={fields} 
          stageLabel={stageLabel(selectedRecord)} 
          onClose={() => setSelectedRecordId(null)} 
          onAddActivity={handleAddActivity}
          onOpenQuote={() => {
            const r = selectedRecord;
            setSelectedRecordId(null);
            setQuoteRecord(r);
          }}
          triggerToast={triggerToast}
        />
      )}
    </div>
  );
}

// Subcomponent: Quotation Generator Modal
function QuotationModal({
  record, fields, activeWorkspaceId, onClose, triggerToast
}: {
  record: BaseRecord;
  fields: Record<string, BaseField | undefined>;
  activeWorkspaceId: string;
  onClose: () => void;
  triggerToast?: (type: 'assignment' | 'deadline' | 'comment' | 'success' | 'info' | 'message' | 'chat_message', title: string, message: string) => void;
}) {
  const clientName = String(valueOf(record, fields.name) || 'Khách hàng');
  const companyName = String(valueOf(record, fields.company) || 'Doanh nghiệp đối tác');
  const dealValue = Number(valueOf(record, fields.value) || 50000000);

  const [quoteNumber] = useState(() => `BG-${Math.floor(10000 + Math.random() * 90000)}`);
  const [items, setItems] = useState<QuoteItem[]>([
    { id: '1', name: 'Gói giải pháp Apexa Enterprise Platform (12 tháng)', quantity: 1, unitPrice: dealValue * 0.8, discount: 0 },
    { id: '2', name: 'Dịch vụ Onboarding & Đào tạo quy trình chuyển đổi số', quantity: 1, unitPrice: dealValue * 0.2, discount: 0 },
  ]);
  const [vatPercent, setVatPercent] = useState(10);

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (1 - item.discount / 100)), 0);
  const vatAmount = subtotal * (vatPercent / 100);
  const total = subtotal + vatAmount;

  const handlePrint = () => {
    window.print();
  };

  const handlePushToFinance = async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError || new Error('Phiên đăng nhập đã hết hạn');
      const newInvoice = {
        workspace_id: activeWorkspaceId,
        code: `HD-${Date.now().toString().slice(-9)}`,
        invoice_type: 'out',
        partner_name: `${clientName} (${companyName})`,
        tax_code: '',
        subtotal,
        vat_rate: vatPercent,
        vat_amount: vatAmount,
        total,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0],
        status: 'pending_verification',
        signed: false,
        items: items.map(i => ({ description: i.name, quantity: i.quantity, unitPrice: i.unitPrice, amount: i.quantity * i.unitPrice })),
        created_by: authData.user.id,
      };
      const { error: insertError } = await supabase.from('finance_invoices').insert(newInvoice);
      if (insertError) throw insertError;
      triggerToast?.('success', 'Đã chuyển thành Hóa đơn Tài chính', `Hóa đơn ${newInvoice.code} đã được tạo trong FinanceHub.`);
      onClose();
    } catch (err) {
      console.error(err);
      triggerToast?.('info', 'Chưa thể tạo hóa đơn Tài chính', err instanceof Error ? err.message : 'Vui lòng thử lại.');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />
      <div className="relative z-10 max-h-[90dvh] overflow-y-auto w-[min(95vw,768px)] rounded-3xl border border-slate-200 bg-white p-4 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900 custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200/80 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg font-black text-xl">
              A
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">BẢNG BÁO GIÁ DỊCH VỤ</h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Số: {quoteNumber} · Ngày: {new Date().toLocaleDateString('vi-VN')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> In báo giá
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Customer & Provider Details */}
        <div className="grid grid-cols-2 gap-6 my-6 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 space-y-1">
            <p className="text-[10px] font-black uppercase text-slate-400">Đơn vị cung cấp</p>
            <p className="font-black text-slate-800 dark:text-slate-100">CÔNG TY CỔ PHẦN CÔNG NGHỆ APEXA</p>
            <p className="text-slate-500">Tầng 12, Tòa nhà Apex Tower, Hà Nội</p>
            <p className="text-slate-500">MST: 0108998822 · Hotline: 1900 8899</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 space-y-1">
            <p className="text-[10px] font-black uppercase text-slate-400">Khách hàng nhận báo giá</p>
            <p className="font-black text-indigo-600 dark:text-indigo-400">{companyName}</p>
            <p className="text-slate-700 dark:text-slate-200 font-bold">Đại diện: {clientName}</p>
            <p className="text-slate-500">Email: {String(valueOf(record, fields.email) || '—')} · SĐT: {String(valueOf(record, fields.phone) || '—')}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-6">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950/60 font-black text-[10px] text-slate-400 uppercase">
              <tr>
                <th className="p-3">Hạng mục dịch vụ / Sản phẩm</th>
                <th className="p-3 text-center">SL</th>
                <th className="p-3 text-right">Đơn giá</th>
                <th className="p-3 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map(item => (
                <tr key={item.id}>
                  <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{item.name}</td>
                  <td className="p-3 text-center font-bold text-slate-600 dark:text-slate-400">{item.quantity}</td>
                  <td className="p-3 text-right font-bold text-slate-600 dark:text-slate-400">{money.format(item.unitPrice)}</td>
                  <td className="p-3 text-right font-black text-slate-900 dark:text-white">{money.format(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-500 font-bold">
              <span>Tạm tính (chưa VAT):</span>
              <span>{money.format(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 font-bold">
              <span>Thuế VAT ({vatPercent}%):</span>
              <span>{money.format(vatAmount)}</span>
            </div>
            <div className="flex justify-between text-base font-black text-indigo-600 dark:text-indigo-400 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>TỔNG CỘNG:</span>
              <span>{money.format(total)}</span>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] text-slate-400 font-medium">Báo giá có giá trị hiệu lực trong vòng 30 ngày kể từ ngày ban hành.</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-black text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer">
              Đóng
            </button>
            <button 
              type="button" 
              onClick={handlePushToFinance} 
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black shadow-lg shadow-blue-500/25 hover:opacity-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Chuyển thành Hóa đơn ERP
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// Subcomponent: Activities Panel
function ActivitiesPanel({
  activities, opportunities, fields, onToggle, onSelect, onAddActivity
}: {
  activities?: BaseTable;
  opportunities: BaseTable;
  fields: Record<string, BaseField | undefined>;
  onToggle: (record: BaseRecord) => void;
  onSelect: (id: string) => void;
  onAddActivity: (title: string, type: string, dueDate: string, contactName: string) => void;
}) {
  const title = findField(activities, 'Activity');
  const type = findField(activities, 'Type');
  const due = findField(activities, 'Due Date');
  const completed = findField(activities, 'Completed');
  const activityRecords = activities?.records || [];

  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('act1');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newContact, setNewContact] = useState('');

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddActivity(newTitle.trim(), newType, newDate, newContact.trim() || 'Khách hàng');
    setNewTitle('');
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_0.45fr]">
      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Lịch Chăm Sóc & Tương Tác Khách Hàng</h3>
            <p className="mt-0.5 text-xs text-slate-400">Cuộc gọi, email tư vấn, lịch hẹn demo và nhiệm vụ chốt deal</p>
          </div>
        </div>

        {/* Quick add activity form */}
        <form onSubmit={handleQuickAdd} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 space-y-3">
          <span className="text-[10px] font-black uppercase text-slate-400">Lên lịch hoạt động mới</span>
          <div className="flex flex-wrap gap-2">
            <input 
              required
              type="text" 
              value={newTitle} 
              onChange={e => setNewTitle(e.target.value)} 
              placeholder="Nội dung hoạt động (ví dụ: Gọi điện chốt hợp đồng...)" 
              className="flex-1 min-w-[220px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white" 
            />
            <select 
              value={newType} 
              onChange={e => setNewType(e.target.value)} 
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            >
              <option value="act1">📞 Cuộc gọi</option>
              <option value="act2">✉️ Email</option>
              <option value="act3">🤝 Lịch họp</option>
              <option value="act4">📌 Nhiệm vụ</option>
            </select>
            <input 
              type="date" 
              value={newDate} 
              onChange={e => setNewDate(e.target.value)} 
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white" 
            />
            <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black shadow-md hover:bg-indigo-700 transition-colors cursor-pointer">
              Thêm
            </button>
          </div>
        </form>

        {/* Activities List */}
        <div className="space-y-2.5 max-h-[450px] overflow-y-auto custom-scrollbar pr-1">
          {activityRecords.map(record => {
            const done = Boolean(valueOf(record, completed));
            return (
              <div 
                key={record.id} 
                className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-all ${
                  done 
                    ? 'border-slate-100 dark:border-slate-800/40 bg-slate-50/40 dark:bg-slate-950/20 opacity-60' 
                    : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs'
                }`}
              >
                <button 
                  type="button" 
                  onClick={() => onToggle(record)} 
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors cursor-pointer ${
                    done ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-xs font-black ${done ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                    {String(valueOf(record, title) || 'Hoạt động')}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {displayOption(type, valueOf(record, type))} · Hạn: {String(valueOf(record, due) || 'Hôm nay')}
                  </p>
                </div>
              </div>
            );
          })}

          {!activityRecords.length && (
            <p className="py-12 text-center text-xs text-slate-400 font-semibold">Chưa có lịch chăm sóc nào được tạo.</p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <h3 className="text-base font-black text-slate-900 dark:text-white">Follow-up Cơ hội</h3>
        <p className="mt-0.5 text-xs text-slate-400">Nhắc việc theo từng khách hàng</p>

        <div className="mt-4 space-y-2.5">
          {opportunities.records
            .filter(record => valueOf(record, fields.followUp))
            .sort((a, b) => String(valueOf(a, fields.followUp)).localeCompare(String(valueOf(b, fields.followUp))))
            .slice(0, 8)
            .map(record => (
              <button 
                key={record.id} 
                onClick={() => onSelect(record.id)} 
                className="w-full rounded-2xl bg-slate-50 dark:bg-slate-950/50 p-3 text-left hover:border-indigo-200 transition-colors cursor-pointer border border-slate-100 dark:border-slate-800/60"
              >
                <p className="truncate text-xs font-black text-slate-700 dark:text-slate-200">
                  {String(valueOf(record, fields.name) || 'Khách hàng')}
                </p>
                <p className="mt-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <CalendarClock className="w-3 h-3" />
                  {String(valueOf(record, fields.followUp))}
                </p>
              </button>
            ))}
        </div>
      </div>
    </section>
  );
}

// Subcomponent: Reports Panel
function ReportsPanel({
  records, fields, stages, conversion, companiesCount
}: {
  records: BaseRecord[];
  fields: Record<string, BaseField | undefined>;
  stages: NonNullable<BaseField['options']>;
  conversion: number;
  companiesCount: number;
}) {
  const sources = fields.source?.options?.map(option => ({
    ...option,
    count: records.filter(record => valueOf(record, fields.source) === option.id).length
  })) || [];

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-3xl border border-slate-200/70 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <h3 className="text-base font-black text-slate-900 dark:text-white">Phễu Chuyển Đổi Bán Hàng (Sales Funnel)</h3>
        <p className="mt-0.5 text-xs text-slate-400">Tỷ lệ chuyển dịch qua từng bước trong quy trình</p>

        <div className="mt-6 space-y-3.5">
          {stages.map(stage => {
            const count = records.filter(record => valueOf(record, fields.stage) === stage.id).length;
            const width = records.length ? Math.max(10, count / records.length * 100) : 0;
            return (
              <div key={stage.id} className="flex items-center gap-3">
                <span className="w-24 truncate text-xs font-bold text-slate-600 dark:text-slate-300">{stage.label}</span>
                <div className="h-9 flex-1 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                  <div 
                    className="flex h-full items-center rounded-lg px-3 text-[10px] font-black text-white transition-all duration-500" 
                    style={{ width: `${width}%`, backgroundColor: stage.color }}
                  >
                    {count} deals
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-5">
        <div className="grid grid-cols-2 gap-3.5">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
            <Target className="h-6 w-6 text-emerald-500" />
            <p className="mt-4 text-3xl font-black text-slate-900 dark:text-white tabular-nums">{conversion}%</p>
            <p className="mt-1 text-xs font-bold text-slate-400">Tỷ lệ Thắng (Win Rate)</p>
          </div>
          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
            <Building2 className="h-6 w-6 text-indigo-500" />
            <p className="mt-4 text-3xl font-black text-slate-900 dark:text-white tabular-nums">{companiesCount}</p>
            <p className="mt-1 text-xs font-bold text-slate-400">Doanh nghiệp Quản lý</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <h3 className="text-base font-black text-slate-900 dark:text-white">Nguồn Khách Hàng (Lead Sources)</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {sources.map(source => (
              <div key={source.id} className="rounded-2xl bg-slate-50 dark:bg-slate-950/50 p-3.5 border border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: source.color }} />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{source.label}</span>
                </div>
                <p className="mt-2 text-xl font-black text-slate-900 dark:text-white tabular-nums">{source.count} leads</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// Subcomponent: Contact Drawer with AI Pitch Generator & Activity Notes
function ContactDrawer({
  record, fields, stageLabel, onClose, onAddActivity, onOpenQuote, triggerToast
}: {
  record: BaseRecord;
  fields: Record<string, BaseField | undefined>;
  stageLabel: string;
  onClose: () => void;
  onAddActivity: (title: string, type: string, dueDate: string, contactName: string) => void;
  onOpenQuote: () => void;
  triggerToast?: (type: 'assignment' | 'deadline' | 'comment' | 'success' | 'info' | 'message' | 'chat_message', title: string, message: string) => void;
}) {
  const clientName = String(valueOf(record, fields.name) || 'Khách hàng');
  const companyName = String(valueOf(record, fields.company) || 'Doanh nghiệp đối tác');
  const dealValue = Number(valueOf(record, fields.value) || 0);
  const prob = Number(valueOf(record, fields.probability) || 20);

  const [aiPitch, setAiPitch] = useState('');
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
  const [noteInput, setNoteInput] = useState('');

  const handleGenerateAiPitch = async () => {
    try {
      setIsGeneratingPitch(true);
      const res = await callAiApi('/api/ai/chat', {
        prompt: `Hãy viết một bức email chào hàng (Sales Pitch Email) cực kỳ chuyên nghiệp, ngắn gọn và thuyết phục gửi cho khách hàng "${clientName}" thuộc công ty "${companyName}". Giá trị dự kiến: ${money.format(dealValue)}. Giọng văn tôn trọng, đề xuất cuộc gọi demo 15 phút. Ngôn ngữ: Tiếng Việt chuẩn.`,
        systemInstruction: 'Bạn là chuyên gia tư vấn bán hàng B2B hàng đầu (Sales Director).'
      });
      if (res.ok) {
        const data = await res.json();
        setAiPitch(data.text || data.reply || '');
        triggerToast?.('success', 'AI đã tạo email chào hàng', 'Bạn có thể sao chép và gửi cho khách hàng.');
      }
    } catch (err) {
      console.error('Failed to generate pitch:', err);
    } finally {
      setIsGeneratingPitch(false);
    }
  };

  const handleAddNoteActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    onAddActivity(noteInput.trim(), 'act4', new Date().toISOString().split('T')[0], clientName);
    setNoteInput('');
  };

  return (
    <>
      <button aria-label="Đóng hồ sơ" onClick={onClose} className="fixed inset-0 z-[90] bg-slate-950/40 backdrop-blur-[2px]" />
      <aside className="fixed inset-y-0 right-0 z-[95] w-[min(95vw,448px)] overflow-y-auto border-l border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 custom-scrollbar space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-black text-white shadow-md">
              {clientName.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">{clientName}</h3>
              <p className="mt-0.5 text-xs font-semibold text-slate-400">{companyName}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <a 
            href={`mailto:${String(valueOf(record, fields.email) || '')}`} 
            className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-black text-white hover:bg-indigo-700 transition-colors"
          >
            <Mail className="h-3.5 w-3.5" /> Email
          </a>
          <a 
            href={`tel:${String(valueOf(record, fields.phone) || '')}`} 
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
          >
            <Phone className="h-3.5 w-3.5" /> Gọi
          </a>
          <button 
            type="button"
            onClick={onOpenQuote}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" /> Báo giá
          </button>
        </div>

        {/* Detail specs */}
        <div className="space-y-2.5">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Thông tin chi tiết</span>
          {[
            ['Giai đoạn', stageLabel],
            ['Giá trị cơ hội', money.format(dealValue)],
            ['Xác suất chốt', `${prob}%`],
            ['Email', String(valueOf(record, fields.email) || '—')],
            ['Điện thoại', String(valueOf(record, fields.phone) || '—')],
            ['Follow-up', String(valueOf(record, fields.followUp) || '—')],
            ['Nguồn tiếp cận', displayOption(fields.source, valueOf(record, fields.source)) || 'Website'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 px-3.5 py-2.5 border border-slate-100 dark:border-slate-800/60">
              <span className="text-xs font-bold text-slate-400">{label}</span>
              <span className="text-right text-xs font-black text-slate-800 dark:text-slate-100">{value}</span>
            </div>
          ))}
        </div>

        {/* AI Sales Pitch Generator */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-blue-50/70 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-black text-indigo-700 dark:text-indigo-300">
              <Sparkles className="w-4 h-4 text-indigo-500" /> Trợ lý AI Bán hàng (AI Pitch)
            </span>
            <button
              type="button"
              onClick={handleGenerateAiPitch}
              disabled={isGeneratingPitch}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPitch ? 'Đang soạn...' : 'Soạn Email AI'}
            </button>
          </div>
          {aiPitch ? (
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {aiPitch}
            </div>
          ) : (
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Nhấn &ldquo;Soạn Email AI&rdquo; để tự động sinh bức thư chào hàng cá nhân hóa cho {clientName}.
            </p>
          )}
        </div>

        {/* Interaction logging */}
        <form onSubmit={handleAddNoteActivity} className="space-y-2">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Ghi nhanh tương tác</span>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={noteInput} 
              onChange={e => setNoteInput(e.target.value)} 
              placeholder="Nội dung cuộc gọi / gặp gỡ..." 
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white" 
            />
            <button type="submit" className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black cursor-pointer">
              Lưu
            </button>
          </div>
        </form>

      </aside>
    </>
  );
}
