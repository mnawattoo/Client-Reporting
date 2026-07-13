import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright-core";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { createPrintToken } from "@/server/reports/print-token";

const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium";

export async function GET(req: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  const session = await requireSession();
  const { reportId } = await params;

  const report = await prisma.report.findFirst({
    where: { id: reportId, agencyId: session.user.agencyId },
    select: { id: true, title: true, client: { select: { name: true } } },
  });
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const printToken = createPrintToken(reportId);
  const printUrl = `${process.env.APP_BASE_URL}/print/reports/${reportId}?token=${printToken}`;

  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH, headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(printUrl, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "24px", bottom: "24px", left: "0px", right: "0px" },
    });

    const filename = `${report.client.name}-${report.title}`.replace(/[^a-z0-9-]+/gi, "-") + ".pdf";
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } finally {
    await browser.close();
  }
}
