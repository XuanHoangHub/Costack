"use client";

import React, { useCallback, useMemo } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Download,
  FileCheck2,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import type { PayOSCheckoutData, PaymentReceipt } from '@/components/billing/PayOSCheckout';

type PaymentSuccessProps = {
  checkout: PayOSCheckoutData;
  receipt?: PaymentReceipt | null;
  planName: string;
  isVietnamese: boolean;
  onClose: () => void;
};

const unlockedByPlan = {
  starter: ['Spaces không giới hạn', 'Calendar & Gantt', 'Toàn bộ Apexa AI · 150 lượt/tháng', 'Tự động hóa cơ bản'],
  pro: ['Apexa AI · 2.000 lượt/tháng', 'CRM, ERP & Finance', 'Báo cáo nâng cao', 'Time tracking & KPI'],
  business: ['Phân quyền nâng cao', 'Portfolio & Workload', 'API & Webhook', 'Hỗ trợ ưu tiên'],
} as const;

export function PaymentSuccess({ checkout, receipt, planName, isVietnamese, onClose }: PaymentSuccessProps) {
  const locale = isVietnamese ? 'vi-VN' : 'en-US';
  const amount = useMemo(() => new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: receipt?.currency || 'VND',
    maximumFractionDigits: 0,
  }).format(receipt?.amount || checkout.amount), [checkout.amount, locale, receipt?.amount, receipt?.currency]);
  const paidAt = useMemo(() => receipt?.paidAt ? new Date(receipt.paidAt) : new Date(), [receipt?.paidAt]);
  const periodEnd = useMemo(() => receipt?.periodEnd ? new Date(receipt.periodEnd) : null, [receipt?.periodEnd]);

  const downloadReceipt = useCallback(() => {
    const lines = isVietnamese ? [
      'BIÊN NHẬN THANH TOÁN APEXA',
      `Mã đơn: #${checkout.orderCode}`,
      `Gói: Apexa ${planName}`,
      `Chu kỳ: ${checkout.cycle === 'yearly' ? '12 tháng' : '1 tháng'}`,
      `Số tiền: ${amount}`,
      `Thanh toán lúc: ${paidAt.toLocaleString(locale)}`,
      `Mã giao dịch: ${receipt?.reference || 'Đã xác minh bởi PayOS'}`,
      `Hiệu lực đến: ${periodEnd ? periodEnd.toLocaleDateString(locale) : 'Đang cập nhật'}`,
      '',
      'Trạng thái: ĐÃ THANH TOÁN · GÓI ĐÃ KÍCH HOẠT',
    ] : [
      'APEXA PAYMENT RECEIPT',
      `Order: #${checkout.orderCode}`,
      `Plan: Apexa ${planName}`,
      `Cycle: ${checkout.cycle === 'yearly' ? '12 months' : '1 month'}`,
      `Amount: ${amount}`,
      `Paid at: ${paidAt.toLocaleString(locale)}`,
      `Reference: ${receipt?.reference || 'Verified by PayOS'}`,
      `Active until: ${periodEnd ? periodEnd.toLocaleDateString(locale) : 'Updating'}`,
      '',
      'Status: PAID · PLAN ACTIVATED',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Apexa-receipt-${checkout.orderCode}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }, [amount, checkout.cycle, checkout.orderCode, isVietnamese, locale, paidAt, periodEnd, planName, receipt?.reference]);

  return (
    <div className="relative min-h-[min(760px,92vh)] overflow-y-auto bg-[#f8fafc] dark:bg-slate-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,#c7d2fe_0,rgba(224,231,255,.7)_28%,transparent_70%)] dark:bg-[radial-gradient(circle_at_top,rgba(79,70,229,.35)_0,transparent_68%)]" />
      <button
        type="button"
        onClick={onClose}
        aria-label={isVietnamese ? 'Đóng' : 'Close'}
        className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-2xl border border-white/70 bg-white/80 text-slate-500 shadow-sm backdrop-blur transition hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 py-10 sm:px-8 sm:py-14">
        <div className="relative">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
          <span className="relative grid h-20 w-20 place-items-center rounded-full border-[6px] border-white bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-xl shadow-emerald-500/25 dark:border-slate-950">
            <Check className="h-9 w-9 stroke-[3]" />
          </span>
        </div>

        <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
          <BadgeCheck className="h-3.5 w-3.5" />
          {isVietnamese ? 'Đã xác minh bởi PayOS' : 'Verified by PayOS'}
        </span>
        <h2 className="mt-4 max-w-2xl text-center text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
          {isVietnamese ? 'Thanh toán thành công!' : 'Payment successful!'}
        </h2>
        <p className="mt-2 max-w-xl text-center text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
          {isVietnamese
            ? `Gói Apexa ${planName} đã được kích hoạt. Mọi quyền lợi mới đã sẵn sàng trên tài khoản của bạn.`
            : `Apexa ${planName} is active. Your new plan benefits are ready on this account.`}
        </p>

        <div className="mt-8 grid w-full gap-4 lg:grid-cols-[1.05fr_.95fr]">
          <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_24px_70px_-35px_rgba(15,23,42,.35)] dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                <ReceiptText className="h-4 w-4 text-indigo-600" />
                {isVietnamese ? 'Biên nhận thanh toán' : 'Payment receipt'}
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                {isVietnamese ? 'Đã thanh toán' : 'Paid'}
              </span>
            </div>
            <div className="p-5 sm:p-6">
              <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-900 p-5 text-white">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300">Apexa {planName}</div>
                <div className="mt-1 text-3xl font-black tracking-tight">{amount}</div>
                <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <CalendarCheck2 className="h-3.5 w-3.5 text-emerald-400" />
                  {checkout.cycle === 'yearly'
                    ? (isVietnamese ? 'Chu kỳ 12 tháng' : '12-month billing cycle')
                    : (isVietnamese ? 'Chu kỳ 1 tháng' : 'Monthly billing cycle')}
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-xs">
                <div><dt className="font-bold text-slate-400">{isVietnamese ? 'Mã đơn hàng' : 'Order ID'}</dt><dd className="mt-1 font-mono font-black text-slate-800 dark:text-slate-200">#{checkout.orderCode}</dd></div>
                <div><dt className="font-bold text-slate-400">{isVietnamese ? 'Thời gian' : 'Paid at'}</dt><dd className="mt-1 font-black text-slate-800 dark:text-slate-200">{paidAt.toLocaleString(locale)}</dd></div>
                <div><dt className="font-bold text-slate-400">{isVietnamese ? 'Hiệu lực đến' : 'Active until'}</dt><dd className="mt-1 font-black text-slate-800 dark:text-slate-200">{periodEnd ? periodEnd.toLocaleDateString(locale) : '—'}</dd></div>
                <div><dt className="font-bold text-slate-400">{isVietnamese ? 'Phương thức' : 'Method'}</dt><dd className="mt-1 font-black text-slate-800 dark:text-slate-200">{checkout.method === 'momo' ? 'MoMo · VietQR' : 'PayOS · VietQR'}</dd></div>
              </dl>
              <button type="button" onClick={downloadReceipt} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <Download className="h-3.5 w-3.5" />
                {isVietnamese ? 'Tải biên nhận' : 'Download receipt'}
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-35px_rgba(15,23,42,.35)] dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
              <Sparkles className="h-4 w-4 text-amber-500" />
              {isVietnamese ? 'Quyền lợi vừa mở khóa' : 'Newly unlocked'}
            </div>
            <div className="mt-4 space-y-2.5">
              {unlockedByPlan[checkout.plan].map((feature) => (
                <div key={feature} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /></span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{feature}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-xs font-semibold leading-relaxed text-indigo-800 dark:border-indigo-900/70 dark:bg-indigo-950/40 dark:text-indigo-200">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              {isVietnamese ? 'Quyền truy cập đã được cập nhật phía máy chủ và áp dụng ngay trên mọi thiết bị.' : 'Access was updated server-side and applies immediately on every device.'}
            </div>
          </section>
        </div>

        <button type="button" onClick={onClose} className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-7 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5 hover:shadow-xl">
          <FileCheck2 className="h-4 w-4" />
          {isVietnamese ? 'Bắt đầu sử dụng Apexa' : 'Start using Apexa'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
