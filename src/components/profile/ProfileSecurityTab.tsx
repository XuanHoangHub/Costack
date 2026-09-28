"use client";

import React, { useState } from 'react';
import { 
  Shield, ShieldCheck, Smartphone, KeyRound, Lock, 
  RotateCcw, AlertCircle, Laptop, LogOut, Download, 
  Copy, Check, Eye, EyeOff
} from 'lucide-react';

interface ProfileSecurityTabProps {
  mfaFactors: Array<{ id: string; friendly_name?: string; status: string; created_at?: string }>;
  mfaEnrollment: { factorId: string; qrCode: string; secret: string } | null;
  mfaCode: string;
  setMfaCode: (val: string) => void;
  mfaBusy: boolean;
  mfaError: string;
  copiedSecret: boolean;
  onCopySecret: () => void;
  onStartMfaEnrollment: () => void;
  onCancelMfaEnrollment: () => void;
  onVerifyMfaEnrollment: () => void;
  onRemoveMfaFactor: (factorId: string) => void;
  // Password
  currentPassword: string;
  setCurrentPassword: (val: string) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  passwordError: string;
  isUpdatingPassword: boolean;
  onUpdatePassword: (e: React.FormEvent) => void;
  // Sessions
  isRevokingSessions: boolean;
  onRevokeSessions: () => void;
  onExportProfileJson: () => void;
  userEmail: string;
  locale: string;
}

export const ProfileSecurityTab: React.FC<ProfileSecurityTabProps> = ({
  mfaFactors,
  mfaEnrollment,
  mfaCode,
  setMfaCode,
  mfaBusy,
  mfaError,
  copiedSecret,
  onCopySecret,
  onStartMfaEnrollment,
  onCancelMfaEnrollment,
  onVerifyMfaEnrollment,
  onRemoveMfaFactor,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  passwordError,
  isUpdatingPassword,
  onUpdatePassword,
  isRevokingSessions,
  onRevokeSessions,
  onExportProfileJson,
  userEmail,
  locale,
}) => {
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Password strength calculation
  const hasMinLen = newPassword.length >= 10;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const passedCriteriaCount = [hasMinLen, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

  const strengthLabel = {
    0: { text: locale === 'vi' ? 'Rất yếu' : 'Very Weak', color: 'bg-rose-500', width: '20%' },
    1: { text: locale === 'vi' ? 'Yếu' : 'Weak', color: 'bg-rose-500', width: '30%' },
    2: { text: locale === 'vi' ? 'Tương đối' : 'Fair', color: 'bg-amber-500', width: '50%' },
    3: { text: locale === 'vi' ? 'Tốt' : 'Good', color: 'bg-sky-500', width: '75%' },
    4: { text: locale === 'vi' ? 'Mạnh' : 'Strong', color: 'bg-emerald-500', width: '90%' },
    5: { text: locale === 'vi' ? 'Rất mạnh' : 'Very Strong', color: 'bg-emerald-600', width: '100%' },
  }[newPassword.length > 0 ? passedCriteriaCount : 0] || { text: '', color: 'bg-slate-300', width: '0%' };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      
      {/* ── 1. Two-Factor Authentication (2FA TOTP) Card ── */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-8 rounded-[32px] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-sky-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                {locale === 'vi' ? 'Xác thực hai yếu tố (2FA Authenticator)' : 'Two-Factor Authentication (2FA)'}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {locale === 'vi'
                  ? 'Bảo vệ tài khoản bằng mã OTP 6 số từ Google Authenticator, Microsoft Authenticator, 1Password hoặc Apple Keychain.'
                  : 'Protect your account using 6-digit TOTP verification codes from your favorite Authenticator app.'}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="self-start sm:self-center">
            {mfaFactors.some((f) => f.status === 'verified') ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {locale === 'vi' ? 'Đang bật bảo vệ' : 'Active & Protected'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold border border-slate-200 dark:border-slate-700">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                {locale === 'vi' ? 'Chưa kích hoạt' : 'Disabled'}
              </span>
            )}
          </div>
        </div>

        {/* MFA State 1: Active Enrollment Modal / Form */}
        {mfaEnrollment ? (
          <div className="p-6 rounded-[24px] bg-blue-50/40 dark:bg-sky-950/20 border border-blue-200/70 dark:border-sky-800/60 space-y-5">
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {locale === 'vi' ? 'Thiết lập ứng dụng xác thực' : 'Set Up Authenticator App'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {locale === 'vi'
                  ? 'Dùng ứng dụng Authenticator trên điện thoại để quét mã QR hoặc nhập khóa bí mật thủ công.'
                  : 'Scan this QR code with your authenticator app or manually copy the secret key.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 items-center">
              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-md">
                <img
                  src={mfaEnrollment.qrCode}
                  alt="Costack 2FA QR Code"
                  className="w-44 h-44 object-contain select-none"
                />
                <span className="text-[10px] text-slate-400 font-semibold mt-1">
                  {locale === 'vi' ? 'Quét bằng camera ứng dụng' : 'Scan in Authenticator'}
                </span>
              </div>

              {/* Manual Code & 6-digit input */}
              <div className="space-y-4">
                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                      {locale === 'vi' ? 'Khóa thiết lập thủ công (Secret Key)' : 'Manual Setup Secret'}
                    </span>
                    <button
                      type="button"
                      onClick={onCopySecret}
                      className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSecret ? (locale === 'vi' ? 'Đã sao chép' : 'Copied') : (locale === 'vi' ? 'Sao chép' : 'Copy')}</span>
                    </button>
                  </div>
                  <code className="block text-xs font-mono font-bold text-slate-800 dark:text-slate-200 break-all select-all bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    {mfaEnrollment.secret}
                  </code>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    {locale === 'vi' ? 'Nhập mã 6 chữ số từ ứng dụng Authenticator' : 'Enter 6-digit code from Authenticator app'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    autoFocus
                    className="w-full max-w-xs text-center text-lg font-mono font-black tracking-[0.35em] p-3 bg-white dark:bg-slate-950 rounded-2xl border border-blue-400 dark:border-sky-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white"
                  />
                </div>

                {mfaError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{mfaError}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={onVerifyMfaEnrollment}
                    disabled={mfaBusy || mfaCode.length !== 6}
                    className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {mfaBusy ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>
                      {mfaBusy
                        ? (locale === 'vi' ? 'Đang xác minh...' : 'Verifying...')
                        : (locale === 'vi' ? 'Xác minh & Kích hoạt 2FA' : 'Verify & Enable 2FA')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={onCancelMfaEnrollment}
                    disabled={mfaBusy}
                    className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                  >
                    {locale === 'vi' ? 'Hủy' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : mfaFactors.some((f) => f.status === 'verified') ? (
          /* MFA State 2: Active Verified Factors */
          <div className="space-y-4">
            {mfaFactors.filter((f) => f.status === 'verified').map((factor) => (
              <div
                key={factor.id}
                className="p-5 rounded-[24px] bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {factor.friendly_name || 'Costack Authenticator'}
                      </span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        TOTP
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {locale === 'vi'
                        ? `Đang bảo vệ tài khoản ${userEmail} với mã OTP 30 giây.`
                        : `Protecting ${userEmail} with 30-second time-based OTP.`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveMfaFactor(factor.id)}
                  disabled={mfaBusy}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 self-start sm:self-center"
                >
                  {mfaBusy ? (locale === 'vi' ? 'Đang xử lý...' : 'Removing...') : (locale === 'vi' ? 'Tắt / Gỡ 2FA' : 'Remove 2FA')}
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* MFA State 3: Disabled / Opt-in CTA */
          <div className="p-6 rounded-[24px] bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-sky-400 rounded-2xl shrink-0 mt-0.5">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  {locale === 'vi' ? 'Bảo vệ tài khoản bằng Authenticator' : 'Protect Account with Authenticator'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-xl">
                  {locale === 'vi'
                    ? 'Khi kích hoạt, mỗi lần đăng nhập bạn sẽ được yêu cầu mã OTP 6 số từ ứng dụng trên điện thoại, ngăn chặn truy cập trái phép ngay cả khi lộ mật khẩu.'
                    : 'When enabled, signing in requires a 6-digit OTP from your phone authenticator app, preventing unauthorized access even if your password is compromised.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onStartMfaEnrollment}
              disabled={mfaBusy}
              className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{locale === 'vi' ? 'Kích hoạt 2FA Authenticator' : 'Enable 2FA Authenticator'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ── Left Column (6 Cols): Change Password Form ── */}
        <div className="lg:col-span-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-8 rounded-[32px] shadow-sm text-left space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                {locale === 'vi' ? 'Đổi mật khẩu tài khoản' : 'Change Account Password'}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {locale === 'vi' ? 'Mật khẩu cần tối thiểu 10 ký tự, kết hợp chữ và số.' : 'Password should be at least 10 characters.'}
              </p>
            </div>
          </div>

          <form onSubmit={onUpdatePassword} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                {locale === 'vi' ? 'Mật khẩu hiện tại (Nếu có)' : 'Current Password'}
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full text-xs font-bold p-3.5 pr-10 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                {locale === 'vi' ? 'Mật khẩu mới' : 'New Password'}
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={locale === 'vi' ? 'Tối thiểu 10 ký tự...' : 'Minimum 10 characters...'}
                  required
                  className="w-full text-xs font-bold p-3.5 pr-10 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPassword.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10.5px] font-bold">
                    <span className="text-slate-400">{locale === 'vi' ? 'Độ mạnh mật khẩu:' : 'Password strength:'}</span>
                    <span className="font-extrabold">{strengthLabel.text}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strengthLabel.color}`}
                      style={{ width: strengthLabel.width }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                {locale === 'vi' ? 'Xác nhận mật khẩu mới' : 'Confirm New Password'}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={locale === 'vi' ? 'Nhập lại mật khẩu mới...' : 'Re-enter new password...'}
                  required
                  className="w-full text-xs font-bold p-3.5 pr-10 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {passwordError && (
              <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isUpdatingPassword || !newPassword || !confirmPassword}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUpdatingPassword ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>{isUpdatingPassword ? (locale === 'vi' ? 'Đang cập nhật...' : 'Updating...') : (locale === 'vi' ? 'Cập nhật mật khẩu' : 'Update Password')}</span>
            </button>
          </form>
        </div>

        {/* ── Right Column (6 Cols): Active Sessions & Data Export ── */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Active Sessions Card */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-8 rounded-[32px] shadow-sm text-left space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                  {locale === 'vi' ? 'Phiên đăng nhập & Thiết bị' : 'Active Sessions & Devices'}
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {locale === 'vi' ? 'Danh sách các thiết bị đang duy trì quyền truy cập tài khoản.' : 'Devices currently signed into your account.'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 dark:text-white block">
                    {typeof window !== 'undefined'
                      ? window.navigator.userAgent.includes('Windows')
                        ? 'Windows PC'
                        : window.navigator.userAgent.includes('Mac')
                        ? 'Mac OS'
                        : 'Web Browser'
                      : 'Thiết bị hiện tại'}
                  </span>
                  <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {locale === 'vi' ? 'Phiên làm việc hiện tại (Online)' : 'Current active session (Online)'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onRevokeSessions}
              disabled={isRevokingSessions}
              className="w-full py-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isRevokingSessions ? <RotateCcw className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              <span>{locale === 'vi' ? 'Đăng xuất khỏi tất cả thiết bị khác' : 'Sign out of other devices'}</span>
            </button>
          </div>

          {/* Export Personal Data Card */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-8 rounded-[32px] shadow-sm text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-500 shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                  {locale === 'vi' ? 'Sao lưu dữ liệu hồ sơ' : 'Profile Data Export'}
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {locale === 'vi' ? 'Tải xuống toàn bộ dữ liệu hồ sơ cá nhân định dạng JSON chuẩn.' : 'Download your profile metadata and task metrics in JSON format.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onExportProfileJson}
              className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{locale === 'vi' ? 'Tải tệp sao lưu dữ liệu (.json)' : 'Download Backup Data (.json)'}</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
