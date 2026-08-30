"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { ApexaLogoIcon } from "@/components/ApexaLogo";

interface LandingFooterProps {
  onSignUp?: () => void;
  onSignIn?: () => void;
}

export default function LandingFooter({ onSignUp }: LandingFooterProps) {
  const { isVietnamese } = useTranslation();
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const submitNewsletter = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), company }),
      });
      if (!response.ok) throw new Error("Newsletter request failed");
      setStatus("success");
      setEmail("");
      setMessage(isVietnamese ? "Đã đăng ký thành công. Hẹn gặp bạn trong bản tin tiếp theo!" : "You're subscribed! See you in the next edition.");
    } catch {
      setStatus("error");
      setMessage(isVietnamese ? "Chưa thể đăng ký lúc này. Vui lòng thử lại." : "We couldn't subscribe you yet. Please try again.");
    }
  };

  const navGroups = isVietnamese ? [
    {
      title: "Sản phẩm",
      links: [
        { label: "Công việc & Sprint", href: "#features" },
        { label: "Tài liệu & Whiteboard", href: "#features" },
        { label: "CRM & Khách hàng", href: "#features" },
        { label: "Apexa Brain AI", href: "#features" },
      ],
    },
    {
      title: "Giải pháp",
      links: [
        { label: "Bảng giá linh hoạt", href: "#pricing" },
        { label: "So sánh tính năng", href: "#comparison" },
        { label: "Đo lường ROI", href: "#roi" },
        { label: "Quy trình triển khai", href: "#how-it-works" },
      ],
    },
    {
      title: "Tài nguyên",
      links: [
        { label: "Trung tâm trợ giúp", href: "mailto:contact@apexa.vn" },
        { label: "Tư vấn doanh nghiệp", href: "mailto:contact@apexa.vn?subject=Apexa%20Enterprise" },
        { label: "Trạng thái hệ thống", href: "/api/health" },
        { label: "Câu hỏi thường gặp", href: "#faq" },
      ],
    },
    {
      title: "Pháp lý & Bảo mật",
      links: [
        { label: "Điều khoản dịch vụ", href: "/legal/terms" },
        { label: "Chính sách bảo mật", href: "/legal/privacy" },
        { label: "Bảo mật AES-256", href: "/legal/security" },
        { label: "Tiêu chuẩn ISO-27001", href: "/legal/security" },
      ],
    },
  ] : [
    {
      title: "Product",
      links: [
        { label: "Tasks & Sprints", href: "#features" },
        { label: "Docs & Whiteboard", href: "#features" },
        { label: "CRM & Customers", href: "#features" },
        { label: "Apexa Brain AI", href: "#features" },
      ],
    },
    {
      title: "Solutions",
      links: [
        { label: "Pricing Plans", href: "#pricing" },
        { label: "Feature Comparison", href: "#comparison" },
        { label: "ROI Calculator", href: "#roi" },
        { label: "Deployment Flow", href: "#how-it-works" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Help Center", href: "mailto:contact@apexa.vn" },
        { label: "Enterprise Inquiries", href: "mailto:contact@apexa.vn?subject=Apexa%20Enterprise" },
        { label: "System Status", href: "/api/health" },
        { label: "FAQ Knowledge Hub", href: "#faq" },
      ],
    },
    {
      title: "Legal & Trust",
      links: [
        { label: "Terms of Service", href: "/legal/terms" },
        { label: "Privacy Policy", href: "/legal/privacy" },
        { label: "AES-256 Security", href: "/legal/security" },
        { label: "ISO-27001 Compliance", href: "/legal/security" },
      ],
    },
  ];

  return (
    <footer className="relative z-10 w-full px-1.5 sm:px-3 lg:px-4 pb-2 sm:pb-3 pt-1 select-none">
      
      {/* Outer Floating Full-Width Card with Subtle Rounded White Border (No Shadow) */}
      <div className="relative w-full rounded-xl sm:rounded-2xl border border-white/20 dark:border-white/15 bg-gradient-to-b from-[#0c1424] via-[#090f1c] to-[#050811] p-6 sm:p-10 lg:p-12 backdrop-blur-3xl overflow-hidden text-white">
        
        {/* Top Edge Metallic Glow Highlight */}
        <div className="absolute top-0 inset-x-16 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        {/* Ambient Aurora Flares */}
        <div className="pointer-events-none absolute -top-32 left-1/4 h-80 w-80 rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 right-1/4 h-80 w-80 rounded-full bg-sky-500/10 blur-[120px]" />

        {/* High-Tech Dotted Matrix Texture */}
        <div 
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Inner Content Wrapper */}
        <div className="relative z-10 max-w-[1680px] mx-auto space-y-12">
          {/* Main Grid Content */}
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1.9fr] lg:gap-16">
            
            {/* Brand & Value Proposition Column */}
            <div className="max-w-[420px] space-y-5">
              <div className="flex items-center gap-3">
                <ApexaLogoIcon className="h-8 w-8" variant="white" />
                <span className="text-2xl font-black tracking-[-0.035em] font-display text-white">
                  Apexa
                </span>
              </div>

              <p className="text-[13px] leading-relaxed text-slate-300 font-medium">
                {isVietnamese 
                  ? "Hệ điều hành năng suất hợp nhất cho công việc, tài liệu số, quản trị khách hàng, dòng tiền và quyết định thông minh cùng AI." 
                  : "The unified productivity operating system for work, collaborative docs, CRM, cash flow, and intelligent AI decisions."}
              </p>

              <div className="pt-1 flex items-center gap-3">
                <button 
                  onClick={onSignUp} 
                  className="group inline-flex h-10.5 items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 px-5 text-xs font-black text-white hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span>{isVietnamese ? "Tạo workspace miễn phí" : "Create free workspace"}</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>

            {/* 4-Column Navigation Links Grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
              {navGroups.map((group) => (
                <div key={group.title} className="space-y-3.5">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 font-display">
                    {group.title}
                  </h3>
                  <ul className="space-y-2.5">
                    {group.links.map((link) => (
                      <li key={link.label}>
                        <Link 
                          href={link.href} 
                          className="group/link inline-flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-sky-300 transition-colors"
                        >
                          <span>{link.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Integrated Newsletter Hub */}
          <div className="relative grid gap-6 rounded-2xl sm:rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7 backdrop-blur-xl lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-black text-white font-display">
                <Mail className="h-4 w-4 text-sky-400" />
                <span>{isVietnamese ? "Bản tin Năng suất & AI Quản trị" : "Modern Operations & AI Newsletter"}</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                {isVietnamese 
                  ? "Mỗi tháng một bản tin chọn lọc về phương pháp quản trị hiện đại, AI thực chiến và cập nhật mới nhất. Không spam." 
                  : "Curated monthly insights on modern operations, applied AI, and product releases. No spam."}
              </p>
            </div>

            <form onSubmit={submitNewsletter} className="w-full lg:w-[410px]">
              <div className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor="footer-email" className="sr-only">Email</label>
                <input
                  id="footer-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={isVietnamese ? "Nhập email công việc của bạn..." : "Enter your work email..."}
                  className="h-11 min-w-0 flex-1 rounded-full border border-white/15 bg-black/40 px-4 text-xs text-white outline-none placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 transition-all"
                />
                <input 
                  aria-hidden="true" 
                  tabIndex={-1} 
                  autoComplete="off" 
                  value={company} 
                  onChange={(event) => setCompany(event.target.value)} 
                  className="absolute -left-[9999px] h-px w-px opacity-0" 
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="h-11 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 px-5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50 cursor-pointer shrink-0 transition-all active:scale-[0.98]"
                >
                  {status === "loading" 
                    ? (isVietnamese ? "Đang gửi..." : "Sending...") 
                    : (isVietnamese ? "Đăng ký nhận tin" : "Subscribe")}
                </button>
              </div>
              {message && (
                <p 
                  role={status === "error" ? "alert" : "status"} 
                  className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${status === "error" ? "text-rose-400" : "text-emerald-400"}`}
                >
                  {status === "success" && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {message}
                </p>
              )}
            </form>
          </div>

          {/* Sub-footer Clean Bar */}
          <div className="flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-slate-400">
            <span>© {new Date().getFullYear()} Apexa Inc. All rights reserved.</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
