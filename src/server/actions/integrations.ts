"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

const platformEnum = z.enum(["GOOGLE_ADS", "GA4", "GSC", "GBP", "META_ADS"]);

export async function selectIntegrationResource(formData: FormData) {
  const session = await requireSession();
  const clientId = String(formData.get("clientId"));
  const platform = platformEnum.parse(formData.get("platform"));
  const resourceId = String(formData.get("resourceId"));
  const resourceLabel = String(formData.get("resourceLabel") ?? resourceId);

  const integration = await prisma.integration.findFirst({
    where: { clientId, platform, client: { agencyId: session.user.agencyId } },
  });
  if (!integration) throw new Error("Integration not found");

  await prisma.integration.update({
    where: { id: integration.id },
    data: { externalAccountId: resourceId, externalAccountName: resourceLabel, status: "CONNECTED", lastError: null },
  });

  revalidatePath(`/dashboard/clients/${clientId}`);
}

export async function disconnectIntegration(clientId: string, platform: string) {
  const session = await requireSession();
  const parsedPlatform = platformEnum.parse(platform);

  const integration = await prisma.integration.findFirst({
    where: { clientId, platform: parsedPlatform, client: { agencyId: session.user.agencyId } },
  });
  if (!integration) return;

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      status: "DISCONNECTED",
      accessTokenEnc: null,
      refreshTokenEnc: null,
      tokenExpiresAt: null,
      lastError: null,
    },
  });

  revalidatePath(`/dashboard/clients/${clientId}`);
}
