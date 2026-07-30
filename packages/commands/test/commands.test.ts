import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ApplyJobCommandHandler,
  CommandBus,
  RegisterUserCommandHandler,
  commandBus,
  type ApplyJobCommand,
  type RegisterUserCommand,
} from "../src/index.js";

describe("CommandBus", () => {
  it("dispatches to a registered handler", async () => {
    const bus = new CommandBus();
    const calls: ApplyJobCommand[] = [];

    bus.register({
      commandType: "ApplyJob",
      handle: async (command) => {
        calls.push(command);
      },
    });

    const command: ApplyJobCommand = { type: "ApplyJob", userId: "u1", jobId: "j1" };
    await bus.dispatch(command);

    assert.deepEqual(calls, [command]);
  });

  it("throws when no handler is registered", async () => {
    const bus = new CommandBus();
    await assert.rejects(
      () => bus.dispatch({ type: "ApplyJob", userId: "u1", jobId: "j1" }),
      /No handler registered for command: ApplyJob/,
    );
  });
});

describe("default commandBus", () => {
  it("is a CommandBus instance", () => {
    assert.ok(commandBus instanceof CommandBus);
  });
});

describe("stub command handlers", () => {
  it("ApplyJobCommandHandler throws not implemented", async () => {
    const handler = new ApplyJobCommandHandler();
    assert.equal(handler.commandType, "ApplyJob");
    await assert.rejects(
      () => handler.handle({ type: "ApplyJob", userId: "u1", jobId: "job-42" }),
      /Not implemented: ApplyJobCommandHandler \(job-42\)/,
    );
  });

  it("RegisterUserCommandHandler throws not implemented", async () => {
    const handler = new RegisterUserCommandHandler();
    assert.equal(handler.commandType, "RegisterUser");
    const command: RegisterUserCommand = {
      type: "RegisterUser",
      email: "user@example.com",
      password: "secret",
    };
    await assert.rejects(
      () => handler.handle(command),
      /Not implemented: RegisterUserCommandHandler \(user@example.com\)/,
    );
  });
});
