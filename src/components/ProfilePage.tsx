"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { User, Task } from '../types';
import { supabase } from '../supabaseClient';
import { 
  User as UserIcon, Camera, Mail, Briefcase, Shield, 
  Phone, MapPin, Calendar, Activity, CheckCircle, 
  Clock, Save, Upload, Sparkles, AlertCircle, Trash2
} from 'lucide-react';

interface ProfilePageProps {
  currentUser: { name: string; email: string; avatar: string; role: 'admin' | 'member'; isPremium?: boolean };
  setCurrentUser: (user: any) => void;
  members: User[];
  setMembers: React.Dispatch<React.SetStateAction<User[]>>;
  tasks: Task[];
  isOffline: boolean;
  addSyncLog: (action: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
  onUpdateMember?: (member: User) => void;
}

export default function ProfilePage({
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
  // Form states
  const [name, setName] = useState(currentUser.name);
  const [role, setRole] = useState(currentUser.role);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const loadedProfileRef = useRef({ name: '', role: '', avatar: '', phone: '', department: '', bio: '' });
  const isFirstMountRef = useRef(true);

  // Load custom user info from localStorage if available
  useEffect(() => {
    setName(currentUser.name);
    setAvatar(currentUser.avatar);
    setRole(currentUser.role);
    
    // Check if additional fields exist in localStorage member list
    const memberMe = members.find(m => m.id === 'user');
    const loadedPhone = memberMe?.phone || '';
    const loadedDept = memberMe?.department || '';
    const loadedBio = memberMe?.bio || '';

    setPhone(loadedPhone);
    setDepartment(loadedDept);
    setBio(loadedBio);

    loadedProfileRef.current = {
      name: currentUser.name,
      role: currentUser.role,
      avatar: currentUser.avatar,
      phone: loadedPhone,
      department: loadedDept,
      bio: loadedBio
    };

    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      setSaveStatus('saved');
    }
  }, [currentUser, members]);

  // Statistics calculation
  const myTasks = tasks.filter(t => t.assigneeId === 'user');
  const completedTasks = myTasks.filter(t => t.status === 'completed');
  const pendingTasks = myTasks.filter(t => t.status !== 'completed');
  const completionRate = myTasks.length > 0 ? Math.round((completedTasks.length / myTasks.length) * 100) : 0;

  // Handle local avatar file upload & convert to base64 / upload to Supabase Storage
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      if (triggerToast) {
        triggerToast('error', 'Tệp quá lớn ⚠️', 'Vui lòng chọn ảnh nhỏ hơn 2MB để tối ưu hóa hiệu năng hệ thống.');
      }
      return;
    }

    // Direct local base64 preview for instant visual feedback
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);

    // If online, upload to Supabase Storage immediately
    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          if (triggerToast) {
            triggerToast('error', 'Không tìm thấy phiên làm việc 👤', 'Vui lòng đăng nhập để đồng bộ ảnh đại diện.');
          }
          return;
        }

        const userId = session.user.id;
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;

        if (triggerToast) {
          triggerToast('info', 'Đang đồng bộ ảnh ⚡', 'Đang tải ảnh đại diện lên đám mây Supabase...');
        }

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, { cacheControl: '3600', upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        setAvatar(publicUrl);

        if (triggerToast) {
          triggerToast('success', 'Tải ảnh hoàn tất 📸', 'Ảnh đại diện đã được lưu trữ an toàn trên Supabase Cloud.');
        }
        if ((window as any).playSystemSound) {
          (window as any).playSystemSound('success');
        }
      } catch (err: any) {
        console.error('Lỗi khi tải ảnh đại diện lên Supabase:', err);
        if (triggerToast) {
          triggerToast('error', 'Lỗi tải ảnh ⚠️', err.message || 'Không thể đồng bộ ảnh đại diện lên Supabase Storage.');
        }
      }
    } else {
      if (triggerToast) {
        triggerToast('info', 'Lưu trữ cục bộ 💾', 'Ảnh đại diện tạm thời được lưu dưới dạng Base64 do đang ngoại tuyến.');
      }
    }
  };

  const triggerSave = async () => {
    setSaveStatus('saving');
    setIsSaving(true);

    const updatedUser = {
      ...currentUser,
      name: name.trim(),
      avatar: avatar,
      role: role
    };

    // Update local state
    setCurrentUser(updatedUser);

    // Save session to localStorage
    const sessionObj = {
      user: updatedUser,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 1 month
    };
    localStorage.setItem('avaxa_session', JSON.stringify(sessionObj));

    const myJoinedDate = members.find(m => m.id === 'user')?.joinedDate || '2026';
    const updatedMemberObj: User = {
      id: 'user',
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      role: updatedUser.role,
      status: 'online',
      phone: phone.trim(),
      department: department.trim(),
      bio: bio.trim(),
      joinedDate: myJoinedDate
    };

    // Update member list locally or via parent handler
    if (onUpdateMember) {
      onUpdateMember(updatedMemberObj);
    } else {
      setMembers(prev => prev.map(m => m.id === 'user' ? updatedMemberObj : m));
    }

    // Sync metadata with Supabase if online
    if (!isOffline) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        await supabase.auth.updateUser({
          data: { 
            name: updatedUser.name,
            role: updatedUser.role,
            phone: phone.trim(),
            department: department.trim(),
            avatar: updatedUser.avatar,
            bio: bio.trim(),
            joinedDate: myJoinedDate
          }
        });

        if (session?.user) {
          const dbId = `user-${session.user.id}`;
          const { error } = await supabase.from('members').update({
            name: updatedUser.name,
            email: updatedUser.email,
            avatar: updatedUser.avatar,
            role: updatedUser.role,
            phone: phone.trim(),
            department: department.trim(),
            bio: bio.trim(),
            joined_date: myJoinedDate
          }).eq('id', dbId).eq('user_id', session.user.id);
          if (error) console.error('Supabase Member Profile Auto-Save Error:', error);
        }

        addSyncLog('Đã tự động lưu hồ sơ cá nhân lên Supabase');
      } catch (err) {
        console.error('Lỗi tự động lưu hồ sơ:', err);
      }
    }

    // Update ref to prevent infinite loops
    loadedProfileRef.current = {
      name: name,
      role: role,
      avatar: avatar,
      phone: phone,
      department: department,
      bio: bio
    };

    setIsSaving(false);
    setSaveStatus('saved');
  };

  // Debounced Auto-save Effect
  useEffect(() => {
    if (isFirstMountRef.current) return;

    const isDirty = 
      name !== loadedProfileRef.current.name ||
      role !== loadedProfileRef.current.role ||
      avatar !== loadedProfileRef.current.avatar ||
      phone !== loadedProfileRef.current.phone ||
      department !== loadedProfileRef.current.department ||
      bio !== loadedProfileRef.current.bio;

    if (!isDirty) return;

    setSaveStatus('dirty');

    const timer = setTimeout(() => {
      triggerSave();
    }, 1500);

    return () => clearTimeout(timer);
  }, [name, role, avatar, phone, department, bio]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await triggerSave();

    if (triggerToast) {
      triggerToast('success', 'Đã lưu thay đổi 👤', 'Hồ sơ người dùng của bạn đã được cập nhật thành công!');
    }
    if ((window as any).playSystemSound) {
      (window as any).playSystemSound('success');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans animate-fadeIn text-left pb-10">
      
      {/* Premium Profile Banner Header */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200/50 dark:border-slate-800/80">
        <div className="h-44 md:h-56 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-xs" />
          <div className="absolute top-4 right-4 flex gap-2">
            <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/20 dark:bg-black/30 text-white backdrop-blur-md border border-white/10">
              {isOffline ? 'Offline Mode ⚠️' : 'Cloud Connected ⚡'}
            </span>
          </div>
        </div>

        {/* User Card Layout */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl px-6 py-6 pt-0 relative flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className="relative -mt-16 md:-mt-20 shrink-0 group">
            <div className="relative rounded-3xl overflow-hidden border-4 border-white dark:border-slate-900 shadow-xl bg-slate-100">
              <img 
                src={avatar} 
                className="w-28 h-28 md:w-36 md:h-36 object-cover" 
                alt={currentUser.name} 
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Tải ảnh lên</span>
              </button>
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500 shadow-md animate-pulse" />
          </div>

          <div className="flex-1 text-center md:text-left space-y-1 mb-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white flex items-center justify-center md:justify-start gap-2">
              <span>{name}</span>
              {currentUser.isPremium ? (
                <span className="text-[9px] font-black tracking-widest bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full uppercase scale-95 shadow-xs">PRO</span>
              ) : (
                <span className="text-[9px] font-black tracking-widest bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full uppercase scale-95 shadow-xs font-mono">FREE</span>
              )}
            </h2>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center justify-center md:justify-start gap-1">
              <Briefcase className="w-3.5 h-3.5" />
              <span>{role === 'admin' ? 'Quản trị viên' : 'Thành viên đội ngũ'}</span>
              {department && <span> • {department}</span>}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center md:justify-start gap-1.5 pt-1">
              <Mail className="w-3.5 h-3.5" />
              <span>{currentUser.email}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Stats & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Stats Cards */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Card: Task statistics */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/65 dark:border-slate-800/80 p-5.5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:shadow-[0_20px_50px_rgba(99,102,241,0.05)] hover:border-indigo-500/20 dark:hover:border-indigo-400/20 transition-all duration-300 space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-550 tracking-wider">Task Performance</h3>
            
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-gradient-to-br from-indigo-505 from-indigo-500/5 to-indigo-500/10 dark:from-indigo-950/20 dark:to-indigo-950/30 border border-indigo-200/20 dark:border-indigo-800/20 p-3 rounded-2xl shadow-3xs">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{myTasks.length}</span>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide mt-1">Assigned</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 dark:from-emerald-950/20 dark:to-emerald-950/30 border border-emerald-200/20 dark:border-emerald-800/20 p-3 rounded-2xl shadow-3xs">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{completedTasks.length}</span>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide mt-1">Completed</p>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <span>Completion Rate</span>
                <span>{completionRate}%</span>
              </div>
              <div className="w-full bg-slate-200/50 dark:bg-slate-800/50 h-3 rounded-full overflow-hidden p-0.5">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-500 shadow-[0_0_8px_rgba(99,102,241,0.25)]" 
                  style={{ width: `${completionRate}%` }} 
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-450 border-t border-slate-150 dark:border-slate-800/80 pt-3.5">
              <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Well Done</span>
              <span>{pendingTasks.length} active tasks</span>
            </div>
          </div>

          {/* Card: Subscription Tier */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/65 dark:border-slate-800/80 p-5.5 rounded-3xl shadow-sm space-y-4 relative overflow-hidden">
            {/* Visual Accent */}
            <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
            
            <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-550 tracking-wider">Account Tier</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">STATUS</span>
                <span className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  {currentUser.isPremium ? (
                    <>
                      Avaxa Premium Pro
                      <span className="text-[8px] font-black tracking-widest bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full uppercase scale-90">PRO</span>
                    </>
                  ) : (
                    <>
                      Free Tier
                      <span className="text-[8px] font-black tracking-widest bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full uppercase scale-90">FREE</span>
                    </>
                  )}
                </span>
              </div>
              <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-500">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-normal">
              {currentUser.isPremium 
                ? 'Unlocked advanced AI features, Gantt chart, and unlimited syncing.' 
                : 'Unlock Gantt charts, AI subtasks, and smart priorities.'}
            </p>

            <div className="pt-2">
              {currentUser.isPremium ? (
                <button
                  type="button"
                  onClick={() => {
                    if ((window as any).showPremiumModal) {
                      (window as any).showPremiumModal();
                    } else if (triggerToast) {
                      triggerToast('info', 'Manage Subscription 📁', 'Please use the status dropdown in the top-right corner to manage your subscription.');
                    }
                  }}
                  className="w-full py-2.5 rounded-2xl text-[11px] font-bold bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer text-center"
                >
                  Manage Subscription
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if ((window as any).showPremiumModal) {
                      (window as any).showPremiumModal();
                    } else if (triggerToast) {
                      triggerToast('info', 'Upgrade Premium Pro 🚀', 'Click the Upgrade Premium button in the header to activate.');
                    }
                  }}
                  className="w-full py-2.5 rounded-2xl text-[11px] font-bold text-white shadow-sm hover:brightness-105 transition-all cursor-pointer text-center"
                  style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}
                >
                  Upgrade to Premium
                </button>
              )}
            </div>
          </div>

          {/* Card: Bio / Profile Introduction Quote */}
          {bio && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-3xl shadow-sm space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-550 tracking-wider">About Me</h3>
              <p className="text-xs text-slate-600 dark:text-slate-350 italic leading-relaxed">
                "{bio}"
              </p>
            </div>
          )}

          {/* Card: Quick Tip */}
          <div className="bg-gradient-to-tr from-indigo-900 to-indigo-950 text-white p-5 rounded-3xl shadow-lg border border-indigo-950 space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400">💡 Security Tip</h4>
            <p className="text-[11px] text-indigo-200 leading-relaxed font-sans">
              Uploaded avatar images are encrypted and stored in your device's local cache and cloud storage. Ensure files are under 2MB for optimal performance.
            </p>
          </div>
        </div>

        {/* Right Column: Settings Form */}
        <div className="lg:col-span-2">
          <form 
            onSubmit={handleSaveProfile} 
            className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Cập nhật thông tin</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Chỉnh sửa thông tin cá nhân của bạn trên hệ thống</p>
              </div>
              <UserIcon className="w-5 h-5 text-indigo-500 shrink-0" />
            </div>

            {/* Input Groups */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wide block">Họ và tên</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-slate-100 transition-all"
                  placeholder="Nhập họ và tên..."
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wide block">Vai trò / Cấp bậc</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                  className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-slate-100 transition-all"
                >
                  <option value="member">Kỹ sư Thiết kế (Thành viên)</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wide block">Số điện thoại</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-slate-100 transition-all"
                  placeholder="Nhập số điện thoại..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wide block">Phòng ban</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-slate-100 transition-all"
                  placeholder="Ví dụ: R&D, Design Studio, Marketing..."
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wide block">Tiểu sử / Giới thiệu bản thân</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-slate-100 transition-all resize-none"
                placeholder="Viết một đoạn giới thiệu ngắn về bản thân..."
              />
            </div>

            {/* Email (Readonly) */}
            <div className="space-y-1 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-855">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Địa chỉ Email đăng ký (Không thể chỉnh sửa)</span>
              </label>
              <p className="text-xs font-mono text-slate-600 dark:text-slate-400 pl-4.5 pt-0.5">
                {currentUser.email}
              </p>
            </div>

            {/* Submit Button & Auto-Save Status */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {saveStatus === 'saved' && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Đã tự động lưu mọi thay đổi</span>
                </span>
              )}
              {saveStatus === 'dirty' && (
                <span className="text-[10px] text-amber-600 dark:text-amber-450 font-bold flex items-center gap-1 animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Có thay đổi chưa lưu...</span>
                </span>
              )}

              <button
                type="submit"
                disabled={saveStatus !== 'dirty' || !name.trim()}
                className={`px-6 py-3 rounded-2xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed font-sans ${
                  saveStatus === 'saved'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 opacity-80'
                    : saveStatus === 'saving'
                    ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 opacity-80'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-500/10 hover:scale-[1.01] active:scale-[0.99]'
                }`}
              >
                {saveStatus === 'saving' ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : saveStatus === 'saved' ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Đã lưu thành công</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu thay đổi ngay</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>

    </div>
  );
}
