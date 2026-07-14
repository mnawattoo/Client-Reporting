import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { generateShareToken } from "@/lib/crypto";
import { syncClientForPeriod } from "./sync";
import { generateReport } from "./generate";
import type { Period } from "@/server/connectors/types";

interface ClientReportResult {
  clientId: string;
  clientName: string;
  ok: boolean;
  shareUrl?: string;
  error?: string;
}

/** For every active client: pull fresh numbers from each connected channel,
 * regenerate the report for `period`, and publish it (mints/reuses a share
 * link). Safe to re-run — report generation and share-link creation are
 * both idempotent per (client, period). */
export async function runMonthlyReports(period: Period): Promise<ClientReportResult[]> {
  const clients = await prisma.client.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
  });

  const results: ClientReportResult[] = [];

  for (const client of clients) {
    try {
      await syncClientForPeriod(client.id, period);
      const reportId = await generateReport({ clientId: client.id, periodStart: period.start, periodEnd: period.end });
      const shareUrl = await publishReportInternal(reportId);
      results.push({ clientId: client.id, clientName: client.name, ok: true, shareUrl });
    } catch (e) {
      results.push({
        clientId: client.id,
        clientName: client.name,
        ok: false,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  await notifyAgency(period, results);
  return results;
}

async function publishReportInternal(reportId: string): Promise<string> {
  const existing = await prisma.shareLink.findFirst({ where: { reportId } });
  const token = existing?.token ?? generateShareToken();
  if (!existing) {
    await prisma.shareLink.create({ data: { reportId, token } });
  }
  await prisma.report.update({
    where: { id: reportId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  return `${process.env.APP_BASE_URL}/r/${token}`;
}

async function notifyAgency(period: Period, results: ClientReportResult[]) {
  const to = process.env.REPORT_NOTIFICATION_EMAIL;
  if (!to) return;

  const rows = results
    .map((r) =>
      r.ok
        ? `<li><strong>${r.clientName}</strong> — <a href="${r.shareUrl}">${r.shareUrl}</a></li>`
        : `<li><strong>${r.clientName}</strong> — sync failed: ${r.error}</li>`
    )
    .join("");

  await sendEmail({
    to,
    subject: `Monthly reports ready — ${format(period.start, "MMMM yyyy")}`,
    html: `<p>Reports for <strong>${format(period.start, "MMMM yyyy")}</strong> have been generated and published:</p><ul>${rows}</ul>`,
  });
}
