"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  CreditCard,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useTranslation } from '@/contexts/TranslationContext';

type BillingCycle = 'monthly' | 'yearly';
type Entitlement = {
  plan: 'free' | 'pro' | 'enterprise';
  status: string;
  billing_cycle?: BillingCycle;
  is_pro: boolean;
  cancel_at_period_end?: boolean;
  current_period_end?: string;
  trial_end?: string;
};
type BillingPrice = {
  cycle: BillingCycle;
  unit_amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  interval_count: number;
};

export interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { isPremium?: boolean } | null;
  onEntitlementChange?: (entitlement: Entitlement) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
  addSyncLog?: (log: string) => void;
}

const zeroDecimalCurrencies = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf']);

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, currentUser, onEntitlementChange, triggerToast, addSyncLog }) => {
  const { isVietnamese } = useTranslation();
  const dialogRef = useRef<HTMLElement>(null);
  const proFeatures = isVietnamese ? [
    'Không giới hạn thành viên, Space và dự án',
    'Apexa AI, Automation và báo cáo nâng cao',
    'Gantt, time tracking và export dữ liệu',
    'Lịch sử hoạt động và quyền Workspace nâng cao',
    'Hỗ trợ ưu tiên và quản lý thanh toán tập trung',
  ] : [
    'Unlimited members, spaces, and projects',
    'Apexa AI, Automations, and advanced reports',
    'Gantt charts, time tracking, and data export',
    'Activity history & advanced workspace permissions',
    'Priority support & unified billing',
  ];
  const [cycle, setCycle] = useState<BillingCycle>('yearly');
  const [entitlement, setEntitlement] = useState<Entitlement>({
    plan: currentUser?.isPremium ? 'pro' : 'free',
    status: currentUser?.isPremium ? 'active' : 'inactive',
    is_pro: Boolean(currentUser?.isPremium),
  });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [prices, setPrices] = useState<Partial<Record<BillingCycle, BillingPrice>>>({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [error, setError] = useState('');

  const authorizedFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error(isVietnamese ? 'Vui lòng đăng nhập để quản lý gói.' : 'Please sign in to manage your plan.');
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...(init?.headers || {}),
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || (isVietnamese ? 'Không thể kết nối hệ thống thanh toán.' : 'Unable to connect to billing.'));
    return body;
  }, [isVietnamese]);

  const refreshEntitlement = useCallback(async () => {
    setChecking(true);
    try {
      const body = await authorizedFetch('/api/billing/subscription');
      setEntitlement(body.entitlement);
      onEntitlementChange?.(body.entitlement);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : (isVietnamese ? 'Không thể kiểm tra trạng thái gói.' : 'Unable to check your plan.'));
    } finally {
      setChecking(false);
    }
  }, [authorizedFetch, isVietnamese, onEntitlementChange]);

  const refreshPrices = useCallback(async () => {
    setPricesLoading(true);
    try {
      const response = await fetch('/api/billing/plans', { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || (isVietnamese ? 'Bảng giá chưa được cấu hình.' : 'Pricing has not been configured.'));
      setPrices(body.prices || {});
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : (isVietnamese ? 'Không thể tải bảng giá.' : 'Unable to load pricing.'));
    } finally {
      setPricesLoading(false);
    }
  }, [isVietnamese]);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    const pendingCycle = window.localStorage.getItem('apexa_pending_upgrade_cycle');
    if (pendingCycle === 'monthly' || pendingCycle === 'yearly') setCycle(pendingCycle);
    window.localStorage.removeItem('apexa_pending_upgrade_cycle');
    void Promise.all([refreshEntitlement(), refreshPrices()]);
  }, [isOpen, refreshEntitlement, refreshPrices]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  const redirectToBilling = async (endpoint: string, body?: object) => {
    setLoading(true);
    setError('');
    try {
      const data = await authorizedFetch(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
      if (data?.url) {
        addSyncLog?.(endpoint.includes('portal') ? 'Opened secure billing portal' : `Started Pro ${cycle} checkout`);
        window.location.assign(data.url);
        return;
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : (isVietnamese ? 'Không thể kết nối hệ thống thanh toán.' : 'Unable to connect to billing.');
      setError(message);
      triggerToast?.('error', isVietnamese ? 'Thanh toán chưa hoàn tất' : 'Billing not completed', message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrimaryAction = () => {
    if (entitlement.status === 'incomplete' || entitlement.status === 'unpaid' || entitlement.status === 'past_due') {
      void redirectToBilling('/api/billing/portal');
      return;
    }
    void redirectToBilling('/api/billing/checkout', { cycle });
  };

  const isPro = entitlement.is_pro;
  const hasBillingIssue = !isPro && ['incomplete', 'unpaid', 'past_due'].includes(entitlement.status);
  const selectedPrice = prices[cycle];
  const monthlyEquivalent = selectedPrice
    ? selectedPrice.unit_amount / (selectedPrice.interval === 'year' ? 12 * selectedPrice.interval_count : selectedPrice.interval_count)
    : null;
  const numberLocale = isVietnamese ? 'vi-VN' : 'en-US';
  const formatMoney = (amount: number, currency: string) => new Intl.NumberFormat(numberLocale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount / (zeroDecimalCurrencies.has(currency.toLowerCase()) ? 1 : 100));
  const monthlyPrice = prices.monthly;
  const yearlyPrice = prices.yearly;
  const annualSaving = monthlyPrice && yearlyPrice && monthlyPrice.currency === yearlyPrice.currency
    ? Math.max(0, Math.round((1 - yearlyPrice.unit_amount / (monthlyPrice.unit_amount * 12)) * 100))
    : 0;
  const renewalDate = entitlement.current_period_end
    ? new Intl.DateTimeFormat(numberLocale, { dateStyle: 'medium' }).format(new Date(entitlement.current_period_end))
    : null;
  const statusLabel = isPro
    ? (isVietnamese ? 'Đang hoạt động' : 'Active')
    : (isVietnamese ? 'Gói miễn phí' : 'Free plan');

  return (
    <AnimatePresence>
      {isOpen && (
      <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto p-3 sm:p-6 lg:items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => !loading && onClose()}
          className="fixed inset-0 cursor-pointer bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_42%),rgba(2,6,23,0.72)] backdrop-blur-md"
        />

        <motion.section
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pricing-modal-title"
          aria-describedby="pricing-modal-description"
          tabIndex={-1}
          initial={{ opacity: 0, y: 22, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="relative z-10 w-full max-w-[1040px] overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_36px_100px_-28px_rgba(2,6,23,0.68)] outline-none dark:border-white/10 dark:bg-slate-950 sm:rounded-[34px] lg:my-auto"
        >
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label={isVietnamese ? 'Đóng bảng giá' : 'Close pricing'}
            title={isVietnamese ? 'Đóng (Esc)' : 'Close (Esc)'}
            className="absolute right-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-full border border-slate-200/80 bg-white/85 text-slate-500 shadow-sm backdrop-blur transition hover:rotate-90 hover:bg-white hover:text-slate-950 disabled:cursor-wait disabled:opacity-50 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white sm:right-5 sm:top-5"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="grid lg:min-h-[630px] lg:grid-cols-[0.88fr_1.12fr]">
            <aside className="relative isolate overflow-hidden bg-[linear-gradient(145deg,#1d4ed8_0%,#0284c7_52%,#06b6d4_100%)] px-6 py-8 text-white sm:px-9 sm:py-10 lg:flex lg:flex-col lg:px-10 lg:py-11">
              <div className="pointer-events-none absolute -left-24 -top-20 -z-10 h-72 w-72 rounded-full bg-blue-300/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-32 -right-20 -z-10 h-80 w-80 rounded-full bg-cyan-200/25 blur-3xl" />
              <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.13] [background-image:linear-gradient(rgba(255,255,255,.45)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.45)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />

              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] shadow-sm backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5" /> Apexa Pro
                </div>
                <h2 id="pricing-modal-title" className="mt-6 max-w-sm text-[30px] font-extrabold leading-[1.08] tracking-[-0.04em] sm:text-[36px]">
                  {isVietnamese ? <>Làm việc nhanh hơn.<br />Vận hành thông minh hơn.</> : <>Move faster.<br />Operate smarter.</>}
                </h2>
                <p id="pricing-modal-description" className="mt-4 max-w-sm text-[13px] font-medium leading-6 text-blue-50/90">
                  {isVietnamese
                    ? 'Mở khóa toàn bộ công cụ để đội ngũ lập kế hoạch, cộng tác và tăng trưởng trong một workspace.'
                    : 'Unlock every tool your team needs to plan, collaborate, and grow in one workspace.'}
                </p>
              </div>

              <div className="mt-7 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
                {proFeatures.map((feature, index) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + index * 0.04 }}
                    className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2.5 text-[11px] font-semibold leading-5 text-white/95 backdrop-blur-sm"
                  >
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-300/20 text-emerald-200">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </span>
                    <span>{feature}</span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/15 pt-5 text-[10px] font-bold text-blue-50/85 lg:mt-auto">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Stripe Checkout</span>
                <span className="flex items-center gap-1.5"><LockKeyhole className="h-4 w-4" /> TLS {isVietnamese ? 'bảo mật' : 'encrypted'}</span>
              </div>
            </aside>

            <main className="relative px-5 py-7 sm:px-9 sm:py-9 lg:px-10 lg:py-10">
              <div className="flex items-start justify-between gap-4 pr-12">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
                    {isVietnamese ? 'Nâng cấp workspace' : 'Upgrade workspace'}
                  </p>
                  <h3 className="mt-1.5 text-xl font-extrabold tracking-[-0.025em] text-slate-950 dark:text-white sm:text-2xl">
                    {isPro
                      ? (isVietnamese ? 'Apexa Pro của bạn' : 'Your Apexa Pro plan')
                      : (isVietnamese ? 'Chọn chu kỳ thanh toán' : 'Choose a billing cycle')}
                  </h3>
                </div>
                <div aria-live="polite" className={`mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${isPro ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'}`}>
                  {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : isPro ? <BadgeCheck className="h-3.5 w-3.5" /> : null}
                  {checking ? (isVietnamese ? 'Đang kiểm tra' : 'Checking') : statusLabel}
                </div>
              </div>

              {isPro ? (
                <div className="mt-8 space-y-5">
                  <div className="relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-cyan-50 p-5 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-cyan-950/20 sm:p-6">
                    <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-emerald-300/25 blur-3xl" />
                    <div className="relative flex gap-4">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
                        <CalendarClock className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-extrabold text-emerald-950 dark:text-emerald-200">{isVietnamese ? 'Pro đang hoạt động' : 'Pro is active'}</p>
                        <p className="mt-1.5 text-[12px] font-medium leading-5 text-emerald-800/80 dark:text-emerald-300/80">
                          {entitlement.cancel_at_period_end
                            ? (isVietnamese ? `Quyền Pro còn hiệu lực đến ${renewalDate || 'hết chu kỳ hiện tại'}.` : `Pro benefits remain active until ${renewalDate || 'the end of this period'}.`)
                            : renewalDate
                              ? (isVietnamese ? `Gói sẽ tự động gia hạn vào ${renewalDate}.` : `Your plan renews automatically on ${renewalDate}.`)
                              : (isVietnamese ? 'Gói đã được xác thực an toàn với hệ thống thanh toán.' : 'Your plan has been securely verified with billing.')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">{isVietnamese ? 'Chu kỳ hiện tại' : 'Current billing'}</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{entitlement.billing_cycle === 'yearly' ? (isVietnamese ? 'Hàng năm' : 'Yearly') : (isVietnamese ? 'Hàng tháng' : 'Monthly')}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => redirectToBilling('/api/billing/portal')}
                    className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-xs font-extrabold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    {isVietnamese ? 'Quản lý thanh toán & hóa đơn' : 'Manage billing & invoices'}
                    {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                  </button>
                  <p className="text-center text-[10px] font-medium leading-5 text-slate-400">
                    {isVietnamese ? 'Đổi phương thức thanh toán, tải hóa đơn hoặc hủy gia hạn trong Customer Portal.' : 'Update payment details, download invoices, or cancel renewal in the Customer Portal.'}
                  </p>
                </div>
              ) : (
                <div className="mt-7">
                  <div role="radiogroup" aria-label={isVietnamese ? 'Chu kỳ thanh toán' : 'Billing cycle'} className="grid grid-cols-2 gap-2.5">
                    {(['monthly', 'yearly'] as BillingCycle[]).map((item) => {
                      const selected = cycle === item;
                      const yearly = item === 'yearly';
                      return (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          key={item}
                          onClick={() => setCycle(item)}
                          className={`relative cursor-pointer rounded-2xl border p-3.5 text-left transition sm:p-4 ${selected ? 'border-blue-500 bg-blue-50/80 shadow-[0_0_0_3px_rgba(59,130,246,0.10)] dark:border-blue-400 dark:bg-blue-950/25' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-900'}`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className={`text-xs font-extrabold ${selected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                              {yearly ? (isVietnamese ? 'Hàng năm' : 'Yearly') : (isVietnamese ? 'Hàng tháng' : 'Monthly')}
                            </span>
                            <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                              {selected && <Check className="h-2.5 w-2.5 stroke-[4]" />}
                            </span>
                          </span>
                          <span className="mt-1.5 block text-[10px] font-medium text-slate-400">
                            {yearly
                              ? annualSaving
                                ? (isVietnamese ? `Tiết kiệm ${annualSaving}% mỗi năm` : `Save ${annualSaving}% every year`)
                                : (isVietnamese ? 'Thanh toán một lần mỗi năm' : 'One payment per year')
                              : (isVietnamese ? 'Linh hoạt theo từng tháng' : 'Flexible month to month')}
                          </span>
                          {yearly && annualSaving > 0 && (
                            <span className="absolute -top-2 right-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-white shadow-sm">
                              {isVietnamese ? 'Tốt nhất' : 'Best value'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white shadow-sm dark:border-slate-800 dark:from-slate-900/80 dark:to-slate-950">
                    <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-3.5 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20"><Zap className="h-4 w-4 fill-current" /></span>
                        <div>
                          <p className="text-xs font-extrabold text-slate-950 dark:text-white">Apexa Pro</p>
                          <p className="text-[9px] font-medium text-slate-400">{isVietnamese ? 'Toàn bộ tính năng. Một gói duy nhất.' : 'Every feature. One simple plan.'}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-blue-700 dark:bg-blue-950 dark:text-blue-300">{isVietnamese ? 'Phổ biến' : 'Popular'}</span>
                    </div>

                    <div className="px-5 py-4 sm:px-6 sm:py-5" aria-live="polite">
                      {pricesLoading ? (
                        <div className="space-y-3" aria-label={isVietnamese ? 'Đang tải bảng giá' : 'Loading pricing'}>
                          <div className="flex items-end gap-2">
                            <div className="h-10 w-44 animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800" />
                            <div className="mb-1 h-4 w-14 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800" />
                          </div>
                          <div className="h-3 w-64 max-w-full animate-pulse rounded bg-slate-200/70 dark:bg-slate-800" />
                        </div>
                      ) : selectedPrice && monthlyEquivalent != null ? (
                        <motion.div key={cycle} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                          <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                            <span className="text-[34px] font-extrabold leading-none tracking-[-0.045em] text-slate-950 dark:text-white sm:text-[38px]">{formatMoney(monthlyEquivalent, selectedPrice.currency)}</span>
                            <span className="pb-1 text-[11px] font-bold text-slate-400">/ {isVietnamese ? 'tháng' : 'month'}</span>
                          </div>
                          <p className="mt-2 text-[10px] font-medium leading-5 text-slate-500 dark:text-slate-400">
                            {cycle === 'yearly'
                              ? (isVietnamese ? `Thanh toán ${formatMoney(selectedPrice.unit_amount, selectedPrice.currency)} mỗi năm` : `Billed ${formatMoney(selectedPrice.unit_amount, selectedPrice.currency)} annually`)
                              : (isVietnamese ? `Thanh toán ${formatMoney(selectedPrice.unit_amount, selectedPrice.currency)} mỗi tháng` : `Billed ${formatMoney(selectedPrice.unit_amount, selectedPrice.currency)} monthly`)}
                            {' · '}{isVietnamese ? 'Thuế được tính tại Checkout' : 'Taxes calculated at checkout'}
                          </p>
                        </motion.div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"><RefreshCw className="h-4 w-4" /></span>
                          <div><p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{isVietnamese ? 'Bảng giá chưa khả dụng' : 'Pricing unavailable'}</p><p className="mt-1 text-[10px] text-slate-400">{isVietnamese ? 'Vui lòng thử tải lại sau ít phút.' : 'Please try loading it again in a moment.'}</p></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div role="alert" className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[10px] font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300">
                      <span className="leading-4">{error}</span>
                      <button type="button" onClick={() => { setError(''); void Promise.all([refreshEntitlement(), refreshPrices()]); }} className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-white px-2 py-1 font-extrabold shadow-sm dark:bg-slate-900">
                        <RefreshCw className="h-3 w-3" /> {isVietnamese ? 'Thử lại' : 'Retry'}
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={loading || checking || (!hasBillingIssue && (pricesLoading || !selectedPrice))}
                    onClick={handlePrimaryAction}
                    className="group mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-500 px-5 py-4 text-xs font-extrabold text-white shadow-[0_14px_30px_-14px_rgba(37,99,235,0.8)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-wait disabled:translate-y-0 disabled:opacity-55"
                  >
                    {loading ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> {isVietnamese ? 'Đang mở thanh toán…' : 'Opening checkout…'}</>
                    ) : hasBillingIssue ? (
                      <><CreditCard className="h-4 w-4" /> {isVietnamese ? 'Xử lý thanh toán' : 'Resolve payment'}</>
                    ) : (
                      <>{isVietnamese ? `Bắt đầu với Pro ${cycle === 'yearly' ? 'hàng năm' : 'hàng tháng'}` : `Continue with ${cycle === 'yearly' ? 'yearly' : 'monthly'} Pro`} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
                    )}
                  </button>

                  <div className="mt-3 flex items-center justify-center gap-2 text-center text-[9px] font-medium leading-4 text-slate-400">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span>{isVietnamese ? 'Thanh toán an toàn qua Stripe · Hủy gia hạn bất cứ lúc nào' : 'Secure payment by Stripe · Cancel renewal anytime'}</span>
                  </div>
                </div>
              )}

              {isPro && error && (
                <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[10px] font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300">{error}</div>
              )}
            </main>
          </div>
        </motion.section>
      </div>
      )}
    </AnimatePresence>
  );
};
