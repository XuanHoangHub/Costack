"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../contexts/TranslationContext';
import { motion, AnimatePresence } from 'motion/react';
import { User, Task } from '../types';
import { supabase } from '../lib/supabaseClient';
import { 
  User as UserIcon, Camera, Mail, Briefcase, Shield, 
  Phone, MapPin, Calendar, Activity, CheckCircle, 
  Clock, Save, Upload, Sparkles, AlertCircle, Trash2, Plus, X, Globe, Star
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import SignedImage from './SignedImage';


interface ProfilePageProps {
  currentUser: { name: string; email: string; avatar: string; role: 'admin' | 'member' | 'guest'; isPremium?: boolean };
  setCurrentUser: (user: any) => void;
  members: User[];
  setMembers: React.Dispatch<React.SetStateAction<User[]>>;
  tasks: Task[];
  isOffline: boolean;
  addSyncLog: (action: string) => void;
  triggerToast?: (type: any, title: string, message: string) => void;
  onUpdateMember?: (member: User) => void;
}

function ProfilePage({
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
  const { t, locale } = useTranslation();
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
      const savedSkills = localStorage.getItem('apexa_user_skills');
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
  }, [currentUser, members, skills]);

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
    localStorage.setItem('apexa_session', JSON.stringify(sessionObj));

    // Save skills
    localStorage.setItem('apexa_user_skills', JSON.stringify(skills));

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
      triggerToast('success', 'Đã lưu thay đổi', 'Hồ sơ người dùng của bạn đã được cập nhật thành công!');
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
      <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-all duration-300">
        {/* Glowing Aura Banner */}
        <div className="h-44 md:h-52 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/20" />
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-400/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-pink-400/30 rounded-full blur-3xl" />
          
          <div className="absolute top-4 right-4 flex gap-2">
            <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 dark:bg-black/40 text-white backdrop-blur-md border border-white/20 shadow-md flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`} />
              {isOffline ? 'Offline' : 'Online'}
            </span>
          </div>
        </div>

        {/* User Profile Info Overlay */}
        <div className="px-6 md:px-8 py-6 pt-0 relative flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className="relative -mt-16 md:-mt-20 shrink-0 group">
            <div className="relative rounded-3xl overflow-hidden ring-4 ring-white dark:ring-slate-900 shadow-2xl bg-slate-100 dark:bg-slate-800">
              <SignedImage 
                filePath={avatar} 
                className="w-28 h-28 md:w-36 md:h-36 object-cover transition-transform duration-300 group-hover:scale-105" 
                alt={name} 
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-1.5 cursor-pointer"
              >
                <Camera className="w-6 h-6 text-white/90 animate-bounce" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full border border-white/30">
                  {locale === 'vi' ? 'Tải ảnh lên' : 'Upload photo'}
                </span>
              </button>
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500 shadow-lg flex items-center justify-center text-white text-[10px]" />
          </div>

          <div className="flex-1 text-center md:text-left space-y-1.5 mb-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {name}
              </h2>
              {currentUser.isPremium ? (
                <span className="text-[10px] font-black tracking-widest bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full uppercase shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> PRO
                </span>
              ) : (
                <span className="text-[10px] font-black tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full uppercase font-mono border border-slate-200/80 dark:border-slate-700">
                  FREE
                </span>
              )}
            </div>

            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-center md:justify-start gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
              <span>{role === 'admin' ? (t('roleAdmin') || 'Admin') : (t('roleMember') || 'Member')}</span>
              {department && <span className="text-slate-400 dark:text-slate-600">• {t('dept_' + department + '_name') || department}</span>}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-1.5 pt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                {currentUser.email}
              </span>
              {phone && (
                <span className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
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
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-left flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                {t('workStatistics') || 'Task Statistics'}
              </h3>
              <Activity className="w-4 h-4 text-indigo-500" />
            </div>
            
            <div className="flex items-center gap-6 py-4">
              <div className="relative w-28 h-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statPieData.length > 0 ? statPieData : [{ name: locale === 'vi' ? 'Trống' : 'Empty', value: 1, color: '#e2e8f0' }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={48}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(statPieData.length > 0 ? statPieData : [{ name: locale === 'vi' ? 'Trống' : 'Empty', value: 1, color: '#e2e8f0' }]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">{myTasks.length}</span>
                  <span className="text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black mt-0.5">{t('tasks') || 'Tasks'}</span>
                </div>
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  <span>{t('completionRate') || 'Completion rate'}</span>
                  <span className="text-emerald-500 font-mono font-bold">{completionRate}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-500 shadow-[0_0_8px_rgba(99,102,241,0.3)]" 
                    style={{ width: `${completionRate}%` }} 
                  />
                </div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  {t('doneTasks').replace('{completed}', String(completedTasks.length)).replace('{total}', String(myTasks.length))}
                </p>
              </div>
            </div>

            {/* List breakdown */}
            <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="p-3 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 text-left">
                <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 block flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {t('inProgress') || 'In Progress'}
                </span>
                <span className="text-base font-black text-slate-800 dark:text-slate-100 mt-1 block">
                  {locale === 'vi' ? `${inProgressTasksCount} việc` : `${inProgressTasksCount} tasks`}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 text-left">
                <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400 block flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {t('inReview') || 'In Review'}
                </span>
                <span className="text-base font-black text-slate-800 dark:text-slate-100 mt-1 block">
                  {locale === 'vi' ? `${reviewTasksCount} việc` : `${reviewTasksCount} tasks`}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Skills Tags Cloud Card */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-left space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  {t('skillsAndExpertise') || 'Skills & Expertise'}
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                  {t('tagStrengths') || 'Tag your technical strengths'}
                </p>
              </div>
              <Star className="w-4 h-4 text-amber-400" />
            </div>

            {/* Tags Cloud */}
            <div className="flex flex-wrap gap-2 py-1 min-h-[44px]">
              {skills.length === 0 ? (
                <p className="text-xs text-slate-400 italic">{locale === 'vi' ? 'Chưa gắn thẻ kỹ năng nào.' : 'No skills tagged yet.'}</p>
              ) : (
                skills.map(skill => (
                  <span 
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs hover:border-indigo-300 transition-all"
                  >
                    <span>{skill}</span>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveSkill(skill)}
                      className="p-0.5 hover:bg-indigo-200/60 dark:hover:bg-indigo-900/60 rounded-md text-indigo-500 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
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
                placeholder={t('addSkillPlaceholder') || 'Add a new skill (e.g. Next.js)...'}
                className="flex-1 text-xs font-bold px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-100 transition-all"
              />
              <button 
                type="submit"
                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-sm hover:shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Account Tier Panel */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-left space-y-4 relative overflow-hidden flex-1 hover:shadow-md transition-shadow">
            <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
            <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
              {t('accountTier') || 'Account Tier'}
            </h3>
            
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                  {t('account') || 'Account'}
                </span>
                <span className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  {currentUser.isPremium ? 'Apexa Premium Pro' : (locale === 'vi' ? 'Gói miễn phí (Free Tier)' : 'Free Tier Package')}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {currentUser.isPremium 
                ? (locale === 'vi' ? 'Đã kích hoạt toàn bộ công cụ AI thông minh, Gantt chart, whiteboards không giới hạn.' : 'Full access to smart AI tools, Gantt charts, and unlimited whiteboards.')
                : (locale === 'vi' ? 'Nâng cấp để sử dụng các tính năng Gantt chart nâng cao và Gemini AI.' : 'Upgrade to use advanced Gantt charts and Gemini AI features.')}
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if ((window as any).showPremiumModal) {
                    (window as any).showPremiumModal();
                  } else if (triggerToast) {
                    triggerToast('info', locale === 'vi' ? 'Thông báo' : 'Notification', locale === 'vi' ? 'Vui lòng sử dụng tài khoản Premium để truy cập toàn bộ tính năng.' : 'Please use a Premium account to access all features.');
                  }
                }}
                className={`w-full py-3 rounded-2xl text-xs font-black tracking-wide text-center transition-all duration-200 cursor-pointer shadow-sm ${
                  currentUser.isPremium
                    ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                    : 'text-white bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:brightness-110 shadow-amber-500/20'
                }`}
              >
                {currentUser.isPremium 
                  ? (locale === 'vi' ? 'Quản lý gói đăng ký' : 'Manage Subscription') 
                  : (locale === 'vi' ? 'Nâng cấp Premium ngay' : 'Upgrade to Premium Now')}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Profile Form Settings (7 columns width) */}
        <div className="lg:col-span-7">
          <form 
            onSubmit={handleSaveProfile} 
            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-6 md:p-7 rounded-3xl shadow-sm space-y-6 flex flex-col h-full justify-between hover:shadow-md transition-shadow"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 text-left">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {t('personalInfo') || 'Personal Information'}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {t('editProfileInfo') || 'Edit your profile details'}
                  </p>
                </div>
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                  <UserIcon className="w-5 h-5 shrink-0" />
                </div>
              </div>

              {/* Input grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {t('fullName') || 'Full Name'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-xs font-bold p-3 pl-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                      placeholder={t('fullNamePlaceholder') || 'Full Name...'}
                      required
                    />
                  </div>
                </div>

                {/* Role / Profession */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {t('roleProfession') || 'Role / Profession'}
                  </label>
                  <div className="relative">
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                      className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all cursor-pointer"
                    >
                      <option value="member">{t('roleMember') || 'Member'}</option>
                      <option value="admin">{t('roleAdmin') || 'Admin'}</option>
                    </select>
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {t('phoneNumber') || 'Phone Number'}
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                      placeholder={t('phonePlaceholder') || 'Phone number...'}
                    />
                  </div>
                </div>

                {/* Department */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {t('department') || 'Department'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                      placeholder={t('departmentPlaceholder') || 'Working department...'}
                    />
                  </div>
                </div>
              </div>

              {/* Short Bio */}
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  {t('shortBio') || 'Short Bio'}
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="w-full text-xs font-medium p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 resize-none transition-all leading-relaxed"
                  placeholder={t('bioPlaceholder') || 'Introduce yourself and your responsibilities...'}
                />
              </div>

              {/* Email (Readonly) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-left space-y-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t('emailReadOnly') || 'Account email (Read-only)'}</span>
                </label>
                <p className="text-xs font-mono text-slate-600 dark:text-slate-300 font-semibold pt-0.5">
                  {currentUser.email}
                </p>
              </div>
            </div>

            {/* Action buttons bar */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-5 mt-6">
              <div>
                {saveStatus === 'saved' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{t('allChangesSaved') || 'All changes saved'}</span>
                  </span>
                )}
                {saveStatus === 'dirty' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('waitingForChanges') || 'Waiting for changes...'}</span>
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={saveStatus !== 'dirty' || !name.trim()}
                className={`px-7 py-3 rounded-2xl text-xs font-black tracking-wide shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed ${
                  saveStatus === 'saved'
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 opacity-70'
                    : saveStatus === 'saving'
                    ? 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400 opacity-80 animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 hover:shadow-md'
                }`}
              >
                {saveStatus === 'saving' ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>{t('saving') || 'Saving...'}</span>
                  </>
                ) : saveStatus === 'saved' ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t('savedSuccessfully') || 'Saved successfully'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{t('saveProfile') || 'Save Profile'}</span>
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

const MemoizedProfilePage = React.memo(ProfilePage);
export default MemoizedProfilePage;
export { ProfilePage };
