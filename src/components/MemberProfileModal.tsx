"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Mail, Phone, Calendar, Briefcase, MessageSquare, 
  CheckCircle2, Clock, Shield, Sparkles, UserCheck, 
  Copy, Check, Crown, Zap, FolderKanban, Flame, 
  ChevronRight, ExternalLink, Activity, Camera, Trash2, RefreshCw, Upload, Image as ImageIcon,
  Maximize2, Eye, SlidersHorizontal, Move, RotateCcw
} from 'lucide-react';
import { useMemberStore } from '@/store/memberStore';
import { useTaskStore } from '@/store/taskStore';
import { useUiStore } from '@/store/uiStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAuthStore } from '@/store/authStore';
import SignedImage from './SignedImage';
import { supabase } from '@/lib/supabaseClient';
import { useTranslation } from '@/contexts/TranslationContext';
import { getLocalizedOptionLabel } from '@/utils/fieldConfig';
import { uiStatusToPresence, presenceDotClass } from '@/lib/presence';
import { User, Task } from '@/types';
import { createPortal } from 'react-dom';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

interface MemberProfileModalProps {
  memberId: string | null;
  onClose: () => void;
  onSelectTask?: (task: Task) => void;
}

const statusLabels: Record<string, { vi: string; en: string; iconColor: string; bg: string }> = {
  online: { vi: 'Trực tuyến', en: 'Online', iconColor: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' },
  busy: { vi: 'Đang bận', en: 'Busy', iconColor: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' },
  away: { vi: 'Vắng mặt', en: 'Away', iconColor: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' },
  offline: { vi: 'Ngoại tuyến', en: 'Offline', iconColor: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400' },
};

const roleMeta: Record<string, { label: { vi: string; en: string }; badgeCls: string; icon: React.ComponentType<{ className?: string }> }> = {
  owner: { 
    label: { vi: 'Chủ sở hữu (Owner)', en: 'Workspace Owner' }, 
    badgeCls: 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 ring-1 ring-amber-500/20',
    icon: Crown
  },
  admin: { 
    label: { vi: 'Quản trị viên (Admin)', en: 'Admin' }, 
    badgeCls: 'bg-gradient-to-r from-indigo-500/15 to-blue-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 ring-1 ring-indigo-500/20',
    icon: Shield
  },
  member: { 
    label: { vi: 'Thành viên (Member)', en: 'Member' }, 
    badgeCls: 'bg-gradient-to-r from-cyan-500/15 to-blue-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500/30 ring-1 ring-cyan-500/20',
    icon: Zap
  },
  guest: { 
    label: { vi: 'Khách (Guest)', en: 'Guest' }, 
    badgeCls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    icon: UserCheck
  },
};

export default function MemberProfileModal({ memberId, onClose, onSelectTask }: MemberProfileModalProps) {
  const { t, locale, isVietnamese } = useTranslation();
  const members = useMemberStore((s) => s.members);
  const tasks = useTaskStore((s) => s.tasks);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const userStatus = useUiStore((s) => s.userStatus);
  const setInitialSelectedChannelId = useUiStore((s) => s.setInitialSelectedChannelId);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const currentUser = useAuthStore((s) => s.currentUser);

  const [copiedEmail, setCopiedEmail] = useState(false);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [bannerFeedback, setBannerFeedback] = useState<string>('');
  const [bannerFit, setBannerFit] = useState<'cover' | 'contain'>('cover');
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (lightboxImage) setLightboxImage(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, lightboxImage]);

  const member = members.find(
    (m) => m.id === memberId || m.id === `user-${memberId}` || (memberId === 'user' && (m.id === 'user' || (currentUser?.id && m.id === currentUser.id)))
  );

  const isOwnProfile = !member ? false : (
    member.id === 'user' || 
    (currentUser?.id && (member.id === currentUser.id || member.id === `user-${currentUser.id}`)) || 
    (currentUser?.email && member.email?.toLowerCase() === currentUser.email.toLowerCase())
  );

  const resolvedStatus = isOwnProfile ? uiStatusToPresence(userStatus) : (member?.status || 'offline');

  const [customBannerUrl, setCustomBannerUrl] = useState<string>(() => {
    if (typeof window === 'undefined' || !member) return '';
    return member.bannerUrl || member.coverUrl || localStorage.getItem(`apexa_user_banner_${member.id}`) || (isOwnProfile ? localStorage.getItem('apexa_user_banner') : '') || '';
  });
  const [bannerPosition, setBannerPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined' || !member) return { x: 50, y: 50 };
    try {
      const saved = localStorage.getItem(`apexa_user_banner_pos_${member.id}`) || (isOwnProfile ? localStorage.getItem('apexa_user_banner_pos') : '');
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

  useEffect(() => {
    if (member) {
      const saved = member.bannerUrl || member.coverUrl || localStorage.getItem(`apexa_user_banner_${member.id}`) || (isOwnProfile ? localStorage.getItem('apexa_user_banner') : '') || '';
      setCustomBannerUrl(saved);

      try {
        const savedPos = localStorage.getItem(`apexa_user_banner_pos_${member.id}`) || (isOwnProfile ? localStorage.getItem('apexa_user_banner_pos') : '');
        if (savedPos) {
          const parsed = JSON.parse(savedPos);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            setBannerPosition(parsed);
          }
        }
      } catch (e) {}
    }
  }, [member, isOwnProfile]);

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !member) return;

    if (!file.type.startsWith('image/')) {
      setBannerFeedback(isVietnamese ? 'Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP).' : 'Please select a valid image file (PNG, JPG, WebP).');
      setTimeout(() => setBannerFeedback(''), 3000);
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setBannerFeedback(isVietnamese ? 'Kích thước ảnh tối đa là 8MB.' : 'Image size cannot exceed 8MB.');
      setTimeout(() => setBannerFeedback(''), 3000);
      return;
    }

    setIsUploadingBanner(true);
    setBannerFeedback('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result as string;
      setCustomBannerUrl(base64Url);

      // Save to local storage for instant persistent display
      try {
        localStorage.setItem(`apexa_user_banner_${member.id}`, base64Url);
        if (isOwnProfile) {
          localStorage.setItem('apexa_user_banner', base64Url);
        }
      } catch (storageErr) {
        console.warn('LocalStorage quota warning:', storageErr);
      }

      // Update Member store
      useMemberStore.getState().updateMember({
        ...member,
        bannerUrl: base64Url,
        coverUrl: base64Url
      });

      if (isOwnProfile) {
        useAuthStore.getState().updateCurrentUser({
          bannerUrl: base64Url,
          coverUrl: base64Url
        });
      }

      setBannerFeedback(isVietnamese ? 'Đã tải lên ảnh bìa thành công! 📸' : 'Banner uploaded successfully! 📸');
      setTimeout(() => setBannerFeedback(''), 3000);

      // Async cloud sync to Supabase storage
      try {
        const fileExt = file.name.split('.').pop() || 'png';
        const fileName = `banners/${member.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, { cacheControl: '3600', upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
          if (publicUrl) {
            setCustomBannerUrl(publicUrl);
            localStorage.setItem(`apexa_user_banner_${member.id}`, publicUrl);
            if (isOwnProfile) localStorage.setItem('apexa_user_banner', publicUrl);
            useMemberStore.getState().updateMember({
              ...member,
              bannerUrl: publicUrl,
              coverUrl: publicUrl
            });
            if (isOwnProfile) {
              useAuthStore.getState().updateCurrentUser({
                bannerUrl: publicUrl,
                coverUrl: publicUrl
              });
            }
          }
        }
      } catch (uploadErr) {
        console.warn('Cloud sync fallback to local base64:', uploadErr);
      } finally {
        setIsUploadingBanner(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveBanner = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!member) return;
    setCustomBannerUrl('');
    setBannerPosition({ x: 50, y: 50 });
    setIsRepositioningBanner(false);
    setIsDraggingBanner(false);
    dragStartRef.current = null;
    localStorage.removeItem(`apexa_user_banner_${member.id}`);
    localStorage.removeItem(`apexa_user_banner_pos_${member.id}`);
    if (isOwnProfile) {
      localStorage.removeItem('apexa_user_banner');
      localStorage.removeItem('apexa_user_banner_pos');
    }
    useMemberStore.getState().updateMember({
      ...member,
      bannerUrl: undefined,
      coverUrl: undefined
    });
    if (isOwnProfile) {
      useAuthStore.getState().updateCurrentUser({
        bannerUrl: undefined,
        coverUrl: undefined
      });
    }
    setBannerFeedback(isVietnamese ? 'Đã khôi phục ảnh bìa mặc định.' : 'Reverted to default banner.');
    setTimeout(() => setBannerFeedback(''), 3000);
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

  const startRepositionBanner = (e: React.MouseEvent) => {
    e.stopPropagation();
    prevBannerPosRef.current = { ...bannerPosition };
    setIsRepositioningBanner(true);
    if (bannerFit === 'contain') setBannerFit('cover');
  };

  const saveBannerPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRepositioningBanner(false);
    setIsDraggingBanner(false);
    dragStartRef.current = null;
    try {
      if (member?.id) localStorage.setItem(`apexa_user_banner_pos_${member.id}`, JSON.stringify(bannerPosition));
      if (isOwnProfile) localStorage.setItem('apexa_user_banner_pos', JSON.stringify(bannerPosition));
    } catch (err) {}
    setBannerFeedback(isVietnamese ? 'Đã lưu vị trí ảnh bìa 🎯' : 'Banner position saved 🎯');
    setTimeout(() => setBannerFeedback(''), 3000);
  };

  const resetBannerCenter = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBannerPosition({ x: 50, y: 50 });
  };

  const cancelRepositionBanner = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBannerPosition(prevBannerPosRef.current);
    setIsRepositioningBanner(false);
    setIsDraggingBanner(false);
    dragStartRef.current = null;
  };

  if (!memberId || !member) return null;

  const assignedTasks = tasks.filter(
    (t) => t.assigneeId === member.id || t.assigneeId === memberId || (t.assigneeIds && (t.assigneeIds.includes(member.id) || t.assigneeIds.includes(memberId)))
  );

  const completedTasksCount = assignedTasks.filter((t) => t.status === 'completed').length;
  const inProgressTasksCount = assignedTasks.filter((t) => t.status === 'inprogress').length;
  const totalHoursLogged = assignedTasks.reduce((sum, t) => sum + (t.hoursLogged || 0), 0);
  const totalHoursEstimate = assignedTasks.reduce((sum, t) => sum + (t.hoursEstimate || 0), 0);
  const completionRate = assignedTasks.length > 0 ? Math.round((completedTasksCount / assignedTasks.length) * 100) : 0;

  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return isVietnamese ? 'Chưa rõ' : 'Unknown';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return isVietnamese ? 'Chưa rõ' : 'Unknown';
    const diffSecs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSecs < 60) return isVietnamese ? 'Vừa xong' : 'Just now';
    if (diffSecs < 3600) return isVietnamese ? `${Math.floor(diffSecs / 60)} phút trước` : `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return isVietnamese ? `${Math.floor(diffSecs / 3600)} giờ trước` : `${Math.floor(diffSecs / 3600)}h ago`;
    return date.toLocaleDateString(isVietnamese ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'short' });
  };

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (member.email) {
      navigator.clipboard.writeText(member.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleOpenChat = () => {
    onClose();
    if (isOwnProfile) {
      setActiveTab('profile');
      return;
    }
    const currentUserId = currentUser?.id || 'user';
    const sortedIds = [currentUserId, member.id].sort();
    const dmChannelId = `${activeWorkspaceId || 'w1'}:dm-${sortedIds[0]}-${sortedIds[1]}`;
    setInitialSelectedChannelId(dmChannelId);
    setActiveTab('chat');
  };

  const handleFilterTasks = () => {
    onClose();
    setActiveTab('tasks');
  };

  const RoleIcon = roleMeta[member.role]?.icon || Shield;
  const currentStatusMeta = statusLabels[resolvedStatus] || statusLabels.offline;

  return (
    <Portal>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 modal-backdrop bg-black/25 dark:bg-black/60 backdrop-blur-xs cursor-pointer" 
            onClick={onClose} 
          />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 18 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-profile-title"
          className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden z-10 flex flex-col max-h-[90vh] text-slate-800 dark:text-slate-100"
        >
          {/* Header Banner (Custom image or Mesh gradient) */}
          <div 
            ref={bannerContainerRef}
            onMouseDown={handleBannerMouseDown}
            onMouseMove={handleBannerMouseMove}
            onMouseUp={handleBannerMouseUp}
            onMouseLeave={handleBannerMouseUp}
            onTouchStart={handleBannerTouchStart}
            onTouchMove={handleBannerTouchMove}
            onTouchEnd={handleBannerMouseUp}
            className={`h-52 sm:h-64 bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 relative shrink-0 overflow-hidden group select-none transition-all ${
              isRepositioningBanner 
                ? (isDraggingBanner ? 'cursor-grabbing ring-2 ring-inset ring-sky-400' : 'cursor-grab ring-2 ring-inset ring-sky-400/80') 
                : ''
            }`}
          >
            {customBannerUrl ? (
              <div 
                className="relative w-full h-full overflow-hidden flex items-center justify-center pointer-events-none"
              >
                <SignedImage
                  filePath={customBannerUrl}
                  alt={`${member.name} banner`}
                  style={{
                    imageRendering: '-webkit-optimize-contrast',
                    objectFit: bannerFit,
                    objectPosition: `${bannerPosition.x}% ${bannerPosition.y}%`,
                  }}
                  className={`w-full h-full ${bannerFit === 'contain' ? 'object-contain bg-slate-950 p-2' : 'object-cover'} pointer-events-none select-none`}
                  draggable={false}
                />
                {/* Subtle top edge vignette for button readability without darkening center logo */}
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
                {/* Ambient Lighting & Mesh Accents */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,0.35),_transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,_rgba(6,182,212,0.4),_transparent_50%)]" />
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-cyan-400/20 blur-2xl" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-indigo-500/30 blur-2xl" />
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
              </>
            )}

            {/* Reposition Mode Guide Pill */}
            {isRepositioningBanner && (
              <div className="absolute top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 bg-slate-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-sky-400/60 text-white text-xs font-bold shadow-2xl animate-fade-in pointer-events-none select-none">
                <Move className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span>{isVietnamese ? 'Kéo để căn chỉnh vị trí ảnh bìa' : 'Drag image to reposition banner'}</span>
              </div>
            )}

            {/* Reposition Mode Action Controls */}
            {isRepositioningBanner ? (
              <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 z-20 animate-fade-in">
                <button
                  type="button"
                  onClick={saveBannerPosition}
                  className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>{isVietnamese ? 'Lưu vị trí' : 'Save'}</span>
                </button>

                <button
                  type="button"
                  onClick={resetBannerCenter}
                  className="px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/25 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1 shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
                  title={isVietnamese ? 'Căn giữa (50% 50%)' : 'Reset center'}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isVietnamese ? 'Căn giữa' : 'Center'}</span>
                </button>

                <button
                  type="button"
                  onClick={cancelRepositionBanner}
                  className="px-3 py-1.5 rounded-full bg-black/60 hover:bg-rose-600/80 border border-white/25 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1 shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <X className="w-3.5 h-3.5 text-rose-300" />
                  <span>{isVietnamese ? 'Hủy' : 'Cancel'}</span>
                </button>
              </div>
            ) : (
              /* Regular Banner Actions Overlay: Upload, Reposition, Fit Toggle, HD View, Remove */
              <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:pointer-events-none md:group-hover:pointer-events-auto -translate-y-1 group-hover:translate-y-0 transition-all duration-200">
                <div className="flex items-center gap-1 p-1 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 backdrop-blur-xl shadow-xl">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      bannerFileInputRef.current?.click();
                    }}
                    disabled={isUploadingBanner}
                    className="px-3 py-1.5 rounded-full hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                    title={isVietnamese ? 'Tải lên hoặc đổi ảnh bìa' : 'Upload or change profile banner'}
                  >
                    {isUploadingBanner ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5 text-cyan-300" />
                    )}
                    <span>
                      {isUploadingBanner
                        ? (isVietnamese ? 'Đang tải...' : 'Uploading...')
                        : customBannerUrl
                          ? (isVietnamese ? 'Đổi ảnh bìa' : 'Change banner')
                          : (isVietnamese ? 'Tải ảnh bìa' : 'Upload banner')}
                    </span>
                  </button>

                  {customBannerUrl && (
                    <>
                      <div className="h-3.5 w-[1px] bg-white/20 my-auto" />
                      <button
                        type="button"
                        onClick={startRepositionBanner}
                        className="px-2.5 py-1.5 rounded-full hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                        title={isVietnamese ? 'Kéo thả để căn chỉnh vị trí ảnh bìa' : 'Drag to reposition banner'}
                      >
                        <Move className="w-3.5 h-3.5 text-sky-300" />
                        <span>{isVietnamese ? 'Căn chỉnh' : 'Reposition'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBannerFit(prev => prev === 'cover' ? 'contain' : 'cover');
                        }}
                        className="px-2.5 py-1.5 rounded-full hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
                        title={bannerFit === 'cover' ? (isVietnamese ? 'Chuyển sang vừa khung (không cắt ảnh)' : 'Switch to fit contain') : (isVietnamese ? 'Chuyển sang phóng đầy khung' : 'Switch to cover fill')}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-amber-300" />
                        <span>{bannerFit === 'cover' ? (isVietnamese ? 'Vừa khung' : 'Fit') : (isVietnamese ? 'Phóng đầy' : 'Fill')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxImage({ url: customBannerUrl, title: `${member.name} Banner` });
                        }}
                        className="w-7 h-7 rounded-full hover:bg-white/15 text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                        title={isVietnamese ? 'Xem ảnh gốc độ nét cao (HD)' : 'View original HD image'}
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-300" />
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveBanner}
                        className="w-7 h-7 rounded-full hover:bg-rose-600/80 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                        title={isVietnamese ? 'Gỡ ảnh bìa (Dùng gradient mặc định)' : 'Remove custom banner'}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Feedback notification pill */}
            {bannerFeedback && (
              <div className="absolute bottom-3 right-3 px-3.5 py-1.5 rounded-full bg-slate-950/85 border border-white/20 text-white text-[11px] font-bold backdrop-blur-md shadow-lg z-10 animate-fade-in">
                {bannerFeedback}
              </div>
            )}

            {/* Hidden File Input */}
            <input
              type="file"
              ref={bannerFileInputRef}
              onChange={handleBannerFileChange}
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              className="hidden"
            />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer z-10 active:scale-90 shadow-md"
              title={locale === 'vi' ? 'Đóng' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Profile Header Details Bar */}
          <div className="px-6 sm:px-8 pb-5 relative shrink-0 border-b border-slate-200/70 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 mb-4 gap-4">
              {/* Avatar with HD Ring & Live Status */}
              <div 
                className="relative group self-start cursor-pointer"
                onClick={() => setLightboxImage({ url: member.avatar, title: `${member.name} Avatar` })}
                title={isVietnamese ? 'Nhấp để xem ảnh đại diện HD' : 'Click to view HD avatar'}
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[28px] ring-4 ring-white dark:ring-slate-900 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center transition-all group-hover:ring-indigo-400">
                  <SignedImage
                    filePath={member.avatar}
                    style={{ imageRendering: '-webkit-optimize-contrast' }}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    alt={member.name}
                  />
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[28px]">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 ${
                    presenceDotClass(resolvedStatus, resolvedStatus === 'online')
                  } flex items-center justify-center shadow-lg`}
                  title={currentStatusMeta[locale === 'vi' ? 'vi' : 'en']}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 self-start sm:self-auto">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleOpenChat}
                  className="px-4.5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>
                    {isOwnProfile 
                      ? (locale === 'vi' ? 'Chỉnh sửa hồ sơ' : 'Edit profile') 
                      : (locale === 'vi' ? 'Gửi tin nhắn' : 'Send message')}
                  </span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleFilterTasks}
                  className="px-4.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-2 border border-slate-200/80 dark:border-slate-700/80 shadow-xs transition-all cursor-pointer"
                >
                  <Briefcase className="w-4 h-4 text-indigo-500" />
                  <span>{locale === 'vi' ? 'Xem công việc' : 'View tasks'}</span>
                </motion.button>
              </div>
            </div>

            {/* Name, Role & Email Row */}
            <div className="space-y-2 text-left">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 id="member-profile-title" className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {member.name}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-xl border uppercase tracking-wider shadow-2xs ${
                    roleMeta[member.role]?.badgeCls || 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                  }`}
                >
                  <RoleIcon className="w-3 h-3" />
                  <span>{roleMeta[member.role]?.label[isVietnamese ? 'vi' : 'en'] || member.role}</span>
                </span>
                {isOwnProfile && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    {locale === 'vi' ? 'Bạn' : 'You'}
                  </span>
                )}
              </div>

              {/* Email with Quick Copy & Live Presence */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="group inline-flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                  title={locale === 'vi' ? 'Sao chép email' : 'Copy email'}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{member.email}</span>
                  {copiedEmail ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>

                <span className="text-slate-300 dark:text-slate-700">•</span>

                {/* Status Pill Badge */}
                <div className="inline-flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${presenceDotClass(resolvedStatus, resolvedStatus === 'online')}`} />
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {currentStatusMeta[locale === 'vi' ? 'vi' : 'en']}
                  </span>
                  {resolvedStatus !== 'online' && member.lastSeenAt && (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      • {formatLastSeen(member.lastSeenAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Status Message */}
            {(member.statusMessage || member.statusEmoji) && (
              <div className="mt-3.5 p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2.5 shadow-2xs backdrop-blur-xs text-left">
                <span className="text-lg leading-none">{member.statusEmoji || '💬'}</span>
                <span className="italic font-medium">{member.statusMessage}</span>
              </div>
            )}
          </div>

          {/* Modal Body Scrollable */}
          <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
            {/* Bento Stat Cards Strip */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {/* Card 1: Assigned Tasks */}
              <div className="p-4 rounded-[22px] bg-gradient-to-br from-indigo-50/80 to-blue-50/40 dark:from-indigo-950/20 dark:to-slate-900 border border-indigo-100/80 dark:border-indigo-900/30 text-left space-y-1 relative overflow-hidden group shadow-2xs">
                <div className="flex items-center justify-between text-indigo-500 dark:text-indigo-400">
                  <FolderKanban className="w-4 h-4" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600/80 dark:text-indigo-400/80">
                    {inProgressTasksCount > 0 ? `${inProgressTasksCount} ${locale === 'vi' ? 'đang làm' : 'active'}` : ''}
                  </span>
                </div>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white block tracking-tight">
                  {assignedTasks.length}
                </span>
                <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                  {locale === 'vi' ? 'Công việc được giao' : 'Assigned tasks'}
                </span>
              </div>

              {/* Card 2: Completed Tasks */}
              <div className="p-4 rounded-[22px] bg-gradient-to-br from-emerald-50/80 to-teal-50/40 dark:from-emerald-950/20 dark:to-slate-900 border border-emerald-100/80 dark:border-emerald-900/30 text-left space-y-1 relative overflow-hidden group shadow-2xs">
                <div className="flex items-center justify-between text-emerald-500 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  {assignedTasks.length > 0 && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {completionRate}%
                    </span>
                  )}
                </div>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white block tracking-tight">
                  {completedTasksCount}
                </span>
                <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                  {locale === 'vi' ? 'Đã hoàn thành' : 'Completed'}
                </span>
              </div>

              {/* Card 3: Logged Hours */}
              <div className="p-4 rounded-[22px] bg-gradient-to-br from-amber-50/80 to-orange-50/40 dark:from-amber-950/20 dark:to-slate-900 border border-amber-100/80 dark:border-amber-900/30 text-left space-y-1 relative overflow-hidden group shadow-2xs">
                <div className="flex items-center justify-between text-amber-500 dark:text-amber-400">
                  <Clock className="w-4 h-4" />
                  {totalHoursEstimate > 0 && (
                    <span className="text-[10px] font-extrabold text-amber-600/80 dark:text-amber-400/80">
                      /{totalHoursEstimate}h {locale === 'vi' ? 'dự kiến' : 'est'}
                    </span>
                  )}
                </div>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white block tracking-tight">
                  {totalHoursLogged}h
                </span>
                <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                  {locale === 'vi' ? 'Giờ đã làm' : 'Logged hours'}
                </span>
              </div>
            </div>

            {/* Profile Info Details List */}
            <div className="space-y-3 p-5 rounded-[24px] bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800/80 text-xs shadow-2xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-200/50 dark:border-slate-700/40 text-left">
                <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-500" />
                  <span>{locale === 'vi' ? 'Phòng ban / Chuyên môn' : 'Department / Specialty'}</span>
                </span>
                <span className="font-extrabold text-slate-800 dark:text-slate-100">
                  {member.department || (locale === 'vi' ? 'Chưa cập nhật' : 'Not specified')}
                </span>
              </div>

              {member.phone && (
                <div className="flex items-center justify-between py-1.5 border-b border-slate-200/50 dark:border-slate-700/40 text-left">
                  <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-500" />
                    <span>{locale === 'vi' ? 'Số điện thoại' : 'Phone'}</span>
                  </span>
                  <a href={`tel:${member.phone}`} className="font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline">
                    {member.phone}
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between py-1.5 border-b border-slate-200/50 dark:border-slate-700/40 text-left">
                <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span>{locale === 'vi' ? 'Ngày tham gia' : 'Joined Date'}</span>
                </span>
                <span className="font-extrabold text-slate-800 dark:text-slate-100">
                  {member.joinedDate || '2026'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 text-left">
                <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-500" />
                  <span>{locale === 'vi' ? 'Truy cập gần nhất' : 'Last Active'}</span>
                </span>
                <span className="font-extrabold text-slate-800 dark:text-slate-100">
                  {resolvedStatus === 'online' ? (locale === 'vi' ? 'Đang hoạt động' : 'Active now') : formatLastSeen(member.lastSeenAt)}
                </span>
              </div>
            </div>

            {/* Short Bio */}
            {member.bio && (
              <div className="space-y-2 text-left">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {locale === 'vi' ? 'Giới thiệu bản thân' : 'Biography'}
                </h4>
                <div className="p-4 rounded-[22px] bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic border-l-4 border-l-indigo-500 shadow-2xs">
                  "{member.bio}"
                </div>
              </div>
            )}

            {/* Skills & Expertise */}
            {member.skills && member.skills.length > 0 && (
              <div className="space-y-2 text-left">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{locale === 'vi' ? 'Kỹ năng & chuyên môn' : 'Skills & expertise'}</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {member.skills.map(skill => (
                    <span key={skill} className="rounded-xl border border-indigo-200/70 bg-indigo-50/80 px-3 py-1 text-[11px] font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300 shadow-2xs">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Assigned Tasks Section */}
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{locale === 'vi' ? 'Công việc phụ trách gần đây' : 'Recent Assigned Tasks'}</span>
                  <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold">
                    {assignedTasks.length}
                  </span>
                </h4>

                {assignedTasks.length > 0 && (
                  <button
                    type="button"
                    onClick={handleFilterTasks}
                    className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>{locale === 'vi' ? 'Tất cả' : 'View all'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {assignedTasks.length === 0 ? (
                <div className="p-8 rounded-[24px] border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-center text-xs space-y-1.5">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="font-bold text-slate-600 dark:text-slate-300">
                    {locale === 'vi' ? 'Thành viên này chưa có công việc được giao' : 'No tasks assigned to this member'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {locale === 'vi' ? 'Giao công việc từ bảng công việc hoặc tạo mới.' : 'Assign tasks from workspace boards or backlogs.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {assignedTasks.slice(0, 5).map((task) => {
                    const isDone = task.status === 'completed';
                    return (
                      <div
                        key={task.id}
                        onClick={() => {
                          if (onSelectTask) {
                            onClose();
                            onSelectTask(task);
                          }
                        }}
                        className="p-3.5 rounded-[20px] border border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-400/50 transition-all flex items-center justify-between cursor-pointer group shadow-2xs hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-3">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isDone ? 'bg-emerald-500/15 text-emerald-500' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-400 group-hover:text-indigo-500'
                          }`}>
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className={`text-xs font-bold truncate transition-colors ${
                              isDone 
                                ? 'line-through text-slate-400 dark:text-slate-500' 
                                : 'text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                            }`}>
                              {task.title}
                            </p>
                            {task.hoursEstimate ? (
                              <span className="text-[10.5px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{task.hoursEstimate}h {locale === 'vi' ? 'dự kiến' : 'est'}</span>
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                            {getLocalizedOptionLabel(task.status, 'status', isVietnamese ? 'vi' : 'en')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Full-Resolution HD Lightbox Viewer */}
      {lightboxImage && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-2xl flex flex-col items-center justify-center p-4 select-none"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-5xl max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/35 border border-white/25 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer shadow-lg"
            >
              <X className="w-4 h-4" />
              <span>{locale === 'vi' ? 'Đóng' : 'Close'}</span>
            </button>
            <SignedImage
              filePath={lightboxImage.url}
              alt={lightboxImage.title}
              className="max-w-full max-h-[75vh] rounded-3xl object-contain shadow-2xl ring-1 ring-white/20 bg-slate-900/50"
              style={{ imageRendering: '-webkit-optimize-contrast' }}
            />
            <div className="mt-3.5 px-4 py-1.5 rounded-full bg-slate-900/80 border border-white/20 text-white text-xs font-bold backdrop-blur-md shadow-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{lightboxImage.title}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </Portal>
  );
}
