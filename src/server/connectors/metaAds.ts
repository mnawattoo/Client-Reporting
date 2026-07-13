import { toISODate, type Period, type NormalizedMetrics } from "./types";

// Meta Marketing API insights: https://developers.facebook.com/docs/marketing-api/insights
export async function fetchMetaAdsMetrics(accessToken: string, adAccountId: string, period: Period): Promise<NormalizedMetrics> {
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: "spend,impressions,clicks,ctr,cpc,reach,actions,action_values",
    time_range: JSON.stringify({ since: toISODate(period.start), until: toISODate(period.end) }),
  });

  const res = await fetch(`https://graph.facebook.com/v21.0/${adAccountId}/insights?${params.toString()}`);
  if (!res.ok) throw new Error(`Meta insights fetch failed (${res.status}): ${await res.text()}`);
  const data = await res.json();

  const row = data.data?.[0] as
    | {
        spend?: string;
        impressions?: string;
        clicks?: string;
        ctr?: string;
        cpc?: string;
        reach?: string;
        actions?: Array<{ action_type: string; value: string }>;
        action_values?: Array<{ action_type: string; value: string }>;
      }
    | undefined;

  const spend = Number(row?.spend ?? 0);
  const conversions =
    row?.actions?.filter((a) => a.action_type.includes("purchase") || a.action_type.includes("lead")).reduce(
      (sum, a) => sum + Number(a.value),
      0
    ) ?? 0;
  const conversionValue =
    row?.action_values?.filter((a) => a.action_type.includes("purchase")).reduce((sum, a) => sum + Number(a.value), 0) ??
    0;

  return {
    metrics: {
      spend,
      impressions: Number(row?.impressions ?? 0),
      clicks: Number(row?.clicks ?? 0),
      ctr: Number(row?.ctr ?? 0),
      cpc: Number(row?.cpc ?? 0),
      reach: Number(row?.reach ?? 0),
      conversions,
      conversionValue,
      roas: spend > 0 ? conversionValue / spend : 0,
    },
  };
}
