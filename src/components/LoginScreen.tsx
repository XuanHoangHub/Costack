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
  User, Lock, Mail,
  Eye, EyeOff, X, ArrowLeft, KeyRound,
  ShieldCheck, Zap, CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { resolveAppRole } from '../lib/authRole';
import { useTranslation } from '../contexts/TranslationContext';
import LanguageSwitch from './LanguageSwitch';
import ThemeSwitch from './ThemeSwitch';
import LandingPage from './landing/LandingPage';
import AuthErrorAlert from './auth/AuthErrorAlert';
import OtpCodeInput from './auth/OtpCodeInput';
import ModernAuthInput from './auth/ModernAuthInput';
import PasswordStrengthMeter, { calculatePasswordStrength } from './auth/PasswordStrengthMeter';
import SocialAuthButtons from './auth/SocialAuthButtons';
import AuthStoryPanel from './auth/AuthStoryPanel';
import { formatAuthError } from '../lib/authError';

interface LoginScreenProps {
  onLoginSuccess: (user: { id: string; name: string; email: string; avatar: string; role: 'admin' | 'member'; status: 'online' | 'busy' | 'offline' }, rememberMe: boolean) => void;
  registrationEnabled?: boolean;
}

type AuthMode = 'signin' | 'signup' | 'forgot';
type FieldName = 'name' | 'email' | 'password' | 'confirmPassword' | 'terms';
type FieldErrors = Partial<Record<FieldName, string>>;

const POPULAR_EMAIL_DOMAINS = ['@gmail.com', '@outlook.com', '@icloud.com', '@company.com'];

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

  // MFA 2FA verification states
  const [mfaPendingUser, setMfaPendingUser] = useState<SupabaseAuthUser | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaChallengeId, setMfaChallengeId] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRememberMe, setMfaRememberMe] = useState(true);
  const [refreshingChallenge, setRefreshingChallenge] = useState(false);
  const [challengeRefreshed, setChallengeRefreshed] = useState(false);

  const mfaInputRef = useRef<HTMLInputElement>(null);
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
    signin: 'Đăng nhập',
    signup: 'Đăng ký',
    email: 'Địa chỉ email',
    password: 'Mật khẩu',
    confirmPassword: 'Xác nhận mật khẩu',
    fullName: 'Họ và tên',
    emailPlaceholder: 'name@company.com',
    namePlaceholder: 'Ví dụ: Nguyễn Minh Anh',
    passwordPlaceholder: 'Nhập mật khẩu của bạn',
    createPasswordPlaceholder: 'Tạo mật khẩu mạnh (8+ ký tự)',
    confirmPasswordPlaceholder: 'Nhập lại mật khẩu để xác nhận',
    showPassword: 'Hiển thị mật khẩu',
    hidePassword: 'Ẩn mật khẩu',
    forgotPassword: 'Quên mật khẩu?',
    remember: 'Ghi nhớ đăng nhập trên thiết bị này',
    rememberSubtitle: 'Duy trì phiên làm việc an toàn trong 30 ngày',
    submitSignin: 'Đăng nhập vào Upgen',
    submitSignup: 'Tạo tài khoản',
    processing: 'Đang xử lý…',
    termsPrefix: 'Tôi đồng ý với ',
    termsLink: 'Điều khoản sử dụng',
    and: ' và ',
    privacyLink: 'Chính sách quyền riêng tư',
    continueWith: 'Hoặc tiếp tục với email',
    resetSubmit: 'Gửi liên kết khôi phục',
    backToSignin: 'Quay lại đăng nhập',
    securePortal: 'Cổng truy cập an toàn',
    forgotTitle: 'Khôi phục mật khẩu',
    signupTitle: 'Bắt đầu với Upgen',
    signinTitle: 'Chào mừng trở lại!',
    forgotDescription: 'Nhập địa chỉ email đã đăng ký để nhận liên kết đặt lại mật khẩu an toàn.',
    signupDescription: 'Tạo tài khoản để bắt đầu sắp xếp công việc hiệu quả.',
    signinDescription: 'Đăng nhập để tiếp tục làm việc trong không gian của bạn.',
  } : {
    signin: 'Sign in',
    signup: 'Sign up',
    email: 'Email address',
    password: 'Password',
    confirmPassword: 'Confirm password',
    fullName: 'Full name',
    emailPlaceholder: 'name@company.com',
    namePlaceholder: 'e.g. Alex Johnson',
    passwordPlaceholder: 'Enter your password',
    createPasswordPlaceholder: 'Create a strong password (8+ chars)',
    confirmPasswordPlaceholder: 'Re-enter your password to confirm',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    forgotPassword: 'Forgot password?',
    remember: 'Stay signed in on this device',
    rememberSubtitle: 'Keep session securely active for 30 days',
    submitSignin: 'Sign in to Upgen',
    submitSignup: 'Create account',
    processing: 'Processing…',
    termsPrefix: 'I agree to Upgen’s ',
    termsLink: 'Terms of Use',
    and: ' and ',
    privacyLink: 'Privacy Policy',
    continueWith: 'Or continue with email',
    resetSubmit: 'Send reset link',
    backToSignin: 'Back to sign in',
    securePortal: 'Secure access portal',
    forgotTitle: 'Reset your password',
    signupTitle: 'Get started with Upgen',
    signinTitle: 'Welcome back!',
    forgotDescription: 'Enter your registered email address to receive a password reset link.',
    signupDescription: 'Create an account to start organizing your work efficiently.',
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

  // Accessibility: Keyboard trap & Escape listener
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

  // Handle OAuth redirects & existing sessions
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

      const displayName = metadata.full_name || metadata.name || metadata.display_name || userEmail.split('@')[0] || 'Upgen Champion';
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

  const strengthDetails = calculatePasswordStrength(password);

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

  // Quick email domain autocomplete helper
  const handleSelectDomain = (domain: string) => {
    let prefix = email.trim();
    if (prefix.includes('@')) {
      prefix = prefix.split('@')[0];
    }
    const completedEmail = `${prefix}${domain}`;
    setEmail(completedEmail);
    clearFieldError('email');
    window.requestAnimationFrame(() => {
      document.getElementById('input_auth_password')?.focus();
    });
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
    } else if (isSignUp && !strengthDetails.isComplete) {
      nextErrors.password = isVietnamese
        ? 'Mật khẩu cần tối thiểu 8 ký tự, có chữ cái, chữ số và ký tự đặc biệt.'
        : 'Password must be 8+ characters with a letter, number, and special character.';
    }
    if (isSignUp && !confirmPassword) {
      nextErrors.confirmPassword = isVietnamese ? 'Vui lòng xác nhận lại mật khẩu.' : 'Please confirm your password.';
    } else if (isSignUp && confirmPassword !== password) {
      nextErrors.confirmPassword = isVietnamese ? 'Mật khẩu xác nhận không trùng khớp.' : 'Passwords do not match.';
    }
    if (isSignUp && !acceptTerms) {
      nextErrors.terms = isVietnamese
        ? 'Bạn cần đồng ý với điều khoản sử dụng để tạo tài khoản.'
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
    return formatAuthError(caughtError, isVietnamese).description;
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
          ? 'Đã gửi liên kết khôi phục! Vui lòng kiểm tra hộp thư đến (và cả mục thư rác) của bạn.'
          : 'Reset link sent! Please check your inbox (including your spam folder).'
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
          email: normalizedEmail,
          password,
          options: { data: { name: name.trim() } }
        });
        if (signUpError) throw signUpError;

        if (!signUpData.session || !signUpData.user) {
          setSuccess(isVietnamese
            ? 'Tài khoản đã được tạo thành công! Vui lòng kiểm tra email để xác nhận tài khoản trước khi đăng nhập.'
            : 'Account created successfully! Check your email to confirm your account before signing in.');
          setAuthMode('signin');
          setPassword('');
          setConfirmPassword('');
          setAcceptTerms(false);
          return;
        }

        const sessionUser = signUpData.user;
        const displayName = sessionUser?.user_metadata?.name || name || sessionUser?.email?.split('@')[0] || 'Upgen Champion';
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
        const displayName = sessionUser?.user_metadata?.name || sessionUser?.email?.split('@')[0] || 'Upgen Champion';

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

  const handleRefreshMfaChallenge = async () => {
    if (!mfaFactorId || refreshingChallenge) return;
    setRefreshingChallenge(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challengeError) throw challengeError;
      setMfaChallengeId(challenge.id);
      setMfaCode('');
      setChallengeRefreshed(true);
      setError('');
      window.setTimeout(() => setChallengeRefreshed(false), 4000);
      mfaInputRef.current?.focus();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setRefreshingChallenge(false);
    }
  };

  const handleMfaVerify = async (eventOrCode?: React.FormEvent | string) => {
    if (eventOrCode && typeof eventOrCode !== 'string' && 'preventDefault' in eventOrCode) {
      eventOrCode.preventDefault();
    }
    const code = (typeof eventOrCode === 'string' ? eventOrCode : mfaCode).trim();
    if (!mfaPendingUser || !/^\d{6}$/.test(code)) return;
    setLoading(true);
    setError('');
    try {
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: mfaChallengeId, code });
      if (verifyError) throw verifyError;
      const displayName = mfaPendingUser.user_metadata?.name || mfaPendingUser.email?.split('@')[0] || 'Upgen Champion';
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
      if (!challengeError && challenge) {
        setMfaChallengeId(challenge.id);
        setChallengeRefreshed(true);
        window.setTimeout(() => setChallengeRefreshed(false), 4000);
      }
      mfaInputRef.current?.focus();
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
    setChallengeRefreshed(false);
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

  // Show email domain suggestions when user types prefix
  const showEmailDomainChips = !isForgot && !mfaPendingUser && email.trim().length > 1 && !email.includes('@');

  return (
    <div className="apexa-auth-shell fixed inset-0 overflow-y-auto overflow-x-clip bg-[#f8fafc] dark:bg-[#030304] text-slate-800 dark:text-slate-100 font-sans selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900/50 dark:selection:text-blue-100">
      <LandingPage
        onSignUp={() => openAuth(true)}
        onSignIn={() => openAuth(false)}
      />

      {/* Auth Modal Dialog */}
      <AnimatePresence>
        {isAuthActive && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-0 sm:p-4 md:p-6">
            {/* Frosted Glass Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={closeAuth}
              className="fixed inset-0 bg-slate-950/60 dark:bg-black/80 backdrop-blur-xl cursor-pointer"
            />

            {/* Ambient Lighting Spots */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
              <div className="absolute -left-20 top-1/4 h-80 w-80 rounded-full bg-blue-500/15 dark:bg-cyan-500/20 blur-[120px]" />
              <div className="absolute -right-20 bottom-1/4 h-96 w-96 rounded-full bg-indigo-500/15 dark:bg-violet-600/20 blur-[130px]" />
            </div>

            {/* Main Modal Shell Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="auth-dialog-title"
              ref={dialogRef}
              onClick={(e) => e.stopPropagation()}
              className="apexa-auth-dialog relative z-10 my-auto grid max-h-[calc(100vh-20px)] w-full max-w-[980px] overflow-hidden rounded-2xl sm:rounded-[32px] border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#07090e]/95 backdrop-blur-2xl shadow-[0_25px_80px_-15px_rgba(15,23,42,0.2)] dark:shadow-[0_25px_100px_-15px_rgba(0,0,0,0.95),0_0_80px_rgba(6,182,212,0.08)] lg:grid-cols-[430px_1fr]"
            >
              {/* Desktop Left Story Showcase Panel */}
              <AuthStoryPanel isVietnamese={isVietnamese} />

              {/* Main Auth Form Interactive Section */}
              <section className="relative max-h-[calc(100vh-20px)] space-y-4.5 overflow-x-hidden overflow-y-auto bg-[#ffffff] dark:bg-[#07090e]/90 px-6 py-6 sm:px-9 sm:py-8 text-left transition-colors duration-200">
                {/* Ambient Soft Glow inside Form */}
                <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/10 dark:bg-cyan-500/10 blur-3xl" />

                {/* Top Action Header (ThemeSwitch + LanguageSwitch + Close) */}
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2 lg:hidden">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
                      <Zap className="w-4 h-4 fill-white" />
                    </div>
                    <span className="font-black text-slate-900 dark:text-white text-base tracking-tight font-display">
                      Upgen<span className="text-blue-600 dark:text-cyan-400">.</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <ThemeSwitch size="sm" />
                    <LanguageSwitch size="sm" />
                    <button
                      type="button"
                      onClick={closeAuth}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 shadow-xs hover:rotate-90 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-all duration-200 cursor-pointer"
                      aria-label={isVietnamese ? 'Đóng cửa sổ' : 'Close dialog'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card Title & Description */}
                <div className="space-y-1 pt-0.5">
                  <h2
                    id="auth-dialog-title"
                    className="text-2xl sm:text-[27px] font-black tracking-tight text-slate-900 dark:text-white leading-tight font-display"
                  >
                    {mfaPendingUser
                      ? (isVietnamese ? 'Xác thực hai bước (2FA)' : 'Two-Factor Authentication')
                      : isForgot
                      ? copy.forgotTitle
                      : isSignUp
                      ? copy.signupTitle
                      : copy.signinTitle}
                  </h2>
                  <p className="text-xs sm:text-[13px] font-normal text-slate-500 dark:text-slate-400 leading-relaxed">
                    {mfaPendingUser
                      ? (isVietnamese ? 'Nhập mã gồm 6 chữ số từ ứng dụng Authenticator để hoàn tất đăng nhập an toàn.' : 'Enter the 6-digit verification code from your authenticator app.')
                      : isForgot
                      ? copy.forgotDescription
                      : isSignUp
                      ? copy.signupDescription
                      : copy.signinDescription}
                  </p>
                </div>

                {/* Animated Segmented Tab Switcher (Sign In vs Sign Up) */}
                {!isForgot && !mfaPendingUser && (
                  <div
                    role="tablist"
                    aria-label={isVietnamese ? 'Chọn phương thức đăng nhập hoặc đăng ký' : 'Choose sign in or sign up'}
                    className="relative p-1 bg-slate-100 dark:bg-white/[0.05] rounded-2xl border border-slate-200/90 dark:border-white/10 grid grid-cols-2 select-none"
                  >
                    {/* Sliding Indicator */}
                    <div
                      aria-hidden="true"
                      className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/15 shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)] transition-all duration-200 ease-out pointer-events-none ${
                        isSignUp ? 'left-[calc(50%+2px)]' : 'left-1'
                      }`}
                    />

                    {/* Sign In Tab */}
                    <button
                      type="button"
                      role="tab"
                      aria-selected={!isSignUp}
                      onClick={() => switchAuthMode('signin')}
                      className={`relative z-10 flex min-h-10 items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs sm:text-[13px] font-bold transition-colors duration-150 cursor-pointer ${
                        !isSignUp
                          ? 'text-blue-600 dark:text-white font-black'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <span>{copy.signin}</span>
                    </button>

                    {/* Sign Up Tab (No "Miễn phí" badge as requested) */}
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isSignUp}
                      onClick={() => switchAuthMode('signup')}
                      className={`relative z-10 flex min-h-10 items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs sm:text-[13px] font-bold transition-colors duration-150 cursor-pointer ${
                        isSignUp
                          ? 'text-blue-600 dark:text-white font-black'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <span>{copy.signup}</span>
                    </button>
                  </div>
                )}

                {/* Social Login Options (Google & Facebook) - Moved to TOP as requested */}
                {!isForgot && !mfaPendingUser && (
                  <SocialAuthButtons
                    onGoogleLogin={() => handleOAuthLogin('google')}
                    onFacebookLogin={() => handleOAuthLogin('facebook')}
                    loading={loading}
                    isVietnamese={isVietnamese}
                    dividerText={copy.continueWith}
                    dividerPosition="bottom"
                  />
                )}

                {/* MFA Verification Screen */}
                {mfaPendingUser ? (
                  <form onSubmit={handleMfaVerify} className="space-y-4 text-left" noValidate>
                    <div className="rounded-2xl border border-blue-200/80 bg-blue-50/70 dark:border-cyan-900/40 dark:bg-cyan-950/20 p-4 text-center">
                      <div className="w-11 h-11 mx-auto rounded-full bg-blue-600/10 dark:bg-cyan-400/15 flex items-center justify-center text-blue-600 dark:text-cyan-300 mb-2.5">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {isVietnamese ? 'Tài khoản được bảo vệ bằng 2FA' : '2FA Authenticator Protected'}
                      </p>
                      <p className="mt-0.5 text-xs font-black text-slate-900 dark:text-white font-mono">
                        {mfaPendingUser.email}
                      </p>
                    </div>

                    <div className="space-y-2 text-center">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        {isVietnamese ? 'Nhập mã 6 chữ số từ ứng dụng xác thực' : 'Enter the 6-digit code from your authenticator app'}
                      </span>
                      <div className="pt-1 flex justify-center">
                        <OtpCodeInput
                          id="login-mfa-otp"
                          value={mfaCode}
                          onChange={(val) => {
                            setMfaCode(val);
                            if (error) setError('');
                          }}
                          onComplete={(code) => handleMfaVerify(code)}
                          disabled={loading}
                          hasError={Boolean(error)}
                          autoFocus
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
                        {isVietnamese
                          ? 'Tương thích Google Authenticator, Microsoft Authenticator hoặc Apple Keychain'
                          : 'Supports Google Authenticator, Microsoft Authenticator or Apple Keychain'}
                      </p>
                    </div>

                    <AuthErrorAlert
                      error={error}
                      isVietnamese={isVietnamese}
                      onClose={() => setError('')}
                      onRefresh={handleRefreshMfaChallenge}
                      isRefreshing={refreshingChallenge}
                      isRefreshed={challengeRefreshed}
                      showRefreshButton={Boolean(mfaFactorId)}
                    />

                    <button
                      type="submit"
                      disabled={loading || mfaCode.length !== 6}
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                    >
                      {loading ? (
                        <div className="w-4.5 h-4.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      <span>{isVietnamese ? 'Xác minh và đăng nhập' : 'Verify and sign in'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={cancelMfaLogin}
                      className="w-full py-2 text-xs font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                    >
                      {isVietnamese ? 'Quay lại đăng nhập' : 'Back to sign in'}
                    </button>
                  </form>
                ) : isForgot ? (
                  /* Forgot Password Form */
                  <form onSubmit={handleForgotPassword} className="space-y-4" noValidate>
                    <ModernAuthInput
                      id="input_forgot_email"
                      icon={Mail}
                      type="email"
                      label={copy.email}
                      placeholder={copy.emailPlaceholder}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearFieldError('email');
                      }}
                      required
                      autoFocus
                      autoComplete="email"
                      error={fieldErrors.email}
                      disabled={loading}
                      isValid={Boolean(email && isValidEmail(email))}
                      showClearButton
                      isVietnamese={isVietnamese}
                    />

                    <AuthErrorAlert
                      error={error}
                      isVietnamese={isVietnamese}
                      onClose={() => setError('')}
                    />

                    {success && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        role="status"
                        aria-live="polite"
                        className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold"
                      >
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{success}</span>
                      </motion.div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      aria-busy={loading}
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div aria-hidden="true" className="w-4.5 h-4.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>{copy.backToSignin}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Sign In / Sign Up Form */
                  <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                    {/* Full Name (Sign Up only) */}
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
                          <ModernAuthInput
                            id="input_signup_name"
                            icon={User}
                            type="text"
                            label={copy.fullName}
                            placeholder={copy.namePlaceholder}
                            value={name}
                            onChange={(e) => {
                              setName(e.target.value);
                              clearFieldError('name');
                            }}
                            required={isSignUp}
                            autoFocus={isSignUp}
                            autoComplete="name"
                            error={fieldErrors.name}
                            disabled={loading}
                            isValid={name.trim().length >= 2}
                            showClearButton
                            isVietnamese={isVietnamese}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Email Input */}
                    <div className="space-y-1.5">
                      <ModernAuthInput
                        id="input_auth_email"
                        icon={Mail}
                        type="email"
                        label={copy.email}
                        placeholder={copy.emailPlaceholder}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          clearFieldError('email');
                        }}
                        required
                        autoFocus={!isSignUp}
                        autoComplete="email"
                        error={fieldErrors.email}
                        disabled={loading}
                        isValid={Boolean(email && isValidEmail(email))}
                        showClearButton
                        isVietnamese={isVietnamese}
                      />

                      {/* Quick Email Domain Suggestion Chips */}
                      {showEmailDomainChips && (
                        <motion.div
                          initial={{ opacity: 0, y: -2 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-wrap items-center gap-1.5 pt-0.5 px-0.5"
                        >
                          <span className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 mr-0.5">
                            {isVietnamese ? 'Gợi ý:' : 'Quick:'}
                          </span>
                          {POPULAR_EMAIL_DOMAINS.map((domain) => (
                            <button
                              key={domain}
                              type="button"
                              onClick={() => handleSelectDomain(domain)}
                              className="px-2 py-0.5 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100/80 hover:bg-blue-50 dark:bg-white/[0.05] dark:hover:bg-cyan-500/15 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-cyan-300 transition-colors cursor-pointer"
                            >
                              {domain}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5">
                      <ModernAuthInput
                        id="input_auth_password"
                        icon={Lock}
                        type={showPassword ? 'text' : 'password'}
                        label={copy.password}
                        placeholder={isSignUp ? copy.createPasswordPlaceholder : copy.passwordPlaceholder}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          clearFieldError('password');
                          clearFieldError('confirmPassword');
                        }}
                        required
                        minLength={isSignUp ? 8 : undefined}
                        autoComplete={isSignUp ? 'new-password' : 'current-password'}
                        error={fieldErrors.password}
                        disabled={loading}
                        isVietnamese={isVietnamese}
                        rightElement={
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={loading}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        }
                      />

                      {/* Forgot password link for Sign In */}
                      {!isSignUp && (
                        <div className="flex justify-end pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode('forgot');
                              setPassword('');
                              clearFeedback();
                            }}
                            className="inline-flex items-center text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                          >
                            {copy.forgotPassword}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password (Sign Up only) */}
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
                          <ModernAuthInput
                            id="input_signup_confirm_password"
                            icon={Lock}
                            type={showConfirmPassword ? 'text' : 'password'}
                            label={copy.confirmPassword}
                            placeholder={copy.confirmPasswordPlaceholder}
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              clearFieldError('confirmPassword');
                            }}
                            required={isSignUp}
                            minLength={8}
                            autoComplete="new-password"
                            error={fieldErrors.confirmPassword}
                            disabled={loading}
                            isVietnamese={isVietnamese}
                            isValid={Boolean(confirmPassword && confirmPassword === password)}
                            rightElement={
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                disabled={loading}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                                aria-label={showConfirmPassword ? copy.hidePassword : copy.showPassword}
                              >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            }
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Password Strength Checklist (Sign Up only) */}
                    <AnimatePresence>
                      {isSignUp && password && (
                        <PasswordStrengthMeter
                          password={password}
                          confirmPassword={confirmPassword}
                          isVietnamese={isVietnamese}
                          showConfirmMatch={Boolean(confirmPassword)}
                        />
                      )}
                    </AnimatePresence>

                    {/* Terms and Conditions Checkbox (Sign Up only) */}
                    {isSignUp && (
                      <div className="space-y-1.5 pt-0.5">
                        <label className="flex cursor-pointer items-start gap-2.5 text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-400 select-none">
                          <input
                            id="input_signup_terms"
                            type="checkbox"
                            checked={acceptTerms}
                            onChange={(event) => {
                              setAcceptTerms(event.target.checked);
                              clearFieldError('terms');
                            }}
                            disabled={loading}
                            required
                            aria-invalid={Boolean(fieldErrors.terms)}
                            aria-describedby={fieldErrors.terms ? 'signup_terms_error' : undefined}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 dark:border-white/20 text-blue-600 focus:ring-blue-500 dark:focus:ring-cyan-400 cursor-pointer"
                          />
                          <span>
                            {copy.termsPrefix}
                            <Link
                              href="/legal/terms"
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="font-bold text-blue-600 hover:underline dark:text-cyan-400"
                            >
                              {copy.termsLink}
                            </Link>
                            {copy.and}
                            <Link
                              href="/legal/privacy"
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="font-bold text-blue-600 hover:underline dark:text-cyan-400"
                            >
                              {copy.privacyLink}
                            </Link>
                            .
                          </span>
                        </label>
                        {fieldErrors.terms && (
                          <p id="signup_terms_error" className="pl-6 text-xs font-semibold text-rose-600 dark:text-rose-400">
                            {fieldErrors.terms}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Modern Remember Me Toggle (Sign In only) */}
                    {!isSignUp && (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={rememberMe}
                        aria-label={copy.remember}
                        disabled={loading}
                        onClick={() => !loading && setRememberMe(!rememberMe)}
                        className="group flex min-h-[50px] w-full cursor-pointer select-none items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-left transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                              rememberMe
                                ? 'bg-blue-500/10 text-blue-600 dark:bg-cyan-400/15 dark:text-cyan-400'
                                : 'bg-slate-200/70 text-slate-400 dark:bg-white/5 dark:text-slate-500'
                            }`}
                          >
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

                        {/* Animated iOS-style Switch Knob */}
                        <div
                          aria-hidden="true"
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ${
                            rememberMe
                              ? 'bg-blue-600 dark:bg-cyan-500 shadow-sm shadow-blue-500/30 dark:shadow-cyan-500/30'
                              : 'bg-slate-300 dark:bg-white/15'
                          }`}
                        >
                          <motion.span
                            layout
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                              rememberMe ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </button>
                    )}

                    {/* Error & Success Banners */}
                    {error && (
                      <div className="space-y-2">
                        <AuthErrorAlert
                          error={error}
                          isVietnamese={isVietnamese}
                          onClose={() => setError('')}
                        />
                        {!isSignUp && registrationEnabled && (
                          <div className="flex items-center gap-2 pt-0.5 pl-1">
                            <button
                              type="button"
                              onClick={() => switchAuthMode('signup')}
                              className="text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                            >
                              {isVietnamese ? 'Chưa có tài khoản? Đăng ký ngay' : 'No account yet? Sign up now'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {success && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        role="status"
                        aria-live="polite"
                        className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold"
                      >
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{success}</span>
                      </motion.div>
                    )}

                    {/* Primary Submit CTA Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      aria-busy={loading}
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div aria-hidden="true" className="w-4.5 h-4.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>{copy.processing}</span>
                        </div>
                      ) : (
                        <span>
                          {isSignUp ? copy.submitSignup : copy.submitSignin}
                        </span>
                      )}
                    </button>
                  </form>
                )}
              </section>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
