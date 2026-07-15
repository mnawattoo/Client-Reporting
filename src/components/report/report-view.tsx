import { format } from "date-fns";
import { PLATFORM_META } from "@/lib/platforms";
import { METRIC_DISPLAY, formatMetricValue } from "@/lib/metric-display";
import { Card, CardContent } from "@/components/ui/card";
import { StatTile } from "@/components/dashboard/stat-tile";
import { TrendChart } from "@/components/charts/trend-chart";
import type { Platform } from "@prisma/client";
import type { TopListRow } from "@/server/connectors/types";

export interface TopList {
  label: string;
  valueLabel: string;
  secondaryLabel?: string;
  rows: TopListRow[];
}

export interface ReportViewData {
  clientName: string;
  agencyName: string;
  agencyLogoUrl?: string | null;
  primaryColor: string;
  title: string;
  periodStart: Date;
  periodEnd: Date;
  summary: string | null;
  sections: {
    id: string;
    platform: Platform | null;
    title: string;
    insights: string | null;
    metrics: {
      current: Record<string, number>;
      deltas: Record<string, { mom: number | null; yoy: number | null }>;
    };
    chartData: { primaryMetricKey: string; series: { x: string; y: number }[]; topLists?: TopList[] } | null;
  }[];
}

export function TopListTable({ list }: { list: TopList }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-ink-secondary">{list.label}</p>
      <div className="overflow-hidden rounded-lg border border-gridline">
        <table className="w-full text-sm">
          <tbody>
            {list.rows.map((row, i) => (
              <tr key={i} className="border-b border-gridline last:border-0">
                <td className="truncate px-3 py-1.5 text-ink-secondary" title={row.label}>
                  {row.label}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right font-medium text-ink-primary">
                  {row.value.toLocaleString()} <span className="font-normal text-ink-muted">{list.valueLabel}</span>
                </td>
                {list.secondaryLabel && (
                  <td className="whitespace-nowrap px-3 py-1.5 text-right text-ink-muted">
                    {(row.secondary ?? 0).toLocaleString()} {list.secondaryLabel}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ReportView({ data }: { data: ReportViewData }) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 sm:p-10">
      <header className="flex items-center justify-between border-b border-gridline pb-6">
        <div className="flex items-center gap-3">
          {data.agencyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.agencyLogoUrl} alt={data.agencyName} className="h-9 w-auto" />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: data.primaryColor }}
            >
              {data.agencyName.slice(0, 1)}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-ink-primary">{data.agencyName}</p>
            <p className="text-xs text-ink-muted">Prepared for {data.clientName}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {format(data.periodStart, "MMM d")} – {format(data.periodEnd, "MMM d, yyyy")}
          </p>
        </div>
      </header>

      <div>
        <h1 className="text-2xl font-semibold text-ink-primary">{data.title}</h1>
        {data.summary && <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{data.summary}</p>}
      </div>

      {data.sections.length === 0 && (
        <Card className="p-8 text-center text-sm text-ink-muted">
          No channel data available for this period yet.
        </Card>
      )}

      {data.sections.map((section) => {
        const meta = section.platform ? PLATFORM_META[section.platform] : null;
        const display = section.platform ? METRIC_DISPLAY[section.platform] : [];
        const Icon = meta?.icon;

        return (
          <Card key={section.id} className="overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-gridline bg-ink-primary/[0.02] px-5 py-3.5">
              {Icon && meta && <Icon className="h-4 w-4" style={{ color: meta.color }} />}
              <h2 className="text-sm font-semibold text-ink-primary">{section.title}</h2>
            </div>
            <CardContent className="space-y-5 pt-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {display.map((m) => (
                  <StatTile
                    key={m.key}
                    label={m.label}
                    value={formatMetricValue(section.metrics.current[m.key] ?? 0, m.unit)}
                    deltaPercent={section.metrics.deltas[m.key]?.mom ?? null}
                    positiveIsGood={m.positiveIsGood}
                  />
                ))}
              </div>

              {section.chartData && section.chartData.series.length > 0 && meta && (
                <TrendChart
                  series={[
                    {
                      key: section.chartData.primaryMetricKey,
                      label: display.find((d) => d.key === section.chartData!.primaryMetricKey)?.label ?? "Trend",
                      color: meta.color,
                      data: section.chartData.series,
                    },
                  ]}
                  height={180}
                />
              )}

              {section.chartData?.topLists && section.chartData.topLists.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {section.chartData.topLists.map((list) => (
                    <TopListTable key={list.label} list={list} />
                  ))}
                </div>
              )}

              {section.insights && (
                <p className="rounded-lg bg-brand-primary/5 px-3 py-2.5 text-sm text-ink-secondary">
                  {section.insights}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}

      <footer className="border-t border-gridline pt-6 text-center text-xs text-ink-muted">
        Prepared by {data.agencyName}
      </footer>
    </div>
  );
}
