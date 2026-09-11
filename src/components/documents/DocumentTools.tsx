"use client";

import { useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { Search, X, ChevronDown, ChevronUp, Plus, Columns2, Image, Link2, ListTodo, Info, FilePlus2 } from 'lucide-react';
import { findDocumentMatches, safeDocumentUrl } from '@/lib/documentModel';
import { useTaskStore } from '@/store/taskStore';

interface Props { editor: Editor; canEdit: boolean; workspaceId?: string; onAddPage?: () => void; }
export default function DocumentTools({ editor, canEdit, workspaceId, onAddPage }: Props) {
  const [panel, setPanel] = useState<'find' | 'insert' | 'link' | 'image' | 'task' | null>(null);
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [activeMatch, setActiveMatch] = useState(0);
  const [revision, setRevision] = useState(0);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const tasks = useTaskStore(state => state.tasks);
  const matchingTasks = tasks.filter(task => (!workspaceId || task.workspaceId === workspaceId) && task.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 30);
  useEffect(() => {
    const update = () => setRevision(value => value + 1);
    editor.on('update', update);
    return () => { editor.off('update', update); };
  }, [editor]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') { event.preventDefault(); setPanel('find'); }
      if (event.key === 'Escape') setPanel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const matches = useMemo(() => {
    const blocks: { text: string; from: number }[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.isTextblock) { blocks.push({ text: node.textBetween(0, node.content.size, '', '\ufffc'), from: pos + 1 }); return false; }
    });
    return findDocumentMatches(blocks, query, matchCase);
  }, [editor, query, matchCase, revision]);
  const index = matches.length ? activeMatch % matches.length : 0;
  const selectMatch = (next: number) => {
    if (!matches.length) return;
    const selected = (next + matches.length) % matches.length;
    setActiveMatch(selected);
    editor.chain().setTextSelection(matches[selected]).scrollIntoView().run();
  };
  const replace = (all: boolean) => {
    if (!canEdit || !matches.length) return;
    const ranges = all ? [...matches].reverse() : [matches[index]];
    let transaction = editor.state.tr;
    for (const range of ranges) transaction = replacement ? transaction.insertText(replacement, range.from, range.to) : transaction.delete(range.from, range.to);
    editor.view.dispatch(transaction);
    setActiveMatch(0);
  };
  const insert = (type: 'columns' | 'callout') => {
    if (!canEdit) return;
    editor.chain().focus().insertContent(type === 'columns'
      ? { type: 'docColumns', content: [1, 2].map(() => ({ type: 'docColumn', content: [{ type: 'paragraph' }] })) }
      : { type: 'docCallout', attrs: { tone: 'info' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Thông tin cần ghi nhớ' }] }] }).run();
    setPanel(null);
  };
  const open = (next: typeof panel) => { setPanel(panel === next ? null : next); setError(''); setUrl(''); setLabel(''); };
  return <div className="doc-tools print:hidden">
    <div className="doc-tools-actions">
      <button type="button" onClick={() => open('find')} aria-expanded={panel === 'find'}><Search size={15} />Tìm & thay thế<kbd>Ctrl F</kbd></button>
      {canEdit && <><button type="button" onClick={() => open('insert')} aria-expanded={panel === 'insert'}><Plus size={15} />Chèn khối</button>
        <button type="button" onClick={() => open('task')}><ListTodo size={15} />Liên kết Task</button>
        {onAddPage && <button type="button" onClick={onAddPage}><FilePlus2 size={15} />Trang con</button>}</>}
      <span className="doc-tools-hint">Gõ / để chèn · Chọn văn bản để định dạng</span>
    </div>
    {panel && <div className="doc-tools-panel" role="region" aria-label={panel === 'find' ? 'Tìm và thay thế' : 'Chèn nội dung'}>
      <button className="doc-panel-close" type="button" aria-label="Đóng công cụ" onClick={() => setPanel(null)}><X size={16} /></button>
      {panel === 'find' && <>
        <div className="doc-find-row"><input autoFocus aria-label="Tìm trong tài liệu" placeholder="Tìm trong tài liệu…" value={query} onChange={event => { setQuery(event.target.value); setActiveMatch(0); }} onKeyDown={event => { if (event.key === 'Enter') selectMatch(index + (event.shiftKey ? -1 : 1)); }} />
          <span role="status">{matches.length ? `${index + 1}/${matches.length}` : '0 kết quả'}</span>
          <button type="button" disabled={!matches.length} aria-label="Kết quả trước" onClick={() => selectMatch(index - 1)}><ChevronUp size={16} /></button>
          <button type="button" disabled={!matches.length} aria-label="Kết quả tiếp" onClick={() => selectMatch(index + 1)}><ChevronDown size={16} /></button>
          <label><input type="checkbox" checked={matchCase} onChange={event => setMatchCase(event.target.checked)} />Phân biệt hoa thường</label></div>
        {canEdit && <div className="doc-find-row"><input aria-label="Thay thế bằng" placeholder="Thay thế bằng…" value={replacement} onChange={event => setReplacement(event.target.value)} />
          <button type="button" disabled={!matches.length} onClick={() => replace(false)}>Thay thế</button><button type="button" disabled={!matches.length} onClick={() => replace(true)}>Thay tất cả</button></div>}
      </>}
      {panel === 'insert' && <div className="doc-insert-options">
        <button type="button" onClick={() => insert('callout')}><Info />Ghi chú nổi bật<small>Nhấn mạnh điều quan trọng</small></button>
        <button type="button" onClick={() => insert('columns')}><Columns2 />Hai cột<small>Sắp xếp nội dung cạnh nhau</small></button>
        <button type="button" onClick={() => open('image')}><Image />Hình ảnh<small>Chèn ảnh từ đường dẫn</small></button>
        <button type="button" onClick={() => open('link')}><Link2 />Liên kết<small>Thêm nguồn tham khảo</small></button>
      </div>}
      {(panel === 'image' || panel === 'link') && <form className="doc-find-row" onSubmit={event => {
        event.preventDefault(); if (!canEdit) return;
        const href = safeDocumentUrl(url); if (!href) { setError('Nhập đường dẫn http:// hoặc https:// hợp lệ.'); return; }
        if (panel === 'image') editor.chain().focus().insertContent({ type: 'docImage', attrs: { src: href, alt: label, title: label } }).run();
        else if (!editor.state.selection.empty) editor.chain().focus().setLink({ href }).run();
        else editor.chain().focus().insertContent({ type: 'text', text: label || href, marks: [{ type: 'link', attrs: { href } }] }).run();
        setPanel(null);
      }}><input autoFocus type="url" required value={url} onChange={event => setUrl(event.target.value)} aria-label="Đường dẫn" placeholder="https://…" />
        <input value={label} onChange={event => setLabel(event.target.value)} aria-label="Mô tả" placeholder={panel === 'image' ? 'Mô tả ảnh (alt text)' : 'Nội dung liên kết'} /><button type="submit">Chèn</button>
        {error && <p role="alert">{error}</p>}</form>}
      {panel === 'task' && <div className="doc-task-picker"><input autoFocus aria-label="Tìm công việc để liên kết" placeholder="Tìm công việc trong workspace…" value={query} onChange={event => setQuery(event.target.value)} />
        {matchingTasks.map(task => <button type="button" key={task.id} onClick={() => { if (!canEdit) return; editor.chain().focus().insertContent({ type: 'docTask', attrs: { taskId: task.id, title: task.title } }).run(); setPanel(null); }}><ListTodo size={16} /><span>{task.title}</span><small>{task.status === 'completed' ? 'Hoàn thành' : 'Đang mở'}</small></button>)}
        {!matchingTasks.length && <p>Không tìm thấy công việc phù hợp trong workspace này.</p>}</div>}
    </div>}
  </div>;
}
