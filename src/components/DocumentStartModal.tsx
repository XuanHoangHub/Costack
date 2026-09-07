"use client";

import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, FileSpreadsheet,
  FileText, FolderUp, LayoutTemplate, Link2, Plus, Presentation, Sparkles,
  UploadCloud, X
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { createConnectedDocument, importDocumentFile, type ImportedApexaDocument } from '@/lib/documentImport';

interface DocumentStartModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (document: Partial<ImportedApexaDocument>) => void | Promise<void>;
}

type View = 'home' | 'import' | 'connect' | 'templates';

const TEMPLATES = [
  { id: 'meeting', title: 'Ghi chú cuộc họp', icon: '🗓️', description: 'Agenda, quyết định và việc cần làm', color: 'from-sky-500 to-blue-600' },
  { id: 'project', title: 'Kế hoạch dự án', icon: '🚀', description: 'Mục tiêu, phạm vi, tiến độ và rủi ro', color: 'from-violet-500 to-indigo-600' },
  { id: 'wiki', title: 'Wiki & quy trình', icon: '📚', description: 'Chuẩn hóa tri thức và SOP nội bộ', color: 'from-amber-400 to-orange-500' },
  { id: 'brief', title: 'Creative brief', icon: '✨', description: 'Bối cảnh, insight và đầu ra mong đợi', color: 'from-fuchsia-500 to-pink-600' },
];

const templateContent = (id: string) => {
  const blocks: Record<string, Array<Record<string, unknown>>> = {
    meeting: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Mục tiêu cuộc họp' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Nêu kết quả cần đạt được sau buổi họp…' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Nội dung thảo luận' }] },
      { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Chủ đề đầu tiên' }] }] }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Quyết định & việc cần làm' }] },
      { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Thêm đầu việc, người phụ trách và thời hạn' }] }] }] },
    ],
    project: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Tổng quan' }] },
      { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: '💡 Mô tả vấn đề, mục tiêu và tiêu chí thành công.' }] }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Phạm vi & mốc tiến độ' }] },
      { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mốc quan trọng đầu tiên' }] }] }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Rủi ro & phụ thuộc' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Ghi lại các rủi ro có thể ảnh hưởng đến tiến độ…' }] },
    ],
    wiki: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Quy trình này dùng khi nào?' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Mô tả phạm vi áp dụng và người chịu trách nhiệm…' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Các bước thực hiện' }] },
      { type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bước đầu tiên' }] }] }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Tài nguyên liên quan' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Thêm liên kết, biểu mẫu hoặc người liên hệ…' }] },
    ],
    brief: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Bối cảnh & thách thức' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Tóm tắt bối cảnh của dự án…' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Đối tượng & insight' }] },
      { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: '✨ Insight quan trọng nhất của khách hàng.' }] }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Đầu ra mong đợi' }] },
      { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Thêm deliverable' }] }] }] },
    ],
  };
  return { type: 'doc', content: blocks[id] || [{ type: 'paragraph' }] };
};

export default function DocumentStartModal({ open, onClose, onCreate }: DocumentStartModalProps) {
  const [view, setView] = useState<View>('home');
  const [provider, setProvider] = useState('google-docs');
  const [sourceUrl, setSourceUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const header = useMemo(() => ({
    home: ['Tạo tài liệu', 'Bắt đầu mới, nhập file hoặc kết nối nguồn đang dùng'],
    import: ['Nhập tài liệu', 'Word, Excel, CSV, Markdown và văn bản'],
    connect: ['Kết nối nguồn', 'Giữ mọi tài liệu quan trọng trong cùng một workspace'],
    templates: ['Thư viện mẫu', 'Khởi động nhanh với cấu trúc đã được tối ưu'],
  })[view], [view]);

  const close = () => {
    setView('home');
    setSourceUrl('');
    setError('');
    onClose();
  };

  const processFiles = async (files: FileList | File[]) => {
    const selectedFiles = Array.from(files);
    if (!selectedFiles.length) return;
    setBusy(true);
    setError('');
    try {
      for (const file of selectedFiles) {
        const imported = await importDocumentFile(file);
        await onCreate(imported);
      }
      close();
    } catch (cause) {
      console.error('Document import failed:', cause);
      setError('Không thể đọc file này. Hãy kiểm tra định dạng hoặc thử lưu lại file rồi nhập lại.');
    } finally {
      setBusy(false);
    }
  };

  const connectSource = async () => {
    const trimmedUrl = sourceUrl.trim();
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      setError('Hãy dán liên kết đầy đủ, bắt đầu bằng https://');
      return;
    }
    setBusy(true);
    await onCreate(createConnectedDocument(provider, trimmedUrl));
    setBusy(false);
    close();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6">
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} className="absolute inset-0 bg-slate-950/50 backdrop-blur-md" aria-label="Đóng" />
          <motion.section initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ duration: 0.2 }} className="relative z-10 flex max-h-[88vh] w-full max-w-[860px] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-[#fbfcfe] shadow-[0_32px_100px_-24px_rgba(15,23,42,.5)] dark:border-slate-700 dark:bg-[#101217]">
            <header className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 sm:px-7 dark:border-slate-800">
              <div className="flex min-w-0 items-center gap-3">
                {view !== 'home' && <button onClick={() => { setView('home'); setError(''); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><ArrowLeft className="h-4 w-4" /></button>}
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white">{header[0]}</h2>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{header[1]}</p>
                </div>
              </div>
              <button onClick={close} aria-label="Đóng trung tâm tạo tài liệu" className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-4 w-4" /></button>
            </header>

            <div className="overflow-y-auto p-5 sm:p-7">
              {view === 'home' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <button onClick={() => { onCreate({ title: 'Tài liệu mới', icon: '📝', content: { type: 'doc', content: [{ type: 'paragraph' }] } }); close(); }} className="group col-span-full flex min-h-32 items-center justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-[#335cff] via-[#5b5cf0] to-[#8d49e8] p-6 text-left text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:shadow-xl">
                    <span><span className="mb-2 flex items-center gap-2 text-xs font-bold text-white/75"><Sparkles className="h-4 w-4" /> TRANG TRỐNG</span><span className="block text-xl font-extrabold">Bắt đầu viết ngay</span><span className="mt-1 block text-sm text-white/75">Gõ / để mở toàn bộ khối nội dung</span></span>
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 transition group-hover:rotate-3 group-hover:scale-105"><Plus className="h-7 w-7" /></span>
                  </button>

                  {[
                    { id: 'import', icon: UploadCloud, title: 'Nhập từ file', text: 'Word, Excel, CSV, Markdown…', tone: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300' },
                    { id: 'connect', icon: Link2, title: 'Kết nối nguồn', text: 'Google Docs, Sheets, Microsoft 365', tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300' },
                    { id: 'templates', icon: LayoutTemplate, title: 'Dùng mẫu có sẵn', text: 'Họp, dự án, wiki, creative brief', tone: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300' },
                    { id: 'ai', icon: Sparkles, title: 'Soạn với Apexa AI', text: 'Tạo dàn ý rồi tiếp tục trong AI chat', tone: 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-950/30 dark:text-fuchsia-300' },
                  ].map(item => (
                    <button key={item.id} onClick={() => item.id === 'ai' ? (onCreate({ title: 'Bản nháp cùng Apexa AI', icon: '✨', content: templateContent('brief') }), close()) : setView(item.id as View)} className="group flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-indigo-800">
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${item.tone}`}><item.icon className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-900 dark:text-white">{item.title}</span><span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{item.text}</span></span>
                      <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                    </button>
                  ))}
                </div>
              )}

              {view === 'import' && (
                <div className="space-y-5">
                  <input ref={inputRef} type="file" multiple accept=".docx,.xlsx,.csv,.tsv,.md,.txt" className="hidden" onChange={event => event.target.files && processFiles(event.target.files)} />
                  <button onClick={() => inputRef.current?.click()} onDragEnter={() => setDragging(true)} onDragLeave={() => setDragging(false)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); setDragging(false); processFiles(event.dataTransfer.files); }} className={`flex min-h-64 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition ${dragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 dark:border-slate-700 dark:bg-slate-900/50'}`}>
                    <span className="mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-900"><FolderUp className="h-7 w-7" /></span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">{busy ? 'Đang đọc và chuyển đổi…' : 'Kéo thả file vào đây'}</span>
                    <span className="mt-1 text-sm text-slate-500">hoặc bấm để chọn nhiều file từ máy tính</span>
                    <span className="mt-4 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800">DOCX · XLSX · CSV · TSV · MD · TXT</span>
                  </button>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[{ icon: FileText, label: 'Word & văn bản', tone: 'text-blue-600 bg-blue-50' }, { icon: FileSpreadsheet, label: 'Excel & CSV', tone: 'text-emerald-600 bg-emerald-50' }, { icon: Presentation, label: 'Giữ cấu trúc', tone: 'text-violet-600 bg-violet-50' }].map(item => <div key={item.label} className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><span className={`grid h-8 w-8 place-items-center rounded-xl ${item.tone}`}><item.icon className="h-4 w-4" /></span>{item.label}</div>)}
                  </div>
                </div>
              )}

              {view === 'connect' && (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ['google-docs', 'Google Docs', 'Tài liệu và biên bản', 'G', 'bg-blue-500'],
                      ['google-sheets', 'Google Sheets', 'Bảng dữ liệu và báo cáo', 'S', 'bg-emerald-500'],
                      ['microsoft-word', 'Microsoft Word', 'Tài liệu Microsoft 365', 'W', 'bg-blue-700'],
                      ['microsoft-excel', 'Microsoft Excel', 'Workbook trên OneDrive', 'X', 'bg-emerald-700'],
                    ].map(item => (
                      <button key={item[0]} onClick={() => setProvider(item[0])} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${provider === item[0] ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/10 dark:bg-indigo-950/25' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'}`}>
                        <span className={`grid h-11 w-11 place-items-center rounded-2xl text-lg font-black text-white ${item[4]}`}>{item[3]}</span>
                        <span className="flex-1"><span className="block text-sm font-bold text-slate-900 dark:text-white">{item[1]}</span><span className="block text-xs text-slate-500">{item[2]}</span></span>
                        {provider === item[0] && <Check className="h-4 w-4 text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <label className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-200">Dán liên kết chia sẻ của tài liệu</label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="relative flex-1"><Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input autoFocus value={sourceUrl} onChange={event => { setSourceUrl(event.target.value); setError(''); }} onKeyDown={event => event.key === 'Enter' && connectSource()} placeholder="https://docs.google.com/…" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-950" /></div>
                      <button onClick={connectSource} disabled={busy || !sourceUrl.trim()} className="h-11 rounded-xl bg-slate-950 px-5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-600 disabled:opacity-40 dark:bg-white dark:text-slate-950 dark:hover:bg-indigo-400">Thêm vào Apexa</button>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-400">Apexa lưu liên kết nguồn cùng ghi chú nội bộ. Đồng bộ hai chiều qua OAuth cần cấu hình Google Cloud hoặc Microsoft Entra cho môi trường triển khai.</p>
                  </div>
                </div>
              )}

              {view === 'templates' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {TEMPLATES.map(template => (
                    <button key={template.id} onClick={() => { onCreate({ title: template.title, icon: template.icon, content: templateContent(template.id) }); close(); }} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
                      <span className={`flex h-24 items-end bg-gradient-to-br p-4 ${template.color}`}><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-2xl ring-1 ring-white/30 backdrop-blur-sm">{template.icon}</span></span>
                      <span className="block p-4"><span className="block text-sm font-extrabold text-slate-900 dark:text-white">{template.title}</span><span className="mt-1 block text-xs text-slate-500">{template.description}</span><span className="mt-3 flex items-center gap-1 text-xs font-bold text-indigo-600">Dùng mẫu <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span></span>
                    </button>
                  ))}
                </div>
              )}

              {error && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
