"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

const schema = z.object({
  name: z.string().min(2),
  logoUrl: z.string().url().optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export async function updateAgencyBranding(formData: FormData) {
  const session = await requireSession();
  const parsed = schema.parse({
    name: formData.get("name"),
    logoUrl: formData.get("logoUrl") || undefined,
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
  });

  await prisma.agency.update({
    where: { id: session.user.agencyId },
    data: {
      name: parsed.name,
      logoUrl: parsed.logoUrl || null,
      primaryColor: parsed.primaryColor,
      secondaryColor: parsed.secondaryColor,
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}
