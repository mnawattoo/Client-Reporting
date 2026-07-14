import { defineConfig } from "prisma/config";

// Once a prisma.config.ts exists, the Prisma CLI no longer auto-loads .env —
// without this, every CLI command fails with "Environment variable not found:
// DATABASE_URL". Ignore a missing file: CI/production inject real env vars.
try {
  process.loadEnvFile();
} catch {
  // no .env file present
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
