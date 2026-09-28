"use client";

import React from 'react';
import { RotateCcw, Trash2, X, AlertTriangle } from 'lucide-react';

interface RevokeMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRevokeForEveryone: () => void;
  onDeleteForMe: () => void;
  isSender: boolean;
}

export default function RevokeMessageModal({
  isOpen,
  onClose,
  onRevokeForEveryone,
  onDeleteForMe,
  isSender
}: RevokeMessageModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fadeIn">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-left space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
              {isSender ? 'Xóa hoặc Thu hồi tin nhắn' : 'Xóa tin nhắn'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {isSender
            ? 'Bạn muốn thu hồi tin nhắn này với tất cả mọi người hay chỉ xóa hiển thị ở phía bạn?'
            : 'Bạn có chắc chắn muốn xóa tin nhắn này khỏi chế độ xem của bạn không?'}
        </p>

        {/* Options */}
        <div className="space-y-2 pt-1">
          {isSender && (
            <button
              type="button"
              onClick={() => {
                onRevokeForEveryone();
                onClose();
              }}
              className="w-full p-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 hover:border-rose-400 dark:hover:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all flex items-start gap-3 cursor-pointer text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-black text-rose-600 dark:text-rose-400">
                  Thu hồi với mọi người (Unsend)
                </span>
                <span className="block text-[10.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  Tin nhắn sẽ bị thu hồi và thay thế bằng thông báo thu hồi với tất cả thành viên.
                </span>
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onDeleteForMe();
              onClose();
            }}
            className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-start gap-3 cursor-pointer text-left group"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-black text-slate-800 dark:text-slate-100">
                Xóa chỉ ở phía tôi (Delete for me)
              </span>
              <span className="block text-[10.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Chỉ ẩn tin nhắn này trên màn hình của bạn. Những người khác vẫn nhìn thấy bình thường.
              </span>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
        </div>
      </div>
    </div>
  );
}
