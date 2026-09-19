"use client";

import React, { useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP, isReducedMotion } from "@/lib/gsap";

interface GsapAnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
  scroller?: string | HTMLElement;
}

export function GsapAnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 2.0,
  className = "",
  scroller,
}: GsapAnimatedCounterProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [displayValue, setDisplayValue] = useState<string>(
    decimals > 0 ? (0).toFixed(decimals) : "0"
  );

  useGSAP(
    () => {
      if (!containerRef.current) return;

      if (isReducedMotion()) {
        setDisplayValue(decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString());
        return;
      }

      const counterObj = { count: 0 };
      const scrollerEl = scroller || containerRef.current.closest(".apexa-auth-shell") || undefined;

      ScrollTrigger.create({
        trigger: containerRef.current,
        scroller: scrollerEl,
        start: "top 95%",
        once: true,
        onEnter: () => {
          gsap.to(counterObj, {
            count: value,
            duration: duration,
            ease: "power2.out",
            onUpdate: () => {
              if (decimals > 0) {
                setDisplayValue(counterObj.count.toFixed(decimals));
              } else {
                setDisplayValue(Math.round(counterObj.count).toString());
              }
            },
          });
        },
      });
    },
    { scope: containerRef }
  );

  return (
    <span ref={containerRef} className={`inline-block tabular-nums ${className}`}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}

export default GsapAnimatedCounter;
