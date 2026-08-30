"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

// Register GSAP plugins safely on the client side only to avoid SSR mismatch
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
  
  // Set global GSAP defaults for consistent modern SaaS feel
  gsap.defaults({
    ease: "power3.out",
    duration: 0.6,
  });

  // Optimize ScrollTrigger refresh intervals
  ScrollTrigger.config({
    limitCallbacks: true,
    ignoreMobileResize: true,
  });
}

/**
 * Utility to check if user has requested reduced motion in their OS / browser settings
 */
export function isReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { gsap, ScrollTrigger, useGSAP };
export default gsap;
