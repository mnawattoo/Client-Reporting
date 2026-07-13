"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
export interface TrendSeries {
  key: string;
  label: string;
  color: string;
  data: { x: string; y: number }[];
}

interface TrendChartProps {
  series: TrendSeries[];
  valueFormatter?: (value: number) => string;
  height?: number;
  className?: string;
}

// Line/area trend per dataviz spec: 2px lines, recessive gridlines, single
// axis, a legend for >=2 series, and an always-available table view so no
// data point is color-only.
export function TrendChart({ series, valueFormatter = (v) => String(v), height = 240, className }: TrendChartProps) {
  const [showTable, setShowTable] = useState(false);
  const labels = series[0]?.data.map((d) => d.x) ?? [];
  const merged = labels.map((x, i) => {
    const row: Record<string, string | number> = { x };
    series.forEach((s) => {
      row[s.key] = s.data[i]?.y ?? 0;
    });
    return row;
  });

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        {series.length > 1 && (
          <div className="flex flex-wrap items-center gap-3">
            {series.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-ink-secondary">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="ml-auto text-xs font-medium text-ink-muted underline decoration-dotted hover:text-ink-primary"
        >
          {showTable ? "Show chart" : "View as table"}
        </button>
      </div>

      {showTable ? (
        <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-surface">
              <tr>
                <th className="px-3 py-2 font-medium text-ink-muted">Period</th>
                {series.map((s) => (
                  <th key={s.key} className="px-3 py-2 font-medium text-ink-muted">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {merged.map((row, i) => (
                <tr key={i} className="border-t border-gridline">
                  <td className="px-3 py-2 text-ink-secondary">{row.x}</td>
                  {series.map((s) => (
                    <td key={s.key} className="px-3 py-2 tabular-nums text-ink-primary">
                      {valueFormatter(Number(row[s.key]))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ width: "100%", height }} className="mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={merged} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--gridline)" strokeDasharray="0" />
              <XAxis
                dataKey="x"
                tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
                axisLine={{ stroke: "var(--baseline)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={44}
                tickFormatter={(v) => valueFormatter(Number(v))}
              />
              <Tooltip
                cursor={{ stroke: "var(--baseline)", strokeWidth: 1 }}
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value) => valueFormatter(Number(value))}
              />
              {series.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 0, fill: s.color }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
