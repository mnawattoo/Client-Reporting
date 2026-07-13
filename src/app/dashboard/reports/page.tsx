import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { Topbar } from "@/components/dashboard/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export default async function ReportsPage() {
  const session = await requireSession();

  const reports = await prisma.report.findMany({
    where: { agencyId: session.user.agencyId },
    orderBy: { createdAt: "desc" },
    include: { client: true },
    take: 50,
  });

  return (
    <>
      <Topbar title="Reports" description={`${reports.length} report${reports.length === 1 ? "" : "s"} generated`} />
      <div className="flex-1 p-6">
        {reports.length === 0 ? (
          <Card className="p-8 text-center text-sm text-ink-muted">
            No reports yet. Generate one from a client&apos;s page.
          </Card>
        ) : (
          <div className="divide-y divide-gridline rounded-xl border border-border bg-surface">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/dashboard/reports/${report.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-ink-primary/5"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-ink-muted" />
                  <div>
                    <p className="text-sm font-medium text-ink-primary">
                      {report.client.name} — {report.title}
                    </p>
                    <p className="text-xs text-ink-muted">{format(report.periodStart, "MMMM yyyy")}</p>
                  </div>
                </div>
                <Badge variant={report.status === "PUBLISHED" ? "good" : "muted"}>{report.status}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
