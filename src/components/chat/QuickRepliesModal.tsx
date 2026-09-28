"use client";

import React, { useState, useEffect } from 'react';
import { X, Search, Zap, Plus, Trash2, Send, CornerDownLeft, Sparkles, RefreshCw } from 'lucide-react';
import { callAiApi } from '@/lib/aiClient';

export interface QuickReplyItem {
  id: string;
  title: string;
  content: string;
  category: string;
  shortcut?: string;
}

const DEFAULT_QUICK_REPLIES: QuickReplyItem[] = [
  {
    id: 'qr-1',
    shortcut: '/nhan',
    title: 'Đã nhận thông tin',
    content: 'Dạ vâng, tôi đã nhận được thông tin và đang xử lý ngay ạ! ⏳',
    category: 'Xác nhận'
  },
  {
    id: 'qr-2',
    shortcut: '/xong',
    title: 'Hoàn thành công việc',
    content: 'Công việc đã được hoàn thành, mời bạn kiểm tra và phản hồi giúp nhé! ✅',
    category: 'Tiến độ'
  },
  {
    id: 'qr-3',
    shortcut: '/hop',
    title: 'Đang trong cuộc họp',
    content: 'Hiện tôi đang trong cuộc họp, tôi sẽ phản hồi lại ngay sau khi họp xong nhé! 📞',
    category: 'Trạng thái'
  },
  {
    id: 'qr-4',
    shortcut: '/camon',
    title: 'Cảm ơn đồng đội',
    content: 'Cảm ơn bạn rất nhiều! Chúc bạn một ngày làm việc hiệu quả và tràn đầy năng lượng! 🌟',
    category: 'Giao tiếp'
  },
  {
    id: 'qr-5',
    shortcut: '/file',
    title: 'Yêu cầu gửi lại tài liệu',
    content: 'Bạn vui lòng gửi lại tệp đính kèm hoặc hình ảnh rõ nét hơn giúp mình nhé! 📎',
    category: 'Yêu cầu'
  },
  {
    id: 'qr-6',
    shortcut: '/duyet',
    title: 'Đồng ý / Phê duyệt',
    content: 'Phương án này rất hợp lý, tôi hoàn toàn đồng ý! Tiến hành triển khai thôi. 🚀',
    category: 'Xác nhận'
  },
  {
    id: 'qr-7',
    shortcut: '/deadline',
    title: 'Nhắc hẹn hạn chót',
    content: 'Xin lưu ý hạn chót của nhiệm vụ này là 17:00 hôm nay, các bạn chú ý giúp nhé! ⏰',
    category: 'Tiến độ'
  },
  {
    id: 'qr-8',
    shortcut: '/chao',
    title: 'Chào buổi sáng',
    content: 'Chào buổi sáng cả nhà! Chúc mọi người ngày mới làm việc vui vẻ và hiệu quả! ☀️',
    category: 'Giao tiếp'
  }
];

interface QuickRepliesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (content: string, sendImmediately?: boolean) => void;
}

export default function QuickRepliesModal({ isOpen, onClose, onSelect }: QuickRepliesModalProps) {
  const [replies, setReplies] = useState<QuickReplyItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('costack_chat_quick_replies');
        return saved ? JSON.parse(saved) : DEFAULT_QUICK_REPLIES;
      } catch {
        return DEFAULT_QUICK_REPLIES;
      }
    }
    return DEFAULT_QUICK_REPLIES;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAiGenerator, setShowAiGenerator] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<QuickReplyItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('Khác');
  const [newShortcut, setNewShortcut] = useState('');

  const handleGenerateAiReplies = async () => {
    if (!aiTopic.trim()) return;
    setIsGeneratingAi(true);
    try {
      const prompt = `Bạn là trợ lý giao tiếp Costack AI. Hãy tạo 3 mẫu câu trả lời nhanh (Quick Replies) cho tình huống sau:
"${aiTopic.trim()}"

Trả về đúng định dạng JSON là một mảng gồm 3 object:
[
  {
    "title": "Tên ngắn gọn gợi nhớ (dưới 5 từ)",
    "content": "Nội dung câu trả lời hoàn chỉnh, tự nhiên, lịch sự (có emoji phù hợp)",
    "category": "Giao tiếp",
    "shortcut": "/tu_khoa"
  }
]
Chỉ trả về JSON thuần túy, không có text giải thích ngoài JSON.`;

      const res = await callAiApi('/api/ai/chat', { message: prompt, history: [] });
      const data = await res.json();
      if (data.success && data.text) {
        let raw = data.text.trim();
        if (raw.startsWith('```json')) raw = raw.slice(7);
        if (raw.startsWith('```')) raw = raw.slice(3);
        if (raw.endsWith('```')) raw = raw.slice(0, -3);
        const parsed = JSON.parse(raw.trim());
        if (Array.isArray(parsed)) {
          const mapped: QuickReplyItem[] = parsed.map((item, idx) => ({
            id: `qr-ai-${Date.now()}-${idx}`,
            title: item.title || 'Mẫu câu AI',
            content: item.content || '',
            category: item.category || 'Giao tiếp',
            shortcut: item.shortcut ? (item.shortcut.startsWith('/') ? item.shortcut : `/${item.shortcut}`) : undefined
          }));
          setAiSuggestions(mapped);
        }
      }
    } catch (err) {
      console.error('Failed to generate quick replies with AI:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleAcceptAiSuggestion = (item: QuickReplyItem) => {
    setReplies(prev => [item, ...prev]);
    setAiSuggestions(prev => prev.filter(s => s.id !== item.id));
  };

  useEffect(() => {
    try {
      localStorage.setItem('costack_chat_quick_replies', JSON.stringify(replies));
    } catch {}
  }, [replies]);

  if (!isOpen) return null;

  const categories = ['all', ...Array.from(new Set(replies.map(r => r.category)))];

  const filteredReplies = replies.filter(r => {
    const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;
    const matchesSearch = !searchQuery.trim() || 
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.shortcut && r.shortcut.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleAddQuickReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newItem: QuickReplyItem = {
      id: `qr-${Date.now()}`,
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory.trim() || 'Khác',
      shortcut: newShortcut.trim().startsWith('/') ? newShortcut.trim() : (newShortcut.trim() ? `/${newShortcut.trim()}` : undefined)
    };

    setReplies(prev => [newItem, ...prev]);
    setNewTitle('');
    setNewContent('');
    setNewShortcut('');
    setShowAddForm(false);
  };

  const handleDeleteReply = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReplies(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-left space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                Tin nhắn nhanh (Zalo Quick Replies)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Gửi câu trả lời thường dùng chỉ bằng 1 cú nhấp chuột
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Controls: Search, AI button & Add button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm tin nhắn mẫu hoặc phím tắt..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 outline-none font-semibold text-slate-800 dark:text-slate-100 focus:border-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={() => { setShowAiGenerator(!showAiGenerator); setShowAddForm(false); }}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
            title="Dùng AI để tự động tạo các mẫu câu trả lời nhanh phù hợp theo tình huống"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI tạo mẫu ✨</span>
          </button>
          <button
            type="button"
            onClick={() => { setShowAddForm(!showAddForm); setShowAiGenerator(false); }}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm mẫu</span>
          </button>
        </div>

        {/* AI Quick Reply Generator Panel */}
        {showAiGenerator && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-500/20 space-y-3 shrink-0 animate-fadeIn">
            <div className="flex items-center justify-between pb-1 border-b border-purple-500/20">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-300 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>AI Sinh Mẫu Câu Trả Lời Nhanh</span>
              </span>
              <button type="button" onClick={() => setShowAiGenerator(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleGenerateAiReplies();
                  }
                }}
                placeholder="Nhập tình huống (VD: Từ chối nhẹ nhàng việc đổi deadline, Báo giá sơ bộ...)"
                className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/60 outline-none font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={handleGenerateAiReplies}
                disabled={isGeneratingAi || !aiTopic.trim()}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isGeneratingAi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{isGeneratingAi ? 'Đang tạo...' : 'Tạo'}</span>
              </button>
            </div>
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1">
              {['Từ chối nhận thêm việc', 'Hẹn phản hồi sau 1 tiếng', 'Báo cáo đã test xong', 'Yêu cầu thêm tài liệu'].map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => { setAiTopic(chip); }}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white/70 dark:bg-slate-800/70 border border-purple-200/50 dark:border-purple-900/50 text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer transition"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* AI Generated Suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-purple-500/20">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Đề xuất từ Costack AI (Bấm để thêm vào danh sách):
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {aiSuggestions.map(s => (
                    <div
                      key={s.id}
                      className="p-2 rounded-xl bg-white dark:bg-slate-800/90 border border-purple-200 dark:border-purple-800/50 flex items-start justify-between gap-2 shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{s.title}</span>
                          {s.shortcut && <span className="text-[9px] font-mono font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/60 px-1 rounded">{s.shortcut}</span>}
                          <span className="text-[9px] text-slate-400">· {s.category}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">{s.content}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAcceptAiSuggestion(s)}
                        className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shrink-0 cursor-pointer transition shadow-2xs"
                      >
                        + Thêm
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add New Quick Reply Inline Form */}
        {showAddForm && (
          <form onSubmit={handleAddQuickReply} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 shrink-0 animate-fadeIn">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Thêm tin nhắn nhanh mới
              </span>
              <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Tiêu đề gợi nhớ (VD: Đang bận)"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                required
                className="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none font-semibold text-slate-800 dark:text-slate-100"
              />
              <input
                type="text"
                placeholder="Phím tắt (VD: /ban)"
                value={newShortcut}
                onChange={e => setNewShortcut(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none font-mono text-slate-800 dark:text-slate-100"
              />
            </div>
            <textarea
              placeholder="Nội dung tin nhắn sẽ gửi đi..."
              rows={2}
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              required
              className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none font-medium text-slate-800 dark:text-slate-100 resize-none"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-3.5 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer shadow-xs"
              >
                Lưu tin nhắn nhanh
              </button>
            </div>
          </form>
        )}

        {/* Category Pills */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none shrink-0 text-[10.5px] font-bold">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-xl transition-colors cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 font-black'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {cat === 'all' ? 'Tất cả' : cat}
            </button>
          ))}
        </div>

        {/* List of Quick Replies */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin min-h-[200px]">
          {filteredReplies.map(r => (
            <div
              key={r.id}
              className="group p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex items-start justify-between gap-3 shadow-2xs hover:shadow-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                    {r.title}
                  </span>
                  {r.shortcut && (
                    <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono text-[9.5px] font-bold">
                      {r.shortcut}
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-semibold ml-auto">
                    {r.category}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                  {r.content}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onSelect(r.content, false);
                    onClose();
                  }}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title="Chèn vào ô nhập"
                >
                  <CornerDownLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(r.content, true);
                    onClose();
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                  title="Gửi ngay vào chat"
                >
                  <Send className="w-3.5 h-3.5 fill-current" />
                  <span>Gửi</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteReply(r.id, e)}
                  className="p-1.5 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
                  title="Xóa mẫu này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {filteredReplies.length === 0 && (
            <div className="text-center py-10 text-xs text-slate-400">
              Không tìm thấy tin nhắn nhanh nào phù hợp
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
