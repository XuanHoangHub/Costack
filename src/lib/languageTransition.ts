"use client";

import React from 'react';

/**
 * Synthesizes a subtle, pleasant two-tone audio chime (C5 -> E5) using Web Audio API.
 * Completely self-contained, 0 external assets, zero latency.
 */
export function playLanguageChime() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.035, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // Tone 2: E5 (659.25 Hz) with gentle delay
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.045);
    gain2.gain.setValueAtTime(0.04, now + 0.045);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.045);
    osc2.stop(now + 0.19);
  } catch {
    // Ignore audio context errors
  }
}

/**
 * Triggers a silky smooth language transition across the UI.
 * Uses View Transitions API when available for seamless cross-fade of text,
 * triggers audio chime, and dispatches a dynamic HUD notification event.
 */
export function executeLanguageTransition(
  targetLocale: string,
  _clickEvent?: React.MouseEvent | MouseEvent,
  applyCallback?: () => void
) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    applyCallback?.();
    return;
  }

  // Play subtle feedback chime
  playLanguageChime();

  const isVi = targetLocale === 'vi';
  const label = targetLocale === 'system' 
    ? (isVi ? 'Theo hệ thống' : 'System Default')
    : isVi ? 'Tiếng Việt' : 'English (US)';

  // Notify HUD toast
  window.dispatchEvent(
    new CustomEvent('apexa-show-language-hud', {
      detail: {
        locale: targetLocale,
        label,
        code: isVi ? 'VI' : 'EN',
      },
    })
  );

  const doc = document as unknown as {
    startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished?: Promise<void> };
    documentElement: HTMLElement;
  };
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Use View Transitions API if supported and not reduced motion
  if (!prefersReducedMotion && typeof doc.startViewTransition === 'function') {
    try {
      const transition = doc.startViewTransition(() => {
        applyCallback?.();
      });

      if (transition && transition.ready) {
        transition.ready
          .then(() => {
            try {
              doc.documentElement.animate(
                { opacity: [1, 0] },
                { duration: 150, easing: 'cubic-bezier(0.4, 0, 1, 1)', pseudoElement: '::view-transition-old(root)' }
              );
              doc.documentElement.animate(
                { opacity: [0, 1] },
                { duration: 220, easing: 'cubic-bezier(0, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
              );
            } catch {
              // Ignore animation failure
            }
          })
          .catch(() => {});
      }
      return;
    } catch {
      // Fallback to direct call
    }
  }

  // Direct fallback
  applyCallback?.();
}
