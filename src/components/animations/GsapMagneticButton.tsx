"use client";

import React, { useRef } from "react";
import { gsap, useGSAP, isReducedMotion } from "@/lib/gsap";

interface GsapMagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  strength?: number;
  glowSweep?: boolean;
  className?: string;
}

export function GsapMagneticButton({
  children,
  strength = 0.28,
  glowSweep = true,
  className = "",
  onClick,
  ...props
}: GsapMagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const button = buttonRef.current;
      const content = contentRef.current;
      if (!button || isReducedMotion()) return;

      // Check if device supports fine hover (desktop mouse)
      const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
      if (!hasFinePointer) return;

      const handleMouseMove = (e: MouseEvent) => {
        const rect = button.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const distanceX = e.clientX - centerX;
        const distanceY = e.clientY - centerY;

        gsap.to(button, {
          x: distanceX * strength,
          y: distanceY * strength,
          duration: 0.35,
          ease: "power2.out",
          force3D: true,
        });

        if (content) {
          gsap.to(content, {
            x: distanceX * (strength * 0.4),
            y: distanceY * (strength * 0.4),
            duration: 0.35,
            ease: "power2.out",
            force3D: true,
          });
        }
      };

      const handleMouseLeave = () => {
        gsap.to(button, {
          x: 0,
          y: 0,
          duration: 0.65,
          ease: "elastic.out(1, 0.4)",
          force3D: true,
        });

        if (content) {
          gsap.to(content, {
            x: 0,
            y: 0,
            duration: 0.65,
            ease: "elastic.out(1, 0.4)",
            force3D: true,
          });
        }
      };

      button.addEventListener("mousemove", handleMouseMove);
      button.addEventListener("mouseleave", handleMouseLeave);

      return () => {
        button.removeEventListener("mousemove", handleMouseMove);
        button.removeEventListener("mouseleave", handleMouseLeave);
      };
    },
    { scope: buttonRef }
  );

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center overflow-hidden cursor-pointer will-change-transform ${className}`}
      {...props}
    >
      {glowSweep && (
        <span
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
          aria-hidden="true"
        />
      )}
      <span ref={contentRef} className="inline-flex items-center gap-2 relative z-10 will-change-transform">
        {children}
      </span>
    </button>
  );
}

export default GsapMagneticButton;
