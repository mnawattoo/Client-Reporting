import type { Period, NormalizedMetrics } from "./types";

// Business Profile Performance API:
// https://developers.google.com/my-business/reference/performance/rest/v1/locations/fetchMultiDailyMetricsTimeSeries
const DAILY_METRICS = [
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
  "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
  "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
  "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
  "CALL_CLICKS",
  "WEBSITE_CLICKS",
  "BUSINESS_DIRECTION_REQUESTS",
];

function dateParam(prefix: string, d: Date) {
  return `${prefix}.year=${d.getUTCFullYear()}&${prefix}.month=${d.getUTCMonth() + 1}&${prefix}.day=${d.getUTCDate()}`;
}

export async function fetchGBPMetrics(accessToken: string, location: string, period: Period): Promise<NormalizedMetrics> {
  const params = new URLSearchParams();
  DAILY_METRICS.forEach((m) => params.append("dailyMetrics", m));
  const query = [
    params.toString(),
    dateParam("dailyRange.startDate", period.start),
    dateParam("dailyRange.endDate", period.end),
  ].join("&");

  const res = await fetch(
    `https://businessprofileperformance.googleapis.com/v1/${location}:fetchMultiDailyMetricsTimeSeries?${query}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`GBP performance fetch failed (${res.status}): ${await res.text()}`);
  const data = await res.json();

  const totals: Record<string, number> = Object.fromEntries(DAILY_METRICS.map((m) => [m, 0]));
  const series = (data.multiDailyMetricTimeSeries ?? []) as Array<{
    dailyMetricTimeSeries: Array<{ dailyMetric: string; timeSeries: { datedValues: Array<{ value?: string }> } }>;
  }>;
  for (const bucket of series) {
    for (const s of bucket.dailyMetricTimeSeries) {
      const sum = (s.timeSeries.datedValues ?? []).reduce((acc, v) => acc + Number(v.value ?? 0), 0);
      totals[s.dailyMetric] = (totals[s.dailyMetric] ?? 0) + sum;
    }
  }

  const views =
    totals.BUSINESS_IMPRESSIONS_DESKTOP_MAPS +
    totals.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH +
    totals.BUSINESS_IMPRESSIONS_MOBILE_MAPS +
    totals.BUSINESS_IMPRESSIONS_MOBILE_SEARCH;

  return {
    metrics: {
      views,
      searchesDirect: totals.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH + totals.BUSINESS_IMPRESSIONS_MOBILE_SEARCH,
      searchesDiscovery: totals.BUSINESS_IMPRESSIONS_DESKTOP_MAPS + totals.BUSINESS_IMPRESSIONS_MOBILE_MAPS,
      calls: totals.CALL_CLICKS,
      websiteClicks: totals.WEBSITE_CLICKS,
      directionRequests: totals.BUSINESS_DIRECTION_REQUESTS,
    },
  };
}
