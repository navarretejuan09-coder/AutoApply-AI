import { config } from "@autoapply/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "./generated/prisma/client.js";

function createPrismaClient(): PrismaClient {
  const pool = new pg.Pool({
    connectionString: config.database.url,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (config.nodeEnv !== "production") {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient };
