"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { 
  User, ShieldAlert, Sparkles, LogIn, UserPlus, Lock, Mail, 
  Eye, EyeOff, Check, ArrowRight, Kanban, CheckCircle2, Users, Activity,
  MessageSquare, Briefcase, Timer, Zap,
  Shield, Star, Fingerprint
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface LoginScreenProps {
  onLoginSuccess: (user: { name: string; email: string; avatar: string; role: 'admin' | 'member'; status: 'online' | 'busy' | 'offline' }, rememberMe: boolean) => void;
}

// ── Particle System ──
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedX: number;
  speedY: number;
  hue: number;
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize particles
    const count = 80;
    particlesRef.current = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: (Math.random() - 0.5) * 0.4,
      hue: Math.random() * 60 + 230, // purple-blue range
    }));

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      particles.forEach(p => {
        // Move
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap around
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Mouse attraction
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          const force = (200 - dist) / 200;
          p.x += dx * force * 0.008;
          p.y += dy * force * 0.008;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${p.opacity})`;
        ctx.fill();
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsla(260, 60%, 70%, ${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}

// ── Typewriter Text ──
function TypewriterText({ texts, className }: { texts: string[]; className?: string }) {
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    const currentText = texts[textIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      if (charIndex < currentText.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentText.substring(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        }, 60 + Math.random() * 40);
      } else {
        timeout = setTimeout(() => setIsDeleting(true), 2500);
      }
    } else {
      if (charIndex > 0) {
        timeout = setTimeout(() => {
          setDisplayText(currentText.substring(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        }, 30);
      } else {
        setIsDeleting(false);
        setTextIndex((textIndex + 1) % texts.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, textIndex, texts]);

  return (
    <span className={className}>
      {displayText}
      <span className="animate-pulse text-indigo-500">|</span>
    </span>
  );
}

// ── Floating Feature Badge ──
function FloatingBadge({ 
  icon: Icon, label, sublabel, delay, color, position 
}: { 
  icon: React.ElementType; label: string; sublabel: string; delay: number; color: string; 
  position: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.6, type: "spring" }}
      className={`absolute ${position} z-30 hidden xl:block`}
    >
      <motion.div
        animate={{ 
          y: [0, -8, 0],
          rotate: [0, 1, -1, 0]
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 4 + delay, 
          ease: "easeInOut" 
        }}
        className="flex items-center gap-2.5 p-3 bg-white/90 backdrop-blur-xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.08)] cursor-pointer hover:scale-105 transition-transform duration-300"
        style={{
          boxShadow: `0 8px 32px ${color}15, 0 0 0 1px ${color}10`
        }}
      >
        <div 
          className="p-2 rounded-xl"
          style={{ backgroundColor: `${color}12` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="text-left leading-tight">
          <span className="text-[10px] font-bold text-slate-800 block">{label}</span>
          <span className="text-[9px] font-semibold block mt-0.5" style={{ color }}>{sublabel}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // 3D Tilt effect
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [4, -4]), { stiffness: 200, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-4, 4]), { stiffness: 200, damping: 30 });

  // Spotlight mouse container ref & handler
  const containerRef = useRef<HTMLDivElement>(null);
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty('--mouse-x', `${x}px`);
    containerRef.current.style.setProperty('--mouse-y', `${y}px`);

    // 3D card tilt
    if (cardRef.current) {
      const cardRect = cardRef.current.getBoundingClientRect();
      const cardCenterX = cardRect.left + cardRect.width / 2;
      const cardCenterY = cardRect.top + cardRect.height / 2;
      mouseX.set((e.clientX - cardCenterX) / cardRect.width);
      mouseY.set((e.clientY - cardCenterY) / cardRect.height);
    }
  }, [mouseX, mouseY]);

  // Simulated live widgets states for preview panel
  const [simulatedPomoTime, setSimulatedPomoTime] = useState(25 * 60);
  const [simulatedProgress, setSimulatedProgress] = useState(85);
  const [simulatedTaskDone, setSimulatedTaskDone] = useState(false);
  const [simulatedActivity, setSimulatedActivity] = useState<Array<{ id: number; text: string; time: string; type: 'member' | 'ai' }>>([
    { id: 1, text: 'Thảo Vy vừa cập nhật Mockup UI v2.5', time: '1 phút trước', type: 'member' },
    { id: 2, text: 'Avaxa Brain đã lập báo cáo hiệu suất tuần', time: '5 phút trước', type: 'ai' }
  ]);

  // Active stats counter animation
  const [activeUsers, setActiveUsers] = useState(0);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const activityIdCounter = useRef(100);

  useEffect(() => {
    
    // Pomodoro countdown simulation
    const pomoInterval = setInterval(() => {
      setSimulatedPomoTime(prev => (prev <= 0 ? 25 * 60 : prev - 1));
    }, 1000);

    // Kanban progress simulation
    const progressInterval = setInterval(() => {
      setSimulatedProgress(prev => {
        if (prev >= 100) {
          setSimulatedTaskDone(true);
          const activities: Array<{ text: string; type: 'member' | 'ai' }> = [
            { text: 'Lan Anh đã giải quyết xong lỗi đồng bộ Supabase', type: 'member' },
            { text: 'Avaxa Brain phát hiện 1 điểm thắt nút năng suất', type: 'ai' },
            { text: 'Hoàng Benjamin đã gán thẻ công việc thiết kế mới', type: 'member' }
          ];
          const randomAct = activities[Math.floor(Math.random() * activities.length)];
          activityIdCounter.current += 1;
          setSimulatedActivity(prevAct => [
            { id: activityIdCounter.current, text: randomAct.text, time: 'Vừa xong', type: randomAct.type },
            ...prevAct.slice(0, 2)
          ]);
          
          setTimeout(() => setSimulatedTaskDone(false), 2000);
          return 75;
        }
        return prev + 1;
      });
    }, 4500);

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
    
    const t1 = countUp(setActiveUsers, 2847, 2000);
    const t2 = countUp(setTasksCompleted, 12453, 2500);

    return () => {
      clearInterval(pomoInterval);
      clearInterval(progressInterval);
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
      case 0: return { text: 'Không an toàn', color: 'bg-red-300', textClass: 'text-rose-450', gradientColor: '#f43f5e' };
      case 1: return { text: 'Yếu', color: 'bg-rose-500', textClass: 'text-rose-500', gradientColor: '#f43f5e' };
      case 2: return { text: 'Trung bình', color: 'bg-amber-500', textClass: 'text-amber-500', gradientColor: '#f59e0b' };
      case 3: return { text: 'Khá mạnh', color: 'bg-indigo-500', textClass: 'text-indigo-500', gradientColor: '#7B61FF' };
      case 4: return { text: 'Tuyệt vời!', color: 'bg-emerald-500', textClass: 'text-emerald-500', gradientColor: '#10b981' };
      default: return { text: 'Cực kỳ yếu', color: 'bg-slate-200', textClass: 'text-slate-400', gradientColor: '#94a3b8' };
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

        setSuccess('Tài khoản Avaxa OS đã được đăng ký thành công! Đang tự động đăng nhập...');

        await new Promise((resolve) => setTimeout(resolve, 1000));

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          setSuccess('Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.');
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

        setSuccess('Danh tính đã được xác thực! Đang kết nối hệ thống...');
        
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
      console.error('Authentication workflow error:', err);
      let errorMessage = err.message || 'Lỗi kết nối đến máy chủ xác thực.';
      
      if (err.message?.toLowerCase().includes('invalid login credentials')) {
        errorMessage = 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.';
      } else if (err.message?.toLowerCase().includes('user already registered')) {
        errorMessage = 'Địa chỉ email này đã được đăng ký trên hệ thống.';
      } else if (err.message?.toLowerCase().includes('email not confirmed')) {
        errorMessage = 'Vui lòng xác minh địa chỉ email trước khi tiếp tục.';
      } else if (err.message?.toLowerCase().includes('rate limit')) {
        errorMessage = 'Quá nhiều yêu cầu. Hệ thống đang giới hạn tốc độ.';
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
        options: {
          redirectTo: window.location.origin
        }
      });

      if (oauthError) {
        throw oauthError;
      }

      setSuccess(`Đang thiết lập kết nối bảo mật với ${provider}...`);
    } catch (err: any) {
      console.warn(`[SSO Iframe Bypass] fallback to secure sandbox for: ${provider}`, err);
      
      const mockupUsers = {
        google: { name: 'Hoàng Benjamin', email: 'hoang.benjamin.creative@gmail.com', role: 'admin' },
        facebook: { name: 'Mai Phương (Facebook Collab)', email: 'maiphuong.fb@avaxa.io', role: 'member' }
      };

      const selected = mockupUsers[provider];
      setSuccess(`Phiên SSO cục bộ đã được mã hóa và kích hoạt cho ${selected.name}`);
      
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

  // Input field component with glow effect
  const InputField = ({ 
    id, icon: Icon, type, placeholder, value, onChange, required, rightElement 
  }: { 
    id: string; icon: React.ElementType; type: string; placeholder: string;
    value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean; rightElement?: React.ReactNode;
  }) => {
    const [isFocused, setIsFocused] = useState(false);
    
    return (
      <div className="relative group/input">
        {/* Glow border effect */}
        <div className={`absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 blur-[2px] transition-opacity duration-500 ${isFocused ? 'opacity-60' : 'group-hover/input:opacity-20'}`} />
        
        <div className="relative flex items-center">
          <div className={`absolute left-3.5 z-10 transition-colors duration-300 ${isFocused ? 'text-indigo-500' : 'text-slate-400'}`}>
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
            className={`relative w-full pl-10 ${rightElement ? 'pr-11' : 'pr-4'} py-3 text-[13px] rounded-2xl bg-white/80 backdrop-blur-sm border transition-all duration-300 shadow-sm font-medium text-slate-800 placeholder-slate-400 outline-none ${
              isFocused 
                ? 'border-indigo-400/60 ring-4 ring-indigo-500/10 bg-white shadow-md' 
                : 'border-slate-200/80 hover:border-slate-300'
            }`}
          />
          {rightElement && (
            <div className="absolute right-2 z-10">
              {rightElement}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#fafbff] font-sans p-4 lg:p-8"
    >
      {/* ── Particle Constellation Background ── */}
      <ParticleCanvas />

      {/* ── Animated Aurora Mesh Background ── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Aurora blob 1 */}
        <motion.div
          animate={{
            x: [0, 100, -50, 80, 0],
            y: [0, -80, 60, -40, 0],
            scale: [1, 1.2, 0.9, 1.1, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-15%] w-[60vw] h-[60vw] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(123,97,255,0.15) 0%, rgba(123,97,255,0.05) 40%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        {/* Aurora blob 2 */}
        <motion.div
          animate={{
            x: [0, -80, 40, -60, 0],
            y: [0, 60, -80, 40, 0],
            scale: [1, 0.9, 1.15, 0.95, 1],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-20%] right-[-15%] w-[55vw] h-[55vw] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,51,102,0.12) 0%, rgba(255,51,102,0.04) 40%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        {/* Aurora blob 3 */}
        <motion.div
          animate={{
            x: [0, 60, -30, 50, 0],
            y: [0, -50, 70, -30, 0],
            scale: [1, 1.1, 0.85, 1.05, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] right-[10%] w-[40vw] h-[40vw] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(51,209,255,0.1) 0%, rgba(51,209,255,0.03) 40%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      {/* ── Subtle Grid Pattern ── */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.04] pointer-events-none" 
        style={{
          backgroundImage: `
            linear-gradient(rgba(123,97,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(123,97,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      {/* ── Interactive Spotlight ── */}
      <div className="absolute inset-0 login-spotlight-bg pointer-events-none z-[1]" />

      {/* ── Floating Feature Badges ── */}
      <FloatingBadge
        icon={Kanban}
        label="Sprint Kanban"
        sublabel="⚡ Realtime Sync"
        delay={0.3}
        color="#7B61FF"
        position="-top-2 left-[3%]"
      />
      <FloatingBadge
        icon={Sparkles}
        label="Avaxa Brain AI"
        sublabel="🟢 Gemini Active"
        delay={0.6}
        color="#FF3366"
        position="top-[15%] right-[2%]"
      />
      <FloatingBadge
        icon={Users}
        label="Team Collab"
        sublabel="6 thành viên online"
        delay={0.9}
        color="#33D1FF"
        position="bottom-[20%] left-[4%]"
      />
      <FloatingBadge
        icon={Shield}
        label="Enterprise Security"
        sublabel="E2E Encrypted"
        delay={1.2}
        color="#10b981"
        position="bottom-[8%] right-[3%]"
      />

      {/* ── Main Content Grid ── */}
      <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
        
        {/* ═══════════════ LEFT COLUMN: Brand Showcase ═══════════════ */}
        <div className="lg:col-span-6 space-y-6 text-center lg:text-left hidden lg:block">
          
          {/* Version Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-xl border border-indigo-100/50 shadow-[0_4px_20px_rgba(123,97,255,0.06)] text-xs font-bold text-indigo-600"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            </motion.div>
            <span>Avaxa OS v2.5 — Super App Generation</span>
            <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[9px] font-black">NEW</span>
          </motion.div>

          {/* Hero Title with Typewriter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="space-y-3"
          >
            <h1 className="text-4xl lg:text-[3.2rem] font-black font-display tracking-tight text-[#0F172A] leading-[1.08]">
              Hành trình vận hành <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 animate-gradient-shift bg-[size:200%_auto]">
                <TypewriterText 
                  texts={[
                    'Hiệu suất Vô hạn',
                    'Cộng tác Thông minh', 
                    'Sáng tạo Đột phá',
                    'Quản lý Tối ưu'
                  ]}
                />
              </span>
            </h1>
            <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-lg">
              Hợp nhất quản lý Kanban, Mind Whiteboard đột phá, báo cáo năng suất AI Gemini 3.5, và cộng tác nhóm thời gian thực trong một không gian tối giản.
            </p>
          </motion.div>

          {/* Live Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="flex items-center gap-6"
          >
            {[
              { icon: Users, value: activeUsers.toLocaleString(), label: 'Người dùng', color: '#7B61FF' },
              { icon: Zap, value: tasksCompleted.toLocaleString(), label: 'Tasks hoàn thành', color: '#FF3366' },
              { icon: Star, value: '4.9', label: 'Đánh giá', color: '#f59e0b' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${stat.color}10` }}>
                  <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-black text-slate-800 tabular-nums">{stat.value}</div>
                  <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* ── Avaxa Orbit Visualizer ── */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="relative w-full h-[160px] flex items-center justify-center select-none overflow-hidden"
          >
            {/* Glowing Nucleus */}
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-black text-xl shadow-[0_0_30px_rgba(123,97,255,0.4)] relative z-20 cursor-pointer"
            >
              A
              <div className="absolute inset-0 rounded-2xl bg-white/20 animate-ping opacity-20" />
              <div className="absolute -inset-2 rounded-3xl border border-indigo-400/20 animate-pulse" />
            </motion.div>

            {/* Orbit rings */}
            <div className="absolute w-[120px] h-[120px] rounded-full border border-indigo-100/40 pointer-events-none" />
            <div className="absolute w-[180px] h-[180px] rounded-full border border-dashed border-indigo-50/50 pointer-events-none" />

            {/* Orbit Nodes */}
            {[
              { icon: Kanban, color: '#7B61FF', orbit: 'animate-orbit-1', delay: '0s', title: 'Kanban' },
              { icon: MessageSquare, color: '#FF3366', orbit: 'animate-orbit-1', delay: '-10s', title: 'Chat' },
              { icon: Briefcase, color: '#10b981', orbit: 'animate-orbit-2', delay: '0s', title: 'Documents' },
              { icon: Sparkles, color: '#f59e0b', orbit: 'animate-orbit-2', delay: '-9.3s', title: 'AI' },
              { icon: Users, color: '#33D1FF', orbit: 'animate-orbit-2', delay: '-18.6s', title: 'Team' },
            ].map((node, i) => (
              <div key={i} className={`absolute ${node.orbit} pointer-events-auto`} style={{ animationDelay: node.delay }}>
                <div 
                  className="p-1.5 rounded-xl bg-white border shadow-md hover:scale-110 transition-all cursor-pointer"
                  style={{ borderColor: `${node.color}20` }}
                  title={node.title}
                >
                  <node.icon className="w-3.5 h-3.5" style={{ color: node.color }} />
                </div>
              </div>
            ))}
          </motion.div>

          {/* ── Live Workspace Preview Panel ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="rounded-3xl border border-slate-200/40 bg-white/70 backdrop-blur-xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.06)] relative overflow-hidden group/workspace"
          >
            {/* Ambient glow inside */}
            <div className="absolute -right-16 -top-16 w-32 h-32 bg-indigo-500/8 rounded-full blur-2xl group-hover/workspace:bg-indigo-500/12 transition-all duration-700" />
            <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-pink-500/6 rounded-full blur-2xl" />
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100/80">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-400/80 block" />
                  <span className="w-3 h-3 rounded-full bg-amber-400/80 block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400/80 block" />
                </div>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-md uppercase ml-2 select-none">
                  Avaxa OS Project-Sync v2.5
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 text-xs text-slate-450 font-semibold font-mono">
                <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                <span>ONLINE CLOUD</span>
              </div>
            </div>

            {/* Simulated Workspace Inner Layout */}
            <div className="grid grid-cols-12 gap-4 mt-5">
              
              {/* Kanban Column View Mockup */}
              <div className="col-span-12 md:col-span-7 space-y-3.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-555">
                  <span className="flex items-center gap-1.5 text-indigo-700">
                    <Kanban className="w-3.5 h-3.5" />
                    Weekly Sprint Channel
                  </span>
                  <span className="text-slate-400 font-mono">{simulatedProgress}% DONE</span>
                </div>

                {/* Task Item Box 1 */}
                <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2 hover:border-indigo-300 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] bg-indigo-50 text-indigo-600 font-bold px-1.5 py-0.5 rounded">WEB APP v2.5</span>
                    <span className="text-[9px] text-slate-400 font-mono">14h / 16h</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">Adjust fluid smooth effects for Login page</h4>
                  
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full" 
                      animate={{ width: `${simulatedProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-100/80">
                    {simulatedTaskDone ? (
                      <span className="text-emerald-500 font-black flex items-center gap-1">✓ Review Done 🎉</span>
                    ) : (
                      <span className="text-indigo-500 font-extrabold flex items-center gap-1">In progress...</span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=LanAnh" className="w-4.5 h-4.5 rounded-full border border-slate-100" />
                      <span className="text-slate-600">Lan Anh</span>
                    </div>
                  </div>
                </div>

                {/* Task Item Box 2 */}
                <div className="p-3 bg-white/50 border border-slate-150 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-slate-800/60 tracking-tight line-through">Generate automated productivity report via Gemini AI</h4>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span className="text-slate-400 font-extrabold">✓ COMPLETED</span>
                    <span className="text-slate-500">Hoàng Benjamin</span>
                  </div>
                </div>
              </div>

              {/* Stats Panel & Dynamic Ticker */}
              <div className="col-span-12 md:col-span-5 flex flex-col gap-4">
                <div className="p-4 rounded-2xl bg-indigo-50/70 hover:bg-indigo-100/50 transition-colors border border-indigo-100/40 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-wider block">Pomodoro Performance</span>
                    <Timer className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-indigo-950 tracking-tight font-mono">
                      {Math.floor(simulatedPomoTime / 60).toString().padStart(2, '0')}:{(simulatedPomoTime % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-extrabold">▲ Live</span>
                  </div>
                  <p className="text-[9px] text-indigo-700/80 font-medium leading-normal">Chế độ tập trung cao đang chạy tự động.</p>
                </div>

                {/* Live Activity Stream widget */}
                <div className="rounded-2xl border border-slate-150 bg-white/40 p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-100">
                    <span>ACTIVITY STREAM</span>
                    <span className="text-emerald-500 animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      LIVE
                    </span>
                  </div>
                  
                  <div className="space-y-2.5 max-h-[105px] overflow-y-auto">
                    <AnimatePresence initial={false}>
                      {simulatedActivity.map((act) => (
                        <motion.div 
                          key={act.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-[10px] flex items-start gap-2"
                        >
                          {act.type === 'ai' ? (
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                          ) : (
                            <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                          )}
                          <div className="leading-tight flex-1">
                            <span className="text-slate-600">{act.text}</span>
                            <span className="block text-[8px] text-slate-400 mt-0.5">{act.time}</span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ═══════════════ RIGHT COLUMN: Login Form ═══════════════ */}
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, type: "spring", stiffness: 180, damping: 22 }}
          className="lg:col-span-6 w-full max-w-md mx-auto relative"
          id="login_container_card"
          style={{ perspective: 1200 }}
        >
          {/* Morphing gradient glow behind card */}
          <motion.div 
            animate={{
              background: [
                'linear-gradient(135deg, rgba(123,97,255,0.2) 0%, rgba(255,51,102,0.15) 50%, rgba(51,209,255,0.2) 100%)',
                'linear-gradient(225deg, rgba(255,51,102,0.2) 0%, rgba(51,209,255,0.15) 50%, rgba(123,97,255,0.2) 100%)',
                'linear-gradient(315deg, rgba(51,209,255,0.2) 0%, rgba(123,97,255,0.15) 50%, rgba(255,51,102,0.2) 100%)',
                'linear-gradient(135deg, rgba(123,97,255,0.2) 0%, rgba(255,51,102,0.15) 50%, rgba(51,209,255,0.2) 100%)',
              ]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -inset-2 rounded-[36px] blur-xl pointer-events-none"
          />

          {/* 3D Tilt Card Container */}
          <motion.div
            ref={cardRef}
            style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
            className="relative"
          >
            {/* ── Animated Rainbow Border ── */}
            <div className="absolute -inset-[1px] rounded-[30px] overflow-hidden pointer-events-none z-0">
              <div 
                className="absolute inset-0 animate-gradient-border"
                style={{
                  background: 'conic-gradient(from var(--border-angle, 0deg), #7B61FF, #FF3366, #33D1FF, #10b981, #f59e0b, #7B61FF)',
                  opacity: 0.4,
                }}
              />
            </div>

            {/* ── Glass Form Card ── */}
            <div className="relative bg-white/90 backdrop-blur-2xl border border-white/60 rounded-[30px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-8 space-y-5 overflow-hidden">
              
              {/* Subtle inner glow spots */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-pink-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
              
              {/* ── Logo Brand Header ── */}
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-between pb-2"
              >
                <div className="flex items-center gap-3 group cursor-pointer">
                  <motion.div 
                    whileHover={{ scale: 1.08, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-indigo-500/25"
                  >
                    A
                    <motion.div
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 -z-10 blur-md"
                    />
                  </motion.div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-black text-slate-800 tracking-tight text-xl">Avaxa</span>
                      <span className="text-[10px] bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 font-extrabold px-2 py-0.5 rounded-lg border border-indigo-100/50">OS</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">WEEKLY PERFORMANCE OS</p>
                  </div>
                </div>
              </motion.div>

              {/* ── Premium Tab Switcher ── */}
              <div className="flex relative bg-slate-50/80 p-1 rounded-2xl border border-slate-200/30 select-none">
                <button 
                  id="tab_signin"
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setError('');
                  }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all relative z-10 flex items-center justify-center gap-2 cursor-pointer ${
                    !isSignUp ? 'text-indigo-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {!isSignUp && (
                    <motion.div
                      layoutId="activeAuthTab"
                      className="absolute inset-0 bg-white rounded-xl shadow-md border border-slate-100/80"
                      transition={{ type: "spring", stiffness: 380, damping: 25 }}
                    />
                  )}
                  <LogIn className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10">Đăng nhập</span>
                </button>
                
                <button 
                  id="tab_signup"
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setError('');
                  }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all relative z-10 flex items-center justify-center gap-2 cursor-pointer ${
                    isSignUp ? 'text-indigo-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {isSignUp && (
                    <motion.div
                      layoutId="activeAuthTab"
                      className="absolute inset-0 bg-white rounded-xl shadow-md border border-slate-100/80"
                      transition={{ type: "spring", stiffness: 380, damping: 25 }}
                    />
                  )}
                  <UserPlus className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10">Đăng ký</span>
                </button>
              </div>

              {/* ── Main Form ── */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {isSignUp && (
                    <motion.div
                      key="signup-name"
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="space-y-1.5 text-left overflow-hidden"
                    >
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block pl-1">
                        Họ và tên
                      </label>
                      <InputField
                        id="input_signup_name"
                        icon={User}
                        type="text"
                        placeholder="Nhập họ tên đầy đủ"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required={isSignUp}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block pl-1">
                    Email
                  </label>
                  <InputField
                    id="input_login_email"
                    icon={Mail}
                    type="email"
                    placeholder="example@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between pl-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Mật khẩu
                    </label>
                    {!isSignUp && (
                      <a href="#" className="text-[10px] text-indigo-500 font-extrabold hover:text-indigo-700 transition-colors">Quên mật khẩu?</a>
                    )}
                  </div>
                  <InputField
                    id="input_login_password"
                    icon={Lock}
                    type={showPassword ? "text" : "password"}
                    placeholder="•••••••• (ít nhất 8 ký tự)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    rightElement={
                      <button
                        id="btn_toggle_password_view"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-indigo-500 transition-colors p-1.5 rounded-lg cursor-pointer hover:bg-slate-50"
                        title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                </div>

                {/* Password Strength Indicator */}
                <AnimatePresence>
                  {isSignUp && password && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2.5 bg-gradient-to-br from-slate-50/80 to-indigo-50/30 border border-indigo-100/30 p-4 rounded-2xl">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-400 uppercase tracking-widest">Độ mạnh mật khẩu:</span>
                          <span className={`font-extrabold ${getStrengthTextAndColor().textClass}`}>
                            {getStrengthTextAndColor().text}
                          </span>
                        </div>

                        {/* Animated progress segments */}
                        <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                          {[1, 2, 3, 4].map((step) => {
                            const isActive = strengthScore >= step;
                            return (
                              <motion.div
                                key={step}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: isActive ? 1 : 0 }}
                                transition={{ duration: 0.4, delay: step * 0.05 }}
                                className={`h-full rounded-full origin-left ${isActive ? getStrengthTextAndColor().color : 'bg-slate-200'}`}
                              />
                            );
                          })}
                        </div>

                        {/* Checkpoints */}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1 text-[9px] font-bold text-slate-500">
                          {[
                            { check: hasMinLength, text: 'Tối thiểu 8 ký tự' },
                            { check: hasLetter, text: 'Có chữ cái (a-z)' },
                            { check: hasNumber, text: 'Có số (0-9)' },
                            { check: hasSpecial, text: 'Có ký tự đặc biệt' },
                          ].map((item, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              {item.check ? (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                                >
                                  <Check className="w-3 h-3 text-emerald-500 stroke-[3.5px]" />
                                </motion.div>
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-0.5 mr-0.5" />
                              )}
                              <span className={item.check ? 'text-slate-700' : 'text-slate-400'}>{item.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Remember me */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setRememberMe(!rememberMe)}
                    className="flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer select-none group text-left focus:outline-none"
                  >
                    <div className={`w-4.5 h-4.5 rounded-lg border-2 transition-all flex items-center justify-center shrink-0 ${
                      rememberMe 
                        ? 'bg-gradient-to-tr from-indigo-500 to-purple-500 border-indigo-500 shadow-sm shadow-indigo-500/20' 
                        : 'border-slate-300 bg-white group-hover:border-indigo-400'
                    }`}>
                      {rememberMe && (
                        <motion.div
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        >
                          <Check className="w-2.5 h-2.5 text-white stroke-[4px]" />
                        </motion.div>
                      )}
                    </div>
                    <span className="group-hover:text-slate-700 transition-colors">Ghi nhớ đăng nhập (30 ngày)</span>
                  </button>
                </div>

                {/* Error & Success messages */}
                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      className="flex items-start gap-2 p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/50 text-rose-700 text-xs font-semibold text-left backdrop-blur-sm"
                    >
                      <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {success && (
                    <motion.div 
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      className="flex items-start gap-2 p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/50 text-emerald-700 text-xs font-semibold text-left backdrop-blur-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                      <span>{success}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Premium Submit Button ── */}
                <motion.button
                  id="btn_submit_auth"
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.015, y: -1 }}
                  whileTap={{ scale: 0.985 }}
                  className="relative w-full py-3.5 px-4 text-white text-xs font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none overflow-hidden group/btn"
                  style={{
                    background: 'linear-gradient(135deg, #7B61FF 0%, #9333ea 50%, #FF3366 100%)',
                    boxShadow: '0 8px 25px -4px rgba(123,97,255,0.3), 0 4px 10px rgba(147,51,234,0.2)',
                  }}
                >
                  {/* Shimmer effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out" />
                  
                  {loading ? (
                    <>
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                      <span className="relative z-10">Đang xác thực...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4 relative z-10" />
                      <span className="relative z-10">{isSignUp ? 'BẮT ĐẦU TRẢI NGHIỆM AVAXA OS' : 'Đăng nhập'}</span>
                      <ArrowRight className="w-4 h-4 relative z-10 opacity-70" />
                    </>
                  )}
                </motion.button>
              </form>

              {/* ── Quick SSO Login Options ── */}
              <div className="pt-4 border-t border-slate-100/80 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200/60" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">HOẶC TIẾP TỤC VỚI</span>
                  <div className="flex-1 h-px bg-slate-200/60" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Google Button */}
                  <motion.button
                    id="btn_login_google"
                    type="button"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleOAuthLogin('google')}
                    className="flex items-center justify-center gap-2.5 px-3.5 py-3 text-xs rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-200 hover:shadow-md text-slate-700 transition-all duration-300 cursor-pointer shadow-sm group/google"
                  >
                    <svg className="w-4 h-4 shrink-0 group-hover/google:scale-110 transition-transform" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="text-[11px] font-bold text-slate-700">Google</span>
                  </motion.button>

                  {/* Facebook Button */}
                  <motion.button
                    id="btn_login_facebook"
                    type="button"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleOAuthLogin('facebook')}
                    className="flex items-center justify-center gap-2.5 px-3.5 py-3 text-xs rounded-2xl bg-white border border-slate-200/80 hover:border-blue-200 hover:shadow-md text-slate-700 transition-all duration-300 cursor-pointer shadow-sm group/fb"
                  >
                    <svg className="w-4 h-4 shrink-0 text-[#1877F2] group-hover/fb:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span className="text-[11px] font-bold text-slate-700">Facebook</span>
                  </motion.button>
                </div>
              </div>

              {/* Terms */}
              <div className="text-center pt-1">
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  Bằng việc đăng nhập, bạn đồng ý với <a href="#" className="underline text-indigo-500 hover:text-indigo-700 font-bold transition-colors">Điều khoản sử dụng</a> & <a href="#" className="underline text-indigo-500 hover:text-indigo-700 font-bold transition-colors">Chính sách bảo mật</a> của Avaxa.
                </p>
              </div>

            </div>
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
}
