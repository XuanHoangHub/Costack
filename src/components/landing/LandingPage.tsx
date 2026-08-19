"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import {
  Kanban, Sparkles, ArrowRight, Star, Menu, X,
  Brain, FileText, MessageSquare, Calendar, BarChart3, Timer,
  Database, Users, Zap, Shield, Check, Play, Quote,
  LayoutGrid, Search, Mail, ListTodo,
  ChevronRight, ChevronLeft, ChevronDown, Send, Bot, CheckSquare, Plus,
  HelpCircle, ArrowUpRight, Globe, ShieldCheck, Flame, Layers,
  Cpu, Clock, Sliders, Workflow, TrendingUp, CheckCircle2, Lock,
  Share2, Award, Activity, Sparkle, RefreshCw, Eye, ThumbsUp, Moon, Sun,
  Laptop, Smartphone, Square, Palette, MousePointer
} from 'lucide-react';
import ThemeSwitch from '../ThemeSwitch';
import LanguageDropdown from '../LanguageDropdown';
import { Button, Badge, SegmentedControl, MockupFrame } from '../ui';
import type { MockupDevice, MockupBackground } from '../ui/MockupFrame';
import { useTranslation } from '@/contexts/TranslationContext';

interface LandingPageProps {
  onSignUp: () => void;
  onSignIn: () => void;
  activeUsers: number;
  tasksCompleted: number;
}

interface MockTask {
  id: string;
  title: string;
  column: 'todo' | 'inprogress' | 'done';
  priority: 'Khẩn cấp' | 'Cao' | 'Trung bình' | 'Thấp' | 'Urgent' | 'High' | 'Normal' | 'Low';
  dueDate: string;
  assignee: string;
  tag: string;
  checked?: boolean;
}

type PublicBillingPrice = {
  unit_amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  interval_count: number;
};

const ZERO_DECIMAL_CURRENCIES = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf']);

const TRUSTED_LOGOS = [
  'TechVanguard', 'InnovateX', 'Nexus Global', 'Aether Labs', 'HyperScale', 'Pulse Digital', 'CyberCore', 'AlphaMetrics'
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
   SHOTS.SO INSPIRED INTERACTIVE PRODUCT STUDIO
   ========================================================================= */
function ShotsInteractiveStudio() {
  const { isVietnamese } = useTranslation();
  const [activeDevice, setActiveDevice] = useState<MockupDevice>('browser');
  const [activeBg, setActiveBg] = useState<MockupBackground>('tahoe');
  const [activeTab, setActiveTab] = useState<'board' | 'ai' | 'docs' | 'chat' | 'gantt'>('board');

  // Interactive mock tasks
  const [tasks, setTasks] = useState<MockTask[]>(() => isVietnamese ? [
    { id: '1', title: 'Thiết kế giao diện phẳng Continuous Unified Canvas', column: 'done', priority: 'Khẩn cấp', dueDate: 'Hôm nay', assignee: 'Hoàng Xuân', tag: 'UI/UX', checked: true },
    { id: '2', title: 'Tích hợp Apexa Brain AI Gemini 2.5 Copilot', column: 'inprogress', priority: 'Khẩn cấp', dueDate: '15:00', assignee: 'Apexa AI', tag: 'AI Engine', checked: false },
    { id: '3', title: 'Tối ưu hóa Local-First DB đạt độ trễ < 16ms', column: 'inprogress', priority: 'Cao', dueDate: 'Ngày mai', assignee: 'Minh Anh', tag: 'Core', checked: false },
    { id: '4', title: 'Đồng bộ 2 chiều Google Calendar & Lịch biểu', column: 'todo', priority: 'Trung bình', dueDate: '18/08', assignee: 'Quốc Bảo', tag: 'Integration', checked: false },
  ] : [
    { id: '1', title: 'Design Continuous Unified Canvas interface', column: 'done', priority: 'Urgent', dueDate: 'Today', assignee: 'Alex J.', tag: 'UI/UX', checked: true },
    { id: '2', title: 'Integrate Apexa Brain AI Gemini 2.5 Copilot', column: 'inprogress', priority: 'Urgent', dueDate: '3:00 PM', assignee: 'Apexa AI', tag: 'AI Engine', checked: false },
    { id: '3', title: 'Optimize Local-First DB for < 16ms latency', column: 'inprogress', priority: 'High', dueDate: 'Tomorrow', assignee: 'Sarah M.', tag: 'Core', checked: false },
    { id: '4', title: '2-way synchronization with Google Calendar', column: 'todo', priority: 'Normal', dueDate: 'Aug 18', assignee: 'David K.', tag: 'Integration', checked: false },
  ]);

  useEffect(() => {
    setTasks(isVietnamese ? [
      { id: '1', title: 'Thiết kế giao diện phẳng Continuous Unified Canvas', column: 'done', priority: 'Khẩn cấp', dueDate: 'Hôm nay', assignee: 'Hoàng Xuân', tag: 'UI/UX', checked: true },
      { id: '2', title: 'Tích hợp Apexa Brain AI Gemini 2.5 Copilot', column: 'inprogress', priority: 'Khẩn cấp', dueDate: '15:00', assignee: 'Apexa AI', tag: 'AI Engine', checked: false },
      { id: '3', title: 'Tối ưu hóa Local-First DB đạt độ trễ < 16ms', column: 'inprogress', priority: 'Cao', dueDate: 'Ngày mai', assignee: 'Minh Anh', tag: 'Core', checked: false },
      { id: '4', title: 'Đồng bộ 2 chiều Google Calendar & Lịch biểu', column: 'todo', priority: 'Trung bình', dueDate: '18/08', assignee: 'Quốc Bảo', tag: 'Integration', checked: false },
    ] : [
      { id: '1', title: 'Design Continuous Unified Canvas interface', column: 'done', priority: 'Urgent', dueDate: 'Today', assignee: 'Alex J.', tag: 'UI/UX', checked: true },
      { id: '2', title: 'Integrate Apexa Brain AI Gemini 2.5 Copilot', column: 'inprogress', priority: 'Urgent', dueDate: '3:00 PM', assignee: 'Apexa AI', tag: 'AI Engine', checked: false },
      { id: '3', title: 'Optimize Local-First DB for < 16ms latency', column: 'inprogress', priority: 'High', dueDate: 'Tomorrow', assignee: 'Sarah M.', tag: 'Core', checked: false },
      { id: '4', title: '2-way synchronization with Google Calendar', column: 'todo', priority: 'Normal', dueDate: 'Aug 18', assignee: 'David K.', tag: 'Integration', checked: false },
    ]);
  }, [isVietnamese]);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [aiChatLog, setAiChatLog] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>(() => [
    {
      sender: 'bot',
      text: isVietnamese 
        ? '👋 Xin chào! Tôi là Apexa Brain. Tôi đã phân tích toàn bộ bối cảnh Sprint: Đội ngũ đang hoàn thành 60% kế hoạch. Bạn muốn tạo task mới hay xuất báo cáo tiến độ?'
        : '👋 Hello! I am Apexa Brain. I analyzed your Sprint context: the team is at 60% progress. Would you like to create new tasks or generate a progress report?',
      time: '09:00'
    }
  ]);

  useEffect(() => {
    setAiChatLog([
      {
        sender: 'bot',
        text: isVietnamese 
          ? '👋 Xin chào! Tôi là Apexa Brain. Tôi đã phân tích toàn bộ bối cảnh Sprint: Đội ngũ đang hoàn thành 60% kế hoạch. Bạn muốn tạo task mới hay xuất báo cáo tiến độ?'
          : '👋 Hello! I am Apexa Brain. I analyzed your Sprint context: the team is at 60% progress. Would you like to create new tasks or generate a progress report?',
        time: '09:00'
      }
    ]);
  }, [isVietnamese]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChatLog, aiTyping]);

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextChecked = !t.checked;
        return {
          ...t,
          checked: nextChecked,
          column: nextChecked ? 'done' : 'inprogress'
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
      assignee: isVietnamese ? 'Bạn' : 'You',
      tag: isVietnamese ? 'Mới' : 'New'
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
        ? '✨ Đã phân tích yêu cầu của bạn và cập nhật vào hệ thống thành công!'
        : '✨ Analyzed your request and updated the workspace successfully!';
      
      const lower = query.toLowerCase();
      if (lower.includes('sprint') || lower.includes('kế hoạch') || lower.includes('plan') || lower.includes('task')) {
        botResponse = isVietnamese
          ? '🎯 Đã tự động tạo 2 đầu việc ưu tiên cho Sprint:\n1. [Khẩn cấp] Tối ưu hóa bộ nhớ đệm Local-First.\n2. [Cao] Kết nối Supabase Realtime Channel.'
          : '🎯 Automatically generated 2 prioritized Sprint items:\n1. [Urgent] Optimize Local-First caching layer.\n2. [High] Establish Supabase Realtime Channel.';
        setTasks(prev => [
          {
            id: Date.now().toString(),
            title: isVietnamese ? '⚡ [AI Auto] Tối ưu bộ nhớ đệm Local-First' : '⚡ [AI Auto] Optimize Local-First caching',
            column: 'inprogress',
            priority: isVietnamese ? 'Khẩn cấp' : 'Urgent',
            dueDate: isVietnamese ? 'Hôm nay' : 'Today',
            assignee: 'Apexa AI',
            tag: 'AI Action'
          },
          ...prev
        ]);
      } else if (lower.includes('báo cáo') || lower.includes('tiến độ') || lower.includes('report') || lower.includes('status')) {
        const doneCount = tasks.filter(t => t.column === 'done').length;
        const total = tasks.length || 1;
        const rate = Math.round((doneCount / total) * 100);
        botResponse = isVietnamese
          ? `📊 Báo cáo nhanh Sprint #14:\n• Tổng số task: ${total}\n• Tỷ lệ hoàn thành: ${rate}%\n• Không phát hiện rủi ro trễ hạn.`
          : `📊 Sprint #14 Quick Summary:\n• Total tasks: ${total}\n• Completion rate: ${rate}%\n• Zero blockers detected.`;
      }
      setAiChatLog(prev => [...prev, { sender: 'bot', text: botResponse, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      setAiTyping(false);
    }, 900);
  };

  const backgrounds: Array<{ id: MockupBackground; name: string; gradient: string }> = [
    { id: 'tahoe', name: 'Tahoe Sky', gradient: 'from-sky-400 via-blue-500 to-indigo-900' },
    { id: 'bigsur', name: 'Big Sur Sunset', gradient: 'from-pink-400 via-indigo-500 to-slate-900' },
    { id: 'aurora', name: 'Aurora Emerald', gradient: 'from-emerald-400 via-cyan-500 to-slate-950' },
    { id: 'midnight', name: 'Midnight Velvet', gradient: 'from-slate-800 via-slate-900 to-black' },
    { id: 'cyber', name: 'Cyber Neon', gradient: 'from-pink-500 via-purple-500 to-slate-950' },
  ];

  return (
    <div className="w-full space-y-3">
      {/* Shots Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm">
        {/* Device Switcher */}
        <div className="flex items-center gap-1">
          <SegmentedControl
            size="sm"
            value={activeDevice}
            onChange={(val) => setActiveDevice(val as MockupDevice)}
            layoutIdPrefix="shotsStudioDevice"
            options={[
              { id: 'browser', label: 'macOS Safari', icon: Laptop },
              { id: 'iphone', label: 'iPhone 16', icon: Smartphone },
              { id: 'glass', label: 'Glass Island', icon: Square },
            ]}
          />
        </div>

        {/* Canvas Background Swatches */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-200/60 dark:bg-slate-800/60 border border-slate-300/60 dark:border-white/10">
          <Palette className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ml-1" />
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mr-1 hidden sm:inline">
            {isVietnamese ? 'Nền:' : 'Canvas:'}
          </span>
          {backgrounds.map((bg) => (
            <button
              key={bg.id}
              onClick={() => setActiveBg(bg.id)}
              title={bg.name}
              className={[
                "w-5 h-5 rounded-full transition-all cursor-pointer bg-gradient-to-tr",
                bg.gradient,
                activeBg === bg.id
                  ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 scale-110"
                  : "hover:scale-105 opacity-80 hover:opacity-100",
              ].join(" ")}
            />
          ))}
        </div>
      </div>

      {/* Main Mockup Frame Viewport */}
      <MockupFrame
        device={activeDevice}
        background={activeBg}
        title="Apexa Continuous Canvas"
        url="app.apexa.ai/sprint-14"
        badge={isVietnamese ? 'Không gian tương tác trực tiếp' : 'Live Interactive Studio'}
        padding="md"
      >
        <div className="w-full text-left font-sans select-none">
          
          {/* Module Selector Tabs inside Mockup */}
          <div className="px-3 sm:px-4 py-2 bg-slate-950/80 border-b border-white/10 flex items-center justify-between overflow-x-auto gap-2">
            <div className="flex items-center gap-1">
              {[
                { id: 'board', label: isVietnamese ? 'Bảng Kanban' : 'Kanban Sprint', icon: Kanban },
                { id: 'ai', label: 'Apexa AI Brain', icon: Bot, isAi: true },
                { id: 'docs', label: isVietnamese ? 'Tài liệu số' : 'Smart Docs', icon: FileText },
                { id: 'chat', label: isVietnamese ? 'Chat nhóm' : 'Team Chat', icon: MessageSquare },
                { id: 'gantt', label: isVietnamese ? 'Biểu đồ Gantt' : 'Gantt Timeline', icon: Calendar }
              ].map(tab => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? tab.isAi
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/30'
                          : 'bg-white text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-3 h-3 ${tab.isAi && !isSelected ? 'text-indigo-400 animate-pulse' : ''}`} />
                    <span>{tab.label}</span>
                    {tab.isAi && (
                      <span className="text-[8px] bg-white/20 text-white px-1.5 py-0.2 rounded-full font-black uppercase">AI</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="hidden md:flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide">
                {isVietnamese ? 'Đồng bộ tức thì' : 'Real-time Sync'}
              </span>
            </div>
          </div>

          {/* Interactive Tab Viewport */}
          <div className="p-3 sm:p-4 h-[380px] overflow-hidden bg-slate-950/60 text-slate-100 relative">
            <AnimatePresence mode="wait">
              
              {/* 1. KANBAN SPRINT */}
              {activeTab === 'board' && (
                <motion.div
                  key="tab-board"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-2.5 h-full overflow-hidden"
                >
                  {[
                    { key: 'todo', label: isVietnamese ? 'Cần làm' : 'To Do', color: 'text-slate-400', dot: 'bg-slate-400' },
                    { key: 'inprogress', label: isVietnamese ? 'Đang làm' : 'In Progress', color: 'text-blue-400', dot: 'bg-blue-500' },
                    { key: 'done', label: isVietnamese ? 'Đã hoàn tất' : 'Done', color: 'text-emerald-400', dot: 'bg-emerald-500' }
                  ].map(col => {
                    const colTasks = tasks.filter(t => t.column === col.key);
                    return (
                      <div key={col.key} className="bg-slate-900/60 border border-white/10 rounded-2xl p-2.5 flex flex-col h-full">
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                            <span className={`text-[10px] font-black uppercase tracking-wider ${col.color}`}>{col.label}</span>
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">
                            {colTasks.length}
                          </span>
                        </div>

                        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                          {colTasks.map(task => (
                            <motion.div
                              layoutId={task.id}
                              key={task.id}
                              className="p-2.5 bg-slate-800/80 hover:bg-slate-800 border border-white/5 rounded-xl shadow-xs transition-all group cursor-pointer"
                            >
                              <div className="flex items-start gap-2">
                                <button
                                  onClick={() => handleToggleTask(task.id)}
                                  className="mt-0.5 w-3.5 h-3.5 rounded border border-slate-500 hover:border-blue-400 flex items-center justify-center bg-slate-900 transition-colors"
                                >
                                  {task.checked && <Check className="w-2.5 h-2.5 text-blue-400" />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[10.5px] font-bold leading-snug ${task.checked ? 'line-through text-slate-500 font-normal' : 'text-slate-200'}`}>
                                    {task.title}
                                  </p>
                                  <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-white/5 text-[8.5px] text-slate-400 font-medium">
                                    <span>{task.dueDate}</span>
                                    <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-400/20">{task.tag}</span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        <div className="pt-2 mt-1 border-t border-white/5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder={isVietnamese ? '+ Thêm việc...' : '+ Add task...'}
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleQuickAdd(col.key as any);
                              }}
                              className="w-full px-2 py-1 text-[9.5px] rounded-lg bg-slate-950/80 border border-white/10 outline-none text-slate-200 focus:border-blue-500 font-medium"
                            />
                            <button
                              onClick={() => handleQuickAdd(col.key as any)}
                              className="p-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {/* 2. APEXA AI BRAIN */}
              {activeTab === 'ai' && (
                <motion.div
                  key="tab-ai"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full bg-slate-900/60 border border-indigo-500/30 rounded-2xl p-3 flex flex-col justify-between"
                >
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[220px]">
                    {aiChatLog.map((msg, i) => (
                      <div key={i} className={`flex items-start gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                        {msg.sender === 'bot' && (
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                            <Bot className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className={`p-2.5 rounded-2xl max-w-[85%] text-[10px] font-bold leading-relaxed whitespace-pre-line ${
                          msg.sender === 'user'
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-slate-800/90 border border-white/5 text-slate-200 rounded-tl-none'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {aiTyping && (
                      <div className="flex items-center gap-1.5 text-blue-400 text-[10px] font-bold p-1">
                        <Sparkles className="w-3 h-3 animate-spin" />
                        <span>{isVietnamese ? 'Apexa Brain đang xử lý...' : 'Apexa Brain is analyzing...'}</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap gap-1.5 my-2">
                    {[
                      { label: isVietnamese ? '⚡ Lập kế hoạch Sprint' : '⚡ Plan Sprint items', text: isVietnamese ? 'Hãy lập kế hoạch phân rã 2 task ưu tiên cho Sprint' : 'Plan 2 prioritized action items for the Sprint' },
                      { label: isVietnamese ? '📊 Tóm tắt tiến độ' : '📊 Summarize progress', text: isVietnamese ? 'Tóm tắt tiến độ sprint hiện tại' : 'Summarize the current sprint status' },
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendAi(chip.text)}
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/5">
                    <input
                      type="text"
                      placeholder={isVietnamese ? 'Nhập yêu cầu cho Apexa Brain AI...' : 'Ask Apexa Brain AI Copilot...'}
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendAi();
                      }}
                      className="flex-1 px-3 py-1.5 text-[10px] rounded-xl bg-slate-950 border border-white/10 outline-none text-slate-200 font-medium"
                    />
                    <button
                      onClick={() => handleSendAi()}
                      className="p-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* 3. SMART DOCS */}
              {activeTab === 'docs' && (
                <motion.div
                  key="tab-docs"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full bg-slate-900/60 border border-white/10 rounded-2xl p-4 overflow-y-auto space-y-3 text-left"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs font-black text-white">{isVietnamese ? 'Kiến trúc sản phẩm Sprint 2026' : 'Product Architecture Sprint 2026'}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-violet-950/80 text-violet-300 border border-violet-800/60 text-[8.5px] font-black">Real-time Docs</span>
                  </div>

                  <div className="space-y-2 text-[10.5px] text-slate-300 leading-relaxed">
                    <p>{isVietnamese ? 'Hệ điều hành năng suất tích hợp AI thế hệ mới với trải nghiệm không độ trễ. Nhúng trực tiếp task từ Kanban vào tài liệu.' : 'Next-generation AI productivity OS with zero latency. Seamlessly embed live Kanban tasks into rich docs.'}</p>
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 space-y-1.5">
                      <div className="text-[9.5px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                        <CheckSquare className="w-3 h-3 text-blue-400" />
                        <span>{isVietnamese ? 'Task được liên kết:' : 'Linked Task:'}</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-white/5 text-[9.5px]">
                        <span className="font-bold text-slate-200">{isVietnamese ? '🚀 Phát hành bản cập nhật Apexa OS v2.0' : '🚀 Launch Apexa OS v2.0 update'}</span>
                        <span className="px-2 py-0.2 rounded-full bg-emerald-950 text-emerald-400 font-black text-[8px]">{isVietnamese ? 'Hoàn thành' : 'Completed'}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 4. TEAM CHAT */}
              {activeTab === 'chat' && (
                <motion.div
                  key="tab-chat"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full bg-slate-900/60 border border-white/10 rounded-2xl p-3 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/5 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="font-black text-white"># sprint-core</span>
                    </div>
                    <span className="text-slate-400 font-bold">{isVietnamese ? '4 trực tuyến' : '4 online'}</span>
                  </div>

                  <div className="space-y-2 overflow-y-auto py-1 text-[10px]">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[8px] flex items-center justify-center shrink-0">HX</div>
                      <div className="bg-slate-800/80 p-2 rounded-xl text-slate-200 border border-white/5 font-bold">
                        {isVietnamese ? 'Đã cập nhật toàn bộ responsive cho màn hình di động nhé cả team!' : 'Mobile responsive styles are pushed to production, team!'}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[8px] flex items-center justify-center shrink-0">AI</div>
                      <div className="bg-indigo-950/60 p-2 rounded-xl text-indigo-200 border border-indigo-800/50 font-bold">
                        {isVietnamese ? '🤖 Apexa Brain: Sprint tuần này đã đạt KPI 100% sớm 2 ngày!' : '🤖 Apexa Brain: This week’s sprint KPI achieved 100% two days early!'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/5">
                    <input
                      type="text"
                      placeholder={isVietnamese ? 'Gửi tin nhắn vào kênh...' : 'Message #sprint-core...'}
                      className="flex-1 px-2.5 py-1 text-[9.5px] rounded-lg bg-slate-950 border border-white/10 outline-none text-slate-200"
                    />
                    <button className="p-1.5 rounded-lg bg-blue-600 text-white">
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* 5. GANTT TIMELINE */}
              {activeTab === 'gantt' && (
                <motion.div
                  key="tab-gantt"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full bg-slate-900/60 border border-white/10 rounded-2xl p-3 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-white/5 text-[10px] font-bold">
                    <span>{isVietnamese ? 'Timeline Sprint #14 · Tháng 8/2026' : 'Sprint #14 Timeline · August 2026'}</span>
                    <span className="text-emerald-400">Critical Path: 100%</span>
                  </div>

                  <div className="space-y-2.5 my-auto text-[9.5px]">
                    {[
                      { name: isVietnamese ? 'Khởi tạo Kiến trúc Local-First' : 'Local-First Architecture Core', width: '75%', color: 'from-blue-600 to-indigo-600', time: '10/08 - 14/08' },
                      { name: isVietnamese ? 'Tích hợp Gemini 2.5 AI Engine' : 'Gemini 2.5 AI Engine Copilot', width: '85%', color: 'from-blue-600 to-cyan-500', time: '12/08 - 16/08' },
                      { name: isVietnamese ? 'Đồng bộ 2 chiều Google Calendar' : '2-Way Google Calendar Sync', width: '55%', color: 'from-cyan-500 to-sky-400', time: '14/08 - 18/08' },
                      { name: isVietnamese ? 'Phát hành Apexa OS v2.0' : 'Launch Apexa OS v2.0 Build', width: '90%', color: 'from-emerald-500 to-teal-500', time: '18/08 - 22/08' },
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-slate-300 font-bold">
                          <span>{item.name}</span>
                          <span className="text-slate-400">{item.time}</span>
                        </div>
                        <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/10">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                            style={{ width: item.width }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-1.5 rounded-lg bg-slate-950 border border-white/5 text-[8.5px] text-slate-400 flex items-center justify-between font-semibold">
                    <span>{isVietnamese ? '⚡ Tự động phát hiện xung đột deadline' : '⚡ Auto deadline conflict detection'}</span>
                    <span className="text-emerald-400 font-black">{isVietnamese ? 'Hoàn hảo' : 'Optimal'}</span>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>
      </MockupFrame>
    </div>
  );
}

/* =========================================================================
   MAIN LANDING PAGE EXPORT
   ========================================================================= */
export default function LandingPage({ onSignUp, onSignIn, activeUsers, tasksCompleted }: LandingPageProps) {
  const { isVietnamese } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const [activeCategory, setActiveCategory] = useState('all');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [billingPrices, setBillingPrices] = useState<Partial<Record<'monthly' | 'yearly', PublicBillingPrice>>>({});
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
      icon: Brain,
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
      id: 'free',
      name: isVietnamese ? 'Khởi đầu (Free)' : 'Starter (Free)',
      desc: isVietnamese
        ? 'Hoàn hảo cho cá nhân và nhóm nhỏ muốn bắt đầu chuẩn hóa quy trình làm việc.'
        : 'Perfect for individuals and small teams standardizing daily workflows.',
      badge: isVietnamese ? 'Miễn phí mãi mãi' : 'Free Forever',
      highlight: false,
      cta: isVietnamese ? 'Bắt đầu miễn phí' : 'Start for Free',
      features: isVietnamese ? [
        'Tối đa 5 thành viên không gian',
        'Không giới hạn số lượng Task & Dự án',
        'Chế độ xem Kanban & List View',
        'Bộ nhớ lưu trữ tài liệu 1 GB',
        'Đồng bộ dữ liệu thời gian thực',
        'Hỗ trợ cộng đồng 24/7'
      ] : [
        'Up to 5 workspace members',
        'Unlimited tasks & projects',
        'Kanban Board & List views',
        '1 GB document cloud storage',
        'Real-time cloud synchronization',
        '24/7 community support'
      ]
    },
    {
      id: 'pro',
      name: 'Apexa Pro OS',
      desc: isVietnamese
        ? 'Giải pháp toàn diện cho các đội ngũ phát triển sản phẩm, startup & doanh nghiệp tăng tốc.'
        : 'The complete productivity suite for fast-moving engineering teams, startups & agencies.',
      badge: isVietnamese ? 'Lựa chọn hàng đầu 🔥' : 'Most Popular 🔥',
      highlight: true,
      cta: isVietnamese ? 'Trải nghiệm Pro OS' : 'Upgrade to Pro OS',
      features: isVietnamese ? [
        'Không giới hạn thành viên & Spaces',
        'Apexa Brain AI Copilot không giới hạn',
        'Trọn bộ 5 View Modes (Board, Table, Calendar, Gantt, Timeline)',
        'Báo cáo tự động hóa phân tích hiệu suất tuần bằng AI',
        'Đồng bộ 2 chiều Google Calendar & Lịch biểu',
        'Dung lượng lưu trữ đám mây 100 GB',
        'Hỗ trợ kỹ thuật ưu tiên 24/7'
      ] : [
        'Unlimited members & spaces',
        'Unlimited Apexa Brain AI Copilot',
        'All 5 View Modes (Board, Table, Calendar, Gantt, Timeline)',
        'Automated AI weekly performance digests',
        'Two-way Google Calendar synchronization',
        '100 GB high-speed cloud storage',
        '24/7 priority developer support'
      ]
    },
    {
      id: 'enterprise',
      name: isVietnamese ? 'Doanh Nghiệp (Enterprise)' : 'Enterprise',
      desc: isVietnamese
        ? 'Dành cho các tổ chức quy mô lớn yêu cầu kiểm soát dữ liệu, bảo mật chuyên sâu và SLA cao cấp.'
        : 'Tailored for large organizations requiring data sovereignty, custom SSO, and dedicated SLA.',
      badge: isVietnamese ? 'Tùy chỉnh riêng' : 'Custom Tailored',
      highlight: false,
      cta: isVietnamese ? 'Liên hệ tư vấn' : 'Contact Enterprise Team',
      features: isVietnamese ? [
        'Tất cả quyền lợi của gói Pro OS',
        'Triển khai On-Premise hoặc Dedicated Cloud riêng',
        'Single Sign-On (SSO / SAML 2.0 / Okta / Azure AD)',
        'Cam kết chất lượng dịch vụ SLA Uptime 99.99%',
        'Kiểm toán bảo mật & Audit Logs chi tiết',
        'Quản lý tài khoản (Account Manager) hỗ trợ 1:1'
      ] : [
        'All features in Pro OS plan',
        'On-Premises or Dedicated Cloud deployment',
        'Single Sign-On (SSO / SAML 2.0 / Okta / Azure AD)',
        '99.99% Uptime SLA guaranteed',
        'Comprehensive security audit & activity logs',
        'Dedicated 1-on-1 account success manager'
      ]
    }
  ], [isVietnamese]);

  // Dynamic Testimonials
  const testimonials = useMemo(() => [
    {
      quote: isVietnamese
        ? "Apexa OS đã thay thế hoàn toàn bộ 4 công cụ cồng kềnh trước đây (Jira, Slack, Notion, Toggl) của chúng tôi. Tốc độ triển khai sprint của 35 kỹ sư đã tăng hơn 40% chỉ sau 3 tuần."
        : "Apexa OS completely replaced our previous stack of 4 bloated apps (Jira, Slack, Notion, Toggl). Our 35 engineers boosted their sprint delivery speed by 42% in just 3 weeks.",
      author: isVietnamese ? "Hoàng Xuân" : "Alex Hoang",
      role: isVietnamese ? "Giám đốc Công nghệ (CTO)" : "Chief Technology Officer (CTO)",
      company: "TechVanguard Innovations",
      metric: "+42% Sprint Velocity",
      avatar: "HX",
      gradient: "from-blue-600 to-indigo-600"
    },
    {
      quote: isVietnamese
        ? "Giao diện phẳng, tinh gọn và tốc độ phản hồi tức thì khiến cả đội ngũ thiết kế lẫn marketing đều thích thú khi sử dụng. Apexa AI gợi ý task và tóm tắt cuộc họp cực kỳ chuẩn xác!"
        : "The unified continuous canvas and instant response time delighted both our design and marketing teams. Apexa AI generates task breakdowns and meeting summaries with pinpoint precision!",
      author: isVietnamese ? "Phạm Mai Phương" : "Sarah Jenkins",
      role: isVietnamese ? "Trưởng phòng Sản phẩm (Head of Product)" : "Head of Product",
      company: "Nexus Creative Studio",
      metric: isVietnamese ? "Tiết kiệm 8h họp/tuần" : "Saved 8 hrs/week",
      avatar: "MP",
      gradient: "from-blue-600 to-cyan-600"
    },
    {
      quote: isVietnamese
        ? "Tính năng Smart Docs liên kết trực tiếp với Kanban Board là một bước đột phá. Chúng tôi không còn phải đi tìm kiếm tài liệu dự án thất lạc ở bất kỳ đâu nữa."
        : "Live embedding between Smart Docs and Kanban boards is a revelation. We never lose track of project specifications or meeting action items anymore.",
      author: isVietnamese ? "Nguyễn Quốc Bảo" : "David Nguyen",
      role: isVietnamese ? "Giám đốc Vận hành (COO)" : "Chief Operating Officer (COO)",
      company: "Aether Global Commerce",
      metric: isVietnamese ? "Giảm 75% thời gian tìm kiếm" : "-75% Search Overhead",
      avatar: "QB",
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
        ? 'Hoàn toàn có thể! Apexa OS được xây dựng trên kiến trúc Local-First hiện đại. Bạn có thể tạo việc, ghi chép tài liệu, di chuyển cột Kanban ngay cả khi ở trên máy bay hay mất mạng. Toàn bộ dữ liệu sẽ tự động đồng bộ lên Supabase Cloud ngay khi có kết nối trở lại mà không mất mát dữ liệu.'
        : 'Absolutely! Apexa OS is engineered on a modern Local-First architecture. You can create tasks, draft docs, and organize Kanban boards on airplanes or in offline mode. All modifications seamlessly sync with Supabase Cloud once you are reconnected.'
    },
    {
      q: isVietnamese
        ? 'Dữ liệu dự án và thông tin của công ty tôi được bảo mật như thế nào?'
        : 'How is our company data protected and secured?',
      a: isVietnamese
        ? 'Apexa áp dụng chuẩn mã hóa SSL/TLS 256-bit trong truyền tải và AES-256 khi lưu trữ. Cơ sở dữ liệu chạy trên hạ tầng Supabase Enterprise đạt chứng nhận tuân thủ bảo mật quốc tế SOC2 Type II và ISO 27001. Dữ liệu của bạn hoàn toàn thuộc quyền sở hữu của bạn và không bao giờ được dùng để huấn luyện mô hình AI công khai.'
        : 'Apexa employs 256-bit SSL/TLS encryption in transit and AES-256 at rest. Backed by Supabase Enterprise infrastructure, our databases comply with SOC2 Type II and ISO 27001 security standards. Your proprietary workspace data is never used for training public AI models.'
    },
    {
      q: isVietnamese
        ? 'Tôi có thể chuyển dữ liệu từ Trello, Notion, Jira hoặc ClickUp sang Apexa không?'
        : 'Can I import workspace data from Trello, Notion, Jira, or ClickUp?',
      a: isVietnamese
        ? 'Có! Apexa OS cung cấp công cụ chuyển đổi 1-Click Import. Bạn chỉ cần xuất file JSON/CSV từ công cụ cũ, hệ thống sẽ tự động ánh xạ cấu trúc bảng việc, tài liệu và phân công người phụ trách sang Apexa chỉ trong vài phút.'
        : 'Yes! Apexa OS provides 1-Click migration tools. Simply upload your CSV or JSON exports from previous tools, and our ingestion wizard maps your boards, docs, and assignees within minutes.'
    },
    {
      q: isVietnamese
        ? 'Apexa AI hỗ trợ tiếng Việt và tiếng Anh như thế nào?'
        : 'How fluent is Apexa AI in both Vietnamese and English?',
      a: isVietnamese
        ? 'Apexa Brain AI được tối ưu hóa dựa trên mô hình Gemini AI đa ngôn ngữ tiên tiến nhất, hỗ trợ tiếng Việt xuất sắc (hiểu từ ngữ chuyên ngành, cách xưng hô, văn phong công sở) cùng tiếng Anh chuẩn xác và hơn 45 ngôn ngữ quốc tế khác.'
        : 'Apexa Brain AI is powered by state-of-the-art multimodal Gemini AI models, delivering fluent, contextual comprehension in both English and Vietnamese with deep knowledge of technical productivity terms.'
    },
    {
      q: isVietnamese
        ? 'Chính sách dùng thử và nâng cấp gói Pro như thế nào?'
        : 'What is the trial policy and satisfaction guarantee for Pro OS?',
      a: isVietnamese
        ? 'Bạn có thể bắt đầu với gói Miễn phí vĩnh viễn không cần thẻ tín dụng. Khi muốn nâng cấp lên gói Pro OS, bạn được trải nghiệm đầy đủ tính năng AI và Gantt Chart cao cấp với chính sách hoàn tiền 100% trong 14 ngày nếu không hài lòng.'
        : 'You can get started immediately with our Free Forever tier—no credit card required. Upgrades to Pro OS include full AI Copilot and Gantt features backed by a 14-day 100% money-back guarantee.'
    }
  ], [isVietnamese]);

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

  useEffect(() => {
    let active = true;
    fetch('/api/billing/plans', { cache: 'no-store' })
      .then(async response => response.ok ? response.json() : Promise.reject(new Error('Pricing unavailable')))
      .then(body => { if (active) setBillingPrices(body.prices || {}); })
      .catch(() => { if (active) setBillingPrices({}); });
    return () => { active = false; };
  }, []);

  const formatPrice = (planId: string) => {
    if (planId === 'free') return { value: isVietnamese ? '0 ₫' : '$0', suffix: isVietnamese ? '/ mãi mãi' : '/ forever' };
    if (planId === 'enterprise') return { value: isVietnamese ? 'Liên hệ' : 'Custom', suffix: isVietnamese ? '/ tùy biến SLA' : '/ tailored SLA' };
    const price = billingPrices[billingCycle];
    if (!price) {
      return {
        value: isVietnamese 
          ? (billingCycle === 'yearly' ? '99.000 ₫' : '129.000 ₫')
          : (billingCycle === 'yearly' ? '$8' : '$12'),
        suffix: isVietnamese ? '/ người / tháng' : '/ user / month'
      };
    }
    const monthlyAmount = price.unit_amount / (price.interval === 'year' ? 12 * price.interval_count : price.interval_count);
    const divisor = ZERO_DECIMAL_CURRENCIES.has(price.currency.toLowerCase()) ? 1 : 100;
    return {
      value: new Intl.NumberFormat(isVietnamese ? 'vi-VN' : 'en-US', { style: 'currency', currency: price.currency.toUpperCase(), maximumFractionDigits: 0 }).format(monthlyAmount / divisor),
      suffix: isVietnamese ? '/ người / tháng' : '/ user / month'
    };
  };

  const yearlySaving = billingPrices.monthly && billingPrices.yearly && billingPrices.monthly.currency === billingPrices.yearly.currency
    ? Math.max(0, Math.round((1 - billingPrices.yearly.unit_amount / (billingPrices.monthly.unit_amount * 12)) * 100))
    : 25;

  const startPlan = (planId: string) => {
    if (planId === 'pro') localStorage.setItem('apexa_pending_upgrade_cycle', billingCycle);
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

  const doubledLogos = [...TRUSTED_LOGOS, ...TRUSTED_LOGOS, ...TRUSTED_LOGOS, ...TRUSTED_LOGOS];

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden bg-[#fafbfc] dark:bg-[#07090e] transition-colors duration-300 font-sans text-slate-800 dark:text-slate-100 selection:bg-blue-500 selection:text-white">
      
      {/* Dynamic Ambient Mouse Spotlight */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40 dark:opacity-60"
        style={{
          background: `radial-gradient(700px circle at ${mousePos.x}% ${mousePos.y}%, rgba(37, 99, 235, 0.14), transparent 75%)`
        }}
      />
      
      {/* Ambient Radial Blobs */}
      <motion.div
        animate={{
          x: [0, 60, -30, 0],
          y: [0, -80, 40, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-[-12%] left-[-15%] w-[680px] h-[680px] bg-blue-600/10 dark:bg-blue-600/15 rounded-full blur-[140px] pointer-events-none z-0"
      />
      <motion.div
        animate={{
          x: [0, -50, 70, 0],
          y: [0, 60, -50, 0],
          scale: [1, 0.9, 1.15, 1],
        }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        className="fixed bottom-[5%] right-[-12%] w-[620px] h-[620px] bg-indigo-600/10 dark:bg-purple-600/15 rounded-full blur-[130px] pointer-events-none z-0"
      />

      {/* TOP NOTIFICATION BANNER */}
      <div className="relative z-50 bg-slate-950 text-white text-[11px] font-extrabold py-2 px-4 text-center select-none flex items-center justify-center gap-2 border-b border-white/10">
        <Badge variant="shots-new" dot size="sm">SHOTS-GRADE OS 2.0</Badge>
        <span className="text-slate-300">
          {isVietnamese 
            ? 'Apexa OS 2.0 đã tích hợp Trợ lý AI Gemini 2.5 & Kiến trúc Local-First siêu tốc!'
            : 'Apexa OS 2.0 is live with Gemini 2.5 AI Engine & ultra-fast Local-First architecture!'}
        </span>
        <button onClick={onSignUp} className="text-sky-400 underline hover:text-sky-300 cursor-pointer inline-flex items-center gap-0.5 ml-1">
          {isVietnamese ? 'Khám phá ngay' : 'Explore now'} <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* FLOATING ISLAND HEADER NAVBAR (SHOTS STYLE) */}
      <header className="sticky top-3 z-50 max-w-6xl mx-auto px-4">
        <div className="shots-dock px-4 py-2.5 flex items-center justify-between transition-all">
          
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
              { label: isVietnamese ? 'Quy trình' : 'Workflow', id: 'how-it-works' },
              { label: isVietnamese ? 'Bảng giá' : 'Pricing', id: 'pricing' },
              { label: isVietnamese ? 'Đánh giá' : 'Reviews', id: 'testimonials' },
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
          <div className="flex items-center gap-2">
            <LanguageDropdown size="sm" />
            <ThemeSwitch size="sm" />
            <Button variant="ghost" size="sm" pill onClick={onSignIn} className="hidden sm:inline-flex">
              {isVietnamese ? 'Đăng nhập' : 'Sign in'}
            </Button>
            <Button variant="shots" size="sm" pill onClick={onSignUp} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              {isVietnamese ? 'Bắt đầu miễn phí' : 'Get Started Free'}
            </Button>
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
              { id: 'how-it-works', label: isVietnamese ? 'Quy trình' : 'Workflow' },
              { id: 'pricing', label: isVietnamese ? 'Bảng giá' : 'Pricing' },
              { id: 'testimonials', label: isVietnamese ? 'Đánh giá' : 'Reviews' },
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
          <Badge variant="shots-new" dot size="lg">
            {isVietnamese ? 'Hệ điều hành năng suất Apexa 2026' : 'Apexa Continuous Workspace 2026'}
          </Badge>
        </motion.div>

        {/* Hero Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-950 dark:text-white leading-[1.05] font-display max-w-5xl mx-auto"
        >
          {isVietnamese ? (
            <>
              Tập trung tối đa.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-500">
                Bứt phá năng suất
              </span>
              {' '}cùng AI.
            </>
          ) : (
            <>
              Maximum focus.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-500">
                Supercharge velocity
              </span>
              {' '}with AI.
            </>
          )}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="text-slate-600 dark:text-slate-300 text-sm sm:text-lg font-medium leading-relaxed max-w-2xl mx-auto mt-6"
        >
          {isVietnamese
            ? 'Hợp nhất Kanban, Smart Docs, ChatRoom, Lịch biểu và Trợ lý AI Apexa Brain trên một bề mặt duy nhất. Không độ trễ, không phân mảnh công cụ.'
            : 'Unify Kanban boards, Smart Docs, ChatRooms, Calendars, and Apexa Brain AI on a single canvas. Zero latency, zero tool sprawl.'}
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
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            {isVietnamese ? 'Bắt đầu trải nghiệm miễn phí' : 'Start for Free Today'}
          </Button>

          <Button
            variant="glass"
            size="huge"
            pill
            onClick={() => scrollTo('features')}
            leftIcon={<Play className="w-4 h-4 text-blue-600 dark:text-sky-400" />}
          >
            {isVietnamese ? 'Khám phá tính năng' : 'Explore Features'}
          </Button>
        </motion.div>

        {/* Social Proof Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8 text-xs font-bold text-slate-500 dark:text-slate-400"
        >
          <div className="flex -space-x-2">
            {['HX', 'MA', 'QB', 'TV', 'LA'].map((initials, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 border-2 border-white dark:border-[#07090e] flex items-center justify-center text-[8.5px] font-black text-white shadow-sm"
              >
                {initials}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span>
              <strong className="text-slate-900 dark:text-white font-black">4.95/5</strong> {isVietnamese ? 'từ hơn 28,000+ đội ngũ kỹ thuật & sáng tạo' : 'from 28,000+ tech and creative teams'}
            </span>
          </div>
        </motion.div>

        {/* Interactive Shots Mockup Studio in Hero */}
        <div className="mt-12 sm:mt-16 max-w-5xl mx-auto">
          <ShotsInteractiveStudio />
        </div>

      </section>

      {/* =========================================================================
          MARQUEE LOGOS STRIP
          ========================================================================= */}
      <section className="relative z-10 border-y border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md py-6 overflow-hidden select-none">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <p className="text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
            {isVietnamese ? 'Được tin dùng bởi các kỹ sư, nhà sáng lập và đội ngũ công nghệ cao cấp' : 'Trusted by high-growth engineering teams, founders, and modern creators'}
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
              { value: activeUsers, suffix: '+', label: isVietnamese ? 'Tổ chức & Đội ngũ hoạt động' : 'Active Teams & Workspaces', icon: Users, color: 'text-blue-600 dark:text-sky-400' },
              { value: tasksCompleted, suffix: '+', label: isVietnamese ? 'Nhiệm vụ hoàn tất mỗi ngày' : 'Daily Tasks Completed', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
              { value: 99.99, suffix: '%', label: isVietnamese ? 'Cam kết Uptime SLA liên tục' : 'Guaranteed SLA Uptime', icon: ShieldCheck, color: 'text-indigo-600 dark:text-indigo-400', decimals: 2 },
              { value: 42, suffix: '%', label: isVietnamese ? 'Tốc độ bàn giao Sprint tăng tốc' : 'Faster Sprint Delivery', icon: Zap, color: 'text-amber-600 dark:text-amber-400' },
            ].map((stat, i) => (
              <div key={i} className="shots-glass-card rounded-3xl p-6 sm:p-7 text-center space-y-2">
                <div className={`w-11 h-11 rounded-2xl bg-slate-200/70 dark:bg-white/10 ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white font-display">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} decimals={'decimals' in stat ? stat.decimals : 0} />
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
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              {isVietnamese ? 'Mọi công cụ đội ngũ cần trên một giao diện' : 'Every team tool unified on one continuous canvas'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
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
                      ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-md'
                      : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-white/10'
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
                  className="shots-glass-card rounded-3xl p-6 flex flex-col justify-between text-left group"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className={`w-11 h-11 rounded-2xl ${feat.bg} flex items-center justify-center ${feat.iconColor} border border-white/10 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <Badge variant={feat.tagVariant} size="sm">
                        {feat.badge}
                      </Badge>
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">{feat.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{feat.desc}</p>
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
          WORKFLOW PROCESS (4 STEPS)
          ========================================================================= */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-white/10">
        <FadeInSection>
          <div className="text-center space-y-3 max-w-3xl mx-auto mb-14">
            <Badge variant="shots">{isVietnamese ? 'QUY TRÌNH CHUẨN HOÁ' : 'HOW IT WORKS'}</Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              {isVietnamese ? 'Vận hành trơn tru chỉ với 4 bước' : 'Seamless workflow in 4 simple steps'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              {isVietnamese
                ? 'Dễ dàng thiết lập và đồng bộ toàn bộ thành viên chỉ trong 1 buổi làm việc.'
                : 'Set up departmental spaces and onboard your entire team in minutes.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {workflowSteps.map((step) => {
              const StepIcon = step.icon;
              return (
                <div key={step.step} className="shots-glass-card rounded-3xl p-6 text-left space-y-4 group">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{step.step}</span>
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-white/10 text-blue-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <StepIcon className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-blue-600 dark:text-sky-400">{step.badge}</span>
                    <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight mt-1">{step.title}</h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{step.desc}</p>
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
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              {isVietnamese ? 'Đầu tư thông minh, tối ưu ngân sách' : 'Invest smart, maximize team velocity'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
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
                  { id: 'yearly', label: isVietnamese ? 'Hàng năm' : 'Yearly', badge: isVietnamese ? `Tiết kiệm ${yearlySaving}%` : `Save ${yearlySaving}%` },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {pricingPlans.map(plan => {
              const price = formatPrice(plan.id);
              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-8 flex flex-col justify-between text-left relative transition-all ${
                    plan.highlight
                      ? 'shots-glass-panel border-2 border-blue-500 shadow-2xl shadow-blue-500/20 scale-105 z-10'
                      : 'shots-glass-card'
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
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">{plan.desc}</p>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight font-display">{price.value}</span>
                      {price.suffix && <span className="text-xs text-slate-400 font-bold">{price.suffix}</span>}
                    </div>

                    <div className="space-y-2.5 pt-4 border-t border-slate-200/60 dark:border-white/10">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
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
            <Badge variant="shots">{isVietnamese ? 'ĐÁNH GIÁ THỰC TẾ' : 'CUSTOMER STORIES'}</Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              {isVietnamese ? 'Được yêu thích bởi các nhà quản lý dự án' : 'Loved by product leaders and engineering managers'}
            </h2>
          </div>

          <div className="max-w-4xl mx-auto shots-glass-card rounded-3xl p-8 md:p-12 text-left">
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
                <p className="text-base md:text-xl text-slate-900 dark:text-slate-100 font-extrabold leading-relaxed">
                  "{testimonials[activeTestimonial].quote}"
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
                      aria-label="Previous testimonial"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNextTestimonial}
                      className="p-2 rounded-full border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      aria-label="Next testimonial"
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
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              {isVietnamese ? 'Các câu hỏi thường gặp' : 'Frequently asked questions'}
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="shots-glass-card rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-5 text-left text-sm font-extrabold text-slate-900 dark:text-white flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180 text-blue-500' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed border-t border-slate-200/60 dark:border-white/10 pt-3">
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
              <Badge variant="shots" size="md" className="bg-white/20 text-white border-white/30">
                {isVietnamese ? 'BẮT ĐẦU HÀNH TRÌNH MỚI' : 'START YOUR JOURNEY'}
              </Badge>
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight font-display leading-tight">
                {isVietnamese ? 'Sẵn sàng kiến tạo văn hóa năng suất đỉnh cao?' : 'Ready to build a peak productivity culture?'}
              </h2>
              <p className="text-xs sm:text-sm font-medium text-white/90 leading-relaxed">
                {isVietnamese
                  ? 'Đăng ký tài khoản Apexa OS ngay hôm nay để giải phóng 100% tiềm năng làm việc nhóm với sự trợ giúp của AI thế hệ mới.'
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
                  {isVietnamese ? 'Dùng thử miễn phí trọn đời' : 'Get Started Free Forever'}
                </Button>
                <Button
                  variant="glass"
                  size="huge"
                  pill
                  onClick={onSignIn}
                  className="bg-black/30 border-white/20 text-white"
                >
                  {isVietnamese ? 'Đăng nhập tài khoản' : 'Sign in to Workspace'}
                </Button>
              </div>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* =========================================================================
          FOOTER
          ========================================================================= */}
      <footer className="relative z-10 border-t border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-[#07090e] py-14 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 grid grid-cols-1 md:grid-cols-5 gap-8">
          
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm p-1">
                <svg className="w-5 h-5" viewBox="0 0 512 512" fill="none">
                  <path
                    d="M256 84 C264 84 271 89 275 97 L405 375 C409 383 403 394 394 394 L325 394 C317 394 309 389 306 381 L278 322 L234 322 L206 381 C203 389 195 394 187 394 L118 394 C109 394 103 383 107 375 L237 97 C241 89 248 84 256 84 Z M256 182 L226 270 L286 270 Z"
                    fill="#FFFFFF"
                  />
                </svg>
              </div>
              <span className="font-display font-black text-lg tracking-tight text-slate-900 dark:text-white">
                Apexa OS
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed max-w-sm">
              {isVietnamese
                ? 'Hệ điều hành năng suất AI thế hệ mới kết hợp Kanban, Smart Docs, ChatRoom thời gian thực và kiến trúc Local-First.'
                : 'Next-generation AI productivity operating system unifying Kanban, Smart Docs, real-time chat, and Local-First sync.'}
            </p>
            <div className="flex items-center gap-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full w-fit border border-emerald-200 dark:border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isVietnamese ? 'Toàn bộ hệ thống hoạt động ổn định (99.99% Uptime)' : 'All systems operational (99.99% Uptime)'}</span>
            </div>
          </div>

          <div>
            <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3.5">
              {isVietnamese ? 'Sản phẩm' : 'Product'}
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#features" className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors">{isVietnamese ? 'Bảng Kanban' : 'Kanban Boards'}</a></li>
              <li><a href="#features" className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors">{isVietnamese ? 'Tài liệu thông minh' : 'Smart Docs'}</a></li>
              <li><a href="#features" className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors">{isVietnamese ? 'Phòng chat thời gian thực' : 'Real-time Chat'}</a></li>
              <li><a href="#features" className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors">Apexa Brain AI</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3.5">
              {isVietnamese ? 'Giải pháp' : 'Solutions'}
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#pricing" className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors">{isVietnamese ? 'Bảng giá Pro' : 'Pro Pricing'}</a></li>
              <li><a href="#pricing" className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors">{isVietnamese ? 'SLA doanh nghiệp' : 'Enterprise SLA'}</a></li>
              <li><a href="#testimonials" className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors">{isVietnamese ? 'Khách hàng tiêu biểu' : 'Customer Stories'}</a></li>
              <li><a href="#faq" className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors">{isVietnamese ? 'Bảo mật & Tuân thủ' : 'Security & Compliance'}</a></li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3.5">
              {isVietnamese ? 'Bản tin công nghệ' : 'Newsletter'}
            </h4>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              {isVietnamese ? 'Nhận cập nhật tính năng mới và cẩm nang năng suất hàng tuần.' : 'Weekly productivity guides and new feature release updates.'}
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder={isVietnamese ? 'Nhập email của bạn...' : 'Enter your email...'}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs outline-none text-slate-800 dark:text-white focus:border-blue-500"
              />
              <Button variant="shots" size="sm" pill onClick={() => alert(isVietnamese ? 'Đã đăng ký nhận bản tin thành công!' : 'Subscribed to newsletter successfully!')}>
                {isVietnamese ? 'Gửi' : 'Join'}
              </Button>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-5 sm:px-6 pt-8 mt-10 border-t border-slate-200/70 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400 font-bold">
          <p>© 2026 Apexa OS Inc. {isVietnamese ? 'Tất cả quyền được bảo lưu.' : 'All rights reserved.'}</p>
          <div className="flex gap-5">
            <a href="#" className="hover:underline">{isVietnamese ? 'Điều khoản dịch vụ' : 'Terms of Service'}</a>
            <a href="#" className="hover:underline">{isVietnamese ? 'Chính sách quyền riêng tư' : 'Privacy Policy'}</a>
            <a href="#" className="hover:underline">{isVietnamese ? 'Bảo mật SOC2' : 'SOC2 Security'}</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
