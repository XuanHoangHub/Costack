"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  size?: "sm" | "md";
  color?: "primary" | "success";
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, size = "md", color = "primary", ...props }, ref) => {
  const sizeClasses = {
    sm: "h-4 w-7",
    md: "h-6 w-11",
  };
  
  const thumbSizeClasses = {
    sm: "h-3 w-3 data-[state=checked]:translate-x-3",
    md: "h-5 w-5 data-[state=checked]:translate-x-5",
  };

  const colorClasses = {
    primary: "data-[state=checked]:bg-[var(--cu-primary)]",
    success: "data-[state=checked]:bg-[var(--cu-success)]",
  };

  return (
    <SwitchPrimitives.Root
      className={`peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cu-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=unchecked]:bg-[var(--cu-surface-3)] ${sizeClasses[size]} ${colorClasses[color]} ${className || ""}`}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={`pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=unchecked]:translate-x-0 ${thumbSizeClasses[size]}`}
      />
    </SwitchPrimitives.Root>
  );
});
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
export default Switch;
