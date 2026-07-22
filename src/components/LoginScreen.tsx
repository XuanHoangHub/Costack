"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, ShieldAlert, Lock, Mail,
  Eye, EyeOff, Check, CheckCircle2, Fingerprint, X
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useTranslation } from '../contexts/TranslationContext';
import LandingPage from './landing/LandingPage';

interface LoginScreenProps {
  onLoginSuccess: (user: { name: string; email: string; avatar: string; role: 'admin' | 'member'; status: 'online' | 'busy' | 'offline' }, rememberMe: boolean) => void;
}

function GlowInputField({
  id, icon: Icon, type, placeholder, value, onChange, required, rightElement
}: {
  id: string; icon: React.ElementType; type: string; placeholder: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean; rightElement?: React.ReactNode;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative group/input w-full">
      <div className={`absolute -inset-[1px] rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 blur-[2px] transition-opacity duration-300 ${isFocused ? 'opacity-40' : 'group-hover/input:opacity-10'}`} />
      <div className="relative flex items-center">
        <div className={`absolute left-3.5 z-10 transition-colors duration-300 ${isFocused ? 'text-indigo-600' : 'text-slate-400'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoComplete={type === 'email' ? 'email' : type === 'password' ? 'current-password' : 'name'}
          className={`relative w-full pl-10 ${rightElement ? 'pr-11' : 'pr-4'} py-3 text-sm rounded-xl bg-white border transition-all duration-200 shadow-xs font-medium text-slate-800 placeholder-slate-400 outline-none ${isFocused
              ? 'border-indigo-500/60 ring-2 ring-indigo-500/5 shadow-xs'
              : 'border-slate-200 hover:border-slate-300'
            }`}
        />
        {rightElement && <div className="absolute right-2.5 z-10">{rightElement}</div>}
      </div>
    </div>
  );
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { t, locale } = useTranslation();
  const [isAuthActive, setIsAuthActive] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isAuthActive]);

  const hasMinLength = password.length >= 8;
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const strengthScore = [hasMinLength, hasNumber, hasSpecial, hasLetter].filter(Boolean).length;

  const getStrengthTextAndColor = () => {
    switch (strengthScore) {
      case 0: return { text: locale === 'vi' ? 'Không an toàn' : 'Insecure', color: 'bg-red-400', textClass: 'text-red-500' };
      case 1: return { text: locale === 'vi' ? 'Yếu' : 'Weak', color: 'bg-rose-400', textClass: 'text-rose-500' };
      case 2: return { text: locale === 'vi' ? 'Trung bình' : 'Medium', color: 'bg-amber-400', textClass: 'text-amber-500' };
      case 3: return { text: locale === 'vi' ? 'Khá mạnh' : 'Strong', color: 'bg-indigo-400', textClass: 'text-indigo-500' };
      case 4: return { text: locale === 'vi' ? 'Tuyệt vời!' : 'Excellent!', color: 'bg-emerald-400', textClass: 'text-emerald-500' };
      default: return { text: locale === 'vi' ? 'Yếu' : 'Weak', color: 'bg-slate-200', textClass: 'text-slate-400' };
    }
  };

  const openAuth = (signUp: boolean) => {
    setIsAuthActive(true);
    setIsSignUp(signUp);
    setError('');
    setSuccess('');
  };

  const closeAuth = () => {
    setIsAuthActive(false);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError(t('enterCredentials') || 'Vui lòng điền đầy đủ email và mật khẩu.');
      return;
    }
    if (isSignUp && !name) {
      setError(t('enterFullName') || 'Vui lòng điền họ tên của bạn.');
      return;
    }
    if (isSignUp && strengthScore < 3) {
      setError(t('passwordStrength') || 'Mật khẩu phải đạt mức bảo mật khuyến nghị (ít nhất Khá - 3/4 tiêu chí).');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email, password,
          options: { data: { name } }
        });
        if (signUpError) throw signUpError;

        setSuccess(t('signupSuccess') || 'Đăng ký thành công! Đang tự động kết nối...');
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

        if (signInError) {
          setSuccess(t('verificationCheck') || 'Đăng ký thành công! Vui lòng xác thực email để tiếp tục.');
          setLoading(false);
          setIsSignUp(false);
          return;
        }

        const sessionUser = signInData.user;
        const displayName = sessionUser?.user_metadata?.name || name || sessionUser?.email?.split('@')[0] || 'Avaxa Champion';
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
        const displayName = sessionUser?.user_metadata?.name || sessionUser?.email?.split('@')[0] || 'Avaxa Champion';

        setSuccess(t('signinSuccess') || 'Đăng nhập thành công! Đang kết nối vào Avaxa OS...');
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
      console.error('Auth error:', err);
      let errorMessage = err.message || (locale === 'vi' ? 'Lỗi kết nối máy chủ xác thực.' : 'Authentication server connection error.');
      if (err.message?.toLowerCase().includes('invalid login credentials')) {
        errorMessage = t('invalidCredentials') || 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
      } else if (err.message?.toLowerCase().includes('user already registered')) {
        errorMessage = t('emailAlreadyRegistered') || 'Địa chỉ email này đã tồn tại trên hệ thống.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const redirectTo = window.location.origin.endsWith('/') 
        ? window.location.origin 
        : `${window.location.origin}/`;
      
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: { redirectTo }
      });
      if (oauthError) throw oauthError;
      setSuccess(`Đang chuyển hướng sang ${provider}...`);
    } catch (err: any) {
      console.warn(`SSO local sandbox fallback:`, err);
      
      // Do not fall back to mockup in production to allow real OAuth debug
      if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
        setError(err.message || (locale === 'vi' ? 'Không thể kết nối với dịch vụ đăng nhập.' : 'Could not connect to sign-in service.'));
        setLoading(false);
        return;
      }
      
      const mockupUsers = {
        google: { name: 'Hoàng Benjamin', email: 'hoang.benjamin.creative@gmail.com', role: 'admin' },
        facebook: { name: 'Mai Phương', email: 'maiphuong.fb@avaxa.io', role: 'member' }
      };
      const selected = mockupUsers[provider];
      setSuccess(locale === 'vi' ? `Phiên SSO cục bộ đã được kích hoạt cho ${selected.name}` : `Local SSO session activated for ${selected.name}`);
      await new Promise(resolve => setTimeout(resolve, 800));
      onLoginSuccess({
        name: selected.name,
        email: selected.email,
        avatar: '',
        role: selected.role as 'admin' | 'member',
        status: 'online'
      }, rememberMe);
    } finally {
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
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={closeAuth}
              className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="relative w-full max-w-md h-full sm:h-auto max-h-full sm:max-h-[90vh] bg-white sm:border border-slate-200/60 rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl p-7 sm:p-8 space-y-5 pointer-events-auto overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={closeAuth}
                  className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="space-y-1 pr-8">
                  <h2 className="text-xl font-black text-slate-900 font-display text-left">
                    {isSignUp ? (locale === 'vi' ? 'Bắt đầu dùng Avaxa miễn phí' : 'Start using Avaxa for free') : (t('welcome') || 'Chào mừng trở lại')}
                  </h2>
                  <p className="text-xs text-slate-550 font-medium text-left">
                    {isSignUp ? (locale === 'vi' ? 'Tạo tài khoản và hợp nhất quy trình làm việc của bạn.' : 'Create account and unify your workflow.') : (locale === 'vi' ? 'Kết nối hệ thống và tiếp tục hành trình hiệu suất.' : 'Connect to the system and continue your productivity journey.')}
                  </p>
                </div>

                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 select-none">
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(false); setError(''); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${!isSignUp ? 'bg-white text-indigo-650 shadow-xs border border-slate-105' : 'text-slate-455 hover:text-slate-600'}`}
                  >
                    {t('login') || 'Đăng nhập'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(true); setError(''); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${isSignUp ? 'bg-white text-indigo-655 shadow-xs border border-slate-105' : 'text-slate-455 hover:text-slate-600'}`}
                  >
                    {locale === 'vi' ? 'Đăng ký mới' : 'Sign Up'}
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <AnimatePresence mode="wait">
                    {isSignUp && (
                      <motion.div
                        key="name-field"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <GlowInputField
                          id="input_signup_name"
                          icon={User}
                          type="text"
                          placeholder={t('fullName') || 'Họ và tên của bạn'}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required={isSignUp}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <GlowInputField
                    id="input_login_email"
                    icon={Mail}
                    type="email"
                    placeholder={t('email') || 'Địa chỉ email cá nhân/công việc'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <div className="space-y-1">
                    <GlowInputField
                      id="input_login_password"
                      icon={Lock}
                      type={showPassword ? "text" : "password"}
                      placeholder={t('password') || 'Mật khẩu của bạn'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-slate-400 hover:text-indigo-650 transition-colors p-1 rounded cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                    {!isSignUp && (
                      <div className="text-right pt-0.5">
                        <a href="#" className="text-[11px] text-indigo-650 font-bold hover:underline">{t('forgotPassword') || 'Quên mật khẩu?'}</a>
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {isSignUp && password && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-2 overflow-hidden text-left"
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-400">{locale === 'vi' ? 'Độ mạnh mật khẩu:' : 'Password strength:'}</span>
                          <span className={`font-black ${getStrengthTextAndColor().textClass}`}>{getStrengthTextAndColor().text}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                          {[1, 2, 3, 4].map((s) => (
                            <div key={s} className={`h-full rounded-full transition-colors duration-300 ${strengthScore >= s ? getStrengthTextAndColor().color : 'bg-slate-200'}`} />
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[9px] font-bold text-slate-400">
                          <span className={hasMinLength ? 'text-emerald-500' : ''}>{locale === 'vi' ? '✓ Ít nhất 8 ký tự' : '✓ At least 8 characters'}</span>
                          <span className={hasLetter ? 'text-emerald-500' : ''}>{locale === 'vi' ? '✓ Có chữ cái (a-z)' : '✓ Contains letters (a-z)'}</span>
                          <span className={hasNumber ? 'text-emerald-500' : ''}>{locale === 'vi' ? '✓ Có chữ số (0-9)' : '✓ Contains numbers (0-9)'}</span>
                          <span className={hasSpecial ? 'text-emerald-500' : ''}>{locale === 'vi' ? '✓ Kí tự đặc biệt' : '✓ Special characters'}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="button"
                    onClick={() => setRememberMe(!rememberMe)}
                    className="flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer select-none group"
                  >
                    <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${rememberMe ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white group-hover:border-indigo-400'}`}>
                      {rememberMe && <Check className="w-2.5 h-2.5 stroke-[3px]" />}
                    </div>
                    <span>{locale === 'vi' ? 'Ghi nhớ 30 ngày' : 'Remember 30 days'}</span>
                  </button>

                  {error && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">
                      <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{success}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Fingerprint className="w-4 h-4 opacity-80" />
                        <span>{isSignUp ? (locale === 'vi' ? 'Tạo tài khoản Avaxa' : 'Create Avaxa Account') : (locale === 'vi' ? 'Đăng nhập hệ thống' : 'Login System')}</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{locale === 'vi' ? 'Tiếp tục bằng' : 'Or continue with'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleOAuthLogin('google')}
                      className="flex items-center justify-center gap-2 py-2.5 text-xs rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-xs cursor-pointer font-bold text-slate-600"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Google
                    </button>
                    <button
                      onClick={() => handleOAuthLogin('facebook')}
                      className="flex items-center justify-center gap-2 py-2.5 text-xs rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-xs cursor-pointer font-bold text-slate-600"
                    >
                      <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Facebook
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
