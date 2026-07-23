"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Database, Plus, ArrowLeft, Search, Table2, LayoutGrid, Columns3,
  Image, FileInput, Calendar, Trash2, MoreHorizontal, Copy, X, ChevronDown,
  Filter, Sparkles, Settings2, FolderOpen, Briefcase, Users, LayoutList,
  CheckCircle2, Circle, Clock, ChevronRight, Columns, GanttChart, LayoutDashboard
} from 'lucide-react';
import { BaseApp, BaseField, BaseRecord, BaseTable, BaseView, BaseViewType, User, Space, Task } from '../types';
import { BASE_TEMPLATES, BASE_FIELD_TYPE_LABELS, BaseTemplateId, createBaseFromTemplate } from '../lib/baseTemplates';
import {
  getActiveTable, getActiveView, processRecords, updateBaseTable,
  createDefaultField, createEmptyRecord
} from '../lib/baseUtils';
import BaseGridView from './base/BaseGridView';
import BaseKanbanView from './base/BaseKanbanView';
import BaseGalleryView from './base/BaseGalleryView';
import BaseFormView from './base/BaseFormView';
import BaseCalendarView from './base/BaseCalendarView';
import BaseGanttView from './base/BaseGanttView';
import BaseDashboardView from './base/BaseDashboardView';
import EmojiIconPicker, { renderSpaceIcon } from './EmojiIconPicker';

interface BaseHubProps {
  bases: BaseApp[];
  members: User[];
  isOffline: boolean;
  spaces?: Space[];
  tasks?: Task[];
  onAddBase: (base: BaseApp) => void;
  onUpdateBase: (base: BaseApp) => void;
  onDeleteBase: (id: string) => void;
  onAddSpace?: (space: Space) => void;
  onUpdateSpace?: (space: Space) => void;
  onDeleteSpace?: (id: string) => void;
  onAddSyncLog: (action: string) => void;
  triggerToast?: (type: 'success' | 'info' | 'assignment' | 'deadline' | 'comment' | 'message', title: string, message: string) => void;
}

const VIEW_ICONS: Record<BaseViewType, React.ElementType> = {
  grid: Table2,
  kanban: Columns3,
  gallery: Image,
  form: FileInput,
  calendar: Calendar,
  gantt: GanttChart,
  dashboard: LayoutDashboard,
};

const VIEW_LABELS: Record<BaseViewType, string> = {
  grid: 'Grid',
  kanban: 'Kanban',
  gallery: 'Gallery',
  form: 'Form',
  calendar: 'Calendar',
  gantt: 'Gantt',
  dashboard: 'Dashboard',
};

export default function BaseHub({
  bases, members, isOffline, spaces = [], tasks = [], onAddBase, onUpdateBase, onDeleteBase,
  onAddSpace, onUpdateSpace, onDeleteSpace, onAddSyncLog, triggerToast
}: BaseHubProps) {
  const [activeBaseId, setActiveBaseId] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [showBaseMenu, setShowBaseMenu] = useState(false);
  const [hubSearch, setHubSearch] = useState('');
  const [hubModule, setHubModule] = useState<'bases' | 'spaces'>('bases');
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [showAddSpaceModal, setShowAddSpaceModal] = useState(false);
  const [showAddListModal, setShowAddListModal] = useState(false);
  const [showSpaceMenu, setShowSpaceMenu] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceEmoji, setNewSpaceEmoji] = useState('📦');
  const [newSpaceColor, setNewSpaceColor] = useState('indigo');
  const [newListName, setNewListName] = useState('');

  const activeBase = bases.find(b => b.id === activeBaseId);
  const activeTable = activeBase ? getActiveTable(activeBase) : undefined;
  const activeView = activeTable ? getActiveView(activeTable, activeViewId || undefined) : undefined;

  const filteredBases = useMemo(() => {
    if (!hubSearch.trim()) return bases;
    const q = hubSearch.toLowerCase();
    return bases.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.description?.toLowerCase().includes(q)
    );
  }, [bases, hubSearch]);

  const processedRecords = useMemo(() => {
    if (!activeTable) return [];
    let records = processRecords(activeTable, activeView);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      records = records.filter(r =>
        Object.values(r.values).some(v => String(v ?? '').toLowerCase().includes(q))
      );
    }
    return records;
  }, [activeTable, activeView, searchQuery]);

  const activeSpace = spaces.find(s => s.id === activeSpaceId);
  const spaceLists = activeSpace?.lists || [];
  const filteredSpaces = useMemo(() => {
    if (!hubSearch.trim() || hubModule !== 'spaces') return spaces;
    const q = hubSearch.toLowerCase();
    return spaces.filter(s => s.name.toLowerCase().includes(q));
  }, [spaces, hubSearch, hubModule]);

  const handleCreateFromTemplate = (templateId: BaseTemplateId) => {
    const base = createBaseFromTemplate(templateId);
    onAddBase(base);
    setActiveBaseId(base.id);
    setShowTemplateModal(false);
    onAddSyncLog(`Created new Base: "${base.name}" from template`);
    triggerToast?.('success', 'Base created', `"${base.name}" is ready to use.`);
  };

  const updateTable = useCallback((updater: (table: BaseTable) => BaseTable) => {
    if (!activeBase || !activeTable) return;
    onUpdateBase(updateBaseTable(activeBase, activeTable.id, updater));
  }, [activeBase, activeTable, onUpdateBase]);

  const handleUpdateRecord = (record: BaseRecord) => {
    updateTable(table => ({
      ...table,
      records: table.records.map(r => r.id === record.id ? record : r),
    }));
  };

  const handleAddRecord = (record: BaseRecord) => {
    updateTable(table => ({ ...table, records: [...table.records, record] }));
    onAddSyncLog('Added record to Base table');
  };

  const handleDeleteRecord = (recordId: string) => {
    updateTable(table => ({ ...table, records: table.records.filter(r => r.id !== recordId) }));
  };

  const handleAddSpace = () => {
    if (!newSpaceName.trim() || !onAddSpace) return;
    const name = newSpaceName.trim();
    const space: Space = {
      id: `space-${Date.now()}`,
      name,
      emoji: newSpaceEmoji || '📦',
      themeColor: newSpaceColor,
      workspaceId: '',
      lists: [{ id: `list-${Date.now()}`, name: 'General Tasks' }],
      folders: [],
      whiteboards: [],
      channels: [],
      statuses: [
        { id: 'todo', label: 'To Do', color: '#94a3b8', type: 'todo' },
        { id: 'inprogress', label: 'In Progress', color: '#6366f1', type: 'inprogress' },
        { id: 'review', label: 'Review', color: '#f59e0b', type: 'review' },
        { id: 'completed', label: 'Done', color: '#10b981', type: 'completed' },
      ],
      clickApps: { subtasks: true, priorities: true },
    };
    onAddSpace(space);
    setNewSpaceName('');
    setNewSpaceEmoji('📦');
    setNewSpaceColor('indigo');
    setShowAddSpaceModal(false);
    setActiveSpaceId(space.id);
    onAddSyncLog(`Created new Space: "${name}" from BaseHub`);
    triggerToast?.('success', 'Space created', `"${name}" is ready.`);
  };

  const handleDeleteSpace = (spaceId: string) => {
    if (!onDeleteSpace) return;
    const space = spaces.find(s => s.id === spaceId);
    if (space && confirm(`Delete "${space.name}"?`)) {
      onDeleteSpace(spaceId);
      if (activeSpaceId === spaceId) {
        setActiveSpaceId(null);
        setActiveListId(null);
      }
      onAddSyncLog(`Deleted Space: "${space.name}"`);
    }
  };

  const handleAddListToSpace = (spaceId: string) => {
    if (!newListName.trim() || !onUpdateSpace) return;
    const space = spaces.find(s => s.id === spaceId);
    if (!space) return;
    const newList = { id: `list-${Date.now()}`, name: newListName.trim() };
    onUpdateSpace({
      ...space,
      lists: [...space.lists, newList],
    });
    setNewListName('');
    setShowAddListModal(false);
    onAddSyncLog(`Added list "${newList.name}" to Space "${space.name}"`);
  };

  const handleAddField = (type: BaseField['type'] = 'text') => {
    const field = createDefaultField(type);
    field.name = `Field ${(activeTable?.fields.length || 0) + 1}`;
    updateTable(table => ({ ...table, fields: [...table.fields, field] }));
    setShowFieldModal(false);
    onAddSyncLog(`Added ${type} field to Base table`);
  };

  const handleAddTable = () => {
    if (!activeBase) return;
    const nameFieldId = `f-${Date.now()}`;
    const newTable: BaseTable = {
      id: `t-${Date.now()}`,
      name: `Table ${activeBase.tables.length + 1}`,
      fields: [{ id: nameFieldId, name: 'Name', type: 'text', width: 220 }],
      records: [],
      primaryFieldId: nameFieldId,
      views: [
        { id: `v-${Date.now()}`, name: 'Grid', type: 'grid', config: {} },
        { id: `v-${Date.now() + 1}`, name: 'Gallery', type: 'gallery', config: {} },
        { id: `v-${Date.now() + 2}`, name: 'Form', type: 'form', config: {} },
      ],
    };
    onUpdateBase({
      ...activeBase,
      activeTableId: newTable.id,
      tables: [...activeBase.tables, newTable],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddView = (type: BaseViewType) => {
    if (!activeTable) return;
    const statusField = activeTable.fields.find(f => f.type === 'single_select');
    const dateField = activeTable.fields.find(f => f.type === 'date');
    const newView: BaseView = {
      id: `v-${Date.now()}`,
      name: VIEW_LABELS[type],
      type,
      config: {
        kanbanFieldId: type === 'kanban' ? statusField?.id : undefined,
        calendarFieldId: type === 'calendar' ? dateField?.id : undefined,
        formTitleFieldId: type === 'form' ? activeTable.primaryFieldId : undefined,
        galleryCoverFieldId: type === 'gallery' ? activeTable.primaryFieldId : undefined,
      },
    };
    updateTable(table => ({ ...table, views: [...table.views, newView] }));
    setActiveViewId(newView.id);
  };

  const handleDuplicateBase = () => {
    if (!activeBase) return;
    const copy: BaseApp = {
      ...JSON.parse(JSON.stringify(activeBase)),
      id: `base-${Date.now()}`,
      name: `${activeBase.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onAddBase(copy);
    setShowBaseMenu(false);
    triggerToast?.('success', 'Duplicated', `"${copy.name}" created.`);
  };

  // ─── Hub View (list of bases / spaces) ───
  if (!activeBase && !activeSpace) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
                  style={{ background: 'linear-gradient(135deg, var(--avaxa-gradient-start, #7B61FF), var(--avaxa-gradient-end, #FF3366))' }}>
                  <Database className="w-4.5 h-4.5" />
                </div>
                <h1 className="text-xl font-black font-display text-slate-800 tracking-tight">Avaxa Base</h1>
              </div>
              <p className="text-xs text-slate-500 ml-11">No-code databases + Spaces — structure your work</p>
            </div>
            <div className="flex items-center gap-2">
              {hubModule === 'spaces' ? (
                <button
                  type="button"
                  onClick={() => setShowAddSpaceModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-white shadow-sm hover:shadow-md transition-all cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, var(--avaxa-gradient-start, #7B61FF), var(--avaxa-gradient-end, #FF3366))' }}
                >
                  <Plus className="w-4 h-4" />
                  New Space
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-white shadow-sm hover:shadow-md transition-all cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, var(--avaxa-gradient-start, #7B61FF), var(--avaxa-gradient-end, #FF3366))' }}
                >
                  <Plus className="w-4 h-4" />
                  New Base
                </button>
              )}
            </div>
          </div>

          {/* Module Tabs */}
          <div className="mt-4 flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => { setHubModule('bases'); setHubSearch(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                hubModule === 'bases'
                  ? 'bg-white text-slate-800 shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Bases
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${hubModule === 'bases' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>{bases.length}</span>
            </button>
            <button
              type="button"
              onClick={() => { setHubModule('spaces'); setHubSearch(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                hubModule === 'spaces'
                  ? 'bg-white text-slate-800 shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Spaces
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{spaces.length}</span>
            </button>
          </div>

          {(bases.length > 3 || spaces.length > 3) && (
            <div className="mt-4 relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={hubSearch}
                onChange={e => setHubSearch(e.target.value)}
                placeholder={hubModule === 'bases' ? 'Search bases...' : 'Search spaces...'}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
              />
            </div>
          )}
        </div>

        {/* Cards grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {hubModule === 'bases' ? (
            filteredBases.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                  <Database className="w-8 h-8 text-indigo-400" />
                </div>
                <h2 className="text-lg font-black text-slate-800 mb-2">Build your first Base</h2>
                <p className="text-sm text-slate-500 mb-6">
                  Create flexible databases for CRM, project management, inventory tracking and more — no code required.
                </p>
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black text-white cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, var(--avaxa-gradient-start, #7B61FF), var(--avaxa-gradient-end, #FF3366))' }}
                >
                  <Sparkles className="w-4 h-4" />
                  Choose a template
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredBases.map(base => {
                  const totalRecords = base.tables.reduce((sum, t) => sum + t.records.length, 0);
                  return (
                    <motion.button
                      key={base.id}
                      type="button"
                      whileHover={{ y: -2 }}
                      onClick={() => { setActiveBaseId(base.id); setActiveViewId(null); }}
                      className="text-left bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-2xl">{base.emoji || '📋'}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{base.name}</h3>
                          {base.description && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">{base.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                        <span>{base.tables.length} table{base.tables.length !== 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span>{totalRecords} record{totalRecords !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="mt-3 text-[10px] text-slate-300">
                        Updated {new Date(base.updatedAt).toLocaleDateString('vi-VN')}
                      </div>
                    </motion.button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 flex flex-col items-center justify-center gap-2 min-h-[140px] text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                >
                  <Plus className="w-6 h-6" />
                  <span className="text-xs font-bold">New Base</span>
                </button>
              </div>
            )
          ) : (
            filteredSpaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                  <FolderOpen className="w-8 h-8 text-indigo-400" />
                </div>
                <h2 className="text-lg font-black text-slate-800 mb-2">Create your first Space</h2>
                <p className="text-sm text-slate-500 mb-6">
                  Spaces organize tasks, lists, and teams for your projects.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddSpaceModal(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black text-white cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, var(--avaxa-gradient-start, #7B61FF), var(--avaxa-gradient-end, #FF3366))' }}
                >
                  <Plus className="w-4 h-4" />
                  Create Space
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredSpaces.map(space => {
                  const spaceTasks = tasks.filter(t => t.spaceId === space.id);
                  const totalLists = space.lists.length;
                  return (
                    <motion.button
                      key={space.id}
                      type="button"
                      whileHover={{ y: -2 }}
                      onClick={() => { setActiveSpaceId(space.id); setActiveListId(null); }}
                      className="text-left bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-2xl w-8 h-8 flex items-center justify-center text-indigo-500 shrink-0">
                          {renderSpaceIcon(space.emoji || '📦', "w-6 h-6")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{space.name}</h3>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{space.workspaceId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                        <span>{totalLists} list{totalLists !== 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span>{spaceTasks.length} task{spaceTasks.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="mt-3 text-[10px] text-slate-300">
                        {space.clickApps ? 'ClickApps enabled' : 'Standard'}
                      </div>
                    </motion.button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setShowAddSpaceModal(true)}
                  className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 flex flex-col items-center justify-center gap-2 min-h-[140px] text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
                >
                  <Plus className="w-6 h-6" />
                  <span className="text-xs font-bold">New Space</span>
                </button>
              </div>
            )
          )}
        </div>

        {/* Template picker modal */}
        <AnimatePresence>
          {showTemplateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setShowTemplateModal(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative bg-white dark:bg-[#07080c] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col z-50"
              >
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black text-slate-800 dark:text-slate-100">Choose a template</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Start with a pre-built structure or blank canvas</p>
                  </div>
                  <button type="button" onClick={() => setShowTemplateModal(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
                    <X className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 custom-scrollbar">
                  {BASE_TEMPLATES.map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleCreateFromTemplate(template.id)}
                      className="text-left p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0d0e19] hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all cursor-pointer group shadow-3xs"
                    >
                      <span className="text-2xl">{template.emoji}</span>
                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 mt-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{template.name}</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">{template.description}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── Space Detail View ───
  if (activeSpace) {
    const spaceTasks = tasks.filter(t => t.spaceId === activeSpace.id);
    const listTasks = activeListId ? spaceTasks.filter(t => t.listId === activeListId) : spaceTasks;
    const selectedList = spaceLists.find(l => l.id === activeListId);

    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => { setActiveSpaceId(null); setActiveListId(null); }}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-lg flex items-center justify-center text-indigo-500 shrink-0">
            {renderSpaceIcon(activeSpace.emoji || '📦', "w-5 h-5")}
          </span>
          <h1 className="text-sm font-black text-slate-800 truncate">{activeSpace.name}</h1>
          {isOffline && <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">Offline</span>}

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddListModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New List
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpaceMenu(!showSpaceMenu)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showSpaceMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowSpaceMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-40 bg-white rounded-xl border border-slate-200 shadow-lg py-1 min-w-[160px]">
                    <button type="button" onClick={() => { handleDeleteSpace(activeSpace.id); setShowSpaceMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" /> Delete Space
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Lists sidebar */}
          <div className="hidden md:flex flex-col w-48 shrink-0 border-r border-slate-200/60 bg-slate-50/50 py-3 px-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 mb-2">Lists</span>
            {spaceLists.map(list => {
              const listTaskCount = spaceTasks.filter(t => t.listId === list.id).length;
              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => setActiveListId(list.id)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer mb-0.5 ${
                    activeListId === list.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <LayoutList className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate flex-1 text-left">{list.name}</span>
                  <span className="text-[9px] text-slate-400">{listTaskCount}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowAddListModal(true)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors cursor-pointer mt-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add list
            </button>
          </div>

          {/* Main content - Task list */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Mobile list selector */}
            <div className="md:hidden shrink-0 px-4 py-2 border-b border-slate-100">
              <select
                value={activeListId || ''}
                onChange={e => setActiveListId(e.target.value)}
                className="w-full text-xs font-bold border border-slate-200 rounded-lg px-3 py-2 bg-white"
              >
                {spaceLists.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!activeListId && spaceLists.length > 0 && (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Select a list to view tasks
                </div>
              )}
              {spaceLists.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No lists yet. Create one to get started.
                </div>
              )}
              {activeListId && listTasks.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No tasks in this list yet.
                </div>
              )}
              {activeListId && listTasks.length > 0 && (
                <div className="space-y-2">
                  {listTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200/80 hover:border-indigo-200 transition-colors">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        task.status === 'completed' ? 'bg-emerald-500' :
                        task.status === 'inprogress' ? 'bg-indigo-500' :
                        task.status === 'review' ? 'bg-amber-500' :
                        'bg-slate-300'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{task.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{task.description}</p>
                      </div>
                      {task.dueDate && (
                        <span className="text-[9px] font-bold text-slate-400 shrink-0">{task.dueDate}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add List Modal */}
        <AnimatePresence>
          {showAddListModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowAddListModal(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
              >
                <h3 className="text-sm font-black text-slate-800 mb-4">Add New List</h3>
                <input
                  type="text"
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  placeholder="List name..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 mb-4"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowAddListModal(false)} className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer">Cancel</button>
                  <button type="button" onClick={() => handleAddListToSpace(activeSpace.id)} className="flex-1 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 cursor-pointer">Create</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── Editor View ───
  if (activeBase) {
    const viewType = activeView?.type || 'grid';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => { setActiveBaseId(null); setActiveViewId(null); setSearchQuery(''); }}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-lg">{activeBase.emoji || '📋'}</span>
        <h1 className="text-sm font-black text-slate-800 truncate">{activeBase.name}</h1>
        {isOffline && <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">Offline</span>}

        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search records..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 w-44"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBaseMenu(!showBaseMenu)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showBaseMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowBaseMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-40 bg-white rounded-xl border border-slate-200 shadow-lg py-1 min-w-[160px]">
                  <button type="button" onClick={handleDuplicateBase} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
                    <Copy className="w-3.5 h-3.5" /> Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete "${activeBase.name}"? This cannot be undone.`)) {
                        onDeleteBase(activeBase.id);
                        setActiveBaseId(null);
                        setShowBaseMenu(false);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Base
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Table sidebar */}
        <div className="hidden md:flex flex-col w-44 shrink-0 border-r border-slate-200/60 bg-slate-50/50 py-3 px-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 mb-2">Tables</span>
          {activeBase.tables.map(table => (
            <button
              key={table.id}
              type="button"
              onClick={() => {
                onUpdateBase({ ...activeBase, activeTableId: table.id });
                setActiveViewId(null);
              }}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer mb-0.5 ${
                activeTable?.id === table.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Table2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{table.name}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={handleAddTable}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors cursor-pointer mt-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add table
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* View tabs */}
          <div className="shrink-0 flex items-center gap-1 px-4 py-2 border-b border-slate-100 overflow-x-auto">
            {activeTable?.views.map(view => {
              const Icon = VIEW_ICONS[view.type];
              const isActive = (activeViewId || activeTable.views[0]?.id) === view.id;
              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setActiveViewId(view.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {view.name}
                </button>
              );
            })}

            {/* Add view dropdown */}
            <div className="relative ml-1">
              <button
                type="button"
                onClick={() => setShowFieldModal(prev => !prev)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> View
              </button>
            </div>

            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowFieldModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" /> Fields
              </button>
            </div>
          </div>

          {/* Mobile table selector */}
          <div className="md:hidden shrink-0 px-4 py-2 border-b border-slate-100">
            <select
              value={activeTable?.id || ''}
              onChange={e => onUpdateBase({ ...activeBase, activeTableId: e.target.value })}
              className="w-full text-xs font-bold border border-slate-200 rounded-lg px-3 py-2 bg-white"
            >
              {activeBase.tables.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* View content */}
          <div className="flex-1 overflow-hidden p-4">
            {activeTable && viewType === 'grid' && (
              <BaseGridView
                table={activeTable}
                records={processedRecords}
                members={members}
                visibleFields={activeView?.config.visibleFields}
                onUpdateRecord={handleUpdateRecord}
                onAddRecord={handleAddRecord}
                onDeleteRecord={handleDeleteRecord}
                onAddField={() => setShowFieldModal(true)}
              />
            )}
            {activeTable && viewType === 'kanban' && (
              <BaseKanbanView
                table={activeTable}
                records={processedRecords}
                members={members}
                kanbanFieldId={activeView?.config.kanbanFieldId}
                onUpdateRecord={handleUpdateRecord}
                onAddRecord={handleAddRecord}
              />
            )}
            {activeTable && viewType === 'gallery' && (
              <BaseGalleryView
                table={activeTable}
                records={processedRecords}
                members={members}
                onAddRecord={handleAddRecord}
              />
            )}
            {activeTable && viewType === 'form' && (
              <BaseFormView
                table={activeTable}
                members={members}
                onAddRecord={handleAddRecord}
                triggerToast={triggerToast}
              />
            )}
            {activeTable && viewType === 'calendar' && (
              <BaseCalendarView
                table={activeTable}
                records={processedRecords}
                calendarFieldId={activeView?.config.calendarFieldId}
                members={members}
                onAddRecord={handleAddRecord}
              />
            )}
            {activeTable && viewType === 'gantt' && (
              <BaseGanttView
                table={activeTable}
                records={processedRecords}
                members={members}
                onAddRecord={handleAddRecord}
                ganttStartFieldId={activeView?.config.ganttStartFieldId}
                ganttDurationFieldId={activeView?.config.ganttDurationFieldId}
              />
            )}
            {activeTable && viewType === 'dashboard' && (
              <BaseDashboardView
                table={activeTable}
                records={processedRecords}
                members={members}
              />
            )}
          </div>
        </div>
      </div>

      {/* Field / View type modal */}
      <AnimatePresence>
        {showFieldModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowFieldModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800">Add Field or View</h3>
                <button type="button" onClick={() => setShowFieldModal(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Field types</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(BASE_FIELD_TYPE_LABELS) as BaseField['type'][]).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleAddField(type)}
                        className="text-left px-3 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 text-xs font-medium text-slate-700 cursor-pointer transition-colors"
                      >
                        {BASE_FIELD_TYPE_LABELS[type]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Add view</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(VIEW_LABELS) as BaseViewType[]).map(type => {
                      const Icon = VIEW_ICONS[type];
                      const exists = activeTable?.views.some(v => v.type === type);
                      return (
                        <button
                          key={type}
                          type="button"
                          disabled={exists}
                          onClick={() => { handleAddView(type); setShowFieldModal(false); }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 text-xs font-medium text-slate-700 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {VIEW_LABELS[type]}
                          {exists && <span className="text-[9px] text-slate-400">(exists)</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        </AnimatePresence>

        {/* Add Space Modal */}
        <AnimatePresence>
          {showAddSpaceModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowAddSpaceModal(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
              >
                <h3 className="text-sm font-black text-slate-800 mb-4">Create New Space</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Name</label>
                    <input
                      type="text"
                      value={newSpaceName}
                      onChange={e => setNewSpaceName(e.target.value)}
                      placeholder="e.g. Marketing, Engineering, HR"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Icon / Emoji</label>
                      <EmojiIconPicker
                        value={newSpaceEmoji}
                        onChange={setNewSpaceEmoji}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Color</label>
                      <select
                        value={newSpaceColor}
                        onChange={e => setNewSpaceColor(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 font-bold"
                      >
                        <option value="indigo">Purple</option>
                        <option value="rose">Pink</option>
                        <option value="sky">Sky Blue</option>
                        <option value="emerald">Emerald</option>
                        <option value="amber">Amber</option>
                        <option value="sunset">Sunset</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button type="button" onClick={() => setShowAddSpaceModal(false)} className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer">Cancel</button>
                   <button type="button" onClick={handleAddSpace} className="flex-1 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 cursor-pointer">Create Space</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }
}
