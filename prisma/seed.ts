import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_OWNER_EMAIL ?? "owner@agency.test";
  const password = process.env.SEED_OWNER_PASSWORD ?? "changeme123";
  const agencyName = process.env.SEED_AGENCY_NAME ?? "Demo Agency";

  const agency = await prisma.agency.upsert({
    where: { slug: "demo-agency" },
    update: {},
    create: {
      name: agencyName,
      slug: "demo-agency",
      primaryColor: "#4F46E5",
      secondaryColor: "#111827",
    },
  });

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      agencyId: agency.id,
      name: "Agency Owner",
      email,
      passwordHash,
      role: "OWNER",
    },
  });

  const client = await prisma.client.upsert({
    where: { agencyId_slug: { agencyId: agency.id, slug: "acme-co" } },
    update: {},
    create: {
      agencyId: agency.id,
      name: "Acme Co",
      slug: "acme-co",
      industry: "E-commerce",
      primaryContactName: "Jane Doe",
      primaryContactEmail: "jane@acme.test",
    },
  });

  console.log("Seeded:", { agency: agency.slug, owner: user.email, client: client.slug });
  console.log(`Log in with ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
