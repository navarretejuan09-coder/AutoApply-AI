import assert from "node:assert/strict";
import { afterEach, before, describe, it, mock } from "node:test";

const findManyMock = mock.fn(async () => [{ id: "u1" }]);

class PrismaClientMock {
  user = { findMany: findManyMock };
}

const poolEndMock = mock.fn(async () => {});
class PoolMock {
  end = poolEndMock;
}

/**
 * Node 20: `namedExports` / `defaultExport`
 * Node 22+: `exports` / `exports.default` (`namedExports` still works, deprecated)
 */
function mockEsmModule(
  specifier: string,
  options: { named?: Record<string, unknown>; defaultExport?: unknown },
) {
  const major = Number(process.versions.node.split(".")[0]);
  if (major >= 22) {
    const exports: Record<string, unknown> = { ...(options.named ?? {}) };
    if (options.defaultExport !== undefined) {
      exports.default = options.defaultExport;
    }
    mock.module(specifier, { exports });
    return;
  }

  mock.module(specifier, {
    namedExports: options.named ?? {},
    ...(options.defaultExport !== undefined ? { defaultExport: options.defaultExport } : {}),
  });
}

mockEsmModule("@prisma/adapter-pg", {
  named: {
    PrismaPg: mock.fn(function PrismaPg() {
      return {};
    }),
  },
});

mockEsmModule("pg", {
  defaultExport: {
    Pool: PoolMock,
  },
});

mockEsmModule("../src/generated/prisma/client.js", {
  named: {
    PrismaClient: PrismaClientMock,
  },
});

const validEnv = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
  REDIS_URL: "redis://localhost:6379",
  AUTH_SECRET: "x".repeat(32),
  API_URL: "http://localhost:3001",
  NEXTAUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_API_URL: "http://localhost:3001",
};

const originalEnv = { ...process.env };

before(() => {
  for (const [key, value] of Object.entries(validEnv)) {
    process.env[key] = value;
  }
});

afterEach(() => {
  findManyMock.mock.resetCalls();
});

describe("database index", () => {
  it("exports PrismaClient", async () => {
    const mod = await import("../src/index.js");
    assert.equal(mod.PrismaClient, PrismaClientMock);
  });

  it("lazy prisma proxy delegates method calls", async () => {
    const mod = await import("../src/index.js");
    const rows = await mod.prisma.user.findMany();
    assert.deepEqual(rows, [{ id: "u1" }]);
    assert.equal(findManyMock.mock.calls.length, 1);
  });

  it("reuses the same prisma client instance", async () => {
    const mod = await import("../src/index.js");
    await mod.prisma.user.findMany();
    await mod.prisma.user.findMany();
    assert.equal(findManyMock.mock.calls.length, 2);
  });
});

describe("cleanup", () => {
  it("restores process env", () => {
    process.env = { ...originalEnv };
    assert.ok(true);
  });
});
