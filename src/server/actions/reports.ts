"use server";

import { startOfMonth, endOfMonth, parse } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { syncClientForPeriod } from "@/server/reports/sync";
import { generateReport } from "@/server/reports/generate";
import { generateShareToken } from "@/lib/crypto";

export async function generateReportForClient(formData: FormData) {
  const session = await requireSession();
  const clientId = String(formData.get("clientId"));
  const monthValue = String(formData.get("month")); // "YYYY-MM"

  const client = await prisma.client.findUnique({
    where: { id: clientId, agencyId: session.user.agencyId },
    select: { id: true },
  });
  if (!client) throw new Error("Client not found");

  const anchor = parse(monthValue, "yyyy-MM", new Date());
  const periodStart = startOfMonth(anchor);
  const periodEnd = endOfMonth(anchor);

  await syncClientForPeriod(clientId, { start: periodStart, end: periodEnd });
  const reportId = await generateReport({ clientId, periodStart, periodEnd, createdById: session.user.id });

  revalidatePath(`/dashboard/clients/${clientId}`);
  redirect(`/dashboard/reports/${reportId}`);
}

export async function publishReport(reportId: string) {
  const session = await requireSession();

  const report = await prisma.report.findFirst({
    where: { id: reportId, agencyId: session.user.agencyId },
    include: { shareLinks: true },
  });
  if (!report) throw new Error("Report not found");

  if (report.shareLinks.length === 0) {
    await prisma.shareLink.create({ data: { reportId: report.id, token: generateShareToken() } });
  }

  await prisma.report.update({
    where: { id: reportId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });

  revalidatePath(`/dashboard/reports/${reportId}`);
}

export async function updateReportSummary(reportId: string, summary: string) {
  const session = await requireSession();
  await prisma.report.update({
    where: { id: reportId, agencyId: session.user.agencyId },
    data: { summary },
  });
  revalidatePath(`/dashboard/reports/${reportId}`);
}

export async function updateSectionInsights(sectionId: string, reportId: string, insights: string) {
  const session = await requireSession();
  await prisma.reportSection.update({
    where: { id: sectionId, report: { agencyId: session.user.agencyId } },
    data: { insights },
  });
  revalidatePath(`/dashboard/reports/${reportId}`);
}
