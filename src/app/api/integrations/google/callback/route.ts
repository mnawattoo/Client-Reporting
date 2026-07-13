import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decodeOAuthState } from "@/server/integrations/state";
import { exchangeGoogleCode } from "@/server/integrations/google";
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
    const tokens = await exchangeGoogleCode(code);

    await prisma.integration.upsert({
      where: { clientId_platform: { clientId: state.clientId, platform: state.platform } },
      create: {
        clientId: state.clientId,
        platform: state.platform,
        status: "CONNECTED",
        accessTokenEnc: encryptToken(tokens.accessToken),
        refreshTokenEnc: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
        tokenExpiresAt: tokens.expiresAt,
        scopes: tokens.scope,
        externalAccountId: tokens.externalAccountId,
        externalAccountName: tokens.externalAccountName,
      },
      update: {
        status: "CONNECTED",
        accessTokenEnc: encryptToken(tokens.accessToken),
        // Google only returns a refresh_token on first consent; keep the
        // existing one on reconnect if a new one wasn't issued.
        ...(tokens.refreshToken ? { refreshTokenEnc: encryptToken(tokens.refreshToken) } : {}),
        tokenExpiresAt: tokens.expiresAt,
        scopes: tokens.scope,
        externalAccountId: tokens.externalAccountId,
        externalAccountName: tokens.externalAccountName,
        lastError: null,
      },
    });

    clientDetailUrl.searchParams.set("integration_connected", state.platform);
  } catch (e) {
    clientDetailUrl.searchParams.set("integration_error", e instanceof Error ? e.message : "unknown_error");
  }

  return NextResponse.redirect(clientDetailUrl);
}
