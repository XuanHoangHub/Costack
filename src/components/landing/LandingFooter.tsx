"use client";

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUp, Mail } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { ApexaLogoIcon } from '@/components/ApexaLogo';
import s from './landing.module.css';

interface LandingFooterProps { onSignUp?: () => void; onSignIn?: () => void }

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
      const response = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), company }) });
      if (!response.ok) throw new Error('Subscription failed');
      setStatus('success'); setEmail('');
    } catch { setStatus('error'); }
  };
  const groups = [
    { title: choose('Sản phẩm', 'Product'), links: [[choose('Khám phá workspace', 'Explore workspace'), '#product'], [choose('Tất cả tính năng', 'All features'), '#features'], ['Apexa Brain AI', '#ai'], [choose('Bảng giá', 'Pricing'), '#pricing']] },
    { title: choose('Tìm hiểu thêm', 'Learn more'), links: [[choose('Giải pháp cho bạn', 'Find your fit'), '#solutions'], [choose('Hướng dẫn bắt đầu', 'Getting started'), '#how-it-works'], [choose('Câu hỏi thường gặp', 'FAQ'), '#faq'], [choose('Liên hệ hỗ trợ', 'Contact support'), 'mailto:contact@apexa.vn']] },
    { title: choose('Pháp lý & Dữ liệu', 'Legal & Data'), links: [[choose('Điều khoản dịch vụ', 'Terms of Service'), '/legal/terms'], [choose('Chính sách bảo mật', 'Privacy Policy'), '/legal/privacy'], [choose('Bảo mật', 'Security'), '/legal/security']] },
  ];
  return <footer className={s.footer}><div className={s.container}>
    <div className={s.footerTop}><div className={s.footerAbout}><a href="#top" className={s.footerBrand} aria-label={choose('Apexa — Trang chủ', 'Apexa — Home')}><ApexaLogoIcon variant="white" className="h-8 w-8" />Apexa.</a><p>{choose('Một không gian cho công việc, kiến thức và đội ngũ. Để mỗi ngày làm việc có thêm điều được hoàn thành.', 'A shared space for work, knowledge and your team. Make room for more of what matters every day.')}</p><button className={s.textButton} onClick={onSignUp}>{choose('Tạo workspace miễn phí', 'Create your free workspace')}<ArrowRight size={15} /></button></div>
      <div className={s.footerGroups}>{groups.map(group => <div key={group.title}><h3>{group.title}</h3><ul>{group.links.map(([label, href]) => <li key={href}>{href.startsWith('/') ? <Link href={href}>{label}</Link> : <a href={href}>{label}</a>}</li>)}</ul></div>)}</div>
    </div>
    <div className={s.newsletter}><div><strong><Mail size={17} />{choose('Cập nhật mới từ Apexa', 'What’s new at Apexa')}</strong><p>{choose('Đăng ký nhận tin về sản phẩm qua email.', 'Get product updates by email.')}</p></div><form onSubmit={submit}><div className={s.newsletterFields}><label htmlFor="landing-newsletter-email" className="sr-only">Email</label><input id="landing-newsletter-email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} placeholder={choose('Email của bạn', 'Your email address')} disabled={status === 'loading'} /><input aria-hidden="true" tabIndex={-1} autoComplete="off" value={company} onChange={event => setCompany(event.target.value)} className="sr-only" /><button type="submit" className={s.primaryButton} disabled={status === 'loading'}>{status === 'loading' ? choose('Đang gửi…', 'Sending…') : choose('Nhận cập nhật', 'Subscribe')}<ArrowRight size={14} /></button></div><p>{choose('Đăng ký nghĩa là bạn đồng ý nhận email cập nhật sản phẩm. ', 'By subscribing, you agree to receive product update emails. ')}<Link href="/legal/privacy">{choose('Chính sách bảo mật', 'Privacy Policy')}</Link></p>{status === 'success' && <p role="status" className={s.formSuccess}>{choose('Đã đăng ký thành công. Cảm ơn bạn đã theo dõi Apexa!', 'You’re subscribed. Thanks for following Apexa!')}</p>}{status === 'error' && <p role="alert" className={s.formError}>{choose('Chưa thể đăng ký lúc này. Vui lòng thử lại.', 'We couldn’t subscribe you right now. Please try again.')}</p>}</form></div>
    <div className={s.footerBottom}><span>© {new Date().getFullYear()} Apexa. {choose('Bảo lưu mọi quyền.', 'All rights reserved.')}</span><span>{choose('Công việc rõ ràng. Đội ngũ kết nối.', 'Clear work. Connected teams.')}</span><a href="#top">{choose('Về đầu trang', 'Back to top')}<ArrowUp size={13} /></a></div>
  </div></footer>;
}
