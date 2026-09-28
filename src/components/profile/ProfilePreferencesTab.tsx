"use client";

import React from 'react';
import { Bell, Globe, Mail, MessageSquare, Volume2, Sparkles, Sun } from 'lucide-react';
import ThemeSwitch from '../ThemeSwitch';
import LanguageDropdown from '../LanguageDropdown';

interface ProfilePreferencesTabProps {
  locale: string;
  setLocale: (val: 'vi' | 'en') => void;
  notifyEmailTasks: boolean;
  setNotifyEmailTasks: (val: boolean) => void;
  notifyMentions: boolean;
  setNotifyMentions: (val: boolean) => void;
  notifySound: boolean;
  setNotifySound: (val: boolean) => void;
  notifyWeeklyDigest: boolean;
  setNotifyWeeklyDigest: (val: boolean) => void;
}

function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
        checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className="sr-only">{label || 'Toggle'}</span>
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export const ProfilePreferencesTab: React.FC<ProfilePreferencesTabProps> = ({
  locale,
  setLocale,
  notifyEmailTasks,
  setNotifyEmailTasks,
  notifyMentions,
  setNotifyMentions,
  notifySound,
  setNotifySound,
  notifyWeeklyDigest,
  setNotifyWeeklyDigest,
}) => {
  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-8 rounded-[32px] shadow-sm text-left space-y-6 animate-fade-in max-w-5xl">
      <div className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500 shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
            {locale === 'vi' ? 'Tùy chọn thông báo & Trải nghiệm' : 'Preferences & Notifications'}
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {locale === 'vi'
              ? 'Tùy chỉnh ngôn ngữ hiển thị và cấu hình nhận thông báo quan trọng.'
              : 'Customize notification channels and preferred interface language.'}
          </p>
        </div>
      </div>

      <div className="space-y-3.5 pt-1">
        {/* Theme Appearance Preference */}
        <div className="p-4.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                {locale === 'vi' ? 'Chế độ giao diện (Theme)' : 'Theme & Appearance'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {locale === 'vi' ? 'Chuyển đổi giữa chế độ Sáng, Tối hoặc Tự động theo hệ thống' : 'Toggle between Light, Dark, or System mode'}
              </span>
            </div>
          </div>
          <ThemeSwitch variant="segmented" />
        </div>

        {/* Language Preference */}
        <div className="p-4.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                {locale === 'vi' ? 'Ngôn ngữ giao diện' : 'Interface Language'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {locale === 'vi' ? 'Hiện tại: Tiếng Việt (VI)' : 'Current: English (EN)'}
              </span>
            </div>
          </div>

          <LanguageDropdown variant="segmented" />
        </div>

        {/* Task Notification */}
        <div className="p-4.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                {locale === 'vi' ? 'Email thông báo nhiệm vụ mới' : 'Email notifications for assigned tasks'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {locale === 'vi' ? 'Gửi email khi bạn được phân công làm người phụ trách' : 'Receive an email when assigned to a task'}
              </span>
            </div>
          </div>
          <ToggleSwitch
            checked={notifyEmailTasks}
            onChange={setNotifyEmailTasks}
            label="Email notifications for assigned tasks"
          />
        </div>

        {/* Mention Notification */}
        <div className="p-4.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                {locale === 'vi' ? 'Thông báo khi được nhắc tên (@mention)' : 'Mention notifications'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {locale === 'vi' ? 'Nhận thông báo đẩy khi đồng đội nhắc tên bạn trong bình luận' : 'Push alerts when mentioned in chat or comments'}
              </span>
            </div>
          </div>
          <ToggleSwitch
            checked={notifyMentions}
            onChange={setNotifyMentions}
            label="Mention notifications"
          />
        </div>

        {/* Sound Effects */}
        <div className="p-4.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                {locale === 'vi' ? 'Âm thanh thông báo hệ thống' : 'System sound effects'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {locale === 'vi' ? 'Phát âm thanh nhẹ khi hoàn thành công việc hoặc nhận tin nhắn' : 'Play audio cue on task completion and messages'}
              </span>
            </div>
          </div>
          <ToggleSwitch
            checked={notifySound}
            onChange={setNotifySound}
            label="System sound effects"
          />
        </div>

        {/* Weekly Digest */}
        <div className="p-4.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                {locale === 'vi' ? 'Báo cáo tổng kết năng suất hàng tuần' : 'Weekly Productivity Digest'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {locale === 'vi' ? 'Nhận bản tin AI tóm tắt hiệu suất làm việc vào sáng thứ Hai' : 'Receive an AI summary of work highlights every Monday'}
              </span>
            </div>
          </div>
          <ToggleSwitch
            checked={notifyWeeklyDigest}
            onChange={setNotifyWeeklyDigest}
            label="Weekly Productivity Digest"
          />
        </div>
      </div>
    </div>
  );
};
