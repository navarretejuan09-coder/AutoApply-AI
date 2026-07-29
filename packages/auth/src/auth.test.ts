import assert from "node:assert/strict";
import { test } from "node:test";

import { hashPassword, signJwt, verifyJwt, verifyPassword } from "./index.js";

const TEST_SECRET = "test-secret-that-is-at-least-32-characters-long";

test("password hash round-trips verification", async () => {
  const hash = await hashPassword("secret123");

  assert.equal(await verifyPassword("secret123", hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
});

test("jwt sign and verify round-trip", async () => {
  const payload = {
    sub: "user-1",
    email: "demo@autoapply.ai",
    name: "Demo User",
  };

  const token = await signJwt(payload, TEST_SECRET);
  const verified = await verifyJwt(token, TEST_SECRET);

  assert.equal(verified.sub, payload.sub);
  assert.equal(verified.email, payload.email);
  assert.equal(verified.name, payload.name);
  assert.ok(typeof verified.iat === "number");
  assert.ok(typeof verified.exp === "number");
});

test("verifyJwt rejects tokens signed with a different secret", async () => {
  const token = await signJwt(
    { sub: "user-1", email: "demo@autoapply.ai" },
    TEST_SECRET,
  );

  await assert.rejects(
    () => verifyJwt(token, "another-secret-that-is-at-least-32-chars"),
  );
});
