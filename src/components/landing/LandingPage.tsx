"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import {
  Kanban, Sparkles, ArrowRight, Star, Menu, X,
  Brain, FileText, MessageSquare, Calendar, BarChart3, Timer,
  Database, Users, Zap, Shield, Check, Play, Quote,
  LayoutGrid, Search, Mail, ListTodo, Timer as TimerIcon
} from 'lucide-react';

interface LandingPageProps {
  onSignUp: () => void;
  onSignIn: () => void;
  activeUsers: number;
  tasksCompleted: number;
}

const FEATURES = [
  {
    icon: Kanban,
    title: 'Kanban & Sprint Boards',
    desc: 'Kéo thả trực quan, quản lý sprint linh hoạt với List, Board, Table và Gantt view.',
    color: 'from-indigo-500 to-purple-500',
    bg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
  },
  {
    icon: Brain,
    title: 'Avaxa Brain AI',
    desc: 'Trợ lý AI thông minh tóm tắt tài liệu, gợi ý task và tự động hóa quy trình làm việc.',
    color: 'from-purple-500 to-pink-500',
    bg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    icon: FileText,
    title: 'Smart Documents',
    desc: 'Tài liệu thông minh liên kết trực tiếp với task, space và thành viên trong team.',
    color: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-50',
    iconColor: 'text-pink-600',
  },
  {
    icon: MessageSquare,
    title: 'Chat thời gian thực',
    desc: 'Thảo luận nhóm ngay trong workspace — không cần chuyển sang Slack hay Teams.',
    color: 'from-cyan-500 to-blue-500',
    bg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
  },
  {
    icon: Calendar,
    title: 'Lịch & Gantt',
    desc: 'Lên kế hoạch deadline, theo dõi timeline dự án và đồng bộ lịch team.',
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    icon: BarChart3,
    title: 'Analytics Hub',
    desc: 'Dashboard phân tích hiệu suất team, velocity sprint và tiến độ dự án real-time.',
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    icon: Timer,
    title: 'Pomodoro Focus',
    desc: 'Tích hợp kỹ thuật Pomodoro giúp team tập trung và theo dõi thời gian làm việc.',
    color: 'from-rose-500 to-red-500',
    bg: 'bg-rose-50',
    iconColor: 'text-rose-600',
  },
  {
    icon: Database,
    title: 'Multi-Base Workspace',
    desc: 'Tổ chức nhiều workspace, space và base — phù hợp mọi quy mô từ startup đến enterprise.',
    color: 'from-violet-500 to-indigo-500',
    bg: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Tạo workspace',
    desc: 'Đăng ký miễn phí và thiết lập không gian làm việc của bạn trong 30 giây.',
  },
  {
    step: '02',
    title: 'Mời team & tổ chức',
    desc: 'Tạo space, mời thành viên và cấu trúc dự án theo cách team bạn hoạt động.',
  },
  {
    step: '03',
    title: 'Làm việc & đo lường',
    desc: 'Quản lý task, tài liệu, chat và AI — theo dõi tiến độ mọi lúc, mọi nơi.',
  },
];

const TESTIMONIALS = [
  {
    quote: 'Avaxa đã thay thế 4 công cụ khác nhau cho team chúng tôi. Sprint planning giờ chỉ mất 15 phút thay vì cả buổi sáng.',
    name: 'Nguyễn Minh Tuấn',
    role: 'Engineering Lead, TechFlow',
    avatar: 'MT',
    color: 'bg-indigo-500',
  },
  {
    quote: 'Avaxa Brain AI tóm tắt brief marketing trong vài giây. Team creative tiết kiệm được hàng giờ mỗi tuần.',
    name: 'Trần Thảo Vy',
    role: 'Marketing Director, Mango Tech',
    avatar: 'TV',
    color: 'bg-pink-500',
  },
  {
    quote: 'Giao diện đẹp, dễ dùng và sync real-time cực nhanh. Đội remote 20 người của chúng tôi không thể thiếu Avaxa.',
    name: 'Lê Hoàng Anh',
    role: 'CEO, RemoteFirst Co.',
    avatar: 'LA',
    color: 'bg-emerald-500',
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: 'Miễn phí',
    period: 'mãi mãi',
    desc: 'Hoàn hảo cho cá nhân và nhóm nhỏ bắt đầu.',
    features: ['Tối đa 5 thành viên', '3 Space', 'Kanban & List view', 'Chat cơ bản', '1GB lưu trữ'],
    cta: 'Bắt đầu miễn phí',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '299.000đ',
    period: '/tháng',
    desc: 'Cho team đang phát triển cần công cụ mạnh mẽ hơn.',
    features: ['Không giới hạn thành viên', 'Unlimited Space', 'Avaxa Brain AI', 'Gantt & Analytics', '50GB lưu trữ', 'Priority support'],
    cta: 'Dùng thử 14 ngày',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Liên hệ',
    period: '',
    desc: 'Giải pháp tùy chỉnh cho tổ chức lớn.',
    features: ['SSO & SAML', 'Admin controls', 'Dedicated support', 'Custom integrations', 'SLA 99.99%', 'On-premise option'],
    cta: 'Liên hệ sales',
    highlight: false,
  },
];

const TRUSTED_LOGOS = ['TechFlow', 'Mango Tech', 'RemoteFirst', 'NovaLabs', 'PixelWorks', 'DataSync'];

function AnimatedCounter({ value, suffix = '', decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !isInView) return;
    let current = 0;
    const step = value / 60;
    const interval = setInterval(() => {
      current += step;
      if (current >= value) {
        setCount(value);
        clearInterval(interval);
      } else {
        setCount(decimals > 0 ? Math.round(current * 10) / 10 : Math.floor(current));
      }
    }, 16);
    return () => clearInterval(interval);
  }, [mounted, isInView, value, decimals]);

  const formatted = decimals > 0
    ? count.toFixed(decimals)
    : count.toLocaleString('vi-VN');

  return (
    <span ref={ref}>
      {mounted ? formatted : '—'}{suffix}
    </span>
  );
}

function FadeInSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ProductMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="w-full bg-white border border-slate-200/80 rounded-2xl shadow-[0_24px_80px_rgba(99,102,241,0.12)] relative overflow-hidden flex flex-col min-h-[420px] lg:min-h-[480px]"
    >
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-150 select-none">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80 block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80 block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80 block" />
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block animate-pulse" />
            <span>Avaxa Workspace</span>
          </div>
        </div>
        <div className="relative w-36 hidden sm:flex items-center">
          <Search className="w-3 h-3 text-slate-400 absolute left-2.5" />
          <div className="w-full pl-7 pr-2 py-1.5 text-[10px] rounded-lg border border-slate-200 bg-white text-slate-400 font-medium">
            Tìm kiếm...
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <aside className="w-36 bg-slate-50/50 border-r border-slate-150 p-3 space-y-3 hidden sm:block shrink-0">
          <div className="space-y-1">
            {[
              { icon: LayoutGrid, label: 'Trang chủ', active: false },
              { icon: Mail, label: 'Hộp thư', active: true, badge: 4 },
              { icon: ListTodo, label: 'Task của tôi', active: false },
            ].map((item, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-2 py-1.5 text-[10px] font-semibold rounded-lg transition-colors ${
                  item.active ? 'bg-white shadow-xs border border-slate-200/60 text-slate-800' : 'text-slate-450'
                }`}
              >
                <span className="flex items-center gap-2">
                  <item.icon className={`w-3.5 h-3.5 ${item.active ? 'text-indigo-500' : ''}`} />
                  {item.label}
                </span>
                {item.badge && (
                  <span className="px-1 py-0.5 bg-rose-500 text-white rounded-full text-[8px] font-extrabold">{item.badge}</span>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Spaces</div>
            {[
              { name: 'Marketing Q2', color: 'bg-rose-400' },
              { name: 'Product Dev', color: 'bg-purple-500' },
              { name: 'QA Sprint', color: 'bg-blue-400' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 text-[9px] font-bold text-slate-500">
                <span className={`w-1.5 h-1.5 rounded-full ${s.color}`} />
                {s.name}
              </div>
            ))}
          </div>
        </aside>

        <div className="flex-1 flex flex-col p-4 space-y-3 overflow-hidden">
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 border-b border-slate-100 pb-2">
            <span className="text-indigo-600 border-b-2 border-indigo-500 pb-2 -mb-2 flex items-center gap-1">
              <Kanban className="w-3.5 h-3.5" /> Board
            </span>
            <span className="flex items-center gap-1"><ListTodo className="w-3.5 h-3.5" /> List</span>
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Calendar</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 flex-1">
            {[
              { title: 'Cần làm', count: 2, labelClass: 'text-slate-500', badgeClass: 'bg-slate-100 text-slate-500', tasks: ['Thiết kế landing page mới', 'Review API docs'] },
              { title: 'Đang làm', count: 3, labelClass: 'text-blue-500', badgeClass: 'bg-blue-50 text-blue-500', tasks: ['Tích hợp Avaxa Brain AI', 'Fix bug sync realtime'] },
              { title: 'Hoàn thành', count: 5, labelClass: 'text-emerald-500', badgeClass: 'bg-emerald-50 text-emerald-500', tasks: ['Deploy v2.0 staging'] },
            ].map((col, ci) => (
              <div key={ci} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${col.labelClass}`}>{col.title}</span>
                  <span className={`text-[9px] font-extrabold px-1.5 rounded ${col.badgeClass}`}>{col.count}</span>
                </div>
                {col.tasks.map((task, ti) => (
                  <div key={ti} className="p-2.5 bg-white border border-slate-150 rounded-xl shadow-xs hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-bold text-slate-700 leading-snug">{task}</p>
                    {ci === 1 && ti === 0 && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                        <span className="text-[8px] text-rose-500 font-bold flex items-center gap-0.5">
                          <TimerIcon className="w-3 h-3" /> Quá hạn
                        </span>
                        <span className="text-[8px] bg-rose-50 text-rose-600 font-black px-1.5 py-0.5 rounded uppercase">Cao</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <motion.div
        drag
        dragConstraints={{ left: -80, right: 80, top: -80, bottom: 80 }}
        className="absolute bottom-5 left-8 z-30 w-64 bg-white/95 backdrop-blur-md rounded-xl border border-indigo-100 shadow-[0_12px_40px_rgba(99,102,241,0.1)] p-3 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5 pb-2 border-b border-indigo-50">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-[9px] font-black text-indigo-700 uppercase tracking-wider">Avaxa Brain</span>
          <span className="ml-auto text-[8px] text-emerald-500 font-extrabold flex items-center gap-0.5">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
        </div>
        <p className="text-[9px] text-slate-600 leading-relaxed pt-2">
          Sprint Q2 đang <strong className="text-indigo-600">78% hoàn thành</strong>. 3 task cần ưu tiên trước thứ Sáu.
        </p>
      </motion.div>
    </motion.div>
  );
}

export default function LandingPage({ onSignUp, onSignIn, activeUsers, tasksCompleted }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Ambient background */}
      <div
        className="fixed inset-0 pointer-events-none login-spotlight-bg z-0"
        style={{ '--mouse-x': `${mousePos.x}%`, '--mouse-y': `${mousePos.y}%` } as React.CSSProperties}
      />
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-400/8 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-pink-400/6 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-slate-100/80">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5 cursor-pointer select-none group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                A
              </div>
              <span className="font-display font-black text-lg tracking-tight text-slate-900">
                avaxa <span className="text-[10px] align-super text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md ml-0.5 border border-indigo-100">OS</span>
              </span>
            </div>

            <nav className="hidden lg:flex items-center gap-1">
              {[
                { label: 'Tính năng', id: 'features' },
                { label: 'Cách hoạt động', id: 'how-it-works' },
                { label: 'Bảng giá', id: 'pricing' },
                { label: 'Đánh giá', id: 'testimonials' },
              ].map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
              <button className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all cursor-pointer flex items-center gap-1">
                Trợ lý AI <span className="text-[8px] bg-gradient-to-r from-purple-500 to-pink-500 text-white px-1.5 py-0.5 rounded-full font-extrabold">NEW</span>
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSignIn}
              className="hidden sm:inline-flex text-xs font-bold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
            >
              Đăng nhập
            </button>
            <button
              onClick={onSignUp}
              className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl shadow-md shadow-slate-900/10 transition-all cursor-pointer"
            >
              Bắt đầu miễn phí
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-slate-100 bg-white/95 backdrop-blur-xl px-5 py-4 space-y-1"
          >
            {['features', 'how-it-works', 'pricing', 'testimonials'].map((id) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="block w-full text-left px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer capitalize"
              >
                {id === 'features' ? 'Tính năng' : id === 'how-it-works' ? 'Cách hoạt động' : id === 'pricing' ? 'Bảng giá' : 'Đánh giá'}
              </button>
            ))}
            <button onClick={onSignIn} className="block w-full text-left px-3 py-2.5 text-sm font-semibold text-indigo-600 cursor-pointer">
              Đăng nhập
            </button>
          </motion.div>
        )}
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 pt-12 lg:pt-20 pb-16 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-7 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-indigo-100 shadow-sm text-[11px] font-bold text-indigo-700 select-none"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
              </span>
              Avaxa OS 2.0 — Nền tảng năng suất thế hệ mới
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-[3.25rem] font-black tracking-tight text-slate-900 leading-[1.08] font-display"
            >
              Hệ điều hành{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 animate-gradient-shift bg-[length:200%_auto]">
                năng suất
              </span>
              {' '}cho đội ngũ hiện đại
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-slate-500 text-sm sm:text-base font-medium leading-relaxed max-w-xl mx-auto lg:mx-0"
            >
              Quản lý dự án, tài liệu, lịch, chat và trợ lý AI — tất cả trong một workspace thống nhất.
              Giảm 40% thời gian chuyển đổi công cụ, tăng gấp đôi tốc độ hoàn thành sprint.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onSignUp}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] hover:bg-right text-white text-sm font-bold rounded-2xl shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer animate-gradient-shift"
              >
                Bắt đầu miễn phí
                <ArrowRight className="w-4 h-4" />
              </motion.button>
              <button className="w-full sm:w-auto px-6 py-4 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer group">
                <span className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
                  <Play className="w-3.5 h-3.5 text-indigo-600 ml-0.5" />
                </span>
                Xem demo 2 phút
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-center gap-4 pt-4 justify-center lg:justify-start"
            >
              <div className="flex -space-x-2">
                {['MT', 'TV', 'LA', 'NK', 'PH'].map((initials, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-white flex items-center justify-center text-[9px] font-black text-white shadow-sm"
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  <span className="text-slate-900 font-bold">4.9/5</span> từ 25,000+ nhóm
                </span>
              </div>
            </motion.div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-2xl animate-glow-pulse" />
            <ProductMockup />
          </div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="relative z-10 border-y border-slate-100 bg-white/50 backdrop-blur-sm py-8">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6">
            Được tin dùng bởi các team hàng đầu
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {TRUSTED_LOGOS.map((logo) => (
              <span key={logo} className="text-sm font-black text-slate-300 hover:text-slate-400 transition-colors select-none">
                {logo}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-20">
        <FadeInSection>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {[
              { value: activeUsers, suffix: '+', label: 'Nhóm đang hoạt động', icon: Users },
              { value: tasksCompleted, suffix: '+', label: 'Task hoàn thành/ngày', icon: Check },
              { value: 99.9, suffix: '%', label: 'Uptime đảm bảo', icon: Shield, decimals: 1 },
              { value: 40, suffix: '%', label: 'Tiết kiệm thời gian', icon: Zap },
            ].map((stat, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <stat.icon className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} decimals={'decimals' in stat ? stat.decimals : 0} />
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </FadeInSection>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24">
        <FadeInSection className="text-center mb-14">
          <span className="inline-block text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-3">Tính năng</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-display tracking-tight mb-4">
            Mọi thứ team bạn cần,<br className="hidden sm:block" /> trong một nền tảng
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-medium max-w-2xl mx-auto">
            Từ quản lý task đến AI trợ lý — Avaxa OS tích hợp toàn bộ workflow để team bạn làm việc nhanh hơn, thông minh hơn.
          </p>
        </FadeInSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((feature, i) => (
            <FadeInSection key={i} delay={i * 0.08}>
              <div className="group h-full p-6 rounded-2xl bg-white border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 cursor-default">
                <div className={`w-11 h-11 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
                </div>
                <h3 className="text-sm font-black text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">{feature.desc}</p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative z-10 bg-slate-900 text-white py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(236,72,153,0.1),transparent_60%)]" />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-6">
          <FadeInSection className="text-center mb-14">
            <span className="inline-block text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-3">Cách hoạt động</span>
            <h2 className="text-3xl sm:text-4xl font-black font-display tracking-tight mb-4">
              Bắt đầu trong 3 bước đơn giản
            </h2>
            <p className="text-slate-400 text-sm sm:text-base font-medium max-w-xl mx-auto">
              Không cần cài đặt phức tạp. Chỉ cần email để bắt đầu hành trình năng suất mới.
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {STEPS.map((step, i) => (
              <FadeInSection key={i} delay={i * 0.15}>
                <div className="relative text-center md:text-left">
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[calc(100%+1rem)] w-[calc(100%-2rem)] h-px bg-gradient-to-r from-indigo-500/50 to-transparent" />
                  )}
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-black font-display mb-5 shadow-lg shadow-indigo-500/30">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-black mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed">{step.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>

          <FadeInSection className="text-center mt-14">
            <button
              onClick={onSignUp}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 text-sm font-bold rounded-2xl shadow-xl hover:bg-slate-50 transition-all cursor-pointer"
            >
              Tạo workspace miễn phí
              <ArrowRight className="w-4 h-4" />
            </button>
          </FadeInSection>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24">
        <FadeInSection className="text-center mb-14">
          <span className="inline-block text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-3">Đánh giá</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-display tracking-tight mb-4">
            Team yêu thích Avaxa OS
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-medium max-w-xl mx-auto">
            Hàng nghìn nhóm trên toàn cầu đã chuyển sang Avaxa và không muốn quay lại.
          </p>
        </FadeInSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <FadeInSection key={i} delay={i * 0.1}>
              <div className="h-full p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col">
                <Quote className="w-8 h-8 text-indigo-200 mb-4" />
                <p className="text-sm text-slate-600 font-medium leading-relaxed flex-1 mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-xs font-black text-white`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t.name}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{t.role}</p>
                  </div>
                </div>
              </div>
            </FadeInSection>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24">
        <FadeInSection className="text-center mb-14">
          <span className="inline-block text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-3">Bảng giá</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-display tracking-tight mb-4">
            Linh hoạt cho mọi quy mô
          </h2>
          <p className="text-slate-500 text-sm sm:text-base font-medium max-w-xl mx-auto">
            Bắt đầu miễn phí, nâng cấp khi team bạn sẵn sàng. Không phí ẩn, không ràng buộc hợp đồng.
          </p>
        </FadeInSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {PLANS.map((plan, i) => (
            <FadeInSection key={i} delay={i * 0.1}>
              <div className={`relative p-7 rounded-2xl border transition-all ${
                plan.highlight
                  ? 'bg-slate-900 text-white border-slate-800 shadow-2xl shadow-indigo-500/20 scale-[1.02]'
                  : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
              }`}>
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-black uppercase tracking-wider rounded-full">
                    Phổ biến nhất
                  </span>
                )}
                <h3 className={`text-lg font-black mb-1 ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                <p className={`text-xs font-medium mb-5 ${plan.highlight ? 'text-slate-400' : 'text-slate-500'}`}>{plan.desc}</p>
                <div className="mb-6">
                  <span className={`text-3xl font-black font-display ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>{plan.price}</span>
                  {plan.period && <span className={`text-sm font-medium ${plan.highlight ? 'text-slate-400' : 'text-slate-500'}`}>{plan.period}</span>}
                </div>
                <ul className="space-y-3 mb-7">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className={`flex items-center gap-2.5 text-xs font-medium ${plan.highlight ? 'text-slate-300' : 'text-slate-600'}`}>
                      <Check className={`w-4 h-4 shrink-0 ${plan.highlight ? 'text-indigo-400' : 'text-emerald-500'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onSignUp}
                  className={`w-full py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    plan.highlight
                      ? 'bg-white text-slate-900 hover:bg-slate-100 shadow-lg'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </FadeInSection>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 pb-16 lg:pb-24">
        <FadeInSection>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-10 sm:p-14 text-center text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-black font-display tracking-tight mb-4">
                Sẵn sàng nâng cấp năng suất team?
              </h2>
              <p className="text-indigo-100 text-sm sm:text-base font-medium max-w-lg mx-auto mb-8">
                Tham gia cùng 25,000+ nhóm đang làm việc thông minh hơn với Avaxa OS. Miễn phí, không cần thẻ tín dụng.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={onSignUp}
                  className="w-full sm:w-auto px-8 py-4 bg-white text-indigo-700 text-sm font-bold rounded-2xl shadow-xl hover:bg-indigo-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  Bắt đầu miễn phí ngay
                  <ArrowRight className="w-4 h-4" />
                </button>
                <span className="text-xs text-indigo-200 font-semibold">
                  Thiết lập trong 30 giây · Hủy bất cứ lúc nào
                </span>
              </div>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-extrabold text-sm">A</div>
                <span className="font-display font-black text-base text-slate-900">avaxa OS</span>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Hệ điều hành năng suất cho team hiện đại. Made with ❤️ in Vietnam.
              </p>
            </div>
            {[
              { title: 'Sản phẩm', links: ['Tính năng', 'Bảng giá', 'Avaxa Brain AI', 'Roadmap'] },
              { title: 'Công ty', links: ['Về chúng tôi', 'Blog', 'Tuyển dụng', 'Liên hệ'] },
              { title: 'Hỗ trợ', links: ['Trung tâm trợ giúp', 'API Docs', 'Trạng thái hệ thống', 'Bảo mật'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <button className="text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors cursor-pointer">{link}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-slate-400 font-medium">© 2026 Avaxa OS. Mọi quyền được bảo lưu.</p>
            <div className="flex items-center gap-6">
              {['Điều khoản', 'Quyền riêng tư', 'Cookies'].map((link) => (
                <button key={link} className="text-[11px] text-slate-400 hover:text-slate-600 font-medium transition-colors cursor-pointer">{link}</button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
