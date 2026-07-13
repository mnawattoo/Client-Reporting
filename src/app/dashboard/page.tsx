import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { Topbar } from "@/components/dashboard/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileCheck2, PlugZap, AlertTriangle } from "lucide-react";

export default async function DashboardOverviewPage() {
  const session = await requireSession();
  const agencyId = session.user.agencyId;

  const [clientCount, publishedThisMonth, connectedIntegrations, erroredIntegrations, recentReports] = await Promise.all([
    prisma.client.count({ where: { agencyId, status: "ACTIVE" } }),
    prisma.report.count({
      where: { agencyId, status: "PUBLISHED", publishedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
    }),
    prisma.integration.count({ where: { status: "CONNECTED", client: { agencyId } } }),
    prisma.integration.findMany({
      where: { status: "ERROR", client: { agencyId } },
      include: { client: true },
      take: 5,
    }),
    prisma.report.findMany({
      where: { agencyId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { client: true },
    }),
  ]);

  const stats = [
    { label: "Active clients", value: clientCount, icon: Users },
    { label: "Reports published this month", value: publishedThisMonth, icon: FileCheck2 },
    { label: "Connected integrations", value: connectedIntegrations, icon: PlugZap },
  ];

  return (
    <>
      <Topbar title="Overview" description={`Welcome back, ${session.user.name?.split(" ")[0] ?? "there"}`} />
      <div className="flex-1 space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label} className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10">
                <s.icon className="h-5 w-5 text-brand-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-ink-primary">{s.value}</p>
                <p className="text-xs text-ink-muted">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {erroredIntegrations.length > 0 && (
          <Card className="border-critical/30 p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-critical" />
              <p className="text-sm font-semibold text-ink-primary">Integrations need attention</p>
            </div>
            <div className="space-y-2">
              {erroredIntegrations.map((i) => (
                <Link
                  key={i.id}
                  href={`/dashboard/clients/${i.clientId}`}
                  className="flex items-center justify-between rounded-lg bg-critical/5 px-3 py-2 text-sm hover:bg-critical/10"
                >
                  <span className="text-ink-primary">
                    {i.client.name} — {i.platform.replaceAll("_", " ")}
                  </span>
                  <span className="text-xs text-critical">{i.lastError ?? "Reconnect required"}</span>
                </Link>
              ))}
            </div>
          </Card>
        )}

        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink-primary">Recent reports</h2>
          {recentReports.length === 0 ? (
            <Card className="p-8 text-center text-sm text-ink-muted">
              No reports yet.{" "}
              <Link href="/dashboard/clients" className="text-brand-primary underline">
                Add a client
              </Link>{" "}
              to get started.
            </Card>
          ) : (
            <div className="divide-y divide-gridline rounded-xl border border-border bg-surface">
              {recentReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/dashboard/reports/${report.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-ink-primary/5"
                >
                  <div>
                    <p className="text-sm font-medium text-ink-primary">
                      {report.client.name} — {format(report.periodStart, "MMMM yyyy")}
                    </p>
                    <p className="text-xs text-ink-muted">{report.title}</p>
                  </div>
                  <Badge variant={report.status === "PUBLISHED" ? "good" : "muted"}>{report.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
