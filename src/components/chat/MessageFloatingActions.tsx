"use client";

import React, { useState } from 'react';
import { CornerUpLeft, Cloud, MoreHorizontal, SmilePlus } from 'lucide-react';

interface MessageFloatingActionsProps {
  messageId: string;
  isMe: boolean;
  isRevoked?: boolean;
  onReact: (emoji: string) => void;
  onOpenFullEmojiPicker: () => void;
  onReply: () => void;
  onSaveToCloud: () => void;
  onToggleMoreMenu: () => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉'];

export default function MessageFloatingActions({
  messageId,
  isMe,
  isRevoked,
  onReact,
  onOpenFullEmojiPicker,
  onReply,
  onSaveToCloud,
  onToggleMoreMenu
}: MessageFloatingActionsProps) {
  if (isRevoked) return null;

  return (
    <div
      className={`absolute -top-4 z-20 hidden group-hover:flex items-center gap-0.5 px-1.5 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-md backdrop-blur-md animate-fadeIn select-none transition-all ${
        isMe ? 'right-2' : 'left-2'
      }`}
    >
      {/* Quick Reaction Emojis */}
      <div className="flex items-center gap-0.5 pr-1 border-r border-slate-100 dark:border-slate-800">
        {QUICK_EMOJIS.map(emoji => (
          <button
            key={emoji}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReact(emoji);
            }}
            className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-xs transition-transform hover:scale-135 active:scale-95 cursor-pointer"
            title={`Thả ${emoji}`}
          >
            {emoji}
          </button>
        ))}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenFullEmojiPicker();
          }}
          className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
          title="Thêm biểu cảm khác"
        >
          <SmilePlus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action Buttons: Reply, Save to Cloud, More */}
      <div className="flex items-center gap-0.5 pl-0.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReply();
          }}
          className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
          title="Trả lời (Reply)"
        >
          <CornerUpLeft className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSaveToCloud();
          }}
          className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400 transition-colors cursor-pointer"
          title="Lưu vào Cloud của tôi (Saved Messages)"
        >
          <Cloud className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMoreMenu();
          }}
          className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
          title="Tùy chọn khác"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
