import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cn } from "../src/lib/utils.js";

describe("cn", () => {
  it("merges tailwind classes without conflicts", () => {
    assert.equal(cn("px-2", "px-4"), "px-4");
    assert.equal(cn("text-sm", false && "hidden", "font-bold"), "text-sm font-bold");
  });
});
