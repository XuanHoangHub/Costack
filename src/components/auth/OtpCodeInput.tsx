"use client";

import React, { useRef, useEffect } from 'react';

interface OtpCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  hasError?: boolean;
  className?: string;
  id?: string;
}

export default function OtpCodeInput({
  value = '',
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  autoFocus = true,
  hasError = false,
  className = '',
  id = 'otp-input',
}: OtpCodeInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && !disabled && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const setDigitAt = (index: number, digit: string) => {
    const chars = value.split('');
    chars[index] = digit;
    const nextVal = chars.join('').slice(0, length);
    onChange(nextVal);
    if (nextVal.length === length && onComplete) {
      onComplete(nextVal);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        setDigitAt(index, '');
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
        setDigitAt(index - 1, '');
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (index < length - 1) {
        inputsRef.current[index + 1]?.focus();
      }
    } else if (e.key === 'Delete') {
      e.preventDefault();
      setDigitAt(index, '');
    }
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const rawVal = e.target.value.replace(/\D/g, '');
    if (!rawVal) {
      setDigitAt(index, '');
      return;
    }

    const char = rawVal[rawVal.length - 1];
    setDigitAt(index, char);

    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, length);
    if (!pastedData) return;

    onChange(pastedData);
    const focusIndex = Math.min(pastedData.length, length - 1);
    inputsRef.current[focusIndex]?.focus();

    if (pastedData.length === length && onComplete) {
      onComplete(pastedData);
    }
  };

  return (
    <div
      role="group"
      aria-label="Mã xác thực OTP"
      className={`flex items-center justify-center gap-2 sm:gap-2.5 ${className}`}
    >
      {Array.from({ length }, (_, index) => {
        const isCurrentActive = Boolean(digits[index]);
        return (
          <input
            key={index}
            id={`${id}-${index}`}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            value={digits[index]}
            disabled={disabled}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={`h-12 w-11 sm:h-14 sm:w-12 text-center text-xl sm:text-2xl font-black font-mono tabular-nums rounded-xl border transition-all duration-150 outline-none select-all ${
              hasError
                ? 'border-rose-500 bg-rose-50/50 dark:border-rose-500 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 focus:ring-2 focus:ring-rose-500/30'
                : isCurrentActive
                ? 'border-blue-600 dark:border-sky-400 bg-blue-50/30 dark:bg-sky-950/30 text-blue-700 dark:text-sky-300 ring-1 ring-blue-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-600 dark:focus:border-sky-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20'
            } disabled:cursor-not-allowed disabled:opacity-50`}
            aria-label={`Ký tự thứ ${index + 1}`}
          />
        );
      })}
    </div>
  );
}
