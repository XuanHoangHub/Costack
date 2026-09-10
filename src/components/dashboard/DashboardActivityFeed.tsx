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
      className="apexa-inset-group p-4 sm:p-6 text-left"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.06] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/[0.04] text-slate-800 dark:bg-white/[0.06] dark:text-slate-200">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
              {locale === 'vi' ? 'Dòng hoạt động gần nhất' : 'Recent Workspace Activity'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {locale === 'vi' ? 'Nhật ký các thao tác tạo mới và cập nhật dữ liệu' : 'Real-time logs of updates and changes'}
            </p>
          </div>
        </div>

        {syncLogs.length > 0 && onClearSyncLogs && (
          <button
            type="button"
            onClick={onClearSyncLogs}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{locale === 'vi' ? 'Xóa nhật ký' : 'Clear'}</span>
          </button>
        )}
      </div>

      {/* Logs List: Apple hairline divider rows */}
      <div className="mt-2 max-h-[220px] overflow-y-auto divide-y divide-black/[0.05] dark:divide-white/[0.06] pr-1 custom-scrollbar">
        {syncLogs.length > 0 ? (
          syncLogs.slice(0, 10).map((log, index) => {
            const timeStr = log.time || '';

            return (
              <div
                key={log.id || index}
                className="flex items-center justify-between gap-3 py-2.5 px-1 text-xs hover:bg-black/[0.02] dark:hover:bg-white/[0.02] rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] shrink-0" />
                  <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                    {log.action}
                  </span>
                </div>
                {timeStr && (
                  <span className="shrink-0 text-[10px] font-numeric text-slate-400 dark:text-slate-500 tabular-nums">
                    {timeStr}
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 italic font-normal">
            {locale === 'vi' ? 'Chưa có hoạt động mới nào được ghi nhận.' : 'No recent activities recorded yet.'}
          </div>
        )}
      </div>
    </motion.section>
  );
}
