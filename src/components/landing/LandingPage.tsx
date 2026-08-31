"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useInView } from 'motion/react';
import {
  Kanban, Sparkles, ArrowRight, Menu, X,
  Brain, FileText, MessageSquare, Calendar, BarChart3, Timer,
  Database, Users, Zap, Shield, Check, Play, Quote,
  LayoutGrid, Search, Mail, ListTodo,
  ChevronRight, ChevronLeft, ChevronDown, Send, Bot, CheckSquare, Plus,
  HelpCircle, ArrowUpRight, Globe, ShieldCheck, Flame, Layers,
  Cpu, Clock, Sliders, Workflow, TrendingUp, CheckCircle2, Lock,
  Share2, Award, Activity, Sparkle, RefreshCw, Eye, ThumbsUp, Moon, Sun,
  Laptop, Smartphone, Square, Palette, MousePointer, DollarSign,
  MapPin, Phone, Building2, Filter, Pause, Copy, CheckCheck,
  MoreHorizontal, Command, List, Table, Columns3, Heart, Smile,
  RotateCcw, Trash2, Edit3, AlertTriangle, CircleDot, ExternalLink,
  Wand2, SlidersHorizontal, CalendarRange, Rocket, Crown
} from 'lucide-react';
import ThemeSwitch from '../ThemeSwitch';
import LanguageSwitch from '../LanguageSwitch';
import { Button, Badge, SegmentedControl } from '../ui';
import { useTranslation } from '@/contexts/TranslationContext';
import { SUGGESTED_PRICES, type BillingCycle, type BillingPlan, type SelfServeBillingPlan } from '@/lib/billing/plans';
import { ApexaAiIcon, ApexaAiAvatar } from '../ApexaAiIcon';
import { ApexaLogoIcon } from '../ApexaLogo';
import LandingFooter from './LandingFooter';

// GSAP Animations & Interactive SaaS Components
import {
  GsapAmbientGlow,
  GsapStaggerReveal,
  GsapScrollCascade,
  GsapAnimatedCounter,
  GsapMagneticButton,
  GsapCard3DTilt,
} from "@/components/animations";


interface LandingPageProps {
  onSignUp: () => void;
  onSignIn: () => void;
}

interface MockSubtaskItem {
  id: string;
  text: string;
  done: boolean;
}

interface MockTask {
  id: string;
  title: string;
  column: 'todo' | 'inprogress' | 'done';
  priority: 'Khẩn cấp' | 'Cao' | 'Trung bình' | 'Thấp' | 'Urgent' | 'High' | 'Normal' | 'Low';
  dueDate: string;
  assignee: string;
  assigneeBg: string;
  tag: string;
  subtasks: {
    total: number;
    done: number;
    items?: MockSubtaskItem[];
  };
  checked?: boolean;
  description?: string;
  spaceId?: 'core' | 'design' | 'ai';
  progress?: number;
}

interface MockChatMessage {
  id: string;
  sender: string;
  avatar: string;
  bg: string;
  text: string;
  time: string;
  isAi?: boolean;
  reactions: Record<string, number>;
}

type PublicBillingPrice = {
  plan: SelfServeBillingPlan;
  cycle: BillingCycle;
  unit_amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  interval_count: number;
};

const ZERO_DECIMAL_CURRENCIES = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf']);

interface PlatformCapabilityItem {
  name: string;
  nameVi: string;
  badge?: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
}

const PLATFORM_CAPABILITIES_LIST: PlatformCapabilityItem[] = [
  { name: 'Kanban Sprints', nameVi: 'Bảng Kanban', icon: Kanban, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { name: 'Smart Docs 2.0', nameVi: 'Smart Docs 2.0', icon: FileText, color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  { name: 'Apexa Brain AI', nameVi: 'Apexa Brain AI', badge: 'Copilot', icon: ApexaAiIcon, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  { name: 'Realtime Chat', nameVi: 'Kênh Chat Nhóm', badge: 'Live', icon: MessageSquare, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { name: 'KPI Analytics', nameVi: 'Phân Tích KPI', icon: BarChart3, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { name: 'CRM Sales', nameVi: 'Quản Lý CRM', icon: Users, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  { name: 'ERP Operations', nameVi: 'Vận Hành ERP', icon: Building2, color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
  { name: 'Finance Hub', nameVi: 'Quản Lý Thu Chi', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { name: 'Continuous Canvas', nameVi: 'Bảng Trắng Canvas', icon: Palette, color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' },
  { name: 'Sprint Calendar', nameVi: 'Lịch Biểu Sprint', icon: Calendar, color: 'text-teal-500', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
  { name: 'Goals & OKRs', nameVi: 'Mục Tiêu & OKR', icon: Award, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { name: 'Local-First Engine', nameVi: 'Local-First Sync', badge: '11ms', icon: Cpu, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
];

const PLATFORM_CAPABILITIES = [
  'Kanban', 'Smart Docs', 'Realtime Chat', 'CRM', 'ERP', 'Finance', 'Whiteboard', 'Apexa Brain AI'
];

function AnimatedCounter({ value, duration = 2, suffix = '', prefix = '', decimals = 0 }: { value: number; duration?: number; suffix?: string; prefix?: string; decimals?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const start = 0;
    const end = value;
    const totalFrames = Math.round(duration * 60);
    let frame = 0;

    const counter = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const currentCount = start + (end - start) * (1 - Math.pow(1 - progress, 3));
      setCount(currentCount);

      if (frame === totalFrames) {
        clearInterval(counter);
        setCount(end);
      }
    }, 1000 / 60);

    return () => clearInterval(counter);
  }, [inView, value, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toFixed(decimals)}
      {suffix}
    </span>
  );
}

function FadeInSection({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FeatureCardVisual({ type, isVietnamese }: { type?: string; isVietnamese: boolean }) {
  switch (type) {
    case 'kanban':
      return (
        <div className="w-full bg-slate-50/80 dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-200/60 dark:border-white/5 space-y-1.5 text-[10px] my-3">
          <div className="flex items-center justify-between text-slate-400 font-bold text-[9px] px-1">
            <span>TO DO (3)</span>
            <span className="text-blue-500">IN PROGRESS (2)</span>
            <span className="text-emerald-500">DONE (8)</span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/70 dark:border-white/10 shadow-2xs flex items-center justify-between">
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">
              {isVietnamese ? 'Thiết kế Design System 2.0' : 'Design System 2.0 Specs'}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-sky-400">P1</span>
          </div>
        </div>
      );
    case 'ai':
      return (
        <div className="w-full bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-xl p-2.5 border border-indigo-200/60 dark:border-indigo-500/25 space-y-1.5 text-[10px] my-3">
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-[9px]">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>APEXA BRAIN AI</span>
          </div>
          <div className="bg-white/90 dark:bg-slate-900/90 p-2 rounded-lg border border-indigo-100 dark:border-indigo-500/20 shadow-2xs text-slate-700 dark:text-slate-300">
            <p className="font-medium truncate">{isVietnamese ? '✨ Tự động tạo 5 subtasks Sprint' : '✨ Generated 5 subtasks for Sprint'}</p>
            <span className="text-[8.5px] font-bold text-emerald-600 dark:text-emerald-400">✓ Hoàn thành trong 0.12s</span>
          </div>
        </div>
      );
    case 'docs':
      return (
        <div className="w-full bg-slate-50/80 dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-200/60 dark:border-white/5 space-y-2 text-[10px] my-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
              <span className="font-bold text-violet-600 dark:text-violet-400 text-[9px]">DOCS CRDTs</span>
            </div>
            <div className="flex -space-x-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[7px] font-bold flex items-center justify-center border border-white dark:border-slate-800">MA</span>
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[7px] font-bold flex items-center justify-center border border-white dark:border-slate-800">TH</span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/70 dark:border-white/10 shadow-2xs font-mono text-[9px] text-slate-600 dark:text-slate-300 truncate">
            {isVietnamese ? '📄 /prd-v2.0 • Minh Anh đang soạn...' : '📄 /prd-v2.0 • Live editing...'}
          </div>
        </div>
      );
    case 'chat':
      return (
        <div className="w-full bg-slate-50/80 dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-200/60 dark:border-white/5 space-y-1.5 text-[10px] my-3">
          <div className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 p-2 rounded-lg border border-emerald-500/20">
            <p className="font-medium truncate">{isVietnamese ? '💬 Đã deploy staging thành công!' : '💬 Staging deployed successfully!'}</p>
          </div>
          <div className="flex gap-1">
            <span className="px-1.5 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 text-[8.5px] font-bold text-slate-700 dark:text-slate-300 shadow-2xs">🚀 4</span>
            <span className="px-1.5 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 text-[8.5px] font-bold text-slate-700 dark:text-slate-300 shadow-2xs">🔥 6</span>
            <span className="px-1.5 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 text-[8.5px] font-bold text-slate-700 dark:text-slate-300 shadow-2xs">💙 2</span>
          </div>
        </div>
      );
    case 'calendar':
      return (
        <div className="w-full bg-slate-50/80 dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-200/60 dark:border-white/5 space-y-1.5 text-[10px] my-3">
          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
            <span>TIMELINE GANTT</span>
            <span className="text-emerald-500 font-bold flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
              G-CAL SYNC
            </span>
          </div>
          <div className="relative h-5 bg-slate-200/60 dark:bg-slate-800 rounded-md overflow-hidden flex items-center px-2">
            <div className="absolute inset-y-1 left-2 right-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded text-[8px] text-white font-black flex items-center px-1.5 truncate">
              Sprint 14 Release
            </div>
          </div>
        </div>
      );
    case 'analytics':
      return (
        <div className="w-full bg-slate-50/80 dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-200/60 dark:border-white/5 space-y-1 text-[10px] my-3">
          <div className="flex items-center justify-between text-[9px]">
            <span className="font-bold text-slate-400">VELOCITY BURNDOWN</span>
            <span className="font-bold text-amber-500">+18% Năng suất</span>
          </div>
          <svg className="w-full h-6 text-amber-500" viewBox="0 0 100 24" fill="none">
            <path d="M0 20 Q 25 18, 50 10 T 100 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M0 20 Q 25 18, 50 10 T 100 4 L 100 24 L 0 24 Z" fill="currentColor" fillOpacity="0.1" />
          </svg>
        </div>
      );
    case 'pomodoro':
      return (
        <div className="w-full bg-slate-50/80 dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-200/60 dark:border-white/5 space-y-1.5 text-[10px] my-3">
          <div className="flex items-center justify-between text-[9px]">
            <span className="font-bold text-rose-600 dark:text-rose-400">DEEP FOCUS</span>
            <span className="font-bold text-slate-500">25:00 min</span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200/70 dark:border-white/10 flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300">🔥 4.8h Streak</span>
            <span className="text-[8px] font-extrabold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">Active</span>
          </div>
        </div>
      );
    case 'database':
      return (
        <div className="w-full bg-slate-50/80 dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-200/60 dark:border-white/5 space-y-1.5 text-[10px] my-3">
          <div className="flex items-center justify-between text-[9px] font-bold text-blue-500">
            <span>RELATIONAL SCHEMA</span>
            <span>NO-CODE</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[8.5px]">
            <span className="bg-white dark:bg-slate-800 p-1 rounded border border-slate-200/60 dark:border-white/10 font-medium truncate text-center text-slate-700 dark:text-slate-300">Status</span>
            <span className="bg-white dark:bg-slate-800 p-1 rounded border border-slate-200/60 dark:border-white/10 font-medium truncate text-center text-slate-700 dark:text-slate-300">Assignee</span>
            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-1 rounded border border-emerald-500/20 font-bold truncate text-center">$ Revenue</span>
          </div>
        </div>
      );
    default:
      return null;
  }
}

function WorkflowStepVisual({ step, isVietnamese }: { step: string; isVietnamese: boolean }) {
  switch (step) {
    case '01':
      return (
        <div className="w-full bg-slate-50/80 dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-200/60 dark:border-white/5 space-y-1.5 text-[10px] my-3">
          <div className="flex items-center justify-between text-[9px] font-bold text-blue-600 dark:text-sky-400">
            <span>SPACES & ROLES</span>
            <span className="text-emerald-500 font-extrabold">✓ 30s Setup</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200/70 dark:border-white/10 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">🚀 Core Product</span>
            <span className="ml-auto text-[8.5px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-sky-400 px-1.5 py-0.5 rounded">Admin</span>
          </div>
        </div>
      );
    case '02':
      return (
        <div className="w-full bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-xl p-2.5 border border-indigo-200/60 dark:border-indigo-500/25 space-y-1.5 text-[10px] my-3">
          <div className="flex items-center justify-between text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
            <span>AI GOAL BREAKDOWN</span>
            <span className="text-indigo-500 font-extrabold">1-Click</span>
          </div>
          <div className="bg-white/90 dark:bg-slate-900/90 p-1.5 rounded-lg border border-indigo-100 dark:border-indigo-500/20 shadow-2xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
            <span className="font-medium truncate text-[9.5px]">{isVietnamese ? 'PRD ➔ 12 Tasks + Deadline' : 'PRD ➔ 12 Tasks + Deadlines'}</span>
          </div>
        </div>
      );
    case '03':
      return (
        <div className="w-full bg-slate-50/80 dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-200/60 dark:border-white/5 space-y-1.5 text-[10px] my-3">
          <div className="flex items-center justify-between text-[9px] font-bold text-violet-600 dark:text-violet-400">
            <span>CONTINUOUS CANVAS</span>
            <span className="text-emerald-500 font-extrabold">Live Sync</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[8.5px] font-bold text-center">
            <span className="bg-white dark:bg-slate-800 p-1 rounded border border-slate-200/60 dark:border-white/10 text-blue-600 dark:text-sky-400">Kanban</span>
            <span className="bg-white dark:bg-slate-800 p-1 rounded border border-slate-200/60 dark:border-white/10 text-violet-600 dark:text-violet-400">Docs</span>
            <span className="bg-white dark:bg-slate-800 p-1 rounded border border-slate-200/60 dark:border-white/10 text-emerald-600 dark:text-emerald-400">Chat</span>
          </div>
        </div>
      );
    case '04':
      return (
        <div className="w-full bg-slate-50/80 dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-200/60 dark:border-white/5 space-y-1 text-[10px] my-3">
          <div className="flex items-center justify-between text-[9px]">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">VELOCITY RETRO</span>
            <span className="font-bold text-emerald-500">+45% Sprint</span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200/70 dark:border-white/10 flex items-center justify-between text-[9px]">
            <span className="font-bold text-slate-700 dark:text-slate-300">📊 AI Retro Weekly</span>
            <span className="text-[8px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Ready</span>
          </div>
        </div>
      );
    default:
      return null;
  }
}

function DepartmentScenarioVisual({ id, isVietnamese }: { id: string; isVietnamese: boolean }) {
  switch (id) {
    case 'product':
      return (
        <div className="w-full bg-slate-900/90 dark:bg-slate-950/90 text-white rounded-2xl p-4 sm:p-5 border border-white/10 shadow-2xl space-y-3.5 font-sans text-xs">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono font-black text-xs text-sky-400">SPRINT 24 · ACTIVE</span>
              <span className="bg-white/10 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">3d left</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              <Check className="w-3 h-3 stroke-[3]" />
              <span>CI/CD #204 Passed</span>
            </div>
          </div>

          {/* Mini Kanban Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Col 1: In Progress */}
            <div className="bg-slate-800/60 rounded-xl p-3 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-400">
                <span>IN PROGRESS (2)</span>
                <span className="text-sky-400">75%</span>
              </div>

              {/* Task 1 */}
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/10 space-y-1.5 hover:border-indigo-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-[11px]">feat(auth): Passkey WebAuthn</span>
                  <span className="w-4 h-4 rounded-full bg-indigo-500 text-[9px] font-black flex items-center justify-center">PM</span>
                </div>
                <div className="flex items-center gap-1.5 text-[9.5px]">
                  <span className="bg-blue-500/20 text-sky-400 px-1.5 py-0.5 rounded font-mono">#security</span>
                  <span className="text-emerald-400 font-bold">✓ CRDTs Sync</span>
                </div>
              </div>

              {/* Task 2 */}
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-[11px]">PRD: Continuous Canvas v2</span>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <span className="text-[9.5px] text-slate-400 block">{isVietnamese ? 'AI sinh 8 Subtasks & Checklist' : 'AI generated 8 tasks & DoD'}</span>
              </div>
            </div>

            {/* Col 2: Code Review & Done */}
            <div className="bg-slate-800/60 rounded-xl p-3 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-400">
                <span>PR REVIEW & DONE</span>
                <span className="text-emerald-400">100%</span>
              </div>

              {/* Task 3 */}
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-emerald-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300 text-[11px]">WebSocket Reconnect</span>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="flex items-center gap-1.5 text-[9.5px] text-slate-400">
                  <span className="font-mono text-purple-400">PR #412</span>
                  <span>· Merged to main</span>
                </div>
              </div>

              {/* Live typing status */}
              <div className="bg-slate-950/60 p-2 rounded-lg border border-white/5 text-[10px] text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>{isVietnamese ? 'Lan đang viết PRD: AI Copilot...' : 'Lan is editing PRD: AI Copilot...'}</span>
              </div>
            </div>
          </div>

          {/* Bottom Terminal Bar */}
          <div className="bg-black/40 rounded-lg px-3 py-1.5 border border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>$ git push origin main ➔ Automated Deploy</span>
            <span className="text-emerald-400 font-bold">11.4ms Latency</span>
          </div>
        </div>
      );

    case 'growth':
      return (
        <div className="w-full bg-slate-900/90 dark:bg-slate-950/90 text-white rounded-2xl p-4 sm:p-5 border border-white/10 shadow-2xl space-y-3.5 font-sans text-xs">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span className="font-black text-xs text-indigo-400">GTM LAUNCH & CRM PIPELINE</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
              <TrendingUp className="w-3 h-3" />
              <span>+34% Conversion</span>
            </div>
          </div>

          {/* Campaign Funnel Tracks */}
          <div className="space-y-2.5">
            {/* Track 1 */}
            <div className="bg-slate-800/60 rounded-xl p-3 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-white">🚀 Product Hunt + Twitter/X Launch</span>
                <span className="text-indigo-400 font-mono font-bold">85% Ready</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: '85%' }} />
              </div>
              <div className="flex items-center justify-between text-[9.5px] text-slate-400">
                <span>Phase 2: Teaser Campaign</span>
                <span className="text-emerald-400 font-bold">Live in 2 days</span>
              </div>
            </div>

            {/* AI Copywriter Widget */}
            <div className="bg-gradient-to-br from-indigo-950/60 to-purple-950/60 rounded-xl p-3 border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Gemini AI Copywriter
                </span>
                <span className="bg-indigo-500/20 text-indigo-300 text-[9px] font-bold px-1.5 py-0.5 rounded">Prompt Active</span>
              </div>
              <p className="text-[10px] text-slate-300 italic bg-black/30 p-2 rounded-lg border border-white/5">
                &ldquo;Tối ưu 75% chi phí SaaS với Continuous Canvas thế hệ mới từ Apexa.&rdquo;
              </p>
            </div>
          </div>

          {/* CRM Metric Bottom Bar */}
          <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
            <div className="bg-slate-800/60 p-2 rounded-lg border border-white/5">
              <span className="text-slate-400 block">Lead Funnel Captured</span>
              <span className="text-base font-black text-white">2,450 Leads</span>
            </div>
            <div className="bg-slate-800/60 p-2 rounded-lg border border-white/5">
              <span className="text-slate-400 block">Customer Acq. Cost</span>
              <span className="text-base font-black text-emerald-400">$4.20 (-40%)</span>
            </div>
          </div>
        </div>
      );

    case 'ops':
      return (
        <div className="w-full bg-slate-900/90 dark:bg-slate-950/90 text-white rounded-2xl p-4 sm:p-5 border border-white/10 shadow-2xl space-y-3.5 font-sans text-xs">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              <span className="font-black text-xs text-cyan-400">FINANCIAL LEDGER & OKR GOALS</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
              <DollarSign className="w-3 h-3" />
              <span>Tiết kiệm 75% SaaS</span>
            </div>
          </div>

          {/* Budget Allocation Progress Bars */}
          <div className="space-y-2 bg-slate-800/60 rounded-xl p-3 border border-white/5">
            <div className="text-[10.5px] font-bold text-slate-300 mb-1">{isVietnamese ? 'NGÂN SÁCH CÁC PHÒNG BAN' : 'DEPARTMENT BUDGET ALLOCATION'}</div>

            {/* Row 1 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9.5px]">
                <span className="text-slate-400">R&D & Product Engineering</span>
                <span className="font-mono text-cyan-400 font-bold">$42,000 / $50k (84%)</span>
              </div>
              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full" style={{ width: '84%' }} />
              </div>
            </div>

            {/* Row 2 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9.5px]">
                <span className="text-slate-400">Growth & Marketing Operations</span>
                <span className="font-mono text-blue-400 font-bold">$18,500 / $25k (74%)</span>
              </div>
              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '74%' }} />
              </div>
            </div>
          </div>

          {/* OKR & Approval Row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-white/5 space-y-1">
              <span className="text-[9.5px] font-bold text-slate-400 block">COMPANY OKR Q3</span>
              <div className="text-sm font-black text-emerald-400">{isVietnamese ? '88% Hoàn thành' : '88% Achieved'}</div>
              <span className="text-[9px] text-slate-400">Target ARR +65%</span>
            </div>

            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-white/5 space-y-1">
              <span className="text-[9.5px] font-bold text-slate-400 block">AUTOMATED APPROVAL</span>
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Invoice #8921</span>
              </div>
              <span className="text-[9px] text-emerald-400 font-bold">Approved by CEO ✓</span>
            </div>
          </div>
        </div>
      );

    case 'design':
      return (
        <div className="w-full bg-slate-900/90 dark:bg-slate-950/90 text-white rounded-2xl p-4 sm:p-5 border border-white/10 shadow-2xl space-y-3.5 font-sans text-xs">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span className="font-black text-xs text-purple-400">INFINITE WHITEBOARD & FIGMA</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
              <Palette className="w-3 h-3" />
              <span>100% Sync Prototype</span>
            </div>
          </div>

          {/* Sticky Notes & Canvas Area */}
          <div className="bg-slate-950/70 rounded-xl p-3 border border-white/10 relative overflow-hidden space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              {/* Sticky Note 1 */}
              <div className="bg-amber-400 text-slate-900 p-2.5 rounded-lg shadow-md font-bold text-[10px] transform -rotate-1">
                <span className="block text-[8px] opacity-70 uppercase">User Flow</span>
                💡 Onboarding không cần thẻ tín dụng
              </div>

              {/* Sticky Note 2 */}
              <div className="bg-purple-600 text-white p-2.5 rounded-lg shadow-md font-bold text-[10px] transform rotate-1">
                <span className="block text-[8px] opacity-70 uppercase">Design Tokens</span>
                🎨 Primary: #6366F1 / Radius 16px
              </div>
            </div>

            {/* Live Figma Cursor comment bubble */}
            <div className="bg-slate-800/90 p-2 rounded-lg border border-indigo-500/30 flex items-center gap-2 text-[10px]">
              <MousePointer className="w-3.5 h-3.5 text-pink-400 shrink-0 transform -rotate-45" />
              <span className="text-slate-300">
                <strong className="text-pink-400">Quân (Design Lead):</strong> &ldquo;Giao diện này lên mobile rất mượt! ✨&rdquo;
              </span>
            </div>
          </div>

          {/* Design System Tokens Chips */}
          <div className="flex items-center justify-between text-[9.5px] font-mono text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-white/5">
            <span>Tokens: Spacing-24</span>
            <span>Elevation-2xl</span>
            <span className="text-purple-400 font-bold">Figma Plugin Connected</span>
          </div>
        </div>
      );

    default:
      return null;
  }
}

/* =========================================================================
   REALISTIC IN-APP WORKSPACE SHOWCASE (AUTHENTIC DESKTOP EXPERIENCE)
   ========================================================================= */
function ApexaWorkspaceShowcase({ onSignUp }: { onSignUp: () => void }) {
  const { isVietnamese } = useTranslation();
  const [activeSpace, setActiveSpace] = useState<'core' | 'design' | 'ai'>('core');
  const [activeTab, setActiveTab] = useState<'board' | 'docs' | 'ai' | 'analytics' | 'chat'>('board');
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'timeline'>('board');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState('');
  const [syncDiagnosticOpen, setSyncDiagnosticOpen] = useState(false);
  const [focusPlaying, setFocusPlaying] = useState(true);
  const [focusStreakHours, setFocusStreakHours] = useState(4.8);
  const [aiPrioritizeToast, setAiPrioritizeToast] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [hoveredChartPoint, setHoveredChartPoint] = useState<number | null>(null);

  // Initial Multi-Space Tasks Dataset
  const [tasks, setTasks] = useState<MockTask[]>(() => [
    // Core Product Tasks
    {
      id: 'task-1',
      title: isVietnamese ? 'Thiết kế giao diện Continuous Canvas phẳng thế hệ mới' : 'Design Continuous Unified Canvas next-gen flat UI',
      column: 'done',
      priority: isVietnamese ? 'Khẩn cấp' : 'Urgent',
      dueDate: isVietnamese ? 'Hôm nay' : 'Today',
      assignee: 'HX',
      assigneeBg: 'from-blue-500 to-indigo-600',
      tag: 'UI/UX',
      spaceId: 'core',
      checked: true,
      progress: 100,
      description: isVietnamese
        ? 'Tái cấu trúc layout liên tục 3 tầng với Framer Motion GPU rendering, hỗ trợ 60fps khi render 500+ dynamic canvas widgets.'
        : 'Restructure 3-tier continuous layout with GPU-accelerated motion pipeline, ensuring 60fps on 500+ live canvas blocks.',
      subtasks: {
        total: 4,
        done: 4,
        items: [
          { id: 'st-1', text: isVietnamese ? 'Xây dựng layout continuous canvas 3 lớp' : 'Build 3-layer continuous canvas layout', done: true },
          { id: 'st-2', text: isVietnamese ? 'Tối ưu tốc độ render GPU với Motion' : 'Optimize GPU render pipeline with Motion', done: true },
          { id: 'st-3', text: isVietnamese ? 'Tương thích hoàn hảo Dark/Light mode tokens' : '100% Dark/Light mode token consistency', done: true },
          { id: 'st-4', text: isVietnamese ? 'Kiểm thử UI responsive trên tablet & mobile' : 'Responsive verification on mobile & tablet', done: true },
        ]
      }
    },
    {
      id: 'task-2',
      title: isVietnamese ? 'Tích hợp Trợ lý Apexa Brain Copilot (Gemini)' : 'Integrate Apexa Brain Copilot (Gemini)',
      column: 'inprogress',
      priority: isVietnamese ? 'Khẩn cấp' : 'Urgent',
      dueDate: '15:00',
      assignee: 'AI',
      assigneeBg: 'from-indigo-600 to-purple-600',
      tag: 'AI Engine',
      spaceId: 'core',
      checked: false,
      progress: 60,
      description: isVietnamese
        ? 'Kết nối Gemini 1.5 Pro / Flash streaming API với Function Calling tự động hóa lập kế hoạch và phân rã công việc.'
        : 'Connect Gemini 1.5 Pro / Flash streaming API with real-time Function Calling for sprint automation & decomposition.',
      subtasks: {
        total: 5,
        done: 3,
        items: [
          { id: 'st-2-1', text: isVietnamese ? 'Kết nối Gemini streaming API' : 'Connect Gemini streaming API', done: true },
          { id: 'st-2-2', text: isVietnamese ? 'Function Calling tự tạo task trên Kanban' : 'Function calling tool to auto-create tasks', done: true },
          { id: 'st-2-3', text: isVietnamese ? 'Tối ưu system prompt & context window' : 'System prompt fine-tuning & context injection', done: true },
          { id: 'st-2-4', text: isVietnamese ? 'Benchmark latency phản hồi < 200ms TTFT' : 'Benchmark response latency < 200ms TTFT', done: false },
          { id: 'st-2-5', text: isVietnamese ? 'Audit rủi ro bảo mật & rate limit guard' : 'Security audit & rate limit guardrails', done: false },
        ]
      }
    },
    {
      id: 'task-3',
      title: isVietnamese ? 'Tối ưu hóa Local-First Cache và hàng đợi đồng bộ' : 'Optimize Local-First Cache and sync queue',
      column: 'inprogress',
      priority: isVietnamese ? 'Cao' : 'High',
      dueDate: isVietnamese ? 'Ngày mai' : 'Tomorrow',
      assignee: 'MA',
      assigneeBg: 'from-emerald-500 to-teal-600',
      tag: 'Core DB',
      spaceId: 'core',
      checked: false,
      progress: 33,
      description: isVietnamese
        ? 'Tăng tốc độ truy xuất trên IndexedDB schema v4 kết hợp thuật toán CRDTs Yjs chống xung đột khi đồng chỉnh sửa.'
        : 'Accelerate IndexedDB schema v4 read/write cycles paired with Yjs CRDTs for zero-conflict concurrent co-authoring.',
      subtasks: {
        total: 3,
        done: 1,
        items: [
          { id: 'st-3-1', text: isVietnamese ? 'Khởi tạo IndexedDB schema version 4' : 'Initialize IndexedDB schema version 4', done: true },
          { id: 'st-3-2', text: isVietnamese ? 'Thuật toán CRDTs Yjs chống xung đột' : 'Yjs CRDTs conflict-resolution co-authoring', done: false },
          { id: 'st-3-3', text: isVietnamese ? 'Hàng đợi offline sync retry exponential backoff' : 'Offline sync retry with exponential backoff', done: false },
        ]
      }
    },
    {
      id: 'task-4',
      title: isVietnamese ? 'Đồng bộ 2 chiều tức thì Google Calendar & Lịch Sprint' : '2-way instant synchronization with Google Calendar',
      column: 'todo',
      priority: isVietnamese ? 'Trung bình' : 'Normal',
      dueDate: '20/08',
      assignee: 'QB',
      assigneeBg: 'from-amber-500 to-orange-600',
      tag: 'Integration',
      spaceId: 'core',
      checked: false,
      progress: 0,
      description: isVietnamese
        ? 'Đồng bộ hai chiều real-time giữa Google Calendar events và Sprint Milestones của Apexa thông qua Webhook listener.'
        : 'Bidirectional sync between Google Calendar events and Apexa Sprint Milestones via real-time Webhook listener.',
      subtasks: {
        total: 2,
        done: 0,
        items: [
          { id: 'st-4-1', text: isVietnamese ? 'Đăng ký Google OAuth2 & Calendar API Scopes' : 'Register Google OAuth2 & Calendar API Scopes', done: false },
          { id: 'st-4-2', text: isVietnamese ? 'Webhook lắng nghe thay đổi sự kiện thời gian thực' : 'Webhook listener for realtime event delta sync', done: false },
        ]
      }
    },

    // Brand & Design Tasks
    {
      id: 'task-d1',
      title: isVietnamese ? 'Đồng bộ Design System 2.0 Tokens với Tailwind CSS' : 'Sync Design System 2.0 Tokens with Tailwind CSS',
      column: 'inprogress',
      priority: isVietnamese ? 'Cao' : 'High',
      dueDate: '18:00',
      assignee: 'HX',
      assigneeBg: 'from-pink-500 to-rose-600',
      tag: 'Figma',
      spaceId: 'design',
      checked: false,
      progress: 50,
      description: isVietnamese
        ? 'Xuất token màu, typography scale và hiệu ứng glassmorphic trực tiếp từ Figma Variables sang mã nguồn.'
        : 'Export color tokens, typography scale and glassmorphic elevation variables directly from Figma to code.',
      subtasks: {
        total: 4,
        done: 2,
        items: [
          { id: 'st-d1-1', text: 'Color palette & semantic dark tokens', done: true },
          { id: 'st-d1-2', text: 'Typography scale & spacing scale', done: true },
          { id: 'st-d1-3', text: 'Glassmorphic component library spec', done: false },
          { id: 'st-d1-4', text: 'Motion guidelines & micro-interactions', done: false }
        ]
      }
    },
    {
      id: 'task-d2',
      title: isVietnamese ? 'Tạo bộ 3D Isometric Assets cho Bento Grid Showcase' : 'Craft 3D Isometric Assets for Bento Grid Showcase',
      column: 'done',
      priority: isVietnamese ? 'Khẩn cấp' : 'Urgent',
      dueDate: isVietnamese ? 'Hôm nay' : 'Today',
      assignee: 'MA',
      assigneeBg: 'from-purple-500 to-indigo-600',
      tag: '3D Render',
      spaceId: 'design',
      checked: true,
      progress: 100,
      description: isVietnamese ? 'Tối ưu mô hình 3D Spline và nén WebP lossless giảm 80% dung lượng tải trang.' : 'Optimize Spline 3D assets with lossless WebP compression saving 80% page load bandwidth.',
      subtasks: {
        total: 2,
        done: 2,
        items: [
          { id: 'st-d2-1', text: 'Spline 3D interactive model export', done: true },
          { id: 'st-d2-2', text: 'WebP lossless compression', done: true }
        ]
      }
    },
    {
      id: 'task-d3',
      title: isVietnamese ? 'Kiểm tra tỷ lệ tương phản chuẩn WCAG 2.1 AAA' : 'Audit contrast ratios for WCAG 2.1 AAA Compliance',
      column: 'todo',
      priority: isVietnamese ? 'Trung bình' : 'Normal',
      dueDate: '22/08',
      assignee: 'QB',
      assigneeBg: 'from-emerald-500 to-teal-600',
      tag: 'A11y',
      spaceId: 'design',
      checked: false,
      progress: 0,
      description: isVietnamese ? 'Đảm bảo mọi văn bản và border trên nền Dark Mode đạt chuẩn trợ năng AAA tối thiểu 7:1.' : 'Verify all copy and borders in Dark Mode meet AAA accessibility ratio of 7:1.',
      subtasks: {
        total: 2,
        done: 0,
        items: [
          { id: 'st-d3-1', text: 'Scan all landing text elements', done: false },
          { id: 'st-d3-2', text: 'Adjust contrast on slate-400 borders', done: false }
        ]
      }
    },

    // AI Engine Lab Tasks
    {
      id: 'task-ai1',
      title: isVietnamese ? 'Fine-tune Gemini Flash trên dataset quy trình Sprint' : 'Fine-tune Gemini Flash on Sprint Operations dataset',
      column: 'inprogress',
      priority: isVietnamese ? 'Khẩn cấp' : 'Urgent',
      dueDate: '16:30',
      assignee: 'AI',
      assigneeBg: 'from-indigo-600 to-purple-600',
      tag: 'Model ML',
      spaceId: 'ai',
      checked: false,
      progress: 75,
      description: isVietnamese ? 'Huấn luyện 5,000 cặp câu mẫu quản lý dự án để AI hiểu sâu ngữ cảnh doanh nghiệp.' : 'Train on 5,000 synthetic PM prompt pairs for high-precision business intent extraction.',
      subtasks: {
        total: 4,
        done: 3,
        items: [
          { id: 'st-ai1-1', text: 'Curate 5,000 synthetic PM prompt pairs', done: true },
          { id: 'st-ai1-2', text: 'Evaluate BLEU & ROUGE alignment score', done: true },
          { id: 'st-ai1-3', text: 'Deploy endpoint with vertex latency caching', done: true },
          { id: 'st-ai1-4', text: 'Run edge-case hallucination benchmark', done: false }
        ]
      }
    },
    {
      id: 'task-ai2',
      title: isVietnamese ? 'Xây dựng Vector Index nhúng IndexedDB trên trình duyệt' : 'Build In-Browser IndexedDB Vector Index',
      column: 'done',
      priority: isVietnamese ? 'Cao' : 'High',
      dueDate: isVietnamese ? 'Hôm nay' : 'Today',
      assignee: 'HX',
      assigneeBg: 'from-cyan-500 to-blue-600',
      tag: 'Vector DB',
      spaceId: 'ai',
      checked: true,
      progress: 100,
      description: isVietnamese ? 'Chạy vector semantic search trực tiếp trên WebAssembly IndexedDB với độ trễ < 12ms.' : 'Run in-browser vector search via WebAssembly IndexedDB with search latency < 12ms.',
      subtasks: {
        total: 2,
        done: 2,
        items: [
          { id: 'st-ai2-1', text: 'HNSW vector graph index in WebAssembly', done: true },
          { id: 'st-ai2-2', text: 'Embedding query latency < 12ms', done: true }
        ]
      }
    },
    {
      id: 'task-ai3',
      title: isVietnamese ? 'Thử nghiệm Agentic Multi-step Autonomous Loop' : 'Autonomous Multi-agent Task Execution Loop',
      column: 'todo',
      priority: isVietnamese ? 'Cao' : 'High',
      dueDate: '25/08',
      assignee: 'MA',
      assigneeBg: 'from-violet-500 to-purple-600',
      tag: 'Agentic',
      spaceId: 'ai',
      checked: false,
      progress: 0,
      description: isVietnamese ? 'Vòng lặp tự lập kế hoạch nhiều bước với cơ chế tự kiểm chứng và xác nhận người dùng.' : 'Multi-step goal planner with autonomous reflection and human-in-the-loop safeguards.',
      subtasks: {
        total: 2,
        done: 0,
        items: [
          { id: 'st-ai3-1', text: 'Goal planner & tool call reflection loop', done: false },
          { id: 'st-ai3-2', text: 'Human-in-the-loop confirmation modal', done: false }
        ]
      }
    }
  ]);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [quickAddColumn, setQuickAddColumn] = useState<'todo' | 'inprogress' | 'done'>('todo');
  const [inlineAddOpen, setInlineAddOpen] = useState<string | null>(null);

  // AI Assistant Chat state
  const [aiInput, setAiInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [aiChatLog, setAiChatLog] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>(() => [
    {
      sender: 'bot',
      text: isVietnamese
        ? '👋 Xin chào! Tôi là Apexa Brain Copilot (Gemini Native).\nTôi đã đồng bộ toàn bộ bối cảnh Sprint: Đội ngũ đang hoàn thành 78% kế hoạch với độ trễ 11.4ms. Bạn muốn tôi tạo task tự động, phân tích rủi ro hay tóm tắt tài liệu PRD?'
        : '👋 Hello! I am Apexa Brain Copilot (Gemini Native).\nI have synchronized your Sprint context: team is at 78% completion with 11.4ms sync latency. Would you like me to auto-create prioritized tasks, audit delay risks, or summarize the PRD spec?',
      time: '09:15'
    }
  ]);

  // Team Chat Messages with Realtime Reactions
  const [chatMessages, setChatMessages] = useState<MockChatMessage[]>(() => {
    const msgs: MockChatMessage[] = [
      {
        id: 'msg-1',
        sender: 'Hoàng Xuân',
        avatar: 'HX',
        bg: 'from-blue-600 to-indigo-600',
        text: isVietnamese ? 'Cả team ơi, bản cập nhật UI Continuous Canvas phẳng thế hệ mới đã deploy production rồi nhé! 🚀' : 'Hey team, the Continuous Canvas next-gen flat UI is deployed to production! 🚀',
        time: '09:20',
        reactions: { '🚀': 4, '👍': 3 }
      },
      {
        id: 'msg-2',
        sender: 'Minh Anh',
        avatar: 'MA',
        bg: 'from-emerald-600 to-teal-600',
        text: isVietnamese ? 'Tuyệt vời! Tốc độ đồng bộ Local-First đo được thực tế là 11.4ms, mượt mà vượt mong đợi.' : 'Awesome! Real-world Local-First sync latency clocked in at 11.4ms, super fast.',
        time: '09:22',
        reactions: { '⚡': 5, '🔥': 2 }
      },
      {
        id: 'msg-3',
        sender: 'Apexa Brain AI',
        avatar: 'AI',
        bg: 'from-indigo-600 to-purple-600',
        text: isVietnamese ? '🤖 Tự động đồng bộ: Sprint 14 đã vượt tiến độ 2 ngày. Tất cả 12 tài liệu PRD đã cập nhật trạng thái Live.' : '🤖 Auto-Sync: Sprint 14 is 2 days ahead of schedule. All 12 PRD docs are in live sync.',
        time: '09:23',
        isAi: true,
        reactions: { '✨': 6 }
      }
    ];
    return msgs;
  });
  const [newChatInput, setNewChatInput] = useState('');

  // Interactive Smart Docs Technical Checklist
  const [docMilestones, setDocMilestones] = useState([
    { id: 'm-1', text: isVietnamese ? 'Tối ưu thời gian đọc ghi trên IndexedDB local cache < 1ms' : 'Optimize read/write on local IndexedDB storage < 1ms', done: true },
    { id: 'm-2', text: isVietnamese ? 'Hỗ trợ nhúng thẻ Kanban Board thời gian thực vào giữa nội dung Markdown' : 'Live embed dynamic Kanban task cards directly inside Markdown blocks', done: true },
    { id: 'm-3', text: isVietnamese ? 'Tự động đồng bộ 2 chiều qua Realtime Channels khi online' : 'Two-way bidirectional sync via Realtime Channels on reconnect', done: false },
    { id: 'm-4', text: isVietnamese ? 'Mã hóa E2EE 256-bit các tài liệu mật của doanh nghiệp' : 'E2EE 256-bit encryption for enterprise confidential workspaces', done: true },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Current Space Filtered Tasks
  const currentSpaceTasks = useMemo(() => {
    return tasks.filter(t => (t.spaceId || 'core') === activeSpace);
  }, [tasks, activeSpace]);

  // Filtered Tasks by Priority & Search Query
  const displayedTasks = useMemo(() => {
    return currentSpaceTasks.filter(t => {
      const matchPriority = priorityFilter === 'all' || t.priority.toLowerCase() === priorityFilter.toLowerCase();
      const matchSearch = !searchFilter.trim() || t.title.toLowerCase().includes(searchFilter.toLowerCase()) || t.tag.toLowerCase().includes(searchFilter.toLowerCase());
      return matchPriority && matchSearch;
    });
  }, [currentSpaceTasks, priorityFilter, searchFilter]);

  const selectedTask = useMemo(() => {
    return tasks.find(t => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  // Priority styling helper
  const priorityColor = (priority: string) => {
    const p = priority.toLowerCase();
    if (p.includes('khẩn cấp') || p.includes('urgent')) {
      return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
    }
    if (p.includes('cao') || p.includes('high')) {
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    }
    if (p.includes('thấp') || p.includes('low')) {
      return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
    return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
  };

  // Toggle task completion
  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextChecked = !t.checked;
        const totalSub = t.subtasks.items?.length || t.subtasks.total || 1;
        return {
          ...t,
          checked: nextChecked,
          column: nextChecked ? 'done' : 'inprogress',
          progress: nextChecked ? 100 : Math.round(((t.subtasks.done || 0) / totalSub) * 100),
          subtasks: {
            ...t.subtasks,
            done: nextChecked ? totalSub : Math.max(0, t.subtasks.done - 1),
            items: t.subtasks.items?.map(it => ({ ...it, done: nextChecked }))
          }
        };
      }
      return t;
    }));
  };

  // Move task column (Left or Right)
  const handleMoveTask = (id: string, direction: 'left' | 'right', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const cols: Array<'todo' | 'inprogress' | 'done'> = ['todo', 'inprogress', 'done'];
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const currIdx = cols.indexOf(t.column);
        const nextIdx = direction === 'right' ? Math.min(cols.length - 1, currIdx + 1) : Math.max(0, currIdx - 1);
        const newCol = cols[nextIdx];
        const isDone = newCol === 'done';
        return {
          ...t,
          column: newCol,
          checked: isDone,
          progress: isDone ? 100 : (newCol === 'todo' ? 0 : 50)
        };
      }
      return t;
    }));
  };

  // Toggle subtask inside task modal
  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.subtasks.items) {
        const newItems = t.subtasks.items.map(it => it.id === subtaskId ? { ...it, done: !it.done } : it);
        const doneCount = newItems.filter(it => it.done).length;
        const total = newItems.length;
        const allDone = doneCount === total && total > 0;
        return {
          ...t,
          checked: allDone,
          column: allDone ? 'done' : (doneCount > 0 ? 'inprogress' : t.column),
          progress: Math.round((doneCount / total) * 100),
          subtasks: {
            total,
            done: doneCount,
            items: newItems
          }
        };
      }
      return t;
    }));
  };

  // Add AI smart subtask
  const handleAddAiSubtask = (taskId: string) => {
    const aiSubtaskText = isVietnamese ? '⚡ [AI Generated] Xác thực hiệu năng đồng bộ thời gian thực' : '⚡ [AI Generated] Validate real-time sync performance';
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const currentItems = t.subtasks.items || [];
        const newItems = [...currentItems, { id: `st-ai-${Date.now()}`, text: aiSubtaskText, done: false }];
        return {
          ...t,
          subtasks: {
            total: newItems.length,
            done: newItems.filter(it => it.done).length,
            items: newItems
          }
        };
      }
      return t;
    }));
  };

  // Quick Add Task
  const handleQuickAdd = (column: 'todo' | 'inprogress' | 'done') => {
    if (!newTaskTitle.trim()) return;
    const newTask: MockTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      column,
      priority: isVietnamese ? 'Cao' : 'High',
      dueDate: isVietnamese ? 'Hôm nay' : 'Today',
      assignee: 'Bạn',
      assigneeBg: 'from-blue-600 to-indigo-600',
      tag: isVietnamese ? 'Mới' : 'New',
      spaceId: activeSpace,
      progress: 0,
      description: isVietnamese ? 'Nhiệm vụ mới được khởi tạo từ thanh thêm nhanh.' : 'New task initialized from quick add bar.',
      subtasks: {
        total: 2,
        done: 0,
        items: [
          { id: `st-${Date.now()}-1`, text: isVietnamese ? 'Lập dàn ý các bước triển khai' : 'Draft implementation checklist', done: false },
          { id: `st-${Date.now()}-2`, text: isVietnamese ? 'Kiểm thử & Bàn giao kết quả' : 'Verify & deliver results', done: false }
        ]
      },
      checked: false
    };
    setTasks(prev => [newTask, ...prev]);
    setNewTaskTitle('');
    setInlineAddOpen(null);
  };

  // 1-Click AI Auto-Prioritize
  const handleAiAutoPrioritize = () => {
    setAiPrioritizeToast(isVietnamese ? '✨ Apexa Brain đã tự động tối ưu hóa lộ trình Sprint!' : '✨ Apexa Brain auto-prioritized Sprint velocity!');
    setTasks(prev => {
      return [...prev].sort((a, b) => {
        const pOrder: { [k: string]: number } = {
          'khẩn cấp': 3, 'urgent': 3,
          'cao': 2, 'high': 2,
          'trung bình': 1, 'normal': 1,
          'thấp': 0, 'low': 0
        };
        return (pOrder[b.priority.toLowerCase()] || 0) - (pOrder[a.priority.toLowerCase()] || 0);
      });
    });
    setTimeout(() => setAiPrioritizeToast(null), 3000);
  };

  // AI Chat Assistant Send
  const handleSendAi = (promptText?: string) => {
    const query = promptText || aiInput;
    if (!query.trim()) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAiChatLog(prev => [...prev, { sender: 'user', text: query, time: timeStr }]);
    if (!promptText) setAiInput('');
    setAiTyping(true);

    setTimeout(() => {
      let botResponse = isVietnamese
        ? '✨ Apexa Brain đã phân tích bối cảnh Sprint và đồng bộ toàn bộ cơ sở dữ liệu thành công!'
        : '✨ Apexa Brain parsed your prompt and synchronized all project workspaces successfully!';

      const lower = query.toLowerCase();
      if (lower.includes('sprint') || lower.includes('kế hoạch') || lower.includes('plan') || lower.includes('task')) {
        botResponse = isVietnamese
          ? '🎯 Đã tự động tạo 2 đầu việc ưu tiên cao cho Sprint:\n1. ⚡ [Khẩn cấp] Kiểm thử hiệu năng Local-First đồng thời 100 users.\n2. 📝 [Cao] Soạn thảo Release Notes cho Apexa v2.0.'
          : '🎯 Automatically generated 2 prioritized Sprint items:\n1. ⚡ [Urgent] Benchmark Local-First sync under 100 concurrent users.\n2. 📝 [High] Draft official release notes for Apexa v2.0.';
        
        setTasks(prev => [
          {
            id: `ai-gen-${Date.now()}`,
            title: isVietnamese ? '⚡ [AI Action] Kiểm thử tải đồng bộ Local-First 100 users' : '⚡ [AI Action] Benchmark Local-First sync under 100 users',
            column: 'inprogress',
            priority: isVietnamese ? 'Khẩn cấp' : 'Urgent',
            dueDate: isVietnamese ? 'Hôm nay' : 'Today',
            assignee: 'AI',
            assigneeBg: 'from-indigo-600 to-purple-600',
            tag: 'AI Auto',
            spaceId: activeSpace,
            progress: 50,
            description: isVietnamese ? 'Tự động khởi tạo bởi Apexa Brain Gemini Copilot.' : 'Auto-generated by Apexa Brain Gemini Copilot.',
            subtasks: {
              total: 2,
              done: 1,
              items: [
                { id: `st-gen-1`, text: 'Load test 100 concurrent WebSocket sessions', done: true },
                { id: `st-gen-2`, text: 'Audit indexedDB mutation latency', done: false }
              ]
            },
            checked: false
          },
          ...prev
        ]);
      } else if (lower.includes('báo cáo') || lower.includes('tiến độ') || lower.includes('report') || lower.includes('status')) {
        const doneCount = currentSpaceTasks.filter(t => t.column === 'done').length;
        const total = currentSpaceTasks.length || 1;
        const rate = Math.round((doneCount / total) * 100);
        botResponse = isVietnamese
          ? `📊 Báo cáo tiến độ ${activeSpace === 'core' ? 'Core Product (Sprint 14)' : activeSpace === 'design' ? 'Brand & Design' : 'AI Engine Lab'}:\n• Tổng đầu việc: ${total} tasks\n• Tỷ lệ hoàn thành: ${rate}%\n• Tốc độ bàn giao: Vượt kế hoạch 2 ngày\n• Zero rủi ro trễ hạn được phát hiện.`
          : `📊 Progress Digest for ${activeSpace === 'core' ? 'Core Product (Sprint 14)' : activeSpace === 'design' ? 'Brand & Design' : 'AI Engine Lab'}:\n• Total tasks: ${total}\n• Completion rate: ${rate}%\n• Delivery velocity: +2 days ahead of schedule\n• Zero blockers detected.`;
      } else if (lower.includes('rủi ro') || lower.includes('risk') || lower.includes('delay')) {
        botResponse = isVietnamese
          ? '🎯 Phân tích rủi ro Apexa Brain:\n• Rủi ro trễ hạn: Rất thấp (0.4%)\n• Tắc nghẽn tiềm năng: API Google Calendar cần duyệt OAuth Scopes trước 20/08.\n• Đề xuất: Phân công thêm 1 reviewer vào task Tích hợp Google Calendar.'
          : '🎯 Apexa Brain Risk Assessment:\n• Delay risk factor: Very Low (0.4%)\n• Potential bottleneck: Google Calendar OAuth scope approval before Aug 20.\n• Suggestion: Assign 1 additional code reviewer to Google Calendar task.';
      }
      setAiChatLog(prev => [...prev, { sender: 'bot', text: botResponse, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      setAiTyping(false);
    }, 750);
  };

  // Team Chat Message Send
  const handleSendChatMessage = () => {
    if (!newChatInput.trim()) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: isVietnamese ? 'Bạn' : 'You',
        avatar: 'ME',
        bg: 'from-blue-500 to-indigo-600',
        text: newChatInput.trim(),
        time: timeStr,
        reactions: {}
      }
    ]);
    setNewChatInput('');
  };

  // Emoji Reaction
  const handleReactChatMessage = (msgId: string, emoji: string) => {
    setChatMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        const curr = m.reactions[emoji] || 0;
        return {
          ...m,
          reactions: { ...m.reactions, [emoji]: curr + 1 }
        };
      }
      return m;
    }));
  };

  // Copy code helper
  const handleCopyCode = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Dynamic Aura Theme Color
  const auraGlowColor = useMemo(() => {
    switch (activeTab) {
      case 'docs':
        return 'from-violet-600/25 via-purple-500/20 to-pink-600/10';
      case 'ai':
        return 'from-indigo-600/30 via-cyan-500/25 to-purple-600/25';
      case 'analytics':
        return 'from-emerald-600/25 via-teal-500/20 to-blue-600/10';
      case 'chat':
        return 'from-sky-600/25 via-blue-500/20 to-indigo-600/10';
      case 'board':
      default:
        return 'from-blue-600/25 via-indigo-500/25 to-purple-600/15';
    }
  }, [activeTab]);

  return (
    <div className="w-full text-left font-sans select-none relative group/showcase">
      
      {/* Background Dynamic Ambient Aura Glow */}
      <div className={`absolute -inset-4 sm:-inset-8 bg-gradient-to-r ${auraGlowColor} rounded-[2.5rem] blur-3xl opacity-60 dark:opacity-40 transition-all duration-700 pointer-events-none -z-10`} />

      {/* Outer Application Window Frame */}
      <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#0a0d14]/95 backdrop-blur-2xl shadow-[0_30px_100px_-20px_rgba(15,23,42,0.25)] dark:shadow-[0_30px_100px_-20px_rgba(0,0,0,0.9)] overflow-hidden transition-all ring-1 ring-slate-900/5 dark:ring-white/5">
        
        {/* =========================================================================
            TOP APPLICATION WINDOW CHROME / HEADER BAR
            ========================================================================= */}
        <div className="h-13 border-b border-slate-200/80 dark:border-white/10 bg-slate-100/90 dark:bg-[#0e131f]/90 px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-3 text-xs">
          
          {/* Left: macOS Window Controls & Workspace Breadcrumb */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1.5 group/traffic">
              <span className="w-3 h-3 rounded-full bg-rose-500 border border-rose-600/40 shadow-2xs cursor-pointer flex items-center justify-center text-[7px] text-rose-950 opacity-90 group-hover/traffic:opacity-100">
                <X className="w-2 h-2 opacity-0 group-hover/traffic:opacity-100 transition-opacity" />
              </span>
              <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600/40 shadow-2xs cursor-pointer flex items-center justify-center text-[7px] text-amber-950 opacity-90 group-hover/traffic:opacity-100">
                <span className="w-1.5 h-0.5 bg-amber-900 opacity-0 group-hover/traffic:opacity-100 transition-opacity" />
              </span>
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600/40 shadow-2xs cursor-pointer flex items-center justify-center text-[7px] text-emerald-950 opacity-90 group-hover/traffic:opacity-100">
                <Plus className="w-2 h-2 opacity-0 group-hover/traffic:opacity-100 transition-opacity rotate-45" />
              </span>
            </div>

            <div className="h-4 w-px bg-slate-300 dark:bg-white/10 hidden sm:block" />

            {/* Workspace Space Switcher Breadcrumb */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black shadow-2xs">
                A
              </div>
              <span className="font-black text-slate-900 dark:text-white hidden sm:inline">Apexa Workspace</span>
              <span className="text-slate-400">/</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                {activeSpace === 'core' && '🚀 Core Product · Sprint 14'}
                {activeSpace === 'design' && '🎨 Brand & Design System'}
                {activeSpace === 'ai' && '⚡ AI Engine Lab'}
              </span>
            </div>
          </div>

          {/* Center: Command Palette Trigger / Search Bar */}
          <div className="flex-1 max-w-sm hidden md:flex items-center justify-center">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-500/50 shadow-2xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <span className="truncate">{isVietnamese ? 'Tìm kiếm task, docs, AI prompt...' : 'Search tasks, docs, AI prompt...'}</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 shadow-2xs flex items-center gap-0.5">
                  <Command className="w-2.5 h-2.5" /> K
                </kbd>
              </div>
            </button>
          </div>

          {/* Right: Realtime Diagnostic Status & Live Collaborators */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 relative">
            
            {/* Sync Status Badge */}
            <div className="relative">
              <button
                onClick={() => setSyncDiagnosticOpen(!syncDiagnosticOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-[10px] font-black shadow-2xs cursor-pointer hover:bg-emerald-500/20 transition-all"
                title={isVietnamese ? 'Nhấp để xem chẩn đoán đồng bộ thời gian thực' : 'Click to inspect realtime sync diagnostics'}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span>{isVietnamese ? 'Đồng bộ 11.4ms' : 'Synced 11.4ms'}</span>
              </button>

              {/* Diagnostic Popover */}
              {syncDiagnosticOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 p-3 rounded-2xl bg-white dark:bg-[#0e131f] border border-slate-200 dark:border-white/15 shadow-xl z-50 text-[10px] space-y-2 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-1.5 font-bold">
                    <span className="text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-emerald-500" /> Realtime Sync Engine
                    </span>
                    <button onClick={() => setSyncDiagnosticOpen(false)} className="text-slate-400 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-1 text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between"><span>Supabase Realtime:</span> <span className="font-mono text-emerald-500 font-bold">11.2ms</span></div>
                    <div className="flex justify-between"><span>IndexedDB Cache:</span> <span className="font-mono text-indigo-400 font-bold">0.8ms</span></div>
                    <div className="flex justify-between"><span>CRDTs Engine:</span> <span className="font-mono text-blue-400 font-bold">Yjs v13</span></div>
                    <div className="flex justify-between"><span>Offline Pending:</span> <span className="font-mono text-emerald-400 font-bold">0 mutations</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Active User Avatars */}
            <div className="flex -space-x-1.5 items-center">
              {[
                { name: 'HX', bg: 'from-blue-600 to-indigo-600', status: isVietnamese ? 'Hoàng Xuân · Đang xem Kanban' : 'Hoàng Xuân · Viewing Kanban' },
                { name: 'MA', bg: 'from-emerald-500 to-teal-600', status: isVietnamese ? 'Minh Anh · Đang sửa PRD' : 'Minh Anh · Editing PRD' },
                { name: 'QB', bg: 'from-amber-500 to-orange-600', status: isVietnamese ? 'Quang Bảo · Review Code' : 'Quang Bảo · Code Review' },
              ].map((m, i) => (
                <div
                  key={i}
                  title={m.status}
                  className={`w-5 h-5 rounded-full bg-gradient-to-br ${m.bg} border-2 border-white dark:border-[#0e131f] text-white font-black text-[7.5px] flex items-center justify-center shadow-2xs hover:scale-110 transition-transform cursor-pointer`}
                >
                  {m.name}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* =========================================================================
            MAIN WORKSPACE BODY: LEFT SIDEBAR + MAIN INTERACTIVE CANVAS
            ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-[520px] lg:min-h-[560px]">
          
          {/* Left Navigation Sidebar (Modern Dark Theme) */}
          <aside className="border-r border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-gradient-to-b dark:from-[#0e121b] dark:via-[#090b10] dark:to-[#07080c] p-3 flex flex-col justify-between hidden md:flex text-slate-800 dark:text-slate-200">
            <div className="space-y-4">
              
              {/* Workspace Spaces Group */}
              <div className="space-y-1">
                <div className="px-2 text-[9.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>{isVietnamese ? 'Không gian làm việc' : 'Workspaces'}</span>
                  <span className="text-[8px] bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-400 px-1 py-0.2 rounded font-mono">3 spaces</span>
                </div>
                {[
                  { id: 'core', label: isVietnamese ? '🚀 Core Product' : '🚀 Core Product', count: tasks.filter(t => (t.spaceId || 'core') === 'core').length },
                  { id: 'design', label: isVietnamese ? '🎨 Brand & Design' : '🎨 Brand & Design', count: tasks.filter(t => t.spaceId === 'design').length },
                  { id: 'ai', label: isVietnamese ? '⚡ AI Engine Lab' : '⚡ AI Engine Lab', count: tasks.filter(t => t.spaceId === 'ai').length },
                ].map(space => {
                  const isSelected = activeSpace === space.id;
                  return (
                    <button
                      key={space.id}
                      onClick={() => setActiveSpace(space.id as any)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white dark:bg-white/[0.12] text-indigo-600 dark:text-white border border-slate-200 dark:border-white/15 shadow-xs font-extrabold'
                          : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="truncate">{space.label}</span>
                      <span className={`text-[9.5px] font-extrabold px-1.5 py-0.2 rounded-md ${
                        isSelected ? 'bg-indigo-50 dark:bg-white/20 text-indigo-600 dark:text-white' : 'bg-slate-200/70 dark:bg-white/10 text-slate-500 dark:text-zinc-400'
                      }`}>
                        {space.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Views Switcher */}
              <div className="space-y-1 pt-2 border-t border-slate-200/80 dark:border-white/[0.08]">
                <div className="px-2 text-[9.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {isVietnamese ? 'Chế độ xem dự án' : 'Project Views'}
                </div>

                {[
                  { id: 'board', label: isVietnamese ? 'Bảng Kanban' : 'Kanban Board', icon: Kanban, badge: 'Sprint' },
                  { id: 'docs', label: isVietnamese ? 'Smart Docs 2.0' : 'Smart Docs 2.0', icon: FileText, badge: 'PRD' },
                  { id: 'ai', label: 'Apexa Brain AI', icon: ApexaAiIcon, isAi: true, badge: 'Copilot' },
                  { id: 'analytics', label: isVietnamese ? 'Phân tích & KPI' : 'Analytics & KPI', icon: BarChart3, badge: '86%' },
                  { id: 'chat', label: isVietnamese ? 'Kênh Chat Nhóm' : 'Team ChatRoom', icon: MessageSquare, badge: 'Live' },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isSelected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? tab.isAi
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 border border-blue-400/40'
                            : 'bg-indigo-600/10 dark:bg-gradient-to-r dark:from-blue-600/30 dark:to-indigo-600/30 text-indigo-600 dark:text-white border border-indigo-500/30 dark:border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)] dark:shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                          : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {tab.isAi ? (
                          <ApexaAiIcon className={`w-4 h-4 ${!isSelected ? 'text-indigo-400 animate-pulse' : ''}`} variant={isSelected ? 'white' : 'gradient'} />
                        ) : (
                          <Icon className="w-3.5 h-3.5" />
                        )}
                        <span>{tab.label}</span>
                      </div>
                      <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.2 rounded ${
                        isSelected
                          ? (tab.isAi ? 'bg-white/20 text-white' : 'bg-indigo-500/20 dark:bg-white/20 text-indigo-700 dark:text-white')
                          : 'bg-slate-200/70 dark:bg-white/[0.08] text-slate-500 dark:text-zinc-400'
                      }`}>
                        {tab.badge}
                      </span>
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Bottom Sidebar Interactive Focus / Pomodoro Widget */}
            <div className="p-3 rounded-2xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 dark:text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-3 h-3 text-sky-500 dark:text-sky-400 fill-current animate-pulse" /> 
                  {isVietnamese ? 'Nhịp tập trung' : 'Focus Streak'}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-slate-900 dark:text-white font-mono">{focusStreakHours}h</span>
                  <button
                    onClick={() => setFocusPlaying(!focusPlaying)}
                    className="p-1 rounded-md bg-slate-100 dark:bg-white/10 hover:bg-indigo-500 hover:text-white transition-colors cursor-pointer"
                    title={focusPlaying ? 'Tạm dừng' : 'Bắt đầu'}
                  >
                    {focusPlaying ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                  </button>
                </div>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 rounded-full transition-all duration-500 ${focusPlaying ? 'animate-pulse' : 'opacity-60'}`}
                  style={{ width: '85%' }}
                />
              </div>
            </div>
          </aside>

          {/* Main Interactive Canvas Area */}
          <main className="p-3 sm:p-5 flex flex-col justify-between overflow-hidden bg-slate-50/40 dark:bg-transparent relative">
            
            {/* View Header & Toolbar */}
            <div className="flex flex-col gap-3 pb-3 mb-3 border-b border-slate-200/80 dark:border-white/10">
              
              {/* Mobile View Switcher Tabs */}
              <div className="flex md:hidden items-center gap-1 overflow-x-auto w-full pb-1">
                {[
                  { id: 'board', label: 'Kanban' },
                  { id: 'docs', label: 'Docs' },
                  { id: 'ai', label: 'Apexa AI' },
                  { id: 'analytics', label: 'Analytics' },
                  { id: 'chat', label: 'Chat' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all ${
                      activeTab === t.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Title, Counts & Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    {activeTab === 'board' && (isVietnamese ? '📋 Sprint 14 · Bảng điều phối Kanban' : '📋 Sprint 14 · Kanban Task Board')}
                    {activeTab === 'docs' && (isVietnamese ? '✍️ Smart Docs · Tài liệu kiến trúc Apexa' : '✍️ Smart Docs · Architecture Spec PRD')}
                    {activeTab === 'ai' && '🧠 Apexa Brain AI Copilot (Gemini)'}
                    {activeTab === 'analytics' && (isVietnamese ? '📊 Báo cáo vận tốc Sprint & Đo lường KPI' : '📊 Sprint Velocity & Performance Digest')}
                    {activeTab === 'chat' && (isVietnamese ? '💬 Kênh thảo luận #sprint-14-launch' : '💬 Discussion #sprint-14-launch')}
                  </h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-white/10">
                    {activeTab === 'board' ? `${displayedTasks.length} tasks` : 'Live'}
                  </span>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-2">
                  {/* AI Auto-Prioritize Action */}
                  {activeTab === 'board' && (
                    <button
                      onClick={handleAiAutoPrioritize}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title={isVietnamese ? 'AI tự động phân tích & sắp xếp ưu tiên' : 'AI auto-prioritize sprint backlog'}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="hidden sm:inline">{isVietnamese ? 'AI Tối ưu' : 'AI Prioritize'}</span>
                    </button>
                  )}

                  {/* Create Task Button */}
                  <button
                    onClick={onSignUp}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isVietnamese ? 'Tạo việc mới' : 'New Task'}</span>
                  </button>
                </div>
              </div>

              {/* Sub-toolbar for Kanban Board (View Modes & Filter Chips) */}
              {activeTab === 'board' && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  
                  {/* View Mode Switcher */}
                  <div className="flex items-center p-0.5 rounded-xl bg-slate-200/70 dark:bg-white/[0.08] border border-slate-300/60 dark:border-white/5">
                    {[
                      { id: 'board', label: isVietnamese ? 'Bảng Kanban' : 'Board', icon: Columns3 },
                      { id: 'list', label: isVietnamese ? 'Danh sách' : 'List', icon: List },
                      { id: 'timeline', label: isVietnamese ? 'Lộ trình' : 'Timeline', icon: CalendarRange },
                    ].map(mode => {
                      const Icon = mode.icon;
                      const isSelected = viewMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          onClick={() => setViewMode(mode.id as any)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Priority Filter Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1 hidden sm:flex">
                      <Filter className="w-2.5 h-2.5" /> {isVietnamese ? 'Lọc:' : 'Filter:'}
                    </span>
                    {[
                      { id: 'all', label: isVietnamese ? 'Tất cả' : 'All' },
                      { id: isVietnamese ? 'Khẩn cấp' : 'Urgent', label: isVietnamese ? 'Khẩn cấp' : 'Urgent' },
                      { id: isVietnamese ? 'Cao' : 'High', label: isVietnamese ? 'Cao' : 'High' },
                      { id: isVietnamese ? 'Trung bình' : 'Normal', label: isVietnamese ? 'Trung bình' : 'Normal' },
                    ].map(chip => (
                      <button
                        key={chip.id}
                        onClick={() => setPriorityFilter(chip.id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                          priorityFilter === chip.id
                            ? 'bg-indigo-600 text-white shadow-2xs font-black'
                            : 'bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                </div>
              )}

            </div>

            {/* AI Auto-Prioritize Floating Toast */}
            {aiPrioritizeToast && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-2 p-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[11px] font-extrabold flex items-center justify-between shadow-md"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>{aiPrioritizeToast}</span>
                </div>
                <button onClick={() => setAiPrioritizeToast(null)} className="text-white/80 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}

            {/* Viewport Content */}
            <div className="flex-1 min-h-[390px] max-h-[440px] overflow-hidden relative">
              <AnimatePresence mode="wait">
                
                {/* 1. KANBAN BOARD / LIST / TIMELINE VIEW */}
                {activeTab === 'board' && (
                  <motion.div
                    key={`tab-board-${viewMode}`}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="h-full overflow-hidden"
                  >
                    {/* 1A. BOARD VIEW (3 COLUMNS) */}
                    {viewMode === 'board' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 h-full overflow-hidden">
                        {[
                          { key: 'todo', label: isVietnamese ? 'Cần làm' : 'To Do', dot: 'bg-slate-400', count: displayedTasks.filter(t => t.column === 'todo').length },
                          { key: 'inprogress', label: isVietnamese ? 'Đang làm' : 'In Progress', dot: 'bg-blue-500', count: displayedTasks.filter(t => t.column === 'inprogress').length },
                          { key: 'done', label: isVietnamese ? 'Đã hoàn tất' : 'Done', dot: 'bg-emerald-500', count: displayedTasks.filter(t => t.column === 'done').length }
                        ].map(col => {
                          const colTasks = displayedTasks.filter(t => t.column === col.key);
                          return (
                            <div key={col.key} className="bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3 flex flex-col h-full overflow-hidden">
                              
                              {/* Column Header */}
                              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-white/5 shrink-0">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${col.dot} shadow-2xs`} />
                                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">{col.label}</span>
                                </div>
                                <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300 shadow-2xs border border-slate-200/60 dark:border-white/5">
                                  {colTasks.length}
                                </span>
                              </div>

                              {/* Column Task Cards Scrollable List */}
                              <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                                {colTasks.map(task => (
                                  <motion.div
                                    layoutId={task.id}
                                    key={task.id}
                                    onClick={() => setSelectedTaskId(task.id)}
                                    className={`p-3 rounded-xl border transition-all cursor-pointer select-none group/card relative ${
                                      task.checked
                                        ? 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/50 dark:border-white/5 opacity-75 hover:opacity-95'
                                        : 'bg-white dark:bg-slate-850 border-slate-200/80 dark:border-white/10 shadow-2xs hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500/50'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2.5">
                                      {/* Done Checkbox */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleTask(task.id);
                                        }}
                                        className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                          task.checked
                                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xs'
                                            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500 bg-white dark:bg-slate-900'
                                        }`}
                                      >
                                        {task.checked && <Check className="w-3 h-3 stroke-[3]" />}
                                      </button>

                                      {/* Task Title & Details */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-1">
                                          <p className={`text-xs font-bold leading-snug ${task.checked ? 'line-through text-slate-400 dark:text-slate-500 font-normal' : 'text-slate-900 dark:text-slate-100'}`}>
                                            {task.title}
                                          </p>

                                          {/* Quick Move Column Buttons */}
                                          <div className="opacity-0 group-hover/card:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                                            {col.key !== 'todo' && (
                                              <button
                                                onClick={(e) => handleMoveTask(task.id, 'left', e)}
                                                className="p-1 rounded bg-slate-100 dark:bg-white/10 hover:bg-indigo-500 hover:text-white text-slate-600 dark:text-slate-300"
                                                title="Chuyển sang trái"
                                              >
                                                <ChevronLeft className="w-2.5 h-2.5" />
                                              </button>
                                            )}
                                            {col.key !== 'done' && (
                                              <button
                                                onClick={(e) => handleMoveTask(task.id, 'right', e)}
                                                className="p-1 rounded bg-slate-100 dark:bg-white/10 hover:bg-indigo-500 hover:text-white text-slate-600 dark:text-slate-300"
                                                title="Chuyển sang phải"
                                              >
                                                <ChevronRight className="w-2.5 h-2.5" />
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {/* Subtasks Progress Bar (Mini) */}
                                        <div className="mt-2 space-y-1">
                                          <div className="h-1 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full transition-all duration-300 ${
                                                task.checked ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-blue-500'
                                              }`}
                                              style={{ width: `${task.progress ?? (task.checked ? 100 : Math.round((task.subtasks.done / (task.subtasks.total || 1)) * 100))}%` }}
                                            />
                                          </div>
                                        </div>

                                        {/* Badges, Dates & Assignee Avatar */}
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-white/5 text-[9.5px]">
                                          <div className="flex items-center gap-1.5">
                                            <span className={`px-2 py-0.5 rounded-full border font-black ${priorityColor(task.priority)}`}>
                                              {task.priority}
                                            </span>
                                            <span className="text-slate-400 font-semibold flex items-center gap-1">
                                              <Clock className="w-2.5 h-2.5" /> {task.dueDate}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[9px] font-bold text-slate-400 font-mono">
                                              {task.subtasks.done}/{task.subtasks.total}
                                            </span>
                                            <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${task.assigneeBg} text-white font-black text-[8px] flex items-center justify-center shadow-2xs`}>
                                              {task.assignee}
                                            </div>
                                          </div>
                                        </div>

                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>

                              {/* Column Bottom Add Task Bar */}
                              <div className="pt-2 mt-2 border-t border-slate-200/60 dark:border-white/5 shrink-0">
                                {inlineAddOpen === col.key ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      autoFocus
                                      type="text"
                                      placeholder={isVietnamese ? 'Tiêu đề task mới...' : 'New task title...'}
                                      value={newTaskTitle}
                                      onChange={(e) => setNewTaskTitle(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleQuickAdd(col.key as any);
                                        if (e.key === 'Escape') setInlineAddOpen(null);
                                      }}
                                      className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-950 border border-indigo-500 outline-none text-slate-800 dark:text-slate-200 font-medium"
                                    />
                                    <button
                                      onClick={() => handleQuickAdd(col.key as any)}
                                      className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-xs"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setInlineAddOpen(col.key);
                                      setQuickAddColumn(col.key as any);
                                    }}
                                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-xl bg-white/60 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.08] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-dashed border-slate-300 dark:border-white/10 transition-all cursor-pointer font-bold"
                                  >
                                    <span>{isVietnamese ? '+ Thêm task mới...' : '+ Add task...'}</span>
                                    <Plus className="w-3 h-3 text-indigo-500" />
                                  </button>
                                )}
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 1B. LIST / TABLE VIEW */}
                    {viewMode === 'list' && (
                      <div className="h-full bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3 overflow-y-auto space-y-2">
                        <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 dark:border-white/5">
                          <div className="col-span-6">Task Title</div>
                          <div className="col-span-2 text-center">Priority</div>
                          <div className="col-span-2 text-center">Progress</div>
                          <div className="col-span-2 text-right">Assignee</div>
                        </div>
                        {displayedTasks.map(task => (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTaskId(task.id)}
                            className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/5 transition-all cursor-pointer text-xs font-bold"
                          >
                            <div className="col-span-6 flex items-center gap-2 min-w-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleTask(task.id);
                                }}
                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                  task.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {task.checked && <Check className="w-3 h-3" />}
                              </button>
                              <span className={`truncate ${task.checked ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                {task.title}
                              </span>
                            </div>

                            <div className="col-span-2 flex justify-center">
                              <span className={`px-2 py-0.5 rounded-full border text-[9.5px] font-black ${priorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                            </div>

                            <div className="col-span-2 flex items-center gap-1.5 justify-center">
                              <div className="w-16 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${task.checked ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                  style={{ width: `${task.checked ? 100 : Math.round((task.subtasks.done / (task.subtasks.total || 1)) * 100)}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-slate-400">{task.subtasks.done}/{task.subtasks.total}</span>
                            </div>

                            <div className="col-span-2 flex items-center justify-end gap-1.5">
                              <span className="text-[10px] text-slate-400">{task.dueDate}</span>
                              <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${task.assigneeBg} text-white font-black text-[8px] flex items-center justify-center`}>
                                {task.assignee}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 1C. TIMELINE / GANTT ROADMAP VIEW */}
                    {viewMode === 'timeline' && (
                      <div className="h-full bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 overflow-y-auto space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/5 text-xs font-black">
                          <span className="text-slate-900 dark:text-white">{isVietnamese ? 'Lộ trình Sprint 14 (3 Tuần)' : 'Sprint 14 Timeline (3 Weeks)'}</span>
                          <span className="text-[10px] font-bold text-emerald-500">{isVietnamese ? 'Vận tốc: 86% Hoàn thành' : 'Velocity: 86% Done'}</span>
                        </div>

                        <div className="space-y-3 pt-2">
                          {[
                            { name: isVietnamese ? 'Continuous Canvas Architecture' : 'Continuous Canvas Architecture', start: '10%', width: '45%', color: 'from-blue-600 to-indigo-600', status: 'Done 100%' },
                            { name: isVietnamese ? 'Apexa Brain Copilot (Gemini Native)' : 'Apexa Brain Copilot (Gemini Native)', start: '25%', width: '55%', color: 'from-indigo-600 to-purple-600', status: 'In Progress 60%' },
                            { name: isVietnamese ? 'Local-First Cache Engine (Yjs CRDTs)' : 'Local-First Cache Engine (Yjs CRDTs)', start: '40%', width: '50%', color: 'from-emerald-500 to-teal-600', status: 'In Progress 33%' },
                            { name: isVietnamese ? '2-Way Google Calendar Realtime Sync' : '2-Way Google Calendar Realtime Sync', start: '65%', width: '30%', color: 'from-amber-500 to-orange-600', status: 'To Do' },
                          ].map((bar, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                <span>{bar.name}</span>
                                <span className="text-[10px] font-extrabold text-slate-500">{bar.status}</span>
                              </div>
                              <div className="h-4 w-full bg-slate-100 dark:bg-slate-950/70 rounded-lg p-0.5 border border-slate-200 dark:border-white/5 relative">
                                <div
                                  className={`h-full rounded-md bg-gradient-to-r ${bar.color} shadow-xs`}
                                  style={{ marginLeft: bar.start, width: bar.width }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </motion.div>
                )}

                {/* 2. SMART DOCS 2.0 VIEW */}
                {activeTab === 'docs' && (
                  <motion.div
                    key="tab-docs"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="h-full bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 overflow-y-auto space-y-4 text-left shadow-xs"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-white/10">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center border border-violet-500/20">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">
                            {isVietnamese ? 'PRD: Kiến trúc Local-First & AI Native Apexa' : 'PRD: Local-First & AI Native Apexa Architecture'}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-semibold">{isVietnamese ? 'Cập nhật 5 phút trước bởi Minh Anh' : 'Updated 5m ago by Sarah M.'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-extrabold border border-violet-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                          <span>Multiplayer Live</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {/* AI Summary Banner */}
                      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-indigo-950/40 dark:to-slate-900/40 border border-indigo-200/60 dark:border-indigo-500/30 flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5">
                          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                          <div className="text-[11px]">
                            <span className="font-extrabold text-indigo-700 dark:text-indigo-300">{isVietnamese ? 'AI Tóm tắt tài liệu:' : 'AI Document Summary:'} </span>
                            <span>{isVietnamese ? 'Kiến trúc mới giảm thiểu 95% round-trip network, cho phép 100+ kỹ sư soạn thảo không xung đột với thuật toán CRDTs Yjs.' : 'The new architecture eliminates 95% of network round-trips, empowering 100+ engineers to co-author conflict-free with Yjs CRDTs.'}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => alert(isVietnamese ? 'Đã làm mới bản tóm tắt AI!' : 'AI Summary refreshed!')}
                          className="text-[9px] font-bold px-2 py-1 rounded-lg bg-indigo-600 text-white shrink-0 hover:bg-indigo-500 cursor-pointer"
                        >
                          {isVietnamese ? 'Làm mới' : 'Refresh'}
                        </button>
                      </div>

                      {/* Embedded Live Dynamic Kanban Card Snippet */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-dashed border-indigo-400/50 dark:border-indigo-500/30 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase text-indigo-500">
                          <span className="flex items-center gap-1.5"><Kanban className="w-3 h-3" /> {isVietnamese ? 'Thẻ Kanban nhúng trực tiếp:' : 'Embedded Live Kanban Card:'}</span>
                          <span className="text-emerald-500 font-bold">● Live Synced</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded bg-blue-500 flex items-center justify-center text-white text-[8px] font-black">2</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Tối ưu hóa Local-First Cache và hàng đợi đồng bộ</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-[9px] font-black">Cao</span>
                        </div>
                      </div>

                      <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{isVietnamese ? '1. Tiêu chí kỹ thuật chính' : '1. Key Engineering Milestones'}</h5>
                      
                      {/* Interactive Document Checklist */}
                      <div className="space-y-1.5 pl-1">
                        {docMilestones.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              setDocMilestones(prev => prev.map(m => m.id === item.id ? { ...m, done: !m.done } : m));
                            }}
                            className="flex items-center gap-2 text-xs cursor-pointer hover:text-indigo-500 transition-colors"
                          >
                            <span className={`w-4 h-4 rounded flex items-center justify-center text-white transition-colors ${item.done ? 'bg-emerald-500' : 'border border-slate-300 dark:border-slate-700'}`}>
                              {item.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </span>
                            <span className={item.done ? 'line-through text-slate-400 dark:text-slate-500 font-normal' : 'text-slate-800 dark:text-slate-200 font-bold'}>{item.text}</span>
                          </div>
                        ))}
                      </div>

                      {/* Code Block with Copy Button */}
                      <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[10px] space-y-1 border border-white/10 relative group/code">
                        <div className="flex items-center justify-between text-slate-500 pb-1 border-b border-white/5">
                          <span>{"// Apexa Local-First Sync Hook"}</span>
                          <button
                            onClick={() => handleCopyCode("const { state, syncStatus } = useApexaSync('sprint-14');")}
                            className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-white"
                          >
                            {copiedCode ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCode ? 'Đã sao chép' : 'Sao chép'}</span>
                          </button>
                        </div>
                        <p className="text-indigo-300">const &#123; state, syncStatus &#125; = useApexaSync(&#39;sprint-14&#39;);</p>
                        <p className="text-emerald-400">{"console.log(`Latency: ${syncStatus.latencyMs}ms`); // 11.4ms"}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 3. APEXA BRAIN AI COPILOT VIEW */}
                {activeTab === 'ai' && (
                  <motion.div
                    key="tab-ai"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="h-full bg-slate-900 text-slate-100 rounded-2xl p-4 flex flex-col justify-between border border-indigo-500/30 shadow-xl"
                  >
                    {/* AI Message Stream */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[220px]">
                      {aiChatLog.map((msg, i) => (
                        <div key={i} className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                          {msg.sender === 'bot' && (
                            <ApexaAiAvatar size="sm" />
                          )}
                          <div className={`p-3 rounded-2xl max-w-[85%] text-xs font-semibold leading-relaxed whitespace-pre-line ${
                            msg.sender === 'user'
                              ? 'bg-blue-600 text-white rounded-tr-none shadow-sm'
                              : 'bg-slate-800/90 border border-white/10 text-slate-100 rounded-tl-none shadow-sm'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      ))}

                      {aiTyping && (
                        <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold p-1">
                          <Sparkles className="w-3.5 h-3.5 animate-spin" />
                          <span>{isVietnamese ? 'Apexa Brain đang phân tích ngữ cảnh Sprint...' : 'Apexa Brain is analyzing Sprint context...'}</span>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Quick 1-Click Action Chips */}
                    <div className="flex flex-wrap gap-1.5 my-2 pt-2 border-t border-white/10">
                      {[
                        { label: isVietnamese ? '⚡ Lập kế hoạch 2 task ưu tiên' : '⚡ Auto-plan 2 priority tasks', prompt: isVietnamese ? 'Lập kế hoạch 2 task ưu tiên cho Sprint' : 'Plan 2 prioritized tasks for the Sprint' },
                        { label: isVietnamese ? '📊 Tóm tắt tiến độ Sprint 14' : '📊 Summarize Sprint 14 progress', prompt: isVietnamese ? 'Báo cáo tóm tắt tiến độ sprint hiện tại' : 'Summarize current sprint progress' },
                        { label: isVietnamese ? '🎯 Dự đoán rủi ro trễ hạn' : '🎯 Predict delay blockers', prompt: isVietnamese ? 'Phân tích rủi ro trễ hạn của các task' : 'Analyze deadline delay risks' },
                      ].map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendAi(chip.prompt)}
                          className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/40 transition-colors cursor-pointer"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    {/* Input Field */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                      <input
                        type="text"
                        placeholder={isVietnamese ? 'Gửi yêu cầu cho Apexa Brain AI Copilot...' : 'Ask Apexa Brain AI Copilot anything...'}
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendAi();
                        }}
                        className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-white/15 outline-none text-white focus:border-indigo-400 font-medium"
                      />
                      <button
                        onClick={() => handleSendAi()}
                        className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-md"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* 4. ANALYTICS & VELOCITY VIEW */}
                {activeTab === 'analytics' && (
                  <motion.div
                    key="tab-analytics"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="h-full bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 overflow-y-auto space-y-4 text-left"
                  >
                    {/* KPI Stat Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: isVietnamese ? 'Tiến độ Sprint' : 'Sprint Progress', val: '86%', change: '+12%', color: 'text-emerald-600 dark:text-emerald-400', icon: TrendingUp },
                        { label: isVietnamese ? 'Vận tốc hoàn thành' : 'Velocity Score', val: '48 pts', change: '+18%', color: 'text-blue-600 dark:text-sky-400', icon: Zap },
                        { label: isVietnamese ? 'Độ trễ Local Sync' : 'Sync Latency', val: '11.4 ms', change: '-45%', color: 'text-indigo-600 dark:text-indigo-400', icon: Cpu },
                        { label: isVietnamese ? 'Thời lượng tập trung' : 'Deep Focus', val: '38.5 hrs', change: '+24%', color: 'text-amber-600 dark:text-amber-400', icon: Clock },
                      ].map((card, i) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-white/5 space-y-1">
                          <div className="flex items-center justify-between text-slate-400">
                            <span className="text-[10px] font-bold">{card.label}</span>
                            <card.icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-lg font-black text-slate-900 dark:text-white font-display">{card.val}</div>
                          <span className={`text-[9.5px] font-extrabold ${card.color}`}>{card.change} so với tuần trước</span>
                        </div>
                      ))}
                    </div>

                    {/* Interactive Sprint Burn-Down SVG Chart */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-indigo-500" />
                          {isVietnamese ? 'Biểu đồ Burndown Sprint 14' : 'Sprint 14 Burndown Velocity Curve'}
                        </span>
                        <span className="text-[10px] font-black text-emerald-500">2 ngày trước hạn</span>
                      </div>

                      {/* SVG Chart */}
                      <div className="h-24 w-full relative">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 400 80">
                          <defs>
                            <linearGradient id="burndownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Guide Grid Lines */}
                          <line x1="0" y1="20" x2="400" y2="20" stroke="currentColor" strokeOpacity="0.08" />
                          <line x1="0" y1="50" x2="400" y2="50" stroke="currentColor" strokeOpacity="0.08" />

                          {/* Ideal Burndown Line */}
                          <line x1="10" y1="15" x2="390" y2="70" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth="1.5" strokeOpacity="0.6" />

                          {/* Actual Velocity Curve Area */}
                          <path
                            d="M 10 15 Q 100 25, 200 48 T 390 72 L 390 80 L 10 80 Z"
                            fill="url(#burndownGrad)"
                          />
                          <path
                            d="M 10 15 Q 100 25, 200 48 T 390 72"
                            fill="none"
                            stroke="#6366f1"
                            strokeWidth="2.5"
                          />

                          {/* Interactive Chart Points */}
                          {[
                            { x: 10, y: 15, label: 'Day 1: 18 tasks' },
                            { x: 130, y: 30, label: 'Day 4: 12 tasks' },
                            { x: 250, y: 52, label: 'Day 7: 6 tasks' },
                            { x: 390, y: 72, label: 'Day 10: 2 tasks' },
                          ].map((pt, idx) => (
                            <circle
                              key={idx}
                              cx={pt.x}
                              cy={pt.y}
                              r={hoveredChartPoint === idx ? 5 : 3.5}
                              className="fill-indigo-600 dark:fill-indigo-400 stroke-white dark:stroke-slate-900 stroke-2 cursor-pointer transition-all"
                              onMouseEnter={() => setHoveredChartPoint(idx)}
                              onMouseLeave={() => setHoveredChartPoint(null)}
                            />
                          ))}
                        </svg>
                      </div>
                    </div>

                    {/* Visual Sprint Milestone Bars */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-white/5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>{isVietnamese ? 'Phân bổ tiến độ 4 Sprint Goals lớn' : '4 Major Sprint Milestone Breakdown'}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">86% Hoàn thành</span>
                      </div>

                      <div className="space-y-2 text-[10px]">
                        {[
                          { name: 'Continuous Canvas UI Architecture', width: '100%', color: 'from-blue-600 to-indigo-600', status: 'Hoàn tất' },
                          { name: 'Gemini AI Copilot', width: '85%', color: 'from-indigo-600 to-purple-600', status: '85%' },
                          { name: 'Local-First Cache Sync Engine', width: '90%', color: 'from-emerald-500 to-teal-600', status: '90%' },
                          { name: '2-way Google Calendar Live Sync', width: '70%', color: 'from-amber-500 to-orange-600', status: '70%' },
                        ].map((item, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-slate-600 dark:text-slate-400 font-bold">
                              <span>{item.name}</span>
                              <span className="text-slate-800 dark:text-slate-200 font-extrabold">{item.status}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full bg-gradient-to-r ${item.color}`} style={{ width: item.width }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 5. TEAM CHAT & REALTIME VIEW */}
                {activeTab === 'chat' && (
                  <motion.div
                    key="tab-chat"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="h-full bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between text-left"
                  >
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70 dark:border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-black text-slate-900 dark:text-white"># sprint-14-launch</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">{isVietnamese ? '4 thành viên trực tuyến' : '4 members online'}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1 max-h-[220px]">
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className="flex items-start gap-2.5">
                          <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${msg.bg} text-white font-black text-[8.5px] flex items-center justify-center shrink-0 shadow-2xs`}>
                            {msg.avatar}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-[11px] font-black text-slate-900 dark:text-white">{msg.sender}</span>
                              <span className="text-[9px] text-slate-400">{msg.time}</span>
                            </div>
                            <div className={`mt-0.5 p-2.5 rounded-xl text-xs font-medium ${
                              msg.isAi 
                                ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-500/30 text-indigo-950 dark:text-indigo-200 font-bold'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                            }`}>
                              {msg.text}
                            </div>

                            {/* Emoji Reactions Bar */}
                            <div className="flex items-center gap-1.5 mt-1">
                              {Object.entries(msg.reactions).map(([emoji, count]) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReactChatMessage(msg.id, emoji)}
                                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 hover:bg-indigo-500/20 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <span>{emoji}</span>
                                  <span className="text-[9px] font-mono">{count}</span>
                                </button>
                              ))}
                              <div className="flex items-center gap-0.5">
                                {['👍', '🚀', '❤️', '🔥'].map(em => (
                                  <button
                                    key={em}
                                    onClick={() => handleReactChatMessage(msg.id, em)}
                                    className="p-1 text-[11px] rounded hover:bg-slate-200 dark:hover:bg-white/10 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                                  >
                                    {em}
                                  </button>
                                ))}
                              </div>
                            </div>

                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/70 dark:border-white/10">
                      <input
                        type="text"
                        placeholder={isVietnamese ? 'Gửi tin nhắn vào #sprint-14-launch...' : 'Message #sprint-14-launch...'}
                        value={newChatInput}
                        onChange={(e) => setNewChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendChatMessage();
                        }}
                        className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 outline-none text-slate-900 dark:text-white focus:border-indigo-500 font-medium"
                      />
                      <button
                        onClick={handleSendChatMessage}
                        className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>

              {/* =====================================================================
                  TASK DETAIL MODAL / DRAWER (INTERACTIVE POPUP)
                  ===================================================================== */}
              {selectedTask && (
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-30 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
                  <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[90%] overflow-y-auto text-left">
                    
                    {/* Modal Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <span>Sprint 14</span>
                        <span>/</span>
                        <span className={`px-2 py-0.5 rounded-full border text-[9.5px] font-black ${priorityColor(selectedTask.priority)}`}>
                          {selectedTask.priority}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedTaskId(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Task Title & Description */}
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                        {selectedTask.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                        {selectedTask.description}
                      </p>
                    </div>

                    {/* Column Status Switcher */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase text-slate-400">Trạng thái cột</div>
                      <div className="flex items-center gap-2">
                        {[
                          { key: 'todo', label: isVietnamese ? 'Cần làm' : 'To Do' },
                          { key: 'inprogress', label: isVietnamese ? 'Đang làm' : 'In Progress' },
                          { key: 'done', label: isVietnamese ? 'Đã hoàn tất' : 'Done' }
                        ].map(col => (
                          <button
                            key={col.key}
                            onClick={() => {
                              setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, column: col.key as any, checked: col.key === 'done' } : t));
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              selectedTask.column === col.key
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {col.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Interactive Subtasks Checklist */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/10">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5 text-indigo-500" /> Danh mục công việc con (Subtasks)</span>
                        <span className="text-[10px] font-black text-indigo-500">
                          {selectedTask.subtasks.items?.filter(i => i.done).length || 0}/{selectedTask.subtasks.items?.length || 0}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {selectedTask.subtasks.items?.map((sub) => (
                          <div
                            key={sub.id}
                            onClick={() => handleToggleSubtask(selectedTask.id, sub.id)}
                            className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-white/5 cursor-pointer hover:border-indigo-400 transition-all text-xs"
                          >
                            <span className={`w-4 h-4 rounded flex items-center justify-center text-white shrink-0 ${
                              sub.done ? 'bg-emerald-500' : 'border border-slate-300 dark:border-slate-600'
                            }`}>
                              {sub.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </span>
                            <span className={`flex-1 ${sub.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200 font-bold'}`}>
                              {sub.text}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* AI Action inside Task Detail */}
                      <button
                        onClick={() => handleAddAiSubtask(selectedTask.id)}
                        className="w-full py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-300 border border-dashed border-indigo-300 dark:border-indigo-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isVietnamese ? '✨ AI Phân rã thêm việc con tự động' : '✨ AI Auto-generate subtasks'}</span>
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* =====================================================================
                  COMMAND PALETTE (⌘K) MODAL OVERLAY
                  ===================================================================== */}
              {commandPaletteOpen && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-40 flex items-start justify-center p-4 sm:p-8 animate-in fade-in duration-150">
                  <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-2xl shadow-2xl overflow-hidden text-left">
                    
                    {/* Command Search Input */}
                    <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950">
                      <Search className="w-4 h-4 text-indigo-500" />
                      <input
                        autoFocus
                        type="text"
                        placeholder={isVietnamese ? 'Nhập lệnh, tìm kiếm task, docs...' : 'Type a command or search...'}
                        value={commandPaletteQuery}
                        onChange={(e) => setCommandPaletteQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setCommandPaletteOpen(false);
                        }}
                        className="flex-1 text-xs bg-transparent outline-none text-slate-900 dark:text-white font-medium"
                      />
                      <button onClick={() => setCommandPaletteOpen(false)} className="text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quick Command Action List */}
                    <div className="p-2 max-h-60 overflow-y-auto space-y-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {[
                        { label: isVietnamese ? '📋 Chuyển sang Bảng Kanban Sprint 14' : '📋 Switch to Kanban Board', action: () => { setActiveTab('board'); setCommandPaletteOpen(false); } },
                        { label: isVietnamese ? '✍️ Mở Smart Docs 2.0 (PRD Architecture)' : '✍️ Open Smart Docs 2.0 PRD', action: () => { setActiveTab('docs'); setCommandPaletteOpen(false); } },
                        { label: isVietnamese ? '🧠 Kích hoạt Apexa Brain AI Copilot' : '🧠 Launch Apexa Brain AI Copilot', action: () => { setActiveTab('ai'); setCommandPaletteOpen(false); } },
                        { label: isVietnamese ? '📊 Xem Báo cáo Phân tích & Vận tốc Sprint' : '📊 View Analytics & Velocity Digest', action: () => { setActiveTab('analytics'); setCommandPaletteOpen(false); } },
                        { label: isVietnamese ? '💬 Mở Kênh Chat #sprint-14-launch' : '💬 Open Team Chat #sprint-14-launch', action: () => { setActiveTab('chat'); setCommandPaletteOpen(false); } },
                        { label: isVietnamese ? '✨ AI Tự động ưu tiên hóa Sprint Backlog' : '✨ AI Auto-Prioritize Backlog', action: () => { handleAiAutoPrioritize(); setCommandPaletteOpen(false); } },
                        { label: isVietnamese ? '🚀 Chuyển Không gian: Core Product' : '🚀 Space: Core Product', action: () => { setActiveSpace('core'); setCommandPaletteOpen(false); } },
                        { label: isVietnamese ? '🎨 Chuyển Không gian: Brand & Design' : '🎨 Space: Brand & Design', action: () => { setActiveSpace('design'); setCommandPaletteOpen(false); } },
                        { label: isVietnamese ? '⚡ Chuyển Không gian: AI Engine Lab' : '⚡ Space: AI Engine Lab', action: () => { setActiveSpace('ai'); setCommandPaletteOpen(false); } },
                      ].filter(c => !commandPaletteQuery || c.label.toLowerCase().includes(commandPaletteQuery.toLowerCase())).map((cmd, i) => (
                        <button
                          key={i}
                          onClick={cmd.action}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-white/10 hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer text-left"
                        >
                          <span>{cmd.label}</span>
                          <kbd className="text-[9px] text-slate-400 font-mono">↵ Jump</kbd>
                        </button>
                      ))}
                    </div>

                  </div>
                </div>
              )}

            </div>

          </main>

        </div>

      </div>

    </div>
  );
}

/* =========================================================================
   INTERACTIVE ROI & PRODUCTIVITY CALCULATOR (ENTERPRISE SIMULATOR)
   ========================================================================= */
function RoiCalculator({ onSignUp }: { onSignUp?: () => void }) {
  const { isVietnamese } = useTranslation();
  const [teamSize, setTeamSize] = useState(15);

  // Financial & Operational Metrics Math
  const traditionalMonthlyPerUser = 42; // Jira ($15) + Notion ($12) + Slack ($15)
  const apexaMonthlyPerUser = 10;
  const savingsMonthlyPerUser = traditionalMonthlyPerUser - apexaMonthlyPerUser; // $32/user/mo

  const traditionalCostPerYear = teamSize * traditionalMonthlyPerUser * 12;
  const apexaCostPerYear = teamSize * apexaMonthlyPerUser * 12;
  const costSavingsPerYear = teamSize * savingsMonthlyPerUser * 12;

  const hoursSavedPerWeek = Math.round(teamSize * 3.5);
  const hoursSavedPerYear = hoursSavedPerWeek * 48;
  const velocityIncrease = Math.min(65, Math.round(26 + teamSize * 0.38));

  const PRESETS = [
    { size: 5, label: isVietnamese ? '5 (Startup)' : '5 (Startup)' },
    { size: 15, label: isVietnamese ? '15 (Growth)' : '15 (Growth)' },
    { size: 30, label: isVietnamese ? '30 (Scale-up)' : '30 (Scale-up)' },
    { size: 50, label: isVietnamese ? '50 (Expansion)' : '50 (Expansion)' },
    { size: 100, label: isVietnamese ? '100+ (Enterprise)' : '100+ (Enterprise)' },
  ];

  return (
    <div className="shots-glass-card rounded-3xl p-6 sm:p-10 text-left space-y-8 border border-slate-200/80 dark:border-white/10 shadow-xl">
      
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/70 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-sky-400 text-[10px] font-black uppercase tracking-wider border border-blue-500/20 mb-2">
            <Sparkles className="w-2.5 h-2.5" />
            <span>{isVietnamese ? 'MÔ PHỎNG HIỆU QUẢ ĐẦU TƯ (ROI)' : 'INTERACTIVE ROI SIMULATOR'}</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-display">
            {isVietnamese ? 'Đội ngũ của bạn sẽ tiết kiệm được bao nhiêu?' : 'How much will your team save with Apexa?'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            {isVietnamese
              ? 'Kéo thanh trượt hoặc chọn quy mô để xem ngay thời gian giải phóng, chi phí cắt giảm và tốc độ dự án.'
              : 'Adjust the slider or pick a preset to see engineering hours freed, SaaS budget saved, and velocity gains.'}
          </p>
        </div>

        {/* Dynamic Team Size Widget */}
        <div className="px-6 py-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50/80 dark:from-indigo-950/40 dark:to-slate-900/60 border border-indigo-200/70 dark:border-indigo-500/30 text-center shrink-0 shadow-sm flex items-center gap-4">
          <div className="text-left">
            <div className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-sky-400 font-display leading-none">
              {teamSize}
            </div>
            <div className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 pt-1">
              {isVietnamese ? 'Thành viên đội ngũ' : 'Active Team Members'}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Users className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Preset Buttons & Slider Area */}
      <div className="space-y-4">
        {/* Preset Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 pr-1">
            {isVietnamese ? 'Chọn nhanh quy mô:' : 'Quick Presets:'}
          </span>
          {PRESETS.map((preset) => {
            const isSelected = teamSize === preset.size;
            return (
              <button
                key={preset.size}
                onClick={() => setTeamSize(preset.size)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm scale-102 font-black'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/10'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Custom Slider Input */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>{isVietnamese ? 'Tùy chỉnh số lượng nhân sự (5 - 100 người)' : 'Custom Team Size (5 - 100 people)'}</span>
            <span className="text-indigo-600 dark:text-sky-400 font-black text-sm">{teamSize} {isVietnamese ? 'nhân sự' : 'members'}</span>
          </div>
          <input
            type="range"
            min="5"
            max="100"
            step="1"
            value={teamSize}
            onChange={(e) => setTeamSize(Number(e.target.value))}
            className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[10.5px] text-slate-400 font-semibold px-0.5">
            <span>5 {isVietnamese ? 'người' : 'members'}</span>
            <span>25 {isVietnamese ? 'người' : 'members'}</span>
            <span>50 {isVietnamese ? 'người' : 'members'}</span>
            <span>75 {isVietnamese ? 'người' : 'members'}</span>
            <span>100+ {isVietnamese ? 'người' : 'members'}</span>
          </div>
        </div>
      </div>

      {/* Cost Breakdown Progress Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.06] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span>{isVietnamese ? 'Bảng phân tích chi phí phần mềm hàng năm:' : 'Annual SaaS Budget Breakdown:'}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold">
            <span className="text-slate-400 line-through">
              {isVietnamese ? 'Stack cũ: ' : 'Old Stack: '}
              ${traditionalCostPerYear.toLocaleString('en-US')}/năm
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-black">
              {isVietnamese ? 'Apexa: ' : 'Apexa: '}
              ${apexaCostPerYear.toLocaleString('en-US')}/năm
            </span>
          </div>
        </div>

        {/* Visual Progress Meter */}
        <div className="relative h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: '76%' }} title="Tiết kiệm ròng 76%" />
          <div className="h-full bg-indigo-500 rounded-r-full" style={{ width: '24%' }} title="Chi phí Apexa 24%" />
        </div>

        <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-400">
          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {isVietnamese ? `Tiết kiệm ròng $${costSavingsPerYear.toLocaleString('en-US')}/năm (76%)` : `Net Savings $${costSavingsPerYear.toLocaleString('en-US')}/yr (76%)`}
          </span>
          <span className="text-indigo-600 dark:text-sky-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            {isVietnamese ? `Chi phí Apexa $${apexaCostPerYear.toLocaleString('en-US')}/năm (24%)` : `Apexa Cost $${apexaCostPerYear.toLocaleString('en-US')}/yr (24%)`}
          </span>
        </div>
      </div>

      {/* Computed 4 Bento Output Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
        
        {/* Card 1: Cost Savings */}
        <div className="p-5 rounded-2xl sm:rounded-3xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-500/25 space-y-2 text-left flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <DollarSign className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                {isVietnamese ? '💎 Tiết kiệm 76%' : '💎 76% Savings'}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight" suppressHydrationWarning>
              ${costSavingsPerYear.toLocaleString('en-US')}
              <span className="text-xs font-bold text-slate-400 block pt-0.5">{isVietnamese ? '/ năm ngân sách' : '/ year budget'}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-tight pt-1">
            {isVietnamese ? 'Thay thế hoàn toàn 5 phần mềm riêng lẻ (Jira, Notion, Slack, Miro).' : 'Eliminate 5 standalone subscriptions (Jira, Notion, Slack).'}
          </p>
        </div>

        {/* Card 2: Hours Saved */}
        <div className="p-5 rounded-2xl sm:rounded-3xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-500/25 space-y-2 text-left flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25">
                {isVietnamese ? '⚡ ~3.5h / nhân sự' : '⚡ ~3.5h / person'}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">
              ~{hoursSavedPerWeek}
              <span className="text-xs font-bold text-slate-400 block pt-0.5">{isVietnamese ? 'giờ / tuần (~' + hoursSavedPerYear.toLocaleString('en-US') + 'h/năm)' : 'hrs / week'}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-tight pt-1">
            {isVietnamese ? 'Giảm họp bàn báo cáo thủ công và tìm kiếm tài liệu phân tán.' : 'Cut context-switching and redundant status meetings.'}
          </p>
        </div>

        {/* Card 3: Velocity Boost */}
        <div className="p-5 rounded-2xl sm:rounded-3xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-500/25 space-y-2 text-left flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                {isVietnamese ? '🔥 AI Copilot' : '🔥 AI Copilot'}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">
              +{velocityIncrease}%
              <span className="text-xs font-bold text-slate-400 block pt-0.5">{isVietnamese ? 'vận tốc Sprint' : 'velocity boost'}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-tight pt-1">
            {isVietnamese ? 'Hoàn thành tính năng sớm hơn với phân rã tự động từ Gemini AI.' : 'Faster feature shipment with continuous AI task decomposition.'}
          </p>
        </div>

        {/* Card 4: Payback Period */}
        <div className="p-5 rounded-2xl sm:rounded-3xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-500/25 space-y-2 text-left flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                {isVietnamese ? '🎯 Hoàn vốn tức thì' : '🎯 Instant Payback'}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">
              &lt; 1
              <span className="text-xs font-bold text-slate-400 block pt-0.5">{isVietnamese ? 'Tháng hoàn vốn ROI' : 'Month ROI Payback'}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-tight pt-1">
            {isVietnamese ? 'Tối ưu chi phí và tăng tốc bàn giao ngay từ tháng đầu tiên.' : 'Immediate cost reduction and productivity lift from day one.'}
          </p>
        </div>

      </div>

      {/* Bottom CTA Action Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="text-left">
          <span className="text-xs font-extrabold text-indigo-300 uppercase tracking-wide block">
            {isVietnamese ? 'TÓM TẮT GIÁ TRỊ DOANH NGHIỆP' : 'EXECUTIVE SUMMARY'}
          </span>
          <p className="text-xs sm:text-sm font-semibold text-slate-200 pt-0.5">
            {isVietnamese
              ? `Đội ngũ ${teamSize} nhân sự sẽ tiết kiệm được $${costSavingsPerYear.toLocaleString('en-US')}/năm và ~${hoursSavedPerWeek} giờ làm việc mỗi tuần.`
              : `Your team of ${teamSize} will save $${costSavingsPerYear.toLocaleString('en-US')}/year and ~${hoursSavedPerWeek} hours per week.`}
          </p>
        </div>
        {onSignUp && (
          <button
            onClick={onSignUp}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-white text-slate-900 hover:bg-indigo-50 text-xs font-black transition-all shadow hover:scale-105 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{isVietnamese ? 'Bắt đầu tiết kiệm ngay' : 'Start Saving Now'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

    </div>
  );
}

/* =========================================================================
   TOOL COMPARISON MATRIX (ENTERPRISE BENCHMARK)
   ========================================================================= */
function ComparisonMatrix({ onSignUp }: { onSignUp?: () => void }) {
  const { isVietnamese } = useTranslation();

  const comparisonCategories = [
    {
      categoryName: 'Speed & Architecture',
      categoryNameVi: 'Kiến trúc & Tốc độ vận hành',
      categoryIcon: Cpu,
      categoryColor: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
      items: [
        {
          feature: 'Local-First Engine & 100% Offline',
          featureVi: 'Động cơ Local-First & Hoạt động Offline 100%',
          desc: 'Instant local caching on IndexedDB with auto-sync',
          descVi: 'Ghi dữ liệu tức thì trên IndexedDB, tự động sync khi online',
          apexa: { value: '✓ 11.4ms tức thì (IndexedDB + Yjs)', isPrimary: true },
          jira: { value: 'Cần mạng liên tục', status: 'cross' as const },
          notion: { value: 'Gián đoạn khi offline', status: 'cross' as const },
          slack: { value: 'Không thể gửi tin', status: 'cross' as const },
        },
        {
          feature: 'Real-time Conflict-Free CRDTs',
          featureVi: 'Đồng bộ thời gian thực không xung đột CRDTs',
          desc: 'Multi-cursor live editing without overwriting text',
          descVi: 'Cộng tác nhiều người đồng thời, không ghi đè dữ liệu',
          apexa: { value: '✓ Yjs Engine 0 xung đột', isPrimary: true },
          jira: { value: 'Cần reload trang', status: 'cross' as const },
          notion: { value: 'Thường xuyên bị đè text', status: 'warning' as const },
          slack: { value: 'Không có docs/tasks', status: 'cross' as const },
        },
      ],
    },
    {
      categoryName: 'AI Native & Automation',
      categoryNameVi: 'Trí tuệ nhân tạo & Tự động hoá',
      categoryIcon: Sparkles,
      categoryColor: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
      items: [
        {
          feature: 'Built-in Gemini AI Copilot',
          featureVi: 'Trợ lý AI Copilot tích hợp sẵn không phụ phí',
          desc: 'Deep workspace AI assistant included in all plans',
          descVi: 'Trợ lý AI tích hợp sẵn sâu vào quy trình làm việc',
          apexa: { value: '✓ Sẵn có (Gemini AI Native)', isPrimary: true },
          jira: { value: 'Cần mua add-on ngoài', status: 'cross' as const },
          notion: { value: 'Phụ phí +$10/user/tháng', status: 'warning' as const },
          slack: { value: 'Phụ phí +$25/user/tháng', status: 'warning' as const },
        },
        {
          feature: 'Auto-Decompose Goals into Subtasks',
          featureVi: 'Tự động phân rã mục tiêu thành Subtasks & PRD',
          desc: '1-click AI workflow breakdown from high-level specs',
          descVi: 'Phân rã mục tiêu Sprint thành việc cụ thể chỉ với 1 click',
          apexa: { value: '✓ 1-Click tự động hóa', isPrimary: true },
          jira: { value: 'Tạo ticket thủ công', status: 'cross' as const },
          notion: { value: 'Soạn thảo thủ công', status: 'cross' as const },
          slack: { value: 'Không hỗ trợ', status: 'cross' as const },
        },
      ],
    },
    {
      categoryName: 'Unified Continuous Canvas',
      categoryNameVi: 'Trải nghiệm Hợp nhất Continuous Canvas',
      categoryIcon: LayoutGrid,
      categoryColor: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
      items: [
        {
          feature: 'Live Interactive Tasks embedded in Docs',
          featureVi: 'Nhúng Live Kanban Tasks trực tiếp vào Smart Docs',
          desc: 'Two-way synced actionable task cards inside pages',
          descVi: 'Thẻ công việc tương tác 2 chiều ngay trong tài liệu',
          apexa: { value: '✓ Đồng bộ 2 chiều tức thì', isPrimary: true },
          jira: { value: 'Rời rạc hoàn toàn', status: 'cross' as const },
          notion: { value: 'Chỉ xem dạng tĩnh', status: 'warning' as const },
          slack: { value: 'Không hỗ trợ', status: 'cross' as const },
        },
        {
          feature: 'In-Context ChatRoom tied to each Task',
          featureVi: 'Kênh Chat gắn liền trực tiếp với từng Task & Dự án',
          desc: 'Never lose conversation context across scattered DMs',
          descVi: 'Trao đổi ngay tại đầu việc, không bị trôi tin nhắn',
          apexa: { value: '✓ Trực tiếp trong ngữ cảnh', isPrimary: true },
          jira: { value: 'Bình luận tĩnh rời rạc', status: 'cross' as const },
          notion: { value: 'Thiếu chat realtime', status: 'cross' as const },
          slack: { value: 'Tin nhắn trôi mất dấu', status: 'warning' as const },
        },
        {
          feature: 'Two-Way Google Calendar & Gantt Sync',
          featureVi: 'Lịch Sprint & Timeline Gantt đồng bộ 2 chiều Google Calendar',
          desc: 'Critical path tracking with instant calendar sync',
          descVi: 'Kiểm soát đường găng tiến độ và đồng bộ 2 chiều tức thì',
          apexa: { value: '✓ 2-Way Sync tích hợp sẵn', isPrimary: true },
          jira: { value: 'Cần plugin bên thứ 3', status: 'warning' as const },
          notion: { value: 'Hạn chế tính năng', status: 'warning' as const },
          slack: { value: 'Không có timeline', status: 'cross' as const },
        },
      ],
    },
    {
      categoryName: 'Cost & SaaS Subscriptions',
      categoryNameVi: 'Chi phí & Bản quyền Phần mềm SaaS',
      categoryIcon: DollarSign,
      categoryColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      items: [
        {
          feature: 'All-in-One Total Cost of Ownership',
          featureVi: 'Chi phí vận hành & Bản quyền phần mềm',
          desc: 'Replace 5 separate subscriptions with 1 unified invoice',
          descVi: 'Thay thế 5 khoản phí riêng lẻ bằng 1 gói duy nhất',
          apexa: { value: '💎 1 Gói duy nhất (Tiết kiệm 75%)', isPrimary: true },
          jira: { value: '~$15 - $20 / user', status: 'warning' as const },
          notion: { value: '~$12 - $18 / user', status: 'warning' as const },
          slack: { value: '~$15 - $25 / user', status: 'warning' as const },
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Comparison Table Container */}
      <div className="shots-glass-card rounded-3xl p-4 sm:p-7 overflow-x-auto text-left border border-slate-200/80 dark:border-white/10 shadow-lg">
        <table className="w-full min-w-[760px] text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-white/10">
              <th className="py-4 px-4 font-black uppercase text-[11px] tracking-wider text-slate-500 dark:text-slate-400 w-2/5">
                {isVietnamese ? 'Tiêu chí & Năng lực cốt lõi' : 'Features & Core Capabilities'}
              </th>
              {/* Highlighted Apexa Column Header */}
              <th className="py-4 px-4 text-center bg-gradient-to-b from-indigo-500/15 to-purple-500/10 dark:from-indigo-500/25 dark:to-purple-500/15 border-x border-t border-indigo-500/30 rounded-t-2xl w-1/4 shadow-xs">
                <div className="flex flex-col items-center gap-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[9.5px] font-black uppercase tracking-wider shadow-xs">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>{isVietnamese ? 'APEXA (KHUYÊN DÙNG)' : 'APEXA (RECOMMENDED)'}</span>
                  </div>
                  <span className="text-xs font-black text-indigo-900 dark:text-white pt-0.5">
                    {isVietnamese ? 'Tất cả trong một' : 'All-in-One Canvas'}
                  </span>
                </div>
              </th>
              <th className="py-4 px-3 font-bold text-center text-slate-700 dark:text-slate-300 w-1/8">
                <span className="font-extrabold text-slate-900 dark:text-white block">Jira / Asana</span>
                <span className="text-[10px] font-medium text-slate-400">{isVietnamese ? 'Quản lý dự án' : 'Project tool'}</span>
              </th>
              <th className="py-4 px-3 font-bold text-center text-slate-700 dark:text-slate-300 w-1/8">
                <span className="font-extrabold text-slate-900 dark:text-white block">Notion / Coda</span>
                <span className="text-[10px] font-medium text-slate-400">{isVietnamese ? 'Tài liệu số' : 'Docs tool'}</span>
              </th>
              <th className="py-4 px-3 font-bold text-center text-slate-700 dark:text-slate-300 w-1/8">
                <span className="font-extrabold text-slate-900 dark:text-white block">Slack / Teams</span>
                <span className="text-[10px] font-medium text-slate-400">{isVietnamese ? 'Kênh chat' : 'Chat tool'}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 dark:divide-white/5 font-semibold text-slate-700 dark:text-slate-300">
            {comparisonCategories.map((category, catIdx) => {
              const CatIcon = category.categoryIcon;
              return (
                <React.Fragment key={catIdx}>
                  {/* Category Header Row */}
                  <tr className="bg-slate-100/50 dark:bg-white/[0.02]">
                    <td colSpan={5} className="py-2.5 px-4 font-black text-[10.5px] uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${category.categoryColor}`}>
                          <CatIcon className="w-3 h-3" />
                        </div>
                        <span>{isVietnamese ? category.categoryNameVi : category.categoryName}</span>
                      </div>
                    </td>
                  </tr>

                  {/* Criteria Rows */}
                  {category.items.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.03] transition-colors">
                      {/* Criteria Title & Description */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 dark:text-white text-xs">
                          {isVietnamese ? row.featureVi : row.feature}
                        </div>
                        <p className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 pt-0.5 leading-tight">
                          {isVietnamese ? row.descVi : row.desc}
                        </p>
                      </td>

                      {/* Apexa Highlight Cell */}
                      <td className="py-3 px-4 text-center bg-indigo-50/40 dark:bg-indigo-950/20 border-x border-indigo-500/20 font-black text-indigo-600 dark:text-sky-300">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/10 dark:bg-indigo-400/10 border border-indigo-600/20 dark:border-indigo-400/20 text-[11px] text-indigo-700 dark:text-sky-300 font-extrabold shadow-2xs">
                          {row.apexa.value}
                        </div>
                      </td>

                      {/* Competitor: Jira */}
                      <td className="py-3 px-3 text-center">
                        {row.jira.status === 'cross' ? (
                          <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 text-[11px] font-medium">
                            <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{row.jira.value}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded text-[10.5px] font-bold border border-amber-500/20">
                            {row.jira.value}
                          </span>
                        )}
                      </td>

                      {/* Competitor: Notion */}
                      <td className="py-3 px-3 text-center">
                        {row.notion.status === 'cross' ? (
                          <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 text-[11px] font-medium">
                            <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{row.notion.value}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded text-[10.5px] font-bold border border-amber-500/20">
                            {row.notion.value}
                          </span>
                        )}
                      </td>

                      {/* Competitor: Slack */}
                      <td className="py-3 px-3 text-center">
                        {row.slack.status === 'cross' ? (
                          <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 text-[11px] font-medium">
                            <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{row.slack.value}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded text-[10.5px] font-bold border border-amber-500/20">
                            {row.slack.value}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Summary Callout Banner */}
      <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-indigo-900/90 via-slate-900/90 to-purple-900/90 text-white border border-white/10 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-xs shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black tracking-tight">
              {isVietnamese ? 'Tiết kiệm 75% chi phí phần mềm & Tăng 45% vận tốc Sprint' : 'Save 75% SaaS costs & Boost Sprint Velocity by 45%'}
            </h4>
            <p className="text-xs text-indigo-200/80 font-medium pt-0.5">
              {isVietnamese
                ? 'Không còn phân mảnh dữ liệu. Một gói duy nhất tích hợp toàn bộ quy trình làm việc của đội ngũ.'
                : 'Zero data fragmentation. One unified platform powering your complete operating flow.'}
            </p>
          </div>
        </div>
        {onSignUp && (
          <button
            onClick={onSignUp}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-white text-slate-900 hover:bg-slate-100 text-xs font-black transition-all shadow-md hover:scale-105 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{isVietnamese ? 'Đăng ký miễn phí ngay' : 'Get Started Free'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   MAIN LANDING PAGE EXPORT
   ========================================================================= */
export default function LandingPage({ onSignUp, onSignIn }: LandingPageProps) {
  const router = useRouter();
  const { isVietnamese } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const [activeCategory, setActiveCategory] = useState('all');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [billingPrices, setBillingPrices] = useState<Partial<Record<SelfServeBillingPlan, Partial<Record<BillingCycle, PublicBillingPrice>>>>>({});
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [faqCategory, setFaqCategory] = useState<'all' | 'features' | 'security' | 'pricing'>('all');
  const [faqSearch, setFaqSearch] = useState('');

  // Rotating Hero dynamic phrases
  const heroPhrases = useMemo(() => isVietnamese ? [
    'Đột phá năng suất',
    'Tối ưu quy trình',
    'Tự động hóa tác vụ',
    'Gắn kết đội ngũ',
    'Ra quyết định tức thì',
  ] : [
    'Supercharge velocity',
    'Streamline workflows',
    'Automate operations',
    'Empower your team',
    'Decide with clarity',
  ], [isVietnamese]);

  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % heroPhrases.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [heroPhrases.length]);

  // Dynamic Top Announcement Marquee Items
  const announcementItems = useMemo(() => [
    {
      id: 'ap-2',
      badge: '⚡ APEXA 2.0 LIVE',
      badgeVariant: 'shots-new' as const,
      text: isVietnamese
        ? 'Apexa 2.0 kết nối trợ lý Gemini AI với công việc, tài liệu và kiến trúc local-first.'
        : 'Apexa 2.0 connects Gemini AI with tasks, documents, and a local-first architecture.',
      cta: isVietnamese ? 'Khám phá ngay' : 'Explore now',
      action: onSignUp,
    },
    {
      id: 'local-first',
      badge: '⚡ LOCAL-FIRST',
      badgeVariant: 'info' as const,
      text: isVietnamese
        ? 'Bộ nhớ đệm local-first giúp giao diện phản hồi nhanh và giữ các thay đổi cục bộ khi kết nối gián đoạn.'
        : 'Local-first caching keeps the interface responsive and preserves local changes during connection loss.',
      cta: isVietnamese ? 'Dùng thử miễn phí' : 'Try for free',
      action: onSignUp,
    },
    {
      id: 'security',
      badge: '🛡️ SECURITY BY DESIGN',
      badgeVariant: 'success' as const,
      text: isVietnamese
        ? 'Tách khóa bí mật khỏi trình duyệt, phân quyền Row-Level Security và xác thực chữ ký webhook thanh toán.'
        : 'Server-only secrets, Row-Level Security, and signed payment webhook verification.',
      cta: isVietnamese ? 'Xem bảo mật' : 'Learn more',
      action: () => {
        router.push('/legal/security');
      },
    },
    {
      id: 'all-in-one',
      badge: '✨ ALL-IN-ONE PLATFORM',
      badgeVariant: 'primary' as const,
      text: isVietnamese
        ? 'Hợp nhất Kanban, Smart Docs 2.0, Chat thời gian thực, CRM và ERP Kế toán trong một giao diện duy nhất.'
        : 'Unify Kanban, Smart Docs 2.0, Team Chat, CRM, and ERP Finance into one cohesive platform.',
      cta: isVietnamese ? 'Bắt đầu ngay' : 'Get started',
      action: onSignUp,
    },
    {
      id: 'free-tier',
      badge: '🎁 FREE PLAN',
      badgeVariant: 'warning' as const,
      text: isVietnamese
        ? 'Bắt đầu với gói Free mà không cần thẻ tín dụng; nâng cấp khi đội ngũ cần thêm quyền lợi.'
        : 'Start on the Free plan without a credit card and upgrade when your team needs more.',
      cta: isVietnamese ? 'Đăng ký miễn phí' : 'Sign up free',
      action: onSignUp,
    },
  ], [isVietnamese, onSignUp, router]);

  // Dynamic Categories
  const categories = useMemo(() => [
    { id: 'all', label: isVietnamese ? 'Tất cả giải pháp' : 'All Solutions', icon: Sparkles },
    { id: 'task', label: isVietnamese ? 'Quản lý dự án & Sprint' : 'Tasks & Sprints', icon: Kanban },
    { id: 'ai', label: isVietnamese ? 'Apexa Brain AI' : 'Apexa Brain AI', icon: ApexaAiIcon },
    { id: 'collaboration', label: isVietnamese ? 'Cộng tác thời gian thực' : 'Real-time Collaboration', icon: MessageSquare },
    { id: 'analytics', label: isVietnamese ? 'Phân tích & Tối ưu hiệu suất' : 'Analytics & Performance', icon: BarChart3 }
  ], [isVietnamese]);

  // Dynamic Features with Visual Widgets
  const features = useMemo(() => [
    {
      icon: Kanban,
      title: isVietnamese ? 'Kanban & Agile Sprints' : 'Kanban & Agile Sprints',
      desc: isVietnamese 
        ? 'Kéo thả trực quan, tối ưu sprint với 5 chế độ xem linh hoạt: Kanban Board, List View, Bảng dữ liệu, Lịch biểu và Gantt Timeline.'
        : 'Intuitive drag-and-drop workflow with 5 flexible view modes: Kanban Board, List View, Table, Calendar, and Gantt Timeline.',
      badge: isVietnamese ? 'Cốt lõi' : 'Core',
      tagVariant: 'shots' as const,
      color: 'from-blue-600 to-indigo-600',
      bg: 'bg-blue-500/10 dark:bg-blue-500/15',
      iconColor: 'text-blue-600 dark:text-blue-400',
      category: 'task',
      visualType: 'kanban'
    },
    {
      icon: ApexaAiIcon,
      title: 'Apexa Brain AI Copilot',
      desc: isVietnamese
        ? 'Trợ lý AI tích hợp sâu: tự động phân rã mục tiêu thành subtasks, tóm tắt tài liệu, gợi ý phân bổ KPI và viết báo cáo tiến độ bằng Gemini AI.'
        : 'Deeply integrated AI: auto-deconstruct goals into subtasks, summarize docs, recommend KPI allocations, and generate progress digests.',
      badge: 'AI Native',
      tagVariant: 'shots-new' as const,
      color: 'from-indigo-600 to-purple-600',
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      category: 'ai',
      visualType: 'ai',
      featured: true
    },
    {
      icon: FileText,
      title: isVietnamese ? 'Smart Docs & Knowledge Base' : 'Smart Docs & Knowledge Base',
      desc: isVietnamese
        ? 'Tài liệu số cộng tác thời gian thực (Multi-cursor real-time). Nhúng trực tiếp task, cơ sở dữ liệu và sơ đồ tư duy ngay trong trang.'
        : 'Multi-cursor real-time collaborative documentation. Embed live tasks, databases, and mind maps directly inside pages.',
      badge: 'Real-time',
      tagVariant: 'shots' as const,
      color: 'from-violet-600 to-purple-600',
      bg: 'bg-violet-500/10 dark:bg-violet-500/15',
      iconColor: 'text-violet-600 dark:text-violet-400',
      category: 'collaboration',
      visualType: 'docs'
    },
    {
      icon: MessageSquare,
      title: isVietnamese ? 'ChatRoom & Kênh Thảo Luận' : 'ChatRoom & Audio Huddles',
      desc: isVietnamese
        ? 'Trao đổi kênh truyền theo dự án, thảo luận trực tiếp trên từng task cụ thể, loại bỏ 100% tình trạng phân mảnh tin nhắn rời rạc.'
        : 'Project-based communication channels, in-task discussions, and voice huddles eliminating message fragmentation entirely.',
      badge: isVietnamese ? 'Tích hợp' : 'Built-in',
      tagVariant: 'shots' as const,
      color: 'from-emerald-600 to-teal-600',
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      category: 'collaboration',
      visualType: 'chat'
    },
    {
      icon: Calendar,
      title: isVietnamese ? 'Lịch & Timeline Gantt Đa Chiều' : 'Calendar & Gantt Timeline',
      desc: isVietnamese
        ? 'Kiểm soát đường găng dự án (Critical Path), phát hiện xung đột deadline và đồng bộ 2 chiều tức thì với Google Calendar.'
        : 'Track critical path milestones, discover deadline collisions automatically, and enjoy two-way Google Calendar synchronization.',
      badge: 'Sync 2-Way',
      tagVariant: 'shots' as const,
      color: 'from-teal-600 to-cyan-600',
      bg: 'bg-teal-500/10 dark:bg-teal-500/15',
      iconColor: 'text-teal-600 dark:text-teal-400',
      category: 'task',
      visualType: 'calendar'
    },
    {
      icon: BarChart3,
      title: isVietnamese ? 'Trung Tâm Phân Tích Hiệu Suất' : 'Analytics Command Center',
      desc: isVietnamese
        ? 'Báo cáo năng suất trực quan: Biểu đồ Burn-down, Sprint Velocity, phân tích tải công việc thành viên và cảnh báo nguy cơ trễ hạn.'
        : 'Visual productivity analytics: Burn-down charts, Sprint Velocity, workload distribution analysis, and predictive delay warnings.',
      badge: 'Insight',
      tagVariant: 'shots' as const,
      color: 'from-amber-600 to-orange-600',
      bg: 'bg-amber-500/10 dark:bg-amber-500/15',
      iconColor: 'text-amber-600 dark:text-amber-400',
      category: 'analytics',
      visualType: 'analytics'
    },
    {
      icon: Timer,
      title: isVietnamese ? 'Pomodoro & Quản Lý Thời Gian' : 'Pomodoro & Time Tracking',
      desc: isVietnamese
        ? 'Bộ đếm thời gian tập trung chuẩn khoa học, theo dõi log giờ làm việc theo từng đầu việc cụ thể và thống kê thời gian thực.'
        : 'Scientifically backed focus timer, granular per-task timesheets, and real-time productivity statistics.',
      badge: 'Focus',
      tagVariant: 'shots' as const,
      color: 'from-rose-600 to-red-600',
      bg: 'bg-rose-500/10 dark:bg-rose-500/15',
      iconColor: 'text-rose-600 dark:text-rose-400',
      category: 'task',
      visualType: 'pomodoro'
    },
    {
      icon: Database,
      title: 'Apexa Base (No-Code DB)',
      desc: isVietnamese
        ? 'Cơ sở dữ liệu dạng bảng quan hệ mạnh mẽ, tùy biến schema, quản lý CRM, kho nội dung và tài sản dự án không giới hạn.'
        : 'Relational database sheets with custom schemas, CRM pipelines, content inventories, and unlimited digital asset management.',
      badge: 'No-Code',
      tagVariant: 'shots' as const,
      color: 'from-blue-600 to-indigo-600',
      bg: 'bg-blue-500/10 dark:bg-blue-500/15',
      iconColor: 'text-blue-600 dark:text-blue-400',
      category: 'analytics',
      visualType: 'database'
    }
  ], [isVietnamese]);

  // Dynamic Workflow Steps
  const workflowSteps = useMemo(() => [
    {
      step: '01',
      title: isVietnamese ? 'Tạo Không Gian & Phân Quyền' : 'Create Space & Assign Roles',
      desc: isVietnamese
        ? 'Khởi tạo Workspace chuyên biệt theo phòng ban, phân quyền chi tiết (Admin, Member, Guest) trong 30 giây.'
        : 'Set up departmental workspaces with fine-grained roles (Admin, Member, Guest) in under 30 seconds.',
      icon: Layers,
      badge: isVietnamese ? '⚡ 30s Khởi động' : '⚡ 30s Setup',
      badgeColor: 'text-blue-600 dark:text-sky-400 bg-blue-500/10 border-blue-500/25',
      grad: 'from-blue-600 to-indigo-600',
    },
    {
      step: '02',
      title: isVietnamese ? 'Lên Kế Hoạch Với Apexa AI' : 'Plan with Apexa AI',
      desc: isVietnamese
        ? 'Giao mục tiêu lớn cho Gemini AI — hệ thống tự động phân tách thành các task nhỏ kèm deadline và độ ưu tiên.'
        : 'Feed high-level milestones to Gemini AI—the system auto-generates decomposed tasks with deadlines and rich context.',
      icon: Sparkles,
      badge: isVietnamese ? '✨ AI Tự động hóa' : '✨ AI Native',
      badgeColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/25',
      grad: 'from-indigo-600 to-purple-600',
    },
    {
      step: '03',
      title: isVietnamese ? 'Cộng Tác Thời Gian Thực' : 'Real-time Collaboration',
      desc: isVietnamese
        ? 'Thực thi công việc trên Kanban, soạn thảo Smart Docs và thảo luận ngay trong ChatRoom mà không phải đổi app.'
        : 'Execute tasks on Kanban boards, write collaborative docs, and chat in project rooms without tab switching.',
      icon: MessageSquare,
      badge: isVietnamese ? '🌐 Đồng bộ 100%' : '🌐 100% Synced',
      badgeColor: 'text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/25',
      grad: 'from-violet-600 to-fuchsia-600',
    },
    {
      step: '04',
      title: isVietnamese ? 'Phân Tích & Bứt Phá Năng Suất' : 'Analyze & Boost Velocity',
      desc: isVietnamese
        ? 'Theo dõi chỉ số Sprint Velocity, nhận báo cáo phân tích hiệu suất tuần do AI tổng hợp tự động mỗi sáng thứ Hai.'
        : 'Track sprint velocity metrics and receive automated AI performance retrospectives every Monday morning.',
      icon: TrendingUp,
      badge: isVietnamese ? '📊 Đo lường ROI' : '📊 Measure ROI',
      badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
      grad: 'from-emerald-600 to-teal-600',
    }
  ], [isVietnamese]);

  // Dynamic Pricing Plans
  // Dynamic 4-Tier Pricing Plans
  const pricingPlans = useMemo(() => [
    {
      id: 'free' as BillingPlan,
      name: 'Free',
      desc: isVietnamese ? 'Dành cho cá nhân và freelancer bắt đầu chuẩn hóa không gian làm việc.' : 'For individuals and freelancers organizing core workflows.',
      badge: isVietnamese ? 'MIỄN PHÍ' : 'FREE FOREVER',
      highlight: false,
      cta: isVietnamese ? 'Bắt đầu miễn phí' : 'Start for Free',
      icon: Rocket,
      badgeColor: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 border-slate-200/60 dark:border-white/10',
      features: isVietnamese ? [
        'Tối đa 5 Spaces làm việc độc lập',
        'Tasks & dự án không giới hạn số lượng',
        'Board Kanban, Danh sách List & Smart Docs',
        '3 Bảng trắng vô cực Whiteboard cộng tác',
        'Apexa AI chỉ có trên các gói trả phí',
        'Lưu trữ dữ liệu Local-First tức thì 11.4ms'
      ] : [
        'Up to 5 active independent spaces',
        'Unlimited tasks and projects',
        'Core Kanban, List & Smart Docs',
        '3 collaborative infinite whiteboards',
        'Apexa AI is available on paid plans',
        'Instant Local-First 11.4ms data caching'
      ]
    },
    {
      id: 'starter' as BillingPlan,
      name: 'Starter',
      desc: isVietnamese ? 'Cho nhóm nhỏ 2–10 người cần cộng tác mượt mà và quản lý tiến độ.' : 'For small teams of 2–10 needing seamless execution and tracking.',
      badge: isVietnamese ? 'NHÓM NHỎ' : 'STARTER',
      highlight: false,
      cta: isVietnamese ? 'Chọn gói Starter' : 'Choose Starter',
      icon: Users,
      badgeColor: 'text-blue-600 dark:text-sky-400 bg-blue-500/10 border-blue-500/25',
      features: isVietnamese ? [
        'Không giới hạn Spaces và Whiteboards',
        'Lịch biểu Sprint & Timeline Gantt trực quan',
        'Đồng bộ 2 chiều Google Calendar & Notion',
        'Toàn bộ Apexa AI · 150 lượt mỗi tháng',
        'Tự động hóa quy trình phân việc cơ bản',
        'Phân quyền thành viên (Admin / Member)'
      ] : [
        'Unlimited Spaces & Whiteboards',
        'Sprint Calendar & visual Gantt Timeline',
        'Two-way Google Calendar & Notion sync',
        'All Apexa AI tools · 150 requests/month',
        'Core workflow task automation',
        'Member role permissions (Admin / Member)'
      ]
    },
    {
      id: 'pro' as BillingPlan,
      name: 'Pro',
      desc: isVietnamese ? 'Cân bằng hoàn hảo nhất giữa AI Native, phân tích chuyên sâu và chi phí.' : 'The optimal tier with AI Native superpowers, CRM/ERP and deep analytics.',
      badge: isVietnamese ? '🔥 PHỔ BIẾN NHẤT' : '🔥 POPULAR',
      highlight: true,
      cta: isVietnamese ? 'Chọn gói Pro (Khuyên dùng)' : 'Choose Pro Tier',
      icon: Crown,
      badgeColor: 'text-white bg-gradient-to-r from-indigo-600 to-purple-600',
      features: isVietnamese ? [
        'Toàn bộ quyền lợi của gói Starter',
        'Apexa AI · 2.000 lượt mỗi tháng',
        'Hệ sinh thái CRM, ERP & Finance Workspace',
        'Tự động hóa phân rã PRD thành Tasks 1-Click',
        'Theo dõi thời gian, chấm công & đo lường KPI',
        'Báo cáo phân tích Sprint Velocity hàng tuần',
        'Phân quyền khách mời (Guest) không tính phí'
      ] : [
        'Everything included in Starter',
        'Apexa AI · 2,000 requests per month',
        'Integrated CRM, ERP & Finance workspaces',
        '1-Click automated PRD goal decomposition',
        'Time tracking, attendance & KPI metrics',
        'Weekly Sprint Velocity analytics report',
        'Free external guest collaborator access'
      ]
    },
    {
      id: 'enterprise' as BillingPlan,
      name: 'Enterprise',
      desc: isVietnamese ? 'Bảo mật tuyệt đối, phân quyền đa phòng ban và SLA thiết kế riêng.' : 'Enterprise governance, multi-department security, and tailored SLA.',
      badge: isVietnamese ? 'DOANH NGHIỆP' : 'ENTERPRISE',
      highlight: false,
      cta: isVietnamese ? 'Liên hệ Doanh nghiệp' : 'Contact Enterprise',
      icon: Building2,
      badgeColor: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/25',
      features: isVietnamese ? [
        'Toàn bộ quyền lợi của gói Pro',
        'Phân quyền đa phòng ban & Multi-workspace',
        'Portfolio & Quản lý phân bổ khối lượng (Workload)',
        'API & Webhooks không giới hạn lưu lượng',
        'Chính sách lưu trữ & sao lưu dữ liệu theo yêu cầu',
        'Cam kết SLA 99.9% Uptime & Bảo mật 256-bit',
        'Đội ngũ kỹ sư hỗ trợ triển khai 1-1 riêng biệt'
      ] : [
        'Everything included in Pro',
        'Multi-department & Multi-workspace governance',
        'Portfolio & Team workload management',
        'Unlimited API & Webhook throughput',
        'Custom data retention & backup policies',
        '99.9% Uptime SLA & 256-bit encryption',
        'Dedicated 1-on-1 deployment engineer'
      ]
    }
  ], [isVietnamese]);

  // Representative deployment scenarios. These are product use cases, not customer endorsements.
  const testimonials = useMemo(() => [
    {
      id: 'product',
      title: isVietnamese ? 'Sản phẩm & Kỹ thuật' : 'Product & Engineering',
      headline: isVietnamese
        ? 'Hợp nhất Backlog, PRD & CI/CD trên 1 Canvas thời gian thực'
        : 'Unified Backlogs, PRDs & CI/CD on a real-time canvas',
      author: isVietnamese ? 'Đội phát triển sản phẩm' : 'Product Delivery Team',
      role: isVietnamese ? 'Kịch bản triển khai' : 'Deployment Scenario',
      company: 'Tasks · Docs · Chat · CI/CD',
      metric: isVietnamese ? '+45% Vận tốc bàn giao' : '+45% Sprint Velocity',
      avatar: 'PM',
      icon: Cpu,
      gradient: 'from-blue-600 to-indigo-600',
      badgeColor: 'text-blue-600 dark:text-sky-400 bg-blue-500/10 border-blue-500/25',
      modules: ['Live Kanban', 'PRD Docs', 'In-Task Chat', 'Yjs CRDTs'],
      bullets: isVietnamese ? [
        'AI tự động phân rã PRD thành 12 Tasks kèm DoD và Deadline',
        'Đồng bộ 2 chiều Backlog và GitHub commit không rời màn hình',
        'Cộng tác đồng thời không lo xung đột dữ liệu với Yjs CRDTs'
      ] : [
        'AI auto-decomposes PRDs into 12 actionable tasks with DoD',
        'Two-way sync between Backlog & GitHub commits without tab switching',
        'Zero merge conflicts with conflict-free Yjs CRDT real-time sync'
      ],
      quote: isVietnamese
        ? 'Đội sản phẩm có thể gom toàn bộ backlog, sprint, tài liệu PRD và thảo luận vào một workspace; mỗi thay đổi đều cập nhật cùng ngữ cảnh thời gian thực thay vì rơi rớt giữa nhiều công cụ rời rạc.'
        : 'Product teams can keep backlog, sprints, PRDs, and discussions in one workspace, preserving context instead of scattering updates across separate tools.'
    },
    {
      id: 'growth',
      title: isVietnamese ? 'Tăng trưởng & Marketing' : 'Growth & Marketing',
      headline: isVietnamese
        ? 'Từ Phễu Lead CRM đến Chiến dịch GTM Đa kênh trong vài phút'
        : 'From CRM Lead Funnel to Multi-channel GTM in minutes',
      author: isVietnamese ? 'Nhóm tăng trưởng & Marketing' : 'Growth & Marketing Team',
      role: isVietnamese ? 'Kịch bản triển khai' : 'Deployment Scenario',
      company: 'CRM · Calendar · AI Copilot',
      metric: isVietnamese ? '3.5x Tốc độ ra mắt chiến dịch' : '3.5x Campaign Velocity',
      avatar: 'GM',
      icon: TrendingUp,
      gradient: 'from-indigo-600 to-purple-600',
      badgeColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/25',
      modules: ['Lead CRM', 'Calendar Sync', 'AI Copywriter', 'Campaign Board'],
      bullets: isVietnamese ? [
        'Quản lý phễu Lead & tự động phân bổ cơ hội bán hàng',
        'Lịch biên tập nội dung đồng bộ trực tiếp Google Calendar',
        'Gemini AI sáng tạo bản thảo quảng cáo & landing copy tức thì'
      ] : [
        'Lead pipeline management with automated deal routing',
        'Editorial content calendar synced 2-way with Google Calendar',
        'Gemini AI instantly crafts ad copy and high-converting landing pages'
      ],
      quote: isVietnamese
        ? 'Nhóm marketing có thể theo dõi phễu lead trong CRM, lập lịch chiến dịch đa kênh, quản lý nội dung và dùng Gemini AI phân rã kế hoạch thành các đầu việc giao việc ngay cho từng thành viên.'
        : 'Marketing teams can track leads in CRM, schedule campaigns, manage content, and use AI to break plans into assignable tasks.'
    },
    {
      id: 'ops',
      title: isVietnamese ? 'Vận hành & Tài chính' : 'Operations & Finance',
      headline: isVietnamese
        ? 'Kiểm soát Ngân sách, Dòng tiền & OKR Doanh nghiệp minh bạch'
        : 'Transparent Budgeting, Cashflow & Company OKR Governance',
      author: isVietnamese ? 'Bộ phận vận hành & Quản trị' : 'Operations & Finance Team',
      role: isVietnamese ? 'Kịch bản triển khai' : 'Deployment Scenario',
      company: 'ERP · Finance · OKR Goals',
      metric: isVietnamese ? 'Tiết kiệm 75% chi phí SaaS' : '75% SaaS Cost Saved',
      avatar: 'OP',
      icon: DollarSign,
      gradient: 'from-cyan-600 to-blue-600',
      badgeColor: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/25',
      modules: ['ERP Modules', 'Cashflow Ledger', 'OKR Alignment', 'Audit Log'],
      bullets: isVietnamese ? [
        'Hợp nhất ERP & Sổ quỹ dòng tiền theo thời gian thực',
        'Đo lường tiến độ mục tiêu OKR công ty từ chiến lược đến kết quả',
        'Tự động hóa luồng duyệt thanh toán & Audit Log minh bạch'
      ] : [
        'Real-time cashflow ledger and integrated ERP financial modules',
        'Measure company OKR progress from strategy down to delivery',
        'Automated payment approvals and tamper-evident enterprise audit logs'
      ],
      quote: isVietnamese
        ? 'Bộ phận vận hành có thể nối ERP, theo dõi dòng tiền, mục tiêu OKR và báo cáo tài chính trên cùng hệ thống để kiểm soát tiến độ công việc từ kế hoạch chiến lược đến kết quả bàn giao thực tế.'
        : 'Operations teams can connect ERP, finance, goals, and reporting in the same system to follow work from plan to outcome.'
    },
    {
      id: 'design',
      title: isVietnamese ? 'Thiết kế & Sáng tạo' : 'Design & Creative Studio',
      headline: isVietnamese
        ? 'Brainstorm trên Whiteboard, Nhúng Prototype Figma & Duyệt Feedback'
        : 'Infinite Whiteboard Brainstorming & Live Figma Reviews',
      author: isVietnamese ? 'Đội ngũ thiết kế & Creative' : 'Design & Creative Studio',
      role: isVietnamese ? 'Kịch bản triển khai' : 'Deployment Scenario',
      company: 'Whiteboard · Figma · Review',
      metric: isVietnamese ? '100% Đồng bộ Prototype' : '100% Real-time Sync',
      avatar: 'DS',
      icon: Palette,
      gradient: 'from-purple-600 to-pink-600',
      badgeColor: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/25',
      modules: ['Infinite Whiteboard', 'Figma Embed', 'Asset Library', 'Client Review'],
      bullets: isVietnamese ? [
        'Bảng trắng vô cực vẽ sơ đồ tư duy & User Journey không giới hạn',
        'Nhúng trực tiếp prototype Figma và review feedback tại thẻ Task',
        'Quản lý thư viện Design Tokens chuẩn hóa cho toàn công ty'
      ] : [
        'Infinite canvas for mind mapping and user journey flowcharts',
        'Direct Figma prototype embeds with inline review & feedback',
        'Centralized design system tokens library across the organization'
      ],
      quote: isVietnamese
        ? 'Đội ngũ thiết kế dễ dàng brainstorm trên Bảng trắng vô cực, nhúng trực tiếp prototype từ Figma và duyệt phản hồi ngay tại thẻ công việc mà không bị thất lạc feedback qua email hay chat riêng.'
        : 'Design teams can brainstorm on infinite whiteboards, embed live Figma prototypes, and gather reviews directly inside task cards.'
    }
  ], [isVietnamese]);

  // Dynamic Categorized FAQs
  const faqs = useMemo(() => [
    {
      id: 'faq-1',
      category: 'features' as const,
      categoryLabel: isVietnamese ? 'Tính năng & AI' : 'Features & AI',
      badgeColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      q: isVietnamese
        ? 'Apexa AI hỗ trợ tiếng Việt, phân rã công việc và tạo tài liệu như thế nào?'
        : 'How does Apexa AI handle Vietnamese, goal decomposition, and smart docs?',
      a: isVietnamese
        ? 'Apexa Brain tích hợp Gemini AI thế hệ mới với khả năng hiểu sâu ngữ cảnh tiếng Việt và tiếng Anh. Bạn có thể thả tài liệu PRD hoặc biên bản họp, AI sẽ tự động phân rã thành danh sách Task kèm Definition of Done (DoD), gán độ ưu tiên và ước tính thời gian thực hiện chỉ với 1 cú click.'
        : 'Apexa Brain utilizes cutting-edge Gemini AI with deep bilingual context comprehension. You can paste PRDs or meeting minutes, and AI will automatically decompose them into actionable tasks with DoD and timeline estimates in 1 click.',
      highlights: isVietnamese
        ? ['Phân rã PRD thành Tasks 1-Click', 'Hỗ trợ song ngữ Việt - Anh chuẩn xác', 'Tự động sinh DoD & Checklist']
        : ['1-Click PRD Goal Decomposition', 'Fluent Vietnamese & English NLP', 'Automated DoD & Checklists']
    },
    {
      id: 'faq-2',
      category: 'features' as const,
      categoryLabel: isVietnamese ? 'Tính năng & AI' : 'Features & AI',
      badgeColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      q: isVietnamese
        ? 'Continuous Canvas khác biệt gì so với việc mở nhiều tab Notion, Jira, Slack riêng biệt?'
        : 'How does Continuous Canvas differ from switching across separate tabs like Jira, Notion, and Slack?',
      a: isVietnamese
        ? 'Continuous Canvas hợp nhất toàn bộ không gian làm việc (Backlog, Sprint Board, Smart Docs, In-Task Chat và Bảng trắng Whiteboard) trên một khung nhìn duy nhất. Thay vì phải liên tục chuyển đổi giữa 5–6 tab trình duyệt và rơi rớt ngữ cảnh, mọi thành viên trong nhóm đều thấy ngay tiến độ, tài liệu liên kết và trao đổi thời gian thực tại cùng một nơi.'
        : 'Continuous Canvas unifies Backlogs, Kanban, Smart Docs, In-Task Chat, and Whiteboards into a seamless single viewport. Instead of juggling multiple browser tabs and losing context, your team collaborates in real time with synchronized context.',
      highlights: isVietnamese
        ? ['Giảm 100% chi phí chuyển Tab', 'Mọi phân hệ đồng bộ trên 1 Canvas', 'Ngữ cảnh trao đổi liền mạch']
        : ['Zero context switching friction', 'All modules unified on 1 Canvas', 'Continuous real-time sync']
    },
    {
      id: 'faq-3',
      category: 'features' as const,
      categoryLabel: isVietnamese ? 'Tính năng & AI' : 'Features & AI',
      badgeColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      q: isVietnamese
        ? 'Apexa có hỗ trợ đồng bộ với Google Calendar, Figma và GitHub không?'
        : 'Does Apexa support two-way sync with Google Calendar, Figma, and GitHub?',
      a: isVietnamese
        ? 'Có! Apexa hỗ trợ đồng bộ 2 chiều thời gian thực với Google Calendar để quản lý Deadline/Sprint, nhúng trực tiếp Live Prototype từ Figma và liên kết GitHub commit/Pull Request ngay tại thẻ Task để theo dõi tiến độ CI/CD tự động.'
        : 'Yes! Apexa provides 2-way real-time sync with Google Calendar for deadlines, live Figma prototype embedding, and GitHub Pull Request tracking directly inside task cards.',
      highlights: isVietnamese
        ? ['Google Calendar 2-Way Sync', 'Figma Live Prototype Embed', 'GitHub CI/CD Commit Tracking']
        : ['Google Calendar 2-Way Sync', 'Live Figma Prototype Embed', 'GitHub CI/CD Commit Tracking']
    },
    {
      id: 'faq-4',
      category: 'security' as const,
      categoryLabel: isVietnamese ? 'Bảo mật & Kiến trúc' : 'Security & Architecture',
      badgeColor: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      q: isVietnamese
        ? 'Apexa có thể sử dụng khi mất kết nối Internet (Offline / Local-First) không?'
        : 'Can Apexa work seamlessly when offline without internet connectivity?',
      a: isVietnamese
        ? 'Hoàn toàn có thể. Nhờ kiến trúc Local-First và bộ đệm IndexedDB tốc độ cao (độ trễ phản hồi chỉ 11.4ms), bạn vẫn có thể tạo task, chỉnh sửa tài liệu và ghi chú ngay cả khi mất mạng. Khi có kết nối trở lại, thuật toán Yjs CRDTs sẽ tự động đồng bộ ngầm lên Cloud mà không xảy ra xung đột ghi đè dữ liệu.'
        : 'Absolutely. Powered by Local-First architecture and IndexedDB caching (11.4ms response latency), you can create tasks and edit docs offline. Once reconnected, Yjs CRDTs seamlessly sync changes without data merge conflicts.',
      highlights: isVietnamese
        ? ['Độ trễ phản hồi 11.4ms tức thì', 'Làm việc ngoại tuyến không gián đoạn', 'Đồng bộ không xung đột Yjs CRDTs']
        : ['11.4ms instant local latency', 'Full offline uninterrupted work', 'Conflict-free Yjs CRDT sync']
    },
    {
      id: 'faq-5',
      category: 'security' as const,
      categoryLabel: isVietnamese ? 'Bảo mật & Kiến trúc' : 'Security & Architecture',
      badgeColor: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      q: isVietnamese
        ? 'Dữ liệu dự án và thông tin của công ty tôi được bảo mật như thế nào?'
        : 'How is our company data protected, isolated, and secured?',
      a: isVietnamese
        ? 'Apexa áp dụng mã hóa đầu cuối chuẩn Enterprise 256-bit TLS/HTTPS, phân quyền bảo mật cấp hàng (Row Level Security - RLS) cô lập dữ liệu tuyệt đối giữa các tổ chức. Đặc biệt, chúng tôi cam kết KHÔNG BAO GIỜ sử dụng dữ liệu dự án hoặc mã nguồn của khách hàng để huấn luyện các mô hình AI công khai.'
        : 'Apexa enforces Enterprise 256-bit TLS encryption, strict Row-Level Security (RLS) workspace isolation, and zero third-party AI training on your private organization data.',
      highlights: isVietnamese
        ? ['Mã hóa Enterprise 256-bit TLS', 'Row Level Security (RLS) cô lập', 'Cam kết không train AI trên dữ liệu khách hàng']
        : ['256-bit TLS Enterprise encryption', 'Strict Row-Level Security isolation', 'Zero AI model training on client data']
    },
    {
      id: 'faq-6',
      category: 'security' as const,
      categoryLabel: isVietnamese ? 'Bảo mật & Kiến trúc' : 'Security & Architecture',
      badgeColor: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      q: isVietnamese
        ? 'Apexa có nhận khóa Gemini API cá nhân (BYOK) không?'
        : 'Does Apexa accept personal Gemini API keys (BYOK)?',
      a: isVietnamese
        ? 'Không. Để bảo mật và kiểm soát chi phí nhất quán, Apexa chỉ dùng khóa nhà cung cấp được bảo vệ trên máy chủ. Toàn bộ công cụ Apexa AI được mở từ gói Starter và áp dụng hạn mức theo từng gói đăng ký.'
        : 'No. For consistent security and cost controls, Apexa uses only provider credentials protected on the server. All Apexa AI tools start with Starter and follow each plan’s monthly allowance.',
      highlights: isVietnamese
        ? ['Không nhận khóa cá nhân', 'Khóa chỉ nằm trên máy chủ', 'Hạn mức rõ ràng theo gói']
        : ['No personal keys', 'Server-only credentials', 'Clear plan-based allowances']
    },
    {
      id: 'faq-7',
      category: 'pricing' as const,
      categoryLabel: isVietnamese ? 'Bảng giá & Bản quyền' : 'Pricing & Billing',
      badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      q: isVietnamese
        ? 'Các gói Free, Starter, Pro và Enterprise khác nhau như thế nào?'
        : 'What are the key differences between Free, Starter, Pro, and Enterprise plans?',
      a: isVietnamese
        ? 'Gói Free dành cho cá nhân với 5 Spaces và không có AI. Starter mở toàn bộ Apexa AI với 150 lượt/tháng. Pro nâng hạn mức lên 2.000 lượt/tháng, đồng thời có CRM, ERP và báo cáo nâng cao. Business và Enterprise tăng hạn mức, thành viên và năng lực quản trị tổ chức.'
        : 'Free includes five Spaces without AI. Starter unlocks all Apexa AI tools with 150 monthly requests. Pro raises the allowance to 2,000 and adds CRM, ERP, and advanced reporting. Business and Enterprise expand AI allowance, seats, and organization controls.',
      highlights: isVietnamese
        ? ['Free không có AI', 'Starter mở toàn bộ AI', 'Hạn mức tăng theo từng gói']
        : ['No AI on Free', 'Starter unlocks all AI', 'Allowance scales by plan']
    },
    {
      id: 'faq-8',
      category: 'pricing' as const,
      categoryLabel: isVietnamese ? 'Bảng giá & Bản quyền' : 'Pricing & Billing',
      badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      q: isVietnamese
        ? 'Hình thức thanh toán ra sao và có hỗ trợ xuất hóa đơn VAT không?'
        : 'What payment methods are supported and can we get a VAT invoice?',
      a: isVietnamese
        ? 'Apexa tích hợp cổng thanh toán PayOS hỗ trợ quét mã VietQR tự động từ mọi ứng dụng ngân hàng, thẻ ATM nội địa và thẻ quốc tế Visa/Mastercard. Giao dịch được kích hoạt tức thì trong 5 giây và hỗ trợ xuất hóa đơn điện tử VAT hợp lệ đầy đủ cho doanh nghiệp.'
        : 'Apexa integrates with PayOS supporting VietQR instant scan from any banking app, domestic ATM, and Visa/Mastercard. Accounts activate in 5 seconds with full enterprise VAT invoicing.',
      highlights: isVietnamese
        ? ['Quét mã VietQR 5 giây', 'Hỗ trợ Visa / Mastercard / ATM', 'Xuất hóa đơn VAT doanh nghiệp']
        : ['Instant 5s VietQR scan', 'Visa / Mastercard / Local cards', 'Enterprise VAT electronic invoicing']
    },
    {
      id: 'faq-9',
      category: 'pricing' as const,
      categoryLabel: isVietnamese ? 'Bảng giá & Bản quyền' : 'Pricing & Billing',
      badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      q: isVietnamese
        ? 'Tôi có thể nâng cấp, hạ cấp hoặc hủy gói bất kỳ lúc nào không?'
        : 'Can I upgrade, downgrade, or cancel our plan anytime?',
      a: isVietnamese
        ? 'Bạn hoàn toàn có thể chủ động nâng cấp, đổi gói hoặc hủy bất kỳ lúc nào trực tiếp trong trang Quản lý tài khoản. Không có bất kỳ cam kết hay điều khoản ràng buộc hợp đồng nào. Khi nâng cấp giữa kỳ, hệ thống sẽ tự động trừ chi phí theo tỷ lệ sử dụng thực tế (proration) chính xác đến từng ngày.'
        : 'You can upgrade, downgrade, or cancel anytime directly in your workspace settings. There are no lock-in contracts, and mid-cycle upgrades are automatically prorated by day.',
      highlights: isVietnamese
        ? ['Không ràng buộc hợp đồng', 'Tự động tính chi phí theo ngày (Proration)', 'Hủy gói linh hoạt 1-Click']
        : ['Zero lock-in contracts', 'Daily proration billing', '1-Click flexible cancellation']
    }
  ], [isVietnamese]);

  const filteredFaqs = useMemo(() => {
    return faqs.filter(faq => {
      const matchCategory = faqCategory === 'all' || faq.category === faqCategory;
      const matchSearch = !faqSearch.trim() ||
        faq.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
        faq.a.toLowerCase().includes(faqSearch.toLowerCase()) ||
        (faq.highlights && faq.highlights.some(h => h.toLowerCase().includes(faqSearch.toLowerCase())));
      return matchCategory && matchSearch;
    });
  }, [faqs, faqCategory, faqSearch]);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/billing/plans', { cache: 'no-store' })
      .then(async response => response.ok ? response.json() : Promise.reject(new Error('Pricing unavailable')))
      .then(body => { if (active) setBillingPrices(body.prices || {}); })
      .catch(() => { if (active) setBillingPrices({}); });
    return () => { active = false; };
  }, []);

  const formatPrice = (planId: string) => {
    if (planId === 'free') {
      return {
        value: isVietnamese ? '0 ₫' : '$0',
        suffix: isVietnamese ? '/ tài khoản' : '/ account',
        billingDetail: isVietnamese ? 'Miễn phí trọn đời' : 'Free forever'
      };
    }
    if (planId === 'enterprise') {
      return {
        value: isVietnamese ? 'Liên hệ' : 'Custom',
        suffix: isVietnamese ? '/ tùy biến SLA' : '/ tailored SLA',
        billingDetail: isVietnamese ? 'Báo giá theo quy mô & SLA' : 'Custom quote & onboarding'
      };
    }
    const paidPlan = planId as SelfServeBillingPlan;
    const price = billingPrices[paidPlan]?.[billingCycle];
    const unitAmount = price?.unit_amount ?? SUGGESTED_PRICES[paidPlan][billingCycle];
    const monthlyAmount = unitAmount / (billingCycle === 'yearly' ? 12 * (price?.interval_count || 1) : (price?.interval_count || 1));
    const currency = price?.currency || 'vnd';
    const divisor = ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase()) ? 1 : 100;
    const formattedMonthly = new Intl.NumberFormat(isVietnamese ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0
    }).format(monthlyAmount / divisor);

    const formattedTotalYearly = new Intl.NumberFormat(isVietnamese ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0
    }).format(unitAmount / divisor);

    return {
      value: formattedMonthly,
      suffix: isVietnamese ? '/ người / tháng' : '/ user / month',
      billingDetail: billingCycle === 'yearly'
        ? (isVietnamese ? `${formattedTotalYearly}/năm (tiết kiệm 21%)` : `${formattedTotalYearly}/yr (billed annually)`)
        : (isVietnamese ? 'Thanh toán hàng tháng' : 'Billed monthly')
    };
  };

  const proMonthly = billingPrices.pro?.monthly?.unit_amount ?? SUGGESTED_PRICES.pro.monthly;
  const proYearly = billingPrices.pro?.yearly?.unit_amount ?? SUGGESTED_PRICES.pro.yearly;
  const yearlySaving = Math.max(0, Math.round((1 - proYearly / (proMonthly * 12)) * 100));

  const startPlan = (planId: string) => {
    if (planId === 'enterprise') {
      window.location.assign(`mailto:contact@apexa.vn?subject=${encodeURIComponent('Apexa Enterprise consultation')}`);
      return;
    }
    if (planId !== 'free') {
      localStorage.setItem('apexa_pending_upgrade_cycle', billingCycle);
      localStorage.setItem('apexa_pending_upgrade_plan', planId);
    }
    onSignUp();
  };

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredFeatures = features.filter(f => activeCategory === 'all' || f.category === activeCategory);

  const handlePrevTestimonial = () => {
    setActiveTestimonial(prev => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const handleNextTestimonial = () => {
    setActiveTestimonial(prev => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  const doubledLogos = [...PLATFORM_CAPABILITIES, ...PLATFORM_CAPABILITIES, ...PLATFORM_CAPABILITIES, ...PLATFORM_CAPABILITIES];
  const doubledCapabilityItems = [...PLATFORM_CAPABILITIES_LIST, ...PLATFORM_CAPABILITIES_LIST, ...PLATFORM_CAPABILITIES_LIST];

  return (
    <div ref={containerRef} className="relative w-full overflow-x-clip bg-[#fafbfc] dark:bg-[#07090e] transition-colors duration-300 font-sans text-slate-800 dark:text-slate-100 selection:bg-blue-500 selection:text-white">
      
      {/* Dynamic Ambient Mouse Spotlight */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-50 dark:opacity-75 transition-opacity duration-300"
        style={{
          background: `radial-gradient(850px circle at ${mousePos.x}% ${mousePos.y}%, rgba(59, 130, 246, 0.16), transparent 70%)`
        }}
      />
      
      {/* High-Tech Dotted Matrix Pattern Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-40 dark:opacity-20"
        style={{
          backgroundImage: `radial-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse 70% 55% at 50% 35%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 55% at 50% 35%, black 30%, transparent 100%)'
        }}
      />

      {/* Atmospheric Floating Aurora Orbs */}
      <motion.div
        animate={{
          x: [0, 50, -40, 0],
          y: [0, -60, 30, 0],
          scale: [1, 1.12, 0.95, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-[-10%] left-[-10%] w-[700px] h-[700px] bg-gradient-to-tr from-blue-600/20 via-indigo-500/15 to-transparent rounded-full blur-[140px] pointer-events-none z-0"
      />
      <motion.div
        animate={{
          x: [0, -40, 50, 0],
          y: [0, 50, -40, 0],
          scale: [1, 0.92, 1.1, 1],
        }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        className="fixed bottom-[10%] right-[-10%] w-[650px] h-[650px] bg-gradient-to-br from-indigo-600/20 via-sky-500/15 to-transparent rounded-full blur-[130px] pointer-events-none z-0"
      />
      <motion.div
        animate={{
          x: [0, 30, -30, 0],
          y: [0, 40, -30, 0],
          scale: [1, 1.08, 0.92, 1],
        }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-[40%] right-[20%] w-[450px] h-[450px] bg-gradient-to-bl from-cyan-500/10 via-teal-500/10 to-transparent rounded-full blur-[120px] pointer-events-none z-0"
      />

      {/* TOP NOTIFICATION MARQUEE BANNER */}
      <div className="relative z-50 overflow-hidden border-b border-white/10 bg-[#06080d]/95 backdrop-blur-md py-2.5 sm:py-3 select-none group/marquee">
        {/* Left & Right Smooth Edge Fade Overlays */}
        <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-28 bg-gradient-to-r from-[#06080d] via-[#06080d]/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-28 bg-gradient-to-l from-[#06080d] via-[#06080d]/80 to-transparent z-10 pointer-events-none" />

        {/* Marquee Inner Track */}
        <div className="animate-marquee flex items-center gap-10 sm:gap-14">
          {[...announcementItems, ...announcementItems].map((item, index) => (
            <div key={`${item.id}-${index}`} className="flex items-center gap-3 sm:gap-3.5 shrink-0 text-[13px] sm:text-[14px] text-white">
              <Badge variant={item.badgeVariant} dot size="md" className="shrink-0 font-black text-xs px-2.5 py-0.5">
                {item.badge}
              </Badge>
              <span className="text-slate-200 font-medium tracking-tight">
                {item.text}
              </span>
              <button
                onClick={item.action}
                className="text-sky-400 hover:text-sky-300 font-bold underline cursor-pointer inline-flex items-center gap-1.5 shrink-0 ml-1 transition-colors group-hover/marquee:underline-offset-4"
              >
                <span>{item.cta}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
              <span className="text-slate-600 mx-3 text-sm font-light">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* FLOATING ISLAND HEADER NAVBAR (STICKY SHOTS STYLE) */}
      <header className="sticky top-2 sm:top-3.5 z-50 mx-auto max-w-6xl px-3 sm:px-4 pointer-events-none transition-all">
        <div className="shots-dock pointer-events-auto flex items-center justify-between px-3 py-2.5 sm:px-4 transition-all shadow-xl">
          
          {/* Brand Logo */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer select-none group pr-2" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <ApexaLogoIcon className="w-7.5 h-7.5 group-hover:scale-105 transition-transform duration-200" />
            <span className="font-display font-black text-[21px] tracking-tight text-slate-900 dark:text-white">
              Apexa
            </span>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: isVietnamese ? 'Sản phẩm' : 'Product', id: 'features' },
              { label: isVietnamese ? 'Giải pháp' : 'Solutions', id: 'how-it-works' },
              { label: isVietnamese ? 'Bảng giá' : 'Pricing', id: 'pricing' },
              { label: isVietnamese ? 'Tài nguyên' : 'Resources', id: 'faq' },
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="px-4 py-2 text-[14.5px] font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-full transition-all cursor-pointer tracking-[-0.01em]"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageSwitch size="sm" />
            <ThemeSwitch size="sm" />
            <div className="hidden sm:block">
              <Button variant="ghost" size="sm" pill onClick={onSignIn} className="text-[13.5px] font-semibold">
                {isVietnamese ? 'Đăng nhập' : 'Sign in'}
              </Button>
            </div>
            <div className="hidden sm:block">
              <Button variant="shots" size="sm" pill onClick={onSignUp} rightIcon={<ArrowRight className="w-3.5 h-3.5" />} className="text-[13.5px] font-bold shadow-md shadow-indigo-500/20">
                {isVietnamese ? 'Bắt đầu miễn phí' : 'Get Started Free'}
              </Button>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-800 dark:text-white cursor-pointer"
              aria-label={isVietnamese ? 'Mở menu' : 'Toggle menu'}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden pointer-events-auto mt-2 p-4 shots-glass-card rounded-3xl space-y-2 select-none text-left shadow-2xl"
          >
            {[
              { id: 'features', label: isVietnamese ? 'Sản phẩm' : 'Product' },
              { id: 'how-it-works', label: isVietnamese ? 'Giải pháp' : 'Solutions' },
              { id: 'pricing', label: isVietnamese ? 'Bảng giá' : 'Pricing' },
              { id: 'faq', label: isVietnamese ? 'Tài nguyên' : 'Resources' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  scrollTo(item.id);
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-2.5 text-[15px] font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
              >
                {item.label}
              </button>
            ))}
            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
              <LanguageSwitch size="sm" />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" pill onClick={onSignIn} className="text-[13.5px] font-semibold">
                  {isVietnamese ? 'Đăng nhập' : 'Sign in'}
                </Button>
                <Button variant="shots" size="sm" pill onClick={onSignUp} className="text-[13.5px] font-bold">
                  {isVietnamese ? 'Dùng thử' : 'Get Started'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </header>

      {/* =========================================================================
          HERO SECTION (SHOTS.SO AESTHETIC)
          ========================================================================= */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 pt-12 sm:pt-16 pb-16 lg:pb-24 text-center">
        <GsapStaggerReveal yOffset={25} stagger={0.1}>

        {/* Hero Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-[76px] font-black tracking-[-0.035em] text-slate-950 dark:text-white font-display max-w-6xl mx-auto"
        >
          <div className="flex flex-col gap-2 sm:gap-3.5 lg:gap-4 leading-[1.2] sm:leading-[1.16] lg:leading-[1.14]">
            <span className="block">
              {isVietnamese ? 'Vận hành thông minh.' : 'Work smarter.'}
            </span>
            <div className="inline-flex items-center justify-center flex-wrap sm:flex-nowrap gap-x-2.5 sm:gap-x-3.5">
              <span className="relative inline-flex items-center justify-center overflow-hidden py-2 sm:py-4 -my-2 sm:-my-4 text-center">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`${isVietnamese ? 'vi' : 'en'}-${phraseIndex}`}
                    initial={{ y: 32, opacity: 0, filter: 'blur(6px)' }}
                    animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                    exit={{ y: -32, opacity: 0, filter: 'blur(6px)' }}
                    transition={{
                      type: 'spring',
                      stiffness: 450,
                      damping: 30,
                      mass: 0.8,
                    }}
                    className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 dark:from-blue-400 dark:via-sky-300 dark:to-cyan-300 whitespace-nowrap inline-block font-black pb-2 sm:pb-3 pt-1 px-1"
                  >
                    {heroPhrases[phraseIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="text-slate-950 dark:text-white whitespace-nowrap">
                {isVietnamese ? 'cùng AI.' : 'with AI.'}
              </span>
            </div>
          </div>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="text-slate-600 dark:text-slate-300 text-sm sm:text-base lg:text-[18px] font-normal leading-[1.7] sm:leading-[1.75] max-w-3xl mx-auto mt-6 sm:mt-8 text-pretty"
        >
          {isVietnamese
            ? 'Không gian làm việc số hợp nhất Quản lý dự án, Smart Docs, Thảo luận đội ngũ và Trợ lý AI chuyên sâu. Tối ưu tốc độ thực thi, xóa bỏ phân mảnh ứng dụng và vận hành mượt mà không độ trễ.'
            : 'The next-gen all-in-one productivity workspace unifying Projects, Smart Docs, Team Chat, and AI Intelligence. Supercharge execution velocity and eliminate tool fragmentation with zero latency.'}
        </motion.p>

        {/* CTA Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-8 sm:mt-10"
        >
          <GsapMagneticButton
            strength={0.3}
            glowSweep={true}
            onClick={onSignUp}
            className="group flex h-13 items-center justify-center gap-3 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-7 py-3.5 text-base font-extrabold shadow-[0_10px_30px_rgba(15,23,42,0.22)] dark:shadow-[0_10px_30px_rgba(255,255,255,0.18)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>{isVietnamese ? 'Bắt đầu trải nghiệm miễn phí' : 'Start for Free Today'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </GsapMagneticButton>

          <Button
            variant="glass"
            size="huge"
            pill
            onClick={() => scrollTo('features')}
            leftIcon={<Play className="w-4 h-4 text-indigo-600 dark:text-sky-400 fill-current" />}
            className="border border-slate-200/80 dark:border-white/15 bg-white/70 dark:bg-white/5 backdrop-blur-xl hover:bg-white dark:hover:bg-white/10 text-slate-800 dark:text-white shadow-sm"
          >
            {isVietnamese ? 'Khám phá tính năng' : 'Explore Features'}
          </Button>
        </motion.div>

        {/* Social Proof Trust Avatar Stack & Rating */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-6 mt-9 sm:mt-11"
        >
          {/* Avatar stack */}
          <div className="flex items-center -space-x-2.5">
            {[
              { name: 'Alex K.', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' },
              { name: 'Minh T.', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80' },
              { name: 'Sarah L.', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80' },
              { name: 'David R.', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80' },
              { name: 'Linh N.', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80' },
            ].map((avatar, idx) => (
              <div
                key={idx}
                className="relative w-8 h-8 rounded-full ring-2 ring-white dark:ring-slate-900 overflow-hidden shadow-xs shrink-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatar.img}
                  alt={avatar.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>

          {/* Stars & Trust text */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2.5 text-center sm:text-left">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 ml-1">5.0</span>
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {isVietnamese ? (
                <>
                  Được tin dùng bởi hơn <span className="font-extrabold text-slate-900 dark:text-white">10.000+</span> nhà sáng lập & đội ngũ hiện đại
                </>
              ) : (
                <>
                  Trusted by <span className="font-extrabold text-slate-900 dark:text-white">10,000+</span> founders & high-velocity teams
                </>
              )}
            </p>
          </div>
        </motion.div>

        </GsapStaggerReveal>

        {/* Realistic In-App Workspace Showcase with 3D Tilt */}
        <div className="mt-12 sm:mt-16 max-w-6xl mx-auto">
          <GsapCard3DTilt maxTilt={2.5} scale={1.005} glare={false}>
            <ApexaWorkspaceShowcase onSignUp={onSignUp} />
          </GsapCard3DTilt>
        </div>

      </section>

      {/* =========================================================================
          MARQUEE CAPABILITY ECOSYSTEM STRIP
          ========================================================================= */}
      <section className="relative z-10 border-y border-slate-200/70 dark:border-white/10 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md py-5 sm:py-6 overflow-hidden select-none">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <div className="flex items-center justify-center gap-2 mb-3.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-center text-[10px] sm:text-[10.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              {isVietnamese ? 'Hệ sinh thái phân hệ hợp nhất toàn bộ quy trình vận hành' : 'All-in-one unified operating flow ecosystem'}
            </p>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          </div>

          <div className="overflow-hidden w-full relative py-0.5 group/marquee">
            {/* Left/Right Vignette Fades */}
            <div className="absolute inset-y-0 left-0 w-20 sm:w-32 bg-gradient-to-r from-[#fafbfc] dark:from-[#07090e] to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-20 sm:w-32 bg-gradient-to-l from-[#fafbfc] dark:from-[#07090e] to-transparent z-10 pointer-events-none" />
            
            <motion.div
              animate={{ x: [0, -1600] }}
              transition={{ ease: "linear", duration: 38, repeat: Infinity }}
              className="flex gap-3.5 sm:gap-4 w-max whitespace-nowrap px-4 group-hover/marquee:[animation-play-state:paused]"
            >
              {doubledCapabilityItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/70 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.08] border border-slate-200/70 dark:border-white/[0.08] shadow-2xs hover:shadow-sm hover:border-indigo-400 dark:hover:border-indigo-500/40 transition-all cursor-pointer group/item"
                  >
                    <div className={`w-6 h-6 rounded-lg ${item.bg} ${item.border} border ${item.color} flex items-center justify-center shadow-2xs group-hover/item:scale-105 transition-transform`}>
                      {item.name.includes('Apexa Brain') ? (
                        <ApexaAiIcon className="w-3.5 h-3.5" variant="gradient" />
                      ) : (
                        <Icon className="w-3 h-3" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover/item:text-indigo-600 dark:group-hover/item:white transition-colors">
                      {isVietnamese ? item.nameVi : item.name}
                    </span>
                    {item.badge && (
                      <span className="text-[8.5px] font-black uppercase px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25">
                        {item.badge}
                      </span>
                    )}
                  </div>
                );
              })}
            </motion.div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          STATS SUMMARY COUNTER CARDS (CLEAN, COMPACT, HIGH-CONVERTING)
          ========================================================================= */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-10 sm:py-14 lg:py-16">
        <FadeInSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              {
                value: 12,
                prefix: '< ',
                suffix: 'ms',
                title: isVietnamese ? 'Đồng bộ Local-First' : 'Local-First Latency',
                subtitle: isVietnamese ? 'Tức thì trên IndexedDB, tự động sync khi online.' : 'Instant local mutations, auto-synced on reconnect.',
                badge: isVietnamese ? '10x Tốc độ' : '10x Faster',
                badgeIcon: Zap,
                badgeColor: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/25',
                icon: Cpu,
                iconGrad: 'from-sky-500 to-blue-600',
                highlight: isVietnamese ? 'Thực tế: 11.4ms' : 'Benchmarked: 11.4ms',
              },
              {
                value: 45,
                prefix: '+',
                suffix: '%',
                title: isVietnamese ? 'Tốc độ bàn giao Sprint' : 'Sprint Velocity Boost',
                subtitle: isVietnamese ? 'Tự động phân rã task & PRD với Gemini AI Copilot.' : 'Auto-decompose tasks & PRDs with Gemini AI.',
                badge: isVietnamese ? 'Vượt tiến độ' : 'High Velocity',
                badgeIcon: TrendingUp,
                badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
                icon: TrendingUp,
                iconGrad: 'from-emerald-500 to-teal-600',
                highlight: isVietnamese ? 'Tiết kiệm ~15h/tuần' : 'Saves ~15h/week',
              },
              {
                value: 18,
                prefix: '',
                suffix: '+',
                title: isVietnamese ? 'Phân hệ hợp nhất' : 'Integrated Work Modules',
                subtitle: isVietnamese ? 'Tasks, Docs, Chat, CRM, ERP, Tài chính trên 1 Canvas.' : 'Tasks, Docs, Chat, CRM, ERP & Finance in 1 Canvas.',
                badge: isVietnamese ? 'All-in-One' : 'All-in-One',
                badgeIcon: LayoutGrid,
                badgeColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/25',
                icon: LayoutGrid,
                iconGrad: 'from-indigo-600 to-purple-600',
                highlight: isVietnamese ? '01 Nền tảng duy nhất' : 'Single Unified Canvas',
              },
              {
                value: 75,
                prefix: '',
                suffix: '%',
                title: isVietnamese ? 'Tiết kiệm chi phí SaaS' : 'SaaS Cost Savings',
                subtitle: isVietnamese ? 'Thay thế chi phí riêng cho Jira, Notion, Slack & Miro.' : 'Replace subscriptions for Jira, Notion, Slack & Miro.',
                badge: isVietnamese ? 'Tối ưu ROI' : 'High ROI',
                badgeIcon: DollarSign,
                badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
                icon: DollarSign,
                iconGrad: 'from-amber-500 to-orange-600',
                highlight: isVietnamese ? 'Cắt giảm 5 phần mềm' : 'Cut 5 redundant tools',
              },
            ].map((stat, i) => {
              const BadgeIcon = stat.badgeIcon;
              return (
                <div
                  key={i}
                  className="group relative rounded-2xl sm:rounded-3xl p-5 sm:p-6 bg-white/80 dark:bg-[#0c101b]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:shadow-xl hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  {/* Top Row: Icon & Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.iconGrad} text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200`}>
                      <stat.icon className="w-4 h-4" />
                    </div>
                    <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${stat.badgeColor}`}>
                      <BadgeIcon className="w-2.5 h-2.5" />
                      <span>{stat.badge}</span>
                    </div>
                  </div>

                  {/* Metric Number & Titles */}
                  <div className="space-y-1">
                    <div className="text-3xl sm:text-3xl lg:text-[34px] font-black text-slate-900 dark:text-white font-display tracking-tight leading-none">
                      <AnimatedCounter
                        value={stat.value}
                        prefix={stat.prefix}
                        suffix={stat.suffix}
                        decimals={0}
                      />
                    </div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-tight pt-0.5">
                      {stat.title}
                    </h4>
                    <p className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                      {stat.subtitle}
                    </p>
                  </div>

                  {/* Bottom Highlight Micro-Tag */}
                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10.5px] font-bold text-slate-400">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors" />
                      {stat.highlight}
                    </span>
                    <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      →
                    </span>
                  </div>

                </div>
              );
            })}
          </div>
        </FadeInSection>
      </section>

      {/* =========================================================================
          FEATURE SHOWCASE (MODERN INTERACTIVE BENTO GRID)
          ========================================================================= */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-white/10">
        <FadeInSection>
          <div className="text-center space-y-3.5 max-w-4xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-950 dark:text-white font-display text-balance leading-[1.15]">
              {isVietnamese ? (
                <>
                  Mọi công cụ vận hành trên một{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-blue-400 dark:via-sky-300 dark:to-indigo-300">
                    Continuous Canvas
                  </span>
                </>
              ) : (
                <>
                  Every operating tool on one unified{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-blue-400 dark:via-sky-300 dark:to-indigo-300">
                    Continuous Canvas
                  </span>
                </>
              )}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed text-pretty">
              {isVietnamese
                ? 'Thay thế 5+ công cụ rời rạc (Jira, Notion, Slack, Miro, Asana). Apexa tích hợp toàn diện và đồng bộ tức thì từng byte dữ liệu.'
                : 'Replace 5+ fragmented apps (Jira, Notion, Slack, Miro, Asana). Apexa unifies all workflows with zero-latency sync.'}
            </p>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap justify-center gap-2 pt-4">
              {categories.map(cat => {
                const CatIcon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-md scale-102 ring-2 ring-indigo-500/30'
                        : 'bg-white/80 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200/70 dark:border-white/[0.08]'
                    }`}
                  >
                    {cat.id === 'ai' ? (
                      <ApexaAiIcon className="w-3.5 h-3.5" variant={isActive ? 'white' : 'gradient'} />
                    ) : (
                      <CatIcon className="w-3.5 h-3.5" />
                    )}
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredFeatures.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  onClick={onSignUp}
                  className={`group relative rounded-2xl sm:rounded-3xl p-5 sm:p-6 bg-white/80 dark:bg-[#0c101b]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:shadow-xl hover:border-indigo-400/50 dark:hover:border-indigo-500/40 transition-all duration-300 flex flex-col justify-between cursor-pointer overflow-hidden ${
                    feat.featured ? 'ring-1 ring-indigo-500/30' : ''
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Icon Squircle & Tag */}
                    <div className="flex items-center justify-between">
                      <div className={`w-10 h-10 rounded-xl ${feat.bg} flex items-center justify-center ${feat.iconColor} border border-white/10 group-hover:scale-105 transition-transform shadow-2xs`}>
                        {feat.title.includes('Apexa Brain') ? (
                          <ApexaAiIcon className="w-4 h-4" variant="gradient" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <Badge variant={feat.tagVariant} size="sm">
                        {feat.badge}
                      </Badge>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-sky-400 transition-colors">
                        {feat.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed pt-1 line-clamp-3">
                        {feat.desc}
                      </p>
                    </div>

                    {/* Embedded Live Micro-Visual Widget */}
                    <FeatureCardVisual type={feat.visualType} isVietnamese={isVietnamese} />
                  </div>

                  {/* Bottom Action Link */}
                  <div className="pt-3 mt-1 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-black text-indigo-600 dark:text-sky-400 group-hover:text-indigo-700 dark:group-hover:text-sky-300">
                    <span>{isVietnamese ? 'Khám phá tính năng' : 'Explore feature'}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </FadeInSection>
      </section>

      {/* =========================================================================
          COMPARISON MATRIX (APEXA VS TRADITIONAL STACK)
          ========================================================================= */}
      <section id="comparison" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-white/10">
        {/* Ambient Subtle Section Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[300px] bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-sky-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
        
        <FadeInSection>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end mb-12 lg:mb-14 text-left">
            <div className="lg:col-span-8 space-y-3">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950 dark:text-white font-display leading-[1.18] text-balance">
                {isVietnamese ? (
                  <>
                    Tại sao các đội ngũ công nghệ chuyển sang{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-sky-400 dark:via-indigo-300 dark:to-cyan-300">
                      Apexa?
                    </span>
                  </>
                ) : (
                  <>
                    Why high-velocity teams choose{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-sky-400 dark:via-indigo-300 dark:to-cyan-300">
                      Apexa
                    </span>
                  </>
                )}
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-2xl text-pretty">
                {isVietnamese
                  ? 'So sánh sự khác biệt vượt trội giữa kiến trúc Local-First & AI Native của Apexa với bộ công cụ truyền thống rời rạc (Jira, Notion, Slack).'
                  : 'See the structural advantage of a unified, Local-First, AI-Native platform over legacy fragmented SaaS stacks.'}
              </p>
            </div>

            {/* Quick Proof Pills */}
            <div className="lg:col-span-4 flex flex-wrap lg:justify-end gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20 text-xs font-black shadow-2xs">
                <Zap className="w-3.5 h-3.5" />
                <span>11.4ms Local Sync</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-black shadow-2xs">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{isVietnamese ? 'Tiết kiệm 5x chi phí' : '5x Cost Savings'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-black shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Enterprise Privacy</span>
              </span>
            </div>
          </div>

          <ComparisonMatrix onSignUp={onSignUp} />
        </FadeInSection>
      </section>

      {/* =========================================================================
          INTERACTIVE ROI & TIME SAVINGS CALCULATOR
          ========================================================================= */}
      <section id="roi" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-white/10">
        <FadeInSection>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end mb-12 lg:mb-14 text-left">
            <div className="lg:col-span-8 space-y-3">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950 dark:text-white font-display leading-[1.18] text-balance">
                {isVietnamese ? (
                  <>
                    Đo lường thời gian &{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-300">
                      chi phí tiết kiệm thực tế
                    </span>
                  </>
                ) : (
                  <>
                    Quantify your time and{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-300">
                      measurable cost savings
                    </span>
                  </>
                )}
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-2xl text-pretty">
                {isVietnamese
                  ? 'Không chỉ là cảm giác nhanh hơn — Apexa mang lại hiệu quả đầu tư rõ ràng bằng con số định lượng thực tế cho từng quy mô nhân sự.'
                  : 'Not just a subjective feel—Apexa delivers concrete, measurable productivity returns for your business.'}
              </p>
            </div>

            {/* Live KPI Floating Mini Card */}
            <div className="lg:col-span-4 flex lg:justify-end">
              <div className="shots-glass-card rounded-2xl p-4 border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    +4.8h / {isVietnamese ? 'tuần / nhân sự' : 'week / member'}
                  </div>
                  <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    {isVietnamese ? 'ROI trung bình 340% sau 3 tháng' : '340% average ROI in 90 days'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <RoiCalculator onSignUp={onSignUp} />
        </FadeInSection>
      </section>

      {/* =========================================================================
          WORKFLOW PROCESS (4 STEPS CONNECTED TIMELINE)
          ========================================================================= */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-white/10">
        <FadeInSection>
          <div className="text-center space-y-3.5 max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-950 dark:text-white font-display text-balance leading-[1.15]">
              {isVietnamese ? (
                <>
                  Triển khai & Vận hành trơn tru{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-sky-400 dark:via-indigo-300 dark:to-cyan-300">
                    chỉ với 4 bước
                  </span>
                </>
              ) : (
                <>
                  Deploy & Scale your team in{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-sky-400 dark:via-indigo-300 dark:to-cyan-300">
                    4 simple steps
                  </span>
                </>
              )}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium leading-relaxed text-pretty max-w-2xl mx-auto">
              {isVietnamese
                ? 'Khởi tạo không gian làm việc chuyên nghiệp, đồng bộ toàn bộ nhân sự và tăng tốc vận hành chỉ trong 1 buổi làm việc.'
                : 'Set up departmental spaces, align your entire team, and accelerate sprint delivery in under a day.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 relative">
            {workflowSteps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 1, y: 0 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.08 }}
                  className="h-full"
                >
                  <GsapCard3DTilt maxTilt={3} scale={1.01} glare={false} className="h-full">
                    <div className="h-full group relative rounded-2xl sm:rounded-3xl p-5 sm:p-6 bg-white/80 dark:bg-[#0c101b]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:shadow-xl hover:border-indigo-400/50 dark:hover:border-indigo-500/40 transition-all duration-300 flex flex-col justify-between overflow-hidden">
                      
                      <div className="space-y-3">
                        {/* Top Step Badge & Icon */}
                        <div className="flex items-center justify-between">
                          <span className={`text-2xl sm:text-3xl font-black bg-gradient-to-r ${step.grad} bg-clip-text text-transparent font-display tracking-tight`}>
                            {step.step}
                          </span>
                          <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${step.grad} text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform`}>
                            {step.step === '02' ? (
                              <ApexaAiIcon className="w-4 h-4" variant="white" />
                            ) : (
                              <StepIcon className="w-4 h-4" />
                            )}
                          </div>
                        </div>

                        {/* Title & Badge */}
                        <div>
                          <span className={`inline-block text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full border ${step.badgeColor} mb-1.5`}>
                            {step.badge}
                          </span>
                          <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-sky-400 transition-colors">
                            {step.title}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed pt-1">
                            {step.desc}
                          </p>
                        </div>

                        {/* Embedded Micro-Visual Step Preview */}
                        <WorkflowStepVisual step={step.step} isVietnamese={isVietnamese} />
                      </div>

                      {/* Step Indicator Dot Line */}
                      <div className="pt-3 mt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10.5px] font-bold text-slate-400">
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${step.grad}`} />
                          <span>{isVietnamese ? `Giai đoạn ${step.step}` : `Phase ${step.step}`}</span>
                        </span>
                        {idx < 3 ? (
                          <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                        ) : (
                          <span className="text-emerald-500 font-black">✓ Hoàn tất</span>
                        )}
                      </div>

                    </div>
                  </GsapCard3DTilt>
                </motion.div>
              );
            })}
          </div>
        </FadeInSection>
      </section>

      {/* =========================================================================
          PRICING PLANS (4-TIER ENTERPRISE SAAS PRICING)
          ========================================================================= */}
      <section id="pricing" className="relative z-10 max-w-7xl 2xl:max-w-[1400px] mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-white/10">
        {/* Ambient Subtle Section Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[350px] bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-sky-500/10 rounded-full blur-[150px] pointer-events-none -z-10" />
        
        <FadeInSection>
          <div className="text-center space-y-3.5 max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-950 dark:text-white font-display text-balance leading-[1.15]">
              {isVietnamese ? (
                <>
                  Đầu tư thông minh,{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-sky-400 dark:via-indigo-300 dark:to-cyan-300">
                    tối ưu ngân sách đội ngũ
                  </span>
                </>
              ) : (
                <>
                  Invest smart,{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-sky-400 dark:via-indigo-300 dark:to-cyan-300">
                    maximize team velocity
                  </span>
                </>
              )}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium leading-relaxed text-pretty max-w-2xl mx-auto">
              {isVietnamese
                ? 'Không chi phí ẩn. Nâng cấp hoặc hạ cấp gói bất cứ khi nào theo nhu cầu phát triển của đội ngũ.'
                : 'Zero hidden fees. Upgrade, downgrade, or cancel anytime as your team scales.'}
            </p>
          </div>

          {/* Billing Switcher */}
          <div className="pt-4 flex justify-center">
            <SegmentedControl
              size="md"
              value={billingCycle}
              onChange={(val) => setBillingCycle(val as 'monthly' | 'yearly')}
              layoutIdPrefix="shotsPricingBilling"
              options={[
                { id: 'monthly', label: isVietnamese ? 'Hàng tháng' : 'Monthly' },
                { id: 'yearly', label: isVietnamese ? 'Hàng năm' : 'Yearly', badge: yearlySaving > 0 ? (isVietnamese ? `Tiết kiệm ${yearlySaving}%` : `Save ${yearlySaving}%`) : undefined },
              ]}
            />
          </div>

          {/* 4 Spacious Enterprise Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch mt-10">
            {pricingPlans.map(plan => {
              const price = formatPrice(plan.id);
              const isHero = plan.highlight;
              const PlanIcon = plan.icon;

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-6 sm:p-7.5 flex flex-col justify-between text-left relative transition-all duration-300 ${
                    isHero
                      ? 'border-2 border-indigo-500 bg-gradient-to-b from-indigo-50/90 via-white to-purple-50/50 dark:from-indigo-950/70 dark:via-slate-900/90 dark:to-purple-950/50 shadow-2xl shadow-indigo-500/25 xl:scale-[1.035] z-10 hover:shadow-indigo-500/35'
                      : 'shots-glass-card hover:border-slate-300 dark:hover:border-white/20 hover:shadow-xl'
                  }`}
                >
                  <div className="space-y-5">
                    {/* Header Row: Icon + Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                        isHero
                          ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-indigo-500/30'
                          : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-white/10'
                      }`}>
                        <PlanIcon className="w-5 h-5" />
                      </div>

                      {isHero ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs shrink-0 whitespace-nowrap">
                          <Sparkles className="w-3 h-3 shrink-0" />
                          <span>{plan.badge}</span>
                        </div>
                      ) : (
                        <span className={`inline-block text-[10px] font-black uppercase px-2.5 py-1 rounded-full border shrink-0 whitespace-nowrap ${plan.badgeColor}`}>
                          {plan.badge}
                        </span>
                      )}
                    </div>

                    {/* Plan Name & Description */}
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-display">
                        {plan.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 leading-relaxed min-h-[38px] text-pretty">
                        {plan.desc}
                      </p>
                    </div>

                    {/* Price Section (Stacked & Spacious) */}
                    <div className="py-3 border-y border-slate-200/70 dark:border-white/10 space-y-1">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight font-display">
                          {price.value}
                        </span>
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-400">
                          {price.suffix}
                        </span>
                      </div>
                      <div className="text-[10.5px] font-extrabold text-indigo-600 dark:text-sky-400">
                        {price.billingDetail}
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="space-y-3 pt-2">
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {isVietnamese ? 'Quyền lợi nổi bật:' : 'Key Capabilities:'}
                      </div>
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                          <div className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Action Button */}
                  <Button
                    variant={isHero ? 'shots' : 'secondary'}
                    size="lg"
                    pill
                    fullWidth
                    onClick={() => startPlan(plan.id)}
                    className={`mt-8 font-black transition-all cursor-pointer ${
                      isHero
                        ? 'shadow-lg shadow-indigo-500/30 hover:scale-102 bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                        : 'hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <span>{plan.cta}</span>
                    <ArrowRight className="w-4 h-4 ml-1 inline group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Trust & Security Guarantee Bar */}
          <div className="mt-14 pt-8 border-t border-slate-200/60 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center gap-3.5 hover:shadow-xs transition-shadow">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white">
                  {isVietnamese ? 'Dùng thử 14 ngày' : '14-Day Free Trial'}
                </h4>
                <p className="text-[10.5px] font-medium text-slate-400">
                  {isVietnamese ? 'Trải nghiệm full tính năng' : 'Full access to all features'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center gap-3.5 hover:shadow-xs transition-shadow">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Zap className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white">
                  {isVietnamese ? 'Không cần thẻ tín dụng' : 'No Credit Card Required'}
                </h4>
                <p className="text-[10.5px] font-medium text-slate-400">
                  {isVietnamese ? 'Đăng ký trong 30 giây' : 'Get started in 30 seconds'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center gap-3.5 hover:shadow-xs transition-shadow">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white">
                  {isVietnamese ? 'Hủy gói linh hoạt' : 'Cancel Anytime'}
                </h4>
                <p className="text-[10.5px] font-medium text-slate-400">
                  {isVietnamese ? 'Không ràng buộc hợp đồng' : 'No lock-in contracts'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-center gap-3.5 hover:shadow-xs transition-shadow">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
                <Cpu className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white">
                  {isVietnamese ? 'Bảo mật 256-bit' : '256-bit Encryption'}
                </h4>
                <p className="text-[10.5px] font-medium text-slate-400">
                  {isVietnamese ? 'Mã hóa chuẩn Enterprise' : 'Enterprise grade security'}
                </p>
              </div>
            </div>
          </div>

        </FadeInSection>
      </section>

      {/* =========================================================================
          DEPLOYMENT SCENARIOS & DEPARTMENT USE CASES (INTERACTIVE SPLIT-SCREEN STAGE)
          ========================================================================= */}
      <section id="testimonials" className="relative z-10 max-w-7xl 2xl:max-w-[1400px] mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-white/10">
        <FadeInSection>
          <div className="text-center space-y-3.5 max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-950 dark:text-white font-display text-balance leading-[1.15]">
              {isVietnamese ? (
                <>
                  Apexa thích ứng theo cách{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-sky-400 dark:via-indigo-300 dark:to-cyan-300">
                    đội ngũ của bạn vận hành
                  </span>
                </>
              ) : (
                <>
                  Apexa adapts to how{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-sky-400 dark:via-indigo-300 dark:to-cyan-300">
                    your team operates
                  </span>
                </>
              )}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium leading-relaxed text-pretty max-w-2xl mx-auto">
              {isVietnamese
                ? 'Không ép buộc thay đổi thói quen. Tùy biến linh hoạt cho từng phòng ban từ Product, Marketing, Vận hành đến Design.'
                : 'Zero friction onboarding. Seamlessly customized workflows tailored for Product, Marketing, Ops, and Design.'}
            </p>

            {/* Department Quick Tabs */}
            <div className="pt-4 flex flex-wrap justify-center gap-2">
              {testimonials.map((dept, index) => {
                const isActive = activeTestimonial === index;
                const DeptIcon = dept.icon;
                return (
                  <button
                    key={dept.id}
                    onClick={() => setActiveTestimonial(index)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg scale-102 font-black ring-2 ring-indigo-500/50'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/10'
                    }`}
                  >
                    <DeptIcon className={`w-4 h-4 ${isActive ? 'text-indigo-400 dark:text-indigo-600' : 'text-slate-400'}`} />
                    <span>{dept.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Scenario Split-Screen Showcase Stage */}
          <div className="shots-glass-card rounded-3xl p-6 sm:p-8 lg:p-10 text-left shadow-2xl border border-slate-200/80 dark:border-white/10 relative overflow-hidden">
            {/* Top Glow Backdrop */}
            <div className={`absolute top-0 right-0 w-96 h-96 bg-gradient-to-br ${testimonials[activeTestimonial].gradient} opacity-15 blur-3xl pointer-events-none rounded-full`} />

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.28 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10"
              >
                {/* Left Column: Context, Value Proposition, Bullets & Quote (5 Cols) */}
                <div className="lg:col-span-5 space-y-5">
                  {/* KPI Metric + Modules */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-black uppercase px-3 py-1 rounded-full border ${testimonials[activeTestimonial].badgeColor} shadow-2xs`}>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{testimonials[activeTestimonial].metric}</span>
                    </span>

                    <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {testimonials[activeTestimonial].modules.slice(0, 2).map((mod, i) => (
                        <span key={i} className="bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-white/10">
                          {mod}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Headline */}
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug font-display">
                    {testimonials[activeTestimonial].headline}
                  </h3>

                  {/* Quote */}
                  <div className="relative pl-4 border-l-2 border-indigo-500/40 py-1">
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed italic">
                      &ldquo;{testimonials[activeTestimonial].quote}&rdquo;
                    </p>
                  </div>

                  {/* 3 Key Workflow Bullets */}
                  <div className="space-y-2.5 pt-1">
                    {testimonials[activeTestimonial].bullets.map((bullet, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                        <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>

                  {/* Signature Row & Action CTA */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200/60 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${testimonials[activeTestimonial].gradient} text-white font-black text-xs flex items-center justify-center shadow-md shrink-0`}>
                        {testimonials[activeTestimonial].avatar}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                          {testimonials[activeTestimonial].author}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {testimonials[activeTestimonial].role} · <span className="font-bold text-slate-700 dark:text-slate-300">{testimonials[activeTestimonial].company}</span>
                        </p>
                      </div>
                    </div>

                    {/* Scenario CTA & Arrows */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="shots"
                        size="sm"
                        pill
                        onClick={onSignUp}
                        className="font-extrabold text-xs shadow-md shadow-indigo-500/20"
                      >
                        <span>{isVietnamese ? 'Dùng thử ngay' : 'Try this workflow'}</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1 inline" />
                      </Button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={handlePrevTestimonial}
                          className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
                          aria-label={isVietnamese ? 'Kịch bản trước' : 'Previous scenario'}
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={handleNextTestimonial}
                          className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
                          aria-label={isVietnamese ? 'Kịch bản tiếp theo' : 'Next scenario'}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Interactive Department Simulation Visual (7 Cols) */}
                <div className="lg:col-span-7">
                  <DepartmentScenarioVisual id={testimonials[activeTestimonial].id} isVietnamese={isVietnamese} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 4 Department Mini Preview Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-6">
            {testimonials.map((dept, idx) => {
              const isActive = activeTestimonial === idx;
              const DeptIcon = dept.icon;
              return (
                <button
                  key={dept.id}
                  onClick={() => setActiveTestimonial(idx)}
                  className={`p-4 rounded-2xl text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-800/95 border-2 border-indigo-500 shadow-lg scale-[1.02]'
                      : 'bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${dept.gradient} text-white flex items-center justify-center shadow-2xs`}>
                      <DeptIcon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black text-indigo-600 dark:text-sky-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                      {dept.avatar}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                    {dept.title}
                  </h4>
                  <p className="text-[10.5px] font-bold text-slate-400 truncate pt-0.5">
                    {dept.metric}
                  </p>
                </button>
              );
            })}
          </div>

        </FadeInSection>
      </section>

      {/* =========================================================================
          FAQ ACCORDION & KNOWLEDGE HUB (INTERACTIVE 2-COLUMN HUB)
          ========================================================================= */}
      <section id="faq" className="relative z-10 max-w-7xl 2xl:max-w-[1400px] mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-white/10 text-left">
        <FadeInSection>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* Left Column: Heading, Category Tabs & Direct Support Card (4/12 cols) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="space-y-3">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950 dark:text-white font-display leading-[1.18]">
                  {isVietnamese ? (
                    <>
                      Giải đáp mọi{' '}
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-sky-400 dark:via-indigo-300 dark:to-cyan-300">
                        thắc mắc của bạn
                      </span>
                    </>
                  ) : (
                    <>
                      Everything you{' '}
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-sky-400 dark:via-indigo-300 dark:to-cyan-300">
                        need to know
                      </span>
                    </>
                  )}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed text-pretty">
                  {isVietnamese
                    ? 'Tìm hiểu chi tiết về kiến trúc Local-First, sức mạnh AI Copilot, bảo mật dữ liệu và các gói dịch vụ của Apexa.'
                    : 'Explore deep insights into Local-First architecture, AI Copilot, data security, and flexible pricing.'}
                </p>
              </div>

              {/* Interactive Category Filter Pills */}
              <div className="space-y-1.5 pt-2">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  {isVietnamese ? 'Danh mục chủ đề:' : 'Browse by topic:'}
                </div>
                {[
                  { id: 'all' as const, label: isVietnamese ? '🌟 Tất cả câu hỏi' : '🌟 All Questions', count: faqs.length },
                  { id: 'features' as const, label: isVietnamese ? '⚡ Tính năng & AI' : '⚡ Features & AI', count: faqs.filter(f => f.category === 'features').length },
                  { id: 'security' as const, label: isVietnamese ? '🔒 Bảo mật & Kiến trúc' : '🔒 Security & Architecture', count: faqs.filter(f => f.category === 'security').length },
                  { id: 'pricing' as const, label: isVietnamese ? '💰 Bảng giá & Thanh toán' : '💰 Pricing & Billing', count: faqs.filter(f => f.category === 'pricing').length },
                ].map(cat => {
                  const isActive = faqCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setFaqCategory(cat.id);
                        setOpenFaq(0);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md font-black ring-2 ring-indigo-500/40'
                          : 'bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white dark:bg-slate-900/15 dark:text-slate-900'
                          : 'bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                      }`}>
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Direct Support Quick Card */}
              <div className="shots-glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-white/10 space-y-3.5 shadow-lg relative overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    {isVietnamese ? 'Vẫn còn thắc mắc?' : 'Still have questions?'}
                  </h4>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                    {isVietnamese
                      ? 'Đội ngũ kỹ sư giải pháp của Apexa luôn sẵn sàng hỗ trợ demo và tư vấn 1-1.'
                      : 'Our engineering team is ready 24/7 to assist with live demos and custom architecture.'}
                  </p>
                </div>
                <div className="pt-1 flex flex-col gap-2">
                  <Button
                    variant="shots"
                    size="sm"
                    pill
                    fullWidth
                    onClick={onSignUp}
                    className="text-xs font-black shadow-md shadow-indigo-500/20"
                  >
                    <span>{isVietnamese ? 'Tư vấn giải pháp 1-1' : 'Book 1-on-1 Consultation'}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 inline" />
                  </Button>
                  <a
                    href="mailto:support@apexa.vn"
                    className="text-center text-[11px] font-bold text-indigo-600 dark:text-sky-400 hover:underline py-1"
                  >
                    support@apexa.vn
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column: Search Bar & Filtered Accordion List (8/12 cols) */}
            <div className="lg:col-span-8 space-y-4">
              
              {/* Instant Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={faqSearch}
                  onChange={(e) => {
                    setFaqSearch(e.target.value);
                    setOpenFaq(0);
                  }}
                  placeholder={isVietnamese ? 'Tìm kiếm câu hỏi (ví dụ: AI, offline, giá, bảo mật, hóa đơn)...' : 'Search questions (e.g. AI, offline, pricing, security)...'}
                  className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-xs transition-all"
                />
                {faqSearch && (
                  <button
                    onClick={() => setFaqSearch('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Accordion Cards List */}
              <div className="space-y-3">
                {filteredFaqs.length === 0 ? (
                  <div className="shots-glass-card rounded-2xl p-8 text-center space-y-2">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {isVietnamese ? 'Không tìm thấy câu hỏi phù hợp với từ khóa.' : 'No matching questions found.'}
                    </p>
                    <button
                      onClick={() => { setFaqSearch(''); setFaqCategory('all'); }}
                      className="text-xs font-extrabold text-indigo-600 dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      {isVietnamese ? 'Xóa bộ lọc để xem tất cả câu hỏi' : 'Clear filters to view all'}
                    </button>
                  </div>
                ) : (
                  filteredFaqs.map((faq, i) => {
                    const isOpen = openFaq === i;
                    return (
                      <div
                        key={faq.id}
                        className={`shots-glass-card rounded-2xl overflow-hidden transition-all duration-200 ${
                          isOpen
                            ? 'border-indigo-500/60 dark:border-indigo-500/40 shadow-md ring-1 ring-indigo-500/20'
                            : 'hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        <button
                          onClick={() => setOpenFaq(isOpen ? null : i)}
                          className="w-full p-4.5 sm:p-5 text-left text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-start sm:items-center justify-between gap-3.5 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md border ${faq.badgeColor} shrink-0`}>
                              {faq.categoryLabel}
                            </span>
                            <span className="leading-snug">{faq.q}</span>
                          </div>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 transition-transform duration-200 ${
                            isOpen ? 'bg-indigo-500 text-white rotate-180' : 'bg-slate-100 dark:bg-white/10 text-slate-400'
                          }`}>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </div>
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed border-t border-slate-200/60 dark:border-white/10 pt-3.5 space-y-3 text-pretty">
                                <p>{faq.a}</p>
                                {faq.highlights && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {faq.highlights.map((item, hIdx) => (
                                      <span
                                        key={hIdx}
                                        className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-white/5"
                                      >
                                        <Check className="w-3 h-3 text-emerald-500 stroke-[3]" />
                                        {item}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </FadeInSection>
      </section>

      {/* =========================================================================
          FINAL HIGH-IMPACT COSMIC SHOWCASE STAGE
          ========================================================================= */}
      <section className="relative z-10 max-w-7xl 2xl:max-w-[1400px] mx-auto px-5 sm:px-6 pb-20 sm:pb-28">
        <FadeInSection>
          <div className="relative rounded-[36px] sm:rounded-[44px] p-8 sm:p-14 lg:p-20 text-center text-white overflow-hidden shadow-2xl border border-white/15 dark:border-white/10 bg-gradient-to-b from-[#0b162c] via-[#0d1c3a] to-[#080d1a] dark:from-[#060b17] dark:via-[#09142b] dark:to-[#040711]">
            
            {/* Ambient Cosmic Aurora Light Flares */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[750px] h-[360px] bg-gradient-to-r from-blue-500/25 via-indigo-500/35 to-purple-500/25 rounded-full blur-[130px] pointer-events-none -z-0" />
            <div className="absolute -bottom-24 right-[-10%] w-[500px] h-[300px] bg-gradient-to-tl from-cyan-500/20 via-sky-500/20 to-transparent rounded-full blur-[110px] pointer-events-none -z-0" />
            <div className="absolute top-1/2 left-[-10%] w-[400px] h-[300px] bg-gradient-to-tr from-purple-500/15 to-transparent rounded-full blur-[100px] pointer-events-none -z-0" />

            {/* Dotted Pattern Overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-25"
              style={{
                backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />

            {/* Content Container */}
            <div className="space-y-7 relative z-10 max-w-3xl mx-auto">
              
              {/* Brand Logo & Glowing Icon Stage */}
              <div className="flex justify-center">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 rounded-3xl blur-xl opacity-60 group-hover:opacity-90 transition-opacity" />
                  <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 p-0.5 shadow-2xl flex items-center justify-center border border-white/30">
                    <ApexaLogoIcon variant="white" className="w-9 h-9 sm:w-10 sm:h-10 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]" />
                  </div>
                </div>
              </div>

              {/* Headline */}
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight font-display leading-[1.12] text-balance">
                {isVietnamese ? (
                  <>
                    Khởi đầu kỷ nguyên năng suất mới cùng{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-indigo-200 to-purple-200">
                      Apexa
                    </span>
                  </>
                ) : (
                  <>
                    Supercharge your team&apos;s velocity with{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-indigo-200 to-purple-200">
                      Apexa
                    </span>
                  </>
                )}
              </h2>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-slate-300 dark:text-slate-300 font-medium leading-relaxed max-w-2xl mx-auto text-pretty">
                {isVietnamese
                  ? 'Hợp nhất Kanban, Docs, Chat và Whiteboard trên một Continuous Canvas với trợ lý Gemini AI. Độ trễ 11.4ms, không chuyển tab, làm việc mượt mà ngay cả khi offline.'
                  : 'Unify Kanban, Docs, Chat, and Whiteboards on a sub-12ms Local-First canvas powered by native Gemini AI. Zero tab switching, 100% offline-ready.'}
              </p>

              {/* Social Proof & Rating Badge Stack */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-1">
                {/* Avatars Stack */}
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-xs">
                  <div className="flex -space-x-2 overflow-hidden">
                    {['PM', 'GM', 'OP', 'DS'].map((av, idx) => (
                      <div
                        key={idx}
                        className={`inline-block h-6 w-6 rounded-full ring-2 ring-[#0b162c] text-[9px] font-black flex items-center justify-center text-white ${
                          idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-indigo-500' : idx === 2 ? 'bg-cyan-500' : 'bg-purple-500'
                        }`}
                      >
                        {av}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs font-black text-slate-200">
                    {isVietnamese ? '+2,500+ đội ngũ tin dùng' : '+2,500+ teams onboarded'}
                  </span>
                </div>

                {/* Star Rating */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-xs">
                  <div className="flex text-amber-400 text-xs">
                    {'★'.repeat(5)}
                  </div>
                  <span className="font-extrabold text-white">4.9/5</span>
                  <span className="text-slate-300 text-[11px] font-medium hidden sm:inline">
                    {isVietnamese ? '(1,200+ đánh giá)' : '(1,200+ reviews)'}
                  </span>
                </div>
              </div>

              {/* CTA Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <GsapMagneticButton
                  strength={0.32}
                  glowSweep={true}
                  onClick={onSignUp}
                  className="group flex h-13 sm:h-14 items-center justify-center gap-3 rounded-full bg-white text-slate-950 px-9 py-4 text-sm sm:text-base font-black shadow-2xl hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-indigo-500/30"
                >
                  <span>{isVietnamese ? 'Bắt đầu miễn phí ngay' : 'Get Started Free Today'}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </GsapMagneticButton>

                <button
                  type="button"
                  onClick={onSignIn}
                  className="h-13 sm:h-14 px-8 sm:px-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-[0.98] border border-white/30 text-white font-black text-sm sm:text-base backdrop-blur-md transition-all cursor-pointer shadow-md flex items-center justify-center"
                >
                  {isVietnamese ? 'Đăng nhập Workspace' : 'Sign in to Workspace'}
                </button>
              </div>

              {/* 4 Instant Reassurances */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  <span>{isVietnamese ? 'Miễn phí mãi mãi' : 'Free forever'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  <span>{isVietnamese ? 'Không cần thẻ tín dụng' : 'No credit card'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  <span>{isVietnamese ? 'Thiết lập trong 30 giây' : '30s setup'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  <span>{isVietnamese ? 'Bảo mật 256-bit RLS' : '256-bit RLS Security'}</span>
                </span>
              </div>

            </div>
          </div>
        </FadeInSection>
      </section>

      {/* =========================================================================
          UPGRADED MODERN CORPORATE FOOTER
          ========================================================================= */}
      <LandingFooter onSignUp={onSignUp} onSignIn={onSignIn} />

    </div>
  );
}
