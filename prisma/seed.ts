import { seedInitialAgency } from "@/server/seed";

seedInitialAgency()
  .then((result) => {
    console.log("Seeded:", result);
    console.log(`Log in with ${process.env.SEED_OWNER_EMAIL ?? "owner@agency.test"} / ${process.env.SEED_OWNER_PASSWORD ?? "changeme123"}`);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
