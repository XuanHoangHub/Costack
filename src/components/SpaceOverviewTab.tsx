"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Bookmark, CalendarDays, Check, CheckCircle2, ChevronRight, Clock3, ExternalLink, FileText, Flag, Folder, FolderOpen, Layers, Link2, List, Loader2, Plus, Search, ShieldCheck, Sparkles, Target, Trash2, Users, X } from 'lucide-react';
import type { Document, Space, SpaceBookmark, Task, TaskStatus, User } from '../types';
import { useTranslation } from '../contexts/TranslationContext';
import EmojiIconPicker, { renderSpaceIcon } from './EmojiIconPicker';
import SignedImage from './SignedImage';
import { callAiApi } from '../lib/aiClient';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { matchesSpaceFocus, rankSpaceTasks, safeBookmarkUrl, type SpaceFocus } from '../lib/spaceInsights';

interface SpaceOverviewTabProps {
  space: Space;
  tasks: Task[];
  members: User[];
  docs?: Document[];
  onOpenList: (listId: string) => void;
  onAddList: () => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'commentsCount' | 'progress'>) => void;
  onOpenTask?: (task: Task) => void;
  onUpdateTask?: (task: Task) => void;
  onBrowseTasks?: (focus: SpaceFocus) => void;
  onCreateTask?: () => void;
  triggerToast?: (type: string, title: string, message: string) => void;
  onAddFolder?: () => void;
  onAddDoc?: () => void;
  onOpenDoc?: (docId: string) => void;
  activeFolderId?: string | null;
  onUpdateSpaceEmoji?: (emoji: string) => void;
  onUpdateBookmarks?: (bookmarks: SpaceBookmark[]) => void;
}

const statuses: { id: TaskStatus; vi: string; en: string; color: string }[] = [
  { id: 'todo', vi: 'Cần làm', en: 'To do', color: '#8190a8' },
  { id: 'inprogress', vi: 'Đang làm', en: 'In progress', color: '#e9a23b' },
  { id: 'review', vi: 'Chờ duyệt', en: 'In review', color: '#7c6ce7' },
  { id: 'completed', vi: 'Hoàn thành', en: 'Completed', color: '#26a885' },
];
const accents: Record<string, string> = { indigo: '#5871e9', blue: '#5871e9', sky: '#168eae', cyan: '#168eae', emerald: '#199c80', rose: '#dc668b', amber: '#c98a24', sunset: '#d87d46', violet: '#8864d7' };

export default function SpaceOverviewTab({ space, tasks, members, docs = [], onOpenList, onAddList, onAddTask, onOpenTask, onUpdateTask, onBrowseTasks, onCreateTask, triggerToast, onAddFolder, onAddDoc, onOpenDoc, activeFolderId = null, onUpdateSpaceEmoji, onUpdateBookmarks }: SpaceOverviewTabProps) {
  const { locale } = useTranslation();
  const vi = locale === 'vi';
  const tr = (vn: string, en: string) => vi ? vn : en;
  const isPremium = useAuthStore(state => Boolean(state.currentUser?.isPremium));
  const setShowPremiumModal = useUiStore(state => state.setShowPremiumModal);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickList, setQuickList] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [queue, setQueue] = useState<'all' | 'overdue' | 'today'>('all');
  const [bookmarks, setBookmarks] = useState<SpaceBookmark[]>([]);
  const [addingBookmark, setAddingBookmark] = useState(false);
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [bookmarkUrl, setBookmarkUrl] = useState('');
  const [bookmarkError, setBookmarkError] = useState('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const analysisRequest = useRef(0);
  const quickInput = useRef<HTMLInputElement>(null);
  const accent = accents[space.themeColor || 'indigo'] || accents.indigo;
  const folder = space.folders?.find(item => item.id === activeFolderId);
  const bookmarkKey = activeFolderId ? `apexa_bookmarks_folder_${activeFolderId}` : `apexa_bookmarks_${space.id}`;
  const lists = useMemo(() => space.lists.filter(list => !list.isArchived && (!activeFolderId || list.folderId === activeFolderId)), [space.lists, activeFolderId]);
  const spaceTasks = useMemo(() => tasks.filter(task => task.spaceId === space.id && (!activeFolderId || lists.some(list => list.id === task.listId))), [tasks, space.id, lists, activeFolderId]);
  const visibleDocs = docs.filter(doc => doc.spaceId === space.id && (!activeFolderId || doc.folderId === activeFolderId));
  const counts = statuses.map(status => ({ ...status, count: spaceTasks.filter(task => task.status === status.id).length }));
  const completed = counts.find(status => status.id === 'completed')!.count;
  const progress = spaceTasks.length ? Math.round(completed / spaceTasks.length * 100) : 0;
  const overdue = spaceTasks.filter(task => matchesSpaceFocus(task, 'overdue')).length;
  const dueToday = spaceTasks.filter(task => matchesSpaceFocus(task, 'today')).length;
  const highPriority = spaceTasks.filter(task => matchesSpaceFocus(task, 'priority')).length;
  const assignedMembers = members.filter(member => spaceTasks.some(task => task.assigneeId === member.id || task.assigneeIds?.includes(member.id)));
  const ranked = rankSpaceTasks(spaceTasks);
  const queueTasks = ranked.filter(task => matchesSpaceFocus(task, queue));
  const filteredLists = lists.filter(list => list.name.toLocaleLowerCase().includes(listSearch.trim().toLocaleLowerCase()));
  const dateLabel = (value?: string) => {
    if (!value) return tr('Chưa đặt hạn', 'No due date');
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
    return Number.isNaN(date.getTime()) ? tr('Chưa đặt hạn', 'No due date') : date.toLocaleDateString(vi ? 'vi-VN' : 'en-GB', { day: 'numeric', month: 'short' });
  };
  const preferences = space.clickApps?.spacePreferences;
  const syncedBookmarks = activeFolderId ? preferences?.folderBookmarks?.[activeFolderId] : preferences?.bookmarks;

  useEffect(() => {
    try {
      const saved: unknown = syncedBookmarks ?? JSON.parse(localStorage.getItem(bookmarkKey) || '[]');
      setBookmarks(Array.isArray(saved) ? saved.filter((item): item is SpaceBookmark => Boolean(item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.url === 'string' && safeBookmarkUrl(item.url))) : []);
    } catch { setBookmarks([]); }
  }, [bookmarkKey, syncedBookmarks]);

  useEffect(() => {
    analysisRequest.current += 1;
    setAnalysis(null);
    setAnalyzing(false);
    setQuickTitle('');
    setQuickList('');
    setListSearch('');
    setQueue('all');
    setAddingBookmark(false);
    return () => { analysisRequest.current += 1; };
  }, [space.id, activeFolderId]);

  const saveBookmarks = (next: SpaceBookmark[]) => {
    setBookmarks(next);
    onUpdateBookmarks?.(next);
    try { localStorage.setItem(bookmarkKey, JSON.stringify(next)); } catch { /* Synced preferences remain authoritative. */ }
  };
  const addBookmark = (event: React.FormEvent) => {
    event.preventDefault();
    const url = safeBookmarkUrl(bookmarkUrl);
    if (!url) { setBookmarkError(tr('Nhập liên kết http hoặc https hợp lệ.', 'Enter a valid http or https link.')); return; }
    if (!bookmarkTitle.trim()) return;
    saveBookmarks([...bookmarks, { id: `bookmark-${crypto.randomUUID()}`, title: bookmarkTitle.trim(), url }]);
    setAddingBookmark(false); setBookmarkTitle(''); setBookmarkUrl(''); setBookmarkError('');
  };
  const addQuickTask = (event: React.FormEvent) => {
    event.preventDefault();
    if (!quickTitle.trim()) return;
    const targetList = lists.find(list => list.id === quickList)?.id || lists[0]?.id;
    if (activeFolderId && !targetList) { onAddList(); return; }
    onAddTask({ title: quickTitle.trim(), description: '', status: 'todo', priority: 'medium', subtasks: [], spaceId: space.id, listId: targetList, workspaceId: space.workspaceId });
    setQuickTitle('');
    quickInput.current?.focus();
  };
  const runAnalysis = async () => {
    if (!isPremium) { setShowPremiumModal(true); return; }
    const request = ++analysisRequest.current;
    setAnalyzing(true);
    try {
      const response = await callAiApi('/api/ai/chat', {
        message: `${vi ? 'Phân tích bằng tiếng Việt' : 'Analyze in English'}: Space ${space.name}. ${spaceTasks.length} tasks, ${progress}% complete, ${overdue} overdue. Give 3 concise sentences with risks and next actions. Only use the provided data. ${JSON.stringify(ranked.slice(0, 30).map(task => ({ title: task.title, status: task.status, priority: task.priority, dueDate: task.dueDate })))}`,
        history: [], taskContext: `Space: ${space.name}`,
      });
      if (!response?.ok) throw new Error('analysis-unavailable');
      const result = await response.json();
      if (typeof result.text !== 'string' || !result.text.trim()) throw new Error('empty-analysis');
      if (request === analysisRequest.current) setAnalysis(result.text.trim());
    } catch {
      if (request === analysisRequest.current) triggerToast?.('error', tr('Chưa thể phân tích', 'Analysis unavailable'), tr('Không kết nối được AI. Bạn có thể thử lại.', 'Could not connect to AI. Please try again.'));
    } finally { if (request === analysisRequest.current) setAnalyzing(false); }
  };
  const createTask = () => onCreateTask ? onCreateTask() : quickInput.current?.focus();

  return (
    <div className="apexa-space-overview space-hub" style={{ '--space-accent': accent } as React.CSSProperties}>
      <div className="space-hub-inner">
        <section className="space-hero">
          <div className="space-hero-art" aria-hidden="true"><div /><div /><div /><Layers /></div>
          <div className="space-eyebrow"><span className="space-live-dot" />{tr('KHÔNG GIAN LÀM VIỆC', 'YOUR WORKSPACE')}<span className="space-hero-privacy"><ShieldCheck size={12} />{space.isPrivate ? tr('Riêng tư', 'Private') : tr('Cộng tác', 'Collaborative')}</span></div>
          <div className="space-hero-main">
            <div className="space-hero-identity">
              {onUpdateSpaceEmoji ? <EmojiIconPicker size="inline" value={space.emoji || 'Package'} onChange={onUpdateSpaceEmoji} title={tr('Đổi biểu tượng Space', 'Change Space icon')}><div className="space-hero-icon">{renderSpaceIcon(space.emoji || 'Package', 'h-7 w-7')}</div></EmojiIconPicker> : <div className="space-hero-icon">{renderSpaceIcon(space.emoji || 'Package', 'h-7 w-7')}</div>}
              <div><h1>{folder?.name || space.name}</h1><p>{space.description || preferences?.description || tr('Ý tưởng có nơi bắt đầu. Công việc có nơi tiến xa.', 'A home for your ideas. A clear path to what’s next.')}</p></div>
            </div>
            <button type="button" className="space-button space-button-primary" onClick={createTask}><Plus size={16} />{tr('Tạo công việc', 'Create task')}</button>
          </div>
          <div className="space-hero-bottom"><span><List size={14} />{lists.length} {tr('danh sách', 'lists')}</span><span><FileText size={14} />{visibleDocs.length} {tr('tài liệu', 'documents')}</span><span><Users size={14} />{assignedMembers.length} {tr('người được giao việc', 'assigned members')}</span><span className="space-hero-date"><CalendarDays size={14} />{new Date().toLocaleDateString(vi ? 'vi-VN' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
        </section>

        <div className="space-metrics">
          {[
            { label: tr('Tổng công việc', 'Total tasks'), value: spaceTasks.length, note: tr(`${spaceTasks.length - completed} việc đang mở`, `${spaceTasks.length - completed} open tasks`), icon: Layers, focus: 'all', tone: 'blue' },
            { label: tr('Đã hoàn thành', 'Completed'), value: `${progress}%`, note: tr(`${completed}/${spaceTasks.length} công việc`, `${completed}/${spaceTasks.length} tasks`), icon: CheckCircle2, focus: 'completed', tone: 'green' },
            { label: tr('Đến hạn hôm nay', 'Due today'), value: dueToday, note: tr('Lên kế hoạch cho hôm nay', 'Plan your day with clarity'), icon: CalendarDays, focus: 'today', tone: 'amber' },
            { label: tr('Cần chú ý', 'Needs attention'), value: overdue, note: tr(`${highPriority} việc ưu tiên cao`, `${highPriority} high priority tasks`), icon: Flag, focus: 'overdue', tone: 'rose' },
          ].map(item => <button type="button" key={item.focus} className={`space-metric space-tone-${item.tone}`} onClick={() => onBrowseTasks?.(item.focus as SpaceFocus)}><div className="space-metric-heading"><span>{item.label}</span><item.icon size={17} /></div><strong>{item.value}</strong><div className="space-metric-note"><span>{item.note}</span><ArrowUpRight size={15} /></div></button>)}
        </div>

        <div className="space-hub-grid">
          <div className="space-main-stack">
            <section className="space-panel space-focus-panel">
              <div className="space-section-heading"><div><div className="space-section-kicker"><Target size={15} />{tr('TỪ KẾ HOẠCH ĐẾN HÀNH ĐỘNG', 'FROM PLANS TO PROGRESS')}</div><h2>{tr('Cần tập trung', 'Your next moves')}<span className="space-number-badge">{ranked.length}</span></h2></div><button className="space-text-button" onClick={() => onBrowseTasks?.('all')}>{tr('Xem tất cả', 'View all')}<ArrowRight size={14} /></button></div>
              <div className="space-queue-tabs" role="group" aria-label={tr('Phạm vi ưu tiên', 'Focus queue')}>
                {([{ id: 'all', label: tr('Tiếp theo', 'Up next'), count: ranked.length }, { id: 'today', label: tr('Hôm nay', 'Today'), count: dueToday }, { id: 'overdue', label: tr('Quá hạn', 'Overdue'), count: overdue }] as const).map(item => <button key={item.id} aria-pressed={queue === item.id} onClick={() => setQueue(item.id)}>{item.label}<span>{item.count}</span></button>)}
              </div>
              <div className="space-queue">
                {queueTasks.slice(0, 5).map(task => {
                  const list = lists.find(item => item.id === task.listId);
                  const status = statuses.find(item => item.id === task.status)!;
                  const assignee = members.find(member => member.id === task.assigneeId || task.assigneeIds?.includes(member.id));
                  return <div key={task.id} className="space-queue-row"><button type="button" className="space-complete-button" onClick={() => onUpdateTask?.({ ...task, status: 'completed', progress: 100 })} aria-label={tr(`Hoàn thành ${task.title}`, `Complete ${task.title}`)}><Check size={13} /></button><button className="space-task-open" onClick={() => onOpenTask?.(task)}><strong>{task.title}</strong><span>{list?.name || tr('Công việc trong Space', 'Space task')}<i style={{ background: status.color }} />{vi ? status.vi : status.en}</span></button><span className={`space-task-date ${matchesSpaceFocus(task, 'overdue') ? 'is-overdue' : ''}`}><CalendarDays size={12} />{dateLabel(task.dueDate)}</span>{assignee ? <SignedImage filePath={assignee.avatar} alt={assignee.name} title={assignee.name} className="space-avatar" /> : <span className="space-unassigned" title={tr('Chưa giao', 'Unassigned')}><Users size={13} /></span>}</div>;
                })}
                {!queueTasks.length && <div className="space-empty-focus"><div className="space-empty-art"><span /><span /><span /><CheckCircle2 size={30} /></div><h3>{spaceTasks.length === 0 ? tr('Bắt đầu điều gì đó tuyệt vời', 'Make room for great work') : tr('Mọi thứ đã gọn gàng', 'You’re all clear here')}</h3><p>{spaceTasks.length === 0 ? tr('Thêm công việc đầu tiên. Chia nhỏ mục tiêu, cùng nhau tiến lên.', 'Add your first task. Break down a goal and move it forward.') : tr('Không có công việc trong nhóm này. Chọn nhóm khác hoặc tạo việc mới.', 'No tasks in this group. Explore another group or start something new.')}</p><button className="space-button space-button-soft" onClick={createTask}><Plus size={15} />{tr('Thêm công việc', 'Add a task')}</button></div>}
              </div>
              <form className="space-quick-create" onSubmit={addQuickTask}><div><Plus size={16} /><input ref={quickInput} value={quickTitle} onChange={event => setQuickTitle(event.target.value)} aria-label={tr('Tên công việc mới', 'New task title')} placeholder={tr('Bạn muốn hoàn thành điều gì?', 'What would you like to get done?')} maxLength={500} /></div><div>{lists.length > 0 && <select aria-label={tr('Danh sách nhận công việc', 'Task destination list')} value={quickList || lists[0]?.id || ''} onChange={event => setQuickList(event.target.value)}>{lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}</select>}<button type="submit" disabled={!quickTitle.trim()} className="space-quick-submit" aria-label={tr('Tạo nhanh công việc', 'Quick create task')}><ArrowRight size={17} /></button></div></form>
            </section>

            <section className="space-panel">
              <div className="space-section-heading"><div><div className="space-section-kicker"><FolderOpen size={15} />{tr('SẮP XẾP CÔNG VIỆC', 'ORGANIZE YOUR WORK')}</div><h2>{tr('Danh sách & dự án', 'Lists & projects')}<span className="space-number-badge">{lists.length}</span></h2></div><button className="space-text-button" onClick={onAddList}><Plus size={14} />{tr('Tạo danh sách', 'New list')}</button></div>
              {lists.length > 4 && <label className="space-list-search"><Search size={14} /><input value={listSearch} onChange={event => setListSearch(event.target.value)} placeholder={tr('Tìm danh sách…', 'Find a list…')} aria-label={tr('Tìm danh sách', 'Find a list')} /></label>}
              <div className="space-project-grid">{filteredLists.map((list, index) => {
                const listTasks = spaceTasks.filter(task => task.listId === list.id);
                const done = listTasks.filter(task => task.status === 'completed').length;
                const percent = listTasks.length ? Math.round(done / listTasks.length * 100) : 0;
                return <button key={list.id} className="space-project-card" onClick={() => onOpenList(list.id)}><div><span className={`space-project-icon space-project-icon-${index % 3}`}><List size={18} /></span><ChevronRight size={16} /></div><h3>{list.name}</h3><p>{listTasks.length ? tr(`${listTasks.length - done} đang mở · ${done} hoàn thành`, `${listTasks.length - done} open · ${done} completed`) : tr('Sẵn sàng cho ý tưởng đầu tiên', 'Ready for your first idea')}</p><div className="space-project-progress"><div role="progressbar" aria-label={list.name} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percent}%` }} /></div><span>{percent}%</span></div></button>;
              })}<button className="space-project-add" onClick={onAddList}><span><Plus size={20} /></span><strong>{tr('Danh sách mới', 'New list')}</strong><p>{tr('Một mục tiêu. Một khởi đầu.', 'A fresh start for your next goal.')}</p></button></div>
              {listSearch && !filteredLists.length && <p className="space-muted">{tr('Không có danh sách phù hợp.', 'No matching lists.')}</p>}
            </section>
          </div>

          <aside className="space-side-stack">
            <section className="space-panel space-progress-panel"><div className="space-section-heading"><h2>{tr('Nhịp độ Space', 'Space pulse')}</h2><span className="space-number-badge">{tr('Trực tiếp', 'Live')}</span></div><div className="space-progress-summary"><div className="space-progress-ring" style={{ background: `conic-gradient(${accent} ${progress}%, var(--space-track) 0)` }} role="progressbar" aria-label={tr('Tiến độ Space', 'Space progress')} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div><strong>{progress}%</strong><span>{tr('hoàn thành', 'complete')}</span></div></div><div><strong>{completed}<span> / {spaceTasks.length}</span></strong><p>{tr('công việc hoàn tất', 'tasks completed')}</p><span className={`space-health-label ${overdue ? 'has-risk' : ''}`}><span />{overdue ? tr(`${overdue} việc quá hạn`, `${overdue} overdue`) : spaceTasks.length ? tr('Không có việc quá hạn', 'No overdue tasks') : tr('Sẵn sàng bắt đầu', 'Ready to begin')}</span></div></div><div className="space-status-stack">{counts.map(status => <div key={status.id}><span><i style={{ background: status.color }} />{vi ? status.vi : status.en}</span><div><span style={{ width: `${spaceTasks.length ? status.count / spaceTasks.length * 100 : 0}%`, background: status.color }} /></div><strong>{status.count}</strong></div>)}</div></section>
            <section className="space-ai-card"><div><span className="space-ai-icon"><Sparkles size={18} /></span><span>Apexa AI<span>{tr('GÓC NHÌN THÔNG MINH', 'A FRESH PERSPECTIVE')}</span></span></div><h2>{tr('Bước tiếp theo, rõ ràng hơn.', 'Clarity for your next step.')}</h2><p aria-live="polite">{analysis || tr('Biến tiến độ công việc thành gợi ý hành động. Nhận diện rủi ro và ưu tiên từ dữ liệu Space.', 'Turn your progress into actionable insights. Find risks and priorities in your Space data.')}</p><button onClick={runAnalysis} disabled={analyzing || !spaceTasks.length}>{analyzing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}{analyzing ? tr('Đang phân tích…', 'Analyzing…') : tr('Phân tích Space', 'Analyze Space')}<ArrowUpRight size={15} /></button>{!spaceTasks.length && <small>{tr('Thêm công việc để bắt đầu phân tích.', 'Add tasks to unlock your Space insights.')}</small>}</section>
            <section className="space-panel"><div className="space-section-heading"><h2>{tr('Cộng tác', 'Working together')}</h2><Users size={16} /></div>{assignedMembers.length ? <div className="space-member-list">{assignedMembers.slice(0, 5).map(member => { const open = spaceTasks.filter(task => task.status !== 'completed' && (task.assigneeId === member.id || task.assigneeIds?.includes(member.id))).length; return <div key={member.id}><SignedImage filePath={member.avatar} alt={member.name} className="space-avatar" /><span>{member.name}</span><small>{open} {tr('đang mở', 'open')}</small></div>; })}{assignedMembers.length > 5 && <p className="space-muted">+{assignedMembers.length - 5} {tr('người được giao việc', 'assigned members')}</p>}</div> : <div className="space-team-empty"><Users size={22} /><p>{tr('Giao công việc để thấy phân bổ của đội ngũ tại đây.', 'Assign tasks to see your team’s workload here.')}</p></div>}<button className="space-text-button space-full-link" onClick={() => onBrowseTasks?.('unassigned')}>{tr('Xem việc chưa được giao', 'View unassigned tasks')}<ArrowRight size={14} /></button></section>
            <section className="space-panel"><div className="space-section-heading"><h2>{tr('Tài nguyên', 'Resources')}</h2><button className="space-icon-button" aria-label={tr('Ghim liên kết', 'Pin a link')} onClick={() => setAddingBookmark(value => !value)} aria-expanded={addingBookmark}><Plus size={17} /></button></div>{addingBookmark && <form className="space-bookmark-form" onSubmit={addBookmark}><input autoFocus aria-label={tr('Tên liên kết', 'Link title')} placeholder={tr('Tên liên kết', 'Link title')} value={bookmarkTitle} onChange={event => setBookmarkTitle(event.target.value)} required /><input aria-label={tr('Địa chỉ liên kết', 'Link URL')} placeholder="https://…" value={bookmarkUrl} onChange={event => { setBookmarkUrl(event.target.value); setBookmarkError(''); }} required />{bookmarkError && <p role="alert">{bookmarkError}</p>}<div><button type="submit" className="space-button space-button-soft">{tr('Ghim liên kết', 'Pin link')}</button><button type="button" className="space-icon-button" aria-label={tr('Hủy', 'Cancel')} onClick={() => setAddingBookmark(false)}><X size={16} /></button></div></form>}<div className="space-resource-list">{bookmarks.map(bookmark => <div key={bookmark.id}><a href={safeBookmarkUrl(bookmark.url) || undefined} target="_blank" rel="noopener noreferrer"><Link2 size={15} /><span>{bookmark.title}</span><ExternalLink size={12} /></a><button className="space-icon-button" aria-label={tr(`Bỏ ghim ${bookmark.title}`, `Unpin ${bookmark.title}`)} onClick={() => saveBookmarks(bookmarks.filter(item => item.id !== bookmark.id))}><Trash2 size={13} /></button></div>)}{visibleDocs.slice(0, 4).map(doc => <button key={doc.id} onClick={() => onOpenDoc?.(doc.id)}><FileText size={15} /><span>{doc.title}</span><ChevronRight size={13} /></button>)}{!bookmarks.length && !visibleDocs.length && <p className="space-muted">{tr('Ghim tài liệu và liên kết để cả nhóm tìm thấy dễ dàng.', 'Keep useful documents and links close at hand.')}</p>}</div><div className="space-resource-actions"><button onClick={onAddDoc} disabled={!onAddDoc}><FileText size={14} />{tr('Tài liệu mới', 'New doc')}</button><button onClick={onAddFolder} disabled={!onAddFolder}><Folder size={14} />{tr('Thư mục mới', 'New folder')}</button></div></section>
          </aside>
        </div>
      </div>
    </div>
  );
}
