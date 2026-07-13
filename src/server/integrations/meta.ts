import { META_SCOPES, type ExchangedTokens } from "./types";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function redirectUri(): string {
  return `${process.env.APP_BASE_URL}/api/integrations/meta/callback`;
}

function requireCreds() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("META_APP_ID / META_APP_SECRET are not configured. See .env.example.");
  }
  return { appId, appSecret };
}

export function buildMetaAuthUrl(state: string): string {
  const { appId } = requireCreds();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri(),
    state,
    scope: META_SCOPES.join(","),
    response_type: "code",
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

export async function exchangeMetaCode(code: string): Promise<ExchangedTokens> {
  const { appId, appSecret } = requireCreds();

  const shortLivedUrl = new URL(`${GRAPH_BASE}/oauth/access_token`);
  shortLivedUrl.searchParams.set("client_id", appId);
  shortLivedUrl.searchParams.set("client_secret", appSecret);
  shortLivedUrl.searchParams.set("redirect_uri", redirectUri());
  shortLivedUrl.searchParams.set("code", code);

  const shortLivedRes = await fetch(shortLivedUrl.toString());
  if (!shortLivedRes.ok) {
    throw new Error(`Meta token exchange failed: ${await shortLivedRes.text()}`);
  }
  const shortLived = (await shortLivedRes.json()) as { access_token: string };

  // Exchange the short-lived user token for a long-lived one (~60 days).
  // Meta doesn't issue refresh tokens; the sync job re-extends this token
  // and flags the integration for reconnect if it ever fully expires.
  const longLivedUrl = new URL(`${GRAPH_BASE}/oauth/access_token`);
  longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
  longLivedUrl.searchParams.set("client_id", appId);
  longLivedUrl.searchParams.set("client_secret", appSecret);
  longLivedUrl.searchParams.set("fb_exchange_token", shortLived.access_token);

  const longLivedRes = await fetch(longLivedUrl.toString());
  if (!longLivedRes.ok) {
    throw new Error(`Meta long-lived token exchange failed: ${await longLivedRes.text()}`);
  }
  const longLived = (await longLivedRes.json()) as { access_token: string; expires_in?: number };

  let externalAccountId: string | undefined;
  let externalAccountName: string | undefined;
  try {
    const meRes = await fetch(`${GRAPH_BASE}/me?access_token=${longLived.access_token}`);
    if (meRes.ok) {
      const me = (await meRes.json()) as { id: string; name: string };
      externalAccountId = me.id;
      externalAccountName = me.name;
    }
  } catch {
    // Non-fatal — display convenience only.
  }

  return {
    accessToken: longLived.access_token,
    expiresAt: longLived.expires_in ? new Date(Date.now() + longLived.expires_in * 1000) : undefined,
    scope: META_SCOPES.join(","),
    externalAccountId,
    externalAccountName,
  };
}

/** Meta has no refresh tokens — "refreshing" means re-extending the current
 * long-lived token before it expires. Once it actually expires the user must
 * reconnect through the OAuth dialog again. */
export async function reExtendMetaToken(accessToken: string): Promise<ExchangedTokens> {
  const { appId, appSecret } = requireCreds();
  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", accessToken);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Meta token re-extension failed: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in?: number };

  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
  };
}
