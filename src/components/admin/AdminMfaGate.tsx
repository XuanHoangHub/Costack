"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, CheckCircle2, Copy, KeyRound, Loader2, LockKeyhole,
  QrCode, ShieldCheck, ShieldAlert, Sparkles, Check, RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useTranslation } from '@/contexts/TranslationContext';
import AuthErrorAlert from '@/components/auth/AuthErrorAlert';
import { formatAuthError, type FormattedAuthError } from '@/lib/authError';

type GateMode = 'loading' | 'setup' | 'challenge' | 'success';

export default function AdminMfaGate({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const { localize: l } = useTranslation();
  const [mode, setMode] = useState<GateMode>('loading');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FormattedAuthError | null>(null);
  const [copied, setCopied] = useState(false);

  const inspectMfa = useCallback(async () => {
    setError(null);
    try {
      const [{ data: assurance, error: assuranceError }, { data: factors, error: factorsError }] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);
      if (assuranceError) throw assuranceError;
      if (factorsError) throw factorsError;
      if (assurance.currentLevel === 'aal2') {
        setMode('success');
        onSuccess();
        return;
      }
      const verifiedFactor = factors.totp.find((factor) => factor.status === 'verified');
      if (verifiedFactor) {
        setFactorId(verifiedFactor.id);
        setMode('challenge');
      } else {
        setMode('setup');
      }
    } catch (mfaError) {
      setMode('setup');
      setError(formatAuthError(mfaError, l('vi', 'en') === 'vi'));
    }
  }, [onSuccess, l]);

  useEffect(() => {
    void inspectMfa();
  }, [inspectMfa]);

  const beginEnrollment = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;
      await Promise.all(
        factors.totp
          .filter((factor) => factor.status !== 'verified')
          .map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id })),
      );
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Costack Control Center',
      });
      if (enrollError) throw enrollError;
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch (mfaError) {
      setError(formatAuthError(mfaError, l('vi', 'en') === 'vi'));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    const normalizedCode = code.replace(/\D/g, '').slice(0, 6);
    if (!factorId || normalizedCode.length !== 6) {
      const isVietnamese = l('vi', 'en') === 'vi';
      setError({
        title: isVietnamese ? 'Mã xác thực chưa hợp lệ' : 'Invalid Verification Code',
        description: l('Vui lòng nhập đủ mã xác thực gồm 6 chữ số.', 'Enter the complete 6-digit verification code.'),
        type: 'invalid',
      });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: normalizedCode,
      });
      if (verifyError) throw verifyError;
      const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) throw assuranceError;
      if (assurance.currentLevel !== 'aal2') {
        const isVietnamese = l('vi', 'en') === 'vi';
        setError({
          title: isVietnamese ? 'Không thể xác minh phiên' : 'Session Verification Failed',
          description: l('Phiên chưa được nâng lên AAL2. Vui lòng thử lại.', 'The session was not upgraded to AAL2. Try again.'),
          type: 'generic',
        });
        return;
      }
      setMode('success');
      onSuccess();
    } catch (mfaError) {
      setError(formatAuthError(mfaError, l('vi', 'en') === 'vi'));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#060810] p-4 text-white sm:p-6 select-none font-sans">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-indigo-600/20 via-sky-600/10 to-transparent blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 right-10 h-[400px] w-[500px] rounded-full bg-gradient-to-t from-blue-600/15 to-transparent blur-[100px]" />

      <motion.section
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-[32px] border border-white/[0.12] bg-[#0c101c]/90 p-6 sm:p-8 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
      >
        {/* Top glow accent line */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400" />

        <div className="text-center">
          <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-indigo-600 to-sky-400 opacity-20 blur-xl animate-pulse" />
            <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-600/20 to-sky-500/10 text-indigo-300 shadow-inner">
              {mode === 'success' ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              ) : (
                <ShieldCheck className="h-8 w-8 text-indigo-400" />
              )}
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300 shadow-xs">
            <Sparkles className="h-3 w-3 text-indigo-400 animate-pulse" />
            {l('Cổng bảo mật Zero Trust', 'Zero-Trust security gate')}
          </div>

          <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-white">
            {l('Xác minh quản trị hai bước', 'Two-step admin verification')}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-xs font-medium leading-relaxed text-slate-400">
            {l('Danh tính của bạn đã được xác nhận. Hãy nhập mã TOTP để nâng phiên hiện tại lên ', 'Your identity is confirmed. Enter a TOTP code to upgrade this session to ')}
            <strong className="text-indigo-300">AAL2</strong>
            {l(' và mở Trung tâm điều khiển Costack.', ' and open the Costack Control Center.')}
          </p>
        </div>

        {/* Loading State */}
        {mode === 'loading' && (
          <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] py-8 text-xs font-bold text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            {l('Đang kiểm tra thiết bị xác thực…', 'Checking your authenticator…')}
          </div>
        )}

        {/* Setup Stage: Generate QR */}
        {mode === 'setup' && !qrCode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-7 rounded-2xl border border-indigo-400/20 bg-indigo-950/20 p-5 backdrop-blur-md"
          >
            <div className="flex items-start gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
                <QrCode className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-black text-white">{l('Thiết lập ứng dụng xác thực', 'Set up an authenticator app')}</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  {l('Dùng Google Authenticator, Microsoft Authenticator, 1Password hoặc ứng dụng TOTP tương thích để quét mã.', 'Scan the code with Google Authenticator, Microsoft Authenticator, 1Password, or another compatible TOTP app.')}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={beginEnrollment}
              className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 py-3.5 text-xs font-black text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {l('Tạo mã QR bảo mật', 'Generate secure QR code')}
            </button>
          </motion.div>
        )}

        {/* Setup Stage: Display QR Code */}
        {mode === 'setup' && qrCode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-7 grid gap-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:grid-cols-[160px_1fr] sm:items-center"
          >
            <div className="rounded-2xl bg-white p-2.5 shadow-2xl ring-2 ring-indigo-500/20">
              <img src={qrCode} alt={l('Mã QR TOTP của Costack', 'Costack TOTP QR code')} className="aspect-square w-full rounded-lg" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">{l('1. Quét mã QR', '1. Scan the QR code')}</h2>
              <p className="mt-1 text-[10.5px] leading-relaxed text-slate-400">
                {l('Mở ứng dụng xác thực và quét mã. Nếu không quét được, hãy sao chép khóa bảo mật:', 'Open your authenticator app and scan the code. If scanning fails, copy the security key:')}
              </p>
              <button
                type="button"
                onClick={copySecret}
                className="mt-3 flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-left font-mono text-[10px] text-indigo-200 transition-colors hover:border-indigo-400/40 hover:bg-white/[0.08]"
              >
                <span className="min-w-0 truncate select-all">{secret}</span>
                <span className="shrink-0">
                  {copied ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-sans font-black text-[10px]">
                      <Check className="h-3.5 w-3.5" /> {l('Đã sao chép', 'Copied')}
                    </span>
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </span>
              </button>
            </div>
          </motion.div>
        )}

        {/* OTP Input Form (Challenge or Setup step 2) */}
        {(mode === 'challenge' || (mode === 'setup' && qrCode)) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="admin-mfa-code" className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {mode === 'challenge'
                  ? l('Nhập mã 6 chữ số từ ứng dụng xác thực', 'Enter the 6-digit code from your authenticator')
                  : l('2. Nhập mã 6 chữ số để kích hoạt', '2. Enter the 6-digit code to activate')}
              </label>
              <span className="text-[10px] font-mono text-indigo-300 font-bold">{l('Yêu cầu AAL2', 'AAL2 required')}</span>
            </div>

            <div className="relative">
              <input
                id="admin-mfa-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void verifyCode();
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                placeholder="000000"
                className="h-16 w-full rounded-2xl border border-white/15 bg-white/[0.04] text-center font-mono text-2xl font-black tracking-[0.55em] text-white placeholder-slate-600 outline-none transition-all focus:border-indigo-400 focus:bg-white/[0.07] focus:ring-4 focus:ring-indigo-500/20 shadow-inner"
              />
            </div>

            <button
              type="button"
              disabled={busy || code.length !== 6}
              onClick={verifyCode}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 py-3.5 text-xs font-black text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LockKeyhole className="h-4 w-4" />
              )}
              {l('Xác minh và mở Trung tâm điều khiển', 'Verify and open Control Center')}
            </button>
          </motion.div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mt-4">
            <AuthErrorAlert
              error={error}
              isVietnamese={l('vi', 'en') === 'vi'}
              onClose={() => setError(null)}
              onRefresh={mode === 'challenge' ? verifyCode : beginEnrollment}
              isRefreshing={busy}
              showRefreshButton={Boolean(factorId)}
            />
          </div>
        )}

        {/* Back to main app */}
        <div className="mt-6 border-t border-white/[0.08] pt-4 text-center">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {l('Trở về không gian làm việc chính', 'Return to the main workspace')}
          </button>
        </div>
      </motion.section>
    </main>
  );
}
