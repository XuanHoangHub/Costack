"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from '../contexts/TranslationContext';
import { motion, AnimatePresence } from 'motion/react';
import { User, Task } from '../types';
import { supabase } from '../lib/supabaseClient';
import { 
  User as UserIcon, Camera, Mail, Briefcase, Shield, ShieldCheck,
  Phone, Calendar, Activity, CheckCircle, 
  Clock, Save, Sparkles, AlertCircle, Plus, X, Star, RotateCcw,
  FileText, Check, Copy, ExternalLink, Lock, SlidersHorizontal, Eye, Move,
  Globe, MapPin, KeyRound, Smartphone,
  LogOut, Download, Bell, Volume2, Moon, Sun, Laptop, Award, Target,
  Zap, ChevronRight, Search, Flame, Smile, CheckCircle2, MessageSquare
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import SignedImage from './SignedImage';
import { presenceDotClass, uiStatusToPresence, UiPresenceStatus } from '../lib/presence';
import { formatAuthError } from '../lib/authError';
import { useUiStore } from '@/store/uiStore';

interface ProfilePageProps {
  currentUser: { name: string; email: string; avatar: string; role: 'admin' | 'member' | 'guest'; isPremium?: boolean; id?: string };
  setCurrentUser: (user: any) => void;
  members: User[];
  setMembers: React.Dispatch<React.SetStateAction<User[]>>;
  tasks: Task[];
  isOffline: boolean;
  addSyncLog: (action: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
  onUpdateMember?: (member: User) => void | Promise<void>;
  onSelectTask?: (task: Task) => void;
}

type ProfileTab = 'overview' | 'tasks' | 'security' | 'preferences';

const STATUS_PRESETS = [
  { emoji: '💬', textVi: 'Đang tập trung làm việc', textEn: 'Focusing on deep work' },
  { emoji: '☕', textVi: 'Đang nghỉ giải lao / Ăn trưa', textEn: 'Taking a coffee break / Lunch' },
  { emoji: '📞', textVi: 'Đang trong cuộc họp', textEn: 'In a meeting' },
  { emoji: '🏖️', textVi: 'Đang nghỉ phép', textEn: 'On vacation / Off duty' },
  { emoji: '🚗', textVi: 'Đang di chuyển', textEn: 'Commuting / Traveling' },
  { emoji: '🤒', textVi: 'Đang không khỏe', textEn: 'Feeling unwell / Sick leave' },
];

const SKILL_SUGGESTIONS = [
  'React', 'Next.js', 'TypeScript', 'TailwindCSS', 'UI/UX Design', 
  'Node.js', 'Python', 'Product Management', 'Figma', 'AI Engineering', 'DevOps'
];

function ProfilePage({
  currentUser,
  setCurrentUser,
  members,
  setMembers,
  tasks,
  isOffline,
  addSyncLog,
  triggerToast,
  onUpdateMember,
  onSelectTask
}: ProfilePageProps) {
  const { t, locale, setLocale } = useTranslation();
  const userStatus = useUiStore((s) => s.userStatus);
  const setUserStatus = useUiStore((s) => s.setUserStatus);

  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  // Safe Translation Helper
  const getText = (key: string, fallbackEn: string, fallbackVi?: string) => {
    const translated = t(key);
    if (!translated || translated === key || translated.startsWith('dept_') || translated === 'editProfileInfo' || translated === 'bioPlaceholder') {
      return locale === 'vi' ? (fallbackVi || fallbackEn) : fallbackEn;
    }
    return translated;
  };

  const memberMe = useMemo(
    () => members.find((member) => member.id === 'user' || (member.email && currentUser?.email && member.email.toLowerCase() === currentUser.email.toLowerCase()) || (currentUser?.id && member.id === currentUser.id)),
    [members, currentUser?.email, currentUser?.id],
  );

  const accountPresenceStatus = isOffline 
    ? 'offline' 
    : (userStatus ? uiStatusToPresence(userStatus) : (memberMe?.status || 'online'));

  // Form states
  const [name, setName] = useState(currentUser.name);
  const [role, setRole] = useState(currentUser.role);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [bannerUrl, setBannerUrl] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return memberMe?.bannerUrl || memberMe?.coverUrl || localStorage.getItem('apexa_user_banner') || '';
  });
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [website, setWebsite] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [twitter, setTwitter] = useState('');
  const [bio, setBio] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Custom Status states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusEmoji, setStatusEmoji] = useState(memberMe?.statusEmoji || '💬');
  const [statusMessage, setStatusMessage] = useState(memberMe?.statusMessage || '');

  // Password Update states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isRevokingSessions, setIsRevokingSessions] = useState(false);

  // 2FA / MFA TOTP states
  const [mfaFactors, setMfaFactors] = useState<Array<{ id: string; friendly_name?: string; status: string; created_at?: string }>>([]);
  const [mfaEnrollment, setMfaEnrollment] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Notification & Preference states
  const [notifyEmailTasks, setNotifyEmailTasks] = useState(true);
  const [notifyMentions, setNotifyMentions] = useState(true);
  const [notifySound, setNotifySound] = useState(true);
  const [notifyWeeklyDigest, setNotifyWeeklyDigest] = useState(true);

  // Task Filter state in Tasks tab
  const [taskFilterStatus, setTaskFilterStatus] = useState<'all' | 'inprogress' | 'todo' | 'review' | 'completed'>('all');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');

  // Banner Repositioning states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [bannerFit, setBannerFit] = useState<'cover' | 'contain'>('cover');
  const [bannerPosition, setBannerPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 50, y: 50 };
    try {
      const saved = localStorage.getItem('apexa_user_banner_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed;
      }
    } catch (e) {}
    return { x: 50, y: 50 };
  });
  const [isRepositioningBanner, setIsRepositioningBanner] = useState(false);
  const [isDraggingBanner, setIsDraggingBanner] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initPosX: number; initPosY: number } | null>(null);
  const bannerContainerRef = useRef<HTMLDivElement>(null);
  const prevBannerPosRef = useRef<{ x: number; y: number }>({ x: 50, y: 50 });

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const loadedProfileRef = useRef({ 
    name: '', role: '', avatar: '', bannerUrl: '', phone: '', department: '', 
    location: '', jobTitle: '', website: '', github: '', linkedin: '', twitter: '', 
    bio: '', skills: [] as string[] 
  });
  const initializedIdentityRef = useRef('');

  // Load profile data on mount or user switch
  useEffect(() => {
    const profileSourceKey = `${currentUser.email}:${memberMe?.id || 'pending'}`;
    if (initializedIdentityRef.current === profileSourceKey) return;
    initializedIdentityRef.current = profileSourceKey;

    setName(currentUser.name);
    setAvatar(currentUser.avatar);
    const loadedBanner = memberMe?.bannerUrl || memberMe?.coverUrl || (typeof window !== 'undefined' ? localStorage.getItem('apexa_user_banner') || '' : '') || '';
    setBannerUrl(loadedBanner);

    try {
      const savedBannerPos = localStorage.getItem(memberMe?.id ? `apexa_user_banner_pos_${memberMe.id}` : 'apexa_user_banner_pos') || localStorage.getItem('apexa_user_banner_pos');
      if (savedBannerPos) {
        const parsed = JSON.parse(savedBannerPos);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setBannerPosition(parsed);
        }
      }
    } catch (e) {}

    setRole(currentUser.role);
    const loadedPhone = memberMe?.phone || '';
    const loadedDept = memberMe?.department || '';
    const loadedBio = memberMe?.bio || '';
    let loadedSkills = memberMe?.skills || [];

    // Load Extended Meta from LocalStorage
    let loadedLocation = '';
    let loadedJobTitle = '';
    let loadedWebsite = '';
    let loadedGithub = '';
    let loadedLinkedin = '';
    let loadedTwitter = '';

    try {
      const savedSkills = localStorage.getItem('apexa_user_skills');
      const parsedSkills = savedSkills ? JSON.parse(savedSkills) : null;
      if (Array.isArray(parsedSkills)) loadedSkills = parsedSkills.filter(item => typeof item === 'string');

      const savedMeta = localStorage.getItem('apexa_user_extended_meta');
      if (savedMeta) {
        const meta = JSON.parse(savedMeta);
        loadedLocation = meta.location || '';
        loadedJobTitle = meta.jobTitle || '';
        loadedWebsite = meta.website || '';
        loadedGithub = meta.github || '';
        loadedLinkedin = meta.linkedin || '';
        loadedTwitter = meta.twitter || '';
      }
    } catch (e) {}

    setPhone(loadedPhone);
    setDepartment(loadedDept);
    setLocation(loadedLocation);
    setJobTitle(loadedJobTitle);
    setWebsite(loadedWebsite);
    setGithub(loadedGithub);
    setLinkedin(loadedLinkedin);
    setTwitter(loadedTwitter);
    setBio(loadedBio);
    setSkills(loadedSkills);

    if (memberMe?.statusEmoji) setStatusEmoji(memberMe.statusEmoji);
    if (memberMe?.statusMessage) setStatusMessage(memberMe.statusMessage);

    loadedProfileRef.current = {
      name: currentUser.name,
      role: currentUser.role,
      avatar: currentUser.avatar,
      bannerUrl: loadedBanner,
      phone: loadedPhone,
      department: loadedDept,
      location: loadedLocation,
      jobTitle: loadedJobTitle,
      website: loadedWebsite,
      github: loadedGithub,
      linkedin: loadedLinkedin,
      twitter: loadedTwitter,
      bio: loadedBio,
      skills: loadedSkills,
    };
    setSaveStatus('saved');
    setFormError('');
  }, [currentUser.email, currentUser.name, currentUser.avatar, currentUser.role, memberMe]);

  // Statistics calculation
  const myTasks = useMemo(() => tasks.filter(t => t.assigneeId === 'user' || (t.assigneeIds && t.assigneeIds.includes('user'))), [tasks]);
  const completedTasks = useMemo(() => myTasks.filter(t => t.status === 'completed'), [myTasks]);
  const inProgressTasksCount = useMemo(() => myTasks.filter(t => t.status === 'inprogress').length, [myTasks]);
  const reviewTasksCount = useMemo(() => myTasks.filter(t => t.status === 'review').length, [myTasks]);
  const todoTasksCount = useMemo(() => myTasks.filter(t => t.status === 'todo').length, [myTasks]);
  
  const completionRate = myTasks.length > 0 ? Math.round((completedTasks.length / myTasks.length) * 100) : 0;
  
  const profileCompleteness = Math.round(([
    name.trim(),
    avatar,
    phone.trim(),
    department.trim(),
    bio.trim(),
    skills.length > 0,
    location.trim(),
    jobTitle.trim(),
    website.trim() || github.trim() || linkedin.trim(),
  ].filter(Boolean).length / 9) * 100);

  const presenceLabel = {
    online: locale === 'vi' ? 'Đang hoạt động' : 'Online',
    busy: locale === 'vi' ? 'Đang bận' : 'Busy',
    away: locale === 'vi' ? 'Vắng mặt' : 'Away',
    offline: locale === 'vi' ? 'Ngoại tuyến' : 'Offline',
  }[accountPresenceStatus] || (locale === 'vi' ? 'Ngoại tuyến' : 'Offline');

  // Chart statistics distribution data
  const statPieData = useMemo(() => [
    { name: locale === 'vi' ? 'Cần làm' : 'To Do', value: todoTasksCount, color: '#6366f1' },
    { name: locale === 'vi' ? 'Đang làm' : 'In Progress', value: inProgressTasksCount, color: '#f59e0b' },
    { name: locale === 'vi' ? 'Đang duyệt' : 'Review', value: reviewTasksCount, color: '#a855f7' },
    { name: locale === 'vi' ? 'Đã xong' : 'Completed', value: completedTasks.length, color: '#10b981' }
  ].filter(item => item.value > 0), [todoTasksCount, inProgressTasksCount, reviewTasksCount, completedTasks.length, locale]);

  // Filtered tasks for Tasks tab
  const filteredMyTasks = useMemo(() => {
    return myTasks.filter(task => {
      const matchesStatus = taskFilterStatus === 'all' || task.status === taskFilterStatus;
      const matchesSearch = !taskSearchQuery.trim() || task.title.toLowerCase().includes(taskSearchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [myTasks, taskFilterStatus, taskSearchQuery]);

  // Handle local avatar file upload & convert to base64 / upload to Supabase
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      triggerToast?.('error', locale === 'vi' ? 'Định dạng không hợp lệ' : 'Invalid format', locale === 'vi' ? 'Vui lòng chọn tệp ảnh JPG, PNG, WebP hoặc GIF.' : 'Please select a valid image file.');
      e.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      triggerToast?.('error', locale === 'vi' ? 'Tệp quá lớn ⚠️' : 'File too large', locale === 'vi' ? 'Vui lòng chọn ảnh nhỏ hơn 2MB.' : 'Please choose an image under 2MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
        setSaveStatus('dirty');
      }
    };
    reader.readAsDataURL(file);

    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const userId = session.user.id;
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;

        triggerToast?.('info', locale === 'vi' ? 'Đang đồng bộ ảnh ⚡' : 'Uploading avatar...', locale === 'vi' ? 'Đang tải ảnh đại diện lên đám mây...' : 'Uploading avatar image to Cloud...');

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        setAvatar(publicUrl);
        triggerToast?.('success', locale === 'vi' ? 'Tải ảnh hoàn tất 📸' : 'Avatar updated', locale === 'vi' ? 'Ảnh đại diện đã được cập nhật thành công.' : 'Profile photo successfully uploaded.');
      } catch (err: any) {
        console.error('Lỗi khi tải ảnh đại diện lên Supabase:', err);
        triggerToast?.('error', locale === 'vi' ? 'Lỗi tải ảnh ⚠️' : 'Upload error', err.message || 'Không thể đồng bộ ảnh đại diện.');
      }
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      triggerToast?.('error', locale === 'vi' ? 'Lỗi chọn tệp' : 'File error', locale === 'vi' ? 'Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP).' : 'Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      triggerToast?.('error', locale === 'vi' ? 'Tệp quá lớn' : 'File too large', locale === 'vi' ? 'Kích thước ảnh tối đa là 8MB.' : 'Maximum image size is 8MB.');
      return;
    }

    setIsUploadingBanner(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setBannerUrl(base64);
      try {
        localStorage.setItem('apexa_user_banner', base64);
        if (memberMe?.id) {
          localStorage.setItem(`apexa_user_banner_${memberMe.id}`, base64);
        }
      } catch (err) {
        console.warn('LocalStorage quota limit:', err);
      }
      triggerToast?.('success', locale === 'vi' ? 'Đã đổi ảnh bìa 📸' : 'Banner updated', locale === 'vi' ? 'Ảnh bìa hồ sơ đã được cập nhật.' : 'Profile cover photo updated.');

      if (!isOffline) {
        try {
          const fileExt = file.name.split('.').pop() || 'png';
          const fileName = `banners/${memberMe?.id || 'user'}_${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, { cacheControl: '3600', upsert: true });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
            if (publicUrl) {
              setBannerUrl(publicUrl);
              localStorage.setItem('apexa_user_banner', publicUrl);
              if (memberMe?.id) localStorage.setItem(`apexa_user_banner_${memberMe.id}`, publicUrl);
            }
          }
        } catch (uploadErr) {
          console.warn('Storage sync fallback to base64:', uploadErr);
        } finally {
          setIsUploadingBanner(false);
        }
      } else {
        setIsUploadingBanner(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveBanner = () => {
    setBannerUrl('');
    setBannerPosition({ x: 50, y: 50 });
    setIsRepositioningBanner(false);
    setIsDraggingBanner(false);
    dragStartRef.current = null;
    localStorage.removeItem('apexa_user_banner');
    localStorage.removeItem('apexa_user_banner_pos');
    if (memberMe?.id) {
      localStorage.removeItem(`apexa_user_banner_${memberMe.id}`);
      localStorage.removeItem(`apexa_user_banner_pos_${memberMe.id}`);
    }
    triggerToast?.('info', locale === 'vi' ? 'Khôi phục ảnh bìa' : 'Banner reset', locale === 'vi' ? 'Đã quay lại ảnh bìa mặc định.' : 'Reverted to default banner gradient.');
  };

  const handleBannerMouseDown = (e: React.MouseEvent) => {
    if (!isRepositioningBanner || bannerFit === 'contain') return;
    e.preventDefault();
    setIsDraggingBanner(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPosX: bannerPosition.x,
      initPosY: bannerPosition.y,
    };
  };

  const handleBannerTouchStart = (e: React.TouchEvent) => {
    if (!isRepositioningBanner || bannerFit === 'contain' || !e.touches[0]) return;
    setIsDraggingBanner(true);
    dragStartRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      initPosX: bannerPosition.x,
      initPosY: bannerPosition.y,
    };
  };

  const handleBannerMouseMove = (e: React.MouseEvent) => {
    if (!dragStartRef.current || !bannerContainerRef.current) return;
    const rect = bannerContainerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    const newX = Math.max(0, Math.min(100, dragStartRef.current.initPosX - (deltaX / rect.width) * 100));
    const newY = Math.max(0, Math.min(100, dragStartRef.current.initPosY - (deltaY / rect.height) * 100));

    setBannerPosition({ x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 });
  };

  const handleBannerTouchMove = (e: React.TouchEvent) => {
    if (!dragStartRef.current || !bannerContainerRef.current || !e.touches[0]) return;
    const rect = bannerContainerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaX = e.touches[0].clientX - dragStartRef.current.startX;
    const deltaY = e.touches[0].clientY - dragStartRef.current.startY;

    const newX = Math.max(0, Math.min(100, dragStartRef.current.initPosX - (deltaX / rect.width) * 100));
    const newY = Math.max(0, Math.min(100, dragStartRef.current.initPosY - (deltaY / rect.height) * 100));

    setBannerPosition({ x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 });
  };

  const handleBannerMouseUp = () => {
    setIsDraggingBanner(false);
    dragStartRef.current = null;
  };

  const startRepositionBanner = () => {
    prevBannerPosRef.current = { ...bannerPosition };
    setIsRepositioningBanner(true);
    if (bannerFit === 'contain') setBannerFit('cover');
  };

  const saveBannerPosition = () => {
    setIsRepositioningBanner(false);
    setIsDraggingBanner(false);
    dragStartRef.current = null;
    try {
      localStorage.setItem('apexa_user_banner_pos', JSON.stringify(bannerPosition));
      if (memberMe?.id) {
        localStorage.setItem(`apexa_user_banner_pos_${memberMe.id}`, JSON.stringify(bannerPosition));
      }
    } catch (err) {}
    triggerToast?.('success', locale === 'vi' ? 'Đã lưu vị trí ảnh bìa 🎯' : 'Banner position saved', locale === 'vi' ? 'Vị trí hiển thị ảnh bìa đã được cập nhật.' : 'Cover photo position updated.');
  };

  const resetBannerCenter = () => {
    setBannerPosition({ x: 50, y: 50 });
  };

  const cancelRepositionBanner = () => {
    setBannerPosition(prevBannerPosRef.current);
    setIsRepositioningBanner(false);
    setIsDraggingBanner(false);
    dragStartRef.current = null;
  };

  const validateProfile = () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) return locale === 'vi' ? 'Họ tên phải có ít nhất 2 ký tự.' : 'Name must contain at least 2 characters.';
    if (trimmedName.length > 80) return locale === 'vi' ? 'Họ tên không được vượt quá 80 ký tự.' : 'Name cannot exceed 80 characters.';
    if (phone.trim() && !/^[+()\d\s.-]{7,24}$/.test(phone.trim())) return locale === 'vi' ? 'Số điện thoại chưa đúng định dạng.' : 'Phone number format is invalid.';
    if (department.trim().length > 80) return locale === 'vi' ? 'Phòng ban không được vượt quá 80 ký tự.' : 'Department cannot exceed 80 characters.';
    if (location.trim().length > 80) return locale === 'vi' ? 'Địa điểm không được vượt quá 80 ký tự.' : 'Location cannot exceed 80 characters.';
    if (jobTitle.trim().length > 80) return locale === 'vi' ? 'Chức danh không được vượt quá 80 ký tự.' : 'Job title cannot exceed 80 characters.';
    if (bio.trim().length > 500) return locale === 'vi' ? 'Giới thiệu không được vượt quá 500 ký tự.' : 'Bio cannot exceed 500 characters.';
    return '';
  };

  const triggerSave = async () => {
    const validationError = validateProfile();
    if (validationError) {
      setFormError(validationError);
      triggerToast?.('error', locale === 'vi' ? 'Không thể lưu hồ sơ' : 'Unable to save profile', validationError);
      return false;
    }

    setFormError('');
    setSaveStatus('saving');

    const updatedUser = {
      ...currentUser,
      name: name.trim(),
      avatar: avatar,
      role: role
    };

    const sessionObj = {
      user: updatedUser,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
    };

    const currentMember = memberMe;
    const myJoinedDate = currentMember?.joinedDate || new Date().getFullYear().toString();
    const updatedMemberObj: User = {
      id: currentMember?.id || 'user',
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      bannerUrl: bannerUrl || undefined,
      coverUrl: bannerUrl || undefined,
      role: updatedUser.role,
      status: currentMember?.status || 'online',
      customStatus: currentMember?.customStatus,
      statusMessage: statusMessage,
      statusEmoji: statusEmoji,
      lastSeenAt: new Date().toISOString(),
      phone: phone.trim(),
      department: department.trim(),
      bio: bio.trim(),
      skills,
      joinedDate: myJoinedDate
    };

    const extendedMeta = {
      location: location.trim(),
      jobTitle: jobTitle.trim(),
      website: website.trim(),
      github: github.trim(),
      linkedin: linkedin.trim(),
      twitter: twitter.trim(),
    };

    try {
      if (onUpdateMember) {
        await onUpdateMember(updatedMemberObj);
      } else {
        setMembers(prev => prev.map(m => m.id === updatedMemberObj.id ? updatedMemberObj : m));
      }

      if (!isOffline) {
        const { data: { session } } = await supabase.auth.getSession();
        const { error: authError } = await supabase.auth.updateUser({
          data: { 
            name: updatedUser.name,
            role: updatedUser.role,
            phone: phone.trim(),
            department: department.trim(),
            avatar: updatedUser.avatar,
            bio: bio.trim(),
            joinedDate: myJoinedDate,
            skills,
            ...extendedMeta
          }
        });
        if (authError) throw authError;

        if (session?.user && !onUpdateMember) {
          const dbId = `user-${session.user.id}`;
          await supabase.from('members').update({
            name: updatedUser.name,
            email: updatedUser.email,
            avatar: updatedUser.avatar,
            role: updatedUser.role,
            phone: phone.trim(),
            department: department.trim(),
            bio: bio.trim(),
            joined_date: myJoinedDate,
            status_message: statusMessage,
            status_emoji: statusEmoji,
          }).eq('id', dbId).eq('user_id', session.user.id);
        }

        addSyncLog('Đã tự động lưu hồ sơ cá nhân lên đám mây');
      }
    } catch (err) {
      console.error('Lỗi lưu hồ sơ:', err);
      setSaveStatus('dirty');
      setFormError(locale === 'vi' ? 'Không thể đồng bộ hồ sơ. Vui lòng kiểm tra kết nối.' : 'Profile sync failed. Check your connection.');
      return false;
    }

    setCurrentUser(updatedUser);
    localStorage.setItem('apexa_session', JSON.stringify(sessionObj));
    localStorage.setItem('apexa_user_skills', JSON.stringify(skills));
    localStorage.setItem('apexa_user_extended_meta', JSON.stringify(extendedMeta));
    localStorage.setItem('apexa_user_banner_pos', JSON.stringify(bannerPosition));
    if (memberMe?.id) {
      localStorage.setItem(`apexa_user_banner_pos_${memberMe.id}`, JSON.stringify(bannerPosition));
    }

    loadedProfileRef.current = {
      name: updatedUser.name,
      role: role,
      avatar: avatar,
      bannerUrl: bannerUrl,
      phone: updatedMemberObj.phone || '',
      department: updatedMemberObj.department || '',
      location: location.trim(),
      jobTitle: jobTitle.trim(),
      website: website.trim(),
      github: github.trim(),
      linkedin: linkedin.trim(),
      twitter: twitter.trim(),
      bio: updatedMemberObj.bio || '',
      skills: skills
    };

    setSaveStatus('saved');
    return true;
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const ok = await triggerSave();
    if (ok) {
      triggerToast?.('success', locale === 'vi' ? 'Cập nhật thành công 🚀' : 'Profile updated', locale === 'vi' ? 'Thông tin hồ sơ cá nhân đã được lưu trữ an toàn.' : 'Your profile details have been saved securely.');
    }
  };

  // Check for unsaved changes
  useEffect(() => {
    const isDirty = 
      name !== loadedProfileRef.current.name ||
      avatar !== loadedProfileRef.current.avatar ||
      bannerUrl !== loadedProfileRef.current.bannerUrl ||
      phone !== loadedProfileRef.current.phone ||
      department !== loadedProfileRef.current.department ||
      location !== loadedProfileRef.current.location ||
      jobTitle !== loadedProfileRef.current.jobTitle ||
      website !== loadedProfileRef.current.website ||
      github !== loadedProfileRef.current.github ||
      linkedin !== loadedProfileRef.current.linkedin ||
      twitter !== loadedProfileRef.current.twitter ||
      bio !== loadedProfileRef.current.bio ||
      JSON.stringify(skills) !== JSON.stringify(loadedProfileRef.current.skills);

    if (isDirty && saveStatus === 'saved') {
      setSaveStatus('dirty');
    } else if (!isDirty && saveStatus === 'dirty') {
      setSaveStatus('saved');
    }
  }, [name, avatar, bannerUrl, phone, department, location, jobTitle, website, github, linkedin, twitter, bio, skills, saveStatus]);

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newSkill.trim();
    if (!val) return;
    if (skills.length >= 20) {
      setFormError(locale === 'vi' ? 'Bạn chỉ có thể thêm tối đa 20 kỹ năng.' : 'You can add up to 20 skills.');
      return;
    }
    if (val.length > 40) {
      setFormError(locale === 'vi' ? 'Mỗi kỹ năng không được vượt quá 40 ký tự.' : 'Skill name cannot exceed 40 characters.');
      return;
    }
    if (val && !skills.some(skill => skill.toLowerCase() === val.toLowerCase())) {
      setSkills(prev => [...prev, val]);
      setNewSkill('');
      setFormError('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(prev => prev.filter(s => s !== skillToRemove));
  };

  const handleResetForm = () => {
    const initial = loadedProfileRef.current;
    setName(initial.name);
    setRole(initial.role as 'admin' | 'member' | 'guest');
    setAvatar(initial.avatar);
    setBannerUrl(initial.bannerUrl);
    setPhone(initial.phone);
    setDepartment(initial.department);
    setLocation(initial.location);
    setJobTitle(initial.jobTitle);
    setWebsite(initial.website);
    setGithub(initial.github);
    setLinkedin(initial.linkedin);
    setTwitter(initial.twitter);
    setBio(initial.bio);
    setSkills(initial.skills);
    setFormError('');
    setSaveStatus('saved');
  };

  const handleCopyProfileLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    triggerToast?.('success', locale === 'vi' ? 'Đã sao chép liên kết 🔗' : 'Link copied', locale === 'vi' ? 'Liên kết hồ sơ đã được sao chép vào bộ nhớ tạm.' : 'Profile link copied to clipboard.');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Password update handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    
    if (newPassword.length < 10 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setPasswordError(locale === 'vi' ? 'Mật khẩu cần ít nhất 10 ký tự, gồm chữ hoa, chữ thường và số.' : 'Use at least 10 characters with uppercase, lowercase and a number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(locale === 'vi' ? 'Mật khẩu xác nhận không khớp.' : 'Password confirmation does not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const attributes: { password: string; current_password?: string } = { password: newPassword };
      if (currentPassword) attributes.current_password = currentPassword;
      const { error } = await supabase.auth.updateUser(attributes);
      if (error) throw error;
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      triggerToast?.('success', locale === 'vi' ? 'Đã cập nhật mật khẩu 🔐' : 'Password updated', locale === 'vi' ? 'Mật khẩu mới đã có hiệu lực thành công.' : 'Your new password is now active.');
      addSyncLog('Đã cập nhật mật khẩu tài khoản');
    } catch (err: any) {
      setPasswordError(err?.message || (locale === 'vi' ? 'Không thể cập nhật mật khẩu.' : 'Could not update password.'));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Revoke sessions handler
  const handleRevokeSessions = async () => {
    setIsRevokingSessions(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) throw error;
      triggerToast?.('success', locale === 'vi' ? 'Đã đăng xuất các thiết bị khác' : 'Other sessions revoked', locale === 'vi' ? 'Chỉ thiết bị hiện tại còn duy trì đăng nhập.' : 'Only this device remains signed in.');
      addSyncLog('Đã thu hồi phiên đăng nhập trên các thiết bị khác');
    } catch (err: any) {
      triggerToast?.('error', locale === 'vi' ? 'Lỗi thu hồi phiên' : 'Revocation failed', err?.message || 'Vui lòng thử lại.');
    } finally {
      setIsRevokingSessions(false);
    }
  };

  // 2FA MFA TOTP handlers
  const loadMfaState = React.useCallback(async () => {
    try {
      const { data: factorData, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setMfaFactors((factorData?.totp || []).map(factor => ({
        id: factor.id,
        friendly_name: factor.friendly_name,
        status: factor.status,
        created_at: factor.created_at
      })));
    } catch (e) {
      console.warn('Could not load MFA factors:', e);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'security') {
      void loadMfaState();
    }
  }, [activeTab, loadMfaState]);

  const startMfaEnrollment = async () => {
    setMfaBusy(true);
    setMfaError('');
    try {
      // Clean up any unverified factors first
      await Promise.all(mfaFactors.filter(factor => factor.status !== 'verified').map(factor => supabase.auth.mfa.unenroll({ factorId: factor.id })));
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Apexa Authenticator' });
      if (error) throw error;
      setMfaEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
      setMfaCode('');
    } catch (error: any) {
      setMfaError(error?.message || (locale === 'vi' ? 'Không thể khởi tạo mã 2FA. Vui lòng thử lại.' : 'Could not initialize 2FA setup.'));
      triggerToast?.('error', locale === 'vi' ? 'Không thể thiết lập 2FA' : '2FA setup failed', error?.message || 'Please try again.');
    } finally {
      setMfaBusy(false);
    }
  };

  const cancelMfaEnrollment = async () => {
    if (mfaEnrollment) {
      await supabase.auth.mfa.unenroll({ factorId: mfaEnrollment.factorId });
    }
    setMfaEnrollment(null);
    setMfaCode('');
    setMfaError('');
    await loadMfaState();
  };

  const verifyMfaEnrollment = async () => {
    if (!mfaEnrollment || !/^\d{6}$/.test(mfaCode)) return;
    setMfaBusy(true);
    setMfaError('');
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaEnrollment.factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: mfaEnrollment.factorId, challengeId: challenge.id, code: mfaCode });
      if (verifyError) throw verifyError;
      setMfaEnrollment(null);
      setMfaCode('');
      await loadMfaState();
      triggerToast?.('success', locale === 'vi' ? 'Đã kích hoạt 2FA thành công 🛡️' : '2FA Authenticator enabled', locale === 'vi' ? 'Tài khoản của bạn hiện được bảo vệ bằng mã OTP từ ứng dụng Authenticator.' : 'Your account is now protected with 2FA Authenticator.');
      addSyncLog('Đã kích hoạt xác thực hai bước (2FA TOTP)');
    } catch (error: any) {
      const formatted = formatAuthError(error, locale === 'vi');
      setMfaError(formatted.description);
      triggerToast?.('error', formatted.title, formatted.description);
    } finally {
      setMfaBusy(false);
    }
  };

  const removeMfaFactor = async (factorId: string) => {
    if (!window.confirm(locale === 'vi' ? 'Bạn có chắc chắn muốn tắt và gỡ bỏ 2FA Authenticator cho tài khoản này không?' : 'Are you sure you want to remove 2FA Authenticator from your account?')) return;
    setMfaBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      await loadMfaState();
      triggerToast?.('success', locale === 'vi' ? 'Đã tắt bảo mật 2FA ⚠️' : '2FA disabled', locale === 'vi' ? 'Xác thực hai bước đã được gỡ bỏ khỏi tài khoản.' : '2FA has been disabled.');
      addSyncLog('Đã tắt xác thực hai bước (2FA)');
    } catch (error: any) {
      triggerToast?.('error', locale === 'vi' ? 'Không thể gỡ 2FA' : 'Could not remove 2FA', error?.message || 'Please try again.');
    } finally {
      setMfaBusy(false);
    }
  };

  // Save custom status
  const handleSaveStatus = () => {
    if (memberMe) {
      const updated = {
        ...memberMe,
        statusEmoji,
        statusMessage,
      };
      if (onUpdateMember) onUpdateMember(updated);
      else setMembers(prev => prev.map(m => m.id === memberMe.id ? updated : m));
    }
    setShowStatusModal(false);
    triggerToast?.('success', locale === 'vi' ? 'Đã cập nhật trạng thái' : 'Status updated', `${statusEmoji} ${statusMessage || (locale === 'vi' ? 'Đang hoạt động' : 'Active')}`);
  };

  // Export profile JSON
  const handleExportProfileJson = () => {
    const dataToExport = {
      user: {
        id: currentUser.id,
        name,
        email: currentUser.email,
        role,
        department,
        location,
        jobTitle,
        phone,
        bio,
        skills,
        presence: accountPresenceStatus,
        statusMessage: `${statusEmoji} ${statusMessage}`.trim(),
        isPremium: currentUser.isPremium,
      },
      stats: {
        totalAssignedTasks: myTasks.length,
        completedTasks: completedTasks.length,
        completionRate: `${completionRate}%`,
        inProgressTasks: inProgressTasksCount,
      },
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apexa_profile_${currentUser.email.split('@')[0]}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    triggerToast?.('success', locale === 'vi' ? 'Đã xuất dữ liệu' : 'Data exported', locale === 'vi' ? 'Tệp dữ liệu hồ sơ cá nhân đã được tải xuống.' : 'Profile data file downloaded.');
  };

  return (
    <div className="w-full max-w-7xl mx-auto font-sans text-left pb-20 text-slate-800 dark:text-slate-100 select-none space-y-6">
      
      {/* ── 1. Hero Header Banner Card ── */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xl transition-all">
        
        {/* Banner with Interactive Drag to Reposition */}
        <div 
          ref={bannerContainerRef}
          onMouseDown={handleBannerMouseDown}
          onMouseMove={handleBannerMouseMove}
          onMouseUp={handleBannerMouseUp}
          onMouseLeave={handleBannerMouseUp}
          onTouchStart={handleBannerTouchStart}
          onTouchMove={handleBannerTouchMove}
          onTouchEnd={handleBannerMouseUp}
          className={`h-52 md:h-64 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 relative overflow-hidden group select-none transition-all ${
            isRepositioningBanner 
              ? (isDraggingBanner ? 'cursor-grabbing ring-2 ring-inset ring-sky-400' : 'cursor-grab ring-2 ring-inset ring-sky-400/80') 
              : ''
          }`}
        >
          {bannerUrl ? (
            <div className="relative w-full h-full overflow-hidden flex items-center justify-center pointer-events-none">
              <SignedImage
                filePath={bannerUrl}
                alt="Profile banner"
                style={{
                  imageRendering: '-webkit-optimize-contrast',
                  objectFit: bannerFit,
                  objectPosition: `${bannerPosition.x}% ${bannerPosition.y}%`,
                }}
                className={`w-full h-full ${bannerFit === 'contain' ? 'object-contain bg-slate-950 p-2' : 'object-cover'} pointer-events-none select-none`}
                draggable={false}
              />
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
              
              {/* Repositioning Grid Overlay */}
              {isRepositioningBanner && (
                <div className="absolute inset-0 bg-black/15 pointer-events-none flex items-center justify-center">
                  <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white/30 border-t border-dashed border-white/60" />
                  <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white/30 border-l border-dashed border-white/60" />
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-slate-950/40" />
              <div className="absolute -top-24 -left-24 w-80 h-80 bg-indigo-400/35 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-pink-400/35 rounded-full blur-3xl" />
            </>
          )}

          {/* Reposition Mode Guide Pill */}
          {isRepositioningBanner && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 bg-slate-950/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-sky-400/60 text-white text-xs font-bold shadow-2xl animate-fade-in pointer-events-none select-none">
              <Move className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              <span>{locale === 'vi' ? 'Kéo chuột để căn chỉnh vị trí ảnh bìa' : 'Drag image to reposition banner'}</span>
            </div>
          )}

          {/* Reposition Mode Action Controls */}
          {isRepositioningBanner ? (
            <div className="absolute top-4 left-4 flex items-center gap-2 z-20 animate-fade-in">
              <button
                type="button"
                onClick={saveBannerPosition}
                className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <Check className="w-3.5 h-3.5 text-white" />
                <span>{locale === 'vi' ? 'Lưu vị trí' : 'Save position'}</span>
              </button>

              <button
                type="button"
                onClick={resetBannerCenter}
                className="px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/25 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
                title={locale === 'vi' ? 'Căn giữa (50% 50%)' : 'Reset center'}
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
                <span>{locale === 'vi' ? 'Căn giữa' : 'Center'}</span>
              </button>

              <button
                type="button"
                onClick={cancelRepositionBanner}
                className="px-3 py-1.5 rounded-full bg-black/60 hover:bg-rose-600/80 border border-white/25 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <X className="w-3.5 h-3.5 text-rose-300" />
                <span>{locale === 'vi' ? 'Hủy' : 'Cancel'}</span>
              </button>
            </div>
          ) : (
            /* Regular Banner Upload Actions Bar */
            <div className="absolute top-4 left-4 flex items-center gap-2 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:pointer-events-none md:group-hover:pointer-events-auto -translate-y-1 group-hover:translate-y-0 transition-all duration-200">
              <div className="flex items-center gap-1 p-1 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 backdrop-blur-xl shadow-xl">
                <button
                  type="button"
                  onClick={() => bannerFileInputRef.current?.click()}
                  disabled={isUploadingBanner}
                  className="px-3 py-1.5 rounded-full hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                  title={locale === 'vi' ? 'Tải lên hoặc đổi ảnh bìa' : 'Upload or change profile banner'}
                >
                  {isUploadingBanner ? (
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-cyan-300" />
                  )}
                  <span>
                    {isUploadingBanner
                      ? (locale === 'vi' ? 'Đang tải...' : 'Uploading...')
                      : bannerUrl
                        ? (locale === 'vi' ? 'Đổi ảnh bìa' : 'Change banner')
                        : (locale === 'vi' ? 'Tải ảnh bìa' : 'Upload banner')}
                  </span>
                </button>

                {bannerUrl && (
                  <>
                    <div className="h-3.5 w-[1px] bg-white/20 my-auto" />
                    <button
                      type="button"
                      onClick={startRepositionBanner}
                      className="px-2.5 py-1.5 rounded-full hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                      title={locale === 'vi' ? 'Kéo thả để căn chỉnh vị trí ảnh bìa' : 'Drag to reposition banner'}
                    >
                      <Move className="w-3.5 h-3.5 text-sky-300" />
                      <span>{locale === 'vi' ? 'Căn chỉnh' : 'Reposition'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBannerFit(prev => prev === 'cover' ? 'contain' : 'cover')}
                      className="px-2.5 py-1.5 rounded-full hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                      title={bannerFit === 'cover' ? (locale === 'vi' ? 'Chuyển sang vừa khung (không cắt ảnh)' : 'Switch to fit contain') : (locale === 'vi' ? 'Chuyển sang phóng đầy khung' : 'Switch to cover fill')}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-300" />
                      <span>{bannerFit === 'cover' ? (locale === 'vi' ? 'Vừa khung' : 'Fit') : (locale === 'vi' ? 'Phóng đầy' : 'Fill')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRemoveBanner}
                      className="w-7 h-7 rounded-full hover:bg-rose-600/80 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                      title={locale === 'vi' ? 'Gỡ ảnh bìa (Dùng gradient mặc định)' : 'Remove banner'}
                    >
                      <X className="w-3.5 h-3.5 text-rose-300" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <input
            ref={bannerFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleBannerChange}
            className="hidden"
          />
          
          {/* Top Badges Bar */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:pointer-events-none md:group-hover:pointer-events-auto -translate-y-1 group-hover:translate-y-0 transition-all duration-200">
            <button
              type="button"
              onClick={() => {
                const nextStatusMap: Record<UiPresenceStatus, UiPresenceStatus> = {
                  online: 'focused',
                  focused: 'away',
                  away: 'offline',
                  offline: 'online'
                };
                const current = userStatus || 'online';
                const next = nextStatusMap[current] || 'online';
                setUserStatus(next);
              }}
              className="px-3.5 py-1.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-black/50 hover:bg-black/70 text-white backdrop-blur-xl border border-white/20 shadow-xl flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
              title={locale === 'vi' ? 'Nhấp để chuyển trạng thái hoạt động' : 'Click to change presence status'}
            >
              <span className={`w-2 h-2 rounded-full ${presenceDotClass(accountPresenceStatus, true)}`} />
              <span>{presenceLabel}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyProfileLink}
              className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-xl border border-white/20 shadow-xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
              title={locale === 'vi' ? 'Sao chép liên kết hồ sơ' : 'Copy profile link'}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* User Identity Info Overlay */}
        <div className="px-4 sm:px-6 md:px-8 pb-6 relative flex flex-col md:flex-row items-center md:items-start gap-6">
          
          {/* Avatar Container with Upload Hover */}
          <div className="relative shrink-0 group -mt-14 md:-mt-18 z-10 w-full sm:w-auto flex justify-center">
            <div className="relative rounded-3xl overflow-hidden ring-4 ring-white dark:ring-slate-900 shadow-2xl bg-slate-100 dark:bg-slate-800 isolate">
              <SignedImage 
                filePath={avatar} 
                className="w-28 h-28 md:w-36 md:h-36 object-cover transition-transform duration-300 group-hover:scale-105 rounded-3xl" 
                alt={name} 
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-slate-950/75 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 rounded-3xl flex flex-col items-center justify-center text-white gap-1.5 cursor-pointer"
                aria-label={locale === 'vi' ? 'Thay ảnh đại diện' : 'Change profile photo'}
              >
                <Camera className="w-6 h-6 text-white" />
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full border border-white/30">
                  {locale === 'vi' ? 'Tải ảnh lên' : 'Upload photo'}
                </span>
              </button>
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div
              className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-lg ${presenceDotClass(accountPresenceStatus, true)}`}
              title={accountPresenceStatus}
            />
          </div>

          {/* User Name, Badges & Metadata */}
          <div className="flex-1 text-center md:text-left space-y-2.5 pt-2 md:pt-3">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {name}
              </h1>
              {currentUser.isPremium ? (
                <span className="text-[10px] font-black tracking-widest bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full uppercase shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> PRO
                </span>
              ) : (
                <span className="text-[10px] font-black tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full uppercase font-mono border border-slate-200 dark:border-slate-700">
                  FREE
                </span>
              )}

              {/* Custom Status Quick Pill */}
              <button
                type="button"
                onClick={() => setShowStatusModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer hover:scale-105"
                title={locale === 'vi' ? 'Chỉnh sửa trạng thái tùy chỉnh' : 'Edit custom status'}
              >
                <span>{statusEmoji}</span>
                <span className="truncate max-w-[180px]">{statusMessage || (locale === 'vi' ? 'Đặt trạng thái' : 'Set status')}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                <Briefcase className="w-3.5 h-3.5" />
                {role === 'admin' ? (t('roleAdmin') || 'Admin') : role === 'guest' ? 'Guest' : (t('roleMember') || 'Member')}
              </span>
              {jobTitle && (
                <span className="text-slate-700 dark:text-slate-200 font-semibold">
                  • {jobTitle}
                </span>
              )}
              {department && (
                <span className="text-slate-600 dark:text-slate-300">
                  • {department}
                </span>
              )}
              {location && (
                <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  {location}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-1.5 pt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                {currentUser.email}
              </span>
              {phone && (
                <span className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  {phone}
                </span>
              )}
              {website && (
                <a 
                  href={website.startsWith('http') ? website : `https://${website}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-5 text-sky-500 hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Portfolio</span>
                </a>
              )}
              <span className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-5 text-[11px] text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                {locale === 'vi' ? `Thành viên từ ${memberMe?.joinedDate || '2026'}` : `Member since ${memberMe?.joinedDate || '2026'}`}
              </span>
            </div>
          </div>
        </div>

        {/* ── Tabs Navigation Bar ── */}
        <div className="px-4 sm:px-6 md:px-8 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 flex items-center gap-2 overflow-x-auto custom-scrollbar">
          {[
            { id: 'overview', labelVi: 'Tổng quan & Thông tin', labelEn: 'Overview & Details', icon: UserIcon },
            { id: 'tasks', labelVi: 'Nhiệm vụ & Năng suất', labelEn: 'Tasks & Productivity', icon: Zap, count: myTasks.length },
            { id: 'security', labelVi: 'Bảo mật & Phiên làm việc', labelEn: 'Security & Sessions', icon: KeyRound },
            { id: 'preferences', labelVi: 'Tùy chọn & Thông báo', labelEn: 'Preferences', icon: Bell },
          ].map(tab => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ProfileTab)}
                className={`py-3.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
                  isCurrent
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 font-black'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <span>{locale === 'vi' ? tab.labelVi : tab.labelEn}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    isCurrent ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Tab Contents ── */}
      
      {/* ── TAB 1: OVERVIEW & INFORMATION ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          
          {/* Left Column (5 Cols): Statistics, Skills, Achievements & Tier */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Work Statistics Donut Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm text-left space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    {getText('workStatistics', 'Work Statistics', 'Thống kê công việc')}
                  </h2>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                    {locale === 'vi' ? 'Tổng quan tiến độ nhiệm vụ' : 'Overview of assigned tasks'}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 py-2">
                {/* Donut Chart */}
                <div className="relative w-28 h-28 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statPieData.length > 0 ? statPieData : [{ name: 'Empty', value: 1, color: '#e2e8f0' }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={48}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {(statPieData.length > 0 ? statPieData : [{ name: 'Empty', value: 1, color: '#e2e8f0' }]).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{myTasks.length}</span>
                    <span className="text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black mt-0.5">{t('tasks') || 'Tasks'}</span>
                  </div>
                </div>

                {/* Progress Bar & Rate */}
                <div className="flex-1 space-y-2 w-full">
                  <div className="flex justify-between text-xs font-extrabold text-slate-700 dark:text-slate-200">
                    <span>{getText('completionRate', 'Completion Rate', 'Tỷ lệ hoàn thành')}</span>
                    <span className="text-emerald-500 font-mono font-bold">{completionRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-500" 
                      style={{ width: `${completionRate}%` }} 
                    />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                    {completedTasks.length} / {myTasks.length} {locale === 'vi' ? 'nhiệm vụ hoàn thành' : 'tasks completed'}
                  </p>
                </div>
              </div>

              {/* Detailed Status Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left">
                  <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 block flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {locale === 'vi' ? 'Đang làm' : 'In Progress'}
                  </span>
                  <span className="text-base font-black text-slate-900 dark:text-white mt-1 block">
                    {inProgressTasksCount}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-left">
                  <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400 block flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    {locale === 'vi' ? 'Đang duyệt' : 'In Review'}
                  </span>
                  <span className="text-base font-black text-slate-900 dark:text-white mt-1 block">
                    {reviewTasksCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Skills & Expertise Tag Cloud */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm text-left space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    {getText('skillsAndExpertise', 'Skills & Expertise', 'Kỹ năng & Chuyên môn')}
                  </h2>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-wider mt-0.5">
                    {locale === 'vi' ? 'Gắn thẻ các thế mạnh chuyên môn' : 'Tag your technical strengths'}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Star className="w-4 h-4" />
                </div>
              </div>

              {/* Tag List */}
              <div className="flex flex-wrap gap-2 py-1 min-h-[44px]">
                {skills.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">{locale === 'vi' ? 'Chưa thêm kỹ năng nào.' : 'No skills tagged yet.'}</p>
                ) : (
                  skills.map(skill => (
                    <span 
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs"
                    >
                      <span>{skill}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveSkill(skill)}
                        className="p-0.5 hover:bg-indigo-200/60 dark:hover:bg-indigo-900/60 rounded-md text-indigo-500 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Quick Suggestions */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SKILL_SUGGESTIONS.filter(s => !skills.includes(s)).slice(0, 4).map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      if (!skills.includes(suggestion) && skills.length < 20) {
                        setSkills(prev => [...prev, suggestion]);
                      }
                    }}
                    className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 transition-all cursor-pointer"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>

              {/* Add Skill Form */}
              <form onSubmit={handleAddSkill} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  placeholder={locale === 'vi' ? 'Thêm kỹ năng mới...' : 'Add a skill...'}
                  className="flex-1 text-xs font-bold px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                />
                <button 
                  type="submit"
                  className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-sm transition-all cursor-pointer flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Achievements & Badges */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm text-left space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    {locale === 'vi' ? 'Huy hiệu thành tích' : 'Badges & Milestones'}
                  </h2>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                    {locale === 'vi' ? 'Các mốc vinh danh hoạt động' : 'Milestone recognitions'}
                  </p>
                </div>
                <Award className="w-4 h-4 text-amber-500" />
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500 shrink-0">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">{locale === 'vi' ? 'Nhiệt huyết' : 'Energetic'}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{locale === 'vi' ? 'Hoạt động liên tục' : 'Active contributor'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500 shrink-0">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">{locale === 'vi' ? 'Đúng hạn' : 'On-Time'}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{completionRate >= 80 ? '90%+ SLA' : 'Tiến độ tốt'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Tier Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm text-left space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    {locale === 'vi' ? 'Gói tài khoản' : 'Account Tier'}
                  </span>
                  <span className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    {currentUser.isPremium ? 'Apexa Premium Pro' : (locale === 'vi' ? 'Gói Miễn Phí (Free Tier)' : 'Free Tier')}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                {currentUser.isPremium 
                  ? (locale === 'vi' ? 'Đã kích hoạt toàn bộ công cụ AI thông minh, Gantt chart, whiteboards không giới hạn.' : 'Full access to smart AI tools, Gantt charts, and unlimited whiteboards.')
                  : (locale === 'vi' ? 'Nâng cấp để mở khóa trợ lý AI thông minh, sơ đồ Gantt và tính năng làm việc nhóm cao cấp.' : 'Upgrade to unlock AI Copilot, Gantt chart timelines, and advanced team features.')}
              </p>

              <button
                type="button"
                onClick={() => {
                  if ((window as any).showPremiumModal) {
                    (window as any).showPremiumModal();
                  } else if (triggerToast) {
                    triggerToast('info', locale === 'vi' ? 'Nâng cấp tài khoản' : 'Upgrade Account', locale === 'vi' ? 'Vui lòng chọn gói đăng ký để tiếp tục.' : 'Please choose a plan to proceed.');
                  }
                }}
                className={`w-full py-3 rounded-2xl text-xs font-black tracking-wide text-center transition-all cursor-pointer shadow-sm ${
                  currentUser.isPremium
                    ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                    : 'text-white bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:brightness-110 shadow-amber-500/20'
                }`}
              >
                {currentUser.isPremium 
                  ? (locale === 'vi' ? 'Quản lý gói đăng ký' : 'Manage Subscription') 
                  : (locale === 'vi' ? 'Nâng cấp Pro Ngay ✨' : 'Upgrade to Pro Now ✨')}
              </button>
            </div>

          </div>

          {/* Right Column (7 Cols): Comprehensive Information Form */}
          <div className="lg:col-span-7">
            <form 
              onSubmit={handleSaveProfile} 
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-8 rounded-3xl shadow-sm space-y-6 flex flex-col justify-between"
            >
              <div className="space-y-6">
                
                {/* Card Header & Profile Completeness */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 text-left">
                  <div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      {getText('personalInfo', 'Personal Information', 'Thông tin cá nhân')}
                    </h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
                      {getText('editProfileInfo', 'Manage and edit your public profile details', 'Quản lý và chỉnh sửa chi tiết hồ sơ cá nhân')}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block text-right">
                      <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">
                        {locale === 'vi' ? 'Hoàn thiện hồ sơ' : 'Profile completeness'}
                      </span>
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                        {profileCompleteness}%
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                      <UserIcon className="w-5 h-5 shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Completeness Bar */}
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-300" 
                    style={{ width: `${profileCompleteness}%` }} 
                  />
                </div>

                {/* Form Input Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
                  
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{getText('fullName', 'Full Name', 'Họ và tên')}</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      maxLength={80}
                      className="w-full text-xs font-bold p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                      placeholder={locale === 'vi' ? 'Nhập họ và tên...' : 'Enter your full name...'}
                      required
                    />
                  </div>

                  {/* Job Title / Profession */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{locale === 'vi' ? 'Chức danh / Nghề nghiệp' : 'Job Title / Profession'}</span>
                    </label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      maxLength={80}
                      className="w-full text-xs font-bold p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                      placeholder={locale === 'vi' ? 'Ví dụ: Senior Product Designer...' : 'e.g. Senior Product Designer...'}
                    />
                  </div>

                  {/* Department */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{getText('department', 'Department', 'Phòng ban')}</span>
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      maxLength={80}
                      className="w-full text-xs font-bold p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                      placeholder={locale === 'vi' ? 'Ví dụ: Khối Công nghệ & Sản phẩm...' : 'e.g. Engineering & Product...'}
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{getText('phoneNumber', 'Phone Number', 'Số điện thoại')}</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                      maxLength={24}
                      className="w-full text-xs font-bold p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                      placeholder={locale === 'vi' ? 'Nhập số điện thoại...' : 'Enter phone number...'}
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{locale === 'vi' ? 'Địa điểm làm việc' : 'Location / City'}</span>
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      maxLength={80}
                      className="w-full text-xs font-bold p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                      placeholder={locale === 'vi' ? 'Ví dụ: Hà Nội, Việt Nam...' : 'e.g. Hanoi, Vietnam...'}
                    />
                  </div>

                  {/* Portfolio / Website */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Website / Portfolio</span>
                    </label>
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full text-xs font-bold p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                      placeholder="https://..."
                    />
                  </div>

                  {/* Social Handles */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-indigo-500 fill-current" viewBox="0 0 24 24">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                      </svg>
                      <span>GitHub Username</span>
                    </label>
                    <input
                      type="text"
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      className="w-full text-xs font-bold p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                      placeholder="username"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-indigo-500 fill-current" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                      <span>LinkedIn Profile</span>
                    </label>
                    <input
                      type="text"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      className="w-full text-xs font-bold p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                      placeholder="linkedin.com/in/..."
                    />
                  </div>

                </div>

                {/* Short Bio TextArea */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{getText('shortBio', 'Short Bio', 'Tiểu sử giới thiệu')}</span>
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={500}
                    rows={4}
                    className="w-full text-xs font-medium p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 resize-none transition-all leading-relaxed"
                    placeholder={locale === 'vi' ? 'Mô tả bản thân, kinh nghiệm và trách nhiệm chính...' : 'Introduce yourself and your responsibilities...'}
                  />
                  <div className="flex justify-end text-[10px] font-bold text-slate-400">
                    <span>{bio.length} / 500</span>
                  </div>
                </div>

                {formError && (
                  <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Readonly Account Email Banner */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-left flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{locale === 'vi' ? 'Email tài khoản (Cố định)' : 'Account Email (Read-only)'}</span>
                    </span>
                    <p className="text-xs font-mono text-slate-700 dark:text-slate-200 font-bold pt-1">
                      {currentUser.email}
                    </p>
                  </div>
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Bottom Action Button Bar */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-5 mt-6">
                <div>
                  {saveStatus === 'saved' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{locale === 'vi' ? 'Đã lưu tất cả thay đổi' : 'All changes saved'}</span>
                    </span>
                  )}
                  {saveStatus === 'dirty' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>{locale === 'vi' ? 'Có thay đổi chưa lưu' : 'Unsaved changes'}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {saveStatus === 'dirty' && (
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>{locale === 'vi' ? 'Hoàn tác' : 'Reset'}</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saveStatus !== 'dirty' || !name.trim()}
                    className={`px-6 py-3 rounded-2xl text-xs font-black tracking-wide shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed ${
                      saveStatus === 'saved'
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 opacity-70'
                        : saveStatus === 'saving'
                        ? 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400 opacity-80 animate-pulse'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-blue-500/20 hover:shadow-md'
                    }`}
                  >
                    {saveStatus === 'saving' ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>{locale === 'vi' ? 'Đang lưu...' : 'Saving...'}</span>
                      </>
                    ) : saveStatus === 'saved' ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>{locale === 'vi' ? 'Đã lưu thành công' : 'Saved'}</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{locale === 'vi' ? 'Lưu hồ sơ cá nhân' : 'Save Profile'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* ── TAB 2: TASKS & PRODUCTIVITY ── */}
      {activeTab === 'tasks' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-8 rounded-3xl shadow-sm text-left space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {locale === 'vi' ? 'Nhiệm vụ được giao của bạn' : 'Your Assigned Tasks'}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {locale === 'vi' ? `Bạn đang phụ trách ${myTasks.length} nhiệm vụ trong các workspace` : `Managing ${myTasks.length} tasks across workspaces`}
              </p>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  placeholder={locale === 'vi' ? 'Tìm nhiệm vụ...' : 'Search tasks...'}
                  className="pl-8 pr-3 py-1.5 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800">
                {[
                  { id: 'all', labelVi: 'Tất cả', labelEn: 'All' },
                  { id: 'inprogress', labelVi: 'Đang làm', labelEn: 'In Progress' },
                  { id: 'todo', labelVi: 'Cần làm', labelEn: 'To Do' },
                  { id: 'review', labelVi: 'Đang duyệt', labelEn: 'Review' },
                  { id: 'completed', labelVi: 'Đã xong', labelEn: 'Done' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTaskFilterStatus(item.id as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      taskFilterStatus === item.id 
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {locale === 'vi' ? item.labelVi : item.labelEn}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Task Card List */}
          <div className="space-y-3">
            {filteredMyTasks.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {locale === 'vi' ? 'Không có nhiệm vụ nào phù hợp với bộ lọc.' : 'No tasks match the selected filter.'}
                </p>
              </div>
            ) : (
              filteredMyTasks.map(task => {
                const isCompleted = task.status === 'completed';
                const statusMeta = {
                  todo: { label: 'Cần làm', cls: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
                  inprogress: { label: 'Đang làm', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
                  review: { label: 'Đang duyệt', cls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
                  completed: { label: 'Hoàn thành', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
                }[task.status] || { label: task.status, cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };

                const priorityMeta = {
                  urgent: { label: 'Khẩn cấp', cls: 'text-rose-500 bg-rose-500/10' },
                  high: { label: 'Cao', cls: 'text-orange-500 bg-orange-500/10' },
                  medium: { label: 'Trung bình', cls: 'text-amber-500 bg-amber-500/10' },
                  low: { label: 'Thấp', cls: 'text-slate-400 bg-slate-500/10' },
                }[task.priority] || { label: 'Thường', cls: 'text-slate-400 bg-slate-500/10' };

                return (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask?.(task)}
                    className="p-4 rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 dark:bg-slate-950/60 dark:hover:bg-slate-950 border border-slate-200/70 dark:border-slate-800 transition-all flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${isCompleted ? 'bg-emerald-500/15 text-emerald-500' : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500'}`}>
                        {isCompleted ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className={`text-xs font-bold truncate ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400 font-medium">
                          {task.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(task.dueDate).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                            </span>
                          )}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <span>
                              • {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length} {locale === 'vi' ? 'mục phụ' : 'subtasks'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${priorityMeta.cls}`}>
                        {priorityMeta.label}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold border ${statusMeta.cls}`}>
                        {statusMeta.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: SECURITY & SESSIONS ── */}
      {activeTab === 'security' && (
        <div className="space-y-6 text-left animate-fade-in">

          {/* 🛡️ TWO-FACTOR AUTHENTICATION (2FA / TOTP) CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-8 rounded-3xl shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-sky-400" />
                  <span>{locale === 'vi' ? 'Xác thực 2 yếu tố (2FA Authenticator)' : 'Two-Factor Authentication (2FA)'}</span>
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {locale === 'vi' 
                    ? 'Tùy chọn tăng cường bảo mật tài khoản cá nhân bằng mã OTP từ Google Authenticator, Microsoft Authenticator, 1Password hoặc Apple Keychain.' 
                    : 'Optional personal account protection using TOTP OTP codes from your favorite Authenticator app.'}
                </p>
              </div>

              {/* Status Badge */}
              <div>
                {mfaFactors.some(f => f.status === 'verified') ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-black border border-emerald-200 dark:border-emerald-800/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {locale === 'vi' ? 'Đang bật bảo vệ' : 'Active & Protected'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold border border-slate-200 dark:border-slate-700">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    {locale === 'vi' ? 'Chưa kích hoạt (Tùy chọn)' : 'Disabled (Optional)'}
                  </span>
                )}
              </div>
            </div>

            {/* MFA Content State 1: Active Enrollment Modal / Flow */}
            {mfaEnrollment ? (
              <div className="p-5 rounded-2xl bg-blue-50/50 dark:bg-sky-950/20 border border-blue-200/80 dark:border-sky-800/60 space-y-5">
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {locale === 'vi' ? 'Thiết lập 2FA Authenticator' : 'Set Up 2FA Authenticator'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {locale === 'vi' 
                      ? 'Dùng ứng dụng Authenticator trên điện thoại để quét mã QR hoặc nhập khóa bí mật thủ công.' 
                      : 'Use an authenticator app on your phone to scan this QR code or enter the secret key manually.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 items-center">
                  {/* QR Code Container */}
                  <div className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                    <img 
                      src={mfaEnrollment.qrCode} 
                      alt="Apexa 2FA QR Code" 
                      className="w-44 h-44 object-contain select-none" 
                    />
                    <span className="text-[10px] text-slate-400 font-semibold mt-1">
                      {locale === 'vi' ? 'Quét bằng camera ứng dụng' : 'Scan in Authenticator'}
                    </span>
                  </div>

                  {/* Manual Code & 6-digit input */}
                  <div className="space-y-4">
                    <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                          {locale === 'vi' ? 'Khóa thiết lập thủ công (Secret Key)' : 'Manual Setup Secret'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(mfaEnrollment.secret);
                            setCopiedSecret(true);
                            triggerToast?.('info', locale === 'vi' ? 'Đã sao chép khóa bí mật' : 'Secret copied', mfaEnrollment.secret);
                            setTimeout(() => setCopiedSecret(false), 2500);
                          }}
                          className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedSecret ? (locale === 'vi' ? 'Đã sao chép' : 'Copied') : (locale === 'vi' ? 'Sao chép' : 'Copy')}</span>
                        </button>
                      </div>
                      <code className="block text-xs font-mono font-bold text-slate-800 dark:text-slate-200 break-all select-all bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800/60">
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
                        className="w-full max-w-xs text-center text-lg font-black tracking-[0.35em] p-2.5 bg-white dark:bg-slate-950 rounded-xl border border-blue-400 dark:border-sky-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white"
                      />
                    </div>

                    {mfaError && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{mfaError}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={verifyMfaEnrollment}
                        disabled={mfaBusy || mfaCode.length !== 6}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {mfaBusy ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        <span>{mfaBusy ? (locale === 'vi' ? 'Đang xác minh...' : 'Verifying...') : (locale === 'vi' ? 'Xác minh & Kích hoạt 2FA' : 'Verify & Enable 2FA')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={cancelMfaEnrollment}
                        disabled={mfaBusy}
                        className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                      >
                        {locale === 'vi' ? 'Hủy' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : mfaFactors.some(f => f.status === 'verified') ? (
              /* MFA Content State 2: Active Factors */
              <div className="space-y-4">
                {mfaFactors.filter(f => f.status === 'verified').map(factor => (
                  <div 
                    key={factor.id} 
                    className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {factor.friendly_name || 'Apexa Authenticator'}
                          </span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            TOTP
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          {locale === 'vi' 
                            ? `Đang bảo vệ tài khoản ${currentUser.email} với mã xác thực 30 giây.` 
                            : `Protecting ${currentUser.email} with 30-second time-based OTP.`}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeMfaFactor(factor.id)}
                      disabled={mfaBusy}
                      className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 self-start sm:self-center"
                    >
                      {mfaBusy ? (locale === 'vi' ? 'Đang xử lý...' : 'Removing...') : (locale === 'vi' ? 'Tắt / Gỡ 2FA' : 'Remove 2FA')}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              /* MFA Content State 3: Disabled / Opt-in CTA */
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400 rounded-xl shrink-0 mt-0.5">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      {locale === 'vi' ? 'Bảo vệ tài khoản bằng Authenticator' : 'Protect Account with Authenticator'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-xl">
                      {locale === 'vi' 
                        ? 'Khi kích hoạt, mỗi lần đăng nhập bạn sẽ được yêu cầu mã OTP 6 số từ ứng dụng trên điện thoại, ngăn chặn truy cập trái phép ngay cả khi lộ mật khẩu.' 
                        : 'When enabled, signing in will require a 6-digit OTP from your phone authenticator app, preventing unauthorized access even if your password is leaked.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startMfaEnrollment}
                  disabled={mfaBusy}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{locale === 'vi' ? 'Kích hoạt 2FA Authenticator' : 'Enable 2FA Authenticator'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column (6 Cols): Change Password Form */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-8 rounded-3xl shadow-sm text-left space-y-6">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-500" />
                  <span>{locale === 'vi' ? 'Đổi mật khẩu tài khoản' : 'Change Account Password'}</span>
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {locale === 'vi' ? 'Bảo vệ tài khoản bằng mật khẩu mạnh kết hợp chữ hoa, chữ thường và số.' : 'Keep your account secure with a strong password.'}
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                    {locale === 'vi' ? 'Mật khẩu hiện tại (Nếu có)' : 'Current Password'}
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full text-xs font-bold p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                    {locale === 'vi' ? 'Mật khẩu mới' : 'New Password'}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={locale === 'vi' ? 'Tối thiểu 10 ký tự...' : 'Minimum 10 characters...'}
                    required
                    className="w-full text-xs font-bold p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                    {locale === 'vi' ? 'Xác nhận mật khẩu mới' : 'Confirm New Password'}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={locale === 'vi' ? 'Nhập lại mật khẩu mới...' : 'Re-enter new password...'}
                    required
                    className="w-full text-xs font-bold p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                  />
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
                  className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUpdatingPassword ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>{isUpdatingPassword ? (locale === 'vi' ? 'Đang cập nhật...' : 'Updating...') : (locale === 'vi' ? 'Cập nhật mật khẩu' : 'Update Password')}</span>
                </button>
              </form>
            </div>

            {/* Right Column (6 Cols): Active Sessions & Data Export */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Active Sessions Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-8 rounded-3xl shadow-sm text-left space-y-5">
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-500" />
                    <span>{locale === 'vi' ? 'Phiên đăng nhập & Thiết bị' : 'Active Sessions & Devices'}</span>
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {locale === 'vi' ? 'Danh sách các thiết bị đang duy trì quyền truy cập vào tài khoản.' : 'Devices currently logged into your account.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-500">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-white block">
                        {typeof window !== 'undefined' ? (window.navigator.userAgent.includes('Windows') ? 'Windows PC' : window.navigator.userAgent.includes('Mac') ? 'Mac OS' : 'Trình duyệt Web') : 'Thiết bị hiện tại'}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {locale === 'vi' ? 'Phiên làm việc hiện tại (Online)' : 'Current active session (Online)'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRevokeSessions}
                  disabled={isRevokingSessions}
                  className="w-full py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isRevokingSessions ? <RotateCcw className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  <span>{locale === 'vi' ? 'Đăng xuất khỏi tất cả thiết bị khác' : 'Sign out of other devices'}</span>
                </button>
              </div>

              {/* Export Personal Data Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-8 rounded-3xl shadow-sm text-left space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Download className="w-4 h-4 text-sky-500" />
                      <span>{locale === 'vi' ? 'Dữ liệu hồ sơ' : 'Profile Data Export'}</span>
                    </h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {locale === 'vi' ? 'Tải xuống toàn bộ dữ liệu hồ sơ cá nhân định dạng JSON chuẩn.' : 'Download your profile metadata and task metrics in JSON format.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExportProfileJson}
                  className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>{locale === 'vi' ? 'Tải tệp sao lưu dữ liệu (.json)' : 'Download Backup Data (.json)'}</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ── TAB 4: PREFERENCES & NOTIFICATIONS ── */}
      {activeTab === 'preferences' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-8 rounded-3xl shadow-sm text-left space-y-6 animate-fade-in max-w-3xl">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-500" />
              <span>{locale === 'vi' ? 'Tùy chọn thông báo & Trải nghiệm' : 'Preferences & Notifications'}</span>
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {locale === 'vi' ? 'Tùy chỉnh ngôn ngữ và các kênh nhận thông báo quan trọng.' : 'Customize notification triggers and display language.'}
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {/* Language Preference */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-indigo-500" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {locale === 'vi' ? 'Ngôn ngữ giao diện' : 'Interface Language'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {locale === 'vi' ? 'Hiện tại: Tiếng Việt' : 'Current: English'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLocale('vi')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    locale === 'vi' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:text-slate-300'
                  }`}
                >
                  🇻🇳 Tiếng Việt
                </button>
                <button
                  type="button"
                  onClick={() => setLocale('en')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    locale === 'en' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:text-slate-300'
                  }`}
                >
                  🇺🇸 English
                </button>
              </div>
            </div>

            {/* Notification Toggles */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-sky-500" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {locale === 'vi' ? 'Email thông báo nhiệm vụ mới' : 'Email notifications for assigned tasks'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {locale === 'vi' ? 'Gửi email khi bạn được phân công làm người phụ trách' : 'Receive an email when assigned to a task'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyEmailTasks}
                onChange={(e) => setNotifyEmailTasks(e.target.checked)}
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-purple-500" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {locale === 'vi' ? 'Thông báo khi được nhắc tên (@mention)' : 'Mention notifications'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {locale === 'vi' ? 'Nhận thông báo đẩy khi đồng đội nhắc tên bạn trong bình luận' : 'Push alerts when mentioned in chat or comments'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyMentions}
                onChange={(e) => setNotifyMentions(e.target.checked)}
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-emerald-500" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {locale === 'vi' ? 'Âm thanh thông báo hệ thống' : 'System sound effects'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {locale === 'vi' ? 'Phát âm thanh nhẹ khi hoàn thành công việc hoặc nhận tin nhắn' : 'Play audio cue on task completion and messages'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifySound}
                onChange={(e) => setNotifySound(e.target.checked)}
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {locale === 'vi' ? 'Báo cáo tổng kết năng suất hàng tuần' : 'Weekly Productivity Digest'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {locale === 'vi' ? 'Nhận bản tin AI tóm tắt hiệu suất làm việc vào sáng thứ Hai' : 'Receive an AI summary of work highlights every Monday'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyWeeklyDigest}
                onChange={(e) => setNotifyWeeklyDigest(e.target.checked)}
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Custom Status Editor Modal ── */}
      <AnimatePresence>
        {showStatusModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-left space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smile className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {locale === 'vi' ? 'Đặt trạng thái tùy chỉnh' : 'Set Custom Status'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={statusEmoji}
                  onChange={(e) => setStatusEmoji(e.target.value)}
                  className="w-12 h-12 text-center text-xl bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <input
                  type="text"
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  placeholder={locale === 'vi' ? 'Bạn đang làm gì?...' : 'What are you working on?...'}
                  maxLength={60}
                  className="flex-1 text-xs font-bold px-4 py-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Presets */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  {locale === 'vi' ? 'Gợi ý trạng thái nhanh' : 'Quick Presets'}
                </span>
                <div className="space-y-1 pt-1">
                  {STATUS_PRESETS.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setStatusEmoji(preset.emoji);
                        setStatusMessage(locale === 'vi' ? preset.textVi : preset.textEn);
                      }}
                      className="w-full p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <span className="text-base">{preset.emoji}</span>
                      <span>{locale === 'vi' ? preset.textVi : preset.textEn}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setStatusEmoji('💬');
                    setStatusMessage('');
                  }}
                  className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                >
                  {locale === 'vi' ? 'Xóa trạng thái' : 'Clear status'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowStatusModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {locale === 'vi' ? 'Hủy' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveStatus}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer"
                  >
                    {locale === 'vi' ? 'Lưu trạng thái' : 'Save Status'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 4. Floating Unsaved Changes Sticky Notification Bar ── */}
      <AnimatePresence>
        {saveStatus === 'dirty' && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-5 py-3 rounded-2xl bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 shadow-2xl backdrop-blur-xl border border-slate-800 dark:border-slate-200"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-bold">
                {locale === 'vi' ? 'Bạn có thay đổi chưa lưu trong hồ sơ!' : 'You have unsaved changes in profile!'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white dark:text-slate-600 dark:hover:text-slate-900 transition-colors cursor-pointer"
              >
                {locale === 'vi' ? 'Hủy' : 'Reset'}
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="px-4 py-1.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{locale === 'vi' ? 'Lưu ngay' : 'Save Changes'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

const MemoizedProfilePage = React.memo(ProfilePage);
export default MemoizedProfilePage;
export { ProfilePage };
