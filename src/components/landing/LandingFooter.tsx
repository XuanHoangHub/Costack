"use client";

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUp, Mail, ShieldCheck, Zap } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import s from './landing.module.css';

interface LandingFooterProps {
  onSignUp?: () => void;
  onSignIn?: () => void;
}

export default function LandingFooter({ onSignUp }: LandingFooterProps) {
  const { isVietnamese: vi } = useTranslation();
  const choose = (vn: string, en: string) => vi ? vn : en;
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === 'loading') return;
    setStatus('loading');
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), company })
      });
      if (!response.ok) throw new Error('Subscription failed');
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  const groups = [
    {
      title: choose('Sản phẩm', 'Product'),
      links: [
        [choose('Không gian mẫu', 'Interactive workspace'), '#product'],
        [choose('Tất cả tính năng', 'All 10 Core Modules'), '#features'],
        ['Costack Brain AI', '#ai'],
        [choose('Bảng giá & Gói cước', 'Pricing & Plans'), '#pricing'],
      ]
    },
    {
      title: choose('Giải pháp & Tài nguyên', 'Solutions & Resources'),
      links: [
        [choose('Giải pháp theo nhu cầu', 'Tailored Solutions'), '#solutions'],
        [choose('Hướng dẫn bắt đầu 4 bước', 'Getting Started'), '#how-it-works'],
        [choose('Đánh giá khách hàng', 'Customer Stories'), '#testimonials'],
        [choose('Câu hỏi thường gặp', 'FAQ'), '#faq'],
      ]
    },
    {
      title: choose('Pháp lý & An toàn', 'Legal & Security'),
      links: [
        [choose('Điều khoản dịch vụ', 'Terms of Service'), '/legal/terms'],
        [choose('Chính sách bảo mật', 'Privacy Policy'), '/legal/privacy'],
        [choose('Tiêu chuẩn an toàn dữ liệu', 'Security & Compliance'), '/legal/security'],
      ]
    },
    {
      title: choose('Hỗ trợ & Liên hệ', 'Support & Enterprise'),
      links: [
        [choose('Email: contact@costack.vn', 'Email: contact@costack.vn'), 'mailto:contact@costack.vn'],
        [choose('Tư vấn triển khai Enterprise', 'Enterprise Consultation'), 'mailto:contact@costack.vn?subject=Costack%20Enterprise'],
        [choose('Thanh toán VietQR PayOS 24/7', 'VietQR PayOS Checkout'), '#pricing'],
      ]
    }
  ];

  return (
    <footer className={s.footer}>
      <div className={s.container}>
        <div className={s.footerTop}>
          <div className={s.footerAbout}>
            <a href="#top" className={s.footerBrand} aria-label="Costack Home">
              <img src="/logo.png" alt="Costack Logo" className="w-7 h-7 object-contain inline-block shrink-0 mr-1.5" />
              Costack<span className={s.brandDot}>.</span>
            </a>
            <p>
              {choose(
                'Một không gian làm việc số thống nhất cho công việc, tài liệu, tài chính và trợ lý AI thông minh. Giúp bạn và đội ngũ giải phóng thời gian để tập trung vào điều quan trọng nhất.',
                'A unified digital workspace for tasks, docs, finances, and AI assistant. Empowering teams to streamline operations and focus on what truly matters.'
              )}
            </p>
            <div className={s.footerSystemStatus}>
              <span className={s.statusPulsingDot} />
              <span>{choose('Tất cả hệ thống hoạt động ổn định · 99.9% Uptime', 'All systems operational · 99.9% Uptime')}</span>
            </div>
            <div className={s.footerAvaxaCopyright}>
              <ShieldCheck size={13} className="text-sky-500 shrink-0" />
              <span>{choose('Ứng dụng chính thức thuộc bản quyền của Avaxa', 'Official application copyrighted by Avaxa')}</span>
            </div>
            <button type="button" className={s.textButton} onClick={onSignUp}>
              {choose('Tạo workspace miễn phí trọn đời', 'Create your free workspace')}
              <ArrowRight size={15} />
            </button>
          </div>

          <div className={s.footerGroups}>
            {groups.map(group => (
              <div key={group.title} className={s.footerGroupCol}>
                <h3>{group.title}</h3>
                <ul>
                  {group.links.map(([label, href]) => (
                    <li key={href}>
                      {href.startsWith('/') ? (
                        <Link href={href}>{label}</Link>
                      ) : href.startsWith('mailto:') ? (
                        <a href={href}>{label}</a>
                      ) : (
                        <a href={href}>{label}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Newsletter Box */}
        <div className={s.newsletter}>
          <div className={s.newsletterCopy}>
            <strong>
              <Mail size={17} className="text-sky-500 inline-block mr-1.5 align-middle" />
              {choose('Nhận bản tin cập nhật tính năng mới từ Costack', 'Stay updated with product releases')}
            </strong>
            <p>{choose('Đăng ký để nhận thông tin về các cải tiến AI, tính năng mới và cẩm nang vận hành tinh gọn.', 'Subscribe for product updates, AI breakthroughs, and team productivity guides.')}</p>
          </div>
          <form onSubmit={submit} className={s.newsletterForm}>
            <div className={s.newsletterFields}>
              <label htmlFor="landing-newsletter-email" className="sr-only">Email</label>
              <input
                id="landing-newsletter-email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder={choose('Nhập địa chỉ email của bạn...', 'Enter your email address...')}
                disabled={status === 'loading'}
              />
              <input
                aria-hidden="true"
                tabIndex={-1}
                autoComplete="off"
                value={company}
                onChange={event => setCompany(event.target.value)}
                className="sr-only"
              />
              <button type="submit" className={s.primaryButton} disabled={status === 'loading'}>
                {status === 'loading' ? choose('Đang gửi…', 'Sending…') : choose('Đăng ký', 'Subscribe')}
                <ArrowRight size={14} />
              </button>
            </div>
            <p className={s.newsletterConsent}>
              {choose('Đăng ký nghĩa là bạn đồng ý nhận email từ Costack. Xem ', 'By subscribing you agree to receive emails from Costack. Review our ')}
              <Link href="/legal/privacy">{choose('Chính sách bảo mật', 'Privacy Policy')}</Link>.
            </p>
            {status === 'success' && (
              <p role="status" className={s.formSuccess}>
                {choose('✓ Đã đăng ký thành công. Cảm ơn bạn đã đồng hành cùng Costack!', '✓ Subscribed successfully. Welcome to the Costack community!')}
              </p>
            )}
            {status === 'error' && (
              <p role="alert" className={s.formError}>
                {choose('Chưa thể đăng ký lúc này. Vui lòng kiểm tra lại email.', 'Unable to subscribe right now. Please verify your email.')}
              </p>
            )}
          </form>
        </div>

        {/* Footer Bottom Bar */}
        <div className={s.footerBottom}>
          <div className={s.footerBottomLeft}>
            <span>© {new Date().getFullYear()} Costack · {choose('Ứng dụng thuộc bản quyền của Avaxa. Bảo lưu mọi quyền.', 'Application copyrighted by Avaxa. All rights reserved.')}</span>
            <span className={s.footerDivider}>•</span>
            <span>{choose('Công việc rõ ràng. Đội ngũ bứt phá.', 'Clear work. Connected momentum.')}</span>
          </div>
          <div className={s.footerBottomRight}>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck size={13} className="text-emerald-500" />
              {choose('Bảo vệ bởi Row Level Security', 'Secured with RLS')}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Zap size={13} className="text-amber-500" />
              PayOS VietQR
            </span>
            <a href="#top" className={s.backToTopBtn}>
              {choose('Lên đầu trang', 'Back to top')}
              <ArrowUp size={13} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
