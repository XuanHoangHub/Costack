import confetti from 'canvas-confetti';

/**
 * Checks if user prefers reduced motion.
 */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Fires a lightweight, delightful confetti burst from the given origin coordinate.
 * Ideal for task completion checkboxes.
 *
 * @param origin - Optional normalized { x, y } coordinates (0 to 1). Defaults to bottom-right or center.
 */
export function fireTaskCompleteConfetti(origin?: { x: number; y: number }) {
  if (prefersReducedMotion() || typeof window === 'undefined') return;

  const defaultOrigin = origin || { x: 0.85, y: 0.7 };

  // Quick colorful burst with pastel & vibrant SaaS tones
  confetti({
    particleCount: 45,
    spread: 60,
    startVelocity: 28,
    origin: defaultOrigin,
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'],
    ticks: 150,
    gravity: 1.1,
    scalar: 0.8,
    disableForReducedMotion: true,
  });
}

/**
 * Fires double celebratory cannons from the bottom corners for major milestones.
 */
export function fireMilestoneConfetti() {
  if (prefersReducedMotion() || typeof window === 'undefined') return;

  const end = Date.now() + 1000;
  const colors = ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.8 },
      colors,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.8 },
      colors,
      disableForReducedMotion: true,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}

/**
 * Fires a celebratory star burst for level-ups, upgrades, or streak milestones.
 */
export function fireLevelUpConfetti() {
  if (prefersReducedMotion() || typeof window === 'undefined') return;

  confetti({
    particleCount: 70,
    spread: 100,
    origin: { x: 0.5, y: 0.5 },
    colors: ['#fbbf24', '#f59e0b', '#f43f5e', '#a855f7', '#38bdf8'],
    startVelocity: 35,
    ticks: 200,
    shapes: ['star', 'circle'],
    scalar: 1,
    disableForReducedMotion: true,
  });
}
