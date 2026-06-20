import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  prismaAdapter: PrismaPg;
};

// Cap the connection pool per serverless instance. Supabase's pooler is shared
// across all instances (15 in session mode), so each instance must use few
// connections. Idle connections are released quickly so they return to the pool.
const adapter =
  globalForPrisma.prismaAdapter ||
  new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaAdapter = adapter;
}
