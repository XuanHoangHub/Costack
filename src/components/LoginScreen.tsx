"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import {
  User, ShieldAlert, Lock, Mail,
  Eye, EyeOff, Check, CheckCircle2, Fingerprint, X,
  Sparkles, ArrowLeft, KeyRound, ShieldCheck, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTranslation } from '../contexts/TranslationContext';
import LandingPage from './landing/LandingPage';

interface LoginScreenProps {
  onLoginSuccess: (user: { name: string; email: string; avatar: string; role: 'admin' | 'member'; status: 'online' | 'busy' | 'offline' }, rememberMe: boolean) => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot';

function GlowInputField({
  id, icon: Icon, type, placeholder, value, onChange, required, rightElement, autoFocus, label
}: {
  id: string; icon: React.ElementType; type: string; placeholder: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean; rightElement?: React.ReactNode; autoFocus?: boolean; label?: string;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="space-y-1.5 text-left w-full">
      {label && (
        <label htmlFor={id} className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <span>{label}</span>
        </label>
      )}
      <div className="relative group/input w-full">
        <div className={`absolute -inset-[1.5px] rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 opacity-0 blur-[3px] transition-opacity duration-300 pointer-events-none ${isFocused ? 'opacity-60' : 'group-hover/input:opacity-20'}`} />
        <div className="relative flex items-center">
          <div className={`absolute left-3.5 z-10 transition-colors duration-200 ${isFocused ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
            <Icon className="w-4 h-4" />
          </div>
          <input
            id={id}
            type={type}
            placeholder={placeholder}
            required={required}
            value={value}
            autoFocus={autoFocus}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoComplete={type === 'email' ? 'email' : type === 'password' ? 'current-password' : 'name'}
            className={`relative w-full pl-10.5 ${rightElement ? 'pr-11' : 'pr-4'} py-3 text-xs sm:text-sm rounded-2xl bg-slate-50/80 dark:bg-slate-950/70 border transition-all duration-200 font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none shadow-2xs ${
              isFocused
                ? 'border-indigo-500 bg-white dark:bg-slate-900 ring-4 ring-indigo-500/10'
                : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          />
          {rightElement && <div className="absolute right-3 z-10">{rightElement}</div>}
        </div>
      </div>
    </div>
  );
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { t, locale } = useTranslation();
  const [isAuthActive, setIsAuthActive] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const onLoginSuccessRef = useRef(onLoginSuccess);
  const oauthCompletionRef = useRef(false);

  const isSignUp = authMode === 'signup';
  const isForgot = authMode === 'forgot';

  useEffect(() => {
    if (isAuthActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isAuthActive]);

  useEffect(() => {
    onLoginSuccessRef.current = onLoginSuccess;
  }, [onLoginSuccess]);

  useEffect(() => {
    let isActive = true;

    const cleanOAuthParams = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      url.searchParams.delete('error_code');
      url.searchParams.delete('error_description');
      url.hash = '';
      window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
    };

    const finalizeOAuthUser = (sessionUser: SupabaseAuthUser) => {
      if (!isActive || oauthCompletionRef.current) return;

      const metadata = sessionUser.user_metadata || {};
      const userEmail = sessionUser.email || metadata.email || '';
      if (!userEmail) {
        oauthCompletionRef.current = true;
        setIsAuthActive(true);
        setLoading(false);
        setError(locale === 'vi'
          ? 'Facebook chưa cấp quyền email. Hãy bật quyền email trong Facebook App rồi thử lại.'
          : 'Facebook did not provide an email address. Enable the email permission in your Facebook App and try again.');
        cleanOAuthParams();
        return;
      }

      oauthCompletionRef.current = true;
      const displayName = metadata.full_name || metadata.name || metadata.display_name || userEmail.split('@')[0] || 'Apexa Champion';
      const appRole = sessionUser.app_metadata?.role;
      const shouldRemember = sessionStorage.getItem('apexa_oauth_remember_me') !== 'false';
      sessionStorage.removeItem('apexa_oauth_remember_me');
      cleanOAuthParams();

      onLoginSuccessRef.current({
        name: displayName,
        email: userEmail,
        avatar: metadata.avatar_url || metadata.picture || metadata.avatar || '',
        role: appRole === 'admin' || userEmail === 'hoang.benjamin.creative@gmail.com' ? 'admin' : 'member',
        status: 'online',
      }, shouldRemember);
    };

    const currentUrl = new URL(window.location.href);
    const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ''));
    const oauthError = currentUrl.searchParams.get('error_description') || hashParams.get('error_description');

    if (oauthError) {
      oauthCompletionRef.current = true;
      queueMicrotask(() => {
        if (!isActive) return;
        setIsAuthActive(true);
        setLoading(false);
        setError(locale === 'vi' ? `Đăng nhập mạng xã hội thất bại: ${oauthError}` : `Social sign-in failed: ${oauthError}`);
        cleanOAuthParams();
      });
      return;
    }

    void supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (!isActive) return;
      if (sessionError) {
        console.warn('Unable to restore OAuth session:', sessionError.message);
        return;
      }
      if (session?.user) finalizeOAuthUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) finalizeOAuthUser(session.user);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [locale]);

  const hasMinLength = password.length >= 8;
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const strengthScore = [hasMinLength, hasNumber, hasSpecial, hasLetter].filter(Boolean).length;

  const getStrengthMeta = () => {
    switch (strengthScore) {
      case 0: return { text: locale === 'vi' ? 'Rất yếu' : 'Very weak', color: 'bg-rose-500', textClass: 'text-rose-500', width: '15%' };
      case 1: return { text: locale === 'vi' ? 'Yếu' : 'Weak', color: 'bg-rose-400', textClass: 'text-rose-500', width: '30%' };
      case 2: return { text: locale === 'vi' ? 'Trung bình' : 'Medium', color: 'bg-amber-400', textClass: 'text-amber-500', width: '55%' };
      case 3: return { text: locale === 'vi' ? 'Khá mạnh' : 'Strong', color: 'bg-indigo-500', textClass: 'text-indigo-500', width: '80%' };
      case 4: return { text: locale === 'vi' ? 'Tuyệt vời ✨' : 'Excellent ✨', color: 'bg-emerald-500', textClass: 'text-emerald-500', width: '100%' };
      default: return { text: locale === 'vi' ? 'Yếu' : 'Weak', color: 'bg-slate-300', textClass: 'text-slate-400', width: '0%' };
    }
  };

  const openAuth = (signUp: boolean) => {
    setIsAuthActive(true);
    setAuthMode(signUp ? 'signup' : 'signin');
    setError('');
    setSuccess('');
  };

  const closeAuth = () => {
    setIsAuthActive(false);
    setError('');
    setSuccess('');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError(locale === 'vi' ? 'Vui lòng nhập địa chỉ email của bạn.' : 'Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = new URL(window.location.href);
      redirectUrl.hash = '';
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl.toString()
      });
      if (resetError) throw resetError;

      setSuccess(
        locale === 'vi'
          ? 'Liên kết đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư!'
          : 'Password reset link sent to your email. Please check your inbox!'
      );
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || (locale === 'vi' ? 'Không thể gửi yêu cầu đặt lại mật khẩu.' : 'Unable to send password reset link.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError(t('enterCredentials') || (locale === 'vi' ? 'Vui lòng điền đầy đủ email và mật khẩu.' : 'Please enter both email and password.'));
      return;
    }
    if (isSignUp && !name.trim()) {
      setError(t('enterFullName') || (locale === 'vi' ? 'Vui lòng điền họ tên của bạn.' : 'Please enter your full name.'));
      return;
    }
    if (isSignUp && strengthScore < 3) {
      setError(t('passwordStrength') || (locale === 'vi' ? 'Mật khẩu phải đạt mức an toàn (tối thiểu 3/4 tiêu chí).' : 'Password must meet recommended safety standards.'));
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email, password,
          options: { data: { name: name.trim() } }
        });
        if (signUpError) throw signUpError;

        setSuccess(t('signupSuccess') || (locale === 'vi' ? 'Đăng ký thành công! Đang thiết lập tài khoản...' : 'Sign up successful! Preparing workspace...'));
        await new Promise((resolve) => setTimeout(resolve, 900));

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

        if (signInError) {
          setSuccess(t('verificationCheck') || (locale === 'vi' ? 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.' : 'Account created! Please check your email to verify.'));
          setLoading(false);
          setAuthMode('signin');
          return;
        }

        const sessionUser = signInData.user;
        const displayName = sessionUser?.user_metadata?.name || name || sessionUser?.email?.split('@')[0] || 'Apexa Champion';
        onLoginSuccess({
          name: displayName,
          email: sessionUser?.email || email,
          avatar: sessionUser?.user_metadata?.avatar_url || sessionUser?.user_metadata?.avatar || '',
          role: 'member',
          status: 'online'
        }, rememberMe);
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        const sessionUser = data.user;
        const displayName = sessionUser?.user_metadata?.name || sessionUser?.email?.split('@')[0] || 'Apexa Champion';

        setSuccess(t('signinSuccess') || (locale === 'vi' ? 'Đăng nhập thành công! Đang mở Apexa OS...' : 'Signed in! Entering Apexa OS...'));
        await new Promise((resolve) => setTimeout(resolve, 800));

        const userRole = sessionUser?.email?.includes('admin') || sessionUser?.email === 'hoang.benjamin.creative@gmail.com' ? 'admin' : 'member';
        onLoginSuccess({
          name: displayName,
          email: sessionUser?.email || email,
          avatar: sessionUser?.user_metadata?.avatar_url || sessionUser?.user_metadata?.avatar || '',
          role: userRole,
          status: 'online'
        }, rememberMe);
      }
    } catch (err: any) {
      console.warn('Auth notification:', err?.message || err);
      let errorMessage = err.message || (locale === 'vi' ? 'Lỗi kết nối máy chủ xác thực.' : 'Authentication server connection error.');
      if (err.message?.toLowerCase().includes('invalid login credentials') || err.message?.toLowerCase().includes('invalid_grant')) {
        errorMessage = locale === 'vi'
          ? 'Email hoặc mật khẩu không chính xác. Nếu chưa có tài khoản, bạn hãy chọn tab "Đăng ký mới".'
          : 'Invalid email or password. If you do not have an account, please switch to the "Sign Up" tab.';
      } else if (err.message?.toLowerCase().includes('user already registered')) {
        errorMessage = t('emailAlreadyRegistered') || (locale === 'vi' ? 'Địa chỉ email này đã được đăng ký. Vui lòng đăng nhập.' : 'Email is already registered. Please sign in instead.');
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = (role: 'admin' | 'member' = 'admin') => {
    setLoading(true);
    setError('');
    setSuccess(locale === 'vi' ? 'Đang mở không gian trải nghiệm...' : 'Connecting to workspace...');
    setTimeout(() => {
      onLoginSuccess({
        name: role === 'admin' ? 'Xuân Hoàn' : 'Mai Phương',
        email: role === 'admin' ? 'xuanhoan@apexa.io' : 'maiphuong@apexa.io',
        avatar: '',
        role,
        status: 'online'
      }, rememberMe);
      setLoading(false);
    }, 450);
  };

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    setLoading(true);
    setError('');
    setSuccess(locale === 'vi' ? `Đang kết nối với ${provider === 'facebook' ? 'Facebook' : 'Google'}...` : `Connecting to ${provider === 'facebook' ? 'Facebook' : 'Google'}...`);

    try {
      const redirectTo = new URL('/', window.location.origin).toString();
      sessionStorage.setItem('apexa_oauth_remember_me', String(rememberMe));

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          scopes: provider === 'facebook' ? 'email public_profile' : undefined,
        }
      });
      if (oauthError) throw oauthError;
      if (!data.url) throw new Error(locale === 'vi' ? 'Không nhận được URL đăng nhập từ Supabase.' : 'Supabase did not return an OAuth URL.');
    } catch (err: any) {
      console.warn(`${provider} OAuth error:`, err?.message || err);
      sessionStorage.removeItem('apexa_oauth_remember_me');
      setSuccess('');
      setError(err?.message || (locale === 'vi' ? 'Không thể kết nối với dịch vụ đăng nhập.' : 'Could not connect to sign-in service.'));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-[#f8fafc] text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-800">
      <LandingPage
        onSignUp={() => openAuth(true)}
        onSignIn={() => openAuth(false)}
        activeUsers={2847}
        tasksCompleted={12453}
      />

      {/* Auth Modal Overlay */}
      <AnimatePresence>
        {isAuthActive && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            {/* Backdrop with Frosted Blur & Ambient Lights */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={closeAuth}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 24 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-[440px] my-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/90 rounded-[28px] shadow-2xl shadow-indigo-950/20 p-6 sm:p-8 space-y-5.5 z-10 overflow-hidden text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Ambient Top Glow Spot */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-36 bg-gradient-to-r from-indigo-500/25 via-purple-500/20 to-cyan-500/25 blur-3xl pointer-events-none rounded-full" />

              {/* Close Button */}
              <button
                onClick={closeAuth}
                className="absolute top-4.5 right-4.5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer z-10 active:scale-90"
                aria-label={locale === 'vi' ? 'Đóng' : 'Close'}
              >
                <X className="w-4.5 h-4.5" />
              </button>

              {/* Card Header with Brand Identity */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30 ring-2 ring-indigo-500/20 shrink-0">
                    <Zap className="w-5 h-5 fill-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black tracking-widest text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">
                        Apexa OS
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                    {isForgot
                      ? (locale === 'vi' ? 'Khôi phục mật khẩu 🔑' : 'Reset your password 🔑')
                      : isSignUp
                      ? (locale === 'vi' ? 'Bắt đầu dùng Apexa 🚀' : 'Create your account 🚀')
                      : (locale === 'vi' ? 'Chào mừng trở lại! ✨' : 'Welcome back! ✨')}
                  </h2>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                    {isForgot
                      ? (locale === 'vi' ? 'Nhập email liên kết với tài khoản để nhận liên kết khôi phục.' : 'Enter your email to receive a password reset link.')
                      : isSignUp
                      ? (locale === 'vi' ? 'Tạo tài khoản miễn phí và hợp nhất không gian làm việc.' : 'Sign up for free and streamline your team workflow.')
                      : (locale === 'vi' ? 'Đăng nhập vào không gian làm việc hiệu suất cao của bạn.' : 'Connect to your workspace and continue your journey.')}
                  </p>
                </div>
              </div>

              {/* Segmented Tab Switcher (Sign In vs Sign Up) */}
              {!isForgot && (
                <div className="relative p-1 bg-slate-100/90 dark:bg-slate-950/80 rounded-2xl border border-slate-200/70 dark:border-slate-800 flex select-none">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signin'); setError(''); setSuccess(''); }}
                    className={`relative flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      !isSignUp
                        ? 'text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {!isSignUp && (
                      <motion.div
                        layoutId="activeAuthPill"
                        className="absolute inset-0 bg-white dark:bg-slate-850 rounded-xl border border-slate-200/70 dark:border-slate-700/80 shadow-xs"
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10">{locale === 'vi' ? 'Đăng nhập' : 'Sign In'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setError(''); setSuccess(''); }}
                    className={`relative flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isSignUp
                        ? 'text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {isSignUp && (
                      <motion.div
                        layoutId="activeAuthPill"
                        className="absolute inset-0 bg-white dark:bg-slate-850 rounded-xl border border-slate-200/70 dark:border-slate-700/80 shadow-xs"
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1">
                      <span>{locale === 'vi' ? 'Đăng ký mới' : 'Sign Up'}</span>
                      <span className="text-[9px] bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.2 rounded-md font-extrabold uppercase">Free</span>
                    </span>
                  </button>
                </div>
              )}

              {/* Forgot Password Flow */}
              {isForgot ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <GlowInputField
                    id="input_forgot_email"
                    icon={Mail}
                    type="email"
                    label={locale === 'vi' ? 'Địa chỉ Email' : 'Email Address'}
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 text-xs font-semibold"
                    >
                      <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{error}</span>
                    </motion.div>
                  )}

                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{success}</span>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-extrabold rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
                  >
                    {loading ? (
                      <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>{locale === 'vi' ? 'Gửi liên kết khôi phục' : 'Send Reset Link'}</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('signin'); setError(''); setSuccess(''); }}
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{locale === 'vi' ? 'Quay lại Đăng nhập' : 'Back to Sign In'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Sign In / Sign Up Form */
                <form onSubmit={handleSubmit} className="space-y-4">
                  <AnimatePresence mode="wait">
                    {isSignUp && (
                      <motion.div
                        key="name-field"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <GlowInputField
                          id="input_signup_name"
                          icon={User}
                          type="text"
                          label={locale === 'vi' ? 'Họ và tên' : 'Full Name'}
                          placeholder={locale === 'vi' ? 'Ví dụ: Nguyễn Văn A' : 'e.g. Alex Johnson'}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required={isSignUp}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <GlowInputField
                    id="input_auth_email"
                    icon={Mail}
                    type="email"
                    label={locale === 'vi' ? 'Địa chỉ Email' : 'Email Address'}
                    placeholder={locale === 'vi' ? 'name@company.com' : 'name@company.com'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <div className="space-y-1.5">
                    <GlowInputField
                      id="input_auth_password"
                      icon={Lock}
                      type={showPassword ? "text" : "password"}
                      label={locale === 'vi' ? 'Mật khẩu' : 'Password'}
                      placeholder={locale === 'vi' ? 'Tối thiểu 8 ký tự' : 'At least 8 characters'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />

                    {!isSignUp && (
                      <div className="flex justify-end pt-0.5">
                        <button
                          type="button"
                          onClick={() => { setAuthMode('forgot'); setError(''); setSuccess(''); }}
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline cursor-pointer"
                        >
                          {locale === 'vi' ? 'Quên mật khẩu?' : 'Forgot password?'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Dynamic Password Strength Meter for Sign Up */}
                  <AnimatePresence>
                    {isSignUp && password && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5 overflow-hidden text-left"
                      >
                        <div className="flex items-center justify-between text-[10.5px]">
                          <span className="font-bold text-slate-500 dark:text-slate-400">{locale === 'vi' ? 'Độ an toàn mật khẩu:' : 'Password strength:'}</span>
                          <span className={`font-black uppercase tracking-wider ${getStrengthMeta().textClass}`}>{getStrengthMeta().text}</span>
                        </div>

                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                          <div
                            className={`h-full rounded-full transition-all duration-400 ${getStrengthMeta().color}`}
                            style={{ width: getStrengthMeta().width }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 text-[9.5px] font-bold">
                          <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            <Check className={`w-3 h-3 ${hasMinLength ? 'stroke-[3px]' : 'opacity-40'}`} />
                            {locale === 'vi' ? 'Từ 8 ký tự' : '8+ characters'}
                          </span>
                          <span className={`flex items-center gap-1 ${hasLetter ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            <Check className={`w-3 h-3 ${hasLetter ? 'stroke-[3px]' : 'opacity-40'}`} />
                            {locale === 'vi' ? 'Chứa chữ cái' : 'Letters (a-z)'}
                          </span>
                          <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            <Check className={`w-3 h-3 ${hasNumber ? 'stroke-[3px]' : 'opacity-40'}`} />
                            {locale === 'vi' ? 'Chứa chữ số' : 'Numbers (0-9)'}
                          </span>
                          <span className={`flex items-center gap-1 ${hasSpecial ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            <Check className={`w-3 h-3 ${hasSpecial ? 'stroke-[3px]' : 'opacity-40'}`} />
                            {locale === 'vi' ? 'Ký tự đặc biệt' : 'Symbols (!@#$)'}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Remember Me Toggle for Sign In */}
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => setRememberMe(!rememberMe)}
                      className="flex items-center gap-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer select-none group py-0.5"
                    >
                      <div className={`w-4.5 h-4.5 rounded-lg border transition-all flex items-center justify-center ${rememberMe ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 group-hover:border-indigo-400'}`}>
                        {rememberMe && <Check className="w-3 h-3 stroke-[3px]" />}
                      </div>
                      <span>{locale === 'vi' ? 'Ghi nhớ đăng nhập 30 ngày' : 'Remember me for 30 days'}</span>
                    </button>
                  )}

                  {/* Error and Success Notifications */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-semibold shadow-2xs space-y-2"
                    >
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                        <span className="leading-snug">{error}</span>
                      </div>
                      {!isSignUp && (
                        <div className="flex items-center gap-2 pt-1 border-t border-rose-200/50 dark:border-rose-900/50 pl-7 flex-wrap">
                          <button
                            type="button"
                            onClick={() => { setAuthMode('signup'); setError(''); }}
                            className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            {locale === 'vi' ? '➔ Đăng ký tài khoản' : '➔ Create an account'}
                          </button>
                          <span className="text-rose-300 dark:text-rose-800">•</span>
                          <button
                            type="button"
                            onClick={() => handleQuickDemoLogin('admin')}
                            className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
                          >
                            {locale === 'vi' ? '⚡ Vào bằng tài khoản Demo' : '⚡ 1-Click Demo Access'}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold shadow-2xs"
                    >
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{success}</span>
                    </motion.div>
                  )}

                  {/* Primary Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-extrabold">{locale === 'vi' ? 'Đang xử lý...' : 'Processing...'}</span>
                      </div>
                    ) : (
                      <>
                        {isSignUp ? <Sparkles className="w-4.5 h-4.5" /> : <Fingerprint className="w-4.5 h-4.5" />}
                        <span>
                          {isSignUp
                            ? (locale === 'vi' ? 'Tạo tài khoản Apexa' : 'Create Apexa Account')
                            : (locale === 'vi' ? 'Đăng nhập hệ thống' : 'Login System')}
                        </span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Social Login Options */}
              {!isForgot && (
                <div className="space-y-3 pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
                  <div className="relative flex items-center justify-center">
                    <span className="bg-white dark:bg-slate-900 px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      {locale === 'vi' ? 'Hoặc tiếp tục bằng' : 'Or continue with'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleOAuthLogin('google')}
                      disabled={loading}
                      aria-busy={loading}
                      className="flex items-center justify-center gap-2.5 py-2.5 px-4 text-xs font-bold rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:bg-white dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span>Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOAuthLogin('facebook')}
                      disabled={loading}
                      aria-busy={loading}
                      className="flex items-center justify-center gap-2.5 py-2.5 px-4 text-xs font-bold rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:bg-white dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 text-[#1877F2] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      <span>Facebook</span>
                    </button>
                  </div>

                  {/* 1-Click Quick Demo Login */}
                  <div className="text-center pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin('admin')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>{locale === 'vi' ? 'Trải nghiệm ngay với tài khoản Demo (1-Click)' : 'Try demo account immediately (1-Click)'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom Security Badge Notice */}
              <div className="flex items-center justify-center gap-1.5 pt-1 text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>{locale === 'vi' ? 'Bảo mật tiêu chuẩn AES-256 mã hóa đầu cuối' : 'Secured by end-to-end 256-bit encryption'}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
