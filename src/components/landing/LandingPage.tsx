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
  Share2, Award, Activity, Sparkle, RefreshCw, Eye, ThumbsUp, Moon, Sun
} from 'lucide-react';
import { useUiStore } from '@/store/uiStore';

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
  priority: 'Khẩn cấp' | 'Cao' | 'Trung bình' | 'Thấp';
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

const CATEGORIES = [
  { id: 'all', label: 'Tất cả giải pháp' },
  { id: 'task', label: 'Quản lý dự án & Sprint' },
  { id: 'ai', label: 'Trí tuệ nhân tạo Apexa Brain' },
  { id: 'collaboration', label: 'Cộng tác thời gian thực' },
  { id: 'analytics', label: 'Phân tích & Tối ưu hiệu suất' }
];

const FEATURES = [
  {
    icon: Kanban,
    title: 'Kanban & Agile Sprints',
    desc: 'Kéo thả trực quan, tối ưu sprint với 5 chế độ xem linh hoạt: Kanban Board, List View, Bảng dữ liệu, Lịch biểu và Gantt Timeline.',
    badge: 'Cốt lõi',
    color: 'from-blue-600 to-indigo-600',
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    iconColor: 'text-blue-600 dark:text-blue-400',
    category: 'task'
  },
  {
    icon: Brain,
    title: 'Apexa Brain AI Copilot',
    desc: 'Trợ lý AI tích hợp sâu: tự động phân rã mục tiêu thành subtasks, tóm tắt tài liệu, gợi ý phân bổ KPI và viết báo cáo tiến độ bằng Gemini AI.',
    badge: 'AI Native',
    color: 'from-indigo-600 to-purple-600',
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    category: 'ai'
  },
  {
    icon: FileText,
    title: 'Smart Docs & Knowledge Base',
    desc: 'Tài liệu số cộng tác thời gian thực (Multi-cursor real-time). Nhúng trực tiếp task, cơ sở dữ liệu và sơ đồ tư duy ngay trong trang.',
    badge: 'Real-time',
    color: 'from-violet-600 to-fuchsia-600',
    bg: 'bg-violet-500/10 dark:bg-violet-500/15',
    iconColor: 'text-violet-600 dark:text-violet-400',
    category: 'collaboration'
  },
  {
    icon: MessageSquare,
    title: 'ChatRoom & Audio Huddle',
    desc: 'Trao đổi kênh truyền theo dự án, thảo luận trực tiếp trên từng task cụ thể, loại bỏ 100% tình trạng phân mảnh tin nhắn rời rạc.',
    badge: 'Tích hợp',
    color: 'from-cyan-600 to-blue-600',
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    category: 'collaboration'
  },
  {
    icon: Calendar,
    title: 'Lịch & Timeline Gantt Đa Chiều',
    desc: 'Kiểm soát đường găng dự án (Critical Path), phát hiện xung đột deadline và đồng bộ 2 chiều tức thì với Google Calendar.',
    badge: 'Sync 2-Way',
    color: 'from-emerald-600 to-teal-600',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    category: 'task'
  },
  {
    icon: BarChart3,
    title: 'Analytics Command Center',
    desc: 'Báo cáo năng suất trực quan: Biểu đồ Burn-down, Sprint Velocity, phân tích tải công việc thành viên và cảnh báo nguy cơ trễ hạn.',
    badge: 'Insight',
    color: 'from-amber-600 to-orange-600',
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    iconColor: 'text-amber-600 dark:text-amber-400',
    category: 'analytics'
  },
  {
    icon: Timer,
    title: 'Pomodoro & Time Tracking',
    desc: 'Bộ đếm thời gian tập trung chuẩn khoa học, theo dõi log giờ làm việc theo từng đầu việc cụ thể và thống kê thời gian thực.',
    badge: 'Focus',
    color: 'from-rose-600 to-red-600',
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    iconColor: 'text-rose-600 dark:text-rose-400',
    category: 'task'
  },
  {
    icon: Database,
    title: 'Apexa Base (No-Code DB)',
    desc: 'Cơ sở dữ liệu dạng bảng quan hệ mạnh mẽ, tùy biến schema, quản lý CRM, kho nội dung và tài sản dự án không giới hạn.',
    badge: 'No-Code',
    color: 'from-blue-600 to-indigo-600',
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    iconColor: 'text-blue-600 dark:text-blue-400',
    category: 'analytics'
  }
];

const ARCHITECTURE_PILLARS = [
  {
    icon: Zap,
    title: 'Tốc độ phản hồi < 16ms',
    desc: 'Kiến trúc Local-First tối tân lưu cache cục bộ tức thì và đồng bộ ngầm lên mây, trải nghiệm mượt mà như native desktop app.',
    gradient: 'from-blue-500 to-indigo-500'
  },
  {
    icon: Brain,
    title: 'Trí tuệ nhân tạo Gemini 2.5',
    desc: 'Không chỉ là chatbot thông thường — Apexa AI hiểu sâu ngữ cảnh workspace, tự động hóa quy trình phức tạp chỉ qua 1 câu lệnh.',
    gradient: 'from-indigo-500 to-purple-500'
  },
  {
    icon: ShieldCheck,
    title: 'Bảo mật tiêu chuẩn Doanh nghiệp',
    desc: 'Mã hóa AES-256 đầu cuối, tuân thủ SOC2 Type II, lưu trữ đám mây phân tán với Supabase Enterprise và cam kết 99.99% Uptime.',
    gradient: 'from-emerald-500 to-teal-500'
  }
];

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Tạo Không Gian & Mời Nhóm',
    desc: 'Khởi tạo workspace chuyên biệt theo phòng ban, phân quyền chi tiết (Admin, Member, Guest) chỉ trong 30 giây.',
    icon: Layers,
    badge: 'Khởi động nhanh'
  },
  {
    step: '02',
    title: 'Lên Kế Hoạch Với Apexa AI',
    desc: 'Giao mục tiêu lớn cho AI — hệ thống tự động phân tách thành các task nhỏ kèm deadline, độ ưu tiên và mô tả chi tiết.',
    icon: Sparkles,
    badge: 'Tự động hóa'
  },
  {
    step: '03',
    title: 'Cộng Tác Thời Gian Thực',
    desc: 'Thực hiện công việc trên bảng Kanban, viết Smart Docs và thảo luận ngay trong ChatRoom mà không phải đổi ứng dụng.',
    icon: MessageSquare,
    badge: 'Đồng bộ 100%'
  },
  {
    step: '04',
    title: 'Phân Tích & Bứt Phá Năng Suất',
    desc: 'Theo dõi chỉ số Sprint Velocity, nhận báo cáo phân tích hiệu suất tuần do AI tổng hợp tự động mỗi sáng thứ Hai.',
    icon: TrendingUp,
    badge: 'Đo lường ROI'
  }
];

const PRICING_PLANS = [
  {
    id: 'free',
    name: 'Khởi đầu (Free)',
    desc: 'Hoàn hảo cho cá nhân và nhóm nhỏ muốn bắt đầu chuẩn hóa quy trình làm việc.',
    badge: 'Miễn phí mãi mãi',
    highlight: false,
    cta: 'Bắt đầu miễn phí',
    features: [
      'Tối đa 5 thành viên không gian',
      'Không giới hạn số lượng Task & Dự án',
      'Chế độ xem Kanban & List View',
      'Bộ nhớ lưu trữ tài liệu 1 GB',
      'Đồng bộ dữ liệu thời gian thực',
      'Hỗ trợ cộng đồng 24/7'
    ]
  },
  {
    id: 'pro',
    name: 'Apexa Pro OS',
    desc: 'Giải pháp toàn diện cho các đội ngũ phát triển sản phẩm, startup & doanh nghiệp tăng tốc.',
    badge: 'Lựa chọn hàng đầu 🔥',
    highlight: true,
    cta: 'Trải nghiệm Pro OS',
    features: [
      'Không giới hạn thành viên & Spaces',
      'Apexa Brain AI Copilot không giới hạn',
      'Trọn bộ 5 View Modes (Board, Table, Calendar, Gantt, Timeline)',
      'Báo cáo tự động hóa phân tích hiệu suất tuần bằng AI',
      'Đồng bộ 2 chiều Google Calendar & Lịch biểu',
      'Dung lượng lưu trữ đám mây 100 GB',
      'Hỗ trợ kỹ thuật ưu tiên 24/7'
    ]
  },
  {
    id: 'enterprise',
    name: 'Doanh Nghiệp (Enterprise)',
    desc: 'Dành cho các tổ chức quy mô lớn yêu cầu kiểm soát dữ liệu, bảo mật chuyên sâu và SLA cao cấp.',
    badge: 'Tùy chỉnh riêng',
    highlight: false,
    cta: 'Liên hệ tư vấn',
    features: [
      'Tất cả quyền lợi của gói Pro OS',
      'Triển khai On-Premise hoặc Dedicated Cloud riêng',
      'Single Sign-On (SSO / SAML 2.0 / Okta / Azure AD)',
      'Cam kết chất lượng dịch vụ SLA Uptime 99.99%',
      'Kiểm toán bảo mật & Audit Logs chi tiết',
      'Quản lý tài khoản (Account Manager) hỗ trợ 1:1'
    ]
  }
];

const TESTIMONIALS = [
  {
    quote: "Apexa OS đã thay thế hoàn toàn bộ 4 công cụ cồng kềnh trước đây (Jira, Slack, Notion, Toggl) của chúng tôi. Tốc độ triển khai sprint của 35 kỹ sư đã tăng hơn 40% chỉ sau 3 tuần.",
    author: "Hoàng Xuân",
    role: "Giám đốc Công nghệ (CTO)",
    company: "TechVanguard Innovations",
    metric: "+42% Sprint Velocity",
    avatar: "HX",
    gradient: "from-blue-600 to-indigo-600"
  },
  {
    quote: "Giao diện phẳng, tinh gọn và tốc độ phản hồi tức thì khiến cả đội ngũ thiết kế lẫn marketing đều thích thú khi sử dụng. Apexa AI gợi ý task và tóm tắt cuộc họp cực kỳ chuẩn xác!",
    author: "Phạm Mai Phương",
    role: "Trưởng phòng Sản phẩm (Head of Product)",
    company: "Nexus Creative Studio",
    metric: "Tiết kiệm 8h họp/tuần",
    avatar: "MP",
    gradient: "from-indigo-600 to-purple-600"
  },
  {
    quote: "Tính năng Smart Docs liên kết trực tiếp với Kanban Board là một bước đột phá. Chúng tôi không còn phải đi tìm kiếm tài liệu dự án thất lạc ở bất kỳ đâu nữa.",
    author: "Nguyễn Quốc Bảo",
    role: "Giám đốc Vận hành (COO)",
    company: "Aether Global Commerce",
    metric: "Giảm 75% thời gian tìm kiếm",
    avatar: "QB",
    gradient: "from-cyan-600 to-blue-600"
  }
];

const COMPARISON_ITEMS = [
  { feature: 'Giao diện phẳng Continuous Unified Canvas', apexa: true, others: 'Phân mảnh nhiều app' },
  { feature: 'Trợ lý AI tích hợp sâu (Gemini 2.5 Engine)', apexa: true, others: 'Plugin thêm phí' },
  { feature: 'Chế độ ngoại tuyến hoàn toàn (Offline-First)', apexa: true, others: 'Yêu cầu có mạng' },
  { feature: 'Tích hợp sẵn Kanban, Docs, Chat, Lịch & Gantt', apexa: true, others: 'Cần cài 4-5 công cụ riêng' },
  { feature: 'Tốc độ phản hồi cục bộ (< 16ms)', apexa: true, others: 'Chậm trễ 300 - 800ms' },
  { feature: 'Chi phí hàng tháng cho toàn bộ giải pháp', apexa: 'Tiết kiệm ~70%', others: '$40 - $80/người/tháng' }
];

const FAQS = [
  {
    q: 'Apexa OS có thể sử dụng mượt mà khi mất kết nối Internet (Offline) không?',
    a: 'Hoàn toàn có thể! Apexa OS được xây dựng trên kiến trúc Local-First hiện đại. Bạn có thể tạo việc, ghi chép tài liệu, di chuyển cột Kanban ngay cả khi ở trên máy bay hay mất mạng. Toàn bộ dữ liệu sẽ tự động đồng bộ lên Supabase Cloud ngay khi có kết nối trở lại mà không mất mát dữ liệu.'
  },
  {
    q: 'Dữ liệu dự án và thông tin của công ty tôi được bảo mật như thế nào?',
    a: 'Apexa áp dụng chuẩn mã hóa SSL/TLS 256-bit trong truyền tải và AES-256 khi lưu trữ. Cơ sở dữ liệu chạy trên hạ tầng Supabase Enterprise đạt chứng nhận tuân thủ bảo mật quốc tế SOC2 Type II và ISO 27001. Dữ liệu của bạn hoàn toàn thuộc quyền sở hữu của bạn và không bao giờ được dùng để huấn luyện mô hình AI công khai.'
  },
  {
    q: 'Tôi có thể chuyển dữ liệu từ Trello, Notion, Jira hoặc ClickUp sang Apexa không?',
    a: 'Có! Apexa OS cung cấp công cụ chuyển đổi 1-Click Import. Bạn chỉ cần xuất file JSON/CSV từ công cụ cũ, hệ thống sẽ tự động ánh xạ cấu trúc bảng việc, tài liệu và phân công người phụ trách sang Apexa chỉ trong vài phút.'
  },
  {
    q: 'Apexa AI hỗ trợ tiếng Việt và các ngôn ngữ khác tốt không?',
    a: 'Apexa Brain AI được tối ưu hóa dựa trên mô hình Gemini AI đa ngôn ngữ tiên tiến nhất, hỗ trợ tiếng Việt xuất sắc (hiểu từ ngữ chuyên ngành, cách xưng hô, văn phong công sở) cùng hơn 45 ngôn ngữ quốc tế phổ biến.'
  },
  {
    q: 'Chính sách dùng thử và nâng cấp gói Pro như thế nào?',
    a: 'Bạn có thể bắt đầu với gói Miễn phí vĩnh viễn không cần thẻ tín dụng. Khi muốn nâng cấp lên gói Pro OS, bạn được trải nghiệm đầy đủ tính năng AI và Gantt Chart cao cấp với chính sách hoàn tiền 100% trong 14 ngày nếu không hài lòng.'
  }
];

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
   INTERACTIVE LIVE PRODUCT STUDIO (HERO SIMULATOR)
   ========================================================================= */
function InteractiveProductStudio() {
  const [activeTab, setActiveTab] = useState<'board' | 'docs' | 'chat' | 'ai' | 'gantt'>('board');
  
  // Interactive mock tasks
  const [tasks, setTasks] = useState<MockTask[]>([
    { id: '1', title: 'Thiết kế giao diện phẳng Continuous Unified Canvas', column: 'done', priority: 'Khẩn cấp', dueDate: 'Hôm nay', assignee: 'Hoàng Xuân', tag: 'UI/UX', checked: true },
    { id: '2', title: 'Tích hợp Apexa Brain AI Gemini 2.5 Copilot', column: 'inprogress', priority: 'Khẩn cấp', dueDate: '15:00', assignee: 'Apexa AI', tag: 'AI Engine', checked: false },
    { id: '3', title: 'Tối ưu hóa Local-First DB đạt độ trễ < 16ms', column: 'inprogress', priority: 'Cao', dueDate: 'Ngày mai', assignee: 'Minh Anh', tag: 'Core', checked: false },
    { id: '4', title: 'Đồng bộ 2 chiều Google Calendar & Lịch biểu', column: 'todo', priority: 'Trung bình', dueDate: '18/08', assignee: 'Quốc Bảo', tag: 'Integration', checked: false },
    { id: '5', title: 'Kiểm thử bảo mật SOC2 Type II và chuẩn bị Release', column: 'todo', priority: 'Cao', dueDate: '20/08', assignee: 'Security', tag: 'Release', checked: false },
  ]);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [aiChatLog, setAiChatLog] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    { sender: 'bot', text: '👋 Xin chào! Tôi là Apexa Brain. Tôi đã phân tích toàn bộ bối cảnh Sprint hiện tại: Đội ngũ đang hoàn thành 60% kế hoạch. Bạn muốn tôi làm gì tiếp theo?', time: '09:00' }
  ]);

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
      priority: 'Cao',
      dueDate: 'Hôm nay',
      assignee: 'Bạn',
      tag: 'Mới'
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
      let botResponse = '✨ Đã phân tích yêu cầu của bạn và cập nhật vào hệ thống thành công!';
      if (query.includes('Sprint') || query.includes('Kế hoạch') || query.includes('task')) {
        botResponse = '🎯 Đã tự động tạo 3 đầu việc ưu tiên cho Sprint:\n1. [Khẩn cấp] Kiểm thử hiệu năng Local-First trên 10,000 tasks.\n2. [Cao] Kết nối Supabase Realtime Channel.\n3. [Trung bình] Hoàn tất tài liệu Smart Docs v2.';
        // Auto add a task to the board to simulate live AI action!
        setTasks(prev => [
          { id: Date.now().toString(), title: '⚡ [AI Generated] Kiểm thử hiệu năng Local-First', column: 'inprogress', priority: 'Khẩn cấp', dueDate: 'Hôm nay', assignee: 'Apexa AI', tag: 'AI Action' },
          ...prev
        ]);
      } else if (query.includes('Báo cáo') || query.includes('tiến độ')) {
        botResponse = '📊 Báo cáo nhanh Sprint #14:\n• Tổng số task: ' + (tasks.length + 1) + '\n• Tỷ lệ hoàn thành: ' + Math.round((tasks.filter(t => t.column === 'done').length / tasks.length) * 100) + '%\n• Không phát hiện rủi ro trễ hạn. Tốc độ velocity đạt mức Xuất sắc (+18%).';
      }
      setAiChatLog(prev => [...prev, { sender: 'bot', text: botResponse, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      setAiTyping(false);
    }, 1000);
  };

  return (
    <div className="w-full rounded-3xl bg-slate-900/90 dark:bg-[#0b0d17]/95 backdrop-blur-2xl border border-slate-700/70 dark:border-slate-800/80 shadow-[0_25px_70px_-15px_rgba(37,99,235,0.25)] overflow-hidden text-left font-sans select-none transition-all">
      
      {/* Top macOS Style Window Bar */}
      <div className="px-4 py-3 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block shadow-xs" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block shadow-xs" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block shadow-xs" />
          </div>
          <div className="ml-3 hidden sm:flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span className="text-slate-500">không gian /</span>
            <span className="text-indigo-400 font-bold">apexa-main-sprint</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-300 font-sans font-bold">v2.0</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Đồng bộ ưu tiên cục bộ</span>
          </div>
        </div>
      </div>

      {/* Interactive Module Tabs Header */}
      <div className="px-3 sm:px-5 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'board', label: 'Kanban Sprint', icon: Kanban },
            { id: 'docs', label: 'Smart Docs', icon: FileText },
            { id: 'chat', label: 'Team Chat', icon: MessageSquare },
            { id: 'ai', label: 'Apexa AI Brain', icon: Bot, isAi: true },
            { id: 'gantt', label: 'Gantt Timeline', icon: Calendar }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? tab.isAi
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.isAi && !isActive ? 'text-indigo-400 animate-pulse' : ''}`} />
                <span>{tab.label}</span>
                {tab.isAi && (
                  <span className="text-[8px] bg-white/20 text-white px-1.5 py-0.2 rounded-full font-black uppercase">AI</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <div className="flex -space-x-2">
            {['HX', 'MP', 'QB', 'AI'].map((u, i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-[9px] flex items-center justify-center border border-slate-900 shadow-sm">
                {u}
              </div>
            ))}
          </div>
          <span className="text-[10px] text-slate-400 font-bold ml-1">4 người trực tuyến</span>
        </div>
      </div>

      {/* Main Workspace Simulator View Canvas */}
      <div className="p-4 sm:p-5 h-[410px] overflow-hidden bg-slate-950/40 text-slate-100 relative">
        <AnimatePresence mode="wait">
          
          {/* 1. KANBAN SPRINT VIEW */}
          {activeTab === 'board' && (
            <motion.div
              key="tab-board"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-3.5 h-full overflow-hidden"
            >
              {[
                { key: 'todo', label: 'Cần làm (To-do)', color: 'text-slate-400', dot: 'bg-slate-400' },
                { key: 'inprogress', label: 'Đang thực hiện', color: 'text-blue-400', dot: 'bg-blue-500' },
                { key: 'done', label: 'Đã hoàn tất', color: 'text-emerald-400', dot: 'bg-emerald-500' }
              ].map(col => {
                const colTasks = tasks.filter(t => t.column === col.key);
                return (
                  <div key={col.key} className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3 flex flex-col h-full shadow-inner">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                        <span className={`text-[11px] font-black uppercase tracking-wider ${col.color}`}>{col.label}</span>
                      </div>
                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 custom-scrollbar">
                      {colTasks.map(task => (
                        <motion.div
                          layoutId={task.id}
                          key={task.id}
                          className="p-3 bg-slate-850 hover:bg-slate-800 border border-slate-750 rounded-xl shadow-xs transition-all group cursor-pointer"
                        >
                          <div className="flex items-start gap-2.5">
                            <button
                              onClick={() => handleToggleTask(task.id)}
                              className="mt-0.5 w-4 h-4 rounded border border-slate-600 hover:border-indigo-400 flex items-center justify-center bg-slate-800 transition-colors"
                            >
                              {task.checked && <Check className="w-3 h-3 text-indigo-400" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[11px] font-bold leading-snug ${task.checked ? 'line-through text-slate-500 font-normal' : 'text-slate-200'}`}>
                                {task.title}
                              </p>
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-[9px] text-slate-400 font-semibold">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {task.dueDate}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-300 font-bold border border-indigo-900/50">{task.tag}</span>
                                  <span className={`px-1.5 py-0.5 rounded font-bold ${
                                    task.priority === 'Khẩn cấp' ? 'bg-rose-950/60 text-rose-300 border border-rose-900/50' :
                                    task.priority === 'Cao' ? 'bg-amber-950/60 text-amber-300 border border-amber-900/50' :
                                    'bg-slate-800 text-slate-300'
                                  }`}>
                                    {task.priority}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className="pt-2 mt-1 border-t border-slate-800/80">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="+ Thêm nhanh công việc..."
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleQuickAdd(col.key as any);
                          }}
                          className="w-full px-2.5 py-1.5 text-[10px] rounded-lg bg-slate-950 border border-slate-800 outline-none text-slate-200 focus:border-indigo-500 font-medium"
                        />
                        <button
                          onClick={() => handleQuickAdd(col.key as any)}
                          className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
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

          {/* 2. SMART DOCS VIEW */}
          {activeTab === 'docs' && (
            <motion.div
              key="tab-docs"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="h-full bg-slate-900/80 border border-slate-800 rounded-2xl p-5 overflow-y-auto space-y-4 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white">Đặc tả sản phẩm và kiến trúc Sprint 2026</h3>
                    <p className="text-[9px] text-slate-400">Chỉnh sửa lần cuối 2 phút trước bởi Hoàng Xuân</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-800/60 text-[9px] font-black">Đồng bộ tài liệu thông minh</span>
              </div>

              <div className="space-y-3 text-[11px] text-slate-300 leading-relaxed font-sans">
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider">1. Mục Tiêu Chiến Lược</h4>
                <p>Xây dựng hệ điều hành năng suất tích hợp AI thế hệ mới với trải nghiệm không độ trễ (Zero Context-Switching). Người dùng có thể trực tiếp kéo task từ Kanban vào tài liệu này.</p>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                    <CheckSquare className="w-3 h-3 text-indigo-400" />
                    <span>Nhiệm vụ được nhúng trong tài liệu:</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px]">
                    <span className="font-bold text-slate-200">🚀 Phát hành bản cập nhật Apexa OS v2.0</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-extrabold text-[8px]">Hoàn thành</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-900/50 flex items-center gap-2 text-indigo-300 text-[10px] font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Apexa Brain AI: Đã tự động tạo 5 tóm tắt và ánh xạ 12 tags liên quan đến Sprint này.</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* 3. TEAM CHATROOM VIEW */}
          {activeTab === 'chat' && (
            <motion.div
              key="tab-chat"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="h-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-black text-white"># sprint-engineering-core</span>
                </div>
                <span className="text-[9px] text-slate-400 font-bold">4 Thành viên đang online</span>
              </div>

              <div className="space-y-3 overflow-y-auto py-2 pr-1 custom-scrollbar text-[11px]">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-[9px] flex items-center justify-center shrink-0">HX</div>
                  <div className="bg-slate-800 p-2.5 rounded-2xl rounded-tl-none max-w-[80%] border border-slate-700">
                    <p className="font-bold text-slate-200">Đã cập nhật toàn bộ responsive cho màn hình di động nhé cả team!</p>
                    <span className="text-[8px] text-slate-400 mt-1 block">09:12</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-[9px] flex items-center justify-center shrink-0">MP</div>
                  <div className="bg-slate-800 p-2.5 rounded-2xl rounded-tl-none max-w-[80%] border border-slate-700">
                    <p className="font-bold text-slate-200">Tuyệt vời, Apexa AI vừa báo cáo Sprint tuần này đã đạt KPI 100% sớm 2 ngày! 🔥</p>
                    <span className="text-[8px] text-slate-400 mt-1 block">09:14</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black text-[9px] flex items-center justify-center shrink-0">AI</div>
                  <div className="bg-indigo-950/60 p-2.5 rounded-2xl rounded-tl-none max-w-[80%] border border-indigo-800/60 text-indigo-200 font-bold">
                    <p>🤖 Apexa Brain: Đã tự động lưu trữ sprint artifacts và gửi báo cáo tóm tắt vào kênh email của quản trị viên.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <input
                  type="text"
                  placeholder="Gửi tin nhắn vào kênh dự án..."
                  className="flex-1 px-3 py-2 text-[10px] rounded-xl bg-slate-950 border border-slate-800 outline-none text-slate-200 font-medium"
                />
                <button className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* 4. APEXA AI BRAIN COPILOT VIEW */}
          {activeTab === 'ai' && (
            <motion.div
              key="tab-ai"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="h-full bg-slate-900/80 border border-indigo-900/50 rounded-2xl p-4 flex flex-col justify-between shadow-2xl"
            >
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar max-h-[240px]">
                {aiChatLog.map((msg, i) => (
                  <div key={i} className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                    {msg.sender === 'bot' && (
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`p-3 rounded-2xl max-w-[85%] text-[10px] font-bold leading-relaxed whitespace-pre-line ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                        : 'bg-slate-850 border border-slate-750 text-slate-200 rounded-tl-none shadow-xs'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {aiTyping && (
                  <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-bold p-2">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Apexa Brain đang phân tích dữ liệu workspace...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Prompt Suggestion Chips */}
              <div className="flex flex-wrap gap-1.5 my-2">
                {[
                  { label: '⚡ Lập kế hoạch Sprint tuần', text: 'Hãy lập kế hoạch phân rã 3 task ưu tiên cao cho Sprint' },
                  { label: '📊 Tóm tắt tiến độ KPI', text: 'Tóm tắt báo cáo tiến độ Sprint tuần này' },
                  { label: '📝 Viết release note v2.0', text: 'Soạn thảo release note thông báo ra mắt Apexa OS v2.0' }
                ].map(chip => (
                  <button
                    key={chip.label}
                    onClick={() => handleSendAi(chip.text)}
                    disabled={aiTyping}
                    className="text-[9px] font-black px-2.5 py-1 rounded-full bg-slate-800 hover:bg-indigo-950 border border-slate-700 hover:border-indigo-700 text-indigo-300 transition-colors cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* AI Query Input */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <input
                  type="text"
                  placeholder="Giao việc cho Apexa Brain (Ví dụ: 'Tối ưu lại deadline dự án')..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendAi();
                  }}
                  disabled={aiTyping}
                  className="flex-1 px-3 py-2 text-[10px] rounded-xl bg-slate-950 border border-slate-800 outline-none text-slate-200 font-medium focus:border-indigo-500"
                />
                <button
                  onClick={() => handleSendAi()}
                  disabled={aiTyping || !aiInput.trim()}
                  className="p-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:brightness-110 disabled:opacity-50 cursor-pointer shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* 5. GANTT TIMELINE VIEW */}
          {activeTab === 'gantt' && (
            <motion.div
              key="tab-gantt"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="h-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 overflow-hidden flex flex-col justify-between"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] font-black text-white">
                <span>Timeline Sprint #14 · Tháng 8/2026</span>
                <span className="text-indigo-400 text-[10px]">Đường găng Critical Path: Chuẩn 100%</span>
              </div>

              <div className="space-y-3 my-auto text-[10px]">
                {[
                  { name: 'Khởi tạo Kiến trúc Local-First', width: '75%', color: 'from-blue-600 to-indigo-600', time: '10/08 - 14/08', progress: '100%' },
                  { name: 'Tích hợp Gemini 2.5 Flash AI Engine', width: '85%', color: 'from-indigo-600 to-purple-600', time: '12/08 - 16/08', progress: '85%' },
                  { name: 'Đồng bộ 2 chiều Google Calendar', width: '55%', color: 'from-violet-600 to-pink-600', time: '14/08 - 18/08', progress: '50%' },
                  { name: 'Phát hành chính thức Apexa OS v2.0', width: '40%', color: 'from-emerald-600 to-teal-600', time: '18/08 - 22/08', progress: '30%' },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-slate-300 font-bold">
                      <span>{item.name}</span>
                      <span className="text-slate-400">{item.time} ({item.progress})</span>
                    </div>
                    <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all duration-500`}
                        style={{ width: item.width }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[9px] text-slate-400 flex items-center justify-between font-semibold">
                <span>⚡ Tự động phát hiện xung đột lịch biểu khi deadline bị dời</span>
                <span className="text-emerald-400 font-black">Không xung đột</span>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Interactive Bottom Simulation Footer */}
      <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span>Bấm các tab phía trên để trải nghiệm không gian làm việc trực tiếp!</span>
        </div>
        <span className="hidden sm:inline text-indigo-400 font-bold font-sans">Công cụ tương tác Apexa</span>
      </div>

    </div>
  );
}

/* =========================================================================
   INTERACTIVE ROI & VELOCITY CALCULATOR
   ========================================================================= */
function InteractiveRoiCalculator() {
  const [teamSize, setTeamSize] = useState<number>(12);
  const avgSalary = 25; // Million VND

  const hoursSavedPerMonth = useMemo(() => Math.round(teamSize * 22 * 1.5), [teamSize]);
  const costSavingsMillion = useMemo(() => Math.round((hoursSavedPerMonth / 160) * avgSalary), [hoursSavedPerMonth, avgSalary]);
  const velocityBoost = useMemo(() => Math.min(48, Math.round(25 + teamSize * 0.8)), [teamSize]);

  return (
    <div className="rounded-3xl bg-white dark:bg-[#0c0e18] border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-10 shadow-xl text-left">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* Controls */}
        <div className="space-y-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
              Công cụ tính toán ROI thực tế
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-3 font-display">
              Đo lường thời gian & ngân sách Apexa OS tiết kiệm cho đội ngũ
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
              Dựa trên dữ liệu thực tế từ hơn 28,000 đội ngũ đang sử dụng hệ điều hành Apexa.
            </p>
          </div>

          {/* Slider: Team Size */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-black">
              <span className="text-slate-700 dark:text-slate-200">Quy mô đội ngũ / thành viên:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">{teamSize} người</span>
            </div>
            <input
              type="range"
              min="2"
              max="100"
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-bold">
              <span>2 người (Startup)</span>
              <span>50 người</span>
              <span>100+ người (Doanh nghiệp)</span>
            </div>
          </div>
        </div>

        {/* Output Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/40 shadow-xs space-y-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-2">
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-display">
              ~{hoursSavedPerMonth.toLocaleString('vi-VN')} giờ
            </div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Thời gian tiết kiệm / tháng</p>
            <p className="text-[10px] text-slate-400">Giảm thời gian tìm file & họp giao việc</p>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-100 dark:border-emerald-900/40 shadow-xs space-y-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-display">
              +{velocityBoost}%
            </div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Tốc độ hoàn thành Sprint</p>
            <p className="text-[10px] text-slate-400">Tăng tốc độ bàn giao sản phẩm</p>
          </div>

          <div className="sm:col-span-2 p-5 rounded-2xl bg-slate-900 dark:bg-slate-950 text-white border border-slate-800 shadow-md flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-indigo-400 uppercase">Ước tính giá trị mang lại</span>
              <div className="text-2xl sm:text-3xl font-black text-white font-display">
                ~{costSavingsMillion.toLocaleString('vi-VN')} Triệu ₫ / tháng
              </div>
              <p className="text-[10px] text-slate-400">Quy đổi từ năng suất giờ làm việc được tối ưu hóa</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400 shrink-0">
              <Award className="w-6 h-6" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* =========================================================================
   MAIN LANDING PAGE EXPORT
   ========================================================================= */
export default function LandingPage({ onSignUp, onSignIn, activeUsers, tasksCompleted }: LandingPageProps) {
  const isDarkMode = useUiStore((state) => state.isDarkMode);
  const setIsDarkMode = useUiStore((state) => state.setIsDarkMode);
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
    if (planId === 'free') return { value: '0 ₫', suffix: '/ mãi mãi' };
    if (planId === 'enterprise') return { value: 'Liên hệ', suffix: '/ tùy biến SLA' };
    const price = billingPrices[billingCycle];
    if (!price) return { value: billingCycle === 'yearly' ? '99.000 ₫' : '129.000 ₫', suffix: '/ người / tháng' };
    const monthlyAmount = price.unit_amount / (price.interval === 'year' ? 12 * price.interval_count : price.interval_count);
    const divisor = ZERO_DECIMAL_CURRENCIES.has(price.currency.toLowerCase()) ? 1 : 100;
    return {
      value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: price.currency.toUpperCase(), maximumFractionDigits: 0 }).format(monthlyAmount / divisor),
      suffix: '/ người / tháng'
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

  const filteredFeatures = FEATURES.filter(f => activeCategory === 'all' || f.category === activeCategory);

  const handlePrevTestimonial = () => {
    setActiveTestimonial(prev => (prev === 0 ? TESTIMONIALS.length - 1 : prev - 1));
  };

  const handleNextTestimonial = () => {
    setActiveTestimonial(prev => (prev === TESTIMONIALS.length - 1 ? 0 : prev + 1));
  };

  const doubledLogos = [...TRUSTED_LOGOS, ...TRUSTED_LOGOS, ...TRUSTED_LOGOS, ...TRUSTED_LOGOS];

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden bg-[#fafbfc] dark:bg-[#07090e] transition-colors duration-300 font-sans text-slate-800 dark:text-slate-100 selection:bg-indigo-500 selection:text-white">
      
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
      <div className="relative z-50 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 text-white text-[11px] font-extrabold py-2 px-4 text-center select-none flex items-center justify-center gap-2 shadow-sm">
        <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-black uppercase">Mới</span>
        <span>Apexa OS 2.0 đã chính thức phát hành với Trợ lý AI Gemini 2.5 & Kiến trúc Local-First!</span>
        <button onClick={onSignUp} className="underline hover:text-white/80 cursor-pointer inline-flex items-center gap-0.5">
          Khám phá ngay <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* ULTRA GLASSMORPHIC HEADER */}
      <header className="sticky top-0 z-50 w-full bg-white/85 dark:bg-[#07090e]/85 backdrop-blur-2xl border-b border-slate-200/80 dark:border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 py-3.5 flex items-center justify-between">
          
          {/* Logo Brand Identity */}
          <div className="flex items-center gap-8">
            <div 
              className="flex items-center gap-3 cursor-pointer select-none group" 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              {/* Apexa Official Logo Mark */}
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 p-0.5 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" viewBox="0 0 512 512" fill="none">
                  <path
                    d="M256 84 C264 84 271 89 275 97 L405 375 C409 383 403 394 394 394 L325 394 C317 394 309 389 306 381 L278 322 L234 322 L206 381 C203 389 195 394 187 394 L118 394 C109 394 103 383 107 375 L237 97 C241 89 248 84 256 84 Z M256 182 L226 270 L286 270 Z"
                    fill="#FFFFFF"
                  />
                  <polygon points="218,296 294,296 284,316 228,316" fill="#38BDF8" />
                  <polygon points="256,128 266,144 256,160 246,144" fill="#38BDF8" />
                </svg>
              </div>
              <div>
                <span className="font-display font-black text-xl tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  Apexa
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/60 uppercase shadow-2xs">
                    OS 2.0
                  </span>
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {[
                { label: 'Tính năng', id: 'features' },
                { label: 'Công nghệ', id: 'pillars' },
                { label: 'Quy trình', id: 'how-it-works' },
                { label: 'Bảng giá', id: 'pricing' },
                { label: 'Đánh giá', id: 'testimonials' },
                { label: 'Hỏi đáp', id: 'faq' }
              ].map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="px-3.5 py-2 text-xs font-extrabold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-all cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label={isDarkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              title={isDarkMode ? 'Giao diện sáng' : 'Giao diện tối'}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white/70 text-slate-600 shadow-sm transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-400"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={onSignIn}
              className="text-xs font-black text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 px-4 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Đăng nhập
            </button>
            <button
              onClick={onSignUp}
              className="text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:brightness-110 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Dùng thử miễn phí</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-800 dark:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0d0e17]/95 backdrop-blur-2xl px-5 py-4 space-y-2 select-none"
          >
            {['features', 'pillars', 'how-it-works', 'pricing', 'testimonials', 'faq'].map((id) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="block w-full text-left px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                {id === 'features' ? 'Tính năng' : id === 'pillars' ? 'Công nghệ' : id === 'how-it-works' ? 'Quy trình' : id === 'pricing' ? 'Bảng giá' : id === 'testimonials' ? 'Đánh giá' : 'Hỏi đáp'}
              </button>
            ))}
            <button onClick={onSignIn} className="block w-full text-left px-4 py-3 text-xs font-black text-indigo-600 dark:text-indigo-400 cursor-pointer border-t border-slate-100 dark:border-slate-800 pt-3">
              Đăng nhập tài khoản
            </button>
          </motion.div>
        )}
      </header>

      {/* =========================================================================
          HERO SECTION
          ========================================================================= */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 pt-12 lg:pt-20 pb-16 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* Left Hero Pitch */}
          <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-[11px] font-black text-blue-700 dark:text-blue-300 select-none"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              Hệ điều hành năng suất AI thế hệ mới
              <ChevronRight className="w-3.5 h-3.5 text-blue-500" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black tracking-tight text-slate-900 dark:text-white leading-[1.08] font-display"
            >
              Tập trung tối đa.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                Bứt phá năng suất
              </span>
              {' '}cùng AI.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="text-slate-600 dark:text-slate-300 text-sm sm:text-base font-medium leading-relaxed max-w-xl mx-auto lg:mx-0"
            >
              Hợp nhất Kanban, Smart Docs, ChatRoom, Lịch biểu và Trợ lý AI Apexa Brain trên một bề mặt duy nhất. Xóa bỏ 100% tình trạng phân mảnh công cụ.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onSignUp}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-sm font-black rounded-2xl shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                Bắt đầu miễn phí ngay
                <ArrowRight className="w-4.5 h-4.5" />
              </motion.button>
              
              <button
                onClick={() => scrollTo('features')}
                className="w-full sm:w-auto px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 text-slate-700 dark:text-slate-200 text-sm font-black rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
              >
                <Play className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                Khám phá tính năng
              </button>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="flex flex-col sm:flex-row items-center gap-4 pt-2 justify-center lg:justify-start"
            >
              <div className="flex -space-x-2">
                {['HX', 'MA', 'QB', 'TV', 'LA'].map((initials, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 border-2 border-white dark:border-[#07090e] flex items-center justify-center text-[9px] font-black text-white shadow-sm"
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
                  <strong className="text-slate-900 dark:text-white font-black">4.95/5</strong> từ 28,000+ cá nhân & đội ngũ
                </span>
              </div>
            </motion.div>
          </div>

          {/* Right Hero Live Interactive Workspace Studio */}
          <div className="lg:col-span-7 relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-purple-600/15 rounded-3xl blur-3xl pointer-events-none" />
            <InteractiveProductStudio />
          </div>

        </div>
      </section>

      {/* =========================================================================
          MARQUEE LOGOS STRIP
          ========================================================================= */}
      <section className="relative z-10 border-y border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/30 backdrop-blur-md py-7 overflow-hidden select-none">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <p className="text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-5">
            Được tin dùng bởi các kỹ sư, nhà sáng lập và đội ngũ công nghệ cao cấp
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
                <span key={index} className="text-sm font-black text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60" />
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {[
              { value: activeUsers, suffix: '+', label: 'Tổ chức & Đội ngũ hoạt động', icon: Users, color: 'text-blue-600 dark:text-blue-400' },
              { value: tasksCompleted, suffix: '+', label: 'Nhiệm vụ hoàn tất mỗi ngày', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
              { value: 99.99, suffix: '%', label: 'Cam kết Uptime SLA liên tục', icon: ShieldCheck, color: 'text-indigo-600 dark:text-indigo-400', decimals: 2 },
              { value: 42, suffix: '%', label: 'Tốc độ bàn giao Sprint tăng tốc', icon: Zap, color: 'text-amber-600 dark:text-amber-400' },
            ].map((stat, i) => (
              <div key={i} className="text-center p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#0c0e18] border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-indigo-500/40 transition-all group">
                <div className={`w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 ${stat.color} flex items-center justify-center mx-auto mb-3.5 group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white font-display">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} decimals={'decimals' in stat ? stat.decimals : 0} />
                </div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </FadeInSection>
      </section>

      {/* =========================================================================
          ARCHITECTURE PILLARS (TECH EXCELLENCE)
          ========================================================================= */}
      <section id="pillars" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-slate-800/70">
        <FadeInSection>
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-14">
            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full border border-blue-200/50 dark:border-blue-800/50">
              Kiến trúc đột phá
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              Xây dựng cho tốc độ. Thiết kế cho tương lai.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Không còn cảm giác nặng nề, xoay vòng chờ tải. Apexa OS được tinh chỉnh từng mili-giây để đem lại hiệu suất tối thượng.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ARCHITECTURE_PILLARS.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={idx}
                  className="rounded-3xl bg-white dark:bg-[#0c0e18] p-8 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-indigo-500/40 transition-all text-left space-y-4 group"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${pillar.gradient} text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{pillar.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{pillar.desc}</p>
                </div>
              );
            })}
          </div>
        </FadeInSection>
      </section>

      {/* =========================================================================
          FEATURE SHOWCASE MATRIX
          ========================================================================= */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-slate-800/70">
        <FadeInSection>
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
              Trọn bộ tính năng
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              Mọi công cụ đội ngũ cần trên một hệ điều hành
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Không cần trả phí riêng cho 5 ứng dụng khác nhau. Apexa OS tích hợp hoàn chỉnh và đồng bộ từng byte dữ liệu.
            </p>

            {/* Category Filter Buttons */}
            <div className="flex flex-wrap justify-center gap-2 pt-4">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800/60'
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
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-3xl bg-white dark:bg-[#0c0e18] p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-indigo-500/40 transition-all hover:-translate-y-1 text-left flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-2xl ${feat.bg} flex items-center justify-center ${feat.iconColor} border border-slate-200/40 dark:border-slate-800/40 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {feat.badge}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">{feat.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{feat.desc}</p>
                  </div>
                  
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 text-xs font-black text-indigo-600 dark:text-indigo-400">
                    <span>Khám phá ngay</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </FadeInSection>
      </section>

      {/* =========================================================================
          ROI & PRODUCTIVITY CALCULATOR
          ========================================================================= */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-slate-800/70">
        <FadeInSection>
          <InteractiveRoiCalculator />
        </FadeInSection>
      </section>

      {/* =========================================================================
          COMPETITOR COMPARISON MATRIX
          ========================================================================= */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-slate-800/70">
        <FadeInSection>
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-14">
            <span className="text-[10px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full border border-purple-200/50 dark:border-purple-800/50">
              So sánh toàn diện
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              Tại sao chọn Apexa OS thay vì công cụ rời rạc?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              So sánh trực quan giữa hệ điều hành tích hợp của Apexa và mô hình phân mảnh truyền thống.
            </p>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[620px] rounded-3xl bg-white dark:bg-[#0c0e18] border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
                    <th className="py-4 px-6 font-black text-slate-700 dark:text-slate-300">Tính năng & Tiêu chuẩn</th>
                    <th className="py-4 px-6 font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30">Apexa OS 2.0</th>
                    <th className="py-4 px-6 font-black text-slate-500">Bộ công cụ phân mảnh (Jira + Slack + Notion)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {COMPARISON_ITEMS.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-6 font-extrabold text-slate-800 dark:text-slate-200">{row.feature}</td>
                      <td className="py-4 px-6 font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                        {typeof row.apexa === 'boolean' ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black">
                            <Check className="w-4 h-4 text-emerald-500" /> Tích hợp sẵn
                          </span>
                        ) : (
                          <span className="font-black text-emerald-600 dark:text-emerald-400">{row.apexa}</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-500 font-semibold">{row.others}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* =========================================================================
          WORKFLOW PROCESS
          ========================================================================= */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-slate-800/70">
        <FadeInSection>
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
              Quy trình chuẩn hóa
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              Vận hành trơn tru chỉ với 4 bước
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Dễ dàng thiết lập và đồng bộ toàn bộ thành viên chỉ trong 1 buổi làm việc.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {WORKFLOW_STEPS.map((step) => {
              const StepIcon = step.icon;
              return (
                <div key={step.step} className="rounded-3xl bg-white dark:bg-[#0c0e18] p-7 border border-slate-200/80 dark:border-slate-800/80 shadow-xs text-left space-y-4 hover:border-indigo-500/40 transition-all group">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{step.step}</span>
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <StepIcon className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400">{step.badge}</span>
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
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-slate-800/70">
        <FadeInSection>
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
              Bảng giá minh bạch
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              Đầu tư thông minh, tối ưu ngân sách
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Không chi phí ẩn. Nâng cấp hoặc hạ cấp gói bất cứ khi nào theo nhu cầu phát triển.
            </p>

            {/* Monthly / Yearly Toggle */}
            <div className="flex items-center justify-center gap-3 pt-4">
              <span className={`text-xs font-bold ${billingCycle === 'monthly' ? 'text-slate-900 dark:text-white font-black' : 'text-slate-400'}`}>Thanh toán hàng tháng</span>
              <button
                onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                className="w-12 h-6 rounded-full bg-indigo-600 p-1 relative transition-colors cursor-pointer"
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${billingCycle === 'yearly' ? 'translate-x-6' : ''}`} />
              </button>
              <span className={`text-xs font-bold flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'text-slate-900 dark:text-white font-black' : 'text-slate-400'}`}>
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
                      ? 'bg-gradient-to-b from-blue-900/10 via-indigo-900/5 to-white dark:to-[#0c0e18] border-2 border-indigo-600 dark:border-indigo-500 shadow-2xl shadow-indigo-500/20 scale-105 z-10'
                      : 'bg-white dark:bg-[#0c0e18] border border-slate-200/80 dark:border-slate-800/80 shadow-xs'
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
                      <span className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight font-display">{price.value}</span>
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
                        ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white hover:brightness-110 shadow-indigo-500/25'
                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              );
            })}
          </div>
        </FadeInSection>
      </section>

      {/* =========================================================================
          TESTIMONIALS SLIDER
          ========================================================================= */}
      <section id="testimonials" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-slate-800/70">
        <FadeInSection>
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
            <span className="text-[10px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 px-3 py-1 rounded-full border border-rose-200/50 dark:border-rose-800/50">
              Đánh giá thực tế
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              Được yêu thích bởi các nhà quản lý dự án
            </h2>
          </div>

          <div className="max-w-4xl mx-auto relative rounded-3xl bg-white dark:bg-[#0c0e18] p-8 md:p-12 border border-slate-200/80 dark:border-slate-800/80 shadow-xl text-left">
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
                <p className="text-base md:text-lg text-slate-800 dark:text-slate-200 font-extrabold leading-relaxed">
                  "{TESTIMONIALS[activeTestimonial].quote}"
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${TESTIMONIALS[activeTestimonial].gradient} text-white font-black text-xs flex items-center justify-center shadow-md`}>
                      {TESTIMONIALS[activeTestimonial].avatar}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        {TESTIMONIALS[activeTestimonial].author}
                        <span className="px-2 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[9px] font-black">{TESTIMONIALS[activeTestimonial].metric}</span>
                      </h4>
                      <p className="text-xs text-slate-400 font-semibold">{TESTIMONIALS[activeTestimonial].role} · {TESTIMONIALS[activeTestimonial].company}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevTestimonial}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNextTestimonial}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
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
      <section id="faq" className="relative z-10 max-w-4xl mx-auto px-5 sm:px-6 py-16 lg:py-24 border-t border-slate-200/70 dark:border-slate-800/70 text-left">
        <FadeInSection>
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
            <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 px-3 py-1 rounded-full border border-cyan-200/50 dark:border-cyan-800/50">
              Giải đáp thắc mắc
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-display">
              Các câu hỏi thường gặp
            </h2>
          </div>

          <div className="space-y-3.5">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-2xl bg-white dark:bg-[#0c0e18] border border-slate-200/80 dark:border-slate-800/80 overflow-hidden transition-all">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-5 text-left text-sm font-extrabold text-slate-900 dark:text-white flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180 text-indigo-500' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3.5">
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
          <div className="relative rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 p-8 md:p-16 text-center text-white overflow-hidden shadow-2xl shadow-indigo-500/25">
            <div className="space-y-6 relative z-10 max-w-2xl mx-auto">
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider">
                Bắt đầu hành trình mới
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight font-display leading-tight">
                Sẵn sàng kiến tạo văn hóa năng suất đỉnh cao?
              </h2>
              <p className="text-xs sm:text-sm font-medium text-white/90 leading-relaxed">
                Đăng ký tài khoản Apexa OS ngay hôm nay để giải phóng 100% tiềm năng làm việc nhóm với sự trợ giúp của AI thế hệ mới.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
                <button
                  onClick={onSignUp}
                  className="w-full sm:w-auto px-8 py-4 bg-white text-indigo-700 hover:bg-slate-100 text-sm font-black rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Dùng thử miễn phí trọn đời</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onSignIn}
                  className="w-full sm:w-auto px-6 py-4 bg-black/20 hover:bg-black/30 border border-white/30 text-white text-sm font-black rounded-2xl transition-all cursor-pointer"
                >
                  Đăng nhập tài khoản
                </button>
              </div>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* =========================================================================
          MODERN COMPREHENSIVE FOOTER
          ========================================================================= */}
      <footer className="relative z-10 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-[#07090e] py-14 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
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
              Hệ điều hành năng suất AI thế hệ mới kết hợp Kanban, Smart Docs, ChatRoom thời gian thực và kiến trúc Local-First.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full w-fit border border-emerald-200 dark:border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Toàn bộ hệ thống hoạt động ổn định (99.99% Uptime)</span>
            </div>
          </div>

          <div>
            <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3.5">Sản phẩm</h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Bảng Kanban</a></li>
              <li><a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Tài liệu thông minh</a></li>
              <li><a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Phòng chat thời gian thực</a></li>
              <li><a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">AI Apexa Brain</a></li>
              <li><a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Gantt và dòng thời gian</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3.5">Giải pháp</h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Bảng giá Pro</a></li>
              <li><a href="#pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">SLA doanh nghiệp</a></li>
              <li><a href="#testimonials" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Khách hàng tiêu biểu</a></li>
              <li><a href="#faq" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Bảo mật & Tuân thủ</a></li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3.5">Bản tin công nghệ</h4>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Nhận cập nhật tính năng mới và cẩm nang năng suất hàng tuần.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Nhập email của bạn..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none text-slate-800 dark:text-white focus:border-indigo-500"
              />
              <button 
                onClick={() => alert('Đã đăng ký nhận bản tin công nghệ Apexa thành công!')} 
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 cursor-pointer transition-colors shadow-xs"
              >
                Gửi
              </button>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-5 sm:px-6 pt-8 mt-10 border-t border-slate-200/70 dark:border-slate-800/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400 font-bold">
          <p>© 2026 Apexa OS Inc. Tất cả quyền được bảo lưu.</p>
          <div className="flex gap-5">
            <a href="#" className="hover:underline">Điều khoản dịch vụ</a>
            <a href="#" className="hover:underline">Chính sách quyền riêng tư</a>
            <a href="#" className="hover:underline">Bảo mật SOC2</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
