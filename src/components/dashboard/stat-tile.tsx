import { cn } from "@/lib/utils";
import { TrendBadge } from "./trend-badge";

interface StatTileProps {
  label: string;
  value: string;
  deltaPercent: number | null;
  positiveIsGood?: boolean;
  compareLabel?: string;
  className?: string;
}

export function StatTile({
  label,
  value,
  deltaPercent,
  positiveIsGood = true,
  compareLabel = "vs. previous period",
  className,
}: StatTileProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface p-4", className)}>
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-ink-primary">{value}</p>
      <div className="mt-1.5 flex items-center gap-1.5">
        <TrendBadge deltaPercent={deltaPercent} positiveIsGood={positiveIsGood} />
        <span className="text-xs text-ink-muted">{compareLabel}</span>
      </div>
    </div>
  );
}
