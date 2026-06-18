import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampDelay,
  isValidDelayStep,
  MESSAGE_TYPES,
  normalizeDelay
} from "../extension/messages.js";

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

  it("normalizes arbitrary delay values to the nearest supported step", () => {
    assert.equal(normalizeDelay(-1), 0);
    assert.equal(normalizeDelay(202), 200);
    assert.equal(normalizeDelay(203), 205);
    assert.equal(normalizeDelay(1001), 1000);
  });

  it("defines an offscreen state query message", () => {
    assert.equal(MESSAGE_TYPES.OFFSCREEN_GET_STATE, "OFFSCREEN_GET_STATE");
  });
});
