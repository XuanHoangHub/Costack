"use client";

import React from 'react';
import { ArrowRight, BadgeCheck, CalendarCheck2, CheckCircle2, CreditCard, ReceiptText, ShieldCheck, Sparkles, X } from 'lucide-react';
import type { BillingCycle, SelfServeBillingPlan } from '@/lib/billing/plans';

const benefits: Record<SelfServeBillingPlan, string[]> = {
  starter: ['Không gian làm việc không giới hạn', 'Calendar & Gantt', 'AI workspace'],
  pro: ['Costack AI nâng cao', 'CRM, ERP & Finance', 'Báo cáo & tự động hóa nâng cao'],
  business: ['Phân quyền nâng cao', 'Portfolio & Workload', 'API, Webhook & hỗ trợ ưu tiên'],
};

export function CardPaymentSuccess({
  plan,
  cycle,
  periodEnd,
  isVietnamese,
  onClose,
  onManage,
}: {
  plan: SelfServeBillingPlan;
  cycle: BillingCycle;
  periodEnd?: string;
  isVietnamese: boolean;
  onClose: () => void;
  onManage: () => void;
}) {
  const locale = isVietnamese ? 'vi-VN' : 'en-US';
  const name = plan === 'starter' ? 'Starter' : plan === 'business' ? 'Business' : 'Pro';
  return (
    <div className="relative min-h-[620px] overflow-hidden bg-[#f8fafc] px-5 py-12 dark:bg-slate-950 sm:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(129,140,248,.28),transparent_68%)]" />
      <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white/80 text-slate-500 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300" aria-label={isVietnamese ? 'Đóng' : 'Close'}><X className="h-4 w-4" /></button>
      <div className="relative mx-auto max-w-3xl text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-[6px] border-white bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-xl shadow-emerald-500/25 dark:border-slate-950"><CheckCircle2 className="h-9 w-9" /></div>
        <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"><BadgeCheck className="h-3.5 w-3.5" />Stripe verified</span>
        <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">{isVietnamese ? 'Gói đã được kích hoạt!' : 'Your plan is active!'}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">{isVietnamese ? `Costack ${name} đã được đồng bộ phía máy chủ. Bạn có thể dùng ngay toàn bộ quyền lợi trên mọi thiết bị.` : `Costack ${name} was synchronized server-side. All benefits are now available on every device.`}</p>

        <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><ReceiptText className="h-4 w-4 text-indigo-600" />{isVietnamese ? 'Đăng ký của bạn' : 'Your subscription'}</div>
            <div className="mt-4 rounded-2xl bg-gradient-to-br from-slate-950 to-indigo-950 p-5 text-white">
              <div className="text-[10px] font-bold uppercase tracking-[.18em] text-indigo-300">Costack {name}</div>
              <div className="mt-1 text-2xl font-black">{cycle === 'yearly' ? (isVietnamese ? '12 tháng' : '12 months') : (isVietnamese ? 'Hàng tháng' : 'Monthly')}</div>
              <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-300"><CalendarCheck2 className="h-3.5 w-3.5 text-emerald-400" />{periodEnd ? `${isVietnamese ? 'Kỳ tiếp theo' : 'Next billing'}: ${new Date(periodEnd).toLocaleDateString(locale)}` : (isVietnamese ? 'Đang cập nhật kỳ tiếp theo' : 'Next billing date is updating')}</div>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-[11px] font-semibold leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-300"><CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />{isVietnamese ? 'Stripe sẽ gửi hóa đơn điện tử tới email thanh toán của bạn.' : 'Stripe will email the official receipt to your billing email.'}</div>
          </section>
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><Sparkles className="h-4 w-4 text-amber-500" />{isVietnamese ? 'Đã mở khóa' : 'Unlocked'}</div>
            <div className="mt-4 space-y-2.5">{benefits[plan].map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-800/50"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /><span className="text-xs font-bold text-slate-700 dark:text-slate-200">{item}</span></div>)}</div>
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3 text-[11px] font-semibold text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200"><ShieldCheck className="h-4 w-4 shrink-0" />{isVietnamese ? 'Bạn có thể đổi phương thức, xem hóa đơn hoặc hủy gia hạn trong Billing Portal.' : 'Change payment details, view invoices, or cancel renewal in Billing Portal.'}</div>
          </section>
        </div>
        <div className="mt-7 flex flex-col justify-center gap-2.5 sm:flex-row">
          <button type="button" onClick={onClose} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-7 text-sm font-black text-white shadow-lg shadow-indigo-500/25">{isVietnamese ? 'Bắt đầu sử dụng' : 'Start using Costack'}<ArrowRight className="h-4 w-4" /></button>
          <button type="button" onClick={onManage} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"><CreditCard className="h-4 w-4" />{isVietnamese ? 'Quản lý thanh toán' : 'Manage billing'}</button>
        </div>
      </div>
    </div>
  );
}
