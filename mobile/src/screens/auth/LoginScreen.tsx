import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  UIManager,
  TouchableWithoutFeedback,
  Keyboard,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Zap,
  ShieldCheck,
  Check,
  CheckCircle2,
  KeyRound,
  Globe,
  Users,
  FolderKanban,
  Sun,
  Moon,
  AlertCircle,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { supabase } from '../../api/supabase';
import { Input } from '../../components/common/Input';
import { PressableScale } from '../../components/common/PressableScale';
import { AuthErrorAlert } from '../../components/auth/AuthErrorAlert';
import { formatAuthError } from '../../utils/authError';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type AuthMode = 'signin' | 'signup' | 'forgot';

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const colors = useUiStore((s) => s.getColors());
  const isDarkMode = useUiStore((s) => s.isDarkMode);
  const toggleDarkMode = useUiStore((s) => s.toggleDarkMode);
  const language = useUiStore((s) => s.language);
  const setLanguage = useUiStore((s) => s.setLanguage);
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);

  const isVietnamese = language === 'vi';

  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [oAuthLoading, setOAuthLoading] = useState<'google' | 'facebook' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isSignUp = authMode === 'signup';
  const isForgot = authMode === 'forgot';

  // Animation values
  const [tabBarWidth, setTabBarWidth] = useState(0);
  const [tabIndicatorAnim] = useState(() => new Animated.Value(0));
  const [strengthAnim] = useState(() => new Animated.Value(0));
  const [rememberAnim] = useState(() => new Animated.Value(1));
  const [logoScaleAnim] = useState(() => new Animated.Value(1));
  const [shakeAnim] = useState(() => new Animated.Value(0));

  // Gentle breathing effect on logo
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(logoScaleAnim, {
          toValue: 1.06,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(logoScaleAnim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const triggerShake = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 3, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const showValidationError = (msg: string) => {
    setError(msg);
    triggerShake();
  };

  const copy = isVietnamese
    ? {
        signinTab: 'Đăng nhập',
        signupTab: 'Đăng ký',
        freeBadge: 'Miễn phí',
        signinTitle: 'Chào mừng trở lại!',
        signinSubtitle: 'Đăng nhập để tiếp tục làm việc trong không gian của bạn.',
        signupTitle: 'Tạo tài khoản Upgen',
        signupSubtitle: 'Bắt đầu miễn phí để sắp xếp công việc và dự án hiệu quả.',
        forgotTitle: 'Khôi phục mật khẩu',
        forgotSubtitle: 'Nhập địa chỉ email đã đăng ký để nhận liên kết đặt lại mật khẩu.',
        fullName: 'Họ và tên',
        fullNamePlaceholder: 'Ví dụ: Nguyễn Minh Anh',
        email: 'Địa chỉ email',
        emailPlaceholder: 'name@company.com',
        password: 'Mật khẩu',
        passwordPlaceholder: 'Nhập mật khẩu',
        createPasswordPlaceholder: 'Tạo mật khẩu (tối thiểu 6 ký tự)',
        confirmPassword: 'Xác nhận mật khẩu',
        confirmPasswordPlaceholder: 'Nhập lại mật khẩu',
        passwordsMatch: 'Mật khẩu trùng khớp',
        passwordsMismatch: 'Mật khẩu chưa khớp',
        themeLight: 'Sáng',
        themeDark: 'Tối',
        forgotPassword: 'Quên mật khẩu?',
        rememberMe: 'Ghi nhớ đăng nhập trên thiết bị này',
        rememberMeSubtitle: 'Duy trì phiên làm việc an toàn trong 30 ngày',
        submitSignin: 'Đăng nhập ngay',
        submitSignup: 'Tạo tài khoản miễn phí',
        submitReset: 'Gửi liên kết đặt lại mật khẩu',
        backToSignin: 'Quay lại đăng nhập',
        termsAgreement:
          'Tôi đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư của Upgen.',
        signinWithGoogle: 'Tiếp tục với Google',
        signinWithFacebook: 'Tiếp tục với Facebook',
        signupWithGoogle: 'Đăng ký nhanh với Google',
        signupWithFacebook: 'Đăng ký nhanh với Facebook',
        orContinueWithEmail: 'hoặc tiếp tục với email',
        freePlanBadge: 'GÓI FREE TIÊU CHUẨN',
        freePlanMembers: '5 Thành viên',
        freePlanSpaces: '3 Không gian',
        freePlanLang: 'VI / EN',
        freePlanNoCard: 'Không cần thẻ thanh toán',
        processing: 'Đang xử lý…',
      }
    : {
        signinTab: 'Sign In',
        signupTab: 'Sign Up',
        freeBadge: 'Free',
        signinTitle: 'Welcome back!',
        signinSubtitle: 'Sign in to continue working in your workspace.',
        signupTitle: 'Create Upgen Account',
        signupSubtitle: 'Get started for free and organize your work & teams.',
        forgotTitle: 'Reset Password',
        forgotSubtitle: 'Enter your registered email address to receive a reset link.',
        fullName: 'Full Name',
        fullNamePlaceholder: 'e.g. Alex Johnson',
        email: 'Email address',
        emailPlaceholder: 'name@company.com',
        password: 'Password',
        passwordPlaceholder: 'Enter your password',
        createPasswordPlaceholder: 'Create a password (min 6 chars)',
        confirmPassword: 'Confirm Password',
        confirmPasswordPlaceholder: 'Re-enter your password',
        passwordsMatch: 'Passwords match',
        passwordsMismatch: 'Passwords do not match',
        themeLight: 'Light',
        themeDark: 'Dark',
        forgotPassword: 'Forgot password?',
        rememberMe: 'Stay signed in on this device',
        rememberMeSubtitle: 'Keep session securely active for 30 days',
        submitSignin: 'Sign In Now',
        submitSignup: 'Create Free Account',
        submitReset: 'Send Reset Link',
        backToSignin: 'Back to Sign In',
        termsAgreement: 'I agree to Upgen’s Terms of Use and Privacy Policy.',
        signinWithGoogle: 'Continue with Google',
        signinWithFacebook: 'Continue with Facebook',
        signupWithGoogle: 'Sign up with Google',
        signupWithFacebook: 'Sign up with Facebook',
        orContinueWithEmail: 'or continue with email',
        freePlanBadge: 'FREE TIER PERKS',
        freePlanMembers: '5 Members',
        freePlanSpaces: '3 Spaces',
        freePlanLang: 'VI / EN',
        freePlanNoCard: 'No credit card needed',
        processing: 'Processing…',
      };

  // Password strength calculation
  const hasMinLength = password.length >= 8;
  const hasNumber = /\p{N}/u.test(password);
  const hasSpecial = /[^\p{L}\p{N}\s]/u.test(password);
  const hasLetter = /\p{L}/u.test(password);
  const strengthScore = [hasMinLength, hasNumber, hasSpecial, hasLetter].filter(Boolean).length;

  useEffect(() => {
    Animated.spring(strengthAnim, {
      toValue: strengthScore,
      useNativeDriver: false,
      friction: 8,
      tension: 120,
    }).start();
  }, [strengthScore]);

  const strengthWidth = strengthAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: ['15%', '35%', '65%', '85%', '100%'],
  });

  const getStrengthMeta = () => {
    switch (strengthScore) {
      case 0:
        return { text: isVietnamese ? 'Rất yếu' : 'Very weak', color: '#f43f5e', percent: '20%' };
      case 1:
        return { text: isVietnamese ? 'Yếu' : 'Weak', color: '#fb7185', percent: '40%' };
      case 2:
        return { text: isVietnamese ? 'Trung bình' : 'Medium', color: '#f59e0b', percent: '65%' };
      case 3:
        return { text: isVietnamese ? 'Khá mạnh' : 'Strong', color: '#2563eb', percent: '85%' };
      case 4:
        return { text: isVietnamese ? 'Mạnh' : 'Very strong', color: '#10b981', percent: '100%' };
      default:
        return { text: isVietnamese ? 'Yếu' : 'Weak', color: '#64748b', percent: '15%' };
    }
  };

  const clearFeedback = () => {
    setError('');
    setSuccess('');
  };

  const switchAuthMode = (mode: AuthMode) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.spring(tabIndicatorAnim, {
      toValue: mode === 'signup' ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 120,
    }).start();
    setAuthMode(mode);
    clearFeedback();
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const toggleRememberMe = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const nextVal = !rememberMe;
    setRememberMe(nextVal);
    Animated.spring(rememberAnim, {
      toValue: nextVal ? 1 : 0,
      useNativeDriver: true,
      friction: 9,
      tension: 140,
    }).start();
  };

  const toggleLanguage = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setLanguage(isVietnamese ? 'en' : 'vi');
    clearFeedback();
  };

  const signInWithCredentials = async (loginEmail: string, loginPass: string) => {
    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim().toLowerCase(),
      password: loginPass.trim(),
    });

    if (signInErr) throw signInErr;

    if (data.user) {
      let memberProfile: any = null;
      try {
        const { data: mData } = await supabase
          .from('members')
          .select('*')
          .or(`user_id.eq.${data.user.id},id.eq.user-${data.user.id},email.eq.${data.user.email}`)
          .maybeSingle();
        memberProfile = mData;
      } catch {}

      setCurrentUser({
        id: data.user.id,
        name:
          memberProfile?.name ||
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          loginEmail.split('@')[0],
        email: data.user.email || loginEmail,
        avatar:
          memberProfile?.avatar ||
          data.user.user_metadata?.avatar_url ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        role: memberProfile?.role || 'admin',
        department: memberProfile?.department || '',
        phone: memberProfile?.phone || '',
        statusMessage: memberProfile?.status_message || '',
        status: 'online',
        isPremium: Boolean(memberProfile?.is_premium ?? true),
      });

      // Synchronize workspaces and spaces immediately from Supabase
      try {
        useWorkspaceStore.getState().fetchWorkspacesFromSupabase();
      } catch (wsErr) {
        console.warn('Failed to fetch workspaces after login:', wsErr);
      }

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
  };

  const handleAuth = async () => {
    clearFeedback();

    const normalizedEmail = email.trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (isForgot) {
      if (!normalizedEmail || !isValidEmail) {
        showValidationError(
          isVietnamese
            ? 'Vui lòng nhập địa chỉ email hợp lệ.'
            : 'Please enter a valid email address.'
        );
        return;
      }
      setLoading(true);
      try {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
        if (resetErr) throw resetErr;
        setSuccess(
          isVietnamese
            ? 'Nếu email đã được đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu. Vui lòng kiểm tra cả thư mục Spam.'
            : 'If the email exists, a password reset link has been sent. Please check your spam folder too.'
        );
      } catch (err: any) {
        showValidationError(formatAuthError(err, isVietnamese).description);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isSignUp) {
      if (name.trim().length < 2) {
        showValidationError(
          isVietnamese
            ? 'Vui lòng nhập họ và tên (ít nhất 2 ký tự).'
            : 'Please enter your full name (at least 2 characters).'
        );
        return;
      }
      if (!normalizedEmail || !isValidEmail) {
        showValidationError(
          isVietnamese
            ? 'Vui lòng nhập địa chỉ email hợp lệ.'
            : 'Please enter a valid email address.'
        );
        return;
      }
      if (password.length < 6) {
        showValidationError(
          isVietnamese
            ? 'Mật khẩu phải có ít nhất 6 ký tự.'
            : 'Password must be at least 6 characters.'
        );
        return;
      }
      if (password !== confirmPassword) {
        showValidationError(
          isVietnamese ? 'Mật khẩu xác nhận không khớp.' : 'Confirmation password does not match.'
        );
        return;
      }
      if (!acceptTerms) {
        showValidationError(
          isVietnamese
            ? 'Bạn cần đồng ý với Điều khoản sử dụng để tiếp tục.'
            : 'You must agree to the Terms of Use to create an account.'
        );
        return;
      }

      setLoading(true);
      try {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: password.trim(),
          options: {
            data: {
              name: name.trim(),
              full_name: name.trim(),
            },
          },
        });

        if (signUpErr) throw signUpErr;

        // If user already exists in Supabase, identities array is returned as empty
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          showValidationError(
            isVietnamese
              ? 'Địa chỉ email này đã được đăng ký. Vui lòng chuyển sang Đăng nhập hoặc khôi phục mật khẩu.'
              : 'This email is already registered. Please sign in or reset your password.'
          );
          setAuthMode('signin');
          return;
        }

        if (!data.session || !data.user) {
          setSuccess(
            isVietnamese
              ? 'Tài khoản đã được khởi tạo thành công! Vui lòng kiểm tra email để xác minh tài khoản trước khi đăng nhập.'
              : 'Account created! Please check your email to verify your account before signing in.'
          );
          setAuthMode('signin');
          setPassword('');
          setConfirmPassword('');
          return;
        }

        setCurrentUser({
          id: data.user.id,
          name: name.trim() || normalizedEmail.split('@')[0],
          email: data.user.email || normalizedEmail,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          role: 'admin',
          status: 'online',
          isPremium: true,
        });

        // Synchronize workspaces from Supabase
        try {
          useWorkspaceStore.getState().fetchWorkspacesFromSupabase();
        } catch (wsErr) {
          console.warn('Failed to fetch workspaces after signup:', wsErr);
        }

        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      } catch (err: any) {
        showValidationError(formatAuthError(err, isVietnamese).description);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Sign In Flow
    if (!normalizedEmail || !isValidEmail) {
      showValidationError(
        isVietnamese ? 'Vui lòng nhập địa chỉ email hợp lệ.' : 'Please enter a valid email address.'
      );
      return;
    }
    if (!password.trim()) {
      showValidationError(isVietnamese ? 'Vui lòng nhập mật khẩu.' : 'Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      await signInWithCredentials(normalizedEmail, password);
    } catch (err: any) {
      showValidationError(formatAuthError(err, isVietnamese).description);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    clearFeedback();
    setOAuthLoading(provider);

    try {
      const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'upgen://auth/callback',
          skipBrowserRedirect: false,
        },
      });

      if (oauthErr) throw oauthErr;

      if (data?.url) {
        await Linking.openURL(data.url);
      } else {
        throw new Error(
          isVietnamese
            ? 'Không nhận được liên kết xác thực từ dịch vụ.'
            : 'Failed to obtain authentication URL.'
        );
      }
    } catch (err: any) {
      showValidationError(formatAuthError(err, isVietnamese).description);
    } finally {
      setOAuthLoading(null);
    }
  };

  const tabWidth = tabBarWidth > 0 ? (tabBarWidth - 8) / 2 : 0;
  const tabTranslateX = tabIndicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tabWidth],
  });

  const switchThumbTranslateX = rememberAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16) + 8,
            paddingBottom: Math.max(insets.bottom, 16) + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Ambient Top Glow */}
        <LinearGradient
          colors={
            isDarkMode
              ? ['rgba(59, 130, 246, 0.22)', 'rgba(6, 182, 212, 0.07)', 'transparent']
              : ['rgba(59, 130, 246, 0.12)', 'rgba(6, 182, 212, 0.04)', 'transparent']
          }
          style={styles.ambientGlow}
          pointerEvents="none"
        />

        {/* Top Header: Theme Switcher & Language Switcher */}
        <View style={styles.topBar}>
          {/* Dark / Light Toggle */}
          <PressableScale
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              toggleDarkMode();
            }}
            activeScale={0.92}
            style={[
              styles.themeButton,
              {
                backgroundColor: colors.surfaceHover,
                borderColor: colors.border,
              },
            ]}
          >
            {isDarkMode ? (
              <Sun size={15} color="#f59e0b" />
            ) : (
              <Moon size={15} color={colors.primary} />
            )}
            <Text style={[styles.themeText, { color: colors.textPrimary }]}>
              {isDarkMode ? copy.themeDark : copy.themeLight}
            </Text>
          </PressableScale>

          {/* Language Switcher */}
          <PressableScale
            onPress={toggleLanguage}
            activeScale={0.94}
            hapticFeedback="light"
            style={[
              styles.langButton,
              {
                backgroundColor: colors.surfaceHover,
                borderColor: colors.border,
              },
            ]}
          >
            <Globe size={14} color={colors.primary} />
            <Text style={[styles.langText, { color: colors.textPrimary }]}>
              {isVietnamese ? 'Tiếng Việt' : 'English'}
            </Text>
            <View style={[styles.langBadge, { backgroundColor: colors.primarySubtle }]}>
              <Text style={[styles.langBadgeText, { color: colors.primary }]}>
                {isVietnamese ? 'VI' : 'EN'}
              </Text>
            </View>
          </PressableScale>
        </View>

        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <Animated.View style={{ transform: [{ scale: logoScaleAnim }] }}>
            <LinearGradient
              colors={['#2563eb', '#06b6d4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoWrap}
            >
              <Zap size={30} color="#ffffff" />
            </LinearGradient>
          </Animated.View>
          <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>Upgen.</Text>
          <Text style={[styles.brandSubtitle, { color: colors.primaryLight }]}>
            {isVietnamese ? 'Không gian cho công việc & Đội ngũ' : 'A space for work & Teams'}
          </Text>
          <Text style={[styles.brandTagline, { color: colors.textMuted }]}>
            {isVietnamese
              ? 'Bớt việc rời rạc. Thêm điều làm được.'
              : 'Less scattered work. More moving forward.'}
          </Text>
        </View>

        {/* High-Performance Segmented Tab Switcher (Sign In vs Sign Up) */}
        {!isForgot && (
          <View
            onLayout={(e) => setTabBarWidth(e.nativeEvent.layout.width)}
            style={[
              styles.tabContainer,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
              },
            ]}
          >
            {tabWidth > 0 && (
              <Animated.View
                style={[
                  styles.tabIndicator,
                  {
                    width: tabWidth,
                    transform: [{ translateX: tabTranslateX }],
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              />
            )}

            {/* Sign In Tab */}
            <PressableScale
              onPress={() => switchAuthMode('signin')}
              style={styles.tabButton}
              activeScale={0.97}
              hapticFeedback="selection"
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: !isSignUp ? colors.primary : colors.textMuted,
                    fontWeight: !isSignUp ? '800' : '600',
                  },
                ]}
              >
                {copy.signinTab}
              </Text>
            </PressableScale>

            {/* Sign Up Tab */}
            <PressableScale
              onPress={() => switchAuthMode('signup')}
              style={styles.tabButton}
              activeScale={0.97}
              hapticFeedback="selection"
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isSignUp ? colors.primary : colors.textMuted,
                    fontWeight: isSignUp ? '800' : '600',
                  },
                ]}
              >
                {copy.signupTab}
              </Text>
              <View style={[styles.freeBadge, { backgroundColor: colors.primarySubtle }]}>
                <Text style={[styles.freeBadgeText, { color: colors.primary }]}>
                  {copy.freeBadge}
                </Text>
              </View>
            </PressableScale>
          </View>
        )}

        {/* Main Auth Form Card with Shake Feedback */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              transform: [{ translateX: shakeAnim }],
            },
          ]}
        >
          {/* Card Title & Subtitle */}
          <View style={styles.formHeader}>
            {isForgot && (
              <View style={styles.forgotHeroBadge}>
                <LinearGradient
                  colors={['#2563eb', '#06b6d4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.forgotIconCircle}
                >
                  <KeyRound size={26} color="#ffffff" />
                </LinearGradient>
              </View>
            )}
            <Text style={[styles.formTitle, { color: colors.textPrimary }]}>
              {isForgot
                ? copy.forgotTitle
                : isSignUp
                ? copy.signupTitle
                : copy.signinTitle}
            </Text>
            <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
              {isForgot
                ? copy.forgotSubtitle
                : isSignUp
                ? copy.signupSubtitle
                : copy.signinSubtitle}
            </Text>
          </View>

          {/* Feedback: Error Alert */}
          {error ? (
            <AuthErrorAlert
              error={error}
              isVietnamese={isVietnamese}
              onClose={() => setError('')}
            />
          ) : null}

          {/* Feedback: Success Alert */}
          {success ? (
            <View style={styles.successBox}>
              <CheckCircle2 size={18} color="#10b981" style={{ marginTop: 2 }} />
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}

          {/* FORM: Forgot Password */}
          {isForgot ? (
            <View style={styles.formContent}>
              <Input
                label={copy.email}
                placeholder={copy.emailPlaceholder}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  clearFeedback();
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Mail size={16} color={colors.textMuted} />}
              />

              <PressableScale
                onPress={handleAuth}
                disabled={loading}
                activeScale={0.97}
                hapticFeedback="medium"
                style={styles.submitButtonWrap}
              >
                <LinearGradient
                  colors={['#2563eb', '#06b6d4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <KeyRound size={16} color="#ffffff" />
                      <Text style={styles.submitText}>{copy.submitReset}</Text>
                    </>
                  )}
                </LinearGradient>
              </PressableScale>

              <TouchableOpacity
                onPress={() => switchAuthMode('signin')}
                style={styles.backButtonRow}
              >
                <ArrowLeft size={16} color={colors.primary} />
                <Text style={[styles.backButtonText, { color: colors.primary }]}>
                  {copy.backToSignin}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* FORM: Sign In & Sign Up */
            <View style={styles.formContent}>
              {/* Social Login Section (Google & Facebook - Spacious & Full Width) */}
              <View style={styles.socialButtonsCol}>
                {/* Google Button */}
                <PressableScale
                  onPress={() => handleOAuthLogin('google')}
                  disabled={loading || oAuthLoading !== null}
                  activeScale={0.97}
                  style={[
                    styles.socialButtonFull,
                    {
                      backgroundColor: colors.surfaceHover,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Svg width={20} height={20} viewBox="0 0 24 24">
                    <Path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <Path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <Path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                    />
                    <Path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </Svg>
                  <Text style={[styles.socialButtonFullText, { color: colors.textPrimary }]}>
                    {isSignUp ? copy.signupWithGoogle : copy.signinWithGoogle}
                  </Text>
                  {oAuthLoading === 'google' && (
                    <ActivityIndicator size="small" color="#4285F4" style={styles.socialLoader} />
                  )}
                </PressableScale>

                {/* Facebook Button */}
                <PressableScale
                  onPress={() => handleOAuthLogin('facebook')}
                  disabled={loading || oAuthLoading !== null}
                  activeScale={0.97}
                  style={[
                    styles.socialButtonFull,
                    {
                      backgroundColor: colors.surfaceHover,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Svg width={20} height={20} viewBox="0 0 24 24">
                    <Path
                      fill="#1877F2"
                      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                    />
                  </Svg>
                  <Text style={[styles.socialButtonFullText, { color: colors.textPrimary }]}>
                    {isSignUp ? copy.signupWithFacebook : copy.signinWithFacebook}
                  </Text>
                  {oAuthLoading === 'facebook' && (
                    <ActivityIndicator size="small" color="#1877F2" style={styles.socialLoader} />
                  )}
                </PressableScale>
              </View>

              {/* Divider: or continue with email */}
              <View style={styles.socialDividerRow}>
                <View
                  style={[styles.socialDividerLine, { backgroundColor: colors.border }]}
                />
                <Text
                  style={[styles.socialDividerText, { color: colors.textMuted }]}
                >
                  {copy.orContinueWithEmail}
                </Text>
                <View
                  style={[styles.socialDividerLine, { backgroundColor: colors.border }]}
                />
              </View>

              {/* Full Name (Sign Up only) */}
              {isSignUp && (
                <Input
                  label={copy.fullName}
                  placeholder={copy.fullNamePlaceholder}
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    clearFeedback();
                  }}
                  autoCapitalize="words"
                  leftIcon={<UserIcon size={16} color={colors.textMuted} />}
                />
              )}

              {/* Email */}
              <Input
                label={copy.email}
                placeholder={copy.emailPlaceholder}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  clearFeedback();
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Mail size={16} color={colors.textMuted} />}
              />

              {/* Password */}
              <Input
                label={copy.password}
                placeholder={
                  isSignUp ? copy.createPasswordPlaceholder : copy.passwordPlaceholder
                }
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  clearFeedback();
                }}
                secureTextEntry={!showPassword}
                leftIcon={<Lock size={16} color={colors.textMuted} />}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={colors.textMuted} />
                    ) : (
                      <Eye size={18} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                }
              />

              {/* Forgot Password link for Sign In */}
              {!isSignUp && (
                <View style={styles.forgotPassRow}>
                  <TouchableOpacity
                    onPress={() => switchAuthMode('forgot')}
                    style={styles.forgotPassBtn}
                  >
                    <Text style={[styles.forgotPassText, { color: colors.primary }]}>
                      {copy.forgotPassword}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Sign Up: Realtime Password Strength Meter */}
              {isSignUp && password.length > 0 && (
                <View
                  style={[
                    styles.strengthBox,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.strengthHeader}>
                    <Text style={[styles.strengthLabel, { color: colors.textMuted }]}>
                      {isVietnamese ? 'Độ mạnh mật khẩu' : 'Password strength'}
                    </Text>
                    <Text
                      style={[
                        styles.strengthValue,
                        { color: getStrengthMeta().color },
                      ]}
                    >
                      {getStrengthMeta().text}
                    </Text>
                  </View>

                  {/* Progress bar */}
                  <View
                    style={[
                      styles.strengthBarTrack,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.strengthBarFill,
                        {
                          width: strengthWidth as any,
                          backgroundColor: getStrengthMeta().color,
                        },
                      ]}
                    />
                  </View>

                  {/* 4 Criteria Checkmarks */}
                  <View style={styles.criteriaGrid}>
                    <View style={styles.criteriaItem}>
                      <Check
                        size={12}
                        color={hasMinLength ? '#10b981' : colors.textMuted}
                        strokeWidth={hasMinLength ? 3 : 2}
                      />
                      <Text
                        style={[
                          styles.criteriaText,
                          {
                            color: hasMinLength ? '#10b981' : colors.textMuted,
                          },
                        ]}
                      >
                        {isVietnamese ? 'Ít nhất 8 ký tự' : '8+ characters'}
                      </Text>
                    </View>

                    <View style={styles.criteriaItem}>
                      <Check
                        size={12}
                        color={hasLetter ? '#10b981' : colors.textMuted}
                        strokeWidth={hasLetter ? 3 : 2}
                      />
                      <Text
                        style={[
                          styles.criteriaText,
                          {
                            color: hasLetter ? '#10b981' : colors.textMuted,
                          },
                        ]}
                      >
                        {isVietnamese ? 'Có chữ cái' : 'Contains letter'}
                      </Text>
                    </View>

                    <View style={styles.criteriaItem}>
                      <Check
                        size={12}
                        color={hasNumber ? '#10b981' : colors.textMuted}
                        strokeWidth={hasNumber ? 3 : 2}
                      />
                      <Text
                        style={[
                          styles.criteriaText,
                          {
                            color: hasNumber ? '#10b981' : colors.textMuted,
                          },
                        ]}
                      >
                        {isVietnamese ? 'Có chữ số' : 'Contains number'}
                      </Text>
                    </View>

                    <View style={styles.criteriaItem}>
                      <Check
                        size={12}
                        color={hasSpecial ? '#10b981' : colors.textMuted}
                        strokeWidth={hasSpecial ? 3 : 2}
                      />
                      <Text
                        style={[
                          styles.criteriaText,
                          {
                            color: hasSpecial ? '#10b981' : colors.textMuted,
                          },
                        ]}
                      >
                        {isVietnamese ? 'Có ký tự đặc biệt' : 'Special character'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Confirm Password (Sign Up only) */}
              {isSignUp && (
                <>
                  <Input
                    label={copy.confirmPassword}
                    placeholder={copy.confirmPasswordPlaceholder}
                    value={confirmPassword}
                    onChangeText={(t) => {
                      setConfirmPassword(t);
                      clearFeedback();
                    }}
                    secureTextEntry={!showConfirmPassword}
                    leftIcon={<Lock size={16} color={colors.textMuted} />}
                    rightIcon={
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={18} color={colors.textMuted} />
                        ) : (
                          <Eye size={18} color={colors.textMuted} />
                        )}
                      </TouchableOpacity>
                    }
                  />

                  {confirmPassword.length > 0 && (
                    <View style={styles.matchStatusWrap}>
                      {confirmPassword === password ? (
                        <View
                          style={[
                            styles.matchBadge,
                            {
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              borderColor: 'rgba(16, 185, 129, 0.3)',
                            },
                          ]}
                        >
                          <CheckCircle2 size={12} color="#10b981" strokeWidth={2.5} />
                          <Text style={[styles.matchText, { color: '#10b981' }]}>
                            {copy.passwordsMatch}
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.matchBadge,
                            {
                              backgroundColor: 'rgba(245, 158, 11, 0.12)',
                              borderColor: 'rgba(245, 158, 11, 0.3)',
                            },
                          ]}
                        >
                          <AlertCircle size={12} color="#f59e0b" strokeWidth={2.5} />
                          <Text style={[styles.matchText, { color: '#f59e0b' }]}>
                            {copy.passwordsMismatch}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}

              {/* Terms Agreement Checkbox (Sign Up only) */}
              {isSignUp && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setAcceptTerms(!acceptTerms);
                    clearFeedback();
                  }}
                  style={styles.termsRow}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: acceptTerms ? colors.primary : 'transparent',
                        borderColor: acceptTerms ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {acceptTerms && <Check size={13} color="#ffffff" strokeWidth={3} />}
                  </View>
                  <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                    {copy.termsAgreement}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Remember Me Toggle (Sign In only) */}
              {!isSignUp && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={toggleRememberMe}
                  style={[
                    styles.rememberRow,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.rememberLeft}>
                    <View
                      style={[
                        styles.rememberIconWrap,
                        {
                          backgroundColor: rememberMe
                            ? colors.primarySubtle
                            : colors.surfaceHover,
                        },
                      ]}
                    >
                      <ShieldCheck
                        size={16}
                        color={rememberMe ? colors.primary : colors.textMuted}
                      />
                    </View>
                    <View style={styles.rememberTextWrap}>
                      <Text
                        style={[styles.rememberTitle, { color: colors.textPrimary }]}
                      >
                        {copy.rememberMe}
                      </Text>
                      <Text
                        style={[styles.rememberSubtitle, { color: colors.textMuted }]}
                      >
                        {copy.rememberMeSubtitle}
                      </Text>
                    </View>
                  </View>

                  {/* Switch Pill */}
                  <View
                    style={[
                      styles.switchTrack,
                      {
                        backgroundColor: rememberMe ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.switchThumb,
                        {
                          transform: [{ translateX: switchThumbTranslateX }],
                        },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              )}

              {/* Free Plan Perks Banner (Sign Up only) */}
              {isSignUp && (
                <View
                  style={[
                    styles.freePlanBanner,
                    {
                      backgroundColor: 'rgba(99, 102, 241, 0.08)',
                      borderColor: 'rgba(99, 102, 241, 0.25)',
                    },
                  ]}
                >
                  <View style={styles.freePlanTop}>
                    <View style={styles.freePlanBadge}>
                      <Sparkles size={12} color="#818cf8" />
                      <Text style={styles.freePlanBadgeText}>
                        {copy.freePlanBadge}
                      </Text>
                    </View>
                    <Text style={styles.freePlanNoCard}>
                      {copy.freePlanNoCard}
                    </Text>
                  </View>

                  <View style={styles.freePlanPillsRow}>
                    <View style={styles.freePlanPill}>
                      <Users size={12} color="#a5b4fc" />
                      <Text style={styles.freePlanPillText}>
                        {copy.freePlanMembers}
                      </Text>
                    </View>
                    <View style={styles.freePlanPill}>
                      <FolderKanban size={12} color="#a5b4fc" />
                      <Text style={styles.freePlanPillText}>
                        {copy.freePlanSpaces}
                      </Text>
                    </View>
                    <View style={styles.freePlanPill}>
                      <Globe size={12} color="#a5b4fc" />
                      <Text style={styles.freePlanPillText}>
                        {copy.freePlanLang}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Primary Submit Button with Gradient */}
              <PressableScale
                onPress={handleAuth}
                disabled={loading}
                activeScale={0.97}
                hapticFeedback="medium"
                style={styles.submitButtonWrap}
              >
                <LinearGradient
                  colors={['#2563eb', '#06b6d4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {loading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text style={styles.submitText}>{copy.processing}</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.submitText}>
                        {isSignUp ? copy.submitSignup : copy.submitSignin}
                      </Text>
                      <ArrowRight size={16} color="#ffffff" strokeWidth={2.5} />
                    </>
                  )}
                </LinearGradient>
              </PressableScale>

            </View>
          )}
        </Animated.View>

        {/* Brand Footer */}
        <View style={styles.brandFooter}>
          <Text style={[styles.brandFooterText, { color: colors.textMuted }]}>
            © {new Date().getFullYear()} Upgen Inc. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  themeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
  },
  langBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  langBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  brandTagline: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    position: 'relative',
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  tabButtonActive: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
  },
  freeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  formHeader: {
    marginBottom: 18,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  formSubtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  forgotHeroBadge: {
    alignItems: 'center',
    marginBottom: 16,
  },
  forgotIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  formContent: {
    gap: 2,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    flex: 1,
    fontSize: 12.5,
    color: '#34d399',
    lineHeight: 18,
    fontWeight: '500',
  },
  matchStatusWrap: {
    marginTop: -6,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  matchText: {
    fontSize: 11,
    fontWeight: '700',
  },
  forgotPassRow: {
    alignItems: 'flex-end',
    marginTop: -4,
    marginBottom: 12,
  },
  forgotPassBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  forgotPassText: {
    fontSize: 12,
    fontWeight: '700',
  },
  strengthBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: -4,
    marginBottom: 14,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  strengthValue: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  strengthBarTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  criteriaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  criteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    width: '48%',
  },
  criteriaText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 14,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 14,
  },
  rememberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rememberIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberTextWrap: {
    flex: 1,
  },
  rememberTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  rememberSubtitle: {
    fontSize: 10.5,
    marginTop: 1,
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  switchThumbOff: {
    alignSelf: 'flex-start',
  },
  freePlanBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginTop: 4,
    marginBottom: 14,
  },
  freePlanTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  freePlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  freePlanBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#a5b4fc',
    letterSpacing: 0.5,
  },
  freePlanNoCard: {
    fontSize: 11,
    fontWeight: '600',
    color: '#93c5fd',
  },
  freePlanPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freePlanPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  freePlanPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  submitButtonWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  socialDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  socialDividerLine: {
    flex: 1,
    height: 1,
  },
  socialDividerText: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  socialButtonsCol: {
    flexDirection: 'column',
    gap: 10,
    width: '100%',
  },
  socialButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 48,
    position: 'relative',
  },
  socialButtonFullText: {
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  socialLoader: {
    position: 'absolute',
    right: 16,
  },
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  brandFooter: {
    alignItems: 'center',
    marginTop: 32,
  },
  brandFooterText: {
    fontSize: 11,
  },
});
