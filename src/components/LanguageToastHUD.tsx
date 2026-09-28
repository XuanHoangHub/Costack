"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Sparkles } from 'lucide-react';
import { VietnamFlag, USFlag } from './LanguageDropdown';

interface LanguageHudData {
  locale: string;
  label: string;
  code: string;
}

export default function LanguageToastHUD() {
  const [hudData, setHudData] = useState<LanguageHudData | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleShowHud = (event: Event) => {
      const customEvent = event as CustomEvent<LanguageHudData>;
      if (customEvent.detail) {
        setHudData(customEvent.detail);
        clearTimeout(timer);
        timer = setTimeout(() => {
          setHudData(null);
        }, 2200);
      }
    };

    window.addEventListener('apexa-show-language-hud', handleShowHud);
    return () => {
      window.removeEventListener('apexa-show-language-hud', handleShowHud);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none select-none">
      <AnimatePresence>
        {hudData && (
          <motion.div
            initial={{ y: -30, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -25, opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 shadow-[0_12px_36px_rgba(0,0,0,0.35)] dark:shadow-[0_12px_36px_rgba(255,255,255,0.15)] border border-white/15 dark:border-slate-300/30 backdrop-blur-2xl pointer-events-auto cursor-pointer"
            onClick={() => setHudData(null)}
          >
            {/* Flag with gentle gleam */}
            <div className="shrink-0 relative">
              {hudData.code === 'VI' ? (
                <VietnamFlag className="w-5 h-3.5 rounded-[3px] shadow-sm" />
              ) : (
                <USFlag className="w-5 h-3.5 rounded-[3px] shadow-sm" />
              )}
            </div>

            {/* Language Text */}
            <div className="flex items-center gap-1.5 text-xs font-bold leading-none">
              <span>{hudData.code === 'VI' ? 'Đã đổi sang' : 'Switched to'}</span>
              <span className="text-blue-400 dark:text-blue-600 font-extrabold">{hudData.label}</span>
            </div>

            {/* Checkmark icon badge */}
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 dark:text-emerald-600 flex items-center justify-center shrink-0 ml-0.5">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>

            {/* Micro subtle sparkle */}
            <Sparkles className="w-3 h-3 text-amber-400 dark:text-amber-500 animate-pulse shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
