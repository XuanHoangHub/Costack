import { BaseApp, BaseField, BaseTable, BaseView } from '../types';

const uid = () => `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const rid = () => `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const vid = () => `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const tid = () => `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const bid = () => `base-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const STATUS_OPTIONS = [
  { id: 's1', label: 'New', color: '#6366f1' },
  { id: 's2', label: 'In Progress', color: '#f59e0b' },
  { id: 's3', label: 'Done', color: '#10b981' },
];

const PRIORITY_OPTIONS = [
  { id: 'p1', label: 'Low', color: '#94a3b8' },
  { id: 'p2', label: 'Medium', color: '#f59e0b' },
  { id: 'p3', label: 'High', color: '#ef4444' },
];

function defaultViews(primaryFieldId: string, statusFieldId?: string, dateFieldId?: string): BaseView[] {
  const views: BaseView[] = [
    {
      id: vid(),
      name: 'Grid',
      type: 'grid',
      config: { visibleFields: undefined },
    },
  ];
  if (statusFieldId) {
    views.push({
      id: vid(),
      name: 'Kanban',
      type: 'kanban',
      config: { kanbanFieldId: statusFieldId, visibleFields: [primaryFieldId, statusFieldId] },
    });
  }
  views.push({
    id: vid(),
    name: 'Gallery',
    type: 'gallery',
    config: { galleryCoverFieldId: primaryFieldId },
  });
  views.push({
    id: vid(),
    name: 'Form',
    type: 'form',
    config: { formTitleFieldId: primaryFieldId },
  });
  if (dateFieldId) {
    views.push({
      id: vid(),
      name: 'Calendar',
      type: 'calendar',
      config: { calendarFieldId: dateFieldId },
    });
  }
  return views;
}

function makeTable(name: string, fields: BaseField[], records: BaseApp['tables'][0]['records'], primaryFieldId: string, statusFieldId?: string, dateFieldId?: string): BaseTable {
  const tableId = tid();
  return {
    id: tableId,
    name,
    fields,
    records,
    primaryFieldId,
    views: defaultViews(primaryFieldId, statusFieldId, dateFieldId),
  };
}

export type BaseTemplateId = 'blank' | 'crm' | 'project' | 'inventory' | 'hr' | 'task_tracker';

export interface BaseTemplate {
  id: BaseTemplateId;
  name: string;
  emoji: string;
  description: string;
  build: () => BaseApp;
}

export const BASE_TEMPLATES: BaseTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Base',
    emoji: '📋',
    description: 'Start from scratch with a single table',
    build: () => {
      const nameFieldId = uid();
      const table = makeTable('Table 1', [
        { id: nameFieldId, name: 'Name', type: 'text', width: 220 },
        { id: uid(), name: 'Notes', type: 'long_text', width: 280 },
      ], [], nameFieldId);
      return {
        id: bid(),
        name: 'Untitled Base',
        emoji: '📋',
        description: '',
        tables: [table],
        activeTableId: table.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
  },
  {
    id: 'crm',
    name: 'CRM',
    emoji: '🤝',
    description: 'Track leads, contacts and sales pipeline',
    build: () => {
      const nameId = uid();
      const statusId = uid();
      const dateId = uid();
      const emailId = uid();
      const phoneId = uid();
      const valueId = uid();
      const table = makeTable('Contacts', [
        { id: nameId, name: 'Contact Name', type: 'text', width: 200 },
        { id: emailId, name: 'Email', type: 'email', width: 180 },
        { id: phoneId, name: 'Phone', type: 'phone', width: 140 },
        { id: statusId, name: 'Stage', type: 'single_select', options: [
          { id: 'st1', label: 'Lead', color: '#6366f1' },
          { id: 'st2', label: 'Qualified', color: '#8b5cf6' },
          { id: 'st3', label: 'Proposal', color: '#f59e0b' },
          { id: 'st4', label: 'Won', color: '#10b981' },
          { id: 'st5', label: 'Lost', color: '#ef4444' },
        ], width: 130 },
        { id: valueId, name: 'Deal Value', type: 'currency', width: 120 },
        { id: dateId, name: 'Follow-up Date', type: 'date', width: 140 },
        { id: uid(), name: 'Notes', type: 'long_text', width: 240 },
      ], [
        { id: rid(), values: { [nameId]: 'Nguyen Van A', [emailId]: 'nguyen@company.vn', [phoneId]: '0901234567', [statusId]: 'st1', [valueId]: 15000000, [dateId]: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0] }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: rid(), values: { [nameId]: 'Tran Thi B', [emailId]: 'tran@startup.io', [statusId]: 'st2', [valueId]: 45000000, [dateId]: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0] }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ], nameId, statusId, dateId);
      return {
        id: bid(),
        name: 'CRM Pipeline',
        emoji: '🤝',
        description: 'Customer relationship management',
        tables: [table],
        activeTableId: table.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
  },
  {
    id: 'project',
    name: 'Project Management',
    emoji: '🚀',
    description: 'Plan sprints, track milestones and deliverables',
    build: () => {
      const nameId = uid();
      const statusId = uid();
      const dateId = uid();
      const priorityId = uid();
      const progressId = uid();
      const table = makeTable('Tasks', [
        { id: nameId, name: 'Task', type: 'text', width: 220 },
        { id: statusId, name: 'Status', type: 'single_select', options: STATUS_OPTIONS, width: 130 },
        { id: priorityId, name: 'Priority', type: 'single_select', options: PRIORITY_OPTIONS, width: 110 },
        { id: dateId, name: 'Due Date', type: 'date', width: 130 },
        { id: progressId, name: 'Progress', type: 'percent', width: 100 },
        { id: uid(), name: 'Assignee', type: 'person', width: 140 },
        { id: uid(), name: 'Description', type: 'long_text', width: 260 },
      ], [
        { id: rid(), values: { [nameId]: 'Design system v2', [statusId]: 's2', [priorityId]: 'p3', [dateId]: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], [progressId]: 60 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: rid(), values: { [nameId]: 'API integration', [statusId]: 's1', [priorityId]: 'p2', [dateId]: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0], [progressId]: 0 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: rid(), values: { [nameId]: 'User testing', [statusId]: 's3', [priorityId]: 'p1', [progressId]: 100 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ], nameId, statusId, dateId);
      return {
        id: bid(),
        name: 'Project Tracker',
        emoji: '🚀',
        description: 'Agile project management',
        tables: [table],
        activeTableId: table.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
  },
  {
    id: 'inventory',
    name: 'Inventory',
    emoji: '📦',
    description: 'Track stock levels, SKUs and suppliers',
    build: () => {
      const nameId = uid();
      const statusId = uid();
      const qtyId = uid();
      const priceId = uid();
      const table = makeTable('Products', [
        { id: nameId, name: 'Product Name', type: 'text', width: 200 },
        { id: uid(), name: 'SKU', type: 'text', width: 120 },
        { id: qtyId, name: 'Quantity', type: 'number', width: 100 },
        { id: priceId, name: 'Unit Price', type: 'currency', width: 120 },
        { id: statusId, name: 'Stock Status', type: 'single_select', options: [
          { id: 'inv1', label: 'In Stock', color: '#10b981' },
          { id: 'inv2', label: 'Low Stock', color: '#f59e0b' },
          { id: 'inv3', label: 'Out of Stock', color: '#ef4444' },
        ], width: 130 },
        { id: uid(), name: 'Supplier', type: 'text', width: 160 },
        { id: uid(), name: 'Location', type: 'text', width: 140 },
      ], [
        { id: rid(), values: { [nameId]: 'Wireless Mouse', [qtyId]: 150, [priceId]: 350000, [statusId]: 'inv1' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: rid(), values: { [nameId]: 'USB-C Hub', [qtyId]: 8, [priceId]: 890000, [statusId]: 'inv2' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ], nameId, statusId);
      return {
        id: bid(),
        name: 'Inventory Tracker',
        emoji: '📦',
        description: 'Warehouse & stock management',
        tables: [table],
        activeTableId: table.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
  },
  {
    id: 'hr',
    name: 'HR & Recruitment',
    emoji: '👥',
    description: 'Manage candidates, interviews and hiring pipeline',
    build: () => {
      const nameId = uid();
      const statusId = uid();
      const dateId = uid();
      const table = makeTable('Candidates', [
        { id: nameId, name: 'Full Name', type: 'text', width: 180 },
        { id: uid(), name: 'Email', type: 'email', width: 180 },
        { id: uid(), name: 'Position', type: 'text', width: 160 },
        { id: statusId, name: 'Stage', type: 'single_select', options: [
          { id: 'hr1', label: 'Applied', color: '#6366f1' },
          { id: 'hr2', label: 'Screening', color: '#8b5cf6' },
          { id: 'hr3', label: 'Interview', color: '#f59e0b' },
          { id: 'hr4', label: 'Offer', color: '#10b981' },
          { id: 'hr5', label: 'Rejected', color: '#ef4444' },
        ], width: 130 },
        { id: dateId, name: 'Interview Date', type: 'date', width: 140 },
        { id: uid(), name: 'Rating', type: 'rating', width: 100 },
        { id: uid(), name: 'Notes', type: 'long_text', width: 240 },
      ], [
        { id: rid(), values: { [nameId]: 'Le Minh C', [statusId]: 'hr3', [dateId]: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0] }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ], nameId, statusId, dateId);
      return {
        id: bid(),
        name: 'Recruitment Pipeline',
        emoji: '👥',
        description: 'Hiring & talent management',
        tables: [table],
        activeTableId: table.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
  },
  {
    id: 'task_tracker',
    name: 'Task Tracker',
    emoji: '✅',
    description: 'Simple task list with status and due dates',
    build: () => {
      const nameId = uid();
      const statusId = uid();
      const dateId = uid();
      const doneId = uid();
      const table = makeTable('Tasks', [
        { id: nameId, name: 'Task', type: 'text', width: 240 },
        { id: doneId, name: 'Done', type: 'checkbox', width: 80 },
        { id: statusId, name: 'Status', type: 'single_select', options: STATUS_OPTIONS, width: 130 },
        { id: dateId, name: 'Due Date', type: 'date', width: 130 },
        { id: uid(), name: 'Owner', type: 'person', width: 140 },
      ], [
        { id: rid(), values: { [nameId]: 'Review quarterly report', [doneId]: false, [statusId]: 's1', [dateId]: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0] }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: rid(), values: { [nameId]: 'Update team wiki', [doneId]: true, [statusId]: 's3' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ], nameId, statusId, dateId);
      return {
        id: bid(),
        name: 'Task Tracker',
        emoji: '✅',
        description: 'Personal & team task tracking',
        tables: [table],
        activeTableId: table.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
  },
];

export function createBaseFromTemplate(templateId: BaseTemplateId): BaseApp {
  const template = BASE_TEMPLATES.find(t => t.id === templateId) || BASE_TEMPLATES[0];
  return template.build();
}

export const BASE_FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  long_text: 'Long text',
  number: 'Number',
  single_select: 'Single select',
  multi_select: 'Multi select',
  date: 'Date',
  checkbox: 'Checkbox',
  person: 'Person',
  url: 'URL',
  email: 'Email',
  phone: 'Phone',
  currency: 'Currency',
  rating: 'Rating',
  percent: 'Percent',
};
