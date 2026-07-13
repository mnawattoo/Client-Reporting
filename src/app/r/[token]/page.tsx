import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReportView } from "@/components/report/report-view";
import { toReportViewData } from "@/server/reports/view-data";

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      report: {
        include: { client: { include: { agency: true } }, sections: true },
      },
    },
  });

  if (!shareLink || shareLink.report.status !== "PUBLISHED") notFound();
  if (shareLink.expiresAt && shareLink.expiresAt < new Date()) notFound();

  await prisma.shareLink.update({ where: { id: shareLink.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  const data = toReportViewData(shareLink.report, shareLink.report.client.agency);

  return (
    <div className="min-h-screen bg-page">
      <ReportView data={data} />
    </div>
  );
}
