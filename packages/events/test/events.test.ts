import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EventTypes, createDomainEvent, type EventType } from "../src/index.js";

describe("EventTypes", () => {
  it("defines stable domain event type strings", () => {
    assert.equal(EventTypes.HealthPingRequested, "health.ping.requested");
    assert.equal(EventTypes.UserRegistered, "user.registered");
    assert.equal(EventTypes.JobFound, "job.found");
    assert.equal(EventTypes.ResumeUploaded, "resume.uploaded");
    assert.equal(EventTypes.ResumeParsed, "resume.parsed");
    assert.equal(EventTypes.ApplicationSubmitted, "application.submitted");
    assert.equal(EventTypes.ApplicationQueued, "application.queued");
  });

  it("EventType covers all EventTypes values", () => {
    const sample: EventType = EventTypes.JobFound;
    assert.equal(sample, "job.found");
  });
});

describe("createDomainEvent", () => {
  it("builds a frozen event with defaults", () => {
    const event = createDomainEvent({
      type: EventTypes.UserRegistered,
      payload: { userId: "u1", email: "user@example.com" },
      metadata: { correlationId: "c1", causationId: "ca1", actorId: "a1" },
    });

    assert.equal(event.type, EventTypes.UserRegistered);
    assert.equal(event.version, 1);
    assert.equal(event.payload.userId, "u1");
    assert.equal(event.metadata.correlationId, "c1");
    assert.ok(event.id.length > 0);
    assert.ok(event.timestamp.length > 0);
    assert.throws(() => {
      (event as { type: string }).type = "mutated";
    });
  });

  it("honors an explicit version", () => {
    const event = createDomainEvent({
      type: EventTypes.HealthPingRequested,
      payload: { source: "worker", timestamp: "2026-01-01T00:00:00.000Z" },
      metadata: { correlationId: "c2", causationId: "ca2" },
      version: 2,
    });

    assert.equal(event.version, 2);
  });
});
