import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditableText } from "@/components/dashboard/editable-text";
import { CopyButton } from "@/components/dashboard/copy-button";
import { PLATFORM_META } from "@/lib/platforms";
import { METRIC_DISPLAY, formatMetricValue } from "@/lib/metric-display";
import { StatTile } from "@/components/dashboard/stat-tile";
import { TrendChart } from "@/components/charts/trend-chart";
import { publishReport, updateReportSummary, updateSectionInsights } from "@/server/actions/reports";
import { Download } from "lucide-react";

export default async function ReportDetailPage({ params }: { params: Promise<{ reportId: string }> }) {
  const session = await requireSession();
  const { reportId } = await params;

  const report = await prisma.report.findFirst({
    where: { id: reportId, agencyId: session.user.agencyId },
    include: { client: true, sections: { orderBy: { order: "asc" } }, shareLinks: true },
  });
  if (!report) notFound();

  const shareLink = report.shareLinks[0];
  const publicUrl = shareLink ? `${process.env.APP_BASE_URL}/r/${shareLink.token}` : null;

  return (
    <>
      <Topbar
        title={report.title}
        description={report.client.name}
        actions={
          <>
            <Badge variant={report.status === "PUBLISHED" ? "good" : "muted"}>{report.status}</Badge>
            <a href={`/api/reports/${report.id}/pdf`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" /> Export PDF
              </Button>
            </a>
            {report.status !== "PUBLISHED" && (
              <form action={publishReport.bind(null, report.id)}>
                <Button type="submit" size="sm">
                  Publish &amp; get share link
                </Button>
              </form>
            )}
          </>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {publicUrl && (
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-muted">Client-facing link</p>
                <p className="truncate text-sm text-ink-primary">{publicUrl}</p>
              </div>
              <CopyButton value={publicUrl} />
            </div>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Executive summary</CardTitle>
          </CardHeader>
          <CardContent>
            <EditableText
              initialValue={report.summary ?? ""}
              placeholder="Summarize the headline wins and areas to watch this month…"
              onSave={async (value) => {
                "use server";
                await updateReportSummary(report.id, value);
              }}
            />
          </CardContent>
        </Card>

        {report.sections.map((section) => {
          const meta = section.platform ? PLATFORM_META[section.platform] : null;
          const display = section.platform ? METRIC_DISPLAY[section.platform] : [];
          const metrics = section.metrics as {
            current: Record<string, number>;
            deltas: Record<string, { mom: number | null; yoy: number | null }>;
          };
          const chartData = section.chartData as { primaryMetricKey: string; series: { x: string; y: number }[] } | null;
          const Icon = meta?.icon;

          return (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {Icon && meta && <Icon className="h-4 w-4" style={{ color: meta.color }} />}
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {display.map((m) => (
                    <StatTile
                      key={m.key}
                      label={m.label}
                      value={formatMetricValue(metrics.current[m.key] ?? 0, m.unit)}
                      deltaPercent={metrics.deltas[m.key]?.mom ?? null}
                      positiveIsGood={m.positiveIsGood}
                    />
                  ))}
                </div>

                {chartData && chartData.series.length > 0 && meta && (
                  <TrendChart
                    series={[
                      {
                        key: chartData.primaryMetricKey,
                        label: display.find((d) => d.key === chartData.primaryMetricKey)?.label ?? "Trend",
                        color: meta.color,
                        data: chartData.series,
                      },
                    ]}
                    height={200}
                  />
                )}

                <div>
                  <p className="mb-1.5 text-xs font-medium text-ink-secondary">Commentary for the client</p>
                  <EditableText
                    initialValue={section.insights ?? ""}
                    placeholder="What drove this? What are we doing next month?"
                    onSave={async (value) => {
                      "use server";
                      await updateSectionInsights(section.id, report.id, value);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
