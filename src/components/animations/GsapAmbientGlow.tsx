"use client";

import React, { useRef } from "react";
import { gsap, useGSAP, isReducedMotion } from "@/lib/gsap";

interface GsapAmbientGlowProps {
  className?: string;
  glowCount?: number;
}

export function GsapAmbientGlow({ className = "", glowCount = 3 }: GsapAmbientGlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (isReducedMotion() || !containerRef.current) return;

      const orbs = containerRef.current.querySelectorAll<HTMLDivElement>(".gsap-ambient-orb");
      if (!orbs.length) return;

      orbs.forEach((orb, i) => {
        const randomX = (i % 2 === 0 ? 1 : -1) * (40 + i * 25);
        const randomY = (i % 2 === 0 ? -1 : 1) * (30 + i * 20);
        const duration = 12 + i * 4;

        gsap.to(orb, {
          x: randomX,
          y: randomY,
          scale: 1.15 + (i * 0.05),
          rotation: (i % 2 === 0 ? 30 : -30),
          duration: duration,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          force3D: true,
          delay: i * 0.8,
        });
      });
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none will-change-transform ${className}`}
      aria-hidden="true"
    >
      {/* Orb 1: Electric Blue / Indigo primary glow */}
      <div className="gsap-ambient-orb absolute left-1/2 top-[-160px] h-[540px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-blue-600/25 via-sky-500/20 to-indigo-600/20 blur-[130px] opacity-75 dark:opacity-60 transform-gpu" />

      {/* Orb 2: Vibrant Cyan / Sky accent glow */}
      {glowCount >= 2 && (
        <div className="gsap-ambient-orb absolute -left-20 top-1/4 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-sky-400/20 to-blue-600/15 blur-[120px] opacity-60 dark:opacity-45 transform-gpu" />
      )}

      {/* Orb 3: Purple / Sapphire deep ambient glow */}
      {glowCount >= 3 && (
        <div className="gsap-ambient-orb absolute -right-20 top-1/3 h-[480px] w-[480px] rounded-full bg-gradient-to-bl from-indigo-500/20 to-fuchsia-500/10 blur-[140px] opacity-50 dark:opacity-40 transform-gpu" />
      )}
    </div>
  );
}

export default GsapAmbientGlow;
