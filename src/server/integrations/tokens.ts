import type { Integration } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { refreshGoogleAccessToken } from "./google";
import { reExtendMetaToken } from "./meta";

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/** Returns a valid, decrypted access token for this integration, refreshing
 * and persisting a new one first if the stored token is near expiry. Throws
 * (and marks the integration ERROR) if no refresh is possible. */
export async function getValidAccessToken(integration: Integration): Promise<string> {
  const expiresSoon =
    !integration.tokenExpiresAt || integration.tokenExpiresAt.getTime() - Date.now() < REFRESH_MARGIN_MS;

  if (!expiresSoon && integration.accessTokenEnc) {
    return decryptToken(integration.accessTokenEnc);
  }

  try {
    if (integration.platform === "META_ADS") {
      if (!integration.accessTokenEnc) throw new Error("No Meta access token stored.");
      const current = decryptToken(integration.accessTokenEnc);
      const refreshed = await reExtendMetaToken(current);
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          accessTokenEnc: encryptToken(refreshed.accessToken),
          tokenExpiresAt: refreshed.expiresAt,
          lastError: null,
        },
      });
      return refreshed.accessToken;
    }

    // Google platforms
    if (!integration.refreshTokenEnc) throw new Error("No Google refresh token stored.");
    const refreshToken = decryptToken(integration.refreshTokenEnc);
    const refreshed = await refreshGoogleAccessToken(refreshToken);
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        accessTokenEnc: encryptToken(refreshed.accessToken),
        tokenExpiresAt: refreshed.expiresAt,
        lastError: null,
      },
    });
    return refreshed.accessToken;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Token refresh failed";
    await prisma.integration.update({
      where: { id: integration.id },
      data: { status: "ERROR", lastError: message },
    });
    throw e;
  }
}
