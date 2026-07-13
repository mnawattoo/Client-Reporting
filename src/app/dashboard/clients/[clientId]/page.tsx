import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { IntegrationCard } from "@/components/dashboard/integration-card";
import { Input } from "@/components/ui/input";
import { PLATFORM_ORDER, PLATFORM_META } from "@/lib/platforms";
import { generateReportForClient } from "@/server/actions/reports";
import { updateClientStatus, upsertGoal, deleteGoal } from "@/server/actions/clients";
import { FileText, ExternalLink, Target, X } from "lucide-react";

function lastNMonths(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
  });
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ integration_connected?: string; integration_error?: string }>;
}) {
  const session = await requireSession();
  const { clientId } = await params;
  const { integration_connected, integration_error } = await searchParams;

  const client = await prisma.client.findUnique({
    where: { id: clientId, agencyId: session.user.agencyId },
    include: {
      integrations: true,
      reports: { orderBy: { periodStart: "desc" }, take: 12 },
      goals: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!client) notFound();

  const integrationsByPlatform = new Map(client.integrations.map((i) => [i.platform, i]));
  const months = lastNMonths(12);

  return (
    <>
      <Topbar
        title={client.name}
        description={client.industry ?? undefined}
        actions={
          <>
            <Badge variant={client.status === "ACTIVE" ? "good" : client.status === "PAUSED" ? "warning" : "muted"}>
              {client.status}
            </Badge>
            {client.status === "ACTIVE" ? (
              <form action={updateClientStatus.bind(null, client.id, "PAUSED")}>
                <Button type="submit" variant="outline" size="sm">
                  Pause client
                </Button>
              </form>
            ) : (
              <form action={updateClientStatus.bind(null, client.id, "ACTIVE")}>
                <Button type="submit" variant="outline" size="sm">
                  Reactivate
                </Button>
              </form>
            )}
          </>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {integration_connected && (
          <div className="rounded-lg bg-good/10 px-4 py-2 text-sm text-[var(--delta-good)]">
            Connected {integration_connected}. Select an account below to finish setup.
          </div>
        )}
        {integration_error && (
          <div className="rounded-lg bg-critical/10 px-4 py-2 text-sm text-critical">
            Connection failed: {integration_error}
          </div>
        )}

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink-primary">Integrations</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_ORDER.map((platform) => {
              const integration = integrationsByPlatform.get(platform);
              return (
                <IntegrationCard
                  key={platform}
                  clientId={client.id}
                  platform={platform}
                  status={integration?.status ?? "PENDING"}
                  externalAccountId={integration?.externalAccountId ?? null}
                  externalAccountName={integration?.externalAccountName ?? null}
                  lastSyncedAt={integration?.lastSyncedAt?.toISOString() ?? null}
                  lastError={integration?.lastError ?? null}
                />
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink-primary">Goals</h2>
          <Card>
            <CardContent className="space-y-4 pt-5">
              {client.goals.length > 0 && (
                <div className="space-y-2">
                  {client.goals.map((goal) => (
                    <div key={goal.id} className="flex items-center justify-between rounded-lg bg-ink-primary/5 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="h-3.5 w-3.5 text-brand-primary" />
                        <span className="text-ink-primary">{goal.label}</span>
                        <Badge variant="muted">{PLATFORM_META[goal.platform].shortLabel}</Badge>
                        <span className="text-ink-muted">target: {goal.target}</span>
                      </div>
                      <form action={deleteGoal.bind(null, goal.id, client.id)}>
                        <button type="submit" className="text-ink-muted hover:text-critical">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
              <form action={upsertGoal} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="clientId" value={client.id} />
                <div className="w-40">
                  <label className="mb-1.5 block text-xs font-medium text-ink-secondary">Channel</label>
                  <Select name="platform" required>
                    {PLATFORM_ORDER.map((p) => (
                      <option key={p} value={p}>
                        {PLATFORM_META[p].shortLabel}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-40">
                  <label className="mb-1.5 block text-xs font-medium text-ink-secondary">Metric key</label>
                  <Input name="metricKey" placeholder="conversions" required />
                </div>
                <div className="w-40">
                  <label className="mb-1.5 block text-xs font-medium text-ink-secondary">Label</label>
                  <Input name="label" placeholder="Monthly conversions" required />
                </div>
                <div className="w-28">
                  <label className="mb-1.5 block text-xs font-medium text-ink-secondary">Target</label>
                  <Input name="target" type="number" step="any" required />
                </div>
                <Button type="submit" size="sm">
                  Add goal
                </Button>
              </form>
              <p className="text-xs text-ink-muted">
                Metric key must match a metric shown in that channel&apos;s report section (e.g. &quot;sessions&quot;, &quot;clicks&quot;, &quot;costUsd&quot;).
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Generate a monthly report</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={generateReportForClient} className="flex items-end gap-3">
                <input type="hidden" name="clientId" value={client.id} />
                <div className="w-56">
                  <Select name="month" defaultValue={months[1]?.value}>
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button type="submit">Sync data &amp; generate</Button>
              </form>
              <p className="mt-2 text-xs text-ink-muted">
                Pulls the latest numbers from every connected integration for the selected month, then builds a
                report you can review before sending to the client.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink-primary">Reports</h2>
          {client.reports.length === 0 ? (
            <Card className="p-8 text-center text-sm text-ink-muted">No reports generated yet.</Card>
          ) : (
            <div className="divide-y divide-gridline rounded-xl border border-border bg-surface">
              {client.reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/dashboard/reports/${report.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-ink-primary/5"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-ink-muted" />
                    <div>
                      <p className="text-sm font-medium text-ink-primary">{report.title}</p>
                      <p className="text-xs text-ink-muted">{format(report.periodStart, "MMMM yyyy")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={report.status === "PUBLISHED" ? "good" : "muted"}>{report.status}</Badge>
                    <ExternalLink className="h-3.5 w-3.5 text-ink-muted" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
