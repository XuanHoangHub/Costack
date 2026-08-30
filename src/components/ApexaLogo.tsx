"use client";

import React from 'react';

export interface ApexaLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  variant?: 'auto' | 'light' | 'dark' | 'white' | 'blue';
  animated?: boolean;
}

/**
 * Official Apexa Brand Logo
 * - Light Mode: Vibrant Blue Outer Chevron (#2F80ED) + Deep Blue Inner Arrow (#1D4ED8)
 * - Dark Mode: Pure White Emblem (#FFFFFF)
 */
export function ApexaLogoIcon({
  className = "w-6 h-6",
  variant = 'auto',
  animated = false,
  ...props
}: ApexaLogoProps) {
  // Determine fill colors based on variant
  let outerClass = "fill-[#2F80ED] dark:fill-white transition-colors duration-200";
  let innerClass = "fill-[#1D4ED8] dark:fill-white transition-colors duration-200";

  if (variant === 'light') {
    outerClass = "fill-[#2F80ED]";
    innerClass = "fill-[#1D4ED8]";
  } else if (variant === 'dark' || variant === 'white') {
    outerClass = "fill-white";
    innerClass = "fill-white";
  } else if (variant === 'blue') {
    outerClass = "fill-[#2F80ED]";
    innerClass = "fill-[#1D4ED8]";
  }

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className} ${animated ? 'animate-pulse' : ''}`}
      shapeRendering="geometricPrecision"
      {...props}
    >
      {/* Outer Chevron / Triangle Roof */}
      <path
        d="M50 6 L86 82 L73 76 L50 32 L27 76 L14 82 Z"
        className={outerClass}
      />
      {/* Inner Apex Arrow / Pointer */}
      <path
        d="M50 44 L65 75 L50 67 L35 75 Z"
        className={innerClass}
      />
    </svg>
  );
}

export interface ApexaBrandProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  variant?: 'auto' | 'light' | 'dark' | 'white' | 'blue';
  onClick?: () => void;
}

/**
 * Complete Apexa Brand Component (Official Logo + "Apexa" typography)
 */
export function ApexaBrand({
  className = "",
  iconClassName = "w-6 h-6",
  textClassName = "text-lg font-black tracking-tight",
  variant = 'auto',
  onClick,
}: ApexaBrandProps) {
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      <ApexaLogoIcon
        className={`${iconClassName} ${onClick ? 'group-hover:scale-105 transition-transform duration-200' : ''}`}
        variant={variant}
      />
      <span
        className={`font-display ${textClassName} ${
          variant === 'dark' || variant === 'white'
            ? 'text-white'
            : variant === 'light'
            ? 'text-slate-900'
            : 'text-slate-900 dark:text-white'
        }`}
      >
        Apexa
      </span>
    </div>
  );
}

export default ApexaLogoIcon;
