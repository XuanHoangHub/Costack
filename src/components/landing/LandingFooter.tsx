"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck, MapPin, Phone, Mail, Globe, ArrowUp,
  Server, Building2, Zap, Lock
} from 'lucide-react';
import { Button } from '../ui';
import ThemeSwitch from '../ThemeSwitch';
import LanguageDropdown from '../LanguageDropdown';
import { useTranslation } from '@/contexts/TranslationContext';
import { ApexaAiIcon } from '../ApexaAiIcon';

// Social Media Vector Icons
const InstagramIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const FacebookIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const XTwitterIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedInIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.6a1.64 1.64 0 1 0 1.64 1.63A1.63 1.63 0 0 0 7.83 6.6z" />
  </svg>
);

const YouTubeIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const GitHubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const DiscordIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

interface LandingFooterProps {
  onSignUp?: () => void;
  onSignIn?: () => void;
}

export function LandingFooter({ onSignUp, onSignIn }: LandingFooterProps) {
  const { isVietnamese } = useTranslation();
  
  // Newsletter State
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterCompany, setNewsletterCompany] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: ''
  });

  const handleNewsletterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newsletterEmail.trim() || newsletterStatus.type === 'loading') return;
    setNewsletterStatus({ type: 'loading', message: isVietnamese ? 'Đang đăng ký…' : 'Subscribing…' });

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail, locale: isVietnamese ? 'vi' : 'en', company: newsletterCompany }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || (isVietnamese ? 'Chưa thể đăng ký lúc này.' : 'Unable to subscribe right now.'));
      setNewsletterEmail('');
      setNewsletterStatus({ type: 'success', message: result.message || (isVietnamese ? 'Đăng ký thành công. Cảm ơn bạn!' : 'You are subscribed. Thank you!') });
    } catch (error) {
      setNewsletterStatus({
        type: 'error',
        message: error instanceof Error ? error.message : (isVietnamese ? 'Chưa thể đăng ký lúc này.' : 'Unable to subscribe right now.'),
      });
    }
  };

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="relative z-10 border-t border-slate-800/80 bg-gradient-to-b from-[#0e121b] via-[#090b10] to-[#05070a] text-slate-300 font-sans text-xs select-none">
      
      {/* Dynamic Background Glow Mesh */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      {/* =========================================================================
          PRE-FOOTER: TECHNOLOGY & TRUST HIGHLIGHTS STRIP
          ========================================================================= */}
      <div className="border-b border-white/[0.08] bg-white/[0.02] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            
            {/* 1. Local-First Engine */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-blue-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-white truncate">
                  {isVietnamese ? 'Tốc độ Local-First' : 'Local-First Engine'}
                </p>
                <p className="text-[11px] text-slate-400 font-medium truncate">
                  {isVietnamese ? 'Độ trễ phản hồi < 12ms' : '< 12ms instant latency'}
                </p>
              </div>
            </div>

            {/* 2. Enterprise Grade Security */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-emerald-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-white truncate">
                  {isVietnamese ? 'Bảo mật Cấp Doanh nghiệp' : 'Enterprise Grade'}
                </p>
                <p className="text-[11px] text-slate-400 font-medium truncate">
                  {isVietnamese ? 'Mã hóa AES 256-bit & RLS' : '256-bit AES & RLS Shield'}
                </p>
              </div>
            </div>

            {/* 3. Apexa Brain Copilot */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-purple-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <ApexaAiIcon className="w-5 h-5 text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-white truncate">
                  Apexa Brain Copilot
                </p>
                <p className="text-[11px] text-slate-400 font-medium truncate">
                  {isVietnamese ? 'Gemini 2.5 Multi-modal AI' : 'Gemini 2.5 Native AI'}
                </p>
              </div>
            </div>

            {/* 4. High Availability SLA */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-sky-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                <Server className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-xs font-black text-white truncate">
                    {isVietnamese ? 'Hoạt động 99.99%' : '99.99% SLA Uptime'}
                  </p>
                </div>
                <p className="text-[11px] text-slate-400 font-medium truncate">
                  {isVietnamese ? 'Hệ thống vận hành ổn định' : 'All systems operational'}
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN FOOTER CONTENT GRID
          ========================================================================= */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
          
          {/* ── LEFT SECTION: BRAND, LEGAL PROFILE & GLOBAL PRESENCE (5 cols on Desktop) ── */}
          <div className="lg:col-span-5 space-y-6 text-left pr-0 lg:pr-6">
            
            {/* Brand Logo & Slogan */}
            <div className="space-y-3">
              <Link href="/" className="inline-flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" viewBox="0 0 512 512" fill="none">
                    <path
                      d="M256 84 C264 84 271 89 275 97 L405 375 C409 383 403 394 394 394 L325 394 C317 394 309 389 306 381 L278 322 L234 322 L206 381 C203 389 195 394 187 394 L118 394 C109 394 103 383 107 375 L237 97 C241 89 248 84 256 84 Z M256 182 L226 270 L286 270 Z"
                      fill="#FFFFFF"
                    />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-black text-xl tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                    Apexa OS
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">
                    Unified Enterprise Work OS
                  </span>
                </div>
              </Link>

              <p className="text-slate-400 text-xs leading-relaxed font-normal max-w-md">
                {isVietnamese
                  ? 'Hệ điều hành quản trị công việc tinh gọn, tích hợp toàn diện Kanban, Smart Docs, Chat thời gian thực, CRM, ERP và trợ lý trí tuệ nhân tạo Apexa Brain Copilot.'
                  : 'The next-generation unified enterprise operating system integrating Kanban, Smart Docs, Realtime Chat, CRM, ERP, and Apexa Brain AI Copilot.'}
              </p>
            </div>

            {/* Legal Entity & Headquarters Card */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  {isVietnamese ? 'CÔNG TY CỔ PHẦN APEXA OS' : 'APEXA OS CORPORATION'}
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  Active
                </span>
              </div>

              <div className="space-y-2 text-[11.5px] text-slate-400 leading-relaxed font-medium">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    {isVietnamese
                      ? 'GPKD số: 0107938504 do Sở Kế hoạch & Đầu tư TP. Hà Nội cấp'
                      : 'Business Registration No. 0107938504 issued by Hanoi DPI'}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    {isVietnamese
                      ? 'Trụ sở: Tầng 19, Leadvisors Tower, số 643 Phạm Văn Đồng, Phường Nghĩa Đô, TP. Hà Nội'
                      : 'HQ: 19th Floor, Leadvisors Tower, 643 Pham Van Dong, Nghia Do, Hanoi, Vietnam'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    {isVietnamese ? 'Hotline miễn cước: ' : 'Toll-free hotline: '}
                    <strong className="text-white font-bold">1800 6670</strong>
                    <span className="text-slate-500 mx-1">·</span>
                    <span>(+84) 24 7300 8866</span>
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Email: <a href="mailto:contact@apexa.vn" className="text-indigo-400 hover:underline">contact@apexa.vn</a> / <a href="mailto:support@apexa.vn" className="text-indigo-400 hover:underline">support@apexa.vn</a></span>
                </div>
              </div>
            </div>

            {/* Global Offices Directory */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  {isVietnamese ? 'VĂN PHÒNG ĐẠI DIỆN TOÀN CẦU' : 'GLOBAL OFFICES'}
                </span>
                <span className="text-[10px] font-extrabold text-slate-500">5 Hubs</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                
                {/* Hanoi Office */}
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200 mb-1">
                    <span>🇻🇳</span>
                    <span>Hà Nội (Hub 2)</span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-snug">
                    {isVietnamese ? 'Tầng 17, VP2, Sun Square, 21 Lê Đức Thọ, Nam Từ Liêm' : '17th Fl, Sun Square, 21 Le Duc Tho, Hanoi'}
                  </p>
                </div>

                {/* HCMC Office */}
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200 mb-1">
                    <span>🇻🇳</span>
                    <span>TP. Hồ Chí Minh</span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-snug">
                    {isVietnamese ? 'Tầng 5, Lottery Tower, 77 Trần Nhân Tôn, Quận 5' : '5th Fl, Lottery Tower, 77 Tran Nhan Ton, Dist 5, HCMC'}
                  </p>
                </div>

                {/* USA Delaware */}
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200 mb-1">
                    <span>🇺🇸</span>
                    <span>United States</span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-snug">
                    838 Walker Road, Suite 21-2, Dover, Delaware 19904, USA
                  </p>
                </div>

                {/* UAE Dubai */}
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200 mb-1">
                    <span>🇦🇪</span>
                    <span>Dubai (UAE)</span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-snug">
                    CWS-1V-792/40, Amber Gem Tower, Ajman, UAE
                  </p>
                </div>

                {/* India Mumbai */}
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-colors sm:col-span-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200 mb-1">
                    <span>🇮🇳</span>
                    <span>Mumbai (India)</span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-snug">
                    804/805, Kesha Kommercial, Malad East, Mumbai - 400097
                  </p>
                </div>

              </div>
            </div>

            {/* Official Certification, Trust Badges & Social Links */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-white/[0.08]">
              
              {/* Official Seal: ĐÃ THÔNG BÁO BỘ CÔNG THƯƠNG */}
              <div className="inline-flex items-center gap-2.5 bg-[#0052a3]/90 hover:bg-[#0052a3] text-white px-3 py-1.5 rounded-xl border border-sky-400/40 shadow-sm select-none transition-all">
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs">
                  <svg className="w-4 h-4 text-[#0052a3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#0052a3" stroke="none" />
                    <path d="M9 12l2 2 4-4" stroke="#ffffff" strokeWidth="2.5" />
                  </svg>
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[7.5px] font-black uppercase tracking-wider text-sky-200">ĐÃ THÔNG BÁO</span>
                  <span className="text-[9px] font-black uppercase tracking-tight text-white">BỘ CÔNG THƯƠNG</span>
                </div>
              </div>

              {/* Social Channels */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { Icon: GitHubIcon, href: "https://github.com", label: "GitHub", hover: "hover:text-white hover:border-slate-500 hover:bg-slate-800" },
                  { Icon: DiscordIcon, href: "https://discord.com", label: "Discord", hover: "hover:text-[#5865F2] hover:border-[#5865F2]/50 hover:bg-[#5865F2]/10" },
                  { Icon: LinkedInIcon, href: "https://linkedin.com", label: "LinkedIn", hover: "hover:text-[#0077b5] hover:border-[#0077b5]/50 hover:bg-[#0077b5]/10" },
                  { Icon: XTwitterIcon, href: "https://twitter.com", label: "X", hover: "hover:text-white hover:border-slate-400 hover:bg-black" },
                  { Icon: FacebookIcon, href: "https://facebook.com", label: "Facebook", hover: "hover:text-[#1877F2] hover:border-[#1877F2]/50 hover:bg-[#1877F2]/10" },
                  { Icon: YouTubeIcon, href: "https://youtube.com", label: "YouTube", hover: "hover:text-[#FF0000] hover:border-[#FF0000]/50 hover:bg-[#FF0000]/10" },
                  { Icon: InstagramIcon, href: "https://instagram.com", label: "Instagram", hover: "hover:text-[#E4405F] hover:border-[#E4405F]/50 hover:bg-[#E4405F]/10" },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    className={`w-8 h-8 rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-2xs ${item.hover}`}
                  >
                    <item.Icon className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>

            </div>

          </div>

          {/* ── RIGHT SECTION: NAVIGATION COLUMNS (7 cols on Desktop) ── */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-8 text-left">
            
            {/* Column 1: Sản phẩm & Tính năng (Products) */}
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 pb-1 border-b border-white/[0.08]">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <h4 className="font-black text-white text-xs uppercase tracking-wider">
                  {isVietnamese ? 'Sản phẩm' : 'Products'}
                </h4>
              </div>
              <ul className="space-y-2.5 text-[11.5px] font-medium">
                <li>
                  <a href="#features" className="text-slate-400 hover:text-white flex items-center justify-between group transition-colors">
                    <span>{isVietnamese ? 'Bảng Kanban & Sprint' : 'Kanban Boards'}</span>
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">Sprint</span>
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-slate-400 hover:text-white flex items-center justify-between group transition-colors">
                    <span>{isVietnamese ? 'Tài liệu Smart Docs 2.0' : 'Smart Docs 2.0'}</span>
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">Yjs</span>
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-slate-400 hover:text-white flex items-center justify-between group transition-colors">
                    <span>{isVietnamese ? 'Kênh Chat & Trao đổi' : 'Real-time Chat'}</span>
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Live</span>
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-slate-400 hover:text-white flex items-center justify-between group transition-colors">
                    <span className="text-indigo-300 font-bold">Apexa Brain AI Copilot</span>
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xs">AI 2.5</span>
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-slate-400 hover:text-white flex items-center justify-between group transition-colors">
                    <span>{isVietnamese ? 'Quản trị CRM & Lead' : 'CRM & Pipeline'}</span>
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Pro</span>
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Quản lý Tài chính & ERP' : 'Finance & ERP Hub'}
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Whiteboard & Mindmap' : 'Infinite Whiteboard'}
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Tự động hóa Quy trình' : 'Automations Engine'}
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Đồng bộ Local-First' : 'Local-First Offline'}
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 2: Giải pháp (Solutions) */}
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 pb-1 border-b border-white/[0.08]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <h4 className="font-black text-white text-xs uppercase tracking-wider">
                  {isVietnamese ? 'Giải pháp' : 'Solutions'}
                </h4>
              </div>
              <ul className="space-y-2.5 text-[11.5px] font-medium">
                <li>
                  <a href="#solutions" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Quản trị hợp nhất (Unified OS)' : 'Unified Workspace'}
                  </a>
                </li>
                <li>
                  <a href="#solutions" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Doanh nghiệp Quy mô lớn' : 'Enterprise Scale'}
                  </a>
                </li>
                <li>
                  <a href="#solutions" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Đội ngũ Công nghệ & Agile' : 'Tech & Agile Squads'}
                  </a>
                </li>
                <li>
                  <a href="#solutions" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Kinh doanh & Tiếp thị' : 'Sales & Marketing'}
                  </a>
                </li>
                <li>
                  <a href="#solutions" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Cơ quan & Giáo dục' : 'Agencies & Education'}
                  </a>
                </li>
                <li>
                  <a href="#templates" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Thư viện mẫu quy trình' : 'Template Library'}
                  </a>
                </li>
                <li>
                  <a href="#integrations" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Tích hợp & Kết nối' : 'Integrations'}
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Tài nguyên & Doanh nghiệp (Resources & Company) */}
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 pb-1 border-b border-white/[0.08]">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <h4 className="font-black text-white text-xs uppercase tracking-wider">
                  {isVietnamese ? 'Tài nguyên' : 'Resources'}
                </h4>
              </div>
              <ul className="space-y-2.5 text-[11.5px] font-medium">
                <li>
                  <a href="#about" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Về chúng tôi' : 'About Apexa'}
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Bảng giá & Gói dịch vụ' : 'Pricing Plans'}
                  </a>
                </li>
                <li>
                  <a href="#testimonials" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Khách hàng tiêu biểu' : 'Customer Stories'}
                  </a>
                </li>
                <li>
                  <a href="#faq" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Hướng dẫn & Hỏi đáp' : 'Guides & FAQ'}
                  </a>
                </li>
                <li>
                  <a href="#developers" className="text-slate-400 hover:text-white transition-colors">
                    Developers & API Docs
                  </a>
                </li>
                <li>
                  <a href="#blog" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Blog Năng suất & AI' : 'Productivity & AI Blog'}
                  </a>
                </li>
                <li>
                  <a href="#careers" className="text-slate-400 hover:text-white flex items-center justify-between group transition-colors">
                    <span>{isVietnamese ? 'Tuyển dụng' : 'Careers'}</span>
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">Hiring</span>
                  </a>
                </li>
                <li>
                  <a href="#status" className="text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{isVietnamese ? 'Trạng thái hệ thống' : 'System Status'}</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: Bản tin & Nhận tư vấn (Newsletter & Direct Contact) */}
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 pb-1 border-b border-white/[0.08]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <h4 className="font-black text-white text-xs uppercase tracking-wider">
                  {isVietnamese ? 'Bản tin công nghệ' : 'Newsletter'}
                </h4>
              </div>

              <p className="text-slate-400 text-[11px] leading-relaxed font-normal">
                {isVietnamese
                  ? 'Nhận cẩm nang quản trị, thông báo tính năng mới và xu hướng AI hàng tuần.'
                  : 'Weekly productivity digest, AI workflow tips, and new feature releases.'}
              </p>

              {/* Newsletter Form */}
              <form onSubmit={handleNewsletterSubmit} className="space-y-2" noValidate>
                <label htmlFor="footer-newsletter-email" className="sr-only">
                  {isVietnamese ? 'Email nhận bản tin' : 'Newsletter email'}
                </label>
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <input
                      id="footer-newsletter-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={newsletterEmail}
                      onChange={(event) => {
                        setNewsletterEmail(event.target.value);
                        if (newsletterStatus.type !== 'loading') setNewsletterStatus({ type: 'idle', message: '' });
                      }}
                      placeholder={isVietnamese ? 'Nhập email làm việc...' : 'Enter work email...'}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-white/10 bg-white/[0.05] text-xs outline-none text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                    <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
                  </div>

                  {/* Anti-bot Honeypot */}
                  <input
                    type="text"
                    tabIndex={-1}
                    aria-hidden="true"
                    autoComplete="off"
                    value={newsletterCompany}
                    onChange={(event) => setNewsletterCompany(event.target.value)}
                    className="absolute -left-[10000px] h-px w-px opacity-0"
                    name="company_field"
                  />

                  <Button
                    variant="primary"
                    size="sm"
                    pill
                    type="submit"
                    disabled={newsletterStatus.type === 'loading'}
                    className="w-full justify-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold shadow-md shadow-indigo-600/20"
                  >
                    {newsletterStatus.type === 'loading'
                      ? (isVietnamese ? 'Đang đăng ký...' : 'Subscribing...')
                      : (isVietnamese ? 'Đăng ký nhận tin' : 'Subscribe Free')}
                  </Button>
                </div>

                {newsletterStatus.message && (
                  <p
                    role={newsletterStatus.type === 'error' ? 'alert' : 'status'}
                    aria-live="polite"
                    className={`text-[10px] font-bold ${newsletterStatus.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}
                  >
                    {newsletterStatus.message}
                  </p>
                )}
              </form>

              <div className="pt-2 text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                <span>{isVietnamese ? 'Bảo mật 100%. Hủy bất kỳ lúc nào.' : 'Zero spam. Unsubscribe anytime.'}</span>
              </div>

              {/* Direct Demo / Contact Button */}
              {onSignUp && (
                <div className="pt-2">
                  <button
                    onClick={onSignUp}
                    className="w-full py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>{isVietnamese ? 'Yêu cầu Demo Doanh nghiệp' : 'Book Enterprise Demo'}</span>
                    <ArrowUp className="w-3 h-3 text-indigo-400 rotate-45" />
                  </button>
                </div>
              )}

            </div>

          </div>

        </div>
      </div>

      {/* =========================================================================
          BOTTOM COPYRIGHT & UTILITY BAR
          ========================================================================= */}
      <div className="border-t border-white/[0.08] bg-[#07090e] py-6">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11.5px] text-slate-400 font-medium">
          
          {/* Left: Copyright & Legal Slugs */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-center sm:text-left">
            <p className="text-slate-400">
              © {new Date().getFullYear()} Apexa OS Corporation. {isVietnamese ? 'Tất cả quyền được bảo lưu.' : 'All rights reserved.'}
            </p>
            <div className="flex items-center gap-4 text-slate-400">
              <Link href="/legal/terms" className="hover:text-white transition-colors underline-offset-4 hover:underline">
                {isVietnamese ? 'Điều khoản dịch vụ' : 'Terms'}
              </Link>
              <Link href="/legal/privacy" className="hover:text-white transition-colors underline-offset-4 hover:underline">
                {isVietnamese ? 'Chính sách bảo mật' : 'Privacy'}
              </Link>
              <Link href="/legal/security" className="hover:text-white transition-colors underline-offset-4 hover:underline">
                {isVietnamese ? 'Trung tâm an toàn' : 'Security'}
              </Link>
            </div>
          </div>

          {/* Center: Available Platforms Badge */}
          <div className="hidden lg:flex items-center gap-2 text-[10.5px] font-bold text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>Web App · macOS · Windows · iOS · Android</span>
          </div>

          {/* Right: Language, Theme & Scroll to Top Button */}
          <div className="flex items-center gap-3">
            <LanguageDropdown showLabel={true} size="sm" />
            <ThemeSwitch />
            <button
              onClick={scrollToTop}
              title={isVietnamese ? 'Cuộn lên đầu trang' : 'Scroll to top'}
              aria-label={isVietnamese ? 'Cuộn lên đầu trang' : 'Scroll to top'}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer group shadow-2xs"
            >
              <ArrowUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>

        </div>
      </div>

    </footer>
  );
}

export default LandingFooter;
