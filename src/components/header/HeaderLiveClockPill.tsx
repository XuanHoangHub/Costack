"use client";

import React, { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, CalendarClock, CalendarDays, Languages, Hash, ChevronDown, X, Check } from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import { useTranslation } from '@/contexts/TranslationContext';

export const HeaderLiveClockPill = memo(function HeaderLiveClockPill() {
  const { locale } = useTranslation();
  const dateFormat = useUiStore((s) => s.dateFormat);
  const setDateFormat = useUiStore((s) => s.setDateFormat);
  const uiDensity = useUiStore((s) => s.uiDensity);
  const setUiDensity = useUiStore((s) => s.setUiDensity);

  const [isOpen, setIsOpen] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const [timeStr, setTimeStr] = useState<string>('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Interval timer: 1000ms ONLY when dateFormat is 'clock'; 60000ms otherwise
  useEffect(() => {
    const update = () => {
      const current = new Date();
      setNow(current);
      if (dateFormat === 'clock') {
        setTimeStr(current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    };

    update();
    const intervalMs = dateFormat === 'clock' ? 1000 : 60000;
    const timer = setInterval(update, intervalMs);
    return () => clearInterval(timer);
  }, [dateFormat]);

  // Click outside to close popover
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const localeTag = locale === 'vi' ? 'vi-VN' : 'en-US';

  const renderDateValue = (fmt: string, ref: Date) => {
    switch (fmt) {
      case 'full':
        return ref.toLocaleDateString(localeTag, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      case 'vi':
        return ref.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
      case 'numeric':
        return ref.toISOString().split('T')[0];
      case 'clock':
        return `${ref.toLocaleDateString(localeTag, { weekday: 'short', month: 'short', day: 'numeric' })} • ${timeStr || ref.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      case 'short':
      default:
        return ref.toLocaleDateString(localeTag, { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  const formattedDate = renderDateValue(dateFormat, now);

  const dateFmtOptions: { id: 'short' | 'clock' | 'full' | 'vi' | 'numeric'; label: string; icon: typeof Calendar }[] = [
    { id: 'short', label: locale === 'vi' ? 'Ngắn gọn' : 'Short', icon: Calendar },
    { id: 'clock', label: locale === 'vi' ? 'Đồng hồ Realtime' : 'Live Clock', icon: CalendarClock },
    { id: 'full', label: locale === 'vi' ? 'Chi tiết' : 'Full', icon: CalendarDays },
    { id: 'vi', label: locale === 'vi' ? 'Chuẩn Việt Nam' : 'Vietnamese', icon: Languages },
    { id: 'numeric', label: locale === 'vi' ? 'Số ISO' : 'ISO Numeric', icon: Hash },
  ];

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setIsOpen(prev => !prev);
          if (typeof window !== 'undefined') {
            (window as any).playSystemSound?.('click');
          }
        }}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`apexa-header-date-button h-8.5 text-[11.5px] font-bold tabular-nums font-sans hidden xl:inline-flex items-center gap-1.5 px-3 rounded-xl border select-none transition-all cursor-pointer group active:scale-95 shadow-3xs ${
          isOpen
            ? 'bg-blue-50 dark:bg-zinc-800 border-blue-500/50 dark:border-blue-400/50 text-blue-600 dark:text-sky-300 ring-2 ring-blue-500/15'
            : 'bg-white/70 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-white/[0.06] hover:border-slate-300 dark:hover:border-white/15'
        }`}
        title={locale === 'vi' ? 'Định dạng ngày & giờ' : 'Date & Time format'}
      >
        <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0 group-hover:rotate-12 transition-transform" />
        {dateFormat === 'clock' && (
          <span className="relative flex h-1.5 w-1.5 shrink-0" title={locale === 'vi' ? 'Đang cập nhật realtime' : 'Updating live'}>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
        )}
        <span>{formattedDate}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 group-hover:text-slate-600 dark:group-hover:text-zinc-300 ${isOpen ? 'rotate-180 text-blue-500 group-hover:text-blue-600 dark:text-sky-300' : ''}`} />
      </button>

      {/* Compact Date & Time Popover Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-2 w-72 bg-white/98 dark:bg-[#121620]/98 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-[0_20px_45px_-10px_rgba(0,0,0,0.3)] p-3 z-50 text-left font-sans space-y-2.5 select-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {locale === 'vi' ? 'Định dạng ngày & giờ' : 'Date & Time'}
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-400 font-medium leading-tight">
                    {locale === 'vi' ? 'Hiển thị trên thanh tiêu đề' : 'Header display format'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                title={locale === 'vi' ? 'Đóng' : 'Close'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Format Options List */}
            <div className="space-y-1">
              {dateFmtOptions.map((fmt) => {
                const isSelected = dateFormat === fmt.id;
                const Icon = fmt.icon;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => {
                      setDateFormat(fmt.id);
                      if (typeof window !== 'undefined') {
                        (window as any).playSystemSound?.('toggle');
                      }
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/25 font-semibold'
                        : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100/70 dark:hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{fmt.label}</div>
                        <div className="text-[9.5px] font-mono text-slate-400 dark:text-zinc-500 truncate">{renderDateValue(fmt.id, now)}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Density toggle footer */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[10px]">
              <span className="font-semibold text-slate-400 dark:text-zinc-500">
                {locale === 'vi' ? 'Mật độ hiển thị:' : 'UI Density:'}
              </span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.06] p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setUiDensity('comfortable');
                    if (typeof window !== 'undefined') {
                      (window as any).playSystemSound?.('toggle');
                    }
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
                    uiDensity === 'comfortable'
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-3xs font-semibold'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800'
                  }`}
                >
                  {locale === 'vi' ? 'Thoáng' : 'Comfortable'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUiDensity('compact');
                    if (typeof window !== 'undefined') {
                      (window as any).playSystemSound?.('toggle');
                    }
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
                    uiDensity === 'compact'
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-3xs font-semibold'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800'
                  }`}
                >
                  {locale === 'vi' ? 'Gọn' : 'Compact'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
export default HeaderLiveClockPill;
