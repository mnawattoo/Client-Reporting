export interface Period {
  start: Date; // inclusive
  end: Date; // inclusive
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface NormalizedMetrics {
  metrics: Record<string, number>;
  raw?: Record<string, unknown>;
}

// Canonical metric keys per platform. Connectors must populate these so
// report generation and MoM/YoY deltas can rely on a stable shape.
export const METRIC_KEYS = {
  GA4: ["sessions", "totalUsers", "newUsers", "engagedSessions", "engagementRate", "conversions", "avgSessionDurationSec"],
  GSC: ["clicks", "impressions", "ctr", "avgPosition"],
  GOOGLE_ADS: ["impressions", "clicks", "costUsd", "conversions", "conversionValue", "ctr", "avgCpc", "roas"],
  GBP: ["views", "searchesDirect", "searchesDiscovery", "calls", "websiteClicks", "directionRequests"],
  META_ADS: ["spend", "impressions", "clicks", "ctr", "cpc", "reach", "conversions", "conversionValue", "roas"],
} as const;
