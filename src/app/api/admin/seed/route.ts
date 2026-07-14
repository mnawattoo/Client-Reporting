import { NextRequest, NextResponse } from "next/server";
import { seedInitialAgency } from "@/server/seed";

// One-time bootstrap for a fresh deployment: creates the agency owner login
// from SEED_OWNER_EMAIL/SEED_OWNER_PASSWORD/SEED_AGENCY_NAME. Upsert-only,
// so safe to call more than once — reuses CRON_SECRET rather than adding a
// separate secret, since it's already a server-only bearer token nobody but
// the deploying agency has.
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await seedInitialAgency();
  return NextResponse.json({ ok: true, ...result });
}
