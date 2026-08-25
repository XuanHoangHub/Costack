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
                  {isVietnamese ? 'Bộ nhớ đệm trên thiết bị' : 'On-device cache'}
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
                  {isVietnamese ? 'Bảo mật theo thiết kế' : 'Security by design'}
                </p>
                <p className="text-[11px] text-slate-400 font-medium truncate">
                  {isVietnamese ? 'HTTPS · RLS · Server-only secrets' : 'HTTPS · RLS · Server-only secrets'}
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
                  {isVietnamese ? 'Gemini AI · Việt & Anh' : 'Gemini AI · English & Vietnamese'}
                </p>
              </div>
            </div>

            {/* 4. Service health */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-sky-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                <Server className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-xs font-black text-white truncate">
                    {isVietnamese ? 'Health check tích hợp' : 'Built-in health check'}
                  </p>
                </div>
                <p className="text-[11px] text-slate-400 font-medium truncate">
                  {isVietnamese ? 'Sẵn sàng cho giám sát uptime' : 'Ready for uptime monitoring'}
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
              
              <Link href="/legal/security" className="inline-flex items-center gap-2.5 bg-[#0052a3]/90 hover:bg-[#0052a3] text-white px-3 py-1.5 rounded-xl border border-sky-400/40 shadow-sm transition-all">
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs">
                  <svg className="w-4 h-4 text-[#0052a3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#0052a3" stroke="none" />
                    <path d="M9 12l2 2 4-4" stroke="#ffffff" strokeWidth="2.5" />
                  </svg>
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[7.5px] font-black uppercase tracking-wider text-sky-200">SECURITY CENTER</span>
                  <span className="text-[9px] font-black uppercase tracking-tight text-white">{isVietnamese ? 'PHẠM VI KIỂM SOÁT' : 'CONTROL SCOPE'}</span>
                </div>
              </Link>

              {/* Contact channels */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <a href="mailto:contact@apexa.vn" className="inline-flex h-8 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-bold text-slate-300 transition hover:border-indigo-400/50 hover:text-white">
                  <Mail className="h-3.5 w-3.5" /> contact@apexa.vn
                </a>
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
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xs">AI</span>
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
                  <a href="#testimonials" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Quản trị hợp nhất (Unified OS)' : 'Unified Workspace'}
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Doanh nghiệp Quy mô lớn' : 'Enterprise Scale'}
                  </a>
                </li>
                <li>
                  <a href="#testimonials" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Đội ngũ Công nghệ & Agile' : 'Tech & Agile Squads'}
                  </a>
                </li>
                <li>
                  <a href="#testimonials" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Kinh doanh & Tiếp thị' : 'Sales & Marketing'}
                  </a>
                </li>
                <li>
                  <a href="#testimonials" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Cơ quan & Giáo dục' : 'Agencies & Education'}
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Thư viện mẫu quy trình' : 'Template Library'}
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-slate-400 hover:text-white transition-colors">
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
                  <a href="#features" className="text-slate-400 hover:text-white transition-colors">
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
                  <Link href="/legal/security" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Trung tâm bảo mật' : 'Security Center'}
                  </Link>
                </li>
                <li>
                  <Link href="/legal/privacy" className="text-slate-400 hover:text-white transition-colors">
                    {isVietnamese ? 'Quyền riêng tư' : 'Privacy'}
                  </Link>
                </li>
                <li>
                  <a href="mailto:contact@apexa.vn?subject=Apexa%20OS" className="text-slate-400 hover:text-white flex items-center justify-between group transition-colors">
                    <span>{isVietnamese ? 'Liên hệ' : 'Contact'}</span>
                  </a>
                </li>
                <li>
                  <a href="/api/health" className="text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors">
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
                <span>{isVietnamese ? 'Không gửi spam. Có thể hủy đăng ký.' : 'No spam. Unsubscribe anytime.'}</span>
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
