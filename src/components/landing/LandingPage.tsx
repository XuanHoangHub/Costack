"use client";

import { useEffect, useRef, useState, Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { motion, MotionConfig, useReducedMotion, AnimatePresence } from 'motion/react';
import {
  ArrowDown, ArrowRight, ArrowUp, ArrowUpRight, BarChart3, CalendarDays, Check, CheckCheck,
  ChevronDown, Circle, FileText, Folder, Globe2, Grip, Kanban, Layers, ListTodo,
  Menu, MessageSquare, Plus, Sparkles, Target, Users, Wallet, Workflow, X,
  ShieldCheck, Zap, Star, Clock, CheckCircle2, ChevronRight, HelpCircle,
  Eye, RefreshCw, Send, DollarSign, Receipt, MousePointer2, Award,
  type LucideIcon
} from 'lucide-react';
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

interface LandingPageProps {
  onSignUp: () => void;
  onSignIn: () => void;
}

type PriceCatalog = Partial<Record<SelfServeBillingPlan, Partial<Record<BillingCycle, { unit_amount: number; currency: string }>>>>;
type DemoView = 'board' | 'docs' | 'chat' | 'finance' | 'ai' | 'whiteboard';

const sections = ['product', 'features', 'how-it-works', 'solutions', 'ai', 'testimonials', 'pricing', 'faq'];

const readingWaypoints = [
  { id: 'top', labelVi: 'Đầu trang', labelEn: 'Top', pct: 0 },
  { id: 'product', labelVi: 'Không gian mẫu', labelEn: 'Workspace Demo', pct: 14 },
  { id: 'features', labelVi: '10 Tính năng', labelEn: 'Core Modules', pct: 28 },
  { id: 'how-it-works', labelVi: 'Lộ trình 4 bước', labelEn: 'How It Works', pct: 42 },
  { id: 'solutions', labelVi: 'Giải pháp', labelEn: 'Solutions', pct: 56 },
  { id: 'ai', labelVi: 'Costack Brain AI', labelEn: 'Brain AI Copilot', pct: 68 },
  { id: 'testimonials', labelVi: 'Đánh giá', labelEn: 'Testimonials', pct: 78 },
  { id: 'pricing', labelVi: 'Bảng giá', labelEn: 'Pricing Plans', pct: 88 },
  { id: 'faq', labelVi: 'Câu hỏi thường gặp', labelEn: 'FAQ', pct: 96 },
];

const sectionLabels: Record<string, { vi: string; en: string }> = {
  top: { vi: 'Đầu trang', en: 'Top' },
  product: { vi: 'Không gian mẫu', en: 'Workspace Demo' },
  features: { vi: '10 Tính năng', en: 'Core Modules' },
  'how-it-works': { vi: 'Lộ trình 4 bước', en: 'How It Works' },
  solutions: { vi: 'Giải pháp', en: 'Solutions' },
  ai: { vi: 'Costack Brain AI', en: 'Brain AI Copilot' },
  testimonials: { vi: 'Đánh giá khách hàng', en: 'Testimonials' },
  pricing: { vi: 'Bảng giá & Gói cước', en: 'Pricing Plans' },
  faq: { vi: 'Câu hỏi thường gặp', en: 'FAQ' },
};

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={{ opacity: [0.65, 1], y: reduced ? 0 : [24, 0] }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   HERO INTERACTIVE PRODUCT CONSOLE (6 Multi-Hub Modes)
   ───────────────────────────────────────────────────────────── */
function ProductPreview({ vi }: { vi: boolean }) {
  const [view, setView] = useState<DemoView>('board');
  const [completed, setCompleted] = useState<string[]>([]);
  const choose = (vn: string, en: string) => vi ? vn : en;

  const tabs: { id: DemoView; icon: LucideIcon; label: string; badge?: string }[] = [
    { id: 'board', icon: Kanban, label: choose('Công việc', 'Tasks') },
    { id: 'docs', icon: FileText, label: choose('Tài liệu sống', 'Docs') },
    { id: 'chat', icon: MessageSquare, label: choose('Kênh trao đổi', 'Chat'), badge: '3' },
    { id: 'finance', icon: Wallet, label: choose('Tài chính & OCR', 'Finance') },
    { id: 'ai', icon: Sparkles, label: 'Costack AI', badge: 'AI' },
    { id: 'whiteboard', icon: Workflow, label: choose('Bảng vẽ', 'Whiteboard') },
  ];

  const tasks = [
    { id: 'brief', title: choose('Chốt brief chiến dịch ra mắt phiên bản mới', 'Finalize new product launch campaign brief'), tag: 'Planning', person: 'MA', color: 'blue', column: 0, date: '15 Th09' },
    { id: 'copy', title: choose('Soạn thảo nội dung và thông điệp landing page', 'Draft landing page copy and value props'), tag: 'Content', person: 'HL', color: 'purple', column: 0, date: '18 Th09' },
    { id: 'design', title: choose('Thiết kế bộ UI Kit và hình ảnh truyền thông', 'Design UI Kit and marketing visuals'), tag: 'Design', person: 'TN', color: 'orange', column: 1, date: '21 Th09' },
    { id: 'payos', title: choose('Kiểm thử cổng thanh toán PayOS VietQR tự động', 'QA automated PayOS VietQR payment flow'), tag: 'Backend', person: 'QB', color: 'emerald', column: 1, date: '22 Th09' },
    { id: 'feedback', title: choose('Tổng hợp ý kiến từ 150 người dùng thử nghiệm', 'Synthesize feedback from 150 beta testers'), tag: 'Research', person: 'HL', color: 'green', column: 2, date: '24 Th09' },
  ];

  return (
    <div className={s.previewWrap} id="product">
      <div className={s.previewCaption}>
        <span>
          <i />
          {choose('KHÔNG GIAN LÀM VIỆC TƯƠNG TÁC THỰC TẾ', 'INTERACTIVE WORKSPACE CONSOLE')}
        </span>
        <span className={s.previewCaptionHint}>
          {choose('✦ Bấm thử các tab hoặc đánh dấu hoàn thành công việc', '✦ Click tabs or mark tasks as completed')}
        </span>
      </div>

      <GsapCard3DTilt maxTilt={3} scale={1.008} glare={true} className="rounded-[22px] overflow-hidden">
        <div className={s.preview}>
          {/* Sidebar */}
          <aside className={s.previewSidebar}>
            <div className={s.windowDots}>
              <span className={s.dotRed} />
              <span className={s.dotYellow} />
              <span className={s.dotGreen} />
            </div>

            <div className={s.previewBrand}>
              <img src="/logo.png" alt="Costack Logo" className="w-4 h-4 object-contain inline-block mr-1.5 align-middle" />
              Costack <span>WORKSPACE</span>
            </div>

            <div className={s.workspaceName}>
              <span>C</span>
              Studio Innovate <ChevronDown size={13} />
            </div>

            <div className={s.sidebarLabel}>{choose('CÁC CÔNG CỤ CỐT LÕI', 'CORE MODULES')}</div>
            {tabs.map(({ id, icon: Icon, label, badge }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={view === id ? s.sideActive : ''}
                aria-pressed={view === id}
              >
                <Icon size={16} />
                <span>{label}</span>
                {badge && <span className={s.sideCount}>{badge}</span>}
              </button>
            ))}

            <div className={s.sidebarLabel}>{choose('KHÔNG GIAN DỰ ÁN', 'PROJECT SPACES')}</div>
            <div className={s.sideProject}>
              <span className={s.sideDot} style={{ background: '#38bdf8' }} />
              {choose('Chiến dịch ra mắt Q4', 'Q4 Launch Sprint')}
            </div>
            <div className={s.sideProject}>
              <span className={s.sideDot} style={{ background: '#a855f7' }} />
              {choose('Sản phẩm & Kỹ thuật', 'Product & Tech')}
            </div>
            <div className={s.sideProject}>
              <span className={s.sideDot} style={{ background: '#10b981' }} />
              {choose('Tài chính & Thu chi', 'Finance & Cash Flow')}
            </div>

            <div className={s.sideBottom}>
              <span className={s.avatar}>MA</span>
              <span>
                Minh Anh
                <small>{choose('Chủ sở hữu Workspace', 'Workspace Owner')}</small>
              </span>
            </div>
          </aside>

          {/* Main Display Window */}
          <div className={s.previewMain}>
            <div className={s.previewTopbar}>
              <div className={s.topbarBreadcrumb}>
                <Folder size={14} className="text-sky-500" />
                <span>Studio Innovate</span>
                <span>/</span>
                <strong className="text-slate-800 dark:text-slate-100">
                  {view === 'board' && choose('Bảng công việc Sprint', 'Sprint Task Board')}
                  {view === 'docs' && choose('Tài liệu dự án', 'Project Document')}
                  {view === 'chat' && choose('Kênh #chien-dich-ra-mat', 'Channel #launch-campaign')}
                  {view === 'finance' && choose('Sổ thu chi & Quét hóa đơn', 'Finance & Receipt Scanner')}
                  {view === 'ai' && choose('Trợ lý thông minh Brain AI', 'Brain AI Copilot')}
                  {view === 'whiteboard' && choose('Bảng vẽ ý tưởng Whiteboard', 'Visual Whiteboard')}
                </strong>
              </div>
              <div className={s.topbarActions}>
                <span className={s.liveStatusBadge}>
                  <span className={s.livePulse} />
                  Local-first Sync
                </span>
                <span className={s.teamAvatars}>
                  <i>MA</i>
                  <i>HL</i>
                  <i>TN</i>
                  <i>QB</i>
                </span>
              </div>
            </div>

            <div className={s.previewHeading}>
              <div>
                <span className={s.eyebrow}>
                  {choose('CÙNG NHAU, TỪ Ý TƯỞNG ĐẾN KẾT QUẢ', 'TOGETHER, FROM IDEA TO EXECUTION')}
                </span>
                <h3>
                  {choose('Sẵn sàng cho ngày ra mắt', 'All set for launch day')}
                  <span className="text-sky-500"> ✦</span>
                </h3>
                <p>{choose('Rõ người phụ trách. Không trôi thông tin. Mọi người đều chung một nhịp.', 'Clear owners. Zero lost context. Everyone marching in step.')}</p>
              </div>
              <span className={s.previewDate}>
                <CalendarDays size={14} />
                {choose('Tháng 9, 2026', 'September 2026')}
              </span>
            </div>

            {/* Sub-tabs inside console */}
            <div className={s.previewTabs} role="tablist" aria-label={choose('Xem thử tính năng', 'Interactive preview tabs')}>
              {tabs.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  id={`demo-tab-${id}`}
                  role="tab"
                  aria-selected={view === id}
                  aria-controls="demo-panel"
                  className={view === id ? s.activeDemoTab : ''}
                  onClick={() => setView(id)}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              ))}
              <span className={s.demoHint}>
                {choose('Chuyển đổi góc nhìn công việc', 'Switch workflow view')} <ArrowDown size={12} />
              </span>
            </div>

            {/* Dynamic Interactive Panel */}
            <div id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${view}`} className={s.demoPanel}>
              {/* TAB 1: KANBAN BOARD */}
              {view === 'board' && (
                <div className={s.board}>
                  {[choose('Cần làm', 'To do'), choose('Đang tiến hành', 'In progress'), choose('Đã hoàn thành', 'Done')].map((label, column) => {
                    const items = tasks.filter(task => (completed.includes(task.id) ? 2 : task.column) === column);
                    return (
                      <div className={s.boardColumn} key={label}>
                        <div className={s.columnHeading}>
                          <i data-column={column} />
                          <span>{label}</span>
                          <span className={s.columnCount}>{items.length}</span>
                        </div>
                        <div className={s.columnCards}>
                          {items.map(task => {
                            const isDone = completed.includes(task.id) || task.column === 2;
                            return (
                              <motion.div layout className={s.taskCard} key={task.id}>
                                <div className={s.taskCardHeader}>
                                  <span className={s.taskTag} data-tone={task.color}>{task.tag}</span>
                                  <span className={s.taskDate}>{task.date}</span>
                                </div>
                                <h4 className={isDone ? s.taskTitleDone : ''}>{task.title}</h4>
                                <div className={s.taskCardBottom}>
                                  <button
                                    type="button"
                                    aria-label={`Toggle: ${task.title}`}
                                    className={`${s.taskCheckButton} ${isDone ? s.taskCheckActive : ''}`}
                                    onClick={() => setCompleted(curr => curr.includes(task.id) ? curr.filter(id => id !== task.id) : [...curr, task.id])}
                                  >
                                    {isDone ? <CheckCheck size={14} /> : <Circle size={14} />}
                                    <span>{isDone ? choose('Đã xong', 'Done') : choose('Hoàn thành', 'Mark Done')}</span>
                                  </button>
                                  <span className={s.avatar} data-tone={task.color}>{task.person}</span>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: LIVE COLLABORATIVE DOCS */}
              {view === 'docs' && (
                <div className={s.docPreview}>
                  <div className={s.docMain}>
                    <div className={s.docBadge}>
                      <FileText size={13} />
                      {choose('TÀI LIỆU DỰ ÁN CHI TIẾT', 'LIVE PROJECT BRIEF')}
                    </div>
                    <h4>{choose('Chiến lược ra mắt sản phẩm Costack 2.0', 'Costack 2.0 Launch Strategy & Specs')}</h4>
                    <p className={s.docLead}>
                      {choose(
                        'Mục tiêu: Đạt 10.000 người dùng kích hoạt workspace trong 30 ngày đầu tiên. Tối ưu trải nghiệm chuyển đổi số cho các startup và freelancer tại Việt Nam.',
                        'Objective: 10,000 active workspace activations in the first 30 days. Modernize productivity for tech teams and freelancers.'
                      )}
                    </p>

                    <div className={s.collaboratorCursor}>
                      <span className={s.cursorPointer}><MousePointer2 size={12} /></span>
                      <span className={s.cursorTag}>Hoàng Linh {choose('đang gõ...', 'is typing...')}</span>
                    </div>

                    <div className={s.docCallout}>
                      <Sparkles size={16} className="text-sky-500 shrink-0 mt-0.5" />
                      <div>
                        <strong>{choose('Thông điệp cốt lõi (Core Message)', 'Core Value Proposition')}</strong>
                        <p>{choose('“Một không gian duy nhất cho công việc, tài liệu, tài chính và trợ lý AI thông minh.”', '“One unified workspace for tasks, knowledge, finances, and AI assistant.”')}</p>
                      </div>
                    </div>

                    <h5>{choose('Checklist công việc then chốt:', 'Key Execution Checkpoints:')}</h5>
                    <div className={s.docCheckList}>
                      {[
                        choose('Thống nhất cấu hình bảng giá và tích hợp cổng thanh toán VietQR PayOS 3s', 'Finalize pricing tiers & integrate instant 3s PayOS VietQR flow'),
                        choose('Hoàn thiện hệ thống bảo mật đa tầng Row Level Security (RLS) trên Supabase', 'Enforce multi-tenant Row Level Security (RLS) on Supabase'),
                        choose('Soạn thảo hướng dẫn chuyển đổi dữ liệu từ Trello, Notion và Excel', 'Publish data migration guides for Trello, Notion, and Excel'),
                      ].map((item, idx) => (
                        <div className={s.docCheckItem} key={idx}>
                          <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <aside className={s.docSidebar}>
                    <div className={s.docMetaCard}>
                      <div className={s.docMetaTitle}>
                        <Users size={14} />
                        {choose('Người tham gia soạn thảo', 'Active Collaborators')}
                      </div>
                      <div className={s.collabRow}>
                        <span className={s.avatar}>MA</span>
                        <div>
                          <strong>Minh Anh</strong>
                          <small>{choose('Chỉnh sửa 2 phút trước', 'Edited 2m ago')}</small>
                        </div>
                      </div>
                      <div className={s.collabRow}>
                        <span className={s.avatar} data-tone="purple">HL</span>
                        <div>
                          <strong>Hoàng Linh</strong>
                          <small>{choose('Đang xem tài liệu', 'Viewing live')}</small>
                        </div>
                      </div>
                    </div>
                    <div className={s.docTip}>
                      <Zap size={14} className="text-amber-500" />
                      <span>{choose('Hỗ trợ gõ lệnh / nhanh và chèn task trực tiếp vào bài viết.', 'Supports quick / slash commands and inline task embedding.')}</span>
                    </div>
                  </aside>
                </div>
              )}

              {/* TAB 3: TEAM CHAT */}
              {view === 'chat' && (
                <div className={s.chatPreview}>
                  <div className={s.chatHeaderBar}>
                    <div className={s.chatHeaderChannel}>
                      <strong># {choose('chien-dich-ra-mat', 'launch-campaign')}</strong>
                      <span>{choose('Kênh thảo luận công khai · 8 thành viên', 'Public channel · 8 members')}</span>
                    </div>
                    <div className={s.chatHeaderPins}>
                      <span className={s.pinTag}>📌 Brief v2.4</span>
                    </div>
                  </div>

                  <div className={s.chatMessagesList}>
                    {[
                      {
                        initials: 'MA',
                        name: 'Minh Anh',
                        time: '10:42',
                        tone: 'blue',
                        text: choose(
                          'Mình đã cập nhật brief chiến dịch tháng 9 trong Docs. Hoàng Linh và Thảo Nguyên kiểm tra phần deadline thiết kế nhé!',
                          'I updated the campaign brief in Docs. Hoang Linh and Thao Nguyen please check the design deadlines!'
                        ),
                        reactions: ['👍 4', '🚀 3']
                      },
                      {
                        initials: 'HL',
                        name: 'Hoàng Linh',
                        time: '10:44',
                        tone: 'purple',
                        text: choose(
                          'Đã nhận! Mình đang phối hợp cùng Brain AI viết nháp 3 phiên bản thông điệp truyền thông. Chiều nay sẽ gửi bản hoàn chỉnh.',
                          'Got it! Brain AI and I are drafting 3 ad copy variations. Will share the complete draft this afternoon.'
                        ),
                        reactions: ['🔥 5']
                      },
                      {
                        initials: 'QB',
                        name: 'Quốc Bảo',
                        time: '10:48',
                        tone: 'emerald',
                        text: choose(
                          'Webhook thanh toán PayOS VietQR đã kiểm thử thành công trên môi trường Sandbox. Quét mã tiền về tài khoản nâng cấp gói sau đúng 2.8 giây!',
                          'PayOS VietQR webhook tested successfully on Sandbox! Transfer verified and plan activated in 2.8 seconds flat!'
                        ),
                        reactions: ['⚡ 6', '🎉 4']
                      }
                    ].map((msg, i) => (
                      <div className={s.chatMessageRow} key={i}>
                        <span className={s.avatar} data-tone={msg.tone}>{msg.initials}</span>
                        <div className={s.chatMessageBubble}>
                          <div className={s.chatMessageAuthor}>
                            <strong>{msg.name}</strong>
                            <span>{msg.time}</span>
                          </div>
                          <p>{msg.text}</p>
                          <div className={s.chatReactions}>
                            {msg.reactions.map((r, ri) => (
                              <span key={ri} className={s.reactionBadge}>{r}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={s.chatInputMock}>
                    <input
                      type="text"
                      readOnly
                      placeholder={choose('Gửi tin nhắn vào #chien-dich-ra-mat... (Hỗ trợ @mention, /ai, tệp đính kèm)', 'Message #launch-campaign... (@mention, /ai, files supported)')}
                    />
                    <button type="button" className={s.chatSendBtn}><Send size={14} /></button>
                  </div>
                </div>
              )}

              {/* TAB 4: FINANCE & AI OCR RECEIPT */}
              {view === 'finance' && (
                <div className={s.financePreview}>
                  <div className={s.financeWalletsGrid}>
                    <div className={s.walletCard}>
                      <div className={s.walletCardHeader}>
                        <span>{choose('Ví Công Ty (Techcombank)', 'Company Wallet')}</span>
                        <Wallet size={15} className="text-sky-500" />
                      </div>
                      <h3>128.500.000 ₫</h3>
                      <div className={s.walletTrend}>+18.4% {choose('so với tháng trước', 'vs last month')}</div>
                    </div>
                    <div className={s.walletCard}>
                      <div className={s.walletCardHeader}>
                        <span>{choose('Ngân sách Marketing Q4', 'Q4 Marketing Budget')}</span>
                        <DollarSign size={15} className="text-emerald-500" />
                      </div>
                      <h3>45.000.000 ₫</h3>
                      <div className={s.walletProgress}>
                        <div className={s.walletProgressBar} style={{ width: '62%' }} />
                      </div>
                      <small>{choose('Đã chi: 27.900.000 ₫ (62%)', 'Spent: 27.9M ₫ (62%)')}</small>
                    </div>
                  </div>

                  <div className={s.financeOcrSection}>
                    <div className={s.financeOcrCard}>
                      <div className={s.ocrCardHeader}>
                        <Receipt size={16} className="text-purple-500" />
                        <strong>{choose('Kết quả quét hóa đơn tự động (AI OCR)', 'Live AI OCR Receipt Extractor')}</strong>
                        <span className={s.ocrSuccessTag}>{choose('Trích xuất thành công', 'Extracted')}</span>
                      </div>
                      <div className={s.ocrFieldsGrid}>
                        <div className={s.ocrField}>
                          <span>{choose('Đơn vị phát hành', 'Vendor')}</span>
                          <strong>Nhà hàng Sen Tây Hồ</strong>
                        </div>
                        <div className={s.ocrField}>
                          <span>{choose('Ngày & Giờ', 'Date & Time')}</span>
                          <strong>09/09/2026 · 12:45</strong>
                        </div>
                        <div className={s.ocrField}>
                          <span>{choose('Số tiền (có VAT)', 'Total Amount')}</span>
                          <strong className="text-emerald-500">1.250.000 ₫</strong>
                        </div>
                        <div className={s.ocrField}>
                          <span>{choose('Phân loại ví', 'Category')}</span>
                          <strong>Tiếp khách → Ví Công ty</strong>
                        </div>
                      </div>
                      <div className={s.ocrFooter}>
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        <span>{choose('Tự động ghi nhận vào sổ chi tiêu và cập nhật số dư tức thì.', 'Automatically logged into expense ledger with live balance update.')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: BRAIN AI COPILOT */}
              {view === 'ai' && (
                <div className={s.aiConsolePreview}>
                  <div className={s.aiConsoleHeader}>
                    <Sparkles size={16} className="text-sky-500" />
                    <strong>Costack Brain AI Copilot</strong>
                    <span className={s.aiModelBadge}>Powered by Gemini 2.5</span>
                  </div>

                  <div className={s.aiPromptBubble}>
                    <span>User</span>
                    <p>{choose('Hãy phân tích rủi ro và lập checklist kiểm thử trước ngày ra mắt tính năng thanh toán PayOS.', 'Analyze risks and generate a pre-launch test checklist for PayOS billing.')}</p>
                  </div>

                  <div className={s.aiResultBubble}>
                    <div className={s.aiResultHeader}>
                      <Sparkles size={14} className="text-sky-500" />
                      <span>Brain AI Assistant</span>
                      <small>0.4s</small>
                    </div>
                    <p>{choose('Dưới đây là 4 hạng mục kiểm thử then chốt cần thực hiện:', 'Here is your targeted pre-launch checklist:')}</p>
                    <div className={s.aiGeneratedTasks}>
                      {[
                        { title: choose('Kiểm tra Webhook bảo mật chữ ký HMAC SHA256', 'Validate Webhook HMAC SHA256 signature security'), priority: 'Cao', est: '2h' },
                        { title: choose('Mô phỏng trường hợp mạng ngắt quãng khi quét VietQR', 'Simulate network interruptions during VietQR checkout'), priority: 'Cao', est: '1.5h' },
                        { title: choose('Xác nhận hoàn tiền tự động khi mã đơn hết hạn', 'Confirm auto-refund behavior when payment code expires'), priority: 'Trung bình', est: '3h' },
                        { title: choose('Kích hoạt phân quyền Pro ngay lập tức không cần F5', 'Trigger instant Pro entitlement unlock without page reload'), priority: 'Cao', est: '1h' },
                      ].map((item, idx) => (
                        <div className={s.aiTaskRow} key={idx}>
                          <span className={s.aiTaskIndex}>{idx + 1}</span>
                          <span className={s.aiTaskTitle}>{item.title}</span>
                          <span className={s.aiTaskPriority}>{item.priority}</span>
                          <span className={s.aiTaskEst}>{item.est}</span>
                        </div>
                      ))}
                    </div>
                    <div className={s.aiResultActions}>
                      <button type="button" className={s.aiInsertBtn}>
                        <Plus size={13} />
                        {choose('Chuyển thành công việc trên Board', 'Convert to Tasks on Board')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: WHITEBOARD & MINDMAP */}
              {view === 'whiteboard' && (
                <div className={s.whiteboardPreview}>
                  <div className={s.wbCanvas}>
                    <div className={s.wbGridOverlay} />

                    <div className={s.wbSticky} style={{ top: '24px', left: '32px', background: '#fef08a', color: '#854d0e' }}>
                      <strong>🎯 Mục tiêu Q4</strong>
                      <p>10.000 Active Users</p>
                    </div>

                    <div className={s.wbSticky} style={{ top: '24px', left: '210px', background: '#bae6fd', color: '#0369a1' }}>
                      <strong>💡 Ý tưởng truyền thông</strong>
                      <p>Video demo 45s PayOS VietQR</p>
                    </div>

                    <div className={s.wbNode} style={{ top: '130px', left: '110px' }}>
                      <span>1. Nghiên cứu thị trường</span>
                    </div>

                    <div className={s.wbArrow} style={{ top: '150px', left: '255px' }}>→</div>

                    <div className={s.wbNode} style={{ top: '130px', left: '290px', borderColor: '#38bdf8' }}>
                      <span>2. Triển khai MVP</span>
                    </div>

                    <div className={s.wbArrow} style={{ top: '150px', left: '415px' }}>→</div>

                    <div className={s.wbNode} style={{ top: '130px', left: '450px', borderColor: '#10b981' }}>
                      <span>3. Ra mắt cộng đồng</span>
                    </div>

                    <div className={s.wbSticky} style={{ top: '110px', right: '32px', background: '#fbcfe8', color: '#9d174d' }}>
                      <strong>⚡ Tính năng VIP</strong>
                      <p>Finance + Quét bill AI</p>
                    </div>
                  </div>
                  <div className={s.wbToolbar}>
                    <span>{choose('Bảng vẽ vô cực · Vẽ sơ đồ tư duy, flowchart và ghi chú brainstorm cùng đồng đội.', 'Infinite canvas · Map workflows, flowcharts and brainstorm with sticky notes.')}</span>
                  </div>
                </div>
              )}
            </div>

            <div className={s.previewBottom}>
              <span>
                <span className={s.statusDot} />
                {choose('Một nền tảng duy nhất để cả đội ngũ cùng bứt phá', 'One unified platform for team velocity')}
              </span>
              <span className="font-mono text-xs opacity-75">Costack v2.0 · {choose('Thuộc bản quyền của Avaxa', 'Copyrighted by Avaxa')} · Local-first & Cloud Sync</span>
            </div>
          </div>
        </div>
      </GsapCard3DTilt>

      <div className={s.previewFootnote}>
        <span><Check size={14} className="text-emerald-500" />{choose('Mọi công việc có người chịu trách nhiệm', 'Every task has a clear owner')}</span>
        <span><Check size={14} className="text-sky-500" />{choose('Tài liệu và thảo luận luôn đồng bộ ngữ cảnh', 'Docs and chats stay unified')}</span>
        <span><Check size={14} className="text-purple-500" />{choose('Trợ lý AI hỗ trợ tự động hóa mỗi ngày', 'AI copilot speeds up execution')}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN LANDING PAGE COMPONENT
   ───────────────────────────────────────────────────────────── */
export default function LandingPage({ onSignUp, onSignIn }: LandingPageProps) {
  const { isVietnamese: vi } = useTranslation();
  const choose = (vn: string, en: string) => vi ? vn : en;
  const [menu, setMenu] = useState<'product' | 'resources' | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [solution, setSolution] = useState(0);
  const [cycle, setCycle] = useState<BillingCycle>('yearly');
  const [prices, setPrices] = useState<PriceCatalog>({});
  const [priceStatus, setPriceStatus] = useState<'loading' | 'live' | 'fallback'>('loading');
  const [faq, setFaq] = useState<number | null>(0);
  const [aiTab, setAiTab] = useState<'tasks' | 'doc' | 'summary' | 'receipt'>('tasks');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [waypointPcts, setWaypointPcts] = useState<Record<string, number>>({
    top: 0,
    product: 14,
    features: 28,
    'how-it-works': 42,
    solutions: 56,
    ai: 68,
    testimonials: 78,
    pricing: 88,
    faq: 96,
  });
  const [hoverProgress, setHoverProgress] = useState<{ x: number; pct: number; label: string } | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  // Fetch billing prices
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/billing/plans', { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Prices unavailable');
        const data = await response.json();
        const valid = (['starter', 'pro', 'business'] as const).every(plan =>
          (['monthly', 'yearly'] as const).every(billingCycle => {
            const price = data.prices?.[plan]?.[billingCycle];
            return price?.currency === 'vnd' && Number.isFinite(price.unit_amount) && price.unit_amount > 0;
          })
        );
        if (!valid) throw new Error('Invalid price catalog');
        setPrices(data.prices);
        setPriceStatus('live');
      })
      .catch(() => {
        if (!controller.signal.aborted) setPriceStatus('fallback');
      });
    return () => controller.abort();
  }, []);

  // Dropdown dismiss logic
  useEffect(() => {
    if (!menu && !mobileOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setMenu(null);
        setMobileOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (mobileOpen) mobileButtonRef.current?.focus();
      else headerRef.current?.querySelector<HTMLButtonElement>(`[data-dropdown="${menu}"]`)?.focus();
      setMenu(null);
      setMobileOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [menu, mobileOpen]);

  // Smooth Reading Progress Engine (RAF LERP & Active Motion)
  useEffect(() => {
    const root = rootRef.current;
    const scrollContainer = root?.closest('.apexa-auth-shell') as HTMLElement | null;

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { root: scrollContainer, rootMargin: '-100px 0px -55% 0px', threshold: 0 }
    );
    sections.forEach(id => {
      const element = root?.querySelector(`#${id}`);
      if (element) observer.observe(element);
    });

    const getScrollMetrics = () => {
      if (scrollContainer) {
        const top = scrollContainer.scrollTop;
        const total = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        return { top, total };
      }
      const top = window.scrollY || document.documentElement.scrollTop || 0;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      return { top, total };
    };

    let targetProgress = 0;
    let currentProgress = 0;
    let rafId: number | null = null;
    let scrollStopTimer: ReturnType<typeof setTimeout> | null = null;

    const lerpProgress = () => {
      const diff = targetProgress - currentProgress;
      if (Math.abs(diff) > 0.0005) {
        currentProgress += diff * 0.18;
      } else {
        currentProgress = targetProgress;
      }

      if (root) {
        root.style.setProperty('--scroll-progress', `${currentProgress}`);
        root.style.setProperty('--scroll-percent', `${(currentProgress * 100).toFixed(2)}%`);
        root.style.setProperty('--head-opacity', currentProgress > 0.008 ? '1' : '0');
        const rounded = Math.round(currentProgress * 100);
        setScrollPercent(rounded);
      }

      if (Math.abs(diff) > 0.0005) {
        rafId = requestAnimationFrame(lerpProgress);
      } else {
        rafId = null;
      }
    };

    const onScroll = () => {
      const { top, total } = getScrollMetrics();
      targetProgress = total > 0 ? Math.min(Math.max(top / total, 0), 1) : 0;

      setIsScrolling(true);
      setShowBackToTop(top > 400);

      if (scrollStopTimer) clearTimeout(scrollStopTimer);
      scrollStopTimer = setTimeout(() => {
        setIsScrolling(false);
      }, 650);

      if (top < 200) setActiveSection('');

      if (!rafId) {
        rafId = requestAnimationFrame(lerpProgress);
      }
    };

    const targetElement = scrollContainer || window;
    targetElement.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      observer.disconnect();
      targetElement.removeEventListener('scroll', onScroll);
      if (scrollStopTimer) clearTimeout(scrollStopTimer);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Measure dynamic waypoint percentage positions relative to total scrollable height
  useEffect(() => {
    const updateWaypoints = () => {
      const root = rootRef.current;
      const scrollContainer = root?.closest('.apexa-auth-shell') as HTMLElement | null;
      const total = scrollContainer
        ? scrollContainer.scrollHeight - scrollContainer.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight;

      if (total <= 0) return;

      const newPcts: Record<string, number> = { top: 0 };
      readingWaypoints.forEach(wp => {
        if (wp.id === 'top') return;
        const el = document.getElementById(wp.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          const currentScroll = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
          const elTop = rect.top + currentScroll;
          const pct = Math.min(Math.max(Math.round((elTop / total) * 100), 2), 98);
          newPcts[wp.id] = pct;
        } else {
          newPcts[wp.id] = wp.pct;
        }
      });
      setWaypointPcts(newPcts);
    };

    updateWaypoints();
    window.addEventListener('resize', updateWaypoints);
    return () => window.removeEventListener('resize', updateWaypoints);
  }, []);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const scrollContainer = rootRef.current?.closest('.apexa-auth-shell') as HTMLElement | null;
    const total = scrollContainer
      ? scrollContainer.scrollHeight - scrollContainer.clientHeight
      : document.documentElement.scrollHeight - window.innerHeight;
    const targetY = ratio * total;
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: targetY, behavior: reduced ? 'instant' : 'smooth' });
    } else {
      window.scrollTo({ top: targetY, behavior: reduced ? 'instant' : 'smooth' });
    }
  };

  const handleTrackMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const pct = Math.round(ratio * 100);

    let closest = readingWaypoints[0];
    let minDiff = 100;
    for (const wp of readingWaypoints) {
      const wpPct = waypointPcts[wp.id] ?? wp.pct;
      const diff = Math.abs(wpPct - pct);
      if (diff < minDiff) {
        minDiff = diff;
        closest = wp;
      }
    }
    const label = vi ? closest.labelVi : closest.labelEn;
    setHoverProgress({ x, pct, label });
  };

  const handleTrackMouseLeave = () => {
    setHoverProgress(null);
  };

  const scrollToTop = () => {
    const scrollContainer = rootRef.current?.closest('.apexa-auth-shell') as HTMLElement | null;
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
    }
  };

  const closeMenu = () => {
    setMenu(null);
    setMobileOpen(false);
  };

  const navigate = (event: React.MouseEvent<any>, id: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (id === 'top') {
      event.preventDefault();
      closeMenu();
      scrollToTop();
      window.history.replaceState(null, '', '#top');
      return;
    }
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    closeMenu();
    target.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    window.history.replaceState(null, '', `#${id}`);
  };

  const signup = () => {
    closeMenu();
    onSignUp();
  };

  const startPlan = (plan: 'free' | SelfServeBillingPlan) => {
    try {
      if (plan === 'free') {
        localStorage.removeItem('apexa_pending_upgrade_plan');
        localStorage.removeItem('apexa_pending_upgrade_cycle');
      } else {
        localStorage.setItem('apexa_pending_upgrade_plan', plan);
        localStorage.setItem('apexa_pending_upgrade_cycle', cycle);
      }
    } catch {}
    signup();
  };

  const handleSimulateAi = () => {
    setIsAiGenerating(true);
    setTimeout(() => {
      setIsAiGenerating(false);
    }, 600);
  };

  // Bento Features Array
  const bentoFeatures = [
    {
      icon: Kanban,
      badge: choose('CỐT LÕI', 'CORE ENGINE'),
      title: choose('Quản lý công việc đa góc nhìn linh hoạt', 'Multi-view Task & Project Management'),
      text: choose(
        'Dễ dàng chuyển đổi giữa Kanban, Danh sách, Lịch và Gantt Timeline. Giao việc cho cộng sự, đặt thời hạn, gắn thẻ ưu tiên và theo dõi cột mốc quan trọng.',
        'Seamlessly switch between Kanban, List, Calendar, and Gantt timelines. Assign owners, set due dates, milestones, and custom tags.'
      ),
      detail: choose('Kanban · Danh sách · Gantt · Lịch · Phụ thuộc việc', 'Kanban · List · Gantt · Calendar · Dependencies'),
      tone: 'blue',
      span: 'bentoSpanLarge'
    },
    {
      icon: Sparkles,
      badge: 'GEMINI 2.5',
      title: choose('Costack Brain AI — Trợ lý ảo siêu tốc', 'Costack Brain AI — Your Intelligent Copilot'),
      text: choose(
        'Tự động phân rã kế hoạch thành checklist chi tiết, soạn thảo tài liệu, tóm tắt tin nhắn kênh chat và quét hóa đơn AI trong nháy mắt.',
        'Decompose projects into actionable subtasks, draft briefs, summarize long chat threads, and extract receipt data instantly.'
      ),
      detail: choose('Phân rã việc · Tóm tắt · Soạn thảo · Quét bill OCR', 'Task Breakdown · Summarize · Drafting · OCR'),
      tone: 'purple',
      span: 'bentoSpanLarge'
    },
    {
      icon: FileText,
      badge: choose('CỘNG TÁC', 'REALTIME'),
      title: choose('Tài liệu sống Docs & Kho tri thức', 'Live Collaborative Docs & Knowledge Hub'),
      text: choose(
        'Soạn thảo văn bản chuẩn Markdown với hỗ trợ đồng biên tập thời gian thực. Gắn kết brief dự án và cẩm nang quy trình ngay trong workspace.',
        'Markdown-powered docs with real-time co-authoring. Keep project briefs and standard operating procedures close to daily work.'
      ),
      detail: choose('Docs · Markdown · Cursors sống · Gõ / nhanh', 'Docs · Markdown · Live Cursors · Slash commands'),
      tone: 'sky',
      span: 'bentoSpanNormal'
    },
    {
      icon: Wallet,
      badge: choose('MỚI', 'NEW HUB'),
      title: choose('Tài chính thông minh & Quét hóa đơn OCR', 'Smart Finance Hub & AI Receipt Scanner'),
      text: choose(
        'Quản lý sổ thu chi, nhiều ví tiền và ngân sách dự án. Tự động chụp và trích xuất hóa đơn VAT chỉ trong 3 giây mà không cần nhập tay.',
        'Track multiple wallets, cash flow, and budgets. Use camera AI OCR to extract VAT receipt items in 3 seconds.'
      ),
      detail: choose('Quản lý ví · Sổ thu chi · AI Quét bill · Báo cáo', 'Wallets · Cash flow · AI OCR · Financial reports'),
      tone: 'emerald',
      span: 'bentoSpanNormal'
    },
    {
      icon: MessageSquare,
      badge: choose('KẾT NỐI', 'TEAM CHAT'),
      title: choose('Kênh thảo luận nhóm & Trao đổi tức thì', 'Realtime Channels & Direct Messages'),
      text: choose(
        'Trò chuyện theo chủ đề dự án, nhắc tên thành viên (@mentions) và phản hồi emoji. Mọi trao đổi đều nằm đúng ngữ cảnh của công việc.',
        'Discuss inside dedicated project channels with @mentions and emojis. Never lose discussions or task contexts again.'
      ),
      detail: choose('Kênh dự án · Chat riêng · Đính kèm file · Trực tuyến', 'Project Channels · DMs · Attachments · Presence'),
      tone: 'amber',
      span: 'bentoSpanNormal'
    },
    {
      icon: Layers,
      badge: 'DATABASE',
      title: choose('Bảng dữ liệu Base & Trường tùy biến', 'Custom Databases & Flexible Fields'),
      text: choose(
        'Xây dựng CRM quản lý khách hàng, kho hàng hay ứng viên tuyển dụng với các trường dữ liệu tùy biến, bộ lọc đa tầng và phân nhóm linh hoạt.',
        'Build custom CRMs, candidate pipelines, and inventory trackers with tailored custom fields, filters, and grouping.'
      ),
      detail: choose('Base · Custom Fields · Bộ lọc đa tầng · Sắp xếp', 'Base · Custom Fields · Multi-filters · Grouping'),
      tone: 'indigo',
      span: 'bentoSpanNormal'
    },
    {
      icon: Workflow,
      badge: 'CANVAS',
      title: choose('Bảng vẽ ý tưởng Whiteboard & Sơ đồ tư duy', 'Visual Whiteboard & Interactive Mindmaps'),
      text: choose(
        'Không gian vẽ vô cực để phác thảo wireframe, sơ đồ quy trình flowchart, dán sticky notes và cùng đồng đội động não brainstorm.',
        'Infinite canvas for wireframing, flowchart mapping, sticky notes, and freeform brainstorming with your entire team.'
      ),
      detail: choose('Whiteboard · Flowchart · Sticky notes · Brainstorm', 'Whiteboard · Flowcharts · Sticky notes · Brainstorm'),
      tone: 'rose',
      span: 'bentoSpanNormal'
    },
    {
      icon: Target,
      badge: 'OKRs',
      title: choose('Mục tiêu chiến lược & Đo lường tiến độ', 'Strategic Goals & OKRs Tracking'),
      text: choose(
        'Gắn kết các đầu việc nhỏ hàng ngày với mục tiêu chiến lược của công ty. Tự động tính toán tỷ lệ hoàn thành Key Results theo thời gian thực.',
        'Connect everyday tasks to high-level company OKRs. Automatically track Key Results progress without manual spreadsheets.'
      ),
      detail: choose('OKRs · Mục tiêu chiến lược · Chỉ số then chốt', 'OKRs · Company Goals · Key Results · Progress'),
      tone: 'cyan',
      span: 'bentoSpanNormal'
    }
  ];

  // Solutions Data
  const solutions = [
    {
      label: choose('Cá nhân & Freelancer', 'Individuals & Freelancers'),
      icon: Target,
      title: choose('Bớt nhớ trong đầu. Dành chỗ cho ý tưởng sáng tạo.', 'Less to juggle. More mental clarity to create.'),
      text: choose(
        'Gom việc cá nhân, dự án khách hàng và sổ thu chi về một nơi duy nhất. Mỗi sáng thức dậy, bạn biết chính xác việc nào cần làm trước mà không bao giờ bị quá tải.',
        'Bring personal tasks, client projects, and income ledgers into one place. Start each day knowing exactly what to do first.'
      ),
      points: [
        choose('Tách không gian làm việc độc lập cho từng khách hàng & dự án', 'Separate spaces for each client project and personal goal'),
        choose('Gói Free miễn phí trọn đời cho 1 người, đầy đủ tính năng cốt lõi', 'Free forever for 1 person with all essential workspace tools'),
        choose('Quản lý ví tiền freelance và quét hóa đơn chi tiêu bằng AI', 'Manage freelance cash flow and extract receipts with AI')
      ],
      project: choose('Dự án Freelance & Cá nhân', 'Freelance & Personal Projects'),
      items: [
        choose('Thiết kế giao diện Brand Identity cho Client A', 'Brand Identity UI design for Client A'),
        choose('Kế hoạch nội dung mạng xã hội & Blog cá nhân', 'Social media calendar & Tech blog posts'),
        choose('Sổ thu chi & Báo cáo thuế cá nhân năm 2026', 'Income ledger & Tax deductions 2026')
      ]
    },
    {
      label: choose('Đội ngũ Dự án & Startup', 'Project Teams & Startups'),
      icon: Users,
      title: choose('Ai làm gì, đến đâu — Cả nhóm luôn cùng một nhịp.', 'Who owns it, where it stands — All aligned.'),
      text: choose(
        'Từ brief ý tưởng đến ngày release sản phẩm, kết nối toàn bộ task, tài liệu kỹ thuật và kênh trao đổi trong cùng một workspace. Giảm 80% thời gian họp hành không cần thiết.',
        'From idea to release, connect tasks, tech docs, and team chats in one hub. Cut 80% of unnecessary status meetings.'
      ),
      points: [
        choose('Bảng Kanban, Gantt timeline và phân quyền phụ thuộc việc (Dependencies)', 'Kanban boards, Gantt timelines, and task dependencies'),
        choose('Gói Starter hỗ trợ tới 10 thành viên cùng làm việc với chi phí tối ưu', 'Starter plan supports up to 10 collaborating teammates'),
        choose('Brain AI tự động phân rã sprint và tóm tắt cuộc họp nhanh chóng', 'Brain AI decomposes sprint tasks and drafts meeting summaries')
      ],
      project: choose('Sprint Ra mắt Sản phẩm', 'Product Launch Sprint'),
      items: [
        choose('Thiết kế Design System & Bộ linh kiện UI', 'Design system tokens & reusable UI components'),
        choose('Tích hợp API thanh toán VietQR PayOS tự động 3s', 'Integrate automated 3s PayOS VietQR payment API'),
        choose('Kế hoạch Marketing & Truyền thông cộng đồng', 'Marketing roadmap & Community outreach plan')
      ]
    },
    {
      label: choose('Kinh doanh & Vận hành', 'Sales & Operations'),
      icon: BarChart3,
      title: choose('Vận hành minh bạch với dữ liệu tập trung.', 'Transparent operations with unified data.'),
      text: choose(
        'Sử dụng Costack Base để quản lý danh sách khách hàng (CRM), hợp đồng và đối tác. Theo dõi sát sao dòng tiền thu chi, hóa đơn và ngân sách vận hành của doanh nghiệp.',
        'Use Costack Base to manage clients (CRM), contracts, and vendors. Track cash flow, invoices, and operational budgets live.'
      ),
      points: [
        choose('Xây dựng quy trình bán hàng và phễu cơ hội khách hàng CRM', 'Build custom sales pipelines and client stage tracking'),
        choose('Quét hóa đơn ăn uống, công tác phí bằng AI OCR không cần nhập tay', 'Scan lunch & travel receipts with AI OCR in seconds'),
        choose('Đầy đủ tính năng Base, Finance và Whiteboard từ gói Pro', 'Full Base, Finance, and Whiteboard access from Pro plan')
      ],
      project: choose('Không gian Quản trị & Vận hành', 'Operations & Sales Hub'),
      items: [
        choose('Danh sách khách hàng tiềm năng & Hợp đồng quý 4', 'Lead pipeline & Q4 enterprise contracts'),
        choose('Báo cáo dòng tiền thu chi và quỹ lương tháng này', 'Monthly cash flow report & payroll budget'),
        choose('Sơ đồ quy trình chăm sóc khách hàng sau bán hàng', 'Standard operating procedure for customer success')
      ]
    },
    {
      label: choose('Doanh nghiệp & Đội ngũ lớn', 'Enterprises & Scale-ups'),
      icon: Layers,
      title: choose('Kiểm soát tập trung, bảo mật đa tầng và mở rộng không giới hạn.', 'Centralized governance, enterprise security, and infinite scale.'),
      text: choose(
        'Quản lý nhiều không gian làm việc độc lập, phân quyền chi tiết theo vai trò (RBAC), cô lập dữ liệu tuyệt đối với Row Level Security và nhận hỗ trợ kỹ thuật chuyên biệt.',
        'Manage multiple workspaces, enforce granular role-based access controls, protect data with Row Level Security, and get dedicated support.'
      ),
      points: [
        choose('Quản trị tập trung đa không gian làm việc và phòng ban', 'Centralized administration across departments and branches'),
        choose('Bảo mật dữ liệu nhiều lớp, mã hóa SSL và sao lưu tự động hàng ngày', 'Multi-layer security, SSL encryption, and automated daily backups'),
        choose('Hỗ trợ triển khai riêng, đào tạo nội bộ và cam kết SLA dịch vụ', 'Dedicated onboarding specialist and guaranteed SLA')
      ],
      project: choose('Doanh nghiệp Quy mô Lớn', 'Enterprise Workspace'),
      items: [
        choose('Chính sách bảo mật dữ liệu & Phân quyền tổ chức (RBAC)', 'Organization security policies & RBAC access'),
        choose('Báo cáo mục tiêu chiến lược OKRs toàn công ty', 'Company-wide strategic OKRs performance reports'),
        choose('Tự động hóa luồng phê duyệt và tích hợp nội bộ', 'Custom approval workflows & internal API integrations')
      ]
    }
  ];

  // AI Scenarios
  const aiScenarios: Record<'tasks' | 'doc' | 'summary' | 'receipt', {
    prompt: string;
    lead: string;
    items: string[];
    note: string;
  }> = {
    tasks: {
      prompt: choose(
        'Giúp tôi chia nhỏ kế hoạch ra mắt tính năng thanh toán PayOS VietQR thành các việc cụ thể cho team kỹ thuật.',
        'Help me break down the launch plan for PayOS VietQR payment into actionable engineering tasks.'
      ),
      lead: choose('Dưới đây là các đầu việc chi tiết được Brain AI phân rã:', 'Here are the detailed subtasks generated by Brain AI:'),
      items: [
        choose('Cấu hình API credentials & Webhook secret trên cổng PayOS', 'Configure API credentials & Webhook secret in PayOS portal'),
        choose('Xây dựng giao diện hiển thị mã VietQR động kèm đồng hồ đếm ngược 10 phút', 'Build dynamic VietQR payment modal with 10-minute countdown timer'),
        choose('Tự động xác nhận giao dịch qua Webhook và mở khóa tính năng trong 3 giây', 'Auto-confirm transaction via Webhook and unlock Pro plan within 3 seconds'),
        choose('Thực hiện kiểm thử tải sandbox và xử lý tình huống mất kết nối mạng', 'Run sandbox load tests and handle edge-case network dropouts')
      ],
      note: choose('Brain AI tự động ước tính thời gian và gợi ý mức ưu tiên cho từng việc.', 'Brain AI automatically estimates hours and suggests priority tags.')
    },
    doc: {
      prompt: choose('Soạn thảo bản Brief chiến dịch Marketing quý 4 cho Costack.', 'Draft a Q4 Marketing Campaign Brief for Costack.'),
      lead: choose('Bản dự thảo tài liệu dự án đã sẵn sàng để đồng đội vào xem:', 'Draft project document is ready for live team collaboration:'),
      items: [
        choose('Mục tiêu: Đạt 10.000 người dùng đăng ký mới và 500 khách hàng Pro trong quý 4', 'Objective: 10,000 new signups and 500 Pro upgrades in Q4'),
        choose('Thông điệp cốt lõi: “Một nơi cho công việc, tài liệu, tài chính và trợ lý AI”', 'Core message: “One place for tasks, docs, finance, and AI assistant”'),
        choose('Kênh tiếp cận chủ lực: Content SEO, TikTok/Facebook Ads, Hội thảo công nghệ', 'Core channels: SEO content, TikTok/Facebook Ads, Tech webinars'),
        choose('Phân công: Minh Anh (Brief & Duyệt), Hoàng Linh (Copy), Thảo Nguyên (Visuals)', 'Assignments: Minh Anh (Owner), Hoang Linh (Copy), Thao Nguyen (Visuals)')
      ],
      note: choose('Tài liệu được chèn trực tiếp vào Docs để cả nhóm cùng biên tập thời gian thực.', 'Inserted directly into Docs for team real-time co-authoring.')
    },
    summary: {
      prompt: choose('Tóm tắt 85 tin nhắn thảo luận trong kênh #chien-dich-ra-mat.', 'Summarize 85 messages from the #launch-campaign channel.'),
      lead: choose('Điểm tin nhanh và các hành động tiếp theo của đội ngũ:', 'Executive highlights and immediate team action items:'),
      items: [
        choose('Đã chốt bản thiết kế giao diện Landing Page phiên bản mới với tỷ lệ duyệt 100%', 'Finalized new Landing Page visual layout with 100% team approval'),
        choose('Backend đã hoàn tất tích hợp cổng thanh toán VietQR và kiểm thử bảo mật', 'Backend finished VietQR payment integration and security tests'),
        choose('Hạn chót kiểm thử nội bộ toàn diện: 17:00 chiều thứ Sáu tuần này', 'Internal QA deadline set for 5:00 PM this Friday'),
        choose('Phụ trách chính: Quốc Bảo kiểm thử hệ thống, Hoàng Linh viết thông cáo báo chí', 'Lead owners: Quoc Bao leads QA, Hoang Linh prepares press release')
      ],
      note: choose('Tiết kiệm 30 phút đọc lại các chuỗi tin nhắn dài mỗi ngày.', 'Saves 30 minutes of reading long chat threads every morning.')
    },
    receipt: {
      prompt: choose('Quét hóa đơn tiếp khách và ghi nhận vào sổ chi tiêu công ty.', 'Scan client hospitality receipt and log into company expenses.'),
      lead: choose('Kết quả trích xuất hóa đơn AI OCR trong 2.4 giây:', 'AI OCR receipt extraction completed in 2.4 seconds:'),
      items: [
        choose('Đơn vị phát hành: Nhà hàng Sen Tây Hồ — MST: 0102345678', 'Vendor: West Lake Lotus Restaurant — Tax ID: 0102345678'),
        choose('Ngày phát hành: 09/09/2026 — Giờ: 12:45', 'Date: 09/09/2026 — Time: 12:45'),
        choose('Số tiền thanh toán: 1.250.000 ₫ (đã bao gồm VAT 10%)', 'Total amount: 1,250,000 VND (10% VAT included)'),
        choose('Phân loại danh mục: Tiếp khách & Đối tác → Trừ vào Ví Công Ty', 'Category: Client Hospitality → Deducted from Company Wallet')
      ],
      note: choose('Tự động lưu ảnh hóa đơn và cập nhật biểu đồ chi tiêu tức thì.', 'Automatically saves receipt proof and updates expense charts.')
    }
  };

  // Testimonials Data
  const testimonials = [
    {
      name: choose('Nguyễn Quốc Bảo', 'Quoc Bao Nguyen'),
      role: choose('Founder & CEO @ Veloce Labs', 'Founder & CEO @ Veloce Labs'),
      avatar: 'QB',
      tone: 'blue',
      quote: choose(
        '“Trước đây team mình phải dùng Trello cho tasks, Notion cho docs, Slack để chat và Excel để quản lý tiền. Costack gom tất cả vào một nơi với trải nghiệm mượt mà, lại hỗ trợ thanh toán VietQR siêu tiện lợi!”',
        '“We used to juggle Trello for tasks, Notion for docs, Slack for chat, and Excel for finances. Costack brought everything into one slick workspace with lightning-fast VietQR checkout.”'
      ),
      highlight: choose('Tiết kiệm 40% chi phí phần mềm', 'Saved 40% in SaaS costs')
    },
    {
      name: choose('Trần Thảo My', 'Thao My Tran'),
      role: choose('Senior Product Manager @ InnovateX', 'Senior Product Manager @ InnovateX'),
      avatar: 'TM',
      tone: 'purple',
      quote: choose(
        '“Chế độ xem Gantt và tính năng phụ thuộc công việc (Dependencies) trên Costack giúp team release đúng hạn 100% trong 2 quý liền. Brain AI tóm tắt thảo luận cực kỳ thông minh.”',
        '“The Gantt timeline and task dependencies helped our team hit 100% on-time releases for two straight quarters. Brain AI chat summaries are pure magic.”'
      ),
      highlight: choose('Release đúng hẹn 100%', '100% on-time sprints')
    },
    {
      name: choose('Lê Hoàng Long', 'Hoang Long Le'),
      role: choose('Creative Director @ Studio 84', 'Creative Director @ Studio 84'),
      avatar: 'HL',
      tone: 'emerald',
      quote: choose(
        '“Giao diện dark mode quá đẹp, độ hoàn thiện cao như các ứng dụng hàng đầu thế giới. Khách hàng của mình rất ấn tượng khi được mời vào xem tiến độ dự án mà không bị rối.”',
        '“The dark mode aesthetic is world-class, on par with Linear and Apple. Our clients are always impressed when reviewing project progress in shared spaces.”'
      ),
      highlight: choose('Trải nghiệm UI/UX ấn tượng', 'World-class aesthetic')
    },
    {
      name: choose('Đặng Quỳnh Chi', 'Quynh Chi Dang'),
      role: choose('Head of Operations @ NextGen Retail', 'Head of Operations @ NextGen Retail'),
      avatar: 'QC',
      tone: 'amber',
      quote: choose(
        '“Tính năng Finance Hub kết hợp quét hóa đơn bằng AI OCR giúp phòng vận hành tiết kiệm ít nhất 15 giờ nhập liệu giấy tờ mỗi tuần. Một bước đột phá thực sự!”',
        '“The Finance Hub paired with AI OCR receipt scanning saves our operations team at least 15 hours of manual data entry every single week. Game changer!”'
      ),
      highlight: choose('Tiết kiệm 15 giờ/tuần', 'Saves 15h weekly')
    }
  ];

  // Detailed Comparison Categories
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

  // FAQs
  const faqs = [
    [
      choose('Costack là gì và khác gì so với các công cụ như Trello, Notion hay Slack?', 'What is Costack and how does it compare to Trello, Notion, or Slack?'),
      choose('Costack là nền tảng quản lý công việc và vận hành all-in-one thế hệ mới. Thay vì phải trả tiền và chuyển đổi qua lại giữa 4-5 phần mềm riêng biệt (Trello cho task, Notion cho docs, Slack để chat, Excel quản lý tiền), Costack tích hợp tất cả vào một không gian duy nhất có trợ lý AI Gemini và hỗ trợ thanh toán VietQR PayOS tức thì.', 'Costack is a next-gen all-in-one workspace. Instead of paying and switching between 4-5 fragmented tools (Trello for tasks, Notion for docs, Slack for chat, Excel for finance), Costack brings everything together with built-in Gemini AI and instant VietQR billing.')
    ],
    [
      choose('Gói miễn phí (Free) có bị giới hạn thời gian không?', 'Is the Free plan truly free forever?'),
      choose(`Gói Free của Costack hoàn toàn miễn phí trọn đời (không hết hạn dùng thử), hỗ trợ ${PLAN_ENTITLEMENTS.free.maxMembers} thành viên, tối đa ${PLAN_ENTITLEMENTS.free.maxSpaces} không gian làm việc và đầy đủ các tính năng Kanban, Danh sách, Docs và Chat. Bạn không cần thẻ tín dụng để bắt đầu.`, `The Free plan is free forever with no trial expiration, supporting ${PLAN_ENTITLEMENTS.free.maxMembers} member, up to ${PLAN_ENTITLEMENTS.free.maxSpaces} spaces, and core Kanban, List, Docs, and Chat features. No credit card required.`)
    ],
    [
      choose('Hình thức thanh toán qua VietQR PayOS hoạt động như thế nào?', 'How does PayOS VietQR payment work?'),
      choose('Costack tích hợp cổng thanh toán PayOS chuẩn NAPAS 24/7. Bạn chỉ cần mở bất kỳ ứng dụng ngân hàng nào tại Việt Nam (Vietcombank, Techcombank, MB, v.v.), quét mã VietQR là tài khoản sẽ được nâng cấp tự động trong 3 giây. Không cần thẻ Visa/Mastercard quốc tế, không bị trừ tiền định kỳ phiền toái.', 'Costack supports PayOS NAPAS 24/7 VietQR. Simply scan the QR code using any banking app in Vietnam. Your account upgrades automatically within 3 seconds without international cards or unwanted recurring charges.')
    ],
    [
      choose('Costack Brain AI hoạt động như thế nào và dữ liệu của tôi có được bảo mật không?', 'How does Costack Brain AI work and is my data secure?'),
      choose('Costack Brain AI ứng dụng mô hình Google Gemini 2.5 Flash tiên tiến nhất. AI chỉ kích hoạt khi bạn chủ động yêu cầu. Dữ liệu công việc của bạn không bao giờ được dùng để huấn luyện mô hình chung và luôn được bảo vệ bằng chính sách xác thực đa tầng trên máy chủ.', 'Costack Brain AI is powered by Google Gemini 2.5 Flash and activates only when requested. Your proprietary work data is never used to train public AI models and is secured by strict server-side authentication.')
    ],
    [
      choose('Tôi có thể chuyển dữ liệu từ Notion, Trello hoặc Asana sang Costack không?', 'Can I import data from Notion, Trello, or Asana?'),
      choose('Hoàn toàn được. Costack hỗ trợ nhập dữ liệu dạng JSON, CSV và bảng tính Excel, giúp bạn chuyển đổi danh sách công việc, thẻ ghi chú và dữ liệu khách hàng từ các nền tảng khác sang Costack chỉ trong vài phút.', 'Yes, Costack supports importing from JSON, CSV, and Excel spreadsheets, allowing you to migrate tasks, notes, and customer records from other platforms in just a few minutes.')
    ],
    [
      choose('Costack có hoạt động ngoại tuyến (Offline) và đa thiết bị không?', 'Does Costack work offline and across devices?'),
      choose('Costack ứng dụng kiến trúc Local-First thông minh, cho phép bạn tiếp tục xem và xử lý công việc ngay cả khi mất kết nối mạng. Dữ liệu sẽ tự động đồng bộ lên đám mây khi có kết nối trở lại. Bạn có thể sử dụng mượt mà trên cả trình duyệt máy tính và điện thoại thông minh.', 'Costack leverages a local-first architecture so you can continue viewing and editing tasks even without internet. Data automatically syncs when reconnected. Works seamlessly on desktop and mobile browsers.')
    ],
    [
      choose('Tính năng Quét hóa đơn bằng AI OCR (Finance Hub) hoạt động ra sao?', 'How does the AI OCR Receipt Scanner work?'),
      choose('Khi bạn chụp hoặc tải ảnh hóa đơn (tiếp khách, xăng xe, mua sắm văn phòng), AI OCR sẽ tự động đọc tên đơn vị bán, mã số thuế, ngày giờ, số tiền và thuế VAT, sau đó tự động phân loại và ghi nhận vào sổ chi tiêu của công ty trong vài giây.', 'Upload or snap a photo of any receipt, and AI OCR will automatically extract the vendor, tax ID, date, total amount, and VAT, logging it directly into your company wallet ledger in seconds.')
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

  const navLink = (id: string, label: string) => (
    <a
      href={`#${id}`}
      onClick={event => navigate(event, id)}
      aria-current={activeSection === id ? 'location' : undefined}
      className={activeSection === id ? s.activeNavLink : ''}
    >
      {label}
    </a>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div ref={rootRef} className={s.landing} id="top">
        <a href="#main-content" className={s.skipLink} onClick={event => navigate(event, 'main-content')}>
          {choose('Đến nội dung chính', 'Skip to content')}
        </a>

        {/* ── HEADER NAVBAR ── */}
        <header ref={headerRef} className={s.header} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) closeMenu(); }}>
          <div className={s.headerInner}>
            <a href="#top" onClick={event => navigate(event, 'top')} className={s.brand} aria-label="Costack Home">
              <img src="/logo.png" alt="Costack Logo" className="w-8 h-8 object-contain shrink-0 transition-transform duration-200 hover:scale-105" />
              <span>Costack<span className={s.brandDot}>.</span></span>
            </a>

            <nav className={s.desktopNav} aria-label={choose('Điều hướng chính', 'Main navigation')}>
              <div className={s.navDropdown}>
                <button
                  type="button"
                  data-dropdown="product"
                  aria-expanded={menu === 'product'}
                  aria-controls="product-menu"
                  onClick={() => setMenu(menu === 'product' ? null : 'product')}
                >
                  {choose('Sản phẩm', 'Product')}
                  <ChevronDown size={14} />
                </button>
                {menu === 'product' && (
                  <div className={s.megaMenu} id="product-menu">
                    <div>
                      <span className={s.eyebrow}>{choose('KHÁM PHÁ HỆ SINH THÁI', 'EXPLORE ECOSYSTEM')}</span>
                      {[
                        [Kanban, 'product', choose('Không gian làm việc tương tác', 'Interactive workspace'), choose('Kanban, Danh sách, Docs và Chat trực tiếp', 'Tasks, docs, and live team chat')],
                        [Layers, 'features', choose('Tất cả 10 tính năng', 'All 10 Core Modules'), choose('Bộ công cụ toàn diện cho ngày làm việc', 'Everything you need to plan and operate')],
                        [Sparkles, 'ai', 'Costack Brain AI', choose('Trợ lý AI Gemini phân rã việc & quét bill', 'Gemini AI assistant for tasks & receipts')],
                        [Users, 'testimonials', choose('Đánh giá khách hàng', 'Customer Stories'), choose('Cộng đồng hơn 10.000+ cá nhân & đội ngũ', 'Trusted by 10,000+ creators & teams')]
                      ].map(([Icon, id, title, description]) => {
                        const ItemIcon = Icon as LucideIcon;
                        return (
                          <a key={id as string} href={`#${id}`} onClick={event => navigate(event, id as string)}>
                            <ItemIcon size={20} />
                            <span>
                              <strong>{title as string}</strong>
                              <small>{description as string}</small>
                            </span>
                            <ArrowUpRight size={15} />
                          </a>
                        );
                      })}
                    </div>
                    <div className={s.menuAside}>
                      <span className={s.menuOrb}><Workflow size={28} /></span>
                      <strong>{choose('Một nơi chung. Mọi cách làm việc.', 'One workspace. Infinite ways to work.')}</strong>
                      <p>{choose('Bắt đầu từ một dự án và xây dựng cách vận hành khoa học cho bạn và đội ngũ.', 'Start with one project and build a seamless workflow for your team.')}</p>
                      <button type="button" onClick={signup}>
                        {choose('Bắt đầu miễn phí trọn đời', 'Start free forever')}
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {navLink('features', choose('Tính năng', 'Features'))}
              {navLink('solutions', choose('Giải pháp', 'Solutions'))}
              {navLink('pricing', choose('Bảng giá', 'Pricing'))}

              <div className={s.navDropdown}>
                <button
                  type="button"
                  data-dropdown="resources"
                  aria-expanded={menu === 'resources'}
                  aria-controls="resources-menu"
                  onClick={() => setMenu(menu === 'resources' ? null : 'resources')}
                >
                  {choose('Tài nguyên', 'Resources')}
                  <ChevronDown size={14} />
                </button>
                {menu === 'resources' && (
                  <div className={s.resourceMenu} id="resources-menu">
                    {navLink('how-it-works', choose('Hướng dẫn bắt đầu 4 bước', 'Getting started guide'))}
                    {navLink('testimonials', choose('Câu chuyện khách hàng', 'Customer stories'))}
                    {navLink('faq', choose('Câu hỏi thường gặp', 'FAQ'))}
                    <Link href="/legal/security">{choose('Bảo mật & Dữ liệu', 'Security & Compliance')}</Link>
                    <a href="mailto:contact@costack.vn">{choose('Liên hệ hỗ trợ 24/7', 'Contact support 24/7')}<ArrowUpRight size={14} /></a>
                  </div>
                )}
              </div>
            </nav>

            <div className={s.headerActions}>
              <div className={s.preferences}>
                <LanguageSwitch size="md" />
                <ThemeSwitch size="sm" />
              </div>
              <button type="button" className={s.signin} onClick={() => { closeMenu(); onSignIn(); }}>
                {choose('Đăng nhập', 'Log in')}
              </button>
              <GsapMagneticButton className={`${s.primaryButton} ${s.headerCta}`} onClick={signup}>
                {choose('Bắt đầu miễn phí', 'Get Started Free')}
                <ArrowUpRight size={16} />
              </GsapMagneticButton>
              <button
                ref={mobileButtonRef}
                type="button"
                className={s.mobileToggle}
                aria-label={mobileOpen ? choose('Đóng menu', 'Close menu') : choose('Mở menu', 'Open menu')}
                aria-expanded={mobileOpen}
                aria-controls="mobile-navigation"
                onClick={() => { setMobileOpen(!mobileOpen); setMenu(null); }}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Drawer */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.nav
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={s.mobileNav}
                id="mobile-navigation"
                aria-label="Mobile navigation"
              >
                <div className={s.mobileNavLinks}>
                  {navLink('product', choose('Không gian mẫu', 'Interactive workspace'))}
                  {navLink('features', choose('Tính năng nổi bật', 'Features'))}
                  {navLink('solutions', choose('Giải pháp theo nhu cầu', 'Solutions'))}
                  {navLink('ai', 'Costack Brain AI')}
                  {navLink('testimonials', choose('Đánh giá khách hàng', 'Testimonials'))}
                  {navLink('pricing', choose('Bảng giá & Gói dịch vụ', 'Pricing'))}
                  {navLink('how-it-works', choose('Hướng dẫn bắt đầu', 'How it works'))}
                  {navLink('faq', choose('Câu hỏi thường gặp', 'FAQ'))}
                  <Link href="/legal/security">{choose('Bảo mật & Dữ liệu', 'Security & Data')}</Link>
                </div>
                <div className={s.mobileAuth}>
                  <button type="button" className={s.secondaryButton} onClick={() => { closeMenu(); onSignIn(); }}>
                    {choose('Đăng nhập', 'Log in')}
                  </button>
                  <button type="button" className={s.primaryButton} onClick={signup}>
                    {choose('Tạo tài khoản miễn phí', 'Start for free')}
                    <ArrowRight size={15} />
                  </button>
                </div>
              </motion.nav>
            )}
          </AnimatePresence>

          {/* ── HIGH-END INTERACTIVE READING PROGRESS ENGINE ── */}
          <div 
            className={`${s.scrollProgressTrack} ${isScrolling ? s.isScrolling : ''} ${hoverProgress ? s.isTrackHovered : ''}`}
            role="progressbar"
            aria-valuenow={scrollPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={choose('Tiến độ đọc trang - Bấm để cuộn nhanh', 'Reading progress - Click to scrub')}
            onClick={handleTrackClick}
            onMouseMove={handleTrackMouseMove}
            onMouseLeave={handleTrackMouseLeave}
          >
            {/* Ambient Background Stream */}
            <div className={s.scrollProgressBackdrop} />

            {/* Active Fluid Gradient Bar */}
            <div className={s.scrollProgressBar}>
              {/* Ultra-luminous Beacon Leading Head */}
              <div className={s.scrollProgressHead}>
                <span className={s.scrollBeaconCore} />
                <span className={s.scrollBeaconRing} />
                <span className={s.scrollBeaconFlare} />
              </div>
              <div className={s.scrollProgressGlow} />
            </div>

            {/* Waypoint Milestone Pips */}
            <div className={s.scrollProgressWaypoints} aria-hidden="true">
              {readingWaypoints.slice(1).map(wp => {
                const pct = waypointPcts[wp.id] ?? wp.pct;
                const isPassed = scrollPercent >= pct;
                const isActive = activeSection === wp.id;
                return (
                  <button
                    key={wp.id}
                    type="button"
                    tabIndex={-1}
                    className={`${s.scrollWaypoint} ${isPassed ? s.waypointPassed : ''} ${isActive ? s.waypointActive : ''}`}
                    style={{ left: `${pct}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(e as any, wp.id);
                    }}
                    title={`${vi ? wp.labelVi : wp.labelEn} (${pct}%)`}
                  >
                    <span className={s.waypointPip} />
                    <span className={s.waypointTooltip}>
                      {vi ? wp.labelVi : wp.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Hover Scrubber Tooltip */}
            {hoverProgress && (
              <div 
                className={s.scrubberTooltip} 
                style={{ left: `${hoverProgress.x}px` }}
              >
                <span className={s.scrubberTooltipLabel}>{hoverProgress.label}</span>
                <span className={s.scrubberTooltipPct}>{hoverProgress.pct}%</span>
              </div>
            )}

            {/* Dynamic Reading Pill (Floating status capsule) */}
            <div className={`${s.scrollReadingCapsule} ${scrollPercent > 2 || isScrolling ? s.capsuleVisible : ''}`}>
              {scrollPercent >= 98 ? (
                <span className={s.capsuleCompleted}>
                  <CheckCircle2 size={12} className="text-emerald-400 inline shrink-0" />
                  {choose('Đã đọc xong · 100%', 'Completed · 100%')}
                </span>
              ) : (
                <span className={s.capsuleReading}>
                  <span className={s.capsulePulseDot} />
                  <span className={s.capsuleSectionName}>
                    {activeSection && sectionLabels[activeSection]
                      ? (vi ? sectionLabels[activeSection].vi : sectionLabels[activeSection].en)
                      : choose('Đang đọc', 'Reading')}
                  </span>
                  <span className={s.capsuleDivider}>·</span>
                  <span className={s.capsulePercent}>{scrollPercent}%</span>
                </span>
              )}
            </div>
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <main id="main-content">
          {/* HERO SECTION */}
          <section className={s.hero} aria-labelledby="hero-title">
            <GsapAmbientGlow />
            <div className={s.heroGlow} aria-hidden="true" />
            <div className={s.heroGrid} aria-hidden="true" />

            <div className={s.heroContent}>
              <h1 id="hero-title">
                {choose('Một không gian cho tất cả.', 'One unified space for work.')}
                <br />
                <span className={s.heroGradientText}>
                  {choose('Công việc, Tài liệu, Chat & AI.', 'Tasks, Docs, Finance & AI.')}
                </span>
              </h1>

              <p className={s.heroDescription}>
                {choose(
                  'Tạm biệt việc nhảy qua lại giữa 5 ứng dụng rời rạc. Mọi công cụ bạn và đội ngũ cần để lập kế hoạch, bàn giao dự án và theo dõi tài chính nằm trọn trong Costack.',
                  'Say goodbye to juggling 5 disconnected tools. Everything you and your team need to plan, collaborate, track finances, and execute lives inside Costack.'
                )}
              </p>

              <div className={s.heroActions}>
                <GsapMagneticButton className={s.primaryButton} onClick={() => startPlan('free')}>
                  {choose('Tạo workspace miễn phí', 'Create your free workspace')}
                  <ArrowRight size={17} />
                </GsapMagneticButton>
                <a className={s.secondaryButton} href="#product" onClick={event => navigate(event, 'product')}>
                  <Eye size={17} />
                  {choose('Khám phá Console tương tác', 'Explore interactive demo')}
                </a>
              </div>

              {/* Social Proof Rating Pill */}
              <div className={s.heroSocialProof}>
                <div className={s.starRatingRow}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                  ))}
                  <strong className="text-slate-800 dark:text-slate-200 ml-1">4.9/5</strong>
                </div>
                <span className={s.socialProofText}>
                  {choose('Tin dùng bởi hơn 10.000+ cá nhân và đội ngũ tại Việt Nam', 'Trusted by 10,000+ creators and teams')}
                </span>
                <div className={s.heroNotes}>
                  <span><Check size={13} className="text-emerald-500" />{choose('Gói Free trọn đời', 'Free forever tier')}</span>
                  <span><Check size={13} className="text-sky-500" />{choose('Không cần thẻ thanh toán', 'No credit card needed')}</span>
                  <span><Globe2 size={13} className="text-purple-500" />{choose('Tiếng Việt & English', 'Vietnamese & English')}</span>
                </div>
              </div>
            </div>

            {/* Product Preview Console */}
            <div className={s.container}>
              <ProductPreview vi={vi} />
            </div>
          </section>

          {/* TOOL STRIP MARQUEE */}
          <div className={`${s.toolStrip} ${s.container}`}>
            <span>{choose('HỆ SINH THÁI 10 CÔNG CỤ TÍCH HỢP', '10 UNIFIED TOOLS IN ONE SYSTEM')}</span>
            <div className={s.toolStripItems}>
              {[
                [Kanban, 'Tasks'],
                [FileText, 'Docs'],
                [MessageSquare, 'Chat'],
                [Wallet, 'Finance & OCR'],
                [Sparkles, 'Brain AI'],
                [Layers, 'Base DB'],
                [Workflow, 'Whiteboard'],
                [Target, 'OKRs Goals'],
                [Clock, 'Pomodoro'],
                [Zap, 'PayOS VietQR']
              ].map(([Icon, label]) => {
                const ToolIcon = Icon as LucideIcon;
                return (
                  <span key={label as string} className={s.toolBadge}>
                    <ToolIcon size={17} />
                    {label as string}
                  </span>
                );
              })}
            </div>
          </div>

          {/* STATS STRIP */}
          <GsapScrollCascade className={`${s.statsStrip} ${s.container}`} itemSelector={`.${s.statItem}`}>
            <div className={s.statItem}>
              <strong><GsapAnimatedCounter value={50} prefix="< " suffix="ms" /></strong>
              <span>{choose('Đồng bộ Local-first siêu tốc', 'Local-first instant latency')}</span>
            </div>
            <div className={s.statItem}>
              <strong><GsapAnimatedCounter value={99.9} decimals={1} suffix="%" /></strong>
              <span>{choose('Độ sẵn sàng đám mây & SLA', 'Cloud uptime availability')}</span>
            </div>
            <div className={s.statItem}>
              <strong><GsapAnimatedCounter value={3} suffix={choose(' Giây', 's')} /></strong>
              <span>{choose('Kích hoạt gói tự động VietQR', 'VietQR automated upgrade')}</span>
            </div>
            <div className={s.statItem}>
              <strong><GsapAnimatedCounter value={100} suffix="%" /></strong>
              <span>{choose('Mã hóa an toàn RLS & SSL', 'Row-Level Security isolated')}</span>
            </div>
          </GsapScrollCascade>

          {/* ── BENTO GRID FEATURES ── */}
          <section className={`${s.section} ${s.container}`} id="features" aria-labelledby="features-title">
            <Reveal className={s.sectionHeading}>
              <div>
                <span className={s.eyebrow}>{choose('MỌI CÔNG CỤ Ở ĐÚNG VỊ TRÍ', 'EVERY TOOL IN CONTEXT')}</span>
                <h2 id="features-title">
                  {choose('Không chỉ là quản lý công việc.', 'More than just task management.')}
                  <br />
                  {choose('Đây là bộ máy vận hành hoàn chỉnh.', 'A complete operating system.')}
                </h2>
              </div>
              <p>
                {choose(
                  'Chọn những module phù hợp với quy mô hiện tại. Khi đội ngũ phát triển, Costack sẵn sàng mở rộng mà không làm gián đoạn nhịp làm việc.',
                  'Start with what you need today. As your team expands, Costack scales effortlessly without interrupting daily momentum.'
                )}
              </p>
            </Reveal>

            <div className={s.bentoGrid}>
              {bentoFeatures.map(({ icon: Icon, badge, title, text, detail, tone, span }, index) => (
                <GsapCard3DTilt
                  key={title}
                  className={`${s.bentoCard} ${s[span] || ''}`}
                  innerClassName="flex flex-col h-full justify-between"
                  maxTilt={5}
                  scale={1.015}
                  glare={true}
                >
                  <div>
                    <div className={s.bentoCardTop}>
                      <span className={s.featureIcon} data-tone={tone}>
                        <Icon size={22} />
                      </span>
                      <span className={s.bentoBadge}>{badge}</span>
                      <span className={s.bentoNumber}>0{index + 1}</span>
                    </div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                  <div className={s.featureDetail}>
                    <CheckCircle2 size={13} className="text-sky-500 shrink-0" />
                    <span>{detail}</span>
                  </div>
                </GsapCard3DTilt>
              ))}
            </div>
          </section>

          {/* ── 4-STEP ONBOARDING WORKFLOW ── */}
          <section className={s.workflowSection} id="how-it-works" aria-labelledby="workflow-title">
            <div className={s.container}>
              <Reveal className={s.centerHeading}>
                <span className={s.eyebrow}>{choose('HÀNH TRÌNH 4 BƯỚC ĐƠN GIẢN', 'SIMPLE 4-STEP JOURNEY')}</span>
                <h2 id="workflow-title">{choose('Bắt đầu dễ dàng. Thấy ngay hiệu quả.', 'Start simply. Experience instant momentum.')}</h2>
                <p>{choose('Đưa công việc đang làm vào Costack từng bước một với quy trình chuẩn mực được kiểm chứng.', 'Bring ongoing projects into Costack smoothly with our battle-tested setup path.')}</p>
              </Reveal>

              <GsapScrollCascade className={s.steps} itemSelector={`.${s.step}`}>
                {[
                  [Folder, choose('Tạo không gian & Phân quyền', 'Create spaces & Set roles'), choose('Tổ chức workspace theo phòng ban hoặc dự án. Phân quyền rõ ràng giữa thành viên nội bộ và khách đối tác bên ngoài.', 'Organize workspaces by department or project. Set clear permissions between internal teams and external guests.')],
                  [Sparkles, choose('Lập kế hoạch & Phân rã với AI', 'Plan & Break down tasks with AI'), choose('Nhập mục tiêu dự án để Brain AI tự động gợi ý danh sách công việc con, gán mức ưu tiên và dự toán thời gian.', 'Input your project brief and let Brain AI automatically suggest actionable subtasks, priorities, and deadlines.')],
                  [MessageSquare, choose('Cộng tác & Trao đổi thời gian thực', 'Collaborate & Chat in realtime'), choose('Thảo luận trong kênh nhóm, chia sẻ tài liệu Docs sống và cập nhật trạng thái mọi lúc mọi nơi trên cả máy tính lẫn di động.', 'Discuss in project channels, co-edit live Docs, and update task statuses anywhere across desktop and mobile.')],
                  [Target, choose('Đo lường OKRs & Tối ưu dòng tiền', 'Track OKRs & Master cash flow'), choose('Theo dõi tiến độ mục tiêu doanh nghiệp, đối soát thu chi qua Finance Hub và đánh giá năng suất toàn đội ngũ.', 'Monitor company OKRs, reconcile income/expenses in the Finance Hub, and review team velocity with visual analytics.')]
                ].map(([Icon, title, text], index) => {
                  const StepIcon = Icon as LucideIcon;
                  return (
                    <div key={title as string} className={s.step}>
                      <span className={s.stepNumber}>0{index + 1}</span>
                      <div className={s.stepIconWrap}><StepIcon size={24} /></div>
                      <h3>{title as string}</h3>
                      <p>{text as string}</p>
                    </div>
                  );
                })}
              </GsapScrollCascade>
            </div>
          </section>

          {/* ── TARGET SOLUTIONS / PERSONAS ── */}
          <section className={`${s.section} ${s.container}`} id="solutions" aria-labelledby="solutions-title">
            <Reveal className={s.centerHeading}>
              <span className={s.eyebrow}>{choose('THIẾT KẾ CHO TỪNG NHU CẦU', 'BUILT AROUND YOUR WORKFLOW')}</span>
              <h2 id="solutions-title">{choose('Một mình làm chủ, hay cả đội ngũ cùng tiến.', 'Tailored for solos. Engineered for teams.')}</h2>
            </Reveal>

            <div className={s.solutionTabs} aria-label={choose('Chọn nhu cầu sử dụng', 'Choose your use case')}>
              {solutions.map(({ label, icon: Icon }, index) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={solution === index}
                  className={solution === index ? s.activeSolutionBtn : ''}
                  onClick={() => setSolution(index)}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className={s.solutionPanel}>
              <Reveal className={s.solutionCopy}>
                <span className={s.eyebrow}>{solutions[solution].label}</span>
                <h3>{solutions[solution].title}</h3>
                <p>{solutions[solution].text}</p>
                <ul>
                  {solutions[solution].points.map(point => (
                    <li key={point}>
                      <CheckCircle2 size={16} className="text-sky-500 shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <button type="button" className={s.textButton} onClick={signup}>
                  {choose('Khám phá không gian phù hợp với bạn', 'Set up your tailored space')}
                  <ArrowRight size={17} />
                </button>
              </Reveal>

              <div className={s.solutionVisual}>
                <div className={s.orbit} aria-hidden="true" />
                <motion.div
                  key={solution}
                  initial={{ opacity: 0, y: reduced ? 0 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className={s.projectStack}
                >
                  <div className={s.projectStackTop}>
                    <span className={s.featureIcon} data-tone="blue">
                      <Folder size={22} />
                    </span>
                    <div>
                      <span className={s.stackSub}>{choose('KHÔNG GIAN MẪU', 'PREVIEW SPACE')}</span>
                      <strong>{solutions[solution].project}</strong>
                    </div>
                    <Layers size={18} className="ml-auto opacity-60" />
                  </div>
                  {solutions[solution].items.map((item, index) => (
                    <div className={s.projectRow} key={item}>
                      <span className={s.projectRowIndex}>0{index + 1}</span>
                      <strong>{item}</strong>
                      <ArrowUpRight size={15} />
                    </div>
                  ))}
                  <div className={s.projectBottom}>
                    <span className={s.statusDot} />
                    <span>{choose('Mọi thứ ở đúng nơi bạn cần trong một nhấp chuột', 'Everything in place with a single click')}</span>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ── COSTACK BRAIN AI INTERACTIVE PLAYGROUND ── */}
          <section className={`${s.aiSection} ${s.container}`} id="ai" aria-labelledby="ai-title">
            <GsapAmbientGlow glowCount={2} />
            <div className={s.aiGlow} aria-hidden="true" />

            <Reveal className={s.aiCopy}>
              <span className={s.aiBadge}>
                <Sparkles size={14} className="text-sky-400" />
                COSTACK BRAIN AI COPILOT
              </span>
              <h2 id="ai-title">
                {choose('Từ “bắt đầu từ đâu?”', 'From “where do I start?”')}
                <br />
                <span className={s.aiGradientText}>
                  {choose('đến kế hoạch rõ ràng trong 3 giây.', 'to a clear action plan in 3s.')}
                </span>
              </h2>
              <p>
                {choose(
                  'Trợ lý ảo tích hợp ngay trong workspace: tự động chia nhỏ dự án thành checklist chi tiết, phác thảo tài liệu, tóm tắt tin nhắn dài và quét hóa đơn AI OCR.',
                  'Your built-in workspace co-pilot: break down complex goals, draft first-pass briefs, summarize channels, and extract receipt data.'
                )}
              </p>

              <div className={s.aiPills} role="tablist" aria-label={choose('Kịch bản AI', 'AI Scenarios')}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={aiTab === 'tasks'}
                  className={aiTab === 'tasks' ? s.activeAiPill : ''}
                  onClick={() => setAiTab('tasks')}
                >
                  <ListTodo size={14} />
                  {choose('Chia nhỏ việc', 'Task breakdown')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={aiTab === 'doc'}
                  className={aiTab === 'doc' ? s.activeAiPill : ''}
                  onClick={() => setAiTab('doc')}
                >
                  <FileText size={14} />
                  {choose('Soạn thảo tài liệu', 'Draft doc')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={aiTab === 'summary'}
                  className={aiTab === 'summary' ? s.activeAiPill : ''}
                  onClick={() => setAiTab('summary')}
                >
                  <MessageSquare size={14} />
                  {choose('Tóm tắt thảo luận', 'Summarize')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={aiTab === 'receipt'}
                  className={aiTab === 'receipt' ? s.activeAiPill : ''}
                  onClick={() => setAiTab('receipt')}
                >
                  <Wallet size={14} />
                  {choose('Quét hóa đơn OCR', 'Scan bill')}
                </button>
              </div>

              <div className={s.aiActionsRow}>
                <button type="button" className={s.aiSimulateBtn} onClick={handleSimulateAi}>
                  <RefreshCw size={14} className={isAiGenerating ? 'animate-spin' : ''} />
                  {choose('Chạy thử phản hồi AI ✦', 'Simulate AI generation ✦')}
                </button>
                <a href="#pricing" onClick={event => navigate(event, 'pricing')} className={s.aiLink}>
                  {choose('Xem các gói hỗ trợ AI', 'View AI plans')}
                  <ArrowRight size={15} />
                </a>
              </div>
              <small className={s.aiFootnote}>
                {choose('Hỗ trợ bởi Google Gemini 2.5 Flash · Có sẵn từ gói Starter · Dữ liệu của bạn được bảo mật tuyệt đối', 'Powered by Gemini 2.5 Flash · Available from Starter · Zero training on user data')}
              </small>
            </Reveal>

            <Reveal className={s.aiExample}>
              <GsapCard3DTilt maxTilt={4} scale={1.01} glare={true} className="rounded-2xl overflow-hidden">
                <div className={s.aiExampleHeader}>
                  <Sparkles size={18} className="text-sky-400" />
                  <strong>Costack Brain AI</strong>
                  <span className={s.aiSimulateStatus}>
                    {isAiGenerating ? choose('Đang xử lý...', 'Processing...') : choose('Phản hồi sẵn sàng', 'Ready')}
                  </span>
                </div>

                <div className={s.aiPromptBox}>
                  <div className={s.aiPromptLabel}>{choose('YÊU CẦU NGƯỜI DÙNG', 'USER PROMPT')}</div>
                  <p>{aiScenarios[aiTab].prompt}</p>
                </div>

                <div className={s.aiResponseBox}>
                  <div className={s.aiResponseHeader}>
                    <Sparkles size={15} className="text-sky-500" />
                    <span>{aiScenarios[aiTab].lead}</span>
                  </div>

                  <div className={s.aiTaskList}>
                    {aiScenarios[aiTab].items.map((item, index) => (
                      <div className={s.aiTaskItem} key={item}>
                        <span className={s.aiItemNumber}>{index + 1}</span>
                        <span className={s.aiItemText}>{item}</span>
                        <Check size={14} className="text-emerald-500 shrink-0 ml-auto" />
                      </div>
                    ))}
                  </div>

                  <p className={s.aiNote}>{aiScenarios[aiTab].note}</p>
                </div>
              </GsapCard3DTilt>
            </Reveal>
          </section>

          {/* ── TESTIMONIALS & SOCIAL PROOF ── */}
          <section className={`${s.section} ${s.container}`} id="testimonials" aria-labelledby="testimonials-title">
            <Reveal className={s.centerHeading}>
              <span className={s.eyebrow}>{choose('ĐƯỢC TIN DÙNG BỞI CỘNG ĐỒNG', 'TRUSTED BY INNOVATORS')}</span>
              <h2 id="testimonials-title">{choose('Đội ngũ nói gì về trải nghiệm Costack?', 'Loved by teams building the future.')}</h2>
              <p>{choose('Lắng nghe cảm nhận thực tế từ các founder, product manager và freelancer đã chuyển sang Costack.', 'Real feedback from tech founders, managers, and solos who simplified their work.')}</p>
            </Reveal>

            <GsapScrollCascade className={s.testimonialsGrid} itemSelector={`.${s.testimonialCard}`}>
              {testimonials.map(({ name, role, avatar, tone, quote, highlight }) => (
                <GsapCard3DTilt
                  key={name}
                  className={s.testimonialCard}
                  innerClassName="flex flex-col h-full justify-between"
                  maxTilt={4}
                  scale={1.01}
                  glare={true}
                >
                  <div>
                    <div className={s.testimonialRating}>
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
                      ))}
                      <span className={s.testimonialBadge}>{highlight}</span>
                    </div>
                    <p className={s.testimonialQuote}>{quote}</p>
                  </div>

                  <div className={s.testimonialAuthor}>
                    <span className={s.avatar} data-tone={tone}>{avatar}</span>
                    <div>
                      <strong>{name}</strong>
                      <small>{role}</small>
                    </div>
                  </div>
                </GsapCard3DTilt>
              ))}
            </GsapScrollCascade>
          </section>

          {/* ── PRICING SECTION ── */}
          <section className={`${s.section} ${s.container}`} id="pricing" aria-labelledby="pricing-title">
            <Reveal className={s.centerHeading}>
              <span className={s.eyebrow}>{choose('MINH BẠCH · KHÔNG CHI PHÍ ẨN', 'TRANSPARENT · NO HIDDEN FEES')}</span>
              <h2 id="pricing-title">{choose('Chọn gói phù hợp với nhịp làm việc.', 'A plan tailored for your momentum.')}</h2>
              <p>{choose('Miễn phí trọn đời cho cá nhân. Nâng cấp bất cứ lúc nào với thanh toán VietQR quét mã tức thì.', 'Start free forever for solo work. Upgrade anytime with instant VietQR banking checkout.')}</p>
            </Reveal>

            {/* Monthly / Yearly Toggle */}
            <div className={s.billingToggleWrap}>
              <div className={s.billingToggle} aria-label={choose('Chu kỳ thanh toán', 'Billing cycle')}>
                <button
                  type="button"
                  aria-pressed={cycle === 'monthly'}
                  className={cycle === 'monthly' ? s.activeToggleBtn : ''}
                  onClick={() => setCycle('monthly')}
                >
                  {choose('Theo tháng', 'Monthly')}
                </button>
                <button
                  type="button"
                  aria-pressed={cycle === 'yearly'}
                  className={cycle === 'yearly' ? s.activeToggleBtn : ''}
                  onClick={() => setCycle('yearly')}
                >
                  {choose('Theo năm', 'Yearly')}
                  <span className={s.savePill}>{choose('Tiết kiệm 20%', 'Save 20%')}</span>
                </button>
              </div>
            </div>

            {/* Pricing Cards Grid */}
            <div className={s.pricingGrid}>
              {(['free', 'starter', 'pro', 'business'] as const).map(plan => {
                const limits = PLAN_ENTITLEMENTS[plan];
                const amount = plan === 'free' ? 0 : prices[plan]?.[cycle]?.unit_amount ?? SUGGESTED_PRICES[plan][cycle];
                const formatted = new Intl.NumberFormat(vi ? 'vi-VN' : 'en-US').format(amount);
                const isPro = plan === 'pro';

                const descriptions = {
                  free: choose('Cho công việc cá nhân và quản lý tự do', 'For your personal projects and solos'),
                  starter: choose('Cùng nhóm nhỏ bắt đầu làm việc hiệu quả', 'Get started with a nimble team'),
                  pro: choose('Kết nối toàn diện dự án, tài chính và AI', 'Connect projects, finance, and AI'),
                  business: choose('Quy mô lớn hơn với bảo mật & SLA chuyên sâu', 'High capacity for scaling companies')
                };

                return (
                  <GsapCard3DTilt
                    key={plan}
                    className={`${s.priceCard} ${isPro ? s.featuredPrice : ''}`}
                    innerClassName="flex flex-col h-full justify-between"
                    maxTilt={isPro ? 4 : 2}
                    scale={isPro ? 1.015 : 1.005}
                    glare={isPro}
                  >
                    <div>
                      {isPro && (
                        <div className={s.priceRibbon}>
                          <Sparkles size={12} />
                          {choose('LỰA CHỌN PHỔ BIẾN NHẤT', 'MOST POPULAR')}
                        </div>
                      )}

                      <div className={s.priceCardHeader}>
                        <h3>{plan === 'free' ? 'Free' : plan[0].toUpperCase() + plan.slice(1)}</h3>
                        <p>{descriptions[plan]}</p>
                      </div>

                      <div className={s.priceAmountRow}>
                        <div className={s.priceAmount}>
                          {formatted}
                          <span>₫</span>
                        </div>
                        <div className={s.priceTerm}>
                          {plan === 'free'
                            ? choose('Miễn phí trọn đời', 'Free forever')
                            : cycle === 'monthly'
                            ? choose('/ gói / tháng', '/ plan / mo')
                            : choose('/ gói / năm (trả trước 12 tháng)', '/ plan / yr (paid upfront)')}
                        </div>
                      </div>

                      <button
                        type="button"
                        className={isPro ? s.primaryButton : s.secondaryButton}
                        style={{ width: '100%', marginTop: '16px' }}
                        onClick={() => startPlan(plan)}
                      >
                        {plan === 'free'
                          ? choose('Bắt đầu miễn phí', 'Get Started Free')
                          : choose(`Chọn gói ${plan[0].toUpperCase() + plan.slice(1)}`, `Select ${plan[0].toUpperCase() + plan.slice(1)}`)}
                        <ArrowUpRight size={15} />
                      </button>

                      <ul className={s.priceFeatureList}>
                        <li>
                          <Check size={15} className="text-emerald-500 shrink-0" />
                          <span><strong>{limits.maxMembers}</strong> {choose('thành viên', limits.maxMembers === 1 ? 'member' : 'members')}</span>
                        </li>
                        <li>
                          <Check size={15} className="text-emerald-500 shrink-0" />
                          <span>
                            {limits.maxSpaces === null
                              ? choose('Không giới hạn Spaces', 'Unlimited Spaces')
                              : choose(`${limits.maxSpaces} Không gian làm việc (Spaces)`, `${limits.maxSpaces} Spaces`)}
                          </span>
                        </li>
                        <li>
                          <Check size={15} className="text-emerald-500 shrink-0" />
                          <span>{choose('Đầy đủ Kanban, List, Docs, Chat', 'Full Kanban, List, Docs, Chat')}</span>
                        </li>
                        <li>
                          {limits.monthlyAiRequests ? (
                            <Check size={15} className="text-emerald-500 shrink-0" />
                          ) : (
                            <Circle size={15} className="text-slate-400 opacity-60 shrink-0" />
                          )}
                          <span>
                            {limits.monthlyAiRequests
                              ? `${new Intl.NumberFormat(vi ? 'vi-VN' : 'en-US').format(limits.monthlyAiRequests)} ${choose('yêu cầu Brain AI / tháng', 'AI requests / mo')}`
                              : choose('Chưa bao gồm Brain AI', 'Brain AI not included')}
                          </span>
                        </li>
                        {plan !== 'free' && (
                          <li>
                            <Check size={15} className="text-emerald-500 shrink-0" />
                            <span>{choose('Lịch biểu Calendar & Gantt Timeline', 'Calendar & Gantt timelines')}</span>
                          </li>
                        )}
                        {(plan === 'pro' || plan === 'business') && (
                          <>
                            <li>
                              <Check size={15} className="text-emerald-500 shrink-0" />
                              <span>{choose('Finance Hub & Quét hóa đơn AI OCR', 'Finance Hub & AI OCR Scanner')}</span>
                            </li>
                            <li>
                              <Check size={15} className="text-emerald-500 shrink-0" />
                              <span>{choose('Bảng Base, CRM & Whiteboard', 'Base DB, CRM & Whiteboard')}</span>
                            </li>
                          </>
                        )}
                        {plan === 'business' && (
                          <li>
                            <Check size={15} className="text-emerald-500 shrink-0" />
                            <span>{choose('Hỗ trợ ưu tiên 24/7 & Cam kết SLA', '24/7 Priority SLA support')}</span>
                          </li>
                        )}
                      </ul>
                    </div>

                    <div className={s.priceCardFooter}>
                      <span className={s.guaranteeChip}>
                        <ShieldCheck size={13} className="text-sky-500" />
                        {choose('Bảo mật dữ liệu RLS tuyệt đối', 'RLS multi-layer encrypted')}
                      </span>
                    </div>
                  </GsapCard3DTilt>
                );
              })}
            </div>

            {/* PayOS VietQR Guarantee Badge */}
            <div className={s.payosBadge}>
              <div className={s.payosBadgeLeft}>
                <Zap size={20} className="text-amber-500 shrink-0" />
                <div>
                  <strong>{choose('Thanh toán tức thì qua VietQR PayOS 24/7', 'Instant 24/7 PayOS VietQR Checkout')}</strong>
                  <p>{choose('Quét mã từ mọi ngân hàng tại Việt Nam (Vietcombank, Techcombank, MB, ACB, v.v.). Tự động kích hoạt tài khoản trong 3 giây không cần chờ duyệt thủ công.', 'Scan with any Vietnamese banking app. Instant automated activation within 3 seconds.')}</p>
                </div>
              </div>
              <div className={s.payosChips}>
                <span>NAPAS 24/7</span>
                <span>VietQR</span>
                <span>PayOS</span>
              </div>
            </div>

            {/* Expandable Detailed Feature Comparison */}
            <div className={s.comparisonWrap}>
              <button
                type="button"
                className={s.comparisonHeader}
                onClick={() => setShowComparison(!showComparison)}
                aria-expanded={showComparison}
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-sky-500" />
                  <h3>{choose('So sánh chi tiết tính năng giữa các gói', 'Detailed Feature Comparison Matrix')}</h3>
                </div>
                <div className={s.comparisonToggleLabel}>
                  <span>{showComparison ? choose('Thu gọn bảng', 'Collapse table') : choose('Xem toàn bộ tính năng', 'View all feature rows')}</span>
                  <ChevronDown
                    size={15}
                    style={{ transform: showComparison ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}
                  />
                </div>
              </button>

              {showComparison && (
                <div className={s.comparisonTableContainer}>
                  <table className={s.comparisonTable}>
                    <thead>
                      <tr>
                        <th>{choose('Tính năng / Quyền lợi', 'Feature / Entitlement')}</th>
                        <th>Free</th>
                        <th>Starter</th>
                        <th className={s.thPro}>Pro ✦</th>
                        <th>Business</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonCategories.map((cat, catIdx) => (
                        <Fragment key={catIdx}>
                          <tr className={s.categoryRow}>
                            <td colSpan={5}>{cat.category}</td>
                          </tr>
                          {cat.items.map((row, rowIdx) => (
                            <tr key={rowIdx}>
                              <td>{row.name}</td>
                              <td>{typeof row.free === 'boolean' ? (row.free ? <Check size={15} className={s.checkIcon} /> : <span className={s.dashIcon}>—</span>) : row.free}</td>
                              <td>{typeof row.starter === 'boolean' ? (row.starter ? <Check size={15} className={s.checkIcon} /> : <span className={s.dashIcon}>—</span>) : row.starter}</td>
                              <td className={s.tdPro}>{typeof row.pro === 'boolean' ? (row.pro ? <Check size={15} className={s.checkIcon} /> : <span className={s.dashIcon}>—</span>) : row.pro}</td>
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

            {/* Enterprise Custom Banner */}
            <div className={s.enterprise}>
              <div className="flex items-center gap-3">
                <div className={s.enterpriseIcon}><Award size={22} /></div>
                <div>
                  <strong>{choose('Bạn cần gói Enterprise cho quy mô trên 150 người?', 'Need an Enterprise deployment for over 150 members?')}</strong>
                  <small>{choose('Hỗ trợ xuất hóa đơn VAT công ty, triển khai đám mây riêng và đào tạo chuyên sâu.', 'Corporate VAT invoice, dedicated private cloud migration, and tailored staff training.')}</small>
                </div>
              </div>
              <a href="mailto:contact@costack.vn?subject=Costack%20Enterprise" className={s.enterpriseBtn}>
                {choose('Liên hệ tư vấn Enterprise', 'Talk to Enterprise Team')}
                <ArrowUpRight size={15} />
              </a>
            </div>
          </section>

          {/* ── FAQ SECTION ── */}
          <section className={`${s.faqSection} ${s.container}`} id="faq" aria-labelledby="faq-title">
            <Reveal className={s.faqIntro}>
              <span className={s.eyebrow}>{choose('GIẢI ĐÁP THẮC MẮC', 'COMMONLY ASKED QUESTIONS')}</span>
              <h2 id="faq-title">
                {choose('Bạn có câu hỏi.', 'Your questions.')}
                <br />
                {choose('Costack có câu trả lời.', 'Answered clearly.')}
              </h2>
              <p>{choose('Những điều cần biết để bạn an tâm bắt đầu trải nghiệm ngay hôm nay.', 'Everything you need to know before getting started.')}</p>
              <a href="mailto:contact@costack.vn" className={s.textButton}>
                {choose('Cần tư vấn thêm? Gửi email cho chúng tôi', 'Need more help? Email our founders')}
                <ArrowUpRight size={16} />
              </a>
            </Reveal>

            <div className={s.faqList}>
              {faqs.map(([question, answer], index) => {
                const isOpen = faq === index;
                return (
                  <div className={`${s.faqItem} ${isOpen ? s.faqItemOpen : ''}`} key={question}>
                    <h3>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`faq-answer-${index}`}
                        id={`faq-question-${index}`}
                        onClick={() => setFaq(isOpen ? null : index)}
                      >
                        <span>{question}</span>
                        <span className={s.faqToggleIcon}>
                          {isOpen ? <X size={17} /> : <Plus size={17} />}
                        </span>
                      </button>
                    </h3>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          id={`faq-answer-${index}`}
                          role="region"
                          aria-labelledby={`faq-question-${index}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className={s.faqAnswer}
                        >
                          <p>{answer}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── HIGH-CONVERTING BOTTOM CTA ── */}
          <section className={s.finalCta}>
            <div className={s.finalGrid} aria-hidden="true" />
            <Reveal>
              <span className={s.finalIcon}>
                <Sparkles className="h-8 w-8 text-sky-500 dark:text-sky-400" />
              </span>
              <h2>
                {choose('Bắt đầu dự án tiếp theo của bạn.', 'Give your next project a home.')}
                <br />
                <span className={s.finalGradientText}>
                  {choose('Dễ dàng hơn. Nhanh hơn. Cùng nhau.', 'Clearer. Faster. Together.')}
                </span>
              </h2>
              <p>
                {choose(
                  'Tạo không gian làm việc đầu tiên chỉ trong 30 giây. Không cần thẻ tín dụng, hoàn toàn miễn phí trọn đời.',
                  'Set up your first workspace in 30 seconds. No credit card required, free forever.'
                )}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                <GsapMagneticButton className={s.primaryButton} onClick={() => startPlan('free')}>
                  {choose('Tạo workspace miễn phí ngay', 'Create your free workspace now')}
                  <ArrowRight size={18} />
                </GsapMagneticButton>
                <button type="button" className={s.secondaryButton} onClick={() => onSignIn()}>
                  {choose('Đã có tài khoản? Đăng nhập', 'Already have an account? Sign in')}
                </button>
              </div>
              <small className={s.finalNote}>
                {choose('Gói Free trọn đời · Không ràng buộc · Nâng cấp PayOS VietQR khi cần', 'Free forever tier · No obligations · Upgrade via VietQR anytime')}
              </small>
            </Reveal>
          </section>
        </main>

        {/* ── FOOTER ── */}
        <LandingFooter onSignUp={() => startPlan('free')} onSignIn={onSignIn} />

        {/* ── FLOATING BACK TO TOP BUTTON WITH CIRCULAR PROGRESS ── */}
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.75, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.75, y: 16 }}
              whileHover={{ y: -2, scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={scrollToTop}
              className={s.backToTop}
              aria-label={choose('Cuộn lên đầu trang', 'Back to top')}
              title={choose(`Cuộn lên đầu trang (${scrollPercent}%)`, `Back to top (${scrollPercent}%)`)}
            >
              <svg className={s.backToTopSvg} viewBox="0 0 44 44">
                <circle className={s.backToTopTrack} cx="22" cy="22" r="18" />
                <circle
                  className={s.backToTopIndicator}
                  cx="22"
                  cy="22"
                  r="18"
                  strokeDasharray={113}
                  strokeDashoffset={113 - (scrollPercent / 100) * 113}
                />
              </svg>
              <ArrowUp size={18} className="relative z-10 transition-transform duration-200" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
