import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// Receives monthly metrics for platforms sourced via a Make.com scenario
// instead of our own OAuth connectors (Google Ads / GBP / Meta Ads — see
// README's "Make.com" section for why). GA4 and Search Console are
// unaffected and keep using the direct OAuth path in src/server/connectors/.
//
//   curl -X POST https://your-app/api/integrations/make-webhook \
//     -H "Authorization: Bearer $MAKE_WEBHOOK_SECRET" \
//     -H "Content-Type: application/json" \
//     -d '{ "clientId": "...", "platform": "GOOGLE_ADS", "periodStart": "2026-06-01",
//           "periodEnd": "2026-06-30", "metrics": { "impressions": 12000, ... } }'

const bodySchema = z.object({
  clientId: z.string().min(1),
  platform: z.enum(["GOOGLE_ADS", "GBP", "META_ADS"]),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  externalAccountId: z.string().min(1).optional(),
  externalAccountName: z.string().min(1).optional(),
  metrics: z.record(z.string(), z.number()),
  raw: z.record(z.string(), z.array(z.object({ label: z.string(), value: z.number(), secondary: z.number().optional() }))).optional(),
});

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.MAKE_WEBHOOK_SECRET || auth !== `Bearer ${process.env.MAKE_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const { clientId, platform, periodStart, periodEnd, externalAccountId, externalAccountName, metrics, raw } = parsed.data;

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  try {
    const integration = await prisma.integration.upsert({
      where: { clientId_platform: { clientId, platform } },
      create: {
        clientId,
        platform,
        status: "CONNECTED",
        externalAccountId,
        externalAccountName,
        lastSyncedAt: new Date(),
      },
      update: {
        status: "CONNECTED",
        lastSyncedAt: new Date(),
        lastError: null,
        // Only overwrite the selected account if this payload names one —
        // don't clobber it on every monthly push.
        ...(externalAccountId ? { externalAccountId, externalAccountName } : {}),
      },
    });

    await prisma.metricSnapshot.upsert({
      where: { integrationId_periodStart_periodEnd: { integrationId: integration.id, periodStart, periodEnd } },
      create: {
        integrationId: integration.id,
        clientId,
        platform,
        periodStart,
        periodEnd,
        metrics: metrics as Prisma.InputJsonValue,
        raw: (raw ?? undefined) as Prisma.InputJsonValue | undefined,
      },
      update: {
        metrics: metrics as Prisma.InputJsonValue,
        raw: (raw ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to store metrics" }, { status: 500 });
  }
}
