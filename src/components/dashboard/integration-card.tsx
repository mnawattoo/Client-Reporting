"use client";

import { useEffect, useState } from "react";
import type { Platform } from "@prisma/client";
import { PLATFORM_META } from "@/lib/platforms";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { selectIntegrationResource, disconnectIntegration } from "@/server/actions/integrations";
import { CheckCircle2, AlertCircle, Circle } from "lucide-react";

interface IntegrationCardProps {
  clientId: string;
  platform: Platform;
  status: "PENDING" | "CONNECTED" | "ERROR" | "DISCONNECTED";
  externalAccountId: string | null;
  externalAccountName: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
}

const AUTH_BASE: Partial<Record<Platform, string>> = {
  GOOGLE_ADS: "/api/integrations/google/authorize",
  GA4: "/api/integrations/google/authorize",
  GSC: "/api/integrations/google/authorize",
  GBP: "/api/integrations/google/authorize",
  META_ADS: "/api/integrations/meta/authorize",
};

export function IntegrationCard({
  clientId,
  platform,
  status,
  externalAccountId,
  externalAccountName,
  lastSyncedAt,
  lastError,
}: IntegrationCardProps) {
  const meta = PLATFORM_META[platform];
  const Icon = meta.icon;
  const [resources, setResources] = useState<{ id: string; label: string }[] | null>(null);
  const [selected, setSelected] = useState(externalAccountId ?? "");

  const needsResourceSelection = status === "CONNECTED" && !externalAccountId;
  const loadingResources = needsResourceSelection && resources === null;

  useEffect(() => {
    if (!needsResourceSelection) return;
    let cancelled = false;
    fetch(`/api/integrations/${platform}/resources?clientId=${clientId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setResources(data.resources ?? []);
      })
      .catch(() => {
        if (!cancelled) setResources([]);
      });
    return () => {
      cancelled = true;
    };
  }, [needsResourceSelection, platform, clientId]);

  const authorizeHref =
    platform === "META_ADS"
      ? `${AUTH_BASE[platform]}?clientId=${clientId}`
      : `${AUTH_BASE[platform]}?clientId=${clientId}&platform=${platform}`;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `color-mix(in srgb, ${meta.color} 15%, transparent)` }}
          >
            <Icon className="h-4 w-4" style={{ color: meta.color }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-primary">{meta.label}</p>
            <p className="text-xs text-ink-muted">{meta.description}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-3">
        {status === "CONNECTED" && externalAccountId && (
          <div className="flex items-center justify-between rounded-lg bg-ink-primary/5 px-3 py-2 text-xs">
            <div>
              <p className="font-medium text-ink-primary">{externalAccountName ?? externalAccountId}</p>
              <p className="text-ink-muted">
                {lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleDateString()}` : "Not synced yet"}
              </p>
            </div>
            <form action={disconnectIntegration.bind(null, clientId, platform)}>
              <Button type="submit" variant="ghost" size="sm">
                Disconnect
              </Button>
            </form>
          </div>
        )}

        {needsResourceSelection && (
          <form action={selectIntegrationResource} className="space-y-2">
            <input type="hidden" name="clientId" value={clientId} />
            <input type="hidden" name="platform" value={platform} />
            <input type="hidden" name="resourceLabel" value={resources?.find((r) => r.id === selected)?.label ?? ""} />
            {loadingResources ? (
              <p className="text-xs text-ink-muted">Loading accounts…</p>
            ) : resources && resources.length > 0 ? (
              <>
                <Select name="resourceId" value={selected} onChange={(e) => setSelected(e.target.value)} required>
                  <option value="" disabled>
                    Select account…
                  </option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </Select>
                <Button type="submit" size="sm" className="w-full" disabled={!selected}>
                  Save
                </Button>
              </>
            ) : (
              <p className="text-xs text-critical">No accessible accounts found for this login.</p>
            )}
          </form>
        )}

        {(status === "PENDING" || status === "DISCONNECTED") && (
          <a href={authorizeHref}>
            <Button size="sm" variant="outline" className="w-full">
              Connect {meta.shortLabel}
            </Button>
          </a>
        )}

        {status === "ERROR" && (
          <div className="space-y-2">
            <p className="text-xs text-critical">{lastError ?? "Connection error"}</p>
            <a href={authorizeHref}>
              <Button size="sm" variant="outline" className="w-full">
                Reconnect
              </Button>
            </a>
          </div>
        )}
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: IntegrationCardProps["status"] }) {
  if (status === "CONNECTED")
    return (
      <Badge variant="good">
        <CheckCircle2 className="h-3 w-3" /> Connected
      </Badge>
    );
  if (status === "ERROR")
    return (
      <Badge variant="critical">
        <AlertCircle className="h-3 w-3" /> Error
      </Badge>
    );
  return (
    <Badge variant="muted">
      <Circle className="h-3 w-3" /> Not connected
    </Badge>
  );
}
