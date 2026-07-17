"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { Search, Sparkles, Smile, Image as ImageIcon } from 'lucide-react';

interface EmojiIconPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const EMOJIS = [
  // Work & Productivity
  { char: '📦', name: 'box' }, { char: '📋', name: 'clipboard' }, { char: '📅', name: 'calendar' }, 
  { char: '⏱️', name: 'timer' }, { char: '📊', name: 'chart' }, { char: '📁', name: 'folder' }, 
  { char: '📝', name: 'note' }, { char: '💻', name: 'laptop' }, { char: '🎯', name: 'target' }, 
  { char: '💡', name: 'idea' }, { char: '🧠', name: 'brain' }, { char: '🚀', name: 'rocket' },
  // Collaboration & Success
  { char: '🧘', name: 'meditate' }, { char: '🔮', name: 'crystal' }, { char: '📢', name: 'announcement' }, 
  { char: '🤝', name: 'handshake' }, { char: '🎉', name: 'celebrate' }, { char: '✨', name: 'sparkle' }, 
  { char: '🔥', name: 'fire' }, { char: '⭐', name: 'star' }, { char: '🏆', name: 'trophy' }, 
  { char: '🥇', name: 'medal' }, { char: '🎨', name: 'art' }, { char: '🎵', name: 'music' },
  // Tools & Flags
  { char: '🔑', name: 'key' }, { char: '🛡️', name: 'shield' }, { char: '📌', name: 'pin' }, 
  { char: '🏷️', name: 'tag' }, { char: '🔗', name: 'link' }, { char: '⚡', name: 'lightning' }, 
  { char: '📞', name: 'phone' }, { char: '🚩', name: 'flag' }, { char: '❤️', name: 'heart' }, 
  { char: '🔍', name: 'search' }, { char: '🔔', name: 'bell' }, { char: '⚙️', name: 'gear' }
];

const ICONS = [
  'Inbox', 'CheckSquare', 'List', 'Kanban', 'Table', 'Calendar', 'Sliders', 'GanttChart', 'Clock', 'Timer',
  'Sparkles', 'Shield', 'Key', 'Folder', 'Compass', 'Tag', 'Users', 'Activity', 'Brain', 'Link',
  'Droplet', 'Zap', 'Phone', 'Flag', 'Heart', 'Map', 'Award', 'Trophy', 'SlidersHorizontal', 'Star',
  'HelpCircle', 'Eye', 'EyeOff', 'Volume2', 'VolumeX', 'Plus', 'Pencil', 'Trash2', 'FolderOpen', 'Mail'
];

export const renderSpaceIcon = (iconStr: string, className = "w-4 h-4") => {
  if (!iconStr) return null;
  if (iconStr.length <= 2) {
    return <span className="text-sm shrink-0 leading-none select-none">{iconStr}</span>;
  }
  const IconComponent = (LucideIcons as any)[iconStr];
  if (IconComponent) {
    return <IconComponent className={`${className} shrink-0`} />;
  }
  return <span className="text-sm shrink-0 leading-none select-none">{iconStr}</span>;
};

export default function EmojiIconPicker({ value, onChange, className = "" }: EmojiIconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'emoji' | 'icon'>('emoji');
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

  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) return EMOJIS;
    const query = searchQuery.toLowerCase();
    return EMOJIS.filter(e => e.name.includes(query) || e.char.includes(query));
  }, [searchQuery]);

  const filteredIcons = useMemo(() => {
    if (!searchQuery.trim()) return ICONS;
    const query = searchQuery.toLowerCase();
    return ICONS.filter(name => name.toLowerCase().includes(query));
  }, [searchQuery]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-indigo-500 hover:bg-slate-100/50 dark:hover:bg-slate-900 transition-all shadow-3xs cursor-pointer select-none active:scale-[0.96]"
        title="Chọn Icon hoặc Emoji"
      >
        {renderSpaceIcon(value, "w-5 h-5 text-indigo-500")}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl shadow-2xl p-3.5 z-[99] animate-in fade-in slide-in-from-top-1 duration-200">
          
          {/* Tab Selection */}
          <div className="flex bg-slate-50 dark:bg-slate-955 p-1 rounded-xl gap-1 mb-3">
            <button
              type="button"
              onClick={() => { setActiveTab('emoji'); setSearchQuery(''); }}
              className={`flex-1 py-1.5 rounded-lg text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'emoji'
                  ? 'bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-400 shadow-3xs'
                  : 'text-slate-400 hover:text-slate-655 dark:hover:text-slate-350'
              }`}
            >
              <Smile className="w-3.5 h-3.5" />
              <span>Emojis</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('icon'); setSearchQuery(''); }}
              className={`flex-1 py-1.5 rounded-lg text-[10.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'icon'
                  ? 'bg-white dark:bg-slate-855 text-indigo-650 dark:text-indigo-400 shadow-3xs'
                  : 'text-slate-400 hover:text-slate-655 dark:hover:text-slate-350'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Icons</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder={activeTab === 'emoji' ? "Tìm kiếm emoji..." : "Tìm kiếm icon..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl pl-8.5 pr-3.5 py-1.5 text-xs font-semibold outline-none text-slate-800 dark:text-slate-100 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Emoji Grid */}
          {activeTab === 'emoji' && (
            <div className="max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
              {filteredEmojis.length === 0 ? (
                <div className="text-center text-slate-400 italic text-[11px] py-6">Không tìm thấy emoji tương ứng</div>
              ) : (
                <div className="grid grid-cols-6 gap-2">
                  {filteredEmojis.map(emoji => (
                    <button
                      key={emoji.char}
                      type="button"
                      onClick={() => handleSelect(emoji.char)}
                      className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-lg transition-colors cursor-pointer select-none active:scale-90"
                      title={emoji.name}
                    >
                      {emoji.char}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Icon Grid */}
          {activeTab === 'icon' && (
            <div className="max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
              {filteredIcons.length === 0 ? (
                <div className="text-center text-slate-400 italic text-[11px] py-6">Không tìm thấy icon tương ứng</div>
              ) : (
                <div className="grid grid-cols-6 gap-2">
                  {filteredIcons.map(name => {
                    const IconComponent = (LucideIcons as any)[name];
                    if (!IconComponent) return null;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleSelect(name)}
                        className={`w-8 h-8 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex items-center justify-center text-slate-500 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors cursor-pointer select-none active:scale-90 border ${
                          value === name
                            ? 'border-indigo-500 bg-indigo-500/5 text-indigo-605 dark:text-indigo-400'
                            : 'border-transparent'
                        }`}
                        title={name}
                      >
                        <IconComponent className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
