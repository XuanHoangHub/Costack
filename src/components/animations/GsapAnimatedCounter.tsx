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
}

export function GsapAnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 2.0,
  className = "",
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

      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top 90%",
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
