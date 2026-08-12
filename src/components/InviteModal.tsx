"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ChevronDown, User, Users, ShieldCheck, 
  Check, Plus, AlertCircle 
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendInvites: (emails: string[], role: string) => void;
  workspaceName?: string;
}

interface RoleOption {
  id: string;
  name: string;
  badge?: string;
  description: string;
  icon: React.ComponentType<any>;
}

const DEFAULT_ROLES: RoleOption[] = [
  {
    id: 'member',
    name: 'Member',
    description: 'Can access all public items in your Workspace.',
    icon: Users,
  },
  {
    id: 'guest',
    name: 'Guest',
    description: "Can't use all features or be added to Spaces. Can only access items shared with them.",
    icon: User,
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Can manage Spaces, People, Billing and other Workspace settings.',
    icon: ShieldCheck,
  }
];

export default function InviteModal({ isOpen, onClose, onSendInvites, workspaceName }: InviteModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('member');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [validationError, setValidationError] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  const workspaces = useWorkspaceStore(s => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const activeWS = workspaces.find(w => w.id === activeWorkspaceId);
  const displayWSName = workspaceName || activeWS?.name || 'Workspace';

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

  const getSelectedRoleDisplay = () => {
    const found = DEFAULT_ROLES.find(r => r.id === selectedRoleId);
    return found || DEFAULT_ROLES[0];
  };

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
      setValidationError(`Invalid email format: ${cleanEmail}`);
      return;
    }

    if (emails.includes(cleanEmail)) {
      setValidationError('Email is already added.');
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

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // If there is text in input when clicking submit, try to add it first
    const finalEmails = [...emails];
    if (inputValue.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const cleanEmail = inputValue.trim().replace(/,$/, '');
      if (!emailRegex.test(cleanEmail)) {
        setValidationError(`Invalid email format: ${cleanEmail}`);
        return;
      }
      if (!finalEmails.includes(cleanEmail)) {
        finalEmails.push(cleanEmail);
      }
    }

    if (finalEmails.length === 0) {
      setValidationError('Please enter at least one valid email address.');
      return;
    }

    onSendInvites(finalEmails, selectedRoleId);
    
    // Reset state
    setInputValue('');
    setEmails([]);
    setSelectedRoleId('member');
    onClose();
  };

  const activeRole = getSelectedRoleDisplay();
  const ActiveIcon = activeRole.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 modal-backdrop-blur"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.94, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 15, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="relative w-full max-w-[460px] modal-glass-card rounded-[28px] shadow-2xl border border-white/80 dark:border-slate-800/80 p-6 z-10 font-sans select-none overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              type="button"
              className="absolute top-5 right-5 w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-slate-550 dark:hover:text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="mb-5 text-left">
              <h3 className="text-xl font-bold text-slate-850 dark:text-slate-50 tracking-tight">
                Invite people to {displayWSName}
              </h3>
            </div>

            {/* Form */}
            <form onSubmit={handleSendInvite} className="space-y-5 text-left">
              {/* Emails Input with Tag Badges */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-555 dark:text-slate-400">
                  Invite by email
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
                    placeholder={emails.length === 0 ? "Enter email addresses..." : "Add more..."}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={() => {
                      if (inputValue.trim()) addEmail(inputValue);
                    }}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-xs text-slate-850 dark:text-slate-550 font-medium placeholder-slate-450 dark:placeholder-slate-500 py-1"
                  />
                </div>
              </div>

              {/* Role Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-555 dark:text-slate-400">
                  Invite as
                </label>
                
                <div ref={dropdownRef} className="relative">
                  {/* Selector Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer text-left focus:border-indigo-500"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-550 dark:text-slate-400 shrink-0">
                        <ActiveIcon className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-850 dark:text-slate-100">
                            {activeRole.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-550 truncate mt-0.5 font-medium">
                          {activeRole.description}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  </button>

                  {/* Dropdown Options */}
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
                          {DEFAULT_ROLES.map((role) => {
                            const isSelected = selectedRoleId === role.id;
                            const IconComponent = role.icon;
                            return (
                              <button
                                key={role.id}
                                type="button"
                                onClick={() => handleSelectRole(role.id)}
                                className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-start gap-3 transition-colors cursor-pointer ${
                                  isSelected ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                                }`}
                              >
                                <div className="w-7 h-7 rounded-lg bg-slate-550 dark:bg-slate-955 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-550 shrink-0 mt-0.5">
                                  <IconComponent className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className={`text-xs font-bold ${
                                      isSelected ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'
                                    }`}>
                                      {role.name}
                                    </span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                                  </div>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-550 mt-0.5 leading-relaxed font-medium">
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
                <div className="flex items-start gap-2 bg-red-50/50 dark:bg-red-950/10 border border-red-150/40 rounded-xl p-3 text-red-650 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="text-[10.5px] font-semibold leading-relaxed">
                    {validationError}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer hover:shadow-blue-500/10"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
