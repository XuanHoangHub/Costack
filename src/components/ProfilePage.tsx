"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from '../contexts/TranslationContext';
import { motion, AnimatePresence } from 'motion/react';
import { User, Task } from '../types';
import { supabase } from '../lib/supabaseClient';
import { 
  User as UserIcon, Camera, Mail, Briefcase, Shield, 
  Phone, Calendar, Activity, CheckCircle, 
  Clock, Save, Sparkles, AlertCircle, Plus, X, Star, RotateCcw,
  FileText, Check, Copy, ExternalLink, Lock, SlidersHorizontal, Eye
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import SignedImage from './SignedImage';
import { presenceDotClass, uiStatusToPresence } from '../lib/presence';
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
  onUpdateMember
}: ProfilePageProps) {
  const { t, locale } = useTranslation();
  const userStatus = useUiStore((s) => s.userStatus);
  
  // Safe Translation Helper to prevent unrendered key leakage (e.g. dept_..., editProfileInfo, etc.)
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
  const [bio, setBio] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [bannerFit, setBannerFit] = useState<'cover' | 'contain'>('cover');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const loadedProfileRef = useRef({ name: '', role: '', avatar: '', bannerUrl: '', phone: '', department: '', bio: '', skills: [] as string[] });
  const initializedIdentityRef = useRef('');

  // Initialize profile data on load
  useEffect(() => {
    const profileSourceKey = `${currentUser.email}:${memberMe?.id || 'pending'}`;
    if (initializedIdentityRef.current === profileSourceKey) return;
    initializedIdentityRef.current = profileSourceKey;

    setName(currentUser.name);
    setAvatar(currentUser.avatar);
    const loadedBanner = memberMe?.bannerUrl || memberMe?.coverUrl || (typeof window !== 'undefined' ? localStorage.getItem('apexa_user_banner') || '' : '') || '';
    setBannerUrl(loadedBanner);
    setRole(currentUser.role);
    const loadedPhone = memberMe?.phone || '';
    const loadedDept = memberMe?.department || '';
    const loadedBio = memberMe?.bio || '';
    let loadedSkills = memberMe?.skills || [];

    try {
      const savedSkills = localStorage.getItem('apexa_user_skills');
      const parsed = savedSkills ? JSON.parse(savedSkills) : null;
      if (Array.isArray(parsed)) loadedSkills = parsed.filter(item => typeof item === 'string');
    } catch (e) {}

    setPhone(loadedPhone);
    setDepartment(loadedDept);
    setBio(loadedBio);
    setSkills(loadedSkills);

    loadedProfileRef.current = {
      name: currentUser.name,
      role: currentUser.role,
      avatar: currentUser.avatar,
      bannerUrl: loadedBanner,
      phone: loadedPhone,
      department: loadedDept,
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
  ].filter(Boolean).length / 6) * 100);

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

        triggerToast?.('info', locale === 'vi' ? 'Đang đồng bộ ảnh ⚡' : 'Uploading avatar...', locale === 'vi' ? 'Đang tải ảnh đại diện lên đám mây Supabase...' : 'Uploading avatar image to Supabase...');

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
    localStorage.removeItem('apexa_user_banner');
    if (memberMe?.id) {
      localStorage.removeItem(`apexa_user_banner_${memberMe.id}`);
    }
    triggerToast?.('info', locale === 'vi' ? 'Khôi phục ảnh bìa' : 'Banner reset', locale === 'vi' ? 'Đã quay lại ảnh bìa mặc định.' : 'Reverted to default banner gradient.');
  };

  const validateProfile = () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) return locale === 'vi' ? 'Họ tên phải có ít nhất 2 ký tự.' : 'Name must contain at least 2 characters.';
    if (trimmedName.length > 80) return locale === 'vi' ? 'Họ tên không được vượt quá 80 ký tự.' : 'Name cannot exceed 80 characters.';
    if (phone.trim() && !/^[+()\d\s.-]{7,24}$/.test(phone.trim())) return locale === 'vi' ? 'Số điện thoại chưa đúng định dạng.' : 'Phone number format is invalid.';
    if (department.trim().length > 80) return locale === 'vi' ? 'Phòng ban không được vượt quá 80 ký tự.' : 'Department cannot exceed 80 characters.';
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
      status: currentMember?.status || 'offline',
      customStatus: currentMember?.customStatus,
      statusMessage: currentMember?.statusMessage,
      statusEmoji: currentMember?.statusEmoji,
      lastSeenAt: currentMember?.lastSeenAt,
      phone: phone.trim(),
      department: department.trim(),
      bio: bio.trim(),
      skills,
      joinedDate: myJoinedDate
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
            joined_date: myJoinedDate
          }).eq('id', dbId).eq('user_id', session.user.id);
        }

        addSyncLog('Đã tự động lưu hồ sơ cá nhân lên Supabase');
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

    loadedProfileRef.current = {
      name: updatedUser.name,
      role: role,
      avatar: avatar,
      bannerUrl: bannerUrl,
      phone: updatedMemberObj.phone || '',
      department: updatedMemberObj.department || '',
      bio: updatedMemberObj.bio || '',
      skills: skills
    };

    setSaveStatus('saved');
    return true;
  };

  useEffect(() => {
    if (!initializedIdentityRef.current || saveStatus === 'saving') return;

    const isDirty =
      name !== loadedProfileRef.current.name ||
      role !== loadedProfileRef.current.role ||
      avatar !== loadedProfileRef.current.avatar ||
      bannerUrl !== loadedProfileRef.current.bannerUrl ||
      phone !== loadedProfileRef.current.phone ||
      department !== loadedProfileRef.current.department ||
      bio !== loadedProfileRef.current.bio ||
      JSON.stringify(skills) !== JSON.stringify(loadedProfileRef.current.skills);

    setSaveStatus(isDirty ? 'dirty' : 'saved');
  }, [name, role, avatar, bannerUrl, phone, department, bio, skills, saveStatus]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await triggerSave();
    if (!saved) return;

    triggerToast?.('success', locale === 'vi' ? 'Đã lưu thay đổi ✨' : 'Profile updated', locale === 'vi' ? 'Hồ sơ người dùng đã được lưu thành công!' : 'Your profile details have been saved.');
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newSkill.trim();
    if (skills.length >= 12) {
      setFormError(locale === 'vi' ? 'Bạn có thể thêm tối đa 12 kỹ năng.' : 'You can add up to 12 skills.');
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

  return (
    <div className="w-full max-w-7xl mx-auto font-sans text-left pb-16 text-slate-800 dark:text-slate-100 select-none space-y-6">
      
      {/* ── 1. Hero Header Banner Card ── */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xl transition-all">
        {/* Animated Mesh Gradient Background Banner or Custom Banner */}
        <div className="h-52 md:h-64 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 relative overflow-hidden group">
          {bannerUrl ? (
            <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
              <SignedImage
                filePath={bannerUrl}
                alt="Profile banner"
                style={{
                  imageRendering: '-webkit-optimize-contrast',
                  objectFit: bannerFit
                }}
                className={`w-full h-full ${bannerFit === 'contain' ? 'object-contain bg-slate-950 p-2' : 'object-cover'} transition-transform duration-500 group-hover:scale-[1.02]`}
              />
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
            </div>
          ) : (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-slate-950/40" />
              <div className="absolute -top-24 -left-24 w-80 h-80 bg-indigo-400/35 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-pink-400/35 rounded-full blur-3xl" />
            </>
          )}

          {/* Banner Upload Actions Bar */}
          <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={() => bannerFileInputRef.current?.click()}
              disabled={isUploadingBanner}
              className="px-3.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/25 backdrop-blur-md text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
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
                <button
                  type="button"
                  onClick={() => setBannerFit(prev => prev === 'cover' ? 'contain' : 'cover')}
                  className="px-2.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/25 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1 transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
                  title={bannerFit === 'cover' ? (locale === 'vi' ? 'Chuyển sang vừa khung (không cắt ảnh)' : 'Switch to fit contain') : (locale === 'vi' ? 'Chuyển sang phóng đầy khung' : 'Switch to cover fill')}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-300" />
                  <span>{bannerFit === 'cover' ? (locale === 'vi' ? 'Vừa khung' : 'Fit') : (locale === 'vi' ? 'Phóng đầy' : 'Fill')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemoveBanner}
                  className="w-8 h-8 rounded-full bg-black/40 hover:bg-rose-600/80 border border-white/25 backdrop-blur-md text-white flex items-center justify-center transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
                  title={locale === 'vi' ? 'Gỡ ảnh bìa (Dùng gradient mặc định)' : 'Remove banner'}
                >
                  <X className="w-3.5 h-3.5 text-rose-300" />
                </button>
              </>
            )}
          </div>

          <input
            ref={bannerFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleBannerChange}
            className="hidden"
          />
          
          {/* Top Badges Bar */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <span className="px-3.5 py-1.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-black/30 text-white backdrop-blur-md border border-white/20 shadow-md flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${presenceDotClass(accountPresenceStatus, true)}`} />
              {presenceLabel}
            </span>
            <button
              type="button"
              onClick={handleCopyProfileLink}
              className="p-2 rounded-full bg-black/30 hover:bg-black/40 text-white backdrop-blur-md border border-white/20 shadow-md transition-all cursor-pointer"
              title={locale === 'vi' ? 'Sao chép liên kết hồ sơ' : 'Copy profile link'}
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* User Identity Info Overlay */}
        <div className="px-6 md:px-8 pb-6 relative flex flex-col md:flex-row items-center md:items-start gap-6">
          
          {/* Avatar Container with Upload Hover */}
          <div className="relative shrink-0 group -mt-14 md:-mt-18 z-10">
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

          {/* User Name & Metadata */}
          <div className="flex-1 text-center md:text-left space-y-2 pt-2 md:pt-3">
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
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                <Briefcase className="w-3.5 h-3.5" />
                {role === 'admin' ? (t('roleAdmin') || 'Admin') : role === 'guest' ? 'Guest' : (t('roleMember') || 'Member')}
              </span>
              {department && (
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  • {department}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-1.5 pt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
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
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Grid Layout Section (Left Stats & Right Info Form) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (5 Cols): Statistics, Skills & Membership */}
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
            
            <div className="flex items-center gap-6 py-2">
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
              <div className="flex-1 space-y-2">
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
            <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left">
                <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 block flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {locale === 'vi' ? 'Đang thực hiện' : 'In Progress'}
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

            {/* Add Skill Form */}
            <form onSubmit={handleAddSkill} className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                placeholder={locale === 'vi' ? 'Thêm kỹ năng mới (ví dụ: Next.js)...' : 'Add a skill (e.g. React, Python)...'}
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

        {/* Right Column (7 Cols): Personal Information Form */}
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

                {/* Role / Profession (Read-only System Role) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{getText('roleProfession', 'Role / Profession', 'Vai trò / Chức vụ')}</span>
                  </label>
                  <div className="w-full text-xs font-bold p-3.5 bg-slate-100/80 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>{role === 'admin' ? (t('roleAdmin') || 'Admin') : role === 'guest' ? 'Guest' : (t('roleMember') || 'Member')}</span>
                    <Shield className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-[9.5px] text-slate-400 font-medium">
                    {locale === 'vi' ? 'Vai trò do quản trị viên Workspace kiểm soát.' : 'Workspace roles are managed by an administrator.'}
                  </p>
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
                    placeholder={locale === 'vi' ? 'Nhập số điện thoại (ví dụ: 0987654321)...' : 'Enter phone number...'}
                  />
                </div>

                {/* Department */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{getText('department', 'Department', 'Phòng ban')}</span>
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    autoComplete="organization-title"
                    maxLength={80}
                    className="w-full text-xs font-bold p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                    placeholder={locale === 'vi' ? 'Nhập tên phòng ban làm việc...' : 'Working department...'}
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

      {/* ── 3. Floating Unsaved Changes Sticky Notification Bar ── */}
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
