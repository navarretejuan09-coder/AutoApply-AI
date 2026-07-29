import "./load-env.js";

import { createServer } from "node:http";

import { createLogger } from "@autoapply/shared";
import type { HealthCheckResponse } from "@autoapply/types";

const logger = createLogger("browser");
const port = Number(process.env.BROWSER_PORT ?? 3002);

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

  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "Not found" }));
});

server.listen(port, () => {
  logger.info("Browser service listening", { port });
});
