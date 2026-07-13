import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getValidAccessToken } from "@/server/integrations/tokens";
import {
  listGA4Properties,
  listGSCSites,
  listGBPLocations,
  listGoogleAdsCustomers,
  listMetaAdAccounts,
} from "@/server/integrations/resources";
import type { Platform } from "@prisma/client";

const LISTERS: Record<Platform, (token: string) => Promise<{ id: string; label: string }[]>> = {
  GA4: listGA4Properties,
  GSC: listGSCSites,
  GBP: listGBPLocations,
  GOOGLE_ADS: listGoogleAdsCustomers,
  META_ADS: listMetaAdAccounts,
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const session = await requireSession();
  const { platform } = await params;
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

  if (!(platform in LISTERS)) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  }

  const integration = await prisma.integration.findFirst({
    where: { clientId, platform: platform as Platform, client: { agencyId: session.user.agencyId } },
  });
  if (!integration) return NextResponse.json({ error: "Integration not connected" }, { status: 404 });

  try {
    const accessToken = await getValidAccessToken(integration);
    const resources = await LISTERS[platform as Platform](accessToken);
    return NextResponse.json({ resources });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to list resources" }, { status: 500 });
  }
}
