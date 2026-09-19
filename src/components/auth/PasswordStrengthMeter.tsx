"use client";

import React from 'react';
import { motion } from 'motion/react';
import { Check, CheckCircle2, XCircle } from 'lucide-react';

export interface PasswordStrengthMeterProps {
  password: string;
  confirmPassword?: string;
  isVietnamese?: boolean;
  showConfirmMatch?: boolean;
}

export function calculatePasswordStrength(password: string) {
  const hasMinLength = password.length >= 8;
  const hasLetter = /\p{L}/u.test(password);
  const hasNumber = /\p{N}/u.test(password);
  const hasSpecial = /[^\p{L}\p{N}\s]/u.test(password);

  const score = [hasMinLength, hasLetter, hasNumber, hasSpecial].filter(Boolean).length;
  const isComplete = score === 4;

  return {
    score,
    isComplete,
    hasMinLength,
    hasLetter,
    hasNumber,
    hasSpecial,
  };
}

export default function PasswordStrengthMeter({
  password,
  confirmPassword,
  isVietnamese = true,
  showConfirmMatch = false,
}: PasswordStrengthMeterProps) {
  if (!password) return null;

  const { score, hasMinLength, hasLetter, hasNumber, hasSpecial } = calculatePasswordStrength(password);

  const getStrengthMeta = () => {
    switch (score) {
      case 1:
        return {
          text: isVietnamese ? 'Rất yếu' : 'Very weak',
          color: 'bg-rose-500',
          textColor: 'text-rose-500 dark:text-rose-400',
          activeSegments: 1,
        };
      case 2:
        return {
          text: isVietnamese ? 'Trung bình' : 'Medium',
          color: 'bg-amber-500',
          textColor: 'text-amber-500 dark:text-amber-400',
          activeSegments: 2,
        };
      case 3:
        return {
          text: isVietnamese ? 'Khá mạnh' : 'Good',
          color: 'bg-indigo-500',
          textColor: 'text-indigo-500 dark:text-indigo-400',
          activeSegments: 3,
        };
      case 4:
        return {
          text: isVietnamese ? 'Mạnh & An toàn' : 'Strong & Secure',
          color: 'bg-emerald-500',
          textColor: 'text-emerald-500 dark:text-emerald-400',
          activeSegments: 4,
        };
      default:
        return {
          text: isVietnamese ? 'Quá ngắn' : 'Too short',
          color: 'bg-slate-300 dark:bg-slate-700',
          textColor: 'text-slate-400 dark:text-slate-500',
          activeSegments: 0,
        };
    }
  };

  const meta = getStrengthMeta();

  const rules = [
    { label: isVietnamese ? 'Tối thiểu 8 ký tự' : '8+ characters', met: hasMinLength },
    { label: isVietnamese ? 'Có chữ cái' : 'Contains a letter', met: hasLetter },
    { label: isVietnamese ? 'Có chữ số' : 'Contains a number', met: hasNumber },
    { label: isVietnamese ? 'Ký tự đặc biệt' : 'Special character', met: hasSpecial },
  ];

  const hasConfirm = typeof confirmPassword === 'string' && confirmPassword.length > 0;
  const isMatch = hasConfirm && confirmPassword === password;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="p-3.5 rounded-2xl bg-slate-50/95 dark:bg-[#0b0d14] border border-slate-200/80 dark:border-white/10 space-y-3 select-none text-left"
    >
      {/* Header bar with strength score label */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-600 dark:text-slate-400">
          {isVietnamese ? 'Độ bảo mật mật khẩu' : 'Password security'}
        </span>
        <span className={`font-black uppercase tracking-wider text-[11px] ${meta.textColor}`}>
          {meta.text}
        </span>
      </div>

      {/* 4-Segmented Progress Bar */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
        {[0, 1, 2, 3].map((segmentIndex) => {
          const isActive = segmentIndex < meta.activeSegments;
          return (
            <div
              key={segmentIndex}
              className="h-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden"
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: isActive ? '100%' : '0%' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`h-full ${meta.color}`}
              />
            </div>
          );
        })}
      </div>

      {/* Checklist grid */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-medium pt-0.5">
        {rules.map((rule) => (
          <div
            key={rule.label}
            className={`flex items-center gap-1.5 transition-colors duration-200 ${
              rule.met
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors duration-200 ${
                rule.met
                  ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-300'
                  : 'bg-slate-200 dark:bg-white/10 text-slate-400'
              }`}
            >
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
            <span className="truncate">{rule.label}</span>
          </div>
        ))}
      </div>

      {/* Real-time Match Indicator */}
      {showConfirmMatch && hasConfirm && (
        <div
          className={`flex items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-white/10 text-xs font-semibold ${
            isMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {isMatch ? (
            <>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{isVietnamese ? 'Mật khẩu xác nhận trùng khớp' : 'Passwords match'}</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{isVietnamese ? 'Mật khẩu xác nhận chưa khớp' : 'Passwords do not match yet'}</span>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
