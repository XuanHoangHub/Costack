"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, ArrowUp, X } from 'lucide-react';

export interface ModernAuthInputProps {
  id: string;
  icon: React.ElementType;
  type: string;
  label?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  minLength?: number;
  rightElement?: React.ReactNode;
  isValid?: boolean;
  showClearButton?: boolean;
  isVietnamese?: boolean;
}

export default function ModernAuthInput({
  id,
  icon: Icon,
  type,
  label,
  placeholder,
  value,
  onChange,
  required,
  autoFocus,
  autoComplete,
  error,
  helperText,
  disabled,
  minLength,
  rightElement,
  isValid,
  showClearButton = false,
  isVietnamese = true,
}: ModernAuthInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const descriptionId = error || helperText ? `${id}_description` : undefined;

  const hasContent = value.length > 0;
  const isPasswordField = type === 'password';

  const handleKeyCheck = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setIsCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleClear = () => {
    onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className="space-y-1.5 text-left w-full">
      {label && (
        <div className="flex items-center justify-between px-0.5">
          <label
            htmlFor={id}
            className="block text-[13px] font-bold text-slate-800 dark:text-slate-200 select-none tracking-tight font-sans"
          >
            {label}
            {required && <span className="text-rose-500 ml-1 font-mono">*</span>}
          </label>

          {/* Caps Lock Warning Pill */}
          {isPasswordField && isCapsLockOn && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full"
            >
              <ArrowUp className="w-3 h-3 stroke-[3]" />
              <span>{isVietnamese ? 'Caps Lock đang bật' : 'Caps Lock is ON'}</span>
            </motion.span>
          )}
        </div>
      )}

      <div className="relative group/input w-full">
        <div className="relative flex items-center">
          {/* Leading Icon with Dynamic Glow & Tint */}
          <div
            className={`pointer-events-none absolute left-3.5 z-10 transition-colors duration-200 flex items-center justify-center ${
              error
                ? 'text-rose-500 dark:text-rose-400'
                : isFocused
                ? 'text-blue-600 dark:text-cyan-400'
                : hasContent
                ? 'text-slate-700 dark:text-slate-300'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <Icon className="w-4.5 h-4.5" />
          </div>

          <input
            id={id}
            name={id}
            type={type}
            placeholder={placeholder}
            required={required}
            value={value}
            autoFocus={autoFocus}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              setIsCapsLockOn(false);
            }}
            onKeyDown={handleKeyCheck}
            onKeyUp={handleKeyCheck}
            autoComplete={autoComplete || (type === 'email' ? 'email' : type === 'password' ? 'current-password' : 'name')}
            aria-invalid={Boolean(error)}
            aria-describedby={descriptionId}
            minLength={minLength}
            disabled={disabled}
            spellCheck={type === 'email' ? false : undefined}
            className={`relative h-[50px] w-full pl-11 ${
              rightElement ? 'pr-12' : showClearButton && hasContent ? 'pr-10' : isValid ? 'pr-10' : 'pr-4'
            } text-sm rounded-xl font-medium transition-all duration-200 outline-none focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
              error
                ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-400 dark:border-rose-500/80 text-rose-950 dark:text-rose-100 ring-4 ring-rose-500/10'
                : isFocused
                ? 'bg-white dark:bg-white/[0.07] border-blue-600 dark:border-cyan-400/80 text-slate-900 dark:text-white shadow-sm ring-4 ring-blue-500/15 dark:ring-cyan-400/20'
                : 'bg-slate-50/90 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-white/20'
            } border disabled:cursor-not-allowed disabled:opacity-60`}
          />

          {/* Right Accessories (Toggle Show Password, Clear Button, or Checkmark) */}
          <div className="absolute right-3 z-10 flex items-center gap-1.5">
            {showClearButton && hasContent && !disabled && !rightElement && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-white/20 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                aria-label={isVietnamese ? 'Xóa nội dung' : 'Clear input'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {rightElement}

            {!rightElement && !showClearButton && isValid && !error && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-in fade-in zoom-in-75 duration-200" />
            )}
          </div>
        </div>
      </div>

      {/* Animated Validation or Helper Text */}
      <AnimatePresence>
        {(error || helperText) && (
          <motion.div
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <p
              id={descriptionId}
              className={`flex items-center gap-1.5 px-1 pt-0.5 text-xs font-semibold leading-tight ${
                error ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {error && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
              <span>{error || helperText}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
