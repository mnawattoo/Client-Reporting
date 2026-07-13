import { toISODate, type Period, type NormalizedMetrics } from "./types";

// Search Console API: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
export async function fetchGSCMetrics(accessToken: string, siteUrl: string, period: Period): Promise<NormalizedMetrics> {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const body = {
    startDate: toISODate(period.start),
    endDate: toISODate(period.end),
  };

  const [totalsRes, queriesRes] = await Promise.all([
    fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, dimensions: ["query"], rowLimit: 10 }),
    }),
  ]);

  if (!totalsRes.ok) throw new Error(`GSC query failed (${totalsRes.status}): ${await totalsRes.text()}`);
  const totals = await totalsRes.json();
  const totalRow = totals.rows?.[0] as
    | { clicks: number; impressions: number; ctr: number; position: number }
    | undefined;

  let topQueries: Array<{ query: string; clicks: number; impressions: number }> = [];
  if (queriesRes.ok) {
    const queries = await queriesRes.json();
    topQueries = (queries.rows ?? []).map((r: { keys: string[]; clicks: number; impressions: number }) => ({
      query: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
    }));
  }

  return {
    metrics: {
      clicks: totalRow?.clicks ?? 0,
      impressions: totalRow?.impressions ?? 0,
      ctr: (totalRow?.ctr ?? 0) * 100,
      avgPosition: totalRow?.position ?? 0,
    },
    raw: { topQueries },
  };
}
