"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from '../contexts/TranslationContext';
import { motion, AnimatePresence } from 'motion/react';
import { User, Task } from '../types';
import { supabase } from '../lib/supabaseClient';
import { uiStatusToPresence, UiPresenceStatus } from '../lib/presence';
import { formatAuthError } from '../lib/authError';
import { useUiStore } from '@/store/uiStore';
import { fireMilestoneConfetti } from '../lib/confetti';
import { Save } from 'lucide-react';

// Subcomponents
import { ProfileTab } from './profile/types';
import { ProfileHeader } from './profile/ProfileHeader';
import { ProfileOverviewTab } from './profile/ProfileOverviewTab';
import { ProfileTasksTab } from './profile/ProfileTasksTab';
import { ProfileSecurityTab } from './profile/ProfileSecurityTab';
import { ProfilePreferencesTab } from './profile/ProfilePreferencesTab';
import { ProfileStatusModal } from './profile/ProfileStatusModal';

export interface ProfilePageProps {
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
  onSelectTask,
}: ProfilePageProps) {
  const { t, locale, setLocale } = useTranslation();
  const userStatus = useUiStore((s) => s.userStatus);
  const setUserStatus = useUiStore((s) => s.setUserStatus);

  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  const memberMe = useMemo(
    () =>
      members.find(
        (member) =>
          member.id === 'user' ||
          (member.email && currentUser?.email && member.email.toLowerCase() === currentUser.email.toLowerCase()) ||
          (currentUser?.id && member.id === currentUser.id)
      ),
    [members, currentUser?.email, currentUser?.id]
  );

  const accountPresenceStatus = isOffline
    ? 'offline'
    : userStatus
    ? uiStatusToPresence(userStatus)
    : memberMe?.status || 'online';

  const presenceLabel = {
    online: locale === 'vi' ? 'Đang hoạt động' : 'Online',
    busy: locale === 'vi' ? 'Đang bận' : 'Busy',
    away: locale === 'vi' ? 'Vắng mặt' : 'Away',
    offline: locale === 'vi' ? 'Ngoại tuyến' : 'Offline',
  }[accountPresenceStatus] || (locale === 'vi' ? 'Ngoại tuyến' : 'Offline');

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
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
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
    bio: '', skills: [] as string[],
  });
  const initializedIdentityRef = useRef('');

  // Load profile data on mount or user switch
  useEffect(() => {
    const profileSourceKey = `${currentUser.email}:${memberMe?.id || 'pending'}`;
    if (initializedIdentityRef.current === profileSourceKey) return;
    initializedIdentityRef.current = profileSourceKey;

    setName(currentUser.name);
    setAvatar(currentUser.avatar);
    const loadedBanner =
      memberMe?.bannerUrl ||
      memberMe?.coverUrl ||
      (typeof window !== 'undefined' ? localStorage.getItem('apexa_user_banner') || '' : '') ||
      '';
    setBannerUrl(loadedBanner);

    try {
      const savedBannerPos =
        localStorage.getItem(memberMe?.id ? `apexa_user_banner_pos_${memberMe.id}` : 'apexa_user_banner_pos') ||
        localStorage.getItem('apexa_user_banner_pos');
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

    let loadedLocation = '';
    let loadedJobTitle = '';
    let loadedWebsite = '';
    let loadedGithub = '';
    let loadedLinkedin = '';
    let loadedTwitter = '';

    try {
      const savedSkills = localStorage.getItem('apexa_user_skills');
      const parsedSkills = savedSkills ? JSON.parse(savedSkills) : null;
      if (Array.isArray(parsedSkills)) loadedSkills = parsedSkills.filter((item) => typeof item === 'string');

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
  const myTasks = useMemo(
    () => tasks.filter((t) => t.assigneeId === 'user' || (t.assigneeIds && t.assigneeIds.includes('user'))),
    [tasks]
  );
  const completedTasks = useMemo(() => myTasks.filter((t) => t.status === 'completed'), [myTasks]);
  const inProgressTasksCount = useMemo(() => myTasks.filter((t) => t.status === 'inprogress').length, [myTasks]);
  const reviewTasksCount = useMemo(() => myTasks.filter((t) => t.status === 'review').length, [myTasks]);
  const todoTasksCount = useMemo(() => myTasks.filter((t) => t.status === 'todo').length, [myTasks]);

  const completionRate = myTasks.length > 0 ? Math.round((completedTasks.length / myTasks.length) * 100) : 0;
  const hasOverdueTasks = useMemo(() => {
    const now = Date.now();
    return myTasks.some((t) => t.dueDate && t.status !== 'completed' && new Date(t.dueDate).getTime() < now);
  }, [myTasks]);

  const profileCompleteness = Math.round(
    ([
      name.trim(),
      avatar,
      phone.trim(),
      department.trim(),
      bio.trim(),
      location.trim(),
      jobTitle.trim(),
      website.trim() || github.trim() || linkedin.trim(),
      skills.length > 0,
    ].filter(Boolean).length /
      9) *
      100
  );

  // Filtered tasks for Tasks tab
  const filteredMyTasks = useMemo(() => {
    return myTasks.filter((task) => {
      const matchesStatus = taskFilterStatus === 'all' || task.status === taskFilterStatus;
      const matchesSearch = !taskSearchQuery.trim() || task.title.toLowerCase().includes(taskSearchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [myTasks, taskFilterStatus, taskSearchQuery]);

  // Avatar upload
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

        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

        setAvatar(publicUrl);
        triggerToast?.('success', locale === 'vi' ? 'Tải ảnh hoàn tất 📸' : 'Avatar updated', locale === 'vi' ? 'Ảnh đại diện đã được cập nhật thành công.' : 'Profile photo successfully uploaded.');
      } catch (err: any) {
        console.error('Lỗi khi tải ảnh đại diện lên Supabase:', err);
        triggerToast?.('error', locale === 'vi' ? 'Lỗi tải ảnh ⚠️' : 'Upload error', err.message || 'Không thể đồng bộ ảnh đại diện.');
      }
    }
  };

  // Banner upload
  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      triggerToast?.('error', locale === 'vi' ? 'Lỗi chọn tệp' : 'File error', locale === 'vi' ? 'Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP).' : 'Please select a valid image file.');
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

  const handleSelectBannerPreset = (presetGradient: string) => {
    setBannerUrl(presetGradient);
    localStorage.setItem('apexa_user_banner', presetGradient);
    if (memberMe?.id) {
      localStorage.setItem(`apexa_user_banner_${memberMe.id}`, presetGradient);
    }
    triggerToast?.('success', locale === 'vi' ? 'Đã chọn ảnh bìa Gradient 🎨' : 'Gradient banner selected', locale === 'vi' ? 'Đã áp dụng mẫu gradient mới cho hồ sơ.' : 'New artwork banner applied.');
    setSaveStatus('dirty');
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

  // Banner repositioning
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

  const handleBannerMouseUp = () => {
    setIsDraggingBanner(false);
    dragStartRef.current = null;
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

  // Profile validation & save
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
      role: role,
    };

    const sessionObj = {
      user: updatedUser,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
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
      joinedDate: myJoinedDate,
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
        setMembers((prev) => prev.map((m) => (m.id === updatedMemberObj.id ? updatedMemberObj : m)));
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
            avatar_url: updatedUser.avatar,
            picture: updatedUser.avatar,
            bio: bio.trim(),
            joinedDate: myJoinedDate,
            skills,
            ...extendedMeta,
          },
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
    localStorage.setItem('avaxa_session', JSON.stringify(sessionObj));
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
      skills: skills,
    };

    setSaveStatus('saved');

    // Confetti celebration if 100% complete
    if (profileCompleteness >= 100) {
      fireMilestoneConfetti();
    }

    return true;
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const ok = await triggerSave();
    if (ok) {
      triggerToast?.('success', locale === 'vi' ? 'Cập nhật thành công 🚀' : 'Profile updated', locale === 'vi' ? 'Thông tin hồ sơ cá nhân đã được lưu trữ an toàn.' : 'Your profile details have been saved securely.');
    }
  };

  const handleSaveProfileRef = useRef(handleSaveProfile);
  useEffect(() => {
    handleSaveProfileRef.current = handleSaveProfile;
  });

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (saveStatus === 'dirty') {
          void handleSaveProfileRef.current();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveStatus]);

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

  // Password update
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

  // Revoke sessions
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

  // 2FA TOTP handlers
  const loadMfaState = useCallback(async () => {
    try {
      const { data: factorData, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setMfaFactors(
        (factorData?.totp || []).map((factor) => ({
          id: factor.id,
          friendly_name: factor.friendly_name,
          status: factor.status,
          created_at: factor.created_at,
        }))
      );
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
      await Promise.all(mfaFactors.filter((factor) => factor.status !== 'verified').map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id })));
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Costack Authenticator' });
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

  // Custom status
  const handleSaveStatus = (emoji: string, msg: string) => {
    setStatusEmoji(emoji);
    setStatusMessage(msg);
    if (memberMe) {
      const updated = {
        ...memberMe,
        statusEmoji: emoji,
        statusMessage: msg,
      };
      if (onUpdateMember) onUpdateMember(updated);
      else setMembers((prev) => prev.map((m) => (m.id === memberMe.id ? updated : m)));
    }
    triggerToast?.('success', locale === 'vi' ? 'Đã cập nhật trạng thái' : 'Status updated', `${emoji} ${msg || (locale === 'vi' ? 'Đang hoạt động' : 'Active')}`);
  };

  // Export JSON
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
    link.download = `costack_profile_${currentUser.email.split('@')[0]}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    triggerToast?.('success', locale === 'vi' ? 'Đã xuất dữ liệu' : 'Data exported', locale === 'vi' ? 'Tệp dữ liệu hồ sơ cá nhân đã được tải xuống.' : 'Profile data file downloaded.');
  };

  const cyclePresenceStatus = () => {
    const nextStatusMap: Record<UiPresenceStatus, UiPresenceStatus> = {
      online: 'focused',
      focused: 'away',
      away: 'offline',
      offline: 'online',
    };
    const current = userStatus || 'online';
    const next = nextStatusMap[current] || 'online';
    setUserStatus(next);
  };

  return (
    <div className="w-full max-w-[1540px] mx-auto font-sans text-left pb-24 text-slate-800 dark:text-slate-100 select-none space-y-6">
      
      {/* ── 1. Hero Header Banner Card ── */}
      <ProfileHeader
        name={name}
        avatar={avatar}
        role={role}
        isPremium={currentUser.isPremium}
        email={currentUser.email}
        jobTitle={jobTitle}
        department={department}
        location={location}
        phone={phone}
        website={website}
        joinedDate={memberMe?.joinedDate || '2026'}
        bannerUrl={bannerUrl}
        bannerPosition={bannerPosition}
        bannerFit={bannerFit}
        accountPresenceStatus={accountPresenceStatus}
        presenceLabel={presenceLabel}
        statusEmoji={statusEmoji}
        statusMessage={statusMessage}
        profileCompleteness={profileCompleteness}
        activeTab={activeTab}
        tasksCount={myTasks.length}
        locale={locale}
        isUploadingBanner={isUploadingBanner}
        isRepositioningBanner={isRepositioningBanner}
        isDraggingBanner={isDraggingBanner}
        onTabChange={setActiveTab}
        onAvatarUploadClick={() => avatarFileInputRef.current?.click()}
        onBannerUploadClick={() => bannerFileInputRef.current?.click()}
        onStatusClick={() => setShowStatusModal(true)}
        onCyclePresence={cyclePresenceStatus}
        onCopyProfileLink={handleCopyProfileLink}
        onSelectBannerPreset={handleSelectBannerPreset}
        onStartReposition={startRepositionBanner}
        onSaveReposition={saveBannerPosition}
        onResetRepositionCenter={resetBannerCenter}
        onCancelReposition={cancelRepositionBanner}
        onToggleBannerFit={() => setBannerFit((prev) => (prev === 'cover' ? 'contain' : 'cover'))}
        onRemoveBanner={handleRemoveBanner}
        onBannerMouseDown={handleBannerMouseDown}
        onBannerMouseMove={handleBannerMouseMove}
        onBannerMouseUp={handleBannerMouseUp}
        onBannerTouchStart={handleBannerTouchStart}
        onBannerTouchMove={handleBannerTouchMove}
        bannerContainerRef={bannerContainerRef}
        copiedLink={copiedLink}
      />

      {/* Hidden File Inputs */}
      <input
        ref={avatarFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleAvatarChange}
        className="hidden"
      />
      <input
        ref={bannerFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleBannerChange}
        className="hidden"
      />

      {/* ── 2. Tab Contents ── */}
      {activeTab === 'overview' && (
        <ProfileOverviewTab
          name={name}
          setName={setName}
          jobTitle={jobTitle}
          setJobTitle={setJobTitle}
          department={department}
          setDepartment={setDepartment}
          location={location}
          setLocation={setLocation}
          phone={phone}
          setPhone={setPhone}
          website={website}
          setWebsite={setWebsite}
          github={github}
          setGithub={setGithub}
          linkedin={linkedin}
          setLinkedin={setLinkedin}
          twitter={twitter}
          setTwitter={setTwitter}
          bio={bio}
          setBio={setBio}
          skills={skills}
          setSkills={setSkills}
          email={currentUser.email}
          role={role}
          isPremium={currentUser.isPremium}
          saveStatus={saveStatus}
          formError={formError}
          onSaveProfile={handleSaveProfile}
          onResetForm={handleResetForm}
          todoTasksCount={todoTasksCount}
          inProgressTasksCount={inProgressTasksCount}
          reviewTasksCount={reviewTasksCount}
          completedTasksCount={completedTasks.length}
          totalTasksCount={myTasks.length}
          completionRate={completionRate}
          hasOverdueTasks={hasOverdueTasks}
          profileCompleteness={profileCompleteness}
          locale={locale}
          triggerToast={triggerToast}
        />
      )}

      {activeTab === 'tasks' && (
        <ProfileTasksTab
          myTasks={myTasks}
          filteredMyTasks={filteredMyTasks}
          taskFilterStatus={taskFilterStatus}
          setTaskFilterStatus={setTaskFilterStatus}
          taskSearchQuery={taskSearchQuery}
          setTaskSearchQuery={setTaskSearchQuery}
          onSelectTask={onSelectTask}
          locale={locale}
          todoTasksCount={todoTasksCount}
          inProgressTasksCount={inProgressTasksCount}
          reviewTasksCount={reviewTasksCount}
          completedTasksCount={completedTasks.length}
        />
      )}

      {activeTab === 'security' && (
        <ProfileSecurityTab
          mfaFactors={mfaFactors}
          mfaEnrollment={mfaEnrollment}
          mfaCode={mfaCode}
          setMfaCode={setMfaCode}
          mfaBusy={mfaBusy}
          mfaError={mfaError}
          copiedSecret={copiedSecret}
          onCopySecret={() => {
            if (mfaEnrollment) {
              navigator.clipboard.writeText(mfaEnrollment.secret);
              setCopiedSecret(true);
              triggerToast?.('info', locale === 'vi' ? 'Đã sao chép khóa bí mật' : 'Secret copied', mfaEnrollment.secret);
              setTimeout(() => setCopiedSecret(false), 2500);
            }
          }}
          onStartMfaEnrollment={startMfaEnrollment}
          onCancelMfaEnrollment={cancelMfaEnrollment}
          onVerifyMfaEnrollment={verifyMfaEnrollment}
          onRemoveMfaFactor={removeMfaFactor}
          currentPassword={currentPassword}
          setCurrentPassword={setCurrentPassword}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          passwordError={passwordError}
          isUpdatingPassword={isUpdatingPassword}
          onUpdatePassword={handleUpdatePassword}
          isRevokingSessions={isRevokingSessions}
          onRevokeSessions={handleRevokeSessions}
          onExportProfileJson={handleExportProfileJson}
          userEmail={currentUser.email}
          locale={locale}
        />
      )}

      {activeTab === 'preferences' && (
        <ProfilePreferencesTab
          locale={locale}
          setLocale={setLocale}
          notifyEmailTasks={notifyEmailTasks}
          setNotifyEmailTasks={setNotifyEmailTasks}
          notifyMentions={notifyMentions}
          setNotifyMentions={setNotifyMentions}
          notifySound={notifySound}
          setNotifySound={setNotifySound}
          notifyWeeklyDigest={notifyWeeklyDigest}
          setNotifyWeeklyDigest={setNotifyWeeklyDigest}
        />
      )}

      {/* ── 3. Custom Status Modal ── */}
      <ProfileStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        initialEmoji={statusEmoji}
        initialMessage={statusMessage}
        onSave={handleSaveStatus}
        locale={locale}
      />

      {/* ── 4. Floating Unsaved Changes Sticky Notification Bar ── */}
      <AnimatePresence>
        {saveStatus === 'dirty' && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
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
                onClick={() => void handleSaveProfile()}
                className="px-4 py-1.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{locale === 'vi' ? 'Lưu ngay (Ctrl+S)' : 'Save (Ctrl+S)'}</span>
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
