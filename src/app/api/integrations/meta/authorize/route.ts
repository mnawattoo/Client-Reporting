import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { encodeOAuthState } from "@/server/integrations/state";
import { buildMetaAuthUrl } from "@/server/integrations/meta";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const clientId = req.nextUrl.searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId, agencyId: session.user.agencyId },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const state = encodeOAuthState({
    clientId,
    platform: "META_ADS",
    agencyId: session.user.agencyId,
    nonce: crypto.randomBytes(8).toString("hex"),
  });

  return NextResponse.redirect(buildMetaAuthUrl(state));
}
