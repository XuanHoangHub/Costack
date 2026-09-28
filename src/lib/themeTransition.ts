"use client";

import { ThemePreference, resolveTheme } from './theme';

interface TransitionCoordinates {
  x: number;
  y: number;
}

/**
 * Executes a modern circular ripple view transition when toggling between themes.
 * If the browser does not support View Transitions API or if reduced motion is requested,
 * it safely executes the applyCallback immediately without breaking.
 */
export function executeThemeTransition(
  targetPreference: ThemePreference,
  clickEvent?: React.MouseEvent | MouseEvent | TouchEvent | TransitionCoordinates,
  applyCallback?: () => void
) {
  // If SSR, reduced motion, or callback missing
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    applyCallback?.();
    return;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const doc = document as any;

  if (prefersReducedMotion || typeof doc.startViewTransition !== 'function') {
    applyCallback?.();
    return;
  }

  // Determine click origin coordinates
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;

  if (clickEvent) {
    if ('x' in clickEvent && typeof clickEvent.x === 'number') {
      x = clickEvent.x;
      y = clickEvent.y;
    } else if ('clientX' in clickEvent && typeof clickEvent.clientX === 'number') {
      x = clickEvent.clientX;
      y = clickEvent.clientY;
    } else if ('touches' in clickEvent && clickEvent.touches.length > 0) {
      x = clickEvent.touches[0].clientX;
      y = clickEvent.touches[0].clientY;
    }
  }

  // Calculate maximum distance to the furthest screen corner
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  try {
    const transition = doc.startViewTransition(() => {
      applyCallback?.();
    });

    transition.ready.then(() => {
      const isTargetDark = resolveTheme(targetPreference);
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];

      doc.documentElement.animate(
        {
          clipPath: clipPath,
        },
        {
          duration: 480,
          easing: 'cubic-bezier(0.2, 0, 0, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    }).catch(() => {
      // Fallback
    });
  } catch {
    applyCallback?.();
  }
}
