import type { Report, ReportSection, Client, Agency } from "@prisma/client";
import type { ReportViewData } from "@/components/report/report-view";

type FullReport = Report & {
  client: Client;
  sections: ReportSection[];
};

export function toReportViewData(report: FullReport, agency: Agency): ReportViewData {
  return {
    clientName: report.client.name,
    agencyName: agency.name,
    agencyLogoUrl: agency.logoUrl,
    primaryColor: agency.primaryColor,
    title: report.title,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    summary: report.summary,
    sections: report.sections
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        id: s.id,
        platform: s.platform,
        title: s.title,
        insights: s.insights,
        metrics: s.metrics as ReportViewData["sections"][number]["metrics"],
        chartData: s.chartData as ReportViewData["sections"][number]["chartData"],
      })),
  };
}
