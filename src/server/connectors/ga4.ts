import { toISODate, type Period, type NormalizedMetrics } from "./types";

// Google Analytics Data API: https://developers.google.com/analytics/devguides/reporting/data/v1
export async function fetchGA4Metrics(accessToken: string, propertyId: string, period: Period): Promise<NormalizedMetrics> {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      dateRanges: [{ startDate: toISODate(period.start), endDate: toISODate(period.end) }],
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
  });

  if (!res.ok) throw new Error(`GA4 runReport failed (${res.status}): ${await res.text()}`);
  const data = await res.json();

  const row = data.rows?.[0]?.metricValues as Array<{ value: string }> | undefined;
  const num = (i: number) => (row ? Number(row[i]?.value ?? 0) : 0);

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
  };
}
