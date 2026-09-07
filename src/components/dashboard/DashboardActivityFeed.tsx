"use client";

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Activity,
  Trash2,
  Clock,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { SyncLog } from '@/types';

interface DashboardActivityFeedProps {
  syncLogs: SyncLog[];
  onClearSyncLogs?: () => void;
}

export default function DashboardActivityFeed({
  syncLogs = [],
  onClearSyncLogs,
}: DashboardActivityFeedProps) {
  const { locale } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.section
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 150, damping: 22 }}
      className="rounded-[26px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_12px_36px_-24px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-slate-800 dark:bg-[#12141d]/95 sm:p-6 text-left"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {locale === 'vi' ? 'Dòng hoạt động gần nhất' : 'Recent Workspace Activity'}
            </h3>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              {locale === 'vi' ? 'Nhật ký các thao tác tạo mới và cập nhật dữ liệu' : 'Real-time logs of updates and changes'}
            </p>
          </div>
        </div>

        {syncLogs.length > 0 && onClearSyncLogs && (
          <button
            type="button"
            onClick={onClearSyncLogs}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{locale === 'vi' ? 'Xóa nhật ký' : 'Clear'}</span>
          </button>
        )}
      </div>

      {/* Logs List */}
      <div className="mt-4 max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {syncLogs.length > 0 ? (
          syncLogs.slice(0, 10).map((log, index) => {
            const timeStr = log.time || '';

            return (
              <div
                key={log.id || index}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs dark:border-slate-800/60 dark:bg-slate-900/40"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                  <span className="truncate font-semibold text-slate-700 dark:text-slate-300">
                    {log.action}
                  </span>
                </div>
                {timeStr && (
                  <span className="shrink-0 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    {timeStr}
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 italic font-medium">
            {locale === 'vi' ? 'Chưa có hoạt động mới nào được ghi nhận.' : 'No recent activities recorded yet.'}
          </div>
        )}
      </div>
    </motion.section>
  );
}
