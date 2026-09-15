import React from 'react';
import Link from 'next/link';
import { Compass, Home, Sparkles, ArrowRight, Layers, CreditCard } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[var(--cu-bg)] text-slate-100 overflow-hidden selection:bg-blue-500/30">
      
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[350px] bg-blue-600/10 blur-[140px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Grid Pattern Texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none -z-10"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px)`,
          backgroundSize: '28px 28px'
        }}
      />

      <div className="relative w-full max-w-xl">
        
        {/* Main Frosted Glass Card */}
        <div className="relative rounded-[32px] sm:rounded-[36px] bg-[var(--cu-surface)]/95 backdrop-blur-2xl border border-white/[0.08] p-6 sm:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.7)] text-center overflow-hidden">
          
          {/* Subtle top edge metallic glow */}
          <div className="absolute top-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

          {/* Top 404 Status Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-sky-400 text-xs font-black uppercase tracking-wider mb-6 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
            </span>
            <span>Mã lỗi 404 · Không tìm thấy trang</span>
          </div>

          {/* Icon Showcase Stage */}
          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-500/30 to-indigo-500/20 blur-xl animate-pulse" />
            <div className="relative flex h-18 w-18 items-center justify-center rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-blue-500/30 shadow-xl">
              <Compass className="h-9 w-9 text-sky-400 drop-shadow-[0_2px_8px_rgba(56,189,248,0.5)] stroke-[2.2]" />
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">
            Trang bạn tìm kiếm không tồn tại
          </h1>

          {/* Subtitle */}
          <p className="mt-3.5 text-sm sm:text-[15px] leading-relaxed text-slate-300 max-w-md mx-auto">
            Liên kết có thể đã thay đổi, hết hạn hoặc nội dung đã được chuyển đến không gian làm việc mới trên Upgen.
          </p>

          {/* Quick Nav Shortcut Cards */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
            <Link 
              href="/#features" 
              className="group p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/15 flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-xs font-bold text-slate-200">Khám phá Tính năng</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </Link>
            <Link 
              href="/#pricing" 
              className="group p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/15 flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-slate-200">Xem Bảng giá</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>

          {/* Action CTA */}
          <div className="mt-8 flex justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Home className="w-4 h-4 text-white" />
              <span>Quay về Trang chủ Upgen</span>
            </Link>
          </div>
        </div>

        {/* Brand Watermark Footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 select-none">
          <span>Upgen High-Velocity Workspace</span>
        </div>
      </div>
    </main>
  );
}
