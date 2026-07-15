import { toISODate, type Period, type NormalizedMetrics, type TopListRow } from "./types";

async function runReport(accessToken: string, propertyId: string, body: object) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GA4 runReport failed (${res.status}): ${await res.text()}`);
  return res.json();
}

// Google Analytics Data API: https://developers.google.com/analytics/devguides/reporting/data/v1
export async function fetchGA4Metrics(accessToken: string, propertyId: string, period: Period): Promise<NormalizedMetrics> {
  const dateRanges = [{ startDate: toISODate(period.start), endDate: toISODate(period.end) }];

  const [totals, topPages, topLocations] = await Promise.all([
    runReport(accessToken, propertyId, {
      dateRanges,
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "newUsers" },
        { name: "engagedSessions" },
        { name: "engagementRate" },
        { name: "conversions" },
        { name: "averageSessionDuration" },
      ],
    }),
    runReport(accessToken, propertyId, {
      dateRanges,
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 10,
    }).catch(() => null),
    runReport(accessToken, propertyId, {
      dateRanges,
      dimensions: [{ name: "country" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 10,
    }).catch(() => null),
  ]);

  const row = totals.rows?.[0]?.metricValues as Array<{ value: string }> | undefined;
  const num = (i: number) => (row ? Number(row[i]?.value ?? 0) : 0);

  type ReportRow = { dimensionValues: { value: string }[]; metricValues: { value: string }[] };
  const rowsOf = (data: { rows?: ReportRow[] } | null) => data?.rows ?? [];

  return {
    metrics: {
      sessions: num(0),
      totalUsers: num(1),
      newUsers: num(2),
      engagedSessions: num(3),
      engagementRate: num(4) * 100,
      conversions: num(5),
      avgSessionDurationSec: num(6),
    },
    raw: {
      topPages: rowsOf(topPages).map(
        (r): TopListRow => ({ label: r.dimensionValues[0].value, value: Number(r.metricValues[0].value) })
      ),
      topLocations: rowsOf(topLocations).map(
        (r): TopListRow => ({ label: r.dimensionValues[0].value, value: Number(r.metricValues[0].value) })
      ),
    },
  };
}
