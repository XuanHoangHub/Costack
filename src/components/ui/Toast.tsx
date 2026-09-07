"use client";

import * as React from "react";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[var(--cu-surface)] group-[.toaster]:text-[var(--cu-text-primary)] group-[.toaster]:border-[var(--cu-border)] group-[.toaster]:shadow-[var(--cu-shadow-lg)]",
          description: "group-[.toast]:text-[var(--cu-text-muted)]",
          actionButton:
            "group-[.toast]:bg-[var(--cu-primary)] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-[var(--cu-surface-2)] group-[.toast]:text-[var(--cu-text-muted)]",
          error: "group-[.toaster]:border-[var(--cu-danger)] group-[.toaster]:text-[var(--cu-danger)]",
          success: "group-[.toaster]:border-[var(--cu-success)] group-[.toaster]:text-[var(--cu-success)]",
          warning: "group-[.toaster]:border-[var(--cu-warning)] group-[.toaster]:text-[var(--cu-warning)]",
          info: "group-[.toaster]:border-[var(--cu-primary)] group-[.toaster]:text-[var(--cu-primary)]",
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-[var(--cu-success)]" />,
        info: <Info className="h-5 w-5 text-[var(--cu-primary)]" />,
        warning: <AlertTriangle className="h-5 w-5 text-[var(--cu-warning)]" />,
        error: <XCircle className="h-5 w-5 text-[var(--cu-danger)]" />,
      }}
      {...props}
    />
  );
};

export { Toaster, sonnerToast as toast };
export default Toaster;
