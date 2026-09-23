'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [locale, setLocale] = useState<'vi' | 'en'>('vi');

  useEffect(() => {
    try {
      const savedLocale = (localStorage.getItem('apexa_locale') || localStorage.getItem('apexa_locale_mode') || 'vi').toLowerCase();
      if (savedLocale.startsWith('en')) {
        setLocale('en');
      } else {
        setLocale('vi');
      }
    } catch {
      // Default to vi
    }
  }, []);

  const isVi = locale === 'vi';

  const isChunkError =
    error?.name === 'ChunkLoadError' ||
    error?.message?.includes('Loading chunk') ||
    error?.message?.includes('missing:') ||
    error?.message?.includes('Failed to fetch dynamically imported module');

  useEffect(() => {
    console.error('Apexa Runtime/Route Error caught by error.tsx:', error);
    if (isChunkError && typeof window !== 'undefined') {
      const key = 'chunk_error_reload_lock';
      const lastReload = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - lastReload > 6000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
      }
    }
  }, [error, isChunkError]);

  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    if (isChunkError && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }
    setTimeout(() => {
      reset();
      setIsRetrying(false);
    }, 400);
  }, [reset, isChunkError]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isRetrying) {
        e.preventDefault();
        handleRetry();
      } else if (e.key === 'Escape') {
        router.push('/');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRetry, isRetrying, router]);

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 bg-[#05060b] text-slate-100 overflow-hidden selection:bg-indigo-500/30 font-sans">
      
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[400px] bg-gradient-to-b from-indigo-600/15 via-blue-600/10 to-transparent blur-[140px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Grid Pattern Texture */}
      <div 
        className="absolute inset-0 opacity-[0.035] pointer-events-none -z-10"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.8) 1.2px, transparent 1.2px)`,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="relative w-full max-w-xl my-auto animate-in fade-in zoom-in-95 duration-300">
        
        {/* Main Frosted Glass Card */}
        <div className="relative rounded-[32px] sm:rounded-[38px] bg-[#0c0e18]/92 backdrop-blur-2xl border border-white/[0.12] p-7 sm:p-11 md:p-12 text-center overflow-hidden shadow-[0_32px_90px_-20px_rgba(0,0,0,0.85)]">
          
          {/* Subtle top edge metallic glow */}
          <div className="absolute top-0 inset-x-16 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
          <div className="absolute top-0 inset-x-28 h-[2px] bg-gradient-to-r from-transparent via-sky-400/30 to-transparent blur-xs" />

          {/* Icon Showcase Stage */}
          <div className="relative mx-auto mb-6 flex h-20 w-20 sm:h-22 sm:w-22 items-center justify-center">
            {/* Outer Rotating Ambient Rings */}
            <div className="absolute inset-0 rounded-[28px] bg-gradient-to-tr from-amber-500/25 via-amber-600/15 to-indigo-500/20 blur-xl animate-pulse" />
            <div className="absolute -inset-1.5 rounded-[30px] border border-amber-500/20 opacity-60 pointer-events-none" />
            
            {/* Inner Shield Badge */}
            <div className="relative flex h-18 w-18 sm:h-20 sm:w-20 items-center justify-center rounded-[20px] bg-gradient-to-b from-slate-800/90 via-slate-900 to-[#0b0d17] border border-amber-500/35 shadow-2xl">
              <AlertTriangle className="h-9 w-9 sm:h-10 sm:w-10 text-amber-400 drop-shadow-[0_2px_12px_rgba(245,158,11,0.6)] stroke-[2.2]" />
            </div>
          </div>

          {/* Main Headline */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-snug font-display text-balance">
            {isVi ? 'Costack đang khôi phục phiên làm việc' : 'Costack is Recovering Your Session'}
          </h1>

          {/* Subtitle / Description */}
          <p className="mt-3.5 text-sm sm:text-[15px] leading-relaxed text-slate-300 max-w-lg mx-auto font-medium text-balance">
            {isVi ? (
              <>
                Một gián đoạn tạm thời đã xảy ra trong tiến trình xử lý. Toàn bộ dữ liệu cục bộ của bạn đã được <span className="text-sky-300 font-bold whitespace-nowrap">tự động lưu an toàn</span>.
              </>
            ) : (
              <>
                A temporary interruption occurred during processing. All your active tasks and local state have been <span className="text-sky-300 font-bold whitespace-nowrap">safely preserved</span>.
              </>
            )}
          </p>

          {/* Action CTAs - Perfectly Aligned, Identical Height, Zero Word Wrap Flaws */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mx-auto">
            
            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full sm:flex-1 h-13 sm:h-[52px] inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 px-5 text-sm sm:text-[15px] font-black text-white hover:shadow-[0_0_24px_rgba(79,70,229,0.5)] active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-60 shadow-lg shadow-indigo-600/30 ring-1 ring-white/20 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5] shrink-0 ${isRetrying ? 'animate-spin' : ''}`} />
              <span className="whitespace-nowrap">{isRetrying ? (isVi ? 'Đang khôi phục...' : 'Recovering...') : (isVi ? 'Thử tải lại ngay' : 'Retry Recovery')}</span>
            </button>

            {/* Secondary Action: Home */}
            <Link
              href="/"
              className="w-full sm:flex-1 h-13 sm:h-[52px] inline-flex items-center justify-center gap-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 px-5 text-sm sm:text-[15px] font-bold text-slate-200 hover:text-white transition-all duration-150 active:scale-[0.98] cursor-pointer shadow-3xs whitespace-nowrap shrink-0"
            >
              <Home className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-400 shrink-0" />
              <span className="whitespace-nowrap">{isVi ? 'Về Trang chủ' : 'Go Home'}</span>
            </Link>

          </div>

        </div>

      </div>
    </main>
  );
}
