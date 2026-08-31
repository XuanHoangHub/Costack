"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  HelpCircle,
  Landmark,
  Loader2,
  QrCode as QrCodeIcon,
  RefreshCw,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  X,
  XCircle,
  Zap,
  Crown,
} from 'lucide-react';
import { PaymentSuccess } from '@/components/billing/PaymentSuccess';

export type PayOSCheckoutData = {
  url: string;
  returnUrl: string;
  orderCode: number;
  plan: 'starter' | 'pro' | 'business';
  cycle: 'monthly' | 'yearly';
  amount: number;
  description: string;
  expiresAt: string;
  qrCode: string;
  accountNumber: string;
  accountName: string;
  bin: string;
  method?: 'vietqr' | 'momo';
};

export type PaymentReceipt = {
  orderCode: number;
  plan: 'starter' | 'pro' | 'business';
  cycle: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  paidAt?: string | null;
  reference?: string | null;
  periodEnd?: string | null;
  subscriptionStatus?: string;
  provider: 'payos';
};

type CheckoutStatus = 'pending' | 'checking' | 'success' | 'expired' | 'cancelled' | 'failed';

type PayOSCheckoutProps = {
  checkout: PayOSCheckoutData;
  isVietnamese: boolean;
  planName: string;
  status: CheckoutStatus;
  error?: string;
  receipt?: PaymentReceipt | null;
  onBack: () => void;
  onClose: () => void;
  onCheck: () => void;
  onCancel: () => void;
  onExpired: () => void;
};

const BANK_INFO: Record<string, { shortName: string; fullName: string }> = {
  '970422': { shortName: 'MB Bank', fullName: 'Ngân hàng TMCP Quân Đội' },
  '970436': { shortName: 'Vietcombank', fullName: 'Ngân hàng TMCP Ngoại thương VN' },
  '970407': { shortName: 'Techcombank', fullName: 'Ngân hàng TMCP Kỹ thương VN' },
  '970415': { shortName: 'VietinBank', fullName: 'Ngân hàng TMCP Công thương VN' },
  '970418': { shortName: 'BIDV', fullName: 'Ngân hàng TMCP Đầu tư và Phát triển VN' },
  '970416': { shortName: 'ACB', fullName: 'Ngân hàng TMCP Á Châu' },
  '970432': { shortName: 'VPBank', fullName: 'Ngân hàng TMCP Việt Nam Thịnh Vượng' },
  '970423': { shortName: 'TPBank', fullName: 'Ngân hàng TMCP Tiên Phong' },
  '970403': { shortName: 'Sacombank', fullName: 'Ngân hàng TMCP Sài Gòn Thương Tín' },
  '970448': { shortName: 'OCB', fullName: 'Ngân hàng TMCP Phương Đông' },
  '970437': { shortName: 'HDBank', fullName: 'Ngân hàng TMCP Phát triển TP.HCM' },
  '970454': { shortName: 'BVBank', fullName: 'Ngân hàng TMCP Bản Việt' },
  '970441': { shortName: 'VIB', fullName: 'Ngân hàng TMCP Quốc tế VN' },
  '970443': { shortName: 'SHB', fullName: 'Ngân hàng TMCP Sài Gòn - Hà Nội' },
  '970449': { shortName: 'LPBank', fullName: 'Ngân hàng TMCP Lộc Phát VN' },
  '970426': { shortName: 'MSB', fullName: 'Ngân hàng TMCP Hàng Hải' },
  '970431': { shortName: 'Eximbank', fullName: 'Ngân hàng TMCP Xuất Nhập Khẩu VN' },
  '970405': { shortName: 'Agribank', fullName: 'Ngân hàng Nông nghiệp và PTNT VN' },
  '970428': { shortName: 'Nam A Bank', fullName: 'Ngân hàng TMCP Nam Á' },
  '970425': { shortName: 'ABBANK', fullName: 'Ngân hàng TMCP An Bình' },
  '970429': { shortName: 'SCB', fullName: 'Ngân hàng TMCP Sài Gòn' },
  '970414': { shortName: 'OceanBank', fullName: 'Ngân hàng TNHH MTV Đại Dương' },
  '970409': { shortName: 'Bac A Bank', fullName: 'Ngân hàng TMCP Bắc Á' },
  '970412': { shortName: 'PVcomBank', fullName: 'Ngân hàng TMCP Đại Chúng VN' },
  '970438': { shortName: 'BaoViet Bank', fullName: 'Ngân hàng TMCP Bảo Việt' },
  '970452': { shortName: 'KienlongBank', fullName: 'Ngân hàng TMCP Kiên Long' },
  '970430': { shortName: 'PG Bank', fullName: 'Ngân hàng TMCP Thịnh vượng và Phát triển' },
  '970433': { shortName: 'VietBank', fullName: 'Ngân hàng TMCP Việt Nam Thương Tín' },
  '970440': { shortName: 'SeABank', fullName: 'Ngân hàng TMCP Đông Nam Á' },
  '970446': { shortName: 'COOPBANK', fullName: 'Ngân hàng Hợp tác xã VN' },
  '970400': { shortName: 'SaigonBank', fullName: 'Ngân hàng TMCP Sài Gòn Công Thương' },
  '970457': { shortName: 'Woori Bank', fullName: 'Ngân hàng TNHH MTV Woori Việt Nam' },
  '970458': { shortName: 'UOB', fullName: 'Ngân hàng TNHH MTV United Overseas Bank VN' },
  '970462': { shortName: 'KBank', fullName: 'Ngân hàng Kasikornbank VN' },
  '970463': { shortName: 'CIMB', fullName: 'Ngân hàng TNHH MTV CIMB Việt Nam' },
  '970466': { shortName: 'Cake by VPBank', fullName: 'Ngân hàng số Cake by VPBank' },
  '970467': { shortName: 'Timo by BVBank', fullName: 'Ngân hàng số Timo by BVBank' },
};

function CopyButton({
  value,
  label,
  isVietnamese,
  variant = 'default',
}: {
  value: string;
  label: string;
  isVietnamese: boolean;
  variant?: 'default' | 'compact' | 'accent';
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopied(false);
      }
    },
    [value],
  );

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={copy}
        title={`${isVietnamese ? 'Sao chép' : 'Copy'} ${label}`}
        aria-label={`${isVietnamese ? 'Sao chép' : 'Copy'} ${label}`}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-2xs transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-slate-700 dark:hover:text-white"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    );
  }

  if (variant === 'accent') {
    return (
      <button
        type="button"
        onClick={copy}
        aria-label={`${isVietnamese ? 'Sao chép' : 'Copy'} ${label}`}
        className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-black shadow-2xs transition active:scale-95 ${
          copied
            ? 'border-emerald-300 bg-emerald-500 text-white shadow-emerald-500/25'
            : 'border-amber-300/80 bg-amber-500/10 text-amber-900 hover:bg-amber-500/20 dark:border-amber-600/40 dark:bg-amber-400/10 dark:text-amber-200'
        }`}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        <span>{copied ? (isVietnamese ? 'Đã chép!' : 'Copied!') : (isVietnamese ? 'Sao chép' : 'Copy')}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`${isVietnamese ? 'Sao chép' : 'Copy'} ${label}`}
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-black shadow-2xs transition active:scale-95 ${
        copied
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
          : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:bg-slate-700'
      }`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      <span>{copied ? (isVietnamese ? 'Đã chép' : 'Copied') : (isVietnamese ? 'Sao chép' : 'Copy')}</span>
    </button>
  );
}

export function PayOSCheckout({
  checkout,
  isVietnamese,
  planName,
  status,
  error,
  receipt,
  onBack,
  onClose,
  onCheck,
  onCancel,
  onExpired,
}: PayOSCheckoutProps) {
  const [qrSvg, setQrSvg] = useState('');
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [copyAllSuccess, setCopyAllSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'guide'>('qr');
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((Date.parse(checkout.expiresAt) - Date.now()) / 1000)),
  );
  const expiredNotified = useRef(false);

  useEffect(() => {
    let active = true;
    setQrSvg('');
    void QRCode.toString(checkout.qrCode, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 720,
      color: { dark: '#0a0f1d', light: '#ffffff' },
    }).then((svg) => {
      if (active) setQrSvg(svg);
    });
    return () => {
      active = false;
    };
  }, [checkout.qrCode]);

  useEffect(() => {
    const update = () => {
      const next = Math.max(0, Math.ceil((Date.parse(checkout.expiresAt) - Date.now()) / 1000));
      setSecondsLeft(next);
      if (next === 0 && !expiredNotified.current) {
        expiredNotified.current = true;
        onExpired();
      }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [checkout.expiresAt, onExpired]);

  const bank = BANK_INFO[checkout.bin] || {
    shortName: `Bank ${checkout.bin}`,
    fullName: `${isVietnamese ? 'Ngân hàng mã BIN' : 'Bank BIN'} ${checkout.bin}`,
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isTerminal = status === 'expired' || status === 'cancelled' || status === 'failed';
  const isChecking = status === 'checking';

  const formattedAmount = useMemo(
    () =>
      new Intl.NumberFormat(isVietnamese ? 'vi-VN' : 'en-US', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(checkout.amount),
    [checkout.amount, isVietnamese],
  );

  // Copy all details shortcut
  const handleCopyAll = useCallback(async () => {
    const fullText = isVietnamese
      ? `THÔNG TIN CHUYỂN KHOẢN APEXA:\n- Ngân hàng: ${bank.shortName} (${bank.fullName})\n- Số tài khoản: ${checkout.accountNumber}\n- Chủ tài khoản: ${checkout.accountName}\n- Số tiền: ${formattedAmount}\n- Nội dung chuyển khoản: ${checkout.description}`
      : `APEXA PAYMENT DETAILS:\n- Bank: ${bank.shortName}\n- Account Number: ${checkout.accountNumber}\n- Account Name: ${checkout.accountName}\n- Amount: ${formattedAmount}\n- Transfer Content: ${checkout.description}`;

    try {
      await navigator.clipboard.writeText(fullText);
      setCopyAllSuccess(true);
      window.setTimeout(() => setCopyAllSuccess(false), 2200);
    } catch {}
  }, [bank.fullName, bank.shortName, checkout.accountName, checkout.accountNumber, checkout.description, formattedAmount, isVietnamese]);

  // High-Resolution Branded VietQR Image Exporter
  const handleDownloadBrandedQR = useCallback(async () => {
    try {
      setDownloadingImage(true);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scale = 2; // 2x for Retina quality
      canvas.width = 600 * scale;
      canvas.height = 760 * scale;
      ctx.scale(scale, scale);

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 760);

      // Top banner
      const grad = ctx.createLinearGradient(0, 0, 600, 100);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(1, '#312e81');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 600, 96);

      // Top Header text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('APEXA PRODUCTIVITY', 28, 42);

      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#a5b4fc';
      ctx.fillText(`VIETQR · NAPAS 24/7 · #${checkout.orderCode}`, 28, 66);

      // Generate QR onto intermediate canvas
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, checkout.qrCode, {
        width: 380,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: { dark: '#090d16', light: '#ffffff' },
      });

      // Draw QR container shadow & border
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(100, 120, 400, 400, 20);
      } else {
        ctx.rect(100, 120, 400, 400);
      }
      ctx.fill();
      ctx.stroke();

      // Draw QR image
      ctx.drawImage(qrCanvas, 110, 130, 380, 380);

      // Draw center APX badge
      ctx.fillStyle = '#4f46e5';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(270, 290, 60, 60, 14);
      } else {
        ctx.rect(270, 290, 60, 60);
      }
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('APX', 300, 326);
      ctx.textAlign = 'left';

      // Summary Card Bottom
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(28, 540, 544, 180, 16);
      } else {
        ctx.rect(28, 540, 544, 180);
      }
      ctx.fill();

      // Labels & values
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(isVietnamese ? 'SỐ TIỀN THANH TOÁN' : 'PAYMENT AMOUNT', 48, 570);
      ctx.fillText(isVietnamese ? 'NGÂN HÀNG & SỐ TÀI KHOẢN' : 'BANK & ACCOUNT NUMBER', 48, 624);
      ctx.fillText(isVietnamese ? 'NỘI DUNG CHUYỂN KHOẢN' : 'TRANSFER CONTENT', 48, 678);

      ctx.fillStyle = '#0f172a';
      ctx.font = '900 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(formattedAmount, 48, 594);

      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`${bank.shortName} - ${checkout.accountNumber} (${checkout.accountName})`, 48, 646);

      ctx.fillStyle = '#d97706';
      ctx.font = '900 17px monospace';
      ctx.fillText(checkout.description, 48, 700);

      // Download trigger
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Apexa_VietQR_${checkout.orderCode}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Error generating branded QR image', e);
    } finally {
      setDownloadingImage(false);
    }
  }, [bank.shortName, checkout.accountName, checkout.accountNumber, checkout.description, checkout.orderCode, checkout.qrCode, formattedAmount, isVietnamese]);

  const planBadgeTheme = useMemo(() => {
    switch (checkout.plan) {
      case 'starter':
        return {
          icon: Rocket,
          badgeBg: 'bg-cyan-500/10 text-cyan-600 border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-800',
          glow: 'from-cyan-500/15 via-indigo-500/10 to-transparent',
        };
      case 'pro':
        return {
          icon: Zap,
          badgeBg: 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-800',
          glow: 'from-indigo-500/20 via-violet-500/10 to-transparent',
        };
      case 'business':
        return {
          icon: Crown,
          badgeBg: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-800',
          glow: 'from-amber-500/20 via-orange-500/10 to-transparent',
        };
      default:
        return {
          icon: Sparkles,
          badgeBg: 'bg-slate-500/10 text-slate-600 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-800',
          glow: 'from-indigo-500/10 via-transparent to-transparent',
        };
    }
  }, [checkout.plan]);

  const PlanIcon = planBadgeTheme.icon;

  if (status === 'success') {
    return (
      <PaymentSuccess
        checkout={checkout}
        receipt={receipt}
        planName={planName}
        isVietnamese={isVietnamese}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="relative max-h-[92dvh] overflow-y-auto p-4 sm:p-6 lg:p-8">
      {/* Dynamic ambient backdrop blur */}
      <div
        className={`pointer-events-none absolute -top-16 left-1/2 h-80 w-3/4 -translate-x-1/2 rounded-full bg-gradient-to-b ${planBadgeTheme.glow} blur-3xl opacity-70`}
      />

      {/* Top Header Bar */}
      <header className="relative mb-6 flex items-center justify-between gap-4 border-b border-slate-200/80 pb-5 dark:border-slate-800/80">
        <button
          type="button"
          onClick={onBack}
          className="group inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 text-xs font-black text-slate-700 shadow-2xs backdrop-blur-md transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>{isVietnamese ? 'Đổi gói cước' : 'Change plan'}</span>
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse" />
            <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white sm:text-base">
              {isVietnamese ? 'Thanh toán bảo mật VietQR' : 'Secure VietQR Payment'}
            </h2>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{isVietnamese ? 'Napas 24/7 · Đối soát tự động tức thì' : 'Napas 24/7 · Instant Auto Verification'}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={isVietnamese ? 'Đóng cửa sổ thanh toán' : 'Close payment modal'}
          className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white/90 text-slate-500 shadow-2xs backdrop-blur-md transition hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-300"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* Main 2-Column Grid */}
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(370px,1.15fr)]">
        {/* ================= LEFT COLUMN: QR CODE & SCANNER ================= */}
        <section className="flex flex-col overflow-hidden rounded-[30px] border border-slate-200/90 bg-white shadow-[0_20px_60px_-25px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900">
          {/* QR Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-800/50">
            {/* Tab switch: QR vs Guide */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-200/60 p-1 dark:bg-slate-950/60">
              <button
                type="button"
                onClick={() => setActiveTab('qr')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-extrabold transition ${
                  activeTab === 'qr'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <QrCodeIcon className="h-3.5 w-3.5 text-indigo-500" />
                <span>{isVietnamese ? 'Mã VietQR' : 'VietQR Code'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-extrabold transition ${
                  activeTab === 'guide'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
                <span>{isVietnamese ? 'Hướng dẫn' : 'How to pay'}</span>
              </button>
            </div>

            {/* Countdown Badge */}
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[11px] font-black tabular-nums transition-colors ${
                secondsLeft <= 120
                  ? 'border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
                  : secondsLeft <= 300
                  ? 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300'
              }`}
            >
              <Clock3 className="h-3.5 w-3.5" />
              <span>{timeText}</span>
            </div>
          </div>

          {/* QR Content Body */}
          {activeTab === 'qr' ? (
            <div className="relative flex flex-1 flex-col items-center justify-between p-6 sm:p-7">
              {/* VietQR & Napas Branding Bar inside Frame */}
              <div className="mb-4 flex items-center justify-center gap-3">
                <div className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-black tracking-wider text-sky-700 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                  VIETQR
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[10px] font-black tracking-wider text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  NAPAS 247
                </div>
              </div>

              {/* QR Container Card */}
              <div className="relative">
                <div
                  className={`relative rounded-[28px] bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 p-[3px] shadow-[0_20px_50px_-20px_rgba(79,70,229,0.5)] transition ${
                    isTerminal ? 'grayscale opacity-30' : ''
                  }`}
                >
                  <div className="relative overflow-hidden rounded-[25px] bg-white p-4 sm:p-5">
                    {qrSvg ? (
                      <div
                        role="img"
                        aria-label={
                          isVietnamese
                            ? `Mã VietQR cho đơn hàng ${checkout.orderCode}`
                            : `VietQR for order ${checkout.orderCode}`
                        }
                        className="h-[250px] w-[250px] select-none [&_svg]:block [&_svg]:h-full [&_svg]:w-full sm:h-[300px] sm:w-[300px]"
                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                      />
                    ) : (
                      <div className="grid h-[250px] w-[250px] place-items-center sm:h-[300px] sm:w-[300px]">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                      </div>
                    )}

                    {/* Center Brand Badge */}
                    <div className="pointer-events-none absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border-4 border-white bg-gradient-to-tr from-indigo-600 to-sky-500 text-[11px] font-black tracking-wider text-white shadow-xl">
                      APX
                    </div>
                  </div>
                </div>

                {/* Expiration or Cancellation Overlay */}
                {isTerminal && (
                  <div className="absolute inset-0 z-20 grid place-items-center rounded-[28px] bg-white/80 px-6 text-center backdrop-blur-xs dark:bg-slate-900/85">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                      <XCircle className="mx-auto h-9 w-9 text-rose-500" />
                      <h3 className="mt-2 text-sm font-black text-slate-950 dark:text-white">
                        {status === 'cancelled'
                          ? isVietnamese
                            ? 'Giao dịch đã hủy'
                            : 'Payment cancelled'
                          : isVietnamese
                          ? 'Mã VietQR đã hết hạn'
                          : 'VietQR expired'}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {isVietnamese
                          ? 'Vui lòng quay lại tạo đơn mới để cập nhật mã QR.'
                          : 'Please generate a new QR code to proceed.'}
                      </p>
                      <button
                        type="button"
                        onClick={onBack}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white transition hover:bg-indigo-500"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>{isVietnamese ? 'Tạo đơn mới' : 'Generate new order'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons below QR */}
              <div className="mt-6 flex w-full flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadBrandedQR}
                  disabled={downloadingImage || !qrSvg || isTerminal}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 shadow-2xs transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500"
                >
                  {downloadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  <span>{isVietnamese ? 'Tải ảnh QR (Đầy đủ)' : 'Save QR Card'}</span>
                </button>

                <a
                  href={checkout.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black text-white shadow-sm transition hover:bg-indigo-600 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>{isVietnamese ? 'Mở trong PayOS' : 'Open in PayOS'}</span>
                </a>
              </div>

              {/* Micro Helper Note */}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-slate-400">
                <Smartphone className="h-3.5 w-3.5" />
                <span>
                  {isVietnamese
                    ? 'Hỗ trợ quét qua mọi App Ngân hàng (MB, VCB, TCB, Momo...)'
                    : 'Works with all Vietnamese Banking Apps & E-Wallets'}
                </span>
              </div>
            </div>
          ) : (
            /* Guide Tab */
            <div className="flex flex-1 flex-col justify-between p-6 sm:p-7">
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {isVietnamese ? '3 bước thanh toán đơn giản:' : '3 Easy Steps to Complete Payment:'}
                </h3>

                <div className="space-y-3">
                  {[
                    {
                      step: '01',
                      title: isVietnamese ? 'Mở App Ngân hàng' : 'Open Banking App',
                      desc: isVietnamese
                        ? 'Đăng nhập vào bất kỳ ứng dụng ngân hàng nào (Vietcombank, MB Bank, Techcombank, VPBank, ACB...) hoặc Momo/ZaloPay.'
                        : 'Open your mobile banking app or e-wallet on your phone.',
                    },
                    {
                      step: '02',
                      title: isVietnamese ? 'Quét mã VietQR' : 'Scan VietQR Code',
                      desc: isVietnamese
                        ? 'Chọn tính năng "Quét mã QR", hướng camera vào mã bên trái (hoặc tải ảnh QR về máy để tải lên từ thư viện ảnh).'
                        : 'Select QR Scan in the app and point camera at the QR code on the left.',
                    },
                    {
                      step: '03',
                      title: isVietnamese ? 'Kiểm tra & Xác nhận' : 'Verify & Confirm',
                      desc: isVietnamese
                        ? 'Số tiền và nội dung chuyển khoản được điền tự động. Xác nhận chuyển tiền, gói Apexa sẽ kích hoạt ngay sau khi đối soát.'
                        : 'Amount & transfer note are auto-filled. Confirm payment to activate Apexa immediately.',
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xs font-black text-white shadow-2xs">
                        {item.step}
                      </span>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">{item.title}</h4>
                        <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('qr')}
                className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-xs font-black text-white transition hover:bg-indigo-500"
              >
                <QrCodeIcon className="h-3.5 w-3.5" />
                <span>{isVietnamese ? 'Quay lại màn hình quét QR' : 'Back to VietQR code'}</span>
              </button>
            </div>
          )}
        </section>

        {/* ================= RIGHT COLUMN: ORDER SPECS & TRANSFER DETAILS ================= */}
        <section className="flex flex-col gap-4">
          {/* Card 1: Order Summary & Beneficiary Details */}
          <div className="relative overflow-hidden rounded-[30px] border border-slate-200/90 bg-white p-5 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.3)] dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            {/* Header info */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${planBadgeTheme.badgeBg}`}
                  >
                    <PlanIcon className="h-3 w-3" />
                    <span>Apexa {planName}</span>
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {checkout.cycle === 'yearly'
                      ? isVietnamese
                        ? '12 Tháng (-25%)'
                        : '12 Months (-25%)'
                      : isVietnamese
                      ? '1 Tháng'
                      : 'Monthly'}
                  </span>
                </div>
                <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                  {isVietnamese ? 'Chi tiết đơn hàng' : 'Order Summary'}
                </h3>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 px-3 py-2 text-right dark:border-indigo-900/60 dark:bg-indigo-950/40">
                <div className="text-[10px] font-bold text-indigo-500">Mã đơn PayOS</div>
                <div className="font-mono text-xs font-black text-indigo-700 dark:text-indigo-300">
                  #{checkout.orderCode}
                </div>
              </div>
            </div>

            <div className="my-4 h-px bg-slate-100 dark:bg-slate-800" />

            {/* Amount Banner */}
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 p-4 text-white shadow-sm dark:from-slate-950 dark:to-indigo-950">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300">
                  {isVietnamese ? 'Tổng số tiền thanh toán' : 'Total Amount Due'}
                </div>
                <div className="mt-0.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {formattedAmount}
                </div>
                <div className="text-[10px] font-medium text-slate-300">
                  {isVietnamese ? 'Số tiền niêm yết · Kích hoạt sau đối soát' : 'Listed amount · Activated after verification'}
                </div>
              </div>

              <CopyButton
                value={String(checkout.amount)}
                label={isVietnamese ? 'số tiền' : 'amount'}
                isVietnamese={isVietnamese}
              />
            </div>

            {/* Bank Card Widget */}
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Landmark className="h-3.5 w-3.5 text-indigo-500" />
                    {isVietnamese ? 'Tài khoản ngân hàng thụ hưởng' : 'Beneficiary Account'}
                  </span>
                  <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[9px] font-black text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                    Napas247
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-black text-slate-900 dark:text-white">
                        {bank.shortName}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">({bank.fullName})</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-base font-black tracking-wider text-indigo-600 dark:text-indigo-400">
                        {checkout.accountNumber}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <User className="h-3 w-3 text-slate-400" />
                      <span>{checkout.accountName}</span>
                    </div>
                  </div>

                  <CopyButton
                    value={checkout.accountNumber}
                    label={isVietnamese ? 'số tài khoản' : 'account number'}
                    isVietnamese={isVietnamese}
                  />
                </div>
              </div>

              {/* Transfer Reference Highlight (Nội dung chuyển khoản) */}
              <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 shadow-2xs dark:border-amber-700/60 dark:from-amber-950/40 dark:to-amber-900/20">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    {isVietnamese ? 'Nội dung chuyển khoản (Bắt buộc chính xác)' : 'Transfer Reference (Required)'}
                  </div>
                  <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[9px] font-black text-amber-900 dark:bg-amber-800/80 dark:text-amber-100">
                    {isVietnamese ? 'Quan trọng' : 'Crucial'}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <div className="font-mono text-lg font-black tracking-[0.12em] text-amber-950 dark:text-amber-100">
                    {checkout.description}
                  </div>
                  <CopyButton
                    value={checkout.description}
                    label={isVietnamese ? 'nội dung' : 'reference'}
                    isVietnamese={isVietnamese}
                    variant="accent"
                  />
                </div>

                <p className="mt-2 text-[11px] font-bold leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                  {isVietnamese
                    ? '⚠️ Quý khách vui lòng nhập chính xác nội dung này để hệ thống đối soát tự động và nâng cấp tài khoản trong 3-5 giây.'
                    : '⚠️ Keep this exact reference so the system can verify and activate your plan automatically.'}
                </p>
              </div>
            </div>

            {/* Copy All Details Button */}
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCopyAll}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-black text-slate-700 shadow-2xs transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500"
              >
                {copyAllSuccess ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {isVietnamese ? 'Đã sao chép tất cả thông tin CK!' : 'All payment details copied!'}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-indigo-500" />
                    <span>
                      {isVietnamese ? 'Sao chép toàn bộ thông tin thanh toán' : 'Copy all payment details'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: Live Status & Realtime Polling Action */}
          <div className="rounded-[30px] border border-slate-200/90 bg-white p-5 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.3)] dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex items-start gap-3.5">
              <div className="relative mt-1 flex h-3.5 w-3.5 shrink-0">
                {!isTerminal && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex h-3.5 w-3.5 rounded-full ${
                    isTerminal ? 'bg-slate-400' : 'bg-emerald-500'
                  }`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    {isChecking
                      ? isVietnamese
                        ? 'Đang kiểm tra giao dịch qua PayOS…'
                        : 'Checking transaction via PayOS…'
                      : isVietnamese
                      ? 'Đang lắng nghe giao dịch 24/7'
                      : 'Listening for real-time payment'}
                  </div>
                  {isChecking && <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />}
                </div>
                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                  {isVietnamese
                    ? 'Hệ thống tự động kiểm tra định kỳ. Sau khi chuyển tiền xong, bạn có thể bấm nút bên dưới để xác nhận ngay.'
                    : 'The system checks periodically. After transferring, click below to verify immediately.'}
                </p>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-3.5 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/90 px-3.5 py-2.5 text-xs font-bold text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300"
              >
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onCheck}
                disabled={isChecking || isTerminal}
                className="group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-indigo-600 px-4 text-xs font-black text-white shadow-md transition hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 transition-transform group-hover:rotate-180 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isVietnamese ? 'Tôi đã chuyển khoản' : 'I have transferred'}</span>
              </button>

              <button
                type="button"
                onClick={onCancel}
                disabled={isChecking || isTerminal}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 shadow-2xs transition hover:bg-rose-50 hover:text-rose-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
              >
                <XCircle className="h-4 w-4" />
                <span>{isVietnamese ? 'Hủy giao dịch' : 'Cancel order'}</span>
              </button>
            </div>
          </div>

          {/* Trust Guarantees 3-Grid */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            {[
              {
                icon: Smartphone,
                title: isVietnamese ? 'Mọi ngân hàng' : 'All VN Banks',
                desc: isVietnamese ? 'Napas 24/7' : 'Instant',
              },
              {
                icon: ShieldCheck,
                title: isVietnamese ? 'Bảo mật PayOS' : 'PayOS Secured',
                desc: isVietnamese ? 'Chữ ký webhook' : 'Signed webhook',
              },
              {
                icon: CheckCircle2,
                title: isVietnamese ? 'Kích hoạt tức thì' : 'Instant Upgrade',
                desc: isVietnamese ? 'Sau đối soát' : 'After verification',
              },
            ].map((item) => {
              const BadgeIcon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80"
                >
                  <BadgeIcon className="mx-auto h-4 w-4 text-emerald-500" />
                  <div className="mt-1.5 text-[11px] font-black text-slate-800 dark:text-slate-200">
                    {item.title}
                  </div>
                  <div className="mt-0.5 text-[9px] font-bold text-slate-400 dark:text-slate-500">
                    {item.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
