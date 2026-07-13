"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

const clientSchema = z.object({
  name: z.string().min(2, "Name is required"),
  industry: z.string().optional(),
  timezone: z.string().min(1),
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().email().optional().or(z.literal("")),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createClient(formData: FormData) {
  const session = await requireSession();

  const parsed = clientSchema.parse({
    name: formData.get("name"),
    industry: formData.get("industry") || undefined,
    timezone: formData.get("timezone") || "UTC",
    primaryContactName: formData.get("primaryContactName") || undefined,
    primaryContactEmail: formData.get("primaryContactEmail") || undefined,
  });

  const baseSlug = slugify(parsed.name);
  let slug = baseSlug;
  let attempt = 1;
  while (
    await prisma.client.findUnique({
      where: { agencyId_slug: { agencyId: session.user.agencyId, slug } },
    })
  ) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const client = await prisma.client.create({
    data: {
      agencyId: session.user.agencyId,
      name: parsed.name,
      slug,
      industry: parsed.industry,
      timezone: parsed.timezone,
      primaryContactName: parsed.primaryContactName,
      primaryContactEmail: parsed.primaryContactEmail || undefined,
    },
  });

  revalidatePath("/dashboard/clients");
  redirect(`/dashboard/clients/${client.id}`);
}

export async function updateClientStatus(clientId: string, status: "ACTIVE" | "PAUSED" | "ARCHIVED") {
  const session = await requireSession();
  await prisma.client.update({
    where: { id: clientId, agencyId: session.user.agencyId },
    data: { status },
  });
  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${clientId}`);
}

export async function upsertGoal(formData: FormData) {
  const session = await requireSession();
  const clientId = String(formData.get("clientId"));

  const client = await prisma.client.findUnique({
    where: { id: clientId, agencyId: session.user.agencyId },
    select: { id: true },
  });
  if (!client) throw new Error("Client not found");

  const schema = z.object({
    platform: z.enum(["GOOGLE_ADS", "GA4", "GSC", "GBP", "META_ADS"]),
    metricKey: z.string().min(1),
    label: z.string().min(1),
    target: z.coerce.number(),
  });
  const parsed = schema.parse({
    platform: formData.get("platform"),
    metricKey: formData.get("metricKey"),
    label: formData.get("label"),
    target: formData.get("target"),
  });

  await prisma.goal.create({ data: { clientId, ...parsed } });
  revalidatePath(`/dashboard/clients/${clientId}`);
}

export async function deleteGoal(goalId: string, clientId: string) {
  const session = await requireSession();
  await prisma.goal.delete({
    where: { id: goalId, client: { agencyId: session.user.agencyId } },
  });
  revalidatePath(`/dashboard/clients/${clientId}`);
}
