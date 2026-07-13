import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "good" | "warning" | "serious" | "critical" | "muted";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-brand-primary/10 text-brand-primary",
  good: "bg-good/10 text-[var(--delta-good)]",
  warning: "bg-warning/15 text-[#8a5a00]",
  serious: "bg-serious/15 text-[#8a3d1f]",
  critical: "bg-critical/10 text-critical",
  muted: "bg-ink-muted/10 text-ink-secondary",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
