import { NextRequest, NextResponse } from "next/server";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { syncAllClientsForPeriod } from "@/server/reports/sync";

// Trigger from an external scheduler (Vercel Cron, GitHub Actions, cron on
// your own host) once a month:
//   curl -X POST https://your-app/api/sync -H "Authorization: Bearer $CRON_SECRET"
// Syncs the previous full calendar month for every active client.
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const targetMonth = subMonths(now, 1);
  const period = { start: startOfMonth(targetMonth), end: endOfMonth(targetMonth) };

  await syncAllClientsForPeriod(period);

  return NextResponse.json({ ok: true, period });
}
