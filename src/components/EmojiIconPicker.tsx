"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { Search, LayoutGrid } from 'lucide-react';

interface EmojiIconPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Map legacy emoji strings to modern single-color Lucide Icons
export const EMOJI_TO_LUCIDE_MAP: Record<string, string> = {
  '📦': 'Package',
  '📋': 'ClipboardList',
  '📅': 'Calendar',
  '⏱️': 'Timer',
  '⏱': 'Timer',
  '📊': 'BarChart3',
  '📁': 'Folder',
  '📝': 'FileText',
  '💻': 'Laptop',
  '🎯': 'Target',
  '💡': 'Lightbulb',
  '🧠': 'Brain',
  '🚀': 'Rocket',
  '🧘': 'Activity',
  '🔮': 'Sparkles',
  '📢': 'Megaphone',
  '🤝': 'Handshake',
  '🎉': 'Sparkles',
  '✨': 'Sparkles',
  '🔥': 'Flame',
  '⭐': 'Star',
  '🏆': 'Trophy',
  '🥇': 'Award',
  '🎨': 'Palette',
  '🎵': 'Music',
  '🔑': 'Key',
  '🛡️': 'Shield',
  '🛡': 'Shield',
  '📌': 'Pin',
  '🏷️': 'Tag',
  '🏷': 'Tag',
  '🔗': 'Link',
  '⚡': 'Zap',
  '📞': 'Phone',
  '🚩': 'Flag',
  '❤️': 'Heart',
  '❤': 'Heart',
  '🔍': 'Search',
  '🔔': 'Bell',
  '⚙️': 'Settings',
  '⚙': 'Settings',
  '👥': 'Users',
  '✅': 'CheckSquare',
  '⚠️': 'AlertTriangle',
  '💪': 'Shield',
  '💳': 'CreditCard',
  '🔴': 'AlertOctagon',
  '🟠': 'AlertTriangle',
  '🟡': 'CircleDot',
  '⚪': 'Circle',
};

// Clean categories of monochromatic Lucide Icons
export const ICON_CATEGORIES = [
  {
    name: 'Work & Projects',
    icons: ['Package', 'ClipboardList', 'Folder', 'FolderOpen', 'FileText', 'Calendar', 'Clock', 'Timer', 'Kanban', 'Table', 'GanttChart', 'List', 'CheckSquare']
  },
  {
    name: 'Strategy & Intelligence',
    icons: ['Target', 'Lightbulb', 'Brain', 'Rocket', 'Sparkles', 'Activity', 'BarChart3', 'Compass', 'Zap', 'Trophy', 'Award', 'Star']
  },
  {
    name: 'Team & Communication',
    icons: ['Users', 'Handshake', 'Megaphone', 'Mail', 'Phone', 'Bell', 'Heart', 'Shield', 'Key', 'Lock']
  },
  {
    name: 'Tools & Controls',
    icons: ['Settings', 'Sliders', 'SlidersHorizontal', 'Pin', 'Tag', 'Link', 'Palette', 'Search', 'CreditCard', 'Music', 'Laptop', 'Flame']
  }
];

export const ALL_ICONS = Array.from(new Set(ICON_CATEGORIES.flatMap(cat => cat.icons)));

export const renderSpaceIcon = (iconStr: string, className = "w-4 h-4") => {
  if (!iconStr) return <LucideIcons.Package className={`${className} shrink-0`} />;

  // Resolve legacy emoji or direct icon name
  const targetName = EMOJI_TO_LUCIDE_MAP[iconStr] || iconStr;
  const IconComponent = (LucideIcons as any)[targetName];

  if (IconComponent) {
    return <IconComponent className={`${className} shrink-0`} />;
  }

  return <LucideIcons.Package className={`${className} shrink-0`} />;
};

export default function EmojiIconPicker({ value, onChange, className = "" }: EmojiIconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const filteredIcons = useMemo(() => {
    let sourceIcons = ALL_ICONS;
    if (activeCategory !== 'All') {
      const cat = ICON_CATEGORIES.find(c => c.name === activeCategory);
      if (cat) sourceIcons = cat.icons;
    }
    if (!searchQuery.trim()) return sourceIcons;
    const query = searchQuery.toLowerCase();
    return ALL_ICONS.filter(name => name.toLowerCase().includes(query));
  }, [searchQuery, activeCategory]);

  const handleSelect = (iconName: string) => {
    onChange(iconName);
    setIsOpen(false);
  };

  const selectedIconName = EMOJI_TO_LUCIDE_MAP[value] || value;

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-indigo-500 hover:bg-slate-100/50 dark:hover:bg-slate-900 transition-all shadow-3xs cursor-pointer select-none active:scale-[0.96]"
        title="Chọn Biểu tượng (Icon)"
      >
        {renderSpaceIcon(value, "w-5 h-5 text-indigo-600 dark:text-indigo-400")}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3.5 z-[99] animate-in fade-in slide-in-from-top-1 duration-200">
          
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-500" />
              Chọn Biểu Tượng SVG
            </span>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Monochromatic</span>
          </div>

          {/* Search Box */}
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Tìm kiếm icon (VD: Rocket, Folder)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8.5 pr-3 py-1.5 text-xs font-medium outline-none text-slate-800 dark:text-slate-100 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Category Chips */}
          <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-2 mb-2">
            <button
              type="button"
              onClick={() => setActiveCategory('All')}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === 'All'
                  ? 'bg-indigo-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Tất cả
            </button>
            {ICON_CATEGORIES.map(cat => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setActiveCategory(cat.name)}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === cat.name
                    ? 'bg-indigo-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Icon Grid */}
          <div className="max-h-52 overflow-y-auto custom-scrollbar pr-0.5">
            {filteredIcons.length === 0 ? (
              <div className="text-center text-slate-400 italic text-[11px] py-8">Không tìm thấy icon phù hợp</div>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {filteredIcons.map(name => {
                  const IconComponent = (LucideIcons as any)[name];
                  if (!IconComponent) return null;
                  const isSelected = selectedIconName === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleSelect(name)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 border ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={name}
                    >
                      <IconComponent className="w-4.5 h-4.5" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
