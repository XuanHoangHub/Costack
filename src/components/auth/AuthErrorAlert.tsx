"use client";

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Clock, RefreshCw, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import { formatAuthError, FormattedAuthError } from '@/lib/authError';

export interface AuthErrorAlertProps {
  error: string | FormattedAuthError | null | undefined;
  isVietnamese?: boolean;
  onClose?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isRefreshed?: boolean;
  showRefreshButton?: boolean;
  className?: string;
}

export default function AuthErrorAlert({
  error,
  isVietnamese = true,
  onClose,
  onRefresh,
  isRefreshing = false,
  isRefreshed = false,
  showRefreshButton = false,
  className = '',
}: AuthErrorAlertProps) {
  if (!error) return null;

  const info: FormattedAuthError = typeof error === 'string'
    ? formatAuthError(error, isVietnamese)
    : error;

  const isExpired = info.type === 'expired';
  const isRateLimit = info.type === 'rate_limit';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        role="alert"
        aria-live="assertive"
        className={`relative overflow-hidden rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-50/95 via-rose-50/75 to-red-50/90 p-3.5 sm:p-4 text-left shadow-lg shadow-rose-500/10 backdrop-blur-xl dark:border-rose-300/20 dark:bg-gradient-to-br dark:from-[#251018] dark:via-[#190f18] dark:to-[#110d15] dark:shadow-[0_12px_36px_-10px_rgba(244,63,94,0.34)] ${className}`}
      >
        {/* Subtle glowing accent line at the top */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-rose-500/0 via-rose-500/70 to-rose-500/0" />

        <div className="flex items-start gap-3">
          {/* Glowing Icon Badge with Ping indicator */}
          <div className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-300/70 bg-rose-100/90 text-rose-600 shadow-inner dark:border-rose-300/20 dark:bg-rose-400/10 dark:text-rose-300">
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
            </span>
            {isExpired ? (
              <Clock className="h-4.5 w-4.5" />
            ) : isRateLimit ? (
              <AlertTriangle className="h-4.5 w-4.5" />
            ) : (
              <ShieldAlert className="h-4.5 w-4.5" />
            )}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs sm:text-[13px] font-black tracking-tight text-rose-800 dark:text-rose-100">
                {info.title}
              </h3>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-rose-500 transition-colors hover:bg-rose-500/10 hover:text-rose-700 active:scale-95 dark:text-rose-300/80 dark:hover:bg-rose-300/10 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70 cursor-pointer"
                  aria-label={isVietnamese ? 'Đóng thông báo' : 'Dismiss notice'}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <p className="text-[11.5px] leading-relaxed font-medium text-rose-700/90 dark:text-rose-100/80">
              {info.description}
            </p>

            {/* Actions & Status row */}
            {(isRefreshed || (showRefreshButton && onRefresh)) && (
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                {isRefreshed && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-300/[0.08] dark:text-emerald-200">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 dark:text-emerald-300 shrink-0" />
                    {isVietnamese ? 'Yêu cầu xác minh đã làm mới' : 'Verification request refreshed'}
                  </span>
                )}

                {showRefreshButton && onRefresh && (
                  <button
                    type="button"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/70 bg-white/80 px-2.5 py-1 text-[10.5px] font-extrabold text-rose-700 shadow-2xs transition-all hover:bg-white hover:text-rose-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-200/20 dark:bg-rose-300/[0.08] dark:text-rose-100 dark:hover:border-rose-200/35 dark:hover:bg-rose-300/[0.14] dark:focus-visible:ring-rose-300/70 cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>{isVietnamese ? 'Làm mới xác minh' : 'Refresh verification'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
