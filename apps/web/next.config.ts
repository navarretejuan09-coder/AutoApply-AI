import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

config({ path: path.join(rootDir, ".env") });

const nextConfig: NextConfig = {
  transpilePackages: ["@autoapply/ui", "@autoapply/auth", "@autoapply/types"],
  serverExternalPackages: ["@autoapply/database", "@prisma/client", "pg"],
};

export default nextConfig;
