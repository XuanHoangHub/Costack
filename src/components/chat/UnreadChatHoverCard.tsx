"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Send, Check, CheckCheck, 
  ExternalLink, CornerDownLeft, Sparkles, X, User
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { playClickSound, playChatSentSound } from '@/lib/soundEffects';

export interface UnreadChatSender {
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  channelId: string;
  workspaceId?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isDm?: boolean;
  channelName?: string;
}

export interface UnreadChatHoverCardProps {
  senders: UnreadChatSender[];
  onQuickReply: (sender: UnreadChatSender) => void;
  onSendInlineReply?: (sender: UnreadChatSender, messageText: string) => Promise<boolean>;
  onMarkAsRead: (senderId: string, channelId: string) => void;
  onMarkAllAsRead: () => void;
  onOpenFullChat: () => void;
  onClose?: () => void;
  className?: string;
}

export function UnreadChatHoverCard({
  senders,
  onQuickReply,
  onSendInlineReply,
  onMarkAsRead,
  onMarkAllAsRead,
  onOpenFullChat,
  onClose,
  className = '',
}: UnreadChatHoverCardProps) {
  const { isVietnamese } = useTranslation();
  const [activeReplySenderId, setActiveReplySenderId] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [sendingState, setSendingState] = useState<Record<string, boolean>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Ensure we only show unread senders with count > 0
  const activeSenders = senders.filter((s) => s.unreadCount > 0);

  // Focus input when inline reply is opened
  useEffect(() => {
    if (activeReplySenderId && inputRefs.current[activeReplySenderId]) {
      setTimeout(() => {
        inputRefs.current[activeReplySenderId]?.focus();
      }, 80);
    }
  }, [activeReplySenderId]);

  const handleToggleInlineReply = (senderId: string) => {
    playClickSound();
    setActiveReplySenderId((prev) => (prev === senderId ? null : senderId));
  };

  const handleSendReply = async (sender: UnreadChatSender) => {
    const text = (replyTexts[sender.senderId] || '').trim();
    if (!text || !onSendInlineReply) return;

    setSendingState((prev) => ({ ...prev, [sender.senderId]: true }));
    try {
      const success = await onSendInlineReply(sender, text);
      if (success) {
        playChatSentSound?.();
        setReplyTexts((prev) => ({ ...prev, [sender.senderId]: '' }));
        setActiveReplySenderId(null);
      }
    } finally {
      setSendingState((prev) => ({ ...prev, [sender.senderId]: false }));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 4, filter: 'blur(4px)' }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.94, y: 4, filter: 'blur(4px)' }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className={`pointer-events-auto relative w-[370px] max-w-[calc(100vw-32px)] flex flex-col rounded-2xl border border-slate-200/90 dark:border-white/[0.12] bg-white/95 dark:bg-[#0c0e14]/95 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-2xl overflow-hidden text-left select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Decorative Top Accent Glow */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-amber-500" />

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2.5 border-b border-slate-100 dark:border-white/[0.08]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-lg bg-rose-400 opacity-60" />
            <MessageSquare className="h-4 w-4 relative" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[13px] text-slate-900 dark:text-white tracking-tight">
                {isVietnamese ? 'Tin nhắn chưa đọc' : 'Unread Messages'}
              </span>
              {activeSenders.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-extrabold text-[9.5px] tabular-nums">
                  {activeSenders.length}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">
              {isVietnamese ? 'Chỉ người gửi trực tiếp chưa đọc' : 'Direct messages from other users'}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {activeSenders.length > 0 && (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onMarkAllAsRead();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.08] transition-colors"
              title={isVietnamese ? 'Đánh dấu tất cả đã đọc' : 'Mark all as read'}
            >
              <CheckCheck className="h-3.5 w-3.5 text-blue-500 dark:text-sky-400" />
              <span>{isVietnamese ? 'Đã đọc hết' : 'Read all'}</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-500 dark:hover:text-white dark:hover:bg-white/[0.08] transition-colors"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Senders List */}
      <div className="max-h-[380px] overflow-y-auto custom-scrollbar p-2 space-y-1.5">
        {activeSenders.length === 0 ? (
          <div className="py-7 px-4 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 flex items-center justify-center mb-2">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
              {isVietnamese ? 'Tuyệt vời! Không có tin nhắn mới' : 'All caught up! No unread messages'}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
              {isVietnamese ? 'Bạn đã đọc tất cả tin nhắn từ đồng nghiệp' : 'You have answered all incoming chats'}
            </p>
          </div>
        ) : (
          activeSenders.map((sender) => {
            const isReplyOpen = activeReplySenderId === sender.senderId;
            const currentReplyText = replyTexts[sender.senderId] || '';
            const isSubmitting = sendingState[sender.senderId] || false;

            return (
              <motion.div
                key={sender.senderId}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={`group rounded-xl p-2.5 transition-all border ${
                  isReplyOpen
                    ? 'border-blue-500/40 bg-blue-50/50 dark:border-sky-500/30 dark:bg-blue-500/10 shadow-xs'
                    : 'border-slate-100/80 bg-slate-50/70 hover:bg-slate-100/90 dark:border-white/[0.05] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]'
                }`}
              >
                {/* Sender Top Line: Avatar + Name + Time + Unread Pill */}
                <div className="flex items-start gap-2.5">
                  {/* User Avatar with Presence Dot */}
                  <div className="relative shrink-0">
                    {sender.senderAvatar ? (
                      <img
                        src={sender.senderAvatar}
                        alt={sender.senderName}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-white dark:ring-[#121318]"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-white dark:ring-[#121318]">
                        {sender.senderName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    {/* Active Presence Dot */}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0c0e14]" />
                  </div>

                  {/* Info: Name & Preview */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                        {sender.senderName}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                          {sender.timestamp}
                        </span>
                        {sender.unreadCount > 0 && (
                          <span className="min-w-[17px] h-[17px] px-1 rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-[9px] flex items-center justify-center shadow-xs tabular-nums">
                            {sender.unreadCount > 9 ? '9+' : sender.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Message Preview Snippet */}
                    <p className="text-[11.5px] text-slate-600 dark:text-zinc-300 leading-snug line-clamp-2 mt-0.5 break-words font-normal">
                      {sender.lastMessage || (isVietnamese ? 'Tin nhắn mới' : 'New message')}
                    </p>
                  </div>
                </div>

                {/* Quick Actions Row */}
                <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-white/[0.06] flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    {/* Primary Reply Jump Button */}
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        onQuickReply(sender);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-[11px] shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
                    >
                      <CornerDownLeft className="h-3 w-3" />
                      <span>{isVietnamese ? 'Trả lời' : 'Reply'}</span>
                    </button>

                    {/* Inline Quick Reply Toggle Button */}
                    {onSendInlineReply && (
                      <button
                        type="button"
                        onClick={() => handleToggleInlineReply(sender.senderId)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium text-[11px] transition-colors cursor-pointer ${
                          isReplyOpen
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-sky-300'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.08]'
                        }`}
                      >
                        <span>{isVietnamese ? 'Phản hồi nhanh' : 'Quick reply'}</span>
                      </button>
                    )}
                  </div>

                  {/* Mark this sender as read */}
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      onMarkAsRead(sender.senderId, sender.channelId);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:text-zinc-500 dark:hover:text-emerald-400 dark:hover:bg-emerald-500/10 transition-colors cursor-pointer"
                    title={isVietnamese ? 'Đánh dấu đã đọc' : 'Mark as read'}
                    aria-label="Mark as read"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Inline Quick Reply Box */}
                <AnimatePresence>
                  {isReplyOpen && onSendInlineReply && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.16 }}
                      className="overflow-hidden mt-2 pt-2 border-t border-blue-200/60 dark:border-sky-500/20"
                    >
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendReply(sender);
                        }}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          ref={(el) => {
                            inputRefs.current[sender.senderId] = el;
                          }}
                          type="text"
                          value={currentReplyText}
                          onChange={(e) =>
                            setReplyTexts((prev) => ({
                              ...prev,
                              [sender.senderId]: e.target.value,
                            }))
                          }
                          placeholder={
                            isVietnamese
                              ? `Nhắn nhanh cho ${sender.senderName}...`
                              : `Quick reply to ${sender.senderName}...`
                          }
                          className="flex-1 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          disabled={isSubmitting}
                        />
                        <button
                          type="submit"
                          disabled={!currentReplyText.trim() || isSubmitting}
                          className="flex items-center justify-center h-7 w-7 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
                          title={isVietnamese ? 'Gửi tin nhắn' : 'Send message'}
                        >
                          <Send className="h-3 w-3" />
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-slate-100 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onOpenFullChat();
          }}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50/80 dark:text-sky-400 dark:hover:text-sky-300 dark:hover:bg-blue-500/10 transition-colors cursor-pointer"
        >
          <span>{isVietnamese ? 'Mở toàn bộ phòng Chat' : 'Open Full Chat'}</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export default UnreadChatHoverCard;
