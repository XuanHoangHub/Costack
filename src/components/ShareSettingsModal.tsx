"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Globe, Lock, UserPlus, Trash2, X, Check, 
  ShieldAlert, Link2, Copy, Search, CheckCircle2,
  FolderTree, Folder, FileText, CheckSquare, Sparkles,
  QrCode, Download, Share2, Mail, Send, Code2, ExternalLink,
  Smartphone, Eye, MessageSquare, Edit3, ShieldCheck, CheckCheck
} from 'lucide-react';
import QRCode from 'qrcode';
import { User, ShareRole, ShareTargetType } from '../types';
import SignedImage from './SignedImage';
import { useTranslation } from '../contexts/TranslationContext';
import { createPortal } from 'react-dom';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

export interface ShareSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ShareTargetType;
  targetId: string;
  targetName: string;
  isPrivate: boolean;
  shareSettings: Record<string, ShareRole>;
  members: User[];
  currentUser: any;
  onSave: (isPrivate: boolean, shareSettings: Record<string, ShareRole>) => void;
  canEdit: boolean;
  customShareUrl?: string;
  spaceId?: string;
  folderId?: string;
  description?: string;
}

type TabType = 'access' | 'qrcode' | 'social' | 'embed';

export default function ShareSettingsModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  isPrivate: initialIsPrivate,
  shareSettings: initialShareSettings,
  members,
  currentUser,
  onSave,
  canEdit,
  customShareUrl,
  spaceId,
  folderId,
  description
}: ShareSettingsModalProps) {
  const { isVietnamese, locale } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('access');
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [shareSettings, setShareSettings] = useState<Record<string, ShareRole>>(initialShareSettings || {});
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<ShareRole>('view');
  const [memberSearch, setMemberSearch] = useState('');
  const [sharedListSearch, setSharedListSearch] = useState('');
  
  // Feedback states
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedQr, setCopiedQr] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [embedHeight, setEmbedHeight] = useState<'450' | '600' | '800'>('600');

  // Tab horizontal scroll & blur overflow state
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkTabScroll = useCallback(() => {
    const el = tabScrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 2;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    checkTabScroll();
    const handleResize = () => checkTabScroll();
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(checkTabScroll, 80);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [isOpen, checkTabScroll, activeTab]);

  const handleTabWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = tabScrollRef.current;
    if (!el) return;
    if (e.deltaY !== 0 && el.scrollWidth > el.clientWidth) {
      el.scrollLeft += e.deltaY;
      checkTabScroll();
    }
  };

  const handleSelectTab = (tab: TabType, e?: React.MouseEvent<HTMLButtonElement>) => {
    setActiveTab(tab);
    e?.currentTarget?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  // Sync state when props change
  useEffect(() => {
    setIsPrivate(initialIsPrivate);
    setShareSettings(initialShareSettings || {});
    setMemberSearch('');
    setSelectedUserId('');
    setSharedListSearch('');
    setActiveTab('access');
  }, [initialIsPrivate, initialShareSettings, isOpen, targetId]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Generate shareable link
  const shareUrl = useMemo(() => {
    if (customShareUrl) return customShareUrl;
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const path = window.location.pathname === '/' ? '' : window.location.pathname;
    const base = `${origin}${path}`;

    switch (targetType) {
      case 'space':
        return `${base}?space=${targetId}`;
      case 'folder':
        return spaceId ? `${base}?space=${spaceId}&folder=${targetId}` : `${base}?folder=${targetId}`;
      case 'list':
        return spaceId ? `${base}?space=${spaceId}&list=${targetId}` : `${base}?list=${targetId}`;
      case 'task':
        return spaceId ? `${base}?space=${spaceId}&task=${targetId}` : `${base}?task=${targetId}`;
      case 'doc':
        return `${base}?doc=${targetId}`;
      case 'whiteboard':
        return `${base}?whiteboard=${targetId}`;
      default:
        return `${base}?item=${targetId}`;
    }
  }, [customShareUrl, targetType, targetId, spaceId]);

  // Generate QR Code as DataURL
  useEffect(() => {
    if (!shareUrl || !isOpen) return;
    let isMounted = true;
    QRCode.toDataURL(shareUrl, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => {
        if (isMounted) setQrCodeDataUrl(url);
      })
      .catch(err => {
        console.error('Error generating QR code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [shareUrl, isOpen]);

  // Embed snippet
  const embedSnippet = useMemo(() => {
    if (!shareUrl) return '';
    const embedUrl = `${shareUrl}${shareUrl.includes('?') ? '&' : '?'}embed=true`;
    return `<iframe src="${embedUrl}" width="100%" height="${embedHeight}" frameborder="0" allow="fullscreen; clipboard-read; clipboard-write" loading="lazy"></iframe>`;
  }, [shareUrl, embedHeight]);

  if (!isOpen) return null;

  // Filter members that can be added (not yourself, not already in share settings)
  const addableMembers = members.filter(m => {
    const cleanId = m.userId || (m.id === 'user' ? currentUser?.id : m.id.replace('user-', ''));
    const cleanCurrentUserId = currentUser?.id;
    
    if (cleanId === cleanCurrentUserId) return false;
    if (shareSettings[cleanId]) return false;

    if (memberSearch.trim()) {
      const q = memberSearch.toLowerCase();
      return m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
    }
    return true;
  });

  const handleAddMember = () => {
    if (!selectedUserId || !canEdit) return;
    setShareSettings(prev => ({
      ...prev,
      [selectedUserId]: selectedRole
    }));
    setSelectedUserId('');
    setMemberSearch('');
  };

  const handleRemoveMember = (userId: string) => {
    if (!canEdit) return;
    const next = { ...shareSettings };
    delete next[userId];
    setShareSettings(next);
  };

  const handleRoleChange = (userId: string, newRole: ShareRole) => {
    if (!canEdit) return;
    setShareSettings(prev => ({
      ...prev,
      [userId]: newRole
    }));
  };

  const handleSave = () => {
    if (canEdit) {
      onSave(isPrivate, shareSettings);
    }
    onClose();
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleCopyMarkdown = async () => {
    if (!shareUrl) return;
    try {
      const md = `[${targetName}](${shareUrl})`;
      await navigator.clipboard.writeText(md);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleCopyEmbed = async () => {
    if (!embedSnippet) return;
    try {
      await navigator.clipboard.writeText(embedSnippet);
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    a.download = `apexa-${targetType}-${targetId.slice(-6)}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyQrImage = async () => {
    if (!qrCodeDataUrl) return;
    try {
      const res = await fetch(qrCodeDataUrl);
      const blob = await res.blob();
      if (typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopiedQr(true);
        setTimeout(() => setCopiedQr(false), 2200);
      } else {
        handleCopyLink();
      }
    } catch {
      handleCopyLink();
    }
  };

  const canWebShare = typeof navigator !== 'undefined' && !!navigator.share;
  const handleWebShare = async () => {
    if (!canWebShare || !shareUrl) return;
    try {
      await navigator.share({
        title: targetName,
        text: isVietnamese ? `Xem ${getTargetLabel()} "${targetName}" trên Costack` : `View ${getTargetLabel()} "${targetName}" on Costack`,
        url: shareUrl
      });
    } catch {
      // User cancelled share
    }
  };

  const getTargetIcon = () => {
    switch (targetType) {
      case 'space': return <FolderTree className="w-5 h-5" />;
      case 'folder': return <Folder className="w-5 h-5" />;
      case 'doc': return <FileText className="w-5 h-5" />;
      case 'task': return <CheckSquare className="w-5 h-5" />;
      case 'whiteboard': return <Sparkles className="w-5 h-5" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  const getTargetLabel = () => {
    switch (targetType) {
      case 'space': return isVietnamese ? 'Không gian' : 'Space';
      case 'folder': return isVietnamese ? 'Thư mục' : 'Folder';
      case 'doc': return isVietnamese ? 'Tài liệu' : 'Document';
      case 'task': return isVietnamese ? 'Công việc' : 'Task';
      case 'whiteboard': return isVietnamese ? 'Bảng trắng' : 'Whiteboard';
      default: return isVietnamese ? 'Danh sách' : 'List';
    }
  };

  const getRoleLabel = (role: ShareRole) => {
    switch (role) {
      case 'edit': return isVietnamese ? 'Chỉnh sửa (Editor)' : 'Editor';
      case 'comment': return isVietnamese ? 'Bình luận (Commenter)' : 'Commenter';
      default: return isVietnamese ? 'Chỉ xem (Viewer)' : 'Viewer';
    }
  };

  const filteredSharedMembers = Object.entries(shareSettings).filter(([userId]) => {
    if (!sharedListSearch.trim()) return true;
    const member = members.find(m => {
      const cleanId = m.userId || (m.id === 'user' ? currentUser?.id : m.id.replace('user-', ''));
      return cleanId === userId;
    });
    if (!member) return false;
    const q = sharedListSearch.toLowerCase();
    return member.name?.toLowerCase().includes(q) || member.email?.toLowerCase().includes(q);
  });

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="share-settings-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 font-sans"
          >
            {/* Backdrop */}
            <motion.div
              key="share-settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 modal-backdrop bg-black/40 dark:bg-black/75 cursor-pointer"
              onClick={onClose}
            />

            {/* Modal Card */}
            <motion.div
              key="share-settings-card"
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col text-left select-none max-h-[92vh]"
            >
        
        {/* Top Header */}
        <div className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-sky-950/40 border border-blue-100/60 dark:border-sky-800/40 flex items-center justify-center text-blue-600 dark:text-sky-400 shadow-2xs shrink-0">
              {getTargetIcon()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider leading-tight">
                  {isVietnamese ? `Chia sẻ ${getTargetLabel()}` : `Share ${getTargetLabel()}`}
                </h4>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 dark:bg-sky-950/40 text-blue-600 dark:text-sky-400 border border-blue-100 dark:border-sky-800/50">
                  {targetType.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold truncate max-w-[320px] mt-0.5">
                {targetName}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation with Blur Overflow Masks */}
        <div className="relative border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 shrink-0 overflow-hidden">
          {/* Scrollable Tab Buttons Row */}
          <div
            ref={tabScrollRef}
            onScroll={checkTabScroll}
            onWheel={handleTabWheel}
            className="px-4 sm:px-5 pt-3 pb-2 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth select-none"
          >
            <button
              type="button"
              onClick={(e) => handleSelectTab('access', e)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'access'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 shadow-xs border border-slate-200/80 dark:border-slate-700 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isVietnamese ? 'Quyền & Thành viên' : 'Access & Members'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSelectTab('qrcode', e)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'qrcode'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 shadow-xs border border-slate-200/80 dark:border-slate-700 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{isVietnamese ? 'Mã QR' : 'QR Code'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSelectTab('social', e)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'social'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 shadow-xs border border-slate-200/80 dark:border-slate-700 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{isVietnamese ? 'Chia sẻ mạng xã hội' : 'Social & Apps'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSelectTab('embed', e)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'embed'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 shadow-xs border border-slate-200/80 dark:border-slate-700 font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{isVietnamese ? 'Mã nhúng Iframe' : 'Embed Code'}</span>
            </button>

            {/* Trailing spacer so the last tab button is not flush against edge when scrolled */}
            <div className="w-6 shrink-0" aria-hidden="true" />
          </div>

          {/* Left Blur Fade Mask (appears when scrolled right) */}
          <div
            className={`pointer-events-none absolute left-0 top-0 bottom-0 w-10 sm:w-14 bg-gradient-to-r from-slate-50 via-slate-50/80 to-transparent dark:from-slate-900 dark:via-slate-900/80 dark:to-transparent backdrop-blur-[2.5px] transition-opacity duration-200 z-10 ${
              canScrollLeft ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden="true"
          />

          {/* Right Blur Fade Mask (appears when content overflows) */}
          <div
            className={`pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-l from-slate-50 via-slate-50/80 to-transparent dark:from-slate-900 dark:via-slate-900/80 dark:to-transparent backdrop-blur-[2.5px] transition-opacity duration-200 z-10 ${
              canScrollRight ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden="true"
          />
        </div>

        {/* Modal Body Container */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
          
          {/* Read-only Notice Banner */}
          {!canEdit && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl text-amber-700 dark:text-amber-400 text-xs font-semibold leading-relaxed">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{isVietnamese ? 'Bạn đang xem phân quyền ở chế độ chỉ đọc.' : 'You are viewing permissions in read-only mode.'}</span>
            </div>
          )}

          {/* Quick Link Bar across tabs */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
              <input 
                readOnly 
                value={shareUrl} 
                className="w-full text-xs font-mono text-slate-600 dark:text-slate-300 bg-transparent border-none outline-none select-all truncate" 
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title={isVietnamese ? 'Sao chép đường dẫn' : 'Copy link'}
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? (isVietnamese ? 'Đã chép' : 'Copied') : (isVietnamese ? 'Chép link' : 'Copy link')}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer hidden sm:flex items-center gap-1"
                title={isVietnamese ? 'Sao chép định dạng Markdown' : 'Copy as Markdown'}
              >
                {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Code2 className="w-3.5 h-3.5" />}
                <span className="text-[11px] font-bold">MD</span>
              </button>
            </div>
          </div>

          {/* TAB 1: ACCESS & PERMISSIONS */}
          {activeTab === 'access' && (
            <div className="space-y-4 animate-fade-in">
              {/* General Access & Privacy Cards */}
              <div className="space-y-2">
                <span className="text-[10.5px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block">
                  {isVietnamese ? 'Mức độ riêng tư & Quyền chung' : 'General Access & Privacy'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => canEdit && setIsPrivate(false)}
                    className={`p-3.5 rounded-2xl border flex flex-col items-start gap-1.5 transition-all text-left ${
                      !canEdit ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      !isPrivate
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-sky-950/30 text-blue-700 dark:text-sky-400 shadow-2xs font-bold ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                      <div className="text-xs font-bold leading-none">{isVietnamese ? 'Nội bộ Workspace' : 'Workspace Public'}</div>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                      {isVietnamese ? 'Tất cả thành viên trong Workspace đều có thể mở và truy cập' : 'All workspace members can open and view'}
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => canEdit && setIsPrivate(true)}
                    className={`p-3.5 rounded-2xl border flex flex-col items-start gap-1.5 transition-all text-left ${
                      !canEdit ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      isPrivate
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-sky-950/30 text-blue-700 dark:text-sky-400 shadow-2xs font-bold ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-500" />
                      <div className="text-xs font-bold leading-none">{isVietnamese ? 'Riêng tư (Chỉ người được mời)' : 'Private (Invited only)'}</div>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                      {isVietnamese ? 'Chỉ những thành viên được chỉ định phân quyền mới truy cập được' : 'Only members specifically granted access can view'}
                    </div>
                  </button>
                </div>
              </div>

              {/* Add Member Form */}
              {canEdit && (
                <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block">
                    {isVietnamese ? 'Thêm thành viên và chỉ định quyền' : 'Add member & assign role'}
                  </span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 relative">
                      <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-bold"
                      >
                        <option value="">{isVietnamese ? 'Chọn thành viên Workspace...' : 'Select workspace member...'}</option>
                        {addableMembers.map(m => (
                          <option key={m.id} value={m.userId || (m.id === 'user' ? currentUser?.id : m.id.replace('user-', ''))}>
                            {m.name} ({m.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex gap-2">
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as ShareRole)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer font-bold"
                      >
                        <option value="view">{isVietnamese ? 'Chỉ xem (Viewer)' : 'Viewer'}</option>
                        <option value="comment">{isVietnamese ? 'Bình luận (Commenter)' : 'Commenter'}</option>
                        <option value="edit">{isVietnamese ? 'Chỉnh sửa (Editor)' : 'Editor'}</option>
                      </select>

                      <button
                        type="button"
                        onClick={handleAddMember}
                        disabled={!selectedUserId}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{isVietnamese ? 'Thêm' : 'Add'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Members with Access List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block">
                    {isVietnamese ? 'Danh sách thành viên có quyền' : 'Members with access'} ({Object.keys(shareSettings).length + 1})
                  </span>
                  {Object.keys(shareSettings).length > 3 && (
                    <div className="relative w-36">
                      <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                      <input 
                        type="text"
                        placeholder={isVietnamese ? "Lọc thành viên..." : "Filter..."}
                        value={sharedListSearch}
                        onChange={(e) => setSharedListSearch(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 rounded-lg pl-6 pr-2 py-1 text-[11px] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900 max-h-[220px] overflow-y-auto custom-scrollbar">
                  {/* Always show Owner as Owner / Full Access */}
                  <div className="flex items-center justify-between p-3 bg-slate-50/70 dark:bg-slate-950/40">
                    <div className="flex items-center gap-3 min-w-0">
                      <SignedImage 
                        filePath={currentUser?.avatar} 
                        className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover shrink-0" 
                        alt={currentUser?.name || "Chủ sở hữu"} 
                      />
                      <div className="text-left min-w-0">
                        <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                          {currentUser?.name || (isVietnamese ? "Chủ sở hữu" : "Owner")}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block truncate">
                          {currentUser?.email}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg bg-blue-50 dark:bg-sky-950/40 text-blue-700 dark:text-sky-400 border border-blue-200/50 dark:border-sky-800/50 shrink-0">
                      {isVietnamese ? 'Chủ sở hữu' : 'Owner'}
                    </span>
                  </div>

                  {/* Shared Members List */}
                  {filteredSharedMembers.map(([userId, role]) => {
                    const member = members.find(m => {
                      const cleanId = m.userId || (m.id === 'user' ? currentUser?.id : m.id.replace('user-', ''));
                      return cleanId === userId;
                    });

                    if (!member) return null;

                    return (
                      <div key={userId} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <SignedImage 
                            filePath={member.avatar} 
                            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover shrink-0" 
                            alt={member.name} 
                          />
                          <div className="text-left min-w-0">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                              {member.name}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                              {member.email}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {canEdit ? (
                            <select
                              value={role}
                              onChange={(e) => handleRoleChange(userId, e.target.value as ShareRole)}
                              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10.5px] font-bold px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                            >
                              <option value="view">{isVietnamese ? 'Chỉ xem' : 'Viewer'}</option>
                              <option value="comment">{isVietnamese ? 'Bình luận' : 'Commenter'}</option>
                              <option value="edit">{isVietnamese ? 'Chỉnh sửa' : 'Editor'}</option>
                            </select>
                          ) : (
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {getRoleLabel(role)}
                            </span>
                          )}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(userId)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                              title={isVietnamese ? 'Thu hồi quyền truy cập' : 'Revoke access'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: QR CODE */}
          {activeTab === 'qrcode' && (
            <div className="space-y-4 text-center py-2 animate-fade-in">
              <div className="p-5 bg-slate-50 dark:bg-slate-950/60 rounded-3xl border border-slate-200 dark:border-slate-800 inline-block shadow-inner">
                {qrCodeDataUrl ? (
                  <div className="bg-white p-4 rounded-2xl shadow-md inline-block">
                    <img 
                      src={qrCodeDataUrl} 
                      alt="Costack QR Code" 
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center text-slate-400">
                    <QrCode className="w-12 h-12 animate-pulse" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <h5 className="text-sm font-black text-slate-900 dark:text-white">
                  {isVietnamese ? 'Quét mã để truy cập nhanh' : 'Scan to open on mobile'}
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto">
                  {isVietnamese 
                    ? 'Sử dụng máy ảnh hoặc ứng dụng quét mã QR trên điện thoại để mở trực tiếp trên thiết bị di động.' 
                    : 'Use your phone camera or QR scanner app to open this item immediately on your device.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isVietnamese ? 'Tải ảnh QR (.png)' : 'Download QR (.png)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyQrImage}
                  className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  {copiedQr ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedQr ? (isVietnamese ? 'Đã sao chép ảnh' : 'Image copied') : (isVietnamese ? 'Sao chép ảnh QR' : 'Copy QR image')}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SOCIAL & QUICK SHARE */}
          {activeTab === 'social' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <span className="text-[10.5px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block">
                  {isVietnamese ? 'Chia sẻ trực tiếp qua ứng dụng & mạng xã hội' : 'Share via App & Social Channels'}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {isVietnamese 
                    ? 'Gửi nhanh liên kết tới đồng nghiệp, nhóm chat hoặc đối tác bên ngoài.' 
                    : 'Quickly send this link to colleagues, chat groups, or external partners.'}
                </p>
              </div>

              {/* Native Web Share API if available */}
              {canWebShare && (
                <button
                  type="button"
                  onClick={handleWebShare}
                  className="w-full p-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl flex items-center justify-between font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4" />
                    <span>{isVietnamese ? 'Chia sẻ qua ứng dụng thiết bị...' : 'Share via device app...'}</span>
                  </div>
                  <Share2 className="w-4 h-4" />
                </button>
              )}

              {/* Social Channels Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Email */}
                <a
                  href={`mailto:?subject=${encodeURIComponent(`[Costack] ${targetName}`)}&body=${encodeURIComponent(
                    `Xin chào,\n\nMời bạn xem ${getTargetLabel()} "${targetName}" trên Costack qua liên kết:\n${shareUrl}\n\nTrân trọng!`
                  )}`}
                  className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex flex-col items-center gap-2 text-center transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Email</span>
                </a>

                {/* Telegram */}
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`[Costack] ${targetName}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex flex-col items-center gap-2 text-center transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Send className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Telegram</span>
                </a>

                {/* Zalo */}
                <a
                  href={`https://sp.zalo.me/share_inline?link=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex flex-col items-center gap-2 text-center transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Zalo</span>
                </a>

                {/* WhatsApp */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${targetName} - ${shareUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex flex-col items-center gap-2 text-center transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">WhatsApp</span>
                </a>
              </div>

              {/* Formatted Markdown Box */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    {isVietnamese ? 'Định dạng Markdown (Cho Notion, Slack, Discord)' : 'Markdown Link format'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyMarkdown}
                    className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedMd ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMd ? (isVietnamese ? 'Đã chép' : 'Copied') : (isVietnamese ? 'Sao chép' : 'Copy')}</span>
                  </button>
                </div>
                <code className="block p-2 bg-white dark:bg-slate-900 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 truncate border border-slate-200/60 dark:border-slate-800">
                  {`[${targetName}](${shareUrl})`}
                </code>
              </div>
            </div>
          )}

          {/* TAB 4: EMBED SNIPPET */}
          {activeTab === 'embed' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <span className="text-[10.5px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block">
                  {isVietnamese ? 'Mã nhúng tương tác Iframe' : 'Interactive Iframe Embed'}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {isVietnamese 
                    ? 'Nhúng trực tiếp vào tài liệu nội bộ, Notion, Confluence hoặc trang web của bạn.' 
                    : 'Embed directly into internal docs, Notion, Confluence, or your custom website.'}
                </p>
              </div>

              {/* Height switcher */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {isVietnamese ? 'Chiều cao khung nhúng:' : 'Embed height:'}
                </span>
                <div className="flex items-center gap-1">
                  {(['450', '600', '800'] as const).map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setEmbedHeight(h)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        embedHeight === h
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {h}px
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Snippet Box */}
              <div className="p-3.5 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 space-y-2.5 shadow-md">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800">
                  <span className="font-mono text-[11px] font-bold">HTML IFRAME</span>
                  <button
                    type="button"
                    onClick={handleCopyEmbed}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    {copiedEmbed ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedEmbed ? (isVietnamese ? 'Đã sao chép' : 'Copied') : (isVietnamese ? 'Sao chép mã nhúng' : 'Copy snippet')}</span>
                  </button>
                </div>
                <pre className="font-mono text-xs text-blue-300 overflow-x-auto custom-scrollbar p-1 leading-relaxed whitespace-pre-wrap break-all">
                  {embedSnippet}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 px-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/30 shrink-0">
          <div className="text-[11px] font-medium text-slate-400">
            {canEdit ? (
              isVietnamese ? 'Thay đổi sẽ có hiệu lực ngay sau khi lưu.' : 'Changes apply immediately after saving.'
            ) : (
              isVietnamese ? 'Chế độ xem quyền hạn' : 'View permissions only'
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {isVietnamese ? (canEdit ? 'Hủy' : 'Đóng') : (canEdit ? 'Cancel' : 'Close')}
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isVietnamese ? 'Lưu thay đổi' : 'Save changes'}</span>
              </button>
            )}
          </div>
        </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
