import type { Platform } from "@prisma/client";

export interface OAuthState {
  clientId: string;
  platform: Platform;
  agencyId: string;
  nonce: string;
}

export interface ExchangedTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  externalAccountId?: string;
  externalAccountName?: string;
}

export const GOOGLE_SCOPES: Record<"GOOGLE_ADS" | "GA4" | "GSC" | "GBP", string> = {
  GOOGLE_ADS: "https://www.googleapis.com/auth/adwords",
  GA4: "https://www.googleapis.com/auth/analytics.readonly",
  GSC: "https://www.googleapis.com/auth/webmasters.readonly",
  GBP: "https://www.googleapis.com/auth/business.manage",
};

export const META_SCOPES = ["ads_read", "business_management", "pages_read_engagement"];
