import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";

const STATUS_VARIANT = {
  ACTIVE: "good",
  PAUSED: "warning",
  ARCHIVED: "muted",
} as const;

export default async function ClientsPage() {
  const session = await requireSession();

  const clients = await prisma.client.findMany({
    where: { agencyId: session.user.agencyId },
    orderBy: { name: "asc" },
    include: {
      integrations: { select: { status: true } },
      _count: { select: { reports: true } },
    },
  });

  return (
    <>
      <Topbar
        title="Clients"
        description={`${clients.length} client${clients.length === 1 ? "" : "s"}`}
        actions={
          <Link href="/dashboard/clients/new">
            <Button>
              <Plus className="h-4 w-4" /> New client
            </Button>
          </Link>
        }
      />
      <div className="flex-1 p-6">
        {clients.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <p className="text-sm text-ink-muted">No clients yet. Add your first client to get started.</p>
            <Link href="/dashboard/clients/new">
              <Button>
                <Plus className="h-4 w-4" /> New client
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => {
              const connected = client.integrations.filter((i) => i.status === "CONNECTED").length;
              return (
                <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
                  <Card className="h-full p-5 transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-ink-primary">{client.name}</p>
                        <p className="text-xs text-ink-muted">{client.industry || "No industry set"}</p>
                      </div>
                      <Badge variant={STATUS_VARIANT[client.status]}>{client.status}</Badge>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-ink-muted">
                      <span>{connected}/5 integrations connected</span>
                      <span>{client._count.reports} reports</span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
