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
  Landmark,
  Loader2,
  QrCode as QrCodeIcon,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  XCircle,
} from 'lucide-react';

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
};

type CheckoutStatus = 'pending' | 'checking' | 'expired' | 'cancelled' | 'failed';

type PayOSCheckoutProps = {
  checkout: PayOSCheckoutData;
  isVietnamese: boolean;
  planName: string;
  status: CheckoutStatus;
  error?: string;
  onBack: () => void;
  onClose: () => void;
  onCheck: () => void;
  onCancel: () => void;
  onExpired: () => void;
};

const BANK_NAMES: Record<string, string> = {
  '970415': 'VietinBank',
  '970436': 'Vietcombank',
  '970418': 'BIDV',
  '970405': 'Agribank',
  '970422': 'MB Bank',
  '970407': 'Techcombank',
  '970416': 'ACB',
  '970432': 'VPBank',
  '970423': 'TPBank',
  '970403': 'Sacombank',
  '970448': 'OCB',
  '970437': 'HDBank',
  '970454': 'Viet Capital Bank',
  '970441': 'VIB',
  '970443': 'SHB',
  '970449': 'LienVietPostBank',
  '970426': 'MSB',
  '970431': 'Eximbank',
};

function CopyButton({ value, label, isVietnamese }: { value: string; label: string; isVietnamese: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={`${isVietnamese ? 'Sao chép' : 'Copy'} ${label}`}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-extrabold text-slate-600 shadow-2xs transition hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
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
  onBack,
  onClose,
  onCheck,
  onCancel,
  onExpired,
}: PayOSCheckoutProps) {
  const [qrSvg, setQrSvg] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((Date.parse(checkout.expiresAt) - Date.now()) / 1000)));
  const expiredNotified = useRef(false);

  useEffect(() => {
    let active = true;
    setQrSvg('');
    void QRCode.toString(checkout.qrCode, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 720,
      color: { dark: '#081225', light: '#ffffff' },
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

  const timeText = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const bankName = BANK_NAMES[checkout.bin] || `${isVietnamese ? 'Ngân hàng mã BIN' : 'Bank BIN'} ${checkout.bin}`;
  const isTerminal = status === 'expired' || status === 'cancelled' || status === 'failed';
  const isChecking = status === 'checking';
  const formattedAmount = useMemo(
    () => new Intl.NumberFormat(isVietnamese ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(checkout.amount),
    [checkout.amount, isVietnamese],
  );

  return (
    <div className="relative max-h-[92dvh] overflow-y-auto p-4 sm:p-6">
      <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-2/3 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />

      <header className="relative mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-extrabold text-slate-700 shadow-2xs transition hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {isVietnamese ? 'Đổi gói' : 'Change plan'}
        </button>

        <div className="order-first w-full text-center sm:order-none sm:w-auto">
          <div className="text-sm font-black text-slate-950 dark:text-white">
            {isVietnamese ? 'Thanh toán an toàn qua PayOS' : 'Secure payment with PayOS'}
          </div>
          <div className="mt-1 flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            {isVietnamese ? 'VietQR · Đối soát tự động 24/7' : 'VietQR · Automatic verification 24/7'}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={isVietnamese ? 'Đóng thanh toán' : 'Close checkout'}
          className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-2xs transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
        >
          <XCircle className="h-4.5 w-4.5" />
        </button>
      </header>

      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
        <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-100">
              <QrCodeIcon className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
              {isVietnamese ? 'Quét mã để thanh toán' : 'Scan to pay'}
            </div>
            <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black tabular-nums ${secondsLeft <= 120 ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'}`}>
              <Clock3 className="h-3.5 w-3.5" />
              {timeText}
            </div>
          </div>

          <div className="relative flex min-h-[420px] flex-col items-center justify-center px-5 py-6 sm:min-h-[480px] sm:px-8">
            <div className="pointer-events-none absolute inset-x-12 top-12 h-56 rounded-full bg-gradient-to-r from-indigo-400/10 via-cyan-300/10 to-violet-400/10 blur-3xl" />
            <div className={`relative rounded-[30px] bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 p-[3px] shadow-[0_20px_60px_-24px_rgba(79,70,229,0.75)] transition ${isTerminal ? 'grayscale opacity-30' : ''}`}>
              <div className="relative rounded-[27px] bg-white p-3 sm:p-4">
                {qrSvg ? (
                  <div
                    role="img"
                    aria-label={isVietnamese ? `Mã VietQR cho đơn ${checkout.orderCode}` : `VietQR for order ${checkout.orderCode}`}
                    className="h-[270px] w-[270px] select-none [&_svg]:block [&_svg]:h-full [&_svg]:w-full sm:h-[330px] sm:w-[330px]"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                ) : (
                  <div className="grid h-[270px] w-[270px] place-items-center sm:h-[330px] sm:w-[330px]">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  </div>
                )}
                <div className="pointer-events-none absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border-4 border-white bg-indigo-600 text-[10px] font-black tracking-tight text-white shadow-lg">
                  APX
                </div>
              </div>
            </div>

            {isTerminal && (
              <div className="absolute inset-0 z-10 grid place-items-center bg-white/72 px-8 text-center backdrop-blur-[2px] dark:bg-slate-900/76">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <XCircle className="mx-auto h-10 w-10 text-rose-500" />
                  <h3 className="mt-3 text-base font-black text-slate-950 dark:text-white">
                    {status === 'cancelled'
                      ? (isVietnamese ? 'Đơn thanh toán đã hủy' : 'Payment cancelled')
                      : (isVietnamese ? 'Mã thanh toán đã hết hạn' : 'Payment code expired')}
                  </h3>
                  <p className="mt-1.5 max-w-xs text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                    {isVietnamese ? 'Quay lại bảng giá để tạo mã VietQR mới.' : 'Return to plans to generate a new VietQR code.'}
                  </p>
                  <button type="button" onClick={onBack} className="mt-4 rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-black text-white transition hover:bg-indigo-600 dark:bg-white dark:text-slate-950">
                    {isVietnamese ? 'Tạo đơn mới' : 'Create new order'}
                  </button>
                </div>
              </div>
            )}

            <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2">
              <a
                href={checkout.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-black text-white shadow-sm transition hover:bg-indigo-600 dark:bg-white dark:text-slate-950"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {isVietnamese ? 'Mở trong PayOS' : 'Open in PayOS'}
              </a>
              {qrSvg && (
                <a
                  href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`}
                  download={`apexa-payos-${checkout.orderCode}.svg`}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 shadow-2xs transition hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Download className="h-3.5 w-3.5" />
                  {isVietnamese ? 'Tải mã QR' : 'Download QR'}
                </a>
              )}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="rounded-[28px] border border-slate-200/90 bg-white p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
                  {isVietnamese ? 'Đơn hàng của bạn' : 'Your order'}
                </div>
                <h3 className="mt-1.5 text-xl font-black tracking-tight text-slate-950 dark:text-white">Apexa {planName}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {checkout.cycle === 'yearly'
                    ? (isVietnamese ? 'Gói trả trước 12 tháng' : '12-month prepaid plan')
                    : (isVietnamese ? 'Gói trả trước 1 tháng' : '1-month prepaid plan')}
                </p>
              </div>
              <div className="rounded-2xl bg-indigo-50 px-3 py-2 text-right dark:bg-indigo-950/50">
                <div className="text-[10px] font-bold text-indigo-500">PayOS</div>
                <div className="text-xs font-black text-indigo-700 dark:text-indigo-300">#{checkout.orderCode}</div>
              </div>
            </div>

            <div className="my-5 h-px bg-slate-100 dark:bg-slate-800" />

            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{isVietnamese ? 'Số tiền' : 'Amount'}</div>
                  <div className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{formattedAmount}</div>
                </div>
                <CopyButton value={String(checkout.amount)} label={isVietnamese ? 'số tiền' : 'amount'} isVietnamese={isVietnamese} />
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/45">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <Landmark className="h-3.5 w-3.5" /> {isVietnamese ? 'Tài khoản nhận' : 'Receiving account'}
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-slate-900 dark:text-white">{bankName}</div>
                    <div className="mt-0.5 font-mono text-sm font-extrabold tracking-wide text-indigo-600 dark:text-indigo-300">{checkout.accountNumber}</div>
                    <div className="mt-1 truncate text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">{checkout.accountName}</div>
                  </div>
                  <CopyButton value={checkout.accountNumber} label={isVietnamese ? 'số tài khoản' : 'account number'} isVietnamese={isVietnamese} />
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/25">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-700/70 dark:text-amber-300/70">{isVietnamese ? 'Nội dung chuyển khoản' : 'Transfer reference'}</div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="font-mono text-base font-black tracking-[0.08em] text-amber-900 dark:text-amber-100">{checkout.description}</div>
                  <CopyButton value={checkout.description} label={isVietnamese ? 'nội dung' : 'reference'} isVietnamese={isVietnamese} />
                </div>
                <p className="mt-2 text-[10px] font-semibold leading-relaxed text-amber-700 dark:text-amber-300/80">
                  {isVietnamese ? 'Giữ nguyên nội dung này để hệ thống kích hoạt đúng tài khoản.' : 'Keep this exact reference so we can activate the correct account.'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <span className="relative mt-1 flex h-2.5 w-2.5 shrink-0">
                {!isTerminal && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />}
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isTerminal ? 'bg-slate-400' : 'bg-emerald-500'}`} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-black text-slate-900 dark:text-white">
                    {isChecking
                      ? (isVietnamese ? 'Đang đối soát giao dịch…' : 'Verifying transaction…')
                      : (isVietnamese ? 'Đang chờ thanh toán' : 'Waiting for payment')}
                  </div>
                  {isChecking && <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />}
                </div>
                <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                  {isVietnamese ? 'Hệ thống tự kiểm tra mỗi vài giây. Gói sẽ được kích hoạt ngay khi PayOS xác nhận.' : 'We check automatically every few seconds and activate your plan after PayOS confirms.'}
                </p>
              </div>
            </div>

            {error && (
              <div role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] font-bold text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300">
                {error}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onCheck}
                disabled={isChecking || isTerminal}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                {isVietnamese ? 'Tôi đã chuyển khoản' : 'I have paid'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={isChecking || isTerminal}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {isVietnamese ? 'Hủy đơn' : 'Cancel order'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              [Smartphone, isVietnamese ? 'Mọi app ngân hàng' : 'All banking apps'],
              [ShieldCheck, isVietnamese ? 'Xác thực PayOS' : 'PayOS verified'],
              [CheckCircle2, isVietnamese ? 'Kích hoạt tự động' : 'Auto activation'],
            ].map(([Icon, label]) => {
              const BadgeIcon = Icon as typeof Smartphone;
              return (
                <div key={String(label)} className="rounded-2xl border border-slate-200/80 bg-white/70 px-2 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                  <BadgeIcon className="mx-auto h-4 w-4 text-emerald-500" />
                  <div className="mt-1.5 text-[9px] font-extrabold leading-tight text-slate-500 dark:text-slate-400">{String(label)}</div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
