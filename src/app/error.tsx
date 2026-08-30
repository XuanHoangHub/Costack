'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  ShieldCheck, 
  Sparkles
} from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    console.error('Apexa route error:', error);
  }, [error]);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      reset();
      setIsRetrying(false);
    }, 400);
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#070b14] text-slate-100 overflow-hidden selection:bg-blue-500/30">
      
      {/* Dynamic Background Aurora Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[350px] bg-gradient-to-tr from-blue-600/20 via-indigo-500/15 to-sky-400/20 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-amber-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Grid Pattern Texture */}
      <div 
        className="absolute inset-0 opacity-[0.035] pointer-events-none -z-10"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px)`,
          backgroundSize: '28px 28px'
        }}
      />

      <div className="relative w-full max-w-lg">
        
        {/* Main Frosted Glass Card */}
        <div className="relative rounded-[28px] sm:rounded-[36px] bg-[#0c1222]/95 backdrop-blur-2xl border border-white/[0.12] p-7 sm:p-10 text-center overflow-hidden">
          
          {/* Subtle top edge metallic glow */}
          <div className="absolute top-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

          {/* Icon Showcase Stage */}
          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-amber-500/30 to-amber-600/20 blur-xl animate-pulse" />
            <div className="relative flex h-18 w-18 items-center justify-center rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-amber-500/30">
              <AlertTriangle className="h-9 w-9 text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)] stroke-[2.2]" />
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">
            Apexa đang khôi phục phiên làm việc
          </h1>

          {/* Subtitle / Description */}
          <p className="mt-3.5 text-sm sm:text-[15px] leading-relaxed text-slate-300 max-w-md mx-auto font-medium">
            Một gián đoạn tạm thời đã xảy ra trong tiến trình xử lý. Toàn bộ dữ liệu cục bộ của bạn đã được <span className="text-sky-300 font-bold">tự động lưu an toàn</span>.
          </p>

          {/* 3 Safeguard Proof Badges */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-slate-200">Dữ liệu an toàn</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5">
              <Sparkles className="w-4.5 h-4.5 text-sky-400 shrink-0" />
              <span className="text-xs font-bold text-slate-200">Bộ nhớ đệm giữ nguyên</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5">
              <RefreshCw className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
              <span className="text-xs font-bold text-slate-200">Phục hồi 1 chạm</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full sm:w-auto min-w-[160px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 px-6 py-3.5 text-sm font-black text-white hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Đang khôi phục...' : 'Thử tải lại ngay'}</span>
            </button>

            <Link
              href="/"
              className="w-full sm:w-auto min-w-[140px] inline-flex items-center justify-center gap-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/12 px-6 py-3.5 text-sm font-bold text-slate-200 hover:text-white transition-all active:scale-[0.98]"
            >
              <Home className="w-4 h-4 text-slate-400" />
              <span>Về Trang chủ</span>
            </Link>
          </div>

        </div>

      </div>
    </main>
  );
}
