import { NextRequest, NextResponse } from "next/server";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { runMonthlyReports } from "@/server/reports/monthly";

// Runs automatically once a month via Vercel Cron (see vercel.json), which
// sends a GET request with `Authorization: Bearer $CRON_SECRET` for any env
// var literally named CRON_SECRET. Also callable manually (e.g. from another
// scheduler) with the same header via POST:
//   curl -X POST https://your-app/api/sync -H "Authorization: Bearer $CRON_SECRET"
//
// For every active client: syncs the previous full calendar month from each
// connected channel, regenerates and publishes the report, then emails a
// summary with share links to REPORT_NOTIFICATION_EMAIL.
async function handleSync(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const targetMonth = subMonths(now, 1);
  const period = { start: startOfMonth(targetMonth), end: endOfMonth(targetMonth) };

  const results = await runMonthlyReports(period);

  return NextResponse.json({ ok: true, period, results });
}

export const GET = handleSync;
export const POST = handleSync;
