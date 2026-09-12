"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ChevronDown, User, Users, ShieldCheck, 
  Check, Plus, AlertCircle, Loader2, Copy, Link as LinkIcon,
  Sparkles, UserPlus, ArrowRight, Clock, RefreshCw, Trash2,
  Send, Mail, Shield, CheckCircle2, Share2, ExternalLink
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useTranslation } from '@/contexts/TranslationContext';
import { supabase } from '@/supabaseClient';
import { createPortal } from 'react-dom';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

export interface WorkspaceInviteItem {
  id: string;
  workspace_id: string;
  workspace_name?: string;
  email: string;
  role: string;
  invited_by?: string;
  invited_by_name?: string;
  status: string;
  token?: string;
  created_at?: string;
  expires_at?: string;
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendInvites: (emails: string[], role: string) => void | Promise<void>;
  workspaceName?: string;
  onOpenManualAdd?: () => void;
}

interface RoleOption {
  id: string;
  name: string;
  badge?: string;
  description: string;
  icon: React.ComponentType<any>;
}

export default function InviteModal({
  isOpen,
  onClose,
  onSendInvites,
  workspaceName,
  onOpenManualAdd,
}: InviteModalProps) {
  const { t, isVietnamese } = useTranslation();
  const [inviteTab, setInviteTab] = useState<'email' | 'link' | 'pending'>('email');
  const [inputValue, setInputValue] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('member');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmailMap, setCopiedEmailMap] = useState<Record<string, boolean>>({});

  // Sent success view state
  const [sentInvites, setSentInvites] = useState<{ email: string; role: string; link: string }[] | null>(null);

  // Pending invites state
  const [pendingInvites, setPendingInvites] = useState<WorkspaceInviteItem[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const workspaces = useWorkspaceStore(s => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const activeWS = workspaces.find(w => w.id === activeWorkspaceId);
  const displayWSName = workspaceName || activeWS?.name || (isVietnamese ? 'Không gian làm việc' : 'Workspace');

  const roleOptions: RoleOption[] = useMemo(() => [
    {
      id: 'member',
      name: isVietnamese ? 'Thành viên (Member)' : 'Member',
      description: isVietnamese 
        ? 'Toàn quyền tham gia các mục, tác vụ và tài liệu chung trong Không gian làm việc.' 
        : 'Can access and collaborate across public projects, tasks, and documents.',
      icon: Users,
    },
    {
      id: 'admin',
      name: isVietnamese ? 'Quản trị viên (Admin)' : 'Admin',
      description: isVietnamese 
        ? 'Quyền cao nhất: Quản lý thành viên, phân quyền, cấu hình không gian và tích hợp.' 
        : 'Full administrative access: Manage people, permissions, spaces, and workspace settings.',
      icon: ShieldCheck,
    },
    {
      id: 'guest',
      name: isVietnamese ? 'Khách (Guest)' : 'Guest',
      description: isVietnamese 
        ? 'Chỉ có thể truy cập các mục, tài liệu hoặc công việc được chia sẻ đích danh.' 
        : 'Restricted access: Can only view or edit items specifically shared with them.',
      icon: User,
    }
  ], [isVietnamese]);

  // Load pending invites
  const fetchPendingInvites = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoadingPending(true);
    try {
      let cloudList: WorkspaceInviteItem[] = [];
      try {
        const { data, error } = await supabase
          .from('workspace_invitations')
          .select('*')
          .eq('workspace_id', activeWorkspaceId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (!error && data) {
          cloudList = data as WorkspaceInviteItem[];
        }
      } catch (_) {}

      let localList: WorkspaceInviteItem[] = [];
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('apexa_workspace_invitations');
          if (raw) {
            const parsed = JSON.parse(raw);
            localList = parsed
              .filter((inv: any) => inv.workspaceId === activeWorkspaceId && inv.status === 'pending')
              .map((inv: any) => ({
                id: inv.id,
                workspace_id: inv.workspaceId,
                workspace_name: inv.workspaceName,
                email: inv.email,
                role: inv.role,
                status: inv.status,
                token: inv.token,
                created_at: inv.createdAt,
                expires_at: inv.expiresAt,
                invited_by_name: inv.invitedByName
              }));
          }
        } catch (_) {}
      }

      // Merge and deduplicate by email
      const map = new Map<string, WorkspaceInviteItem>();
      [...cloudList, ...localList].forEach(item => {
        if (!map.has(item.email.toLowerCase())) {
          map.set(item.email.toLowerCase(), item);
        }
      });

      setPendingInvites(Array.from(map.values()));
    } finally {
      setLoadingPending(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (isOpen) {
      fetchPendingInvites();
      setSentInvites(null);
      setValidationError('');
    }
  }, [isOpen, fetchPendingInvites]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeRole = roleOptions.find(r => r.id === selectedRoleId) || roleOptions[0];
  const ActiveIcon = activeRole.icon;

  const handleSelectRole = (roleId: string) => {
    setSelectedRoleId(roleId);
    setIsDropdownOpen(false);
  };

  // Helper to parse multiple emails
  const parseAndAddEmails = (rawInput: string) => {
    setValidationError('');
    if (!rawInput.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Split by comma, semicolon, whitespace, newline
    const tokens = rawInput.split(/[,;\s\n\r]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
    const validToAdd: string[] = [];
    const invalidList: string[] = [];
    const existingList: string[] = [];

    tokens.forEach(token => {
      if (!emailRegex.test(token)) {
        invalidList.push(token);
      } else if (emails.includes(token) || validToAdd.includes(token)) {
        existingList.push(token);
      } else {
        validToAdd.push(token);
      }
    });

    if (validToAdd.length > 0) {
      setEmails(prev => [...prev, ...validToAdd]);
      setInputValue('');
    }

    if (invalidList.length > 0) {
      setValidationError(isVietnamese 
        ? `Định dạng email không hợp lệ: ${invalidList.slice(0, 3).join(', ')}${invalidList.length > 3 ? '...' : ''}` 
        : `Invalid email format: ${invalidList.slice(0, 3).join(', ')}`);
    } else if (existingList.length > 0 && validToAdd.length === 0) {
      setValidationError(isVietnamese ? 'Các email này đã có trong danh sách.' : 'These emails are already in the list.');
    }
  };

  const removeEmail = (indexToRemove: number) => {
    setEmails(emails.filter((_, i) => i !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      parseAndAddEmails(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      removeEmail(emails.length - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && (pastedText.includes(',') || pastedText.includes(';') || pastedText.includes(' ') || pastedText.includes('\n'))) {
      e.preventDefault();
      parseAndAddEmails(pastedText);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const finalEmails = [...emails];
    if (inputValue.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const cleanEmail = inputValue.trim().toLowerCase();
      if (!emailRegex.test(cleanEmail)) {
        setValidationError(isVietnamese ? `Email không hợp lệ: ${cleanEmail}` : `Invalid email format: ${cleanEmail}`);
        return;
      }
      if (!finalEmails.includes(cleanEmail)) {
        finalEmails.push(cleanEmail);
      }
    }

    if (finalEmails.length === 0) {
      setValidationError(isVietnamese ? 'Vui lòng nhập ít nhất một địa chỉ email hợp lệ.' : 'Please enter at least one valid email address.');
      return;
    }

    setIsSending(true);
    try {
      await onSendInvites(finalEmails, selectedRoleId);
      (window as any).playSystemSound?.('success');

      // Generate shareable links array for success preview
      const createdLinks = finalEmails.map(email => ({
        email,
        role: selectedRoleId,
        link: typeof window !== 'undefined'
          ? `${window.location.origin}/?invite_ws=${activeWorkspaceId}&role=${selectedRoleId}&email=${encodeURIComponent(email)}`
          : ''
      }));

      setSentInvites(createdLinks);
      setInputValue('');
      setEmails([]);
      fetchPendingInvites();
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : (isVietnamese ? 'Không thể tạo lời mời. Vui lòng thử lại.' : 'Could not create the invitation. Please try again.'));
    } finally {
      setIsSending(false);
    }
  };

  const shareableDirectLink = typeof window !== 'undefined'
    ? `${window.location.origin}/?invite_ws=${activeWorkspaceId}&role=${selectedRoleId}`
    : '';

  const handleCopyShareableLink = (customLink?: string, emailKey?: string) => {
    const linkToCopy = customLink || shareableDirectLink;
    if (!linkToCopy) return;
    navigator.clipboard.writeText(linkToCopy);
    (window as any).playSystemSound?.('click');

    if (emailKey) {
      setCopiedEmailMap(prev => ({ ...prev, [emailKey]: true }));
      setTimeout(() => setCopiedEmailMap(prev => ({ ...prev, [emailKey]: false })), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Resend invitation handler
  const handleResendInvitation = async (inv: WorkspaceInviteItem) => {
    setResendingId(inv.id);
    try {
      let newToken = '';
      try {
        const { data, error } = await supabase.rpc('resend_workspace_invitation', { invitation_id: inv.id });
        if (!error && data) {
          newToken = (data as any).token;
        }
      } catch (_) {}

      const link = newToken
        ? `${window.location.origin}/?invite_token=${newToken}`
        : `${window.location.origin}/?invite_ws=${activeWorkspaceId}&role=${inv.role}&email=${encodeURIComponent(inv.email)}`;

      handleCopyShareableLink(link, inv.id);
      await fetchPendingInvites();
    } finally {
      setResendingId(null);
    }
  };

  // Revoke invitation handler
  const handleRevokeInvitation = async (inv: WorkspaceInviteItem) => {
    setRevokingId(inv.id);
    try {
      try {
        await supabase.rpc('revoke_workspace_invitation', { invitation_id: inv.id });
      } catch (_) {
        try {
          await supabase.from('workspace_invitations').update({ status: 'revoked' }).eq('id', inv.id);
        } catch (_) {}
      }

      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('apexa_workspace_invitations');
          if (raw) {
            const parsed = JSON.parse(raw);
            const updated = parsed.filter((i: any) => i.id !== inv.id);
            localStorage.setItem('apexa_workspace_invitations', JSON.stringify(updated));
          }
        } catch (_) {}
      }

      setPendingInvites(prev => prev.filter(i => i.id !== inv.id));
      (window as any).playSystemSound?.('delete');
    } finally {
      setRevokingId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          label: isVietnamese ? 'Quản trị viên' : 'Admin',
          class: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
        };
      case 'guest':
        return {
          label: isVietnamese ? 'Khách' : 'Guest',
          class: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
        };
      default:
        return {
          label: isVietnamese ? 'Thành viên' : 'Member',
          class: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800'
        };
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 modal-backdrop bg-slate-950/60 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Glass Container */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="relative w-full max-w-[520px] max-h-[92dvh] overflow-y-auto bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 rounded-[28px] shadow-2xl shadow-slate-900/20 p-5 sm:p-7 z-10 select-none custom-scrollbar text-left backdrop-blur-xl"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                type="button"
                className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title={isVietnamese ? "Đóng" : "Close"}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header Title & Subtitle */}
              <div className="mb-5 pr-8">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10.5px] font-black uppercase tracking-wider mb-2 border border-indigo-100 dark:border-indigo-900/50">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isVietnamese ? 'Cộng tác Đội ngũ' : 'Team Collaboration'}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  {isVietnamese ? `Mời thành viên vào ${displayWSName}` : `Invite people to ${displayWSName}`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                  {isVietnamese 
                    ? 'Cùng nhau quản lý dự án, trao đổi qua tin nhắn và đồng bộ hóa tài liệu thời gian thực.' 
                    : 'Collaborate seamlessly on tasks, projects, docs, and team chats in real time.'}
                </p>
              </div>

              {/* SUCCESS SCREEN VIEW */}
              {sentInvites ? (
                <div className="space-y-5 py-2">
                  <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-3">
                      <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <h4 className="text-base font-black text-emerald-900 dark:text-emerald-100">
                      {isVietnamese ? 'Lời mời đã sẵn sàng!' : 'Invitations Ready!'}
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 max-w-sm">
                      {isVietnamese 
                        ? `Đã tạo thành công lời mời cho ${sentInvites.length} người. Bạn có thể sao chép liên kết bên dưới để gửi trực tiếp cho họ.` 
                        : `Successfully generated invites for ${sentInvites.length} recipient(s). Copy each personal invite link below to send directly.`}
                    </p>
                  </div>

                  {/* List of created invite links */}
                  <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {sentInvites.map((item, idx) => {
                      const isCopied = copiedEmailMap[item.email];
                      return (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                {item.email}
                              </span>
                              <span className="text-[10px] uppercase font-black px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                                {item.role}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                              {item.link}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyShareableLink(item.link, item.email)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                              isCopied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 hover:bg-indigo-600 hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{isCopied ? (isVietnamese ? 'Đã chép' : 'Copied') : (isVietnamese ? 'Sao chép' : 'Copy')}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSentInvites(null)}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isVietnamese ? 'Mời thêm người khác' : 'Invite more people'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md hover:opacity-90"
                    >
                      {isVietnamese ? 'Hoàn tất' : 'Done'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Mode Switcher Tabs */}
                  <div className="flex rounded-xl bg-slate-100/90 dark:bg-slate-800/80 p-1 mb-5 border border-slate-200/50 dark:border-slate-700/50">
                    <button
                      type="button"
                      onClick={() => {
                        (window as any).playSystemSound?.('click');
                        setInviteTab('email');
                      }}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                        inviteTab === 'email'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{isVietnamese ? 'Mời qua Email' : 'Email Invites'}</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        (window as any).playSystemSound?.('click');
                        setInviteTab('link');
                      }}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                        inviteTab === 'link'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>{isVietnamese ? 'Liên kết mời' : 'Invite Link'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        (window as any).playSystemSound?.('click');
                        setInviteTab('pending');
                        fetchPendingInvites();
                      }}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                        inviteTab === 'pending'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{isVietnamese ? 'Đang chờ' : 'Pending'}</span>
                      {pendingInvites.length > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                          inviteTab === 'pending' 
                            ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' 
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          {pendingInvites.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* TAB 1: INVITE VIA EMAIL */}
                  {inviteTab === 'email' && (
                    <form onSubmit={handleSendInvite} className="space-y-4">
                      {/* Smart Emails Input Container */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {isVietnamese ? 'Danh sách địa chỉ email' : 'Recipient Email Addresses'}
                          </label>
                          <span className="text-[10.5px] text-slate-400">
                            {emails.length} {isVietnamese ? 'người được chọn' : 'selected'}
                          </span>
                        </div>
                        
                        <div 
                          onClick={() => inputRef.current?.focus()}
                          className="w-full min-h-[92px] p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all flex flex-wrap gap-1.5 items-start content-start max-h-40 overflow-y-auto custom-scrollbar cursor-text"
                        >
                          {emails.map((email, idx) => (
                            <span 
                              key={idx} 
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 animate-in fade-in zoom-in-95 duration-150"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                              <span>{email}</span>
                              <button 
                                type="button" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeEmail(idx);
                                }} 
                                className="p-0.5 hover:bg-indigo-200/50 dark:hover:bg-indigo-900 rounded-md transition-colors cursor-pointer text-indigo-500 hover:text-indigo-800"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}

                          <input
                            ref={inputRef}
                            type="text"
                            placeholder={emails.length === 0 
                              ? (isVietnamese ? "Nhập hoặc dán email (cách nhau bởi phẩy, khoảng trắng)..." : "Type or paste emails (separated by commas or spaces)...") 
                              : (isVietnamese ? "Thêm email khác..." : "Add another email...")}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onBlur={() => {
                              if (inputValue.trim()) parseAndAddEmails(inputValue);
                            }}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            className="flex-1 min-w-[150px] bg-transparent border-none outline-none text-xs text-slate-800 dark:text-slate-100 font-semibold placeholder-slate-400 dark:placeholder-slate-500 py-1"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          {isVietnamese 
                            ? '💡 Mẹo: Bạn có thể sao chép và dán cùng lúc danh sách nhiều email từ Excel, Slack hoặc văn bản.' 
                            : '💡 Tip: You can copy and paste multiple emails at once from spreadsheets or notes.'}
                        </p>
                      </div>

                      {/* Role Dropdown */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {isVietnamese ? 'Vai trò & Phân quyền' : 'Role & Permissions'}
                        </label>
                        
                        <div ref={dropdownRef} className="relative">
                          <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer text-left focus:border-indigo-500"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                                <ActiveIcon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                                    {activeRole.name}
                                  </span>
                                </div>
                                <p className="text-[10.5px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-medium">
                                  {activeRole.description}
                                </p>
                              </div>
                            </div>
                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                          </button>

                          <AnimatePresence>
                            {isDropdownOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                transition={{ duration: 0.12 }}
                                className="absolute left-0 right-0 mt-1.5 z-[160] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden py-1.5"
                              >
                                <div className="max-h-[240px] overflow-y-auto custom-scrollbar space-y-0.5 p-1">
                                  {roleOptions.map((role) => {
                                    const isSelected = selectedRoleId === role.id;
                                    const IconComponent = role.icon;
                                    return (
                                      <button
                                        key={role.id}
                                        type="button"
                                        onClick={() => handleSelectRole(role.id)}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-start gap-3 transition-colors cursor-pointer ${
                                          isSelected ? 'bg-indigo-50/60 dark:bg-indigo-950/40' : ''
                                        }`}
                                      >
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                          isSelected 
                                            ? 'bg-indigo-600 text-white' 
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                        }`}>
                                          <IconComponent className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between">
                                            <span className={`text-xs font-black ${
                                              isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'
                                            }`}>
                                              {role.name}
                                            </span>
                                            {isSelected && <Check className="w-4 h-4 text-indigo-500 shrink-0" />}
                                          </div>
                                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed font-medium">
                                            {role.description}
                                          </p>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Validation Error Message */}
                      {validationError && (
                        <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-2xl p-3 text-rose-600 dark:text-rose-400">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span className="text-[11px] font-bold leading-relaxed">
                            {validationError}
                          </span>
                        </div>
                      )}

                      {/* Manual add shortcut */}
                      {onOpenManualAdd && (
                        <div className="pt-1 flex items-center justify-between text-xs px-1">
                          <span className="text-slate-400 font-medium">
                            {isVietnamese ? 'Cần thêm tài khoản nội bộ trực tiếp?' : 'Need to add internal user directly?'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenManualAdd();
                            }}
                            className="text-indigo-600 dark:text-indigo-400 font-black hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isVietnamese ? 'Thêm thủ công' : 'Add manually'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="pt-3 flex justify-end gap-2.5 items-center border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={onClose}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          {isVietnamese ? 'Hủy bỏ' : 'Cancel'}
                        </button>
                        <button
                          type="submit"
                          disabled={isSending || (emails.length === 0 && !inputValue.trim())}
                          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-2"
                        >
                          {isSending ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>{isVietnamese ? 'Đang tạo lời mời…' : 'Sending invites…'}</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>
                                {isVietnamese 
                                  ? `Gửi lời mời${emails.length > 0 ? ` (${emails.length})` : ''}` 
                                  : `Send Invites${emails.length > 0 ? ` (${emails.length})` : ''}`}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* TAB 2: SHAREABLE LINK */}
                  {inviteTab === 'link' && (
                    <div className="space-y-4">
                      <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
                        <Share2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-indigo-900 dark:text-indigo-200 font-medium leading-relaxed">
                          {isVietnamese
                            ? 'Bất kỳ ai mở liên kết này đều có thể yêu cầu tham gia workspace của bạn với vai trò đã được thiết lập trước.'
                            : 'Anyone who opens this link will be able to join your workspace with the assigned role.'}
                        </p>
                      </div>

                      {/* Role dropdown for link */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {isVietnamese ? 'Cấp quyền khi tham gia qua liên kết' : 'Role granted via shareable link'}
                        </label>
                        <select
                          value={selectedRoleId}
                          onChange={e => setSelectedRoleId(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none cursor-pointer focus:border-indigo-500"
                        >
                          <option value="member">{isVietnamese ? 'Thành viên (Member) - Khuyên dùng' : 'Member (Recommended)'}</option>
                          <option value="guest">{isVietnamese ? 'Khách mời (Guest) - Quyền hạn chế' : 'Guest (Limited access)'}</option>
                          <option value="admin">{isVietnamese ? 'Quản trị viên (Admin)' : 'Admin'}</option>
                        </select>
                      </div>

                      {/* Link Box */}
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <LinkIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate select-all">
                            {shareableDirectLink}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyShareableLink()}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                            copiedLink
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20'
                          }`}
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedLink ? (isVietnamese ? 'Đã sao chép!' : 'Copied!') : (isVietnamese ? 'Sao chép link' : 'Copy Link')}</span>
                        </button>
                      </div>

                      {/* Instructions */}
                      <div className="text-[11px] text-slate-400 space-y-1 leading-relaxed">
                        <p>• {isVietnamese ? 'Liên kết có hiệu lực ngay lập tức cho các thành viên mới.' : 'This link is active immediately for newly joining members.'}</p>
                        <p>• {isVietnamese ? 'Bạn có thể thu hồi hoặc thay đổi vai trò bất kỳ lúc nào trong Cài đặt Workspace.' : 'You can revoke access or adjust membership roles anytime in Workspace Settings.'}</p>
                      </div>

                      {/* Done button */}
                      <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={onClose}
                          className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-all cursor-pointer hover:opacity-90"
                        >
                          {isVietnamese ? 'Hoàn tất' : 'Done'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: PENDING INVITATIONS */}
                  {inviteTab === 'pending' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {isVietnamese ? 'Các lời mời đang chờ chấp nhận' : 'Pending Workspace Invitations'}
                        </span>
                        <button
                          type="button"
                          onClick={fetchPendingInvites}
                          disabled={loadingPending}
                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                          title={isVietnamese ? "Làm mới" : "Refresh"}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingPending ? 'animate-spin' : ''}`} />
                        </button>
                      </div>

                      {loadingPending ? (
                        <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                          <span className="text-xs font-semibold">{isVietnamese ? 'Đang tải danh sách...' : 'Loading pending invites...'}</span>
                        </div>
                      ) : pendingInvites.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                          {pendingInvites.map((inv) => {
                            const badge = getRoleBadge(inv.role);
                            const isResending = resendingId === inv.id;
                            const isRevoking = revokingId === inv.id;
                            const isCopied = copiedEmailMap[inv.id];

                            const inviteLink = inv.token
                              ? `${typeof window !== 'undefined' ? window.location.origin : ''}/?invite_token=${inv.token}`
                              : `${typeof window !== 'undefined' ? window.location.origin : ''}/?invite_ws=${activeWorkspaceId}&role=${inv.role}&email=${encodeURIComponent(inv.email)}`;

                            return (
                              <div
                                key={inv.id}
                                className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-black text-slate-850 dark:text-slate-100 truncate">
                                      {inv.email}
                                    </p>
                                    <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase border ${badge.class}`}>
                                      {badge.label}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{isVietnamese ? 'Chờ xác nhận' : 'Pending acceptance'}</span>
                                    {inv.created_at && (
                                      <span>• {new Date(inv.created_at).toLocaleDateString(isVietnamese ? 'vi-VN' : 'en-US')}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* Copy Link */}
                                  <button
                                    type="button"
                                    onClick={() => handleCopyShareableLink(inviteLink, inv.id)}
                                    className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
                                    title={isVietnamese ? "Sao chép liên kết mời" : "Copy invite link"}
                                  >
                                    {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                  </button>

                                  {/* Resend */}
                                  <button
                                    type="button"
                                    onClick={() => handleResendInvitation(inv)}
                                    disabled={isResending}
                                    className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
                                    title={isVietnamese ? "Làm mới và gửi lại lời mời" : "Resend invitation"}
                                  >
                                    <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin text-indigo-500' : ''}`} />
                                  </button>

                                  {/* Revoke */}
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeInvitation(inv)}
                                    disabled={isRevoking}
                                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900 transition-all cursor-pointer"
                                    title={isVietnamese ? "Hủy bỏ lời mời" : "Revoke invitation"}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-10 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
                          <CheckCircle2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            {isVietnamese ? 'Không có lời mời nào đang chờ' : 'No pending invitations'}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                            {isVietnamese 
                              ? 'Tất cả lời mời đã được chấp nhận hoặc bạn chưa gửi lời mời nào mới.' 
                              : 'All invitations have been accepted or no new invitations have been sent yet.'}
                          </p>
                        </div>
                      )}

                      <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={onClose}
                          className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          {isVietnamese ? 'Đóng' : 'Close'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
