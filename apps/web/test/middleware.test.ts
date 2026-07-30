import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NextRequest } from "next/server";

config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env"),
});

const { evaluateMiddleware } = await import("../src/middleware.js");

describe("middleware", () => {
  it("redirects unauthenticated users away from dashboard", async () => {
    const request = new NextRequest(new URL("http://localhost/dashboard/jobs"));
    const response = await evaluateMiddleware(request, async () => null);

    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), "http://localhost/login");
  });

  it("redirects authenticated users away from auth pages", async () => {
    const request = new NextRequest(new URL("http://localhost/login"));
    const response = await evaluateMiddleware(request, async () => ({ sub: "u1" }));

    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), "http://localhost/dashboard");
  });

  it("allows public navigation otherwise", async () => {
    const request = new NextRequest(new URL("http://localhost/about"));
    const response = await evaluateMiddleware(request, async () => null);

    assert.equal(response.status, 200);
  });
});
