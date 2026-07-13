import { PrismaClient } from "@prisma/client";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { generateReport } from "../src/server/reports/generate";

const prisma = new PrismaClient();

const PLATFORMS = ["GA4", "GSC", "GOOGLE_ADS", "GBP", "META_ADS"] as const;

function metricsFor(platform: (typeof PLATFORMS)[number], monthIndex: number) {
  const growth = 1 + monthIndex * 0.04; // gentle upward trend across months
  const jitter = () => 0.9 + Math.random() * 0.2;
  switch (platform) {
    case "GA4":
      return {
        sessions: Math.round(4200 * growth * jitter()),
        totalUsers: Math.round(3100 * growth * jitter()),
        newUsers: Math.round(1800 * growth * jitter()),
        engagedSessions: Math.round(2600 * growth * jitter()),
        engagementRate: 55 + monthIndex,
        conversions: Math.round(120 * growth * jitter()),
        avgSessionDurationSec: 145,
      };
    case "GSC":
      return {
        clicks: Math.round(2100 * growth * jitter()),
        impressions: Math.round(58000 * growth * jitter()),
        ctr: 3.6 + monthIndex * 0.05,
        avgPosition: Math.max(8, 14 - monthIndex * 0.4),
      };
    case "GOOGLE_ADS":
      return {
        impressions: Math.round(31000 * growth * jitter()),
        clicks: Math.round(980 * growth * jitter()),
        costUsd: Math.round(2400 * growth * jitter()),
        conversions: Math.round(62 * growth * jitter()),
        conversionValue: Math.round(9800 * growth * jitter()),
        ctr: 3.1,
        avgCpc: 2.45,
        roas: 4.1 + monthIndex * 0.1,
      };
    case "GBP":
      return {
        views: Math.round(5600 * growth * jitter()),
        searchesDirect: Math.round(2200 * growth * jitter()),
        searchesDiscovery: Math.round(3100 * growth * jitter()),
        calls: Math.round(85 * growth * jitter()),
        websiteClicks: Math.round(310 * growth * jitter()),
        directionRequests: Math.round(140 * growth * jitter()),
      };
    case "META_ADS":
      return {
        spend: Math.round(1800 * growth * jitter()),
        impressions: Math.round(210000 * growth * jitter()),
        clicks: Math.round(3400 * growth * jitter()),
        ctr: 1.6,
        cpc: 0.53,
        reach: Math.round(85000 * growth * jitter()),
        conversions: Math.round(48 * growth * jitter()),
        conversionValue: Math.round(6200 * growth * jitter()),
        roas: 3.4,
      };
  }
}

async function main() {
  const client = await prisma.client.findFirstOrThrow({ where: { slug: "acme-co" } });

  for (const platform of PLATFORMS) {
    const integration = await prisma.integration.upsert({
      where: { clientId_platform: { clientId: client.id, platform } },
      create: {
        clientId: client.id,
        platform,
        status: "CONNECTED",
        externalAccountId: "demo-account",
        externalAccountName: "Demo Account (seeded)",
        lastSyncedAt: new Date(),
      },
      update: { status: "CONNECTED", externalAccountId: "demo-account", externalAccountName: "Demo Account (seeded)" },
    });

    // Seed last 13 months so MoM and YoY deltas both have data.
    for (let i = 12; i >= 0; i--) {
      const anchor = subMonths(new Date(), i);
      const periodStart = startOfMonth(anchor);
      const periodEnd = endOfMonth(anchor);
      const monthIndex = 12 - i;

      await prisma.metricSnapshot.upsert({
        where: { integrationId_periodStart_periodEnd: { integrationId: integration.id, periodStart, periodEnd } },
        create: {
          integrationId: integration.id,
          clientId: client.id,
          platform,
          periodStart,
          periodEnd,
          metrics: metricsFor(platform, monthIndex),
          raw: platform === "GSC" ? { topQueries: [{ query: "acme co reviews", clicks: 210, impressions: 4100 }] } : undefined,
        },
        update: { metrics: metricsFor(platform, monthIndex) },
      });
    }
  }

  const now = new Date();
  const periodStart = startOfMonth(now);
  const periodEnd = endOfMonth(now);
  const reportId = await generateReport({ clientId: client.id, periodStart, periodEnd });

  console.log("Seeded demo integrations + 13 months of metrics for", client.slug);
  console.log("Generated report:", reportId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
