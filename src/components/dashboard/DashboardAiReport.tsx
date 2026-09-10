"use client";

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Sparkles,
  Bot,
  Copy,
  Check,
  AlertCircle,
  LockKeyhole,
  Crown,
  RotateCw
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { callAiApi } from '@/lib/aiClient';
import { Task, User } from '@/types';

interface DashboardAiReportProps {
  tasks: Task[];
  members: User[];
  isPremium?: boolean;
  onUpgradePremium?: () => void;
  onAddSyncLog?: (action: string) => void;
  triggerToast?: (type: 'success' | 'info' | 'message', title: string, message: string) => void;
  completedTasks: number;
  totalTasks: number;
  totalLoggedHours: number;
  totalEstimatedHours: number;
  assignedMemberCount: number;
}

export default function DashboardAiReport({
  tasks,
  members,
  isPremium,
  onUpgradePremium,
  onAddSyncLog,
  triggerToast,
  completedTasks,
  totalTasks,
  totalLoggedHours,
  totalEstimatedHours,
  assignedMemberCount,
}: DashboardAiReportProps) {
  const { locale } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [reportText, setReportText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const accuracyPercentage = totalEstimatedHours > 0
    ? Math.min(100, Math.round((Math.min(totalLoggedHours, totalEstimatedHours) / Math.max(totalLoggedHours, totalEstimatedHours)) * 100))
    : 0;

  const handleGenerateReport = async () => {
    if (!isPremium) {
      onUpgradePremium?.();
      return;
    }
    setIsGenerating(true);
    setReportError('');
    try {
      const response = await callAiApi('/api/ai/productivity-report', { tasks, members });
      const data = await response.json();
      if (data.success) {
        setReportText(data.text);
        if (onAddSyncLog) {
          onAddSyncLog(locale === 'vi' ? 'Đã tạo báo cáo năng suất bằng Gemini AI.' : 'Generated productivity report via Gemini AI.');
        }
      } else {
        throw new Error(data.error || (locale === 'vi' ? 'Không thể kết nối máy chủ AI.' : 'Failed to connect to AI server.'));
      }
    } catch (err: any) {
      console.error(err);
      setReportError(err.message || (locale === 'vi' ? 'Không thể kết nối Apexa AI. Vui lòng thử lại.' : 'Could not connect to Apexa AI. Please retry.'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyReport = () => {
    if (!reportText) return;
    navigator.clipboard.writeText(reportText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    triggerToast?.(
      'success',
      locale === 'vi' ? 'Đã sao chép báo cáo' : 'Report Copied',
      locale === 'vi' ? 'Nội dung báo cáo đã được lưu vào bộ nhớ tạm.' : 'Report content copied to clipboard.'
    );
  };

  // Helper function to render text to clean markdown
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return (
      <div className="space-y-3 text-slate-700 dark:text-slate-200 text-xs sm:text-sm leading-relaxed text-left">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('###')) {
            return (
              <h4 key={i} className="text-xs font-semibold uppercase tracking-wider text-[#0071E3] dark:text-[#0A84FF] mt-4 mb-2 flex items-center gap-1.5 border-b border-black/[0.05] dark:border-white/[0.06] pb-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{trimmed.replace('###', '').trim()}</span>
              </h4>
            );
          }
          if (trimmed.startsWith('##')) {
            return (
              <h3 key={i} className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white mt-5 mb-2">
                {trimmed.replace('##', '').trim()}
              </h3>
            );
          }
          if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
            const clean = trimmed.replace(/^[\s-*]+/, '').trim();
            const boldMatch = clean.match(/^\*\*(.*?)\*\*(.*)/);
            return (
              <div key={i} className="flex gap-2 ml-2 items-start text-xs">
                <span className="text-[#0071E3] dark:text-[#0A84FF] font-bold mt-1 text-[8px] shrink-0">•</span>
                <span>
                  {boldMatch ? (
                    <>
                      <strong className="text-slate-900 dark:text-white font-semibold">{boldMatch[1]}</strong>
                      {boldMatch[2]}
                    </>
                  ) : clean}
                </span>
              </div>
            );
          }
          const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
          if (numMatch) {
            const num = numMatch[1];
            const content = numMatch[2];
            const boldMatch = content.match(/^\*\*(.*?)\*\*(.*)/);
            return (
              <div key={i} className="flex gap-2 ml-1 items-start text-xs">
                <span className="shrink-0 w-4 h-4 rounded-full bg-black/[0.04] dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 text-[9px] font-semibold flex items-center justify-center mt-0.5">
                  {num}
                </span>
                <span className="flex-1 pt-0.5">
                  {boldMatch ? (
                    <>
                      <strong className="text-slate-900 dark:text-white font-semibold">{boldMatch[1]}</strong>
                      {boldMatch[2]}
                    </>
                  ) : content}
                </span>
              </div>
            );
          }
          if (trimmed === '') return <div key={i} className="h-1" />;
          return <p key={i} className="pl-1 text-slate-600 dark:text-slate-300 text-xs">{trimmed}</p>;
        })}
      </div>
    );
  };

  return (
    <motion.section
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, type: 'spring', stiffness: 150, damping: 22 }}
      className="apexa-inset-group p-5 sm:p-6 md:p-8 text-left relative overflow-hidden"
    >
      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.05] dark:border-white/[0.06] pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0071E3]/10 text-[#0071E3] dark:text-[#0A84FF]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>{locale === 'vi' ? 'Báo cáo Năng suất thông minh AI' : 'AI Productivity Intelligence'}</span>
              <span className="apexa-segmented-pill text-[9px] uppercase tracking-wider font-semibold">
                Gemini
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {locale === 'vi' 
                ? 'Tổng hợp đánh giá hiệu suất, phân tích điểm nghẽn và đề xuất hành động tối ưu' 
                : 'Executive summary of task throughput, blockers and resource allocation'}
            </p>
          </div>
        </div>

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className={`inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold shadow-xs transition-all cursor-pointer ${
            isGenerating
              ? 'bg-black/[0.05] text-slate-400 cursor-not-allowed dark:bg-white/[0.08] dark:text-slate-500'
              : 'bg-[#0071E3] hover:bg-[#0077ED] text-white active:scale-[0.98]'
          }`}
        >
          {isGenerating ? (
            <>
              <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{locale === 'vi' ? 'Đang phân tích...' : 'Analyzing...'}</span>
            </>
          ) : (
            <>
              {isPremium ? <Sparkles className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}
              <span>{isPremium ? (locale === 'vi' ? 'Khởi tạo Báo cáo AI' : 'Generate AI Report') : (locale === 'vi' ? 'Nâng cấp để dùng AI' : 'Upgrade for AI')}</span>
            </>
          )}
        </button>
      </div>

      {/* Live Indicator Metrics Strip */}
      <div className="relative z-10 my-4 grid grid-cols-2 sm:grid-cols-4 gap-3 divide-y sm:divide-y-0 sm:divide-x divide-black/[0.05] dark:divide-white/[0.06] rounded-xl border border-black/[0.06] bg-[#fbfbfd] p-3.5 dark:border-white/[0.08] dark:bg-white/[0.02]">
        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {locale === 'vi' ? 'Công việc hoàn thành' : 'Completed Tasks'}
          </span>
          <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
            {completedTasks} / {totalTasks} {locale === 'vi' ? 'việc' : 'tasks'}
          </p>
          <div className="h-1 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="space-y-1 pt-2 sm:pt-0 sm:pl-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {locale === 'vi' ? 'Thời gian ghi nhận' : 'Logged Time'}
          </span>
          <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
            {totalLoggedHours}h / {totalEstimatedHours}h
          </p>
          <p className="text-[10px] font-medium text-[#0071E3] dark:text-[#0A84FF]">
            {totalEstimatedHours > 0 ? `${Math.round((totalLoggedHours / totalEstimatedHours) * 100)}% kế hoạch` : '0h kế hoạch'}
          </p>
        </div>

        <div className="space-y-1 pt-2 sm:pt-0 sm:pl-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {locale === 'vi' ? 'Độ chuẩn xác ước tính' : 'Estimate Accuracy'}
          </span>
          <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
            {accuracyPercentage}%
          </p>
          <p className="text-[10px] font-medium text-slate-400">
            {locale === 'vi' ? 'Đo lường sai số giờ' : 'Time variance score'}
          </p>
        </div>

        <div className="space-y-1 pt-2 sm:pt-0 sm:pl-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {locale === 'vi' ? 'Thành viên nhận việc' : 'Assigned Members'}
          </span>
          <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
            {assignedMemberCount} / {members.length} {locale === 'vi' ? 'người' : 'members'}
          </p>
          <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            {members.length > 0 ? `${Math.round((assignedMemberCount / members.length) * 100)}% phủ nhận sự` : '100%'}
          </p>
        </div>
      </div>

      {/* Generated Report Content */}
      {reportText ? (
        <div className="relative mt-4 rounded-xl border border-black/[0.06] bg-[#fbfbfd] p-4 sm:p-5 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div className="mb-3 flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.06] pb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0071E3] dark:text-[#0A84FF]">
              <Bot className="h-4 w-4" />
              <span>{locale === 'vi' ? 'Nội dung phân tích từ Gemini AI' : 'Generated by Gemini AI'}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyReport}
              className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-white/[0.08] px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 border border-black/[0.06] dark:border-white/[0.08] hover:bg-black/[0.02] transition-colors cursor-pointer"
            >
              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{isCopied ? (locale === 'vi' ? 'Đã chép!' : 'Copied!') : (locale === 'vi' ? 'Sao chép' : 'Copy')}</span>
            </button>
          </div>

          <div className="pt-1">
            {renderMarkdown(reportText)}
          </div>
        </div>
      ) : reportError ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-3 text-xs font-medium text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{reportError}</span>
        </div>
      ) : null}

    </motion.section>
  );
}
