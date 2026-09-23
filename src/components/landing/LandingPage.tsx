"use client";

import { useEffect, useRef, useState, Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { motion, MotionConfig, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowRight, ArrowUpRight, BarChart3, CalendarDays, Check, CheckCheck, ChevronDown, Circle, FileText, Folder, Globe2, Grip, Kanban, Layers, ListTodo, Menu, MessageSquare, Plus, Sparkles, Target, Users, Wallet, Workflow, X, type LucideIcon } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PLAN_ENTITLEMENTS, SUGGESTED_PRICES, type BillingCycle, type SelfServeBillingPlan } from '@/lib/billing/plans';
import ThemeSwitch from '@/components/ThemeSwitch';
import LanguageSwitch from '@/components/LanguageSwitch';
import LandingFooter from './LandingFooter';
import {
  GsapAmbientGlow,
  GsapAnimatedCounter,
  GsapCard3DTilt,
  GsapMagneticButton,
  GsapScrollCascade,
} from '@/components/animations';
import s from './landing.module.css';

interface LandingPageProps { onSignUp: () => void; onSignIn: () => void }
type PriceCatalog = Partial<Record<SelfServeBillingPlan, Partial<Record<BillingCycle, { unit_amount: number; currency: string }>>>>;
type DemoView = 'board' | 'docs' | 'chat';
const sections = ['product', 'features', 'how-it-works', 'solutions', 'ai', 'pricing', 'faq'];

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={false} whileInView={{ opacity: [0.65, 1], y: reduced ? 0 : [22, 0] }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.55 }}>{children}</motion.div>;
}

function ProductPreview({ vi }: { vi: boolean }) {
  const [view, setView] = useState<DemoView>('board');
  const [completed, setCompleted] = useState<string[]>([]);
  const choose = (vn: string, en: string) => vi ? vn : en;
  const tabs: { id: DemoView; icon: LucideIcon; label: string }[] = [
    { id: 'board', icon: Kanban, label: choose('Công việc', 'Tasks') },
    { id: 'docs', icon: FileText, label: choose('Tài liệu', 'Docs') },
    { id: 'chat', icon: MessageSquare, label: choose('Trao đổi', 'Chat') },
  ];
  const tasks = [
    { id: 'brief', title: choose('Chốt brief chiến dịch tháng 9', 'Finalize September campaign brief'), tag: 'Planning', person: 'MA', color: 'blue', column: 0 },
    { id: 'copy', title: choose('Viết nội dung landing page', 'Write landing page copy'), tag: 'Content', person: 'HL', color: 'purple', column: 0 },
    { id: 'design', title: choose('Thiết kế bộ hình ảnh ra mắt', 'Design the launch visuals'), tag: 'Design', person: 'TN', color: 'orange', column: 1 },
    { id: 'review', title: choose('Rà soát trải nghiệm đăng ký', 'Review the signup experience'), tag: 'Product', person: 'MA', color: 'blue', column: 1 },
    { id: 'research', title: choose('Tổng hợp phản hồi khách hàng', 'Collect customer feedback'), tag: 'Research', person: 'HL', color: 'green', column: 2 },
  ];
  return <div className={s.previewWrap} id="product">
    <div className={s.previewCaption}><span><i />{choose('MỘT GÓC WORKSPACE CỦA BẠN', 'A LOOK INSIDE YOUR WORKSPACE')}</span><span>{choose('Bản minh họa tương tác · Dữ liệu mẫu', 'Interactive preview · Sample data')}</span></div>
    <GsapCard3DTilt maxTilt={3.5} scale={1.008} glare={true} className="rounded-[20px] overflow-hidden">
      <div className={s.preview}>
        <aside className={s.previewSidebar}>
          <div className={s.windowDots}>
            <span className={s.dotRed} />
            <span className={s.dotYellow} />
            <span className={s.dotGreen} />
          </div>
          <div className={s.previewBrand}><img src="/logo.png" alt="Costack" className="w-4 h-4 object-contain inline-block mr-1.5 align-middle" />Costack <span>WORKSPACE</span></div>
          <div className={s.workspaceName}><span>U</span>Studio workspace <ChevronDown size={13} /></div>
          <div className={s.sidebarLabel}>{choose('KHÔNG GIAN LÀM VIỆC', 'WORKSPACE')}</div>
          {tabs.map(({ id, icon: Icon, label }) => <button key={id} onClick={() => setView(id)} className={view === id ? s.sideActive : ''} aria-pressed={view === id}><Icon size={16} />{label}{id === 'chat' && <span className={s.sideCount}>2</span>}</button>)}
          <div className={s.sidebarLabel}>{choose('KHÔNG GIAN', 'SPACES')}</div>
          <div className={s.sideProject}><i />{choose('Chiến dịch ra mắt', 'Launch campaign')}</div>
          <div className={s.sideProject}><i />{choose('Sản phẩm & Thiết kế', 'Product & Design')}</div>
          <div className={s.sideBottom}><span className={s.avatar}>MA</span><span>Minh Anh<small>{choose('Không gian của đội ngũ', 'Your team space')}</small></span></div>
        </aside>
        <div className={s.previewMain}>
          <div className={s.previewTopbar}>
            <span><Folder size={14} />Studio <span>/</span> {choose('Chiến dịch ra mắt', 'Launch campaign')}</span>
            <span className={s.teamAvatars}><i>MA</i><i>HL</i><i>TN</i></span>
          </div>
          <div className={s.previewHeading}><div><span className={s.eyebrow}>{choose('CÙNG NHAU, TỪ Ý TƯỞNG ĐẾN HOÀN THÀNH', 'TOGETHER, FROM IDEA TO DONE')}</span><h3>{choose('Sẵn sàng cho ngày ra mắt', 'Ready for launch')}<span> ✦</span></h3><p>{choose('Rõ người phụ trách. Rõ việc tiếp theo.', 'Clear ownership. A clear next step.')}</p></div><span className={s.previewDate}><CalendarDays size={14} />{choose('Tháng 9', 'September')}</span></div>
          <div className={s.previewTabs} role="tablist" aria-label={choose('Xem thử sản phẩm', 'Product preview')}>
            {tabs.map(({ id, icon: Icon, label }, index) => <button key={id} id={`demo-tab-${id}`} role="tab" aria-selected={view === id} aria-controls="demo-panel" tabIndex={view === id ? 0 : -1} onClick={() => setView(id)} onKeyDown={event => {
              const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
              if (next < 0) return;
              event.preventDefault(); setView(tabs[next].id); document.getElementById(`demo-tab-${tabs[next].id}`)?.focus();
            }}><Icon size={15} />{label}</button>)}
            <span className={s.demoHint}>{choose('Thử chuyển tab hoặc hoàn thành một việc', 'Switch tabs or complete a task')} <ArrowDown size={12} /></span>
          </div>
          <div id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${view}`} className={s.demoPanel}>
            {view === 'board' && <div className={s.board}>
              {[choose('Cần làm', 'To do'), choose('Đang thực hiện', 'In progress'), choose('Hoàn thành', 'Done')].map((label, column) => {
                const items = tasks.filter(task => (completed.includes(task.id) ? 2 : task.column) === column);
                return <div className={s.boardColumn} key={label}><div className={s.columnHeading}><i data-column={column} />{label}<span>{items.length}</span></div>{items.map(task => <motion.div layout className={s.taskCard} key={task.id}>
                  <span className={s.taskTag} data-tone={task.color}>{task.tag}</span><h4>{task.title}</h4>
                  <div className={s.taskCardBottom}><button aria-label={`${completed.includes(task.id) || task.column === 2 ? choose('Đã hoàn thành', 'Completed') : choose('Hoàn thành', 'Complete')}: ${task.title}`} disabled={task.column === 2} aria-pressed={completed.includes(task.id) || task.column === 2} onClick={() => setCompleted(current => current.includes(task.id) ? current.filter(id => id !== task.id) : [...current, task.id])}>{completed.includes(task.id) || task.column === 2 ? <CheckCheck size={15} /> : <Circle size={15} />}<span>{completed.includes(task.id) || task.column === 2 ? choose('Xong', 'Done') : choose('Đánh dấu xong', 'Mark done')}</span></button><span className={s.avatar} data-tone={task.color}>{task.person}</span></div>
                </motion.div>)}</div>;
              })}
            </div>}
            {view === 'docs' && <div className={s.docPreview}><div><span className={s.taskTag} data-tone="blue">{choose('TÀI LIỆU DỰ ÁN', 'PROJECT DOCUMENT')}</span><h4>{choose('Một brief rõ ràng. Cả nhóm cùng hiểu.', 'One clear brief. Everyone aligned.')}</h4><p>{choose('Mục tiêu: giới thiệu sản phẩm mới, giúp khách hàng hiểu giá trị và bắt đầu trải nghiệm.', 'Goal: introduce the new product, explain its value and help customers get started.')}</p><h5>{choose('Những việc cần thống nhất', 'What we need to agree on')}</h5>{[choose('Thông điệp chính và đối tượng khách hàng', 'Core message and target audience'), choose('Nội dung, hình ảnh và người phụ trách', 'Copy, visuals and owners'), choose('Lịch duyệt và thời điểm xuất bản', 'Review schedule and publishing date')].map(item => <p className={s.docCheck} key={item}><Check size={15} />{item}</p>)}</div><aside><FileText size={24} /><strong>{choose('Kiến thức ở đúng chỗ', 'Knowledge in context')}</strong><p>{choose('Soạn thảo, sắp xếp và cộng tác trên tài liệu ngay trong workspace.', 'Write, organize and collaborate on documents in your workspace.')}</p></aside></div>}
            {view === 'chat' && <div className={s.chatPreview}><h4># {choose('chiến-dịch-ra-mắt', 'launch-campaign')}</h4>{[
              ['MA', 'Minh Anh', choose('Mình đã cập nhật brief. Cả nhóm xem phần thông điệp chính nhé.', 'The brief is updated. Please review the core message.')],
              ['HL', 'Hoàng Linh', choose('Mình nhận phần nội dung. Bản nháp sẽ sẵn sàng trước buổi review.', 'I’ll take the copy. The draft will be ready before our review.')],
              ['TN', 'Thảo Nguyên', choose('Thiết kế đang theo đúng tiến độ. Mình gửi bản xem trước trong kênh này.', 'Design is on track. I’ll share a preview in this channel.')],
            ].map(([initials, name, message]) => <div className={s.chatMessage} key={name}><span className={s.avatar}>{initials}</span><div><strong>{name}</strong><p>{message}</p></div></div>)}<div className={s.chatNote}><MessageSquare size={15} />{choose('Kênh nhóm, tin nhắn và phản hồi trong cùng không gian làm việc.', 'Team channels, messages and feedback in one workspace.')}</div></div>}
          </div>
          <div className={s.previewBottom}><span><span className={s.statusDot} />{choose('Một nơi để cả nhóm cùng tiến về phía trước', 'One place to move work forward together')}</span><span>Costack Workspace</span></div>
        </div>
      </div>
    </GsapCard3DTilt>
    <div className={s.previewFootnote}><span><Check size={14} />{choose('Công việc có người phụ trách', 'Every task has an owner')}</span><span><Check size={14} />{choose('Tài liệu có ngữ cảnh', 'Documents stay in context')}</span><span><Check size={14} />{choose('Cả nhóm nắm được tiến độ', 'Everyone sees the progress')}</span></div>
  </div>;
}

export default function LandingPage({ onSignUp, onSignIn }: LandingPageProps) {
  const { isVietnamese: vi } = useTranslation();
  const choose = (vn: string, en: string) => vi ? vn : en;
  const [menu, setMenu] = useState<'product' | 'resources' | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [solution, setSolution] = useState(0);
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [prices, setPrices] = useState<PriceCatalog>({});
  const [priceStatus, setPriceStatus] = useState<'loading' | 'live' | 'fallback'>('loading');
  const [faq, setFaq] = useState<number | null>(0);
  const [aiTab, setAiTab] = useState<'tasks' | 'doc' | 'summary' | 'receipt'>('tasks');
  const [showComparison, setShowComparison] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/billing/plans', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Prices unavailable');
      const data = await response.json();
      const valid = (['starter', 'pro', 'business'] as const).every(plan => (['monthly', 'yearly'] as const).every(billingCycle => {
        const price = data.prices?.[plan]?.[billingCycle];
        return price?.currency === 'vnd' && Number.isFinite(price.unit_amount) && price.unit_amount > 0;
      }));
      if (!valid) throw new Error('Invalid price catalog');
      setPrices(data.prices); setPriceStatus('live');
    }).catch(() => { if (!controller.signal.aborted) setPriceStatus('fallback'); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!menu && !mobileOpen) return;
    const dismiss = (event: PointerEvent) => { if (!headerRef.current?.contains(event.target as Node)) { setMenu(null); setMobileOpen(false); } };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (mobileOpen) mobileButtonRef.current?.focus();
      else headerRef.current?.querySelector<HTMLButtonElement>(`[data-dropdown="${menu}"]`)?.focus();
      setMenu(null); setMobileOpen(false);
    };
    document.addEventListener('pointerdown', dismiss); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [menu, mobileOpen]);

  useEffect(() => {
    const root = rootRef.current;
    const scrollContainer = root?.closest('.apexa-auth-shell');
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveSection(visible[0].target.id);
    }, { root: scrollContainer, rootMargin: '-100px 0px -55% 0px', threshold: 0 });
    sections.forEach(id => { const element = root?.querySelector(`#${id}`); if (element) observer.observe(element); });
    const progress = () => {
      if (!scrollContainer || !root) return;
      const total = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      root.style.setProperty('--scroll-progress', `${total > 0 ? scrollContainer.scrollTop / total : 0}`);
      if (scrollContainer.scrollTop < 200) setActiveSection('');
    };
    scrollContainer?.addEventListener('scroll', progress, { passive: true }); progress();
    return () => { observer.disconnect(); scrollContainer?.removeEventListener('scroll', progress); };
  }, []);

  const closeMenu = () => { setMenu(null); setMobileOpen(false); };
  const navigate = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault(); closeMenu();
    target.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
    target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true });
    window.history.replaceState(null, '', `#${id}`);
  };
  const signup = () => { closeMenu(); onSignUp(); };
  const startPlan = (plan: 'free' | SelfServeBillingPlan) => {
    try {
      if (plan === 'free') { localStorage.removeItem('apexa_pending_upgrade_plan'); localStorage.removeItem('apexa_pending_upgrade_cycle'); }
      else { localStorage.setItem('apexa_pending_upgrade_plan', plan); localStorage.setItem('apexa_pending_upgrade_cycle', cycle); }
    } catch { /* Signup remains available when browser storage is restricted. */ }
    signup();
  };
  const features: { icon: LucideIcon; title: string; text: string; detail: string; tone: string }[] = [
    { 
      icon: Kanban, 
      title: choose('Quản lý công việc đa góc nhìn.', 'Tasks in multiple flexible views.'), 
      text: choose('Chuyển đổi linh hoạt giữa bảng Kanban, Danh sách, Lịch và Gantt timeline. Giao việc, đặt hạn, theo dõi việc lặp lại và cột mốc quan trọng.', 'Switch effortlessly between Kanban boards, Lists, Calendars, and Gantt timelines. Assign owners, set due dates, and track recurring tasks and milestones.'), 
      detail: choose('Kanban · Danh sách · Gantt · Lịch · Cột mốc', 'Kanban · List · Gantt · Calendar · Milestones'), 
      tone: 'blue' 
    },
    { 
      icon: FileText, 
      title: choose('Tài liệu số & Soạn thảo cộng tác.', 'Docs & Realtime Collaboration.'), 
      text: choose('Lưu brief dự án, ghi chú cuộc họp và cẩm nang quy trình ngay trong Docs. Định dạng Markdown trực quan, chia sẻ và đồng biên tập thời gian thực.', 'Store project briefs, meeting notes, and team handbooks inside Docs. Write with rich Markdown, share links, and collaborate in realtime.'), 
      detail: choose('Docs · Markdown · Đồng biên tập · Tri thức', 'Docs · Markdown · Live Co-editing · Knowledge'), 
      tone: 'purple' 
    },
    { 
      icon: MessageSquare, 
      title: choose('Giao tiếp & Trao đổi nhóm tức thì.', 'Team Channels & Realtime Chat.'), 
      text: choose('Thảo luận công việc qua kênh chat dự án, tin nhắn trực tiếp và nhắc tên thành viên (@mentions). Đính kèm tệp tin và phản hồi emoji mà không rời workspace.', 'Discuss projects in team channels, direct messages, and @mentions. Share files and react with emojis without leaving your workspace.'), 
      detail: choose('Kênh chat · Tin nhắn trực tiếp · Đính kèm tệp', 'Channels · Direct Messages · Attachments'), 
      tone: 'green' 
    },
    { 
      icon: CalendarDays, 
      title: choose('Kế hoạch thời gian & Lộ trình rõ ràng.', 'Clear Timelines & Schedule Planning.'), 
      text: choose('Nắm bắt tiến độ theo tuần, tháng và quý với Calendar và Gantt timeline. Nhận diện công việc phụ thuộc và kiểm soát hạn chót hiệu quả.', 'Track team schedules across weeks, months, and quarters with Calendar and Gantt timelines. Spot task blockers and prevent deadline delays.'), 
      detail: choose('Lịch biểu · Gantt · Phụ thuộc · Hạn chót', 'Calendar · Gantt · Dependencies · Deadlines'), 
      tone: 'orange' 
    },
    { 
      icon: Target, 
      title: choose('Mục tiêu chiến lược & Theo dõi OKRs.', 'Strategic Goals & OKRs Tracking.'), 
      text: choose('Gắn kết các đầu việc hàng ngày với mục tiêu lớn của tổ chức. Tự động cập nhật tỷ lệ hoàn thành Key Results và đo lường tiến độ theo thời gian thực.', 'Connect everyday tasks to high-level company objectives. Automatically calculate Key Results completion rates and track progress live.'), 
      detail: choose('Mục tiêu · OKRs · Chỉ số then chốt · Tiến độ', 'Goals · OKRs · Key Results · Progress'), 
      tone: 'blue' 
    },
    { 
      icon: Workflow, 
      title: choose('Bảng vẽ ý tưởng & Sơ đồ tư duy.', 'Interactive Whiteboards & Mindmaps.'), 
      text: choose('Không gian vẽ vô cực để phác thảo wireframe, sơ đồ quy trình flowchart, dán ghi chú sticky notes và động não brainstorm cùng đồng đội.', 'Infinite visual canvas for wireframing, flowchart mapping, sticky notes, and freeform brainstorming with your team.'), 
      detail: choose('Whiteboard · Flowchart · Sticky notes · Brainstorm', 'Whiteboard · Flowcharts · Sticky notes · Brainstorm'), 
      tone: 'purple' 
    },
    { 
      icon: Layers, 
      title: choose('Bảng dữ liệu & Trường tùy biến linh hoạt.', 'Custom Databases & Flexible Fields.'), 
      text: choose('Tổ chức mọi loại dữ liệu với Costack Base. Tự do định nghĩa trường tùy biến (Custom Fields), bộ lọc đa tầng, nhóm dữ liệu và sắp xếp theo nhu cầu.', 'Structure any type of information with Costack Base. Define custom fields, multi-level filters, grouping, and sort configurations.'), 
      detail: choose('Base · Custom Fields · Bộ lọc đa tầng · Nhóm', 'Base · Custom Fields · Advanced Filters · Grouping'), 
      tone: 'orange' 
    },
    { 
      icon: Wallet, 
      title: choose('Tài chính & Thu chi thông minh.', 'Smart Finance & AI Receipt Scanner.'), 
      text: choose('Quản lý ví tiền, dòng tiền thu chi và ngân sách dự án. Tự động quét hóa đơn bằng AI OCR để trích xuất số tiền, ngày và danh mục chi tiêu trong vài giây.', 'Track multi-wallets, cash flow, and project budgets. Use AI OCR to automatically scan receipts and extract amounts, dates, and categories in seconds.'), 
      detail: choose('Finance · Sổ thu chi · AI Quét hóa đơn · Báo cáo', 'Finance · Cash Flow · AI Receipt Scanner · Reports'), 
      tone: 'green' 
    },
  ];

  const solutions = [
    { 
      label: choose('Cá nhân & Freelancer', 'Individuals & Freelancers'), 
      icon: Target, 
      title: choose('Bớt nhớ trong đầu. Dành chỗ cho ý tưởng.', 'Less to remember. More room to create.'), 
      text: choose('Gom việc cá nhân, dự án khách hàng và tài liệu về một nơi. Mỗi khi bắt đầu ngày mới, bạn biết mình cần làm gì trước mà không bị quá tải.', 'Bring personal tasks, client projects, and documents together. Start each day knowing what comes first without cognitive overload.'), 
      points: [
        choose('Tách không gian độc lập cho từng dự án & khách hàng', 'Separate spaces for each project and client'), 
        choose('Chia nhỏ đầu việc, gắn hạn hoàn thành và mức ưu tiên', 'Break work down, set due dates and priorities'), 
        choose('Bắt đầu hoàn toàn miễn phí trọn đời cho một người', 'Start completely free forever for one person')
      ], 
      project: choose('Dự án của tôi', 'My projects'), 
      items: [
        choose('Website khách hàng (Giao diện & Nội dung)', 'Client website (UI & Content)'), 
        choose('Kế hoạch nội dung mạng xã hội tháng 9', 'Social media content calendar'), 
        choose('Quản lý thu chi dự án Freelance', 'Freelance project income & expenses')
      ] 
    },
    { 
      label: choose('Đội ngũ dự án', 'Project teams'), 
      icon: Users, 
      title: choose('Ai làm gì, đến đâu — cả nhóm đều rõ.', 'Who owns it, where it stands — everyone knows.'), 
      text: choose('Từ brief đến bàn giao, kết nối công việc, tài liệu và trao đổi trong cùng workspace. Dễ theo dõi phần việc của mình và phối hợp nhịp nhàng với đồng đội.', 'From brief to handoff, connect tasks, documents, and conversations in one workspace. Track assignments and collaborate smoothly with teammates.'), 
      points: [
        choose('Giao người phụ trách, thời hạn và phụ thuộc công việc', 'Assign owners, deadlines, and task dependencies'), 
        choose('Theo dõi trực quan bằng bảng Kanban và Gantt timeline', 'Track visually with Kanban boards and Gantt timelines'), 
        choose('Gói Starter hỗ trợ tới 10 thành viên cùng làm việc', 'Starter plan supports up to 10 collaborating members')
      ], 
      project: choose('Dự án của đội ngũ', 'Team projects'), 
      items: [
        choose('Chiến dịch ra mắt sản phẩm mới (Sprint Q4)', 'New product launch sprint'), 
        choose('Thiết kế hệ thống giao diện Design System', 'Design system & UI components'), 
        choose('Tài liệu bàn giao & Hướng dẫn kỹ thuật', 'Handoff specs & Tech documentation')
      ] 
    },
    { 
      label: choose('Kinh doanh & Vận hành', 'Sales & Operations'), 
      icon: BarChart3, 
      title: choose('Theo dõi vận hành với thông tin tập trung.', 'Keep operations in view with shared information.'), 
      text: choose('Sử dụng các công cụ CRM, Base, Finance và Whiteboard để tổ chức dữ liệu vận hành. Nắm bắt khách hàng, hợp đồng và dòng tiền thu chi minh bạch.', 'Use CRM, Base, Finance, and Whiteboard to structure operations. Monitor clients, deals, and cash flow in one transparent system.'), 
      points: [
        choose('Quản lý thông tin khách hàng và trạng thái cơ hội (CRM)', 'Manage client pipelines and opportunity stages'), 
        choose('Theo dõi giao dịch thu chi và quét hóa đơn AI', 'Track financial transactions & AI receipt scanning'), 
        choose('CRM, ERP và Finance có sẵn từ gói Pro', 'CRM, ERP, and Finance available from Pro')
      ], 
      project: choose('Không gian vận hành', 'Operations space'), 
      items: [
        choose('Khách hàng & Hợp đồng quý 4', 'Clients & Q4 Contracts'), 
        choose('Báo cáo dòng tiền thu chi tháng này', 'Monthly cash flow & budget overview'), 
        choose('Sơ đồ luồng quy trình nội bộ', 'Internal standard operating procedures')
      ] 
    },
    { 
      label: choose('Doanh nghiệp & Đội ngũ lớn', 'Enterprises & Scale-ups'), 
      icon: Layers, 
      title: choose('Kiểm soát tập trung, bảo mật đa tầng và mở rộng không giới hạn.', 'Centralized control, enterprise security, and unlimited scale.'), 
      text: choose('Quản lý nhiều không gian làm việc, phân quyền thành viên chi tiết theo vai trò (RBAC), bảo vệ dữ liệu với Row Level Security và nhận hỗ trợ triển khai ưu tiên.', 'Manage multiple workspaces, enforce granular role-based access controls (RBAC), protect data with Row Level Security, and get priority enterprise support.'), 
      points: [
        choose('Quản trị tập trung đa không gian làm việc', 'Centralized multi-workspace administration'), 
        choose('Bảo mật dữ liệu nhiều lớp và sao lưu tự động', 'Multi-layer data security & automated backups'), 
        choose('Hỗ trợ triển khai riêng và cam kết dịch vụ (SLA)', 'Dedicated onboarding & tailored service SLAs')
      ], 
      project: choose('Không gian Doanh nghiệp', 'Enterprise Space'), 
      items: [
        choose('Bảo mật & Phân quyền tổ chức', 'Security & Access controls'), 
        choose('Chiến lược & Báo cáo tổng thể', 'Strategic planning & Executive reports'), 
        choose('Tự động hóa luồng công việc', 'Custom workflow automations')
      ] 
    },
  ];

  const aiScenarios: Record<'tasks' | 'doc' | 'summary' | 'receipt', {
    prompt: string;
    lead: string;
    items: string[];
    note: string;
  }> = {
    tasks: {
      prompt: choose('Giúp tôi chia nhỏ kế hoạch ra mắt tính năng thanh toán PayOS.', 'Help me break down the plan for launching PayOS billing.'),
      lead: choose('Đây là các việc phụ chi tiết để đội ngũ bắt đầu:', 'Here are the detailed subtasks for your team:'),
      items: [
        choose('Cấu hình API credentials & Webhook secret trên cổng PayOS', 'Configure API credentials & Webhook secret on PayOS portal'),
        choose('Hiện thực hóa bảng giá và giao diện quét mã VietQR', 'Implement pricing modal & VietQR payment checkout interface'),
        choose('Kiểm thử thanh toán tự động với tài khoản sandbox', 'Test automated payment confirmation with sandbox credentials'),
        choose('Thiết lập phân quyền tự động mở khóa tính năng sau khi thanh toán', 'Set up instant automated feature unlocking upon payment success')
      ],
      note: choose('Brain AI tự động gán ước tính thời gian và gợi ý độ ưu tiên.', 'Brain AI automatically suggests time estimates and priorities.')
    },
    doc: {
      prompt: choose('Soạn thảo bản Brief chiến dịch Marketing quý 4 cho Costack.', 'Draft a Q4 Marketing Campaign Brief for Costack.'),
      lead: choose('Bản dự thảo tài liệu dự án đã sẵn sàng trong Docs:', 'Draft project document is ready in Docs:'),
      items: [
        choose('Mục tiêu: Tăng trưởng 40% người dùng đăng ký mới trong quý 4', 'Objective: 40% growth in new user signups for Q4'),
        choose('Thông điệp cốt lõi: “Một nơi cho công việc, tài liệu và AI”', 'Core message: “One place for work, docs, and AI”'),
        choose('Kênh tiếp cận: Content SEO, Mạng xã hội, Hội thảo công nghệ', 'Channels: SEO Content, Social Media, Tech Webinars'),
        choose('Kế hoạch phân công: Copywriting (MA), Visual Design (TN), Ads (HL)', 'Assignments: Copywriting (MA), Visual Design (TN), Ads (HL)')
      ],
      note: choose('Tài liệu được chèn trực tiếp vào Docs để cả nhóm cùng biên tập.', 'Document inserted directly into Docs for team co-editing.')
    },
    summary: {
      prompt: choose('Tóm tắt 85 tin nhắn thảo luận trong kênh #chien-dich-ra-mat.', 'Summarize 85 messages from the #launch-campaign channel.'),
      lead: choose('Điểm tin nhanh và các hành động tiếp theo:', 'Key highlights and immediate next actions:'),
      items: [
        choose('Đã chốt bản thiết kế giao diện landing page phiên bản mới', 'Finalized the design mockup for the new landing page'),
        choose('Backend đã hoàn tất tích hợp cổng thanh toán và bảo mật', 'Backend has completed payment gateway & security integration'),
        choose('Hạn chót thử nghiệm nội bộ: 17:00 chiều thứ Sáu tuần này', 'Internal QA deadline: 5:00 PM this Friday'),
        choose('Người phụ trách chính: Minh Anh kiểm thử, Hoàng Linh viết thông cáo', 'Owners: Minh Anh leads QA, Hoang Linh prepares press release')
      ],
      note: choose('Tiết kiệm 30 phút đọc lại các chuỗi tin nhắn dài mỗi ngày.', 'Saves 30 minutes of reading long chat threads every day.')
    },
    receipt: {
      prompt: choose('Quét hóa đơn ăn trưa tiếp khách và ghi nhận vào sổ chi tiêu.', 'Scan client lunch receipt and record into Finance expenses.'),
      lead: choose('Kết quả trích xuất hóa đơn AI OCR:', 'AI OCR receipt extraction results:'),
      items: [
        choose('Đơn vị phát hành: Nhà hàng Sen Tây Hồ — MST: 0102345678', 'Vendor: West Lake Lotus Restaurant — Tax ID: 0102345678'),
        choose('Ngày phát hành: 09/09/2026 — Giờ: 12:45', 'Date: 09/09/2026 — Time: 12:45'),
        choose('Số tiền thanh toán: 1.250.000 ₫ (đã bao gồm VAT)', 'Total amount: 1,250,000 VND (VAT included)'),
        choose('Phân loại danh mục: Tiếp khách & Ngoại giao → Ví Công ty', 'Category: Client Hospitality → Company Wallet')
      ],
      note: choose('Tự động cập nhật số dư ví và lưu hóa đơn đính kèm vào Finance.', 'Automatically updates wallet balance and attaches receipt proof.')
    }
  };

  const comparisonCategories = [
    {
      category: choose('Quyền hạn cốt lõi', 'Core Entitlements'),
      items: [
        { name: choose('Số thành viên tối đa', 'Max members'), free: '1', starter: '10', pro: '50', business: '150' },
        { name: choose('Số Không gian làm việc (Spaces)', 'Workspaces / Spaces'), free: '3', starter: '10', pro: choose('Không giới hạn', 'Unlimited'), business: choose('Không giới hạn', 'Unlimited') },
        { name: choose('Dung lượng tệp đính kèm', 'Attachment storage'), free: '500 MB', starter: '10 GB', pro: '100 GB', business: '500 GB' },
        { name: choose('Khách xem dự án (Guest access)', 'Guest access'), free: false, starter: true, pro: true, business: true },
      ]
    },
    {
      category: choose('Quản lý công việc & Chế độ xem', 'Task Management & Views'),
      items: [
        { name: choose('Bảng Kanban & Danh sách (List)', 'Kanban & List views'), free: true, starter: true, pro: true, business: true },
        { name: choose('Lịch (Calendar) & Gantt Timeline', 'Calendar & Gantt timelines'), free: false, starter: true, pro: true, business: true },
        { name: choose('Bảng dữ liệu dạng bảng (Table view)', 'Table database view'), free: true, starter: true, pro: true, business: true },
        { name: choose('Công việc con (Subtasks) & Cột mốc (Milestones)', 'Subtasks & Milestones'), free: true, starter: true, pro: true, business: true },
        { name: choose('Phụ thuộc công việc (Dependencies)', 'Task Dependencies'), free: false, starter: true, pro: true, business: true },
        { name: choose('Trường dữ liệu tùy biến (Custom Fields)', 'Custom Fields'), free: false, starter: true, pro: true, business: true },
      ]
    },
    {
      category: choose('Trợ lý thông minh Costack Brain AI', 'Costack Brain AI Assistant'),
      items: [
        { name: choose('Yêu cầu AI hàng tháng', 'Monthly AI requests'), free: choose('Chưa bao gồm', 'Not included'), starter: '300 / mo', pro: '1,500 / mo', business: '5,000 / mo' },
        { name: choose('Tự động phân rã & Checklist công việc', 'Smart task breakdown'), free: false, starter: true, pro: true, business: true },
        { name: choose('Soạn thảo & Tóm tắt tài liệu', 'Document writing & summarization'), free: false, starter: true, pro: true, business: true },
        { name: choose('AI Quét hóa đơn & Trích xuất chi tiêu', 'AI Receipt & Invoice OCR'), free: false, starter: false, pro: true, business: true },
      ]
    },
    {
      category: choose('Hệ sinh thái & Công cụ chuyên sâu', 'Advanced Ecosystem & Hubs'),
      items: [
        { name: choose('Tài liệu sống Docs (Markdown & Cộng tác)', 'Live Docs & Markdown collaboration'), free: true, starter: true, pro: true, business: true },
        { name: choose('Kênh giao tiếp nhóm & Trao đổi trực tiếp', 'Team Chat Channels & Direct Messages'), free: true, starter: true, pro: true, business: true },
        { name: choose('Mục tiêu chiến lược & Theo dõi OKRs Hub', 'Strategic Goals & OKRs Hub'), free: false, starter: true, pro: true, business: true },
        { name: choose('Bảng vẽ ý tưởng (Whiteboard)', 'Interactive Whiteboards'), free: false, starter: true, pro: true, business: true },
        { name: choose('Quản lý Tài chính, Ví tiền & Dòng tiền (Finance)', 'Finance Hub & Cash flow management'), free: false, starter: false, pro: true, business: true },
        { name: choose('Quản lý Khách hàng & Vận hành (CRM & ERP)', 'CRM & Operations (ERP)'), free: false, starter: false, pro: true, business: true },
      ]
    },
    {
      category: choose('Bảo mật & Hỗ trợ khách hàng', 'Security & Customer Support'),
      items: [
        { name: choose('Mã hóa SSL/TLS & Row Level Security (RLS)', 'SSL/TLS & Row Level Security'), free: true, starter: true, pro: true, business: true },
        { name: choose('Sao lưu tự động hàng ngày', 'Daily automated backups'), free: true, starter: true, pro: true, business: true },
        { name: choose('Hỗ trợ khách hàng tiêu chuẩn', 'Standard customer support'), free: true, starter: true, pro: true, business: true },
        { name: choose('Hỗ trợ ưu tiên & Cam kết SLA riêng', 'Priority support & Dedicated SLA'), free: false, starter: false, pro: false, business: true },
      ]
    }
  ];

  const faqs = [
    [
      choose('Costack phù hợp với ai?', 'Who is Costack for?'),
      choose('Costack được thiết kế cho cả cá nhân muốn sắp xếp cuộc sống, công việc khoa học lẫn các đội ngũ dự án, công ty khởi nghiệp và doanh nghiệp cần một không gian làm việc số thống nhất cho công việc, tài liệu, trao đổi, tài chính và mục tiêu.', 'Costack is built for individuals organizing their personal work, as well as project teams, startups, and enterprises needing a unified workspace for tasks, docs, chat, finances, and goals.')
    ],
    [
      choose('Gói miễn phí (Free) có những gì và có bị giới hạn thời gian không?', 'What is included in Free and is there a time limit?'),
      choose(`Gói Free hoàn toàn miễn phí trọn đời (không giới hạn số ngày sử dụng), hỗ trợ ${PLAN_ENTITLEMENTS.free.maxMembers} thành viên, tối đa ${PLAN_ENTITLEMENTS.free.maxSpaces} không gian làm việc (Spaces) và đầy đủ các tính năng quản lý công việc cốt lõi (Kanban, Danh sách, Docs, Chat). Bạn không cần nhập thẻ thanh toán để bắt đầu.`, `The Free plan is free forever with no expiration date, supporting ${PLAN_ENTITLEMENTS.free.maxMembers} member, up to ${PLAN_ENTITLEMENTS.free.maxSpaces} spaces, and core workspace features (Kanban, List, Docs, Chat). No credit card required.`)
    ],
    [
      choose('Costack Brain AI hoạt động như thế nào và có bảo mật dữ liệu không?', 'How does Costack Brain AI work and is my data secure?'),
      choose('Costack Brain AI hoạt động trên nền tảng mô hình AI tiên tiến của Google Gemini, chỉ được kích hoạt khi bạn chủ động yêu cầu. Dữ liệu của bạn không bao giờ được dùng để huấn luyện mô hình chung và luôn được bảo vệ bằng cơ chế xác thực phiên riêng tư trên máy chủ.', 'Costack Brain AI is powered by Google Gemini and activates only when explicitly requested. Your data is never used to train public models and is always secured via authenticated server-side sessions.')
    ],
    [
      choose('Tôi có thể chuyển dữ liệu từ Notion, Trello hoặc Asana sang Costack không?', 'Can I import data from Notion, Trello, or Asana?'),
      choose('Hoàn toàn được. Costack hỗ trợ nhập dữ liệu dạng JSON, CSV và bảng tính Excel, giúp bạn chuyển đổi danh sách công việc, thẻ ghi chú và dữ liệu khách hàng từ các nền tảng khác sang Costack chỉ trong vài phút.', 'Yes, Costack supports importing from JSON, CSV, and Excel spreadsheets, allowing you to migrate tasks, notes, and customer records from other platforms in just a few minutes.')
    ],
    [
      choose('Hình thức thanh toán qua PayOS và kích hoạt tài khoản như thế nào?', 'How does PayOS payment and account activation work?'),
      choose('Costack hỗ trợ thanh toán tức thì qua cổng PayOS với mã VietQR chuẩn NAPAS 24/7 của tất cả các ngân hàng Việt Nam. Ngay sau khi bạn quét mã chuyển khoản, tài khoản sẽ được nâng cấp tự động trong 3 giây mà không cần chờ duyệt thủ công.', 'Costack supports instant payments via PayOS with NAPAS 24/7 VietQR codes across all Vietnamese banks. Your account upgrades automatically within 3 seconds after transfer without manual waiting.')
    ],
    [
      choose('Tôi có thể nâng cấp, hạ cấp hoặc đổi chu kỳ thanh toán không?', 'Can I upgrade, downgrade, or change billing cycles?'),
      choose('Bạn có thể nâng cấp gói dịch vụ bất kỳ lúc nào để nhận thêm thành viên và hạn mức AI. Với PayOS, gói thanh toán là trả trước không tự động trừ tiền khi hết hạn, giúp bạn hoàn toàn an tâm và chủ động kiểm soát chi phí.', 'You can upgrade anytime for more member seats and AI limits. PayOS is prepaid with zero recurring auto-debits, giving you complete peace of mind and control over spending.')
    ],
    [
      choose('Costack có hoạt động ngoại tuyến (Offline) và đa thiết bị không?', 'Does Costack work offline and across devices?'),
      choose('Costack ứng dụng kiến trúc Local-First thông minh, cho phép bạn tiếp tục xem và xử lý công việc ngay cả khi mất kết nối mạng. Dữ liệu sẽ tự động đồng bộ lên đám mây khi có kết nối trở lại. Bạn có thể sử dụng mượt mà trên cả trình duyệt máy tính và điện thoại thông minh.', 'Costack leverages a local-first architecture so you can continue viewing and editing tasks even without internet. Data automatically syncs when reconnected. Works seamlessly on desktop and mobile browsers.')
    ],
    [
      choose('Costack có hỗ trợ mời khách bên ngoài vào xem dự án không (Guest Access)?', 'Does Costack support external guest access?'),
      choose('Có. Bạn có thể chia sẻ tài liệu Docs công khai bằng liên kết hoặc mời khách đối tác vào một Space cụ thể mà không lo họ truy cập được vào các không gian làm việc nội bộ hay dữ liệu tài chính khác.', 'Yes. You can share public document links or invite external guests to a specific Space without giving them access to your internal workspaces or financial hubs.')
    ],
    [
      choose('Dữ liệu của tôi được sao lưu và bảo vệ như thế nào?', 'How is my data backed up and protected?'),
      choose('Toàn bộ kết nối được mã hóa bằng chuẩn HTTPS/TLS 1.3. Cơ sở dữ liệu được bảo vệ bằng chính sách Row Level Security (RLS) đa tầng, cô lập dữ liệu tuyệt đối giữa các tổ chức và được sao lưu tự động hàng ngày.', 'All connections are encrypted with HTTPS/TLS 1.3. Databases are isolated using multi-tenant Row Level Security (RLS) policies and backed up automatically every day.')
    ],
    [
      choose('Tôi cần hỗ trợ kỹ thuật hoặc tư vấn triển khai cho doanh nghiệp thì liên hệ ở đâu?', 'Where can I get technical support or enterprise consultation?'),
      choose('Đội ngũ Costack luôn sẵn sàng hỗ trợ bạn qua email contact@costack.vn hoặc kênh hỗ trợ trực tuyến trong ứng dụng. Đối với gói Enterprise, chúng tôi có nhân viên hỗ trợ riêng để tư vấn và đào tạo chuyển đổi số cho doanh nghiệp.', 'Our team is always ready via contact@costack.vn or in-app support. Enterprise customers receive dedicated support specialists for consultation and digital transformation onboarding.')
    ]
  ];
  const navLink = (id: string, label: string) => <a href={`#${id}`} onClick={event => navigate(event, id)} aria-current={activeSection === id ? 'location' : undefined}>{label}</a>;

  return <MotionConfig reducedMotion="user"><div ref={rootRef} className={s.landing} id="top">
    <a href="#main-content" className={s.skipLink} onClick={event => navigate(event, 'main-content')}>{choose('Đến nội dung chính', 'Skip to content')}</a>
    <header ref={headerRef} className={s.header} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) closeMenu(); }}>
      <div className={s.headerInner}>
        <a href="#top" onClick={event => navigate(event, 'top')} className={s.brand} aria-label={choose('Costack — Trang chủ', 'Costack — Home')}>
          <img src="/logo.png" alt="Costack Logo" className="w-8 h-8 object-contain shrink-0 transition-transform duration-200 hover:scale-105" />
          <span>Costack<span className={s.brandDot}>.</span></span>
        </a>
        <nav className={s.desktopNav} aria-label={choose('Điều hướng chính', 'Main navigation')}>
          <div className={s.navDropdown}><button data-dropdown="product" aria-expanded={menu === 'product'} aria-controls="product-menu" onClick={() => setMenu(menu === 'product' ? null : 'product')}>{choose('Sản phẩm', 'Product')}<ChevronDown size={14} /></button>
            {menu === 'product' && <div className={s.megaMenu} id="product-menu"><div><span className={s.eyebrow}>{choose('KHÁM PHÁ COSTACK', 'EXPLORE COSTACK')}</span>{[[Kanban, 'product', choose('Xem thử workspace', 'Explore the workspace'), choose('Công việc, tài liệu và trao đổi', 'Tasks, documents and conversations')], [Layers, 'features', choose('Tất cả tính năng', 'All features'), choose('Những công cụ cho ngày làm việc', 'Tools for your working day')], [Sparkles, 'ai', 'Costack Brain AI', choose('Thêm một trợ lý cho công việc', 'A helping hand for your work')]].map(([Icon, id, title, description]) => { const ItemIcon = Icon as LucideIcon; return <a key={id as string} href={`#${id}`} onClick={event => navigate(event, id as string)}><ItemIcon size={20} /><span><strong>{title as string}</strong><small>{description as string}</small></span><ArrowUpRight size={15} /></a>; })}</div><div className={s.menuAside}><span className={s.menuOrb}><Workflow size={30} /></span><strong>{choose('Một nơi chung. Nhiều cách làm việc.', 'One shared space. Many ways to work.')}</strong><p>{choose('Bắt đầu từ một dự án và xây cách làm việc phù hợp với bạn.', 'Start with a project and build a way of working that fits you.')}</p><button onClick={signup}>{choose('Bắt đầu miễn phí', 'Start for free')}<ArrowRight size={15} /></button></div></div>}
          </div>
          {navLink('solutions', choose('Giải pháp', 'Solutions'))}{navLink('pricing', choose('Bảng giá', 'Pricing'))}
          <div className={s.navDropdown}><button data-dropdown="resources" aria-expanded={menu === 'resources'} aria-controls="resources-menu" onClick={() => setMenu(menu === 'resources' ? null : 'resources')}>{choose('Tài nguyên', 'Resources')}<ChevronDown size={14} /></button>
            {menu === 'resources' && <div className={s.resourceMenu} id="resources-menu">{navLink('how-it-works', choose('Bắt đầu với Costack', 'Getting started'))}{navLink('faq', choose('Câu hỏi thường gặp', 'Frequently asked questions'))}<Link href="/legal/security">{choose('Bảo mật & Dữ liệu', 'Security & Data')}</Link><a href="mailto:contact@costack.vn">{choose('Liên hệ hỗ trợ', 'Contact support')}<ArrowUpRight size={14} /></a></div>}
          </div>
        </nav>
        <div className={s.headerActions}><div className={s.preferences}><LanguageSwitch size="md" /><ThemeSwitch size="sm" /></div><button className={s.signin} onClick={() => { closeMenu(); onSignIn(); }}>{choose('Đăng nhập', 'Log in')}</button><GsapMagneticButton className={`${s.primaryButton} ${s.headerCta}`} onClick={signup}>{choose('Bắt đầu miễn phí', 'Start for free')}<ArrowUpRight size={16} /></GsapMagneticButton><button ref={mobileButtonRef} className={s.mobileToggle} aria-label={mobileOpen ? choose('Đóng menu', 'Close menu') : choose('Mở menu', 'Open menu')} aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => { setMobileOpen(!mobileOpen); setMenu(null); }}>{mobileOpen ? <X /> : <Menu />}</button></div>
      </div>
      {mobileOpen && <nav className={s.mobileNav} id="mobile-navigation" aria-label={choose('Điều hướng di động', 'Mobile navigation')}>{navLink('product', choose('Xem thử sản phẩm', 'Product preview'))}{navLink('features', choose('Tính năng', 'Features'))}{navLink('solutions', choose('Giải pháp', 'Solutions'))}{navLink('ai', 'Costack Brain AI')}{navLink('pricing', choose('Bảng giá', 'Pricing'))}{navLink('how-it-works', choose('Hướng dẫn bắt đầu', 'Getting started'))}{navLink('faq', choose('Câu hỏi thường gặp', 'FAQ'))}<Link href="/legal/security">{choose('Bảo mật & Dữ liệu', 'Security & Data')}</Link><a href="mailto:contact@costack.vn">{choose('Liên hệ hỗ trợ', 'Contact support')}</a><div className={s.mobileAuth}><button className={s.secondaryButton} onClick={() => { closeMenu(); onSignIn(); }}>{choose('Đăng nhập', 'Log in')}</button><button className={s.primaryButton} onClick={signup}>{choose('Bắt đầu miễn phí', 'Start for free')}<ArrowRight size={15} /></button></div></nav>}
      <div className={s.scrollProgress} />
    </header>

    <main id="main-content">
      <section className={s.hero} aria-labelledby="hero-title">
        <GsapAmbientGlow />
        <div className={s.heroGlow} aria-hidden="true" />
        <div className={s.heroGrid} aria-hidden="true" />
        <div className={s.heroContent}><a className={s.heroBadge} href="#ai" onClick={event => navigate(event, 'ai')}><span><Sparkles size={13} /> COSTACK BRAIN AI</span>{choose('Thêm trợ lực cho ngày làm việc', 'A little help for your working day')}<ArrowUpRight size={13} /></a>
          <h1 id="hero-title">{choose('Bớt việc rời rạc.', 'Less scattered work.')}<br /><span>{choose('Thêm điều làm được.', 'More moving forward.')}</span></h1>
          <p className={s.heroDescription}>{choose('Công việc, tài liệu, trao đổi và AI — cùng một workspace.', 'Tasks, documents, conversations and AI — in one workspace.')}<br className={s.desktopBreak} />{' '}{choose('Để bạn và đội ngũ tập trung làm tốt điều quan trọng.', 'So you and your team can focus on what matters.')}</p>
          <div className={s.heroActions}><GsapMagneticButton className={s.primaryButton} onClick={() => startPlan('free')}>{choose('Tạo workspace miễn phí', 'Create your free workspace')}<ArrowRight size={18} /></GsapMagneticButton><a className={s.secondaryButton} href="#product" onClick={event => navigate(event, 'product')}><Grip size={18} />{choose('Khám phá bên trong', 'Take a look inside')}</a></div>
          <div className={s.heroNotes}><span><Check size={14} />{choose('Có gói miễn phí', 'Free plan available')}</span><span><Check size={14} />{choose('Không cần thẻ thanh toán', 'No credit card needed')}</span><span><Globe2 size={14} />{choose('Tiếng Việt & English', 'English & Vietnamese')}</span></div>
        </div>
        <div className={s.container}><ProductPreview vi={vi} /></div>
      </section>

      <div className={`${s.toolStrip} ${s.container}`}><span>{choose('TỪ Ý TƯỞNG ĐẾN VẬN HÀNH', 'FROM IDEAS TO OPERATIONS')}</span><div>{[[Kanban, 'Tasks'], [FileText, 'Docs'], [MessageSquare, 'Chat'], [Layers, 'Base'], [Target, 'Goals'], [Wallet, 'Finance'], [Sparkles, 'Brain AI']].map(([Icon, label]) => { const ToolIcon = Icon as LucideIcon; return <span key={label as string}><ToolIcon size={19} />{label as string}</span>; })}</div></div>

      <GsapScrollCascade className={`${s.statsStrip} ${s.container}`} itemSelector={`.${s.statItem}`}>
        <div className={s.statItem}>
          <strong><GsapAnimatedCounter value={99.9} decimals={1} suffix="%" /></strong>
          <span>{choose('Độ tin cậy & Sẵn sàng cao', 'High Uptime & Reliability')}</span>
        </div>
        <div className={s.statItem}>
          <strong><GsapAnimatedCounter value={50} prefix="< " suffix="ms" /></strong>
          <span>{choose('Đồng bộ Local-first tức thì', 'Local-first Instant Sync')}</span>
        </div>
        <div className={s.statItem}>
          <strong><GsapAnimatedCounter value={3} suffix={choose(' Giây', 's')} /></strong>
          <span>{choose('Kích hoạt PayOS tự động', 'Instant PayOS Activation')}</span>
        </div>
        <div className={s.statItem}>
          <strong><GsapAnimatedCounter value={100} suffix="%" /></strong>
          <span>{choose('Cô lập dữ liệu RLS & SSL', 'Encrypted & RLS Isolated')}</span>
        </div>
      </GsapScrollCascade>

      <section className={`${s.section} ${s.container}`} id="features" aria-labelledby="features-title"><Reveal className={s.sectionHeading}><div><span className={s.eyebrow}>{choose('MỌI THỨ CÓ CHỖ CỦA MÌNH', 'A PLACE FOR EVERYTHING')}</span><h2 id="features-title">{choose('Công cụ kết nối.', 'Connected tools.')}<br />{choose('Công việc liền mạch.', 'Work that flows.')}</h2></div><p>{choose('Không phải bắt đầu bằng một quy trình phức tạp. Chọn những công cụ bạn cần, rồi để công việc, thông tin và đồng đội ở gần nhau hơn.', 'You don’t need a complicated process to get started. Choose the tools you need and bring work, information and teammates closer together.')}</p></Reveal>
        <GsapScrollCascade className={s.featureGrid} itemSelector={`.${s.featureCard}`}>
          {features.map(({ icon: Icon, title, text, detail, tone }, index) => (
            <GsapCard3DTilt
              key={title}
              className={s.featureCard}
              innerClassName="flex flex-col h-full"
              maxTilt={6}
              scale={1.02}
              glare={true}
            >
              <div className={s.featureCardTop}><span className={s.featureIcon} data-tone={tone}><Icon size={23} /></span><span>0{index + 1}</span></div>
              <h3>{title}</h3>
              <p>{text}</p>
              <div className={s.featureDetail}>{detail}</div>
            </GsapCard3DTilt>
          ))}
        </GsapScrollCascade>
      </section>

      <section className={s.workflowSection} id="how-it-works" aria-labelledby="workflow-title">
        <div className={s.container}>
          <Reveal className={s.centerHeading}>
            <span className={s.eyebrow}>{choose('BẮT ĐẦU TỪ VIỆC ĐƠN GIẢN', 'START WITH THE SIMPLE THINGS')}</span>
            <h2 id="workflow-title">{choose('Một dự án đầu tiên. Một nhịp làm việc mới.', 'Your first project. A new way to work.')}</h2>
            <p>{choose('Đưa công việc đang làm vào Costack, từng bước một với quy trình 4 bước chuẩn mực.', 'Bring your work into Costack smoothly with a proven 4-step onboarding journey.')}</p>
          </Reveal>
          <GsapScrollCascade className={s.steps} itemSelector={`.${s.step}`}>{[
            [Folder, choose('Tạo không gian & Phân quyền', 'Create spaces & Set permissions'), choose('Tổ chức workspace theo phòng ban hoặc dự án. Phân quyền truy cập rõ ràng giữa thành viên nội bộ và khách đối tác.', 'Organize your workspace by department or project. Set clear access permissions between internal teams and guest partners.')],
            [ListTodo, choose('Lập kế hoạch & Phân rã với AI', 'Plan & Break down tasks with AI'), choose('Tạo danh sách công việc, gán hạn hoàn thành và người phụ trách. Sử dụng Brain AI để tự động phân rã dự án thành các việc phụ.', 'Add tasks, due dates, and owners. Use Brain AI to automatically break down complex projects into actionable checklists.')],
            [MessageSquare, choose('Cộng tác & Giao tiếp tức thì', 'Collaborate & Communicate in realtime'), choose('Thảo luận trong kênh nhóm, chia sẻ tài liệu Docs sống và cập nhật trạng thái mọi lúc mọi nơi trên máy tính lẫn di động.', 'Discuss in project channels, co-edit live Docs, and update statuses anywhere across desktop and mobile.')],
            [Target, choose('Đo lường & Tối ưu hiệu suất', 'Track goals & Optimize performance'), choose('Theo dõi tiến độ OKRs, tổng kết chi phí dòng tiền trên Finance Hub và đánh giá năng suất toàn đội ngũ qua báo cáo trực quan.', 'Monitor OKRs progress, track cash flow in the Finance Hub, and evaluate team productivity with visual analytics.')],
          ].map(([Icon, title, text], index) => { const StepIcon = Icon as LucideIcon; return <div key={title as string} className={s.step}><span className={s.stepNumber}>0{index + 1}</span><StepIcon size={25} /><h3>{title as string}</h3><p>{text as string}</p></div>; })}</GsapScrollCascade>
        </div>
      </section>

      <section className={`${s.section} ${s.container}`} id="solutions" aria-labelledby="solutions-title"><Reveal className={s.centerHeading}><span className={s.eyebrow}>{choose('PHÙ HỢP VỚI CÁCH BẠN LÀM VIỆC', 'BUILT AROUND THE WAY YOU WORK')}</span><h2 id="solutions-title">{choose('Một mình hay cả đội, đều có một chỗ.', 'Your own work. Your whole team.')}</h2></Reveal><div className={s.solutionTabs} aria-label={choose('Chọn nhu cầu sử dụng', 'Choose your use case')}>{solutions.map(({ label, icon: Icon }, index) => <button key={label} aria-pressed={solution === index} onClick={() => setSolution(index)}><Icon size={17} />{label}</button>)}</div><div className={s.solutionPanel}>
        <Reveal className={s.solutionCopy}><span className={s.eyebrow}>{solutions[solution].label}</span><h3>{solutions[solution].title}</h3><p>{solutions[solution].text}</p><ul>{solutions[solution].points.map(point => <li key={point}><Check size={17} />{point}</li>)}</ul><button className={s.textButton} onClick={signup}>{choose('Tạo không gian của bạn', 'Make space for your work')}<ArrowRight size={17} /></button></Reveal>
        <div className={s.solutionVisual}><div className={s.orbit} aria-hidden="true" /><motion.div key={solution} initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} className={s.projectStack}><div className={s.projectStackTop}><span className={s.featureIcon} data-tone="blue"><Folder size={24} /></span><span>{choose('WORKSPACE CỦA BẠN', 'YOUR WORKSPACE')}<strong>{solutions[solution].project}</strong></span><Layers size={20} /></div>{solutions[solution].items.map((item, index) => <div className={s.projectRow} key={item}><span>0{index + 1}</span><strong>{item}</strong><ArrowUpRight size={16} /></div>)}<div className={s.projectBottom}><span className={s.statusDot} />{choose('Mọi thứ ở đúng nơi bạn cần', 'Everything where you need it')}</div></motion.div></div>
      </div></section>

      <section className={`${s.aiSection} ${s.container}`} id="ai" aria-labelledby="ai-title">
        <GsapAmbientGlow glowCount={2} />
        <div className={s.aiGlow} aria-hidden="true" /><Reveal className={s.aiCopy}><span className={s.aiBadge}><Sparkles size={15} /> COSTACK BRAIN AI</span><h2 id="ai-title">{choose('Từ “bắt đầu ở đâu?”', 'From “where do I start?”')}<br /><span>{choose('đến một bước rõ ràng.', 'to a clear next step.')}</span></h2><p>{choose('Một trợ lý ngay trong workspace: giúp bạn phác thảo kế hoạch, chia nhỏ công việc, tóm tắt nội dung và viết bản nháp đầu tiên.', 'An assistant inside your workspace: outline a plan, break down tasks, summarize content and write that first draft.')}</p>
        <div className={s.aiPills} role="tablist" aria-label={choose('Kịch bản AI', 'AI Scenarios')}>
          <button type="button" role="tab" aria-selected={aiTab === 'tasks'} onClick={() => setAiTab('tasks')}><ListTodo size={14} />{choose('Chia nhỏ công việc', 'Task breakdown')}</button>
          <button type="button" role="tab" aria-selected={aiTab === 'doc'} onClick={() => setAiTab('doc')}><FileText size={14} />{choose('Soạn thảo tài liệu', 'Draft document')}</button>
          <button type="button" role="tab" aria-selected={aiTab === 'summary'} onClick={() => setAiTab('summary')}><MessageSquare size={14} />{choose('Tóm tắt & Báo cáo', 'Meeting summary')}</button>
          <button type="button" role="tab" aria-selected={aiTab === 'receipt'} onClick={() => setAiTab('receipt')}><Wallet size={14} />{choose('Quét hóa đơn AI', 'Scan receipt')}</button>
        </div>
        <a href="#pricing" onClick={event => navigate(event, 'pricing')} className={s.aiLink}>{choose('Khám phá các gói có AI', 'Explore plans with AI')}<ArrowRight size={16} /></a><small>{choose('Có từ gói Starter · Hạn mức theo gói · Bạn kiểm tra và quyết định', 'From Starter · Plan-based limits · You review and decide')}</small></Reveal>
        <Reveal className={s.aiExample}>
          <GsapCard3DTilt maxTilt={4} scale={1.01} glare={true} className="rounded-2xl overflow-hidden">
            <div className={s.aiExampleHeader}><Sparkles size={19} /><strong>Costack Brain</strong><span>{choose('Mô phỏng tương tác thực tế', 'Live Interactive Simulation')}</span></div>
            <div className={s.aiPrompt}>{aiScenarios[aiTab].prompt}</div>
            <div className={s.aiResponse}>
              <span><Sparkles size={15} className="text-sky-600 dark:text-sky-400" />{aiScenarios[aiTab].lead}</span>
              {aiScenarios[aiTab].items.map((item, index) => <div className={s.aiTask} key={item}><span>{index + 1}</span>{item}<Check size={14} /></div>)}
              <p>{aiScenarios[aiTab].note}</p>
            </div>
          </GsapCard3DTilt>
        </Reveal>
      </section>

      <section className={`${s.section} ${s.container}`} id="pricing" aria-labelledby="pricing-title"><Reveal className={s.centerHeading}><span className={s.eyebrow}>{choose('BẮT ĐẦU NHỎ. MỞ RỘNG KHI CẦN.', 'START SMALL. GROW WHEN YOU NEED TO.')}</span><h2 id="pricing-title">{choose('Chọn gói cho nhịp làm việc của bạn.', 'A plan for the way you work.')}</h2><p>{choose('Dùng miễn phí cho cá nhân. Nâng cấp khi cần thêm thành viên, AI và công cụ vận hành.', 'Start free for yourself. Upgrade for more members, AI and operational tools.')}</p></Reveal><div className={s.billingToggle} aria-label={choose('Chu kỳ thanh toán', 'Billing cycle')}><button aria-pressed={cycle === 'monthly'} onClick={() => setCycle('monthly')}>{choose('Theo tháng', 'Monthly')}</button><button aria-pressed={cycle === 'yearly'} onClick={() => setCycle('yearly')}>{choose('Theo năm', 'Yearly')}<span>12 {choose('tháng', 'months')}</span></button></div>
        <div className={s.pricingGrid}>{(['free', 'starter', 'pro', 'business'] as const).map(plan => {
          const limits = PLAN_ENTITLEMENTS[plan];
          const amount = plan === 'free' ? 0 : prices[plan]?.[cycle]?.unit_amount ?? SUGGESTED_PRICES[plan][cycle];
          const formatted = new Intl.NumberFormat(vi ? 'vi-VN' : 'en-US').format(amount);
          const descriptions = { free: choose('Cho công việc của riêng bạn', 'For your own work'), starter: choose('Cùng nhóm nhỏ bắt đầu', 'Get started with a small team'), pro: choose('Kết nối dự án và vận hành', 'Connect projects and operations'), business: choose('Thêm dung lượng cho đội ngũ lớn', 'More capacity for larger teams') };
          return <GsapCard3DTilt key={plan} className={`${s.priceCard} ${plan === 'pro' ? s.featuredPrice : ''}`} innerClassName="flex flex-col h-full" maxTilt={plan === 'pro' ? 5 : 3} scale={plan === 'pro' ? 1.015 : 1.008} glare={plan === 'pro'}>{plan === 'pro' && <div className={s.priceRibbon}><Sparkles size={13} />{choose('CHO ĐỘI NGŨ ĐANG PHÁT TRIỂN', 'FOR GROWING TEAMS')}</div>}<h3>{plan === 'free' ? 'Free' : plan[0].toUpperCase() + plan.slice(1)}</h3><p>{descriptions[plan]}</p><div className={s.priceAmount}>{formatted}<span>₫</span></div><div className={s.priceTerm}>{plan === 'free' ? choose('Miễn phí', 'Free') : cycle === 'monthly' ? choose('/ gói / tháng', '/ plan / month') : choose('/ gói / năm · thanh toán 12 tháng', '/ plan / year · 12 months paid upfront')}</div><button className={plan === 'pro' ? s.primaryButton : s.secondaryButton} onClick={() => startPlan(plan)}>{plan === 'free' ? choose('Bắt đầu miễn phí', 'Start for free') : choose(`Chọn ${plan[0].toUpperCase() + plan.slice(1)}`, `Choose ${plan[0].toUpperCase() + plan.slice(1)}`)}<ArrowUpRight size={15} /></button><ul><li><Check size={15} />{limits.maxMembers} {choose('thành viên', limits.maxMembers === 1 ? 'member' : 'members')}</li><li><Check size={15} />{limits.maxSpaces === null ? choose('Không giới hạn không gian', 'Unlimited spaces') : choose(`${limits.maxSpaces} không gian`, `${limits.maxSpaces} spaces`)}</li><li><Check size={15} />{choose('Workspace cốt lõi', 'Core workspace')}</li><li>{limits.monthlyAiRequests ? <Check size={15} /> : <Circle size={15} />}{limits.monthlyAiRequests ? `${new Intl.NumberFormat(vi ? 'vi-VN' : 'en-US').format(limits.monthlyAiRequests)} ${choose('yêu cầu AI / tháng', 'AI requests / month')}` : choose('Chưa bao gồm AI', 'AI not included')}</li>{plan !== 'free' && <li><Check size={15} />Calendar & Gantt</li>}{(plan === 'pro' || plan === 'business') && <><li><Check size={15} />CRM, ERP & Finance</li><li><Check size={15} />{choose('Tự động hóa nâng cao', 'Advanced automation')}</li></>}{plan === 'business' && <li><Check size={15} />{choose('Hỗ trợ ưu tiên', 'Priority support')}</li>}</ul></GsapCard3DTilt>;
        })}</div>
        <div className={s.comparisonWrap}>
          <div className={s.comparisonHeader} onClick={() => setShowComparison(!showComparison)}>
            <h3><Sparkles size={16} />{choose('So sánh chi tiết tính năng các gói', 'Detailed Feature Comparison')}</h3>
            <span>{showComparison ? choose('Thu gọn', 'Collapse') : choose('Xem toàn bộ tính năng', 'View all features')} <ChevronDown size={14} style={{ transform: showComparison ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} /></span>
          </div>
          {showComparison && (
            <div className={s.comparisonTableContainer}>
              <table className={s.comparisonTable}>
                <thead>
                  <tr>
                    <th>{choose('Tính năng / Quyền lợi', 'Feature / Entitlement')}</th>
                    <th>Free</th>
                    <th>Starter</th>
                    <th>Pro</th>
                    <th>Business</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonCategories.map((cat, catIdx) => (
                    <Fragment key={catIdx}>
                      <tr className={s.categoryRow}><td colSpan={5}>{cat.category}</td></tr>
                      {cat.items.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          <td>{row.name}</td>
                          <td>{typeof row.free === 'boolean' ? (row.free ? <Check size={15} className={s.checkIcon} /> : <span className={s.dashIcon}>—</span>) : row.free}</td>
                          <td>{typeof row.starter === 'boolean' ? (row.starter ? <Check size={15} className={s.checkIcon} /> : <span className={s.dashIcon}>—</span>) : row.starter}</td>
                          <td>{typeof row.pro === 'boolean' ? (row.pro ? <Check size={15} className={s.checkIcon} /> : <span className={s.dashIcon}>—</span>) : row.pro}</td>
                          <td>{typeof row.business === 'boolean' ? (row.business ? <Check size={15} className={s.checkIcon} /> : <span className={s.dashIcon}>—</span>) : row.business}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className={s.priceNote} role="status">{priceStatus === 'live' ? choose('Giá VND theo cấu hình hiện tại. Quyền lợi và số thành viên áp dụng theo gói; kiểm tra chi tiết trước khi thanh toán.', 'VND prices from the current catalog. Features and member limits depend on your plan; review the details before payment.') : priceStatus === 'loading' ? choose('Đang cập nhật giá. Các mức hiển thị là giá tham khảo.', 'Updating prices. Amounts shown are reference prices.') : choose('Chưa tải được giá hiện tại; đang hiển thị giá tham khảo. Giá chính thức được xác nhận khi thanh toán.', 'Current prices could not be loaded; reference prices are shown. Confirm the final price at checkout.')}</p><div className={s.enterprise}><div><Users size={22} /><span><strong>{choose('Nhu cầu lớn hơn? Cùng trao đổi.', 'Need more? Let’s talk.')}</strong><small>{choose('Liên hệ để trao đổi quy mô và nhu cầu triển khai gói Enterprise.', 'Contact us to discuss your scale and Enterprise requirements.')}</small></span></div><a href="mailto:contact@costack.vn?subject=Costack%20Enterprise">{choose('Liên hệ về Enterprise', 'Contact us about Enterprise')}<ArrowUpRight size={16} /></a></div>
      </section>

      <section className={`${s.faqSection} ${s.container}`} id="faq" aria-labelledby="faq-title"><Reveal className={s.faqIntro}><span className={s.eyebrow}>{choose('GIẢI ĐÁP TRƯỚC KHI BẮT ĐẦU', 'BEFORE YOU GET STARTED')}</span><h2 id="faq-title">{choose('Bạn hỏi.', 'Your questions.')}<br />{choose('Costack trả lời.', 'Answered.')}</h2><p>{choose('Những điều cần biết để chọn cách sử dụng phù hợp.', 'What you need to know to find your fit.')}</p><a href="mailto:contact@costack.vn" className={s.textButton}>{choose('Trao đổi với chúng tôi', 'Talk to us')}<ArrowUpRight size={16} /></a></Reveal><div className={s.faqList}>{faqs.map(([question, answer], index) => <div className={s.faqItem} key={question}><h3><button aria-expanded={faq === index} aria-controls={`faq-answer-${index}`} id={`faq-question-${index}`} onClick={() => setFaq(faq === index ? null : index)}>{question}<Plus size={19} /></button></h3><div className={s.faqAnswer} id={`faq-answer-${index}`} role="region" aria-labelledby={`faq-question-${index}`} hidden={faq !== index}><p>{answer}</p></div></div>)}</div></section>

      <section className={s.finalCta}><div className={s.finalGrid} aria-hidden="true" /><Reveal><span className={s.finalIcon}><Sparkles className="h-8 w-8 text-sky-600 dark:text-sky-400" /></span><h2>{choose('Cho công việc một nơi.', 'Make room for your work.')}<br /><span>{choose('Cho ý tưởng một khởi đầu.', 'Give your ideas a start.')}</span></h2><p>{choose('Bắt đầu với dự án bạn đang làm. Costack sẵn sàng cùng bạn.', 'Start with the project on your mind. Make it happen with Costack.')}</p><GsapMagneticButton className={s.primaryButton} onClick={() => startPlan('free')}>{choose('Tạo workspace miễn phí', 'Create your free workspace')}<ArrowRight size={18} /></GsapMagneticButton><small>{choose('Gói Free cho 1 người · Không cần thẻ thanh toán', 'Free for 1 person · No credit card needed')}</small></Reveal></section>
    </main>
    <LandingFooter onSignUp={() => startPlan('free')} onSignIn={onSignIn} />
  </div></MotionConfig>;
}
