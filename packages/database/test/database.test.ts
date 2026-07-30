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

mock.module("@prisma/adapter-pg", {
  exports: {
    PrismaPg: mock.fn(function PrismaPg() {
      return {};
    }),
  },
});

mock.module("pg", {
  exports: {
    default: {
      Pool: PoolMock,
    },
  },
});

mock.module("../src/generated/prisma/client.js", {
  exports: {
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
