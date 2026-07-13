import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendBadgeProps {
  deltaPercent: number | null;
  /** Whether an increase in this metric is a good outcome (false for e.g. bounce rate, cost-per-click). */
  positiveIsGood?: boolean;
  className?: string;
}

export function TrendBadge({ deltaPercent, positiveIsGood = true, className }: TrendBadgeProps) {
  if (deltaPercent === null) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-ink-muted", className)}>
        <Minus className="h-3 w-3" /> No prior data
      </span>
    );
  }

  const isFlat = Math.abs(deltaPercent) < 0.05;
  const isUp = deltaPercent > 0;
  const isGood = isFlat ? null : (isUp && positiveIsGood) || (!isUp && !positiveIsGood);

  const colorClass = isFlat
    ? "text-ink-muted"
    : isGood
      ? "text-[var(--delta-good)]"
      : "text-critical";

  const Icon = isFlat ? Minus : isUp ? ArrowUp : ArrowDown;

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", colorClass, className)}>
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {Math.abs(deltaPercent).toFixed(1)}%
    </span>
  );
}
