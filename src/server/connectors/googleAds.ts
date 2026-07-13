import { toISODate, type Period, type NormalizedMetrics } from "./types";

// Google Ads API (GAQL search): https://developers.google.com/google-ads/api/docs/query/overview
export async function fetchGoogleAdsMetrics(
  accessToken: string,
  customerId: string,
  period: Period
): Promise<NormalizedMetrics> {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN is not configured.");

  const query = `
    SELECT
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr,
      metrics.average_cpc
    FROM customer
    WHERE segments.date BETWEEN '${toISODate(period.start)}' AND '${toISODate(period.end)}'
  `;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
    "Content-Type": "application/json",
  };
  if (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) {
    headers["login-customer-id"] = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  }

  const res = await fetch(`https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });

  if (!res.ok) throw new Error(`Google Ads search failed (${res.status}): ${await res.text()}`);
  const data = await res.json();

  // Row-per-day-ish results aren't returned for a customer-level query without
  // segments.date in SELECT; Google Ads still buckets by the WHERE range and
  // returns one aggregate row per customer here since no dimension is selected.
  const rows = (data.results ?? []) as Array<{ metrics: Record<string, string> }>;
  const totals = rows.reduce(
    (acc, r) => {
      acc.impressions += Number(r.metrics.impressions ?? 0);
      acc.clicks += Number(r.metrics.clicks ?? 0);
      acc.costMicros += Number(r.metrics.costMicros ?? 0);
      acc.conversions += Number(r.metrics.conversions ?? 0);
      acc.conversionsValue += Number(r.metrics.conversionsValue ?? 0);
      return acc;
    },
    { impressions: 0, clicks: 0, costMicros: 0, conversions: 0, conversionsValue: 0 }
  );

  const costUsd = totals.costMicros / 1_000_000;
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const avgCpc = totals.clicks > 0 ? costUsd / totals.clicks : 0;
  const roas = costUsd > 0 ? totals.conversionsValue / costUsd : 0;

  return {
    metrics: {
      impressions: totals.impressions,
      clicks: totals.clicks,
      costUsd,
      conversions: totals.conversions,
      conversionValue: totals.conversionsValue,
      ctr,
      avgCpc,
      roas,
    },
  };
}
