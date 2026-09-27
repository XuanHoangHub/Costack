"use client";

import React, { memo } from 'react';
import ToastNotification from './ToastNotification';
import { useNotificationStore } from '@/store/notificationStore';

/**
 * Isolated GlobalToaster component.
 * Subscribes to notification toasts independently, preventing the root App
 * from re-rendering every time a toast is added, animated, or dismissed.
 */
export const GlobalToaster = memo(function GlobalToaster() {
  const toasts = useNotificationStore((s) => s.toasts);
  const removeToast = useNotificationStore((s) => s.removeToast);

  if (!toasts || toasts.length === 0) return null;

  return <ToastNotification toasts={toasts} onClose={removeToast} />;
});

export default GlobalToaster;
