"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Phone, Calendar, Briefcase, MessageSquare, CheckCircle2, Clock, Shield, Sparkles, UserCheck } from 'lucide-react';
import { useMemberStore } from '@/store/memberStore';
import { useTaskStore } from '@/store/taskStore';
import { useUiStore } from '@/store/uiStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import SignedImage from './SignedImage';
import { useTranslation } from '@/contexts/TranslationContext';
import { User, Task } from '@/types';

interface MemberProfileModalProps {
  memberId: string | null;
  onClose: () => void;
  onSelectTask?: (task: Task) => void;
}

const statusColors: Record<string, string> = {
  online: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] ring-2 ring-emerald-500/30 animate-pulse',
  busy: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)] ring-2 ring-rose-500/30',
  away: 'bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.7)] ring-2 ring-amber-500/30',
  offline: 'bg-slate-400 ring-2 ring-slate-400/20',
};

const statusLabels: Record<string, { vi: string; en: string }> = {
  online: { vi: 'Trực tuyến', en: 'Online' },
  busy: { vi: 'Đang bận', en: 'Busy' },
  away: { vi: 'Vắng mặt', en: 'Away' },
  offline: { vi: 'Ngoại tuyến', en: 'Offline' },
};

const roleBadges: Record<string, { label: string; cls: string }> = {
  admin: { label: 'Quản trị viên (Admin)', cls: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
  member: { label: 'Thành viên (Member)', cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' },
  owner: { label: 'Chủ sở hữu (Owner)', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
};

export default function MemberProfileModal({ memberId, onClose, onSelectTask }: MemberProfileModalProps) {
  const { t, locale } = useTranslation();
  const members = useMemberStore((s) => s.members);
  const tasks = useTaskStore((s) => s.tasks);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const setInitialSelectedChannelId = useUiStore((s) => s.setInitialSelectedChannelId);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!memberId) return null;

  const member = members.find((m) => m.id === memberId || m.id === `user-${memberId}` || (memberId === 'user' && m.id === 'user'));

  if (!member) return null;

  const assignedTasks = tasks.filter(
    (t) => t.assigneeId === member.id || t.assigneeId === memberId || (t.assigneeIds && (t.assigneeIds.includes(member.id) || t.assigneeIds.includes(memberId)))
  );

  const completedTasksCount = assignedTasks.filter((t) => t.status === 'completed').length;
  const inProgressTasksCount = assignedTasks.filter((t) => t.status === 'inprogress').length;
  const totalHoursLogged = assignedTasks.reduce((sum, t) => sum + (t.hoursLogged || 0), 0);
  const isOwnProfile = member.id === 'user';

  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return locale === 'vi' ? 'Chưa rõ' : 'Unknown';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return locale === 'vi' ? 'Chưa rõ' : 'Unknown';
    const diffSecs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSecs < 60) return locale === 'vi' ? 'Vừa xong' : 'Just now';
    if (diffSecs < 3600) return locale === 'vi' ? `${Math.floor(diffSecs / 60)} phút trước` : `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return locale === 'vi' ? `${Math.floor(diffSecs / 3600)} giờ trước` : `${Math.floor(diffSecs / 3600)}h ago`;
    return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'short' });
  };

  const handleOpenChat = () => {
    onClose();
    if (isOwnProfile) {
      setActiveTab('profile');
      return;
    }
    const currentUserId = 'user';
    const sortedIds = [currentUserId, member.id].sort();
    const dmChannelId = `${activeWorkspaceId || 'w1'}:dm-${sortedIds[0]}-${sortedIds[1]}`;
    setInitialSelectedChannelId(dmChannelId);
    setActiveTab('chat');
  };

  const handleFilterTasks = () => {
    onClose();
    setActiveTab('tasks');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-profile-title"
          className="relative w-full max-w-xl ios27-glass rounded-[36px] shadow-2xl border border-white/80 dark:border-white/10 overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header Banner */}
          <div className="h-36 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative shrink-0 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/30 via-transparent to-black/40" />
            <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px]" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer z-10 active:scale-90"
              title={locale === 'vi' ? 'Đóng' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Profile Header Details */}
          <div className="px-7 pb-5 relative shrink-0 border-b border-slate-200/50 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
            <div className="flex justify-between items-end -mt-16 mb-4">
              <div className="relative group">
                <div className="w-26 h-26 rounded-3xl ring-4 ring-white/90 dark:ring-slate-900/90 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden ios27-glow-ring">
                  <SignedImage
                    filePath={member.avatar}
                    className="w-full h-full object-cover"
                    alt={member.name}
                  />
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 w-6.5 h-6.5 rounded-full border-2 border-white dark:border-slate-900 ${
                    statusColors[member.status || 'offline']
                  } flex items-center justify-center shadow-lg`}
                  title={statusLabels[member.status || 'offline']?.[locale === 'vi' ? 'vi' : 'en']}
                />
              </div>

              <div className="flex items-center gap-2.5">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleOpenChat}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{isOwnProfile ? (locale === 'vi' ? 'Chỉnh sửa hồ sơ' : 'Edit profile') : (locale === 'vi' ? 'Gửi tin nhắn' : 'Chat')}</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleFilterTasks}
                  className="px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-black flex items-center gap-2 border border-slate-200/80 dark:border-slate-700/80 shadow-md backdrop-blur-md transition-all cursor-pointer"
                >
                  <Briefcase className="w-4 h-4 text-indigo-500" />
                  <span>{locale === 'vi' ? 'Xem công việc' : 'Tasks'}</span>
                </motion.button>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 id="member-profile-title" className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {member.name}
                </h2>
                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-xl border uppercase tracking-wider shadow-2xs ${
                    roleBadges[member.role]?.cls || 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                  }`}
                >
                  {roleBadges[member.role]?.label || member.role}
                </span>
              </div>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>{member.email}</span>
              </p>
              <div className="mt-2 flex items-center gap-2 text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
                <span>{statusLabels[member.status || 'offline']?.[locale === 'vi' ? 'vi' : 'en']}</span>
                {member.status !== 'online' && <span>• {formatLastSeen(member.lastSeenAt)}</span>}
              </div>
            </div>

            {/* Status Message */}
            {(member.statusMessage || member.statusEmoji) && (
              <div className="mt-3.5 p-3 rounded-2xl bg-white/60 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2.5 shadow-2xs backdrop-blur-md">
                <span className="text-lg leading-none">{member.statusEmoji || '💬'}</span>
                <span className="italic font-medium">{member.statusMessage}</span>
              </div>
            )}
          </div>

          {/* Modal Body Info Scrollable */}
          <div className="p-7 overflow-y-auto space-y-6 flex-1">
            {/* Task Stats Strip */}
            <div className="grid grid-cols-3 gap-3.5">
              <div className="ios27-card p-4 text-center">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 block tracking-tight">
                  {assignedTasks.length}
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mt-1">
                  {locale === 'vi' ? 'Công việc được giao' : 'Assigned Tasks'}
                </span>
              </div>

              <div className="ios27-card p-4 text-center">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block tracking-tight">
                  {completedTasksCount}
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mt-1">
                  {locale === 'vi' ? 'Đã hoàn thành' : 'Completed'}
                </span>
              </div>

              <div className="ios27-card p-4 text-center">
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400 block tracking-tight">
                  {totalHoursLogged}h
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mt-1">
                  {locale === 'vi' ? 'Giờ đã làm' : 'Hours Logged'}
                </span>
              </div>
            </div>

            {/* Profile Info Fields */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-200/40 dark:border-slate-700/40">
                <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                  {locale === 'vi' ? 'Phòng ban / Chuyên môn' : 'Department'}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {member.department || (locale === 'vi' ? 'Chưa cập nhật' : 'Not specified')}
                </span>
              </div>

              {member.phone && (
                <div className="flex items-center justify-between py-1 border-b border-slate-200/40 dark:border-slate-700/40">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    {locale === 'vi' ? 'Số điện thoại' : 'Phone'}
                  </span>
                  <a href={`tel:${member.phone}`} className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                    {member.phone}
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between py-1 border-b border-slate-200/40 dark:border-slate-700/40">
                <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  {locale === 'vi' ? 'Ngày tham gia' : 'Joined Date'}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {member.joinedDate || '2026'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-500" />
                  {locale === 'vi' ? 'Truy cập gần nhất' : 'Last Active'}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {member.status === 'online' ? (locale === 'vi' ? 'Đang truy cập' : 'Online now') : formatLastSeen(member.lastSeenAt)}
                </span>
              </div>
            </div>

            {/* Short Bio */}
            {member.bio && (
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {locale === 'vi' ? 'Giới thiệu bản thân' : 'Biography'}
                </h4>
                <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                  "{member.bio}"
                </p>
              </div>
            )}

            {member.skills && member.skills.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {locale === 'vi' ? 'Kỹ năng & chuyên môn' : 'Skills & expertise'}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {member.skills.map(skill => (
                    <span key={skill} className="rounded-lg border border-indigo-200/70 bg-indigo-50 px-2.5 py-1 text-[10.5px] font-bold text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Assigned Tasks List */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                <span>{locale === 'vi' ? 'Công việc phụ trách gần đây' : 'Recent Tasks'} ({assignedTasks.length})</span>
              </h4>

              {assignedTasks.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                  {locale === 'vi' ? 'Thành viên này chưa có công việc được giao.' : 'No tasks assigned yet.'}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {assignedTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      onClick={() => {
                        if (onSelectTask) {
                          onClose();
                          onSelectTask(task);
                        }
                      }}
                      className="p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-indigo-500/50 transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 ${
                            task.status === 'completed' ? 'text-emerald-500' : 'text-slate-350 dark:text-slate-600'
                          }`}
                        />
                        <span className={`text-xs font-semibold truncate ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200 group-hover:text-indigo-600'}`}>
                          {task.title}
                        </span>
                      </div>
                      <span className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
