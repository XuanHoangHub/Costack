"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, BadgeCheck, Building2, Check, CreditCard, Loader2, Rocket, ShieldCheck, Sparkles, X, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useTranslation } from '@/contexts/TranslationContext';
import { SUGGESTED_PRICES, type BillingCycle, type BillingPlan, type SelfServeBillingPlan } from '@/lib/billing/plans';

type Entitlement = {
  plan: BillingPlan;
  provider?: 'payos' | 'stripe';
  status: string;
  billing_cycle?: BillingCycle;
  is_pro: boolean;
  cancel_at_period_end?: boolean;
  current_period_end?: string;
};

type BillingPrice = {
  plan: SelfServeBillingPlan;
  cycle: BillingCycle;
  unit_amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  interval_count: number;
};

type PriceMap = Partial<Record<SelfServeBillingPlan, Partial<Record<BillingCycle, BillingPrice>>>>;

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
  const [cycle, setCycle] = useState<BillingCycle>('yearly');
  const [entitlement, setEntitlement] = useState<Entitlement>({
    plan: currentUser?.isPremium ? 'pro' : 'free',
    status: currentUser?.isPremium ? 'active' : 'inactive',
    is_pro: Boolean(currentUser?.isPremium),
  });
  const [prices, setPrices] = useState<PriceMap>({});
  const [billingConfigured, setBillingConfigured] = useState(false);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<BillingPlan | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const copy = useMemo(() => ({
    free: {
      name: 'Free',
      audience: isVietnamese ? 'Cá nhân bắt đầu' : 'For individuals',
      description: isVietnamese ? 'Khởi tạo quy trình và khám phá Apexa không rủi ro.' : 'Build your first workflow and explore Apexa risk-free.',
      features: isVietnamese
        ? ['Tối đa 5 Spaces', 'Task và dự án không giới hạn', 'Board, List và Docs cơ bản', '3 bảng trắng cộng tác', '100 AI credits mỗi tháng']
        : ['Up to 5 Spaces', 'Unlimited tasks and projects', 'Core Board, List, and Docs', '3 collaborative whiteboards', '100 monthly AI credits'],
    },
    starter: {
      name: 'Starter',
      audience: isVietnamese ? 'Nhóm nhỏ 2–10 người' : 'Small teams of 2–10',
      description: isVietnamese ? 'Mọi thứ cần thiết để cộng tác và giao việc chuyên nghiệp.' : 'Everything small teams need to collaborate and deliver.',
      features: isVietnamese
        ? ['Spaces, dự án và whiteboard không giới hạn', 'Calendar và Gantt', '500 AI credits / người / tháng', '1.000 automation mỗi tháng', 'Tích hợp thiết yếu']
        : ['Unlimited spaces, projects, and whiteboards', 'Calendar and Gantt', '500 AI credits / user / month', '1,000 monthly automations', 'Essential integrations'],
    },
    pro: {
      name: 'Pro',
      audience: isVietnamese ? 'Đội ngũ đang tăng trưởng' : 'Growing teams',
      description: isVietnamese ? 'Gói cân bằng tốt nhất giữa năng lực AI, vận hành và chi phí.' : 'The best balance of AI, operations, and cost.',
      features: isVietnamese
        ? ['Toàn bộ Starter', 'Apexa AI và báo cáo nâng cao', 'CRM, ERP và Finance workspace', '5.000 automation mỗi tháng', 'Time tracking, export và khách mời']
        : ['Everything in Starter', 'Apexa AI and advanced reporting', 'CRM, ERP, and Finance workspaces', '5,000 monthly automations', 'Time tracking, export, and guests'],
    },
    business: {
      name: 'Business',
      audience: isVietnamese ? 'Nhiều phòng ban' : 'Multi-department teams',
      description: isVietnamese ? 'Kiểm soát, quản trị và khả năng mở rộng cho tổ chức lớn.' : 'Control, governance, and scale for larger organizations.',
      features: isVietnamese
        ? ['Toàn bộ Pro', 'Phân quyền và nhiều workspace nâng cao', 'Portfolio, workload và audit log', 'API, webhook và 3.000 AI credits / người', 'Hỗ trợ ưu tiên']
        : ['Everything in Pro', 'Advanced permissions and multi-workspace', 'Portfolio, workload, and audit log', 'API, webhooks, and 3,000 AI credits / user', 'Priority support'],
    },
    enterprise: {
      name: 'Enterprise',
      audience: isVietnamese ? 'Tổ chức cần SLA' : 'Organizations needing SLA',
      description: isVietnamese ? 'Bảo mật, triển khai và hỗ trợ được thiết kế riêng.' : 'Tailored security, deployment, and support.',
      features: isVietnamese
        ? ['Toàn bộ Business', 'SSO/SAML, SCIM và quản trị tập trung', 'Chính sách dữ liệu và bảo mật tùy chỉnh', 'SLA và onboarding riêng', 'Customer Success chuyên trách']
        : ['Everything in Business', 'SSO/SAML, SCIM, and central governance', 'Custom data and security policies', 'Tailored SLA and onboarding', 'Dedicated Customer Success'],
    },
  }), [isVietnamese]);

  const authorizedFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error(isVietnamese ? 'Vui lòng đăng nhập để quản lý gói.' : 'Please sign in to manage your plan.');
    const response = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(init?.headers || {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || (isVietnamese ? 'Không thể kết nối hệ thống thanh toán.' : 'Unable to connect to billing.'));
    return body;
  }, [isVietnamese]);

  const refreshEntitlement = useCallback(async () => {
    setChecking(true);
    try {
      const body = await authorizedFetch('/api/billing/subscription', { method: 'POST' });
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
      if (response.ok) {
        setPrices(body.prices || {});
        setBillingConfigured(Boolean(body.configured));
        if (body.configured) setError('');
      }
    } catch {
      setPrices({});
      setBillingConfigured(false);
    } finally {
      setPricesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    const pendingCycle = window.localStorage.getItem('apexa_pending_upgrade_cycle');
    if (pendingCycle === 'monthly' || pendingCycle === 'yearly') setCycle(pendingCycle);
    window.localStorage.removeItem('apexa_pending_upgrade_cycle');
    window.localStorage.removeItem('apexa_pending_upgrade_plan');
    void Promise.all([refreshEntitlement(), refreshPrices()]);
  }, [isOpen, refreshEntitlement, refreshPrices]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  const redirectToBilling = async (plan: BillingPlan, endpoint: string, body?: object) => {
    setLoadingPlan(plan);
    setError('');
    try {
      const data = await authorizedFetch(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
      if (data?.url) {
        addSyncLog?.(endpoint.includes('portal') ? 'Opened secure billing portal' : `Started PayOS ${plan} ${cycle} checkout`);
        window.location.assign(data.url);
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : (isVietnamese ? 'Không thể kết nối hệ thống thanh toán.' : 'Unable to connect to billing.');
      setError(message);
      triggerToast?.('error', isVietnamese ? 'Thanh toán chưa hoàn tất' : 'Billing not completed', message);
    } finally {
      setLoadingPlan(null);
    }
  };

  const selectPlan = (plan: BillingPlan) => {
    if (plan === 'free') {
      if (entitlement.is_pro && entitlement.provider === 'stripe') {
        void redirectToBilling(plan, '/api/billing/portal');
      } else if (entitlement.is_pro) {
        const message = isVietnamese
          ? 'Gói PayOS là gói trả trước, không tự động gia hạn và sẽ tự trở về Free khi hết hạn.'
          : 'PayOS plans are prepaid, do not auto-renew, and return to Free when the paid period ends.';
        triggerToast?.('info', isVietnamese ? 'Không có gia hạn tự động' : 'No automatic renewal', message);
      }
      return;
    }
    if (plan === 'enterprise') {
      window.location.assign(`mailto:contact@apexa.vn?subject=${encodeURIComponent('Apexa Enterprise consultation')}`);
      return;
    }
    if (entitlement.provider === 'stripe' && (entitlement.is_pro || ['incomplete', 'unpaid', 'past_due'].includes(entitlement.status))) {
      void redirectToBilling(plan, '/api/billing/portal');
      return;
    }
    if (!billingConfigured || !prices[plan]?.[cycle]) {
      const message = isVietnamese ? 'Kênh thanh toán PayOS chưa được cấu hình đầy đủ.' : 'PayOS billing is not fully configured yet.';
      setError(message);
      triggerToast?.('info', isVietnamese ? 'Gói sắp mở bán' : 'Plan coming soon', message);
      return;
    }
    void redirectToBilling(plan, '/api/billing/checkout', { plan, cycle });
  };

  const numberLocale = isVietnamese ? 'vi-VN' : 'en-US';
  const formatMoney = (amount: number, currency = 'vnd') => new Intl.NumberFormat(numberLocale, {
    style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: 0,
  }).format(amount / (zeroDecimalCurrencies.has(currency.toLowerCase()) ? 1 : 100));

  const displayPrice = (plan: BillingPlan) => {
    if (plan === 'free') return { value: formatMoney(0), suffix: isVietnamese ? '/ mãi mãi' : '/ forever' };
    if (plan === 'enterprise') return { value: isVietnamese ? 'Liên hệ' : 'Custom', suffix: isVietnamese ? 'theo nhu cầu' : 'tailored' };
    const live = prices[plan]?.[cycle];
    const amount = live?.unit_amount ?? SUGGESTED_PRICES[plan][cycle];
    const intervalCount = live?.interval_count ?? 1;
    const monthlyAmount = amount / (cycle === 'yearly' ? 12 * intervalCount : intervalCount);
    return { value: formatMoney(monthlyAmount, live?.currency || 'vnd'), suffix: isVietnamese ? '/ tháng' : '/ month' };
  };

  const planOrder: BillingPlan[] = ['free', 'starter', 'pro', 'business', 'enterprise'];
  const hasBillingIssue = ['incomplete', 'unpaid', 'past_due'].includes(entitlement.status);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto p-2 sm:p-5">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !loadingPlan && onClose()} className="fixed inset-0 bg-slate-950/75 backdrop-blur-md" />
          <motion.section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pricing-modal-title"
            tabIndex={-1}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            className="relative z-10 my-auto w-[min(95vw,1480px)] max-sm:w-full max-sm:mx-2 max-h-[90dvh] overflow-y-auto rounded-[28px] border border-white/80 bg-[#f7f8fb] shadow-[0_40px_110px_-30px_rgba(2,6,23,.8)] outline-none dark:border-white/10 dark:bg-slate-950"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle_at_50%_-30%,rgba(99,102,241,.22),transparent_65%)]" />
            <button type="button" onClick={onClose} disabled={Boolean(loadingPlan)} aria-label={isVietnamese ? 'Đóng bảng giá' : 'Close pricing'} className="absolute right-4 top-4 z-30 grid min-h-[44px] min-w-[44px] place-items-center rounded-full border border-slate-200 bg-white/90 text-slate-500 shadow-sm transition hover:rotate-90 hover:text-slate-950 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <X className="h-4 w-4" />
            </button>

            <header className="relative px-5 pb-7 pt-8 text-center sm:px-10 sm:pt-10">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.16em] text-indigo-700 shadow-sm dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300">
                <Sparkles className="h-3.5 w-3.5" /> {isVietnamese ? 'Một nền tảng · Mọi quy trình' : 'One platform · Every workflow'}
              </div>
              <h2 id="pricing-modal-title" className="mt-4 text-3xl font-black tracking-[-.045em] text-slate-950 dark:text-white sm:text-4xl">
                {isVietnamese ? 'Chọn gói giúp đội ngũ tăng tốc' : 'Choose the plan that moves your team faster'}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-xs font-medium leading-5 text-slate-500 dark:text-slate-400 sm:text-sm">
                {isVietnamese ? 'Bắt đầu miễn phí, nâng cấp khi tạo ra giá trị. Giá rõ ràng, thanh toán VietQR và không tự động gia hạn.' : 'Start free and upgrade as value grows. Clear pricing, VietQR checkout, and no automatic renewal.'}
              </p>
              <div className="mx-auto mt-5 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900" role="radiogroup" aria-label={isVietnamese ? 'Chu kỳ thanh toán' : 'Billing cycle'}>
                {(['monthly', 'yearly'] as const).map((item) => (
                  <button key={item} type="button" role="radio" aria-checked={cycle === item} onClick={() => setCycle(item)} className={`rounded-lg px-4 py-2 text-[11px] font-extrabold transition ${cycle === item ? 'bg-slate-950 text-white shadow-md dark:bg-white dark:text-slate-950' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
                    {item === 'monthly' ? (isVietnamese ? 'Hàng tháng' : 'Monthly') : (isVietnamese ? 'Hàng năm · tiết kiệm đến 25%' : 'Yearly · save up to 25%')}
                  </button>
                ))}
              </div>
            </header>

            <main className="relative px-3 pb-5 sm:px-5 sm:pb-7">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {planOrder.map((plan) => {
                  const info = copy[plan];
                  const price = displayPrice(plan);
                  const highlighted = plan === 'pro';
                  const current = plan === 'free'
                    ? !entitlement.is_pro
                    : entitlement.is_pro && entitlement.plan === plan;
                  const canRenew = current && plan !== 'free' && entitlement.provider === 'payos';
                  const loading = loadingPlan === plan;
                  return (
                    <motion.article key={plan} whileHover={{ y: -3 }} className={`relative flex min-h-[450px] flex-col overflow-hidden rounded-[22px] border bg-white p-5 transition dark:bg-slate-900 ${highlighted ? 'border-indigo-500 shadow-[0_18px_45px_-18px_rgba(79,70,229,.65)] ring-1 ring-indigo-500' : 'border-slate-200 shadow-sm dark:border-slate-800'}`}>
                      {highlighted && <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-400" />}
                      <div className="flex min-h-7 items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] ${highlighted ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
                          {plan === 'enterprise' ? <Building2 className="h-3 w-3" /> : plan === 'pro' ? <Rocket className="h-3 w-3" /> : plan === 'starter' ? <Zap className="h-3 w-3" /> : null}
                          {info.audience}
                        </span>
                        {highlighted && <span className="rounded-full bg-indigo-600 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-white">{isVietnamese ? 'Tốt nhất' : 'Best value'}</span>}
                      </div>
                      <h3 className="mt-4 text-xl font-black tracking-tight text-slate-950 dark:text-white">{info.name}</h3>
                      <p className="mt-2 min-h-12 text-[11px] font-medium leading-[18px] text-slate-500 dark:text-slate-400">{info.description}</p>
                      <div className="mt-5 min-h-[62px]">
                        <div className="text-[27px] font-black tracking-[-.045em] text-slate-950 dark:text-white">{price.value}</div>
                        <div className="mt-0.5 text-[9px] font-semibold text-slate-400">{price.suffix}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => selectPlan(plan)}
                        disabled={(current && !canRenew) || Boolean(loadingPlan) || checking || (plan !== 'free' && plan !== 'enterprise' && pricesLoading)}
                        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-[11px] font-extrabold transition disabled:cursor-default disabled:opacity-60 ${highlighted ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5' : 'border border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white'}`}
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : current ? <BadgeCheck className="h-4 w-4" /> : plan === 'enterprise' ? <Building2 className="h-4 w-4" /> : entitlement.provider === 'stripe' && (entitlement.is_pro || hasBillingIssue) ? <CreditCard className="h-4 w-4" /> : null}
                        {canRenew
                          ? (isVietnamese ? `Gia hạn ${info.name}` : `Renew ${info.name}`)
                          : current
                          ? (isVietnamese ? 'Gói hiện tại' : 'Current plan')
                          : plan === 'free' && entitlement.is_pro
                            ? (isVietnamese ? 'Quản lý gói' : 'Manage plan')
                            : plan === 'enterprise'
                              ? (isVietnamese ? 'Liên hệ tư vấn' : 'Contact sales')
                            : entitlement.provider === 'stripe' && (entitlement.is_pro || hasBillingIssue)
                                ? (isVietnamese ? 'Đổi gói trong Portal' : 'Change in Portal')
                                : (isVietnamese ? `Chọn ${info.name}` : `Choose ${info.name}`)}
                        {!loading && !current && plan !== 'free' && <ArrowRight className="h-3.5 w-3.5" />}
                      </button>
                      <div className="my-5 h-px bg-slate-100 dark:bg-slate-800" />
                      <ul className="space-y-3">
                        {info.features.map((feature) => (
                          <li key={feature} className="flex gap-2.5 text-[10px] font-semibold leading-4 text-slate-600 dark:text-slate-300">
                            <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${highlighted ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300'}`}><Check className="h-2.5 w-2.5 stroke-[3]" /></span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </motion.article>
                  );
                })}
              </div>

              {error && <div role="alert" className="mx-auto mt-4 max-w-2xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-[10px] font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}</div>}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[9px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-500" /> {isVietnamese ? 'Thanh toán bảo mật qua PayOS · VietQR' : 'Secure PayOS · VietQR payment'}</span>
                <span>{isVietnamese ? 'Gói trả trước · Không tự động gia hạn' : 'Prepaid access · No automatic renewal'}</span>
              </div>
            </main>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
};
