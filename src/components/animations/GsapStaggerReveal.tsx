"use client";

import React, { useRef } from "react";
import { gsap, useGSAP, isReducedMotion } from "@/lib/gsap";

interface GsapStaggerRevealProps {
  children: React.ReactNode;
  className?: string;
  itemSelector?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  yOffset?: number;
}

export function GsapStaggerReveal({
  children,
  className = "",
  itemSelector = ".gsap-reveal-item",
  delay = 0.05,
  stagger = 0.12,
  duration = 0.75,
  yOffset = 30,
}: GsapStaggerRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const items = containerRef.current.querySelectorAll(itemSelector);
      if (!items.length) return;

      if (isReducedMotion()) {
        gsap.set(items, { opacity: 1, y: 0 });
        return;
      }

      // Initial state
      gsap.set(items, {
        opacity: 0,
        y: yOffset,
        scale: 0.98,
      });

      // Smooth staggered entrance timeline
      gsap.to(items, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: duration,
        delay: delay,
        stagger: stagger,
        ease: "power3.out",
        force3D: true,
        clearProps: "scale", // clean up scale after anim so hover effects work cleanly
      });
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

export default GsapStaggerReveal;
