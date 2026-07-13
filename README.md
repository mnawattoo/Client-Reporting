# Reportly — Client Reporting Platform

A white-labelable, multi-client reporting system for marketing agencies. It connects
directly to Google Analytics 4, Google Search Console, Google Ads, Google Business
Profile, and Meta (Facebook/Instagram) Ads, pulls monthly performance data, and turns
it into a report your clients actually want to read — plus a shareable link and a PDF
export.

Built as a single-agency deployment today, but every table is scoped by `agencyId`
from the start (see [Multi-tenancy](#multi-tenancy--reselling-this-as-saas)), so
turning this into a multi-agency SaaS product later is a signup/billing change, not a
data-model rewrite.

## Stack

- **Next.js 16** (App Router, TypeScript, Server Actions)
- **PostgreSQL + Prisma 6**
- **NextAuth v5** (credentials, JWT sessions)
- **Tailwind CSS v4**
- **Recharts** for charts, **Playwright** (headless Chromium) for PDF export

## Why these report design choices

The report layout follows a few deliberate practices rather than just dumping raw
platform numbers on a page:

- **Every number has a comparison.** A stat with no month-over-month delta is close
  to meaningless to a client — "6,424 sessions" says nothing on its own. Every stat
  tile shows a % change vs. the previous period, colored by whether the movement is
  actually good for that specific metric (spend going up is shown in red, conversions
  going up in green — see `positiveIsGood` in `src/lib/metric-display.ts`).
- **One channel, one section, one story.** SEO, Google Ads, Meta Ads, GBP, and website
  analytics are separate sections rather than a single overwhelming grid, each with
  its own trend chart and a place for the account manager's written commentary —
  clients read "what happened and why," not just numbers.
- **An executive summary up top.** Auto-drafted from the biggest mover and biggest
  decliner across channels, then editable by the agency before publishing — nobody
  wants to read five sections to find out if the month was good.
- **Goals, not just activity.** The optional `Goal` model lets an agency set a target
  per client/metric so reports can eventually show progress against a target, not
  just raw activity.
- **Draft before publish.** Reports generate as `DRAFT` so an account manager can
  edit commentary and sanity-check the numbers before a client ever sees them.
  Publishing mints a shareable, token-based link — no client login required.
- **Accessible, colorblind-safe charts.** Chart colors were chosen and validated
  against a CVD-safety and contrast checker (not eyeballed), every chart has a
  legend/table fallback, and no chart relies on color alone to convey meaning.
- **White-labeled by default.** The report a client opens shows the agency's logo and
  brand color, not this product's — see Settings → branding.

## Getting started

### 1. Prerequisites

- Node 20+, pnpm
- PostgreSQL 16 (local install or Docker — see `docker-compose.yml`)

### 2. Install & configure

```bash
pnpm install
cp .env.example .env
```

Fill in `.env`:

- `DATABASE_URL` — your Postgres connection string
- `AUTH_SECRET` — `openssl rand -base64 32`
- `TOKEN_ENCRYPTION_KEY` — `openssl rand -base64 32` (encrypts OAuth tokens at rest)
- Google/Meta credentials — see [Connecting real ad accounts](#connecting-real-ad-accounts-google--meta) below. The app runs and is fully usable without these; you just can't connect real integrations until they're set.

### 3. Database

```bash
docker compose up -d db      # or point DATABASE_URL at your own Postgres
pnpm db:migrate
pnpm db:seed                 # creates a demo agency + owner login + one client
```

The seed script prints the login it created (default `owner@agency.test` /
`changeme123` — override via `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` in `.env`
before seeding).

### 4. Run

```bash
pnpm dev
```

Visit `http://localhost:3000`, sign in, and you'll land on the dashboard.

### Try it with sample data (no API credentials needed)

`scripts/seed-demo-data.ts` fabricates 13 months of realistic-looking metrics for
every channel on the seeded demo client and generates a report from them — useful
for seeing the actual report output without connecting real ad accounts:

```bash
npx tsx scripts/seed-demo-data.ts
```

## Connecting real ad accounts (Google & Meta)

Each client connects each channel independently from their client page
(`/dashboard/clients/:id`) via OAuth. To enable this in your own deployment:

**Google (Ads, GA4, Search Console, Business Profile)**

1. In [Google Cloud Console](https://console.cloud.google.com), create an OAuth 2.0
   Client ID (Web application). Add redirect URI:
   `{APP_BASE_URL}/api/integrations/google/callback`
2. Enable these APIs on the project: Google Ads API, Google Analytics Admin & Data
   API, Search Console API, Business Profile Account Management & Business
   Information & Performance APIs.
3. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
4. For Google Ads specifically, apply for a
   [developer token](https://developers.google.com/google-ads/api/docs/get-started/dev-token)
   and set `GOOGLE_ADS_DEVELOPER_TOKEN`. If you access client accounts through a
   manager (MCC) account, also set `GOOGLE_ADS_LOGIN_CUSTOMER_ID`.

**Meta (Facebook & Instagram Ads)**

1. Create an app at [developers.facebook.com](https://developers.facebook.com) with
   Marketing API access. Add redirect URI:
   `{APP_BASE_URL}/api/integrations/meta/callback`
2. Set `META_APP_ID` / `META_APP_SECRET`.
3. Meta issues long-lived (~60 day) tokens instead of refresh tokens; the sync job
   re-extends the token automatically each run. If a token fully lapses (e.g. the
   agency doesn't run a sync for 2+ months), the integration goes into an `ERROR`
   state and the client owner has to reconnect once — this is a Meta platform
   limitation, not something the app can avoid.

After OAuth completes for a client, the app lists the Google Ads customers / GA4
properties / Search Console sites / GBP locations / Meta ad accounts the connected
login can access, so the agency picks the specific one that maps to this client.

> **Note on live-data verification:** the connectors in `src/server/connectors/`
> are implemented against the documented REST shapes of each API, but this
> environment has no real Google/Meta developer credentials to test against live
> accounts. Validate each connector against a real connected account before relying
> on it in production, particularly Google Ads (query shape) and Business Profile
> Performance (metric enum names change occasionally).

## Monthly sync

Trigger a sync of the previous calendar month for every active client from an
external scheduler (cron, GitHub Actions, Vercel Cron, etc.) — there's no built-in
scheduler in the app itself:

```bash
curl -X POST https://your-app/api/sync -H "Authorization: Bearer $CRON_SECRET"
```

Agencies can also generate a report on demand from a client's page, which syncs
that specific month first.

## Architecture

```
src/
  app/
    dashboard/           agency-facing app (auth-protected)
    api/integrations/    OAuth authorize/callback + account-picker endpoints
    api/sync/            cron-triggered monthly sync
    api/reports/:id/pdf  Playwright-rendered PDF export
    r/:token/            public, token-based client-facing report (no login)
    print/reports/:id/   internal print view used only by the PDF renderer
  server/
    integrations/        OAuth clients, token encryption/refresh, account listing
    connectors/           one file per platform, normalizes API responses
    reports/              sync engine + report generation (deltas, chart data)
    actions/               Next.js Server Actions (client/report/agency mutations)
  components/
    ui/                    base primitives (button, card, input, badge…)
    dashboard/             sidebar, stat tiles, integration cards
    charts/                trend chart (recharts, with table-view fallback)
    report/                the actual report layout, shared by dashboard + public + PDF
prisma/schema.prisma      data model
```

Key design decision: `MetricSnapshot` stores one row per (integration, month) with a
flat JSON `metrics` map. This means adding a new metric to a connector never requires
a migration, and month-over-month/year-over-year deltas are just two snapshot
look-ups, not a live API call — so published reports render instantly and don't break
if a client later disconnects an integration.

## Multi-tenancy / reselling this as SaaS

Every table (`Client`, `Integration`, `Report`, ...) is scoped by `agencyId`, and
every server action / query scopes by the signed-in user's `agencyId`
(`requireSession()` in `src/lib/session.ts`). Today the app ships as a single-agency
deployment: one agency, seeded once, with `OWNER`/`ADMIN`/`MEMBER` roles already
modeled on `User`.

To turn this into a multi-agency SaaS product:

1. Add an agency signup flow (currently agencies are created only via the seed
   script) and stop hardcoding a single seeded agency.
2. Add Stripe subscription billing gating access per agency/plan tier.
3. Add per-agency custom domains for the public report links (`/r/:token` already
   renders the connecting client's own agency branding — a custom domain is a
   routing change, not a data model change).
4. Consider row-level security in Postgres as defense-in-depth on top of the
   application-level `agencyId` scoping.

## What's not implemented yet

- Billing/subscriptions (explicitly deferred for this build)
- Email delivery of reports (currently: share link only, sent manually)
- A dedicated SEO rank-tracker integration — the "SEO" section currently reports
  Search Console data (clicks, impressions, CTR, position, top queries), which is
  the free/native signal Google provides; a paid rank tracker (SEMrush, Ahrefs, etc.)
  would need its own connector following the same pattern as `src/server/connectors/`.
- Automated scheduling of the monthly sync (see [Monthly sync](#monthly-sync) — wire
  up your own scheduler to hit `/api/sync`)
