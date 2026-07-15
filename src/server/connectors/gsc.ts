import { toISODate, type Period, type NormalizedMetrics, type TopListRow } from "./types";

type SearchAnalyticsRow = { keys: string[]; clicks: number; impressions: number };

// Search Console API: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
export async function fetchGSCMetrics(accessToken: string, siteUrl: string, period: Period): Promise<NormalizedMetrics> {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const body = {
    startDate: toISODate(period.start),
    endDate: toISODate(period.end),
  };

  const query = (extra: object) =>
    fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, ...extra }),
    });

  const [totalsRes, queriesRes, pagesRes] = await Promise.all([
    query({}),
    query({ dimensions: ["query"], rowLimit: 10 }),
    query({ dimensions: ["page"], rowLimit: 10 }),
  ]);

  if (!totalsRes.ok) throw new Error(`GSC query failed (${totalsRes.status}): ${await totalsRes.text()}`);
  const totals = await totalsRes.json();
  const totalRow = totals.rows?.[0] as
    | { clicks: number; impressions: number; ctr: number; position: number }
    | undefined;

  const topRows = async (res: Response): Promise<TopListRow[]> => {
    if (!res.ok) return [];
    const data = await res.json();
    return (data.rows ?? []).map(
      (r: SearchAnalyticsRow): TopListRow => ({ label: r.keys[0], value: r.clicks, secondary: r.impressions })
    );
  };

  const [topQueries, topPages] = await Promise.all([topRows(queriesRes), topRows(pagesRes)]);

  return {
    metrics: {
      clicks: totalRow?.clicks ?? 0,
      impressions: totalRow?.impressions ?? 0,
      ctr: (totalRow?.ctr ?? 0) * 100,
      avgPosition: totalRow?.position ?? 0,
    },
    raw: { topQueries, topPages },
  };
}
