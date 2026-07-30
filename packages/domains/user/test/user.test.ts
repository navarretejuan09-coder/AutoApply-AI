import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  createUser,
  findUserByEmail,
  findUserById,
  resetUserRepository,
  setUserRepository,
  verifyUserCredentials,
} from "../src/index.js";
import { InMemoryUserRepository } from "../src/testing/in-memory-user.repository.js";

describe("user domain", () => {
  afterEach(() => {
    resetUserRepository();
  });

  it("createUser hashes password and returns auth DTO", async () => {
    const repo = new InMemoryUserRepository();
    setUserRepository(repo);

    const user = await createUser({
      email: "alice@example.com",
      password: "secret123",
      name: "Alice",
    });

    assert.equal(user.email, "alice@example.com");
    assert.equal(user.name, "Alice");
    assert.ok(user.id);

    const stored = await repo.findByEmail("alice@example.com");
    assert.ok(stored?.passwordHash);
    assert.notEqual(stored.passwordHash, "secret123");
  });

  it("createUser rejects duplicate email", async () => {
    const repo = new InMemoryUserRepository();
    setUserRepository(repo);

    await createUser({ email: "dup@example.com", password: "one" });

    await assert.rejects(
      () => createUser({ email: "dup@example.com", password: "two" }),
      /Email already registered/,
    );
  });

  it("findUserById and findUserByEmail delegate to repository", async () => {
    const repo = new InMemoryUserRepository();
    setUserRepository(repo);

    repo.seed({
      id: "user-99",
      email: "bob@example.com",
      name: "Bob",
      passwordHash: "hash",
    });

    const byId = await findUserById("user-99");
    assert.equal(byId?.email, "bob@example.com");

    const byEmail = await findUserByEmail("bob@example.com");
    assert.equal(byEmail?.id, "user-99");

    assert.equal(await findUserById("missing"), null);
  });

  it("verifyUserCredentials returns user on valid password", async () => {
    const repo = new InMemoryUserRepository();
    setUserRepository(repo);

    const created = await createUser({
      email: "carol@example.com",
      password: "correct-horse",
    });

    const verified = await verifyUserCredentials("carol@example.com", "correct-horse");
    assert.deepEqual(verified, {
      id: created.id,
      email: created.email,
      name: created.name,
    });
  });

  it("verifyUserCredentials returns null for unknown email or wrong password", async () => {
    const repo = new InMemoryUserRepository();
    setUserRepository(repo);

    await createUser({ email: "dave@example.com", password: "pw" });

    assert.equal(await verifyUserCredentials("unknown@example.com", "pw"), null);
    assert.equal(await verifyUserCredentials("dave@example.com", "wrong"), null);
  });
});

describe("PrismaUserRepository", () => {
  it("delegates to injected prisma client", async () => {
    const { PrismaUserRepository } = await import("../src/repository/prisma-user.repository.js");

    const calls: string[] = [];
    const db = {
      user: {
        findUnique: async (args: { where: { id?: string; email?: string } }) => {
          if (args.where.id) {
            calls.push("findById");
            return { id: "u1", email: "a@b.com", name: "A" };
          }
          calls.push("findByEmail");
          return args.where.email === "exists@b.com"
            ? { id: "u1", email: "exists@b.com", name: "A", passwordHash: "hash" }
            : null;
        },
        create: async (args: { data: { email: string; passwordHash: string; name?: string } }) => {
          calls.push("create");
          return { id: "u2", email: args.data.email, name: args.data.name ?? null };
        },
      },
    };

    const repo = new PrismaUserRepository(db as never);

    assert.deepEqual(await repo.findById("u1"), { id: "u1", email: "a@b.com", name: "A" });
    assert.equal(await repo.emailExists("exists@b.com"), true);
    assert.equal(await repo.emailExists("missing@b.com"), false);
    assert.deepEqual(await repo.create({ email: "new@b.com", passwordHash: "hash" }), {
      id: "u2",
      email: "new@b.com",
      name: null,
    });

    assert.deepEqual(calls, ["findById", "findByEmail", "findByEmail", "create"]);
  });
});
