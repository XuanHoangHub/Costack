"use client";

import React from 'react';

export interface SocialAuthButtonsProps {
  onGoogleLogin: () => void;
  onFacebookLogin: () => void;
  loading: boolean;
  isVietnamese?: boolean;
  dividerText?: string;
  dividerPosition?: 'top' | 'bottom';
  className?: string;
}

export default function SocialAuthButtons({
  onGoogleLogin,
  onFacebookLogin,
  loading,
  isVietnamese = true,
  dividerText,
  dividerPosition = 'bottom',
  className = '',
}: SocialAuthButtonsProps) {
  const defaultDividerText = isVietnamese ? 'Hoặc tiếp tục với email' : 'Or continue with email';
  const label = dividerText || defaultDividerText;

  const dividerElement = (
    <div className="relative flex items-center justify-center py-0.5">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-200/90 dark:border-white/10" />
      </div>
      <span className="relative bg-[#ffffff] dark:bg-[#090d15] px-3.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
        {label}
      </span>
    </div>
  );

  const buttonsGrid = (
    <div className="grid grid-cols-2 gap-3">
      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={onGoogleLogin}
        disabled={loading}
        aria-busy={loading}
        aria-label={isVietnamese ? 'Đăng nhập bằng tài khoản Google' : 'Sign in with Google'}
        className="group relative flex min-h-[46px] items-center justify-center gap-2.5 px-4 py-2.5 text-xs sm:text-[13px] font-bold rounded-xl border border-slate-200/90 dark:border-white/[0.09] bg-white dark:bg-white/[0.035] text-slate-700 dark:text-slate-100 shadow-sm hover:border-slate-300 dark:hover:border-cyan-300/25 hover:bg-slate-50/80 dark:hover:bg-cyan-300/[0.045] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:focus-visible:ring-cyan-400/60 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        <span className="truncate font-bold">Google</span>
      </button>

      {/* Facebook OAuth Button */}
      <button
        type="button"
        onClick={onFacebookLogin}
        disabled={loading}
        aria-busy={loading}
        aria-label={isVietnamese ? 'Đăng nhập bằng tài khoản Facebook' : 'Sign in with Facebook'}
        className="group relative flex min-h-[46px] items-center justify-center gap-2.5 px-4 py-2.5 text-xs sm:text-[13px] font-bold rounded-xl border border-slate-200/90 dark:border-white/[0.09] bg-white dark:bg-white/[0.035] text-slate-700 dark:text-slate-100 shadow-sm hover:border-slate-300 dark:hover:border-cyan-300/25 hover:bg-slate-50/80 dark:hover:bg-cyan-300/[0.045] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:focus-visible:ring-cyan-400/60 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg className="w-4 h-4 text-[#1877F2] shrink-0 transition-transform duration-200 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        <span className="truncate font-bold">Facebook</span>
      </button>
    </div>
  );

  return (
    <div className={`space-y-3.5 ${className}`}>
      {dividerPosition === 'top' && dividerElement}
      {buttonsGrid}
      {dividerPosition === 'bottom' && dividerElement}
    </div>
  );
}
