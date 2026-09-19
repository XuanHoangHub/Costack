"use client";

import React, { useRef } from "react";
import { gsap, useGSAP, isReducedMotion } from "@/lib/gsap";

interface GsapCard3DTiltProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  style?: React.CSSProperties;
  maxTilt?: number; // max tilt in degrees
  scale?: number; // scale on hover
  glare?: boolean; // dynamic light reflection spotlight
}

export function GsapCard3DTilt({
  children,
  className = "",
  innerClassName = "",
  style,
  maxTilt = 7,
  scale = 1.02,
  glare = true,
}: GsapCard3DTiltProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const card = cardRef.current;
      const glareEl = glareRef.current;
      if (!card || isReducedMotion()) return;

      const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
      if (!hasFinePointer) return;

      gsap.set(card, {
        transformPerspective: 1200,
        transformStyle: "preserve-3d",
        willChange: "transform",
      });

      const handleMouseMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -maxTilt;
        const rotateY = ((x - centerX) / centerX) * maxTilt;

        gsap.to(card, {
          rotateX,
          rotateY,
          scale,
          duration: 0.35,
          ease: "power2.out",
          force3D: true,
        });

        if (glareEl) {
          const glareX = (x / rect.width) * 100;
          const glareY = (y / rect.height) * 100;

          gsap.to(glareEl, {
            opacity: 0.15,
            background: `radial-gradient(circle 280px at ${glareX}% ${glareY}%, rgba(255,255,255,0.75), transparent 70%)`,
            duration: 0.25,
          });
        }
      };

      const handleMouseLeave = () => {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          scale: 1,
          duration: 0.65,
          ease: "power3.out",
          force3D: true,
        });

        if (glareEl) {
          gsap.to(glareEl, {
            opacity: 0,
            duration: 0.4,
            ease: "power2.out",
          });
        }
      };

      card.addEventListener("mousemove", handleMouseMove);
      card.addEventListener("mouseleave", handleMouseLeave);

      return () => {
        card.removeEventListener("mousemove", handleMouseMove);
        card.removeEventListener("mouseleave", handleMouseLeave);
      };
    },
    { scope: cardRef }
  );

  return (
    <div
      ref={cardRef}
      style={style}
      className={`relative ${className}`}
    >
      {glare && (
        <div
          ref={glareRef}
          className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] opacity-0 transition-opacity"
          aria-hidden="true"
        />
      )}
      <div className={`relative z-10 h-full w-full ${innerClassName}`}>{children}</div>
    </div>
  );
}

export default GsapCard3DTilt;
