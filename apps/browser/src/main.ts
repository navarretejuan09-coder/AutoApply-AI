import "./load-env.js";

import { createServer } from "node:http";

import { config } from "@autoapply/config";
import { createLogger } from "@autoapply/logger";
import type { BrowserExecuteRequest, HealthCheckResponse } from "@autoapply/contracts";

import { BrowserRuntime } from "./runtime/runtime.js";
import { pluginManager } from "./runtime/index.js";
import { PostgresBrowserSessionStore } from "./runtime/session-store.js";

const logger = createLogger("browser", { service: "browser" });
const port = config.browser.port;

const browserRuntime = new BrowserRuntime({
  sessionStore: new PostgresBrowserSessionStore(),
});

async function readJsonBody<T>(request: import("node:http").IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw) as T;
}

function isAuthorized(request: import("node:http").IncomingMessage): boolean {
  const token = request.headers["x-browser-internal-token"];
  return token === config.browser.internalToken;
}

const server = createServer(async (request, response) => {
  if (request.url === "/health" && request.method === "GET") {
    const payload: HealthCheckResponse = {
      status: "ok",
      service: "browser",
      timestamp: new Date().toISOString(),
    };

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(payload));
    return;
  }

  if (request.url === "/plugins" && request.method === "GET") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ plugins: pluginManager.list() }));
    return;
  }

  if (request.url === "/execute" && request.method === "POST") {
    if (!isAuthorized(request)) {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    try {
      const body = await readJsonBody<BrowserExecuteRequest>(request);
      const result = await browserRuntime.executeApplication({
        userId: body.userId,
        pluginName: body.pluginName,
        plan: body.plan,
      });

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ result }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Execute failed";
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: message }));
    }
    return;
  }

  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "Not found" }));
});

server.listen(port, () => {
  logger.info("Browser service listening", { port, plugins: pluginManager.list() });
});
