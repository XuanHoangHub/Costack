"use client";

import React, { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, isReducedMotion } from "@/lib/gsap";

interface GsapScrollCascadeProps {
  children: React.ReactNode;
  className?: string;
  itemSelector?: string;
  stagger?: number;
  yOffset?: number;
  duration?: number;
  startTrigger?: string;
  once?: boolean;
}

export function GsapScrollCascade({
  children,
  className = "",
  itemSelector = ".gsap-cascade-item",
  stagger = 0.1,
  yOffset = 36,
  duration = 0.7,
  startTrigger = "top 88%",
  once = true,
}: GsapScrollCascadeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const items = containerRef.current.querySelectorAll(itemSelector);
      if (!items.length) return;

      if (isReducedMotion()) {
        gsap.set(items, { opacity: 1, y: 0, scale: 1 });
        return;
      }

      gsap.set(items, {
        opacity: 0,
        y: yOffset,
        scale: 0.96,
      });

      ScrollTrigger.create({
        trigger: containerRef.current,
        start: startTrigger,
        once: once,
        onEnter: () => {
          gsap.to(items, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: duration,
            stagger: {
              each: stagger,
              from: "start",
            },
            ease: "power3.out",
            force3D: true,
            clearProps: "scale",
          });
        },
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

export default GsapScrollCascade;
