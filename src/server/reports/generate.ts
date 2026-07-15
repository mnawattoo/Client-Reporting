import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { formatDeltaPercent } from "@/lib/utils";
import { METRIC_DISPLAY } from "@/lib/metric-display";
import { PLATFORM_META, PLATFORM_ORDER } from "@/lib/platforms";
import type { Platform } from "@prisma/client";
import type { TopListRow } from "@/server/connectors/types";

// Which "top 10" breakdown tables (if present in a snapshot's raw payload)
// to surface for each platform, and how to label them.
const TOP_LIST_CONFIG: Partial<
  Record<Platform, { rawKey: string; label: string; valueLabel: string; secondaryLabel?: string }[]>
> = {
  GA4: [
    { rawKey: "topPages", label: "Top Pages", valueLabel: "Views" },
    { rawKey: "topLocations", label: "Top Locations", valueLabel: "Sessions" },
  ],
  GSC: [
    { rawKey: "topQueries", label: "Top Keywords", valueLabel: "Clicks", secondaryLabel: "Impressions" },
    { rawKey: "topPages", label: "Top Pages", valueLabel: "Clicks", secondaryLabel: "Impressions" },
  ],
};

interface GenerateReportInput {
  clientId: string;
  periodStart: Date;
  periodEnd: Date;
  createdById?: string;
}

function shiftPeriod(start: Date, end: Date, months: number) {
  return { start: startOfMonth(subMonths(start, months)), end: endOfMonth(subMonths(end, months)) };
}

export async function generateReport({ clientId, periodStart, periodEnd, createdById }: GenerateReportInput) {
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    select: { id: true, agencyId: true, name: true },
  });

  const previous = shiftPeriod(periodStart, periodEnd, 1);
  const yoy = shiftPeriod(periodStart, periodEnd, 12);
  const trailingMonths = Array.from({ length: 6 }, (_, i) => shiftPeriod(periodStart, periodEnd, 5 - i));

  const integrations = await prisma.integration.findMany({
    where: { clientId, status: "CONNECTED", externalAccountId: { not: null } },
  });

  const sections: {
    platform: Platform;
    title: string;
    order: number;
    metrics: Record<string, unknown>;
    chartData: unknown;
    insights: string;
  }[] = [];

  const winners: { label: string; delta: number }[] = [];
  const laggers: { label: string; delta: number }[] = [];

  for (const platform of PLATFORM_ORDER) {
    const integration = integrations.find((i) => i.platform === platform);
    if (!integration) continue;

    const [current, prev, yoySnap, ...trailing] = await Promise.all([
      prisma.metricSnapshot.findUnique({
        where: { integrationId_periodStart_periodEnd: { integrationId: integration.id, periodStart, periodEnd } },
      }),
      prisma.metricSnapshot.findUnique({
        where: {
          integrationId_periodStart_periodEnd: {
            integrationId: integration.id,
            periodStart: previous.start,
            periodEnd: previous.end,
          },
        },
      }),
      prisma.metricSnapshot.findUnique({
        where: { integrationId_periodStart_periodEnd: { integrationId: integration.id, periodStart: yoy.start, periodEnd: yoy.end } },
      }),
      ...trailingMonths.map((m) =>
        prisma.metricSnapshot.findUnique({
          where: { integrationId_periodStart_periodEnd: { integrationId: integration.id, periodStart: m.start, periodEnd: m.end } },
        })
      ),
    ]);

    if (!current) continue; // no data synced for this period yet

    const currentMetrics = current.metrics as Record<string, number>;
    const prevMetrics = (prev?.metrics as Record<string, number> | undefined) ?? null;
    const yoyMetrics = (yoySnap?.metrics as Record<string, number> | undefined) ?? null;

    const display = METRIC_DISPLAY[platform];
    const deltas: Record<string, { mom: number | null; yoy: number | null }> = {};
    for (const m of display) {
      deltas[m.key] = {
        mom: prevMetrics ? formatDeltaPercent(currentMetrics[m.key] ?? 0, prevMetrics[m.key] ?? 0) : null,
        yoy: yoyMetrics ? formatDeltaPercent(currentMetrics[m.key] ?? 0, yoyMetrics[m.key] ?? 0) : null,
      };
    }

    const primaryMetric = display[0];
    const primaryDelta = deltas[primaryMetric.key]?.mom;
    if (primaryDelta !== null && primaryDelta !== undefined) {
      const entry = { label: `${PLATFORM_META[platform].shortLabel} ${primaryMetric.label.toLowerCase()}`, delta: primaryDelta };
      if (primaryMetric.positiveIsGood ? primaryDelta > 0 : primaryDelta < 0) winners.push(entry);
      else if (primaryDelta !== 0) laggers.push(entry);
    }

    const chartSeries = trailingMonths.map((m, i) => ({
      x: format(m.start, "MMM"),
      y: (trailing[i]?.metrics as Record<string, number> | undefined)?.[primaryMetric.key] ?? 0,
    }));
    // Current month is always the freshest point, in case it wasn't part of trailing calc precision issues
    chartSeries[chartSeries.length - 1] = { x: format(periodStart, "MMM"), y: currentMetrics[primaryMetric.key] ?? 0 };

    const rawData = (current.raw as Record<string, TopListRow[]> | null) ?? {};
    const topLists = (TOP_LIST_CONFIG[platform] ?? [])
      .map((cfg) => ({ ...cfg, rows: rawData[cfg.rawKey] ?? [] }))
      .filter((list) => list.rows.length > 0);

    const topQuery = rawData.topQueries?.[0];

    sections.push({
      platform,
      title: PLATFORM_META[platform].label,
      order: PLATFORM_ORDER.indexOf(platform),
      metrics: { current: currentMetrics, previous: prevMetrics, yoy: yoyMetrics, deltas },
      chartData: { primaryMetricKey: primaryMetric.key, series: chartSeries, topLists },
      insights: topQuery ? `Top query: ${topQuery.label}` : "",
    });
  }

  winners.sort((a, b) => b.delta - a.delta);
  laggers.sort((a, b) => a.delta - b.delta);

  const summaryParts: string[] = [];
  summaryParts.push(`This is ${client.name}'s performance summary for ${format(periodStart, "MMMM yyyy")}.`);
  if (winners[0]) summaryParts.push(`${winners[0].label} was up ${winners[0].delta.toFixed(1)}% month-over-month.`);
  if (laggers[0]) summaryParts.push(`${laggers[0].label} declined ${Math.abs(laggers[0].delta).toFixed(1)}% and may need attention.`);
  if (sections.length === 0) summaryParts.push("No channel data was available for this period — connect integrations and run a sync first.");

  const report = await prisma.report.upsert({
    where: { clientId_periodStart_periodEnd: { clientId, periodStart, periodEnd } },
    create: {
      agencyId: client.agencyId,
      clientId,
      title: `${format(periodStart, "MMMM yyyy")} Performance Report`,
      periodStart,
      periodEnd,
      summary: summaryParts.join(" "),
      createdById,
      status: "DRAFT",
    },
    update: {
      summary: summaryParts.join(" "),
    },
  });

  await prisma.reportSection.deleteMany({ where: { reportId: report.id } });
  await prisma.reportSection.createMany({
    data: sections.map((s) => ({
      reportId: report.id,
      platform: s.platform,
      title: s.title,
      order: s.order,
      metrics: s.metrics as object,
      chartData: s.chartData as object,
      insights: s.insights,
    })),
  });

  return report.id;
}
