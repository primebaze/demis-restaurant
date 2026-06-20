import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Migrations need a direct/session connection (port 5432), not the
    // transaction pooler. Falls back to DATABASE_URL if DMIGRATION_URL is unset.
    url: process.env.DMIGRATION_URL ?? process.env.DATABASE_URL ?? "",
  },
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
});
