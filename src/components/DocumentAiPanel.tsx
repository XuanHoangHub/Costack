"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Check, Copy, CornerDownLeft, Plus, Send, Sparkles, Wand2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { ApexaAiIcon } from './ApexaAiIcon';
import { callAiApi } from '@/lib/aiClient';

interface ChatMessage { id: string; role: 'assistant' | 'user'; content: string; }

interface DocumentAiPanelProps {
  document: any;
  onClose: () => void;
  onInsert: (text: string) => void;
}

const contentToText = (value: unknown): string => {
  if (!value || typeof value !== 'object') return '';
  if (Array.isArray(value)) return value.map(contentToText).filter(Boolean).join('\n');
  const node = value as { text?: string; content?: unknown };
  return [node.text || '', contentToText(node.content)].filter(Boolean).join(' ').trim();
};

const QUICK_PROMPTS = [
  'Tóm tắt tài liệu này',
  'Tìm các đầu việc cần làm',
  'Viết lại rõ ràng, chuyên nghiệp hơn',
  'Đề xuất dàn ý tiếp theo',
];

export default function DocumentAiPanel({ document, onClose, onInsert }: DocumentAiPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', content: 'Mình đã đọc tài liệu này. Bạn muốn tóm tắt, viết tiếp, tìm quyết định hay chuyển nội dung thành danh sách công việc?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const documentText = useMemo(() => contentToText(document?.content).slice(0, 12000), [document?.content]);

  useEffect(() => {
    setMessages([{ id: 'welcome', role: 'assistant', content: `Mình đang làm việc cùng bạn trên “${document?.title || 'tài liệu này'}”. Hỏi mình bất cứ điều gì, hoặc chọn một gợi ý bên dưới.` }]);
  }, [document?.id, document?.title]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const submit = async (prompt = input) => {
    const value = prompt.trim();
    if (!value || loading) return;
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: value };
    setMessages(previous => [...previous, userMessage]);
    setInput('');
    setLoading(true);
    try {
      const history = messages.slice(-8).map(message => ({ role: message.role, parts: [{ text: message.content }] }));
      const response = await callAiApi('/api/ai/chat', {
        message: `Bạn là Upgen AI đang hỗ trợ soạn thảo tài liệu. Trả lời bằng tiếng Việt, ngắn gọn, có cấu trúc và có thể chèn thẳng vào tài liệu.\n\nTên tài liệu: ${document?.title || 'Không tiêu đề'}\nNội dung hiện tại:\n${documentText || '(Tài liệu đang trống)'}\n\nYêu cầu: ${value}`,
        history,
      });
      if (!response.ok) throw new Error('Dịch vụ AI chưa sẵn sàng.');
      const data = await response.json();
      const reply = data.reply || data.message || data.text || 'Mình chưa tạo được câu trả lời. Bạn thử diễn đạt lại yêu cầu nhé.';
      setMessages(previous => [...previous, { id: `assistant-${Date.now()}`, role: 'assistant', content: reply }]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không thể kết nối Upgen AI lúc này.';
      setMessages(previous => [...previous, { id: `error-${Date.now()}`, role: 'assistant', content: message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.aside initial={{ x: 32, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 32, opacity: 0 }} className="absolute inset-y-0 right-0 z-[70] flex w-full max-w-[390px] flex-col border-l border-slate-200/80 bg-white/95 shadow-[-24px_0_70px_-40px_rgba(15,23,42,.45)] backdrop-blur-2xl sm:relative sm:z-20 dark:border-slate-800 dark:bg-[#111318]/95">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 px-4 dark:border-slate-800">
        <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-500 shadow-md shadow-indigo-500/20"><ApexaAiIcon className="h-4 w-4" variant="white" /></span><div><h3 className="text-sm font-extrabold text-slate-950 dark:text-white">Upgen AI</h3><p className="text-[10px] font-medium text-emerald-600">Đang đọc tài liệu hiện tại</p></div></div>
        <button onClick={onClose} aria-label="Đóng Upgen AI" className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-4 w-4" /></button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {messages.map(message => (
          <div key={message.id} className={`flex gap-2.5 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl ${message.role === 'assistant' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'}`}>{message.role === 'assistant' ? <Sparkles className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}</span>
            <div className={`group max-w-[82%] ${message.role === 'user' ? 'rounded-2xl rounded-tr-md bg-slate-900 px-3.5 py-2.5 text-white dark:bg-white dark:text-slate-900' : ''}`}>
              <p className={`whitespace-pre-wrap text-[13px] leading-6 ${message.role === 'assistant' ? 'text-slate-700 dark:text-slate-200' : ''}`}>{message.content}</p>
              {message.role === 'assistant' && message.id !== 'welcome' && (
                <div className="mt-2 flex items-center gap-1 opacity-70 transition group-hover:opacity-100">
                  <button onClick={() => onInsert(message.content)} className="flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300"><Plus className="h-3 w-3" /> Chèn vào trang</button>
                  <button onClick={async () => { await navigator.clipboard.writeText(message.content); setCopiedId(message.id); setTimeout(() => setCopiedId(''), 1600); }} className="grid h-6 w-6 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">{copiedId === message.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="flex items-center gap-2 text-xs font-medium text-slate-400"><span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40"><Wand2 className="h-3.5 w-3.5 animate-pulse text-indigo-500" /></span>Upgen AI đang suy nghĩ<span className="animate-pulse">…</span></div>}
      </div>

      <div className="shrink-0 border-t border-slate-200/80 bg-white/80 p-3 dark:border-slate-800 dark:bg-[#111318]/80">
        {messages.length <= 1 && <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">{QUICK_PROMPTS.map(prompt => <button key={prompt} onClick={() => submit(prompt)} className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10.5px] font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{prompt}</button>)}</div>}
        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition-within focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900">
          <textarea rows={2} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder="Hỏi về tài liệu, viết tiếp hoặc tạo bảng…" className="w-full resize-none bg-transparent px-1.5 py-1 text-[13px] leading-5 text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100" />
          <div className="flex items-center justify-between px-1"><span className="flex items-center gap-1 text-[9.5px] text-slate-400"><CornerDownLeft className="h-3 w-3" /> Enter để gửi</span><button onClick={() => submit()} disabled={!input.trim() || loading} className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-35"><Send className="h-3.5 w-3.5" /></button></div>
        </div>
      </div>
    </motion.aside>
  );
}
