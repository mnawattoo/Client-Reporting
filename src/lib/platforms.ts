import type { Platform } from "@prisma/client";
import {
  TrendingUp,
  Search,
  MousePointerClick,
  Store,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

export interface PlatformMeta {
  key: Platform;
  label: string;
  shortLabel: string;
  description: string;
  color: string; // CSS var name, fixed categorical slot — never reassigned
  icon: LucideIcon;
}

// Order here IS the fixed categorical order for any chart mixing platforms.
export const PLATFORM_META: Record<Platform, PlatformMeta> = {
  GA4: {
    key: "GA4",
    label: "Website Growth",
    shortLabel: "Website",
    description: "Sessions, users, conversions and engagement from Google Analytics 4.",
    color: "var(--series-ga4)",
    icon: TrendingUp,
  },
  GSC: {
    key: "GSC",
    label: "SEO & Search Visibility",
    shortLabel: "SEO",
    description: "Organic clicks, impressions, CTR and average position from Search Console.",
    color: "var(--series-gsc)",
    icon: Search,
  },
  GOOGLE_ADS: {
    key: "GOOGLE_ADS",
    label: "Google Ads",
    shortLabel: "Google Ads",
    description: "Spend, clicks, conversions and ROAS from Google Ads.",
    color: "var(--series-google-ads)",
    icon: MousePointerClick,
  },
  GBP: {
    key: "GBP",
    label: "Google Business Profile",
    shortLabel: "GBP",
    description: "Profile views, searches, calls and direction requests.",
    color: "var(--series-gbp)",
    icon: Store,
  },
  META_ADS: {
    key: "META_ADS",
    label: "Facebook & Instagram Ads",
    shortLabel: "Meta Ads",
    description: "Spend, reach, clicks and conversions from the Meta Marketing API.",
    color: "var(--series-meta-ads)",
    icon: Megaphone,
  },
};

export const PLATFORM_ORDER: Platform[] = ["GA4", "GSC", "GOOGLE_ADS", "GBP", "META_ADS"];
