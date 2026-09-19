"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, Layers, Bot, Zap,
  CheckCircle2, Circle, Star, FileText, Check
} from 'lucide-react';
import { GsapCard3DTilt } from '@/components/animations';

export interface AuthStoryPanelProps {
  isVietnamese?: boolean;
}

type DemoTab = 'ai' | 'sprint' | 'docs';

export default function AuthStoryPanel({ isVietnamese = true }: AuthStoryPanelProps) {
  const [activeDemo, setActiveDemo] = useState<DemoTab>('sprint');
  const [isSampleTaskDone, setIsSampleTaskDone] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  // Rotate testimonials every 7 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % 3);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const testimonials = isVietnamese ? [
    {
      quote: 'Upgen giúp đội ngũ 35 kỹ sư cắt giảm 40% thời gian họp báo cáo. Mọi công việc và thời hạn đều rõ ràng.',
      author: 'Phan Tuấn',
      role: 'CTO tại TechNova',
      metric: 'Tiết kiệm 6h/tuần',
      avatar: 'PT',
      tone: 'from-blue-600 to-indigo-600',
    },
    {
      quote: 'Trợ lý AI phân tích brief và chia nhỏ công việc siêu nhanh. Trải nghiệm mượt mà, trực quan và tiện dụng.',
      author: 'Lê Hoàng Mai',
      role: 'Head of Product @ FinHub',
      metric: 'Tăng 35% velocity',
      avatar: 'HM',
      tone: 'from-purple-600 to-pink-600',
    },
    {
      quote: 'Quản lý công việc, tài liệu và ngân sách dự án trong cùng một không gian. Không còn phân mảnh công cụ.',
      author: 'Trần Quang Huy',
      role: 'Founder @ Creatify Studio',
      metric: 'Quản lý 18 dự án',
      avatar: 'QH',
      tone: 'from-emerald-600 to-teal-600',
    },
  ] : [
    {
      quote: 'Upgen helped our 35 engineers cut progress sync meetings by 40%. Tasks, deadlines, and ownership are crystal clear.',
      author: 'Alex Phan',
      role: 'CTO at TechNova',
      metric: 'Saved 6h/week',
      avatar: 'AP',
      tone: 'from-blue-600 to-indigo-600',
    },
    {
      quote: 'The AI Copilot breaks down briefs into actionable tasks in seconds. Fluid, intuitive UX on par with Linear.',
      author: 'Mia Le',
      role: 'Head of Product @ FinHub',
      metric: '+35% velocity',
      avatar: 'ML',
      tone: 'from-purple-600 to-pink-600',
    },
    {
      quote: 'Everything from tasks and docs to client budget tracking in one cohesive workspace. No more scattered apps.',
      author: 'Kevin Tran',
      role: 'Founder @ Creatify Studio',
      metric: '18 active projects',
      avatar: 'KT',
      tone: 'from-emerald-600 to-teal-600',
    },
  ];

  const currentTestimonial = testimonials[activeTestimonial];

  return (
    <aside className="relative hidden min-h-[680px] overflow-hidden p-7 lg:flex lg:flex-col lg:justify-between select-none border-r border-slate-200/80 dark:border-white/10 bg-slate-50/70 text-slate-800 dark:bg-[#08090d] dark:text-white transition-colors duration-300">
      {/* Aurora Ambient Lighting Spots */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-500/10 dark:bg-cyan-500/20 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/10 dark:bg-violet-500/15 blur-[100px]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top Header: Brand & Live Pulse without awkward line wrap */}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black tracking-tight text-slate-900 dark:text-white font-display leading-none">
              Upgen<span className="text-blue-600 dark:text-cyan-400">.</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-cyan-300/80 pt-1 whitespace-nowrap">
              {isVietnamese ? 'Workspace cho Đội ngũ' : 'Workspace for Teams'}
            </div>
          </div>
        </div>

        {/* Live Users Presence Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10.5px] font-bold shrink-0 whitespace-nowrap">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>1,450+ {isVietnamese ? 'online' : 'active'}</span>
        </div>
      </div>

      {/* Center Section: Value Pitch & Interactive Demo */}
      <div className="relative z-10 space-y-4 my-auto py-3">
        {/* Main Headline */}
        <div className="space-y-1.5">
          <h3 className="text-[25px] font-black leading-tight tracking-tight text-slate-900 dark:text-white font-display">
            {isVietnamese ? (
              <>
                Bớt việc rời rạc.<br />
                <span className="text-blue-600 dark:text-sky-400">
                  Thêm điều làm được.
                </span>
              </>
            ) : (
              <>
                Less scattered work.<br />
                <span className="text-blue-600 dark:text-sky-400">
                  More moving forward.
                </span>
              </>
            )}
          </h3>
          <p className="text-xs font-normal leading-relaxed text-slate-600 dark:text-slate-300/80">
            {isVietnamese
              ? 'Tổ chức công việc, tài liệu và quy trình trên một nền tảng đồng bộ cho toàn đội ngũ.'
              : 'Organize tasks, documents, and workflows in one unified hub for your entire team.'}
          </p>
        </div>

        {/* Feature Demo Switcher */}
        <div className="space-y-2.5">
          {/* Demo Sub-tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-white/[0.06] rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveDemo('sprint')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                activeDemo === 'sprint'
                  ? 'bg-white dark:bg-white/15 text-blue-600 dark:text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isVietnamese ? 'Sprint Kanban' : 'Sprint Board'}
            </button>
            <button
              type="button"
              onClick={() => setActiveDemo('ai')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                activeDemo === 'ai'
                  ? 'bg-white dark:bg-white/15 text-blue-600 dark:text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isVietnamese ? 'Trợ lý AI' : 'AI Copilot'}
            </button>
            <button
              type="button"
              onClick={() => setActiveDemo('docs')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                activeDemo === 'docs'
                  ? 'bg-white dark:bg-white/15 text-blue-600 dark:text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isVietnamese ? 'Tài liệu Docs' : 'Live Docs'}
            </button>
          </div>

          {/* Screen Preview Card */}
          <GsapCard3DTilt maxTilt={4.5} scale={1.015} glare={true} className="rounded-2xl overflow-hidden">
            <div className="relative min-h-[140px] rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-white/[0.04] p-3.5 shadow-sm dark:shadow-md backdrop-blur-xl">
              <AnimatePresence mode="wait">
                {activeDemo === 'sprint' && (
                  <motion.div
                    key="demo-sprint"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2.5 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-500" />
                        Sprint 4: PayOS Integration
                      </span>
                      <span className="text-[11px] font-black text-blue-600 dark:text-cyan-400">
                        {isSampleTaskDone ? '100% Hoàn tất' : '84% Tiến độ'}
                      </span>
                    </div>

                    {/* Dynamic Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: isSampleTaskDone ? '100%' : '84%' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className="h-full rounded-full bg-blue-600"
                      />
                    </div>

                    {/* Interactive Task Item */}
                    <button
                      type="button"
                      onClick={() => setIsSampleTaskDone(!isSampleTaskDone)}
                      className="w-full group flex items-center justify-between p-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] hover:border-blue-400 dark:hover:border-cyan-400/50 transition-all cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`transition-transform duration-150 ${isSampleTaskDone ? 'text-emerald-500 scale-110' : 'text-slate-400 group-hover:text-blue-500'}`}>
                          {isSampleTaskDone ? <CheckCircle2 className="w-4 h-4 fill-emerald-500 text-white" /> : <Circle className="w-4 h-4" />}
                        </div>
                        <span className={`text-xs font-semibold truncate ${isSampleTaskDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                          {isVietnamese ? 'Kiểm thử cổng thanh toán VietQR' : 'Verify VietQR payment checkout'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-white/10 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-white/5 shrink-0 whitespace-nowrap">
                        {isSampleTaskDone ? (isVietnamese ? 'Hoàn thành' : 'Done') : (isVietnamese ? 'Ưu tiên cao' : 'High')}
                      </span>
                    </button>
                  </motion.div>
                )}

                {activeDemo === 'ai' && (
                  <motion.div
                    key="demo-ai"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2 text-left"
                  >
                    <div className="flex items-center gap-2 text-[11px] font-bold text-purple-600 dark:text-purple-300">
                      <Bot className="w-3.5 h-3.5" />
                      <span>Upgen AI Copilot</span>
                      <span className="text-[9.5px] font-normal text-slate-400 ml-auto">1.2s</span>
                    </div>
                    <div className="p-2 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 text-[11.5px] text-slate-700 dark:text-slate-300 leading-snug">
                      <p className="font-semibold text-purple-900 dark:text-purple-200 mb-1">
                        {isVietnamese ? '✦ Đã phân rã chiến dịch ra mắt:' : '✦ Launch campaign broken down:'}
                      </p>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span>12 đầu việc con • Tự động gán nhãn Sprint</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span>Gợi ý người phụ trách: Minh Anh & Hoàng Linh</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeDemo === 'docs' && (
                  <motion.div
                    key="demo-docs"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2 text-left"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                        Product-Brief-v2.md
                      </span>
                      <div className="flex items-center -space-x-1">
                        <span className="w-4.5 h-4.5 rounded-full bg-blue-500 text-[9px] text-white flex items-center justify-center font-bold ring-1 ring-white">MA</span>
                        <span className="w-4.5 h-4.5 rounded-full bg-purple-500 text-[9px] text-white flex items-center justify-center font-bold ring-1 ring-white">TN</span>
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
                      <span className="text-blue-600 font-bold"># Mục tiêu:</span> Đồng bộ công việc, tài liệu và AI trong một giao diện duy nhất...
                    </div>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      {isVietnamese ? 'Minh Anh đang đồng biên tập theo thời gian thực' : 'Minh Anh is live co-editing'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </GsapCard3DTilt>
        </div>

        {/* Customer Proof / Testimonial Carousel Card with complete text (no truncated ellipsis) */}
        <GsapCard3DTilt maxTilt={3.5} scale={1.01} glare={true} className="rounded-2xl overflow-hidden">
          <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-white/[0.04] p-3.5 shadow-sm dark:shadow-md text-left backdrop-blur-xl">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((star) => (
                  <Star key={star} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-cyan-300 bg-blue-50 dark:bg-cyan-500/10 px-2 py-0.5 rounded-full">
                {currentTestimonial.metric}
              </span>
            </div>

            <p className="text-[11.5px] italic text-slate-700 dark:text-slate-300 leading-relaxed min-h-[36px]">
              “{currentTestimonial.quote}”
            </p>

            <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${currentTestimonial.tone} text-white flex items-center justify-center text-[10px] font-black shrink-0`}>
                  {currentTestimonial.avatar}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                    {currentTestimonial.author}
                  </div>
                  <div className="text-[9.5px] text-slate-500 dark:text-slate-400 truncate">
                    {currentTestimonial.role}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {[0, 1, 2].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveTestimonial(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      activeTestimonial === idx ? 'w-4 bg-blue-600 dark:bg-cyan-400' : 'w-1.5 bg-slate-300 dark:bg-white/20'
                    }`}
                    aria-label={`Testimonial ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </GsapCard3DTilt>
      </div>

      {/* Reassurance Footer with clean spacing */}
      <div className="relative z-10 flex items-center justify-between gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/80 dark:border-white/10 whitespace-nowrap">
        <span className="flex items-center gap-1.5 shrink-0">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>AES-256 E2E • ISO 27001</span>
        </span>
        <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-300 transition-colors shrink-0">
          <Link href="/legal/privacy" className="hover:underline">
            {isVietnamese ? 'Bảo mật & Điều khoản' : 'Privacy & Terms'}
          </Link>
        </span>
      </div>
    </aside>
  );
}
