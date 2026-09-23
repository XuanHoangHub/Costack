"use client";

import React from 'react';

export interface ApexaLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
  size?: number | string;
  variant?: 'auto' | 'light' | 'dark' | 'white' | 'blue';
  animated?: boolean;
}

/**
 * Costack Official 3D Isometric Logo Icon
 */
export function CostackLogoIcon({
  className = "w-7 h-7",
  size,
  animated = false,
  alt = "Costack Logo",
  ...props
}: ApexaLogoProps) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      width={typeof size === 'number' ? size : undefined}
      height={typeof size === 'number' ? size : undefined}
      className={`object-contain select-none shrink-0 ${animated ? 'transition-transform duration-300 hover:scale-105 active:scale-95' : ''} ${className}`}
      {...props}
    />
  );
}

export const ApexaLogoIcon = CostackLogoIcon;

export interface CostackBrandProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showIcon?: boolean;
  variant?: 'auto' | 'light' | 'dark' | 'white' | 'blue';
  onClick?: () => void;
}

export type ApexaBrandProps = CostackBrandProps;

/**
 * Costack Brand Component (Official Logo + Typography Wordmark)
 */
export function CostackBrand({
  className = "",
  iconClassName = "w-7 h-7",
  textClassName = "text-lg font-black tracking-tight",
  showIcon = true,
  variant = 'auto',
  onClick,
}: CostackBrandProps) {
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      {showIcon && (
        <CostackLogoIcon
          className={`${iconClassName} transition-transform duration-200 group-hover:scale-105`}
        />
      )}
      <span
        className={`font-display ${textClassName} ${
          variant === 'dark' || variant === 'white'
            ? 'text-white'
            : variant === 'light'
            ? 'text-slate-900'
            : 'text-slate-900 dark:text-white'
        }`}
      >
        Costack
      </span>
    </div>
  );
}

export const ApexaBrand = CostackBrand;

export default CostackLogoIcon;
