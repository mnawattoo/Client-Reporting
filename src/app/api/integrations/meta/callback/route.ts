import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decodeOAuthState } from "@/server/integrations/state";
import { exchangeMetaCode } from "@/server/integrations/meta";
import { encryptToken } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateParam = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (!stateParam) {
    return NextResponse.redirect(new URL("/dashboard/clients", req.nextUrl.origin));
  }

  let state;
  try {
    state = decodeOAuthState(stateParam);
  } catch {
    return NextResponse.redirect(new URL("/dashboard/clients?error=invalid_state", req.nextUrl.origin));
  }

  const clientDetailUrl = new URL(`/dashboard/clients/${state.clientId}`, req.nextUrl.origin);

  if (error || !code) {
    clientDetailUrl.searchParams.set("integration_error", error ?? "missing_code");
    return NextResponse.redirect(clientDetailUrl);
  }

  try {
    const tokens = await exchangeMetaCode(code);

    await prisma.integration.upsert({
      where: { clientId_platform: { clientId: state.clientId, platform: "META_ADS" } },
      create: {
        clientId: state.clientId,
        platform: "META_ADS",
        status: "CONNECTED",
        accessTokenEnc: encryptToken(tokens.accessToken),
        tokenExpiresAt: tokens.expiresAt,
        scopes: tokens.scope,
        // externalAccountId/Name are intentionally left unset here — they
        // identify the *selected ad account*, set later via
        // selectIntegrationResource(). Leaving them null is what makes the
        // resource-picker UI show up after connecting.
      },
      update: {
        status: "CONNECTED",
        accessTokenEnc: encryptToken(tokens.accessToken),
        tokenExpiresAt: tokens.expiresAt,
        scopes: tokens.scope,
        // externalAccountId/Name deliberately omitted — don't clobber a
        // previously selected ad account when an existing connection just
        // refreshes its tokens.
        lastError: null,
      },
    });

    clientDetailUrl.searchParams.set("integration_connected", "META_ADS");
  } catch (e) {
    clientDetailUrl.searchParams.set("integration_error", e instanceof Error ? e.message : "unknown_error");
  }

  return NextResponse.redirect(clientDetailUrl);
}
