export interface SelectableResource {
  id: string;
  label: string;
}

async function googleGet(url: string, accessToken: string, extraHeaders: Record<string, string> = {}) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, ...extraHeaders },
  });
  if (!res.ok) {
    throw new Error(`Google API request failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

/** GA4 properties the connected account can report on, via the Analytics Admin API. */
export async function listGA4Properties(accessToken: string): Promise<SelectableResource[]> {
  const data = await googleGet(
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200",
    accessToken
  );
  const summaries = (data.accountSummaries ?? []) as Array<{
    displayName: string;
    propertySummaries?: Array<{ property: string; displayName: string }>;
  }>;
  return summaries.flatMap((account) =>
    (account.propertySummaries ?? []).map((p) => ({
      id: p.property.replace("properties/", ""),
      label: `${account.displayName} — ${p.displayName}`,
    }))
  );
}

/** Verified sites/domains this account can query in Search Console. */
export async function listGSCSites(accessToken: string): Promise<SelectableResource[]> {
  const data = await googleGet("https://www.googleapis.com/webmasters/v3/sites", accessToken);
  const entries = (data.siteEntry ?? []) as Array<{ siteUrl: string; permissionLevel: string }>;
  return entries
    .filter((s) => s.permissionLevel !== "siteUnverifiedUser")
    .map((s) => ({ id: s.siteUrl, label: s.siteUrl }));
}

/** Google Business Profile locations via the Business Information API. */
export async function listGBPLocations(accessToken: string): Promise<SelectableResource[]> {
  const accountsData = await googleGet(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    accessToken
  );
  const accounts = (accountsData.accounts ?? []) as Array<{ name: string; accountName: string }>;

  const results: SelectableResource[] = [];
  for (const account of accounts) {
    const locData = await googleGet(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=title,storefrontAddress&pageSize=100`,
      accessToken
    );
    const locations = (locData.locations ?? []) as Array<{ name: string; title?: string }>;
    for (const loc of locations) {
      results.push({
        id: loc.name, // e.g. "locations/12345"
        label: `${account.accountName} — ${loc.title ?? loc.name}`,
      });
    }
  }
  return results;
}

/** Google Ads accounts accessible under this OAuth grant. Requires a
 * developer token approved for at least Basic access. */
export async function listGoogleAdsCustomers(accessToken: string): Promise<SelectableResource[]> {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) {
    throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN is not configured. See .env.example.");
  }
  const data = await googleGet(
    "https://googleads.googleapis.com/v17/customers:listAccessibleCustomers",
    accessToken,
    { "developer-token": developerToken }
  );
  const resourceNames = (data.resourceNames ?? []) as string[];
  // listAccessibleCustomers only returns resource names (customers/123...);
  // resolving display names needs a search query per customer, which we
  // skip here to keep this call cheap — the id itself is what's stored.
  return resourceNames.map((name) => ({
    id: name.replace("customers/", ""),
    label: name.replace("customers/", "Customer "),
  }));
}

export async function listMetaAdAccounts(accessToken: string): Promise<SelectableResource[]> {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error(`Meta API request failed: ${await res.text()}`);
  const data = (await res.json()) as { data: Array<{ id: string; name: string }> };
  return data.data.map((a) => ({ id: a.id, label: a.name || a.id }));
}
