"use client";

import { useEffect } from "react";

export default function SecurityGuard() {
  useEffect(() => {
    // Run only in production to allow local developer debugging
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    // 1. Disable Right Click (Context Menu)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextMenu);

    // 2. Disable DevTools Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 key
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        return false;
      }

      // Ctrl + Shift + I (Inspect)
      // Ctrl + Shift + J (Console)
      // Ctrl + Shift + C (Element Selector)
      // Ctrl + Shift + K (Firefox Console)
      if (
        e.ctrlKey &&
        e.shiftKey &&
        (e.key === "I" ||
          e.key === "J" ||
          e.key === "C" ||
          e.key === "K" ||
          e.keyCode === 73 ||
          e.keyCode === 74 ||
          e.keyCode === 67 ||
          e.keyCode === 75)
      ) {
        e.preventDefault();
        return false;
      }

      // Ctrl + U (View Source)
      if (e.ctrlKey && (e.key === "U" || e.key === "u" || e.keyCode === 85)) {
        e.preventDefault();
        return false;
      }

      // Ctrl + S (Save Page)
      if (e.ctrlKey && (e.key === "S" || e.key === "s" || e.keyCode === 83)) {
        e.preventDefault();
        return false;
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    // 3. Debugger Statement Loop
    const preventInspect = () => {
      try {
        (function() {
          const start = new Date().getTime();
          debugger;
          const end = new Date().getTime();
          // If execution paused on debugger, it means DevTools is open
          if (end - start > 100) {
            console.clear();
            console.log(
              "%cWARNING: Security protection active! Console inspection is disabled.",
              "color: red; font-size: 20px; font-weight: bold;"
            );
          }
        })();
      } catch (err) {}
    };

    const interval = setInterval(preventInspect, 500);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      clearInterval(interval);
    };
  }, []);

  return null;
}
