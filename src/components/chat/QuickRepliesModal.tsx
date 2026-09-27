"use client";

import React, { useState, useEffect } from 'react';
import { X, Search, Zap, Plus, Trash2, Send, CornerDownLeft, Sparkles } from 'lucide-react';

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
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('Khác');
  const [newShortcut, setNewShortcut] = useState('');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
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

        {/* Top Controls: Search & Add button */}
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
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm mẫu</span>
          </button>
        </div>

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
