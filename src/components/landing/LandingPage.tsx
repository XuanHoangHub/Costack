"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';
import {
  Kanban, Sparkles, ArrowRight, Star, Menu, X,
  Brain, FileText, MessageSquare, Calendar, BarChart3, Timer,
  Database, Users, Zap, Shield, Check, Play, Quote,
  LayoutGrid, Search, Mail, ListTodo, Timer as TimerIcon,
  ChevronRight, ChevronLeft, Send, Bot, CheckSquare, Plus, HelpCircle, ArrowUpRight
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
    title: 'Apexa AI',
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
    desc: 'Thảo luận nhóm ngay trong workspace — không cần chuyển sang Slack hay Teams.',
    color: 'from-cyan-500 to-blue-500',
    bg: 'bg-cyan-50/80 dark:bg-cyan-950/20',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    category: 'collaboration'
  },
  {
    icon: Calendar,
    title: 'Lịch & Gantt',
    desc: 'Lên kế hoạch deadline, theo dõi timeline dự án và đồng bộ lịch team.',
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    category: 'task'
  },
  {
    icon: BarChart3,
    title: 'Analytics Hub',
    desc: 'Dashboard phân tích hiệu suất team, velocity sprint và tiến độ dự án real-time.',
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50/80 dark:bg-amber-950/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    category: 'analytics'
  },
  {
    icon: Timer,
    title: 'Pomodoro Focus',
    desc: 'Tích hợp kỹ thuật Pomodoro giúp team tập trung và theo dõi thời gian làm việc.',
    color: 'from-rose-500 to-red-500',
    bg: 'bg-rose-50/80 dark:bg-rose-955/20',
    iconColor: 'text-rose-600 dark:text-rose-400',
    category: 'task'
  },
  {
    icon: Database,
    title: 'Multi-Base Workspace',
    desc: 'Tổ chức nhiều workspace, space và base — phù hợp mọi quy mô từ startup đến enterprise.',
    color: 'from-violet-500 to-indigo-500',
    bg: 'bg-violet-50/80 dark:bg-violet-950/20',
    iconColor: 'text-violet-600 dark:text-violet-400',
    category: 'analytics'
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Tạo không gian làm việc',
    desc: 'Đăng ký tài khoản miễn phí và cấu hình không gian làm việc đầu tiên của bạn trong 30 giây.',
  },
  {
    step: '02',
    title: 'Kết nối nhóm của bạn',
    desc: 'Tạo dự án chung, gửi lời mời cho các thành viên và tổ chức các ban công việc khoa học.',
  },
  {
    step: '03',
    title: 'Bứt phá năng suất với AI',
    desc: 'Theo dõi tiến độ, chia sẻ thông tin tài liệu, chat trực tuyến và để trợ lý AI thúc đẩy tiến trình.',
  },
];

const TESTIMONIALS = [
  {
    quote: 'Apexa đã hoàn toàn thay thế 4 công cụ rời rạc cho doanh nghiệp của chúng tôi. Lập kế hoạch sprint hàng tuần giờ chỉ tốn 15 phút.',
    name: 'Nguyễn Minh Tuấn',
    role: 'Engineering Lead, TechFlow',
    avatar: 'MT',
    color: 'bg-indigo-500',
  },
  {
    quote: 'Trợ lý Apexa AI tóm tắt các yêu cầu và thiết lập công việc một cách ngoạn mục. Đội ngũ thiết kế của chúng tôi tiết kiệm được 8-10 giờ mỗi tuần.',
    name: 'Trần Thảo Vy',
    role: 'Marketing Director, Mango Tech',
    avatar: 'TV',
    color: 'bg-pink-500',
  },
  {
    quote: 'Giao diện cực kỳ đẹp mắt, trải nghiệm đồng bộ thời gian thực rất mượt. Teams làm việc từ xa của chúng tôi hoạt động hiệu quả hơn bao giờ hết nhờ Apexa.',
    name: 'Lê Hoàng Anh',
    role: 'CEO, RemoteFirst Co.',
    avatar: 'LA',
    color: 'bg-emerald-500',
  },
];

const FAQS = [
  {
    q: "Apexa OS là gì?",
    a: "Apexa OS là một hệ điều hành năng suất toàn diện (All-in-One Workspace) giúp các nhóm quản lý dự án, tài liệu, lịch trình, chat thời gian thực và tự động hóa quy trình với Trợ lý AI. Thay vì sử dụng Slack, Jira, Notion và Google Calendar riêng biệt, bạn có tất cả trong một nền tảng thống nhất."
  },
  {
    q: "Tôi có thể sử dụng Apexa miễn phí không?",
    a: "Có! Gói Starter của chúng tôi miễn phí hoàn toàn và mãi mãi cho tối đa 5 thành viên. Gói này cung cấp các tính năng quản lý công việc cơ bản, Kanban board và chat nhóm để bạn bắt đầu ngay lập tức."
  },
  {
    q: "Apexa AI hoạt động như thế nào?",
    a: "Apexa AI là trợ lý AI được tích hợp sâu vào hệ thống. AI có thể tự động đọc tài liệu của bạn để tóm tắt, tạo checklist công việc từ các cuộc thảo luận, tự động điền các trường dữ liệu, và gợi ý cách phân bổ công việc tối ưu cho team."
  },
  {
    q: "Dữ liệu của tôi được bảo mật như thế nào?",
    a: "Chúng tôi coi trọng bảo mật dữ liệu lên hàng đầu. Tất cả dữ liệu của bạn được mã hóa khi truyền (SSL/TLS) và khi lưu trữ (AES-256). Chúng tôi sử dụng cơ sở hạ tầng đám mây đạt chuẩn enterprise và tuân thủ các quy định bảo mật nghiêm ngặt như GDPR."
  },
  {
    q: "Tôi có thể hủy gói Pro bất cứ lúc nào không?",
    a: "Hoàn toàn có thể. Khi bạn hủy gói Pro, tài khoản của bạn sẽ hoạt động bình thường cho đến hết chu kỳ thanh toán hiện tại và sau đó sẽ tự động chuyển về gói Starter miễn phí mà không bị mất dữ liệu."
  }
];

const TRUSTED_LOGOS = ['TechFlow Solutions', 'Mango Tech', 'RemoteFirst Co.', 'NovaLabs Corp', 'PixelWorks Studio', 'DataSync Labs'];

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
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ProductMockup() {
  const [mockupTab, setMockupTab] = useState<'board' | 'list' | 'calendar' | 'ai'>('board');
  const [tasks, setTasks] = useState<MockTask[]>([
    { id: 't1', title: 'Thiết kế landing page mới', column: 'todo', priority: 'Cao', dueDate: 'Hôm nay', assignee: 'Vy' },
    { id: 't2', title: 'Review tài liệu API', column: 'todo', priority: 'Trung bình', dueDate: 'Ngày mai', assignee: 'Tấn' },
    { id: 't3', title: 'Tích hợp trợ lý Apexa AI', column: 'inprogress', priority: 'Khẩn cấp', dueDate: 'Quá hạn', assignee: 'Anh' },
    { id: 't4', title: 'Sửa lỗi đồng bộ dữ liệu', column: 'inprogress', priority: 'Thấp', dueDate: '18/07', assignee: 'Tấn' },
    { id: 't5', title: 'Deploy v2.0 lên production', column: 'done', priority: 'Cao', dueDate: 'Hôm qua', assignee: 'Anh', checked: true },
  ]);

  // AI simulator states
  const [aiMessages, setAiMessages] = useState<Array<{ id: string; sender: 'user' | 'bot'; text: string }>>([
    { id: 'init', sender: 'bot', text: 'Xin chào! Tôi là Trợ lý Trí tuệ Nhân tạo Apexa AI. Chọn một tác vụ bên dưới hoặc gõ yêu cầu của bạn để tôi hỗ trợ lập kế hoạch!' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [selectedTaskForTooltip, setSelectedTaskForTooltip] = useState<string | null>(null);

  const scrollChatToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (mockupTab === 'ai') {
      scrollChatToBottom();
    }
  }, [aiMessages, mockupTab, aiTyping]);

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const checked = !t.checked;
        return {
          ...t,
          checked,
          column: checked ? 'done' : 'todo'
        };
      }
      return t;
    }));
  };

  const handleAddTask = (column: 'todo' | 'inprogress' | 'done') => {
    if (!newTaskInput.trim()) return;
    const newTask: MockTask = {
      id: `t-${Date.now()}`,
      title: newTaskInput.trim(),
      column,
      priority: 'Trung bình',
      dueDate: 'Chưa đặt',
      assignee: 'Bạn',
      checked: column === 'done'
    };
    setTasks(prev => [...prev, newTask]);
    setNewTaskInput('');
  };

  const handleSendAi = (textToSend?: string) => {
    const text = textToSend || aiInput;
    if (!text.trim()) return;

    const userMsgId = `user-${Date.now()}`;
    setAiMessages(prev => [...prev, { id: userMsgId, sender: 'user', text }]);
    if (!textToSend) setAiInput('');
    setAiTyping(true);

    setTimeout(() => {
      setAiTyping(false);
      let reply = '';
      const lower = text.toLowerCase();

      if (lower.includes('lập kế hoạch') || lower.includes('sprint') || lower.includes('plan')) {
        reply = 'Tôi đã tự động thiết lập 3 nhiệm vụ mới cho kế hoạch tuần này trong cột "Cần làm":\n1. 💻 Phát triển giao diện Live Chat mới\n2. 🎨 Hoàn thiện tối ưu hóa UI/UX Landing Page\n3. 🔒 Tích hợp bảo mật đa lớp 2FA';
        setTasks(prev => [
          ...prev,
          { id: `ai-1-${Date.now()}`, title: 'Phát triển giao diện Live Chat mới', column: 'todo', priority: 'Cao', dueDate: '22/07', assignee: 'Vy' },
          { id: `ai-2-${Date.now()}`, title: 'Hoàn thiện tối ưu hóa UI/UX Landing Page', column: 'todo', priority: 'Cao', dueDate: '25/07', assignee: 'Anh' },
          { id: `ai-3-${Date.now()}`, title: 'Tích hợp bảo mật đa lớp 2FA', column: 'todo', priority: 'Khẩn cấp', dueDate: 'Hôm nay', assignee: 'Tấn' },
        ]);
      } else if (lower.includes('tóm tắt') || lower.includes('tiến độ') || lower.includes('báo cáo')) {
        const completed = tasks.filter(t => t.column === 'done').length;
        const total = tasks.length;
        reply = `Báo cáo phân tích: Dự án đang đạt ${Math.round((completed / total) * 100)}% tổng tiến độ (${completed}/${total} nhiệm vụ hoàn thành). Nhiệm vụ khẩn cấp "Tích hợp trợ lý Apexa AI" đang bị trễ hạn. Đề xuất phân bổ tài nguyên hỗ trợ xử lý ngay.`;
      } else if (lower.includes('thông báo') || lower.includes('email')) {
        reply = 'Bản nháp thông báo gửi nhóm đã sẵn sàng:\n"Chào team, hệ thống đã hoàn thành cập nhật Apexa OS v2.0 và đang tinh chỉnh tính năng đồng bộ thời gian thực. Mọi người vui lòng kiểm tra Kanban Board để nhận tác vụ mới nhé!"';
      } else {
        reply = `Đã nhận yêu cầu: "${text}". Với vai trò trợ lý dự án AI, tôi sẵn sàng phân tích tiến độ, gợi ý nhãn, tự động lập danh sách công việc con hoặc tối ưu hóa luồng việc cho nhóm của bạn.`;
      }

      const botMsgId = `bot-${Date.now()}`;
      setAiMessages(prev => [...prev, { id: botMsgId, sender: 'bot', text: '' }]);
      
      let typedText = '';
      let charIdx = 0;
      const interval = setInterval(() => {
        if (charIdx < reply.length) {
          typedText += reply[charIdx];
          setAiMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: typedText } : m));
          charIdx++;
        } else {
          clearInterval(interval);
        }
      }, 12);
    }, 1100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 35, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-[0_24px_80px_rgba(99,102,241,0.12)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.3)] relative overflow-hidden flex flex-col min-h-[460px] lg:min-h-[520px]"
    >
      {/* Mockup Toolbar Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-150 dark:border-slate-800 select-none">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-450 block cursor-pointer hover:scale-105 transition-transform" />
            <span className="w-3.5 h-3.5 rounded-full bg-amber-450 block cursor-pointer hover:scale-105 transition-transform" />
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-450 block cursor-pointer hover:scale-105 transition-transform" />
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-extrabold text-slate-500 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block animate-pulse" />
            <span>Trải nghiệm tính năng trực quan</span>
          </div>
        </div>
        <div className="relative w-44 hidden sm:flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
          <input
            type="text"
            readOnly
            placeholder="Tìm kiếm nhanh..."
            className="w-full pl-9 pr-3 py-1.5 text-[10px] rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 focus:outline-none font-semibold cursor-default"
          />
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Mockup Sidebar */}
        <aside className="w-40 bg-slate-50/30 dark:bg-slate-955/10 border-r border-slate-150 dark:border-slate-800 p-4 space-y-4 hidden sm:block shrink-0">
          <div className="space-y-1">
            {[
              { id: 'board', icon: LayoutGrid, label: 'Bảng Kanban' },
              { id: 'list', icon: ListTodo, label: 'Dạng danh sách' },
              { id: 'calendar', icon: Calendar, label: 'Lịch biểu' },
              { id: 'ai', icon: Brain, label: 'Apexa AI', badge: 'PRO' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setMockupTab(item.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-[10px] font-extrabold rounded-xl transition-all cursor-pointer ${
                  mockupTab === item.id
                    ? 'bg-white dark:bg-slate-800 shadow-xs border border-slate-200/50 dark:border-slate-700 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-md text-[7px] font-black">{item.badge}</span>
                )}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <div className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Dự án chính</div>
            {[
              { name: 'Marketing Campaign', color: 'bg-pink-400' },
              { name: 'Apexa Core R&D', color: 'bg-purple-500' },
              { name: 'Beta Testing QA', color: 'bg-indigo-400' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 px-2 py-1 text-[9px] font-extrabold text-slate-550 dark:text-slate-400 cursor-default hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                <span className={`w-2 h-2 rounded-full ${s.color}`} />
                {s.name}
              </div>
            ))}
          </div>
        </aside>

        {/* Mockup Work Area */}
        <div className="flex-1 flex flex-col p-5 space-y-4 overflow-hidden relative bg-white/30 dark:bg-slate-900/30">
          {/* Navigation Bar inside work area */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-4.5 text-[10px] font-extrabold text-slate-450 dark:text-slate-500">
              {[
                { id: 'board', label: 'Bảng', icon: Kanban },
                { id: 'list', label: 'Danh sách', icon: ListTodo },
                { id: 'calendar', label: 'Lịch biểu', icon: Calendar },
                { id: 'ai', label: 'Apexa AI', icon: Brain }
              ].map(subTab => (
                <button
                  key={subTab.id}
                  onClick={() => setMockupTab(subTab.id as any)}
                  className={`pb-3 -mb-3 transition-all flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 ${
                    mockupTab === subTab.id ? 'text-indigo-650 dark:text-indigo-400 border-b-2 border-indigo-500 font-black' : ''
                  }`}
                >
                  <subTab.icon className="w-3.5 h-3.5" /> {subTab.label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-slate-400 uppercase">Hoàn thành:</span>
              <span className="text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                {tasks.filter(t => t.column === 'done').length}/{tasks.length}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-auto min-h-0">
            <AnimatePresence mode="wait">
              {/* BOARD VIEW */}
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
                      <div key={col.key} className="bg-slate-50/50 dark:bg-slate-950/15 border border-slate-150/60 dark:border-slate-800/60 p-3 rounded-2xl flex flex-col h-full space-y-2">
                        <div className="flex items-center justify-between mb-1 px-1">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                            <span className={`text-[10px] font-black uppercase tracking-wider ${col.color}`}>{col.label}</span>
                          </span>
                          <span className="text-[9px] font-black text-slate-400">{colTasks.length}</span>
                        </div>

                        <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
                          {colTasks.map(task => (
                            <motion.div
                              layoutId={task.id}
                              key={task.id}
                              className="p-3 bg-white dark:bg-slate-850 border border-slate-150 dark:border-slate-800/80 rounded-xl shadow-3xs hover:shadow-md transition-all relative group"
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

                              <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                                <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold">
                                  Hạn: {task.dueDate}
                                </span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-black uppercase">{task.assignee}</span>
                                  {task.priority === 'Khẩn cấp' ? (
                                    <span className="text-[8px] bg-rose-50 dark:bg-rose-955/30 text-rose-650 dark:text-rose-400 font-black px-1.5 py-0.5 rounded uppercase border border-rose-100 dark:border-rose-900/30">Hỏa tốc</span>
                                  ) : (
                                    <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-550 px-1.5 py-0.5 rounded font-black uppercase">{task.priority}</span>
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
                            className="w-full px-2.5 py-1.5 text-[9px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none text-slate-800 dark:text-white font-semibold focus:border-indigo-505 focus:ring-1 focus:ring-indigo-500"
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
                      <tr className="border-b border-slate-150 dark:border-slate-800 text-slate-400 uppercase tracking-widest font-black text-[8px]">
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
                        <tr key={task.id} className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
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
                                ? 'bg-rose-50 dark:bg-rose-955/20 text-rose-650 dark:text-rose-450 border border-rose-100 dark:border-rose-900/30'
                                : task.priority === 'Cao'
                                ? 'bg-amber-50 dark:bg-amber-955/20 text-amber-655 dark:text-amber-400 border border-amber-105 dark:border-amber-900/30'
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
                    <span>Tháng 7, 2026</span>
                    <div className="flex gap-1">
                      <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft className="w-3.5 h-3.5" /></button>
                      <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center font-bold text-[8px] text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <div key={d}>{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 grid-rows-5 gap-1 flex-1 min-h-[220px]">
                    {Array.from({ length: 35 }).map((_, i) => {
                      const dayNum = i - 1; // Simulated starting day offset
                      const isValidDay = dayNum > 0 && dayNum <= 31;
                      
                      // Map mockup tasks to visual calendar blocks
                      let matchedTask: MockTask | undefined;
                      if (dayNum === 15) matchedTask = tasks[0]; 
                      if (dayNum === 16) matchedTask = tasks[1]; 
                      if (dayNum === 14) matchedTask = tasks[2]; // Apexa AI
                      if (dayNum === 18) matchedTask = tasks[3]; 
                      if (dayNum === 13) matchedTask = tasks[4]; 

                      return (
                        <div
                          key={i}
                          className={`bg-slate-50/40 dark:bg-slate-955/10 border border-slate-150/60 dark:border-slate-800/40 p-1 rounded-lg flex flex-col items-start relative min-h-[44px] ${
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
                                  : 'bg-indigo-50 dark:bg-indigo-955/35 text-indigo-650 dark:text-indigo-400'
                              }`}
                            >
                              {matchedTask.title}

                              {selectedTaskForTooltip === matchedTask.id && (
                                <div className="absolute bottom-full left-0 z-[60] w-36 bg-slate-950 text-white text-[8px] p-2.5 rounded-xl shadow-xl pointer-events-auto mt-1 border border-slate-800">
                                  <p className="font-extrabold mb-1">{matchedTask.title}</p>
                                  <p className="text-slate-400 font-semibold">Phụ trách: {matchedTask.assignee}</p>
                                  <p className="text-slate-450 font-semibold">Ưu tiên: {matchedTask.priority}</p>
                                  <p className="text-slate-450 font-semibold">Trạng thái: {matchedTask.column}</p>
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
                  className="h-full flex flex-col bg-slate-50/50 dark:bg-slate-955/15 border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden p-3.5 min-h-[280px]"
                >
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[220px]">
                    {aiMessages.map((msg, i) => (
                      <div key={i} className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                        {msg.sender === 'bot' && (
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-550 to-purple-650 flex items-center justify-center text-white shrink-0 shadow-sm border border-indigo-400/25">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}
                        <div className={`p-3 rounded-2xl max-w-[80%] text-[9.5px] font-bold leading-relaxed whitespace-pre-line ${
                          msg.sender === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-xs'
                            : 'bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-3xs'
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
                        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 px-3 py-2.5 rounded-2xl rounded-tl-none flex items-center gap-1 shadow-3xs">
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
                        className="text-[8px] font-black border border-indigo-150/40 dark:border-indigo-900 bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 px-2.5 py-1 rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom input */}
                  <div className="flex gap-2 pt-2 border-t border-slate-150 dark:border-slate-800">
                    <input
                      type="text"
                      placeholder="Giao việc cho Apexa AI..."
                      disabled={aiTyping}
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendAi();
                      }}
                      className="flex-1 px-3.5 py-2.5 text-[9px] rounded-xl border border-slate-205 dark:border-slate-850 bg-white dark:bg-slate-900 outline-none text-slate-800 dark:text-white font-semibold focus:border-indigo-500"
                    />
                    <button
                      onClick={() => handleSendAi()}
                      disabled={aiTyping || !aiInput.trim()}
                      className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Draggable Apexa AI Live Pill widget */}
      <motion.div
        drag
        dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
        className="absolute bottom-6 left-6 z-30 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-indigo-100 dark:border-indigo-950/60 shadow-[0_12px_40px_rgba(99,102,241,0.12)] p-4.5 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2 pb-2.5 border-b border-indigo-50 dark:border-indigo-950/60">
          <div className="w-6.5 h-6.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
          </div>
          <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Apexa AI</span>
          <span className="ml-auto text-[8px] text-emerald-500 font-extrabold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Trực tuyến
          </span>
        </div>
        <p className="text-[9.5px] text-slate-650 dark:text-slate-300 leading-relaxed pt-2.5 font-bold">
          Sprint Q2 đang <strong className="text-indigo-600 dark:text-indigo-400">hoàn thành {Math.round((tasks.filter(t => t.column === 'done').length / tasks.length) * 100)}%</strong>. Thử nhấn chọn tab Apexa AI để ra lệnh tạo việc thông minh!
        </p>
      </motion.div>
    </motion.div>
  );
}

export default function LandingPage({ onSignUp, onSignIn, activeUsers, tasksCompleted }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  // Custom states for upgraded landing page
  const [activeCategory, setActiveCategory] = useState('all');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
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
    <div ref={containerRef} className="relative w-full overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Ambient background mouse spotlight tracking */}
      <div
        className="fixed inset-0 pointer-events-none login-spotlight-bg z-0"
        style={{ '--mouse-x': `${mousePos.x}%`, '--mouse-y': `${mousePos.y}%` } as React.CSSProperties}
      />
      
      {/* Dynamic Animated Ambient Liquid Blobs in background */}
      <motion.div
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -100, 50, 0],
          scale: [1, 1.25, 0.85, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="fixed top-[-10%] left-[-15%] w-[600px] h-[600px] bg-indigo-650/15 rounded-full blur-[130px] pointer-events-none z-0"
      />
      <motion.div
        animate={{
          x: [0, -60, 90, 0],
          y: [0, 80, -70, 0],
          scale: [1, 0.85, 1.2, 1],
        }}
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="fixed bottom-[5%] right-[-10%] w-[550px] h-[550px] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none z-0"
      />
      <motion.div
        animate={{
          x: [0, 40, -40, 0],
          y: [0, 50, -80, 0],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="fixed top-[40%] left-[30%] w-[400px] h-[400px] bg-purple-500/8 rounded-full blur-[110px] pointer-events-none z-0"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5 cursor-pointer select-none group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                A
              </div>
              <span className="font-display font-black text-lg tracking-tight text-slate-900 dark:text-white">
                Apexa <span className="text-[10px] align-super text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-md ml-0.5 border border-indigo-100/60 dark:border-indigo-900/60 shadow-3xs">OS</span>
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
                  className="px-3.5 py-2 text-xs font-extrabold text-slate-500 dark:text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer relative group/nav"
                >
                  {link.label}
                  <span className="absolute bottom-1 left-3.5 right-3.5 h-0.5 bg-indigo-500 scale-x-0 group-hover/nav:scale-x-100 transition-transform duration-250" />
                </button>
              ))}
              <button 
                onClick={() => scrollTo('features')}
                className="px-3.5 py-2 text-xs font-extrabold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                Trợ lý AI <span className="text-[8px] bg-gradient-to-r from-purple-500 to-pink-500 text-white px-1.5 py-0.5 rounded-full font-black animate-pulse">PRO</span>
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onSignIn}
              className="hidden sm:inline-flex text-xs font-black text-slate-655 dark:text-slate-305 hover:text-indigo-600 dark:hover:text-indigo-400 px-4 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Đăng nhập
            </button>
            <button
              onClick={onSignUp}
              className="text-xs font-black bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 px-4.5 py-2.5 rounded-xl shadow-md shadow-slate-900/10 dark:shadow-none transition-all cursor-pointer"
            >
              Dùng thử miễn phí
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
            className="lg:hidden border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-5 py-4 space-y-1"
          >
            {['features', 'how-it-works', 'pricing', 'testimonials', 'faq'].map((id) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="block w-full text-left px-3 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                {id === 'features' ? 'Tính năng' : id === 'how-it-works' ? 'Cách hoạt động' : id === 'pricing' ? 'Bảng giá' : id === 'testimonials' ? 'Đánh giá' : 'Hỏi đáp'}
              </button>
            ))}
            <button onClick={onSignIn} className="block w-full text-left px-3 py-2.5 text-sm font-bold text-indigo-650 dark:text-indigo-400 cursor-pointer">
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
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950/60 shadow-xs text-[11px] font-extrabold text-indigo-755 dark:text-indigo-300 select-none cursor-default group"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
              </span>
              Apexa OS 2.0 — Nền tảng năng suất AI thế hệ mới
              <ChevronRight className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black tracking-tight text-slate-900 dark:text-white leading-[1.08] font-display"
            >
              Hệ điều hành{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-650 via-purple-600 to-pink-500 animate-pulse">
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
              Quản lý dự án, tài liệu, lịch, trò chuyện và trợ lý AI thông minh — tất cả được đồng bộ trực tuyến trong một workspace thống nhất của Apexa.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: "0 15px 35px rgba(99,102,241,0.25)" }}
                whileTap={{ scale: 0.96 }}
                onClick={onSignUp}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-650 to-pink-500 text-white text-sm font-black rounded-2xl shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                Bắt đầu miễn phí
                <ArrowRight className="w-4.5 h-4.5" />
              </motion.button>
              <button
                onClick={() => scrollTo('features')}
                className="w-full sm:w-auto px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-slate-700 dark:text-slate-305 text-sm font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
              >
                <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 flex items-center justify-center transition-colors">
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
              <div className="flex -space-x-2.5">
                {['MT', 'TV', 'LA', 'NK', 'PH'].map((initials, i) => (
                  <div
                    key={i}
                    className="w-8.5 h-8.5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white dark:border-slate-950 flex items-center justify-center text-[9px] font-black text-white shadow-sm"
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
                <span className="text-xs font-bold text-slate-500 dark:text-slate-450">
                  <span className="text-slate-900 dark:text-white font-black">4.9/5</span> từ 25.000+ đội ngũ
                </span>
              </div>
            </motion.div>
          </div>

          {/* Interactive Mockup Container with glowing light shadow */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-3xl pointer-events-none" />
            <ProductMockup />
          </div>
        </div>
      </section>

      {/* Trusted by infinite scroll marquee */}
      <section className="relative z-10 border-y border-slate-200/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30 backdrop-blur-xs py-8 overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <p className="text-center text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-6">
            Được tin tưởng và sử dụng rộng rãi bởi các doanh nghiệp hiện đại
          </p>
          <div className="overflow-hidden w-full relative py-2 select-none">
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-950 z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-slate-50 to-transparent dark:from-slate-950 z-10 pointer-events-none" />
            <motion.div
              animate={{ x: [0, -1200] }}
              transition={{
                ease: "linear",
                duration: 35,
                repeat: Infinity,
              }}
              className="flex gap-20 w-max whitespace-nowrap px-4"
            >
              {doubledLogos.map((logo, index) => (
                <span key={index} className="text-sm font-black text-slate-400 dark:text-slate-600 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
                  {logo}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats with upgraded cards */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-20">
        <FadeInSection>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: activeUsers, suffix: '+', label: 'Doanh nghiệp hoạt động', icon: Users },
              { value: tasksCompleted, suffix: '+', label: 'Nhiệm vụ hoàn tất/ngày', icon: Check },
              { value: 99.9, suffix: '%', label: 'Uptime đảm bảo tuyệt đối', icon: Shield, decimals: 1 },
              { value: 40, suffix: '%', label: 'Tiết kiệm thời gian vận hành', icon: Zap },
            ].map((stat, i) => (
              <div key={i} className="text-center p-6.5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/50 dark:border-slate-850 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-lg hover:border-indigo-500/25 transition-all duration-300 group">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mx-auto mb-3.5 group-hover:scale-110 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-all duration-300">
                  <stat.icon className="w-5.5 h-5.5 text-indigo-650 dark:text-indigo-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-905 dark:text-white font-display">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} decimals={'decimals' in stat ? stat.decimals : 0} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-450 font-bold mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </FadeInSection>
      </section>

      {/* Upgraded Features Section with Filters */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24">
        <FadeInSection className="text-center mb-10">
          <span className="inline-block text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">Hệ thống tính năng</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-display tracking-tight mb-4">
            Mọi thứ bạn cần trong một nền tảng
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base font-medium max-w-2xl mx-auto">
            Từ lập kế hoạch trực quan đến trợ lý AI đắc lực — Apexa OS tích hợp toàn bộ các luồng công việc để cải tiến hiệu suất nhóm.
          </p>
        </FadeInSection>

        {/* Feature Category Filter Navigation */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12 bg-white/50 dark:bg-slate-900/40 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-800/80 w-fit mx-auto shadow-xs backdrop-blur-md">
          {CATEGORIES.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-4.5 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                activeCategory === category.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-250'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Dynamic AnimatePresence feature grid with premium glass card */}
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredFeatures.map((feature, i) => (
              <motion.div
                layout
                key={feature.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                whileHover={{ y: -6 }}
                className="group h-full p-6.5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-850 hover:border-indigo-500/25 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-lg transition-all duration-350 cursor-default"
              >
                <div className={`w-11.5 h-11.5 rounded-xl ${feature.bg} flex items-center justify-center mb-4.5 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-5.5 h-5.5 ${feature.iconColor}`} />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed font-semibold">{feature.desc}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative z-10 bg-slate-900 dark:bg-slate-950 text-white py-16 lg:py-24 overflow-hidden border-y border-slate-850">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(236,72,153,0.1),transparent_60%)]" />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-6">
          <FadeInSection className="text-center mb-14">
            <span className="inline-block text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-3">Cách hoạt động</span>
            <h2 className="text-3xl sm:text-4xl font-black font-display tracking-tight mb-4">
              Bắt đầu nhanh chóng với 3 bước đơn giản
            </h2>
            <p className="text-slate-400 text-sm sm:text-base font-medium max-w-xl mx-auto">
              Không cần quy trình triển khai phức tạp. Chỉ cần tài khoản duy nhất để hợp nhất toàn bộ workspace nhóm.
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {STEPS.map((step, i) => (
              <FadeInSection key={i} delay={i * 0.15}>
                <div className="relative text-center md:text-left space-y-4">
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[calc(100%+1rem)] w-[calc(100%-2rem)] h-px bg-gradient-to-r from-indigo-500/50 to-transparent" />
                  )}
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-650 text-2xl font-black font-display shadow-lg shadow-indigo-500/20">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-black">{step.title}</h3>
                  <p className="text-sm text-slate-400 font-bold leading-relaxed">{step.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>

          <FadeInSection className="text-center mt-14">
            <button
              onClick={onSignUp}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 text-sm font-black rounded-2xl shadow-xl hover:bg-slate-50 transition-all cursor-pointer border border-slate-100"
            >
              Tạo không gian miễn phí ngay
              <ArrowRight className="w-4 h-4" />
            </button>
          </FadeInSection>
        </div>
      </section>

      {/* Upgraded Testimonials Carousel */}
      <section id="testimonials" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24">
        <FadeInSection className="text-center mb-14">
          <span className="inline-block text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">Nhận xét khách hàng</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-display tracking-tight mb-4">
            Được yêu thích bởi các đội ngũ
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base font-medium max-w-xl mx-auto">
            Hàng nghìn nhóm dự án chuyên nghiệp đã tăng tốc quy trình hoàn thành sprint bằng cách chuyển dịch sang Apexa OS.
          </p>
        </FadeInSection>

        <div className="max-w-4xl mx-auto relative px-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTestimonial}
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 shadow-md relative flex flex-col md:flex-row items-center gap-8"
            >
              <Quote className="w-12 h-12 text-indigo-200/50 dark:text-indigo-950/30 absolute top-6 right-6 rotate-180" />
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-18 h-18 rounded-full ${TESTIMONIALS[activeTestimonial].color} flex items-center justify-center text-xl font-black text-white shadow-md mb-3`}>
                  {TESTIMONIALS[activeTestimonial].avatar}
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white text-center">{TESTIMONIALS[activeTestimonial].name}</h4>
                <p className="text-[10px] text-slate-400 font-bold text-center">{TESTIMONIALS[activeTestimonial].role}</p>
              </div>
              <div className="flex-1 text-center md:text-left">
                <p className="text-base text-slate-600 dark:text-slate-300 font-semibold italic leading-relaxed">
                  &ldquo;{TESTIMONIALS[activeTestimonial].quote}&rdquo;
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Controls */}
          <button
            onClick={handlePrevTestimonial}
            className="absolute left-0 top-1/2 -translate-y-1/2 p-2.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-xs transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextTestimonial}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-2.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shadow-xs transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Indicators */}
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                  activeTestimonial === i ? 'bg-indigo-600 dark:bg-indigo-400 w-5' : 'bg-slate-250 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Upgraded Pricing Section with Monthly/Yearly sliding buttons */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24">
        <FadeInSection className="text-center mb-10">
          <span className="inline-block text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">Gói chi phí</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-display tracking-tight mb-4">
            Linh hoạt cho mọi quy mô nhóm
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base font-medium max-w-xl mx-auto">
            Khởi đầu hoàn toàn miễn phí, mở khóa các công cụ AI và phân tích nâng cao khi bạn sẵn sàng phát triển.
          </p>
        </FadeInSection>

        {/* Pricing Cycle sliding buttons */}
        <div className="flex items-center justify-center gap-2 mb-14 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-1.5 rounded-2xl w-fit mx-auto shadow-sm">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-450 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Thanh toán hàng tháng
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              billingCycle === 'yearly'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-455 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Thanh toán hàng năm
            <span className="px-2 py-0.5 bg-rose-500 text-white text-[8px] font-extrabold rounded-full uppercase">
              TIẾT KIỆM 20%
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* Starter Plan */}
          <FadeInSection delay={0.08}>
            <div className="relative p-8 rounded-3xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Starter</h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-6">Hoàn hảo cho cá nhân và nhóm nhỏ quản lý dự án cơ bản.</p>
              <div className="mb-6">
                <span className="text-3xl font-black font-display text-slate-900 dark:text-white">Miễn phí</span>
                <span className="text-xs font-bold text-slate-450 dark:text-slate-500 ml-1.5">mãi mãi</span>
              </div>
              <ul className="space-y-3.5 mb-8">
                {['Tối đa 5 thành viên nhóm', '3 dự án độc lập (Spaces)', 'Bảng Kanban & Danh sách', 'Trò chuyện nhóm trực tiếp', '1GB lưu trữ tài liệu'].map((f, fi) => (
                  <li key={fi} className="flex items-center gap-2.5 text-xs font-bold text-slate-600 dark:text-slate-350">
                    <Check className="w-4.5 h-4.5 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onSignUp}
                className="w-full py-3.5 text-xs font-black rounded-xl transition-all cursor-pointer bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-xs"
              >
                Bắt đầu ngay miễn phí
              </button>
            </div>
          </FadeInSection>

          {/* Pro Plan - Upgraded with glowing border and rotating reflection */}
          <FadeInSection delay={0.14}>
            <div className="relative p-8 rounded-3xl bg-slate-950 dark:bg-slate-900 text-white border-2 border-indigo-500 shadow-[0_15px_40px_rgba(99,102,241,0.22)] scale-[1.04] overflow-hidden group">
              <div className="absolute top-[-30%] left-[-30%] w-[160%] h-[160%] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent_65%)] pointer-events-none group-hover:scale-105 transition-transform duration-700" />
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-md animate-pulse">
                Đề xuất khuyên dùng
              </span>
              <h3 className="text-lg font-black mb-1 relative z-10">Pro</h3>
              <p className="text-xs font-bold text-slate-400 mb-6 relative z-10">Cho doanh nghiệp cần công cụ AI & phân tích tối tân.</p>
              <div className="mb-6 relative z-10">
                <span className="text-3xl font-black font-display">
                  {billingCycle === 'monthly' ? '299.000đ' : '239.000đ'}
                </span>
                <span className="text-xs font-bold text-slate-400 ml-1">/tháng</span>
                {billingCycle === 'yearly' && <p className="text-[9px] text-indigo-400 font-extrabold mt-1">Hóa đơn xuất theo năm (2.868.000đ)</p>}
              </div>
              <ul className="space-y-3.5 mb-8 relative z-10">
                {['Không giới hạn thành viên', 'Không giới hạn Space & Dự án', 'Trợ lý thông minh Apexa AI Pro', 'Giao diện Lịch biểu & Phân tích', '50GB dung lượng đám mây', 'Đồng bộ Supabase Database và hỗ trợ 24/7'].map((f, fi) => (
                  <li key={fi} className="flex items-center gap-2.5 text-xs font-bold text-slate-205">
                    <Check className="w-4.5 h-4.5 shrink-0 text-indigo-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onSignUp}
                className="w-full py-3.5 text-xs font-black rounded-xl transition-all cursor-pointer bg-white text-slate-900 hover:bg-slate-100 shadow-md relative z-10 hover:scale-[1.01]"
              >
                Dùng thử 14 ngày miễn phí
              </button>
            </div>
          </FadeInSection>

          {/* Enterprise Plan */}
          <FadeInSection delay={0.2}>
            <div className="relative p-8 rounded-3xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Enterprise</h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-6">Giải pháp tùy biến chuyên biệt cho doanh nghiệp quy mô lớn.</p>
              <div className="mb-6">
                <span className="text-3xl font-black font-display text-slate-900 dark:text-white">Liên hệ</span>
              </div>
              <ul className="space-y-3.5 mb-8">
                {['Tất cả tính năng gói Pro', 'Đăng nhập SSO bảo mật cao', 'Phân quyền nâng cao & Audit Logs', 'Không giới hạn dung lượng lưu trữ', 'Quản lý tài khoản riêng biệt', 'Cam kết độ ổn định SLA 99.9%'].map((f, fi) => (
                  <li key={fi} className="flex items-center gap-2.5 text-xs font-bold text-slate-600 dark:text-slate-350">
                    <Check className="w-4.5 h-4.5 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onSignUp}
                className="w-full py-3.5 text-xs font-black rounded-xl transition-all cursor-pointer bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-xs"
              >
                Liên hệ bộ phận Sales
              </button>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* FAQ accordion section */}
      <section id="faq" className="relative z-10 max-w-4xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/50 dark:border-slate-800/80">
        <FadeInSection className="text-center mb-14">
          <span className="inline-block text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">Giải đáp thắc mắc</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-display tracking-tight mb-4">
            Hỏi đáp thường gặp về Apexa
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base font-medium max-w-xl mx-auto">
            Các câu hỏi liên quan đến chi phí, tính năng và phương thức bảo mật của Apexa OS.
          </p>
        </FadeInSection>

        <div className="space-y-4">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="border border-slate-200 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-900 shadow-3xs overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-all cursor-pointer outline-none"
              >
                <span className="flex items-center gap-3">
                  <HelpCircle className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
                  {faq.q}
                </span>
                <span className={`transform transition-transform duration-250 ${openFaq === i ? 'rotate-180' : ''}`}>
                  <ChevronDownIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                </span>
              </button>

              <AnimatePresence initial={false}>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                  >
                    <div className="px-5 pb-5 pt-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed border-t border-slate-100/50 dark:border-slate-800/50">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA with rich gradient */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 pb-16 lg:pb-24">
        <FadeInSection>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-650 to-pink-500 p-10 sm:p-14 text-center text-white shadow-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)] pointer-events-none" />
            <div className="relative z-10 space-y-6">
              <h2 className="text-3xl sm:text-4xl font-black font-display tracking-tight">
                Nâng tầm hiệu suất quản lý ngay hôm nay
              </h2>
              <p className="text-indigo-105 text-sm sm:text-base font-medium max-w-lg mx-auto leading-relaxed">
                Tham gia cùng 25.000+ nhóm dự án đang làm việc thông minh và hiệu quả hơn với hệ điều hành năng suất Apexa OS.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onSignUp}
                  className="w-full sm:w-auto px-9 py-4 bg-white text-indigo-700 text-sm font-black rounded-2xl shadow-xl hover:bg-indigo-50 transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-100"
                >
                  Bắt đầu dùng thử miễn phí
                  <ArrowRight className="w-4.5 h-4.5" />
                </motion.button>
                <span className="text-xs text-indigo-200 font-bold">
                  Thiết lập nhanh trong 30 giây · Không cần thẻ tín dụng
                </span>
              </div>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200/70 dark:border-slate-850 bg-white dark:bg-slate-955 transition-colors">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7.5 h-7.5 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-extrabold text-sm">A</div>
                <span className="font-display font-black text-base text-slate-900 dark:text-white">Apexa OS</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-450 font-semibold leading-relaxed">
                Hệ điều hành năng suất toàn diện tích hợp trợ lý dự án AI thế hệ mới. Phát triển bởi đội ngũ đam mê công nghệ.
              </p>
            </div>
            {[
              { title: 'Sản phẩm', links: ['Tính năng', 'Bảng giá', 'Apexa AI Pro', 'Lộ trình phát triển'] },
              { title: 'Công ty', links: ['Về chúng tôi', 'Blog chia sẻ', 'Tuyển dụng', 'Liên hệ hợp tác'] },
              { title: 'Hỗ trợ', links: ['Trung tâm hỗ trợ', 'Tài liệu phát triển API', 'Trạng thái máy chủ', 'Quy định bảo mật'] },
            ].map((col) => (
              <div key={col.title} className="space-y-4">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <button className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition-colors cursor-pointer">{link}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-slate-200/50 dark:border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">© 2026 Apexa OS. Mọi quyền được bảo lưu.</p>
            <div className="flex items-center gap-6">
              {['Điều khoản sử dụng', 'Quyền riêng tư', 'Cấu hình Cookies'].map((link) => (
                <button key={link} className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350 font-semibold transition-colors cursor-pointer">{link}</button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Simple Helper Icon component for ChevronDown to avoid dependencies
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}
