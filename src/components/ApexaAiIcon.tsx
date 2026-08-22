"use client";

import React from 'react';

interface ApexaAiIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  variant?: 'gradient' | 'monochrome' | 'glow' | 'solid' | 'white';
  animated?: boolean;
}

/**
 * Apexa AI Signature Icon
 * Blends the iconic Apexa 'A' apex geometry with a 4-point quantum neural sparkle,
 * multi-modal prism facets, and continuous intelligence energy rings.
 */
export function ApexaAiIcon({
  className = "w-5 h-5",
  variant = 'gradient',
  animated = false,
  ...props
}: ApexaAiIconProps) {
  const gradientId = React.useId();

  if (variant === 'monochrome') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        {...props}
      >
        {/* Outer Apex Diamond Shield */}
        <path
          d="M12 2L19.5 8.5V15.5L12 22L4.5 15.5V8.5L12 2Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.35"
        />
        {/* Core 4-Point Radiant AI Sparkle */}
        <path
          d="M12 5.5C12 8.5 9.5 11 6.5 11C9.5 11 12 13.5 12 16.5C12 13.5 14.5 11 17.5 11C14.5 11 12 8.5 12 5.5Z"
          fill="currentColor"
        />
        {/* Secondary Quantum Sparkles */}
        <circle cx="18.5" cy="5.5" r="1.5" fill="currentColor" />
        <circle cx="5.5" cy="18.5" r="1.2" fill="currentColor" opacity="0.6" />
      </svg>
    );
  }

  if (variant === 'white') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        {...props}
      >
        <path
          d="M12 2L19.5 8.5V15.5L12 22L4.5 15.5V8.5L12 2Z"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.4"
        />
        <path
          d="M12 5.5C12 8.5 9.5 11 6.5 11C9.5 11 12 13.5 12 16.5C12 13.5 14.5 11 17.5 11C14.5 11 12 8.5 12 5.5Z"
          fill="#FFFFFF"
        />
        <circle cx="18.5" cy="5.5" r="1.5" fill="#38BDF8" />
        <circle cx="5.5" cy="18.5" r="1.2" fill="#FFFFFF" fillOpacity="0.75" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animated ? 'animate-pulse' : ''}`}
      {...props}
    >
      <defs>
        {/* Dynamic Electric Gradient */}
        <linearGradient id={`apexaAiGrad-${gradientId}`} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="45%" stopColor="#3B82F6" />
          <stop offset="80%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>

        {/* Glow Core Gradient */}
        <linearGradient id={`apexaAiCore-${gradientId}`} x1="6" y1="6" x2="18" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#E0F2FE" />
          <stop offset="70%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>

        {/* Glow Filter */}
        <filter id={`apexaAiGlow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer Apex Prism Shield / Neural Nexus */}
      <path
        d="M12 2.2L19.2 8.2C19.7 8.6 20 9.2 20 9.8V14.2C20 14.8 19.7 15.4 19.2 15.8L12 21.8L4.8 15.8C4.3 15.4 4 14.8 4 14.2V9.8C4 9.2 4.3 8.6 4.8 8.2L12 2.2Z"
        stroke={`url(#apexaAiGrad-${gradientId})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.65"
      />

      {/* Apex Inner Energy Struts */}
      <path
        d="M12 2.5V7M12 17V21.5M4.5 9.5L8.5 11M15.5 13L19.5 14.5"
        stroke={`url(#apexaAiGrad-${gradientId})`}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />

      {/* Center 4-Point Radiant Neural Sparkle Core */}
      <path
        d="M12 5.5C12 8.8 9.2 11.5 5.8 11.5C9.2 11.5 12 14.2 12 17.5C12 14.2 14.8 11.5 18.2 11.5C14.8 11.5 12 8.8 12 5.5Z"
        fill={`url(#apexaAiCore-${gradientId})`}
        filter={variant === 'glow' ? `url(#apexaAiGlow-${gradientId})` : undefined}
      />

      {/* Top-Right Intelligence Accent Star */}
      <circle cx="18.5" cy="5.5" r="1.5" fill="#38BDF8" />
      <path
        d="M18.5 3.5V7.5M16.5 5.5H20.5"
        stroke="#38BDF8"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Bottom-Left Micro Resonance Dot */}
      <circle cx="5.5" cy="18.5" r="1.2" fill="#8B5CF6" opacity="0.85" />
    </svg>
  );
}

/**
 * Apexa AI Avatar / Badge
 * Stylish, glowing brand pill/avatar container with the Apexa AI emblem.
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
    xs: { container: 'w-5 h-5 rounded-md', icon: 'w-3.5 h-3.5' },
    sm: { container: 'w-7 h-7 rounded-lg', icon: 'w-4 h-4' },
    md: { container: 'w-9 h-9 rounded-xl', icon: 'w-5 h-5' },
    lg: { container: 'w-12 h-12 rounded-2xl', icon: 'w-7 h-7' },
    xl: { container: 'w-16 h-16 rounded-3xl', icon: 'w-9 h-9' },
  };

  const current = sizeMap[size];

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {showGlow && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-400 to-indigo-600 blur-md opacity-40 -z-10" />
      )}
      <div
        className={`${current.container} bg-gradient-to-tr from-[#0f172a] via-[#1e293b] to-[#0f172a] border border-sky-400/30 flex items-center justify-center shadow-lg relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
        <ApexaAiIcon className={current.icon} variant="gradient" />
      </div>
    </div>
  );
}

export default ApexaAiIcon;
