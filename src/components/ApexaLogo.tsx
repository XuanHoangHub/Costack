"use client";

import React from 'react';

export interface ApexaLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  variant?: 'auto' | 'light' | 'dark' | 'white' | 'blue';
  animated?: boolean;
}

/**
 * Logo removed per project specification - returns null so no logo is displayed
 */
export function ApexaLogoIcon(_props: ApexaLogoProps) {
  return null;
}

export interface ApexaBrandProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  variant?: 'auto' | 'light' | 'dark' | 'white' | 'blue';
  onClick?: () => void;
}

/**
 * Costack Brand Component (Typography wordmark only, logo removed)
 */
export function ApexaBrand({
  className = "",
  textClassName = "text-lg font-black tracking-tight",
  variant = 'auto',
  onClick,
}: ApexaBrandProps) {
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
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

export const CostackBrand = ApexaBrand;
export const CostackLogoIcon = ApexaLogoIcon;

export default ApexaLogoIcon;
