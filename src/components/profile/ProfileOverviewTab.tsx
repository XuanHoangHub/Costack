"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, Globe, Phone, MapPin, Mail, Lock, 
  FileText, CheckCircle, Clock, Save, RotateCcw, 
  Sparkles, Activity, Plus, X, Tag, Zap, AlertCircle
} from 'lucide-react';
import { ProfileBadgesCard } from './ProfileBadgesCard';

interface ProfileOverviewTabProps {
  name: string;
  setName: (val: string) => void;
  jobTitle: string;
  setJobTitle: (val: string) => void;
  department: string;
  setDepartment: (val: string) => void;
  location: string;
  setLocation: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  website: string;
  setWebsite: (val: string) => void;
  github: string;
  setGithub: (val: string) => void;
  linkedin: string;
  setLinkedin: (val: string) => void;
  twitter: string;
  setTwitter: (val: string) => void;
  bio: string;
  setBio: (val: string) => void;
  skills: string[];
  setSkills: React.Dispatch<React.SetStateAction<string[]>>;
  email: string;
  role: 'admin' | 'member' | 'guest';
  isPremium?: boolean;
  saveStatus: 'saved' | 'saving' | 'dirty';
  formError: string;
  onSaveProfile: (e?: React.FormEvent) => void;
  onResetForm: () => void;
  // Metrics
  todoTasksCount: number;
  inProgressTasksCount: number;
  reviewTasksCount: number;
  completedTasksCount: number;
  totalTasksCount: number;
  completionRate: number;
  hasOverdueTasks: boolean;
  profileCompleteness: number;
  locale: string;
  triggerToast?: (type: any, title: string, message: string) => void;
}

const POPULAR_SKILLS = [
  'React', 'TypeScript', 'Next.js', 'Tailwind CSS',
  'UI/UX Design', 'Project Management', 'Agile / Scrum',
  'Node.js', 'Python', 'AI Prompting', 'Figma', 'System Architecture'
];

export const ProfileOverviewTab: React.FC<ProfileOverviewTabProps> = ({
  name,
  setName,
  jobTitle,
  setJobTitle,
  department,
  setDepartment,
  location,
  setLocation,
  phone,
  setPhone,
  website,
  setWebsite,
  github,
  setGithub,
  linkedin,
  setLinkedin,
  twitter,
  setTwitter,
  bio,
  setBio,
  skills,
  setSkills,
  email,
  role,
  isPremium,
  saveStatus,
  formError,
  onSaveProfile,
  onResetForm,
  todoTasksCount,
  inProgressTasksCount,
  reviewTasksCount,
  completedTasksCount,
  totalTasksCount,
  completionRate,
  hasOverdueTasks,
  profileCompleteness,
  locale,
  triggerToast,
}) => {
  const [newSkillInput, setNewSkillInput] = useState('');

  const handleAddSkill = (skillToAdd?: string) => {
    const trimmed = (skillToAdd || newSkillInput).trim();
    if (!trimmed) return;
    if (skills.includes(trimmed)) {
      triggerToast?.('info', locale === 'vi' ? 'Đã tồn tại kỹ năng' : 'Skill already added', trimmed);
      setNewSkillInput('');
      return;
    }
    setSkills((prev) => [...prev, trimmed]);
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  const handleKeyDownSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in text-left">
      
      {/* ── Left Column (5 Cols): Badges, Performance Pulse & Perks ── */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* 1. Gamification Badges Card */}
        <ProfileBadgesCard
          completedTasksCount={completedTasksCount}
          completionRate={completionRate}
          hasOverdueTasks={hasOverdueTasks}
          isPremium={isPremium}
          isAdmin={role === 'admin'}
          profileCompleteness={profileCompleteness}
          locale={locale}
        />

        {/* 2. Work Performance Pulse Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-[28px] shadow-sm text-left space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  {locale === 'vi' ? 'Nhịp độ công việc' : 'Work Pulse'}
                </h3>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {locale === 'vi' ? 'Tiến độ & Nhiệm vụ phụ trách' : 'Task progress & completion'}
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-xl">
              {totalTasksCount} {locale === 'vi' ? 'task' : 'tasks'}
            </span>
          </div>

          {/* Progress Gauge */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs font-extrabold text-slate-700 dark:text-slate-300">
              <span>{locale === 'vi' ? 'Tỷ lệ hoàn thành công việc' : 'Completion Rate'}</span>
              <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                {completionRate}%
              </span>
            </div>
            <div className="w-full bg-slate-200/70 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="flex justify-between text-[10.5px] font-bold text-slate-400">
              <span>{completedTasksCount} {locale === 'vi' ? 'đã xong' : 'done'}</span>
              <span>{totalTasksCount - completedTasksCount} {locale === 'vi' ? 'đang mở' : 'open'}</span>
            </div>
          </div>

          {/* 4 Metric Tiles */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 text-left">
              <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
                <span className="text-[11px] font-extrabold uppercase tracking-wide">{locale === 'vi' ? 'Cần làm' : 'To Do'}</span>
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span className="text-xl font-black text-slate-900 dark:text-white mt-1.5 block">
                {todoTasksCount}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-left">
              <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                <span className="text-[11px] font-extrabold uppercase tracking-wide">{locale === 'vi' ? 'Đang làm' : 'In Progress'}</span>
                <Zap className="w-3.5 h-3.5" />
              </div>
              <span className="text-xl font-black text-slate-900 dark:text-white mt-1.5 block">
                {inProgressTasksCount}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 text-left">
              <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
                <span className="text-[11px] font-extrabold uppercase tracking-wide">{locale === 'vi' ? 'Đang duyệt' : 'Review'}</span>
                <Activity className="w-3.5 h-3.5" />
              </div>
              <span className="text-xl font-black text-slate-900 dark:text-white mt-1.5 block">
                {reviewTasksCount}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-left">
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span className="text-[11px] font-extrabold uppercase tracking-wide">{locale === 'vi' ? 'Đã xong' : 'Done'}</span>
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
              <span className="text-xl font-black text-slate-900 dark:text-white mt-1.5 block">
                {completedTasksCount}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Account Tier & Perks Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-[28px] shadow-sm text-left space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                {locale === 'vi' ? 'Gói dịch vụ workspace' : 'Account Tier'}
              </span>
              <span className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                {isPremium ? 'Costack Premium Pro' : (locale === 'vi' ? 'Gói Cơ Bản (Free Tier)' : 'Free Tier')}
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            {isPremium
              ? (locale === 'vi'
                ? 'Đã kích hoạt toàn bộ trợ lý AI Gemini, sơ đồ Gantt timeline, tài chính nâng cao và không giới hạn lưu trữ.'
                : 'All features active: Gemini AI Assistant, Gantt timelines, Advanced Finance, and unlimited storage.')
              : (locale === 'vi'
                ? 'Nâng cấp lên Costack Pro để mở khóa trợ lý AI thông minh, sơ đồ Gantt và tính năng cộng tác nhóm cao cấp.'
                : 'Upgrade to unlock AI Assistant, Gantt charts, advanced financial dashboards, and premium perks.')}
          </p>

          <button
            type="button"
            onClick={() => {
              if ((window as any).showPremiumModal) {
                (window as any).showPremiumModal();
              } else if (triggerToast) {
                triggerToast('info', locale === 'vi' ? 'Nâng cấp tài khoản' : 'Upgrade Account', locale === 'vi' ? 'Vui lòng chọn gói đăng ký để tiếp tục.' : 'Please choose a plan to proceed.');
              }
            }}
            className={`w-full py-3 rounded-2xl text-xs font-black tracking-wide text-center transition-all cursor-pointer shadow-xs ${
              isPremium
                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                : 'text-white bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:brightness-110 shadow-amber-500/20'
            }`}
          >
            {isPremium
              ? (locale === 'vi' ? 'Quản lý gói Pro' : 'Manage Subscription')
              : (locale === 'vi' ? 'Nâng cấp lên Pro Ngay ✨' : 'Upgrade to Pro Now ✨')}
          </button>
        </div>

      </div>

      {/* ── Right Column (7 Cols): Organized Profile Details Form ── */}
      <div className="lg:col-span-7">
        <form
          onSubmit={onSaveProfile}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-8 rounded-[28px] shadow-sm space-y-6"
        >
          {/* Form Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 text-left">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {locale === 'vi' ? 'Thông tin cá nhân & Công việc' : 'Personal & Work Information'}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
                {locale === 'vi' ? 'Quản lý thông tin hiển thị với các đồng đội trong workspace' : 'Manage information visible to workspace teammates'}
              </p>
            </div>
            
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
              <Briefcase className="w-4 h-4 shrink-0" />
            </div>
          </div>

          {/* Group 1: Identity & Role */}
          <div className="space-y-4 text-left">
            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
              <span>{locale === 'vi' ? '1. Định danh & Vị trí công tác' : '1. Identity & Role'}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                  <span>{locale === 'vi' ? 'Họ và tên' : 'Full Name'}</span> <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={80}
                  className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                  placeholder={locale === 'vi' ? 'Nhập họ và tên...' : 'Enter your full name...'}
                  required
                />
              </div>

              {/* Job Title */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                  <span>{locale === 'vi' ? 'Chức danh / Nghề nghiệp' : 'Job Title'}</span>
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  maxLength={80}
                  className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                  placeholder={locale === 'vi' ? 'Ví dụ: Senior Product Designer...' : 'e.g. Senior Product Designer...'}
                />
              </div>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                <span>{locale === 'vi' ? 'Phòng ban / Đội ngũ phụ trách' : 'Department'}</span>
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                maxLength={80}
                className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                placeholder={locale === 'vi' ? 'Ví dụ: Khối Công nghệ & Sản phẩm...' : 'e.g. Engineering & Product...'}
              />
            </div>
          </div>

          {/* Group 2: Contact & Social Profiles */}
          <div className="space-y-4 text-left pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-sky-500" />
              <span>{locale === 'vi' ? '2. Liên hệ & Kênh trực tuyến' : '2. Contact & Web Profiles'}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                  <span>{locale === 'vi' ? 'Số điện thoại' : 'Phone Number'}</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  maxLength={24}
                  className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                  placeholder={locale === 'vi' ? '+84 ...' : 'Enter phone number...'}
                />
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                  <span>{locale === 'vi' ? 'Địa điểm / Thành phố' : 'Location / City'}</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={80}
                  className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                  placeholder={locale === 'vi' ? 'Ví dụ: Hà Nội, Việt Nam' : 'e.g. Hanoi, Vietnam'}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Website */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                  <span>Portfolio / Website</span>
                </label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                  placeholder="https://..."
                />
              </div>

              {/* GitHub */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                  <span>GitHub</span>
                </label>
                <input
                  type="text"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                  placeholder="username"
                />
              </div>

              {/* LinkedIn */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                  <span>LinkedIn</span>
                </label>
                <input
                  type="text"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="w-full text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 transition-all"
                  placeholder="username"
                />
              </div>
            </div>
          </div>

          {/* Group 3: Interactive Skills Tag Cloud */}
          <div className="space-y-3 text-left pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-500" />
                <span>{locale === 'vi' ? '3. Kỹ năng chuyên môn' : '3. Core Skills & Expertise'}</span>
              </h4>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                {skills.length} {locale === 'vi' ? 'kỹ năng' : 'skills'}
              </span>
            </div>

            {/* Input to add skill */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={handleKeyDownSkill}
                placeholder={locale === 'vi' ? 'Nhập kỹ năng rồi nhấn Enter...' : 'Type skill & press Enter...'}
                className="flex-1 text-xs font-bold p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => handleAddSkill()}
                className="px-4 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{locale === 'vi' ? 'Thêm' : 'Add'}</span>
              </button>
            </div>

            {/* Selected Skills Chips with Spring Transitions */}
            <div className="flex flex-wrap gap-2 min-h-[36px]">
              <AnimatePresence>
                {skills.map((skill) => (
                  <motion.span
                    key={skill}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="w-4 h-4 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                      title={locale === 'vi' ? 'Xóa kỹ năng' : 'Remove skill'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
              {skills.length === 0 && (
                <span className="text-xs text-slate-400 italic py-1">
                  {locale === 'vi' ? 'Chưa có kỹ năng nào. Hãy thêm các kỹ năng thế mạnh của bạn!' : 'No skills added yet. Add your top expertise!'}
                </span>
              )}
            </div>

            {/* Popular Suggestions */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                {locale === 'vi' ? 'Gợi ý nhanh:' : 'Quick suggestions:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_SKILLS.filter((s) => !skills.includes(s)).slice(0, 8).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleAddSkill(suggestion)}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 dark:bg-slate-950 dark:hover:bg-indigo-950/40 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-slate-800 transition-all cursor-pointer"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Group 4: Short Bio */}
          <div className="space-y-2 text-left pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span>{locale === 'vi' ? '4. Tiểu sử giới thiệu' : '4. Short Bio'}</span>
              </h4>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                {bio.length} / 500
              </span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full text-xs font-medium p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 resize-none transition-all leading-relaxed"
              placeholder={locale === 'vi' ? 'Mô tả bản thân, kinh nghiệm và trách nhiệm chính...' : 'Introduce yourself and your key responsibilities...'}
            />
          </div>

          {formError && (
            <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Readonly Account Email Banner */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-left flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                <span>{locale === 'vi' ? 'Email tài khoản (Cố định)' : 'Account Email (Read-only)'}</span>
              </span>
              <p className="text-xs font-mono text-slate-700 dark:text-slate-200 font-bold pt-0.5">
                {email}
              </p>
            </div>
            <Lock className="w-4 h-4 text-slate-400" />
          </div>

          {/* Bottom Action Button Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-5">
            <div>
              {saveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{locale === 'vi' ? 'Đã lưu tất cả thay đổi' : 'All changes saved'}</span>
                </span>
              )}
              {saveStatus === 'dirty' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>{locale === 'vi' ? 'Có thay đổi chưa lưu' : 'Unsaved changes'}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {saveStatus === 'dirty' && (
                <button
                  type="button"
                  onClick={onResetForm}
                  className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{locale === 'vi' ? 'Hoàn tác' : 'Reset'}</span>
                </button>
              )}
              <button
                type="submit"
                disabled={saveStatus !== 'dirty' || !name.trim()}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black tracking-wide shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed ${
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
                    <span>{locale === 'vi' ? 'Đang lưu...' : 'Saving...'}</span>
                  </>
                ) : saveStatus === 'saved' ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{locale === 'vi' ? 'Đã lưu' : 'Saved'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{locale === 'vi' ? 'Lưu hồ sơ cá nhân' : 'Save Profile'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

    </div>
  );
};
