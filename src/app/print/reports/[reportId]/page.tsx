import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReportView } from "@/components/report/report-view";
import { toReportViewData } from "@/server/reports/view-data";
import { verifyPrintToken } from "@/server/reports/print-token";

export default async function PrintReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { reportId } = await params;
  const { token } = await searchParams;

  if (!token || !verifyPrintToken(reportId, token)) notFound();

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { client: { include: { agency: true } }, sections: true },
  });
  if (!report) notFound();

  const data = toReportViewData(report, report.client.agency);

  return (
    <div className="bg-white">
      <ReportView data={data} />
    </div>
  );
}
