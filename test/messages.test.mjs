import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampDelay, isValidDelayStep } from "../extension/messages.js";

describe("delay validation", () => {
  it("clamps delay to the supported 0-1000 ms range", () => {
    assert.equal(clampDelay(-5), 0);
    assert.equal(clampDelay(200), 200);
    assert.equal(clampDelay(1005), 1000);
  });

  it("accepts only 5 ms delay increments", () => {
    assert.equal(isValidDelayStep(200), true);
    assert.equal(isValidDelayStep(205), true);
    assert.equal(isValidDelayStep(203), false);
  });
});
