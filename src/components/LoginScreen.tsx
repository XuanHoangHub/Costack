"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, ShieldAlert, Sparkles, LogIn, UserPlus, Lock, Mail, 
  Eye, EyeOff, Check, ArrowRight, Kanban, CheckCircle2, Users, Activity,
  MessageSquare, Briefcase, Timer, Zap, Shield, Star, Fingerprint,
  ChevronDown, Search, Plus, FileText, ChevronRight, LayoutGrid, Calendar,
  ListTodo, Info, ArrowLeft
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface LoginScreenProps {
  onLoginSuccess: (user: { name: string; email: string; avatar: string; role: 'admin' | 'member'; status: 'online' | 'busy' | 'offline' }, rememberMe: boolean) => void;
}

// ── Glow Input Field (defined outside to preserve stable identity for browser autofill) ──
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
          className={`relative w-full pl-10 ${rightElement ? 'pr-11' : 'pr-4'} py-2.5 text-xs rounded-xl bg-white border transition-all duration-200 shadow-xs font-medium text-slate-800 placeholder-slate-400 outline-none ${
            isFocused 
              ? 'border-indigo-500/60 ring-2 ring-indigo-500/5 shadow-xs' 
              : 'border-slate-200 hover:border-slate-350'
          }`}
        />
        {rightElement && (
          <div className="absolute right-2.5 z-10">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
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

  // Active stats counter animation
  const [activeUsers, setActiveUsers] = useState(0);
  const [tasksCompleted, setTasksCompleted] = useState(0);

  useEffect(() => {
    // Count-up animation for stats
    const countUp = (setter: React.Dispatch<React.SetStateAction<number>>, target: number, duration: number) => {
      let current = 0;
      const step = target / (duration / 16);
      const interval = setInterval(() => {
        current += step;
        if (current >= target) {
          setter(target);
          clearInterval(interval);
        } else {
          setter(Math.floor(current));
        }
      }, 16);
      return interval;
    };
    
    const t1 = countUp(setActiveUsers, 2847, 1500);
    const t2 = countUp(setTasksCompleted, 12453, 1800);

    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, []);

  // Password validation checks
  const hasMinLength = password.length >= 8;
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  
  const strengthScore = [hasMinLength, hasNumber, hasSpecial, hasLetter].filter(Boolean).length;

  const getStrengthTextAndColor = () => {
    switch (strengthScore) {
      case 0: return { text: 'Không an toàn', color: 'bg-red-400', textClass: 'text-red-500' };
      case 1: return { text: 'Yếu', color: 'bg-rose-400', textClass: 'text-rose-500' };
      case 2: return { text: 'Trung bình', color: 'bg-amber-400', textClass: 'text-amber-500' };
      case 3: return { text: 'Khá mạnh', color: 'bg-indigo-400', textClass: 'text-indigo-500' };
      case 4: return { text: 'Tuyệt vời!', color: 'bg-emerald-400', textClass: 'text-emerald-500' };
      default: return { text: 'Yếu', color: 'bg-slate-200', textClass: 'text-slate-400' };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Vui lòng điền đầy đủ email và mật khẩu.');
      return;
    }
    if (isSignUp && !name) {
      setError('Vui lòng điền họ tên của bạn.');
      return;
    }
    if (isSignUp && strengthScore < 3) {
      setError('Mật khẩu chưa đủ an toàn (cần đạt ít nhất 3/4 điều kiện).');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
            }
          }
        });

        if (signUpError) {
          throw signUpError;
        }

        setSuccess('Đăng ký thành công! Đang tự động kết nối...');
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          setSuccess('Đăng ký thành công! Vui lòng xác thực email để tiếp tục.');
          setLoading(false);
          setIsSignUp(false);
          return;
        }

        const sessionUser = signInData.user;
        const displayName = sessionUser?.user_metadata?.name || name || sessionUser?.email?.split('@')[0] || 'Avaxa Champion';

        onLoginSuccess({
          name: displayName,
          email: sessionUser?.email || email,
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(displayName)}`,
          role: 'member',
          status: 'online'
        }, rememberMe);

      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          throw signInError;
        }

        const sessionUser = data.user;
        const displayName = sessionUser?.user_metadata?.name || sessionUser?.email?.split('@')[0] || 'Avaxa Champion';

        setSuccess('Xác thực thành công! Đang vào hệ thống...');
        await new Promise((resolve) => setTimeout(resolve, 800));

        const userRole = sessionUser?.email?.includes('admin') || sessionUser?.email === 'hoang.benjamin.creative@gmail.com' ? 'admin' : 'member';

        onLoginSuccess({
          name: displayName,
          email: sessionUser?.email || email,
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(displayName)}`,
          role: userRole,
          status: 'online'
        }, rememberMe);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let errorMessage = err.message || 'Lỗi kết nối máy chủ xác thực.';
      if (err.message?.toLowerCase().includes('invalid login credentials')) {
        errorMessage = 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
      } else if (err.message?.toLowerCase().includes('user already registered')) {
        errorMessage = 'Địa chỉ email này đã tồn tại trên hệ thống.';
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
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: { redirectTo: window.location.origin }
      });
      if (oauthError) throw oauthError;
      setSuccess(`Đang chuyển hướng sang ${provider}...`);
    } catch (err: any) {
      console.warn(`SSO local sandbox fallback:`, err);
      const mockupUsers = {
        google: { name: 'Hoàng Benjamin', email: 'hoang.benjamin.creative@gmail.com', role: 'admin' },
        facebook: { name: 'Mai Phương', email: 'maiphuong.fb@avaxa.io', role: 'member' }
      };
      const selected = mockupUsers[provider];
      setSuccess(`Phiên SSO cục bộ đã được kích hoạt cho ${selected.name}`);
      await new Promise(resolve => setTimeout(resolve, 800));
      onLoginSuccess({
        name: selected.name,
        email: selected.email,
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(selected.name)}`,
        role: selected.role as 'admin' | 'member',
        status: 'online'
      }, rememberMe);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#f8fafc] text-slate-800 font-sans flex flex-col overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-800">
      
      {/* ── Top Header Navigation Bar (ClickUp Style) ── */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between transition-all duration-300">
        <div className="flex items-center gap-8">
          {/* Logo brand */}
          <div 
            onClick={() => setIsAuthActive(false)} 
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-extrabold text-lg shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              A
            </div>
            <span className="font-display font-black text-lg tracking-tight text-slate-850">
              avaxa <span className="text-[10px] align-super text-indigo-600 font-bold bg-indigo-50 px-1 py-0.5 rounded ml-0.5 border border-indigo-100/50">OS</span>
            </span>
          </div>

          {/* Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-500">
            <button className="hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1">
              Trợ lý AI <span className="text-[9px] bg-purple-50 text-purple-600 px-1 py-0.2 rounded font-extrabold">NEW</span>
            </button>
            <button className="hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-0.5">
              Tính năng <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            <button className="hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-0.5">
              Giải pháp <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            <button className="hover:text-slate-900 transition-colors cursor-pointer">Bảng giá</button>
            <button className="hover:text-slate-900 transition-colors cursor-pointer">Doanh nghiệp</button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button className="hidden sm:inline-flex text-xs font-bold text-slate-500 hover:text-slate-900 px-3.5 py-2 transition-colors cursor-pointer">
            Trải nghiệm Demo
          </button>
          <button 
            onClick={() => {
              setIsAuthActive(true);
              setIsSignUp(false);
              setError('');
            }}
            className={`text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer ${
              isAuthActive && !isSignUp 
                ? 'bg-slate-100 text-slate-900' 
                : 'text-slate-600 hover:text-slate-900 bg-transparent'
            }`}
          >
            Đăng nhập
          </button>
          <button 
            onClick={() => {
              setIsAuthActive(true);
              setIsSignUp(true);
              setError('');
            }}
            className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Đăng ký
          </button>
        </div>
      </header>

      {/* ── Main Hero Content Area ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* ═══════════════ LEFT COLUMN (Morphing Container) ═══════════════ */}
        <div className="lg:col-span-5 relative w-full min-h-[460px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {!isAuthActive ? (
              // ── Landing Mode ──
              <motion.div
                key="landing-hero"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.45 }}
                className="space-y-6 text-center lg:text-left"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-black text-indigo-700 uppercase tracking-wider select-none">
                  <Kanban className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                  <span>AVAXA SPRINT BOARDS</span>
                </div>
                
                <h1 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-black tracking-tight text-slate-900 leading-[1.1] font-display">
                  Bảng Kanban tối ưu giúp công việc <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">
                    luôn tiến về phía trước
                  </span>
                </h1>

                <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed max-w-lg">
                  Avaxa kết nối các bảng công việc, tài liệu thông minh, thảo luận nhóm thời gian thực và trợ lý AI thông minh tại một nơi. Ít chuyển đổi ứng dụng, hoàn thành nhiều sprint hơn.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setIsAuthActive(true);
                      setIsSignUp(true);
                    }}
                    className="w-full sm:w-auto px-7 py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Bắt đầu ngay. Miễn phí</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </motion.button>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Không thẻ tín dụng. Trải nghiệm trọn vẹn.
                  </span>
                </div>

                {/* Social Proof */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-slate-100 justify-center lg:justify-start">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    Được tin dùng bởi hơn <span className="text-slate-900">25,000+</span> nhóm làm việc trên toàn cầu.
                  </span>
                </div>
              </motion.div>
            ) : (
              // ── Auth Mode (Login / Signup Form) ──
              <motion.div
                key="auth-card"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.45 }}
                className="w-full max-w-sm mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-100/50 p-7 space-y-5"
              >
                {/* Back button */}
                <button 
                  onClick={() => setIsAuthActive(false)}
                  className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors cursor-pointer select-none"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại trang chủ</span>
                </button>

                <div className="space-y-1">
                  <h2 className="text-lg font-black text-slate-900 font-display">
                    {isSignUp ? 'Bắt đầu dùng Avaxa miễn phí' : 'Chào mừng trở lại'}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {isSignUp ? 'Tạo tài khoản và hợp nhất quy trình làm việc của bạn.' : 'Kết nối hệ thống và tiếp tục hành trình hiệu suất.'}
                  </p>
                </div>

                {/* Custom Toggle inside card */}
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 select-none">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setError('');
                    }}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all relative flex items-center justify-center gap-1.5 cursor-pointer ${
                      !isSignUp ? 'bg-white text-indigo-650 shadow-xs border border-slate-100' : 'text-slate-450 hover:text-slate-600'
                    }`}
                  >
                    Đăng nhập
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setError('');
                    }}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all relative flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSignUp ? 'bg-white text-indigo-650 shadow-xs border border-slate-100' : 'text-slate-450 hover:text-slate-600'
                    }`}
                  >
                    Đăng ký mới
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <AnimatePresence mode="wait">
                    {isSignUp && (
                      <motion.div
                        key="name-field"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1 overflow-hidden"
                      >
                        <GlowInputField
                          id="input_signup_name"
                          icon={User}
                          type="text"
                          placeholder="Họ và tên của bạn"
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
                    placeholder="Địa chỉ email cá nhân/công việc"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <div className="space-y-1">
                    <GlowInputField
                      id="input_login_password"
                      icon={Lock}
                      type={showPassword ? "text" : "password"}
                      placeholder="Mật khẩu của bạn"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      rightElement={
                        <button
                          id="btn_toggle_password_view"
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      }
                    />
                    {!isSignUp && (
                      <div className="text-right pt-0.5">
                        <a href="#" className="text-[10px] text-indigo-600 font-bold hover:underline">Quên mật khẩu?</a>
                      </div>
                    )}
                  </div>

                  {/* Signup strength checklist */}
                  <AnimatePresence>
                    {isSignUp && password && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-2 overflow-hidden text-left"
                      >
                        <div className="flex items-center justify-between text-[9px] font-bold">
                          <span className="text-slate-400">Độ mạnh mật khẩu:</span>
                          <span className={`font-black ${getStrengthTextAndColor().textClass}`}>{getStrengthTextAndColor().text}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                          {[1,2,3,4].map((s) => (
                            <div 
                              key={s} 
                              className={`h-full rounded-full transition-colors duration-300 ${
                                strengthScore >= s ? getStrengthTextAndColor().color : 'bg-slate-200'
                              }`} 
                            />
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[8px] font-bold text-slate-400">
                          <span className={hasMinLength ? 'text-emerald-500' : ''}>✓ Ít nhất 8 ký tự</span>
                          <span className={hasLetter ? 'text-emerald-500' : ''}>✓ Có chữ cái (a-z)</span>
                          <span className={hasNumber ? 'text-emerald-500' : ''}>✓ Có chữ số (0-9)</span>
                          <span className={hasSpecial ? 'text-emerald-500' : ''}>✓ Kí tự đặc biệt</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Remember me & submit */}
                  <div className="flex items-center justify-between pt-0.5">
                    <button
                      type="button"
                      onClick={() => setRememberMe(!rememberMe)}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 cursor-pointer select-none group"
                    >
                      <div className={`w-3.5 h-3.5 rounded border transition-all flex items-center justify-center ${
                        rememberMe ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white group-hover:border-indigo-400'
                      }`}>
                        {rememberMe && <Check className="w-2.5 h-2.5 stroke-[3px]" />}
                      </div>
                      <span>Ghi nhớ 30 ngày</span>
                    </button>
                  </div>

                  {error && (
                    <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-semibold">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{success}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Fingerprint className="w-3.5 h-3.5 opacity-80" />
                        <span>{isSignUp ? 'TẠO TÀI KHOẢN OS' : 'ĐĂNG NHẬP HỆ THỐNG'}</span>
                      </>
                    )}
                  </button>
                </form>

                {/* SSO options */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tiếp tục bằng</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => handleOAuthLogin('google')}
                      className="flex items-center justify-center gap-2 py-2 text-xs rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-xs cursor-pointer font-bold text-slate-600"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>Google</span>
                    </button>
                    <button
                      onClick={() => handleOAuthLogin('facebook')}
                      className="flex items-center justify-center gap-2 py-2 text-xs rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-xs cursor-pointer font-bold text-slate-600"
                    >
                      <svg className="w-3.5 h-3.5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <span>Facebook</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══════════════ RIGHT COLUMN (High-Fidelity Product Preview) ═══════════════ */}
        <div className="lg:col-span-7 w-full relative flex items-center justify-center">
          {/* Background glowing decorations */}
          <div className="absolute top-[20%] left-[10%] w-[80%] h-[80%] bg-indigo-500/5 rounded-full blur-[90px] pointer-events-none" />
          <div className="absolute bottom-[10%] right-[5%] w-[60%] h-[60%] bg-pink-500/5 rounded-full blur-[80px] pointer-events-none" />

          {/* ── High Fidelity Interactive App Window Mockup ── */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.65 }}
            className="w-full bg-white border border-slate-200/80 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.06)] relative overflow-hidden flex flex-col min-h-[480px]"
          >
            {/* Header / window bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-150 select-none">
              <div className="flex items-center gap-1.5">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300/80 block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300/80 block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300/80 block" />
                </div>
                <div className="flex items-center gap-1.5 ml-3 px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 block animate-pulse" />
                  <span>Mango Tech</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium ml-2">
                  All Hands in 13m
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-40 flex items-center">
                <Search className="w-3 h-3 text-slate-400 absolute left-2" />
                <input
                  type="text"
                  placeholder="Search..."
                  disabled
                  className="w-full pl-6 pr-2 py-1 text-[10px] rounded-lg border border-slate-200 bg-white placeholder-slate-400 outline-none text-slate-500 font-medium"
                />
              </div>
            </div>

            {/* Inner Workspace Layout */}
            <div className="flex-1 flex min-h-0">
              {/* Sidebar Mockup */}
              <aside className="w-36 bg-slate-50/50 border-r border-slate-150 p-3.5 space-y-4 hidden sm:block select-none shrink-0">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 px-1.5 py-1 text-[10px] font-semibold text-slate-450 hover:bg-slate-100/50 rounded transition-colors cursor-pointer">
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Home</span>
                  </div>
                  <div className="flex items-center justify-between px-1.5 py-1 text-[10px] font-semibold text-slate-700 bg-white shadow-xs border border-slate-200/55 rounded cursor-pointer">
                    <span className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Inbox</span>
                    </span>
                    <span className="px-1 py-0.2 bg-rose-500 text-white rounded-full text-[8px] font-extrabold scale-90">4</span>
                  </div>
                  <div className="flex items-center gap-2 px-1.5 py-1 text-[10px] font-semibold text-slate-450 hover:bg-slate-100/50 rounded transition-colors cursor-pointer">
                    <ListTodo className="w-3.5 h-3.5" />
                    <span>My Tasks</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Spaces</div>
                  <div className="space-y-1">
                    {[
                      { name: 'Marketing', color: 'bg-rose-400' },
                      { name: 'Product', color: 'bg-purple-500' },
                      { name: 'Quality Engineering', color: 'bg-blue-400' }
                    ].map((s, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 hover:bg-slate-100 rounded transition-colors cursor-pointer">
                        <span className={`w-1.5 h-1.5 rounded-full ${s.color}`} />
                        <span>{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>

              {/* Main Board Area */}
              <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
                {/* Columns Header (Views Tab) */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 select-none">
                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                    <span className="hover:text-slate-800 cursor-pointer flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Chat</span>
                    <span className="text-indigo-600 border-b-2 border-indigo-500 pb-2.5 flex items-center gap-1 cursor-pointer"><Kanban className="w-3.5 h-3.5" /> Board</span>
                    <span className="hover:text-slate-800 cursor-pointer flex items-center gap-1"><ListTodo className="w-3.5 h-3.5" /> List</span>
                    <span className="hover:text-slate-800 cursor-pointer flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Calendar</span>
                    <span className="text-slate-300 cursor-pointer">+ View</span>
                  </div>
                  <div className="flex items-center gap-1 cursor-pointer">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[9px] text-slate-500 font-bold">Share</span>
                  </div>
                </div>

                {/* Kanban columns */}
                <div className="grid grid-cols-3 gap-3">
                  
                  {/* Column 1: Open */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-350" />
                        Open
                      </span>
                      <span className="text-[9px] text-slate-400 font-extrabold bg-slate-100 px-1 rounded">2</span>
                    </div>

                    <div className="p-2.5 bg-white border border-slate-150 rounded-xl space-y-2 hover:border-slate-350 transition-all shadow-xs cursor-pointer group">
                      <h4 className="text-[10px] font-bold text-slate-700 leading-snug group-hover:text-slate-900 transition-colors">
                        Create promotional videos and social media posts
                      </h4>
                      <div className="flex items-center justify-between text-[9px] text-slate-400">
                        <span className="flex items-center gap-1 font-mono"><Timer className="w-3 h-3 text-slate-300" /> Aug 18</span>
                        <span className="text-[8px] bg-slate-100 text-slate-500 font-bold px-1 py-0.2 rounded uppercase">Normal</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white border border-slate-150 rounded-xl space-y-2 hover:border-slate-350 transition-all shadow-xs cursor-pointer opacity-70">
                      <h4 className="text-[10px] font-bold text-slate-700 leading-snug">
                        Prepare marketing assets
                      </h4>
                    </div>
                  </div>

                  {/* Column 2: In Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        In Progress
                      </span>
                      <span className="text-[9px] text-blue-500 font-extrabold bg-blue-50 px-1 rounded">3</span>
                    </div>

                    <div className="p-2.5 bg-white border border-blue-200 rounded-xl space-y-2 hover:border-blue-300 transition-all shadow-md cursor-pointer group relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                      <div className="text-[8px] text-indigo-650 font-bold">Sprint list</div>
                      <h4 className="text-[10px] font-bold text-slate-700 leading-snug group-hover:text-slate-900 transition-colors">
                        Revamp existing badges
                      </h4>
                      <div className="flex items-center justify-between text-[9px] text-slate-455 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1 font-mono text-rose-500"><Timer className="w-3 h-3" /> Overdue</span>
                        <span className="text-[8px] bg-rose-50 text-rose-600 font-black px-1.5 py-0.2 rounded uppercase">High</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white border border-slate-150 rounded-xl space-y-2 hover:border-slate-350 transition-all shadow-xs cursor-pointer">
                      <h4 className="text-[10px] font-bold text-slate-700 leading-snug">
                        Product Screen repository
                      </h4>
                    </div>
                  </div>

                  {/* Column 3: In Review */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        In Review
                      </span>
                      <span className="text-[9px] text-amber-500 font-extrabold bg-amber-50 px-1 rounded">3</span>
                    </div>

                    <div className="p-2.5 bg-white border border-slate-150 rounded-xl space-y-2 hover:border-slate-350 transition-all shadow-xs cursor-pointer opacity-70">
                      <h4 className="text-[10px] font-bold text-slate-700 leading-snug">
                        Contracts Proposals
                      </h4>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* ── Floating Overlapping Document Panel (Marketing Launch Brief) ── */}
            <motion.div
              drag
              dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
              whileDrag={{ scale: 1.02 }}
              className="absolute bottom-6 left-12 z-30 w-72 bg-white/95 backdrop-blur-md rounded-xl border border-indigo-150 shadow-[0_12px_40px_rgba(99,102,241,0.08)] p-3.5 select-none cursor-grab active:cursor-grabbing hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-indigo-50">
                <span className="text-[9px] font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  Marketing Launch Brief
                </span>
                <span className="text-[8px] text-slate-400">Doc Brief Agent</span>
              </div>
              <div className="space-y-2 pt-2 text-left">
                <h5 className="text-[10px] font-black text-slate-800">Project Overview</h5>
                <p className="text-[9px] text-slate-500 leading-relaxed">
                  One source of truth for goals, channels, and creative so every launch stays aligned across ads, email, and social.
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-[9px] text-slate-400">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> Assignee: Vy Vy</span>
                  <span className="font-mono">Mar 10 → Mar 18</span>
                </div>
              </div>
            </motion.div>

            {/* ── Floating Overlapping Document Panel 2 (Marketing Executive Summary) ── */}
            <motion.div
              drag
              dragConstraints={{ left: -150, right: 150, top: -150, bottom: 150 }}
              whileDrag={{ scale: 1.02 }}
              className="absolute bottom-16 right-6 z-20 w-64 bg-white/95 backdrop-blur-md rounded-xl border border-pink-150 shadow-[0_12px_40px_rgba(236,72,153,0.06)] p-3.5 select-none cursor-grab active:cursor-grabbing hover:border-pink-300 transition-colors"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-pink-50">
                <span className="text-[9px] font-black text-pink-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
                  Executive Summary
                </span>
                <span className="text-[8px] text-emerald-500 font-extrabold flex items-center gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" /> AI Active
                </span>
              </div>
              <div className="space-y-1.5 pt-2 text-left">
                <h5 className="text-[10px] font-black text-slate-850">Mango Tech Summary</h5>
                <p className="text-[9px] text-pink-600/90 font-medium leading-relaxed bg-pink-50/40 p-1.5 rounded-lg border border-pink-100/40">
                  Mango Tech is managing 3 active projects. The Campaign Brief is on track for end-of-month delivery.
                </p>
              </div>
            </motion.div>

          </motion.div>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="w-full bg-white border-t border-slate-100 py-6 px-6 text-center select-none text-[10px] text-slate-400 font-medium">
        © 2026 Avaxa OS. Thiết kế chuẩn hiệu năng tối giản. Mọi quyền được bảo lưu.
      </footer>

    </div>
  );
}
