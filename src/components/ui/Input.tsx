"use client";

import * as React from "react";
import { motion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type InputSize = "sm" | "md" | "lg";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: InputSize;
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  variant?: "default" | "search";
}

const sizeClasses = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-4 text-base",
};

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size = "md", label, helperText, error, leftIcon, rightIcon, clearable, onClear, variant = "default", disabled, ...props }, ref) => {
    
    const isSearch = variant === "search";
    const actualLeftIcon = isSearch ? <SearchIcon /> : leftIcon;
    
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <div className={cn("flex flex-col gap-1.5 w-full", className)}>
        {label && (
          <label className="text-sm font-medium text-[var(--cu-text-primary)]">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {actualLeftIcon && (
            <div className="absolute left-3 flex items-center justify-center text-[var(--cu-text-muted)] pointer-events-none">
              {actualLeftIcon}
            </div>
          )}
          <input
            ref={ref}
            disabled={disabled}
            onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
            onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
            className={cn(
              "flex w-full rounded-md border bg-[var(--cu-bg)] transition-colors",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-[var(--cu-text-muted)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cu-primary)] focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error ? "border-[var(--cu-danger)] focus-visible:ring-[var(--cu-danger)]" : "border-[var(--cu-border)] hover:border-[var(--cu-border-strong)]",
              sizeClasses[size],
              actualLeftIcon && "pl-10",
              (rightIcon || clearable) && "pr-10"
            )}
            {...props}
          />
          {clearable && props.value && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 flex items-center justify-center text-[var(--cu-text-muted)] hover:text-[var(--cu-text-primary)] transition-colors rounded-full p-1 hover:bg-[var(--cu-surface-2)]"
            >
              <XIcon />
            </button>
          )}
          {!clearable && rightIcon && (
            <div className="absolute right-3 flex items-center justify-center text-[var(--cu-text-muted)]">
              {rightIcon}
            </div>
          )}
        </div>
        {(helperText || error) && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "text-xs",
              error ? "text-[var(--cu-danger)]" : "text-[var(--cu-text-secondary)]"
            )}
          >
            {error || helperText}
          </motion.p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export default Input;
