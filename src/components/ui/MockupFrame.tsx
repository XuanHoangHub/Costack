"use client";

import React from "react";
import { motion } from "motion/react";

export type MockupDevice = "browser" | "iphone" | "glass" | "outline";
export type MockupBackground = "tahoe" | "bigsur" | "aurora" | "midnight" | "cyber" | "clean-dark" | "clean-light";

export interface MockupFrameProps {
  device?: MockupDevice;
  background?: MockupBackground;
  children: React.ReactNode;
  title?: string;
  url?: string;
  badge?: string;
  shadow?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  innerClassName?: string;
}

const backgroundGradients: Record<MockupBackground, string> = {
  tahoe: "shots-gradient-tahoe",
  bigsur: "shots-gradient-bigsur",
  aurora: "shots-gradient-aurora",
  midnight: "shots-gradient-midnight",
  cyber: "shots-gradient-cyber",
  "clean-dark": "bg-[#000000]",
  "clean-light": "bg-slate-100",
};

const paddingClasses = {
  none: "p-0",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-6 md:p-8",
  lg: "p-6 sm:p-10 md:p-12",
};

export function MockupFrame({
  device = "browser",
  background = "midnight",
  children,
  title = "Upgen Workspace",
  url = "app.upgen.vn",
  badge,
  shadow = true,
  padding = "md",
  className = "",
  innerClassName = "",
}: MockupFrameProps) {
  return (
    <div
      className={[
        "relative rounded-3xl overflow-hidden transition-all duration-300",
        backgroundGradients[background],
        paddingClasses[padding],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Background ambient lighting overlay */}
      <div className="absolute inset-0 bg-radial from-transparent via-black/10 to-black/30 pointer-events-none" />

      {/* Device Containers */}
      {device === "browser" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={[
            "relative mx-auto rounded-2xl overflow-hidden border border-white/20 dark:border-white/10",
            shadow ? "shadow-[0_25px_70px_rgba(0,0,0,0.45)]" : "",
            "bg-slate-900/90 dark:bg-[var(--cu-surface)]/95 backdrop-blur-2xl text-slate-100",
            innerClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {/* macOS Browser Bar */}
          <div className="px-4 py-2.5 bg-slate-950/80 border-b border-white/10 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block shadow-xs" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block shadow-xs" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block shadow-xs" />
              </div>
              <div className="ml-3 hidden sm:flex items-center gap-1.5 px-3 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-slate-400 font-mono">
                <span className="text-slate-500">https://</span>
                <span className="text-slate-200 font-medium">{url}</span>
              </div>
            </div>

            <div className="text-xs font-bold text-slate-400 truncate max-w-[200px]">
              {title}
            </div>

            <div className="flex items-center gap-2">
              {badge && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-500/20 text-blue-400 border border-blue-400/30">
                  {badge}
                </span>
              )}
            </div>
          </div>

          {/* Browser Viewport Content */}
          <div className="relative overflow-hidden shots-reflection">
            {children}
          </div>
        </motion.div>
      )}

      {device === "iphone" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={[
            "relative mx-auto max-w-[380px] rounded-[48px] p-3 border-[4px] border-slate-700 dark:border-slate-800",
            shadow ? "shadow-[0_25px_70px_rgba(0,0,0,0.6)]" : "",
            "bg-black",
            innerClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {/* Dynamic Island */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-30 flex items-center justify-between px-3 border border-white/5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-white/10" />
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500/30 animate-pulse" />
          </div>

          <div className="relative rounded-[38px] overflow-hidden bg-slate-950 text-slate-100 pt-8 pb-4 min-h-[500px]">
            {children}
          </div>
        </motion.div>
      )}

      {device === "glass" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={[
            "relative mx-auto rounded-3xl overflow-hidden shots-glass-panel",
            shadow ? "shadow-[0_30px_80px_rgba(0,0,0,0.5)]" : "",
            innerClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </motion.div>
      )}

      {device === "outline" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={[
            "relative mx-auto rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950",
            innerClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

export default MockupFrame;
