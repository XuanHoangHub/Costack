"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, Globe, Lock, UserPlus, Trash2, X, Check, 
  ShieldAlert, Link2, Copy, Search, CheckCircle2,
  FolderTree, FileText, CheckSquare, Sparkles
} from 'lucide-react';
import { User } from '../types';
import SignedImage from './SignedImage';
import { useTranslation } from '../contexts/TranslationContext';

interface ShareSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'space' | 'list' | 'doc' | 'task';
  targetId: string;
  targetName: string;
  isPrivate: boolean;
  shareSettings: Record<string, 'view' | 'edit'>;
  members: User[]; // Workspace members
  currentUser: any;
  onSave: (isPrivate: boolean, shareSettings: Record<string, 'view' | 'edit'>) => void;
  canEdit: boolean;
  customShareUrl?: string;
}

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
  customShareUrl
}: ShareSettingsModalProps) {
  const { isVietnamese, locale } = useTranslation();
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [shareSettings, setShareSettings] = useState<Record<string, 'view' | 'edit'>>(initialShareSettings || {});
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'view' | 'edit'>('view');
  const [memberSearch, setMemberSearch] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync state when props change
  useEffect(() => {
    setIsPrivate(initialIsPrivate);
    setShareSettings(initialShareSettings || {});
    setMemberSearch('');
    setSelectedUserId('');
  }, [initialIsPrivate, initialShareSettings, isOpen]);

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
    if (targetType === 'space') return `${origin}/spaces/${targetId}`;
    if (targetType === 'doc') return `${origin}/docs/${targetId}`;
    if (targetType === 'task') return `${origin}/tasks/${targetId}`;
    return `${origin}/lists/${targetId}`;
  }, [customShareUrl, targetType, targetId]);

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

  const handleRoleChange = (userId: string, newRole: 'view' | 'edit') => {
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

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const getTargetIcon = () => {
    switch (targetType) {
      case 'space': return <FolderTree className="w-5 h-5" />;
      case 'doc': return <FileText className="w-5 h-5" />;
      case 'task': return <CheckSquare className="w-5 h-5" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  const getTargetLabel = () => {
    switch (targetType) {
      case 'space': return isVietnamese ? 'Không gian' : 'Space';
      case 'doc': return isVietnamese ? 'Tài liệu' : 'Document';
      case 'task': return isVietnamese ? 'Nhiệm vụ' : 'Task';
      default: return isVietnamese ? 'Danh sách' : 'List';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in font-sans">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10 p-6 flex flex-col gap-5 text-left select-none max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-sky-950/40 border border-blue-100/50 dark:border-sky-800/40 flex items-center justify-center text-blue-600 dark:text-sky-400 shadow-2xs shrink-0">
              {getTargetIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider leading-tight">
                  {isVietnamese ? `Chia sẻ ${getTargetLabel()}` : `Share ${getTargetLabel()}`}
                </h4>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {targetType.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold truncate max-w-[280px] mt-0.5">
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

        {/* Read-only Notice Banner */}
        {!canEdit && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl text-amber-700 dark:text-amber-400 text-xs font-semibold leading-relaxed">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{isVietnamese ? 'Bạn đang xem phân quyền ở chế độ chỉ đọc.' : 'You are viewing permissions in read-only mode.'}</span>
          </div>
        )}

        {/* Quick Link Share Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
            <input 
              readOnly 
              value={shareUrl} 
              className="w-full text-xs font-mono text-slate-600 dark:text-slate-300 bg-transparent border-none outline-none select-all truncate" 
            />
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? (isVietnamese ? 'Đã chép' : 'Copied') : (isVietnamese ? 'Sao chép link' : 'Copy link')}</span>
          </button>
        </div>

        {/* 1. Privacy Toggle */}
        <div className="space-y-2">
          <span className="text-[10.5px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block">
            {isVietnamese ? 'Mức độ riêng tư & Quyền chung' : 'General Access & Privacy'}
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => canEdit && setIsPrivate(false)}
              className={`p-3.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                !canEdit ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
              } ${
                !isPrivate
                  ? 'border-blue-500 bg-blue-50/70 dark:bg-sky-950/30 text-blue-700 dark:text-sky-400 shadow-2xs font-black'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Globe className="w-5 h-5" />
              <div className="text-xs font-bold leading-none">{isVietnamese ? 'Công khai trong Workspace' : 'Public in Workspace'}</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                {isVietnamese ? 'Mọi thành viên Workspace đều có thể truy cập' : 'All workspace members have access'}
              </div>
            </button>

            <button
              type="button"
              disabled={!canEdit}
              onClick={() => canEdit && setIsPrivate(true)}
              className={`p-3.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                !canEdit ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
              } ${
                isPrivate
                  ? 'border-blue-500 bg-blue-50/70 dark:bg-sky-950/30 text-blue-700 dark:text-sky-400 shadow-2xs font-black'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Lock className="w-5 h-5" />
              <div className="text-xs font-bold leading-none">{isVietnamese ? 'Riêng tư (Chỉ người được mời)' : 'Private (Invited only)'}</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                {isVietnamese ? 'Chỉ thành viên được chỉ định mới truy cập được' : 'Only specifically added members can access'}
              </div>
            </button>
          </div>
        </div>

        {/* Private Settings Configuration */}
        {isPrivate && (
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[280px] pr-1">
            
            {/* Add Member form */}
            {canEdit && (
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
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
                      onChange={(e) => setSelectedRole(e.target.value as 'view' | 'edit')}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer font-bold"
                    >
                      <option value="view">{isVietnamese ? 'Chỉ xem (Viewer)' : 'Viewer'}</option>
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

            {/* List of Shared Members */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block">
                  {isVietnamese ? 'Danh sách thành viên có quyền' : 'Members with access'} ({Object.keys(shareSettings).length + 1})
                </span>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900 max-h-[160px] overflow-y-auto custom-scrollbar">
                
                {/* Always show Owner as Editor / Admin */}
                <div className="flex items-center justify-between p-3 bg-slate-50/60 dark:bg-slate-950/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <SignedImage 
                      filePath={currentUser?.avatar} 
                      className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover" 
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

                {/* Shared list */}
                {Object.entries(shareSettings).map(([userId, role]) => {
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
                            onChange={(e) => handleRoleChange(userId, e.target.value as 'view' | 'edit')}
                            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-black uppercase px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                          >
                            <option value="view">{isVietnamese ? 'Chỉ xem' : 'Viewer'}</option>
                            <option value="edit">{isVietnamese ? 'Chỉnh sửa' : 'Editor'}</option>
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {role === 'edit' ? (isVietnamese ? 'Chỉnh sửa' : 'Editor') : (isVietnamese ? 'Chỉ xem' : 'Viewer')}
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

        {/* Footer Actions */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
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
    </div>
  );
}
