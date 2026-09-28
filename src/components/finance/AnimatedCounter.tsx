"use client";

import React, { useEffect, useState } from "react";
import { motion, useSpring } from "motion/react";

interface AnimatedCounterProps {
  value: number;
  formatter?: (val: number) => string;
  className?: string;
  duration?: number;
}

export function AnimatedCounter({
  value,
  formatter,
  className = "",
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  // Motion spring for smooth physics-based counting
  const spring = useSpring(value, {
    mass: 0.8,
    stiffness: 90,
    damping: 18,
  });

  useEffect(() => {
    spring.set(value);
    const unsubscribe = spring.on("change", (latest) => {
      setDisplayValue(latest);
    });
    return () => unsubscribe();
  }, [value, spring]);

  const formatted = formatter
    ? formatter(Math.round(displayValue))
    : Math.round(displayValue).toLocaleString("vi-VN");

  return (
    <motion.span
      className={`inline-block tabular-nums font-black transition-colors ${className}`}
      key={formatted}
      initial={{ opacity: 0.85, y: -1 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {formatted}
    </motion.span>
  );
}
