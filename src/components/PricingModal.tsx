"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CalendarClock, Check, CreditCard, Loader2, LockKeyhole, ShieldCheck, Sparkles, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

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

const proFeatures = [
  'Không giới hạn thành viên, Space và dự án',
  'Apexa AI, Automation và báo cáo nâng cao',
  'Gantt, time tracking và export dữ liệu',
  'Lịch sử hoạt động và quyền Workspace nâng cao',
  'Hỗ trợ ưu tiên và quản lý thanh toán tập trung'
];
const zeroDecimalCurrencies = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf']);

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, currentUser, onEntitlementChange, triggerToast, addSyncLog }) => {
  const [cycle, setCycle] = useState<BillingCycle>('yearly');
  const [entitlement, setEntitlement] = useState<Entitlement>({ plan: currentUser?.isPremium ? 'pro' : 'free', status: currentUser?.isPremium ? 'active' : 'inactive', is_pro: Boolean(currentUser?.isPremium) });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [prices, setPrices] = useState<Partial<Record<BillingCycle, BillingPrice>>>({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [error, setError] = useState('');

  const authorizedFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Vui lòng đăng nhập để quản lý gói.');
    const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(init?.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Không thể kết nối hệ thống thanh toán.');
    return body;
  }, []);

  const refreshEntitlement = useCallback(async () => {
    setChecking(true);
    try {
      const body = await authorizedFetch('/api/billing/subscription');
      setEntitlement(body.entitlement);
      onEntitlementChange?.(body.entitlement);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể kiểm tra trạng thái gói.');
    } finally {
      setChecking(false);
    }
  }, [authorizedFetch, onEntitlementChange]);

  const refreshPrices = useCallback(async () => {
    setPricesLoading(true);
    try {
      const response = await fetch('/api/billing/plans', { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Bảng giá chưa được cấu hình.');
      setPrices(body.prices || {});
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tải bảng giá.');
    } finally {
      setPricesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setError('');
      const pendingCycle = window.localStorage.getItem('apexa_pending_upgrade_cycle');
      if (pendingCycle === 'monthly' || pendingCycle === 'yearly') setCycle(pendingCycle);
      window.localStorage.removeItem('apexa_pending_upgrade_cycle');
      void Promise.all([refreshEntitlement(), refreshPrices()]);
    }
  }, [isOpen, refreshEntitlement, refreshPrices]);

  const redirectToBilling = async (endpoint: string, body?: object) => {
    setLoading(true);
    setError('');
    try {
      const data = await authorizedFetch(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
      addSyncLog?.(endpoint.includes('portal') ? 'Opened secure billing portal' : `Started Pro ${cycle} checkout`);
      window.location.assign(data.url);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Không thể bắt đầu thanh toán.';
      setError(message);
      triggerToast?.('info', 'Thanh toán chưa bắt đầu', message);
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

  if (!isOpen) return null;
  const isPro = entitlement.is_pro;
  const hasBillingIssue = !isPro && ['incomplete', 'unpaid', 'past_due'].includes(entitlement.status);
  const selectedPrice = prices[cycle];
  const monthlyEquivalent = selectedPrice
    ? selectedPrice.unit_amount / (selectedPrice.interval === 'year' ? 12 * selectedPrice.interval_count : selectedPrice.interval_count)
    : null;
  const formatMoney = (amount: number, currency: string) => new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: 0
  }).format(amount / (zeroDecimalCurrencies.has(currency.toLowerCase()) ? 1 : 100));
  const monthlyPrice = prices.monthly;
  const yearlyPrice = prices.yearly;
  const annualSaving = monthlyPrice && yearlyPrice && monthlyPrice.currency === yearlyPrice.currency
    ? Math.max(0, Math.round((1 - yearlyPrice.unit_amount / (monthlyPrice.unit_amount * 12)) * 100))
    : 0;
  const renewalDate = entitlement.current_period_end ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(entitlement.current_period_end)) : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-y-auto p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-slate-950/65 backdrop-blur-md" />
        <motion.section initial={{ opacity: 0, y: 18, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: .97 }} className="relative z-10 my-8 w-full max-w-4xl overflow-hidden rounded-[30px] border border-white/70 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          <button onClick={onClose} aria-label="Đóng" className="absolute right-5 top-5 z-20 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
          <div className="grid md:grid-cols-[.9fr_1.1fr]">
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-7 text-white sm:p-9">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.14em]"><Sparkles className="h-3.5 w-3.5" /> Apexa Pro</div>
                <h2 className="mt-5 text-3xl font-black tracking-tight">Một gói Pro.<br />Toàn bộ hệ điều hành năng suất.</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-indigo-100">Thanh toán bảo mật trên trang Stripe. Apexa không nhận hoặc lưu số thẻ của bạn.</p>
                <div className="mt-7 space-y-3">
                  {proFeatures.map(feature => <div key={feature} className="flex items-start gap-2.5 text-xs font-semibold text-indigo-50"><span className="mt-0.5 rounded-full bg-emerald-400/20 p-0.5"><Check className="h-3.5 w-3.5 text-emerald-300" /></span>{feature}</div>)}
                </div>
                <div className="mt-8 flex items-center gap-4 border-t border-white/15 pt-5 text-[10px] font-bold text-indigo-100"><span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Stripe Checkout</span><span className="flex items-center gap-1.5"><LockKeyhole className="h-4 w-4" /> TLS bảo mật</span></div>
              </div>
            </div>

            <div className="p-7 sm:p-9">
              <div className="flex items-start justify-between gap-4 pr-8">
                <div><p className="text-[10px] font-black uppercase tracking-[.14em] text-indigo-600">Gói hiện tại</p><h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">{checking ? 'Đang kiểm tra…' : isPro ? `Apexa ${entitlement.plan.toUpperCase()}` : 'Apexa Free'}</h3></div>
                {checking && <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />}
                {!checking && <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${isPro ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{entitlement.status}</span>}
              </div>

              {isPro ? (
                <div className="mt-7 space-y-5">
                  <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <div className="flex gap-3"><CalendarClock className="mt-0.5 h-5 w-5 text-emerald-600" /><div><p className="text-xs font-black text-emerald-900 dark:text-emerald-300">Pro đang hoạt động</p><p className="mt-1 text-[11px] leading-5 text-emerald-700 dark:text-emerald-400">{entitlement.cancel_at_period_end ? `Quyền Pro còn hiệu lực đến ${renewalDate || 'hết chu kỳ hiện tại'}.` : renewalDate ? `Gia hạn tiếp theo vào ${renewalDate}.` : 'Subscription đã được xác thực bởi hệ thống thanh toán.'}</p></div></div>
                  </div>
                  <button disabled={loading} onClick={() => redirectToBilling('/api/billing/portal')} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-900"><CreditCard className="h-4 w-4" /> Quản lý thanh toán & hóa đơn</button>
                  <p className="text-center text-[10px] leading-5 text-slate-400">Đổi phương thức thanh toán, tải hóa đơn hoặc hủy gia hạn trong Customer Portal.</p>
                </div>
              ) : (
                <div className="mt-7">
                  <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                    {(['monthly','yearly'] as BillingCycle[]).map(item => <button key={item} onClick={() => setCycle(item)} className={`rounded-lg py-2 text-[11px] font-black transition ${cycle === item ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-400'}`}>{item === 'monthly' ? 'Hàng tháng' : `Hàng năm${annualSaving ? ` · tiết kiệm ${annualSaving}%` : ''}`}</button>)}
                  </div>
                  <div className="mt-6 flex items-end justify-between"><div>{pricesLoading ? <div className="h-11 w-52 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" /> : selectedPrice && monthlyEquivalent != null ? <><span className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{formatMoney(monthlyEquivalent, selectedPrice.currency)}</span><span className="text-xs font-bold text-slate-400"> / tháng</span><p className="mt-1 text-[10px] text-slate-400">{cycle === 'yearly' ? `Thanh toán ${formatMoney(selectedPrice.unit_amount, selectedPrice.currency)} mỗi năm` : `Thanh toán ${formatMoney(selectedPrice.unit_amount, selectedPrice.currency)} mỗi tháng`} · thuế được xác định tại Checkout</p></> : <p className="text-sm font-bold text-slate-500">Bảng giá hiện chưa khả dụng.</p>}</div></div>
                  <button disabled={loading || checking || (!hasBillingIssue && (pricesLoading || !selectedPrice))} onClick={handlePrimaryAction} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 text-xs font-black text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60">{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang mở thanh toán…</> : hasBillingIssue ? <><CreditCard className="h-4 w-4" /> Xử lý thanh toán</> : <>Nâng cấp Pro an toàn <ArrowRight className="h-4 w-4" /></>}</button>
                  <p className="mt-4 text-center text-[10px] leading-5 text-slate-400">Mã giảm giá được nhập tại Checkout. Có thể hủy gia hạn bất cứ lúc nào trong Billing Portal.</p>
                </div>
              )}
              {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400">{error}</div>}
            </div>
          </div>
        </motion.section>
      </div>
    </AnimatePresence>
  );
};
