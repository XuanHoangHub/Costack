"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ChevronDown,
  CreditCard,
  Crown,
  HelpCircle,
  Landmark,
  Layers,
  Loader2,
  Mail,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useTranslation } from '@/contexts/TranslationContext';
import { SUGGESTED_PRICES, type BillingCycle, type BillingPlan, type SelfServeBillingPlan } from '@/lib/billing/plans';
import { PayOSCheckout, type PaymentReceipt, type PayOSCheckoutData } from '@/components/billing/PayOSCheckout';
import { CardPaymentSuccess } from '@/components/billing/CardPaymentSuccess';
import { PAYPAL_DEFAULT_PRICES } from '@/lib/billing/paypal-prices';

export type Entitlement = {
  plan: BillingPlan;
  provider?: 'payos' | 'stripe' | 'paypal';
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
type PaymentMethod = 'vietqr' | 'momo' | 'card' | 'paypal';
type CardAvailability = Partial<Record<SelfServeBillingPlan, Partial<Record<BillingCycle, boolean>>>>;

export interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { isPremium?: boolean } | null;
  onEntitlementChange?: (entitlement: Entitlement) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
  addSyncLog?: (log: string) => void;
}

const zeroDecimalCurrencies = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf']);

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onEntitlementChange,
  triggerToast,
  addSyncLog,
}) => {
  const { isVietnamese } = useTranslation();
  const dialogRef = useRef<HTMLElement>(null);
  const verificationRef = useRef(false);
  const checkoutGeneration = useRef(0);
  const completedOrderRef = useRef<number | null>(null);
  const creationRef = useRef(false);
  const [cancelling, setCancelling] = useState(false);
  const [cycle, setCycle] = useState<BillingCycle>('yearly');
  const [showFaq, setShowFaq] = useState(false);
  const [entitlement, setEntitlement] = useState<Entitlement>({
    plan: currentUser?.isPremium ? 'pro' : 'free',
    status: currentUser?.isPremium ? 'active' : 'inactive',
    is_pro: Boolean(currentUser?.isPremium),
  });
  const [prices, setPrices] = useState<PriceMap>({});
  const [billingConfigured, setBillingConfigured] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('vietqr');
  const [cardAvailability, setCardAvailability] = useState<CardAvailability>({});
  const [paypalConfigured, setPaypalConfigured] = useState(false);
  const [paypalPrices, setPaypalPrices] = useState<PriceMap>({});
  const [pricesLoading, setPricesLoading] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<BillingPlan | null>(null);
  const [checking, setChecking] = useState(false);
  const [manualChecking, setManualChecking] = useState(false);
  const [error, setError] = useState('');
  const [checkout, setCheckout] = useState<PayOSCheckoutData | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<'pending' | 'success' | 'expired' | 'cancelled' | 'failed'>('pending');
  const [paymentReceipt, setPaymentReceipt] = useState<PaymentReceipt | null>(null);
  const [cardSuccess, setCardSuccess] = useState<{ plan: SelfServeBillingPlan; cycle: BillingCycle } | null>(null);

  const copy = useMemo(
    () => ({
      free: {
        name: 'Free',
        audience: isVietnamese ? 'Cá nhân' : 'Personal',
        description: isVietnamese
          ? 'Khởi tạo quy trình và trải nghiệm các tính năng cốt lõi hoàn toàn miễn phí.'
          : 'Build your first workflow and explore core features completely free.',
        features: isVietnamese
          ? [
              'Tối đa 5 Spaces làm việc',
              'Task & dự án không giới hạn',
              'Board, List & Docs ghi chú',
              '3 bảng trắng cộng tác Whiteboard',
              'Không bao gồm Apexa AI',
            ]
          : [
              'Up to 5 active Spaces',
              'Unlimited tasks & projects',
              'Core Board, List & Docs',
              '3 collaborative Whiteboards',
              'Apexa AI is not included',
            ],
      },
      starter: {
        name: 'Starter',
        audience: isVietnamese ? 'Nhóm 2–10 người' : 'Teams of 2–10',
        description: isVietnamese
          ? 'Giải pháp hoàn chỉnh để đội ngũ cộng tác mượt mà và quản lý tiến độ.'
          : 'Complete collaboration toolkit to deliver projects faster.',
        features: isVietnamese
          ? [
              'Spaces & dự án không giới hạn',
              'Calendar & biểu đồ Gantt tiến độ',
              'Toàn bộ Apexa AI · 150 lượt/tháng',
              'Tự động hóa quy trình cơ bản',
              'Tích hợp Google Calendar, Notion',
            ]
          : [
              'Unlimited spaces & projects',
              'Calendar & Gantt timeline',
              'All Apexa AI tools · 150 requests/month',
              'Core workflow automation',
              'Google Calendar & Notion integration',
            ],
      },
      pro: {
        name: 'Pro',
        audience: isVietnamese ? 'Đội ngũ tăng trưởng' : 'Growing teams',
        description: isVietnamese
          ? 'Tối ưu toàn diện năng suất làm việc với sức mạnh AI và quản trị đa năng.'
          : 'Supercharge productivity with cutting-edge AI and advanced workspaces.',
        features: isVietnamese
          ? [
              'Toàn bộ quyền lợi gói Starter',
              '2.000 lượt Apexa AI mỗi tháng',
              'Hệ sinh thái CRM, ERP & Finance',
              'Tự động hóa và báo cáo nâng cao',
              'Time tracking, KPI & phân quyền khách',
            ]
          : [
              'Everything in Starter',
              '2,000 Apexa AI requests per month',
              'Integrated CRM, ERP & Finance workspaces',
              'Advanced automation and reporting',
              'Time tracking, KPI & guest permissions',
            ],
      },
      business: {
        name: 'Business',
        audience: isVietnamese ? 'Nhiều phòng ban' : 'Multi-department',
        description: isVietnamese
          ? 'Kiểm soát, bảo mật chuyên sâu và phân quyền quản trị cho tổ chức lớn.'
          : 'Enterprise control, deep analytics, and departmental governance.',
        features: isVietnamese
          ? [
              'Toàn bộ quyền lợi gói Pro',
              'Phân quyền nâng cao theo phòng ban',
              'Portfolio & Quản lý khối lượng (Workload)',
              'API, Webhook và 10.000 lượt AI/tháng',
              'Hỗ trợ triển khai theo thỏa thuận',
            ]
          : [
              'Everything in Pro',
              'Advanced role & department permissions',
              'Portfolio & Workload management',
              'API, Webhooks, and 10,000 AI requests/month',
              'Implementation support by agreement',
            ],
      },
      enterprise: {
        name: 'Enterprise',
        audience: isVietnamese ? 'Doanh nghiệp lớn' : 'Custom Enterprise',
        description: isVietnamese
          ? 'Đánh giá nhu cầu, triển khai tùy biến và phạm vi hỗ trợ theo hợp đồng riêng.'
          : 'Requirements assessment, tailored deployment, and contract-defined support.',
        features: isVietnamese
          ? [
              'Toàn bộ quyền lợi gói Business',
              'Đánh giá kiến trúc và phân quyền',
              'Chính sách dữ liệu theo yêu cầu',
              'SLA và onboarding theo hợp đồng',
              'Đầu mối triển khai chuyên trách',
            ]
          : [
              'Everything in Business',
              'Architecture and access-control review',
              'Contract-defined data policies',
              'Contract-defined SLA and onboarding',
              'Dedicated implementation contact',
            ],
      },
    }),
    [isVietnamese],
  );

  const authorizedFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token)
        throw new Error(isVietnamese ? 'Vui lòng đăng nhập để quản lý gói.' : 'Please sign in to manage your plan.');
      const response = await fetch(url, {
        ...init,
        signal: init?.signal || AbortSignal.timeout(45000),
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          ...(init?.headers || {}),
        },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          body.error || (isVietnamese ? 'Không thể kết nối hệ thống thanh toán.' : 'Unable to connect to billing.'),
        );
      return body;
    },
    [isVietnamese],
  );

  const refreshEntitlement = useCallback(async () => {
    setChecking(true);
    try {
      const body = await authorizedFetch('/api/billing/subscription', { method: 'POST' });
      if (body.entitlement) {
        setEntitlement(body.entitlement);
        onEntitlementChange?.(body.entitlement);
        return body.entitlement as Entitlement;
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : isVietnamese
          ? 'Không thể kiểm tra trạng thái gói.'
          : 'Unable to check your plan.',
      );
    } finally {
      setChecking(false);
    }
    return null;
  }, [authorizedFetch, isVietnamese, onEntitlementChange]);

  const refreshPrices = useCallback(async () => {
    setPricesLoading(true);
    try {
      const response = await fetch('/api/billing/plans', { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error('Unable to load billing prices');
      if (response.ok) {
        setPrices(body.prices || {});
        setBillingConfigured(Boolean(body.configured));
        setCardAvailability(body.paymentMethods?.card || {});
        setPaypalConfigured(Boolean(body.paymentMethods?.paypal));
        setPaypalPrices(body.paypalPrices || {});
        if (body.configured) setError('');
      }
    } catch {
      setPrices({});
      setBillingConfigured(false);
      setCardAvailability({});
      setPaypalConfigured(false);
      setPaypalPrices({});
    } finally {
      setPricesLoading(false);
    }
  }, []);

  const closeEmbeddedCheckout = useCallback(() => {
    checkoutGeneration.current += 1;
    setManualChecking(false);
    setCheckout(null);
    setCheckoutStatus('pending');
    setPaymentReceipt(null);
    setError('');
  }, []);

  const handleModalClose = useCallback(() => {
    if (loadingPlan || cancelling || manualChecking) return;
    closeEmbeddedCheckout();
    setCardSuccess(null);
    onClose();
  }, [closeEmbeddedCheckout, onClose, loadingPlan, cancelling, manualChecking]);

  // One verifier for manual checks, polling, and provider notifications.
  const checkPaymentStatus = useCallback(
    async (activeCheckout: PayOSCheckoutData, silent = false) => {
      if (verificationRef.current || completedOrderRef.current === activeCheckout.orderCode) return false;
      const generation = checkoutGeneration.current;
      verificationRef.current = true;
      if (!silent) setManualChecking(true);
      try {
        const result = await authorizedFetch('/api/billing/checkout', {
          method: 'PUT', body: JSON.stringify({ orderCode: activeCheckout.orderCode }),
        });
        if (generation !== checkoutGeneration.current) return false;
        if (result.status === 'paid' && result.receipt) {
          completedOrderRef.current = activeCheckout.orderCode;
          setPaymentReceipt(result.receipt);
          setCheckoutStatus('success');
          setError('');
          await refreshEntitlement();
          if (generation !== checkoutGeneration.current) return true;
          addSyncLog?.(`Confirmed PayOS order ${activeCheckout.orderCode}`);
          triggerToast?.('success', isVietnamese ? 'Thanh toán thành công!' : 'Payment successful!',
            isVietnamese ? `Đã xác nhận thanh toán gói ${copy[activeCheckout.plan].name}.` : `Payment for ${copy[activeCheckout.plan].name} is confirmed.`);
          return true;
        }
        if (['cancelled', 'expired', 'failed'].includes(result.status)) setCheckoutStatus(result.status);
        setError('');
        if (!silent && result.status === 'pending') {
          setError(isVietnamese ? 'Chưa nhận được xác nhận. Nếu đã chuyển tiền, vui lòng chờ và kiểm tra lại; không chuyển thêm lần nữa.' : 'Confirmation has not arrived. If you have paid, wait and check again; do not pay twice.');
        }
      } catch (err) {
        if (generation === checkoutGeneration.current) setError(err instanceof Error ? err.message : (isVietnamese ? 'Không thể kiểm tra giao dịch. Hệ thống sẽ thử lại.' : 'Unable to check payment. We will retry.'));
      } finally {
        verificationRef.current = false;
        if (generation === checkoutGeneration.current) setManualChecking(false);
      }
      return false;
    }, [addSyncLog, authorizedFetch, copy, isVietnamese, refreshEntitlement, triggerToast],
  );

  useEffect(() => {
    if (!isOpen || !checkout || checkoutStatus !== 'pending' || cancelling) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (!active) return;
      if (document.visibilityState === 'visible') await checkPaymentStatus(checkout, true);
      if (active) timer = setTimeout(poll, 5000);
    };
    timer = setTimeout(poll, 1500);
    const handleVisible = () => {
      if (document.visibilityState === 'visible') void checkPaymentStatus(checkout, true);
    };
    const handleMessage = (event: MessageEvent) => {
      if (!['https://pay.payos.vn', 'https://next.pay.payos.vn', 'https://dev.pay.payos.vn', 'https://next.dev.pay.payos.vn'].includes(event.origin)) return;
      // Provider messages are hints only. Always verify with the server.
      void checkPaymentStatus(checkout, true);
    };
    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('message', handleMessage);
    return () => {
      active = false; clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('message', handleMessage);
    };
  }, [isOpen, checkout, checkoutStatus, cancelling, checkPaymentStatus]);
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    const pendingCycle = window.localStorage.getItem('apexa_pending_upgrade_cycle');
    if (pendingCycle === 'monthly' || pendingCycle === 'yearly') setCycle(pendingCycle);
    const pendingPlan = window.localStorage.getItem('apexa_pending_upgrade_plan');
    const cardReturn = window.sessionStorage.getItem('apexa_billing_success_provider') === 'stripe';
    let active = true;
    void refreshEntitlement().then(confirmed => {
      if (active && cardReturn && confirmed?.is_pro && confirmed.provider === 'stripe' && confirmed.plan === pendingPlan && (pendingPlan === 'starter' || pendingPlan === 'pro' || pendingPlan === 'business')) {
        setCardSuccess({ plan: pendingPlan, cycle: confirmed.billing_cycle || (pendingCycle === 'monthly' ? 'monthly' : 'yearly') });
      }
    });
    window.sessionStorage.removeItem('apexa_billing_success_provider');
    window.localStorage.removeItem('apexa_pending_upgrade_cycle');
    window.localStorage.removeItem('apexa_pending_upgrade_plan');
    void refreshPrices();
    return () => { active = false; };
  }, [isOpen, refreshEntitlement, refreshPrices]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleModalClose();
      if (event.key === 'Tab') {
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), summary, [tabindex="0"]') || []).filter(element => element.getClientRects().length > 0);
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [handleModalClose, isOpen]);

  const redirectToBilling = async (plan: BillingPlan, endpoint: string, body?: object) => {
    setLoadingPlan(plan);
    setError('');
    try {
      const data = await authorizedFetch(endpoint, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      });
      if (data?.url) {
        addSyncLog?.(
          endpoint.includes('portal') ? 'Opened secure billing portal' : `Started ${endpoint.includes('paypal') ? 'PayPal' : endpoint.includes('card') ? 'Stripe' : 'PayOS'} ${plan} ${cycle} checkout`,
        );
        window.location.assign(data.url);
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : isVietnamese
          ? 'Không thể kết nối hệ thống thanh toán.'
          : 'Unable to connect to billing.';
      setError(message);
      triggerToast?.('error', isVietnamese ? 'Thanh toán chưa hoàn tất' : 'Billing not completed', message);
    } finally {
      creationRef.current = false;
      setLoadingPlan(null);
    }
  };

  const startPayOSCheckout = async (plan: SelfServeBillingPlan) => {
    if (creationRef.current) return;
    creationRef.current = true;
    checkoutGeneration.current += 1;
    completedOrderRef.current = null;
    setLoadingPlan(plan);
    setError('');
    try {
      const data = await authorizedFetch('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan, cycle, returnPath: `${window.location.pathname}${window.location.search}` }),
      });
      if (
        !data?.url
        || !data?.returnUrl
        || !Number.isSafeInteger(data?.orderCode)
        || !Number.isSafeInteger(data?.amount)
        || typeof data?.description !== 'string'
        || typeof data?.expiresAt !== 'string'
        || !Number.isFinite(Date.parse(data.expiresAt))
        || data.amount <= 0
        || !data.qrCode?.trim()
        || typeof data?.qrCode !== 'string'
        || typeof data?.accountNumber !== 'string'
        || typeof data?.accountName !== 'string'
        || typeof data?.bin !== 'string'
      ) {
        throw new Error(
          isVietnamese ? 'PayOS trả về thông tin thanh toán không hợp lệ.' : 'PayOS returned invalid checkout details.',
        );
      }
      addSyncLog?.(`Started embedded PayOS ${plan} ${cycle} checkout`);
      setCheckoutStatus('pending');
      setPaymentReceipt(null);
      setCheckout({
        url: data.url,
        returnUrl: data.returnUrl,
        orderCode: data.orderCode,
        plan,
        cycle,
        amount: data.amount,
        description: data.description,
        expiresAt: data.expiresAt,
        qrCode: data.qrCode,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        bin: data.bin,
        method: paymentMethod === 'momo' ? 'momo' : 'vietqr',
      });
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : isVietnamese
          ? 'Không thể kết nối hệ thống thanh toán.'
          : 'Unable to connect to billing.';
      setError(message);
      triggerToast?.('error', isVietnamese ? 'Thanh toán chưa hoàn tất' : 'Billing not completed', message);
    } finally {
      creationRef.current = false;
      setLoadingPlan(null);
    }
  };

  const startCardCheckout = async (plan: SelfServeBillingPlan) => {
    if (!cardAvailability[plan]?.[cycle]) {
      const message = isVietnamese
        ? 'Thanh toán thẻ cho gói và chu kỳ này chưa được cấu hình trên Stripe.'
        : 'Card payment is not configured for this plan and billing cycle.';
      setError(message);
      triggerToast?.('info', isVietnamese ? 'Chưa mở thanh toán thẻ' : 'Card payment unavailable', message);
      return;
    }
    window.localStorage.setItem('apexa_pending_upgrade_plan', plan);
    window.localStorage.setItem('apexa_pending_upgrade_cycle', cycle);
    await redirectToBilling(plan, '/api/billing/card-checkout', {
      plan,
      cycle,
      returnPath: `${window.location.pathname}${window.location.search}`,
    });
  };

  const selectPlan = (plan: BillingPlan) => {
    if (plan === 'free') {
      if (entitlement.is_pro && entitlement.provider === 'stripe') {
        void redirectToBilling(plan, '/api/billing/portal');
      } else if (entitlement.is_pro) {
        const message = isVietnamese
          ? 'Gói trả trước không tự động gia hạn và sẽ tự trở về Free khi hết hạn.'
          : 'Prepaid plans do not auto-renew and return to Free when the paid period ends.';
        triggerToast?.('info', isVietnamese ? 'Không có gia hạn tự động' : 'No automatic renewal', message);
      }
      return;
    }
    if (plan === 'enterprise') {
      window.location.assign(`mailto:contact@apexa.vn?subject=${encodeURIComponent('Apexa Enterprise consultation')}`);
      return;
    }
    if (
      entitlement.provider === 'stripe' &&
      (entitlement.is_pro || ['incomplete', 'unpaid', 'past_due'].includes(entitlement.status))
    ) {
      void redirectToBilling(plan, '/api/billing/portal');
      return;
    }
    if (paymentMethod === 'paypal') {
      if (!paypalConfigured) {
        setError(isVietnamese ? 'PayPal đang được thiết lập. Vui lòng chọn phương thức khác.' : 'PayPal is being set up. Please choose another payment method.');
        return;
      }
      if (creationRef.current) return;
      creationRef.current = true;
      void redirectToBilling(plan, '/api/billing/paypal-checkout', { plan, cycle });
      return;
    }
    if (paymentMethod === 'card') {
      void startCardCheckout(plan);
      return;
    }
    if (!billingConfigured || !prices[plan]?.[cycle]) {
      const message = isVietnamese
        ? 'Kênh thanh toán PayOS chưa được cấu hình đầy đủ.'
        : 'PayOS billing is not fully configured yet.';
      setError(message);
      triggerToast?.('info', isVietnamese ? 'Gói sắp mở bán' : 'Plan coming soon', message);
      return;
    }
    void startPayOSCheckout(plan);
  };

  const numberLocale = isVietnamese ? 'vi-VN' : 'en-US';
  const formatMoney = (amount: number, currency = 'vnd') =>
    new Intl.NumberFormat(numberLocale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: currency.toLowerCase() === 'usd' ? 2 : 0,
    }).format(amount / (zeroDecimalCurrencies.has(currency.toLowerCase()) ? 1 : 100));

  const displayPrice = (plan: BillingPlan) => {
    if (plan === 'free') {
      return {
        value: formatMoney(0),
        suffix: isVietnamese ? '/ vĩnh viễn' : '/ forever',
        rawMonthly: 0,
        rawTotal: 0,
        formattedMonthly: formatMoney(0),
        originalMonthly: null,
      };
    }
    if (plan === 'enterprise') {
      return {
        value: isVietnamese ? 'Liên hệ' : 'Custom',
        suffix: isVietnamese ? 'theo nhu cầu' : 'tailored',
        rawMonthly: 0,
        rawTotal: 0,
        formattedMonthly: isVietnamese ? 'Liên hệ' : 'Custom',
        originalMonthly: null,
      };
    }

    const paypal = paymentMethod === 'paypal';
    const catalog = paypal ? paypalPrices : prices;
    const defaults = paypal ? PAYPAL_DEFAULT_PRICES : SUGGESTED_PRICES;
    const live = catalog[plan]?.[cycle];
    const currency = paypal ? 'usd' : (live?.currency || 'vnd');
    const amount = live?.unit_amount ?? defaults[plan][cycle];
    const rawMonthlyPrice = catalog[plan]?.monthly?.unit_amount ?? defaults[plan].monthly;

    // Clean rounded monthly breakdown (e.g. 149.000 instead of 149.167)
    const exactMonthly = cycle === 'yearly' ? amount / 12 : amount;
    const roundedMonthly = paypal ? Math.round(exactMonthly) : Math.round(exactMonthly / 1000) * 1000;

    return {
      value: formatMoney(roundedMonthly, currency),
      suffix: isVietnamese ? '/ tháng' : '/ month',
      totalValue: formatMoney(amount, currency),
      rawMonthly: roundedMonthly,
      rawTotal: amount,
      originalMonthly: cycle === 'yearly' ? formatMoney(rawMonthlyPrice, currency) : null,
    };
  };

  // 4 Primary Grid Plans: Free, Starter, Pro, Business (Enterprise is featured below in a VIP luxury banner)
  const corePlans: SelfServeBillingPlan[] = ['starter', 'pro', 'business'];
  const hasBillingIssue = ['incomplete', 'unpaid', 'past_due'].includes(entitlement.status);

  const cancelCheckout = useCallback(async () => {
    if (!checkout || verificationRef.current || cancelling) return;
    setCancelling(true);
    setError('');
    try {
      const result = await authorizedFetch('/api/billing/checkout', {
        method: 'DELETE',
        body: JSON.stringify({ orderCode: checkout.orderCode }),
      });
      if (result.status === 'paid') {
        await checkPaymentStatus(checkout, true);
        return;
      }
      if (!['cancelled', 'expired', 'failed'].includes(result.status)) {
        throw new Error(isVietnamese ? 'Chưa thể xác nhận hủy đơn. Vui lòng kiểm tra lại.' : 'Cancellation is not confirmed. Please check again.');
      }
      setCheckoutStatus(result.status);
      addSyncLog?.(`Cancelled PayOS order ${checkout.orderCode}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : (isVietnamese ? 'Không thể hủy đơn.' : 'Unable to cancel order.'));
    } finally {
      setCancelling(false);
    }
  }, [addSyncLog, authorizedFetch, checkPaymentStatus, checkout, isVietnamese, cancelling]);

  const expireCheckout = useCallback(() => {
    if (!checkout) return;
    setCheckoutStatus('expired');
    void checkPaymentStatus(checkout, true);
  }, [checkPaymentStatus, checkout]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-3 sm:p-5">
          {/* Ambient Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !loadingPlan && handleModalClose()}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Main Modal Shell */}
          <motion.section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={checkout ? (checkoutStatus === 'success' ? undefined : 'checkout-title') : cardSuccess ? undefined : 'pricing-modal-title'}
            aria-label={checkoutStatus === 'success' || cardSuccess ? (isVietnamese ? 'Kết quả thanh toán' : 'Payment result') : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className={`relative z-10 my-auto w-full transition-all duration-300 ${
              checkout
                ? 'max-w-[1060px] max-h-[94dvh] overflow-y-auto rounded-[32px] border border-slate-200/90 bg-[#f8fafc] shadow-[0_30px_90px_-20px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950'
                : 'max-w-[1240px] max-h-[92dvh] overflow-y-auto rounded-[32px] border border-slate-200/80 bg-[#f8fafc] shadow-[0_40px_120px_-30px_rgba(2,6,23,0.85)] dark:border-slate-800 dark:bg-slate-950'
            }`}
          >
            {/* Header Ambient Glow */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.2),transparent_70%)]" />

            {/* ======================= PRICING GRID VIEW ======================= */}
            {!checkout && !cardSuccess && (
              <>
                {/* Close Button */}
                <button
                  type="button"
                  onClick={handleModalClose}
                  disabled={Boolean(loadingPlan)}
                  aria-label={isVietnamese ? 'Đóng bảng giá' : 'Close pricing'}
                  className="absolute right-4 top-4 z-30 grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white/90 text-slate-500 shadow-2xs transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Top Header */}
                <header className="relative px-4 pb-6 pt-8 text-center sm:px-8 sm:pt-10">
                  <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/90 px-3.5 py-1 text-[11px] font-bold text-indigo-700 shadow-2xs dark:border-indigo-900/80 dark:bg-indigo-950/50 dark:text-indigo-300">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                    {isVietnamese ? 'Nâng tầm hiệu suất với Apexa' : 'Supercharge your team with Apexa'}
                  </div>
                  <h2
                    id="pricing-modal-title"
                    className="mt-3.5 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl lg:text-4xl text-balance"
                  >
                    {isVietnamese ? 'Chọn gói hoàn hảo cho quy trình của bạn' : 'Choose the plan designed for your team'}
                  </h2>
                  <p className="mx-auto mt-2 max-w-xl text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400 sm:text-sm text-pretty">
                    {isVietnamese
                      ? 'Thanh toán qua VietQR, thẻ hoặc PayPal · Kích hoạt tự động sau khi xác nhận giao dịch.'
                      : 'Pay with VietQR, card or PayPal · Activated automatically after payment verification.'}
                  </p>

                  {/* Interactive Switcher with Animated Pill */}
                  <div
                    className="mx-auto mt-5 inline-flex items-center rounded-2xl border border-slate-200/90 bg-white p-1 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                    role="radiogroup"
                    aria-label={isVietnamese ? 'Chu kỳ thanh toán' : 'Billing cycle'}
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={cycle === 'monthly'}
                      onClick={() => setCycle('monthly')}
                      className={`relative rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                        cycle === 'monthly'
                          ? 'text-white dark:text-slate-950'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      {cycle === 'monthly' && (
                        <motion.div
                          layoutId="cyclePill"
                          className="absolute inset-0 rounded-xl bg-slate-950 shadow-xs dark:bg-white"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                      <span className="relative z-10">{isVietnamese ? 'Hàng tháng' : 'Monthly'}</span>
                    </button>

                    <button
                      type="button"
                      role="radio"
                      aria-checked={cycle === 'yearly'}
                      onClick={() => setCycle('yearly')}
                      className={`relative rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                        cycle === 'yearly'
                          ? 'text-white dark:text-slate-950'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      {cycle === 'yearly' && (
                        <motion.div
                          layoutId="cyclePill"
                          className="absolute inset-0 rounded-xl bg-slate-950 shadow-xs dark:bg-white"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        {isVietnamese ? 'Hàng năm' : 'Yearly'}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold transition-colors ${
                            cycle === 'yearly'
                              ? 'bg-emerald-400/25 text-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-700'
                              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                          }`}
                        >
                          {paymentMethod === 'paypal' ? (isVietnamese ? 'Giá năm' : 'Annual rate') : '-25%'}
                        </span>
                      </span>
                    </button>
                  </div>
                </header>

                <div className="relative mx-auto mb-5 max-w-3xl px-4 sm:px-6">
                  <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-2 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" role="radiogroup" aria-label={isVietnamese ? 'Phương thức thanh toán' : 'Payment method'}>
                      {([
                        {
                          id: 'vietqr' as const,
                          icon: Landmark,
                          title: 'VietQR 24/7',
                          shortTitle: 'VietQR',
                          detail: isVietnamese ? 'Mọi ngân hàng VN' : 'All VN banks',
                          enabled: billingConfigured,
                        },
                        {
                          id: 'momo' as const,
                          icon: Smartphone,
                          title: 'MoMo',
                          shortTitle: 'MoMo',
                          detail: isVietnamese ? 'Quét VietQR' : 'Scan VietQR',
                          enabled: billingConfigured,
                        },
                        {
                          id: 'card' as const,
                          icon: CreditCard,
                          title: isVietnamese ? 'Thẻ quốc tế' : 'Card',
                          shortTitle: isVietnamese ? 'Thẻ' : 'Card',
                          detail: 'Visa · Mastercard',
                          enabled: corePlans.some((plan) => Boolean(cardAvailability[plan]?.[cycle])),
                        },
                        {
                          id: 'paypal' as const,
                          icon: Wallet,
                          title: 'PayPal',
                          shortTitle: 'PayPal',
                          detail: paypalConfigured ? 'USD · PayPal' : (isVietnamese ? 'Đang thiết lập' : 'Coming soon'),
                          enabled: true,
                        },
                      ]).map((method) => {
                        const MethodIcon = method.icon;
                        const active = paymentMethod === method.id;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            disabled={!method.enabled}
                            onClick={() => setPaymentMethod(method.id)}
                            className={`flex min-w-0 items-center justify-center gap-2 rounded-xl border px-2 py-2.5 text-left transition sm:px-4 ${
                              active
                                ? 'border-indigo-300 bg-indigo-50 text-indigo-800 shadow-sm dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200'
                                : 'border-transparent text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/70'
                            } disabled:cursor-not-allowed disabled:opacity-35`}
                          >
                            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
                              <MethodIcon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[11px] font-black sm:hidden">{method.shortTitle}</span>
                              <span className="hidden truncate text-xs font-black sm:block">{method.title}</span>
                              <span className="hidden truncate text-[9px] font-semibold opacity-70 sm:block">{method.detail}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-1.5 px-2 pb-1 text-center text-[10px] font-semibold text-slate-400">
                      <ShieldCheck className="h-3 w-3 text-emerald-500" />
                      {paymentMethod === 'paypal'
                        ? (!paypalConfigured
                          ? (isVietnamese ? 'PayPal đang được thiết lập. Bạn có thể xem giá USD và chọn phương thức khác để thanh toán.' : 'PayPal is being set up. You can preview USD prices and use another payment method.')
                          : (isVietnamese ? 'Thanh toán bằng USD qua PayPal; tự động kích hoạt sau xác nhận, không tự động gia hạn.' : 'Pay in USD with PayPal; automatic activation after confirmation, no automatic renewal.'))
                        : paymentMethod === 'card'
                        ? (isVietnamese ? 'Thanh toán định kỳ bảo mật qua Stripe; quản lý hoặc hủy bất kỳ lúc nào.' : 'Secure recurring billing through Stripe; manage or cancel anytime.')
                        : paymentMethod === 'momo'
                          ? (isVietnamese ? 'Mở MoMo, chọn Quét mã và thanh toán qua mã VietQR được tạo riêng cho đơn.' : 'Open MoMo and scan the order-specific VietQR code.')
                          : (isVietnamese ? 'Chuyển khoản tức thì qua PayOS; gói trả trước, không tự động trừ tiền.' : 'Instant PayOS transfer; prepaid with no automatic debit.')}
                    </div>
                  </div>
                </div>

                {/* 4 Cards Grid: Free, Starter, Pro (Hero), Business */}
                <main className="relative px-3 pb-8 sm:px-6 sm:pb-10">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* 1. Free Tier */}
                    {(() => {
                      const info = copy.free;
                      const current = !entitlement.is_pro;
                      return (
                        <article className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {info.audience}
                              </span>
                            </div>
                            <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                              {info.name}
                            </h3>
                            <p className="mt-1 min-h-10 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                              {info.description}
                            </p>
                            <div className="mt-3 min-h-[56px]">
                              <div className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                                0 ₫
                              </div>
                              <div className="mt-0.5 text-[11px] font-semibold text-slate-400">
                                {isVietnamese ? '/ vĩnh viễn' : '/ forever'}
                              </div>
                            </div>
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => selectPlan('free')}
                              disabled={current}
                              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-800 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-800/80 dark:text-white dark:hover:bg-slate-800"
                            >
                              {current ? (
                                <>
                                  <BadgeCheck className="h-4 w-4 text-emerald-500" />
                                  <span>{isVietnamese ? 'Gói hiện tại' : 'Current plan'}</span>
                                </>
                              ) : (
                                <span>{isVietnamese ? 'Sử dụng miễn phí' : 'Start free'}</span>
                              )}
                            </button>

                            <div className="my-4 h-px bg-slate-100 dark:bg-slate-800/80" />

                            <ul className="space-y-2">
                              {info.features.map((feature) => (
                                <li
                                  key={feature}
                                  className="flex items-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
                                >
                                  <span className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                    <Check className="h-2 w-2 stroke-[3]" />
                                  </span>
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </article>
                      );
                    })()}

                    {/* 2. Starter Tier */}
                    {(() => {
                      const plan = 'starter';
                      const info = copy[plan];
                      const price = displayPrice(plan);
                      const current = entitlement.is_pro && entitlement.plan === plan;
                      const canRenew = current && (entitlement.provider === 'payos' || entitlement.provider === 'paypal');
                      const loading = loadingPlan === plan;
                      return (
                        <article className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs transition-all hover:border-blue-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                                <Zap className="h-3 w-3" />
                                {info.audience}
                              </span>
                            </div>
                            <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                              {info.name}
                            </h3>
                            <p className="mt-1 min-h-10 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                              {info.description}
                            </p>
                            <div className="mt-3 min-h-[56px]">
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="text-2xl font-black tracking-tight text-slate-950 dark:text-white whitespace-nowrap tabular-nums">
                                  {price.value}
                                </span>
                                {price.originalMonthly && (
                                  <span className="text-xs font-semibold text-slate-400 line-through whitespace-nowrap tabular-nums">
                                    {price.originalMonthly}
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                                <span>{price.suffix}</span>{' '}
                                {cycle === 'yearly' && (
                                  <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                    ({price.totalValue}/{isVietnamese ? 'năm' : 'year'})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => selectPlan(plan)}
                              disabled={(current && !canRenew) || Boolean(loadingPlan) || checking || pricesLoading || (paymentMethod === 'paypal' && !paypalConfigured)}
                              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-2.5 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-60 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60"
                            >
                              {loading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : current ? (
                                <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                              ) : null}
                              {canRenew
                                ? isVietnamese
                                  ? `Gia hạn ${info.name}`
                                  : `Renew ${info.name}`
                                : current
                                ? isVietnamese
                                  ? 'Gói hiện tại'
                                  : 'Current plan'
                                : isVietnamese
                                ? `Chọn ${info.name}`
                                : `Choose ${info.name}`}
                              {!loading && !current && <ArrowRight className="h-3.5 w-3.5" />}
                            </button>

                            <div className="my-4 h-px bg-slate-100 dark:bg-slate-800/80" />

                            <ul className="space-y-2">
                              {info.features.map((feature) => (
                                <li
                                  key={feature}
                                  className="flex items-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
                                >
                                  <span className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                                    <Check className="h-2 w-2 stroke-[3]" />
                                  </span>
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </article>
                      );
                    })()}

                    {/* 3. Pro Tier (HERO / BEST VALUE) */}
                    {(() => {
                      const plan = 'pro';
                      const info = copy[plan];
                      const price = displayPrice(plan);
                      const current = entitlement.is_pro && entitlement.plan === plan;
                      const canRenew = current && (entitlement.provider === 'payos' || entitlement.provider === 'paypal');
                      const loading = loadingPlan === plan;
                      return (
                        <article className="relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-indigo-500 bg-white p-5 shadow-[0_20px_50px_-15px_rgba(79,70,229,0.35)] ring-2 ring-indigo-500/20 dark:bg-slate-900 dark:shadow-[0_20px_50px_-15px_rgba(79,70,229,0.5)]">
                          {/* Top Gradient Stripe */}
                          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-indigo-600 via-purple-500 to-cyan-400" />

                          <div>
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                                <Rocket className="h-3 w-3 text-indigo-600" />
                                {info.audience}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-2xs">
                                <Crown className="h-2.5 w-2.5" />
                                {isVietnamese ? 'Phổ biến nhất' : 'Most Popular'}
                              </span>
                            </div>
                            <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                              {info.name}
                            </h3>
                            <p className="mt-1 min-h-10 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                              {info.description}
                            </p>
                            <div className="mt-3 min-h-[56px]">
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="text-2xl font-black tracking-tight text-slate-950 dark:text-white whitespace-nowrap tabular-nums">
                                  {price.value}
                                </span>
                                {price.originalMonthly && (
                                  <span className="text-xs font-semibold text-slate-400 line-through whitespace-nowrap tabular-nums">
                                    {price.originalMonthly}
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                                <span>{price.suffix}</span>{' '}
                                {cycle === 'yearly' && (
                                  <span className="text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                    ({price.totalValue}/{isVietnamese ? 'năm' : 'year'})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => selectPlan(plan)}
                              disabled={(current && !canRenew) || Boolean(loadingPlan) || checking || pricesLoading || (paymentMethod === 'paypal' && !paypalConfigured)}
                              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-500/25 transition hover:shadow-lg hover:shadow-indigo-500/35 hover:-translate-y-0.5 disabled:opacity-60 whitespace-nowrap shrink-0"
                            >
                              {loading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                              ) : current ? (
                                <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
                              ) : null}
                              <span>
                                {canRenew
                                  ? isVietnamese
                                    ? `Gia hạn ${info.name}`
                                    : `Renew ${info.name}`
                                  : current
                                  ? isVietnamese
                                    ? 'Gói hiện tại'
                                    : 'Current plan'
                                  : isVietnamese
                                  ? `Nâng cấp ${info.name}`
                                  : `Upgrade to ${info.name}`}
                              </span>
                              {!loading && !current && <ArrowRight className="h-3.5 w-3.5 shrink-0" />}
                            </button>

                            <div className="my-4 h-px bg-slate-100 dark:bg-slate-800/80" />

                            <ul className="space-y-2">
                              {info.features.map((feature) => (
                                <li
                                  key={feature}
                                  className="flex items-start gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 break-words text-pretty"
                                >
                                  <span className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                    <Check className="h-2 w-2 stroke-[3]" />
                                  </span>
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </article>
                      );
                    })()}

                    {/* 4. Business Tier */}
                    {(() => {
                      const plan = 'business';
                      const info = copy[plan];
                      const price = displayPrice(plan);
                      const current = entitlement.is_pro && entitlement.plan === plan;
                      const canRenew = current && (entitlement.provider === 'payos' || entitlement.provider === 'paypal');
                      const loading = loadingPlan === plan;
                      return (
                        <article className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs transition-all hover:border-amber-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-900/60">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 whitespace-nowrap shrink-0">
                                <Layers className="h-3 w-3 shrink-0" />
                                <span>{info.audience}</span>
                              </span>
                            </div>
                            <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                              {info.name}
                            </h3>
                            <p className="mt-1 min-h-10 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400 text-pretty">
                              {info.description}
                            </p>
                            <div className="mt-3 min-h-[56px]">
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="text-2xl font-black tracking-tight text-slate-950 dark:text-white whitespace-nowrap tabular-nums">
                                  {price.value}
                                </span>
                                {price.originalMonthly && (
                                  <span className="text-xs font-semibold text-slate-400 line-through whitespace-nowrap tabular-nums">
                                    {price.originalMonthly}
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                                <span>{price.suffix}</span>{' '}
                                {cycle === 'yearly' && (
                                  <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                    ({price.totalValue}/{isVietnamese ? 'năm' : 'year'})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => selectPlan(plan)}
                              disabled={(current && !canRenew) || Boolean(loadingPlan) || checking || pricesLoading || (paymentMethod === 'paypal' && !paypalConfigured)}
                              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-800 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-800/80 dark:text-white dark:hover:bg-slate-800"
                            >
                              {loading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : current ? (
                                <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                              ) : null}
                              {canRenew
                                ? isVietnamese
                                  ? `Gia hạn ${info.name}`
                                  : `Renew ${info.name}`
                                : current
                                ? isVietnamese
                                  ? 'Gói hiện tại'
                                  : 'Current plan'
                                : isVietnamese
                                ? `Chọn ${info.name}`
                                : `Choose ${info.name}`}
                              {!loading && !current && <ArrowRight className="h-3.5 w-3.5" />}
                            </button>

                            <div className="my-4 h-px bg-slate-100 dark:bg-slate-800/80" />

                            <ul className="space-y-2">
                              {info.features.map((feature) => (
                                <li
                                  key={feature}
                                  className="flex items-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
                                >
                                  <span className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                                    <Check className="h-2 w-2 stroke-[3]" />
                                  </span>
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </article>
                      );
                    })()}
                  </div>

                  {/* ======================= ENTERPRISE VIP BANNER ======================= */}
                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 p-5 text-white shadow-sm dark:border-slate-800">
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                      <div className="max-w-2xl">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">
                            <Building2 className="h-3 w-3" />
                            {copy.enterprise.name}
                          </span>
                          <span className="text-xs font-medium text-slate-400">
                            {isVietnamese ? 'Dành cho tổ chức trên 50 người' : 'For organizations > 50 seats'}
                          </span>
                        </div>
                        <h4 className="mt-1.5 text-base font-black tracking-tight text-white">
                          {isVietnamese
                            ? 'Cần đánh giá bảo mật, triển khai riêng hoặc SLA theo hợp đồng?'
                            : 'Need a security review, tailored deployment, or a custom SLA?'}
                        </h4>
                        <p className="mt-1 text-xs text-slate-300">
                          {isVietnamese
                            ? 'Hỗ trợ xuất hóa đơn VAT, onboarding 1-1, hợp đồng pháp lý và đào tạo nội bộ theo yêu cầu.'
                            : 'Custom VAT invoicing, 1-on-1 onboarding, and custom enterprise licensing.'}
                        </p>
                      </div>

                      <a
                        href={`mailto:contact@apexa.vn?subject=${encodeURIComponent('Tư vấn gói Apexa Enterprise')}`}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black text-slate-950 shadow-md transition hover:bg-slate-100 hover:scale-105 active:scale-100"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span>{isVietnamese ? 'Liên hệ tư vấn 1-1' : 'Contact Sales'}</span>
                      </a>
                    </div>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="mx-auto mt-4 max-w-xl rounded-xl border border-rose-200 bg-rose-50/90 px-3.5 py-2.5 text-center text-xs font-bold text-rose-700 shadow-2xs dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-300"
                    >
                      {error}
                    </div>
                  )}

                  {/* Trust Badges Strip */}
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      {paymentMethod === 'paypal'
                        ? (isVietnamese ? 'Thanh toán bảo mật qua PayPal · USD' : 'Secure PayPal payment · USD')
                        : (isVietnamese ? 'Thanh toán bảo mật' : 'Secure payment')}
                    </span>
                    <span>•</span>
                    <span>{isVietnamese ? 'Gói trả trước · Không tự động trừ tiền' : 'Prepaid access · No auto-debit'}</span>
                    <span>•</span>
                    <span>{isVietnamese ? 'Biên nhận thanh toán rõ ràng' : 'Clear payment receipt'}</span>
                  </div>
                </main>
              </>
            )}

            {cardSuccess && (
              <CardPaymentSuccess
                plan={cardSuccess.plan}
                cycle={cardSuccess.cycle}
                periodEnd={entitlement.current_period_end}
                isVietnamese={isVietnamese}
                onClose={handleModalClose}
                onManage={() => void redirectToBilling(cardSuccess.plan, '/api/billing/portal')}
              />
            )}

            {checkout && (
              <PayOSCheckout
                checkout={checkout}
                isVietnamese={isVietnamese}
                planName={copy[checkout.plan].name}
                cancelling={cancelling}
                checking={manualChecking}
                status={checkoutStatus}
                error={error}
                receipt={paymentReceipt}
                onBack={closeEmbeddedCheckout}
                onClose={handleModalClose}
                onCheck={() => void checkPaymentStatus(checkout)}
                onCancel={() => void cancelCheckout()}
                onExpired={expireCheckout}
              />
            )}
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
};
