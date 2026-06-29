"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Task } from '../types';
import { supabase } from '../lib/supabaseClient';
import { 
  User as UserIcon, Camera, Mail, Briefcase, Shield, 
  Phone, MapPin, Calendar, Activity, CheckCircle, 
  Clock, Save, Upload, Sparkles, AlertCircle, Trash2, Plus, X, Globe, Star
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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
  const [newSkill, setNewSkill] = useState('');
  const [skills, setSkills] = useState<string[]>(['Productivity', 'React', 'TypeScript', 'UI/UX Design']);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const loadedProfileRef = useRef({ name: '', role: '', avatar: '', phone: '', department: '', bio: '', skills: [] as string[] });
  const isFirstMountRef = useRef(true);

  // Load custom user info from localStorage if available
  useEffect(() => {
    setName(currentUser.name);
    setAvatar(currentUser.avatar);
    setRole(currentUser.role);
    
    const memberMe = members.find(m => m.id === 'user');
    const loadedPhone = memberMe?.phone || '';
    const loadedDept = memberMe?.department || '';
    const loadedBio = memberMe?.bio || '';

    setPhone(loadedPhone);
    setDepartment(loadedDept);
    setBio(loadedBio);

    // Load skills
    try {
      const savedSkills = localStorage.getItem('avaxa_user_skills');
      if (savedSkills) {
        setSkills(JSON.parse(savedSkills));
      }
    } catch (e) {}

    loadedProfileRef.current = {
      name: currentUser.name,
      role: currentUser.role,
      avatar: currentUser.avatar,
      phone: loadedPhone,
      department: loadedDept,
      bio: loadedBio,
      skills: skills
    };

    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      setSaveStatus('saved');
    }
  }, [currentUser, members]);

  // Statistics calculation
  const myTasks = tasks.filter(t => t.assigneeId === 'user' || (t.assigneeIds && t.assigneeIds.includes('user')));
  const completedTasks = myTasks.filter(t => t.status === 'completed');
  const pendingTasks = myTasks.filter(t => t.status !== 'completed');
  const inProgressTasksCount = myTasks.filter(t => t.status === 'inprogress').length;
  const reviewTasksCount = myTasks.filter(t => t.status === 'review').length;
  const todoTasksCount = myTasks.filter(t => t.status === 'todo').length;
  const completionRate = myTasks.length > 0 ? Math.round((completedTasks.length / myTasks.length) * 100) : 0;

  // Pie chart stats distribution data
  const statPieData = [
    { name: 'To Do', value: todoTasksCount, color: '#6366f1' },
    { name: 'In Progress', value: inProgressTasksCount, color: '#f59e0b' },
    { name: 'Review', value: reviewTasksCount, color: '#a855f7' },
    { name: 'Completed', value: completedTasks.length, color: '#10b981' }
  ].filter(item => item.value > 0);

  // Handle local avatar file upload & convert to base64
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      if (triggerToast) {
        triggerToast('error', 'Tệp quá lớn ⚠️', 'Vui lòng chọn ảnh nhỏ hơn 2MB để tối ưu hóa hiệu năng hệ thống.');
      }
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

    setCurrentUser(updatedUser);

    const sessionObj = {
      user: updatedUser,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 1 month
    };
    localStorage.setItem('avaxa_session', JSON.stringify(sessionObj));

    // Save skills
    localStorage.setItem('avaxa_user_skills', JSON.stringify(skills));

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

    if (onUpdateMember) {
      onUpdateMember(updatedMemberObj);
    } else {
      setMembers(prev => prev.map(m => m.id === 'user' ? updatedMemberObj : m));
    }

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
      } catch (err) {
        console.error('Lỗi tự động lưu hồ sơ:', err);
      }
    }

    loadedProfileRef.current = {
      name: name,
      role: role,
      avatar: avatar,
      phone: phone,
      department: department,
      bio: bio,
      skills: skills
    };

    setIsSaving(false);
    setSaveStatus('saved');
  };

  useEffect(() => {
    if (isFirstMountRef.current) return;

    const isDirty =
      name !== loadedProfileRef.current.name ||
      role !== loadedProfileRef.current.role ||
      avatar !== loadedProfileRef.current.avatar ||
      phone !== loadedProfileRef.current.phone ||
      department !== loadedProfileRef.current.department ||
      bio !== loadedProfileRef.current.bio ||
      JSON.stringify(skills) !== JSON.stringify(loadedProfileRef.current.skills);

    setSaveStatus(isDirty ? 'dirty' : 'saved');
  }, [name, role, avatar, phone, department, bio, skills]);

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

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newSkill.trim();
    if (val && !skills.includes(val)) {
      setSkills(prev => [...prev, val]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(prev => prev.filter(s => s !== skillToRemove));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans animate-fadeIn text-left pb-12 select-none text-slate-800 dark:text-slate-100">
      
      {/* ── Visual Banner Header ── */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200/50 dark:border-slate-850/80 bg-white dark:bg-slate-900">
        <div className="h-44 md:h-52 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
          <div className="absolute top-4 right-4 flex gap-2">
            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/20 dark:bg-black/35 text-white backdrop-blur-md border border-white/10 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
              {isOffline ? 'Offline' : 'Supabase Connected'}
            </span>
          </div>
        </div>

        {/* User Card */}
        <div className="px-6 py-6 pt-0 relative flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className="relative -mt-16 md:-mt-20 shrink-0 group">
            <div className="relative rounded-3xl overflow-hidden border-4 border-white dark:border-slate-900 shadow-xl bg-slate-100 dark:bg-slate-800">
              <img 
                src={avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=LanAnh"} 
                className="w-28 h-28 md:w-36 md:h-36 object-cover" 
                alt={name} 
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
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500 shadow-md flex items-center justify-center text-white text-[9px]" />
          </div>

          <div className="flex-1 text-center md:text-left space-y-1 mb-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-850 dark:text-white flex items-center justify-center md:justify-start gap-2">
              <span>{name}</span>
              {currentUser.isPremium ? (
                <span className="text-[9px] font-black tracking-widest bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2.5 py-0.5 rounded-full uppercase shadow-xs">PRO</span>
              ) : (
                <span className="text-[9px] font-black tracking-widest bg-slate-150 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-2.5 py-0.5 rounded-full uppercase font-mono">FREE</span>
              )}
            </h2>
            <p className="text-xs font-bold text-slate-405 dark:text-slate-500 uppercase tracking-widest flex items-center justify-center md:justify-start gap-1">
              <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
              <span>{role === 'admin' ? 'Quản trị viên (Admin)' : 'Thành viên đội ngũ'}</span>
              {department && <span> • {department}</span>}
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1.5 pt-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {currentUser.email}
              </span>
              {phone && (
                <span className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-4">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Left Stats & Right Settings Form Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (5 columns width) */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          
          {/* Donut Progress Stats Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-left flex flex-col justify-between">
            <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Thống kê công việc</h3>
            
            <div className="flex items-center gap-6 py-4">
              <div className="relative w-28 h-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statPieData.length > 0 ? statPieData : [{ name: 'Trống', value: 1, color: '#e2e8f0' }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={48}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(statPieData.length > 0 ? statPieData : [{ name: 'Trống', value: 1, color: '#e2e8f0' }]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-slate-800 dark:text-slate-100 leading-none">{myTasks.length}</span>
                  <span className="text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black mt-0.5">Nhiệm vụ</span>
                </div>
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-350">
                  <span>Tỉ lệ hoàn thành</span>
                  <span className="text-emerald-500">{completionRate}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500 shadow-[0_0_8px_rgba(99,102,241,0.25)]" 
                    style={{ width: `${completionRate}%` }} 
                  />
                </div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  Đã làm xong {completedTasks.length} / {myTasks.length} việc được giao
                </p>
              </div>
            </div>

            {/* List breakdown */}
            <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-205/30">
                <span className="text-xs font-bold text-slate-450 dark:text-slate-500 block">Đang làm</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-150 mt-0.5 block">{inProgressTasksCount} việc</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-205/30">
                <span className="text-xs font-bold text-slate-450 dark:text-slate-500 block">Đang Review</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-150 mt-0.5 block">{reviewTasksCount} việc</span>
              </div>
            </div>
          </div>

          {/* Interactive Skills Tags Cloud Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-left space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Kỹ năng & Chuyên môn</h3>
              <p className="text-[10px] text-slate-405 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Gắn thẻ các thế mạnh kỹ thuật của bạn</p>
            </div>

            {/* Tags Cloud */}
            <div className="flex flex-wrap gap-1.5 py-1 min-h-[40px]">
              {skills.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Chưa gắn thẻ kỹ năng nào.</p>
              ) : (
                skills.map(skill => (
                  <span 
                    key={skill}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50/80 hover:bg-indigo-100/80 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 transition-colors"
                  >
                    <span>{skill}</span>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveSkill(skill)}
                      className="p-0.5 hover:bg-indigo-200/60 dark:hover:bg-indigo-900/60 rounded text-indigo-455 transition-colors cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Add skill input */}
            <form onSubmit={handleAddSkill} className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                placeholder="Thêm kỹ năng mới (ví dụ: Next.js)..."
                className="flex-1 text-xs font-bold px-3 py-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-slate-100"
              />
              <button 
                type="submit"
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Account Tier Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-left space-y-3.5 relative overflow-hidden flex-1">
            <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-amber-500/5 blur-xl pointer-events-none" />
            <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Gói tài khoản</h3>
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Cấp độ</span>
                <span className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  {currentUser.isPremium ? 'Avaxa Premium Pro' : 'Gói miễn phí (Free Tier)'}
                </span>
              </div>
              <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-500">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
            </div>
            <p className="text-[11px] text-slate-450 dark:text-slate-400 leading-relaxed">
              {currentUser.isPremium 
                ? 'Đã kích hoạt toàn bộ công cụ AI thông minh, Gantt chart, whiteboards không giới hạn.' 
                : 'Nâng cấp để sử dụng các tính năng Gantt chart nâng cao và Gemini AI.'}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if ((window as any).showPremiumModal) {
                    (window as any).showPremiumModal();
                  } else if (triggerToast) {
                    triggerToast('info', 'Thông báo 📁', 'Vui lòng sử dụng tài khoản Premium để truy cập toàn bộ tính năng.');
                  }
                }}
                className={`w-full py-2.5 rounded-2xl text-[11px] font-bold text-center transition-all cursor-pointer ${
                  currentUser.isPremium
                    ? 'bg-slate-100 hover:bg-slate-150 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300'
                    : 'text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-105 shadow-sm'
                }`}
              >
                {currentUser.isPremium ? 'Quản lý gói đăng ký' : 'Nâng cấp Premium ngay'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Profile Form Settings (7 columns width) */}
        <div className="lg:col-span-7">
          <form 
            onSubmit={handleSaveProfile} 
            className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-6 flex flex-col h-full justify-between"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-105 dark:border-slate-800/80 pb-3 text-left">
                <div>
                  <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider">Thông tin cá nhân</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Chỉnh sửa thông tin hồ sơ của bạn trên hệ thống</p>
                </div>
                <UserIcon className="w-5 h-5 text-indigo-500 shrink-0" />
              </div>

              {/* Input grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wide block">Họ và tên</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-slate-100"
                    placeholder="Họ và tên..."
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wide block">Vai trò / Chuyên môn</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                    className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-slate-100"
                  >
                    <option value="member">Kỹ sư / Thành viên đội ngũ</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wide block">Số điện thoại</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-slate-100"
                    placeholder="Số điện thoại liên hệ..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wide block">Phòng ban</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-slate-100"
                    placeholder="Phòng ban làm việc..."
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wide block">Tiểu sử ngắn (Bio)</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-855 dark:text-slate-100 resize-none"
                  placeholder="Giới thiệu bản thân và trách nhiệm của bạn..."
                />
              </div>

              {/* Email (Readonly) */}
              <div className="space-y-1 p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-855 text-left">
                <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span>Địa chỉ email tài khoản (Không thể chỉnh sửa)</span>
                </label>
                <p className="text-xs font-mono text-slate-550 dark:text-slate-400 pl-5 pt-0.5">
                  {currentUser.email}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-4 border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-6">
              {saveStatus === 'saved' && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 animate-pulse" />
                  <span>Mọi thay đổi đã được lưu</span>
                </span>
              )}
              {saveStatus === 'dirty' && (
                <span className="text-[10px] text-amber-600 dark:text-amber-450 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Chờ lưu thay đổi...</span>
                </span>
              )}

              <button
                type="submit"
                disabled={saveStatus !== 'dirty' || !name.trim()}
                className={`px-6 py-3 rounded-2xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed ${
                  saveStatus === 'saved'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 opacity-80'
                    : saveStatus === 'saving'
                    ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 opacity-80 animate-pulse'
                    : 'bg-indigo-650 hover:bg-indigo-700 text-white hover:shadow-md'
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
                    <span>Lưu hồ sơ cá nhân</span>
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
