export const MESSAGE_TARGETS = Object.freeze({
  BACKGROUND: "background",
  OFFSCREEN: "offscreen",
  POPUP: "popup"
});

export const MESSAGE_TYPES = Object.freeze({
  GET_STATE: "GET_STATE",
  START_CAPTURE: "START_CAPTURE",
  STOP_CAPTURE: "STOP_CAPTURE",
  SET_DELAY: "SET_DELAY",
  OFFSCREEN_START: "OFFSCREEN_START",
  OFFSCREEN_STOP: "OFFSCREEN_STOP",
  OFFSCREEN_SET_DELAY: "OFFSCREEN_SET_DELAY"
});

export const MIN_DELAY_MS = 0;
export const MAX_DELAY_MS = 1000;
export const DELAY_STEP_MS = 5;

export function clampDelay(delayMs) {
  if (!Number.isFinite(delayMs)) {
    return MIN_DELAY_MS;
  }

  return Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, Math.round(delayMs)));
}

export function isValidDelayStep(delayMs) {
  return Number.isInteger(delayMs) && delayMs % DELAY_STEP_MS === 0;
}

export function normalizeDelay(delayMs) {
  const clamped = clampDelay(delayMs);
  return Math.round(clamped / DELAY_STEP_MS) * DELAY_STEP_MS;
}
