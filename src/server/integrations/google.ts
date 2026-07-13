import { google } from "googleapis";
import { GOOGLE_SCOPES, type ExchangedTokens } from "./types";

function redirectUri(): string {
  return `${process.env.APP_BASE_URL}/api/integrations/google/callback`;
}

export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not configured. See .env.example."
    );
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri());
}

export function buildGoogleAuthUrl(platform: keyof typeof GOOGLE_SCOPES, state: string): string {
  const client = getGoogleOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // forces a refresh_token on every connect, not just the first
    scope: [GOOGLE_SCOPES[platform], "openid", "email"],
    state,
  });
}

export async function exchangeGoogleCode(code: string): Promise<ExchangedTokens> {
  const client = getGoogleOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) {
    throw new Error("Google did not return an access token.");
  }

  let externalAccountId: string | undefined;
  let externalAccountName: string | undefined;
  try {
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ auth: client, version: "v2" });
    const { data } = await oauth2.userinfo.get();
    externalAccountId = data.id ?? undefined;
    externalAccountName = data.email ?? undefined;
  } catch {
    // Non-fatal — the account identity is a display convenience only.
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? undefined,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
    scope: tokens.scope ?? undefined,
    externalAccountId,
    externalAccountName,
  };
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<ExchangedTokens> {
  const client = getGoogleOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  if (!credentials.access_token) {
    throw new Error("Failed to refresh Google access token.");
  }
  return {
    accessToken: credentials.access_token,
    refreshToken: credentials.refresh_token ?? refreshToken,
    expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
    scope: credentials.scope ?? undefined,
  };
}
