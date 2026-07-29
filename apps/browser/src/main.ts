import "./load-env.js";

import { createServer } from "node:http";

import { config } from "@autoapply/config";
import { createLogger } from "@autoapply/logger";
import type { HealthCheckResponse } from "@autoapply/contracts";

import { pluginManager } from "./runtime/index.js";

const logger = createLogger("browser", { service: "browser" });
const port = config.browser.port;

const server = createServer((request, response) => {
  if (request.url === "/health") {
    const payload: HealthCheckResponse = {
      status: "ok",
      service: "browser",
      timestamp: new Date().toISOString(),
    };

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(payload));
    return;
  }

  if (request.url === "/plugins") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ plugins: pluginManager.list() }));
    return;
  }

  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "Not found" }));
});

server.listen(port, () => {
  logger.info("Browser service listening", { port, plugins: pluginManager.list() });
});
