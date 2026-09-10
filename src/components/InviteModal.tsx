"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ChevronDown, User, Users, ShieldCheck, 
  Check, Plus, AlertCircle, Loader2, Copy, Link as LinkIcon,
  Sparkles, UserPlus, ArrowRight
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useTranslation } from '@/contexts/TranslationContext';
import { createPortal } from 'react-dom';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
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
  const [inviteTab, setInviteTab] = useState<'email' | 'link'>('email');
  const [inputValue, setInputValue] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('member');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const workspaces = useWorkspaceStore(s => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const activeWS = workspaces.find(w => w.id === activeWorkspaceId);
  const displayWSName = workspaceName || activeWS?.name || (isVietnamese ? 'Không gian làm việc' : 'Workspace');

  const roleOptions: RoleOption[] = useMemo(() => [
    {
      id: 'member',
      name: isVietnamese ? 'Thành viên (Member)' : 'Member',
      description: isVietnamese 
        ? 'Có thể truy cập toàn bộ tài liệu và công việc công khai trong Workspace.' 
        : 'Can access all public items in your Workspace.',
      icon: Users,
    },
    {
      id: 'guest',
      name: isVietnamese ? 'Khách (Guest)' : 'Guest',
      description: isVietnamese 
        ? 'Quyền hạn hạn chế. Chỉ truy cập những không gian hoặc mục được chia sẻ trực tiếp.' 
        : "Can't use all features or be added to Spaces. Can only access items shared with them.",
      icon: User,
    },
    {
      id: 'admin',
      name: isVietnamese ? 'Quản trị viên (Admin)' : 'Admin',
      description: isVietnamese 
        ? 'Toàn quyền quản lý thành viên, không gian, cài đặt và phân quyền hệ thống.' 
        : 'Can manage Spaces, People, Billing and other Workspace settings.',
      icon: ShieldCheck,
    }
  ], [isVietnamese]);

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

  const addEmail = (val: string) => {
    setValidationError('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = val.trim().replace(/,$/, '');
    if (!cleanEmail) return;
    
    if (!emailRegex.test(cleanEmail)) {
      setValidationError(isVietnamese ? `Địa chỉ email không hợp lệ: ${cleanEmail}` : `Invalid email format: ${cleanEmail}`);
      return;
    }

    if (emails.includes(cleanEmail)) {
      setValidationError(isVietnamese ? 'Email này đã được thêm vào danh sách.' : 'Email is already added.');
      return;
    }

    setEmails([...emails, cleanEmail]);
    setInputValue('');
  };

  const removeEmail = (indexToRemove: number) => {
    setEmails(emails.filter((_, i) => i !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail(inputValue);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const finalEmails = [...emails];
    if (inputValue.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const cleanEmail = inputValue.trim().replace(/,$/, '');
      if (!emailRegex.test(cleanEmail)) {
        setValidationError(isVietnamese ? `Địa chỉ email không hợp lệ: ${cleanEmail}` : `Invalid email format: ${cleanEmail}`);
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
      setInputValue('');
      setEmails([]);
      setSelectedRoleId('member');
      onClose();
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : (isVietnamese ? 'Không thể tạo lời mời. Vui lòng thử lại.' : 'Could not create the invitation. Please try again.'));
    } finally {
      setIsSending(false);
    }
  };

  const shareableLink = typeof window !== 'undefined'
    ? `${window.location.origin}/?invite_ws=${activeWorkspaceId}&role=${selectedRoleId}`
    : '';

  const handleCopyShareableLink = () => {
    if (!shareableLink) return;
    navigator.clipboard.writeText(shareableLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 modal-backdrop bg-black/25 dark:bg-black/60 backdrop-blur-xs cursor-pointer"
            />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.94, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 15, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="relative w-[min(95vw,480px)] max-sm:w-full max-sm:mx-2 max-h-[90dvh] overflow-y-auto modal-glass-card rounded-[28px] shadow-2xl border border-white/80 dark:border-slate-800/80 p-5 sm:p-6 z-10 select-none custom-scrollbar text-left"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              type="button"
              className="absolute top-4 right-4 min-w-[36px] min-h-[36px] rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="mb-4 pr-8">
              <h3 className="text-xl font-black text-slate-850 dark:text-slate-50 tracking-tight">
                {isVietnamese ? `Mời thành viên vào ${displayWSName}` : `Invite people to ${displayWSName}`}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
                {isVietnamese ? 'Cộng tác, phân công nhiệm vụ và trao đổi tài liệu trong thời gian thực.' : 'Collaborate, assign tasks and share documents in real time.'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-5">
              <button
                type="button"
                onClick={() => setInviteTab('email')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                  inviteTab === 'email'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                {isVietnamese ? 'Mời qua Email' : 'Invite by Email'}
              </button>
              <button
                type="button"
                onClick={() => setInviteTab('link')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                  inviteTab === 'link'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>{isVietnamese ? 'Liên kết mời nhanh' : 'Invite Link'}</span>
              </button>
            </div>

            {/* TAB 1: INVITE VIA EMAIL */}
            {inviteTab === 'email' && (
              <form onSubmit={handleSendInvite} className="space-y-4">
                {/* Emails Input with Tag Badges */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {isVietnamese ? 'Danh sách địa chỉ email' : 'Recipient Email Addresses'}
                  </label>
                  
                  <div className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 focus-within:border-indigo-500 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all flex flex-wrap gap-1.5 items-center max-h-32 overflow-y-auto custom-scrollbar">
                    {emails.map((email, idx) => (
                      <span key={idx} className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-black rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-150/20">
                        {email}
                        <button type="button" onClick={() => removeEmail(idx)} className="hover:text-indigo-850 dark:hover:text-indigo-300 font-bold shrink-0 cursor-pointer">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder={emails.length === 0 ? (isVietnamese ? "Nhập địa chỉ email và nhấn Enter..." : "Enter email addresses...") : (isVietnamese ? "Thêm email khác..." : "Add more emails...")}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onBlur={() => {
                        if (inputValue.trim()) addEmail(inputValue);
                      }}
                      onKeyDown={handleKeyDown}
                      className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-xs text-slate-850 dark:text-slate-100 font-medium placeholder-slate-400 dark:placeholder-slate-500 py-1"
                    />
                  </div>
                </div>

                {/* Role Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {isVietnamese ? 'Vai trò & Quyền hạn' : 'Role & Permissions'}
                  </label>
                  
                  <div ref={dropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer text-left focus:border-indigo-500"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <ActiveIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold text-slate-850 dark:text-slate-100">
                              {activeRole.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-medium">
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
                          className="absolute left-0 right-0 mt-1.5 z-[160] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden py-1.5"
                        >
                          <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                            {roleOptions.map((role) => {
                              const isSelected = selectedRoleId === role.id;
                              const IconComponent = role.icon;
                              return (
                                <button
                                  key={role.id}
                                  type="button"
                                  onClick={() => handleSelectRole(role.id)}
                                  className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-start gap-3 transition-colors cursor-pointer ${
                                    isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/30' : ''
                                  }`}
                                >
                                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0 mt-0.5">
                                    <IconComponent className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className={`text-xs font-bold ${
                                        isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'
                                      }`}>
                                        {role.name}
                                      </span>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
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
                  <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl p-3 text-rose-600 dark:text-rose-400">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="text-[10.5px] font-semibold leading-relaxed">
                      {validationError}
                    </span>
                  </div>
                )}

                {/* Manual add shortcut */}
                {onOpenManualAdd && (
                  <div className="pt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{isVietnamese ? 'Cần thêm ngay lập tức?' : 'Need to add directly?'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenManualAdd();
                      }}
                      className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isVietnamese ? 'Thêm thủ công' : 'Add manually'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex justify-end gap-2.5 items-center border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {isVietnamese ? 'Hủy bỏ' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    {isSending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isSending 
                      ? (isVietnamese ? 'Đang tạo lời mời…' : 'Sending invites…') 
                      : (isVietnamese ? 'Gửi lời mời' : 'Send Invitation')}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: SHAREABLE LINK */}
            {inviteTab === 'link' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isVietnamese
                    ? 'Bất kỳ ai có liên kết này đều có thể yêu cầu tham gia workspace của bạn.'
                    : 'Anyone with this link can join this workspace with the selected role.'}
                </p>

                {/* Role dropdown */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isVietnamese ? 'Vai trò được cấp qua link' : 'Role granted via link'}
                  </label>
                  <select
                    value={selectedRoleId}
                    onChange={e => setSelectedRoleId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                  >
                    <option value="member">{isVietnamese ? 'Thành viên (Member)' : 'Member'}</option>
                    <option value="guest">{isVietnamese ? 'Khách (Guest)' : 'Guest'}</option>
                    <option value="admin">{isVietnamese ? 'Quản trị viên (Admin)' : 'Admin'}</option>
                  </select>
                </div>

                {/* Link Box */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-300 truncate flex-1 select-all">
                    {shareableLink}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyShareableLink}
                    className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? (isVietnamese ? 'Đã sao chép!' : 'Copied!') : (isVietnamese ? 'Sao chép' : 'Copy')}</span>
                  </button>
                </div>

                {/* Done button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {isVietnamese ? 'Hoàn tất' : 'Done'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </Portal>
  );
}
