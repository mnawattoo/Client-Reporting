import type { Platform } from "@prisma/client";

export type MetricUnit = "number" | "currency" | "percent" | "duration" | "decimal";

export interface MetricDisplayConfig {
  key: string;
  label: string;
  unit: MetricUnit;
  positiveIsGood: boolean;
}

// Which metrics show as headline stat tiles per section, in display order.
export const METRIC_DISPLAY: Record<Platform, MetricDisplayConfig[]> = {
  GA4: [
    { key: "sessions", label: "Sessions", unit: "number", positiveIsGood: true },
    { key: "totalUsers", label: "Users", unit: "number", positiveIsGood: true },
    { key: "conversions", label: "Conversions", unit: "number", positiveIsGood: true },
    { key: "engagementRate", label: "Engagement Rate", unit: "percent", positiveIsGood: true },
  ],
  GSC: [
    { key: "clicks", label: "Organic Clicks", unit: "number", positiveIsGood: true },
    { key: "impressions", label: "Impressions", unit: "number", positiveIsGood: true },
    { key: "ctr", label: "Avg. CTR", unit: "percent", positiveIsGood: true },
    { key: "avgPosition", label: "Avg. Position", unit: "decimal", positiveIsGood: false },
  ],
  GOOGLE_ADS: [
    { key: "costUsd", label: "Spend", unit: "currency", positiveIsGood: false },
    { key: "clicks", label: "Clicks", unit: "number", positiveIsGood: true },
    { key: "conversions", label: "Conversions", unit: "number", positiveIsGood: true },
    { key: "roas", label: "ROAS", unit: "decimal", positiveIsGood: true },
  ],
  GBP: [
    { key: "views", label: "Profile Views", unit: "number", positiveIsGood: true },
    { key: "calls", label: "Calls", unit: "number", positiveIsGood: true },
    { key: "websiteClicks", label: "Website Clicks", unit: "number", positiveIsGood: true },
    { key: "directionRequests", label: "Direction Requests", unit: "number", positiveIsGood: true },
  ],
  META_ADS: [
    { key: "spend", label: "Spend", unit: "currency", positiveIsGood: false },
    { key: "reach", label: "Reach", unit: "number", positiveIsGood: true },
    { key: "clicks", label: "Clicks", unit: "number", positiveIsGood: true },
    { key: "roas", label: "ROAS", unit: "decimal", positiveIsGood: true },
  ],
};

export function formatMetricValue(value: number, unit: MetricUnit): string {
  switch (unit) {
    case "currency":
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
    case "percent":
      return `${value.toFixed(1)}%`;
    case "decimal":
      return value.toFixed(2);
    case "duration": {
      const mins = Math.floor(value / 60);
      const secs = Math.round(value % 60);
      return `${mins}m ${secs}s`;
    }
    default:
      return new Intl.NumberFormat("en-US").format(Math.round(value));
  }
}
