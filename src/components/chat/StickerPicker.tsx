"use client";

import React, { useState } from 'react';
import { X, Search, Sparkles, Smile, Briefcase, Zap, Heart } from 'lucide-react';

export interface StickerItem {
  id: string;
  name: string;
  category: 'work' | 'cat' | 'pepe' | 'reaction';
  emoji: string;
  label: string;
  svgIcon?: string;
  badgeColor?: string;
}

export const STICKER_PACKS: StickerItem[] = [
  // 💼 CÔNG SỞ & DEADLINE (Zalo / Workplace style)
  { id: 'w1', name: 'Approved', category: 'work', emoji: '✅', label: 'Duyệt luôn!', badgeColor: 'bg-emerald-500' },
  { id: 'w2', name: 'Deadline', category: 'work', emoji: '⏰', label: 'Deadline dí rồi!', badgeColor: 'bg-rose-500' },
  { id: 'w3', name: 'Meeting', category: 'work', emoji: '📞', label: 'Vào họp gấp!', badgeColor: 'bg-blue-500' },
  { id: 'w4', name: 'Coffee', category: 'work', emoji: '☕', label: 'Cà phê tỉnh táo', badgeColor: 'bg-amber-600' },
  { id: 'w5', name: 'Working', category: 'work', emoji: '💻', label: 'Đang cắm đầu làm', badgeColor: 'bg-indigo-500' },
  { id: 'w6', name: 'Done', category: 'work', emoji: '🎯', label: 'Xong nhiệm vụ!', badgeColor: 'bg-emerald-600' },
  { id: 'w7', name: 'OT', category: 'work', emoji: '🌙', label: 'Hôm nay OT nhé', badgeColor: 'bg-purple-600' },
  { id: 'w8', name: 'Money', category: 'work', emoji: '💸', label: 'Ting ting lương về', badgeColor: 'bg-teal-500' },
  { id: 'w9', name: 'Lunch', category: 'work', emoji: '🍱', label: 'Đi ăn trưa thôi', badgeColor: 'bg-orange-500' },
  { id: 'w10', name: 'Report', category: 'work', emoji: '📊', label: 'Đã gửi báo cáo', badgeColor: 'bg-sky-500' },

  // 🐱 MÈO VUI NHỘN (Cute Cats & Pets)
  { id: 'c1', name: 'Happy Cat', category: 'cat', emoji: '😸', label: 'Vui vẻ quá nè', badgeColor: 'bg-amber-400' },
  { id: 'c2', name: 'Love Cat', category: 'cat', emoji: '😻', label: 'Mê chữ ê kéo dài', badgeColor: 'bg-pink-500' },
  { id: 'c3', name: 'Crying Cat', category: 'cat', emoji: '😿', label: 'Trầm cảm nhẹ', badgeColor: 'bg-blue-400' },
  { id: 'c4', name: 'Shocked Cat', category: 'cat', emoji: '🙀', label: 'Ủa alo chuyện gì vậy?', badgeColor: 'bg-violet-500' },
  { id: 'c5', name: 'Sleepy Cat', category: 'cat', emoji: '😽', label: 'Buồn ngủ díu mắt', badgeColor: 'bg-indigo-400' },
  { id: 'c6', name: 'Angry Cat', category: 'cat', emoji: '😾', label: 'Hờn dỗi cả thế giới', badgeColor: 'bg-rose-400' },
  { id: 'c7', name: 'Paws Up', category: 'cat', emoji: '🐾', label: 'Xin vía thành công', badgeColor: 'bg-pink-400' },
  { id: 'c8', name: 'Cool Cat', category: 'cat', emoji: '😎', label: 'Mèo ngầu lòi', badgeColor: 'bg-cyan-500' },

  // 🐸 PEPE & MEMES
  { id: 'p1', name: 'Pepe Cheers', category: 'pepe', emoji: '🥂', label: 'Tuyệt vời anh em', badgeColor: 'bg-amber-500' },
  { id: 'p2', name: 'Pepe Cry', category: 'pepe', emoji: '😭', label: 'Khóc hết nước mắt', badgeColor: 'bg-sky-600' },
  { id: 'p3', name: 'Pepe Thinking', category: 'pepe', emoji: '🧐', label: 'Để tôi suy nghĩ kĩ', badgeColor: 'bg-purple-500' },
  { id: 'p4', name: 'Pepe Clown', category: 'pepe', emoji: '🤡', label: 'Hóa ra mình là chú hề', badgeColor: 'bg-rose-500' },
  { id: 'p5', name: 'Pepe Fire', category: 'pepe', emoji: '🔥', label: 'Cháy quá cháy luôn', badgeColor: 'bg-orange-500' },
  { id: 'p6', name: 'Pepe Mindblown', category: 'pepe', emoji: '🤯', label: 'Ảo ma Canada!', badgeColor: 'bg-violet-600' },

  // 🔥 HOT REACTIONS (Biểu Cảm Đỉnh Chóp)
  { id: 'r1', name: 'Love Heart', category: 'reaction', emoji: '💖', label: 'Thả ngàn tim', badgeColor: 'bg-pink-500' },
  { id: 'r2', name: 'Super 100', category: 'reaction', emoji: '💯', label: '100 Điểm uy tín', badgeColor: 'bg-rose-600' },
  { id: 'r3', name: 'Rocket', category: 'reaction', emoji: '🚀', label: 'Bứt phá tốc độ', badgeColor: 'bg-indigo-600' },
  { id: 'r4', name: 'Clap', category: 'reaction', emoji: '👏', label: 'Vỗ tay tán thưởng', badgeColor: 'bg-amber-500' },
  { id: 'r5', name: 'Respect', category: 'reaction', emoji: '🫡', label: 'Xin bái phục!', badgeColor: 'bg-blue-600' },
  { id: 'r6', name: 'Party', category: 'reaction', emoji: '🎉', label: 'Ăn mừng chiến thắng', badgeColor: 'bg-emerald-500' },
  { id: 'r7', name: 'Popcorn', category: 'reaction', emoji: '🍿', label: 'Ngồi hóng drama', badgeColor: 'bg-amber-400' },
  { id: 'r8', name: 'Ghost', category: 'reaction', emoji: '👻', label: 'Biến mất đây', badgeColor: 'bg-slate-500' },
];

interface StickerPickerProps {
  onSelectSticker: (sticker: StickerItem) => void;
  onClose: () => void;
}

export default function StickerPicker({ onSelectSticker, onClose }: StickerPickerProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'work' | 'cat' | 'pepe' | 'reaction'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStickers = STICKER_PACKS.filter(s => {
    const matchesTab = activeTab === 'all' || s.category === activeTab;
    const matchesSearch = !searchQuery.trim() || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.label.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <>
      <div className="fixed inset-0 z-40 cursor-default" onClick={onClose} />
      <div className="absolute bottom-16 right-4 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl z-50 w-84 animate-fadeIn text-left space-y-2.5">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center text-[11px] font-black shadow-xs">
              ✨
            </span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100">
              Nhãn Dán & Sticker (Zalo / Telegram)
            </span>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm sticker theo tên hoặc cảm xúc..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none font-semibold text-slate-800 dark:text-slate-100 focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[10px] font-bold">
          {[
            { id: 'all', label: 'Tất cả', icon: Sparkles },
            { id: 'work', label: 'Công sở', icon: Briefcase },
            { id: 'cat', label: 'Mèo cưng', icon: Smile },
            { id: 'pepe', label: 'Meme', icon: Zap },
            { id: 'reaction', label: 'Cảm xúc', icon: Heart },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-2.5 py-1 rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-xs font-black' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sticker Grid */}
        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
          {filteredStickers.map(sticker => (
            <button
              key={sticker.id}
              type="button"
              onClick={() => {
                onSelectSticker(sticker);
                onClose();
              }}
              className="group flex flex-col items-center justify-center p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 transition-all cursor-pointer active:scale-95 shadow-2xs hover:shadow-sm"
              title={sticker.label}
            >
              <div className="text-3xl mb-1 group-hover:scale-125 transition-transform duration-200 select-none">
                {sticker.emoji}
              </div>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate max-w-full group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                {sticker.label}
              </span>
            </button>
          ))}
          {filteredStickers.length === 0 && (
            <div className="col-span-3 py-8 text-center text-xs text-slate-400">
              Không tìm thấy sticker phù hợp
            </div>
          )}
        </div>
      </div>
    </>
  );
}
