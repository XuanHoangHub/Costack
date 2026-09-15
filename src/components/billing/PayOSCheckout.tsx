"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { ArrowLeft, ArrowUpRight, Check, CheckCircle2, Clock3, Copy, Download, Landmark, Loader2, LockKeyhole, Mail, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react';
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
  cancelling?: boolean;
  checking?: boolean;
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

function CopyButton({ value, label, isVietnamese }: { value: string; label: string; isVietnamese: boolean }) {
  const [feedback, setFeedback] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <button type="button" aria-label={`${isVietnamese ? 'Sao chép' : 'Copy'} ${label}`} title={feedback || label}
    onClick={async () => {
      try { await navigator.clipboard.writeText(value); setFeedback(isVietnamese ? 'Đã sao chép' : 'Copied'); }
      catch { setFeedback(isVietnamese ? 'Không thể sao chép. Hãy chọn và chép thủ công.' : 'Copy unavailable. Select and copy the text manually.'); }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setFeedback(''), 2500);
    }} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-indigo-950">
    {feedback && !feedback.includes('.') ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
    <span className="sr-only" role="status">{feedback}</span>
  </button>;
}

export function PayOSCheckout({ checkout, isVietnamese: vi, planName, status, error, receipt, onBack, onClose, onCheck, onCancel, onExpired, cancelling = false, checking = false }: PayOSCheckoutProps) {
  const [qrSvg, setQrSvg] = useState('');
  const [qrError, setQrError] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const expiredNotified = useRef(false);
  const terminal = ['expired', 'cancelled', 'failed'].includes(status);
  const busy = status === 'checking' || checking || cancelling;
  const bank = BANK_INFO[checkout.bin] || { shortName: `Bank ${checkout.bin}`, fullName: `BIN ${checkout.bin}` };
  const amount = new Intl.NumberFormat(vi ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(checkout.amount);
  const cycle = checkout.cycle === 'yearly' ? (vi ? '12 tháng' : '12 months') : (vi ? '1 tháng' : '1 month');

  useEffect(() => {
    let active = true;
    setQrSvg(''); setQrError(false);
    void QRCode.toString(checkout.qrCode, { type: 'svg', errorCorrectionLevel: 'M', margin: 4, width: 320, color: { dark: '#172033', light: '#ffffff' } })
      .then(svg => { if (active) setQrSvg(svg); })
      .catch(() => { if (active) setQrError(true); });
    return () => { active = false; };
  }, [checkout.qrCode]);

  useEffect(() => { expiredNotified.current = false; setConfirmCancel(false); }, [checkout.orderCode]);
  useEffect(() => {
    if (status === 'success' || terminal) return;
    const update = () => {
      const expiry = Date.parse(checkout.expiresAt);
      const next = Number.isFinite(expiry) ? Math.max(0, Math.ceil((expiry - Date.now()) / 1000)) : 0;
      setSecondsLeft(next);
      if (next === 0 && !expiredNotified.current) { expiredNotified.current = true; onExpired(); }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [checkout.expiresAt, onExpired, status, terminal]);

  const download = useCallback(async () => {
    setDownloading(true); setDownloadError('');
    try {
      const url = await QRCode.toDataURL(checkout.qrCode, { width: 1024, margin: 4, errorCorrectionLevel: 'M' });
      const link = document.createElement('a');
      link.download = `Upgen-VietQR-${checkout.orderCode}.png`; link.href = url; link.click();
    } catch { setDownloadError(vi ? 'Không thể tải mã QR. Vui lòng thử lại.' : 'Unable to download QR. Please try again.'); }
    finally { setDownloading(false); }
  }, [checkout.orderCode, checkout.qrCode, vi]);

  if (status === 'success') return <PaymentSuccess checkout={checkout} receipt={receipt} planName={planName} isVietnamese={vi} onClose={onClose} />;

  const stateTitle = status === 'expired' ? (vi ? 'Mã thanh toán đã hết hạn' : 'Payment code expired')
    : status === 'cancelled' ? (vi ? 'Đơn thanh toán đã hủy' : 'Payment cancelled')
    : status === 'failed' ? (vi ? 'Thanh toán chưa hoàn tất' : 'Payment incomplete')
    : busy ? (vi ? 'Đang xác minh giao dịch…' : 'Verifying payment…')
    : (vi ? 'Đang chờ thanh toán' : 'Awaiting payment');
  const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';

  return <div className="relative bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-4 [&_button]:focus-visible:outline-indigo-500 [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-indigo-500">
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-8">
      <button type="button" onClick={onBack} disabled={busy} className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 disabled:opacity-50"><ArrowLeft className="h-4 w-4" />{vi ? 'Đổi gói' : 'Change plan'}</button>
      <div className="flex items-center gap-2 text-sm font-semibold"><span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-white"><Sparkles className="h-4 w-4" /></span>Upgen <span className="hidden font-normal text-slate-400 sm:inline">/ {vi ? 'Thanh toán' : 'Checkout'}</span></div>
      <button type="button" onClick={onClose} disabled={busy} aria-label={vi ? 'Đóng thanh toán' : 'Close checkout'} className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"><X className="h-5 w-5" /></button>
    </header>
    <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
      <aside className="border-b border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/40 sm:p-8 lg:border-b-0 lg:border-r">
        <div className="hidden text-xs font-semibold uppercase tracking-[0.16em] lg:block text-indigo-600 dark:text-indigo-400">{vi ? 'Không gian cho bước tiến mới' : 'Room for your next chapter'}</div>
        <h2 id="checkout-title" className="sr-only mt-3 text-3xl font-semibold tracking-tight lg:not-sr-only">{vi ? 'Hoàn tất nâng cấp.' : 'Complete your upgrade.'}</h2>
        <p className="mt-3 hidden text-sm leading-6 text-slate-500 dark:text-slate-400 lg:block">{vi ? 'Chỉ còn một bước để mở khóa quyền lợi mới cho không gian làm việc của bạn.' : 'You’re one step away from unlocking more for your workspace.'}</p>
        <section className="overflow-hidden rounded-2xl lg:mt-7 border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800"><div><p className="text-xs text-slate-500">{vi ? 'Gói đã chọn' : 'Selected plan'}</p><h3 className="mt-1 text-xl font-semibold">Upgen {planName}</h3></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{cycle}</span></div>
          <dl className="space-y-4 p-5 text-sm"><div className="hidden justify-between gap-3 lg:flex"><dt className="text-slate-500">{vi ? 'Chu kỳ thanh toán' : 'Billing period'}</dt><dd className="font-medium">{cycle}</dd></div><div className="hidden justify-between gap-3 lg:flex"><dt className="text-slate-500">{vi ? 'Hình thức' : 'Payment type'}</dt><dd className="font-medium">{vi ? 'Trả trước' : 'Prepaid'}</dd></div><div className="border-slate-200 dark:border-slate-700 lg:border-t lg:border-dashed lg:pt-4"><dt className="text-slate-500">{vi ? 'Tổng thanh toán hôm nay' : 'Total due today'}</dt><dd className="mt-2 break-words text-3xl font-semibold tracking-tight tabular-nums">{amount}</dd></div></dl>
          <p className="flex items-start gap-2 bg-slate-50 px-5 py-3 text-xs leading-5 text-slate-500 dark:bg-slate-800/50"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{vi ? 'Không tự động gia hạn hoặc trừ tiền.' : 'No automatic renewal or auto-debit.'}</p>
        </section>
        <ol aria-label={vi ? 'Tiến trình thanh toán' : 'Checkout progress'} className="mt-7 hidden gap-3 text-xs font-medium lg:flex lg:flex-col lg:gap-4">
          {[vi ? 'Chọn gói phù hợp' : 'Choose your plan', vi ? 'Thanh toán qua VietQR' : 'Pay with VietQR', vi ? 'Xác nhận & kích hoạt' : 'Confirm & activate'].map((step, i) => <li key={step} aria-current={i === 1 ? 'step' : undefined} className={`flex items-center gap-3 ${i === 2 ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${i === 0 ? 'bg-emerald-100 text-emerald-700' : i === 1 ? 'bg-indigo-600 text-white' : 'border border-slate-200 dark:border-slate-700'}`}>{i === 0 ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>{step}</li>)}
        </ol>
        <div className="mt-8 hidden items-start gap-2 text-xs leading-5 text-slate-500 lg:flex"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p>{vi ? 'Giao dịch được xử lý qua PayOS. Gói được kích hoạt sau khi hệ thống xác nhận đã nhận tiền.' : 'Payments are processed by PayOS. Your plan activates after payment is verified.'}</p></div>
      </aside>
      <main className="min-w-0 p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">{vi ? 'Quét mã để thanh toán' : 'Scan to pay'}</h3><p className="mt-1 text-sm text-slate-500">{vi ? 'Mở ứng dụng ngân hàng và quét VietQR.' : 'Open your banking app and scan VietQR.'}</p></div><span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 dark:border-slate-700"><LockKeyhole className="h-3 w-3" />PayOS</span></div>
        <div className="mt-5 flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-5 dark:border-slate-800 dark:bg-slate-900/30">
          {terminal ? <div className="flex min-h-56 flex-col items-center justify-center text-center"><Clock3 className="h-10 w-10 text-slate-400" /><p className="mt-4 font-semibold">{stateTitle}</p><p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">{vi ? 'Không chuyển tiền vào mã này. Nếu đã chuyển tiền, hãy kiểm tra lại hoặc liên hệ hỗ trợ với mã đơn bên dưới.' : 'Do not pay this code. If you already paid, check again or contact support with your order number.'}</p></div>
            : <><div className="w-full max-w-[248px] overflow-hidden rounded-xl border border-slate-100 bg-white" role="img" aria-label={vi ? 'Mã VietQR thanh toán' : 'VietQR payment code'}>
              {qrSvg ? <div dangerouslySetInnerHTML={{ __html: qrSvg }} className="aspect-square [&_svg]:h-full [&_svg]:w-full" /> : <div className="flex aspect-square items-center justify-center p-6 text-center text-sm text-slate-500">{qrError ? (vi ? 'Không thể hiển thị QR. Mở PayOS hoặc chuyển khoản thủ công.' : 'QR unavailable. Open PayOS or transfer manually.') : <Loader2 className="h-7 w-7 animate-spin" />}</div>}
            </div><div className={`mt-3 inline-flex items-center gap-1.5 text-xs ${secondsLeft <= 120 ? 'text-amber-600' : 'text-slate-500'}`}><Clock3 className="h-3.5 w-3.5" />{vi ? 'Mã có hiệu lực trong' : 'Code expires in'} <span className="font-semibold tabular-nums">{String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}</span></div>
              <div className="mt-3 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => void download()} disabled={downloading || !qrSvg} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50">{downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{vi ? 'Tải mã QR' : 'Save QR'}</button><a href={checkout.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1 rounded-lg px-3 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950">{vi ? 'Mở PayOS' : 'Open PayOS'}<ArrowUpRight className="h-4 w-4" /></a></div>
            </>}
        </div>
        {!terminal && <details className="group mt-4 rounded-xl border border-slate-200 dark:border-slate-800" open>
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium marker:text-slate-400"><Landmark className="mx-2 inline h-4 w-4 text-slate-400" />{vi ? 'Thông tin chuyển khoản' : 'Bank transfer details'}</summary>
          <dl className="border-t border-slate-100 px-4 pb-2 text-sm dark:border-slate-800">{[
            [vi ? 'Ngân hàng' : 'Bank', bank.shortName, ''], [vi ? 'Chủ tài khoản' : 'Account holder', checkout.accountName, ''],
            [vi ? 'Số tài khoản' : 'Account number', checkout.accountNumber, checkout.accountNumber], [vi ? 'Số tiền' : 'Amount', amount, String(checkout.amount)],
            [vi ? 'Nội dung' : 'Reference', checkout.description, checkout.description],
          ].map(([label, value, copyValue]) => <div key={label} className="flex items-center justify-between gap-3 py-1.5"><dt className="shrink-0 text-xs text-slate-500">{label}</dt><dd className="flex min-w-0 items-center gap-1 text-right"><span className={`select-text break-all text-sm font-medium ${value === checkout.description ? 'font-mono text-indigo-600 dark:text-indigo-400' : ''}`}>{value}</span>{copyValue && <CopyButton value={copyValue} label={label} isVietnamese={vi} />}</dd></div>)}</dl>
          <p className="rounded-b-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">{vi ? 'Giữ nguyên số tiền và nội dung chuyển khoản để được xác nhận tự động.' : 'Use the exact amount and reference for automatic verification.'}</p>
        </details>}
        <div className="mt-5" role="status" aria-live="polite"><p className="flex items-center gap-2 text-sm font-medium">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" /> : <span className={`h-2 w-2 rounded-full ${terminal ? 'bg-slate-400' : 'bg-amber-500'}`} />}{stateTitle}</p><p className="mt-1.5 text-xs leading-5 text-slate-500">{terminal ? (vi ? 'Bạn có thể chọn gói để tạo đơn mới.' : 'Choose a plan to create a new order.') : (vi ? 'Trạng thái tự cập nhật. Nếu đã chuyển tiền, không thanh toán thêm lần nữa.' : 'Status updates automatically. If you have paid, do not pay again.')}</p></div>
        {(error || downloadError) && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error || downloadError}</p>}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={terminal ? onBack : onCheck} disabled={busy} className={`${buttonClass} flex-1 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700`}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : terminal ? <ArrowLeft className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{terminal ? (vi ? 'Chọn gói & tạo đơn mới' : 'Choose plan & start again') : (vi ? 'Tôi đã chuyển khoản' : 'I’ve completed payment')}</button>{terminal && <button type="button" onClick={onCheck} disabled={busy} className={`${buttonClass} border border-slate-200 dark:border-slate-700`}><RefreshCw className="h-4 w-4" />{vi ? 'Kiểm tra lại' : 'Check again'}</button>}</div>
        {!terminal && (confirmCancel ? <div className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-xs leading-5 text-slate-500">{vi ? 'Chỉ hủy nếu bạn chưa chuyển tiền. Bạn muốn hủy đơn này?' : 'Only cancel if you have not paid. Cancel this order?'}</p><div className="mt-2 flex gap-3"><button type="button" disabled={busy} onClick={onCancel} className="min-h-10 text-xs font-semibold text-rose-600 disabled:opacity-50">{cancelling ? (vi ? 'Đang hủy…' : 'Cancelling…') : (vi ? 'Xác nhận hủy' : 'Confirm cancellation')}</button><button type="button" disabled={busy} onClick={() => setConfirmCancel(false)} className="min-h-10 text-xs font-medium text-slate-500">{vi ? 'Tiếp tục thanh toán' : 'Keep payment'}</button></div></div> : <button type="button" disabled={busy} onClick={() => setConfirmCancel(true)} className="mt-2 min-h-10 w-full text-xs text-slate-400 hover:text-rose-600 disabled:opacity-50">{vi ? 'Hủy đơn thanh toán' : 'Cancel this payment'}</button>)}
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-[11px] text-slate-400 dark:border-slate-800"><span className="break-all font-mono">#{checkout.orderCode}</span><a href={`mailto:contact@upgen.vn?subject=${encodeURIComponent(`Payment #${checkout.orderCode}`)}`} className="inline-flex min-h-8 items-center gap-1.5 hover:text-indigo-600"><Mail className="h-3.5 w-3.5" />{vi ? 'Hỗ trợ thanh toán' : 'Payment support'}</a></footer>
      </main>
    </div>
  </div>;
}
