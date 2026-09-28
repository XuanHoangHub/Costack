"use client";

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, Briefcase, Shield, ShieldCheck, Phone, Calendar, 
  MapPin, Mail, Globe, Sparkles, Move, Check, RotateCcw, 
  X, ChevronDown, SlidersHorizontal, Copy, Palette,
  User as UserIcon, Zap, KeyRound, Bell
} from 'lucide-react';
import SignedImage from '../SignedImage';
import { presenceDotClass, uiStatusToPresence, UiPresenceStatus } from '../../lib/presence';
import { BANNER_PRESETS, ProfileTab } from './types';

interface ProfileHeaderProps {
  name: string;
  avatar: string;
  role: 'admin' | 'member' | 'guest';
  isPremium?: boolean;
  email: string;
  jobTitle: string;
  department: string;
  location: string;
  phone: string;
  website: string;
  joinedDate: string;
  bannerUrl: string;
  bannerPosition: { x: number; y: number };
  bannerFit: 'cover' | 'contain';
  accountPresenceStatus: 'online' | 'busy' | 'away' | 'offline';
  presenceLabel: string;
  statusEmoji: string;
  statusMessage: string;
  profileCompleteness: number;
  activeTab: ProfileTab;
  tasksCount: number;
  locale: string;
  isUploadingBanner: boolean;
  isRepositioningBanner: boolean;
  isDraggingBanner: boolean;
  onTabChange: (tab: ProfileTab) => void;
  onAvatarUploadClick: () => void;
  onBannerUploadClick: () => void;
  onStatusClick: () => void;
  onCyclePresence: () => void;
  onCopyProfileLink: () => void;
  onSelectBannerPreset: (presetGradient: string) => void;
  onStartReposition: () => void;
  onSaveReposition: () => void;
  onResetRepositionCenter: () => void;
  onCancelReposition: () => void;
  onToggleBannerFit: () => void;
  onRemoveBanner: () => void;
  onBannerMouseDown: (e: React.MouseEvent) => void;
  onBannerMouseMove: (e: React.MouseEvent) => void;
  onBannerMouseUp: () => void;
  onBannerTouchStart: (e: React.TouchEvent) => void;
  onBannerTouchMove: (e: React.TouchEvent) => void;
  bannerContainerRef: React.RefObject<HTMLDivElement | null>;
  copiedLink: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  name,
  avatar,
  role,
  isPremium,
  email,
  jobTitle,
  department,
  location,
  phone,
  website,
  joinedDate,
  bannerUrl,
  bannerPosition,
  bannerFit,
  accountPresenceStatus,
  presenceLabel,
  statusEmoji,
  statusMessage,
  profileCompleteness,
  activeTab,
  tasksCount,
  locale,
  isUploadingBanner,
  isRepositioningBanner,
  isDraggingBanner,
  onTabChange,
  onAvatarUploadClick,
  onBannerUploadClick,
  onStatusClick,
  onCyclePresence,
  onCopyProfileLink,
  onSelectBannerPreset,
  onStartReposition,
  onSaveReposition,
  onResetRepositionCenter,
  onCancelReposition,
  onToggleBannerFit,
  onRemoveBanner,
  onBannerMouseDown,
  onBannerMouseMove,
  onBannerMouseUp,
  onBannerTouchStart,
  onBannerTouchMove,
  bannerContainerRef,
  copiedLink,
}) => {
  const [isBannerMenuOpen, setIsBannerMenuOpen] = useState(false);
  const [showPresetsSubmenu, setShowPresetsSubmenu] = useState(false);
  const bannerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bannerMenuRef.current && !bannerMenuRef.current.contains(e.target as Node)) {
        setIsBannerMenuOpen(false);
        setShowPresetsSubmenu(false);
      }
    };
    if (isBannerMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBannerMenuOpen]);

  const isPresetBanner = bannerUrl.startsWith('linear-gradient');

  const tabs: Array<{ id: ProfileTab; labelVi: string; labelEn: string; icon: React.ComponentType<{ className?: string }>; count?: number }> = [
    { id: 'overview', labelVi: 'Tổng quan & Hồ sơ', labelEn: 'Overview & Details', icon: UserIcon },
    { id: 'tasks', labelVi: 'Nhiệm vụ & Năng suất', labelEn: 'Tasks & Productivity', icon: Zap, count: tasksCount },
    { id: 'security', labelVi: 'Bảo mật & Phiên làm việc', labelEn: 'Security & Sessions', icon: KeyRound },
    { id: 'preferences', labelVi: 'Tùy chọn & Trải nghiệm', labelEn: 'Preferences', icon: Bell },
  ];

  return (
    <div className="relative rounded-[32px] overflow-hidden border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xl transition-all">
      
      {/* ── Banner Section ── */}
      <div
        ref={bannerContainerRef}
        onMouseDown={onBannerMouseDown}
        onMouseMove={onBannerMouseMove}
        onMouseUp={onBannerMouseUp}
        onMouseLeave={onBannerMouseUp}
        onTouchStart={onBannerTouchStart}
        onTouchMove={onBannerTouchMove}
        onTouchEnd={onBannerMouseUp}
        style={{
          background: isPresetBanner ? bannerUrl : undefined,
        }}
        className={`h-52 sm:h-60 md:h-72 relative overflow-hidden group select-none transition-all ${
          !isPresetBanner && !bannerUrl ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500' : ''
        } ${
          isRepositioningBanner
            ? isDraggingBanner
              ? 'cursor-grabbing ring-4 ring-inset ring-sky-400'
              : 'cursor-grab ring-4 ring-inset ring-sky-400/80'
            : ''
        }`}
      >
        {/* If banner is an image URL */}
        {bannerUrl && !isPresetBanner && (
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
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 via-black/20 to-transparent pointer-events-none" />

            {/* Repositioning Grid Overlay */}
            {isRepositioningBanner && (
              <div className="absolute inset-0 bg-black/25 pointer-events-none flex items-center justify-center">
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white/50 border-t border-dashed border-white/80" />
                <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white/50 border-l border-dashed border-white/80" />
              </div>
            )}
          </div>
        )}

        {/* Ambient mesh effect for gradients */}
        {(!bannerUrl || isPresetBanner) && (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-slate-950/40 pointer-events-none" />
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-indigo-400/35 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-pink-400/35 rounded-full blur-3xl pointer-events-none" />
          </>
        )}

        {/* Reposition Mode Guide Pill */}
        {isRepositioningBanner && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 bg-slate-950/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-sky-400/70 text-white text-xs font-bold shadow-2xl animate-fade-in pointer-events-none select-none">
            <Move className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span>{locale === 'vi' ? 'Kéo chuột để căn chỉnh vị trí ảnh bìa' : 'Drag image to reposition banner'}</span>
          </div>
        )}

        {/* Reposition Controls */}
        {isRepositioningBanner ? (
          <div className="absolute top-4 left-4 flex items-center gap-2 z-20 animate-fade-in">
            <button
              type="button"
              onClick={onSaveReposition}
              className="px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-1.5 shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Check className="w-3.5 h-3.5 text-white" />
              <span>{locale === 'vi' ? 'Lưu vị trí' : 'Save position'}</span>
            </button>

            <button
              type="button"
              onClick={onResetRepositionCenter}
              className="px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/25 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
              title={locale === 'vi' ? 'Căn giữa (50% 50%)' : 'Reset center'}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
              <span>{locale === 'vi' ? 'Căn giữa' : 'Center'}</span>
            </button>

            <button
              type="button"
              onClick={onCancelReposition}
              className="px-3 py-1.5 rounded-full bg-black/60 hover:bg-rose-600/80 border border-white/25 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <X className="w-3.5 h-3.5 text-rose-300" />
              <span>{locale === 'vi' ? 'Hủy' : 'Cancel'}</span>
            </button>
          </div>
        ) : (
          /* Sleek Floating Glass Header Tools */
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            {/* Quick Presence Status Pill */}
            <button
              type="button"
              onClick={onCyclePresence}
              className="px-3.5 py-1.5 rounded-full text-[11px] font-bold bg-slate-900/60 hover:bg-slate-900/85 text-white backdrop-blur-xl border border-white/20 shadow-lg flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
              title={locale === 'vi' ? 'Nhấp để chuyển trạng thái hoạt động' : 'Click to cycle presence'}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${presenceDotClass(accountPresenceStatus, true)}`} />
              <span>{presenceLabel}</span>
            </button>

            {/* Banner Tools Menu */}
            <div className="relative" ref={bannerMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsBannerMenuOpen((prev) => !prev);
                  setShowPresetsSubmenu(false);
                }}
                disabled={isUploadingBanner}
                className="px-3.5 py-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900/85 border border-white/20 backdrop-blur-xl shadow-lg text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                {isUploadingBanner ? (
                  <RotateCcw className="w-3.5 h-3.5 animate-spin text-sky-300" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-sky-300" />
                )}
                <span>
                  {isUploadingBanner
                    ? (locale === 'vi' ? 'Đang tải...' : 'Uploading...')
                    : bannerUrl
                    ? (locale === 'vi' ? 'Tùy chỉnh ảnh bìa' : 'Customize banner')
                    : (locale === 'vi' ? 'Chọn ảnh bìa' : 'Select banner')}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-white/70 transition-transform duration-200 ${isBannerMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isBannerMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-slate-900/95 border border-white/15 backdrop-blur-2xl shadow-2xl p-1.5 z-40 flex flex-col gap-0.5 text-xs text-white"
                  >
                    {/* Preset Gradients Submenu Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowPresetsSubmenu((prev) => !prev)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/15 text-left font-semibold transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Palette className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{locale === 'vi' ? 'Chọn mẫu gradient có sẵn' : 'Preset gradients'}</span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-white/60 transition-transform ${showPresetsSubmenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showPresetsSubmenu && (
                      <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-950/70 rounded-xl my-1 border border-white/10">
                        {BANNER_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              onSelectBannerPreset(preset.gradient);
                              setIsBannerMenuOpen(false);
                            }}
                            className={`p-2 rounded-lg bg-gradient-to-r ${preset.previewClass} text-[10.5px] font-bold text-white shadow-xs hover:scale-105 active:scale-95 transition-all text-left truncate cursor-pointer`}
                          >
                            {locale === 'vi' ? preset.nameVi : preset.nameEn}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Upload Custom Image */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsBannerMenuOpen(false);
                        onBannerUploadClick();
                      }}
                      disabled={isUploadingBanner}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/15 text-left font-semibold transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-sky-300 shrink-0" />
                      <span>{locale === 'vi' ? 'Tải tệp ảnh lên từ máy' : 'Upload custom photo'}</span>
                    </button>

                    {/* Reposition Banner (if image) */}
                    {bannerUrl && !isPresetBanner && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsBannerMenuOpen(false);
                            onStartReposition();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/15 text-left font-semibold transition-colors cursor-pointer"
                        >
                          <Move className="w-4 h-4 text-sky-300 shrink-0" />
                          <span>{locale === 'vi' ? 'Căn chỉnh vị trí ảnh' : 'Reposition banner'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onToggleBannerFit();
                            setIsBannerMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/15 text-left font-semibold transition-colors cursor-pointer"
                        >
                          <SlidersHorizontal className="w-4 h-4 text-amber-300 shrink-0" />
                          <span>
                            {bannerFit === 'cover'
                              ? (locale === 'vi' ? 'Chuyển sang vừa khung' : 'Fit contain')
                              : (locale === 'vi' ? 'Phóng đầy khung' : 'Cover fill')}
                          </span>
                        </button>
                      </>
                    )}

                    {/* Copy Profile Link */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsBannerMenuOpen(false);
                        onCopyProfileLink();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/15 text-left font-semibold transition-colors cursor-pointer"
                    >
                      {copiedLink ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Copy className="w-4 h-4 text-white/80 shrink-0" />
                      )}
                      <span>{locale === 'vi' ? 'Sao chép liên kết hồ sơ' : 'Copy profile link'}</span>
                    </button>

                    {bannerUrl && (
                      <>
                        <div className="my-1 border-t border-white/10" />
                        <button
                          type="button"
                          onClick={() => {
                            setIsBannerMenuOpen(false);
                            onRemoveBanner();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 text-left font-semibold transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4 text-rose-300 shrink-0" />
                          <span>{locale === 'vi' ? 'Khôi phục ảnh bìa gốc' : 'Reset to default'}</span>
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* ── User Identity & Avatar Row ── */}
      <div className="px-6 sm:px-8 pb-6 relative flex flex-col md:flex-row items-center md:items-start gap-6">
        
        {/* Avatar Container with Squircle Style & Upload Hover */}
        <div className="relative shrink-0 group -mt-16 sm:-mt-20 z-10 w-full sm:w-auto flex justify-center">
          <div className="relative rounded-[30px] p-1.5 bg-gradient-to-tr from-indigo-500 via-sky-400 to-emerald-400 shadow-2xl isolate">
            <div className="relative rounded-[26px] overflow-hidden bg-slate-100 dark:bg-slate-800">
              <SignedImage
                filePath={avatar}
                className="w-28 h-28 sm:w-36 sm:h-36 object-cover transition-transform duration-300 group-hover:scale-105 rounded-[26px]"
                alt={name}
              />
              <button
                type="button"
                onClick={onAvatarUploadClick}
                className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-[26px] flex flex-col items-center justify-center text-white gap-1.5 cursor-pointer backdrop-blur-[2px]"
                aria-label={locale === 'vi' ? 'Thay ảnh đại diện' : 'Change profile photo'}
              >
                <Camera className="w-5 h-5 text-white" />
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full border border-white/30">
                  {locale === 'vi' ? 'Đổi ảnh' : 'Upload'}
                </span>
              </button>
            </div>
          </div>
          {/* Active Presence Dot with Glow Ring */}
          <div
            className={`absolute bottom-2 right-2 w-7 h-7 rounded-full border-4 border-white dark:border-slate-900 shadow-lg ${presenceDotClass(accountPresenceStatus, true)}`}
            title={presenceLabel}
          />
        </div>

        {/* User Identity Details & Meta Chips */}
        <div className="flex-1 text-center md:text-left space-y-3 pt-1 md:pt-2 w-full">
          {/* Row 1: Name + Role + Pro Badge + Custom Status */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {name}
            </h1>

            {/* Role Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                role === 'admin'
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/80'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {role === 'admin' ? (
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              ) : (
                <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{role === 'admin' ? 'Admin' : role === 'guest' ? 'Guest' : 'Member'}</span>
            </span>

            {/* Pro / Free Tier Badge */}
            {isPremium ? (
              <span className="text-[10px] font-black tracking-widest bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white px-2.5 py-1 rounded-xl uppercase shadow-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> PRO
              </span>
            ) : (
              <span className="text-[10px] font-black tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-xl uppercase border border-slate-200 dark:border-slate-700">
                FREE
              </span>
            )}

            {/* Custom Status Quick Pill */}
            <button
              type="button"
              onClick={onStatusClick}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-100/90 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer hover:scale-102 active:scale-98 shadow-2xs"
              title={locale === 'vi' ? 'Nhấp để sửa trạng thái tùy chỉnh' : 'Edit custom status'}
            >
              <span className="text-sm">{statusEmoji}</span>
              <span className="truncate max-w-[220px] font-semibold">
                {statusMessage || (locale === 'vi' ? 'Đặt trạng thái...' : 'Set status...')}
              </span>
            </button>
          </div>

          {/* Row 2: Metadata Chips */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            {jobTitle && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 font-semibold">
                <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                <span>{jobTitle}</span>
              </span>
            )}
            {department && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 font-semibold">
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                <span>{department}</span>
              </span>
            )}
            {location && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>{location}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 font-mono text-[11px] font-semibold">
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <span>{email}</span>
            </span>
            {phone && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 font-semibold">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                <span>{phone}</span>
              </span>
            )}
            {website && (
              <a
                href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60 hover:underline font-semibold"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Portfolio</span>
              </a>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-slate-400 text-[11px] font-semibold">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>{locale === 'vi' ? `Gia nhập ${joinedDate || '2026'}` : `Joined ${joinedDate || '2026'}`}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Segmented Control Pill Tabs Navigation ── */}
      <div className="px-6 sm:px-8 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between gap-4 overflow-x-auto custom-scrollbar">
        <div className="flex items-center p-1.5 bg-slate-200/60 dark:bg-slate-800/80 rounded-2xl gap-1 shrink-0 relative">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`relative px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0 z-10 ${
                  isCurrent
                    ? 'text-indigo-600 dark:text-indigo-400 font-black'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {isCurrent && (
                  <motion.div
                    layoutId="activeProfileTab"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="absolute inset-0 bg-white dark:bg-slate-900 rounded-xl shadow-sm z-[-1]"
                  />
                )}
                <Icon className={`w-4 h-4 ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{locale === 'vi' ? tab.labelVi : tab.labelEn}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      isCurrent
                        ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'bg-slate-300/60 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Profile Completeness Ring & Percentage */}
        <div className="hidden lg:flex items-center gap-3 text-xs font-bold text-slate-500 shrink-0">
          <span>{locale === 'vi' ? 'Độ hoàn thiện hồ sơ:' : 'Completeness:'}</span>
          <div className="w-28 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${profileCompleteness}%` }}
            />
          </div>
          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black">{profileCompleteness}%</span>
        </div>
      </div>
    </div>
  );
};
