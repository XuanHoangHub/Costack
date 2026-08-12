"use client";

import React, { useState, useEffect } from 'react';
import { Shield, Globe, Lock, UserPlus, Trash2, X, Check, ShieldAlert } from 'lucide-react';
import { User } from '../types';
import SignedImage from './SignedImage';

interface ShareSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'space' | 'list';
  targetId: string;
  targetName: string;
  isPrivate: boolean;
  shareSettings: Record<string, 'view' | 'edit'>;
  members: User[]; // Workspace members
  currentUser: any;
  onSave: (isPrivate: boolean, shareSettings: Record<string, 'view' | 'edit'>) => void;
  canEdit: boolean;
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
  canEdit
}: ShareSettingsModalProps) {
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [shareSettings, setShareSettings] = useState<Record<string, 'view' | 'edit'>>(initialShareSettings || {});
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'view' | 'edit'>('view');

  // Sync state when props change
  useEffect(() => {
    setIsPrivate(initialIsPrivate);
    setShareSettings(initialShareSettings || {});
  }, [initialIsPrivate, initialShareSettings, isOpen]);

  if (!isOpen) return null;

  // Filter members that can be added (not yourself, not already in share settings)
  const addableMembers = members.filter(m => {
    const cleanId = m.userId || (m.id === 'user' ? currentUser?.id : m.id.replace('user-', ''));
    const cleanCurrentUserId = currentUser?.id;
    
    if (cleanId === cleanCurrentUserId) return false;
    return !shareSettings[cleanId];
  });

  const handleAddMember = () => {
    if (!selectedUserId || !canEdit) return;
    setShareSettings(prev => ({
      ...prev,
      [selectedUserId]: selectedRole
    }));
    setSelectedUserId('');
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-955/60 backdrop-blur-sm">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-3xl overflow-hidden shadow-2xl z-10 p-6 flex flex-col gap-5 text-left select-none">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/30 flex items-center justify-center text-indigo-550 dark:text-indigo-400 shadow-sm shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-855 dark:text-slate-50 uppercase tracking-wide leading-tight">
                Chia sẻ {targetType === 'space' ? 'Không gian' : 'Danh sách'}
              </h4>
              <p className="text-[11px] text-slate-450 dark:text-slate-500 font-bold truncate max-w-[240px]">
                {targetName}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-555 dark:text-slate-400 font-bold cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Read-only Notice Banner */}
        {!canEdit && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-805 border border-slate-200/60 dark:border-slate-700 rounded-2xl text-slate-500 dark:text-slate-400 text-xs font-semibold leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-amber-550 shrink-0" />
            <span>Bạn đang xem quyền truy cập ở chế độ chỉ đọc.</span>
          </div>
        )}

        {/* 1. Privacy Toggle */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-555 tracking-wider block">Privacy Level</span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => canEdit && setIsPrivate(false)}
              className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                !canEdit ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
              } ${
                !isPrivate
                  ? 'border-indigo-500 bg-indigo-550/10 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 shadow-xs'
                  : 'border-slate-205 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-855'
              }`}
            >
              <Globe className="w-4 h-4" />
              <div className="text-xs font-bold leading-none">Public</div>
              <div className="text-[9px] text-slate-400 dark:text-slate-550 max-w-[120px] leading-tight mt-0.5">Mọi thành viên trong workspace đều xem được</div>
            </button>

            <button
              type="button"
              disabled={!canEdit}
              onClick={() => canEdit && setIsPrivate(true)}
              className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                !canEdit ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
              } ${
                isPrivate
                  ? 'border-indigo-500 bg-indigo-550/10 dark:bg-indigo-950/20 text-indigo-655 dark:text-indigo-400 shadow-xs'
                  : 'border-slate-205 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-855'
              }`}
            >
              <Lock className="w-4 h-4" />
              <div className="text-xs font-bold leading-none">Private</div>
              <div className="text-[9px] text-slate-400 dark:text-slate-550 max-w-[120px] leading-tight mt-0.5">Chỉ những thành viên được mời mới truy cập được</div>
            </button>
          </div>
        </div>

        {/* Private Settings Configuration */}
        {isPrivate && (
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] pr-1">
            
            {/* Add Member form */}
            {canEdit && (
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-555 tracking-wider block">Thêm thành viên truy cập</span>
                <div className="flex gap-2">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs px-3 py-2 text-slate-805 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                  >
                    <option value="">Chọn thành viên...</option>
                    {addableMembers.map(m => (
                      <option key={m.id} value={m.userId || (m.id === 'user' ? currentUser?.id : m.id.replace('user-', ''))}>
                        {m.name} ({m.email})
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as 'view' | 'edit')}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs px-2.5 py-2 text-slate-850 dark:text-slate-200 focus:outline-none cursor-pointer font-bold"
                  >
                    <option value="view">Viewer</option>
                    <option value="edit">Editor</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleAddMember}
                    disabled={!selectedUserId}
                    className="px-3.5 py-2 bg-indigo-500 hover:bg-indigo-650 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* List of Shared Members */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-555 tracking-wider block">Thành viên có quyền truy cập</span>
              <div className="border border-slate-100 dark:border-slate-800/85 rounded-2xl overflow-hidden divide-y divide-slate-105 dark:divide-slate-800/50 bg-slate-50/20 max-h-[160px] overflow-y-auto custom-scrollbar">
                
                {/* Always show Owner as Editor (Read Only Owner Row) */}
                <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-2.5 min-w-0">
                      <SignedImage 
                        filePath={currentUser?.avatar} 
                        className="w-7 h-7 rounded-full border border-slate-200 object-cover" 
                        alt={currentUser?.name || "Owner"} 
                      />
                    <div className="text-left min-w-0">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 block truncate">
                        {currentUser?.name || "Workspace Owner"}
                      </span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block truncate">
                        Chủ sở hữu
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[8.5px] font-black uppercase rounded-lg bg-indigo-50 dark:bg-indigo-955/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100/10 shrink-0">
                    Owner (Editor)
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
                    <div key={userId} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <SignedImage 
                            filePath={member.avatar} 
                            className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-750 object-cover" 
                            alt={member.name} 
                          />
                        </div>
                        <div className="text-left min-w-0">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 block truncate">
                            {member.name}
                          </span>
                          <span className="text-[9px] text-slate-455 dark:text-slate-500 block truncate">
                            {member.email}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {canEdit ? (
                          <select
                            value={role}
                            onChange={(e) => handleRoleChange(userId, e.target.value as 'view' | 'edit')}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[9px] font-black uppercase px-2 py-0.5 text-slate-750 dark:text-slate-350 focus:outline-none cursor-pointer"
                          >
                            <option value="view">Viewer</option>
                            <option value="edit">Editor</option>
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 text-[8.5px] font-black uppercase rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-550 dark:text-slate-400 border border-slate-200 dark:border-slate-750">
                            {role}
                          </span>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(userId)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg transition-colors cursor-pointer"
                            title="Remove access"
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
        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-205 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            {canEdit ? 'Cancel' : 'Close'}
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-650 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/10 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Xác nhận</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
