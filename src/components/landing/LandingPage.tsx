"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import {
  Kanban, Sparkles, ArrowRight, Star, Menu, X,
  Brain, FileText, MessageSquare, Calendar, BarChart3, Timer,
  Database, Users, Zap, Shield, Check, Play, Quote,
  LayoutGrid, Search, Mail, ListTodo,
  ChevronRight, ChevronLeft, ChevronDown, Send, Bot, CheckSquare, Plus, HelpCircle, ArrowUpRight,
  Globe, ShieldCheck, Flame, Layers
} from 'lucide-react';

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
  priority: 'Cao' | 'Trung bình' | 'Khẩn cấp' | 'Thấp';
  dueDate: string;
  assignee: string;
  checked?: boolean;
}

type PublicBillingPrice = {
  unit_amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  interval_count: number;
};

const ZERO_DECIMAL_CURRENCIES = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf']);

const CATEGORIES = [
  { id: 'all', label: 'Tất cả' },
  { id: 'task', label: 'Quản lý công việc' },
  { id: 'ai', label: 'Trí tuệ nhân tạo' },
  { id: 'collaboration', label: 'Hợp tác team' },
  { id: 'analytics', label: 'Báo cáo & Phân tích' }
];

const FEATURES = [
  {
    icon: Kanban,
    title: 'Kanban & Sprint Boards',
    desc: 'Kéo thả trực quan, quản lý sprint linh hoạt với List, Board, Table và Gantt view.',
    color: 'from-indigo-500 to-purple-500',
    bg: 'bg-indigo-50/80 dark:bg-indigo-950/20',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    category: 'task'
  },
  {
    icon: Brain,
    title: 'Apexa AI Assistant',
    desc: 'Trợ lý AI thông minh tóm tắt tài liệu, gợi ý task và tự động hóa quy trình làm việc.',
    color: 'from-purple-500 to-pink-500',
    bg: 'bg-purple-50/80 dark:bg-purple-950/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
    category: 'ai'
  },
  {
    icon: FileText,
    title: 'Smart Documents',
    desc: 'Tài liệu thông minh liên kết trực tiếp với task, space và thành viên trong team.',
    color: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-50/80 dark:bg-pink-950/20',
    iconColor: 'text-pink-600 dark:text-pink-400',
    category: 'collaboration'
  },
  {
    icon: MessageSquare,
    title: 'Chat thời gian thực',
    desc: 'Thảo luận nhóm ngay trong workspace — không cần chuyển sang ứng dụng bên ngoài.',
    color: 'from-cyan-500 to-blue-500',
    bg: 'bg-cyan-50/80 dark:bg-cyan-950/20',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    category: 'collaboration'
  },
  {
    icon: Calendar,
    title: 'Lịch & Gantt Chart',
    desc: 'Lên kế hoạch deadline, theo dõi timeline dự án và đồng bộ lịch công việc toàn team.',
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    category: 'task'
  },
  {
    icon: BarChart3,
    title: 'Analytics Command Hub',
    desc: 'Dashboard phân tích hiệu suất team, velocity sprint và tiến độ dự án real-time.',
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50/80 dark:bg-amber-950/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    category: 'analytics'
  },
  {
    icon: Timer,
    title: 'Pomodoro & Time Tracking',
    desc: 'Tích hợp bộ đếm Pomodoro giúp tăng độ tập trung và theo dõi thời gian làm việc chính xác.',
    color: 'from-rose-500 to-red-500',
    bg: 'bg-rose-50/80 dark:bg-rose-955/20',
    iconColor: 'text-rose-600 dark:text-rose-400',
    category: 'task'
  },
  {
    icon: Database,
    title: 'Đồng bộ Supabase Cloud',
    desc: 'Bảo mật dữ liệu thời gian thực với mã hóa cao cấp và khả năng làm việc ngoại tuyến offline.',
    color: 'from-indigo-500 to-blue-500',
    bg: 'bg-indigo-50/80 dark:bg-indigo-950/20',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    category: 'analytics'
  }
];

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Khởi tạo Workspace',
    desc: 'Tạo không gian làm việc cho dự án, mời thành viên và phân quyền tùy chỉnh trong vài giây.',
    icon: Layers,
    color: 'from-indigo-500 to-violet-500'
  },
  {
    step: '02',
    title: 'Tự động hóa với AI',
    desc: 'Apexa AI hỗ trợ tạo danh mục việc, gợi ý tag và tóm tắt tiến độ tự động.',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-500'
  },
  {
    step: '03',
    title: 'Hợp tác Realtime',
    desc: 'Trao đổi qua ChatRoom, chỉnh sửa Docs chung và cập nhật trạng thái Kanban thời gian thực.',
    icon: MessageSquare,
    color: 'from-cyan-500 to-blue-500'
  },
  {
    step: '04',
    title: 'Theo dõi Velocity & Báo cáo',
    desc: 'Giám sát chỉ số năng suất team, biểu đồ miền 30 ngày và xuất báo cáo tự động.',
    icon: BarChart3,
    color: 'from-emerald-500 to-teal-500'
  }
];

const PRICING_PLANS = [
  {
    id: 'free',
    name: 'Miễn phí (Free)',
    desc: 'Phù hợp cho cá nhân & nhóm nhỏ bắt đầu tối ưu năng suất.',
    badge: 'Miễn phí trọn đời',
    highlight: false,
    features: [
      'Tối đa 5 thành viên nhóm',
      'Tối đa 5 Spaces làm việc',
      'Kanban Board & List View cơ bản',
      'Đồng bộ dữ liệu thời gian thực',
      'ChatRoom trao đổi cơ bản'
    ]
  },
  {
    id: 'pro',
    name: 'Pro OS',
    desc: 'Lựa chọn hàng đầu cho các đội ngũ phát triển và doanh nghiệp tăng tốc.',
    badge: 'Phổ biến nhất 🔥',
    highlight: true,
    features: [
      'Không giới hạn thành viên & Spaces',
      'Apexa AI Assistant không giới hạn',
      'Toàn bộ View Mode (Board, Table, Calendar, Gantt)',
      'Báo cáo năng suất tuần qua Gemini AI',
      'Tích hợp Google Calendar Sync',
      'Hỗ trợ ưu tiên 24/7'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    desc: 'Dành cho tập đoàn yêu cầu bảo mật cao và tùy biến riêng biệt.',
    badge: 'Doanh nghiệp lớn',
    highlight: false,
    features: [
      'Tất cả tính năng của gói Pro',
      'Triển khai On-Premise hoặc Cloud riêng',
      'Cam kết Uptime SLA 99.99%',
      'Single Sign-On (SSO / SAML 2.0)',
      'Quản lý cấp quyền cao cấp',
      'Account Manager hỗ trợ riêng'
    ]
  }
];

const TESTIMONIALS = [
  {
    quote: "Apexa OS giúp toàn bộ team 30 kỹ sư của chúng tôi tăng tốc 40% tiến độ hoàn thành sprint. Trợ lý AI thực sự quá thông minh!",
    author: "Hoàng Xuân",
    role: "CTO & Co-founder",
    company: "TechVanguard Inc.",
    avatar: "HX",
    gradient: "from-indigo-500 to-purple-600"
  },
  {
    quote: "Giao diện phẳng tràn viền của Apexa cực kỳ hiện đại. Việc gom tất cả Docs, Kanban và ChatRoom vào một nơi giúp chúng tôi không bao giờ quên task.",
    author: "Minh Anh",
    role: "Head of Product",
    company: "InnovateX Studio",
    avatar: "MA",
    gradient: "from-purple-500 to-pink-600"
  },
  {
    quote: "Tính năng báo cáo AI Gemini giúp tôi nắm trọn bức tranh tổng quan của 5 không gian dự án chỉ trong 10 giây mỗi sáng.",
    author: "Quốc Bảo",
    role: "Operations Director",
    company: "Nexus Global",
    avatar: "QB",
    gradient: "from-cyan-500 to-blue-600"
  }
];

const FAQS = [
  {
    q: 'Apexa OS có thể sử dụng khi không có kết nối Internet (Offline) không?',
    a: 'Có! Apexa OS hỗ trợ chế độ ngoại tuyến hoàn hảo. Mọi thao tác chỉnh sửa task, tạo tài liệu sẽ được lưu tạm ở máy bạn và tự động đồng bộ lên mây Supabase Cloud ngay khi có kết nối trở lại.'
  },
  {
    q: 'Dữ liệu của doanh nghiệp chúng tôi có được bảo mật không?',
    a: 'Tuyệt đối an toàn. Toàn bộ dữ liệu được mã hóa chuẩn ngân hàng SSL/TLS và lưu trữ trên cơ sở dữ liệu Supabase Enterprise đạt chứng nhận SOC2 Type II.'
  },
  {
    q: 'Tôi có thể chuyển đổi dữ liệu từ Trello, Notion hoặc ClickUp sang không?',
    a: 'Có! Apexa OS hỗ trợ công cụ Import tự động chỉ bằng 1 cú nhấp chuột để đưa toàn bộ danh sách công việc và tài liệu của bạn qua hệ thống mượt mà.'
  },
  {
    q: 'Apexa AI hỗ trợ những ngôn ngữ nào?',
    a: 'Apexa AI hoạt động dựa trên mô hình trí tuệ nhân tạo thế hệ mới, hỗ trợ mượt mà cả Tiếng Việt và Tiếng Anh cùng hơn 40 ngôn ngữ phổ biến trên thế giới.'
  }
];

const TRUSTED_LOGOS = [
  'TechVanguard', 'InnovateX', 'Nexus Global', 'Aether Labs', 'HyperScale', 'Pulse Digital', 'CyberCore'
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
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ProductMockup() {
  const [mockupTab, setMockupTab] = useState<'board' | 'list' | 'calendar' | 'ai'>('board');
  const [selectedTaskForTooltip, setSelectedTaskForTooltip] = useState<string | null>(null);

  // Mock tasks inside simulator
  const [tasks, setTasks] = useState<MockTask[]>([
    { id: '1', title: 'Thiết kế hệ thống Continuous Unified Canvas', column: 'done', priority: 'Khẩn cấp', dueDate: '12/08', assignee: 'Hoàng Xuân', checked: true },
    { id: '2', title: 'Nâng cấp hiệu ứng Glassmorphism & Backdrop Blur', column: 'inprogress', priority: 'Cao', dueDate: '13/08', assignee: 'Minh Anh', checked: false },
    { id: '3', title: 'Tích hợp Trợ lý Apexa AI Gemini Flash 2.5', column: 'inprogress', priority: 'Khẩn cấp', dueDate: '14/08', assignee: 'AI Assistant', checked: false },
    { id: '4', title: 'Tối ưu tốc độ đồng bộ Supabase Cloud', column: 'todo', priority: 'Trung bình', dueDate: '15/08', assignee: 'Quốc Bảo', checked: false },
    { id: '5', title: 'Kiểm thử toàn bộ hệ thống trước release v2.0', column: 'todo', priority: 'Thấp', dueDate: '16/08', assignee: 'Kỹ thuật', checked: false },
  ]);

  const [newTaskInput, setNewTaskInput] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    { sender: 'bot', text: 'Chào bạn! Tôi là Apexa AI. Tôi có thể giúp gì cho dự án hôm nay?' }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, aiTyping]);

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

  const handleAddTask = (columnTarget: 'todo' | 'inprogress' | 'done' = 'todo') => {
    if (!newTaskInput.trim()) return;
    const newTask: MockTask = {
      id: Date.now().toString(),
      title: newTaskInput.trim(),
      column: columnTarget,
      priority: 'Cao',
      dueDate: '15/08',
      assignee: 'Bạn'
    };
    setTasks(prev => [newTask, ...prev]);
    setNewTaskInput('');
  };

  const handleSendAi = (overrideText?: string) => {
    const textToSend = overrideText || aiInput;
    if (!textToSend.trim()) return;

    setAiMessages(prev => [...prev, { sender: 'user', text: textToSend }]);
    if (!overrideText) setAiInput('');
    setAiTyping(true);

    setTimeout(() => {
      let botResponse = 'Tôi đã phân tích bối cảnh và cập nhật danh mục công việc của bạn thành công!';
      if (textToSend.includes('Sprint') || textToSend.includes('kế hoạch')) {
        botResponse = '🎯 Đã lên kế hoạch 3 công việc ưu tiên cao cho Sprint tuần này:\n1. Kiểm thử giao diện phẳng tràn viền.\n2. Đồng bộ dữ liệu 30 ngày.\n3. Phát hành phiên bản Pro OS.';
      } else if (textToSend.includes('báo cáo') || textToSend.includes('tiến độ')) {
        botResponse = '📊 Báo cáo nhanh: Đội ngũ đang đạt 80% tiến độ hoàn thành task. Không có điểm tắc nghẽn nguy hiểm nào.';
      }
      setAiMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
      setAiTyping(false);
    }, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="relative w-full rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/80 dark:border-slate-800/80 shadow-[0_25px_60px_-15px_rgba(99,102,241,0.2)] overflow-hidden text-left font-sans select-none"
    >
      {/* Top Window Bar */}
      <div className="px-4 py-3 bg-slate-100/80 dark:bg-slate-950/80 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 ml-2 font-mono">
            apexa.app / workspace / main-sprint
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">Live Sync</span>
        </div>
      </div>

      {/* Tabs Selector Bar */}
      <div className="px-4 py-2.5 bg-white/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between overflow-x-auto gap-2">
        <div className="flex items-center gap-1">
          {[
            { id: 'board', label: 'Board View', icon: Kanban },
            { id: 'list', label: 'List View', icon: ListTodo },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
            { id: 'ai', label: 'Apexa AI', icon: Bot, isAi: true }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = mockupTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMockupTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? tab.isAi
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
                      : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.isAi && !isActive ? 'text-purple-500 animate-pulse' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-bold">Thành viên:</span>
          <div className="flex -space-x-1.5">
            {['HX', 'MA', 'QB'].map((u, i) => (
              <div key={i} className="w-5.5 h-5.5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black text-[8px] flex items-center justify-center border border-white dark:border-slate-900">
                {u}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main View Area */}
      <div className="p-4 md:p-5 h-[360px] overflow-hidden bg-slate-50/40 dark:bg-slate-900/30">
        <AnimatePresence mode="wait">
          {mockupTab === 'board' && (
            <motion.div
              key="board-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full min-w-[500px]"
            >
              {[
                { key: 'todo', label: 'Cần làm', color: 'text-slate-400 dark:text-slate-500', dot: 'bg-slate-350' },
                { key: 'inprogress', label: 'Đang làm', color: 'text-blue-500', dot: 'bg-blue-550' },
                { key: 'done', label: 'Hoàn thành', color: 'text-emerald-500', dot: 'bg-emerald-500' }
              ].map(col => {
                const colTasks = tasks.filter(t => t.column === col.key);
                return (
                  <div key={col.key} className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 p-3 rounded-2xl flex flex-col h-full space-y-2 shadow-xs">
                    <div className="flex items-center justify-between mb-1 px-1">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                        <span className={`text-[10px] font-black uppercase tracking-wider ${col.color}`}>{col.label}</span>
                      </span>
                      <span className="text-[9px] font-black text-slate-400">{colTasks.length}</span>
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto pr-0.5 custom-scrollbar">
                      {colTasks.map(task => (
                        <motion.div
                          layoutId={task.id}
                          key={task.id}
                          className="p-3 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/80 rounded-xl shadow-3xs hover:shadow-md transition-all relative group"
                        >
                          <div className="flex items-start gap-2.5">
                            <button
                              onClick={() => handleToggleTask(task.id)}
                              className="mt-0.5 w-3.5 h-3.5 border border-slate-300 dark:border-slate-600 rounded flex items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20"
                            >
                              {task.checked && <Check className="w-3 h-3 text-indigo-500" />}
                            </button>
                            <p className={`text-[10px] font-extrabold text-slate-700 dark:text-slate-200 leading-snug flex-1 select-none ${task.checked ? 'line-through text-slate-400 dark:text-slate-500 font-semibold' : ''}`}>
                              {task.title}
                            </p>
                          </div>

                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                            <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold">
                              Hạn: {task.dueDate}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[8px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-black uppercase">{task.assignee}</span>
                              {task.priority === 'Khẩn cấp' ? (
                                <span className="text-[8px] bg-rose-50 dark:bg-rose-955/30 text-rose-600 dark:text-rose-400 font-black px-1.5 py-0.5 rounded uppercase border border-rose-100 dark:border-rose-900/30">Hỏa tốc</span>
                              ) : (
                                <span className="text-[8px] bg-slate-100 dark:bg-slate-700 text-slate-550 px-1.5 py-0.5 rounded font-black uppercase">{task.priority}</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Add Task Input inside column */}
                    <div className="pt-1.5 border-t border-slate-150 dark:border-slate-800/60 flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="+ Thêm nhanh công việc..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTask(col.key as any);
                        }}
                        onChange={(e) => setNewTaskInput(e.target.value)}
                        value={newTaskInput}
                        className="w-full px-2.5 py-1.5 text-[9px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none text-slate-800 dark:text-white font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* LIST VIEW */}
          {mockupTab === 'list' && (
            <motion.div
              key="list-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full overflow-x-auto min-w-[500px]"
            >
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-widest font-black text-[8px]">
                    <th className="py-2.5 px-3 w-8"></th>
                    <th className="py-2.5 px-3">Tên công việc</th>
                    <th className="py-2.5 px-3">Người phụ trách</th>
                    <th className="py-2.5 px-3">Độ ưu tiên</th>
                    <th className="py-2.5 px-3">Hạn chót</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task.id} className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2 px-3">
                        <button
                          onClick={() => handleToggleTask(task.id)}
                          className="w-3.5 h-3.5 border border-slate-300 dark:border-slate-600 rounded flex items-center justify-center cursor-pointer hover:border-indigo-500"
                        >
                          {task.checked && <Check className="w-3 h-3 text-indigo-500" />}
                        </button>
                      </td>
                      <td className={`py-2.5 px-3 font-extrabold text-slate-700 dark:text-slate-200 ${task.checked ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                        {task.title}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-500">{task.assignee}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase ${
                          task.priority === 'Khẩn cấp'
                            ? 'bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30'
                            : task.priority === 'Cao'
                            ? 'bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 dark:text-slate-500 font-bold">{task.dueDate}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                          task.column === 'todo'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            : task.column === 'inprogress'
                            ? 'bg-blue-50 dark:bg-blue-955/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30'
                            : 'bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                        }`}>
                          {task.column === 'todo' ? 'Cần làm' : task.column === 'inprogress' ? 'Đang làm' : 'Hoàn thành'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}

          {/* CALENDAR VIEW */}
          {mockupTab === 'calendar' && (
            <motion.div
              key="calendar-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full flex flex-col space-y-2 min-w-[500px]"
            >
              <div className="flex items-center justify-between text-[11px] font-black text-slate-700 dark:text-slate-200">
                <span>Tháng 8, 2026</span>
                <div className="flex gap-1">
                  <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[8px] text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-1.5">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 grid-rows-5 gap-1 flex-1 min-h-[220px]">
                {Array.from({ length: 35 }).map((_, i) => {
                  const dayNum = i - 1;
                  const isValidDay = dayNum > 0 && dayNum <= 31;
                  
                  let matchedTask: MockTask | undefined;
                  if (dayNum === 12) matchedTask = tasks[0]; 
                  if (dayNum === 13) matchedTask = tasks[1]; 
                  if (dayNum === 14) matchedTask = tasks[2];
                  if (dayNum === 15) matchedTask = tasks[3]; 

                  return (
                    <div
                      key={i}
                      className={`bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/40 p-1 rounded-lg flex flex-col items-start relative min-h-[44px] ${
                        isValidDay ? '' : 'opacity-20'
                      }`}
                    >
                      <span className="text-[8px] font-black text-slate-400">{isValidDay ? dayNum : ''}</span>
                      {isValidDay && matchedTask && (
                        <div
                          onClick={() => setSelectedTaskForTooltip(matchedTask!.id === selectedTaskForTooltip ? null : matchedTask!.id)}
                          className={`w-full text-[7.5px] font-black p-1 rounded mt-1 truncate cursor-pointer text-left relative ${
                            matchedTask.column === 'done'
                              ? 'bg-emerald-50 dark:bg-emerald-955/35 text-emerald-600 dark:text-emerald-400 line-through'
                              : matchedTask.column === 'inprogress'
                              ? 'bg-blue-50 dark:bg-blue-955/35 text-blue-600 dark:text-blue-450'
                              : 'bg-indigo-50 dark:bg-indigo-955/35 text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          {matchedTask.title}

                          {selectedTaskForTooltip === matchedTask.id && (
                            <div className="absolute bottom-full left-0 z-[60] w-36 bg-slate-950 text-white text-[8px] p-2.5 rounded-xl shadow-xl pointer-events-auto mt-1 border border-slate-800">
                              <p className="font-extrabold mb-1">{matchedTask.title}</p>
                              <p className="text-slate-400 font-semibold">Phụ trách: {matchedTask.assignee}</p>
                              <p className="text-slate-450 font-semibold">Ưu tiên: {matchedTask.priority}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* BRAIN AI SIMULATOR */}
          {mockupTab === 'ai' && (
            <motion.div
              key="ai-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full flex flex-col bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl overflow-hidden p-3.5 min-h-[280px]"
            >
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[220px] custom-scrollbar">
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                    {msg.sender === 'bot' && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-550 to-purple-650 flex items-center justify-center text-white shrink-0 shadow-xs border border-indigo-400/25">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`p-3 rounded-2xl max-w-[80%] text-[9.5px] font-bold leading-relaxed whitespace-pre-line ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-xs'
                        : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-3xs'
                    }`}>
                      {msg.text || (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                          <span className="text-slate-400 font-semibold">Đang phản hồi...</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {aiTyping && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-550 to-purple-650 flex items-center justify-center text-white shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-2xl rounded-tl-none flex items-center gap-1 shadow-3xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestion prompt pills */}
              <div className="flex flex-wrap gap-1.5 my-2.5">
                {[
                  { text: '💡 Lập kế hoạch Sprint tuần này', label: 'Lập kế hoạch' },
                  { text: '📊 Phân tích báo cáo tiến độ', label: 'Báo cáo' },
                  { text: '📝 Soạn email gửi nhóm thông báo v2.0', label: 'Soạn email' }
                ].map(pill => (
                  <button
                    key={pill.label}
                    disabled={aiTyping}
                    onClick={() => handleSendAi(pill.text)}
                    className="text-[8px] font-black border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-2.5 py-1 rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Custom input */}
              <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <input
                  type="text"
                  placeholder="Giao việc cho Apexa AI..."
                  disabled={aiTyping}
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendAi();
                  }}
                  className="flex-1 px-3.5 py-2 text-[9px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none text-slate-800 dark:text-white font-semibold focus:border-indigo-500"
                />
                <button
                  onClick={() => handleSendAi()}
                  disabled={aiTyping || !aiInput.trim()}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Draggable Apexa AI Live Pill widget */}
      <motion.div
        drag
        dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
        className="absolute bottom-6 left-6 z-30 w-72 bg-white/95 dark:bg-[#0d0e17]/95 backdrop-blur-md rounded-2xl border border-indigo-100 dark:border-indigo-900/60 shadow-2xl p-4 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
          </div>
          <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Apexa AI Status</span>
          <span className="ml-auto text-[8px] text-emerald-500 font-extrabold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Trực tuyến
          </span>
        </div>
        <p className="text-[9.5px] text-slate-600 dark:text-slate-300 leading-relaxed pt-2 font-bold">
          Sprint hiện tại đang <strong className="text-indigo-600 dark:text-indigo-400">hoàn thành {Math.round((tasks.filter(t => t.column === 'done').length / tasks.length) * 100)}%</strong>. Thử bấm tab Apexa AI để ra lệnh tạo việc thông minh!
        </p>
      </motion.div>
    </motion.div>
  );
}

export default function LandingPage({ onSignUp, onSignIn, activeUsers, tasksCompleted }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const [activeCategory, setActiveCategory] = useState('all');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [billingPrices, setBillingPrices] = useState<Partial<Record<'monthly' | 'yearly', PublicBillingPrice>>>({});
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
    if (planId === 'free') return { value: '0 ₫', suffix: '' };
    if (planId === 'enterprise') return { value: 'Liên hệ', suffix: '' };
    const price = billingPrices[billingCycle];
    if (!price) return { value: 'Đang cập nhật', suffix: '' };
    const monthlyAmount = price.unit_amount / (price.interval === 'year' ? 12 * price.interval_count : price.interval_count);
    const divisor = ZERO_DECIMAL_CURRENCIES.has(price.currency.toLowerCase()) ? 1 : 100;
    return {
      value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: price.currency.toUpperCase(), maximumFractionDigits: 0 }).format(monthlyAmount / divisor),
      suffix: '/ tháng'
    };
  };

  const yearlySaving = billingPrices.monthly && billingPrices.yearly && billingPrices.monthly.currency === billingPrices.yearly.currency
    ? Math.max(0, Math.round((1 - billingPrices.yearly.unit_amount / (billingPrices.monthly.unit_amount * 12)) * 100))
    : 0;

  const startPlan = (planId: string) => {
    if (planId === 'pro') localStorage.setItem('apexa_pending_upgrade_cycle', billingCycle);
    onSignUp();
  };

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredFeatures = FEATURES.filter(f => activeCategory === 'all' || f.category === activeCategory);

  const handlePrevTestimonial = () => {
    setActiveTestimonial(prev => (prev === 0 ? TESTIMONIALS.length - 1 : prev - 1));
  };

  const handleNextTestimonial = () => {
    setActiveTestimonial(prev => (prev === TESTIMONIALS.length - 1 ? 0 : prev + 1));
  };

  const doubledLogos = [...TRUSTED_LOGOS, ...TRUSTED_LOGOS, ...TRUSTED_LOGOS, ...TRUSTED_LOGOS];

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden bg-white dark:bg-[#07080c] transition-colors duration-300 font-sans text-slate-800 dark:text-slate-100">
      
      {/* Dynamic Ambient Background Mouse Spotlight */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40 dark:opacity-60"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}% ${mousePos.y}%, rgba(123, 97, 255, 0.12), transparent 80%)`
        }}
      />
      
      {/* Floating Animated Ambient Blobs */}
      <motion.div
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -100, 50, 0],
          scale: [1, 1.2, 0.85, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-[-10%] left-[-15%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[130px] pointer-events-none z-0"
      />
      <motion.div
        animate={{
          x: [0, -60, 90, 0],
          y: [0, 80, -70, 0],
          scale: [1, 0.85, 1.2, 1],
        }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        className="fixed bottom-[5%] right-[-10%] w-[550px] h-[550px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none z-0"
      />

      {/* Ultra Glassmorphic Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-[#07080c]/80 backdrop-blur-2xl border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5 cursor-pointer select-none group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                A
              </div>
              <span className="font-display font-black text-lg tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                Apexa <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs uppercase">OS 2.0</span>
              </span>
            </div>

            <nav className="hidden lg:flex items-center gap-1.5">
              {[
                { label: 'Tính năng', id: 'features' },
                { label: 'Cách hoạt động', id: 'how-it-works' },
                { label: 'Bảng giá', id: 'pricing' },
                { label: 'Đánh giá', id: 'testimonials' },
                { label: 'Hỏi đáp', id: 'faq' }
              ].map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="px-4 py-2 text-xs font-black text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-all cursor-pointer relative group/nav"
                >
                  {link.label}
                  <span className="absolute bottom-1 left-4 right-4 h-0.5 bg-indigo-500 scale-x-0 group-hover/nav:scale-x-100 transition-transform duration-200" />
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onSignIn}
              className="hidden sm:inline-flex text-xs font-black text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 px-4 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Đăng nhập
            </button>
            <button
              onClick={onSignUp}
              className="text-xs font-black bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:brightness-105 px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              Dùng thử miễn phí 🚀
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-800 dark:text-white"
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
            className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0d0e17]/95 backdrop-blur-2xl px-5 py-4 space-y-2 select-none"
          >
            {['features', 'how-it-works', 'pricing', 'testimonials', 'faq'].map((id) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="block w-full text-left px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                {id === 'features' ? 'Tính năng' : id === 'how-it-works' ? 'Cách hoạt động' : id === 'pricing' ? 'Bảng giá' : id === 'testimonials' ? 'Đánh giá' : 'Hỏi đáp'}
              </button>
            ))}
            <button onClick={onSignIn} className="block w-full text-left px-4 py-3 text-xs font-black text-indigo-600 dark:text-indigo-400 cursor-pointer border-t border-slate-100 dark:border-slate-800 pt-3">
              Đăng nhập
            </button>
          </motion.div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 pt-12 lg:pt-20 pb-16 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-7 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-[11px] font-black text-indigo-700 dark:text-indigo-300 select-none cursor-default"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
              </span>
              Apexa OS 2.0 — Nền tảng năng suất AI thế hệ mới
              <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-[3.6rem] font-black tracking-tight text-slate-900 dark:text-white leading-[1.08] font-display"
            >
              Hệ điều hành{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">
                năng suất
              </span>
              {' '}cho đội ngũ hiện đại
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-slate-500 dark:text-slate-400 text-sm sm:text-base font-medium leading-relaxed max-w-xl mx-auto lg:mx-0"
            >
              Quản lý dự án, tài liệu, lịch biểu, trò chuyện trực tiếp và trợ lý AI thông minh — tất cả trên một bề mặt canvas phẳng đồng nhất của Apexa OS.
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
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white text-sm font-black rounded-2xl shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                Bắt đầu miễn phí
                <ArrowRight className="w-4.5 h-4.5" />
              </motion.button>
              <button
                onClick={() => scrollTo('features')}
                className="w-full sm:w-auto px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
              >
                <span className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center transition-colors">
                  <Play className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ml-0.5" />
                </span>
                Khám phá tính năng
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-center gap-4 pt-4 justify-center lg:justify-start"
            >
              <div className="flex -space-x-2">
                {['HX', 'MA', 'QB', 'TV', 'LA'].map((initials, i) => (
                  <div
                    key={i}
                    className="w-8.5 h-8.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white dark:border-[#07080c] flex items-center justify-center text-[9px] font-black text-white shadow-sm"
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-slate-500 dark:text-slate-400">
                  <span className="text-slate-900 dark:text-white font-black">4.9/5</span> từ 25.000+ đội ngũ
                </span>
              </div>
            </motion.div>
          </div>

          {/* Interactive Product Mockup Container */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-3xl pointer-events-none" />
            <ProductMockup />
          </div>
        </div>
      </section>

      {/* Trusted Logos Marquee Strip */}
      <section className="relative z-10 border-y border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 backdrop-blur-md py-8 overflow-hidden select-none">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <p className="text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">
            Được tin tưởng và đồng hành cùng các đội ngũ doanh nghiệp hàng đầu
          </p>
          <div className="overflow-hidden w-full relative py-2">
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent dark:from-[#07080c] z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent dark:from-[#07080c] z-10 pointer-events-none" />
            <motion.div
              animate={{ x: [0, -1200] }}
              transition={{ ease: "linear", duration: 35, repeat: Infinity }}
              className="flex gap-20 w-max whitespace-nowrap px-4"
            >
              {doubledLogos.map((logo, index) => (
                <span key={index} className="text-sm font-black text-slate-400 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
                  {logo}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Animated Counter Stat Cards */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-20">
        <FadeInSection>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: activeUsers, suffix: '+', label: 'Doanh nghiệp hoạt động', icon: Users },
              { value: tasksCompleted, suffix: '+', label: 'Nhiệm vụ hoàn tất/ngày', icon: Check },
              { value: 99.9, suffix: '%', label: 'Uptime đảm bảo tuyệt đối', icon: ShieldCheck, decimals: 1 },
              { value: 40, suffix: '%', label: 'Tiết kiệm thời gian vận hành', icon: Zap },
            ].map((stat, i) => (
              <div key={i} className="text-center p-6 rounded-3xl bg-white dark:bg-[#0d0e17] border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-indigo-500/40 transition-all group">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <stat.icon className="w-5.5 h-5.5" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} decimals={'decimals' in stat ? stat.decimals : 0} />
                </div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </FadeInSection>
      </section>

      {/* Feature Showcase Grid */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/60 dark:border-slate-800/60">
        <FadeInSection>
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
              Tính năng vượt trội
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              Tất cả những gì đội ngũ cần để dẫn đầu
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Apexa OS kết hợp hoàn hảo giữa các công cụ quản lý dự án hàng đầu và Trợ lý AI thế hệ mới.
            </p>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap justify-center gap-2 pt-4">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredFeatures.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-3xl bg-white dark:bg-[#0d0e17] p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-indigo-500/40 transition-all hover:-translate-y-1 text-left flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className={`w-12 h-12 rounded-2xl ${feat.bg} flex items-center justify-center ${feat.iconColor} border border-slate-200/40 dark:border-slate-800/40 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">{feat.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{feat.desc}</p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1 text-xs font-black text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Tìm hiểu thêm</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </FadeInSection>
      </section>

      {/* How It Works Progressive Timeline */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/60 dark:border-slate-800/60">
        <FadeInSection>
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
            <span className="text-[10px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full border border-purple-200/50 dark:border-purple-800/50">
              Quy trình đơn giản
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              Vận hành mượt mà chỉ với 4 bước
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Chuyển đổi cách thức làm việc nhóm từ truyền thống sang môi trường tích hợp AI hiện đại.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {WORKFLOW_STEPS.map((step, i) => {
              const StepIcon = step.icon;
              return (
                <div key={step.step} className="relative rounded-3xl bg-white dark:bg-[#0d0e17] p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-xs text-left space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{step.step}</span>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <StepIcon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">{step.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </FadeInSection>
      </section>

      {/* Transparent Pricing Grid */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/60 dark:border-slate-800/60">
        <FadeInSection>
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
              Bảng giá linh hoạt
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              Chi phí minh bạch, tối ưu giá trị
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Không chi phí ẩn. Bắt đầu miễn phí và nâng cấp bất cứ lúc nào khi nhóm phát triển.
            </p>

            {/* Monthly / Yearly Billing Toggle */}
            <div className="flex items-center justify-center gap-3 pt-4">
              <span className={`text-xs font-bold ${billingCycle === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Thanh toán hàng tháng</span>
              <button
                onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                className="w-12 h-6 rounded-full bg-indigo-600 p-1 relative transition-colors cursor-pointer"
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${billingCycle === 'yearly' ? 'translate-x-6' : ''}`} />
              </button>
              <span className={`text-xs font-bold flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                Thanh toán hàng năm
                {yearlySaving > 0 && <span className="text-[9px] font-black uppercase bg-emerald-500 text-white px-2 py-0.5 rounded-full">Tiết kiệm {yearlySaving}%</span>}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {PRICING_PLANS.map(plan => {
              const price = formatPrice(plan.id);
              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-8 flex flex-col justify-between text-left relative transition-all ${
                    plan.highlight
                      ? 'bg-gradient-to-b from-indigo-900/10 via-purple-900/5 to-white dark:to-[#0d0e17] border-2 border-indigo-600 dark:border-indigo-500 shadow-2xl shadow-indigo-500/15 scale-105 z-10'
                      : 'bg-white dark:bg-[#0d0e17] border border-slate-200/80 dark:border-slate-800/80 shadow-xs'
                  }`}
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
                        {plan.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">{plan.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">{plan.desc}</p>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">{price.value}</span>
                      {price.suffix && <span className="text-xs text-slate-400 font-bold">{price.suffix}</span>}
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => startPlan(plan.id)}
                    className={`w-full mt-8 py-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer text-center shadow-md ${
                      plan.highlight
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:brightness-105'
                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                    }`}
                  >
                    {plan.id === 'pro' ? 'Dùng Pro' : plan.id === 'enterprise' ? 'Liên hệ tư vấn' : 'Bắt đầu miễn phí'}
                  </button>
                </div>
              );
            })}
          </div>
        </FadeInSection>
      </section>

      {/* Testimonials Slider */}
      <section id="testimonials" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/60 dark:border-slate-800/60">
        <FadeInSection>
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
            <span className="text-[10px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 px-3 py-1 rounded-full border border-rose-200/50 dark:border-rose-800/50">
              Đánh giá thực tế
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              Được yêu thích bởi các nhà quản lý dự án
            </h2>
          </div>

          <div className="max-w-4xl mx-auto relative rounded-3xl bg-white dark:bg-[#0d0e17] p-8 md:p-12 border border-slate-200/80 dark:border-slate-800/80 shadow-xl text-left">
            <Quote className="w-12 h-12 text-indigo-500/20 mb-4" />
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <p className="text-base md:text-lg text-slate-700 dark:text-slate-200 font-extrabold leading-relaxed">
                  "{TESTIMONIALS[activeTestimonial].quote}"
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${TESTIMONIALS[activeTestimonial].gradient} text-white font-black text-xs flex items-center justify-center shadow-md`}>
                      {TESTIMONIALS[activeTestimonial].avatar}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">{TESTIMONIALS[activeTestimonial].author}</h4>
                      <p className="text-xs text-slate-400 font-semibold">{TESTIMONIALS[activeTestimonial].role} · {TESTIMONIALS[activeTestimonial].company}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevTestimonial}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNextTestimonial}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
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

      {/* FAQ Accordion */}
      <section id="faq" className="relative z-10 max-w-4xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/60 dark:border-slate-800/60 text-left">
        <FadeInSection>
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
            <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 px-3 py-1 rounded-full border border-cyan-200/50 dark:border-cyan-800/50">
              Giải đáp thắc mắc
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              Các câu hỏi thường gặp
            </h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-2xl bg-white dark:bg-[#0d0e17] border border-slate-200/80 dark:border-slate-800/80 overflow-hidden transition-all">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-5 text-left text-sm font-extrabold text-slate-900 dark:text-white flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </FadeInSection>
      </section>

      {/* Final Call to Action Hero Box */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 pb-20">
        <FadeInSection>
          <div className="relative rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-8 md:p-14 text-center text-white overflow-hidden shadow-2xl shadow-indigo-500/20">
            <div className="space-y-6 relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight font-display">
                Sẵn sàng kiến tạo văn hóa năng suất mới cho đội ngũ?
              </h2>
              <p className="text-xs sm:text-sm font-medium text-white/90 leading-relaxed">
                Đăng ký tài khoản Apexa OS ngay hôm nay để trải nghiệm toàn bộ sức mạnh quản lý dự án kết hợp Trợ lý AI thế hệ mới.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <button
                  onClick={onSignUp}
                  className="w-full sm:w-auto px-8 py-4 bg-white text-indigo-650 text-sm font-black rounded-2xl shadow-xl hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Bắt đầu dùng thử miễn phí 🚀
                </button>
                <button
                  onClick={onSignIn}
                  className="w-full sm:w-auto px-6 py-4 bg-indigo-900/40 hover:bg-indigo-900/60 border border-white/30 text-white text-sm font-bold rounded-2xl transition-all cursor-pointer"
                >
                  Đăng nhập tài khoản
                </button>
              </div>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* Modern Footer */}
      <footer className="relative z-10 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#07080c] py-12 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-sm">
                A
              </div>
              <span className="font-display font-black text-base tracking-tight text-slate-900 dark:text-white">
                Apexa OS
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Hệ điều hành năng suất AI thế hệ mới cho đội ngũ hiện đại. Quản lý dự án, tài liệu và đồng bộ thời gian thực.
            </p>
          </div>

          <div>
            <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">Sản phẩm</h4>
            <ul className="space-y-2 text-[11px]">
              <li><a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400">Kanban Boards</a></li>
              <li><a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400">Smart Documents</a></li>
              <li><a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400">ChatRoom Realtime</a></li>
              <li><a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400">Apexa AI Assistant</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">Doanh nghiệp</h4>
            <ul className="space-y-2 text-[11px]">
              <li><a href="#pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400">Bảng giá</a></li>
              <li><a href="#testimonials" className="hover:text-indigo-600 dark:hover:text-indigo-400">Khách hàng</a></li>
              <li><a href="#faq" className="hover:text-indigo-600 dark:hover:text-indigo-400">Hỏi đáp & Bảo mật</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">Bản tin công nghệ</h4>
            <p className="text-slate-400 text-[11px]">Đăng ký nhận thông tin cập nhật tính năng mới nhất từ Apexa OS.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Nhập email của bạn..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none text-slate-800 dark:text-white"
              />
              <button onClick={() => alert('Đã đăng ký nhận bản tin thành công!')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 cursor-pointer">
                Gửi
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-5 sm:px-6 pt-8 mt-8 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-400 font-bold">
          <p>© 2026 Apexa OS Inc. Tất cả quyền được bảo lưu.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">Điều khoản dịch vụ</a>
            <a href="#" className="hover:underline">Chính sách bảo mật</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
