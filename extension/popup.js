import {
  DELAY_STEP_MS,
  MAX_DELAY_MS,
  MESSAGE_TARGETS,
  MESSAGE_TYPES,
  MIN_DELAY_MS,
  normalizeDelay
} from "./messages.js";

const slider = document.querySelector("#delay-slider");
const value = document.querySelector("#delay-value");
const status = document.querySelector(".status");
const statusDot = status.querySelector(".status-dot");
const captureButton = document.querySelector(".capture-button");
const presetButtons = document.querySelectorAll("[data-delay]");
const stepButtons = document.querySelectorAll("[data-step]");
const delayControls = [slider, ...presetButtons, ...stepButtons];
const delaySections = document.querySelectorAll(
  ".delay-readout, .slider-row, .preset-grid, .popup-footer"
);

let currentState = {
  status: "idle",
  tabId: null,
  delayMs: normalizeDelay(Number(slider.value)),
  error: null
};

function canUseRuntimeMessages() {
  return Boolean(globalThis.chrome?.runtime?.sendMessage);
}

function normalizeState(state) {
  return {
    status: state?.status ?? "idle",
    tabId: state?.tabId ?? null,
    delayMs: normalizeDelay(state?.delayMs ?? currentState.delayMs),
    error: state?.error ?? null
  };
}

async function sendBackgroundMessage(type, payload = {}) {
  if (!canUseRuntimeMessages()) {
    if (type === MESSAGE_TYPES.SET_DELAY) {
      currentState = normalizeState({
        ...currentState,
        delayMs: payload.delayMs
      });
    } else if (type === MESSAGE_TYPES.START_CAPTURE) {
      currentState = normalizeState({
        ...currentState,
        status: "capturing",
        error: null
      });
    } else if (type === MESSAGE_TYPES.STOP_CAPTURE) {
      currentState = normalizeState({
        ...currentState,
        status: "idle",
        error: null
      });
    }

    return currentState;
  }

  const response = await chrome.runtime.sendMessage({
    target: MESSAGE_TARGETS.BACKGROUND,
    type,
    ...payload
  });

  return normalizeState(response);
}

function setStatus(label, stateStatus) {
  status.classList.toggle("ready", stateStatus === "idle");
  status.classList.toggle("capturing", stateStatus === "capturing");
  status.classList.toggle("error", stateStatus === "error");
  status.replaceChildren(statusDot, document.createTextNode(label));
}

function renderState(state) {
  currentState = normalizeState(state);

  slider.min = String(MIN_DELAY_MS);
  slider.max = String(MAX_DELAY_MS);
  slider.step = String(DELAY_STEP_MS);
  slider.value = String(currentState.delayMs);
  value.textContent = String(currentState.delayMs);

  presetButtons.forEach((button) => {
    button.classList.toggle(
      "selected",
      normalizeDelay(Number(button.dataset.delay)) === currentState.delayMs
    );
  });

  const isCapturing = currentState.status === "capturing";
  const isStarting = currentState.status === "starting";
  const controlsDisabled = !isCapturing;

  delayControls.forEach((control) => {
    control.disabled = controlsDisabled;
  });

  delaySections.forEach((section) => {
    section.classList.toggle("controls-disabled", controlsDisabled);
    section.setAttribute("aria-disabled", String(controlsDisabled));
  });

  captureButton.textContent = isCapturing ? "On" : isStarting ? "Turning on" : "Off";
  captureButton.setAttribute(
    "aria-label",
    isCapturing || isStarting ? "Turn audio delay off" : "Turn audio delay on"
  );
  captureButton.disabled = isStarting;

  if (currentState.status === "error") {
    setStatus("Error", currentState.status);
  } else if (isCapturing) {
    setStatus("On", currentState.status);
  } else if (isStarting) {
    setStatus("Turning on", currentState.status);
  } else {
    setStatus("Off", currentState.status);
  }
}

async function updateFromBackground(type, payload = {}) {
  try {
    renderState(await sendBackgroundMessage(type, payload));
  } catch (error) {
    renderState({
      ...currentState,
      status: "error",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

function requestDelay(delayMs) {
  const nextDelayMs = normalizeDelay(delayMs);
  renderState({
    ...currentState,
    delayMs: nextDelayMs
  });
  void updateFromBackground(MESSAGE_TYPES.SET_DELAY, { delayMs: nextDelayMs });
}

captureButton.addEventListener("click", () => {
  const isStopping =
    currentState.status === "capturing" || currentState.status === "starting";
  const type = isStopping ? MESSAGE_TYPES.STOP_CAPTURE : MESSAGE_TYPES.START_CAPTURE;

  if (!isStopping) {
    renderState({
      ...currentState,
      status: "starting",
      error: null
    });
  }

  void updateFromBackground(type);
});

slider.addEventListener("input", () => {
  requestDelay(Number(slider.value));
});

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    requestDelay(Number(button.dataset.delay));
  });
});

stepButtons.forEach((button) => {
  button.addEventListener("click", () => {
    requestDelay(Number(slider.value) + Number(button.dataset.step));
  });
});

renderState(currentState);
void updateFromBackground(MESSAGE_TYPES.GET_STATE);
