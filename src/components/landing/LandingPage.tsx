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
  MapPin, Phone, Building2
} from 'lucide-react';
import ThemeSwitch from '../ThemeSwitch';
import LanguageDropdown from '../LanguageDropdown';
import { Button, Badge, SegmentedControl } from '../ui';
import { useTranslation } from '@/contexts/TranslationContext';
import { SUGGESTED_PRICES, type BillingCycle, type BillingPlan, type SelfServeBillingPlan } from '@/lib/billing/plans';
import { ApexaAiIcon, ApexaAiAvatar } from '../ApexaAiIcon';
import LandingFooter from './LandingFooter';

interface LandingPageProps {
  onSignUp: () => void;
  onSignIn: () => void;
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
  subtasks: { total: number; done: number };
  checked?: boolean;
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

const PLATFORM_CAPABILITIES = [
  'Kanban', 'Smart Docs', 'Realtime Chat', 'CRM', 'ERP', 'Finance', 'Whiteboard', 'Apexa Brain AI'
];

function AnimatedCounter({ value, duration = 2, suffix = '', decimals = 0 }: { value: number; duration?: number; suffix?: string; decimals?: number }) {
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

/* =========================================================================
   REALISTIC IN-APP WORKSPACE SHOWCASE (AUTHENTIC DESKTOP EXPERIENCE)
   ========================================================================= */
function ApexaWorkspaceShowcase({ onSignUp }: { onSignUp: () => void }) {
  const { isVietnamese } = useTranslation();
  const [activeTab, setActiveTab] = useState<'board' | 'docs' | 'ai' | 'analytics' | 'chat'>('board');
  const [activeSpace, setActiveSpace] = useState('core');

  // Interactive Kanban Tasks
  const [tasks, setTasks] = useState<MockTask[]>(() => isVietnamese ? [
    {
      id: 'task-1',
      title: 'Thiết kế giao diện Continuous Canvas phẳng thế hệ mới',
      column: 'done',
      priority: 'Khẩn cấp',
      dueDate: 'Hôm nay',
      assignee: 'HX',
      assigneeBg: 'from-blue-500 to-indigo-600',
      tag: 'UI/UX',
      subtasks: { total: 4, done: 4 },
      checked: true
    },
    {
      id: 'task-2',
      title: 'Tích hợp Trợ lý Apexa Brain Copilot (Gemini)',
      column: 'inprogress',
      priority: 'Khẩn cấp',
      dueDate: '15:00',
      assignee: 'AI',
      assigneeBg: 'from-indigo-600 to-purple-600',
      tag: 'AI Engine',
      subtasks: { total: 5, done: 3 },
      checked: false
    },
    {
      id: 'task-3',
      title: 'Tối ưu hóa Local-First Cache và hàng đợi đồng bộ',
      column: 'inprogress',
      priority: 'Cao',
      dueDate: 'Ngày mai',
      assignee: 'MA',
      assigneeBg: 'from-emerald-500 to-teal-600',
      tag: 'Core DB',
      subtasks: { total: 3, done: 1 },
      checked: false
    },
    {
      id: 'task-4',
      title: 'Đồng bộ 2 chiều tức thì Google Calendar & Lịch Sprint',
      column: 'todo',
      priority: 'Trung bình',
      dueDate: '20/08',
      assignee: 'QB',
      assigneeBg: 'from-amber-500 to-orange-600',
      tag: 'Integration',
      subtasks: { total: 2, done: 0 },
      checked: false
    }
  ] : [
    {
      id: 'task-1',
      title: 'Design Continuous Unified Canvas next-gen flat UI',
      column: 'done',
      priority: 'Urgent',
      dueDate: 'Today',
      assignee: 'HX',
      assigneeBg: 'from-blue-500 to-indigo-600',
      tag: 'UI/UX',
      subtasks: { total: 4, done: 4 },
      checked: true
    },
    {
      id: 'task-2',
      title: 'Integrate Apexa Brain Copilot (Gemini)',
      column: 'inprogress',
      priority: 'Urgent',
      dueDate: '3:00 PM',
      assignee: 'AI',
      assigneeBg: 'from-indigo-600 to-purple-600',
      tag: 'AI Engine',
      subtasks: { total: 5, done: 3 },
      checked: false
    },
    {
      id: 'task-3',
      title: 'Optimize Local-First Cache and sync queue',
      column: 'inprogress',
      priority: 'High',
      dueDate: 'Tomorrow',
      assignee: 'MA',
      assigneeBg: 'from-emerald-500 to-teal-600',
      tag: 'Core DB',
      subtasks: { total: 3, done: 1 },
      checked: false
    },
    {
      id: 'task-4',
      title: '2-way instant synchronization with Google Calendar',
      column: 'todo',
      priority: 'Normal',
      dueDate: 'Aug 20',
      assignee: 'QB',
      assigneeBg: 'from-amber-500 to-orange-600',
      tag: 'Integration',
      subtasks: { total: 2, done: 0 },
      checked: false
    }
  ]);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [aiChatLog, setAiChatLog] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>(() => [
    {
      sender: 'bot',
      text: isVietnamese
        ? '👋 Xin chào! Tôi là Apexa Brain Copilot. Tôi đã phân tích bối cảnh Sprint 14: Đội ngũ đã hoàn thành 75% kế hoạch. Bạn muốn tôi tạo task tự động hay phân tích rủi ro trễ hạn?'
        : '👋 Hello! I am Apexa Brain Copilot. I have analyzed your Sprint 14 context: the team is at 75% completion. Would you like me to auto-create sprint tasks or audit potential delay blockers?',
      time: '09:15'
    }
  ]);

  // Chat message list
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; avatar: string; bg: string; text: string; time: string; isAi?: boolean }>>(() => [
    {
      sender: 'Hoàng Xuân',
      avatar: 'HX',
      bg: 'from-blue-600 to-indigo-600',
      text: isVietnamese ? 'Cả team ơi, bản cập nhật UI Continuous Canvas đã sẵn sàng trên production rồi nhé!' : 'Hey team, the Continuous Canvas UI update is deployed to production!',
      time: '09:20'
    },
    {
      sender: 'Minh Anh',
      avatar: 'MA',
      bg: 'from-emerald-600 to-teal-600',
      text: isVietnamese ? 'Tuyệt vời! Tốc độ đồng bộ Local-First đo được thực tế là 11.4ms, cực kỳ mượt mà.' : 'Awesome! Real-world Local-First sync latency clocked in at 11.4ms, super fast.',
      time: '09:22'
    },
    {
      sender: 'Apexa Brain AI',
      avatar: 'AI',
      bg: 'from-indigo-600 to-purple-600',
      text: isVietnamese ? '🤖 Tự động đồng bộ: Sprint 14 đã vượt tiến độ 2 ngày. Tất cả 12 tài liệu PRD đã được cập nhật.' : '🤖 Auto-Sync: Sprint 14 is 2 days ahead of schedule. All 12 PRD docs are updated.',
      time: '09:23',
      isAi: true
    }
  ]);
  const [newChatInput, setNewChatInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextChecked = !t.checked;
        return {
          ...t,
          checked: nextChecked,
          column: nextChecked ? 'done' : 'inprogress',
          subtasks: {
            total: t.subtasks.total,
            done: nextChecked ? t.subtasks.total : Math.max(0, t.subtasks.total - 1)
          }
        };
      }
      return t;
    }));
  };

  const handleQuickAdd = (column: 'todo' | 'inprogress' | 'done') => {
    if (!newTaskTitle.trim()) return;
    const newTask: MockTask = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      column,
      priority: isVietnamese ? 'Cao' : 'High',
      dueDate: isVietnamese ? 'Hôm nay' : 'Today',
      assignee: 'Bạn',
      assigneeBg: 'from-blue-600 to-indigo-600',
      tag: isVietnamese ? 'Mới' : 'New',
      subtasks: { total: 1, done: 0 },
      checked: false
    };
    setTasks(prev => [newTask, ...prev]);
    setNewTaskTitle('');
  };

  const handleSendAi = (promptText?: string) => {
    const query = promptText || aiInput;
    if (!query.trim()) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAiChatLog(prev => [...prev, { sender: 'user', text: query, time: timeStr }]);
    if (!promptText) setAiInput('');
    setAiTyping(true);

    setTimeout(() => {
      let botResponse = isVietnamese
        ? '✨ Apexa Brain đã xử lý yêu cầu và tự động cập nhật hệ thống thành công!'
        : '✨ Apexa Brain analyzed your prompt and updated the workspace successfully!';

      const lower = query.toLowerCase();
      if (lower.includes('sprint') || lower.includes('kế hoạch') || lower.includes('plan') || lower.includes('task')) {
        botResponse = isVietnamese
          ? '🎯 Đã tự động tạo 2 đầu việc ưu tiên cao cho Sprint:\n1. ⚡ [Khẩn cấp] Kiểm thử hiệu năng Local-First đồng thời 100 users.\n2. 📝 [Cao] Soạn thảo release notes cho Apexa OS v2.0.'
          : '🎯 Automatically generated 2 prioritized Sprint items:\n1. ⚡ [Urgent] Benchmark Local-First sync under 100 concurrent users.\n2. 📝 [High] Draft official release notes for Apexa OS v2.0.';
        
        setTasks(prev => [
          {
            id: Date.now().toString(),
            title: isVietnamese ? '⚡ [AI Action] Kiểm thử tải đồng bộ Local-First 100 users' : '⚡ [AI Action] Benchmark Local-First sync under 100 users',
            column: 'inprogress',
            priority: isVietnamese ? 'Khẩn cấp' : 'Urgent',
            dueDate: isVietnamese ? 'Hôm nay' : 'Today',
            assignee: 'AI',
            assigneeBg: 'from-indigo-600 to-purple-600',
            tag: 'AI Auto',
            subtasks: { total: 3, done: 1 },
            checked: false
          },
          ...prev
        ]);
      } else if (lower.includes('báo cáo') || lower.includes('tiến độ') || lower.includes('report') || lower.includes('status')) {
        const doneCount = tasks.filter(t => t.column === 'done').length;
        const total = tasks.length || 1;
        const rate = Math.round((doneCount / total) * 100);
        botResponse = isVietnamese
          ? `📊 Báo cáo tiến độ Sprint 14:\n• Tổng đầu việc: ${total} tasks\n• Tỷ lệ hoàn thành: ${rate}%\n• Tốc độ bàn giao: Vượt kế hoạch 2 ngày\n• Zero rủi ro trễ hạn được phát hiện.`
          : `📊 Sprint 14 Velocity Digest:\n• Total tasks: ${total}\n• Completion rate: ${rate}%\n• Delivery velocity: +2 days ahead of schedule\n• Zero blockers detected.`;
      }
      setAiChatLog(prev => [...prev, { sender: 'bot', text: botResponse, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      setAiTyping(false);
    }, 850);
  };

  const handleSendChatMessage = () => {
    if (!newChatInput.trim()) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [
      ...prev,
      {
        sender: isVietnamese ? 'Bạn' : 'You',
        avatar: 'ME',
        bg: 'from-blue-500 to-indigo-600',
        text: newChatInput.trim(),
        time: timeStr
      }
    ]);
    setNewChatInput('');
  };

  const priorityColor = (priority: string) => {
    if (priority === 'Khẩn cấp' || priority === 'Urgent') return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
    if (priority === 'Cao' || priority === 'High') return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
  };

  return (
    <div className="w-full text-left font-sans select-none">
      
      {/* Outer Application Window Shadow Frame */}
      <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0b0f19]/95 backdrop-blur-2xl shadow-[0_30px_100px_-20px_rgba(15,23,42,0.25)] dark:shadow-[0_30px_100px_-20px_rgba(0,0,0,0.85)] overflow-hidden transition-all">
        
        {/* =========================================================================
            TOP APPLICATION WINDOW CHROME / HEADER BAR
            ========================================================================= */}
        <div className="h-12 border-b border-slate-200/70 dark:border-white/10 bg-slate-100/80 dark:bg-slate-900/80 px-4 flex items-center justify-between gap-3 text-xs">
          
          {/* Left: macOS Window Controls & Workspace Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 border border-rose-600/40 shadow-2xs cursor-pointer hover:opacity-80" />
              <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600/40 shadow-2xs cursor-pointer hover:opacity-80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600/40 shadow-2xs cursor-pointer hover:opacity-80" />
            </div>

            <div className="h-4 w-px bg-slate-300 dark:bg-white/10 mx-1 hidden sm:block" />

            {/* Workspace Breadcrumb */}
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black">
                A
              </div>
              <span className="font-black text-slate-900 dark:text-white">Apexa Workspace</span>
              <span className="text-slate-400">/</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-1">
                🚀 Core Product · Sprint 14
              </span>
            </div>
          </div>

          {/* Center: Command Palette / Search Bar */}
          <div className="flex-1 max-w-md hidden md:flex items-center justify-center">
            <div className="w-full max-w-sm flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-950/70 border border-slate-200/80 dark:border-white/10 text-[11px] text-slate-400 shadow-2xs">
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>{isVietnamese ? 'Tìm kiếm task, docs, prompt (⌘K)...' : 'Search tasks, docs, AI prompt (⌘K)...'}</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-500 border border-slate-200 dark:border-white/10">⌘K</kbd>
            </div>
          </div>

          {/* Right: Realtime Status & Active Users */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isVietnamese ? 'Đồng bộ 12ms' : 'Synced 12ms'}</span>
            </div>

            <div className="flex -space-x-1.5 items-center">
              {[
                { name: 'HX', bg: 'from-blue-600 to-indigo-600' },
                { name: 'MA', bg: 'from-emerald-500 to-teal-600' },
                { name: 'QB', bg: 'from-amber-500 to-orange-600' },
              ].map((m, i) => (
                <div key={i} className={`w-5 h-5 rounded-full bg-gradient-to-br ${m.bg} border border-white dark:border-slate-900 text-white font-black text-[7.5px] flex items-center justify-center shadow-2xs`}>
                  {m.name}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* =========================================================================
            MAIN WORKSPACE BODY: LEFT SIDEBAR + MAIN CANVAS
            ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-[500px] lg:min-h-[540px]">
          
          {/* Left Navigation Sidebar (Modern Black) */}
          <aside className="border-r border-white/[0.08] bg-gradient-to-b from-[#0e121b] via-[#090b10] to-[#07080c] p-3 flex flex-col justify-between hidden md:flex text-slate-200">
            <div className="space-y-4">
              
              {/* Spaces Group */}
              <div className="space-y-1">
                <div className="px-2 text-[9.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {isVietnamese ? 'Không gian làm việc' : 'Workspace Spaces'}
                </div>
                {[
                  { id: 'core', label: isVietnamese ? '🚀 Core Product' : '🚀 Core Product', count: 12 },
                  { id: 'design', label: isVietnamese ? '🎨 Brand & Design' : '🎨 Brand & Design', count: 8 },
                  { id: 'ai', label: isVietnamese ? '⚡ AI Engine Lab' : '⚡ AI Engine Lab', count: 6 },
                ].map(space => (
                  <button
                    key={space.id}
                    onClick={() => setActiveSpace(space.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeSpace === space.id
                        ? 'bg-white/[0.12] text-white border border-white/10 shadow-xs'
                        : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <span className="truncate">{space.label}</span>
                    <span className="text-[9.5px] font-extrabold text-zinc-300 bg-white/10 px-1.5 py-0.2 rounded-md">{space.count}</span>
                  </button>
                ))}
              </div>

              {/* Views Switcher */}
              <div className="space-y-1 pt-2 border-t border-white/[0.08]">
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
                            : 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 text-white border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                          : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white'
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
                        isSelected ? 'bg-white/20 text-white' : 'bg-white/[0.08] text-zinc-400'
                      }`}>
                        {tab.badge}
                      </span>
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Bottom Sidebar Focus Widget */}
            <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-300">
                <span className="flex items-center gap-1.5"><Flame className="w-3 h-3 text-sky-400 fill-current" /> {isVietnamese ? 'Nhịp tập trung' : 'Focus Streak'}</span>
                <span className="font-black text-white">4.8h</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
          </aside>

          {/* Main Interactive Canvas Area */}
          <main className="p-4 sm:p-5 flex flex-col justify-between overflow-hidden bg-slate-50/30 dark:bg-transparent">
            
            {/* View Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-slate-200/70 dark:border-white/10">
              
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

              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  {activeTab === 'board' && (isVietnamese ? '📋 Sprint 14 · Bảng điều phối Kanban' : '📋 Sprint 14 · Kanban Task Board')}
                  {activeTab === 'docs' && (isVietnamese ? '✍️ Smart Docs · Tài liệu kiến trúc Apexa' : '✍️ Smart Docs · Architecture Spec PRD')}
                  {activeTab === 'ai' && '🧠 Apexa Brain AI Copilot (Gemini)'}
                  {activeTab === 'analytics' && (isVietnamese ? '📊 Báo cáo vận tốc Sprint & Đo lường KPI' : '📊 Sprint Velocity & Performance Digest')}
                  {activeTab === 'chat' && (isVietnamese ? '💬 Kênh thảo luận #sprint-14-launch' : '💬 Discussion #sprint-14-launch')}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                  {activeTab === 'board' ? `${tasks.length} tasks` : 'Live'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onSignUp}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isVietnamese ? 'Tạo việc mới' : 'New Task'}</span>
                </button>
              </div>
            </div>

            {/* Viewport Content */}
            <div className="flex-1 min-h-[380px] max-h-[420px] overflow-hidden">
              <AnimatePresence mode="wait">
                
                {/* 1. KANBAN BOARD VIEW */}
                {activeTab === 'board' && (
                  <motion.div
                    key="tab-board"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3 h-full overflow-hidden"
                  >
                    {[
                      { key: 'todo', label: isVietnamese ? 'Cần làm' : 'To Do', dot: 'bg-slate-400', count: tasks.filter(t => t.column === 'todo').length },
                      { key: 'inprogress', label: isVietnamese ? 'Đang làm' : 'In Progress', dot: 'bg-blue-500', count: tasks.filter(t => t.column === 'inprogress').length },
                      { key: 'done', label: isVietnamese ? 'Đã hoàn tất' : 'Done', dot: 'bg-emerald-500', count: tasks.filter(t => t.column === 'done').length }
                    ].map(col => {
                      const colTasks = tasks.filter(t => t.column === col.key);
                      return (
                        <div key={col.key} className="bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3 flex flex-col h-full">
                          
                          {/* Column Header */}
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-white/5">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">{col.label}</span>
                            </div>
                            <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-white dark:bg-white/10 text-slate-600 dark:text-slate-300 shadow-2xs">
                              {colTasks.length}
                            </span>
                          </div>

                          {/* Column Task List */}
                          <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                            {colTasks.map(task => (
                              <motion.div
                                layoutId={task.id}
                                key={task.id}
                                className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                  task.checked
                                    ? 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/50 dark:border-white/5 opacity-75'
                                    : 'bg-white dark:bg-slate-850 border-slate-200/80 dark:border-white/10 shadow-2xs hover:shadow-sm hover:border-indigo-400'
                                }`}
                              >
                                <div className="flex items-start gap-2.5">
                                  <button
                                    onClick={() => handleToggleTask(task.id)}
                                    className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                                      task.checked
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500 bg-white dark:bg-slate-900'
                                    }`}
                                  >
                                    {task.checked && <Check className="w-3 h-3 stroke-[3]" />}
                                  </button>

                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-bold leading-snug ${task.checked ? 'line-through text-slate-400 dark:text-slate-500 font-normal' : 'text-slate-900 dark:text-slate-100'}`}>
                                      {task.title}
                                    </p>

                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-white/5 text-[9.5px]">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`px-2 py-0.5 rounded-full border font-black ${priorityColor(task.priority)}`}>
                                          {task.priority}
                                        </span>
                                        <span className="text-slate-400 font-semibold">{task.dueDate}</span>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-bold text-slate-400">
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

                          {/* Inline Add Task */}
                          <div className="pt-2 mt-2 border-t border-slate-200/60 dark:border-white/5">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                placeholder={isVietnamese ? '+ Thêm task mới...' : '+ Add task...'}
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleQuickAdd(col.key as any);
                                }}
                                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 outline-none text-slate-800 dark:text-slate-200 focus:border-indigo-500 font-medium"
                              />
                              <button
                                onClick={() => handleQuickAdd(col.key as any)}
                                className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-xs"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                        </div>
                      );
                    })}
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
                            {isVietnamese ? 'PRD: Kiến trúc Local-First & AI Native Apexa OS' : 'PRD: Local-First & AI Native Apexa Architecture'}
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
                      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-indigo-950/40 dark:to-slate-900/40 border border-indigo-200/60 dark:border-indigo-500/30 flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <div className="text-[11px]">
                          <span className="font-extrabold text-indigo-700 dark:text-indigo-300">{isVietnamese ? 'AI Tóm tắt tài liệu:' : 'AI Document Summary:'} </span>
                          <span>{isVietnamese ? 'Kiến trúc mới giảm thiểu 95% round-trip network, cho phép 100+ kỹ sư soạn thảo không xung đột với thuật toán CRDTs Yjs.' : 'The new architecture eliminates 95% of network round-trips, empowering 100+ engineers to co-author conflict-free with Yjs CRDTs.'}</span>
                        </div>
                      </div>

                      <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{isVietnamese ? '1. Tiêu chí kỹ thuật chính' : '1. Key Engineering Milestones'}</h5>
                      
                      <div className="space-y-1.5 pl-1">
                        {[
                          { text: isVietnamese ? 'Tối ưu phản hồi trên IndexedDB local cache' : 'Optimize response time on local IndexedDB storage', done: true },
                          { text: isVietnamese ? 'Hỗ trợ nhúng thẻ Kanban Board thời gian thực vào giữa nội dung bài viết' : 'Live embed dynamic Kanban task cards directly inside Markdown blocks', done: true },
                          { text: isVietnamese ? 'Tự động đồng bộ 2 chiều qua Realtime Channels khi online' : 'Two-way bidirectional sync via Realtime Channels on reconnect', done: false },
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <span className={`w-4 h-4 rounded flex items-center justify-center text-white ${item.done ? 'bg-emerald-500' : 'border border-slate-300 dark:border-slate-700'}`}>
                              {item.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </span>
                            <span className={item.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}>{item.text}</span>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[10px] space-y-1 border border-white/10">
                        <span className="text-slate-500">{"// Apexa Local-First Sync Hook"}</span>
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
                              ? 'bg-blue-600 text-white rounded-tr-none'
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
                    <div className="flex flex-wrap gap-2 my-2 pt-2 border-t border-white/10">
                      {[
                        { label: isVietnamese ? '⚡ Lập kế hoạch 2 task ưu tiên' : '⚡ Auto-plan 2 priority tasks', prompt: isVietnamese ? 'Lập kế hoạch 2 task ưu tiên cho Sprint' : 'Plan 2 prioritized tasks for the Sprint' },
                        { label: isVietnamese ? '📊 Tóm tắt tiến độ Sprint 14' : '📊 Summarize Sprint 14 progress', prompt: isVietnamese ? 'Báo cáo tóm tắt tiến độ sprint hiện tại' : 'Summarize current sprint progress' },
                        { label: isVietnamese ? '🎯 Dự đoán rủi ro trễ hạn' : '🎯 Predict delay blockers', prompt: isVietnamese ? 'Phân tích rủi ro trễ hạn của các task' : 'Analyze deadline delay risks' },
                      ].map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendAi(chip.prompt)}
                          className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/40 transition-colors cursor-pointer"
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

                    {/* Visual Sprint Burn-down Bar */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-white/5 space-y-3">
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
                            <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
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
                      {chatMessages.map((msg, i) => (
                        <div key={i} className="flex items-start gap-2.5">
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
                        className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 outline-none text-slate-900 dark:text-white focus:border-indigo-500"
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
            </div>

          </main>

        </div>

      </div>

    </div>
  );
}

/* =========================================================================
   INTERACTIVE ROI & PRODUCTIVITY CALCULATOR
   ========================================================================= */
function RoiCalculator() {
  const { isVietnamese } = useTranslation();
  const [teamSize, setTeamSize] = useState(15);

  const hoursSavedPerWeek = Math.round(teamSize * 3.5);
  const costSavingsPerYear = Math.round(teamSize * 380);
  const velocityIncrease = Math.min(65, Math.round(25 + teamSize * 0.4));

  return (
    <div className="shots-glass-card rounded-3xl p-6 sm:p-10 text-left space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/70 dark:border-white/10">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-sky-400">
            {isVietnamese ? 'BỘ TÍNH TOÁN HIỆU QUẢ ĐẦU TƯ (ROI)' : 'INTERACTIVE ROI CALCULATOR'}
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1 font-display">
            {isVietnamese ? 'Đội ngũ của bạn sẽ tiết kiệm được bao nhiêu?' : 'How much will your team save with Apexa OS?'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            {isVietnamese
              ? 'Kéo thanh trượt để ước tính số giờ làm việc, chi phí phần mềm và tốc độ dự án gia tăng.'
              : 'Adjust the slider to see estimated engineering hours saved, cost reduction, and velocity boost.'}
          </p>
        </div>

        <div className="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-white/10 text-center shrink-0 border border-slate-200/80 dark:border-white/10">
          <div className="text-3xl font-black text-indigo-600 dark:text-sky-400 font-display">{teamSize}</div>
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{isVietnamese ? 'Thành viên đội ngũ' : 'Team Members'}</div>
        </div>
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
          <span>{isVietnamese ? 'Quy mô đội ngũ (5 - 100 người)' : 'Team Size (5 - 100 people)'}</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{teamSize} {isVietnamese ? 'nhân sự' : 'members'}</span>
        </div>
        <input
          type="range"
          min="5"
          max="100"
          value={teamSize}
          onChange={(e) => setTeamSize(Number(e.target.value))}
          className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
          <span>5 {isVietnamese ? 'người' : 'members'}</span>
          <span>50 {isVietnamese ? 'người' : 'members'}</span>
          <span>100+ {isVietnamese ? 'người' : 'members'}</span>
        </div>
      </div>

      {/* Computed ROI Output Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="p-5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-500/20 space-y-1 text-left">
          <div className="flex items-center gap-2 text-blue-600 dark:text-sky-400">
            <Clock className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-wider">{isVietnamese ? 'Thời gian tiết kiệm' : 'Hours Saved'}</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white font-display">
            ~{hoursSavedPerWeek} <span className="text-sm font-bold text-slate-400">{isVietnamese ? 'giờ/tuần' : 'hrs/wk'}</span>
          </div>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
            {isVietnamese ? 'Giảm bớt thời gian họp bàn và tìm kiếm tài liệu phân tán.' : 'Reduced context-switching and redundant alignment meetings.'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-500/20 space-y-1 text-left">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-wider">{isVietnamese ? 'Chi phí tối ưu' : 'Cost Saved'}</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white font-display" suppressHydrationWarning>
            ${costSavingsPerYear.toLocaleString('en-US')} <span className="text-sm font-bold text-slate-400">{isVietnamese ? '/ năm' : '/ year'}</span>
          </div>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
            {isVietnamese ? 'Thay thế chi phí bản quyền riêng lẻ cho 5 phần mềm khác nhau.' : 'Eliminating separate subscriptions for Jira, Slack, Notion & Asana.'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-500/20 space-y-1 text-left">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Zap className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-wider">{isVietnamese ? 'Tốc độ Sprint' : 'Sprint Velocity'}</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white font-display">
            +{velocityIncrease}% <span className="text-sm font-bold text-slate-400">{isVietnamese ? 'năng suất' : 'velocity'}</span>
          </div>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
            {isVietnamese ? 'Hoàn thành tính năng sớm hơn với sự trợ lực của AI Copilot.' : 'Faster delivery cycles powered by continuous AI task automation.'}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   TOOL COMPARISON MATRIX
   ========================================================================= */
function ComparisonMatrix() {
  const { isVietnamese } = useTranslation();

  const comparisonRows = [
    {
      feature: isVietnamese ? 'Bộ nhớ đệm local-first và hàng đợi đồng bộ' : 'Local-first cache and sync queue',
      apexa: true,
      jira: false,
      notion: false,
      slack: false,
    },
    {
      feature: isVietnamese ? 'Apexa Brain AI Copilot tích hợp sâu (Gemini)' : 'Deeply integrated Gemini AI Copilot',
      apexa: true,
      jira: false,
      notion: 'Phụ phí riêng',
      slack: 'Phụ phí riêng',
    },
    {
      feature: isVietnamese ? 'Cộng tác Smart Docs nhúng trực tiếp Live Task' : 'Smart Docs with Live Dynamic Task Embedding',
      apexa: true,
      jira: false,
      notion: true,
      slack: false,
    },
    {
      feature: isVietnamese ? 'ChatRoom theo workspace và dự án' : 'Workspace and project ChatRoom',
      apexa: true,
      jira: false,
      notion: false,
      slack: true,
    },
    {
      feature: isVietnamese ? 'Đồng bộ 2 chiều Google Calendar & Lịch biểu' : 'Two-way Google Calendar & Sprint Sync',
      apexa: true,
      jira: 'Cần plugin',
      notion: 'Hạn chế',
      slack: false,
    },
    {
      feature: isVietnamese ? 'Tiếp tục các luồng cốt lõi khi kết nối gián đoạn' : 'Core workflows continue during connection loss',
      apexa: true,
      jira: false,
      notion: false,
      slack: false,
    },
    {
      feature: isVietnamese ? 'Các phân hệ dùng chung một workspace' : 'Modules share one workspace',
      apexa: true,
      jira: false,
      notion: false,
      slack: false,
    },
  ];

  return (
    <div className="shots-glass-card rounded-3xl p-6 sm:p-8 overflow-x-auto text-left">
      <table className="w-full min-w-[620px] text-xs">
        <thead>
          <tr className="border-b border-slate-200/80 dark:border-white/10 text-slate-400">
            <th className="py-3 px-4 font-black uppercase text-[10px] tracking-wider">{isVietnamese ? 'Tính năng & Tiêu chuẩn' : 'Features & Criteria'}</th>
            <th className="py-3 px-4 font-black uppercase text-[10px] tracking-wider text-indigo-600 dark:text-sky-400 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-t-xl text-center">
              Apexa OS ✨
            </th>
            <th className="py-3 px-4 font-bold text-center">Project tool</th>
            <th className="py-3 px-4 font-bold text-center">Docs tool</th>
            <th className="py-3 px-4 font-bold text-center">Chat tool</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/60 dark:divide-white/5 font-semibold text-slate-700 dark:text-slate-300">
          {comparisonRows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
              <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{row.feature}</td>
              <td className="py-3.5 px-4 text-center bg-indigo-50/30 dark:bg-indigo-950/20 font-black text-indigo-600 dark:text-sky-400">
                <Check className="w-4 h-4 mx-auto text-indigo-600 dark:text-sky-400 stroke-[3]" />
              </td>
              <td className="py-3.5 px-4 text-center text-slate-400">
                {typeof row.jira === 'boolean' ? (
                  row.jira ? <Check className="w-4 h-4 mx-auto text-emerald-500" /> : <X className="w-4 h-4 mx-auto text-slate-300 dark:text-slate-600" />
                ) : (
                  <span className="text-[10px] font-bold">{row.jira}</span>
                )}
              </td>
              <td className="py-3.5 px-4 text-center text-slate-400">
                {typeof row.notion === 'boolean' ? (
                  row.notion ? <Check className="w-4 h-4 mx-auto text-emerald-500" /> : <X className="w-4 h-4 mx-auto text-slate-300 dark:text-slate-600" />
                ) : (
                  <span className="text-[10px] font-bold">{row.notion}</span>
                )}
              </td>
              <td className="py-3.5 px-4 text-center text-slate-400">
                {typeof row.slack === 'boolean' ? (
                  row.slack ? <Check className="w-4 h-4 mx-auto text-emerald-500" /> : <X className="w-4 h-4 mx-auto text-slate-300 dark:text-slate-600" />
                ) : (
                  <span className="text-[10px] font-bold">{row.slack}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Dynamic Top Announcement Marquee Items
  const announcementItems = useMemo(() => [
    {
      id: 'os-2',
      badge: 'SHOTS-GRADE OS 2.0',
      badgeVariant: 'shots-new' as const,
      text: isVietnamese
        ? 'Apexa OS 2.0 kết nối trợ lý Gemini AI với công việc, tài liệu và kiến trúc local-first.'
        : 'Apexa OS 2.0 connects Gemini AI with tasks, documents, and a local-first architecture.',
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
      badge: '✨ ALL-IN-ONE OS',
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
    { id: 'all', label: isVietnamese ? 'Tất cả giải pháp' : 'All Solutions' },
    { id: 'task', label: isVietnamese ? 'Quản lý dự án & Sprint' : 'Projects & Sprints' },
    { id: 'ai', label: isVietnamese ? 'Trí tuệ nhân tạo Apexa Brain' : 'Apexa Brain AI' },
    { id: 'collaboration', label: isVietnamese ? 'Cộng tác thời gian thực' : 'Real-time Collaboration' },
    { id: 'analytics', label: isVietnamese ? 'Phân tích & Tối ưu hiệu suất' : 'Analytics & Performance' }
  ], [isVietnamese]);

  // Dynamic Features
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
      category: 'task'
    },
    {
      icon: ApexaAiIcon,
      title: 'Apexa Brain AI Copilot',
      desc: isVietnamese
        ? 'Trợ lý AI tích hợp sâu: tự động phân rã mục tiêu thành subtasks, tóm tắt tài liệu, gợi ý phân bổ KPI và viết báo cáo tiến độ bằng Gemini AI.'
        : 'Deeply integrated AI: auto-deconstruct goals into subtasks, summarize docs, recommend KPI allocations, and generate progress digests.',
      badge: 'AI Native',
      tagVariant: 'shots-new' as const,
      color: 'from-blue-600 to-cyan-600',
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      category: 'ai'
    },
    {
      icon: FileText,
      title: isVietnamese ? 'Smart Docs & Knowledge Base' : 'Smart Docs & Knowledge Base',
      desc: isVietnamese
        ? 'Tài liệu số cộng tác thời gian thực (Multi-cursor real-time). Nhúng trực tiếp task, cơ sở dữ liệu và sơ đồ tư duy ngay trong trang.'
        : 'Multi-cursor real-time collaborative documentation. Embed live tasks, databases, and mind maps directly inside pages.',
      badge: 'Real-time',
      tagVariant: 'shots' as const,
      color: 'from-blue-600 to-cyan-500',
      bg: 'bg-violet-500/10 dark:bg-violet-500/15',
      iconColor: 'text-violet-600 dark:text-violet-400',
      category: 'collaboration'
    },
    {
      icon: MessageSquare,
      title: isVietnamese ? 'ChatRoom & Kênh Thảo Luận' : 'ChatRoom & Audio Huddles',
      desc: isVietnamese
        ? 'Trao đổi kênh truyền theo dự án, thảo luận trực tiếp trên từng task cụ thể, loại bỏ 100% tình trạng phân mảnh tin nhắn rời rạc.'
        : 'Project-based communication channels, in-task discussions, and voice huddles eliminating message fragmentation entirely.',
      badge: isVietnamese ? 'Tích hợp' : 'Built-in',
      tagVariant: 'shots' as const,
      color: 'from-cyan-600 to-blue-600',
      bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      category: 'collaboration'
    },
    {
      icon: Calendar,
      title: isVietnamese ? 'Lịch & Timeline Gantt Đa Chiều' : 'Calendar & Gantt Timeline',
      desc: isVietnamese
        ? 'Kiểm soát đường găng dự án (Critical Path), phát hiện xung đột deadline và đồng bộ 2 chiều tức thì với Google Calendar.'
        : 'Track critical path milestones, discover deadline collisions automatically, and enjoy two-way Google Calendar synchronization.',
      badge: 'Sync 2-Way',
      tagVariant: 'shots' as const,
      color: 'from-emerald-600 to-teal-600',
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      category: 'task'
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
      category: 'analytics'
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
      category: 'task'
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
      category: 'analytics'
    }
  ], [isVietnamese]);

  // Dynamic Workflow Steps
  const workflowSteps = useMemo(() => [
    {
      step: '01',
      title: isVietnamese ? 'Tạo Không Gian & Mời Nhóm' : 'Create Space & Invite Team',
      desc: isVietnamese
        ? 'Khởi tạo workspace chuyên biệt theo phòng ban, phân quyền chi tiết (Admin, Member, Guest) chỉ trong 30 giây.'
        : 'Set up departmental workspaces with fine-grained roles (Admin, Member, Guest) in under 30 seconds.',
      icon: Layers,
      badge: isVietnamese ? 'Khởi động nhanh' : 'Quick Setup'
    },
    {
      step: '02',
      title: isVietnamese ? 'Lên Kế Hoạch Với Apexa AI' : 'Plan with Apexa AI',
      desc: isVietnamese
        ? 'Giao mục tiêu lớn cho AI — hệ thống tự động phân tách thành các task nhỏ kèm deadline, độ ưu tiên và mô tả chi tiết.'
        : 'Feed high-level milestones to AI—the system auto-generates decomposed tasks with deadlines and rich context.',
      icon: Sparkles,
      badge: isVietnamese ? 'Tự động hóa' : 'Automation'
    },
    {
      step: '03',
      title: isVietnamese ? 'Cộng Tác Thời Gian Thực' : 'Real-time Collaboration',
      desc: isVietnamese
        ? 'Thực hiện công việc trên bảng Kanban, viết Smart Docs và thảo luận ngay trong ChatRoom mà không phải đổi ứng dụng.'
        : 'Execute tasks on Kanban boards, write collaborative docs, and chat in project rooms without tab switching.',
      icon: MessageSquare,
      badge: isVietnamese ? 'Đồng bộ 100%' : '100% Synced'
    },
    {
      step: '04',
      title: isVietnamese ? 'Phân Tích & Bứt Phá Năng Suất' : 'Analyze & Boost Velocity',
      desc: isVietnamese
        ? 'Theo dõi chỉ số Sprint Velocity, nhận báo cáo phân tích hiệu suất tuần do AI tổng hợp tự động mỗi sáng thứ Hai.'
        : 'Track sprint velocity metrics and receive automated AI performance retrospectives every Monday morning.',
      icon: TrendingUp,
      badge: isVietnamese ? 'Đo lường ROI' : 'Measure ROI'
    }
  ], [isVietnamese]);

  // Dynamic Pricing Plans
  const pricingPlans = useMemo(() => [
    {
      id: 'free' as BillingPlan,
      name: 'Free',
      desc: isVietnamese ? 'Dành cho cá nhân bắt đầu chuẩn hóa công việc.' : 'For individuals starting to organize their work.',
      badge: isVietnamese ? 'Bắt đầu miễn phí' : 'Start free',
      highlight: false,
      cta: isVietnamese ? 'Bắt đầu miễn phí' : 'Start for Free',
      features: isVietnamese ? [
        'Tối đa 5 Spaces', 'Task và dự án không giới hạn', 'Board, List và Docs cơ bản', '3 bảng trắng cộng tác', 'Dùng khóa Gemini cá nhân cho AI'
      ] : [
        'Up to 5 Spaces', 'Unlimited tasks and projects', 'Core Board, List, and Docs', '3 collaborative whiteboards', 'Use a personal Gemini key for AI'
      ]
    },
    {
      id: 'starter' as BillingPlan,
      name: 'Starter',
      desc: isVietnamese ? 'Cho nhóm nhỏ cần cộng tác và giao việc chuyên nghiệp.' : 'For small teams that need professional collaboration.',
      badge: isVietnamese ? 'Khởi động nhanh' : 'Get Started',
      highlight: false,
      cta: isVietnamese ? 'Chọn Starter' : 'Choose Starter',
      features: isVietnamese ? [
        'Không giới hạn Spaces và whiteboard', 'Calendar và Gantt', 'AI theo cấu hình workspace', 'Tự động hóa cơ bản', 'Tích hợp thiết yếu'
      ] : [
        'Unlimited spaces and whiteboards', 'Calendar and Gantt', 'Workspace-configured AI', 'Core automation', 'Essential integrations'
      ]
    },
    {
      id: 'pro' as BillingPlan,
      name: 'Pro',
      desc: isVietnamese ? 'Cân bằng tốt nhất giữa AI, vận hành và chi phí.' : 'The best balance of AI, operations, and cost.',
      badge: isVietnamese ? 'Lựa chọn hàng đầu 🔥' : 'Most Popular 🔥',
      highlight: true,
      cta: isVietnamese ? 'Chọn Pro' : 'Choose Pro',
      features: isVietnamese ? [
        'Toàn bộ Starter', 'Apexa AI và báo cáo nâng cao', 'CRM, ERP và Finance workspace', 'Tự động hóa nâng cao', 'Time tracking, export và khách mời'
      ] : [
        'Everything in Starter', 'Apexa AI and advanced reporting', 'CRM, ERP, and Finance workspaces', 'Advanced automation', 'Time tracking, export, and guests'
      ]
    },
    {
      id: 'business' as BillingPlan,
      name: 'Business',
      desc: isVietnamese ? 'Quản trị và mở rộng cho nhiều phòng ban.' : 'Governance and scale for multiple departments.',
      badge: isVietnamese ? 'Mở rộng tổ chức' : 'Scale Up',
      highlight: false,
      cta: isVietnamese ? 'Chọn Business' : 'Choose Business',
      features: isVietnamese ? [
        'Toàn bộ Pro', 'Phân quyền và nhiều workspace nâng cao', 'Portfolio, workload và audit log', 'API, webhook và AI quota cao', 'Hỗ trợ ưu tiên'
      ] : [
        'Everything in Pro', 'Advanced permissions and workspaces', 'Portfolio, workload, and audit log', 'API, webhooks, and higher AI quota', 'Priority support'
      ]
    },
    {
      id: 'enterprise' as BillingPlan,
      name: 'Enterprise',
      desc: isVietnamese ? 'Bảo mật, triển khai và SLA được thiết kế riêng.' : 'Tailored security, deployment, and SLA.',
      badge: isVietnamese ? 'Tùy chỉnh riêng' : 'Custom Tailored',
      highlight: false,
      cta: isVietnamese ? 'Liên hệ tư vấn' : 'Contact Enterprise Team',
      features: isVietnamese ? [
        'Toàn bộ Business', 'Đánh giá kiến trúc và phân quyền', 'Chính sách dữ liệu theo yêu cầu', 'SLA và onboarding theo hợp đồng', 'Đầu mối triển khai chuyên trách'
      ] : [
        'Everything in Business', 'Architecture and access-control review', 'Contract-defined data policies', 'Contract-defined SLA and onboarding', 'Dedicated implementation contact'
      ]
    }
  ], [isVietnamese]);

  // Representative deployment scenarios. These are product use cases, not customer endorsements.
  const testimonials = useMemo(() => [
    {
      quote: isVietnamese
        ? "Đội sản phẩm có thể gom backlog, sprint, tài liệu PRD và thảo luận vào một workspace; mỗi thay đổi đều cập nhật cùng ngữ cảnh thay vì rơi rớt giữa nhiều công cụ."
        : "Product teams can keep backlog, sprints, PRDs, and discussions in one workspace, preserving context instead of scattering updates across separate tools.",
      author: isVietnamese ? "Đội phát triển sản phẩm" : "Product delivery team",
      role: isVietnamese ? "Kịch bản triển khai" : "Deployment scenario",
      company: "Tasks · Docs · Chat",
      metric: isVietnamese ? "Một nguồn dữ liệu" : "One source of truth",
      avatar: "PM",
      gradient: "from-blue-600 to-indigo-600"
    },
    {
      quote: isVietnamese
        ? "Nhóm marketing có thể theo dõi lead trong CRM, lập lịch chiến dịch, quản lý nội dung và dùng AI phân rã kế hoạch thành các đầu việc có thể giao ngay."
        : "Marketing teams can track leads in CRM, schedule campaigns, manage content, and use AI to break plans into assignable tasks.",
      author: isVietnamese ? "Nhóm tăng trưởng & marketing" : "Growth and marketing team",
      role: isVietnamese ? "Kịch bản triển khai" : "Deployment scenario",
      company: "CRM · Calendar · AI",
      metric: isVietnamese ? "Luồng làm việc liền mạch" : "Connected workflow",
      avatar: "GM",
      gradient: "from-blue-600 to-cyan-600"
    },
    {
      quote: isVietnamese
        ? "Bộ phận vận hành có thể nối ERP, tài chính, mục tiêu và báo cáo trên cùng hệ thống để theo dõi công việc từ kế hoạch đến kết quả."
        : "Operations teams can connect ERP, finance, goals, and reporting in the same system to follow work from plan to outcome.",
      author: isVietnamese ? "Bộ phận vận hành" : "Operations team",
      role: isVietnamese ? "Kịch bản triển khai" : "Deployment scenario",
      company: "ERP · Finance · Goals",
      metric: isVietnamese ? "Theo dõi đầu-cuối" : "End-to-end visibility",
      avatar: "OP",
      gradient: "from-cyan-600 to-blue-600"
    }
  ], [isVietnamese]);

  // Dynamic FAQs
  const faqs = useMemo(() => [
    {
      q: isVietnamese
        ? 'Apexa OS có thể sử dụng mượt mà khi mất kết nối Internet (Offline) không?'
        : 'Can Apexa OS work seamlessly when offline without internet connectivity?',
      a: isVietnamese
        ? 'Apexa lưu nhiều trạng thái làm việc trên thiết bị và có hàng đợi đồng bộ cho các luồng cốt lõi. Khả năng ngoại tuyến phụ thuộc từng phân hệ; các tính năng cloud như AI, thanh toán và cộng tác thời gian thực vẫn cần kết nối mạng.'
        : 'Apexa stores many working states on-device and queues core sync operations. Offline support varies by module; cloud AI, billing, and real-time collaboration still require a network connection.'
    },
    {
      q: isVietnamese
        ? 'Dữ liệu dự án và thông tin của công ty tôi được bảo mật như thế nào?'
        : 'How is our company data protected and secured?',
      a: isVietnamese
        ? 'Apexa sử dụng HTTPS khi triển khai production, tách khóa bí mật khỏi trình duyệt và áp dụng Row Level Security để cô lập dữ liệu theo tài khoản/workspace. Khi gọi AI, nội dung cần xử lý được gửi tới Gemini theo cấu hình của đơn vị triển khai. Xem Trung tâm bảo mật để biết rõ phạm vi kiểm soát và trách nhiệm.'
        : 'Apexa uses HTTPS in production, keeps secret keys out of browser bundles, and applies Row Level Security to isolate account/workspace data. When you invoke AI, required content is sent to Gemini under the operator’s configuration. See the Security Center for controls and responsibilities.'
    },
    {
      q: isVietnamese
        ? 'Tôi có thể chuyển dữ liệu từ các công cụ quản lý công việc khác sang Apexa không?'
        : 'Can I import workspace data from other project management tools?',
      a: isVietnamese
        ? 'Apexa hiện hỗ trợ xuất dữ liệu workspace. Nhập tự động từ công cụ khác chưa được mở như một luồng self-service; với dữ liệu cần chuyển đổi, hãy liên hệ đội triển khai để thống nhất định dạng và ánh xạ.'
        : 'Apexa currently supports workspace export. Automated self-service import from other tools is not yet available; contact the deployment team to agree on format and field mapping for migrations.'
    },
    {
      q: isVietnamese
        ? 'Apexa AI hỗ trợ tiếng Việt và tiếng Anh như thế nào?'
        : 'How fluent is Apexa AI in both Vietnamese and English?',
      a: isVietnamese
        ? 'Apexa Brain sử dụng Gemini và được thiết kế để nhận yêu cầu, trả lời bằng tiếng Việt hoặc tiếng Anh theo ngôn ngữ người dùng. Chất lượng đầu ra phụ thuộc mô hình, ngữ cảnh và nội dung đầu vào.'
        : 'Apexa Brain uses Gemini and is designed to follow the user’s language in Vietnamese or English. Output quality depends on the selected model, context, and input.'
    },
    {
      q: isVietnamese
        ? 'Các gói Free, Starter, Pro và Business hoạt động như thế nào?'
        : 'How do the Free, Starter, Pro, and Business plans work?',
      a: isVietnamese
        ? 'Bạn có thể bắt đầu với Free không cần thẻ tín dụng, sau đó chọn Starter, Pro hoặc Business theo quy mô. PayOS hiển thị số tiền chính thức và hỗ trợ VietQR; gói trả trước không tự động gia hạn.'
        : 'Start on Free without a credit card, then choose Starter, Pro, or Business as your team grows. PayOS shows the final amount and supports VietQR; prepaid plans do not auto-renew.'
    }
  ], [isVietnamese]);

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
    if (planId === 'free') return { value: isVietnamese ? '0 ₫' : '$0', suffix: isVietnamese ? '/ gói Free' : '/ Free plan' };
    if (planId === 'enterprise') return { value: isVietnamese ? 'Liên hệ' : 'Custom', suffix: isVietnamese ? '/ tùy biến SLA' : '/ tailored SLA' };
    const paidPlan = planId as SelfServeBillingPlan;
    const price = billingPrices[paidPlan]?.[billingCycle];
    const unitAmount = price?.unit_amount ?? SUGGESTED_PRICES[paidPlan][billingCycle];
    const monthlyAmount = unitAmount / (billingCycle === 'yearly' ? 12 * (price?.interval_count || 1) : (price?.interval_count || 1));
    const currency = price?.currency || 'usd';
    const divisor = ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase()) ? 1 : 100;
    return {
      value: new Intl.NumberFormat(isVietnamese ? 'vi-VN' : 'en-US', { style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: 0 }).format(monthlyAmount / divisor),
      suffix: isVietnamese ? '/ người / tháng' : '/ user / month'
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

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden bg-[#fafbfc] dark:bg-[#07090e] transition-colors duration-300 font-sans text-slate-800 dark:text-slate-100 selection:bg-blue-500 selection:text-white">
      
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
      <div className="relative z-50 overflow-hidden border-b border-white/10 bg-[#06080d]/95 backdrop-blur-md py-2 select-none group/marquee">
        {/* Left & Right Smooth Edge Fade Overlays */}
        <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-20 bg-gradient-to-r from-[#06080d] via-[#06080d]/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-20 bg-gradient-to-l from-[#06080d] via-[#06080d]/80 to-transparent z-10 pointer-events-none" />

        {/* Marquee Inner Track */}
        <div className="animate-marquee flex items-center gap-8 sm:gap-12">
          {[...announcementItems, ...announcementItems].map((item, index) => (
            <div key={`${item.id}-${index}`} className="flex items-center gap-2 sm:gap-3 shrink-0 text-[10px] sm:text-[11px] font-extrabold text-white">
              <Badge variant={item.badgeVariant} dot size="sm" className="shrink-0 font-black">
                {item.badge}
              </Badge>
              <span className="text-slate-200 font-medium">
                {item.text}
              </span>
              <button
                onClick={item.action}
                className="text-sky-400 hover:text-sky-300 font-bold underline cursor-pointer inline-flex items-center gap-1 shrink-0 ml-1 transition-colors group-hover/marquee:underline-offset-2"
              >
                <span>{item.cta}</span>
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </button>
              <span className="text-slate-700 mx-2 text-xs font-light">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* FLOATING ISLAND HEADER NAVBAR (SHOTS STYLE) */}
      <header className="sticky top-2 z-50 mx-auto max-w-6xl px-3 sm:top-3 sm:px-4">
        <div className="shots-dock flex items-center justify-between px-3 py-2.5 transition-all sm:px-4">
          
          {/* Brand Logo */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer select-none group" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 via-sky-500 to-indigo-700 p-0.5 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" viewBox="0 0 512 512" fill="none">
                <path
                  d="M256 84 C264 84 271 89 275 97 L405 375 C409 383 403 394 394 394 L325 394 C317 394 309 389 306 381 L278 322 L234 322 L206 381 C203 389 195 394 187 394 L118 394 C109 394 103 383 107 375 L237 97 C241 89 248 84 256 84 Z M256 182 L226 270 L286 270 Z"
                  fill="#FFFFFF"
                />
                <polygon points="218,296 294,296 284,316 228,316" fill="#38BDF8" />
              </svg>
            </div>
            <span className="font-display font-black text-lg tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              Apexa
              <Badge variant="shots" size="sm">OS</Badge>
            </span>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: isVietnamese ? 'Tính năng' : 'Features', id: 'features' },
              { label: isVietnamese ? 'So sánh' : 'Comparison', id: 'comparison' },
              { label: isVietnamese ? 'Tính ROI' : 'ROI Calculator', id: 'roi' },
              { label: isVietnamese ? 'Quy trình' : 'Workflow', id: 'how-it-works' },
              { label: isVietnamese ? 'Bảng giá' : 'Pricing', id: 'pricing' },
              { label: isVietnamese ? 'Kịch bản' : 'Scenarios', id: 'testimonials' },
              { label: isVietnamese ? 'Hỏi đáp' : 'FAQ', id: 'faq' }
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-full transition-all cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageDropdown size="sm" />
            <ThemeSwitch size="sm" />
            <div className="hidden sm:block">
              <Button variant="ghost" size="sm" pill onClick={onSignIn}>
                {isVietnamese ? 'Đăng nhập' : 'Sign in'}
              </Button>
            </div>
            <div className="hidden sm:block">
              <Button variant="shots" size="sm" pill onClick={onSignUp} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
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
            className="md:hidden mt-2 p-4 shots-glass-card rounded-3xl space-y-2 select-none text-left"
          >
            {[
              { id: 'features', label: isVietnamese ? 'Tính năng' : 'Features' },
              { id: 'comparison', label: isVietnamese ? 'So sánh công cụ' : 'Comparison' },
              { id: 'roi', label: isVietnamese ? 'Tính toán ROI' : 'ROI Calculator' },
              { id: 'how-it-works', label: isVietnamese ? 'Quy trình' : 'Workflow' },
              { id: 'pricing', label: isVietnamese ? 'Bảng giá' : 'Pricing' },
              { id: 'testimonials', label: isVietnamese ? 'Kịch bản' : 'Scenarios' },
              { id: 'faq', label: isVietnamese ? 'Hỏi đáp' : 'FAQ' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="block w-full text-left px-3 py-2 text-xs font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                {item.label}
              </button>
            ))}
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex gap-2">
              <Button variant="outline" size="sm" pill fullWidth onClick={onSignIn}>
                {isVietnamese ? 'Đăng nhập' : 'Sign in'}
              </Button>
              <Button variant="shots" size="sm" pill fullWidth onClick={onSignUp}>
                {isVietnamese ? 'Dùng thử' : 'Get Started'}
              </Button>
            </div>
          </motion.div>
        )}
      </header>

      {/* =========================================================================
          HERO SECTION (SHOTS.SO AESTHETIC)
          ========================================================================= */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 pt-10 sm:pt-14 pb-16 lg:pb-24 text-center">
        
        {/* Top Tag */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 mb-6"
        >
          <div className="group relative inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-indigo-500/25 dark:border-indigo-400/30 bg-indigo-50/70 dark:bg-indigo-950/40 backdrop-blur-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-[0_2px_15px_rgba(99,102,241,0.12)] hover:border-indigo-500/40 hover:shadow-[0_4px_20px_rgba(99,102,241,0.2)] transition-all cursor-default select-none">
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-600 dark:bg-indigo-400" />
            </span>
            <span className="tracking-tight">{isVietnamese ? 'Hệ điều hành năng suất Apexa 2026' : 'Apexa Continuous Workspace 2026'}</span>
            <span className="text-[9.5px] font-black uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 text-white dark:from-blue-500 dark:to-indigo-500 px-2 py-0.5 rounded-full shadow-2xs">
              2.0 LIVE
            </span>
          </div>
        </motion.div>

        {/* Hero Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-[76px] font-black tracking-[-0.035em] text-slate-950 dark:text-white leading-[1.08] font-display max-w-5xl mx-auto text-balance"
        >
          {isVietnamese ? (
            <>
              <span>Tập trung tối đa.</span>{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-400 dark:via-sky-300 dark:to-indigo-300 whitespace-nowrap">
                Bứt phá năng suất
              </span>{' '}
              <span className="whitespace-nowrap">cùng AI.</span>
            </>
          ) : (
            <>
              <span>Maximum focus.</span>{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 dark:from-blue-400 dark:via-sky-300 dark:to-indigo-300 whitespace-nowrap">
                Supercharge velocity
              </span>{' '}
              <span className="whitespace-nowrap">with AI.</span>
            </>
          )}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="text-slate-600 dark:text-slate-300 text-sm sm:text-lg font-normal leading-relaxed max-w-2xl mx-auto mt-6 text-pretty"
        >
          {isVietnamese
            ? 'Hợp nhất Kanban, Smart Docs, ChatRoom, Lịch biểu và Trợ lý AI Apexa Brain trên một không gian làm việc liền mạch. Không phân mảnh công cụ, độ trễ phản hồi tức thì.'
            : 'Unify Kanban boards, Smart Docs, ChatRooms, Calendars, and Apexa Brain AI on a single continuous canvas. Zero latency, zero tool sprawl.'}
        </motion.p>

        {/* CTA Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-8"
        >
          <Button
            variant="shots"
            size="huge"
            pill
            onClick={onSignUp}
            rightIcon={<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            className="group shadow-[0_10px_30px_rgba(15,23,42,0.22)] dark:shadow-[0_10px_30px_rgba(255,255,255,0.18)]"
          >
            {isVietnamese ? 'Bắt đầu trải nghiệm miễn phí' : 'Start for Free Today'}
          </Button>

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

        {/* Product readiness summary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-9 text-xs font-bold text-slate-500 dark:text-slate-400"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {isVietnamese ? 'Có gói miễn phí · Không cần thẻ' : 'Free plan · No card required'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            {isVietnamese ? 'RLS theo workspace · Local-first' : 'Workspace RLS · Local-first'}
          </span>
        </motion.div>

        {/* Realistic In-App Workspace Showcase */}
        <div className="mt-12 sm:mt-16 max-w-6xl mx-auto">
          <ApexaWorkspaceShowcase onSignUp={onSignUp} />
        </div>

      </section>

      {/* =========================================================================
          MARQUEE LOGOS STRIP
          ========================================================================= */}
      <section className="relative z-10 border-y border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md py-6 overflow-hidden select-none">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <p className="text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
            {isVietnamese ? 'Một workspace kết nối toàn bộ quy trình vận hành' : 'One workspace connecting your complete operating flow'}
          </p>
          <div className="overflow-hidden w-full relative py-1">
            <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-[#fafbfc] dark:from-[#07090e] to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-[#fafbfc] dark:from-[#07090e] to-transparent z-10 pointer-events-none" />
            <motion.div
              animate={{ x: [0, -1200] }}
              transition={{ ease: "linear", duration: 32, repeat: Infinity }}
              className="flex gap-20 w-max whitespace-nowrap px-4"
            >
              {doubledLogos.map((logo, index) => (
                <span key={index} className="text-sm font-black text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-sky-400 transition-colors flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500/60" />
                  {logo}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          STATS SUMMARY COUNTER CARDS
          ========================================================================= */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-14 lg:py-20">
        <FadeInSection>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { value: 18, suffix: '+', label: isVietnamese ? 'Phân hệ làm việc tích hợp' : 'Integrated work modules', icon: LayoutGrid, color: 'text-blue-600 dark:text-sky-400' },
              { value: 5, suffix: '', label: isVietnamese ? 'Chế độ xem công việc' : 'Task view modes', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
              { value: 2, suffix: '', label: isVietnamese ? 'Ngôn ngữ Việt & Anh' : 'Vietnamese & English', icon: Globe, color: 'text-indigo-600 dark:text-indigo-400' },
              { value: 1, suffix: '', label: isVietnamese ? 'Workspace thống nhất' : 'Unified workspace', icon: Zap, color: 'text-amber-600 dark:text-amber-400' },
            ].map((stat, i) => (
              <div key={i} className="shots-glass-card rounded-3xl p-6 sm:p-7 text-center space-y-2">
                <div className={`w-11 h-11 rounded-2xl bg-slate-200/70 dark:bg-white/10 ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white font-display">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} decimals={0} />
                </div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </FadeInSection>
      </section>

      {/* =========================================================================
          FEATURE SHOWCASE (SHOTS.SO BENTO GRID)
          ========================================================================= */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-white/10">
        <FadeInSection>
          <div className="text-center space-y-3 max-w-3xl mx-auto mb-12">
            <Badge variant="shots-new" dot>{isVietnamese ? 'TÍNH NĂNG ĐỈNH CAO' : 'ALL-IN-ONE POWER'}</Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-display text-balance">
              {isVietnamese ? 'Mọi công cụ đội ngũ cần trên một giao diện' : 'Every team tool unified on one continuous canvas'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium text-pretty">
              {isVietnamese
                ? 'Không cần trả phí riêng cho 5 ứng dụng khác nhau. Apexa OS tích hợp hoàn chỉnh và đồng bộ từng byte dữ liệu.'
                : 'Replace subscriptions for 5 disconnected tools. Apexa OS integrates tasks, docs, chat, and AI in perfect harmony.'}
            </p>

            {/* Category Filter */}
            <div className="flex flex-wrap justify-center gap-2 pt-4">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-md scale-105'
                      : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-white/10 hover:scale-102'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredFeatures.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="shots-glass-card rounded-3xl p-6 flex flex-col justify-between text-left group hover:border-indigo-500/30 transition-all"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className={`w-11 h-11 rounded-2xl ${feat.bg} flex items-center justify-center ${feat.iconColor} border border-white/10 group-hover:scale-110 transition-transform shadow-xs`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <Badge variant={feat.tagVariant} size="sm">
                        {feat.badge}
                      </Badge>
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">{feat.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed text-pretty">{feat.desc}</p>
                  </div>
                  
                  <div className="pt-4 mt-4 border-t border-slate-200/60 dark:border-white/5 flex items-center gap-1.5 text-xs font-black text-blue-600 dark:text-sky-400">
                    <span>{isVietnamese ? 'Khám phá ngay' : 'Learn more'}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </FadeInSection>
      </section>

      {/* =========================================================================
          COMPARISON MATRIX (APEXA OS VS TRADITIONAL STACK)
          ========================================================================= */}
      <section id="comparison" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-white/10">
        <FadeInSection>
          <div className="text-center space-y-3 max-w-3xl mx-auto mb-12">
            <Badge variant="shots">{isVietnamese ? 'MỨC ĐỘ TÍCH HỢP' : 'INTEGRATION OVERVIEW'}</Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-display text-balance">
              {isVietnamese ? 'Tại sao các đội ngũ chọn Apexa OS?' : 'Why fast-moving teams switch to Apexa OS'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium text-pretty">
              {isVietnamese
                ? 'Xem xét sự khác biệt khi toàn bộ quy trình làm việc được tối ưu trên kiến trúc Local-First & AI Native.'
                : 'See the structural advantage of a truly unified, Local-First, AI-Native platform over legacy fragmented tools.'}
            </p>
          </div>

          <ComparisonMatrix />
        </FadeInSection>
      </section>

      {/* =========================================================================
          INTERACTIVE ROI & TIME SAVINGS CALCULATOR
          ========================================================================= */}
      <section id="roi" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-white/10">
        <FadeInSection>
          <div className="text-center space-y-3 max-w-3xl mx-auto mb-12">
            <Badge variant="shots-new" dot>{isVietnamese ? 'TÍNH TOÁN HIỆU QUẢ' : 'ROI ESTIMATOR'}</Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-display text-balance">
              {isVietnamese ? 'Đo lường thời gian & chi phí tiết kiệm' : 'Quantify your time and cost savings'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium text-pretty">
              {isVietnamese
                ? 'Không chỉ là cảm giác nhanh hơn — Apexa mang lại hiệu quả đầu tư rõ ràng bằng con số thực tế.'
                : 'Not just a subjective feel—Apexa delivers concrete, measurable productivity returns for your business.'}
            </p>
          </div>

          <RoiCalculator />
        </FadeInSection>
      </section>

      {/* =========================================================================
          WORKFLOW PROCESS (4 STEPS)
          ========================================================================= */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-white/10">
        <FadeInSection>
          <div className="text-center space-y-3 max-w-3xl mx-auto mb-14">
            <Badge variant="shots">{isVietnamese ? 'QUY TRÌNH CHUẨN HOÁ' : 'HOW IT WORKS'}</Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-display text-balance">
              {isVietnamese ? 'Vận hành trơn tru chỉ với 4 bước' : 'Seamless workflow in 4 simple steps'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium text-pretty">
              {isVietnamese
                ? 'Dễ dàng thiết lập và đồng bộ toàn bộ thành viên chỉ trong 1 buổi làm việc.'
                : 'Set up departmental spaces and onboard your entire team in minutes.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {workflowSteps.map((step) => {
              const StepIcon = step.icon;
              return (
                <div key={step.step} className="shots-glass-card rounded-3xl p-6 text-left space-y-4 group hover:border-indigo-500/30 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{step.step}</span>
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-white/10 text-blue-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                      <StepIcon className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-blue-600 dark:text-sky-400">{step.badge}</span>
                    <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight mt-1">{step.title}</h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed text-pretty">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </FadeInSection>
      </section>

      {/* =========================================================================
          PRICING PLANS
          ========================================================================= */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-white/10">
        <FadeInSection>
          <div className="text-center space-y-3 max-w-3xl mx-auto mb-12">
            <Badge variant="shots-new" dot>{isVietnamese ? 'BẢNG GIÁ MINH BẠCH' : 'TRANSPARENT PRICING'}</Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-display text-balance">
              {isVietnamese ? 'Đầu tư thông minh, tối ưu ngân sách' : 'Invest smart, maximize team velocity'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium text-pretty">
              {isVietnamese
                ? 'Không chi phí ẩn. Nâng cấp hoặc hạ cấp gói bất cứ khi nào theo nhu cầu phát triển.'
                : 'Zero hidden fees. Upgrade, downgrade, or cancel anytime as your team grows.'}
            </p>

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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 items-stretch">
            {pricingPlans.map(plan => {
              const price = formatPrice(plan.id);
              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-8 flex flex-col justify-between text-left relative transition-all ${
                    plan.highlight
                      ? 'shots-glass-panel border-2 border-blue-500 shadow-2xl shadow-blue-500/20 xl:scale-[1.035] z-10'
                      : 'shots-glass-card hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <Badge variant={plan.highlight ? 'shots-new' : 'shots'} size="sm">
                        {plan.badge}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">{plan.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 text-pretty">{plan.desc}</p>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight font-display">{price.value}</span>
                      {price.suffix && <span className="text-xs text-slate-400 font-bold">{price.suffix}</span>}
                    </div>

                    <div className="space-y-2.5 pt-4 border-t border-slate-200/60 dark:border-white/10">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant={plan.highlight ? 'shots' : 'secondary'}
                    size="lg"
                    pill
                    fullWidth
                    onClick={() => startPlan(plan.id)}
                    className="mt-8"
                  >
                    {plan.cta}
                  </Button>
                </div>
              );
            })}
          </div>
        </FadeInSection>
      </section>

      {/* =========================================================================
          TESTIMONIALS
          ========================================================================= */}
      <section id="testimonials" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-white/10">
        <FadeInSection>
          <div className="text-center space-y-3 max-w-3xl mx-auto mb-12">
            <Badge variant="shots">{isVietnamese ? 'KỊCH BẢN TRIỂN KHAI' : 'DEPLOYMENT SCENARIOS'}</Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-display text-balance">
              {isVietnamese ? 'Apexa thích ứng theo cách đội ngũ vận hành' : 'Apexa adapts to how your team operates'}
            </h2>
          </div>

          <div className="max-w-4xl mx-auto shots-glass-card rounded-3xl p-8 md:p-12 text-left shadow-lg">
            <Quote className="w-10 h-10 text-blue-500/25 mb-4" />
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <p className="text-base md:text-xl text-slate-900 dark:text-slate-100 font-extrabold leading-relaxed text-pretty">
                  {testimonials[activeTestimonial].quote}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200/60 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${testimonials[activeTestimonial].gradient} text-white font-black text-xs flex items-center justify-center shadow-md`}>
                      {testimonials[activeTestimonial].avatar}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        {testimonials[activeTestimonial].author}
                        <Badge variant="success" size="sm">{testimonials[activeTestimonial].metric}</Badge>
                      </h4>
                      <p className="text-xs text-slate-400 font-semibold">{testimonials[activeTestimonial].role} · {testimonials[activeTestimonial].company}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handlePrevTestimonial}
                      className="p-2 rounded-full border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      aria-label={isVietnamese ? 'Kịch bản trước' : 'Previous scenario'}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNextTestimonial}
                      className="p-2 rounded-full border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      aria-label={isVietnamese ? 'Kịch bản tiếp theo' : 'Next scenario'}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </FadeInSection>
      </section>

      {/* =========================================================================
          FAQ ACCORDION
          ========================================================================= */}
      <section id="faq" className="relative z-10 max-w-4xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-white/10 text-left">
        <FadeInSection>
          <div className="text-center space-y-3 max-w-3xl mx-auto mb-12">
            <Badge variant="shots">{isVietnamese ? 'HỎI ĐÁP' : 'FAQ'}</Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-display text-balance">
              {isVietnamese ? 'Các câu hỏi thường gặp' : 'Frequently asked questions'}
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="shots-glass-card rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-5 text-left text-sm font-extrabold text-slate-900 dark:text-white flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180 text-blue-500' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed border-t border-slate-200/60 dark:border-white/10 pt-3 text-pretty">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </FadeInSection>
      </section>

      {/* =========================================================================
          FINAL HIGH-IMPACT CALL TO ACTION
          ========================================================================= */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 pb-20">
        <FadeInSection>
          <div className="relative rounded-3xl shots-gradient-tahoe p-8 md:p-16 text-center text-white overflow-hidden shadow-2xl">
            <div className="space-y-6 relative z-10 max-w-2xl mx-auto">
              <Badge variant="shots" size="md" className="bg-white/20 text-white border-white/30 backdrop-blur-md">
                {isVietnamese ? 'BẮT ĐẦU HÀNH TRÌNH MỚI' : 'START YOUR JOURNEY'}
              </Badge>
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight font-display leading-tight text-balance">
                {isVietnamese ? 'Sẵn sàng kiến tạo văn hóa năng suất đỉnh cao?' : 'Ready to build a peak productivity culture?'}
              </h2>
              <p className="text-xs sm:text-sm font-medium text-white/90 leading-relaxed text-pretty">
                {isVietnamese
                  ? 'Đăng ký tài khoản Apexa OS để kết nối công việc, tài liệu và cộng tác trong một workspace có trợ lý AI.'
                  : 'Get started with Apexa OS today and unleash your team’s full potential with next-gen collaborative AI.'}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3">
                <Button
                  variant="shots"
                  size="huge"
                  pill
                  onClick={onSignUp}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {isVietnamese ? 'Bắt đầu với gói miễn phí' : 'Start with the Free plan'}
                </Button>
                <Button
                  variant="glass"
                  size="huge"
                  pill
                  onClick={onSignIn}
                  className="bg-black/30 border-white/20 text-white hover:bg-black/40"
                >
                  {isVietnamese ? 'Đăng nhập tài khoản' : 'Sign in to Workspace'}
                </Button>
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
