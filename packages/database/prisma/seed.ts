import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword } from "@autoapply/auth";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
config({ path: path.join(rootDir, ".env") });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/** Documented in README — dev/demo only */
export const DEMO_USER = {
  email: "demo@autoapply.ai",
  password: "demo123456",
  name: "Demo User",
} as const;

async function main() {
  const passwordHash = await hashPassword(DEMO_USER.password);

  const user = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: {
      passwordHash,
      name: DEMO_USER.name,
    },
    create: {
      email: DEMO_USER.email,
      passwordHash,
      name: DEMO_USER.name,
    },
  });

  console.log(`Seeded demo user: ${user.email} (${user.id})`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
