"use client";

import React from 'react';
import {
  CalendarClock, Palette, Database, Briefcase, Boxes, Timer,
  StickyNote, Calculator, Globe, Sparkles, Terminal, Code2,
  Compass, Bookmark, Headphones, Radio, Tv, Cpu, Layers,
  BarChart3, Users2, GitBranch, Target, Shield, FileText,
  LucideIcon
} from 'lucide-react';

export interface MiniAppIconProps {
  appId?: string;
  icon?: string;
  iconName?: string;
  variant?: 'sidebar' | 'card' | 'launcher' | 'header' | 'inline';
  gradient?: string;
  color?: string;
  className?: string;
  iconClassName?: string;
  disabled?: boolean;
  size?: number;
}

/**
 * Registry of SVG vector icons mapped by app ID and icon names
 */
export const MINI_APP_VECTOR_ICONS: Record<string, LucideIcon> = {
  // Native Mini Apps
  'planner': CalendarClock,
  'calendar-clock': CalendarClock,
  'whiteboard': Palette,
  'palette': Palette,
  'base': Database,
  'database': Database,
  'crm': Briefcase,
  'briefcase': Briefcase,
  'erp': Boxes,
  'boxes': Boxes,
  'pomodoro': Timer,
  'timer': Timer,
  'notes': StickyNote,
  'sticky-note': StickyNote,
  'converter': Calculator,
  'calculator': Calculator,

  // Custom App Vector Options
  'globe': Globe,
  'sparkles': Sparkles,
  'terminal': Terminal,
  'code': Code2,
  'compass': Compass,
  'bookmark': Bookmark,
  'headphones': Headphones,
  'radio': Radio,
  'tv': Tv,
  'cpu': Cpu,
  'layers': Layers,
  'chart': BarChart3,
  'users': Users2,
  'workflow': GitBranch,
  'target': Target,
  'shield': Shield,
  'file-text': FileText,
};

/**
 * Helper to resolve the appropriate Lucide icon component
 */
export function getMiniAppVectorIcon(appId?: string, iconName?: string, icon?: string): LucideIcon | null {
  if (iconName && MINI_APP_VECTOR_ICONS[iconName.toLowerCase()]) {
    return MINI_APP_VECTOR_ICONS[iconName.toLowerCase()];
  }
  if (appId && MINI_APP_VECTOR_ICONS[appId.toLowerCase()]) {
    return MINI_APP_VECTOR_ICONS[appId.toLowerCase()];
  }
  if (icon && MINI_APP_VECTOR_ICONS[icon.toLowerCase()]) {
    return MINI_APP_VECTOR_ICONS[icon.toLowerCase()];
  }
  return null;
}

export default function MiniAppIcon({
  appId,
  icon = '🌐',
  iconName,
  variant = 'card',
  gradient,
  color,
  className = '',
  iconClassName = '',
  disabled = false,
  size,
}: MiniAppIconProps) {
  const VectorIcon = getMiniAppVectorIcon(appId, iconName, icon);

  // 1. Sidebar variant: clean vector icon matching Apexa navigation
  if (variant === 'sidebar') {
    if (VectorIcon) {
      return (
        <span className={`flex items-center justify-center w-5 h-5 shrink-0 ${className}`}>
          <VectorIcon className={`w-5 h-5 transition-colors ${iconClassName}`} strokeWidth={2} />
        </span>
      );
    }
    // Fallback emoji on sidebar
    return (
      <span className={`flex items-center justify-center w-5 h-5 text-sm leading-none select-none shrink-0 ${className}`}>
        {icon}
      </span>
    );
  }

  // 2. Inline variant: bare icon without squircle container
  if (variant === 'inline') {
    if (VectorIcon) {
      return (
        <VectorIcon
          className={`shrink-0 ${className || 'w-4 h-4'} ${iconClassName}`}
          strokeWidth={2}
          size={size}
        />
      );
    }
    return (
      <span className={`inline-flex items-center justify-center select-none ${className}`}>
        {icon}
      </span>
    );
  }

  // 3. Header container variant (for MiniAppContainer header bar)
  if (variant === 'header') {
    return (
      <div
        className={`w-7 h-7 rounded-lg relative flex items-center justify-center text-white shadow-3xs overflow-hidden shrink-0 bg-gradient-to-br ${
          gradient || 'from-blue-500 to-indigo-600'
        } ${className}`}
        style={!gradient && color ? { backgroundColor: color } : undefined}
      >
        {/* Subtle specular reflection overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-white/20 pointer-events-none" />
        {VectorIcon ? (
          <VectorIcon className={`w-4 h-4 stroke-[2.2] relative z-10 drop-shadow-2xs ${iconClassName}`} />
        ) : (
          <span className="text-sm relative z-10 leading-none">{icon}</span>
        )}
      </div>
    );
  }

  // 4. Launcher popover variant (for Header 9-dot grid)
  if (variant === 'launcher') {
    return (
      <div
        className={`w-10 h-10 rounded-xl relative flex items-center justify-center text-white shadow-xs select-none overflow-hidden transition-transform duration-150 bg-gradient-to-br ${
          gradient || 'from-blue-500 to-indigo-600'
        } ${className}`}
        style={!gradient && color ? { backgroundColor: color } : undefined}
      >
        {/* Glossy highlight */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-white/25 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/10 rounded-t-xl pointer-events-none blur-[0.5px]" />
        {VectorIcon ? (
          <VectorIcon className={`w-5 h-5 stroke-[2.2] relative z-10 drop-shadow-xs ${iconClassName}`} />
        ) : (
          <span className="text-xl relative z-10 leading-none">{icon}</span>
        )}
      </div>
    );
  }

  // 5. Card variant (for MiniAppHub cards & disabled screen)
  return (
    <div
      className={`w-12 h-12 rounded-2xl relative flex items-center justify-center text-white shadow-md select-none overflow-hidden transition-all duration-300 ${
        disabled ? 'grayscale contrast-75 opacity-70' : ''
      } bg-gradient-to-br ${gradient || 'from-blue-500 to-indigo-600'} ${className}`}
      style={!gradient && color ? { backgroundColor: color } : undefined}
    >
      {/* Specular highlight shine */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/25 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/10 rounded-t-2xl pointer-events-none blur-[0.5px]" />
      {VectorIcon ? (
        <VectorIcon className={`w-6 h-6 stroke-[2.2] relative z-10 drop-shadow-sm ${iconClassName}`} />
      ) : (
        <span className="text-2xl relative z-10 leading-none">{icon}</span>
      )}
    </div>
  );
}
