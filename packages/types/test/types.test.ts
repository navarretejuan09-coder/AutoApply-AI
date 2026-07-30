import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  HEALTH_PING_JOB_NAME,
  HEALTH_QUEUE_NAME,
  JobQueueName,
  ServiceName,
  type HealthPingJobData,
} from "../src/index.js";

describe("ServiceName", () => {
  it("exports expected service identifiers", () => {
    assert.equal(ServiceName.Web, "web");
    assert.equal(ServiceName.Api, "api");
    assert.equal(ServiceName.Worker, "worker");
    assert.equal(ServiceName.Browser, "browser");
  });
});

describe("JobQueueName", () => {
  it("exports health queue name", () => {
    assert.equal(JobQueueName.Health, "health");
  });
});

describe("queue constants", () => {
  it("re-exports health queue identifiers from contracts", () => {
    assert.equal(HEALTH_QUEUE_NAME, "health");
    assert.equal(HEALTH_PING_JOB_NAME, "health.ping");
  });
});

describe("HealthPingJobData fixture", () => {
  it("accepts a valid job payload shape", () => {
    const data: HealthPingJobData = {
      source: "api",
      timestamp: new Date().toISOString(),
      correlationId: "corr-1",
      causationId: "cause-1",
    };
    assert.equal(data.source, "api");
    assert.ok(data.timestamp.length > 0);
  });
});
