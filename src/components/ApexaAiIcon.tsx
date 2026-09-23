"use client";

import React from 'react';

interface ApexaAiIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  variant?: 'gradient' | 'monochrome' | 'glow' | 'solid' | 'white';
  animated?: boolean;
}

/**
 * Costack AI Sparkle Icon
 * Clean 4-point sparkle star indicating AI assistance, replacing old brand logo.
 */
export function ApexaAiIcon({
  className = "w-5 h-5",
  variant = 'gradient',
  animated = false,
  ...props
}: ApexaAiIconProps) {
  const gradientId = React.useId();

  if (variant === 'white' || variant === 'solid') {
    return (
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${className} ${animated ? 'animate-pulse' : ''}`}
        shapeRendering="geometricPrecision"
        {...props}
      >
        {/* Main AI Sparkle */}
        <path
          d="M50 8 C50 31 69 50 92 50 C69 50 50 69 50 92 C50 69 31 50 8 50 C31 50 50 31 50 8 Z"
          fill="#FFFFFF"
        />
        {/* Accent Secondary Sparkle */}
        <path
          d="M76 12 C76 20 83 26 91 26 C83 26 76 32 76 40 C76 32 70 26 62 26 C70 26 76 20 76 12 Z"
          fill="#FFFFFF"
          opacity="0.8"
        />
      </svg>
    );
  }

  if (variant === 'monochrome') {
    return (
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${className} ${animated ? 'animate-pulse' : ''}`}
        shapeRendering="geometricPrecision"
        {...props}
      >
        <path
          d="M50 8 C50 31 69 50 92 50 C69 50 50 69 50 92 C50 69 31 50 8 50 C31 50 50 31 50 8 Z"
          fill="currentColor"
        />
        <path
          d="M76 12 C76 20 83 26 91 26 C83 26 76 32 76 40 C76 32 70 26 62 26 C70 26 76 20 76 12 Z"
          fill="currentColor"
          opacity="0.8"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animated ? 'animate-pulse' : ''}`}
      shapeRendering="geometricPrecision"
      {...props}
    >
      <defs>
        <linearGradient id={`costackAiGrad-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>

        <linearGradient id={`costackAiCoreGrad-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>

        {variant === 'glow' && (
          <filter id={`costackAiGlow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        )}
      </defs>

      {/* Main AI Sparkle */}
      <path
        d="M50 8 C50 31 69 50 92 50 C69 50 50 69 50 92 C50 69 31 50 8 50 C31 50 50 31 50 8 Z"
        fill={`url(#costackAiGrad-${gradientId})`}
        filter={variant === 'glow' ? `url(#costackAiGlow-${gradientId})` : undefined}
      />

      {/* Accent Secondary Sparkle */}
      <path
        d="M76 12 C76 20 83 26 91 26 C83 26 76 32 76 40 C76 32 70 26 62 26 C70 26 76 20 76 12 Z"
        fill={`url(#costackAiCoreGrad-${gradientId})`}
      />
    </svg>
  );
}

/**
 * Apexa AI Avatar / Badge
 * Official App icon squircle badge with the Apexa symbol.
 */
export function ApexaAiAvatar({
  size = 'md',
  className = "",
  showGlow = true,
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showGlow?: boolean;
}) {
  const sizeMap = {
    xs: { container: 'w-5 h-5 rounded-[6px]', icon: 'w-3 h-3' },
    sm: { container: 'w-7 h-7 rounded-[8px]', icon: 'w-4 h-4' },
    md: { container: 'w-9 h-9 rounded-[11px]', icon: 'w-5 h-5' },
    lg: { container: 'w-12 h-12 rounded-[14px]', icon: 'w-7 h-7' },
    xl: { container: 'w-16 h-16 rounded-[18px]', icon: 'w-9 h-9' },
  };

  const current = sizeMap[size];

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {showGlow && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-400 to-indigo-600 blur-md opacity-40 -z-10" />
      )}
      <div
        className={`${current.container} bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 border border-white/20 flex items-center justify-center shadow-md relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
        <ApexaAiIcon className={current.icon} variant="white" />
      </div>
    </div>
  );
}

export const CostackAiIcon = ApexaAiIcon;
export const CostackAiAvatar = ApexaAiAvatar;

export default ApexaAiIcon;
