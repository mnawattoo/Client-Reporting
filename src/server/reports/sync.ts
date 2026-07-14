import type { Integration, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken } from "@/server/integrations/tokens";
import type { Period } from "@/server/connectors/types";
import { fetchGA4Metrics } from "@/server/connectors/ga4";
import { fetchGSCMetrics } from "@/server/connectors/gsc";
import { fetchGoogleAdsMetrics } from "@/server/connectors/googleAds";
import { fetchGBPMetrics } from "@/server/connectors/gbp";
import { fetchMetaAdsMetrics } from "@/server/connectors/metaAds";

async function fetchForPlatform(integration: Integration, accessToken: string, period: Period) {
  const resourceId = integration.externalAccountId;
  if (!resourceId) throw new Error("No account selected for this integration yet.");

  switch (integration.platform) {
    case "GA4":
      return fetchGA4Metrics(accessToken, resourceId, period);
    case "GSC":
      return fetchGSCMetrics(accessToken, resourceId, period);
    case "GOOGLE_ADS":
      return fetchGoogleAdsMetrics(accessToken, resourceId, period);
    case "GBP":
      return fetchGBPMetrics(accessToken, resourceId, period);
    case "META_ADS":
      return fetchMetaAdsMetrics(accessToken, resourceId, period);
  }
}

/** Pulls one integration's metrics for `period` and upserts the MetricSnapshot.
 * Safe to call repeatedly for the same period (idempotent upsert). */
export async function syncIntegration(integration: Integration, period: Period): Promise<void> {
  try {
    const accessToken = await getValidAccessToken(integration);
    const result = await fetchForPlatform(integration, accessToken, period);

    await prisma.metricSnapshot.upsert({
      where: {
        integrationId_periodStart_periodEnd: {
          integrationId: integration.id,
          periodStart: period.start,
          periodEnd: period.end,
        },
      },
      create: {
        integrationId: integration.id,
        clientId: integration.clientId,
        platform: integration.platform,
        periodStart: period.start,
        periodEnd: period.end,
        metrics: result.metrics,
        raw: (result.raw ?? undefined) as Prisma.InputJsonValue | undefined,
      },
      update: {
        metrics: result.metrics,
        raw: (result.raw ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastSyncedAt: new Date(), status: "CONNECTED", lastError: null },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    await prisma.integration.update({
      where: { id: integration.id },
      data: { status: "ERROR", lastError: message },
    });
    throw e;
  }
}

export interface SyncResult {
  platform: string;
  ok: boolean;
  error?: string;
}

export async function syncClientForPeriod(clientId: string, period: Period): Promise<SyncResult[]> {
  const integrations = await prisma.integration.findMany({
    where: { clientId, status: { in: ["CONNECTED", "ERROR"] }, externalAccountId: { not: null } },
  });

  const results: SyncResult[] = [];
  for (const integration of integrations) {
    try {
      await syncIntegration(integration, period);
      results.push({ platform: integration.platform, ok: true });
    } catch (e) {
      results.push({ platform: integration.platform, ok: false, error: e instanceof Error ? e.message : "Unknown error" });
    }
  }
  return results;
}
