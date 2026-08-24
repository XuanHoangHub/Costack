"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import {
  User, ShieldAlert, Lock, Mail,
  Eye, EyeOff, Check, CheckCircle2, X,
  ArrowLeft, KeyRound, ShieldCheck, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { resolveAppRole } from '../lib/authRole';
import { useTranslation } from '../contexts/TranslationContext';
import LanguageDropdown from './LanguageDropdown';
import LandingPage from './landing/LandingPage';

interface LoginScreenProps {
  onLoginSuccess: (user: { id: string; name: string; email: string; avatar: string; role: 'admin' | 'member'; status: 'online' | 'busy' | 'offline' }, rememberMe: boolean) => void;
  registrationEnabled?: boolean;
}

type AuthMode = 'signin' | 'signup' | 'forgot';
type FieldName = 'name' | 'email' | 'password' | 'confirmPassword' | 'terms';
type FieldErrors = Partial<Record<FieldName, string>>;

function GlowInputField({
  id, icon: Icon, type, placeholder, value, onChange, required, rightElement, autoFocus,
  label, autoComplete, error, helperText, minLength, disabled
}: {
  id: string; icon: React.ElementType; type: string; placeholder: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean; rightElement?: React.ReactNode; autoFocus?: boolean; label?: string;
  autoComplete?: string; error?: string; helperText?: string; minLength?: number; disabled?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const descriptionId = error || helperText ? `${id}_description` : undefined;

  return (
    <div className="space-y-1.5 text-left w-full">
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-slate-700 dark:text-slate-300 select-none">
          {label}
        </label>
      )}
      <div className="relative group/input w-full">
        <div className="relative flex items-center">
          <div className={`pointer-events-none absolute left-3.5 z-10 transition-colors duration-200 ${isFocused ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
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
            autoComplete={autoComplete || (type === 'email' ? 'email' : type === 'password' ? 'current-password' : 'name')}
            aria-invalid={Boolean(error)}
            aria-describedby={descriptionId}
            minLength={minLength}
            disabled={disabled}
            spellCheck={type === 'email' ? false : undefined}
            className={`relative h-[48px] w-full pl-10.5 ${rightElement ? 'pr-11' : 'pr-4'} text-xs sm:text-sm rounded-xl bg-slate-50/90 dark:bg-slate-950/70 border transition-all duration-200 font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none ${
              error
                ? 'border-rose-400 bg-rose-50/40 ring-4 ring-rose-500/10 dark:border-rose-700 dark:bg-rose-950/20'
                : isFocused
                ? 'border-indigo-600 dark:border-indigo-400 bg-white dark:bg-slate-900 ring-4 ring-indigo-500/15 dark:ring-indigo-400/20 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          />
          {rightElement && <div className="absolute right-3 z-10">{rightElement}</div>}
        </div>
      </div>
      {(error || helperText) && (
        <p id={descriptionId} className={`px-1 text-[10.5px] font-semibold leading-relaxed ${error ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
}

export default function LoginScreen({ onLoginSuccess, registrationEnabled = true }: LoginScreenProps) {
  const { locale } = useTranslation();
  const [isAuthActive, setIsAuthActive] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaPendingUser, setMfaPendingUser] = useState<SupabaseAuthUser | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaChallengeId, setMfaChallengeId] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRememberMe, setMfaRememberMe] = useState(true);
  const onLoginSuccessRef = useRef(onLoginSuccess);
  const oauthCompletionRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const isSignUp = authMode === 'signup';
  const isForgot = authMode === 'forgot';
  const isVietnamese = locale === 'vi';

  useEffect(() => {
    if (!registrationEnabled && authMode === 'signup') {
      setAuthMode('signin');
      setError(isVietnamese ? 'Đăng ký mới hiện đang tạm khóa.' : 'New account registration is currently disabled.');
    }
  }, [authMode, isVietnamese, registrationEnabled]);

  const copy = isVietnamese ? {
    signin: 'Đăng nhập', signup: 'Đăng ký', free: 'Miễn phí', email: 'Địa chỉ email',
    password: 'Mật khẩu', confirmPassword: 'Xác nhận mật khẩu', fullName: 'Họ và tên',
    emailPlaceholder: 'name@company.com', namePlaceholder: 'Ví dụ: Nguyễn Minh Anh',
    passwordPlaceholder: 'Nhập mật khẩu', createPasswordPlaceholder: 'Tạo mật khẩu mạnh',
    confirmPasswordPlaceholder: 'Nhập lại mật khẩu', showPassword: 'Hiển thị mật khẩu',
    hidePassword: 'Ẩn mật khẩu', forgotPassword: 'Quên mật khẩu?',
    remember: 'Ghi nhớ đăng nhập trên thiết bị này',
    rememberSubtitle: 'Duy trì phiên làm việc an toàn trong 30 ngày',
    submitSignin: 'Đăng nhập', submitSignup: 'Tạo tài khoản', processing: 'Đang xử lý…',
    terms: 'Tôi đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư của Apexa.',
    continueWith: 'Hoặc tiếp tục với', resetSubmit: 'Gửi liên kết đặt lại mật khẩu',
    backToSignin: 'Quay lại đăng nhập', securePortal: 'Cổng truy cập bảo mật',
    forgotTitle: 'Khôi phục mật khẩu', signupTitle: 'Tạo tài khoản Apexa', signinTitle: 'Chào mừng trở lại!',
    forgotDescription: 'Nhập địa chỉ email đã đăng ký để nhận liên kết đặt lại mật khẩu.',
    signupDescription: 'Tạo tài khoản miễn phí để bắt đầu tổ chức công việc cùng đội ngũ.',
    signinDescription: 'Đăng nhập để tiếp tục làm việc trong không gian của bạn.',
  } : {
    signin: 'Sign in', signup: 'Sign up', free: 'Free', email: 'Email address',
    password: 'Password', confirmPassword: 'Confirm password', fullName: 'Full name',
    emailPlaceholder: 'name@company.com', namePlaceholder: 'e.g. Alex Johnson',
    passwordPlaceholder: 'Enter your password', createPasswordPlaceholder: 'Create a strong password',
    confirmPasswordPlaceholder: 'Re-enter your password', showPassword: 'Show password',
    hidePassword: 'Hide password', forgotPassword: 'Forgot password?',
    remember: 'Stay signed in on this device',
    rememberSubtitle: 'Keep session securely active for 30 days',
    submitSignin: 'Sign in', submitSignup: 'Create account', processing: 'Processing…',
    terms: 'I agree to Apexa’s Terms of Use and Privacy Policy.',
    continueWith: 'Or continue with', resetSubmit: 'Send reset link',
    backToSignin: 'Back to sign in', securePortal: 'Secure access portal',
    forgotTitle: 'Reset your password', signupTitle: 'Create your Apexa account', signinTitle: 'Welcome back!',
    forgotDescription: 'Enter your registered email address to receive a password reset link.',
    signupDescription: 'Create a free account and start organizing work with your team.',
    signinDescription: 'Sign in to continue working in your workspace.',
  };

  useEffect(() => {
    if (isAuthActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isAuthActive]);

  useEffect(() => {
    if (!isAuthActive) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAuthActive(false);
        setError('');
        setSuccess('');
        setFieldErrors({});
        window.requestAnimationFrame(() => previousFocusRef.current?.focus());
        return;
      }

      if (event.key === 'Tab' && dialogRef.current) {
        const focusableElements = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        ));
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (!firstElement || !lastElement) return;

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
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

    const finalizeOAuthUser = async (sessionUser: SupabaseAuthUser) => {
      if (!isActive || oauthCompletionRef.current) return;

      const metadata = sessionUser.user_metadata || {};
      const userEmail = sessionUser.email || metadata.email || '';
      if (!userEmail) {
        oauthCompletionRef.current = true;
        setIsAuthActive(true);
        setLoading(false);
        setError(locale === 'vi'
          ? 'Tài khoản mạng xã hội chưa cung cấp địa chỉ email. Vui lòng cấp quyền truy cập email rồi thử lại.'
          : 'Your social account did not provide an email address. Allow email access and try again.');
        cleanOAuthParams();
        return;
      }

      const displayName = metadata.full_name || metadata.name || metadata.display_name || userEmail.split('@')[0] || 'Apexa Champion';
      const shouldRemember = sessionStorage.getItem('apexa_oauth_remember_me') !== 'false';
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance?.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2') {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const factor = factors?.totp.find(item => item.status === 'verified');
        if (factor) {
          const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
          if (!challengeError && challenge && isActive) {
            oauthCompletionRef.current = true;
            setIsAuthActive(true);
            setMfaPendingUser(sessionUser);
            setMfaFactorId(factor.id);
            setMfaChallengeId(challenge.id);
            setMfaRememberMe(shouldRemember);
            setMfaCode('');
            cleanOAuthParams();
            return;
          }
        }
      }
      oauthCompletionRef.current = true;
      sessionStorage.removeItem('apexa_oauth_remember_me');
      cleanOAuthParams();

      onLoginSuccessRef.current({
        id: sessionUser.id,
        name: displayName,
        email: userEmail,
        avatar: metadata.avatar_url || metadata.picture || metadata.avatar || '',
        role: resolveAppRole(sessionUser),
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
        setError(locale === 'vi'
          ? 'Không thể đăng nhập bằng tài khoản mạng xã hội. Vui lòng thử lại.'
          : 'Could not sign in with your social account. Please try again.');
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
      if (session?.user) void finalizeOAuthUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) void finalizeOAuthUser(session.user);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [locale]);

  const hasMinLength = password.length >= 8;
  const hasNumber = /\p{N}/u.test(password);
  const hasSpecial = /[^\p{L}\p{N}\s]/u.test(password);
  const hasLetter = /\p{L}/u.test(password);
  const strengthScore = [hasMinLength, hasNumber, hasSpecial, hasLetter].filter(Boolean).length;

  const getStrengthMeta = () => {
    switch (strengthScore) {
      case 0: return { text: locale === 'vi' ? 'Rất yếu' : 'Very weak', color: 'bg-rose-500', textClass: 'text-rose-500', width: '15%' };
      case 1: return { text: locale === 'vi' ? 'Yếu' : 'Weak', color: 'bg-rose-400', textClass: 'text-rose-500', width: '30%' };
      case 2: return { text: locale === 'vi' ? 'Trung bình' : 'Medium', color: 'bg-amber-400', textClass: 'text-amber-500', width: '55%' };
      case 3: return { text: locale === 'vi' ? 'Khá mạnh' : 'Strong', color: 'bg-indigo-500', textClass: 'text-indigo-500', width: '80%' };
      case 4: return { text: locale === 'vi' ? 'Mạnh' : 'Strong', color: 'bg-emerald-500', textClass: 'text-emerald-500', width: '100%' };
      default: return { text: locale === 'vi' ? 'Yếu' : 'Weak', color: 'bg-slate-300', textClass: 'text-slate-400', width: '0%' };
    }
  };

  const normalizeEmail = (value: string) => value.trim().toLowerCase();
  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

  const clearFieldError = (field: FieldName) => {
    setError('');
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const clearFeedback = () => {
    setError('');
    setSuccess('');
    setFieldErrors({});
  };

  const switchAuthMode = (mode: Exclude<AuthMode, 'forgot'>) => {
    setAuthMode(mode);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setAcceptTerms(false);
    clearFeedback();
  };

  const validateAuthForm = () => {
    const nextErrors: FieldErrors = {};

    if (isSignUp && name.trim().length < 2) {
      nextErrors.name = isVietnamese
        ? 'Vui lòng nhập họ và tên (ít nhất 2 ký tự).'
        : 'Enter your full name (at least 2 characters).';
    }
    if (!email.trim()) {
      nextErrors.email = isVietnamese ? 'Vui lòng nhập địa chỉ email.' : 'Enter your email address.';
    } else if (!isValidEmail(email)) {
      nextErrors.email = isVietnamese ? 'Địa chỉ email chưa đúng định dạng.' : 'Enter a valid email address.';
    }
    if (!password) {
      nextErrors.password = isVietnamese ? 'Vui lòng nhập mật khẩu.' : 'Enter your password.';
    } else if (isSignUp && strengthScore < 4) {
      nextErrors.password = isVietnamese
        ? 'Mật khẩu cần đủ 8 ký tự, có chữ cái, chữ số và ký tự đặc biệt.'
        : 'Use 8+ characters with a letter, number, and special character.';
    }
    if (isSignUp && !confirmPassword) {
      nextErrors.confirmPassword = isVietnamese ? 'Vui lòng nhập lại mật khẩu.' : 'Re-enter your password.';
    } else if (isSignUp && confirmPassword !== password) {
      nextErrors.confirmPassword = isVietnamese ? 'Mật khẩu xác nhận không khớp.' : 'Passwords do not match.';
    }
    if (isSignUp && !acceptTerms) {
      nextErrors.terms = isVietnamese
        ? 'Bạn cần đồng ý với điều khoản để tạo tài khoản.'
        : 'You must agree to the terms to create an account.';
    }

    setFieldErrors(nextErrors);
    const firstInvalidField = (Object.keys(nextErrors) as FieldName[])[0];
    if (firstInvalidField) {
      const fieldIds: Record<FieldName, string> = {
        name: 'input_signup_name',
        email: 'input_auth_email',
        password: 'input_auth_password',
        confirmPassword: 'input_signup_confirm_password',
        terms: 'input_signup_terms',
      };
      window.requestAnimationFrame(() => document.getElementById(fieldIds[firstInvalidField])?.focus());
    }
    return Object.keys(nextErrors).length === 0;
  };

  const getAuthErrorMessage = (caughtError: unknown) => {
    const message = caughtError instanceof Error ? caughtError.message : '';
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes('invalid login credentials') || normalizedMessage.includes('invalid_grant')) {
      return isVietnamese
        ? 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra và thử lại.'
        : 'Incorrect email or password. Check your details and try again.';
    }
    if (normalizedMessage.includes('email not confirmed')) {
      return isVietnamese
        ? 'Email chưa được xác minh. Vui lòng kiểm tra hộp thư và mở liên kết xác minh.'
        : 'Your email is not verified. Check your inbox for the verification link.';
    }
    if (normalizedMessage.includes('user already registered')) {
      return isVietnamese
        ? 'Email này đã được đăng ký. Vui lòng chuyển sang đăng nhập.'
        : 'This email is already registered. Please sign in instead.';
    }
    if (normalizedMessage.includes('rate limit') || normalizedMessage.includes('too many requests')) {
      return isVietnamese
        ? 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi một chút rồi thử lại.'
        : 'Too many requests. Wait a moment and try again.';
    }
    if (normalizedMessage.includes('password')) {
      return isVietnamese
        ? 'Mật khẩu chưa đáp ứng yêu cầu bảo mật. Vui lòng chọn mật khẩu khác.'
        : 'The password does not meet the security requirements.';
    }

    return message || (isVietnamese
      ? 'Không thể kết nối với dịch vụ xác thực. Vui lòng thử lại.'
      : 'Could not connect to the authentication service. Try again.');
  };

  const openAuth = (signUp: boolean) => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsAuthActive(true);
    switchAuthMode(signUp && registrationEnabled ? 'signup' : 'signin');
    if (signUp && !registrationEnabled) {
      setError(isVietnamese ? 'Đăng ký mới hiện đang tạm khóa. Vui lòng đăng nhập bằng tài khoản hiện có.' : 'New registration is currently disabled. Sign in with an existing account.');
    }
  };

  const closeAuth = () => {
    if (mfaPendingUser) void supabase.auth.signOut({ scope: 'local' });
    setIsAuthActive(false);
    setMfaPendingUser(null);
    setMfaFactorId('');
    setMfaChallengeId('');
    setMfaCode('');
    clearFeedback();
    window.requestAnimationFrame(() => previousFocusRef.current?.focus());
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!email.trim() || !isValidEmail(email)) {
      setFieldErrors({
        email: isVietnamese ? 'Vui lòng nhập địa chỉ email hợp lệ.' : 'Enter a valid email address.'
      });
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = new URL(window.location.href);
      redirectUrl.hash = '';
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
        redirectTo: redirectUrl.toString()
      });
      if (resetError) throw resetError;

      setSuccess(
        locale === 'vi'
          ? 'Nếu email tồn tại, bạn sẽ nhận được liên kết đặt lại mật khẩu. Vui lòng kiểm tra cả thư rác.'
          : 'If the email exists, you will receive a reset link. Check your spam folder too.'
      );
    } catch (caughtError: unknown) {
      console.error('Password reset error:', caughtError);
      setError(getAuthErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (!validateAuthForm()) return;

    setLoading(true);
    const normalizedEmail = normalizeEmail(email);

    try {
      if (isSignUp) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail, password,
          options: { data: { name: name.trim() } }
        });
        if (signUpError) throw signUpError;

        if (!signUpData.session || !signUpData.user) {
          setSuccess(isVietnamese
            ? 'Tài khoản đã được tạo. Vui lòng kiểm tra email và mở liên kết xác minh trước khi đăng nhập.'
            : 'Account created. Check your email and open the verification link before signing in.');
          setAuthMode('signin');
          setPassword('');
          setConfirmPassword('');
          setAcceptTerms(false);
          return;
        }

        const sessionUser = signUpData.user;
        const displayName = sessionUser?.user_metadata?.name || name || sessionUser?.email?.split('@')[0] || 'Apexa Champion';
        onLoginSuccess({
          id: sessionUser.id,
          name: displayName,
          email: sessionUser?.email || normalizedEmail,
          avatar: sessionUser?.user_metadata?.avatar_url || sessionUser?.user_metadata?.avatar || '',
          role: 'member',
          status: 'online'
        }, rememberMe);
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (signInError) throw signInError;

        const sessionUser = data.user;
        const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assurance?.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2') {
          const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
          if (factorsError) throw factorsError;
          const factor = factors.totp.find(item => item.status === 'verified');
          if (!factor) throw new Error(isVietnamese ? 'Không tìm thấy thiết bị xác thực đã đăng ký.' : 'No verified authenticator was found.');
          const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
          if (challengeError) throw challengeError;
          setMfaPendingUser(sessionUser);
          setMfaFactorId(factor.id);
          setMfaChallengeId(challenge.id);
          setMfaCode('');
          setMfaRememberMe(rememberMe);
          return;
        }
        const displayName = sessionUser?.user_metadata?.name || sessionUser?.email?.split('@')[0] || 'Apexa Champion';

        onLoginSuccess({
          id: sessionUser.id,
          name: displayName,
          email: sessionUser?.email || normalizedEmail,
          avatar: sessionUser?.user_metadata?.avatar_url || sessionUser?.user_metadata?.avatar || '',
          role: resolveAppRole(sessionUser),
          status: 'online'
        }, rememberMe);
      }
    } catch (caughtError: unknown) {
      console.warn('Auth notification:', caughtError instanceof Error ? caughtError.message : caughtError);
      setError(getAuthErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mfaPendingUser || !/^\d{6}$/.test(mfaCode)) return;
    setLoading(true);
    setError('');
    try {
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: mfaChallengeId, code: mfaCode });
      if (verifyError) throw verifyError;
      const displayName = mfaPendingUser.user_metadata?.name || mfaPendingUser.email?.split('@')[0] || 'Apexa Champion';
      onLoginSuccess({
        id: mfaPendingUser.id,
        name: displayName,
        email: mfaPendingUser.email || email,
        avatar: mfaPendingUser.user_metadata?.avatar_url || mfaPendingUser.user_metadata?.avatar || '',
        role: resolveAppRole(mfaPendingUser),
        status: 'online'
      }, mfaRememberMe);
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError));
      setMfaCode('');
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (!challengeError) setMfaChallengeId(challenge.id);
    } finally {
      setLoading(false);
    }
  };

  const cancelMfaLogin = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    setMfaPendingUser(null);
    setMfaFactorId('');
    setMfaChallengeId('');
    setMfaCode('');
    setError('');
  };

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    if (isSignUp && !acceptTerms) {
      setFieldErrors({
        terms: isVietnamese
          ? 'Bạn cần đồng ý với điều khoản để tạo tài khoản.'
          : 'You must agree to the terms to create an account.'
      });
      return;
    }

    setLoading(true);
    clearFeedback();
    setSuccess(isVietnamese
      ? `Đang chuyển đến ${provider === 'facebook' ? 'Facebook' : 'Google'}…`
      : `Redirecting to ${provider === 'facebook' ? 'Facebook' : 'Google'}…`);

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
      if (!data.url) throw new Error(isVietnamese ? 'Không nhận được đường dẫn đăng nhập.' : 'No sign-in URL was returned.');
    } catch (caughtError: unknown) {
      console.warn(`${provider} OAuth error:`, caughtError instanceof Error ? caughtError.message : caughtError);
      sessionStorage.removeItem('apexa_oauth_remember_me');
      setSuccess('');
      setError(getAuthErrorMessage(caughtError));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-[#f8fafc] dark:bg-[#07090e] text-slate-800 dark:text-slate-100 font-sans selection:bg-indigo-100 selection:text-indigo-800 dark:selection:bg-indigo-900 dark:selection:text-indigo-100">
      <LandingPage
        onSignUp={() => openAuth(true)}
        onSignIn={() => openAuth(false)}
      />

      {/* Auth Modal Overlay */}
      <AnimatePresence>
        {isAuthActive && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-0 sm:p-5">
            {/* Backdrop with Frosted Blur & Ambient Lights */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={closeAuth}
              className="fixed inset-0 bg-[#080b16]/80 backdrop-blur-xl"
            />

            <div className="pointer-events-none fixed inset-0 overflow-hidden">
              <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-indigo-600/25 blur-[100px]" />
              <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-[120px]" />
            </div>

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 24 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="auth-dialog-title"
              ref={dialogRef}
              className="relative z-10 my-auto grid max-h-[calc(100vh-24px)] w-full max-w-[960px] overflow-hidden rounded-2xl sm:rounded-[32px] border border-white/10 bg-[#0b1020] shadow-[0_40px_120px_-28px_rgba(8,15,45,0.75)] dark:border-slate-800/80 dark:bg-slate-900 lg:grid-cols-[0.88fr_1.12fr]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Product story panel */}
              <aside className="relative hidden min-h-[660px] overflow-hidden bg-[#0b1020] p-9 text-white lg:flex lg:flex-col lg:justify-between">
                <div className="pointer-events-none absolute inset-0 opacity-80" style={{ backgroundImage: 'radial-gradient(circle at 20% 15%, rgba(99,102,241,.45), transparent 30%), radial-gradient(circle at 90% 75%, rgba(168,85,247,.28), transparent 34%)' }} />
                <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />

                <div className="relative z-10 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-indigo-700 shadow-xl shadow-indigo-950/30">
                    <Zap className="h-5 w-5 fill-current" />
                  </div>
                  <div>
                    <div className="text-sm font-black tracking-tight">Apexa OS</div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.24em] text-indigo-200/70">{isVietnamese ? 'Hệ điều hành Năng suất & AI' : 'AI Productivity Operating System'}</div>
                  </div>
                </div>

                <div className="relative z-10 space-y-7">
                  <div className="space-y-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-indigo-100 backdrop-blur-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.9)]" />
                      {isVietnamese ? 'Không gian làm việc AI · Trực tuyến' : 'AI Workspace Engine · Online'}
                    </span>
                    <h3 className="max-w-xs text-[32px] font-black leading-[1.08] tracking-[-0.04em]">
                      {isVietnamese ? (
                        <>Không gian làm việc thông minh cho <span className="bg-gradient-to-r from-blue-300 via-sky-300 to-cyan-300 bg-clip-text text-transparent">đội ngũ hiện đại.</span></>
                      ) : (
                        <>The intelligent workspace for <span className="bg-gradient-to-r from-blue-300 via-sky-300 to-cyan-300 bg-clip-text text-transparent">high-velocity teams.</span></>
                      )}
                    </h3>
                    <p className="max-w-sm text-xs font-medium leading-6 text-slate-300/80">
                      {isVietnamese
                        ? 'Quản lý dự án, tài liệu số, giao tiếp thời gian thực và tự động hóa AI — tất cả hợp nhất trong một không gian làm việc liền mạch.'
                        : 'Manage projects, collaborative docs, real-time team chat, and AI automations—all unified within one seamless workspace.'}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/[0.07] p-4 shadow-2xl backdrop-blur-xl">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">{isVietnamese ? 'Hiệu suất vận hành Sprint' : 'Sprint Performance Hub'}</div>
                        <div className="mt-1 text-sm font-extrabold">{isVietnamese ? 'Ra mắt sản phẩm · Sprint 08' : 'Product launch · Sprint 08'}</div>
                      </div>
                      <div className="flex -space-x-2">
                        {['HX', 'MA', 'QB'].map((member, index) => (
                          <div key={member} className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#171c31] text-[8px] font-black ${index === 0 ? 'bg-indigo-500' : index === 1 ? 'bg-fuchsia-500' : 'bg-cyan-500'}`}>{member}</div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ['96%', isVietnamese ? 'Mục tiêu đạt' : 'Goal progress'],
                        ['18/20', isVietnamese ? 'Hoàn thành' : 'Tasks done'],
                        ['+38%', isVietnamese ? 'Tốc độ nhóm' : 'Velocity boost']
                      ].map(([value, label]) => (
                        <div key={label} className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3">
                          <div className="text-base font-black tracking-tight">{value}</div>
                          <div className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-400/10 px-3 py-2.5 text-[10px] font-bold text-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      {isVietnamese ? 'Đồng bộ Local-First & Trợ lý AI sẵn sàng' : 'Local-First sync & AI Copilot active'}
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-between text-[9px] font-bold text-slate-500">
                  <span>© {new Date().getFullYear()} Apexa OS</span>
                  <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-emerald-400" /> {isVietnamese ? 'Bảo mật cấp doanh nghiệp · Mã hóa E2E' : 'Enterprise-grade security · E2E Encrypted'}</span>
                </div>
              </aside>

              <section className="relative max-h-[calc(100vh-24px)] space-y-5 overflow-x-hidden overflow-y-auto bg-white px-6 py-7 text-left sm:px-9 sm:py-8 dark:bg-slate-900">
                <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />

              {/* Header Actions */}
              <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
                <LanguageDropdown size="sm" />
                <button
                  type="button"
                  onClick={closeAuth}
                  className="rounded-full border border-slate-200/70 bg-white/80 p-2 text-slate-400 shadow-sm backdrop-blur-md transition-all hover:rotate-90 hover:bg-slate-100 hover:text-slate-700 active:scale-90 dark:border-slate-700 dark:bg-slate-850/80 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label={isVietnamese ? 'Đóng cửa sổ' : 'Close dialog'}
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Card Header with Brand Identity */}
              <div className="relative space-y-3 pr-8 pt-1">
                <div className="flex items-center gap-2.5 lg:hidden">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-700 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 ring-2 ring-indigo-500/20 shrink-0">
                    <Zap className="w-5 h-5 fill-white" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h2 id="auth-dialog-title" className="text-2xl font-black text-slate-900 sm:text-[28px] dark:text-white tracking-[-0.035em] leading-tight">
                    {mfaPendingUser ? (isVietnamese ? 'Xác minh danh tính' : 'Verify your identity') : isForgot ? copy.forgotTitle : isSignUp ? copy.signupTitle : copy.signinTitle}
                  </h2>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                    {mfaPendingUser ? (isVietnamese ? 'Nhập mã 6 chữ số từ ứng dụng Authenticator để hoàn tất đăng nhập.' : 'Enter the 6-digit code from your authenticator app to finish signing in.') : isForgot ? copy.forgotDescription : isSignUp ? copy.signupDescription : copy.signinDescription}
                  </p>
                </div>
              </div>

              {/* Segmented Tab Switcher (Sign In vs Sign Up) */}
              {!isForgot && !mfaPendingUser && (
                <div role="tablist" aria-label={isVietnamese ? 'Chọn phương thức truy cập' : 'Choose access method'} className="relative p-1 bg-slate-100/90 dark:bg-slate-950/80 rounded-2xl border border-slate-200/70 dark:border-slate-800 flex select-none">
                  {registrationEnabled && <button
                    type="button"
                    role="tab"
                    aria-selected={!isSignUp}
                    onClick={() => switchAuthMode('signin')}
                    className={`relative flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      !isSignUp
                        ? 'text-indigo-700 dark:text-indigo-100 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {!isSignUp && (
                      <motion.div
                        layoutId="activeAuthPill"
                        className="absolute inset-0 rounded-xl border border-indigo-100 bg-white shadow-xs dark:border-indigo-500/25 dark:bg-indigo-500/15"
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10">{copy.signin}</span>
                  </button>}

                  <button
                    type="button"
                    role="tab"
                    aria-selected={isSignUp}
                    onClick={() => switchAuthMode('signup')}
                    className={`relative flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isSignUp
                        ? 'text-indigo-700 dark:text-indigo-100 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {isSignUp && (
                      <motion.div
                        layoutId="activeAuthPill"
                        className="absolute inset-0 rounded-xl border border-indigo-100 bg-white shadow-xs dark:border-indigo-500/25 dark:bg-indigo-500/15"
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1">
                      <span>{copy.signup}</span>
                      <span className="text-[9px] bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.2 rounded-md font-extrabold uppercase">{copy.free}</span>
                    </span>
                  </button>
                </div>
              )}

              {/* Forgot Password Flow */}
              {mfaPendingUser ? (
                <form onSubmit={handleMfaVerify} className="space-y-4" noValidate>
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-center dark:border-indigo-900/50 dark:bg-indigo-950/20">
                    <ShieldCheck className="mx-auto h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                    <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-200">{mfaPendingUser.email}</p>
                  </div>
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{isVietnamese ? 'Mã xác thực' : 'Authentication code'}</span>
                    <input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={mfaCode} onChange={event => { setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }} placeholder="000000" className="h-14 w-full rounded-2xl border border-slate-200 bg-white text-center font-mono text-xl font-black tracking-[0.5em] text-slate-900 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                  </label>
                  {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">{error}</div>}
                  <button type="submit" disabled={loading || mfaCode.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-500/20 disabled:opacity-50">
                    {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <ShieldCheck className="h-4 w-4" />}{isVietnamese ? 'Xác minh và đăng nhập' : 'Verify and sign in'}
                  </button>
                  <button type="button" onClick={cancelMfaLogin} className="w-full py-2 text-xs font-extrabold text-slate-500 hover:text-indigo-600 dark:text-slate-400">{isVietnamese ? 'Quay lại đăng nhập' : 'Back to sign in'}</button>
                </form>
              ) : isForgot ? (
                <form onSubmit={handleForgotPassword} className="space-y-4" noValidate>
                  <GlowInputField
                    id="input_forgot_email"
                    icon={Mail}
                    type="email"
                    label={copy.email}
                    placeholder={copy.emailPlaceholder}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
                    required
                    autoFocus
                    autoComplete="email"
                    error={fieldErrors.email}
                    disabled={loading}
                  />

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      role="alert"
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
                      role="status"
                      aria-live="polite"
                      className="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{success}</span>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-extrabold rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div aria-hidden="true" className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{copy.processing}</span>
                      </div>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>{copy.resetSubmit}</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => switchAuthMode('signin')}
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{copy.backToSignin}</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Sign In / Sign Up Form */
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                          label={copy.fullName}
                          placeholder={copy.namePlaceholder}
                          value={name}
                          onChange={(e) => { setName(e.target.value); clearFieldError('name'); }}
                          required={isSignUp}
                          autoFocus={isSignUp}
                          autoComplete="name"
                          error={fieldErrors.name}
                          disabled={loading}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <GlowInputField
                    id="input_auth_email"
                    icon={Mail}
                    type="email"
                    label={copy.email}
                    placeholder={copy.emailPlaceholder}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
                    required
                    autoFocus={!isSignUp}
                    autoComplete="email"
                    error={fieldErrors.email}
                    disabled={loading}
                  />

                  <div className="space-y-1.5">
                    <GlowInputField
                      id="input_auth_password"
                      icon={Lock}
                      type={showPassword ? "text" : "password"}
                      label={copy.password}
                      placeholder={isSignUp ? copy.createPasswordPlaceholder : copy.passwordPlaceholder}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); clearFieldError('confirmPassword'); }}
                      required
                      minLength={isSignUp ? 8 : undefined}
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      error={fieldErrors.password}
                      disabled={loading}
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={loading}
                          className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />

                    {!isSignUp && (
                      <div className="flex justify-end pt-0.5">
                        <button
                          type="button"
                          onClick={() => { setAuthMode('forgot'); setPassword(''); clearFeedback(); }}
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline cursor-pointer"
                        >
                          {copy.forgotPassword}
                        </button>
                      </div>
                    )}
                  </div>

                  <AnimatePresence mode="wait">
                    {isSignUp && (
                      <motion.div
                        key="confirm-password-field"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <GlowInputField
                          id="input_signup_confirm_password"
                          icon={Lock}
                          type={showConfirmPassword ? 'text' : 'password'}
                          label={copy.confirmPassword}
                          placeholder={copy.confirmPasswordPlaceholder}
                          value={confirmPassword}
                          onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword'); }}
                          required={isSignUp}
                          minLength={8}
                          autoComplete="new-password"
                          error={fieldErrors.confirmPassword}
                          disabled={loading}
                          rightElement={
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              disabled={loading}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                              aria-label={showConfirmPassword ? copy.hidePassword : copy.showPassword}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          }
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

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
                          <span className="font-bold text-slate-500 dark:text-slate-400">{isVietnamese ? 'Độ mạnh mật khẩu' : 'Password strength'}</span>
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
                            {isVietnamese ? 'Ít nhất 8 ký tự' : '8+ characters'}
                          </span>
                          <span className={`flex items-center gap-1 ${hasLetter ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            <Check className={`w-3 h-3 ${hasLetter ? 'stroke-[3px]' : 'opacity-40'}`} />
                            {isVietnamese ? 'Có chữ cái' : 'Contains a letter'}
                          </span>
                          <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            <Check className={`w-3 h-3 ${hasNumber ? 'stroke-[3px]' : 'opacity-40'}`} />
                            {isVietnamese ? 'Có chữ số' : 'Contains a number'}
                          </span>
                          <span className={`flex items-center gap-1 ${hasSpecial ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            <Check className={`w-3 h-3 ${hasSpecial ? 'stroke-[3px]' : 'opacity-40'}`} />
                            {isVietnamese ? 'Có ký tự đặc biệt' : 'Contains a symbol'}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isSignUp && (
                    <div className="space-y-1.5">
                      <label className="flex cursor-pointer items-start gap-2.5 text-[11px] font-semibold leading-relaxed text-slate-600 dark:text-slate-400">
                        <input
                          id="input_signup_terms"
                          type="checkbox"
                          checked={acceptTerms}
                          onChange={(event) => { setAcceptTerms(event.target.checked); clearFieldError('terms'); }}
                          disabled={loading}
                          required
                          aria-invalid={Boolean(fieldErrors.terms)}
                          aria-describedby={fieldErrors.terms ? 'signup_terms_error' : undefined}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded-md cursor-pointer"
                        />
                        <span>
                          {isVietnamese ? 'Tôi đồng ý với ' : 'I agree to Apexa’s '}
                          <Link href="/legal/terms" target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="font-black text-indigo-600 hover:underline dark:text-indigo-400">
                            {isVietnamese ? 'Điều khoản sử dụng' : 'Terms of Use'}
                          </Link>
                          {isVietnamese ? ' và ' : ' and '}
                          <Link href="/legal/privacy" target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="font-black text-indigo-600 hover:underline dark:text-indigo-400">
                            {isVietnamese ? 'Chính sách quyền riêng tư' : 'Privacy Policy'}
                          </Link>
                          .
                        </span>
                      </label>
                      {fieldErrors.terms && (
                        <p id="signup_terms_error" className="pl-6 text-[10.5px] font-semibold text-rose-600 dark:text-rose-400">
                          {fieldErrors.terms}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Remember Me Animated Toggle Switch for Sign In */}
                  {!isSignUp && (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => !loading && setRememberMe(!rememberMe)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          if (!loading) setRememberMe(!rememberMe);
                        }
                      }}
                      className="group flex cursor-pointer select-none items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] dark:border-slate-800/80 dark:bg-slate-950/50 dark:hover:border-slate-700 dark:hover:bg-slate-950/80"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          rememberMe
                            ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400'
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                        }`}>
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight text-slate-800 dark:text-slate-200">
                            {copy.remember}
                          </p>
                          <p className="mt-0.5 text-[10.5px] font-medium leading-tight text-slate-500 dark:text-slate-400">
                            {copy.rememberSubtitle}
                          </p>
                        </div>
                      </div>

                      {/* Animated Switch Button */}
                      <div
                        role="switch"
                        aria-checked={rememberMe}
                        aria-label={copy.remember}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-300 ${
                          rememberMe
                            ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 shadow-sm shadow-blue-500/30'
                            : 'bg-slate-200 dark:bg-slate-800'
                        }`}
                      >
                        <motion.span
                          layout
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                            rememberMe ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Error and Success Notifications */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      role="alert"
                      className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-semibold shadow-2xs space-y-2"
                    >
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                        <span className="leading-snug">{error}</span>
                      </div>
                      {!isSignUp && registrationEnabled && (
                        <div className="flex items-center gap-2 pt-1 border-t border-rose-200/50 dark:border-rose-900/50 pl-7 flex-wrap">
                          <button
                            type="button"
                            onClick={() => switchAuthMode('signup')}
                            className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            {isVietnamese ? 'Chuyển sang đăng ký' : 'Switch to sign up'}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      role="status"
                      aria-live="polite"
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
                    aria-busy={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div aria-hidden="true" className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-extrabold">{copy.processing}</span>
                      </div>
                    ) : (
                      <span>
                        {isSignUp ? copy.submitSignup : copy.submitSignin}
                      </span>
                    )}
                  </button>
                </form>
              )}

              {/* Social Login Options */}
              {!isForgot && (
                <div className="space-y-3 pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
                  <div className="relative flex items-center justify-center">
                    <span className="bg-white dark:bg-slate-900 px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      {copy.continueWith}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleOAuthLogin('google')}
                      disabled={loading}
                      aria-busy={loading}
                      aria-label={isVietnamese ? 'Tiếp tục với Google' : 'Continue with Google'}
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
                      aria-label={isVietnamese ? 'Tiếp tục với Facebook' : 'Continue with Facebook'}
                      className="flex items-center justify-center gap-2.5 py-2.5 px-4 text-xs font-bold rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:bg-white dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 text-[#1877F2] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      <span>Facebook</span>
                    </button>
                  </div>
                </div>
              )}
              </section>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
