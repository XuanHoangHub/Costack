"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Pencil, Trash2, HelpCircle, PlusCircle, FileText, FolderPlus } from 'lucide-react';

export interface CustomDialogConfig {
  title: string;
  description?: string;
  type: 'prompt' | 'confirm' | 'alert';
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: (val: string) => void;
}

interface CustomDialogModalProps {
  config: CustomDialogConfig | null;
  onClose: () => void;
}

export default function CustomDialogModal({ config, onClose }: CustomDialogModalProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (config) {
      setInputValue(config.defaultValue || '');
      // Focus input after animation completes
      setTimeout(() => {
        inputRef.current?.focus();
        if (config.defaultValue) {
          inputRef.current?.setSelectionRange(0, config.defaultValue.length);
        }
      }, 100);
    } else {
      setInputValue('');
    }
  }, [config]);

  if (!config) return null;

  const handleConfirm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (config.type === 'prompt' && !inputValue.trim()) {
      return; // Prevent empty submission for prompts
    }
    config.onConfirm(inputValue);
    onClose();
  };

  // Determine Icon based on title/type
  const getIcon = () => {
    const titleLower = config.title.toLowerCase();
    if (config.isDestructive || titleLower.includes('delete') || titleLower.includes('remove') || titleLower.includes('suspend')) {
      return <Trash2 className="w-6 h-6 text-rose-500" />;
    }
    if (titleLower.includes('rename') || titleLower.includes('edit')) {
      return <Pencil className="w-6 h-6 text-violet-500" />;
    }
    if (titleLower.includes('list')) {
      return <PlusCircle className="w-6 h-6 text-emerald-500" />;
    }
    if (titleLower.includes('folder')) {
      return <FolderPlus className="w-6 h-6 text-indigo-500" />;
    }
    if (titleLower.includes('doc')) {
      return <FileText className="w-6 h-6 text-blue-500" />;
    }
    return <HelpCircle className="w-6 h-6 text-amber-500" />;
  };

  const isDestructive = config.isDestructive || config.title.toLowerCase().includes('delete');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
        />

        {/* Modal Panel */}
        <motion.div
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          className="relative w-full max-w-[420px] bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border border-slate-100 dark:border-slate-800 p-6 z-10 font-sans"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            type="button"
            className="absolute top-5 right-5 w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-350 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header & Icon */}
          <div className="flex gap-4 items-start text-left mb-4">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 shrink-0">
              {getIcon()}
            </div>
            <div className="space-y-1 mt-1 pr-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-tight">
                {config.title}
              </h3>
              {config.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {config.description}
                </p>
              )}
            </div>
          </div>

          {/* Content (Prompt Input or Description) */}
          <form onSubmit={handleConfirm} className="space-y-5">
            {config.type === 'prompt' ? (
              <div className="text-left space-y-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={config.placeholder || 'Type here...'}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 focus:bg-white dark:focus:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 outline-none transition-all"
                  required
                />
              </div>
            ) : config.type === 'confirm' && config.description ? (
              null
            ) : config.type === 'confirm' ? (
              <p className="text-left text-sm font-medium text-slate-600 dark:text-slate-350">
                Are you sure you want to proceed?
              </p>
            ) : null}

            {/* Actions */}
            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-black text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
              >
                {config.cancelText || 'Cancel'}
              </button>
              <button
                type="submit"
                className={`px-4.5 py-2.5 rounded-xl text-xs font-black text-white shadow-sm transition-all cursor-pointer ${
                  isDestructive
                    ? 'bg-rose-500 hover:bg-rose-600 hover:shadow-rose-100 dark:hover:shadow-none'
                    : 'bg-violet-650 hover:bg-violet-700 hover:shadow-violet-100 dark:hover:shadow-none'
                }`}
              >
                {config.confirmText || (isDestructive ? 'Delete' : 'Save')}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
